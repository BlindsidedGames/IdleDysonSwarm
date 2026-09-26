import type { CanonicalGameStateV1 } from '../game-state/types'

/** Permanent progression milestone, independent of the spendable Quantum wallet. */
export function hasCompletedQuantum(state: Readonly<CanonicalGameStateV1>): boolean {
  return state.meta.firstQuantumComplete ?? (state.quantum.pointsEarned > 0n || (state.avocado.overflowPoints ?? 0n) > 0n || state.discovery?.unlocked === true || state.statistics.lifetime.botCapOverflowRewards > 0n || state.statistics.speedruns?.milestones.firstQuantumLeap != null)
}
