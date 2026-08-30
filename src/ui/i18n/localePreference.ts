import {
  LOCALE_REGISTRY,
  isEnabledLocale,
  resolvePreferredLocale,
  type EnabledLocale,
} from './localeRegistry'

export const LOCALE_STORAGE_KEY = 'idle-dyson-swarm.presentation-locale'
export const SYSTEM_LOCALE_PREFERENCE = 'system'

export type LocalePreference =
  | typeof SYSTEM_LOCALE_PREFERENCE
  | EnabledLocale

export interface LocalePreferenceSnapshot {
  readonly preference: LocalePreference
  readonly locale: EnabledLocale
}

export interface LocaleStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface LocaleDocument {
  readonly documentElement: {
    lang: string
    dir: string
    readonly dataset: DOMStringMap
  }
}

export interface LocalePreferenceOptions {
  readonly document?: LocaleDocument
  readonly storage?: LocaleStorage | null
  readonly preferredLocales?: readonly string[]
  readonly readPreferredLocales?: () => readonly string[]
}

export class LocalePreferenceService {
  readonly #document: LocaleDocument | undefined
  readonly #storage: LocaleStorage | null
  readonly #readPreferredLocales: () => readonly string[]
  readonly #listeners = new Set<() => void>()
  #snapshot: LocalePreferenceSnapshot

  constructor(options: LocalePreferenceOptions = {}) {
    this.#document =
      options.document ??
      (typeof document === 'undefined' ? undefined : document)
    this.#storage =
      'storage' in options
        ? options.storage ?? null
        : typeof localStorage === 'undefined'
          ? null
          : localStorage
    this.#readPreferredLocales =
      options.readPreferredLocales ??
      (options.preferredLocales === undefined
        ? () =>
            typeof navigator === 'undefined'
              ? []
              : navigator.languages
        : () => options.preferredLocales ?? [])
    const preference = this.#readPersisted()
    this.#snapshot = Object.freeze({
      preference,
      locale: this.#resolvePreference(preference),
    })
    this.#applyDocumentLocale()
  }

  getSnapshot = (): LocalePreferenceSnapshot => this.#snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  setPreference(requested: LocalePreference): EnabledLocale {
    const preference = this.#normalizePreference(requested)
    const locale = this.#resolvePreference(preference)
    if (
      preference === this.#snapshot.preference &&
      locale === this.#snapshot.locale
    ) {
      return locale
    }
    this.#snapshot = Object.freeze({ preference, locale })
    this.#applyDocumentLocale()
    this.#writePersisted(preference)
    this.#notify()
    return locale
  }

  /** Retained for callers that explicitly choose a locale. */
  setLocale(requested: string): EnabledLocale {
    return this.setPreference(
      isEnabledLocale(requested) ? requested : 'en',
    )
  }

  refreshPreferredLocales(): EnabledLocale {
    if (this.#snapshot.preference !== SYSTEM_LOCALE_PREFERENCE) {
      return this.#snapshot.locale
    }
    const locale = resolvePreferredLocale(this.#readPreferredLocales())
    if (locale === this.#snapshot.locale) return locale
    this.#snapshot = Object.freeze({
      preference: SYSTEM_LOCALE_PREFERENCE,
      locale,
    })
    this.#applyDocumentLocale()
    this.#notify()
    return locale
  }

  /** Applies a loaded catalog's identity without changing saved preference. */
  applyEffectiveLocale(locale: EnabledLocale): void {
    this.#applyDocumentLocale(locale)
  }

  #resolvePreference(preference: LocalePreference): EnabledLocale {
    return preference === SYSTEM_LOCALE_PREFERENCE
      ? resolvePreferredLocale(this.#readPreferredLocales())
      : preference
  }

  #normalizePreference(value: string): LocalePreference {
    if (value === SYSTEM_LOCALE_PREFERENCE) return value
    return isEnabledLocale(value) ? value : SYSTEM_LOCALE_PREFERENCE
  }

  #applyDocumentLocale(locale = this.#snapshot.locale): void {
    if (!this.#document) return
    const definition = LOCALE_REGISTRY[locale]
    const root = this.#document.documentElement
    root.lang = definition.languageTag
    root.dir = definition.direction
    root.dataset.locale = definition.id
    root.dataset.localeFont = definition.fontFamily
  }

  #readPersisted(): LocalePreference {
    try {
      return this.#normalizePreference(
        this.#storage?.getItem(LOCALE_STORAGE_KEY) ??
          SYSTEM_LOCALE_PREFERENCE,
      )
    } catch {
      return SYSTEM_LOCALE_PREFERENCE
    }
  }

  #writePersisted(preference: LocalePreference): void {
    try {
      this.#storage?.setItem(LOCALE_STORAGE_KEY, preference)
    } catch {
      // Presentation preference persistence is best effort. A storage failure
      // must not affect gameplay state or prevent changing the active locale.
    }
  }

  #notify(): void {
    for (const listener of this.#listeners) listener()
  }
}
