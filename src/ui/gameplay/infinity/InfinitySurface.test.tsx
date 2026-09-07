// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { hydrateGameState } from '../../../game-state/mapping'
import { createUnityFirstRunPreparedSave } from '../../../application/firstRun/unityFirstRunSave'
import { projectInfinityProgress } from '../../../simulation/infinityCycle'
import { InfinitySurface } from './InfinitySurface'

afterEach(cleanup)
test('replaces unavailable IP progress with Overflow navigation', () => {
  const state = hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: '2026-09-06T00:00:00.000Z' })).state
  const open = vi.fn()
  render(<IntlProvider locale="en" messages={{}}><InfinitySurface locale="en"
    resources={{ ...state.infinity, availablePoints: 0n }}
    progression={{ infinity: { ...state.infinity, botCapTransitionPending: true } }}
    derived={projectInfinityProgress({ bots: 4e242, totalInfinityPoints: 0n,
      divisionsPurchased: 0n, breakTheLoop: true, breakTarget: 1n,
      permanentDoubleIp: false, quantumDoubleIp: false })}
    previews={{ shop: [], breakTarget: { minimum: 1n, maximum: 1100n, minimumPosition: 0, maximumPosition: 1099, currentPosition: 0 } }}
    commandAvailability={{ purchaseShopItem: true, setBreakTarget: true, setAutomaticReset: true, requestReset: false }}
    dispatchPlayer={vi.fn()} onViewOverflow={open} /> </IntlProvider>)
  expect(screen.getByText('Overflow reached')).not.toBeNull()
  expect(screen.queryByRole('progressbar')).toBeNull()
  expect(screen.queryByRole('button', { name: /Infinity for/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'View Overflow reset' }))
  expect(open).toHaveBeenCalledOnce()
})
