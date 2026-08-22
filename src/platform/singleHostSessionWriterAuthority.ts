import type {
  WriterAuthorityAcquisition,
  WriterAuthorityListener,
  WriterAuthorityPort,
  WriterAuthorityState,
  WriterOperationAuthority,
} from './writerAuthority'
import { WriterAuthorityLostError } from './writerAuthority'

export interface SingleHostSessionWriterAuthorityOptions {
  readonly sessionId?: string
  readonly sessionIdFactory?: () => string
}

/**
 * Authority for the current single-renderer native hosts.
 *
 * Android is singleTask, iOS multi-scene support is disabled, and Electron
 * creates one gameplay BrowserWindow. The native process owns that renderer,
 * so suspension must not turn elapsed wall time or missing timers into a
 * competing writer. Multi-window native coordination is intentionally outside
 * this invariant and would require a host-process authority service.
 */
export class SingleHostSessionWriterAuthority
implements WriterAuthorityPort {
  private readonly sessionId: string
  private readonly listeners = new Set<WriterAuthorityListener>()
  private readonly pendingOperations = new Set<Promise<unknown>>()
  private currentState: WriterAuthorityState = { kind: 'idle' }
  private generation = 0
  private epoch = 0
  private terminalRequested = false
  private disposed = false
  private acquisitionPromise: Promise<WriterAuthorityAcquisition> | undefined
  private releasePromise: Promise<boolean> | undefined
  private shutdownPromise: Promise<boolean> | undefined

  constructor(
    options: Readonly<SingleHostSessionWriterAuthorityOptions> = {},
  ) {
    this.sessionId = options.sessionId ??
      (options.sessionIdFactory ?? defaultSessionIdFactory)()
  }

  state(): WriterAuthorityState {
    return this.currentState
  }

  subscribe(listener: WriterAuthorityListener): () => void {
    if (this.disposed) return () => undefined
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  acquire(): Promise<WriterAuthorityAcquisition> {
    this.assertOpen()
    if (this.currentState.kind === 'writable') {
      return Promise.resolve({ acquired: true })
    }
    this.acquisitionPromise ??= Promise.resolve().then(() => {
      const operationEpoch = this.epoch
      this.generation += 1
      if (!this.isCurrentEpoch(operationEpoch)) {
        throw cancelledSessionError('acquisition')
      }
      this.publish({
        kind: 'writable',
        sessionId: this.sessionId,
        generation: this.generation,
      })
      return Object.freeze({ acquired: true as const })
    }).finally(() => {
      this.acquisitionPromise = undefined
    })
    return this.acquisitionPromise
  }

  assertWritable(): Promise<Readonly<{
    sessionId: string
    generation: number
  }>> {
    const session = this.requireSession()
    const operationEpoch = this.epoch
    return Promise.resolve(session).then((validated) => {
      if (!this.isSessionAuthoritative(validated, operationEpoch)) {
        throw cancelledSessionError('validation')
      }
      return validated
    })
  }

  runAuthoritativeOperation<T>(
    operation: (
      authority: WriterOperationAuthority,
    ) => T | Promise<T>,
  ): Promise<T> {
    const promise = this.runAuthoritativeOperationOnce(operation)
    this.pendingOperations.add(promise)
    void promise.finally(() => {
      this.pendingOperations.delete(promise)
    }).catch(() => undefined)
    return promise
  }

  isAuthoritative(): boolean {
    return !this.terminalRequested &&
      !this.disposed &&
      this.currentState.kind === 'writable'
  }

  cancellationRequested(): boolean {
    return !this.isAuthoritative()
  }

  release(): Promise<boolean> {
    if (this.shutdownPromise !== undefined) return this.shutdownPromise
    this.releasePromise ??= this.beginTerminal(false)
    return this.releasePromise
  }

  shutdown(): Promise<boolean> {
    if (this.shutdownPromise !== undefined) return this.shutdownPromise
    this.disposed = true
    this.cancelTerminal({ kind: 'disposed' })
    this.listeners.clear()
    this.shutdownPromise = this.releasePromise ?? this.finishTerminal()
    return this.shutdownPromise
  }

  private async runAuthoritativeOperationOnce<T>(
    operation: (
      authority: WriterOperationAuthority,
    ) => T | Promise<T>,
  ): Promise<T> {
    const session = await this.assertWritable()
    const operationEpoch = this.epoch
    const authority = this.createAuthority(session, operationEpoch)
    if (!authority.isAuthoritative()) {
      throw cancelledSessionError('entry')
    }
    const result = await operation(authority)
    if (authority.cancellationRequested()) {
      throw cancelledSessionError('completion')
    }
    await this.assertWritable()
    if (!authority.isAuthoritative()) {
      throw cancelledSessionError('post-operation validation')
    }
    return result
  }

  private createAuthority(
    session: Readonly<{ sessionId: string; generation: number }>,
    operationEpoch: number,
  ): WriterOperationAuthority {
    return Object.freeze({
      ...session,
      deadlineUtcMilliseconds: null,
      isAuthoritative: () =>
        this.isSessionAuthoritative(session, operationEpoch),
      cancellationRequested: () =>
        !this.isSessionAuthoritative(session, operationEpoch),
    })
  }

  private requireSession(): Readonly<{
    sessionId: string
    generation: number
  }> {
    this.assertOpen()
    if (this.currentState.kind !== 'writable') {
      throw new WriterAuthorityLostError(
        'The native host does not own a writable session.',
      )
    }
    return Object.freeze({
      sessionId: this.currentState.sessionId,
      generation: this.currentState.generation,
    })
  }

  private isSessionAuthoritative(
    session: Readonly<{ sessionId: string; generation: number }>,
    operationEpoch: number,
  ): boolean {
    return this.isCurrentEpoch(operationEpoch) &&
      this.currentState.kind === 'writable' &&
      this.currentState.sessionId === session.sessionId &&
      this.currentState.generation === session.generation
  }

  private beginTerminal(disposed: boolean): Promise<boolean> {
    this.cancelTerminal(disposed ? { kind: 'disposed' } : { kind: 'released' })
    return this.finishTerminal()
  }

  private cancelTerminal(
    state: Extract<WriterAuthorityState, { kind: 'released' | 'disposed' }>,
  ): void {
    if (!this.terminalRequested) {
      this.terminalRequested = true
      this.epoch += 1
    }
    this.publish(state, true)
  }

  private async finishTerminal(): Promise<boolean> {
    const owned = this.generation > 0
    for (;;) {
      const pending = [
        ...(this.acquisitionPromise === undefined
          ? []
          : [this.acquisitionPromise]),
        ...this.pendingOperations,
      ]
      if (pending.length === 0) return owned
      await Promise.allSettled(pending)
    }
  }

  private assertOpen(): void {
    if (this.terminalRequested || this.disposed) {
      throw new WriterAuthorityLostError(
        'This native writer session is closed.',
      )
    }
  }

  private isCurrentEpoch(operationEpoch: number): boolean {
    return operationEpoch === this.epoch &&
      !this.terminalRequested &&
      !this.disposed
  }

  private publish(state: WriterAuthorityState, terminal = false): void {
    if (this.disposed && !terminal) return
    this.currentState = state
    for (const listener of [...this.listeners]) {
      try {
        listener(state)
      } catch {
        // Presentation observers cannot poison native authority.
      }
    }
  }
}

function cancelledSessionError(operation: string): WriterAuthorityLostError {
  return new WriterAuthorityLostError(
    `Native writer ${operation} completed after the session was cancelled.`,
  )
}

function defaultSessionIdFactory(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `native-${globalThis.crypto.randomUUID()}`
  }
  return `native-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
