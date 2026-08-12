import {
  resumeCanonicalEventTimeV2FromAcknowledgedSeal,
  sealCanonicalEventTimeV2MaterialBoundary,
  type CanonicalEventTimeCarrierV2,
  type CanonicalEventTimeV2AdvanceResult,
  type CanonicalEventTimeV2Continuation,
  type CanonicalEventTimeV2MaterialBoundarySeal,
} from '../../simulation/canonicalEventTimeModelV2'
/**
 * Worker-local adapter seam for the Stage 4B material-boundary seal API.
 * Continuations and seals remain in the worker and are never protocol values.
 */
export interface StoredTimeWorkerEngineBoundaryV2 {
  sealLocalContinuation(
    continuation: Readonly<CanonicalEventTimeV2Continuation>,
  ): Readonly<CanonicalEventTimeV2MaterialBoundarySeal>
  resumeFromAcknowledgedSeal(
    seal: Readonly<CanonicalEventTimeV2MaterialBoundarySeal>,
    acknowledgedCarrier: Readonly<CanonicalEventTimeCarrierV2>,
    cancelRequested?: (() => boolean) | null,
  ): Readonly<CanonicalEventTimeV2AdvanceResult>
}

export const CANONICAL_STORED_TIME_WORKER_ENGINE_BOUNDARY_V2 = Object.freeze({
  sealLocalContinuation: sealCanonicalEventTimeV2MaterialBoundary,
  resumeFromAcknowledgedSeal: resumeCanonicalEventTimeV2FromAcknowledgedSeal,
}) satisfies StoredTimeWorkerEngineBoundaryV2
