import { cloneCanonicalGameStateV2WithDyson } from '../game-state/cloneV2'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import {
  addGameDecimals,
  compareGameDecimals,
  gameDecimalFromNumber,
  type GameDecimal,
} from '../math/gameDecimal'
import type { CanonicalTinkerRuntimeState } from './canonicalTinker'

const MINIMUM_TINKER_COOLDOWN_SECONDS = 0.01
const STARTING_PROGRESS_SECONDS = 0.1
const MANUAL_LABOUR_COOLDOWN_SECONDS = 0.2
const BOT_MINIMUM_COOLDOWN_SECONDS = 0.5
const TINKER_TIME_EPSILON_SECONDS = 1e-12

export interface CanonicalTinkerStatsV2 {
  readonly assemblyYield: GameDecimal
  readonly cooldownSeconds: number
}

export interface CanonicalTinkerAdvanceResultV2 {
  readonly state: Readonly<CanonicalGameStateV2>
  readonly runtime: Readonly<CanonicalTinkerRuntimeState>
  readonly completions: number
}

export function deriveCanonicalTinkerStatsV2(
  state: Readonly<CanonicalGameStateV2>,
  assemblyYield: GameDecimal,
): Readonly<CanonicalTinkerStatsV2> {
  return Object.freeze({
    assemblyYield,
    cooldownSeconds: Math.max(
      MINIMUM_TINKER_COOLDOWN_SECONDS,
      state.dyson.manualCreationIntervalSeconds,
    ),
  })
}

export function startCanonicalTinkerV2(
  state: Readonly<CanonicalGameStateV2>,
  runtime: Readonly<CanonicalTinkerRuntimeState>,
  stats: Readonly<CanonicalTinkerStatsV2>,
  repeat: boolean,
): CanonicalTinkerAdvanceResultV2 {
  const synchronized = synchronize(state, runtime, stats)
  if (synchronized.runtime.running) {
    return unchanged(synchronized.state, repeat && !synchronized.runtime.repeat
      ? { ...synchronized.runtime, repeat: true }
      : synchronized.runtime)
  }
  return unchanged(synchronized.state, Object.freeze({
    ...synchronized.runtime,
    running: true,
    repeat,
    cycleId: nextCycleId(synchronized.runtime.cycleId),
    elapsedSeconds: Math.min(STARTING_PROGRESS_SECONDS, synchronized.runtime.cooldownSeconds),
  }))
}

export function setCanonicalTinkerRepeatV2(
  state: Readonly<CanonicalGameStateV2>,
  runtime: Readonly<CanonicalTinkerRuntimeState>,
  enabled: boolean,
): CanonicalTinkerAdvanceResultV2 {
  if (enabled && !runtime.running || runtime.repeat === enabled) return unchanged(state, runtime)
  return unchanged(state, Object.freeze({ ...runtime, repeat: enabled }))
}

