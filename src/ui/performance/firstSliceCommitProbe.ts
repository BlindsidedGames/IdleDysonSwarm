export const FIRST_SLICE_COMMIT_PROBE_MARKER =
  '__idleDysonFirstSliceCommitProbeV1'

export interface FirstSliceCommitRevision {
  readonly session: number
  readonly state: number
}

export interface FirstSliceCommitProbeSample {
  readonly revision: FirstSliceCommitRevision
  readonly durationMilliseconds: number
}

interface FirstSliceCommitRecorder {
  record(sample: FirstSliceCommitProbeSample): void
}

type ProbeGlobal = typeof globalThis & {
  readonly __idleDysonFirstSliceCommitProbeV1?:
    FirstSliceCommitRecorder
}

/**
 * Starts the performance-build-only interval immediately before the external
 * store snapshot is selected.
 */
export function beginFirstSliceSnapshotSelection(): number {
  return performance.now()
}

/**
 * Records the interval ending at the pre-captured first instruction of React's
 * committed layout phase. The browser harness owns storage and reporting.
 */
export function recordFirstSliceReactCommit(
  startedAt: number,
  endedAt: number,
  revision: FirstSliceCommitRevision,
): void {
  const recorder = (globalThis as ProbeGlobal)
    .__idleDysonFirstSliceCommitProbeV1
  recorder?.record({
    revision: { ...revision },
    durationMilliseconds: Math.max(0, endedAt - startedAt),
  })
}

/**
 * Returns true only when a newly committed canonical snapshot revision follows
 * an already observed revision. This excludes initial mount, repeated effects
 * and unrelated rerenders with the same revision.
 */
export function isNewCommittedRevision(
  previous: FirstSliceCommitRevision | null,
  current: FirstSliceCommitRevision,
): boolean {
  return (
    previous !== null &&
    (previous.session !== current.session ||
      previous.state !== current.state)
  )
}
