import type { CanonicalGameStateV1 } from '../game-state/types'

/** The last Tinker milestone needs 250 actions; no larger count is required. */
export const MAXIMUM_TRACKED_TINKERS = 250

export function validateCompletedTinkers(value: unknown): string | null {
  return value === undefined || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAXIMUM_TRACKED_TINKERS)
    ? null : 'Invalid completed Tinker count.'
}

/** Record completed actions only; previews, starts and external Bot grants do not count. */
export function recordCompletedTinkers(state: CanonicalGameStateV1, completed: number): CanonicalGameStateV1 {
  const before = state.dyson.completedTinkers ?? 0
  const next = Math.min(MAXIMUM_TRACKED_TINKERS, before + completed)
  return next === before ? state : { ...state, dyson: { ...state.dyson, completedTinkers: next } }
}
