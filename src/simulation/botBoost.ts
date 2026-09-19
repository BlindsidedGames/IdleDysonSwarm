import type { CanonicalGameStateV1 } from '../game-state/types'
import type { DysonEntitlements } from './canonicalDysonDerivation'

export const BOT_BOOST_DURATION_MS = 5 * 60 * 1000

export interface BotBoostState {
  readonly expiresAtMilliseconds: number
  readonly permanentEnabled: boolean
}

export function botBoostRemaining(boost: BotBoostState | undefined, now = Date.now()): number {
  return Math.max(0, (boost?.expiresAtMilliseconds ?? 0) - now)
}

export function canClaimBotBoost(boost: BotBoostState | undefined, now = Date.now()): boolean {
  return botBoostRemaining(boost, now) <= BOT_BOOST_DURATION_MS
}

export function botBoostMultiplier(
  state: Pick<CanonicalGameStateV1, 'meta'>,
  entitlements: Pick<DysonEntitlements, 'permanentBotBoost'>,
  now = Date.now(),
): 1 | 2 {
  if (entitlements.permanentBotBoost) return state.meta.botBoost?.permanentEnabled ? 2 : 1
  return botBoostRemaining(state.meta.botBoost, now) > 0 ? 2 : 1
}

export function recordBotBoostUsage(state: CanonicalGameStateV1): CanonicalGameStateV1 {
  const run = state.statistics.speedruns
  if (!run || run.botBoostUsed) return state
  return { ...state, statistics: { ...state.statistics, speedruns: { ...run, botBoostUsed: true } } }
}
