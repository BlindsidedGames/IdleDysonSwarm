import {
  type BrowserSaveDatabase,
  type WriterLeaseAcquisition,
  type WriterLeaseFence,
  WriterLeaseLostError,
} from './browserSaveDatabase'
import { requireBrowserCapability } from './browserEnvironment'

const DEFAULT_LEASE_DURATION_MILLISECONDS = 15_000
const DEFAULT_HEARTBEAT_MILLISECONDS = 5_000
const MAXIMUM_HEARTBEAT_MILLISECONDS = 10_000

export type BrowserWriterOwnershipState =
  | { readonly kind: 'idle' }
  | {
      readonly kind: 'blocked'
      readonly generation: number
      readonly expiresAtUtcMilliseconds: number
    }
  | {
      readonly kind: 'writable'
      readonly fence: WriterLeaseFence
    }
  | {
      readonly kind: 'lost'
      readonly previousFence: WriterLeaseFence
      readonly reason: string
    }
  | { readonly kind: 'released' }
  | { readonly kind: 'disposed' }

export type BrowserWriterOwnershipListener = (
  state: BrowserWriterOwnershipState,
) => void

export interface BrowserWriterAuthority {
  readonly fence: WriterLeaseFence
  readonly deadlineUtcMilliseconds: number
  isAuthoritative(): boolean
  cancellationRequested(): boolean
}

export interface OwnershipNotice {
  readonly kind: 'acquired' | 'renewed' | 'released' | 'lost'
  readonly generation: number
  readonly expiresAtUtcMilliseconds: number | null
}

export interface OwnershipNoticeChannel {
  post(notice: OwnershipNotice): void
  subscribe(listener: (notice: OwnershipNotice) => void): () => void
  close(): void
}

export interface IntervalScheduler {
  setInterval(callback: () => void, milliseconds: number): unknown
  clearInterval(handle: unknown): void
}

export interface BrowserWriterLeaseOptions {
  readonly database: BrowserSaveDatabase
  readonly nowUtcMilliseconds?: () => number
  readonly ownerToken?: string
  readonly ownerTokenFactory?: () => string
  readonly allowUnexpiredSameOwnerTakeover?: boolean
  readonly leaseDurationMilliseconds?: number
  readonly heartbeatMilliseconds?: number
  readonly scheduler?: IntervalScheduler
  readonly noticeChannel?: OwnershipNoticeChannel
  readonly autoHeartbeat?: boolean
}

/**
 * Owns one terminal browser writer session.
 *
 * Release and shutdown permanently close this instance. Create a new instance
 * with a new owner token for a later acquisition. Authority signals are
 * synchronous so coordinator cancellation and active-driver shutdown can
 * observe release, disposal, loss, and expiry without awaiting IndexedDB.
 *
 * Wave 2 composition must pass cancellationRequested to long-running player
 * dispatch and stop active delivery when it flips. It must also reconstruct
 * after any in-flight publication that settles concurrently with ownership
 * loss; this platform gate cannot roll back application memory by itself.
 */
export class BrowserWriterLease {
  private readonly database: BrowserSaveDatabase
  private readonly nowUtcMilliseconds: () => number
  private readonly ownerToken: string
  private readonly allowUnexpiredSameOwnerTakeover: boolean
  private readonly leaseDurationMilliseconds: number
  private readonly heartbeatMilliseconds: number
  private readonly scheduler: IntervalScheduler
  private readonly noticeChannel: OwnershipNoticeChannel | undefined
  private readonly autoHeartbeat: boolean
  private readonly listeners =
    new Set<BrowserWriterOwnershipListener>()
  private readonly pendingLeaseOperations =
    new Set<Promise<unknown>>()
  private readonly pendingAuthoritativeOperations =
    new Set<Promise<unknown>>()
  private readonly fenceReleasePromises =
    new Map<string, Promise<boolean>>()
  private currentState: BrowserWriterOwnershipState = {
    kind: 'idle',
  }
  private acquisitionPromise:
    | Promise<WriterLeaseAcquisition>
    | undefined
  private acquiredFence: WriterLeaseFence | undefined
  private releasePromise: Promise<boolean> | undefined
  private shutdownPromise: Promise<boolean> | undefined
  private heartbeatHandle: unknown
  private heartbeatPending = false
  private terminalRequested = false
  private disposed = false
  private epoch = 0
  private unsubscribeNotices: (() => void) | undefined

