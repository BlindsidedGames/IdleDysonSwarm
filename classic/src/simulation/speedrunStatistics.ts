import type { CanonicalGameStateV1 } from '../game-state/types'
import { QUANTUM_CONSTANTS } from './quantumUpgrades'

export const DEBUG_OVERFLOW_COST = 10n
export const SPEEDRUN_MILESTONES = ['firstInfinity', 'firstQuantumLeap', 'reality', 'doubleSpeed', 'firstTranscendence', 'debugQualification'] as const
export type SpeedrunMilestoneId = typeof SPEEDRUN_MILESTONES[number]
export type RunUsage = 'yes' | 'no' | 'unknown'
export interface SpeedrunUsage {
  readonly botBoostUsed?: boolean
  readonly doubleIpUsed?: boolean
  readonly storedTime: RunUsage
  readonly debug: RunUsage
}
export type SpeedrunRecords = Readonly<Partial<Record<SpeedrunMilestoneId, SpeedrunMilestone>>>
export type SpeedrunTimingBasis = 'combined' | 'active' | 'elapsed'
export interface SpeedrunMilestone extends SpeedrunUsage {
  readonly timingBasis?: SpeedrunTimingBasis
  readonly activeSeconds?: number
  readonly storedTimeSeconds?: number
  readonly elapsedSeconds: number | null
}
export interface SpeedrunStatistics extends SpeedrunUsage {
  readonly imported?: boolean
  readonly personalBests?: SpeedrunRecords
  readonly createdWithVersion?: string
  readonly activeSeconds?: number
  readonly activeTimeComplete?: boolean
  readonly storedTimeSeconds?: number
  readonly storedTimeComplete?: boolean
  readonly version: 1
  readonly startedAtMilliseconds: number | null
  readonly observedAtMilliseconds: number
  readonly clockUncertain: boolean
  readonly milestones: Readonly<Partial<Record<SpeedrunMilestoneId, SpeedrunMilestone>>>
}

export function createSpeedrunStatistics(startedAt: string | null, fresh: boolean, now = Date.now()): SpeedrunStatistics {
  // Culture-formatted Unity dates have no unambiguous timezone or day/month order.
  const parsed = startedAt && /^\d{4}-\d\d-\d\dT.*Z$/.test(startedAt) ? Date.parse(startedAt) : NaN
  const start = Number.isFinite(parsed) && parsed >= 0 && parsed <= now && new Date(parsed).toISOString() === startedAt ? parsed : null
  return { version: 1, ...(fresh ? { activeSeconds: 0, activeTimeComplete: true, storedTimeSeconds: 0, storedTimeComplete: true, botBoostUsed: false, doubleIpUsed: false, personalBests: {} } : {}), startedAtMilliseconds: start, observedAtMilliseconds: fresh ? now : start ?? 0,
    clockUncertain: start === null, storedTime: fresh ? 'no' : 'unknown', debug: fresh ? 'no' : 'unknown', milestones: {} }
}

export function qualifiesForDebug(state: CanonicalGameStateV1): boolean {
  return (state.avocado.overflowPoints ?? 0n) >= DEBUG_OVERFLOW_COST
}

export function elapsedSpeedrunSeconds(run: SpeedrunStatistics, now = Date.now()): number | null {
  return run.startedAtMilliseconds === null || run.clockUncertain ? null
    : Math.max(0, Math.max(run.observedAtMilliseconds, now) - run.startedAtMilliseconds) / 1000
}

/** Missing historical spending cannot be reconstructed from the remaining bank. */
export function speedrunStoredSeconds(run: SpeedrunStatistics): number | null {
  return run.storedTimeComplete === true ? run.storedTimeSeconds ?? 0
    : run.storedTime === 'no' ? 0 : null
}

export function speedrunTimingBasis(run: SpeedrunStatistics): SpeedrunTimingBasis {
  if (run.activeTimeComplete !== true || run.activeSeconds === undefined) return 'elapsed'
  return speedrunStoredSeconds(run) === null ? 'active' : 'combined'
}

