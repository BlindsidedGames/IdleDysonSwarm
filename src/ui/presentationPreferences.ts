export function readBooleanPresentationPreference(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

export function writeBooleanPresentationPreference(
  key: string,
  value: boolean,
): void {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // Device-local presentation persistence must never block gameplay.
  }
}