  constructor(options: Readonly<BrowserWriterLeaseOptions>) {
    const leaseDurationMilliseconds =
      options.leaseDurationMilliseconds ??
      DEFAULT_LEASE_DURATION_MILLISECONDS
    const heartbeatMilliseconds =
      options.heartbeatMilliseconds ??
      DEFAULT_HEARTBEAT_MILLISECONDS
    validateHeartbeatBounds(
      leaseDurationMilliseconds,
      heartbeatMilliseconds,
    )
    this.database = options.database
    this.nowUtcMilliseconds =
      options.nowUtcMilliseconds ?? Date.now
    this.ownerToken =
      options.ownerToken ??
      (options.ownerTokenFactory ?? defaultOwnerTokenFactory)()
    this.allowUnexpiredSameOwnerTakeover =
      options.allowUnexpiredSameOwnerTakeover ?? false
    this.leaseDurationMilliseconds = leaseDurationMilliseconds
    this.heartbeatMilliseconds = heartbeatMilliseconds
    this.scheduler = options.scheduler ?? browserIntervalScheduler
    this.noticeChannel = options.noticeChannel
    this.autoHeartbeat = options.autoHeartbeat ?? true
    this.unsubscribeNotices =
      this.noticeChannel?.subscribe(this.handleNotice)
  }

  state(): BrowserWriterOwnershipState {
    return this.currentState
  }

