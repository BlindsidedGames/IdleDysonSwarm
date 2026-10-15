import type { CanonicalGameStateV1 } from '../game-state/types'

/** Gameplay boundary; general finite-number safety remains independent. */
export const OVERFLOW_BOT_CAP = 4e242

export function hasReachedOverflow(state: Readonly<CanonicalGameStateV1>): boolean {
  return Number.isFinite(state.dyson.bots) && state.dyson.bots >= 0 &&
    (state.infinity.botCapTransitionPending || state.dyson.bots >= OVERFLOW_BOT_CAP)
}
