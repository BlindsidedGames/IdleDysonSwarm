import type { CanonicalGameStateV1 } from '../game-state/types'
import { addContinuous } from './numeric'
import { hasSrsAugment, SRS_AUGMENTS } from './skillSubskills'

type State = Pick<CanonicalGameStateV1, 'skills' | 'challenges'>

/** The Hot Start timer is a once-per-run grant marker, retained on refund. */
export function initializeSrsHotStart(state: State): State['skills'] {
  const hot = state.skills.byId[SRS_AUGMENTS.hotStart]
  if (!hasSrsAugment(state, 'hotStart') || hot.timerSeconds > 0) return state.skills
  const srs = state.skills.byId.superRadiantScattering
  return { ...state.skills, byId: { ...state.skills.byId,
    [SRS_AUGMENTS.hotStart]: { ...hot, timerSeconds: 1 },
    superRadiantScattering: { ...srs, timerSeconds: addContinuous(srs.timerSeconds, 1800) },
  } }
}

export function refreshSrsResearchActivity(state: State): State['skills'] {
  if (!hasSrsAugment(state, 'researchActivity')) return state.skills
  const activity = state.skills.byId[SRS_AUGMENTS.researchActivity]
  if (activity.timerSeconds === 30) return state.skills
  return { ...state.skills, byId: { ...state.skills.byId,
    [SRS_AUGMENTS.researchActivity]: { ...activity, timerSeconds: 30 },
  } }
}

/** Integrate ramp and expiring activity without stepping through each second. */
export function advanceSrsAugments(state: State, seconds: number): State['skills'] {
  const srs = state.skills.byId.superRadiantScattering
  if (!srs?.owned) return state.skills
  const byId = { ...state.skills.byId }
  let charge = seconds * (hasSrsAugment(state, 'researchConversion') ? 2 : 1)
  const lifetime = srs.secondaryTimerSeconds
  if (hasSrsAugment(state, 'stellarMemory')) charge += integratedStellarMemoryBonus(lifetime, seconds)
  const deep = byId[SRS_AUGMENTS.deepExposure]
  if (hasSrsAugment(state, 'deepExposure')) {
    const start = Math.min(1200, deep.timerSeconds)
    const rampSeconds = Math.min(seconds, 1200 - start)
    charge += (start * rampSeconds + rampSeconds * rampSeconds / 2) / 600 +
      2 * (seconds - rampSeconds)
    byId[SRS_AUGMENTS.deepExposure] = { ...deep, timerSeconds: Math.min(1200, start + seconds) }
  }
  const activity = byId[SRS_AUGMENTS.researchActivity]
  if (activity) {
    if (hasSrsAugment(state, 'researchActivity')) charge += 1.5 * Math.min(seconds, activity.timerSeconds)
    byId[SRS_AUGMENTS.researchActivity] = { ...activity, timerSeconds: Math.max(0, activity.timerSeconds - seconds) }
  }
  byId.superRadiantScattering = { ...srs, timerSeconds: addContinuous(srs.timerSeconds, charge),
    secondaryTimerSeconds: addContinuous(lifetime, seconds) }
  return { ...state.skills, byId }
}

/** Carryover is based on the ending run; challenge restarts do not count. */
export function resetSrsAugments(before: State, skills: State['skills'], restartOnly: boolean): State['skills'] {
  const srs = skills.byId.superRadiantScattering
  if (!srs) return skills
  const retained = !restartOnly && hasSrsAugment(before, 'afterglow')
    ? before.skills.byId.superRadiantScattering.timerSeconds * 0.1 : 0
  return initializeSrsHotStart({ ...before, skills: { ...skills, byId: {
    ...skills.byId, superRadiantScattering: { ...srs, timerSeconds: retained,
      secondaryTimerSeconds: before.skills.byId.superRadiantScattering?.secondaryTimerSeconds ?? 0 },
  } } })
}

// Integral of 0.1 * log10(max(1, lifetimeSeconds)); stable for tiny ticks at large totals.
export function integratedStellarMemoryBonus(start: number, seconds: number): number {
  const duration = Math.max(0, seconds - Math.max(0, 1 - start))
  if (duration === 0) return 0
  const a = Math.max(1, start), ratio = duration / a
  const remainder = ratio < 1e-4
    ? ratio * ratio * (0.5 - ratio / 6)
    : (1 + ratio) * Math.log1p(ratio) - ratio
  return 0.1 * (duration * Math.log(a) + a * remainder) / Math.LN10
}
