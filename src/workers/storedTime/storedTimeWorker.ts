/// <reference lib="webworker" />

import { createProductionEventContext } from '../../simulation/productionEventContext'
import {
  STORED_TIME_WORKER_PROTOCOL_VERSION,
  type StoredTimeJobStartMessage,
  type StoredTimeWorkerInboundMessage,
  type StoredTimeWorkerOutboundMessage,
} from './storedTimeProtocol'
import { StoredTimeSimulation } from './storedTimeSimulation'

const CHUNK_BUDGET_MILLISECONDS = 20
const PROGRESS_INTERVAL_MILLISECONDS = 250

const scope = self as unknown as DedicatedWorkerGlobalScope
let active:
  | {
      readonly request: StoredTimeJobStartMessage
      readonly simulation: StoredTimeSimulation
      cancelRequested: boolean
      lastProgressAt: number
    }
  | null = null

scope.addEventListener('message', (event: MessageEvent<unknown>) => {
  const message = event.data as Partial<StoredTimeWorkerInboundMessage>
  if (message.protocolVersion !== STORED_TIME_WORKER_PROTOCOL_VERSION) return
  if (message.type === 'cancel') {
    const job = active
    if (job !== null && job.request.jobId === message.jobId) {
      job.cancelRequested = true
    }
    return
  }
  if (message.type !== 'start') return
  if (active !== null) {
    post({
      type: 'failed',
      protocolVersion: STORED_TIME_WORKER_PROTOCOL_VERSION,
      jobId: message.jobId ?? 'unknown',
      code: 'STORED-TIME-WORKER-BUSY',
      reason: 'The Stored Time worker already owns an active job.',
      progress: {
        jobId: message.jobId ?? 'unknown',
        requestedSeconds: message.requestedSeconds ?? 0,
        computedSeconds: 0,
        fraction: 0,
        elapsedMilliseconds: 0,
        estimatedRemainingMilliseconds: null,
        maximumChunkMilliseconds: 0,
      },
    })
    return
  }
  try {
    const request = message as StoredTimeJobStartMessage
    active = {
      request,
      simulation: new StoredTimeSimulation({
        jobId: request.jobId,
        state: request.state,
        requestedSeconds: request.requestedSeconds,
        infinityMinimumCycleSeconds: request.infinityMinimumCycleSeconds,
        eventContext: createProductionEventContext(
          request.dysonPresentationTuning,
        ),
      }),
      cancelRequested: false,
      lastProgressAt: performance.now(),
    }
    scheduleStep()
  } catch (error) {
    const jobId = message.jobId ?? 'unknown'
    post({
      type: 'failed',
      protocolVersion: STORED_TIME_WORKER_PROTOCOL_VERSION,
      jobId,
      code: 'STORED-TIME-WORKER-START-FAILED',
      reason: error instanceof Error ? error.message : String(error),
      progress: {
        jobId,
        requestedSeconds: message.requestedSeconds ?? 0,
        computedSeconds: 0,
        fraction: 0,
        elapsedMilliseconds: 0,
        estimatedRemainingMilliseconds: null,
        maximumChunkMilliseconds: 0,
      },
    })
    active = null
  }
})

post({
  type: 'ready',
  protocolVersion: STORED_TIME_WORKER_PROTOCOL_VERSION,
  buildId: import.meta.env.VITE_BUILD_ID ?? null,
})

function scheduleStep(): void {
  setTimeout(runStep, 0)
}

function runStep(): void {
  const job = active
  if (job === null) return
  let terminal
  const chunkStartedAt = performance.now()
  try {
    do {
      const remainingBudget = Math.max(
        0.25,
        CHUNK_BUDGET_MILLISECONDS -
          (performance.now() - chunkStartedAt),
      )
      terminal = job.simulation.step(
        remainingBudget,
        job.cancelRequested,
      )
    } while (
      terminal === null &&
      performance.now() - chunkStartedAt < CHUNK_BUDGET_MILLISECONDS
    )
  } catch (error) {
    terminal = {
      type: 'failed' as const,
      protocolVersion: STORED_TIME_WORKER_PROTOCOL_VERSION,
      jobId: job.request.jobId,
      code: 'STORED-TIME-WORKER-ADVANCE-FAILED',
      reason: error instanceof Error ? error.message : String(error),
      progress: job.simulation.progress(),
    }
  }
  if (terminal !== null) {
    post(terminal)
    active = null
    return
  }
  const now = performance.now()
  if (now - job.lastProgressAt >= PROGRESS_INTERVAL_MILLISECONDS) {
    job.lastProgressAt = now
    post({
      type: 'progress',
      protocolVersion: STORED_TIME_WORKER_PROTOCOL_VERSION,
      progress: job.simulation.progress(),
    })
  }
  scheduleStep()
}

function post(message: StoredTimeWorkerOutboundMessage): void {
  scope.postMessage(message)
}

export {}
