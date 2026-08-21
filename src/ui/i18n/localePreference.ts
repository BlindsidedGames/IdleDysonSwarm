import {
  LOCALE_REGISTRY,
  resolveLocale,
  resolvePreferredLocale,
  type EnabledLocale,
} from './localeRegistry'

export const LOCALE_STORAGE_KEY = 'idle-dyson-swarm.presentation-locale'

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
}

export class LocalePreferenceService {
  readonly #document: LocaleDocument | undefined
  readonly #storage: LocaleStorage | null
  readonly #listeners = new Set<() => void>()
  #locale: EnabledLocale

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
    const persisted = this.#readPersisted()
    this.#locale = persisted
      ? resolveLocale(persisted)
      : resolvePreferredLocale(
          options.preferredLocales ??
            (typeof navigator === 'undefined'
              ? []
              : navigator.languages),
        )
    this.#applyDocumentLocale()
  }

  getSnapshot = (): EnabledLocale => this.#locale

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  setLocale(requested: string): EnabledLocale {
    const next = resolveLocale(requested)
    if (next === this.#locale) return next
    this.#locale = next
    this.#applyDocumentLocale()
    this.#writePersisted(next)
    for (const listener of this.#listeners) listener()
    return next
  }

  #applyDocumentLocale(): void {
    if (!this.#document) return
    const definition = LOCALE_REGISTRY[this.#locale]
    const root = this.#document.documentElement
    root.lang = definition.languageTag
    root.dir = definition.direction
    root.dataset.locale = definition.id
    root.dataset.localeFont = definition.fontFamily
  }

  #readPersisted(): string | null {
    try {
      return this.#storage?.getItem(LOCALE_STORAGE_KEY) ?? null
    } catch {
      return null
    }
  }

  #writePersisted(locale: EnabledLocale): void {
    try {
      this.#storage?.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      // Presentation preference persistence is best effort. A storage failure
      // must not affect gameplay state or prevent changing the active locale.
    }
  }
}