  subscribe(listener: BrowserWriterOwnershipListener): () => void {
    if (this.disposed) return () => undefined
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  acquire(): Promise<WriterLeaseAcquisition> {
    this.assertOpen()
    if (this.currentState.kind === 'writable') {
      return Promise.resolve({
        acquired: true,
        fence: this.currentState.fence,
      })
    }
    if (this.currentState.kind === 'lost') {
      throw new WriterLeaseLostError(
        'This browser writer lease instance cannot reacquire.',
      )
    }
    this.acquisitionPromise ??= this.acquireOnce()
    return this.acquisitionPromise
  }

  /**
   * Explicitly fences the current owner and acquires a newer generation.
   * Callers must place this behind a deliberate development/recovery action.
   */
  takeOver(): Promise<WriterLeaseAcquisition> {
    this.assertOpen()
    if (this.currentState.kind === 'writable') {
      return Promise.resolve({
        acquired: true,
        fence: this.currentState.fence,
      })
    }
    if (this.currentState.kind === 'lost') {
      throw new WriterLeaseLostError(
        'This browser writer lease instance cannot reacquire.',
      )
    }
    this.acquisitionPromise ??= this.acquireOnce(true)
    return this.acquisitionPromise
  }

  async renew(): Promise<WriterLeaseFence> {
    const fence = this.requireLocallyAuthoritativeFence()
    const operationEpoch = this.epoch
    const promise = this.database
      .renewWriterLease(
        fence,
        this.nowUtcMilliseconds(),
        this.leaseDurationMilliseconds,
      )
      .then((renewed) => {
        if (!this.isCurrentEpoch(operationEpoch)) {
          throw new WriterLeaseLostError(
            'Writer renewal completed after ownership was cancelled.',
          )
        }
        this.acquiredFence = renewed
        this.publish({ kind: 'writable', fence: renewed })
        this.postNotice({
          kind: 'renewed',
          generation: renewed.generation,
          expiresAtUtcMilliseconds:
            renewed.expiresAtUtcMilliseconds,
        })
        return renewed
      })
      .catch((error: unknown) => {
        if (this.isCurrentEpoch(operationEpoch)) {
          this.markLost(fence, error)
        }
        throw error
      })
    return this.track(promise, this.pendingLeaseOperations)
  }

  assertWritable(): Promise<WriterLeaseFence> {
    const fence = this.requireLocallyAuthoritativeFence()
    const operationEpoch = this.epoch
    const promise = this.database
      .inspectWriterLease()
      .then((current) => {
        if (!this.isCurrentEpoch(operationEpoch)) {
          throw new WriterLeaseLostError(
            'Writer validation completed after ownership was cancelled.',
          )
        }
        const now = this.nowUtcMilliseconds()
        if (
          current?.ownerToken !== fence.ownerToken ||
          current.generation !== fence.generation ||
          current.expiresAtUtcMilliseconds <= now
        ) {
          const error = new WriterLeaseLostError()
          this.markLost(fence, error)
          throw error
        }
        this.acquiredFence = current
        if (
          current.expiresAtUtcMilliseconds !==
          fence.expiresAtUtcMilliseconds
        ) {
          this.publish({ kind: 'writable', fence: current })
        }
        return current
      })
    return this.track(promise, this.pendingLeaseOperations)
  }

  /**
   * Revalidates IndexedDB before entry and rejects a result that settles after
   * the synchronous authority signal has been cancelled or expired.
   */
  runAuthoritativeOperation<T>(
    operation: (
      authority: BrowserWriterAuthority,
    ) => T | Promise<T>,
  ): Promise<T> {
    const promise = this.runAuthoritativeOperationOnce(operation)
    return this.track(
      promise,
      this.pendingAuthoritativeOperations,
    )
  }

  isAuthoritative(): boolean {
    const state = this.currentState
    return (
      !this.terminalRequested &&
      !this.disposed &&
      state.kind === 'writable' &&
      state.fence.expiresAtUtcMilliseconds >
        this.nowUtcMilliseconds()
    )
  }

  cancellationRequested(): boolean {
    return !this.isAuthoritative()
  }

  authorityDeadlineUtcMilliseconds(): number | null {
    return this.currentState.kind === 'writable'
      ? this.currentState.fence.expiresAtUtcMilliseconds
      : null
  }

  currentFence(): WriterLeaseFence {
    return this.requireLocallyAuthoritativeFence()
  }

  /**
   * Permanently releases this lease instance and waits for acquisition,
   * renewal, validation, and authoritative work already in flight.
   */
  release(): Promise<boolean> {
    if (this.shutdownPromise !== undefined) {
      return this.shutdownPromise
    }
    this.releasePromise ??= this.beginRelease(false)
    return this.releasePromise
  }

  /**
   * Immediately cancels local authority, then drains pending work and releases
   * the database fence exactly once before resolving.
   */
  shutdown(): Promise<boolean> {
    if (this.shutdownPromise !== undefined) {
      return this.shutdownPromise
    }
    this.disposed = true
    this.cancelTerminalState({ kind: 'disposed' })
    this.listeners.clear()
    this.unsubscribeNotices?.()
    this.unsubscribeNotices = undefined
    try {
      this.noticeChannel?.close()
    } catch {
      // A failed advisory close cannot retain writer authority.
    }
    this.shutdownPromise =
      this.releasePromise ?? this.finishRelease(true)
    return this.shutdownPromise
  }

  dispose(): void {
    void this.shutdown().catch(() => undefined)
  }

  private async acquireOnce(
    allowUnexpiredAnyOwnerTakeover = false,
  ): Promise<WriterLeaseAcquisition> {
    const operationEpoch = this.epoch
    const promise = this.database.acquireWriterLease(
      this.ownerToken,
      this.nowUtcMilliseconds(),
      this.leaseDurationMilliseconds,
      this.allowUnexpiredSameOwnerTakeover,
      allowUnexpiredAnyOwnerTakeover,
    )
    try {
      const acquisition = await promise
      if (acquisition.acquired) {
        this.acquiredFence = acquisition.fence
      }
      if (!this.isCurrentEpoch(operationEpoch)) {
        if (acquisition.acquired) {
          await this.releaseFenceOnce(acquisition.fence)
        }
        throw new WriterLeaseLostError(
          'Writer acquisition completed after ownership was cancelled.',
        )
      }
      if (!acquisition.acquired) {
        this.stopHeartbeat()
        this.publish({
          kind: 'blocked',
          generation: acquisition.generation,
          expiresAtUtcMilliseconds:
            acquisition.expiresAtUtcMilliseconds,
        })
        return acquisition
      }
      this.publish({
        kind: 'writable',
        fence: acquisition.fence,
      })
      this.postNotice({
        kind: 'acquired',
        generation: acquisition.fence.generation,
        expiresAtUtcMilliseconds:
          acquisition.fence.expiresAtUtcMilliseconds,
      })
      if (this.autoHeartbeat) this.startHeartbeat()
      return acquisition
    } finally {
      this.acquisitionPromise = undefined
    }
  }

  private async runAuthoritativeOperationOnce<T>(
    operation: (
      authority: BrowserWriterAuthority,
    ) => T | Promise<T>,
  ): Promise<T> {
    const fence = await this.assertWritable()
    const operationEpoch = this.epoch
    const authority = this.createAuthority(fence, operationEpoch)
    if (!authority.isAuthoritative()) {
      throw new WriterLeaseLostError()
    }
    const result = await operation(authority)
    if (authority.cancellationRequested()) {
      const error = new WriterLeaseLostError(
        'The authoritative operation settled after ownership was cancelled.',
      )
      if (
        !this.terminalRequested &&
        !this.disposed &&
        this.currentState.kind === 'writable'
      ) {
        this.markLost(fence, error)
      }
      throw error
    }
    return result
  }

  private createAuthority(
    fence: WriterLeaseFence,
    operationEpoch: number,
  ): BrowserWriterAuthority {
    const deadline = () =>
      this.authorityDeadlineFor(fence, operationEpoch)
    return Object.freeze({
      fence,
      get deadlineUtcMilliseconds() {
        return deadline()
      },
      isAuthoritative: () =>
        this.isFenceAuthoritative(fence, operationEpoch),
      cancellationRequested: () =>
        !this.isFenceAuthoritative(fence, operationEpoch),
    })
  }

  private authorityDeadlineFor(
    fence: WriterLeaseFence,
    operationEpoch: number,
  ): number {
    if (
      operationEpoch !== this.epoch ||
      this.currentState.kind !== 'writable' ||
      !sameFenceIdentity(this.currentState.fence, fence)
    ) {
      return fence.expiresAtUtcMilliseconds
    }
    return this.currentState.fence.expiresAtUtcMilliseconds
  }

  private isFenceAuthoritative(
    fence: WriterLeaseFence,
    operationEpoch: number,
  ): boolean {
    if (
      !this.isCurrentEpoch(operationEpoch) ||
      this.currentState.kind !== 'writable' ||
      !sameFenceIdentity(this.currentState.fence, fence)
    ) {
      return false
    }
    return (
      this.currentState.fence.expiresAtUtcMilliseconds >
      this.nowUtcMilliseconds()
    )
  }

  private beginRelease(disposed: boolean): Promise<boolean> {
    this.cancelTerminalState(
      disposed ? { kind: 'disposed' } : { kind: 'released' },
    )
    return this.finishRelease(disposed)
  }

  private async finishRelease(
    disposed: boolean,
  ): Promise<boolean> {
    const fenceAtRequest =
      this.acquiredFence ??
      (this.currentState.kind === 'writable'
        ? this.currentState.fence
        : undefined)
    await this.drainPending()
    const fence = this.acquiredFence ?? fenceAtRequest
    if (fence === undefined) return false
    const released = await this.releaseFenceOnce(fence)
    if (released && !disposed && !this.disposed) {
      this.postNotice({
        kind: 'released',
        generation: fence.generation,
        expiresAtUtcMilliseconds: null,
      }, true)
    }
    return released
  }

  private cancelTerminalState(
    state: Extract<
      BrowserWriterOwnershipState,
      { readonly kind: 'released' | 'disposed' }
    >,
  ): void {
    if (!this.terminalRequested) {
      this.terminalRequested = true
      this.epoch += 1
      this.stopHeartbeat()
    }
    if (!this.disposed || state.kind === 'disposed') {
      this.publish(state, true)
    }
  }

  private async drainPending(): Promise<void> {
    for (;;) {
      const pending = [
        ...(this.acquisitionPromise === undefined
          ? []
          : [this.acquisitionPromise]),
        ...this.pendingLeaseOperations,
        ...this.pendingAuthoritativeOperations,
      ]
      if (pending.length === 0) return
      await Promise.allSettled(pending)
    }
  }

  private releaseFenceOnce(
    fence: WriterLeaseFence,
  ): Promise<boolean> {
    const key = `${fence.ownerToken}:${fence.generation}`
    let pending = this.fenceReleasePromises.get(key)
    if (pending === undefined) {
      pending = this.database.releaseWriterLease(fence)
      this.fenceReleasePromises.set(key, pending)
    }
    return pending
  }

  private startHeartbeat(): void {
    if (
      this.heartbeatHandle !== undefined ||
      this.terminalRequested ||
      this.disposed
    ) {
      return
    }
    this.heartbeatHandle = this.scheduler.setInterval(() => {
      if (
        this.heartbeatPending ||
        this.terminalRequested ||
        this.disposed
      ) {
        return
      }
      this.heartbeatPending = true
      void this.renew()
        .catch(() => undefined)
        .finally(() => {
          this.heartbeatPending = false
        })
    }, this.heartbeatMilliseconds)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatHandle === undefined) return
    this.scheduler.clearInterval(this.heartbeatHandle)
    this.heartbeatHandle = undefined
  }

