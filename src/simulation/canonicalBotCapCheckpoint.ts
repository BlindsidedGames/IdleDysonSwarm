import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import type {
  CanonicalGameStateV1,
  SimulationStatisticsState,
  SimulationTotalsState,
  StatisticsWindowState,
} from '../game-state/types'
import { updateStatisticsEventWindow } from './canonicalStatistics'
import {
  addContinuous,
  addDiscrete,
} from './numeric'

export const FINITE_BOT_CAP = Number.MAX_VALUE
export const BOT_CAP_INFINITY_REWARD = 1_000n
export const BOT_CAP_OVERFLOW_REWARD = 1

export type BotCapCheckpointPhase =
  | 'normal'
  | 'invalid-bots'
  | 'cap-uncheckpointed'
  | 'cap-pending'
  | 'cap-rewards-granted'

export type BotCapCheckpointName =
  | 'invalid-bot-repair'
  | 'pending'
  | 'rewards'

export type BotCapCheckpointAction =
  | {
      readonly kind: 'continue-normal-prestige'
    }
  | {
      readonly kind: 'persist'
      readonly checkpoint: BotCapCheckpointName
      /**
       * State to retain if persistence rejects the candidate. Reward rollback
       * deliberately restores the durable pending checkpoint.
       */
      readonly rollbackState: CanonicalGameStateV1
    }
  | {
      readonly kind: 'prestige'
    }

export interface BotCapAppliedReward {
  readonly infinityPoints: bigint
  readonly overflowMultiplier: number
}

export interface BotCapCheckpointResult {
  readonly phase: BotCapCheckpointPhase
  readonly action: BotCapCheckpointAction
  /**
   * Immutable candidate for the caller to persist or pass to normal Prestige.
   * The caller must not adopt a persist candidate until its save succeeds.
   */
  readonly candidateState: CanonicalGameStateV1
  readonly appliedReward: BotCapAppliedReward
}

export function selectBotCapCheckpointToPersist(
  action: BotCapCheckpointAction,
): BotCapCheckpointName | undefined {
  return action.kind === 'persist' ? action.checkpoint : undefined
}

const NO_REWARD: BotCapAppliedReward = Object.freeze({
  infinityPoints: 0n,
  overflowMultiplier: 0,
})

/**
 * Advances one durable bot-cap checkpoint phase without performing I/O.
 *
 * The first capped evaluation can only create the pending checkpoint. A
 * subsequent evaluation grants rewards into a second save candidate, and only
 * a committed rewards-granted state is allowed to proceed to Prestige.
 */
export function evaluateCanonicalBotCapCheckpoint(
  state: Readonly<CanonicalGameStateV1>,
): BotCapCheckpointResult {
  const bots = state.dyson.bots
  if (!isFiniteNonNegativeNumber(bots)) {
    return persistResult(
      'invalid-bots',
      'invalid-bot-repair',
      state,
      replaceBotCapState(state, {
        bots: 0,
        pending: false,
        rewardsGranted: false,
        inProgress: false,
      }),
      NO_REWARD,
    )
  }

  if (bots !== FINITE_BOT_CAP) {
    return {
      phase: 'normal',
      action: Object.freeze({ kind: 'continue-normal-prestige' }),
      candidateState: state,
      appliedReward: NO_REWARD,
    }
  }

  if (state.infinity.botCapRewardsGranted) {
    const candidateState = state.infinity.inProgress
      ? state
      : replaceBotCapState(state, { inProgress: true })
    return {
      phase: 'cap-rewards-granted',
      action: Object.freeze({ kind: 'prestige' }),
      candidateState,
      appliedReward: NO_REWARD,
    }
  }

  if (!state.infinity.botCapTransitionPending) {
    return persistResult(
      'cap-uncheckpointed',
      'pending',
      state,
      replaceBotCapState(state, { pending: true }),
      NO_REWARD,
    )
  }

  const nextPoints = addDiscrete(
    state.infinity.points,
    BOT_CAP_INFINITY_REWARD,
  )
  const nextOverflow = addContinuous(
    state.avocado.overflowMultiplier,
    BOT_CAP_OVERFLOW_REWARD,
  )
  const candidateState = replaceBotCapState(state, {
    points: nextPoints,
    overflowMultiplier: nextOverflow,
    pending: false,
    rewardsGranted: true,
    inProgress: true,
    statistics: recordBotCapReward(
      state.statistics,
      nextPoints - state.infinity.points,
    ),
  })
  const rollbackState = replaceBotCapState(state, {
    pending: true,
    rewardsGranted: false,
    inProgress: false,
  })
  return persistResult(
    'cap-pending',
    'rewards',
    rollbackState,
    candidateState,
    Object.freeze({
      infinityPoints: nextPoints - state.infinity.points,
      overflowMultiplier:
        nextOverflow - state.avocado.overflowMultiplier,
    }),
  )
}

