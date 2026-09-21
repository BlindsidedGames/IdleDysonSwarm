// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../../../application/firstRun/unityFirstRunSave'
import { CanonicalRuntimeSession } from '../../../application/canonicalRuntimeSession'
import { StatisticsSurface } from './StatisticsSurface'

afterEach(() => { cleanup(); localStorage.clear() })

function showStatistics() {
  const statistics = new CanonicalRuntimeSession(createUnityFirstRunPreparedSave({ startedAtUtc: new Date().toISOString() }), { entitlements: { permanentDoubleIp: false } }).initialState.gameState.statistics
  return render(<IntlProvider locale="en" messages={{}}>
    <StatisticsSurface locale="en" statistics={statistics} currentBreakTarget={1n}
      swarmScale={{ activePanels: 0, starsSurrounded: 0, galaxiesEngulfed: 0 }}
      visibility={{ infinity: false, simulations: false, reality: false }} />
  </IntlProvider>)
}

test('defaults to General and remembers selection across remounts with keyboard navigation', () => {
  const first = showStatistics()
  expect(screen.getByRole('tab', { name: 'General' }).getAttribute('aria-selected')).toBe('true')
  fireEvent.click(screen.getByRole('tab', { name: 'Speedruns' }))
  first.unmount()
  showStatistics()
  expect(screen.getByRole('tab', { name: 'Speedruns' }).getAttribute('aria-selected')).toBe('true')
  expect(screen.getAllByRole('region', { name: 'Current run' })).toHaveLength(5)
  expect(screen.getAllByRole('region', { name: 'Personal best' })).toHaveLength(5)
  expect(screen.getAllByRole('img', { name: 'Double IP used: No' })).toHaveLength(6)
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Speedruns' }), { key: 'ArrowLeft' })
  expect(screen.getByRole('tab', { name: 'General' }).getAttribute('aria-selected')).toBe('true')
  expect(localStorage.getItem('ids.statistics.tab')).toBe('general')
})
