import {
  isFinitePositiveNumber,
  isSafePositiveInteger,
} from '../core/finiteNonNegativeNumber'
import type { StoredTimeAccuracyPreset } from '../game-state/types'

export const STORED_TIME_NOMINAL_STEP_SECONDS = 0.05
export const STORED_TIME_MINIMUM_REMAINING_TICKS = 500

export const STORED_TIME_PRESET_MAXIMUM_TICKS = Object.freeze({
  fast: 5_000,
  balanced: 100_000,
  accurate: 1_000_000,
} as const satisfies Readonly<Record<StoredTimeAccuracyPreset, number>>)

export interface StoredTimePolicyPlan {
  readonly requestedSeconds: number
  readonly preset: StoredTimeAccuracyPreset
  readonly nominalTicks: number
  readonly plannedTicks: number
  readonly initialStepSeconds: number
}

export function planStoredTimePolicy(request: {
  readonly requestedSeconds: number
  readonly preset: StoredTimeAccuracyPreset
}): Readonly<StoredTimePolicyPlan> {
  if (!isFinitePositiveNumber(request.requestedSeconds)) {
    throw new RangeError('Stored Time duration must be finite and positive.')
  }
  const maximumTicks = STORED_TIME_PRESET_MAXIMUM_TICKS[request.preset]
  if (maximumTicks === undefined) {
    throw new RangeError('Stored Time accuracy preset is invalid.')
  }
  const nominalTicks = Math.max(
    1,
    Math.floor(request.requestedSeconds / STORED_TIME_NOMINAL_STEP_SECONDS),
  )
  const plannedTicks = Math.min(nominalTicks, maximumTicks)
  return Object.freeze({
    requestedSeconds: request.requestedSeconds,
    preset: request.preset,
    nominalTicks,
    plannedTicks,
    initialStepSeconds: request.requestedSeconds / plannedTicks,
  })
}

export function speedUpStoredTimeTicks(remainingTicks: number): number {
  if (!isSafePositiveInteger(remainingTicks)) {
    throw new RangeError('Remaining Stored Time ticks must be a positive safe integer.')
  }
  return Math.max(
    STORED_TIME_MINIMUM_REMAINING_TICKS,
    Math.floor(remainingTicks / 2),
  )
}
