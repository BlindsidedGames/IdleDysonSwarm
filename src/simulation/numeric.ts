export const CONTINUOUS_MAXIMUM = Number.MAX_VALUE
export const DISCRETE_MAXIMUM = 9_223_372_036_854_775_807n

export function clampContinuous(value: number): number {
  if (value === Number.POSITIVE_INFINITY) return CONTINUOUS_MAXIMUM
  return Number.isFinite(value) && value >= 0 ? value : 0
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
  if (!Number.isFinite(value) || value <= 0) return 0n
  if (value >= Number(DISCRETE_MAXIMUM)) return DISCRETE_MAXIMUM
  return BigInt(Math.floor(value))
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
  if (left < 0n || right < 0n) return 0n
  if (left > DISCRETE_MAXIMUM - right) return DISCRETE_MAXIMUM
  return left + right
}
