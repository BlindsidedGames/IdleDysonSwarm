// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
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
      purchasedInGame: true,
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
  test('has no serious or critical automated accessibility violations', async () => {
    const { container } = renderDebug(controls())
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })

    expect(
      results.violations.filter((violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
      ),
    ).toEqual([])
  })

  test('exposes every live Unity developer option after purchase', () => {
    renderDebug(controls())

    expect(
      screen.queryByText(
        'Unlock the developer tools with late-game currencies. Once purchased, they can be re-enabled for free.',
      ),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Developer tools enabled'),
    ).not.toBeInTheDocument()

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
          purchasedInGame: false,
          quantumShards: 100_000n,
          strangeMatter: 500_000n,
        }),
        apply,
      }),
    )

    expect(
      screen.getByText(
        'Unlock the developer tools with late-game currencies. Once purchased, they can be re-enabled for free.',
      ),
    ).toBeInTheDocument()
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

    const amount = screen.getByRole('textbox', { name: 'Amount' })
    await user.clear(amount)
    await user.type(amount, '12')
    await user.click(screen.getByRole('button', { name: 'Add Cash' }))
    await waitFor(() =>
      expect(apply).toHaveBeenCalledWith({
        kind: 'add-cash',
        amount: 12,
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Add Skill Points' }))
    await waitFor(() =>
      expect(apply).toHaveBeenCalledWith({
        kind: 'add-skill-points',
        amount: 12n,
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Add Influence' }))
    await waitFor(() =>
      expect(apply).toHaveBeenCalledWith({
        kind: 'add-influence',
        amount: 12n,
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Add Offline Time' }))
    await waitFor(() => expect(simulateOfflineTime).toHaveBeenCalledWith(12))
  })

  test('restores a supplied draft and reports field changes', async () => {
    const user = userEvent.setup()
    const onDraftChange = vi.fn()
    render(
      <IntlProvider locale="en">
        <DebugSurface
          development={controls()}
          locale="en"
          initialDraft={{ amount: '42', preset: 'star' }}
          onDraftChange={onDraftChange}
        />
      </IntlProvider>,
    )

    const amount = screen.getByRole('textbox', { name: 'Amount' })
    const preset = screen.getByRole('combobox', { name: 'Bot count' })
    expect(amount).toHaveValue('42')
    expect(preset).toHaveValue('star')

    await user.clear(amount)
    await user.type(amount, '7')
    expect(onDraftChange).toHaveBeenLastCalledWith({
      amount: '7',
      preset: 'star',
    })
    await user.selectOptions(preset, 'deep-field')
    expect(onDraftChange).toHaveBeenLastCalledWith({
      amount: '7',
      preset: 'deep-field',
    })
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
})