  private requireLocallyAuthoritativeFence(): WriterLeaseFence {
    this.assertOpen()
    if (this.currentState.kind !== 'writable') {
      throw new WriterLeaseLostError(
        'This browser context does not own the writable session.',
      )
    }
    const fence = this.currentState.fence
    if (
      fence.expiresAtUtcMilliseconds <= this.nowUtcMilliseconds()
    ) {
      const error = new WriterLeaseLostError()
      this.markLost(fence, error)
      throw error
    }
    return fence
  }

  private assertOpen(): void {
    if (this.disposed || this.terminalRequested) {
      throw new WriterLeaseLostError(
        'This browser writer lease instance is closed.',
      )
    }
  }

  private isCurrentEpoch(operationEpoch: number): boolean {
    return (
      operationEpoch === this.epoch &&
      !this.terminalRequested &&
      !this.disposed
    )
  }

  private markLost(
    fence: WriterLeaseFence,
    error: unknown,
  ): void {
    if (this.terminalRequested || this.disposed) return
    this.epoch += 1
    this.stopHeartbeat()
    const reason =
      error instanceof Error ? error.message : String(error)
    this.publish({
      kind: 'lost',
      previousFence: fence,
      reason,
    })
    this.postNotice({
      kind: 'lost',
      generation: fence.generation,
      expiresAtUtcMilliseconds:
        fence.expiresAtUtcMilliseconds,
    })
  }

