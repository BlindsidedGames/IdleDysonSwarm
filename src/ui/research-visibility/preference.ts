export const RESEARCH_VISIBILITY_STORAGE_KEY =
  'idle-dyson-swarm.research-visibility.v1'
export const RESEARCH_VISIBILITY_PREFERENCE_VERSION = 1 as const

interface StoredResearchVisibilityPreference {
  readonly version: typeof RESEARCH_VISIBILITY_PREFERENCE_VERSION
  readonly hideCompleted: boolean
}

export interface ResearchVisibilityStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface ResearchVisibilityPreferenceOptions {
  readonly storage?: ResearchVisibilityStorage | null
}

/** Device-local Research presentation state, never portable gameplay state. */
export class ResearchVisibilityPreferenceService {
  readonly #storage: ResearchVisibilityStorage | null
  readonly #listeners = new Set<() => void>()
  readonly #hadStoredPreference: boolean
  #legacyAdoptionAvailable: boolean
  #hideCompleted: boolean

  constructor(options: ResearchVisibilityPreferenceOptions = {}) {
    this.#storage = 'storage' in options
      ? options.storage ?? null
      : typeof localStorage === 'undefined'
        ? null
        : localStorage
    const stored = this.#readOnce()
    this.#hadStoredPreference = stored !== null
    this.#legacyAdoptionAvailable = stored === null
    // Existing Web installations keep showing completed Research by default.
    this.#hideCompleted = stored?.hideCompleted ?? false
  }

  getSnapshot = (): boolean => this.#hideCompleted

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  setHideCompleted(hideCompleted: boolean): void {
    if (
      typeof hideCompleted !== 'boolean' ||
      hideCompleted === this.#hideCompleted
    ) return
    this.#hideCompleted = hideCompleted
    this.#write()
    this.#publish()
  }

  /** Never overwrites a preference already established on this device. */
  adoptLegacyUnityHidePurchased(value: unknown): boolean {
    if (this.#hadStoredPreference || !this.#legacyAdoptionAvailable) return false
    if (typeof value !== 'boolean') return false
    this.#legacyAdoptionAvailable = false
    this.#hideCompleted = value
    this.#write()
    this.#publish()
    return true
  }

  #readOnce(): StoredResearchVisibilityPreference | null {
    try {
      const text = this.#storage?.getItem(RESEARCH_VISIBILITY_STORAGE_KEY)
      if (text === null || text === undefined) return null
      const parsed = JSON.parse(text) as Partial<StoredResearchVisibilityPreference>
      return parsed.version === RESEARCH_VISIBILITY_PREFERENCE_VERSION &&
        typeof parsed.hideCompleted === 'boolean'
        ? {
            version: RESEARCH_VISIBILITY_PREFERENCE_VERSION,
            hideCompleted: parsed.hideCompleted,
          }
        : null
    } catch {
      return null
    }
  }

  #write(): void {
    try {
      this.#storage?.setItem(
        RESEARCH_VISIBILITY_STORAGE_KEY,
        JSON.stringify({
          version: RESEARCH_VISIBILITY_PREFERENCE_VERSION,
          hideCompleted: this.#hideCompleted,
        } satisfies StoredResearchVisibilityPreference),
      )
    } catch {
      // Optional presentation persistence cannot affect gameplay operation.
    }
  }

  #publish(): void {
    for (const listener of this.#listeners) listener()
  }
}
