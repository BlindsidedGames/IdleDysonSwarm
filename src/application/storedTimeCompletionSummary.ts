import type {
  CanonicalFacilityId,
  SimulationTotalsState,
} from '../game-state/types'
import type { StoredTimeCompletionSummary } from '../core/storedTimeCompletionSummary'
import type { CanonicalRuntimeState } from './canonicalRuntimeSession'

const FACILITY_IDS = Object.freeze([
  'assembly_lines',
  'ai_managers',
  'servers',
  'data_centers',
  'planets',
  'matrioshka_brains',
  'birch_planets',
  'galactic_brains',
] as const satisfies readonly CanonicalFacilityId[])

/** Builds player-facing results only from the state which was committed. */
export function summarizeStoredTimeCompletion(
  before: Readonly<CanonicalRuntimeState>,
  after: Readonly<CanonicalRuntimeState>,
  work: {
    readonly simulationUpdates: number
    readonly initiallyPlannedUpdates: number
  },
): StoredTimeCompletionSummary {
  const beforeTotals = before.gameState.statistics.lifetime
  const afterTotals = after.gameState.statistics.lifetime
  const infinityCount = discreteDelta(
    combinedInfinityCount(afterTotals),
    combinedInfinityCount(beforeTotals),
  )

  return Object.freeze({
    preset: before.gameState.timeline.processing.storedTimePreset,
    simulationUpdates: work.simulationUpdates,
    accuracyReduced:
      work.simulationUpdates < work.initiallyPlannedUpdates,
    remainingBankSeconds:
      after.gameState.timeline.storedTimeAvailableSeconds,
    infinityCount,
    infinityPoints: discreteDelta(
      combinedInfinityPoints(afterTotals),
      combinedInfinityPoints(beforeTotals),
    ),
    dreamResetCount: discreteDelta(
      combinedDreamResets(afterTotals),
      combinedDreamResets(beforeTotals),
    ),
    strangeMatter: discreteDelta(
      afterTotals.strangeMatter,
      beforeTotals.strangeMatter,
    ),
    realityWorkers: discreteDelta(
      afterTotals.realityWorkers,
      beforeTotals.realityWorkers,
    ),
    influence: discreteDelta(
      afterTotals.automaticInfluence,
      beforeTotals.automaticInfluence,
    ),
    botGain: positiveFiniteDelta(
      after.gameState.dyson.bots,
      before.gameState.dyson.bots,
    ),
    facilityGains: infinityCount === 0n
      ? Object.freeze(FACILITY_IDS.flatMap((facilityId) => {
          const quantity = positiveFiniteDelta(
            owned(after, facilityId),
            owned(before, facilityId),
          )
          return quantity > 0 ? [{ facilityId, quantity }] : []
        }))
      : Object.freeze([]),
  })
}

function owned(
  state: Readonly<CanonicalRuntimeState>,
  facilityId: CanonicalFacilityId,
): number {
  const pair = state.gameState.dyson.facilities[facilityId]
  return pair[0] + pair[1]
}

function positiveFiniteDelta(after: number, before: number): number {
  const difference = after - before
  return Number.isFinite(difference) && difference > 0 ? difference : 0
}

function discreteDelta(after: bigint, before: bigint): bigint {
  return after > before ? after - before : 0n
}

function combinedInfinityCount(totals: Readonly<SimulationTotalsState>): bigint {
  return totals.ordinaryInfinityCount + totals.breakInfinityCount
}

function combinedInfinityPoints(totals: Readonly<SimulationTotalsState>): bigint {
  return totals.ordinaryInfinityPoints +
    totals.breakInfinityPoints +
    totals.botCapInfinityPoints
}

function combinedDreamResets(totals: Readonly<SimulationTotalsState>): bigint {
  return totals.meteorDreamResets +
    totals.aiDreamResets +
    totals.globalWarmingDreamResets +
    totals.blackHoleDreamResets
}
