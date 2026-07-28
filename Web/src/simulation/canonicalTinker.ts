import type { CanonicalGameStateV1 } from '../game-state/types'
import { addContinuous } from './numeric'

const MINIMUM_TINKER_COOLDOWN_SECONDS = 0.01
const STARTING_PROGRESS_SECONDS = 0.1
const MANUAL_LABOUR_COOLDOWN_SECONDS = 0.2
const BOT_MINIMUM_COOLDOWN_SECONDS = 0.5

export interface CanonicalTinkerStats {
  readonly botYield: number
  readonly assemblyYield: number
  readonly cooldownSeconds: number
}

/**
 * Transient interaction state. Unity does not persist the running button
 * coroutine/progress, so a fresh runtime session starts idle.
 */
export interface CanonicalTinkerRuntimeState {
  readonly running: boolean
  readonly repeat: boolean
  readonly elapsedSeconds: number
  readonly effectiveManualLabour: boolean
  readonly cooldownSeconds: number
}

export interface CanonicalTinkerAdvanceResult {
  readonly state: CanonicalGameStateV1
  readonly runtime: CanonicalTinkerRuntimeState
  readonly botsGranted: number
  readonly assemblyLinesGranted: number
  readonly completions: number
}

export function createCanonicalTinkerRuntimeState():
  CanonicalTinkerRuntimeState {
  return Object.freeze({
    running: false,
    repeat: false,
    elapsedSeconds: 0,
    effectiveManualLabour: false,
    cooldownSeconds: BOT_MINIMUM_COOLDOWN_SECONDS,
  })
}

/**
 * Derives Unity's current Tinker stats from canonical durable state and the
 * already-materialized assembly yield.
 */
export function deriveCanonicalTinkerStats(
  state: Readonly<CanonicalGameStateV1>,
  assemblyYield: number,
): CanonicalTinkerStats {
  return Object.freeze({
    botYield: 1,
    assemblyYield: requireFiniteNonNegative(
      assemblyYield,
      'assemblyYield',
    ),
    cooldownSeconds: Math.max(
      MINIMUM_TINKER_COOLDOWN_SECONDS,
      requireFiniteNonNegative(
        state.dyson.manualCreationIntervalSeconds,
        'manualCreationIntervalSeconds',
      ),
    ),
  })
}

/**
 * Starts the Tinker action with Unity's initial 0.1-second progress seed.
 */
export function startCanonicalTinker(
  state: Readonly<CanonicalGameStateV1>,
  runtime: Readonly<CanonicalTinkerRuntimeState>,
  stats: Readonly<CanonicalTinkerStats>,
  repeat: boolean,
): CanonicalTinkerAdvanceResult {
  const synchronized = synchronizeRuntime(state, runtime, stats)
  if (synchronized.runtime.running) {
    return unchanged(synchronized.state, {
      ...synchronized.runtime,
      repeat,
    })
  }
  return unchanged(synchronized.state, {
    ...synchronized.runtime,
    running: true,
    repeat,
    elapsedSeconds: Math.min(
      STARTING_PROGRESS_SECONDS,
      synchronized.runtime.cooldownSeconds,
    ),
  })
}

export function setCanonicalTinkerRepeat(
  state: Readonly<CanonicalGameStateV1>,
  runtime: Readonly<CanonicalTinkerRuntimeState>,
  enabled: boolean,
): CanonicalTinkerAdvanceResult {
  if (runtime.repeat === enabled) return unchanged(state, runtime)
  return unchanged(state, { ...runtime, repeat: enabled })
}

/**
 * Returns the exact next completion horizon for event-time scheduling.
 */
export function timeToCanonicalTinkerCompletion(
  runtime: Readonly<CanonicalTinkerRuntimeState>,
  maximumSeconds: number,
): number {
  if (!Number.isFinite(maximumSeconds) || maximumSeconds < 0) {
    throw new RangeError('maximumSeconds must be finite and non-negative.')
  }
  if (!runtime.running) return maximumSeconds
  return Math.min(
    maximumSeconds,
    Math.max(0, runtime.cooldownSeconds - runtime.elapsedSeconds),
  )
}

/**
 * Advances transient progress and applies every completion admitted by the
 * explicit interval. Repeat mode remains backend-owned; non-repeat mode stops
 * after the first completion.
 */
