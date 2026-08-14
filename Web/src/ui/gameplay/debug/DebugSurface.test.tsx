// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { gameDecimalToCanonicalString } from '../../../math/gameDecimal'
import type { UiRuntimeDevelopmentControls } from '../../runtime'
import { DebugSurface } from './DebugSurface'

afterEach(cleanup)

function controls(
  overrides: Partial<UiRuntimeDevelopmentControls> = {},
): UiRuntimeDevelopmentControls {
  return {
    status: () => ({
      enabled: true,
      entitled: true,
      quantumShards: 100_000n,
      strangeMatter: 500_000n,
    }),
    setDysonBots: vi.fn(),
    unlockReality: vi.fn(),
    apply: vi.fn().mockResolvedValue({
      applied: true,
      stateRevision: 2,
      durableRevision: 2,
    }),
    simulateOfflineTime: vi.fn().mockResolvedValue({
      applied: true,
      stateRevision: 2,
      durableRevision: 2,
    }),
    ...overrides,
  }
}

function renderDebug(development: UiRuntimeDevelopmentControls) {
  return render(
    <IntlProvider locale="en">
      <DebugSurface development={development} locale="en" />
    </IntlProvider>,
  )
}

describe('DebugSurface', () => {
  test('exposes every live Unity developer option after purchase', () => {
    renderDebug(controls())

    for (const name of [
      'Add Cash',
      'Add Bots',
      'Add Skill Points',
      'Add Infinity Points',
      'Add Quantum Shards',
      'Add Influence',
      'Add Strange Matter',
      'Add Offline Time',
      'Apply',
      'Unlock all tabs',
      'Set Tinker to 1 second',
      'Set Tinker to instant',
      'Recalculate Skill Points',
      'Reset Secret Progress',
      'Debug Cats',
      'Disable Developer Options',
    ]) {
      expect(screen.getByRole(name === 'Debug Cats' ? 'link' : 'button', { name }))
        .toBeInTheDocument()
    }
  })

  test('shows the Unity purchase gate before exposing developer tools', async () => {
    const user = userEvent.setup()
    const apply = vi.fn().mockResolvedValue({
      applied: true,
      stateRevision: 2,
      durableRevision: 2,
    })
    renderDebug(
      controls({
        status: () => ({
          enabled: false,
          entitled: false,
          quantumShards: 100_000n,
          strangeMatter: 500_000n,
        }),
        apply,
      }),
    )

    expect(screen.queryByText('Progression tools')).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', {
        name: 'Purchase Developer Options',
      }),
    )
    await waitFor(() =>
      expect(apply).toHaveBeenCalledWith({
        kind: 'purchase-debug-options',
      }),
    )
  })

  test('routes grants and offline simulation through runtime controls', async () => {
    const user = userEvent.setup()
    const apply = vi.fn().mockResolvedValue({
      applied: true,
      stateRevision: 2,
      durableRevision: 2,
    })
    const simulateOfflineTime = vi.fn().mockResolvedValue({
      applied: true,
      stateRevision: 3,
      durableRevision: 3,
    })
    renderDebug(controls({ apply, simulateOfflineTime }))

    const amount = screen.getByRole('textbox', { name: 'Amount' }) as HTMLInputElement
    await user.clear(amount)
    await user.type(amount, '12')
    await user.click(screen.getByRole('button', { name: 'Add Cash' }))
    await waitFor(() => expect(apply).toHaveBeenCalled())
    const cashAction = apply.mock.calls[0]?.[0]
    expect(cashAction?.kind).toBe('add-cash')
    if (cashAction?.kind === 'add-cash') {
      expect(gameDecimalToCanonicalString(cashAction.amount)).toBe('1.2e1')
    }
    await user.click(screen.getByRole('button', { name: 'Add Skill Points' }))
    await waitFor(() =>
      expect(apply).toHaveBeenCalledWith({
        kind: 'add-skill-points',
        amount: 12n,
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Add Influence' }))
    await waitFor(() => expect(apply).toHaveBeenCalledTimes(3))
    const influenceAction = apply.mock.calls[2]?.[0]
    expect(influenceAction?.kind).toBe('add-influence')
    if (influenceAction?.kind === 'add-influence') {
      expect(gameDecimalToCanonicalString(influenceAction.amount)).toBe('1.2e1')
    }
    await user.click(screen.getByRole('button', { name: 'Add Offline Time' }))
    await waitFor(() => expect(simulateOfflineTime).toHaveBeenCalledWith(12))
  })

  test('keeps the draft selection stable across live rerenders and accepts huge exponents', async () => {
    const user = userEvent.setup()
    const apply = vi.fn().mockResolvedValue({
      applied: true,
      stateRevision: 2,
      durableRevision: 2,
    })
    const development = controls({ apply })
    const view = renderDebug(development)
    const amount = screen.getByRole('textbox', { name: 'Amount' }) as HTMLInputElement

    await user.clear(amount)
    await user.type(amount, '1e999')
    amount.setSelectionRange(1, 4)
    view.rerender(
      <IntlProvider locale="en">
        <DebugSurface development={development} locale="en" />
      </IntlProvider>,
    )

    expect(amount).toHaveValue('1e999')
    expect(amount.selectionStart).toBe(1)
    expect(amount.selectionEnd).toBe(4)
    expect(amount).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Add Cash' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Add Infinity Points' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Add Offline Time' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Add Cash' }))
    const action = apply.mock.calls[0]?.[0]
    expect(action?.kind).toBe('add-cash')
    if (action?.kind === 'add-cash') {
      expect(gameDecimalToCanonicalString(action.amount)).toBe('1e999')
    }
  })

  test('routes secret progress reset through the development boundary', async () => {
    const user = userEvent.setup()
    const apply = vi.fn().mockResolvedValue({
      applied: true,
      stateRevision: 2,
      durableRevision: 2,
    })
    renderDebug(controls({ apply }))

    await user.click(
      screen.getByRole('button', { name: 'Reset Secret Progress' }),
    )

    await waitFor(() =>
      expect(apply).toHaveBeenCalledWith({ kind: 'reset-secret-progress' }),
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Secret progress reset.',
    )
  })

  test('routes instant Tinker through the canonical positive minimum', async () => {
    const user = userEvent.setup()
    const apply = vi.fn().mockResolvedValue({
      applied: true,
      stateRevision: 2,
      durableRevision: 2,
    })
    renderDebug(controls({ apply }))

    await user.click(screen.getByRole('button', { name: 'Set Tinker to instant' }))

    await waitFor(() => expect(apply).toHaveBeenCalledWith({
      kind: 'set-tinker-interval',
      seconds: 0.01,
    }))
  })
})
