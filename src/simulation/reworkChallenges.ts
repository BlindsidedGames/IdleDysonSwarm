import type { CanonicalGameStateV1, InfinityChallengeState, ReworkChallengeId } from '../game-state/types'
import { addDiscrete } from './numeric'

export const REWORK_CHALLENGES = [
  { id: 'blank-slate', name: 'Blank Slate', target: 1n, reward: 2n, unlockIp: 0n, rule: 'Complete one Infinity with skills, augments and fractured effects inactive.' },
  { id: 'built-by-hand', name: 'Manual Labour', target: 1n, reward: 4n, unlockIp: 0n, rule: 'Complete one Infinity with no facilities or automatic Bot production. Temporary Manual Labour access is provided.' },
  { id: 'no-science', name: 'No Science', target: 32n, reward: 2n, unlockIp: 16n, rule: 'Earn 32 IP without Science, Research or Discovery.' },
  { id: 'grounded', name: 'Grounded', target: 32n, reward: 2n, unlockIp: 32n, rule: 'Earn 32 IP without Planets or megastructures. The Planet goal becomes 100 purchased Data Centers.' },
  { id: 'hands-off', name: 'Hands Off', target: 32n, reward: 2n, unlockIp: 32n, rule: 'Earn 32 IP without facility purchases or Tinkering. Start with one Assembly Line and a Planet-generation build.' },
  { id: 'commitment-issues', name: 'Commitment Issues', target: 32n, reward: 2n, unlockIp: 32n, rule: 'Earn 32 IP without refunding or replacing your build throughout the attempt, including Infinity resets.' },
  { id: 'short-circuit', name: 'Short Circuit', target: 64n, reward: 2n, unlockIp: 64n, rule: 'Earn 64 IP with panel lifetime fixed at 2 seconds.' },
  { id: 'supply-shortage', name: 'Supply Shortage', target: 64n, reward: 2n, unlockIp: 64n, rule: 'Earn 64 IP with purchase prices doubling, and pay for 10 facilities across 3 types. Generated and free facilities do not count.' },
  { id: 'lean-build', name: 'Lean Build', target: 16n, reward: 2n, unlockIp: 16n, rule: 'Earn 16 IP with no more than 4 SP of assigned skills. Refunds are allowed.' },
] as const satisfies readonly { id: ReworkChallengeId; name: string; target: bigint; reward: bigint; unlockIp: bigint; rule: string }[]

export const challengeDefinition = (id: ReworkChallengeId) => REWORK_CHALLENGES.find(c => c.id === id)!
export const activeReworkChallenge = (state: { readonly challenges?: Readonly<InfinityChallengeState> }): ReworkChallengeId | null => state.challenges?.replacement?.active ?? null
export function replacementSkillPoints(progress?: Readonly<InfinityChallengeState>): bigint {
  return REWORK_CHALLENGES.reduce((points, c) => points + (progress?.replacement?.completedIds.includes(c.id) ? c.reward : 0n), 0n)
}
export function challengeEntryIssue(state: Readonly<CanonicalGameStateV1>, id: ReworkChallengeId): string | null {
  if (state.meta.reworkMigrationChoice === undefined) return 'Choose Keep or Fresh before starting a challenge.'
  if (!state.meta.firstInfinityComplete) return 'Complete your first Infinity.'
  if (activeReworkChallenge(state)) return 'Finish or abandon the active challenge.'
  const definition = challengeDefinition(id)
  if (state.infinity.points < definition.unlockIp) return `Requires ${definition.unlockIp} total earned IP.`
  if (definition.unlockIp >= 64n && !state.quantum.unlocks.breakTheLoop) return 'Requires Break the Loop.'
  return null
}
export function recordChallengePurchases(state: CanonicalGameStateV1, attempts: readonly { facilityId: string; purchased: boolean; quantity: bigint; cost: number }[]): CanonicalGameStateV1 {
  const progress = state.challenges?.replacement
  if (progress?.active !== 'supply-shortage') return state
  const paid = attempts.filter(a => a.purchased && a.cost > 0 && a.quantity > 0n)
  if (!paid.length) return state
  return { ...state, challenges: { ...state.challenges!, replacement: { ...progress,
    paidPurchases: Math.min(10, progress.paidPurchases + paid.reduce((n, a) => n + Number(a.quantity > 10n ? 10n : a.quantity), 0)),
    paidFacilityIds: [...new Set([...progress.paidFacilityIds, ...paid.map(a => a.facilityId)])],
  } } }
}
/** Gross IP from a valid Infinity counts even at the wallet cap; restarts never call this. */
export function settleChallengeInfinity(state: CanonicalGameStateV1, reward: bigint): CanonicalGameStateV1 {
  const progress = state.challenges?.replacement
  if (!progress?.active || reward <= 0n) return state
  const earnedIp = addDiscrete(progress.earnedIp, reward)
  const infinities = Math.min(Number.MAX_SAFE_INTEGER, progress.infinities + 1)
  const id = progress.active
  const won = (id === 'blank-slate' || id === 'built-by-hand' ? infinities >= 1 : earnedIp >= challengeDefinition(id).target) &&
    (id !== 'supply-shortage' || (progress.paidPurchases >= 10 && progress.paidFacilityIds.length >= 3))
  const next = { ...progress, earnedIp, infinities,
    ...(won ? { active: null, completedIds: [...new Set([...progress.completedIds, id])] } : {}),
  }
  return { ...state, challenges: { ...state.challenges!, active: won ? null : id, replacement: next },
    ...(won ? { discovery: progress.savedDiscovery,
      dyson: { ...state.dyson, botDistribution: progress.savedBotDistribution },
      skills: { ...state.skills, activeAutoAssignment: progress.savedAutoAssignment },
      infinity: { ...state.infinity, breakTarget: progress.savedBreakTarget },
    } : {}),
  }
}
