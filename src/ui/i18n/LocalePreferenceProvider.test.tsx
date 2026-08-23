// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { useIntl } from 'react-intl'
import { afterEach, describe, expect, it } from 'vitest'
import enCatalog from './catalogs/compiled/en.json'
import { LocalePreferenceProvider } from './LocalePreferenceProvider'
import { LocalePreferenceService } from './localePreference'
import { ReactiveStartupErrorBoundary } from '../shell/ReactiveStartupErrorBoundary'

afterEach(cleanup)

describe('LocalePreferenceProvider', () => {
  it('reloads presentation messages when system language preferences change', async () => {
    let preferredLocales: readonly string[] = ['en-AU']
    const preference = new LocalePreferenceService({
      document,
      storage: null,
      readPreferredLocales: () => preferredLocales,
    })
    render(
      <LocalePreferenceProvider
        preference={preference}
        initialMessages={enCatalog}
      >
        <LocaleProbe />
      </LocalePreferenceProvider>,
    )
    expect(screen.getByTestId('locale')).toHaveTextContent('en')

    preferredLocales = ['fr-CA', 'de-DE']
    window.dispatchEvent(new Event('languagechange'))

    await waitFor(() => {
      expect(screen.getByTestId('locale')).toHaveTextContent('fr')
      expect(document.documentElement).toMatchObject({
        lang: 'fr',
        dir: 'ltr',
      })
    })
  })

  it('preserves descendant UI state when the active locale changes', async () => {
    let mounts = 0
    const preference = new LocalePreferenceService({
      document,
      storage: null,
      preferredLocales: ['en-AU'],
    })
    render(
      <LocalePreferenceProvider
        preference={preference}
        initialMessages={enCatalog}
      >
        <ReactiveStartupErrorBoundary
          actions={{}}
          diagnosticContext={{
            hostKind: 'browser',
            saveSchemaVersion: 8,
          }}
        >
          <MountProbe onMount={() => { mounts += 1 }} />
        </ReactiveStartupErrorBoundary>
      </LocalePreferenceProvider>,
    )
    expect(mounts).toBe(1)

    act(() => preference.setPreference('fr'))

    await waitFor(() => {
      expect(screen.getByTestId('locale')).toHaveTextContent('fr')
    })
    expect(mounts).toBe(1)
  })
})

function LocaleProbe() {
  return <span data-testid="locale">{useIntl().locale}</span>
}

function MountProbe({ onMount }: { readonly onMount: () => void }) {
  useState(() => {
    onMount()
    return null
  })
  return <LocaleProbe />
}
