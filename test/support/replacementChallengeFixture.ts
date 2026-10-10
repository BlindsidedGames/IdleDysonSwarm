import type { CanonicalGameStateV1, ReworkChallengeId } from '../../src/game-state/types'
import { restartInfinityChallenge } from '../../src/simulation/canonicalInfinityChallengeRestart'

/** Synthetic funded fixture; admission and attempt records come from real entry. */
export function enterReplacementChallenge(source: CanonicalGameStateV1, id: ReworkChallengeId): CanonicalGameStateV1 {
  const ready = { ...source,
    meta: { ...source.meta, firstInfinityComplete: true, reworkMigrationChoice: 'keep' as const },
    infinity: { ...source.infinity, points: source.infinity.points < 64n ? 64n : source.infinity.points },
    quantum: { ...source.quantum, unlocks: { ...source.quantum.unlocks, breakTheLoop: true } },
  }
  const result = restartInfinityChallenge(ready, 'enter', 0n, id)
  if (!result.ok) throw new Error(result.code)
  return result.state
}
