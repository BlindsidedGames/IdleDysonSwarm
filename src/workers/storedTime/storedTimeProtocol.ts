import {
  isFiniteNonNegativeNumber as isFiniteNonNegative,
  isSafeNonNegativeInteger,
} from '../../core/finiteNonNegativeNumber'
import type { DysonPresentationTuning } from '../../simulation/canonicalDysonDerivation'
import type { CanonicalRuntimeState } from '../../application/canonicalRuntimeSession'

export const STORED_TIME_WORKER_PROTOCOL_VERSION = 2 as const

export interface StoredTimeJobProgress {
  readonly jobId: string
  readonly requestedSeconds: number
  readonly computedSeconds: number
  readonly fraction: number
  readonly elapsedMilliseconds: number
  readonly estimatedRemainingMilliseconds: number | null
  readonly maximumChunkMilliseconds: number
  readonly completedTicks?: number
  readonly remainingTicks?: number
  readonly plannedTicks?: number
  readonly currentStepSeconds?: number
  readonly ticksPerSecond?: number
  readonly canSpeedUp?: boolean
}

export type StoredTimeJobStatus =
  | { readonly kind: 'idle' }
  | ({ readonly kind: 'running' } & StoredTimeJobProgress)
  | ({ readonly kind: 'cancelling' } & StoredTimeJobProgress)
  | ({ readonly kind: 'committing' } & StoredTimeJobProgress)

export interface StoredTimeJobStartMessage {
  readonly type: 'start'
  readonly protocolVersion: typeof STORED_TIME_WORKER_PROTOCOL_VERSION
  readonly jobId: string
  readonly state: CanonicalRuntimeState
  readonly requestedSeconds: number
  readonly infinityMinimumCycleSeconds: number
  readonly dysonPresentationTuning: Readonly<DysonPresentationTuning>
}

export interface StoredTimeJobCancelMessage {
  readonly type: 'cancel'
  readonly protocolVersion: typeof STORED_TIME_WORKER_PROTOCOL_VERSION
  readonly jobId: string
}

export interface StoredTimeJobSpeedUpMessage {
  readonly type: 'speed-up'
  readonly protocolVersion: typeof STORED_TIME_WORKER_PROTOCOL_VERSION
  readonly jobId: string
}

export type StoredTimeWorkerInboundMessage =
  | StoredTimeJobStartMessage
  | StoredTimeJobCancelMessage
  | StoredTimeJobSpeedUpMessage

export type StoredTimeWorkerOutboundMessage =
  | {
      readonly type: 'ready'
      readonly protocolVersion: typeof STORED_TIME_WORKER_PROTOCOL_VERSION
      readonly buildId: string | null
    }
  | {
      readonly type: 'progress'
      readonly protocolVersion: typeof STORED_TIME_WORKER_PROTOCOL_VERSION
      readonly progress: StoredTimeJobProgress
    }
  | {
      readonly type: 'completed'
      readonly protocolVersion: typeof STORED_TIME_WORKER_PROTOCOL_VERSION
      readonly jobId: string
      readonly candidate: CanonicalRuntimeState
      readonly consumedSeconds: number
      readonly remainingSeconds: number
      readonly progress: StoredTimeJobProgress
    }
  | {
      readonly type: 'cancelled'
      readonly protocolVersion: typeof STORED_TIME_WORKER_PROTOCOL_VERSION
      readonly jobId: string
      readonly progress: StoredTimeJobProgress
    }
  | {
      readonly type: 'failed'
      readonly protocolVersion: typeof STORED_TIME_WORKER_PROTOCOL_VERSION
      readonly jobId: string
      readonly code: string
      readonly reason: string
      readonly progress: StoredTimeJobProgress
    }

export type StoredTimeJobTerminalMessage = Extract<
  StoredTimeWorkerOutboundMessage,
  { readonly type: 'completed' | 'cancelled' | 'failed' }
>

export function isStoredTimeWorkerOutboundMessage(
  value: unknown,
): value is StoredTimeWorkerOutboundMessage {
  if (!isRecord(value)) return false
  const candidate = value as Record<string, unknown>
  if (candidate.protocolVersion !== STORED_TIME_WORKER_PROTOCOL_VERSION) {
    return false
  }
  if (candidate.type === 'ready') {
    return candidate.buildId === null || typeof candidate.buildId === 'string'
  }
  if (candidate.type === 'progress') {
    return isStoredTimeJobProgress(candidate.progress)
  }
  if (
    (candidate.type === 'cancelled' || candidate.type === 'failed') &&
    typeof candidate.jobId === 'string' &&
    isStoredTimeJobProgress(candidate.progress)
  ) {
    return candidate.type === 'cancelled' || (
      typeof candidate.code === 'string' &&
      typeof candidate.reason === 'string'
    )
  }
  if (
    candidate.type !== 'completed' ||
    typeof candidate.jobId !== 'string' ||
    !isRecord(candidate.candidate) ||
    !isFiniteNonNegative(candidate.consumedSeconds) ||
    !isFiniteNonNegative(candidate.remainingSeconds) ||
    !isStoredTimeJobProgress(candidate.progress)
  ) {
    return false
  }
  return candidate.remainingSeconds <= 1e-8 &&
    Math.abs(
      candidate.consumedSeconds - candidate.progress.requestedSeconds,
    ) <= 1e-8
}

function isStoredTimeJobProgress(value: unknown): value is StoredTimeJobProgress {
  if (!isRecord(value) || typeof value.jobId !== 'string') return false
  return isFiniteNonNegative(value.requestedSeconds) &&
    isFiniteNonNegative(value.computedSeconds) &&
    isFiniteNonNegative(value.fraction) &&
    value.fraction <= 1 &&
    isFiniteNonNegative(value.elapsedMilliseconds) &&
    (value.estimatedRemainingMilliseconds === null ||
      isFiniteNonNegative(value.estimatedRemainingMilliseconds)) &&
    isFiniteNonNegative(value.maximumChunkMilliseconds)
    && optionalSafeNonNegativeInteger(value.completedTicks)
    && optionalSafeNonNegativeInteger(value.remainingTicks)
    && optionalSafeNonNegativeInteger(value.plannedTicks)
    && optionalFiniteNonNegative(value.currentStepSeconds)
    && optionalFiniteNonNegative(value.ticksPerSecond)
    && (value.canSpeedUp === undefined || typeof value.canSpeedUp === 'boolean')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function optionalFiniteNonNegative(value: unknown): boolean {
  return value === undefined || isFiniteNonNegative(value)
}

function optionalSafeNonNegativeInteger(value: unknown): boolean {
  return value === undefined || isSafeNonNegativeInteger(value)
}
