import type { IntervalScheduler } from './browserWriterLease'

const MAXIMUM_DIRTY_INTERVAL_MILLISECONDS = 30_000

export interface PeriodicCheckpointPort {
  isDirty(): boolean
  checkpoint(): Promise<
    | { readonly committed: true }
    | {
        readonly committed: false
        readonly code?: string
        readonly reason?: string
      }
  >
}

export interface PeriodicCheckpointFailure {
  readonly code: string
  readonly reason: string
}

export interface PeriodicCheckpointOptions {
  readonly port: PeriodicCheckpointPort
  readonly intervalMilliseconds?: number
  readonly scheduler?: IntervalScheduler
  readonly onFailure?: (
    failure: PeriodicCheckpointFailure,
  ) => void
}

export class PeriodicCheckpointScheduler {
  private readonly port: PeriodicCheckpointPort
  private readonly intervalMilliseconds: number
  private readonly scheduler: IntervalScheduler
  private readonly onFailure:
    | ((failure: PeriodicCheckpointFailure) => void)
    | undefined
  private timer: unknown
  private pending: Promise<boolean> | undefined
  private queued = false
  private stopped = false
  private epoch = 0

  constructor(options: Readonly<PeriodicCheckpointOptions>) {
    const intervalMilliseconds =
      options.intervalMilliseconds ??
      MAXIMUM_DIRTY_INTERVAL_MILLISECONDS
    if (
      !Number.isFinite(intervalMilliseconds) ||
      intervalMilliseconds <= 0 ||
      intervalMilliseconds >
        MAXIMUM_DIRTY_INTERVAL_MILLISECONDS
    ) {
      throw new Error(
        'Dirty checkpoint interval must be between 1 and 30000 milliseconds.',
      )
    }
    this.port = options.port
    this.intervalMilliseconds = intervalMilliseconds
    this.scheduler = options.scheduler ?? browserScheduler
    this.onFailure = options.onFailure
  }

  start(): void {
    if (this.timer !== undefined) return
    if (this.pending !== undefined && this.stopped) {
      throw new Error(
        'Wait for checkpoint shutdown before restarting the scheduler.',
      )
    }
    this.stopped = false
    this.epoch += 1
    this.timer = this.scheduler.setInterval(() => {
      void this.requestCheckpoint()
    }, this.intervalMilliseconds)
  }

  stop(): void {
    this.stopped = true
    this.queued = false
    this.epoch += 1
    if (this.timer !== undefined) {
      this.scheduler.clearInterval(this.timer)
    }
    this.timer = undefined
  }

  requestCheckpoint(): Promise<boolean> {
    if (this.stopped) return Promise.resolve(false)
    if (this.pending !== undefined) {
      this.queued = true
      return this.pending
    }
    if (!this.port.isDirty()) return Promise.resolve(true)

    const operationEpoch = this.epoch
    this.pending = this.runCheckpoint().finally(() => {
      this.pending = undefined
      if (
        this.queued &&
        !this.stopped &&
        operationEpoch === this.epoch
      ) {
        this.queued = false
        void this.requestCheckpoint()
      }
    })
    return this.pending
  }

  async checkpointBeforeReload(): Promise<boolean> {
    if (this.stopped) return false
    if (this.pending !== undefined) await this.pending
    return this.requestCheckpoint()
  }

  async shutdown(): Promise<void> {
    this.stop()
    await this.pending?.catch(() => undefined)
  }

  private async runCheckpoint(): Promise<boolean> {
    try {
      const result = await this.port.checkpoint()
      if (result.committed) return true
      this.reportFailure(
        result.code ?? 'CHECKPOINT-FAILED',
        result.reason ?? 'The periodic checkpoint failed.',
      )
      return false
    } catch (error) {
      this.reportFailure(
        'CHECKPOINT-FAILED',
        error instanceof Error ? error.message : String(error),
      )
      return false
    }
  }

  private reportFailure(code: string, reason: string): void {
    try {
      this.onFailure?.(Object.freeze({ code, reason }))
    } catch {
      // A warning sink cannot reopen a completed checkpoint failure.
    }
  }
}

const browserScheduler: IntervalScheduler = {
  setInterval: (callback, milliseconds) =>
    globalThis.setInterval(callback, milliseconds),
  clearInterval: (handle) => {
    globalThis.clearInterval(handle as number)
  },
}
