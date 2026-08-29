/** Reads Unity-authored booleans, including their numeric 0/1 encoding. */
export function readUnityBoolean(value: unknown): boolean | undefined {
  if (value === true || value === 1) return true
  if (value === false || value === 0) return false
  return undefined
}

/** Returns an authored string array without cloning when every entry is valid. */
export function readStringArray(
  value: unknown,
): readonly string[] | undefined {
  return Array.isArray(value) &&
    value.every((entry) => typeof entry === 'string')
    ? value
    : undefined
}
