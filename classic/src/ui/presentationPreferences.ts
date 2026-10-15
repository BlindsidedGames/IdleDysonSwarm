export function readPresentationPreference(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writePresentationPreference(
  key: string,
  value: string,
): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Device-local presentation persistence must never block gameplay.
  }
}

export function readBooleanPresentationPreference(key: string): boolean {
  return readPresentationPreference(key) === 'true'
}

export function writeBooleanPresentationPreference(
  key: string,
  value: boolean,
): void {
  writePresentationPreference(key, String(value))
}
