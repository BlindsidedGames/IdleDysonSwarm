import { permanentSkillRuntime } from './galvanization'
import type {
  CanonicalFacilityId,
  CanonicalGameStateV1,
} from '../game-state/types'
import { createEmptySimulationTotals } from './canonicalStatistics'
import {
  applyCanonicalInfinityReset,
  type CanonicalInfinityResetAssetLookup,
  type CanonicalInfinityResetIssue,
} from './canonicalInfinityReset'
import { DISCRETE_MAXIMUM } from './numeric'
import { QUANTUM_CONSTANTS } from './quantumUpgrades'

export interface QuantumEntanglementResult {
  readonly state: CanonicalGameStateV1
  readonly availableInfinityPoints: bigint
  readonly infinityPointsConsumed: bigint
  readonly quantumPointsGranted: bigint
}

export type CanonicalQuantumResetResult =
  | {
      readonly ok: true
      readonly state: CanonicalGameStateV1
      readonly quantumPointGranted: bigint
      readonly autoAssignedSkillIds: readonly string[]
    }
  | {
      readonly ok: false
      readonly state: CanonicalGameStateV1
      readonly issues: readonly CanonicalInfinityResetIssue[]
    }

/**
 * Applies Oracle's non-resetting Quantum Entanglement branch. Only unspent
 * Infinity Points are converted in complete groups of 42; spent bookkeeping
 * is preserved and any remainder remains available.
 */
export function applyQuantumEntanglementConversion(
  state: Readonly<CanonicalGameStateV1>,
): QuantumEntanglementResult {
  const availableInfinityPoints =
    state.infinity.points >= state.infinity.spentPoints
      ? state.infinity.points - state.infinity.spentPoints
      : 0n
  const requestedQuantumPoints =
    availableInfinityPoints /
    QUANTUM_CONSTANTS.infinityPointsPerQuantumPoint
  // Earned/spent are cumulative counters; only the spendable wallet has a cap.
  const headroom = DISCRETE_MAXIMUM -
    (state.quantum.pointsEarned - state.quantum.pointsSpent)
  const quantumPointsGranted = headroom > 0n
    ? (requestedQuantumPoints < headroom ? requestedQuantumPoints : headroom)
    : 0n
  const infinityPointsConsumed = quantumPointsGranted *
    QUANTUM_CONSTANTS.infinityPointsPerQuantumPoint
  const conversionAccepted = quantumPointsGranted > 0n
  return {
    state: {
      ...state,
      meta: {
        ...state.meta,
        firstInfinityComplete: true,
      },
      infinity: conversionAccepted
        ? {
            ...state.infinity,
            points:
              state.infinity.points - infinityPointsConsumed,
          }
        : state.infinity,
      quantum: conversionAccepted
        ? {
            ...state.quantum,
            pointsEarned: state.quantum.pointsEarned + quantumPointsGranted,
          }
        : state.quantum,
    },
    availableInfinityPoints,
    infinityPointsConsumed,
    quantumPointsGranted,
  }
}

/**
 * Applies Oracle.PrestigeDoubleWiper as one durable canonical transition.
 * The two Unity recalculation frames are derived-state work and are therefore
 * omitted; their observable durable result is the second pair of fresh
 * DysonVerse containers represented here.
 */
export function applyCanonicalQuantumReset(
  state: Readonly<CanonicalGameStateV1>,
  artifactSkillPoints: bigint,
  lookup?: CanonicalInfinityResetAssetLookup,
): CanonicalQuantumResetResult {
  const assignmentSeed: CanonicalGameStateV1 = {
    ...state,
    infinity: {
      ...state.infinity,
      permanentSkillPoints: 0n,
    },
    skills: {
      ...state.skills,
      byId: permanentSkillRuntime(state),
      points: 0n,
      fragments: 0n,
    },
  }
  const assignment = applyCanonicalInfinityReset(
    assignmentSeed,
    {
      breakInfinity: false,
      requestedReward: 0n,
      artifactSkillPoints,
    },
    lookup,
  )
  if (!assignment.ok) {
    return {
      ok: false,
      state,
      issues: assignment.issues,
    }
  }

  const quantumPointGranted =
    state.quantum.pointsEarned - state.quantum.pointsSpent < DISCRETE_MAXIMUM
      ? 1n
      : 0n
  const emptyFacilities = Object.fromEntries(
    (
      [
        'assembly_lines',
        'ai_managers',
        'servers',
        'data_centers',
        'planets',
        'matrioshka_brains',
        'birch_planets',
        'galactic_brains',
      ] as const satisfies readonly CanonicalFacilityId[]
    ).map((id) => [id, [0, 0] as const]),
  ) as CanonicalGameStateV1['dyson']['facilities']
  const permanentSecrets =
    state.quantum.permanentSecrets > 1n
      ? state.quantum.permanentSecrets
      : 0n

  return {
    ok: true,
    state: {
      ...state,
      meta: {
        ...state.meta,
        firstInfinityComplete: true,
      },
      dyson: {
        ...state.dyson,
        money: 0,
        science: 0,
        bots: 0,
        workers: 0,
        researchers: 0,
        facilities: emptyFacilities,
        totalPanelsDecayed: 0,
        goalStage: 0n,
        botDistribution: 0,
      },
      infinity: {
        ...state.infinity,
        points: 0n,
        spentPoints: 0n,
        lastCycleDurationSeconds: 0,
        lastPointsGained: 0,
        currentCyclePeakIpPerMinute: 0,
        currentCyclePeakReward: 0n,
        manualPeakIpPerMinute: 0,
        manualPeakReward: 0n,
        manualCalibrationObservedActiveSeconds: 0,
        activeAutomaticThroughputCycleEligible: false,
        storedTimeUsedThisCycleSeconds: 0,
        storedTimeUsedPreviousCycleSeconds: 0,
        secretsOfTheUniverse: permanentSecrets,
        permanentSkillPoints: 0n,
        retainedFacilities: {
          assembly_lines: false,
          ai_managers: false,
          servers: false,
          data_centers: false,
          planets: false,
        },
        automationUnlocked: {
          research: state.quantum.unlocks.automation,
          bots: state.quantum.unlocks.automation,
        },
      },
      skills: {
        ...assignment.state.skills,
        byId: withQuantumResetTimerEntries(
          assignment.state.skills.byId,
        ),
      },
      research: {
        ...state.research,
        levelsById: {},
        progressById: {},
      },
      quantum: {
        ...state.quantum,
        pointsEarned: state.quantum.pointsEarned + quantumPointGranted,
      },
      statistics: {
        ...state.statistics,
        trackedSinceUpdate: true,
        trackingStartedMarker: state.statistics.trackedSinceUpdate
          ? state.statistics.trackingStartedMarker
          : 'tracked-since-update',
        currentQuantumRun: createEmptySimulationTotals(),
        recentProcessedSegment: createEmptySimulationTotals(),
        recentActiveAutomaticInfinityCycles: [],
      },
    },
    quantumPointGranted,
    autoAssignedSkillIds: assignment.autoAssignedSkillIds,
  }
}

function withQuantumResetTimerEntries(
  source: CanonicalGameStateV1['skills']['byId'],
): CanonicalGameStateV1['skills']['byId'] {
  const byId = { ...source }
  for (const id of ['androids', 'pocketAndroids'] as const) {
    const existing = byId[id]
    byId[id] = {
      owned: existing?.owned ?? false,
      level: existing?.level ?? 0,
      timerSeconds: 0,
      secondaryTimerSeconds: existing?.secondaryTimerSeconds ?? 0,
    }
  }
  return byId
}
