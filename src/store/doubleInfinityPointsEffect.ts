export const DOUBLE_INFINITY_POINTS_EFFECT_STORAGE_KEY =
  'idle-dyson-swarm.double-infinity-points-effect.v1'
export const DOUBLE_INFINITY_POINTS_EFFECT_PREFERENCE_VERSION = 1 as const

interface StoredDoubleInfinityPointsEffectPreference {
  readonly version: typeof DOUBLE_INFINITY_POINTS_EFFECT_PREFERENCE_VERSION
  readonly enabled: boolean
}

export interface DoubleInfinityPointsEffectStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface DoubleInfinityPointsEffectPreference {
  getSnapshot(): boolean
  setEnabled(enabled: boolean): void
}

export interface DoubleInfinityPointsEffectPreferenceOptions {
  readonly storage?: DoubleInfinityPointsEffectStorage | null
}

/**
 * Device-local use preference for an independently host-owned entitlement.
 * Missing or invalid state deliberately defaults on so existing owners keep
 * their historical doubled rewards until they explicitly disable the effect.
 */
export class DoubleInfinityPointsEffectPreferenceService
implements DoubleInfinityPointsEffectPreference {
  readonly #storage: DoubleInfinityPointsEffectStorage | null
  #enabled: boolean

  constructor(options: DoubleInfinityPointsEffectPreferenceOptions = {}) {
    this.#storage = 'storage' in options
      ? options.storage ?? null
      : typeof localStorage === 'undefined'
        ? null
        : localStorage
    this.#enabled = this.#readOnce()?.enabled ?? true
  }

  getSnapshot = (): boolean => this.#enabled

  setEnabled(enabled: boolean): void {
    if (typeof enabled !== 'boolean' || enabled === this.#enabled) return
    this.#enabled = enabled
    this.#write()
  }

  #readOnce(): StoredDoubleInfinityPointsEffectPreference | null {
    try {
      const text = this.#storage?.getItem(
        DOUBLE_INFINITY_POINTS_EFFECT_STORAGE_KEY,
      )
      if (text === null || text === undefined) return null
      const parsed = JSON.parse(text) as
        Partial<StoredDoubleInfinityPointsEffectPreference>
      return parsed.version ===
        DOUBLE_INFINITY_POINTS_EFFECT_PREFERENCE_VERSION &&
        typeof parsed.enabled === 'boolean'
        ? {
            version: DOUBLE_INFINITY_POINTS_EFFECT_PREFERENCE_VERSION,
            enabled: parsed.enabled,
          }
        : null
    } catch {
      return null
    }
  }

  #write(): void {
    try {
      this.#storage?.setItem(
        DOUBLE_INFINITY_POINTS_EFFECT_STORAGE_KEY,
        JSON.stringify({
          version: DOUBLE_INFINITY_POINTS_EFFECT_PREFERENCE_VERSION,
          enabled: this.#enabled,
        } satisfies StoredDoubleInfinityPointsEffectPreference),
      )
    } catch {
      // Ownership and gameplay remain usable when optional device storage is
      // unavailable; the active session still keeps the player's selection.
    }
  }
}
