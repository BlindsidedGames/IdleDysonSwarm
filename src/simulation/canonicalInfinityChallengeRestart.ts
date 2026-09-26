import { applyCanonicalQuantumReset } from './quantumTransitions'
import { permanentSkillRuntime } from './galvanization'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import { infinityChallenges, isQuantumChallenge, isChallengeId } from './infinityChallenges'
import { hasReachedOverflow } from './overflowBoundary'

/** Restart the relevant prestige layer without awarding currency or completion. */
export function restartInfinityChallenge(
  state: Readonly<CanonicalGameStateV1>,
  action: 'enter' | 'abandon',
  artifactSkillPoints: bigint,
  challengeId: NonNullable<NonNullable<CanonicalGameStateV1['challenges']>['active']> = 'blank-slate',
) {
  const challenges = infinityChallenges(state)
  if (action === 'enter' && !isChallengeId(challengeId)) return { ok: false as const, code: 'CHALLENGE_NOT_AVAILABLE' }
  if (hasReachedOverflow(state)) return { ok: false as const, code: 'OVERFLOW_RESET_REQUIRED' }
  if (action === 'enter' && (!challenges.unlocked || challenges.active !== null)) {
    return { ok: false as const, code: 'CHALLENGE_NOT_AVAILABLE' }
  }
  if (action === 'abandon' && challenges.active === null) return { ok: false as const, code: 'NO_ACTIVE_CHALLENGE' }
  if (action === 'enter' && challengeId === 'built-by-hand' && !challenges.galvanizedSkillIds?.includes('manualLabour')) return { ok: false as const, code: 'MANUAL_LABOUR_FRACTURE_REQUIRED' }
  const seed = {
    ...state,
    challenges: { ...challenges, active: action === 'enter' ? challengeId : null },
    skills: { ...state.skills, byId: permanentSkillRuntime(state) },
  }
  const quantumChallenge = isQuantumChallenge(challengeId) || isQuantumChallenge(challenges.active)
  const reset = quantumChallenge ? applyCanonicalQuantumReset(seed, artifactSkillPoints, undefined, { restartOnly: true }) : applyCanonicalInfinityReset(seed, {
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
