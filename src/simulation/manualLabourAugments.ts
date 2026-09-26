import type { CanonicalGameStateV1 } from '../game-state/types'
import { MANUAL_LABOUR_AUGMENTS as AUGMENTS, hasManualLabourAugment } from './skillSubskills'
import { addContinuous, multiplyContinuous } from './numeric'
import { isResearchDisabledByChallenge } from './infinityChallenges'

export const MANUAL_LABOUR_TUNING = Object.freeze({
  cooldownSeconds: 0.2,
  workExponent: 5,
  maximumBaseYield: 1e17,
  maximumPracticeBonus: 2,
  practiceHalfStrength: 500,
  researchBonusPerDecade: 0.25,
  maximumResearchBonus: 2,
  maximumWaitingSeconds: 42,
  storedWorkBonus: 0.25,
})

function storedActivations(state: Readonly<CanonicalGameStateV1>, waitingSeconds: number): number {
  if (!hasManualLabourAugment(state, 'patientHands')) return 0
  const t = MANUAL_LABOUR_TUNING
  return Math.floor(Math.max(0, Math.min(t.maximumWaitingSeconds, waitingSeconds)) / t.cooldownSeconds)
}

/** No current-Bot input: ordinary production and manual grants cannot amplify this curve. */
export function manualBotYield(state: Readonly<CanonicalGameStateV1>, waitingSeconds?: number): number {
  if (!hasManualLabourAugment(state, 'handAssembly')) return 1
  const t = MANUAL_LABOUR_TUNING
  const work = state.skills.byId[AUGMENTS.handAssembly]?.level ?? 0
  const practice = state.skills.byId[AUGMENTS.practice]?.level ?? 0
  const practicing = hasManualLabourAugment(state, 'practice')
  const levels = state.discovery?.unlocked ? Number(state.discovery.completions)
    : isResearchDisabledByChallenge(state) ? 0 : state.research.levelsById['research.assembly_line_upgrade'] ?? 0
  const researchBonus = hasManualLabourAugment(state, 'workingSmarter')
    ? Math.min(t.maximumResearchBonus, t.researchBonusPerDecade * Math.log10(1 + levels)) : 0
  const stored = storedActivations(state, waitingSeconds ?? state.skills.byId[AUGMENTS.patientHands]?.timerSeconds ?? 0)
  let earned = 0
  // At most 210 stored activations plus the current one, irrespective of offline duration.
  for (let index = 0; index <= stored; index++) {
    const completed = Math.min(Number.MAX_SAFE_INTEGER, work + index + 1)
    const experience = Math.min(Number.MAX_SAFE_INTEGER, practice + index)
    const practiceBonus = practicing
      ? t.maximumPracticeBonus * (experience / (experience + t.practiceHalfStrength)) : 0
    const base = Math.min(t.maximumBaseYield, completed ** t.workExponent)
    const yieldPerActivation = multiplyContinuous(base, 1 + practiceBonus + researchBonus)
    earned = addContinuous(earned, multiplyContinuous(yieldPerActivation, index < stored ? 1 + t.storedWorkBonus : 1))
  }
  return earned
}

/** Consume on activation, not on preview; an interrupted activation never restores charge. */
export function activateManualLabour(state: CanonicalGameStateV1): CanonicalGameStateV1 {
  const skill = state.skills.byId[AUGMENTS.patientHands]
  if (!hasManualLabourAugment(state, 'patientHands') || !skill) return state
  return { ...state, skills: { ...state.skills, byId: { ...state.skills.byId,
    [AUGMENTS.patientHands]: { ...skill, timerSeconds: 0, secondaryTimerSeconds: Math.min(MANUAL_LABOUR_TUNING.maximumWaitingSeconds, skill.timerSeconds) },
  } } }
}

export function completeManualLabour(state: CanonicalGameStateV1): CanonicalGameStateV1 {
  if (!hasManualLabourAugment(state, 'handAssembly')) return state
  const byId = { ...state.skills.byId }
  const waiting = byId[AUGMENTS.patientHands]
  const completed = 1 + storedActivations(state, waiting?.secondaryTimerSeconds ?? 0)
  for (const key of ['handAssembly', 'practice'] as const) {
    const skill = byId[AUGMENTS[key]]
    if (skill && hasManualLabourAugment(state, key)) {
      byId[AUGMENTS[key]] = { ...skill, level: Math.min(Number.MAX_SAFE_INTEGER, skill.level + completed) }
    }
  }
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
