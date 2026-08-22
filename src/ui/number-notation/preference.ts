import {
  DEFAULT_NUMBER_NOTATION,
  isNumberNotationMode,
  numberNotationFromLegacyUnity,
  setActiveNumberNotation,
  type NumberNotationMode,
} from './contracts'

export const NUMBER_NOTATION_STORAGE_KEY =
  'idle-dyson-swarm.number-notation.v1'
export const NUMBER_NOTATION_PREFERENCE_VERSION = 1 as const

interface StoredNumberNotationPreference {
  readonly version: typeof NUMBER_NOTATION_PREFERENCE_VERSION
  readonly mode: NumberNotationMode
}

export interface NumberNotationStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface NumberNotationPreferenceOptions {
  readonly storage?: NumberNotationStorage | null
}

/**
 * Device-local presentation state. Storage is read exactly once at
 * construction and written only for an explicit selection or a trusted,
 * one-time same-device Unity adoption.
 */
export class NumberNotationPreferenceService {
  readonly #storage: NumberNotationStorage | null
  readonly #listeners = new Set<() => void>()
  readonly #hadStoredPreference: boolean
  #legacyAdoptionAvailable: boolean
  #mode: NumberNotationMode

  constructor(options: NumberNotationPreferenceOptions = {}) {
    this.#storage = 'storage' in options
      ? options.storage ?? null
      : typeof localStorage === 'undefined'
        ? null
        : localStorage
    const stored = this.#readOnce()
    this.#hadStoredPreference = stored !== null
    this.#legacyAdoptionAvailable = stored === null
    this.#mode = stored?.mode ?? DEFAULT_NUMBER_NOTATION
    setActiveNumberNotation(this.#mode)
  }

  getSnapshot = (): NumberNotationMode => this.#mode

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  setMode(requested: NumberNotationMode): void {
    if (!isNumberNotationMode(requested) || requested === this.#mode) return
    this.#mode = requested
    setActiveNumberNotation(requested)
    this.#write()
    this.#publish()
  }

  /** Never overwrites a preference already established on this device. */
  adoptLegacyUnityNumberFormatting(value: unknown): boolean {
    if (this.#hadStoredPreference || !this.#legacyAdoptionAvailable) return false
    const adopted = numberNotationFromLegacyUnity(value)
    if (adopted === null) return false
    this.#legacyAdoptionAvailable = false
    this.#mode = adopted
    setActiveNumberNotation(adopted)
    this.#write()
    this.#publish()
    return true
  }

  #readOnce(): StoredNumberNotationPreference | null {
    try {
      const text = this.#storage?.getItem(NUMBER_NOTATION_STORAGE_KEY)
      if (text === null || text === undefined) return null
      const parsed = JSON.parse(text) as Partial<StoredNumberNotationPreference>
      return parsed.version === NUMBER_NOTATION_PREFERENCE_VERSION &&
        isNumberNotationMode(parsed.mode)
        ? { version: NUMBER_NOTATION_PREFERENCE_VERSION, mode: parsed.mode }
        : null
    } catch {
      return null
    }
  }

  #write(): void {
    try {
      this.#storage?.setItem(
        NUMBER_NOTATION_STORAGE_KEY,
        JSON.stringify({
          version: NUMBER_NOTATION_PREFERENCE_VERSION,
          mode: this.#mode,
        } satisfies StoredNumberNotationPreference),
      )
    } catch {
      // Optional presentation persistence cannot affect gameplay operation.
    }
  }

  #publish(): void {
    for (const listener of this.#listeners) listener()
  }
}