/** Retain the old timing basis when a complete combined history is unavailable. */
export function speedrunRecordSeconds(run: SpeedrunStatistics, now = Date.now()): number | null {
  const basis = speedrunTimingBasis(run)
  return basis === 'elapsed' ? elapsedSpeedrunSeconds(run, now)
    : Math.min(Number.MAX_VALUE, run.activeSeconds! + (basis === 'combined' ? speedrunStoredSeconds(run)! : 0))
}

export function speedrunEligible(run: SpeedrunStatistics): boolean {
  return run.imported !== true && run.debug === 'no' && !run.clockUncertain && run.startedAtMilliseconds !== null
}

export function observeSpeedruns(state: CanonicalGameStateV1, now = Date.now(), historical = false, quantumLeap = false, transcendence = false): CanonicalGameStateV1 {
  if (!state.statistics.speedruns) return state
  const previous = migrateSpeedrunRecords(state.statistics.speedruns)
  const run = { ...previous, observedAtMilliseconds: !historical && previous.debug !== 'unknown' && previous.storedTime !== 'unknown'
    ? Math.max(previous.observedAtMilliseconds, now) : previous.observedAtMilliseconds,
    clockUncertain: previous.clockUncertain || now < previous.observedAtMilliseconds }
  const reached: Record<SpeedrunMilestoneId, boolean> = {
    firstInfinity: state.meta.firstInfinityComplete,
    firstQuantumLeap: quantumLeap || (historical && state.quantum.pointsEarned > 0n),
    reality: state.quantum.pointsEarned > 0n || state.infinity.secretsOfTheUniverse >= QUANTUM_CONSTANTS.maximumSecrets,
    doubleSpeed: state.timeline.doubleTime.unlocked,
    firstTranscendence: transcendence || (historical && state.statistics.lifetime.botCapOverflowRewards > 0n),
    debugQualification: qualifiesForDebug(state),
  }
  const milestones = { ...run.milestones }
  let personalBests = run.personalBests ?? {}
  for (const id of SPEEDRUN_MILESTONES) {
    if (reached[id] && !milestones[id]) {
      const milestone: SpeedrunMilestone = { elapsedSeconds: historical ? null : speedrunRecordSeconds(run, now), ...snapshotSpeedrunUsage(run),
        ...(!historical ? { timingBasis: speedrunTimingBasis(run),
          ...(run.activeTimeComplete === true ? { activeSeconds: run.activeSeconds } : {}),
          ...(speedrunStoredSeconds(run) === null ? {} : { storedTimeSeconds: speedrunStoredSeconds(run)! }),
        } : {}),
      }
      milestones[id] = milestone
      if (speedrunEligible(run)) personalBests = recordPersonalBest(personalBests, id, milestone)
    }
  }
  return { ...state, statistics: { ...state.statistics, speedruns: { ...run, milestones, personalBests } } }
}

/** Snapshots preserve unknown historical usage rather than inventing a clean run. */
export function snapshotSpeedrunUsage(run: SpeedrunUsage): SpeedrunUsage {
  return { storedTime: run.storedTime, debug: run.debug,
    ...(run.botBoostUsed === undefined ? {} : { botBoostUsed: run.botBoostUsed }),
    ...(run.doubleIpUsed === undefined ? {} : { doubleIpUsed: run.doubleIpUsed }) }
}

/** Only explicit, unused assistance flags establish an unboosted result. */
export function isUnboostedSpeedrun(usage: SpeedrunUsage): boolean {
  return usage.botBoostUsed === false && usage.doubleIpUsed === false && usage.storedTime === 'no'
}

