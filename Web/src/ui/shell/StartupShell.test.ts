// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import { createElement } from 'react'
import { IntlProvider } from 'react-intl'
import {
  cleanup,
  render,
  screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import enCatalog from '../i18n/catalogs/compiled/en.json'
import type {
  StartupShellActions,
  StartupShellPhase,
  StartupShellViewModel,
} from './contracts'
import { createLocalDiagnosticReport } from './diagnostics'
import { StartupShell } from './StartupShell'

afterEach(cleanup)

const STATE_HEADINGS: Readonly<
  Record<StartupShellPhase, string>
> = {
  idle: 'Ready to start',
  starting: 'Starting the game',
  'writer-blocked': 'Another tab is using this game',
  'application-blocked': 'This browser cannot start the game',
  recovery: 'Saved progress needs attention',
  'ready-placeholder': 'Game ready',
  'ownership-lost': 'This tab stopped writing progress',
  stopping: 'Stopping safely',
  error: 'The game could not start',
}

describe('StartupShell', () => {
  for (const [phase, heading] of Object.entries(STATE_HEADINGS)) {
    it(`renders the localized ${phase} state`, () => {
      renderStartupShell({ phase: phase as StartupShellPhase })
      expect(
        screen.getByRole('heading', { name: heading, level: 2 }),
      ).toBeInTheDocument()
    })
  }

  it('exposes only explicitly injected actions', async () => {
    const start = vi.fn()
    const user = userEvent.setup()
    const { rerender } = renderStartupShell(
      { phase: 'idle' },
      { start },
    )

    await user.click(
      screen.getByRole('button', { name: 'Start game' }),
    )
    expect(start).toHaveBeenCalledTimes(1)
    expect(
      screen.queryByRole('button', { name: 'Try startup again' }),
    ).not.toBeInTheDocument()

    rerender(startupElement(
      { phase: 'recovery' },
      {
        importSaveText: vi.fn(),
        exportRecovery: vi.fn(),
      },
    ))
    expect(
      screen.getByRole('button', { name: 'Import a save' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('textbox', { name: 'Save text' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Export recovery data',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Start game' }),
    ).not.toBeInTheDocument()
  })

  it('moves focus to the state heading when the phase changes', () => {
    const { rerender } = renderStartupShell({ phase: 'starting' })
    expect(
      screen.getByRole('heading', {
        name: 'Starting the game',
        level: 2,
      }),
    ).toHaveFocus()

    rerender(startupElement({ phase: 'writer-blocked' }))
    expect(
      screen.getByRole('heading', {
        name: 'Another tab is using this game',
        level: 2,
      }),
    ).toHaveFocus()
  })

  it('uses deliberate busy, polite, and assertive announcements', () => {
    const { rerender } = renderStartupShell({
      phase: 'starting',
    })
    expect(
      screen
        .getByRole('heading', { name: 'Starting the game' })
        .closest('section'),
    ).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-live',
      'polite',
    )

    rerender(startupElement({ phase: 'error' }))
    expect(screen.getByRole('alert')).toHaveAttribute(
      'aria-live',
      'assertive',
    )

    rerender(startupElement(
      {
        phase: 'recovery',
        operationStatus: 'import-pending',
      },
      {
        disabled: true,
        importSaveText: vi.fn(),
      },
    ))
    expect(
      screen
        .getByText('Importing the selected save…')
        .closest('.ui-status-feedback'),
    ).toHaveAttribute('aria-live', 'polite')
    expect(
      screen.getByRole('button', { name: 'Import a save' }),
    ).toBeDisabled()

    rerender(startupElement({
      phase: 'recovery',
      operationStatus: 'import-failed',
    }))
    expect(
      screen
        .getByText(
          'The save could not be imported. Your existing progress was not replaced.',
        )
        .closest('.ui-status-feedback'),
    ).toHaveAttribute('aria-live', 'assertive')
  })

  it('offers retry, copy-original, and start-fresh recovery choices', async () => {
    const retry = vi.fn()
    const copyOriginal = vi.fn()
    const startFresh = vi.fn()
    const user = userEvent.setup()
    renderStartupShell(
      { phase: 'recovery' },
      { retry, copyOriginal, startFresh },
    )

    await user.click(screen.getByRole('button', { name: 'Try startup again' }))
    await user.click(screen.getByRole('button', { name: 'Copy Original' }))
    await user.click(screen.getByRole('button', { name: 'Start Fresh' }))

    expect(retry).toHaveBeenCalledOnce()
    expect(copyOriginal).toHaveBeenCalledOnce()
    expect(startFresh).toHaveBeenCalledOnce()
  })

  it('renders only redacted diagnostics in a fixed left-to-right block', () => {
    const report = createLocalDiagnosticReport({
      phase: 'application-blocked',
      code: 'capability-unavailable',
      buildId: 'web-2026.07.29',
      hostKind: 'static',
    })
    renderStartupShell({
      phase: 'application-blocked',
      diagnostics: report,
    })

    const diagnostics = screen.getByLabelText(
      'Redacted local diagnostic report',
    )
    expect(diagnostics).toHaveAttribute('dir', 'ltr')
    expect(diagnostics).toHaveTextContent('capability-unavailable')
    expect(diagnostics).not.toHaveTextContent('savePayload')
  })

  it('has no automated accessibility violations in a recovery state', async () => {
    const { container } = renderStartupShell(
      { phase: 'recovery' },
      {
        importSaveText: vi.fn(),
        exportRecovery: vi.fn(),
      },
    )
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })
    expect(results.violations).toEqual([])
  })
})

function renderStartupShell(
  viewModel: StartupShellViewModel,
  actions?: StartupShellActions,
) {
  return render(startupElement(viewModel, actions))
}

function startupElement(
  viewModel: StartupShellViewModel,
  actions?: StartupShellActions,
) {
  return createElement(
    IntlProvider,
    {
      locale: 'en',
      messages: enCatalog,
      onError: (error) => {
        throw error
      },
    },
    createElement(StartupShell, { viewModel, actions }),
  )
}
