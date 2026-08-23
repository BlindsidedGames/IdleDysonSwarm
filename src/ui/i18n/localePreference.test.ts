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
    expect(resolveLocale('fr-FR')).toBe('fr')
    expect(resolveLocale('de-AT')).toBe('de')
    expect(resolveLocale('es-MX')).toBe('es-419')
    expect(resolveLocale('pt-PT')).toBe('pt-BR')
    expect(resolveLocale('zh-Hans-SG')).toBe('zh-CN')
    expect(resolveLocale('zh-Hant-TW')).toBe('en')
    expect(resolveLocale('ru-KZ')).toBe('ru')
    expect(resolveLocale('ja-JP')).toBe('ja')
    expect(resolveLocale('not_a_locale')).toBe('en')
    expect(resolveLocale(null)).toBe('en')
  })

  it('honours ordered exact and regional browser preferences', () => {
    expect(resolvePreferredLocale(['fr-FR', 'ar-XB'])).toBe('fr')
    expect(resolvePreferredLocale(['fr-CA', 'de'])).toBe('fr')
    expect(resolvePreferredLocale(['en-AU', 'fr-FR'])).toBe('en')
    expect(resolvePreferredLocale(['zh-Hant-TW', 'ja-JP'])).toBe('ja')
    expect(resolvePreferredLocale(['es-AR', 'pt-BR'])).toBe('es-419')
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
    expect(service.getSnapshot()).toMatchObject({
      preference: 'system',
      locale: 'en',
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
    expect(service.getSnapshot()).toEqual({
      preference: 'en-XA',
      locale: 'en-XA',
    })
    expect(() => service.setLocale('ar-XB')).not.toThrow()
    expect(document.documentElement.dir).toBe('rtl')
  })

  it('applies the Simplified Chinese language tag and CJK font routing', () => {
    const service = new LocalePreferenceService({
      document,
      storage: null,
      preferredLocales: ['zh-Hans-CN'],
    })

    expect(service.getSnapshot()).toEqual({
      preference: 'system',
      locale: 'zh-CN',
    })
    expect(document.documentElement).toMatchObject({
      lang: 'zh-Hans',
      dir: 'ltr',
    })
    expect(document.documentElement.dataset.locale).toBe('zh-CN')
    expect(document.documentElement.dataset.localeFont).toBe('cjk')
  })

  it('follows changing device preferences only while system mode is active', () => {
    let preferredLocales: readonly string[] = ['en-AU']
    const storage = memoryStorage()
    const service = new LocalePreferenceService({
      document,
      storage,
      readPreferredLocales: () => preferredLocales,
    })
    const listener = vi.fn()
    service.subscribe(listener)

    preferredLocales = ['fr-FR', 'de-DE']
    expect(service.refreshPreferredLocales()).toBe('fr')
    expect(service.getSnapshot()).toEqual({
      preference: 'system',
      locale: 'fr',
    })

    service.setPreference('de')
    preferredLocales = ['fr-FR']
    expect(service.refreshPreferredLocales()).toBe('de')
    expect(service.getSnapshot().preference).toBe('de')
    expect(listener).toHaveBeenCalledTimes(2)

    service.setPreference('system')
    expect(service.getSnapshot()).toEqual({
      preference: 'system',
      locale: 'fr',
    })
    expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe('system')
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
