// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import enCatalog from '../i18n/catalogs/compiled/en.json'
import { NativeStartupLoader } from './NativeStartupLoader'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('native startup loader', () => {
  test('mounts a branded accessible cold-start status immediately', () => {
    const { container } = renderLoader('starting')
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    expect(
      container.querySelector('.native-launch-loader__mark'),
    ).toHaveAttribute('src', './icons/pwa-icon-512.png')
    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Idle Dyson Swarm',
    })).toBeInTheDocument()
    expect(screen.getByText('Starting your swarm…')).toBeInTheDocument()
  })

  test('changes to friendly delayed feedback without hiding a long startup', () => {
    vi.useFakeTimers()
    renderLoader('starting', 15_001)

    act(() => vi.advanceTimersByTime(15_000))
    expect(screen.getByText('Starting your swarm…')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(
      screen.getByText('Still loading your progress…'),
    ).toBeInTheDocument()
  })

  test('presents safe shutdown as progress rather than an error shell', () => {
    renderLoader('stopping')
    expect(screen.getByText('Saving your progress…')).toBeInTheDocument()
  })
})

function renderLoader(
  phase: 'starting' | 'stopping',
  slowDelayMilliseconds?: number,
) {
  return render(
    <IntlProvider locale="en" messages={enCatalog}>
      <NativeStartupLoader
        phase={phase}
        slowDelayMilliseconds={slowDelayMilliseconds}
      />
    </IntlProvider>,
  )
}