  private readonly handleNotice = (
    notice: OwnershipNotice,
  ): void => {
    if (
      this.terminalRequested ||
      this.disposed ||
      this.currentState.kind !== 'blocked' ||
      notice.generation < this.currentState.generation
    ) {
      return
    }
    const expiresAtUtcMilliseconds =
      notice.kind === 'released'
        ? this.nowUtcMilliseconds()
        : notice.expiresAtUtcMilliseconds
    if (expiresAtUtcMilliseconds === null) return
    this.publish({
      kind: 'blocked',
      generation: notice.generation,
      expiresAtUtcMilliseconds,
    })
  }

  private publish(
    state: BrowserWriterOwnershipState,
    terminal = false,
  ): void {
    if (this.disposed && !terminal) return
    this.currentState = state
    for (const listener of [...this.listeners]) {
      try {
        listener(state)
      } catch {
        // Ownership observers cannot poison the authoritative lease state.
      }
    }
  }

  private postNotice(
    notice: OwnershipNotice,
    terminal = false,
  ): void {
    if (
      this.disposed ||
      (this.terminalRequested && !terminal)
    ) {
      return
    }
    try {
      this.noticeChannel?.post(notice)
    } catch {
      // BroadcastChannel is advisory; failures never change authority.
    }
  }

  private track<T>(
    promise: Promise<T>,
    collection: Set<Promise<unknown>>,
  ): Promise<T> {
    collection.add(promise)
    void promise.finally(() => {
      collection.delete(promise)
    }).catch(() => undefined)
    return promise
  }
}

