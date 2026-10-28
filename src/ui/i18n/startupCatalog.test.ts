// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { createElement, Fragment } from 'react'
import { useIntl } from 'react-intl'
import { describe, expect, test, vi } from 'vitest'
import type { SharedMessageCatalog } from './catalogs/types'
import {
  LOCALE_STORAGE_KEY,
  LocalePreferenceService,
  type LocaleStorage,
} from './localePreference'
import { loadStartupCatalog } from './startupCatalog'
import { LocalePreferenceProvider } from './LocalePreferenceProvider'
import { useLocalePreference } from './localeContext'

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
    })).resolves.toEqual({ locale: 'fr', messages: frenchCatalog })
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
    })).resolves.toEqual({ locale: 'en', messages: englishCatalog })
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

    const startupCatalog = await loadStartupCatalog(
      preference.getSnapshot().locale,
      {
      loadCatalog: async (locale) => {
        if (locale === 'fr') throw new Error('chunk unavailable')
        return englishCatalog
      },
      },
    )
    preference.applyEffectiveLocale(startupCatalog.locale)

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
    )).resolves.toEqual({ locale: 'en', messages: englishCatalog })
    await expect(loadStartupCatalog(
      createPreference().getSnapshot().locale,
      { loadCatalog },
    )).resolves.toEqual({ locale: 'fr', messages: frenchCatalog })
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

  test('uses effective English identity after a failed RTL catalog', async () => {
    const writes: Array<readonly [string, string]> = []
    const preference = new LocalePreferenceService({
      document,
      storage: {
        getItem: () => 'ar-XB',
        setItem: (key, value) => writes.push([key, value]),
      },
      preferredLocales: ['ar'],
    })
    const startupCatalog = await loadStartupCatalog('ar-XB', {
      loadCatalog: async (locale) => {
        if (locale === 'ar-XB') throw new Error('RTL chunk unavailable')
        return englishCatalog
      },
    })
    preference.applyEffectiveLocale(startupCatalog.locale)

    render(createElement(
      LocalePreferenceProvider,
      {
        preference,
        initialLocale: startupCatalog.locale,
        initialMessages: startupCatalog.messages,
      },
      createElement(EffectiveLocaleProbe),
    ))

    expect(screen.getByTestId('effective-locale').textContent).toBe('en')
    expect(screen.getByTestId('selected-preference').textContent).toBe('ar-XB')
    expect(screen.getByTestId('intl-locale').textContent).toBe('en')
    expect(screen.getByTestId('formatted-number').textContent).toBe('1,234.5')
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')
    expect(document.documentElement.dataset.locale).toBe('en')
    expect(writes).toEqual([])
  })
})

function EffectiveLocaleProbe() {
  const locale = useLocalePreference()
  const intl = useIntl()
  return createElement(
    Fragment,
    null,
    createElement('span', { 'data-testid': 'effective-locale' }, locale.locale),
    createElement(
      'span',
      { 'data-testid': 'selected-preference' },
      locale.preference,
    ),
    createElement('span', { 'data-testid': 'intl-locale' }, intl.locale),
    createElement(
      'span',
      { 'data-testid': 'formatted-number' },
      intl.formatNumber(1234.5),
    ),
  )
}
