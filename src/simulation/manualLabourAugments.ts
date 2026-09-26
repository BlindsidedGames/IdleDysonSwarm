import type { CanonicalGameStateV1 } from '../game-state/types'
import { MANUAL_LABOUR_AUGMENTS as AUGMENTS, hasManualLabourAugment } from './skillSubskills'
import { multiplyContinuous } from './numeric'
import { isNoScienceActive } from './infinityChallenges'

export const MANUAL_LABOUR_TUNING = Object.freeze({
  botFraction: 0.05,
  cooldownSeconds: 0.2,
  practicePerCompletion: 0.01,
  researchPerLevel: 0.1,
  waitingSecondsPerMultiplier: 60,
  maximumWaitingSeconds: 600,
})

/** Independent of facility ownership: the first goal's SP can bootstrap Built by Hand. */
export function manualBotYield(state: Readonly<CanonicalGameStateV1>, waitingSeconds?: number): number {
  if (!hasManualLabourAugment(state, 'handAssembly')) return 1
  const t = MANUAL_LABOUR_TUNING
  let value = Math.max(1, multiplyContinuous(state.dyson.bots, t.botFraction))
  if (hasManualLabourAugment(state, 'practice')) {
    const completions = state.skills.byId[AUGMENTS.practice]?.level ?? 0
    value = multiplyContinuous(value, 1 + t.practicePerCompletion * completions)
  }
  if (hasManualLabourAugment(state, 'workingSmarter')) {
    const levels = state.discovery?.unlocked ? Number(state.discovery.completions)
      : isNoScienceActive(state) ? 0 : state.research.levelsById['research.assembly_line_upgrade'] ?? 0
    value = multiplyContinuous(value, 1 + t.researchPerLevel * levels)
  }
  if (hasManualLabourAugment(state, 'patientHands')) {
    const idle = waitingSeconds ?? state.skills.byId[AUGMENTS.patientHands]?.timerSeconds ?? 0
    value = multiplyContinuous(value, 1 + Math.min(t.maximumWaitingSeconds, idle) / t.waitingSecondsPerMultiplier)
  }
  return value
}

/** Consume on activation, not on preview; an interrupted activation never restores charge. */
export function activateManualLabour(state: CanonicalGameStateV1): CanonicalGameStateV1 {
  const skill = state.skills.byId[AUGMENTS.patientHands]
  if (!hasManualLabourAugment(state, 'patientHands') || !skill) return state
  return { ...state, skills: { ...state.skills, byId: { ...state.skills.byId,
    [AUGMENTS.patientHands]: { ...skill, timerSeconds: 0, secondaryTimerSeconds: skill.timerSeconds },
  } } }
}

export function completeManualLabour(state: CanonicalGameStateV1): CanonicalGameStateV1 {
  if (!hasManualLabourAugment(state, 'handAssembly')) return state
  const byId = { ...state.skills.byId }
  const practice = byId[AUGMENTS.practice]
  if (hasManualLabourAugment(state, 'practice') && practice) {
    byId[AUGMENTS.practice] = {
      ...practice, level: Math.min(Number.MAX_SAFE_INTEGER, practice.level + 1),
    }
  }
  const waiting = byId[AUGMENTS.patientHands]
  if (waiting) byId[AUGMENTS.patientHands] = { ...waiting, secondaryTimerSeconds: 0, timerSeconds: 0 }
  return { ...state, skills: { ...state.skills, byId } }
}

export function advanceManualLabourIdle(state: CanonicalGameStateV1, seconds: number): CanonicalGameStateV1 {
  const skill = state.skills.byId[AUGMENTS.patientHands]
  if (!skill || !hasManualLabourAugment(state, 'patientHands')) return state
  const timerSeconds = Math.min(MANUAL_LABOUR_TUNING.maximumWaitingSeconds, skill.timerSeconds + seconds)
  if (timerSeconds === skill.timerSeconds) return state
  return { ...state, skills: { ...state.skills, byId: { ...state.skills.byId, [AUGMENTS.patientHands]: { ...skill, timerSeconds } } } }
}