function persistResult(
  phase: BotCapCheckpointPhase,
  checkpoint: BotCapCheckpointName,
  rollbackState: CanonicalGameStateV1,
  candidateState: CanonicalGameStateV1,
  appliedReward: BotCapAppliedReward,
): BotCapCheckpointResult {
  return {
    phase,
    action: Object.freeze({
      kind: 'persist',
      checkpoint,
      rollbackState,
    }),
    candidateState,
    appliedReward,
  }
}

interface BotCapReplacement {
  readonly bots?: number
  readonly points?: bigint
  readonly overflowMultiplier?: number
  readonly pending?: boolean
  readonly rewardsGranted?: boolean
  readonly inProgress?: boolean
  readonly statistics?: SimulationStatisticsState
}

function replaceBotCapState(
  state: Readonly<CanonicalGameStateV1>,
  replacement: Readonly<BotCapReplacement>,
): CanonicalGameStateV1 {
  const replaceDyson = replacement.bots !== undefined
  const replaceAvocado = replacement.overflowMultiplier !== undefined
  return {
    ...state,
    dyson: replaceDyson
      ? {
          ...state.dyson,
          bots: replacement.bots as number,
        }
      : state.dyson,
    infinity: {
      ...state.infinity,
      points: replacement.points ?? state.infinity.points,
      botCapTransitionPending:
        replacement.pending ??
        state.infinity.botCapTransitionPending,
      botCapRewardsGranted:
        replacement.rewardsGranted ??
        state.infinity.botCapRewardsGranted,
      inProgress:
        replacement.inProgress ?? state.infinity.inProgress,
    },
    avocado: replaceAvocado
      ? {
          ...state.avocado,
          overflowMultiplier:
            replacement.overflowMultiplier as number,
        }
      : state.avocado,
    statistics: replacement.statistics ?? state.statistics,
  }
}

function recordBotCapReward(
  statistics: Readonly<SimulationStatisticsState>,
  infinityPoints: bigint,
): SimulationStatisticsState {
  return {
    ...statistics,
    trackedSinceUpdate: true,
    trackingStartedMarker: statistics.trackedSinceUpdate
      ? statistics.trackingStartedMarker
      : 'tracked-since-update',
    lifetime: addBotCapTotals(statistics.lifetime, infinityPoints),
    currentQuantumRun: addBotCapTotals(
      statistics.currentQuantumRun,
      infinityPoints,
    ),
    recentProcessedSegment: addBotCapTotals(
      statistics.recentProcessedSegment,
      infinityPoints,
    ),
    minuteWindows: addBotCapWindowPoints(
      statistics.minuteWindows,
      60,
      60,
      statistics.trackedSimulatedSeconds,
      infinityPoints,
    ),
    halfHourWindows: addBotCapWindowPoints(
      statistics.halfHourWindows,
      48,
      1_800,
      statistics.trackedSimulatedSeconds,
      infinityPoints,
    ),
    dailyWindows: addBotCapWindowPoints(
      statistics.dailyWindows,
      30,
      86_400,
      statistics.trackedSimulatedSeconds,
      infinityPoints,
    ),
  }
}

function addBotCapTotals(
  totals: Readonly<SimulationTotalsState>,
  infinityPoints: bigint,
): SimulationTotalsState {
  return {
    ...totals,
    botCapInfinityPoints: addDiscrete(
      totals.botCapInfinityPoints,
      infinityPoints,
    ),
    botCapOverflowRewards: addDiscrete(
      totals.botCapOverflowRewards,
      1n,
    ),
  }
}

function addBotCapWindowPoints(
  source: readonly StatisticsWindowState[],
  expectedLength: number,
  widthSeconds: number,
  trackedSimulatedSeconds: number,
  infinityPoints: bigint,
): readonly StatisticsWindowState[] {
  return updateStatisticsEventWindow(
    source,
    expectedLength,
    widthSeconds,
    trackedSimulatedSeconds,
    (bucket) => ({
      ...bucket,
      infinityPoints: addDiscrete(
        bucket.infinityPoints,
        infinityPoints,
      ),
    }),
  )
}
