// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import type { UiRuntimeDevelopmentControls } from '../../runtime/contracts'
import { DebugSurface } from './DebugSurface'

afterEach(cleanup)

test('Unlock all tabs uses the dedicated action and clears feedback for an unchanged result', async () => {
  const apply = vi.fn<UiRuntimeDevelopmentControls['apply']>()
    .mockResolvedValueOnce({ applied: true, stateRevision: 1, durableRevision: 1 })
    .mockResolvedValueOnce({ applied: false, unchanged: true, code: 'RUNTIME-DEVELOPMENT-UNCHANGED', reason: 'Already active' })
    .mockResolvedValueOnce({ applied: false, code: 'APP-COMMIT-FIRST-FAILED', reason: 'Storage failed' })
  const development: UiRuntimeDevelopmentControls = {
    status: () => ({ enabled: true, entitled: true, purchasedInGame: false, quantumShards: 0n, strangeMatter: 0 }),
    apply,
    unlockReality: vi.fn(),
    setDysonBots: vi.fn(),
    simulateOfflineTime: vi.fn(),
  }
  render(<IntlProvider locale="en" messages={{}}><DebugSurface development={development} locale="en" /></IntlProvider>)
  const button = screen.getByRole('button', { name: 'Unlock all tabs' })
  fireEvent.click(button)
  await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false))
  expect(apply).toHaveBeenLastCalledWith({ kind: 'unlock-all-tabs' })
  expect(development.unlockReality).not.toHaveBeenCalled()
  fireEvent.click(button)
  await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false))
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.queryByText('That development change could not be applied.')).toBeNull()
  fireEvent.click(button)
  expect(await screen.findByText('That development change could not be applied.')).toBeTruthy()
})
