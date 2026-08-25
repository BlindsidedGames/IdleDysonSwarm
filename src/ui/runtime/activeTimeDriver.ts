import {
  BrowserMonotonicClock,
} from '../../platform/browserLifecycle'

export const DEFAULT_ACTIVE_TIME_DELIVERY_INTERVAL_MILLISECONDS = 33
export const MINIMUM_ACTIVE_TIME_DELIVERY_INTERVAL_MILLISECONDS = 33
export const MAXIMUM_ACTIVE_TIME_DELIVERY_INTERVAL_MILLISECONDS = 200
export const ACTIVE_TIME_HIBERNATION_THRESHOLD_MILLISECONDS = 60_000

export interface ActiveTimeMonotonicClock {
  nowMilliseconds(): number
}

export interface ActiveTimeFrameScheduler {
  requestFrame(callback: () => void): unknown
  cancelFrame(handle: unknown): void
}

export interface SuspendedActiveTime {
  readonly activeMilliseconds: number
  readonly hibernationMilliseconds: number
  readonly hasInFlightDelivery: boolean
  readonly inFlightResidue: Promise<ActiveTimeResidue>
}

export interface ActiveTimeResidue {
  readonly activeMilliseconds: number
  readonly hibernationMilliseconds: number
}

export interface ActiveTimeDriverOptions<TResult> {
  readonly clock?: ActiveTimeMonotonicClock
  readonly scheduler?: ActiveTimeFrameScheduler
  readonly minimumDeliveryMilliseconds?: number
  readonly deliver: (milliseconds: number) => Promise<TResult>
  readonly onDelivered: (result: TResult) => void
  readonly undeliveredMilliseconds?: (
    result: TResult,
    attemptedMilliseconds: number,
  ) => number
  readonly onFailure?: (error: unknown) => void
  readonly onHibernation?: (
    milliseconds: number,
  ) => void | Promise<void>
}

/**
 * Coalesces exact monotonic foreground elapsed time behind one asynchronous
 * delivery at a time. A deliberately capped timer schedules sampling only;
 * the monotonic clock remains the sole authority for gameplay duration.
 */
export class CoordinatorActiveTimeDriver<TResult> {
  private readonly clock: ActiveTimeMonotonicClock
  private readonly scheduler: ActiveTimeFrameScheduler
  private readonly deliver: (milliseconds: number) => Promise<TResult>
  private minimumDeliveryMilliseconds: number
  private readonly onDelivered: (result: TResult) => void
  private readonly undeliveredMilliseconds: (
    result: TResult,
    attemptedMilliseconds: number,
  ) => number
  private readonly onFailure: (error: unknown) => void
  private readonly onHibernation: (
    milliseconds: number,
  ) => void | Promise<void>
  private sampleHandle: unknown
  private lastSampleMilliseconds: number | undefined
  private pendingMilliseconds = 0
  private pendingHibernationMilliseconds = 0
  private deliveryPending = false
  private inFlightResidue: Promise<ActiveTimeResidue> | undefined
  private foreground = false
  private disposed = false
  private publicationEpoch = 0

  constructor(options: Readonly<ActiveTimeDriverOptions<TResult>>) {
    this.clock = options.clock ?? new BrowserMonotonicClock()
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
    this.scheduler =
      options.scheduler ?? new BrowserActiveTimeFrameScheduler(
        this.minimumDeliveryMilliseconds,
      )
    this.deliver = options.deliver
    this.onDelivered = options.onDelivered
    this.undeliveredMilliseconds =
      options.undeliveredMilliseconds ?? (() => 0)
    this.onFailure = options.onFailure ?? (() => undefined)
    this.onHibernation = options.onHibernation ?? (() => undefined)
  }

  setDeliveryIntervalMilliseconds(milliseconds: number): void {
    validateDeliveryInterval(milliseconds)
    this.minimumDeliveryMilliseconds = milliseconds
    if ('setDelayMilliseconds' in this.scheduler) {
      ;(this.scheduler as BrowserActiveTimeFrameScheduler)
        .setDelayMilliseconds(milliseconds)
    }
  }

  startForeground(): void {
    if (this.disposed || this.foreground) return
    this.foreground = true
    try {
      this.lastSampleMilliseconds = this.readClock()
      this.scheduleSample()
    } catch (error) {
      this.foreground = false
      this.lastSampleMilliseconds = undefined
      this.notifyFailure(error)
    }
  }

