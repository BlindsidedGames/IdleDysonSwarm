import { getPresentationStorage } from '../../../src/ui/presentationStorage'
export function readPresentationPreference(key: string): string | null {
  try {
    return getPresentationStorage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writePresentationPreference(
  key: string,
  value: string,
): void {
  try {
    getPresentationStorage()?.setItem(key, value)
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
