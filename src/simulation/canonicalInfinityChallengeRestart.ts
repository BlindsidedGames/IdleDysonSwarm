import { permanentSkillRuntime } from './galvanization'
import type { CanonicalGameStateV1, ChallengeId, ReworkChallengeId } from '../game-state/types'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import { infinityChallenges } from './infinityChallenges'
import { activeReworkChallenge, challengeEntryIssue, REWORK_CHALLENGES } from './reworkChallenges'
import { EMPTY_DISCOVERY } from './discovery'
import { hasReachedOverflow } from './overflowBoundary'

/** Restart only Infinity; keep legacy records and persistent progression. */
export function restartInfinityChallenge(state: Readonly<CanonicalGameStateV1>, action: 'enter' | 'abandon', artifactSkillPoints: bigint, challengeId: ChallengeId = 'blank-slate') {
  const challenges = infinityChallenges(state)
  const active = activeReworkChallenge(state)
  if (hasReachedOverflow(state)) return { ok: false as const, code: 'OVERFLOW_RESET_REQUIRED' }
  if (action === 'enter' && !REWORK_CHALLENGES.some(c => c.id === challengeId)) return { ok: false as const, code: 'CHALLENGE_RETIRED' }
  const id = challengeId as ReworkChallengeId
  if (action === 'enter') {
    const issue = challengeEntryIssue(state, id)
    if (issue) return { ok: false as const, code: 'CHALLENGE_NOT_AVAILABLE', reason: issue }
  } else if (!active) return { ok: false as const, code: 'NO_ACTIVE_CHALLENGE' }
  const previous = challenges.replacement
  const progress = action === 'enter' ? {
    version: 1 as const, active: id, completedIds: previous?.completedIds ?? [], earnedIp: 0n,
    infinities: 0, paidPurchases: 0, paidFacilityIds: [], savedDiscovery: state.discovery,
    savedAutoAssignment: state.skills.activeAutoAssignment, savedBreakTarget: state.infinity.breakTarget, savedBotDistribution: state.dyson.botDistribution,
  } : { ...previous!, active: null }
  const seed: CanonicalGameStateV1 = {
    ...state,
    discovery: action === 'enter' ? { ...EMPTY_DISCOVERY } : previous?.savedDiscovery,
    challenges: { ...challenges, unlocked: true, active: action === 'enter' ? id : null, replacement: progress },
    infinity: { ...state.infinity, breakTarget: action === 'enter' ? 1n : previous!.savedBreakTarget },
    dyson: { ...state.dyson, botDistribution: action === 'abandon' ? previous!.savedBotDistribution : id === 'hands-off' ? 0.5 : 0 },
    skills: { ...state.skills, byId: {}, activeAutoAssignment: action === 'enter'
      ? (id === 'hands-off' ? ['scientificPlanets'] : []) : previous!.savedAutoAssignment },
  }
  const reset = applyCanonicalInfinityReset({ ...seed, skills: { ...seed.skills, byId: permanentSkillRuntime(seed) } }, { restartOnly: true, breakInfinity: false, requestedReward: 0n, artifactSkillPoints })
  if (!reset.ok) return { ok: false as const, code: reset.issues[0]?.code ?? 'CHALLENGE_RESET_FAILED' }
  return { ok: true as const, state: { ...reset.state, timeline: {
    ...reset.state.timeline, eventClockInitialized: false, automationTimeUntilNextEvent: 0,
    dysonAutomationTargetIndex: 0, researchAutomationTargetIndex: 0, infinityBoundaryRemaining: 0,
    infinityCycleSeconds: 0, infinityCycleStartingPoints: reset.state.infinity.points, infinityHasPostResetStart: true,
  } } }
}
