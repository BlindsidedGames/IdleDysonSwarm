// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  SettingsSurface,
  type SettingsSurfaceProps,
} from './SettingsSurface'

afterEach(cleanup)

describe('SettingsSurface', () => {
  test('omits the redundant route title and changes the visualization preference', async () => {
    const user = userEvent.setup()
    const onVisualizationVisibleChange = vi.fn()
    renderSettings(vi.fn(), undefined, {
      visualizationVisible: true,
      onVisualizationVisibleChange,
    })

    expect(
      screen.queryByRole('heading', { name: 'Settings' }),
    ).not.toBeInTheDocument()
    const toggle = screen.getByRole('checkbox', {
      name: 'Show visualization',
    })
    expect(toggle).toBeChecked()

    await user.click(toggle)
    expect(onVisualizationVisibleChange).toHaveBeenCalledWith(false)
  })

  test('changes the persistent optional navigation shortcuts', async () => {
    const user = userEvent.setup()
    const onNavigationVisibilityChange = vi.fn()
    renderSettings(vi.fn(), undefined, {
      navigationVisibility: {
        story: false,
        wiki: true,
        statistics: true,
      },
      onNavigationVisibilityChange,
    })

    expect(
      screen.getByRole('checkbox', { name: 'Show Story shortcut' }),
    ).not.toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Show Wiki shortcut' }),
    ).toBeChecked()

    await user.click(
      screen.getByRole('checkbox', { name: 'Show Story shortcut' }),
    )
    expect(onNavigationVisibilityChange).toHaveBeenCalledWith(
      'story',
      true,
    )
  })

  test('requires an accessible confirmation and cancels without resetting', async () => {
    const user = userEvent.setup()
    const resetSave = vi.fn()
    renderSettings(resetSave)

    const trigger = screen.getByRole('button', {
      name: 'Reset Save',
    })
    await user.click(trigger)

    const dialog = screen.getByRole('alertdialog', {
      name: 'Reset Save?',
    })
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(
      document.querySelector('.settings-surface__content'),
    ).toHaveAttribute('inert')
    expect(cancel).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(resetSave).not.toHaveBeenCalled()
  })

  test('resets through the supplied runtime operation and reports success', async () => {
    const user = userEvent.setup()
    const resetSave = vi.fn().mockResolvedValue({
      imported: true,
      sessionRevision: 2,
      recoveryAvailable: true,
      lifecycleReset: true,
    })
    renderSettings(resetSave)

    await user.click(
      screen.getByRole('button', { name: 'Reset Save' }),
    )
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Reset Save',
      }),
    )

    await waitFor(() => expect(resetSave).toHaveBeenCalledOnce())
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Save reset. A fresh game has been created.',
    )
  })

  test('keeps the dialog and current save available when reset fails', async () => {
    const user = userEvent.setup()
    const resetSave = vi.fn().mockResolvedValue({
      imported: false,
      committed: false,
      code: 'APP-IMPORT-COMMIT-FAILED',
      reason: 'private storage detail',
      recoveryAvailable: false,
    })
    renderSettings(resetSave)

    await user.click(
      screen.getByRole('button', { name: 'Reset Save' }),
    )
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Reset Save',
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The save could not be reset. Your current progress was kept.',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      'private storage detail',
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  test('does not claim progress was preserved after a committed reconstruction failure', async () => {
    const user = userEvent.setup()
    const resetSave = vi.fn().mockResolvedValue({
      imported: false,
      committed: true,
      code: 'APP-POST-COMMIT-RELOAD',
      reason: 'private reload detail',
      recoveryAvailable: true,
    })
    renderSettings(resetSave)

    await user.click(
      screen.getByRole('button', { name: 'Reset Save' }),
    )
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Reset Save',
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The fresh save was written, but the game could not reopen it.',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      'current progress was kept',
    )
  })

  test('hides development progression controls when the runtime omits them', () => {
    renderSettings(vi.fn())

    expect(
      screen.queryByRole('button', { name: 'Development Menu' }),
    ).not.toBeInTheDocument()
  })

  test('applies the selected real bot-count preset through the development runtime', async () => {
    const user = userEvent.setup()
    const setDysonBots = vi.fn().mockResolvedValue({
      applied: true,
      bots: 195_000,
      stateRevision: 2,
      durableRevision: 2,
    })
    renderSettings(vi.fn(), {
      status: () => ({ enabled: true, entitled: true, quantumShards: 0n, strangeMatter: 0n }),
      setDysonBots,
      unlockReality: vi.fn(),
      apply: vi.fn(),
      simulateOfflineTime: vi.fn(),
    })

    expect(
      screen.queryByRole('combobox', { name: 'Progression state' }),
    ).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Development Menu' }),
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Progression state' }),
      'near-star',
    )
    await user.click(
      screen.getByRole('button', { name: 'Apply Progression' }),
    )

    await waitFor(() =>
      expect(setDysonBots).toHaveBeenCalledWith(195_000),
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Bot count saved.',
    )
  })

  test('offers the canonical first-Infinity threshold as a real-state preset', async () => {
    const user = userEvent.setup()
    const setDysonBots = vi.fn().mockResolvedValue({
      applied: true,
      bots: 42_000_000_000_000_000_000,
      stateRevision: 2,
      durableRevision: 2,
    })
    renderSettings(vi.fn(), {
      status: () => ({ enabled: true, entitled: true, quantumShards: 0n, strangeMatter: 0n }),
      setDysonBots,
      unlockReality: vi.fn(),
      apply: vi.fn(),
      simulateOfflineTime: vi.fn(),
    })

    await user.click(
      screen.getByRole('button', { name: 'Development Menu' }),
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Progression state' }),
      'first-infinity',
    )
    await user.click(
      screen.getByRole('button', { name: 'Apply Progression' }),
    )

    await waitFor(() =>
      expect(setDysonBots).toHaveBeenCalledWith(
        42_000_000_000_000_000_000,
      ),
    )
  })

  test('applies a canonical Reality-unlocked state through the development runtime', async () => {
    const user = userEvent.setup()
    const unlockReality = vi.fn().mockResolvedValue({
      applied: true,
      secretsOfTheUniverse: 27n,
      stateRevision: 3,
      durableRevision: 3,
    })
    renderSettings(vi.fn(), {
      status: () => ({ enabled: true, entitled: true, quantumShards: 0n, strangeMatter: 0n }),
      setDysonBots: vi.fn(),
      unlockReality,
      apply: vi.fn(),
      simulateOfflineTime: vi.fn(),
    })

    await user.click(
      screen.getByRole('button', { name: 'Development Menu' }),
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Progression state' }),
      'reality-unlocked',
    )
    await user.click(
      screen.getByRole('button', { name: 'Apply Progression' }),
    )

    await waitFor(() => expect(unlockReality).toHaveBeenCalledOnce())
    expect(screen.getByRole('status')).toHaveTextContent(
      'Reality unlocked.',
    )
  })
})

function renderSettings(
  resetSave: SettingsSurfaceProps['resetSave'],
  development?: SettingsSurfaceProps['development'],
  overrides: Partial<SettingsSurfaceProps> = {},
) {
  return render(
    <IntlProvider
      locale="en"
      messages={{}}
      onError={() => undefined}
    >
      <SettingsSurface
        resetSave={resetSave}
        development={development}
        {...overrides}
      />
    </IntlProvider>,
  )
}
