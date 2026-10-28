export const BOTTOM_NAVIGATION_TEXT_STORAGE_KEY =
  'idle-dyson-swarm.bottom-navigation-text.v1'
export const LEGACY_BOTTOM_NAVIGATION_SIZE_STORAGE_KEY =
  'idle-dyson-swarm.bottom-navigation-size.v1'
export const BOTTOM_NAVIGATION_TEXT_PREFERENCE_VERSION = 1 as const

interface StoredBottomNavigationTextPreference {
  readonly version: typeof BOTTOM_NAVIGATION_TEXT_PREFERENCE_VERSION
  readonly includeText: boolean
}

interface LegacyBottomNavigationSizePreference {
  readonly version: 1
  readonly size: 'compact' | 'standard' | 'large'
}

export interface BottomNavigationTextStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

export interface BottomNavigationTextPreferenceOptions {
  readonly storage?: BottomNavigationTextStorage | null
}

/** Device-local bottom-bar presentation state, never portable gameplay state. */
export class BottomNavigationTextPreferenceService {
  readonly #storage: BottomNavigationTextStorage | null
  readonly #listeners = new Set<() => void>()
  #includeText: boolean

  constructor(options: BottomNavigationTextPreferenceOptions = {}) {
    this.#storage = 'storage' in options
      ? options.storage ?? null
      : typeof localStorage === 'undefined'
        ? null
        : localStorage
    const stored = this.#readCurrent()
    if (stored !== null) {
      this.#includeText = stored.includeText
      return
    }
    const migrated = this.#readLegacy()
    this.#includeText = migrated ?? false
    if (migrated !== null) this.#write()
  }

  getSnapshot = (): boolean => this.#includeText

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  setIncludeText(includeText: boolean): void {
    if (typeof includeText !== 'boolean' || includeText === this.#includeText) {
      return
    }
    this.#includeText = includeText
    this.#write()
    for (const listener of this.#listeners) listener()
  }

  #readCurrent(): StoredBottomNavigationTextPreference | null {
    try {
      const text = this.#storage?.getItem(BOTTOM_NAVIGATION_TEXT_STORAGE_KEY)
      if (text === null || text === undefined) return null
      const parsed = JSON.parse(text) as Partial<StoredBottomNavigationTextPreference>
      return parsed.version === BOTTOM_NAVIGATION_TEXT_PREFERENCE_VERSION &&
        typeof parsed.includeText === 'boolean'
        ? {
            version: BOTTOM_NAVIGATION_TEXT_PREFERENCE_VERSION,
            includeText: parsed.includeText,
          }
        : null
    } catch {
      return null
    }
  }

  #readLegacy(): boolean | null {
    try {
      const text = this.#storage?.getItem(
        LEGACY_BOTTOM_NAVIGATION_SIZE_STORAGE_KEY,
      )
      if (text === null || text === undefined) return null
      const parsed = JSON.parse(text) as Partial<LegacyBottomNavigationSizePreference>
      if (parsed.version !== 1) return null
      if (parsed.size === 'large') return true
      if (parsed.size === 'compact' || parsed.size === 'standard') return false
      return null
    } catch {
      return null
    }
  }

  #write(): void {
    try {
      this.#storage?.setItem(
        BOTTOM_NAVIGATION_TEXT_STORAGE_KEY,
        JSON.stringify({
          version: BOTTOM_NAVIGATION_TEXT_PREFERENCE_VERSION,
          includeText: this.#includeText,
        } satisfies StoredBottomNavigationTextPreference),
      )
    } catch {
      // Optional presentation persistence cannot affect gameplay operation.
    }
  }
}