export class BrowserBroadcastOwnershipChannel
  implements OwnershipNoticeChannel
{
  private readonly channel: BroadcastChannel
  private readonly listeners =
    new Set<(notice: OwnershipNotice) => void>()

  constructor(
    channelName: string,
    factory?: (name: string) => BroadcastChannel,
  ) {
    const resolvedFactory =
      factory ?? defaultBroadcastChannelFactory
    this.channel = resolvedFactory(channelName)
    this.channel.addEventListener('message', this.handleMessage)
  }

  post(notice: OwnershipNotice): void {
    this.channel.postMessage(notice)
  }

  subscribe(listener: (notice: OwnershipNotice) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  close(): void {
    this.channel.removeEventListener('message', this.handleMessage)
    this.channel.close()
    this.listeners.clear()
  }

  private readonly handleMessage = (event: MessageEvent<unknown>): void => {
    if (!isOwnershipNotice(event.data)) return
    for (const listener of [...this.listeners]) {
      try {
        listener(event.data)
      } catch {
        // Broadcast notices are advisory and must never affect ownership.
      }
    }
  }
}

const browserIntervalScheduler: IntervalScheduler = {
  setInterval: (callback, milliseconds) =>
    globalThis.setInterval(callback, milliseconds),
  clearInterval: (handle) => {
    globalThis.clearInterval(handle as number)
  },
}

function validateHeartbeatBounds(
  leaseDurationMilliseconds: number,
  heartbeatMilliseconds: number,
): void {
  if (
    !Number.isFinite(leaseDurationMilliseconds) ||
    leaseDurationMilliseconds <= 0
  ) {
    throw new Error('Writer lease duration must be positive and finite.')
  }
  if (
    !Number.isFinite(heartbeatMilliseconds) ||
    heartbeatMilliseconds <= 0 ||
    heartbeatMilliseconds > MAXIMUM_HEARTBEAT_MILLISECONDS ||
    heartbeatMilliseconds * 2 > leaseDurationMilliseconds
  ) {
    throw new Error(
      'Writer heartbeat must be positive, at most 10 seconds, and no more than half the lease duration.',
    )
  }
}

function defaultOwnerTokenFactory(): string {
  const browserCrypto = requireBrowserCapability(
    'Crypto',
    globalThis.crypto,
  )
  if (typeof browserCrypto.randomUUID === 'function') {
    return browserCrypto.randomUUID()
  }
  const random = new Uint8Array(16)
  browserCrypto.getRandomValues(random)
  return [...random]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

function defaultBroadcastChannelFactory(
  name: string,
): BroadcastChannel {
  const BroadcastChannelConstructor =
    requireBrowserCapability(
      'BroadcastChannel',
      globalThis.BroadcastChannel,
    )
  return new BroadcastChannelConstructor(name)
}

function sameFenceIdentity(
  left: WriterLeaseFence,
  right: WriterLeaseFence,
): boolean {
  return (
    left.ownerToken === right.ownerToken &&
    left.generation === right.generation
  )
}

function isOwnershipNotice(value: unknown): value is OwnershipNotice {
  if (value === null || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    (record.kind === 'acquired' ||
      record.kind === 'renewed' ||
      record.kind === 'released' ||
      record.kind === 'lost') &&
    typeof record.generation === 'number' &&
    (record.expiresAtUtcMilliseconds === null ||
      typeof record.expiresAtUtcMilliseconds === 'number')
  )
}
