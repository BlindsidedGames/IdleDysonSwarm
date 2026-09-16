import type { CanonicalGameStateV1 } from '../game-state/types'
import { QUANTUM_CONSTANTS } from './quantumUpgrades'

export const DEBUG_OVERFLOW_COST = 10n
export const SPEEDRUN_MILESTONES = ['firstInfinity', 'firstQuantumLeap', 'reality', 'doubleSpeed', 'debugQualification'] as const
export type SpeedrunMilestoneId = typeof SPEEDRUN_MILESTONES[number]
export type RunUsage = 'yes' | 'no' | 'unknown'
export interface SpeedrunMilestone {
  readonly elapsedSeconds: number | null
  readonly storedTime: RunUsage
  readonly debug: RunUsage
}
export interface SpeedrunStatistics {
  readonly createdWithVersion?: string
  readonly activeSeconds?: number
  readonly activeTimeComplete?: boolean
  readonly version: 1
  readonly startedAtMilliseconds: number | null
  readonly observedAtMilliseconds: number
  readonly clockUncertain: boolean
  readonly storedTime: RunUsage
  readonly debug: RunUsage
  readonly milestones: Readonly<Partial<Record<SpeedrunMilestoneId, SpeedrunMilestone>>>
}

export function createSpeedrunStatistics(startedAt: string | null, fresh: boolean, now = Date.now()): SpeedrunStatistics {
  // Culture-formatted Unity dates have no unambiguous timezone or day/month order.
  const parsed = startedAt && /^\d{4}-\d\d-\d\dT.*Z$/.test(startedAt) ? Date.parse(startedAt) : NaN
  const start = Number.isFinite(parsed) && parsed >= 0 && parsed <= now && new Date(parsed).toISOString() === startedAt ? parsed : null
  return { version: 1, ...(fresh ? { activeSeconds: 0, activeTimeComplete: true } : {}), startedAtMilliseconds: start, observedAtMilliseconds: fresh ? now : start ?? 0,
    clockUncertain: start === null, storedTime: fresh ? 'no' : 'unknown', debug: fresh ? 'no' : 'unknown', milestones: {} }
}

export function qualifiesForDebug(state: CanonicalGameStateV1): boolean {
  return (state.avocado.overflowPoints ?? 0n) >= DEBUG_OVERFLOW_COST
}

export function elapsedSpeedrunSeconds(run: SpeedrunStatistics, now = Date.now()): number | null {
  return run.startedAtMilliseconds === null || run.clockUncertain ? null
    : Math.max(0, Math.max(run.observedAtMilliseconds, now) - run.startedAtMilliseconds) / 1000
}

export function speedrunEligible(run: SpeedrunStatistics): boolean {
  return run.debug === 'no' && !run.clockUncertain && run.startedAtMilliseconds !== null
}

export function observeSpeedruns(state: CanonicalGameStateV1, now = Date.now(), historical = false, quantumLeap = false): CanonicalGameStateV1 {
  const previous = state.statistics.speedruns
  if (!previous) return state
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
  for (const id of SPEEDRUN_MILESTONES) {
    if (reached[id] && !milestones[id]) milestones[id] = {
      elapsedSeconds: historical ? null : elapsedSpeedrunSeconds(run, now), storedTime: run.storedTime, debug: run.debug,
    }
  }
  return { ...state, statistics: { ...state.statistics, speedruns: { ...run, milestones } } }
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

export function markSpeedrunUsage(state: CanonicalGameStateV1, kind: 'debug' | 'storedTime'): CanonicalGameStateV1 {
  const run = state.statistics.speedruns
  if (!run || run[kind] === 'yes') return state
  return { ...state, statistics: { ...state.statistics, speedruns: { ...run, [kind]: 'yes' } } }
}

export function validateSpeedrunStatistics(value: unknown): string | null {
  if (value === undefined) return null // saves predating tracking
  const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
  const seconds = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0
  const usage = (v: unknown) => v === 'yes' || v === 'no' || v === 'unknown'
  if (!record(value) || value.version !== 1 ||
    !(value.startedAtMilliseconds === null || seconds(value.startedAtMilliseconds)) ||
    !seconds(value.observedAtMilliseconds) || typeof value.clockUncertain !== 'boolean' ||
    !usage(value.storedTime) || !usage(value.debug) || !record(value.milestones)) return 'Invalid speedrun statistics.'
  if (value.createdWithVersion !== undefined && (typeof value.createdWithVersion !== 'string' || value.createdWithVersion.trim().length === 0)) return 'Invalid save creation version.'
  if ((value.activeSeconds !== undefined && !seconds(value.activeSeconds)) ||
    (value.activeTimeComplete !== undefined && typeof value.activeTimeComplete !== 'boolean')) return 'Invalid active speedrun time.'
  if (typeof value.startedAtMilliseconds === 'number' && value.startedAtMilliseconds > Number(value.observedAtMilliseconds)) return 'Invalid speedrun clock.'
  for (const [id, milestone] of Object.entries(value.milestones)) {
    if (!SPEEDRUN_MILESTONES.includes(id as SpeedrunMilestoneId) || !record(milestone) ||
      !(milestone.elapsedSeconds === null || seconds(milestone.elapsedSeconds)) ||
      !usage(milestone.storedTime) || !usage(milestone.debug)) return 'Invalid speedrun milestone.'
  }
  return null
}
