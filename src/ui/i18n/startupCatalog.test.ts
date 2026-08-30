import { describe, expect, test, vi } from 'vitest'
import type { SharedMessageCatalog } from './catalogs/types'
import {
  LOCALE_STORAGE_KEY,
  LocalePreferenceService,
  type LocaleStorage,
} from './localePreference'
import { loadStartupCatalog } from './startupCatalog'

const frenchCatalog = Object.freeze({
  greeting: [{ type: 0, value: 'Bonjour' }],
}) as unknown as SharedMessageCatalog
const englishCatalog = Object.freeze({
  greeting: [{ type: 0, value: 'Hello' }],
}) as unknown as SharedMessageCatalog

describe('startup locale catalog loading', () => {
  test('uses the selected locale catalog when it loads successfully', async () => {
    const loadCatalog = vi.fn(async () => frenchCatalog)
    const onDiagnostic = vi.fn()

    await expect(loadStartupCatalog('fr', {
      loadCatalog,
      onDiagnostic,
    })).resolves.toBe(frenchCatalog)
    expect(loadCatalog).toHaveBeenCalledTimes(1)
    expect(loadCatalog).toHaveBeenCalledWith('fr')
    expect(onDiagnostic).not.toHaveBeenCalled()
  })

  test('records selected-locale rejection and uses bundled English', async () => {
    const loadCatalog = vi.fn(async (locale: string) => {
      if (locale === 'fr') throw new Error('chunk unavailable')
      return englishCatalog
    })
    const onDiagnostic = vi.fn()

    await expect(loadStartupCatalog('fr', {
      loadCatalog,
      onDiagnostic,
    })).resolves.toBe(englishCatalog)
    expect(loadCatalog.mock.calls).toEqual([['fr'], ['en']])
    expect(onDiagnostic).toHaveBeenCalledWith({
      code: 'selected-locale-catalog-unavailable',
      locale: 'fr',
    })
  })

  test('preserves the selected preference while falling back to English', async () => {
    const writes: Array<readonly [string, string]> = []
    const storage: LocaleStorage = {
      getItem: (key) => key === LOCALE_STORAGE_KEY ? 'fr' : null,
      setItem: (key, value) => writes.push([key, value]),
    }
    const preference = new LocalePreferenceService({
      storage,
      preferredLocales: ['en-AU'],
    })

    await loadStartupCatalog(preference.getSnapshot().locale, {
      loadCatalog: async (locale) => {
        if (locale === 'fr') throw new Error('chunk unavailable')
        return englishCatalog
      },
    })

    expect(preference.getSnapshot()).toEqual({
      preference: 'fr',
      locale: 'fr',
    })
    expect(writes).toEqual([])
  })

  test('attempts the preserved locale again on the next startup', async () => {
    const storage: LocaleStorage = {
      getItem: () => 'fr',
      setItem: () => undefined,
    }
    const createPreference = () => new LocalePreferenceService({
      storage,
      preferredLocales: ['en-AU'],
    })
    let frenchAttempts = 0
    const loadCatalog = async (locale: string) => {
      if (locale === 'en') return englishCatalog
      frenchAttempts += 1
      if (frenchAttempts === 1) throw new Error('first launch failure')
      return frenchCatalog
    }

    await expect(loadStartupCatalog(
      createPreference().getSnapshot().locale,
      { loadCatalog },
    )).resolves.toBe(englishCatalog)
    await expect(loadStartupCatalog(
      createPreference().getSnapshot().locale,
      { loadCatalog },
    )).resolves.toBe(frenchCatalog)
    expect(frenchAttempts).toBe(2)
    expect(createPreference().getSnapshot().preference).toBe('fr')
  })

  test('does not hide failure of the essential English catalog', async () => {
    const onDiagnostic = vi.fn()
    await expect(loadStartupCatalog('en', {
      loadCatalog: async () => {
        throw new Error('English unavailable')
      },
      onDiagnostic,
    })).rejects.toThrow('English unavailable')
    expect(onDiagnostic).not.toHaveBeenCalled()
  })

  test('propagates an unavailable English fallback after recording selection failure', async () => {
    const onDiagnostic = vi.fn()
    await expect(loadStartupCatalog('fr', {
      loadCatalog: async (locale) => {
        throw new Error(`${locale} unavailable`)
      },
      onDiagnostic,
    })).rejects.toThrow('en unavailable')
    expect(onDiagnostic).toHaveBeenCalledOnce()
  })
})
