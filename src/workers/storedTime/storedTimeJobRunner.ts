import type { CanonicalRuntimeState } from '../../application/canonicalRuntimeSession'
import type { DysonPresentationTuning } from '../../simulation/canonicalDysonDerivation'
import { createProductionEventContext } from '../../simulation/productionEventContext'
import {
  STORED_TIME_WORKER_PROTOCOL_VERSION,
  isStoredTimeWorkerOutboundMessage,
  type StoredTimeJobProgress,
  type StoredTimeJobStartMessage,
  type StoredTimeJobTerminalMessage,
  type StoredTimeWorkerOutboundMessage,
} from './storedTimeProtocol'
import { StoredTimeSimulation } from './storedTimeSimulation'

const CANCELLATION_POLL_MILLISECONDS = 50
const WORKER_READY_TIMEOUT_MILLISECONDS = 5_000
const WORKER_INACTIVITY_TIMEOUT_MILLISECONDS = 10_000
const WORKER_IDLE_TIMEOUT_MILLISECONDS = 30_000
const FALLBACK_CHUNK_BUDGET_MILLISECONDS = 8
const FALLBACK_PROGRESS_INTERVAL_MILLISECONDS = 250

export interface StoredTimeJobRequest {
  readonly jobId: string
  readonly state: CanonicalRuntimeState
  readonly requestedSeconds: number
  readonly infinityMinimumCycleSeconds: number
  readonly dysonPresentationTuning: Readonly<DysonPresentationTuning>
}

export interface StoredTimeJobRunOptions {
  readonly cancelRequested?: () => boolean
  readonly onProgress?: (progress: StoredTimeJobProgress) => void
}

export interface StoredTimeJobRunner {
  run(
    request: Readonly<StoredTimeJobRequest>,
    options?: Readonly<StoredTimeJobRunOptions>,
  ): Promise<StoredTimeJobTerminalMessage>
  dispose(): void
}

export interface BrowserStoredTimeJobRunnerOptions {
  readonly createWorker?: () => Worker
  readonly workerSupported?: () => boolean
  readonly workerInactivityTimeoutMilliseconds?: number
}

/**
 * Maintains one warm module worker for repeat spends. Hosts without Worker
 * support use the same bounded engine with event-loop yields, preserving
 * correctness and responsiveness instead of falling back to a blocking loop.
 */
export class BrowserStoredTimeJobRunner implements StoredTimeJobRunner {
  private readonly options: Readonly<BrowserStoredTimeJobRunnerOptions>
  private worker: Worker | null = null
  private ready: Promise<void> | null = null
  private activeJobId: string | null = null
  private idleTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: Readonly<BrowserStoredTimeJobRunnerOptions> = {}) {
    this.options = options
  }

  async run(
    request: Readonly<StoredTimeJobRequest>,
    options: Readonly<StoredTimeJobRunOptions> = {},
  ): Promise<StoredTimeJobTerminalMessage> {
    if (this.activeJobId !== null) {
      throw new Error('A Stored Time job is already active.')
    }
    this.activeJobId = request.jobId
    this.clearIdleTimer()
    try {
      if (!this.workerSupported()) {
        return await runCooperatively(request, options)
      }
      try {
        return await this.runInWorker(request, options)
      } catch {
        // A stale service-worker cache, blocked module worker, or worker crash
        // must not make Stored Time unusable. The detached candidate is safe
        // to restart through the cooperative bounded runner.
        this.dispose()
        this.activeJobId = request.jobId
        return await runCooperatively(request, options)
      }
    } finally {
      this.activeJobId = null
      this.scheduleIdleTermination()
    }
  }

  dispose(): void {
    this.clearIdleTimer()
    this.worker?.terminate()
    this.worker = null
    this.ready = null
    this.activeJobId = null
  }

  private workerSupported(): boolean {
    return this.options.workerSupported?.() ?? typeof Worker !== 'undefined'
  }

  private async runInWorker(
    request: Readonly<StoredTimeJobRequest>,
    options: Readonly<StoredTimeJobRunOptions>,
  ): Promise<StoredTimeJobTerminalMessage> {
    const worker = this.requireWorker()
    await this.ready
    return new Promise<StoredTimeJobTerminalMessage>((resolve, reject) => {
      let settled = false
      let inactivityTimer: ReturnType<typeof setTimeout>
      const armInactivityTimer = () => {
        clearTimeout(inactivityTimer)
        inactivityTimer = setTimeout(() => {
          fail(new Error('Stored Time worker stopped reporting progress.'))
        }, this.options.workerInactivityTimeoutMilliseconds ??
          WORKER_INACTIVITY_TIMEOUT_MILLISECONDS)
      }
      const finish = (terminal: StoredTimeJobTerminalMessage) => {
        if (settled) return
        settled = true
        cleanup()
        resolve(terminal)
      }
      const fail = (error: unknown) => {
        if (settled) return
        settled = true
        cleanup()
        this.dispose()
        reject(error)
      }
      const onMessage = (event: MessageEvent<unknown>) => {
        try {
          if (!isStoredTimeWorkerOutboundMessage(event.data)) return
          const message = event.data
          if (message.type === 'progress') {
            if (message.progress.jobId === request.jobId) {
              armInactivityTimer()
              reportProgress(options, message.progress)
            }
            return
          }
          if (message.type === 'ready' || message.jobId !== request.jobId) return
          armInactivityTimer()
          reportProgress(options, message.progress)
          finish(message)
        } catch (error) {
          fail(error)
        }
      }
      const onError = (event: ErrorEvent) => {
        fail(new Error(event.message || 'Stored Time worker failed.'))
      }
      const cancellationTimer = setInterval(() => {
        if (options.cancelRequested?.() !== true) return
        try {
          worker.postMessage({
            type: 'cancel',
            protocolVersion: STORED_TIME_WORKER_PROTOCOL_VERSION,
            jobId: request.jobId,
          })
        } catch (error) {
          fail(error)
        }
      }, CANCELLATION_POLL_MILLISECONDS)
      const cleanup = () => {
        clearTimeout(inactivityTimer)
        clearInterval(cancellationTimer)
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
      }
      worker.addEventListener('message', onMessage)
      worker.addEventListener('error', onError)
      armInactivityTimer()
      const start: StoredTimeJobStartMessage = {
        type: 'start',
        protocolVersion: STORED_TIME_WORKER_PROTOCOL_VERSION,
        ...request,
      }
      try {
        worker.postMessage(start)
      } catch (error) {
        fail(error)
      }
    })
  }

  private requireWorker(): Worker {
    if (this.worker !== null) return this.worker
    const worker = this.options.createWorker?.() ?? new Worker(
      new URL('./storedTimeWorker.ts', import.meta.url),
      { type: 'module', name: 'idle-dyson-stored-time' },
    )
    this.worker = worker
    this.ready = waitForReady(worker)
    return worker
  }

  private scheduleIdleTermination(): void {
    if (this.worker === null) return
    this.idleTimer = setTimeout(() => this.dispose(), WORKER_IDLE_TIMEOUT_MILLISECONDS)
  }

  private clearIdleTimer(): void {
    if (this.idleTimer === null) return
    clearTimeout(this.idleTimer)
    this.idleTimer = null
  }
}