export function advanceCanonicalTinker(
  state: Readonly<CanonicalGameStateV1>,
  runtime: Readonly<CanonicalTinkerRuntimeState>,
  stats: Readonly<CanonicalTinkerStats>,
  seconds: number,
): CanonicalTinkerAdvanceResult {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new RangeError('Tinker advance seconds must be finite and non-negative.')
  }
  let synchronized = synchronizeRuntime(state, runtime, stats)
  if (!synchronized.runtime.running || seconds === 0) {
    return unchanged(synchronized.state, synchronized.runtime)
  }

  let candidate = synchronized.state
  let active = synchronized.runtime
  let remaining = seconds
  let botsGranted = 0
  let assemblyLinesGranted = 0
  let completions = 0

  while (active.running && remaining >= 0) {
    const untilCompletion = Math.max(
      0,
      active.cooldownSeconds - active.elapsedSeconds,
    )
    if (remaining < untilCompletion) {
      active = {
        ...active,
        elapsedSeconds: addContinuous(active.elapsedSeconds, remaining),
      }
      remaining = 0
      break
    }
    remaining = Math.max(0, remaining - untilCompletion)
    const manual = isManualLabourEffective(candidate)
    if (manual) {
      candidate = {
        ...candidate,
        dyson: {
          ...candidate.dyson,
          facilities: {
            ...candidate.dyson.facilities,
            assembly_lines: [
              addContinuous(
                candidate.dyson.facilities.assembly_lines[0],
                stats.assemblyYield,
              ),
              candidate.dyson.facilities.assembly_lines[1],
            ],
          },
          manualCreationIntervalSeconds:
            MANUAL_LABOUR_COOLDOWN_SECONDS,
        },
      }
      assemblyLinesGranted = addContinuous(
        assemblyLinesGranted,
        stats.assemblyYield,
      )
    } else {
      const nextCreationTime =
        candidate.dyson.manualCreationIntervalSeconds >= 1
          ? Math.max(
              0,
              candidate.dyson.manualCreationIntervalSeconds - 1,
            )
          : BOT_MINIMUM_COOLDOWN_SECONDS
      candidate = {
        ...candidate,
        dyson: {
          ...candidate.dyson,
          bots: addContinuous(candidate.dyson.bots, stats.botYield),
          manualCreationIntervalSeconds: nextCreationTime,
        },
      }
      botsGranted = addContinuous(botsGranted, stats.botYield)
    }
    completions += 1
    if (!active.repeat) {
      active = {
        ...active,
        running: false,
        elapsedSeconds: 0,
      }
      break
    }

    const nextStats = deriveCanonicalTinkerStats(
      candidate,
      stats.assemblyYield,
    )
    active = {
      ...active,
      elapsedSeconds: 0,
      effectiveManualLabour: isManualLabourEffective(candidate),
      cooldownSeconds: nextStats.cooldownSeconds,
    }
    if (remaining === 0) break
  }

  return {
    state: candidate,
    runtime: Object.freeze(active),
    botsGranted,
    assemblyLinesGranted,
    completions,
  }
}

function synchronizeRuntime(
  state: Readonly<CanonicalGameStateV1>,
  runtime: Readonly<CanonicalTinkerRuntimeState>,
  stats: Readonly<CanonicalTinkerStats>,
): {
  readonly state: CanonicalGameStateV1
  readonly runtime: CanonicalTinkerRuntimeState
} {
  const manual = isManualLabourEffective(state)
  const modeChanged = runtime.effectiveManualLabour !== manual
  const creationTime = modeChanged
    ? manual
      ? MANUAL_LABOUR_COOLDOWN_SECONDS
      : state.dyson.manualCreationIntervalSeconds <
          BOT_MINIMUM_COOLDOWN_SECONDS
        ? BOT_MINIMUM_COOLDOWN_SECONDS
        : state.dyson.manualCreationIntervalSeconds
    : state.dyson.manualCreationIntervalSeconds
  const candidate =
    creationTime === state.dyson.manualCreationIntervalSeconds
      ? state
      : {
          ...state,
          dyson: {
            ...state.dyson,
            manualCreationIntervalSeconds: creationTime,
          },
        }
  const changed =
    modeChanged ||
    runtime.cooldownSeconds !== stats.cooldownSeconds
  const cooldownSeconds = modeChanged
    ? Math.max(MINIMUM_TINKER_COOLDOWN_SECONDS, creationTime)
    : stats.cooldownSeconds
  return {
    state: candidate as CanonicalGameStateV1,
    runtime: Object.freeze({
      ...runtime,
      elapsedSeconds: changed ? 0 : runtime.elapsedSeconds,
      effectiveManualLabour: manual,
      cooldownSeconds,
    }),
  }
}

function isManualLabourEffective(
  state: Readonly<CanonicalGameStateV1>,
): boolean {
  return (
    state.skills.byId.manualLabour?.owned === true &&
    state.dyson.facilities.ai_managers[1] >= 1
  )
}

function requireFiniteNonNegative(value: number, field: string): number {
  if (Number.isFinite(value) && value >= 0) return value
  throw new RangeError(`${field} must be finite and non-negative.`)
}

function unchanged(
  state: Readonly<CanonicalGameStateV1>,
  runtime: Readonly<CanonicalTinkerRuntimeState>,
): CanonicalTinkerAdvanceResult {
  return {
    state: state as CanonicalGameStateV1,
    runtime: Object.freeze({ ...runtime }),
    botsGranted: 0,
    assemblyLinesGranted: 0,
    completions: 0,
  }
}
