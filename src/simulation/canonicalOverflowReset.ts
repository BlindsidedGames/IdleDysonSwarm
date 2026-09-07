import { permanentSkillRuntime, permanentFragmentCount } from './galvanization'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { resetCanonicalDreamProgress } from './canonicalDreamReset'
import { createEmptySimulationTotals } from './canonicalStatistics'
import { AVOCADO_MEDITATION_SKILL_POINT_REWARD } from './avocadoMeditation'
import { addDiscrete, DISCRETE_MAXIMUM } from './numeric'
import { hasReachedOverflow } from './overflowBoundary'

export type CanonicalOverflowResetResult =
  | { readonly ok: true; readonly state: CanonicalGameStateV1 }
  | { readonly ok: false; readonly code: 'OVERFLOW_NOT_READY' | 'OVERFLOW_POINTS_MAXED' }

/** One commit-first transaction: no Infinity/Quantum reward or feed bonus survives. */
export function applyCanonicalOverflowReset(
  state: Readonly<CanonicalGameStateV1>,
): CanonicalOverflowResetResult {
  if (!hasReachedOverflow(state)) return { ok: false, code: 'OVERFLOW_NOT_READY' }
  const points = state.avocado.overflowPoints ?? 0n
  if (typeof points !== 'bigint' || points < 0n || points >= DISCRETE_MAXIMUM) {
    return { ok: false, code: 'OVERFLOW_POINTS_MAXED' }
  }
  return {
    ok: true,
    state: {
      ...state,
      ...(state.challenges ? { challenges: { ...state.challenges, active: null } } : {}),
      meta: { ...state.meta, firstInfinityComplete: false },
      dyson: {
        ...state.dyson,
        money: 0,
        science: 0,
        bots: 0,
        workers: 0,
        researchers: 0,
        facilities: {
          assembly_lines: [0, 0], ai_managers: [0, 0],
          servers: [0, 0], data_centers: [0, 0], planets: [0, 0],
          matrioshka_brains: [0, 0], birch_planets: [0, 0], galactic_brains: [0, 0],
        },
        manualCreationIntervalSeconds: 10,
        totalPanelsDecayed: 0,
        goalStage: 0n,
        botDistribution: 0,
      },
      infinity: {
        ...state.infinity,
        points: 0n,
        spentPoints: 0n,
        breakTarget: 1n,
        currentCyclePeakIpPerMinute: 0,
        currentCyclePeakReward: 0n,
        manualPeakIpPerMinute: 0,
        manualPeakReward: 0n,
        manualCalibrationObservedActiveSeconds: 0,
        activeAutomaticThroughputCycleEligible: false,
        inProgress: false,
        botCapTransitionPending: false,
        botCapRewardsGranted: false,
        lastCycleDurationSeconds: 0,
        lastPointsGained: 0,
        storedTimeUsedThisCycleSeconds: 0,
        storedTimeUsedPreviousCycleSeconds: 0,
        secretsOfTheUniverse: 0n,
        permanentSkillPoints: 0n,
        retainedFacilities: {
          assembly_lines: false, ai_managers: false, servers: false,
          data_centers: false, planets: false,
        },
        automationUnlocked: { research: false, bots: false },
      },
      skills: {
        ...state.skills,
        points: state.secretProgress.completed ? AVOCADO_MEDITATION_SKILL_POINT_REWARD : 0n,
        fragments: permanentFragmentCount(state),
        byId: permanentSkillRuntime(state),
      },
      research: { ...state.research, levelsById: {}, progressById: {} },
      reality: {
        universeDesignationCount: 0n,
        workersReady: 0n,
        workerGenerationProgress: 0,
        influence: 0,
        autoGather: false,
      },
      quantum: {
        pointsEarned: 0n,
        pointsSpent: 0n,
        divisionsPurchased: 0n,
        permanentSecrets: 0n,
        influenceSpeedBonus: 0n,
        cashBonusLevels: 0n,
        scienceBonusLevels: 0n,
        unlocks: {
          botMultitasking: false, doubleInfinityPoints: false, breakTheLoop: false,
          quantumEntanglement: false, automation: false, fragments: false,
          purity: false, terra: false, power: false, paragade: false, stellar: false,
          matrioshkaBrains: false, birchPlanets: false, galacticBrains: false,
        },
      },
      avocado: {
        unlocked: true,
        infinityPoints: 0,
        influence: 0,
        strangeMatter: 0,
        overflowMultiplier: 0,
        overflowPoints: addDiscrete(points, 1n),
      },
      dream: resetCanonicalDreamProgress(state.dream),
      timeline: {
        ...state.timeline,
        eventClockInitialized: false,
        automationTimeUntilNextEvent: 0,
        dysonAutomationTargetIndex: 0,
        researchAutomationTargetIndex: 0,
        infinityBoundaryRemaining: 0,
        infinityCycleSeconds: 0,
        infinityCycleStartingPoints: 0n,
        infinityHasPostResetStart: false,
        doubleTime: { unlocked: false, enabled: false, bankSeconds: 0, rate: 0 },
      },
      statistics: {
        ...state.statistics,
        trackedSinceUpdate: true,
        trackingStartedMarker: state.statistics.trackedSinceUpdate
          ? state.statistics.trackingStartedMarker : 'tracked-since-update',
        lifetime: {
          ...state.statistics.lifetime,
          botCapOverflowRewards: addDiscrete(state.statistics.lifetime.botCapOverflowRewards, 1n),
        },
        currentQuantumRun: createEmptySimulationTotals(),
        recentProcessedSegment: createEmptySimulationTotals(),
        recentActiveAutomaticInfinityCycles: [],
        lastCompletedCycle: { valid: false, breakInfinity: false, durationSeconds: 0, reward: 0, dreamCause: null },
      },
    },
  }
}
