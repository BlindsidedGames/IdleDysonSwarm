import type { CanonicalGameStateV1 } from '../game-state/types'
import { addContinuous } from './numeric'
import { hasSrsAugment, SRS_AUGMENTS } from './skillSubskills'

type State = Pick<CanonicalGameStateV1, 'skills' | 'challenges'>

interface GeneratedResearch {
  readonly rate: number
  readonly progress: number
  readonly gained: number
}

/** Union of 30-second activity windows. Dense level gains form one window. */
function researchActivityCoverage(timer: number, seconds: number, generated: readonly GeneratedResearch[]) {
  const streams = generated.filter(({ rate, gained }) => rate > 0 && gained > 0)
    .map(({ rate, progress, gained }) => ({
      rate, progress, gained, index: Math.min(gained, Math.max(1, Math.floor(progress))),
      dense: rate >= 1 / 30,
    }))
  let end = timer
  let covered = Math.min(seconds, timer)
  while (streams.length > 0) {
    const time = (stream: typeof streams[number]) => Math.max(0, (stream.index - stream.progress) / stream.rate)
    streams.sort((a, b) => time(a) - time(b))
    const stream = streams[0]
    const start = Math.min(seconds, time(stream))
    const last = Math.min(seconds, Math.max(0, (stream.gained - stream.progress) / stream.rate))
    // With only one sparse stream left, sum its disjoint windows directly.
    if (!stream.dense && streams.length === 1) {
      const firstUncovered = Math.min(stream.gained + 1,
        Math.max(stream.index, Math.floor(end * stream.rate + stream.progress) + 1))
      const previous = firstUncovered - 1
      if (previous >= stream.index) {
        const previousEnd = Math.max(0, (previous - stream.progress) / stream.rate) + 30
        covered += Math.max(0, Math.min(seconds, previousEnd) - Math.min(seconds, end))
        end = Math.max(end, previousEnd)
      }
      const count = stream.gained - firstUncovered + 1
      if (count > 0) covered += (count - 1) * 30 + Math.min(30, seconds - last)
      end = Math.max(end, last + 30)
      break
    }
    const windowEnd = (stream.dense ? last : start) + 30
    covered += Math.max(0, Math.min(seconds, windowEnd) - Math.max(start, Math.min(seconds, end)))
    end = Math.max(end, windowEnd)
    if (stream.dense || stream.index === stream.gained) streams.shift()
    else stream.index++
  }
  return { covered: Math.min(seconds, covered), remaining: Math.max(0, end - seconds) }
}

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
export function advanceSrsAugments(state: State, seconds: number, generated: readonly GeneratedResearch[] = []): State['skills'] {
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
    const active = hasSrsAugment(state, 'researchActivity')
    const coverage = researchActivityCoverage(activity.timerSeconds, seconds, active ? generated : [])
    if (active) charge += 1.5 * coverage.covered
    byId[SRS_AUGMENTS.researchActivity] = { ...activity, timerSeconds: coverage.remaining }
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