export function recordPersonalBest(records: SpeedrunRecords, id: SpeedrunMilestoneId, candidate: SpeedrunMilestone): SpeedrunRecords {
  if (candidate.debug !== 'no' || candidate.elapsedSeconds === null) return records
  const previous = records[id]
  if (previous) {
    const previousUnboosted = isUnboostedSpeedrun(previous)
    const candidateUnboosted = isUnboostedSpeedrun(candidate)
    if (previousUnboosted && !candidateUnboosted) return records
    if (previousUnboosted === candidateUnboosted) {
      // A complete combined result supersedes old timing; do not compare unlike clocks.
      const timingRank = { combined: 3, active: 2, elapsed: 1 }
      const previousRank = previous.timingBasis ? timingRank[previous.timingBasis] : 0
      const candidateRank = candidate.timingBasis ? timingRank[candidate.timingBasis] : 0
      if (previousRank > candidateRank) return records
      if (previousRank === candidateRank && previous.elapsedSeconds != null && previous.elapsedSeconds <= candidate.elapsedSeconds) return records
    }
  }
  return { ...records, [id]: candidate }
}

/** Keep milestone snapshots so observation cannot immediately recreate a cleared best. */
export function clearSpeedrunBest(run: SpeedrunStatistics, id: SpeedrunMilestoneId): SpeedrunStatistics {
  const migrated = migrateSpeedrunRecords(run)
  if (!migrated.personalBests?.[id]) return migrated
  const personalBests = { ...migrated.personalBests }
  delete personalBests[id]
  return { ...migrated, personalBests }
}

/** Only older checkpoints without a record collection need seeding. */
export function migrateSpeedrunRecords(run: SpeedrunStatistics): SpeedrunStatistics {
  if (run.storedTimeSeconds === undefined && run.storedTime === 'no') {
    run = { ...run, storedTimeSeconds: 0, storedTimeComplete: true }
  }
  if (run.personalBests !== undefined) return run
  let personalBests: SpeedrunRecords = {}
  if (!run.imported && !run.clockUncertain && run.startedAtMilliseconds !== null) {
    for (const id of SPEEDRUN_MILESTONES) {
      const milestone = run.milestones[id]
      if (milestone) personalBests = recordPersonalBest(personalBests, id, milestone)
    }
  }
  return { ...run, personalBests }
}

/** Suppress accumulated floating-point dust at whole-second boundaries. */
function addSpeedrunSeconds(previous: number, seconds: number): number {
  const total = Math.min(Number.MAX_VALUE, previous + seconds)
  const whole = Math.round(total)
  return Math.abs(total - whole) <= Number.EPSILON * Math.max(1, total) * 32 ? whole : total
}

/** Count only admitted, unaccelerated active time; never offline or Stored Time. */
export function recordActiveSpeedrunTime(state: CanonicalGameStateV1, seconds: number): CanonicalGameStateV1 {
  const run = state.statistics.speedruns
  if (!run || !Number.isFinite(seconds) || seconds <= 0) return state
  return { ...state, statistics: { ...state.statistics, speedruns: {
    ...run, activeSeconds: addSpeedrunSeconds(run.activeSeconds ?? 0, seconds),
    activeTimeComplete: run.activeTimeComplete ?? false,
  } } }
}

/** Count consumed bank seconds once, before milestone observation; acceleration is excluded. */
export function recordStoredSpeedrunTime(state: CanonicalGameStateV1, seconds: number): CanonicalGameStateV1 {
  const run = state.statistics.speedruns
  if (!run || !Number.isFinite(seconds) || seconds <= 0) return state
  return { ...state, statistics: { ...state.statistics, speedruns: {
    ...run, storedTime: 'yes',
    storedTimeSeconds: addSpeedrunSeconds(run.storedTimeSeconds ?? 0, seconds),
    storedTimeComplete: run.storedTimeComplete ?? run.storedTime === 'no',
  } } }
}

/** Existing Transcendences have no recoverable timestamp; never invent one on load. */
export function initializeSpeedrunTracking(state: CanonicalGameStateV1): CanonicalGameStateV1 {
  const existing = state.statistics.speedruns
  if (!existing) return observeSpeedruns({ ...state, statistics: { ...state.statistics,
    speedruns: createSpeedrunStatistics(state.meta.createdAtLegacyText, false) } }, Date.now(), true)
  const run = migrateSpeedrunRecords(existing)
  const milestones = !run.milestones.firstTranscendence && state.statistics.lifetime.botCapOverflowRewards > 0n
    ? { ...run.milestones, firstTranscendence: { elapsedSeconds: null, storedTime: 'unknown' as const, debug: 'unknown' as const } }
    : run.milestones
  return { ...state, statistics: { ...state.statistics, speedruns: { ...run, milestones } } }
}

