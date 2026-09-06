import type { CanonicalGameStateV1 } from '../game-state/types'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import { infinityChallenges } from './infinityChallenges'
import { hasReachedOverflow } from './overflowBoundary'

/** Reuse the ordinary run reset without minting IP, completion, or statistics. */
export function restartInfinityChallenge(
  state: Readonly<CanonicalGameStateV1>,
  action: 'enter' | 'abandon',
  artifactSkillPoints: bigint,
) {
  const challenges = infinityChallenges(state)
  if (hasReachedOverflow(state)) return { ok: false as const, code: 'OVERFLOW_RESET_REQUIRED' }
  if (action === 'enter' && (!challenges.unlocked || challenges.active !== null)) {
    return { ok: false as const, code: 'CHALLENGE_NOT_AVAILABLE' }
  }
  if (action === 'abandon' && challenges.active === null) return { ok: false as const, code: 'NO_ACTIVE_CHALLENGE' }
  const seed = {
    ...state,
    challenges: { ...challenges, active: action === 'enter' ? 'blank-slate' as const : null },
    skills: { ...state.skills, byId: {} },
  }
  const reset = applyCanonicalInfinityReset(seed, {
    restartOnly: true, breakInfinity: false, requestedReward: 0n, artifactSkillPoints,
  })
  if (!reset.ok) return { ok: false as const, code: reset.issues[0]?.code ?? 'CHALLENGE_RESET_FAILED' }
  return { ok: true as const, state: {
    ...reset.state,
    timeline: {
      ...reset.state.timeline,
      eventClockInitialized: false,
      automationTimeUntilNextEvent: 0,
      dysonAutomationTargetIndex: 0,
      researchAutomationTargetIndex: 0,
      infinityBoundaryRemaining: 0,
      infinityCycleSeconds: 0,
      infinityCycleStartingPoints: reset.state.infinity.points,
      infinityHasPostResetStart: true,
    },
  } }
}
