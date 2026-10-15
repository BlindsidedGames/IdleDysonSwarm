const DISCLOSURE_STORAGE_VERSION = 1
const DISCLOSURE_STORAGE_PREFIX =
  `idle-dyson-swarm.ui.disclosure.v${DISCLOSURE_STORAGE_VERSION}:`

interface StoredDisclosurePreference {
  readonly version: typeof DISCLOSURE_STORAGE_VERSION
  readonly expanded: boolean
}

export function disclosurePreferenceKey(storageKey: string): string {
  return `${DISCLOSURE_STORAGE_PREFIX}${storageKey}`
}

export function readDisclosurePreference(
  preferenceKey: string,
  fallback: boolean,
): boolean {
  try {
    if (typeof localStorage === 'undefined') return fallback
    const stored = localStorage.getItem(preferenceKey)
    if (stored === null) return fallback
    const parsed = JSON.parse(stored) as Partial<StoredDisclosurePreference>
    return parsed.version === DISCLOSURE_STORAGE_VERSION &&
      typeof parsed.expanded === 'boolean'
      ? parsed.expanded
      : fallback
  } catch {
    return fallback
  }
}

export function writeDisclosurePreference(
  preferenceKey: string,
  expanded: boolean,
): void {
  try {
    if (typeof localStorage === 'undefined') return
    const preference: StoredDisclosurePreference = {
      version: DISCLOSURE_STORAGE_VERSION,
      expanded,
    }
    localStorage.setItem(preferenceKey, JSON.stringify(preference))
  } catch {
    // Storage can be unavailable or quota-limited; local state still works.
  }
}
