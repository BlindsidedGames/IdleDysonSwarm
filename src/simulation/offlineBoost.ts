import type { CanonicalGameStateV1, TimelineState } from '../game-state/types'
import { settleContinuousDebit } from './conservativeSettlement'

export const MAXIMUM_OFFLINE_BOOST_MULTIPLIER = 42
export const DEFAULT_OFFLINE_BOOST_MULTIPLIER = 1
export const DEFAULT_OFFLINE_BOOST = Object.freeze({ multiplier: DEFAULT_OFFLINE_BOOST_MULTIPLIER })

export function isOfflineBoostMultiplier(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAXIMUM_OFFLINE_BOOST_MULTIPLIER
}

export function offlineBoost(timeline: Readonly<TimelineState>) {
  return timeline.offlineBoost ?? DEFAULT_OFFLINE_BOOST
}

export function pauseOfflineBoost(state: CanonicalGameStateV1): CanonicalGameStateV1 {
  if (offlineBoost(state.timeline).multiplier === 1) return state
  return { ...state, timeline: { ...state.timeline, offlineBoost: DEFAULT_OFFLINE_BOOST } }
}

/** Only actual represented bank debits may fund accelerated gameplay. */
export function planOfflineBoost(timeline: Readonly<TimelineState>, wallSeconds: number) {
  const boost = offlineBoost(timeline)
  const requested = boost.multiplier > 1 && wallSeconds > 0
    ? Math.min(Number.MAX_VALUE, (boost.multiplier - 1) * wallSeconds) : 0
  const debit = settleContinuousDebit(timeline.storedTimeAvailableSeconds, requested)
  return {
    bankSeconds: debit.balance,
    consumedSeconds: debit.settled,
    multiplier: wallSeconds > 0 ? 1 + debit.settled / wallSeconds : 1,
    boost: boost.multiplier > 1 && wallSeconds > 0 && (debit.balance <= 0 || debit.settled <= 0)
      ? DEFAULT_OFFLINE_BOOST : boost,
  }
}

/** A different speed starts a new observed-rate session, without rewriting calibration. */
export function withOfflineBoost(state: CanonicalGameStateV1, boost: NonNullable<TimelineState['offlineBoost']>): CanonicalGameStateV1 {
  return { ...state,
    timeline: { ...state.timeline, offlineBoost: boost },
    infinity: { ...state.infinity, currentCyclePeakIpPerMinute: 0, currentCyclePeakReward: 0n,
      manualCalibrationObservedActiveSeconds: 0, activeAutomaticThroughputCycleEligible: false },
    statistics: { ...state.statistics, recentActiveAutomaticInfinityCycles: [] },
  }
}