  /**
   * Synchronously stops foreground sampling and transfers elapsed time not
   * already admitted to a delivery. The lifecycle router runs that returned
   * duration before its save event inside one authority-fenced operation.
   */
  suspendForLifecycle(): SuspendedActiveTime {
    if (this.disposed) {
      return emptySuspendedActiveTime()
    }
    const wasForeground = this.foreground
    try {
      if (wasForeground) this.captureElapsed()
      return {
        activeMilliseconds: this.pendingMilliseconds,
        hibernationMilliseconds: this.pendingHibernationMilliseconds,
        hasInFlightDelivery: this.inFlightResidue !== undefined,
        inFlightResidue:
          this.inFlightResidue ?? Promise.resolve(emptyActiveTimeResidue()),
      }
    } finally {
      this.foreground = false
      this.publicationEpoch += 1
      this.lastSampleMilliseconds = undefined
      this.pendingMilliseconds = 0
      this.pendingHibernationMilliseconds = 0
      this.cancelSample()
    }
  }

  /** Stops sampling without surrendering queued residue to a caller. */
  pauseForeground(): void {
    if (this.disposed || !this.foreground) return
    try {
      this.captureElapsed()
    } catch (error) {
      this.notifyFailure(error)
    } finally {
      this.foreground = false
      this.lastSampleMilliseconds = undefined
      this.cancelSample()
    }
  }

  restoreSuspendedTime(residue: ActiveTimeResidue): void {
    if (this.disposed) return
    this.pendingMilliseconds += Math.max(0, residue.activeMilliseconds)
    this.pendingHibernationMilliseconds += Math.max(
      0,
      residue.hibernationMilliseconds,
    )
  }

  shutdown(): void {
    if (this.disposed) return
    this.disposed = true
    this.foreground = false
    this.publicationEpoch += 1
    this.pendingMilliseconds = 0
    this.lastSampleMilliseconds = undefined
    this.cancelSample()
  }

  private readonly handleSample = (): void => {
    this.sampleHandle = undefined
    if (!this.foreground || this.disposed) return
    try {
      this.captureElapsed()
      this.pump()
      this.scheduleSample()
    } catch (error) {
      this.foreground = false
      this.publicationEpoch += 1
      this.lastSampleMilliseconds = undefined
      this.pendingMilliseconds = 0
      this.notifyFailure(error)
    }
  }

  private captureElapsed(): void {
    const now = this.readClock()
    const previous = this.lastSampleMilliseconds
    this.lastSampleMilliseconds = Math.max(previous ?? now, now)
    if (previous === undefined) return
    const elapsed = Math.max(0, now - previous)
    if (elapsed > ACTIVE_TIME_HIBERNATION_THRESHOLD_MILLISECONDS) {
      this.pendingHibernationMilliseconds += elapsed
    } else if (elapsed > 0) {
      this.pendingMilliseconds += elapsed
    }
  }

