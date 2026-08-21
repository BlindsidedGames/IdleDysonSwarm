// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import {
  LOCALE_STORAGE_KEY,
  LocalePreferenceService,
  type LocaleStorage,
} from './localePreference'
import {
  resolveLocale,
  resolvePreferredLocale,
} from './localeRegistry'

describe('locale resolution', () => {
  it('falls back unavailable and malformed locales to English', () => {
    expect(resolveLocale('en-AU')).toBe('en')
    expect(resolveLocale('fr-FR')).toBe('en')
    expect(resolveLocale('not_a_locale')).toBe('en')
    expect(resolveLocale(null)).toBe('en')
  })

  it('preserves exact enabled pseudo-locales from browser preferences', () => {
    expect(resolvePreferredLocale(['fr-FR', 'ar-XB'])).toBe('ar-XB')
    expect(resolvePreferredLocale(['en-AU', 'fr-FR'])).toBe('en')
  })
})

describe('LocalePreferenceService', () => {
  it('updates document language and direction without invoking gameplay code', () => {
    const storage = memoryStorage()
    const service = new LocalePreferenceService({
      document,
      storage,
      preferredLocales: ['en-AU'],
    })
    const listener = vi.fn()
    const unsubscribe = service.subscribe(listener)

    expect(document.documentElement).toMatchObject({
      lang: 'en',
      dir: 'ltr',
    })
    expect(service.setLocale('ar-XB')).toBe('ar-XB')
    expect(document.documentElement).toMatchObject({
      lang: 'ar-XB',
      dir: 'rtl',
    })
    expect(document.documentElement.dataset.localeFont).toBe('latin')
    expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe('ar-XB')
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    service.setLocale('en-XA')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('uses a persisted enabled locale and tolerates storage failure', () => {
    const storage: LocaleStorage = {
      getItem: () => 'en-XA',
      setItem: () => {
        throw new Error('quota')
      },
    }
    const service = new LocalePreferenceService({
      document,
      storage,
      preferredLocales: ['ar-XB'],
    })
    expect(service.getSnapshot()).toBe('en-XA')
    expect(() => service.setLocale('ar-XB')).not.toThrow()
    expect(document.documentElement.dir).toBe('rtl')
  })
})

function memoryStorage(): LocaleStorage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}
