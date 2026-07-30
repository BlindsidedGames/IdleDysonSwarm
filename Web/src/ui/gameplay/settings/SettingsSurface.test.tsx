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
})

function renderSettings(resetSave: SettingsSurfaceProps['resetSave']) {
  return render(
    <IntlProvider
      locale="en"
      messages={{}}
      onError={() => undefined}
    >
      <SettingsSurface
        resetSave={resetSave}
      />
    </IntlProvider>,
  )
}
