import type { CanonicalGameStateV1, TimelineState } from '../game-state/types'
import { settleContinuousDebit } from './conservativeSettlement'

export const MAXIMUM_OFFLINE_BOOST_MULTIPLIER = 42
export const BASE_OFFLINE_BOOST_MULTIPLIER = MAXIMUM_OFFLINE_BOOST_MULTIPLIER
export const DEFAULT_OFFLINE_BOOST_MULTIPLIER = 1
export const DEFAULT_OFFLINE_BOOST = Object.freeze({ multiplier: DEFAULT_OFFLINE_BOOST_MULTIPLIER })
export type OfflineBoostAutoResume = 'off' | 'last' | 'max'
export const isOfflineBoostAutoResume = (value: unknown): value is OfflineBoostAutoResume => value === 'off' || value === 'last' || value === 'max'

/** Classic retains the original foreground speed range without civilization gates. */
export function maximumOfflineBoostMultiplier(): number {
  return BASE_OFFLINE_BOOST_MULTIPLIER
}

export function isOfflineBoostMultiplier(value: unknown, maximum = BASE_OFFLINE_BOOST_MULTIPLIER): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= maximum
}

export function offlineBoost(timeline: Readonly<Pick<TimelineState, 'offlineBoost'>>, maximum = BASE_OFFLINE_BOOST_MULTIPLIER) {
  return timeline.offlineBoost ? { multiplier: Math.min(maximum, timeline.offlineBoost.multiplier) } : DEFAULT_OFFLINE_BOOST
}

export function pauseOfflineBoost(state: CanonicalGameStateV1): CanonicalGameStateV1 {
  if (offlineBoost(state.timeline).multiplier === 1) return state
  return { ...state, timeline: { ...state.timeline, offlineBoost: DEFAULT_OFFLINE_BOOST } }
}

/** Only actual represented bank debits may fund accelerated gameplay. */
export function planOfflineBoost(timeline: Readonly<Pick<TimelineState, 'storedTimeAvailableSeconds' | 'offlineBoost'>>, wallSeconds: number, maximum = BASE_OFFLINE_BOOST_MULTIPLIER) {
  const boost = offlineBoost(timeline, maximum)
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
export function resumeOfflineBoost(state: CanonicalGameStateV1, allowed = true): CanonicalGameStateV1 {
  const mode = state.timeline.offlineBoostAutoResume ?? 'off'
  if (!allowed || mode === 'off' || state.timeline.storedTimeAvailableSeconds <= 0) return pauseOfflineBoost(state)
  const maximum = maximumOfflineBoostMultiplier()
  const multiplier = mode === 'max' ? maximum : Math.min(maximum, state.timeline.offlineBoostResumeMultiplier ?? 1)
  return withOfflineBoost(state, { multiplier }, false)
}

export function withOfflineBoost(state: CanonicalGameStateV1, boost: NonNullable<TimelineState['offlineBoost']>, remember = true): CanonicalGameStateV1 {
  return { ...state,
    timeline: { ...state.timeline, offlineBoost: boost, ...(remember ? { offlineBoostResumeMultiplier: boost.multiplier } : {}) },
    infinity: { ...state.infinity, currentCyclePeakIpPerMinute: 0, currentCyclePeakReward: 0n,
      manualCalibrationObservedActiveSeconds: 0, activeAutomaticThroughputCycleEligible: false },
    statistics: { ...state.statistics, recentActiveAutomaticInfinityCycles: [] },
  }
}