function waitForReady(worker: Worker): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('Stored Time worker did not become ready.'))
    }, WORKER_READY_TIMEOUT_MILLISECONDS)
    const cleanup = () => {
      clearTimeout(timeout)
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
    }
    const onMessage = (event: MessageEvent<unknown>) => {
      if (!isStoredTimeWorkerOutboundMessage(event.data)) return
      const message: StoredTimeWorkerOutboundMessage = event.data
      if (message.type !== 'ready') return
      const expectedBuildId = import.meta.env.VITE_BUILD_ID ?? null
      if (message.buildId !== expectedBuildId) {
        cleanup()
        reject(new Error('Stored Time worker build identity does not match the application.'))
        return
      }
      cleanup()
      resolve()
    }
    const onError = (event: ErrorEvent) => {
      cleanup()
      reject(new Error(event.message || 'Stored Time worker failed to load.'))
    }
    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
  })
}

async function runCooperatively(
  request: Readonly<StoredTimeJobRequest>,
  options: Readonly<StoredTimeJobRunOptions>,
): Promise<StoredTimeJobTerminalMessage> {
  const simulation = new StoredTimeSimulation({
    jobId: request.jobId,
    state: request.state,
    requestedSeconds: request.requestedSeconds,
    infinityMinimumCycleSeconds: request.infinityMinimumCycleSeconds,
    eventContext: createProductionEventContext(
      request.dysonPresentationTuning,
    ),
  })
  let lastProgressAt = performance.now()
  for (;;) {
    const chunkStartedAt = performance.now()
    let terminal
    do {
      terminal = simulation.step(
        Math.max(
          0.25,
          FALLBACK_CHUNK_BUDGET_MILLISECONDS -
            (performance.now() - chunkStartedAt),
        ),
        options.cancelRequested?.() === true,
      )
    } while (
      terminal === null &&
      performance.now() - chunkStartedAt <
        FALLBACK_CHUNK_BUDGET_MILLISECONDS
    )
    if (terminal !== null) {
      reportProgress(options, terminal.progress)
      return terminal
    }
    const now = performance.now()
    if (now - lastProgressAt >= FALLBACK_PROGRESS_INTERVAL_MILLISECONDS) {
      lastProgressAt = now
      reportProgress(options, simulation.progress())
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
}

function reportProgress(
  options: Readonly<StoredTimeJobRunOptions>,
  progress: StoredTimeJobProgress,
): void {
  try {
    options.onProgress?.(progress)
  } catch {
    // Progress observers cannot strand or invalidate detached simulation work.
  }
}
