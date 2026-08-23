import {
  DEFAULT_BOTTOM_NAVIGATION_SIZE,
  isBottomNavigationSize,
  type BottomNavigationSize,
} from '../../game-state/navigationPreferences'

export const BOTTOM_NAVIGATION_SIZE_STORAGE_KEY =
  'idle-dyson-swarm.bottom-navigation-size.v1'
export const BOTTOM_NAVIGATION_SIZE_PREFERENCE_VERSION = 1 as const

interface StoredBottomNavigationSizePreference {
  readonly version: typeof BOTTOM_NAVIGATION_SIZE_PREFERENCE_VERSION
  readonly size: BottomNavigationSize
}

export interface BottomNavigationSizeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface BottomNavigationSizePreferenceOptions {
  readonly storage?: BottomNavigationSizeStorage | null
}

/** Device-local bottom-bar presentation state, never portable gameplay state. */
export class BottomNavigationSizePreferenceService {
  readonly #storage: BottomNavigationSizeStorage | null
  readonly #listeners = new Set<() => void>()
  #size: BottomNavigationSize

  constructor(options: BottomNavigationSizePreferenceOptions = {}) {
    this.#storage = 'storage' in options
      ? options.storage ?? null
      : typeof localStorage === 'undefined'
        ? null
        : localStorage
    this.#size = this.#readOnce()?.size ?? DEFAULT_BOTTOM_NAVIGATION_SIZE
  }

  getSnapshot = (): BottomNavigationSize => this.#size

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  setSize(requested: BottomNavigationSize): void {
    if (!isBottomNavigationSize(requested) || requested === this.#size) return
    this.#size = requested
    this.#write()
    for (const listener of this.#listeners) listener()
  }

  #readOnce(): StoredBottomNavigationSizePreference | null {
    try {
      const text = this.#storage?.getItem(BOTTOM_NAVIGATION_SIZE_STORAGE_KEY)
      if (text === null || text === undefined) return null
      const parsed = JSON.parse(text) as Partial<StoredBottomNavigationSizePreference>
      return parsed.version === BOTTOM_NAVIGATION_SIZE_PREFERENCE_VERSION &&
        isBottomNavigationSize(parsed.size)
        ? {
            version: BOTTOM_NAVIGATION_SIZE_PREFERENCE_VERSION,
            size: parsed.size,
          }
        : null
    } catch {
      return null
    }
  }

  #write(): void {
    try {
      this.#storage?.setItem(
        BOTTOM_NAVIGATION_SIZE_STORAGE_KEY,
        JSON.stringify({
          version: BOTTOM_NAVIGATION_SIZE_PREFERENCE_VERSION,
          size: this.#size,
        } satisfies StoredBottomNavigationSizePreference),
      )
    } catch {
      // Optional presentation persistence cannot affect gameplay operation.
    }
  }
}
