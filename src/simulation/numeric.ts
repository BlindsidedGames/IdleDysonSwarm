import {
  isFiniteNonNegativeNumber,
  isFinitePositiveNumber,
} from '../core/finiteNonNegativeNumber'

export const CONTINUOUS_MAXIMUM = Number.MAX_VALUE
export const DISCRETE_MAXIMUM = 9_223_372_036_854_775_807n
export const SIMULATION_RESOURCE_MAXIMUM = BigInt(CONTINUOUS_MAXIMUM)
const DISCRETE_DOUBLE_UPPER_EXCLUSIVE = 9_223_372_036_854_776_000

export function isDiscreteResource(value: unknown): value is bigint {
  return (
    typeof value === 'bigint' &&
    value >= 0n &&
    value <= DISCRETE_MAXIMUM
  )
}

export function isSimulationResource(value: unknown): value is bigint {
  return (
    typeof value === 'bigint' &&
    value >= 0n &&
    value <= SIMULATION_RESOURCE_MAXIMUM
  )
}

export function clampContinuous(value: number): number {
  if (value === Number.POSITIVE_INFINITY) return CONTINUOUS_MAXIMUM
  return isFiniteNonNegativeNumber(value) ? value : 0
}

export function addContinuous(left: number, right: number): number {
  if (
    !Number.isFinite(left) ||
    !Number.isFinite(right) ||
    left < 0 ||
    right < 0
  ) {
    return 0
  }
  const result = left + right
  return result === Number.POSITIVE_INFINITY
    ? CONTINUOUS_MAXIMUM
    : clampContinuous(result)
}

export function multiplyContinuous(left: number, right: number): number {
  if (
    !Number.isFinite(left) ||
    !Number.isFinite(right) ||
    left < 0 ||
    right < 0
  ) {
    return 0
  }
  if (left === 0 || right === 0) return 0
  const result = left * right
  return result === Number.POSITIVE_INFINITY
    ? CONTINUOUS_MAXIMUM
    : clampContinuous(result)
}

export function divideContinuous(
  numerator: number,
  denominator: number,
): number {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    numerator < 0 ||
    denominator <= 0
  ) {
    return 0
  }
  const result = numerator / denominator
  return result === Number.POSITIVE_INFINITY
    ? CONTINUOUS_MAXIMUM
    : clampContinuous(result)
}

export function powerContinuous(value: number, exponent: number): number {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(exponent) ||
    value < 0 ||
    (value === 0 && exponent < 0)
  ) {
    return 0
  }
  const result = Math.pow(value, exponent)
  return result === Number.POSITIVE_INFINITY
    ? CONTINUOUS_MAXIMUM
    : clampContinuous(result)
}

export function floorToDiscrete(value: number): bigint {
  return floorToDiscreteAtMost(value, DISCRETE_MAXIMUM)
}

export function floorToDiscreteAtMost(
  value: number,
  maximum: bigint,
): bigint {
  if (!isFinitePositiveNumber(value)) return 0n
  if (maximum < 0n) return 0n
  if (value >= Number(maximum)) return maximum
  return BigInt(Math.floor(value))
}

/** Converts a non-negative double using Unity-compatible midpoint-to-even rounding. */
export function exactRoundedNonNegativeBigInt(value: number): bigint | null {
  if (!Number.isFinite(value) || value < 0) return null
  const rounded = roundToEven(value)
  if (
    !Number.isInteger(rounded) ||
    rounded < 0 ||
    rounded >= DISCRETE_DOUBLE_UPPER_EXCLUSIVE
  ) {
    return null
  }
  const converted = BigInt(rounded)
  return converted <= DISCRETE_MAXIMUM ? converted : null
}

function roundToEven(value: number): number {
  const floor = Math.floor(value)
  const fraction = value - floor
  if (fraction < 0.5) return floor
  if (fraction > 0.5) return floor + 1
  return floor % 2 === 0 ? floor : floor + 1
}

export function bitDecrement(value: number): number {
  if (Number.isNaN(value) || value === Number.NEGATIVE_INFINITY) return value
  if (value === 0) return -Number.MIN_VALUE

  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, value, false)
  let bits = view.getBigUint64(0, false)
  bits += value > 0 ? -1n : 1n
  view.setBigUint64(0, bits, false)
  return view.getFloat64(0, false)
}

export function bitIncrement(value: number): number {
  if (Number.isNaN(value) || value === Number.POSITIVE_INFINITY) return value
  if (value === 0) return Number.MIN_VALUE

  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, value, false)
  let bits = view.getBigUint64(0, false)
  bits += value > 0 ? 1n : -1n
  view.setBigUint64(0, bits, false)
  return view.getFloat64(0, false)
}

export function addDiscrete(left: bigint, right: bigint): bigint {
  return addDiscreteAtMost(left, right, DISCRETE_MAXIMUM)
}

export function addDiscreteAtMost(
  left: bigint,
  right: bigint,
  maximum: bigint,
): bigint {
  if (left < 0n || right < 0n) return 0n
  if (maximum < 0n) return 0n
  if (left > maximum || right > maximum) return maximum
  if (left > maximum - right) return maximum
  return left + right
}
