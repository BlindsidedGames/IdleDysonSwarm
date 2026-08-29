import type { DeepReadonly } from '../core/contracts'
import type { FrontendApplicationSnapshot } from '../application/frontendSnapshot'
import type { LifecyclePhase } from './contracts'
import type {
  NativeHostBridgeApi,
  NativeReviewRequestResult,
} from './nativeHostBridge'

export const NATIVE_REVIEW_REQUIRED_INFINITY_COUNT = 2n
export const NATIVE_REVIEW_IDLE_DELAY_MILLISECONDS = 15_000

type ReviewSnapshot = DeepReadonly<FrontendApplicationSnapshot>

export interface NativeReviewRuntimePort {
  snapshot(): ReviewSnapshot
  subscribeSnapshot(listener: (snapshot: ReviewSnapshot) => void): () => void
}

export interface NativeReviewDocumentPort {
  readonly visibilityState: DocumentVisibilityState
  addEventListener(
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions | boolean,
  ): void
  removeEventListener(
    type: string,
    listener: EventListener,
    options?: EventListenerOptions | boolean,
  ): void
}

export interface NativeReviewClock {
  now(): number
  schedule(callback: () => void, milliseconds: number): unknown
  cancel(handle: unknown): void
}

export interface NativeReviewPromptOptions {
  readonly runtime: NativeReviewRuntimePort
  readonly bridge: Pick<
    NativeHostBridgeApi,
    | 'currentLifecyclePhase'
    | 'subscribeLifecycle'
    | 'requestStoreReview'
  >
  readonly documentPort?: NativeReviewDocumentPort
  readonly clock?: NativeReviewClock
  readonly idleDelayMilliseconds?: number
}

const ACTIVITY_EVENTS = [
  'pointerdown',
  'touchstart',
  'keydown',
  'wheel',
  'scroll',
] as const

/**
 * Waits for experienced native players to reach a quiet moment before asking
 * the platform Store to consider showing its system-owned review prompt.
 */
export class NativeReviewPromptCoordinator {
  private readonly runtime: NativeReviewRuntimePort
  private readonly bridge: NativeReviewPromptOptions['bridge']
  private readonly documentPort: NativeReviewDocumentPort
  private readonly clock: NativeReviewClock
  private readonly idleDelayMilliseconds: number
  private unsubscribeSnapshot: (() => void) | undefined
  private unsubscribeLifecycle: (() => void) | undefined
  private timer: unknown
  private lastInfinityCount: bigint | null = null
  private lastSessionRevision: number | null = null
  private lastActivityMilliseconds = 0
  private eligible = false
  private started = false
  private sessionFinished = false
  private requestInFlight = false

  constructor(options: Readonly<NativeReviewPromptOptions>) {
    this.runtime = options.runtime
    this.bridge = options.bridge
    this.documentPort = options.documentPort ?? document
    this.clock = options.clock ?? {
      now: () => performance.now(),
      schedule: (callback, milliseconds) =>
        globalThis.setTimeout(callback, milliseconds),
      cancel: (handle) =>
        globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
    }
    this.idleDelayMilliseconds =
      options.idleDelayMilliseconds ??
      NATIVE_REVIEW_IDLE_DELAY_MILLISECONDS
  }

