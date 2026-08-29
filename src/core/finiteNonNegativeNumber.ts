/** Narrows values to finite numbers greater than or equal to zero. */
export function isFiniteNonNegativeNumber(
  value: unknown,
): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Narrows values to finite numbers greater than zero. */
export function isFinitePositiveNumber(value: unknown): value is number {
  return isFiniteNonNegativeNumber(value) && value > 0
}

/** Narrows values to integer numbers greater than or equal to zero. */
export function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

/** Narrows values to safe integers greater than or equal to zero. */
export function isSafeNonNegativeInteger(
  value: unknown,
): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** Narrows values to safe integers greater than zero. */
export function isSafePositiveInteger(value: unknown): value is number {
  return isSafeNonNegativeInteger(value) && value > 0
}