export function markSpeedrunUsage(state: CanonicalGameStateV1, kind: 'debug' | 'storedTime' | 'doubleIpUsed'): CanonicalGameStateV1 {
  const run = state.statistics.speedruns && migrateSpeedrunRecords(state.statistics.speedruns)
  const value = kind === 'doubleIpUsed' ? true : 'yes'
  if (!run || run[kind] === value) return state
  return { ...state, statistics: { ...state.statistics, speedruns: { ...run, [kind]: value } } }
}

export function validateSpeedrunStatistics(value: unknown): string | null {
  if (value === undefined) return null // saves predating tracking
  const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
  const seconds = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0
  const usage = (v: unknown) => v === 'yes' || v === 'no' || v === 'unknown'
  if (!record(value) || value.version !== 1 ||
    (value.imported !== undefined && typeof value.imported !== 'boolean') ||
    (value.doubleIpUsed !== undefined && typeof value.doubleIpUsed !== 'boolean') ||
    (value.botBoostUsed !== undefined && typeof value.botBoostUsed !== 'boolean') ||
    !(value.startedAtMilliseconds === null || seconds(value.startedAtMilliseconds)) ||
    !seconds(value.observedAtMilliseconds) || typeof value.clockUncertain !== 'boolean' ||
    !usage(value.storedTime) || !usage(value.debug) || !record(value.milestones)) return 'Invalid speedrun statistics.'
  if (value.createdWithVersion !== undefined && (typeof value.createdWithVersion !== 'string' || value.createdWithVersion.trim().length === 0)) return 'Invalid save creation version.'
  if ((value.activeSeconds !== undefined && !seconds(value.activeSeconds)) ||
    (value.activeTimeComplete !== undefined && typeof value.activeTimeComplete !== 'boolean') ||
    (value.storedTimeSeconds !== undefined && !seconds(value.storedTimeSeconds)) ||
    (value.storedTimeComplete !== undefined && typeof value.storedTimeComplete !== 'boolean') ||
    (value.storedTimeComplete === true && value.storedTimeSeconds === undefined)) return 'Invalid active speedrun time.'
  if (typeof value.startedAtMilliseconds === 'number' && value.startedAtMilliseconds > Number(value.observedAtMilliseconds)) return 'Invalid speedrun clock.'
  if (value.personalBests !== undefined && !record(value.personalBests)) return 'Invalid speedrun records.'
  for (const [id, milestone] of [...Object.entries(value.milestones), ...Object.entries(value.personalBests ?? {})]) {
    if (!SPEEDRUN_MILESTONES.includes(id as SpeedrunMilestoneId) || !record(milestone) ||
      (milestone.doubleIpUsed !== undefined && typeof milestone.doubleIpUsed !== 'boolean') ||
      (milestone.botBoostUsed !== undefined && typeof milestone.botBoostUsed !== 'boolean') ||
      (milestone.timingBasis !== undefined && (typeof milestone.timingBasis !== 'string' || !['combined', 'active', 'elapsed'].includes(milestone.timingBasis))) ||
      (milestone.activeSeconds !== undefined && !seconds(milestone.activeSeconds)) ||
      (milestone.storedTimeSeconds !== undefined && !seconds(milestone.storedTimeSeconds)) ||
      !(milestone.elapsedSeconds === null || seconds(milestone.elapsedSeconds)) ||
      !usage(milestone.storedTime) || !usage(milestone.debug)) return 'Invalid speedrun milestone.'
  }
  for (const best of Object.values(value.personalBests ?? {})) {
    if (!record(best) || best.elapsedSeconds === null || best.debug !== 'no') return 'Invalid speedrun personal best.'
  }
  return null
}
