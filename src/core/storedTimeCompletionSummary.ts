import type {
  CanonicalFacilityId,
  StoredTimeAccuracyPreset,
} from '../game-state/types'

export interface StoredTimeFacilityGain {
  readonly facilityId: CanonicalFacilityId
  readonly quantity: number
}

export interface StoredTimeCompletionSummary {
  readonly preset: StoredTimeAccuracyPreset
  /** Number of authoritative gameplay updates actually executed. */
  readonly simulationUpdates: number
  /** True when Speed Up reduced the initially planned update budget. */
  readonly accuracyReduced: boolean
  readonly remainingBankSeconds: number
  readonly infinityCount: bigint
  readonly infinityPoints: bigint
  readonly dreamResetCount: bigint
  readonly strangeMatter: number
  readonly realityWorkers: bigint
  readonly influence: number
  readonly botGain: number
  readonly facilityGains: readonly StoredTimeFacilityGain[]
}