export function advanceCanonicalTinkerV2(
  state: Readonly<CanonicalGameStateV2>,
  runtime: Readonly<CanonicalTinkerRuntimeState>,
  stats: Readonly<CanonicalTinkerStatsV2>,
  seconds: number,
): CanonicalTinkerAdvanceResultV2 {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new RangeError('Tinker advance seconds must be finite and non-negative.')
  }
  let synchronized = synchronize(state, runtime, stats)
  if (!synchronized.runtime.running) return unchanged(synchronized.state, synchronized.runtime)
  let candidate = synchronized.state
  let active = synchronized.runtime
  let remaining = seconds
  let completions = 0
  while (active.running && remaining >= 0) {
    const rawUntilCompletion = Math.max(0, active.cooldownSeconds - active.elapsedSeconds)
    const untilCompletion = rawUntilCompletion <= TINKER_TIME_EPSILON_SECONDS ? 0 : rawUntilCompletion
    if (remaining < untilCompletion && untilCompletion - remaining > TINKER_TIME_EPSILON_SECONDS) {
      active = Object.freeze({ ...active, elapsedSeconds: active.elapsedSeconds + remaining })
      break
    }
    remaining = Math.max(0, remaining - untilCompletion)
    const manual = isManualLabourEffective(candidate)
    candidate = cloneCanonicalGameStateV2WithDyson(
      candidate,
      manual
        ? {
            ...candidate.dyson,
            facilities: {
              ...candidate.dyson.facilities,
              assembly_lines: [
                addGameDecimals(candidate.dyson.facilities.assembly_lines[0], stats.assemblyYield),
                candidate.dyson.facilities.assembly_lines[1],
              ],
            },
            manualCreationIntervalSeconds: MANUAL_LABOUR_COOLDOWN_SECONDS,
          }
        : {
            ...candidate.dyson,
            bots: addGameDecimals(candidate.dyson.bots, gameDecimalFromNumber(1)),
            manualCreationIntervalSeconds: candidate.dyson.manualCreationIntervalSeconds >= 1
              ? Math.max(0, candidate.dyson.manualCreationIntervalSeconds - 1)
              : BOT_MINIMUM_COOLDOWN_SECONDS,
          },
    )
    completions += 1
    if (!active.repeat) {
      active = Object.freeze({ ...active, running: false, cycleId: 0, elapsedSeconds: 0 })
      break
    }
    const nextStats = deriveCanonicalTinkerStatsV2(candidate, stats.assemblyYield)
    active = Object.freeze({
      ...active,
      cycleId: nextCycleId(active.cycleId),
      elapsedSeconds: 0,
      effectiveManualLabour: isManualLabourEffective(candidate),
      cooldownSeconds: nextStats.cooldownSeconds,
    })
    if (remaining === 0) break
  }
  return Object.freeze({ state: candidate, runtime: active, completions })
}

function synchronize(
  state: Readonly<CanonicalGameStateV2>,
  runtime: Readonly<CanonicalTinkerRuntimeState>,
  stats: Readonly<CanonicalTinkerStatsV2>,
): { readonly state: Readonly<CanonicalGameStateV2>; readonly runtime: Readonly<CanonicalTinkerRuntimeState> } {
  const manual = isManualLabourEffective(state)
  const modeChanged = runtime.effectiveManualLabour !== manual
  const creationTime = modeChanged
    ? manual ? MANUAL_LABOUR_COOLDOWN_SECONDS
      : state.dyson.manualCreationIntervalSeconds < BOT_MINIMUM_COOLDOWN_SECONDS
        ? BOT_MINIMUM_COOLDOWN_SECONDS
        : state.dyson.manualCreationIntervalSeconds
    : state.dyson.manualCreationIntervalSeconds
  const candidate = creationTime === state.dyson.manualCreationIntervalSeconds
    ? state
    : cloneCanonicalGameStateV2WithDyson(
        state,
        { ...state.dyson, manualCreationIntervalSeconds: creationTime },
      )
  const changed = modeChanged || runtime.cooldownSeconds !== stats.cooldownSeconds
  return Object.freeze({
    state: candidate,
    runtime: Object.freeze({
      ...runtime,
      cycleId: changed && runtime.running ? nextCycleId(runtime.cycleId) : runtime.cycleId,
      elapsedSeconds: changed ? 0 : runtime.elapsedSeconds,
      effectiveManualLabour: manual,
      cooldownSeconds: modeChanged
        ? Math.max(MINIMUM_TINKER_COOLDOWN_SECONDS, creationTime)
        : stats.cooldownSeconds,
    }),
  })
}

function isManualLabourEffective(state: Readonly<CanonicalGameStateV2>): boolean {
  return state.skills.byId.manualLabour?.owned === true &&
    compareGameDecimals(
      state.dyson.facilities.ai_managers[1],
      gameDecimalFromNumber(1),
    ) >= 0
}

function nextCycleId(current: number): number {
  if (!Number.isSafeInteger(current) || current < 0) return 1
  return current >= Number.MAX_SAFE_INTEGER ? 1 : current + 1
}

function unchanged(
  state: Readonly<CanonicalGameStateV2>,
  runtime: Readonly<CanonicalTinkerRuntimeState>,
): CanonicalTinkerAdvanceResultV2 {
  return Object.freeze({ state, runtime: Object.freeze({ ...runtime }), completions: 0 })
}