  private pump(): void {
    if (this.disposed || !this.foreground || this.deliveryPending) return
    if (this.pendingHibernationMilliseconds > 0) {
      const milliseconds = this.pendingHibernationMilliseconds
      const publicationEpoch = this.publicationEpoch
      this.pendingHibernationMilliseconds = 0
      this.deliveryPending = true
      let resolveResidue!: (residue: ActiveTimeResidue) => void
      const inFlightResidue = new Promise<ActiveTimeResidue>((resolve) => {
        resolveResidue = resolve
      })
      this.inFlightResidue = inFlightResidue
      let succeeded = false
      let retryDeferred = false
      void Promise.resolve(this.onHibernation(milliseconds))
        .then(() => {
          succeeded = true
          resolveResidue(emptyActiveTimeResidue())
        })
        .catch((error: unknown) => {
          const driverOwnsResidue =
            !this.disposed &&
            publicationEpoch === this.publicationEpoch
          if (driverOwnsResidue) {
            this.pendingHibernationMilliseconds += milliseconds
            retryDeferred = true
          }
          resolveResidue(driverOwnsResidue
            ? emptyActiveTimeResidue()
            : {
                activeMilliseconds: 0,
                hibernationMilliseconds: milliseconds,
              })
          if (driverOwnsResidue) this.notifyFailure(error)
        })
        .finally(() => {
          if (this.inFlightResidue === inFlightResidue) {
            this.inFlightResidue = undefined
          }
          this.deliveryPending = false
          if (succeeded && !retryDeferred) this.pump()
        })
      return
    }
    if (
      this.pendingMilliseconds < this.minimumDeliveryMilliseconds
    ) return
    const milliseconds = this.pendingMilliseconds
    const publicationEpoch = this.publicationEpoch
    this.pendingMilliseconds = 0
    this.deliveryPending = true
    let resolveResidue!: (residue: ActiveTimeResidue) => void
    const inFlightResidue = new Promise<ActiveTimeResidue>((resolve) => {
      resolveResidue = resolve
    })
    this.inFlightResidue = inFlightResidue
    let retryDeferred = false
    void this.deliver(milliseconds)
      .then((result) => {
        let undelivered = 0
        try {
          undelivered = this.undeliveredMilliseconds(
            result,
            milliseconds,
          )
        } catch (error) {
          // Gameplay has already accepted this delivery. A projection or
          // observer failure must never replay consumed elapsed time.
          this.notifyFailure(error)
        }
        const driverOwnsResidue =
          !this.disposed &&
          publicationEpoch === this.publicationEpoch
        if (
          driverOwnsResidue &&
          Number.isFinite(undelivered) &&
          undelivered > 0
        ) {
          this.pendingMilliseconds += Math.min(
            milliseconds,
            undelivered,
          )
          retryDeferred = true
        }
        resolveResidue({
          activeMilliseconds:
            !driverOwnsResidue &&
            Number.isFinite(undelivered) && undelivered > 0
              ? Math.min(milliseconds, undelivered)
              : 0,
          hibernationMilliseconds: 0,
        })
        if (driverOwnsResidue) this.notifyDelivered(result)
      })
      .catch((error: unknown) => {
        const driverOwnsResidue =
          !this.disposed &&
          publicationEpoch === this.publicationEpoch
        if (driverOwnsResidue) {
          this.pendingMilliseconds += milliseconds
          retryDeferred = true
        }
        resolveResidue(driverOwnsResidue
          ? emptyActiveTimeResidue()
          : {
              activeMilliseconds: milliseconds,
              hibernationMilliseconds: 0,
            })
        if (driverOwnsResidue) this.notifyFailure(error)
      })
      .finally(() => {
        if (this.inFlightResidue === inFlightResidue) {
          this.inFlightResidue = undefined
        }
        this.deliveryPending = false
        if (!retryDeferred) this.pump()
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

  private notifyDelivered(result: TResult): void {
    try {
      this.onDelivered(result)
    } catch (error) {
      this.notifyFailure(error)
    }
  }

  private notifyFailure(error: unknown): void {
    try {
      this.onFailure(error)
    } catch {
      // Observers cannot change elapsed-time ownership.
    }
  }

  private scheduleSample(): void {
    if (
      !this.foreground ||
      this.disposed ||
      this.sampleHandle !== undefined
    ) {
      return
    }
    this.sampleHandle = this.scheduler.requestFrame(this.handleSample)
  }

  private cancelSample(): void {
    if (this.sampleHandle === undefined) return
    this.scheduler.cancelFrame(this.sampleHandle)
    this.sampleHandle = undefined
  }
}

function emptyActiveTimeResidue(): ActiveTimeResidue {
  return { activeMilliseconds: 0, hibernationMilliseconds: 0 }
}

function emptySuspendedActiveTime(): SuspendedActiveTime {
  return {
    ...emptyActiveTimeResidue(),
    hasInFlightDelivery: false,
    inFlightResidue: Promise.resolve(emptyActiveTimeResidue()),
  }
}

class BrowserActiveTimeFrameScheduler
  implements ActiveTimeFrameScheduler
{
  private delayMilliseconds: number

  constructor(delayMilliseconds: number) {
    this.delayMilliseconds = delayMilliseconds
  }

  setDelayMilliseconds(milliseconds: number): void {
    this.delayMilliseconds = milliseconds
  }

  requestFrame(callback: () => void): unknown {
    if (typeof globalThis.setTimeout !== 'function') {
      throw new Error(
        'setTimeout is unavailable for active-time scheduling.',
      )
    }
    return globalThis.setTimeout(callback, this.delayMilliseconds)
  }

  cancelFrame(handle: unknown): void {
    if (
      typeof globalThis.clearTimeout !== 'function' ||
      handle === undefined
    ) {
      return
    }
    globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>)
  }
}

function validateDeliveryInterval(milliseconds: number): void {
  if (
    !Number.isInteger(milliseconds) ||
    milliseconds < MINIMUM_ACTIVE_TIME_DELIVERY_INTERVAL_MILLISECONDS ||
    milliseconds > MAXIMUM_ACTIVE_TIME_DELIVERY_INTERVAL_MILLISECONDS
  ) {
    throw new Error(
      'The active-time delivery interval must be an integer from 33 to 200 milliseconds.',
    )
  }
}
