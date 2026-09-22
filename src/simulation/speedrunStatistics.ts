import type { CanonicalGameStateV1 } from '../game-state/types'
import { QUANTUM_CONSTANTS } from './quantumUpgrades'

export const DEBUG_OVERFLOW_COST = 10n
export const SPEEDRUN_MILESTONES = ['firstInfinity', 'firstQuantumLeap', 'reality', 'doubleSpeed', 'debugQualification'] as const
export type SpeedrunMilestoneId = typeof SPEEDRUN_MILESTONES[number]
export type RunUsage = 'yes' | 'no' | 'unknown'
export interface SpeedrunUsage {
  readonly botBoostUsed?: boolean
  readonly doubleIpUsed?: boolean
  readonly storedTime: RunUsage
  readonly debug: RunUsage
}
export type SpeedrunRecords = Readonly<Partial<Record<SpeedrunMilestoneId, SpeedrunMilestone>>>
export interface SpeedrunMilestone extends SpeedrunUsage {
  readonly elapsedSeconds: number | null
}
export interface SpeedrunStatistics extends SpeedrunUsage {
  readonly imported?: boolean
  readonly personalBests?: SpeedrunRecords
  readonly createdWithVersion?: string
  readonly activeSeconds?: number
  readonly activeTimeComplete?: boolean
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
  return { version: 1, ...(fresh ? { activeSeconds: 0, activeTimeComplete: true, botBoostUsed: false, doubleIpUsed: false, personalBests: {} } : {}), startedAtMilliseconds: start, observedAtMilliseconds: fresh ? now : start ?? 0,
    clockUncertain: start === null, storedTime: fresh ? 'no' : 'unknown', debug: fresh ? 'no' : 'unknown', milestones: {} }
}

export function qualifiesForDebug(state: CanonicalGameStateV1): boolean {
  return (state.avocado.overflowPoints ?? 0n) >= DEBUG_OVERFLOW_COST
}

export function elapsedSpeedrunSeconds(run: SpeedrunStatistics, now = Date.now()): number | null {
  return run.startedAtMilliseconds === null || run.clockUncertain ? null
    : Math.max(0, Math.max(run.observedAtMilliseconds, now) - run.startedAtMilliseconds) / 1000
}

/** Older runs without complete playtime keep their existing elapsed-time basis. */
export function speedrunRecordSeconds(run: SpeedrunStatistics, now = Date.now()): number | null {
  return run.activeTimeComplete === true && run.activeSeconds !== undefined
    ? run.activeSeconds : elapsedSpeedrunSeconds(run, now)
}

export function speedrunEligible(run: SpeedrunStatistics): boolean {
  return run.imported !== true && run.debug === 'no' && !run.clockUncertain && run.startedAtMilliseconds !== null
}

export function observeSpeedruns(state: CanonicalGameStateV1, now = Date.now(), historical = false, quantumLeap = false): CanonicalGameStateV1 {
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
    debugQualification: qualifiesForDebug(state),
  }
  const milestones = { ...run.milestones }
  let personalBests = run.personalBests ?? {}
  for (const id of SPEEDRUN_MILESTONES) {
    if (reached[id] && !milestones[id]) {
      const milestone = { elapsedSeconds: historical ? null : speedrunRecordSeconds(run, now), ...snapshotSpeedrunUsage(run) }
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
    if (previousUnboosted === candidateUnboosted && previous.elapsedSeconds != null && previous.elapsedSeconds <= candidate.elapsedSeconds) return records
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

/** Count only admitted, unaccelerated active time; never offline or Stored Time. */
export function recordActiveSpeedrunTime(state: CanonicalGameStateV1, seconds: number): CanonicalGameStateV1 {
  const run = state.statistics.speedruns
  if (!run || !Number.isFinite(seconds) || seconds <= 0) return state
  return { ...state, statistics: { ...state.statistics, speedruns: {
    ...run, activeSeconds: Math.min(Number.MAX_VALUE, (run.activeSeconds ?? 0) + seconds),
    activeTimeComplete: run.activeTimeComplete ?? false,
  } } }
}

export function markSpeedrunUsage(state: CanonicalGameStateV1, kind: 'debug' | 'storedTime' | 'doubleIpUsed'): CanonicalGameStateV1 {
  const run = state.statistics.speedruns
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
    (value.activeTimeComplete !== undefined && typeof value.activeTimeComplete !== 'boolean')) return 'Invalid active speedrun time.'
  if (typeof value.startedAtMilliseconds === 'number' && value.startedAtMilliseconds > Number(value.observedAtMilliseconds)) return 'Invalid speedrun clock.'
  if (value.personalBests !== undefined && !record(value.personalBests)) return 'Invalid speedrun records.'
  for (const [id, milestone] of [...Object.entries(value.milestones), ...Object.entries(value.personalBests ?? {})]) {
    if (!SPEEDRUN_MILESTONES.includes(id as SpeedrunMilestoneId) || !record(milestone) ||
      (milestone.doubleIpUsed !== undefined && typeof milestone.doubleIpUsed !== 'boolean') ||
      (milestone.botBoostUsed !== undefined && typeof milestone.botBoostUsed !== 'boolean') ||
      !(milestone.elapsedSeconds === null || seconds(milestone.elapsedSeconds)) ||
      !usage(milestone.storedTime) || !usage(milestone.debug)) return 'Invalid speedrun milestone.'
  }
  for (const best of Object.values(value.personalBests ?? {})) {
    if (!record(best) || best.elapsedSeconds === null || best.debug !== 'no') return 'Invalid speedrun personal best.'
  }
  return null
}
