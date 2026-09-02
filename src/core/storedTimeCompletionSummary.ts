import type {
  CanonicalFacilityId,
  StoredTimeAccuracyPreset,
} from '../game-state/types'

export interface StoredTimeFacilityGain {
  readonly facilityId: CanonicalFacilityId
  readonly quantity: number
}

export interface StoredTimeFirstDisasterOccurrence {
  readonly cause: 'Meteor' | 'ArtificialIntelligence' | 'GlobalWarming'
  readonly strangeMatterGranted: number
  readonly resetCount: bigint
  readonly preResetEra: 'foundational' | 'information' | 'space-age'
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
  /** Newly encountered disasters eligible for a dialog after this summary. */
  readonly firstDisasterOccurrences:
    readonly Readonly<StoredTimeFirstDisasterOccurrence>[]
  readonly realityWorkers: bigint
  readonly influence: number
  readonly botGain: number
  readonly facilityGains: readonly StoredTimeFacilityGain[]
}
