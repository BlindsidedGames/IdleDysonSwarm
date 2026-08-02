import {
  BrowserMonotonicClock,
} from '../../platform/browserLifecycle'

export const DEFAULT_ACTIVE_TIME_DELIVERY_INTERVAL_MILLISECONDS = 100

export interface ActiveTimeMonotonicClock {
  nowMilliseconds(): number
}

export interface ActiveTimeFrameScheduler {
  requestFrame(callback: () => void): unknown
  cancelFrame(handle: unknown): void
}

export interface ActiveTimeDriverOptions<TResult> {
  readonly clock?: ActiveTimeMonotonicClock
  readonly scheduler?: ActiveTimeFrameScheduler
  readonly minimumDeliveryMilliseconds?: number
  readonly deliver: (milliseconds: number) => Promise<TResult>
  readonly onDelivered: (result: TResult) => void
  readonly onFailure?: (error: unknown) => void
}

/**
 * Coalesces exact monotonic foreground elapsed time behind one asynchronous
 * delivery at a time. Animation frames schedule sampling only; they never
 * define or approximate gameplay duration.
 */
export class CoordinatorActiveTimeDriver<TResult> {
  private readonly clock: ActiveTimeMonotonicClock
  private readonly scheduler: ActiveTimeFrameScheduler
  private readonly deliver: (milliseconds: number) => Promise<TResult>
  private readonly minimumDeliveryMilliseconds: number
  private readonly onDelivered: (result: TResult) => void
  private readonly onFailure: (error: unknown) => void
  private frameHandle: unknown
  private lastSampleMilliseconds: number | undefined
  private pendingMilliseconds = 0
  private deliveryPending = false
  private foreground = false
  private disposed = false
  private publicationEpoch = 0

  constructor(options: Readonly<ActiveTimeDriverOptions<TResult>>) {
    this.clock = options.clock ?? new BrowserMonotonicClock()
    this.scheduler =
      options.scheduler ?? new BrowserActiveTimeFrameScheduler()
    this.minimumDeliveryMilliseconds =
      options.minimumDeliveryMilliseconds ??
      DEFAULT_ACTIVE_TIME_DELIVERY_INTERVAL_MILLISECONDS
    if (
      !Number.isFinite(this.minimumDeliveryMilliseconds) ||
      this.minimumDeliveryMilliseconds <= 0
    ) {
      throw new Error(
        'The active-time delivery interval must be finite and positive.',
      )
    }
    this.deliver = options.deliver
    this.onDelivered = options.onDelivered
    this.onFailure = options.onFailure ?? (() => undefined)
  }

  startForeground(): void {
    if (this.disposed || this.foreground) return
    this.foreground = true
    this.publicationEpoch += 1
    try {
      this.lastSampleMilliseconds = this.readClock()
      this.scheduleFrame()
    } catch (error) {
      this.foreground = false
      this.lastSampleMilliseconds = undefined
      this.onFailure(error)
    }
  }

  /**
   * Synchronously stops foreground sampling and transfers elapsed time not
   * already admitted to a delivery. The lifecycle router runs that returned
   * duration before its save event inside one authority-fenced operation.
   */
  suspendForLifecycle(): number {
    if (this.disposed || !this.foreground) return 0
    try {
      this.captureElapsed()
      return this.pendingMilliseconds
    } finally {
      this.foreground = false
      this.publicationEpoch += 1
      this.lastSampleMilliseconds = undefined
      this.pendingMilliseconds = 0
      this.cancelFrame()
    }
  }

  shutdown(): void {
    if (this.disposed) return
    this.disposed = true
    this.foreground = false
    this.publicationEpoch += 1
    this.pendingMilliseconds = 0
    this.lastSampleMilliseconds = undefined
    this.cancelFrame()
  }

  private readonly handleFrame = (): void => {
    this.frameHandle = undefined
    if (!this.foreground || this.disposed) return
    try {
      this.captureElapsed()
      this.pump()
      this.scheduleFrame()
    } catch (error) {
      this.foreground = false
      this.publicationEpoch += 1
      this.lastSampleMilliseconds = undefined
      this.pendingMilliseconds = 0
      this.onFailure(error)
    }
  }

  private captureElapsed(): void {
    const now = this.readClock()
    const previous = this.lastSampleMilliseconds
    this.lastSampleMilliseconds = Math.max(previous ?? now, now)
    if (previous === undefined) return
    const elapsed = Math.max(0, now - previous)
    if (elapsed > 0) this.pendingMilliseconds += elapsed
  }

  private pump(): void {
    if (
      this.disposed ||
      this.deliveryPending ||
      this.pendingMilliseconds <
        this.minimumDeliveryMilliseconds
    ) {
      return
    }
    const milliseconds = this.pendingMilliseconds
    const publicationEpoch = this.publicationEpoch
    this.pendingMilliseconds = 0
    this.deliveryPending = true
    void this.deliver(milliseconds)
      .then((result) => {
        if (
          !this.disposed &&
          publicationEpoch === this.publicationEpoch
        ) {
          this.onDelivered(result)
        }
      })
      .catch((error: unknown) => {
        if (
          !this.disposed &&
          publicationEpoch === this.publicationEpoch
        ) {
          this.onFailure(error)
        }
      })
      .finally(() => {
        this.deliveryPending = false
        this.pump()
      })
  }

  private readClock(): number {
    const value = this.clock.nowMilliseconds()
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        'The active-time monotonic clock must return finite non-negative milliseconds.',
      )
    }
    return value
  }

  private scheduleFrame(): void {
    if (
      !this.foreground ||
      this.disposed ||
      this.frameHandle !== undefined
    ) {
      return
    }
    this.frameHandle = this.scheduler.requestFrame(this.handleFrame)
  }

  private cancelFrame(): void {
    if (this.frameHandle === undefined) return
    this.scheduler.cancelFrame(this.frameHandle)
    this.frameHandle = undefined
  }
}

class BrowserActiveTimeFrameScheduler
  implements ActiveTimeFrameScheduler
{
  requestFrame(callback: () => void): unknown {
    if (typeof globalThis.requestAnimationFrame !== 'function') {
      throw new Error(
        'requestAnimationFrame is unavailable for active-time scheduling.',
      )
    }
    return globalThis.requestAnimationFrame(callback)
  }

  cancelFrame(handle: unknown): void {
    if (
      typeof globalThis.cancelAnimationFrame !== 'function' ||
      typeof handle !== 'number'
    ) {
      return
    }
    globalThis.cancelAnimationFrame(handle)
  }
}
