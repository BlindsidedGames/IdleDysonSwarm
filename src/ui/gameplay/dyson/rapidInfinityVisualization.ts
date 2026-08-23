import type { InfinityCycleHistoryEntry } from '../../../game-state/types'

export const RAPID_INFINITY_CYCLE_MAXIMUM_SECONDS = 0.5
export const RAPID_INFINITY_REQUIRED_CYCLES = 3
export const RAPID_INFINITY_EXIT_SECONDS = 2

export interface RapidInfinityVisualizationInput {
  readonly automaticResetEnabled: boolean
  readonly infinityCycleSeconds: number
  readonly recentInfinityCycles?: readonly InfinityCycleHistoryEntry[]
}

/**
 * Selects a presentation-only settled scene once automatic Break Infinity is
 * sustained. Canonical history provides the entry debounce, while the active
 * cycle clock provides exit hysteresis without introducing wall-clock state.
 */
export function shouldSettleRapidInfinityVisualization(
  input: Readonly<RapidInfinityVisualizationInput>,
): boolean {
  if (!input.automaticResetEnabled) return false
  if (input.infinityCycleSeconds > RAPID_INFINITY_EXIT_SECONDS) return false

  const recent = (input.recentInfinityCycles ?? []).slice(
    0,
    RAPID_INFINITY_REQUIRED_CYCLES,
  )
  return recent.length === RAPID_INFINITY_REQUIRED_CYCLES && recent.every(
    (cycle) =>
      cycle.breakInfinity &&
      cycle.automatic &&
      cycle.durationSeconds > 0 &&
      cycle.durationSeconds <= RAPID_INFINITY_CYCLE_MAXIMUM_SECONDS,
  )
}