  start(): void {
    if (this.started || this.sessionFinished) return
    this.started = true
    const activityOptions = { capture: true, passive: true } as const
    for (const eventName of ACTIVITY_EVENTS) {
      this.documentPort.addEventListener(
        eventName,
        this.handleActivity,
        activityOptions,
      )
    }
    this.documentPort.addEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    )
    this.unsubscribeSnapshot = this.runtime.subscribeSnapshot(
      this.observeSnapshot,
    )
    this.unsubscribeLifecycle = this.bridge.subscribeLifecycle(
      this.handleLifecycle,
    )
    this.observeSnapshot(this.runtime.snapshot())
  }

  stop(): void {
    if (!this.started) return
    this.started = false
    this.clearTimer()
    this.unsubscribeSnapshot?.()
    this.unsubscribeLifecycle?.()
    this.unsubscribeSnapshot = undefined
    this.unsubscribeLifecycle = undefined
    const activityOptions = { capture: true } as const
    for (const eventName of ACTIVITY_EVENTS) {
      this.documentPort.removeEventListener(
        eventName,
        this.handleActivity,
        activityOptions,
      )
    }
    this.documentPort.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    )
  }

  private readonly observeSnapshot = (snapshot: ReviewSnapshot): void => {
    if (snapshot.phase !== 'ready') return
    const infinityCount = lifetimeInfinityCount(snapshot)
    if (infinityCount === null) return
    if (
      this.lastSessionRevision === null ||
      snapshot.revision.session !== this.lastSessionRevision
    ) {
      this.lastSessionRevision = snapshot.revision.session
      this.lastInfinityCount = infinityCount
      this.eligible = false
      this.clearTimer()
      return
    }
    const previousInfinityCount = this.lastInfinityCount
    if (previousInfinityCount === null) {
      this.lastInfinityCount = infinityCount
      this.eligible = false
      return
    }
    if (
      infinityCount < NATIVE_REVIEW_REQUIRED_INFINITY_COUNT ||
      infinityCount < previousInfinityCount
    ) {
      this.eligible = false
      this.lastInfinityCount = infinityCount
      this.clearTimer()
      return
    }
    if (infinityCount > previousInfinityCount) {
      this.eligible = true
      this.lastActivityMilliseconds = this.clock.now()
    }
    this.lastInfinityCount = infinityCount
    if (this.eligible) this.scheduleIfReady()
  }

  private readonly handleActivity = (): void => {
    if (!this.eligible || this.sessionFinished) return
    this.lastActivityMilliseconds = this.clock.now()
    this.scheduleIfReady()
  }

  private readonly handleVisibilityChange = (): void => {
    if (this.documentPort.visibilityState !== 'visible') {
      this.clearTimer()
      return
    }
    this.handleActivity()
  }

  private readonly handleLifecycle = (phase: LifecyclePhase): void => {
    if (phase !== 'active') {
      this.clearTimer()
      return
    }
    this.handleActivity()
  }

  private scheduleIfReady(): void {
    this.clearTimer()
    if (
      !this.started ||
      !this.eligible ||
      this.sessionFinished ||
      this.requestInFlight ||
      this.documentPort.visibilityState !== 'visible' ||
      this.bridge.currentLifecyclePhase() !== 'active' ||
      this.bridge.requestStoreReview === undefined
    ) {
      return
    }
    const idleRemaining = Math.max(
      0,
      this.idleDelayMilliseconds -
        (this.clock.now() - this.lastActivityMilliseconds),
    )
    this.timer = this.clock.schedule(
      () => this.requestReview(),
      idleRemaining,
    )
  }

  private requestReview(): void {
    this.timer = undefined
    if (
      this.documentPort.visibilityState !== 'visible' ||
      this.bridge.currentLifecyclePhase() !== 'active' ||
      this.clock.now() - this.lastActivityMilliseconds <
        this.idleDelayMilliseconds
    ) {
      this.scheduleIfReady()
      return
    }
    const requestStoreReview = this.bridge.requestStoreReview
    if (requestStoreReview === undefined) return
    this.requestInFlight = true
    void requestStoreReview.call(this.bridge)
      .catch((): NativeReviewRequestResult | undefined => undefined)
      .finally(() => {
        this.requestInFlight = false
        this.sessionFinished = true
        this.clearTimer()
      })
  }

  private clearTimer(): void {
    if (this.timer === undefined) return
    this.clock.cancel(this.timer)
    this.timer = undefined
  }
}

export function installNativeReviewPrompt(
  options: Readonly<NativeReviewPromptOptions>,
): () => void {
  if (options.bridge.requestStoreReview === undefined) {
    return () => undefined
  }
  const coordinator = new NativeReviewPromptCoordinator(options)
  coordinator.start()
  return () => coordinator.stop()
}

function lifetimeInfinityCount(
  snapshot: ReviewSnapshot,
): bigint | null {
  if (snapshot.phase !== 'ready') return null
  const totals = snapshot.gameplay.progression.statistics.lifetime
  return totals.ordinaryInfinityCount + totals.breakInfinityCount
}
