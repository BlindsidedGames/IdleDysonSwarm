/** Narrows any non-null, non-array object to its string-keyed view. */
export function isNonArrayRecord(
  value: unknown,
): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
