/** Narrows values to finite numbers greater than or equal to zero. */
export function isFiniteNonNegativeNumber(
  value: unknown,
): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}
