// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import { createElement } from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { StartupErrorBoundary } from './StartupErrorBoundary'

const SECRET =
  'Bearer secret-token at C:\\Users\\player\\save-data.txt'

function BrokenPresentation() {
  throw new TypeError(SECRET)
}

describe('StartupErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('isolates render failures with redacted prelocalized recovery presentation', () => {
    const reloadSafely = vi.fn(async () => undefined)
    render(
      createElement(
        StartupErrorBoundary,
        {
          copy: {
            title: 'La pantalla se detuvo',
            body: 'No se modificó el progreso.',
            diagnosticsSummary: 'Detalles locales',
            diagnosticsLabel: 'Informe local redactado',
            reloadAction: 'Recargar de forma segura',
            exportRecoveryAction: 'Exportar recuperación',
            reloadPending: 'Preparando recarga…',
            reloadCompleted: 'Recarga solicitada.',
            reloadFailed: 'No se pudo recargar.',
            exportPending: 'Preparando recuperación…',
            exportSucceeded: 'Recuperación exportada.',
            exportFailed: 'No se pudo exportar.',
          },
          actions: { reloadSafely },
          diagnosticContext: {
            buildId: 'release-42',
            hostKind: 'static',
            locale: 'es',
          },
        },
        createElement(BrokenPresentation),
      ),
    )

    const heading = screen.getByRole('heading', {
      name: 'La pantalla se detuvo',
      level: 1,
    })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveFocus()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se modificó el progreso.',
    )
    expect(
      screen.getByRole('button', {
        name: 'Recargar de forma segura',
      }),
    ).toBeInTheDocument()
    expect(reloadSafely).not.toHaveBeenCalled()
    const report = screen.getByLabelText('Informe local redactado')
    expect(report).toHaveTextContent('"errorKind": "TypeError"')
    expect(report).not.toHaveTextContent(SECRET)
    expect(report).not.toHaveTextContent('secret-token')
    expect(report).not.toHaveTextContent('save-data.txt')
  })

  it('offers explicit safe reload without invoking it automatically and fences duplicate activation', async () => {
    const gate = deferred<void>()
    const reloadSafely = vi.fn(() => gate.promise)
    render(
      createElement(
        StartupErrorBoundary,
        {
          actions: { reloadSafely },
        },
        createElement(BrokenPresentation),
      ),
    )

    expect(reloadSafely).not.toHaveBeenCalled()
    const reload = screen.getByRole('button', {
      name: 'Reload safely',
    })
    fireEvent.click(reload)
    fireEvent.click(reload)

    expect(reloadSafely).toHaveBeenCalledTimes(1)
    expect(reload).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Releasing this tab before reloading',
    )

    gate.resolve()
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Reload requested.',
      ),
    )
  })

  it('shows retained-original export only when available and reports its result', async () => {
    const exportRecovery = vi.fn(async () => true)
    const recoveryExportAvailable = vi.fn(() => true)
    render(
      createElement(
        StartupErrorBoundary,
        {
          actions: {
            reloadSafely: async () => undefined,
            recoveryExportAvailable,
            exportRecovery,
          },
        },
        createElement(BrokenPresentation),
      ),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Export recovery data',
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Recovery data exported.',
      ),
    )
    expect(recoveryExportAvailable).toHaveBeenCalled()
    expect(exportRecovery).toHaveBeenCalledTimes(1)
  })

  it('fences export and reload behind one pending boundary operation', async () => {
    const gate = deferred<boolean>()
    const reloadSafely = vi.fn(async () => undefined)
    const exportRecovery = vi.fn(() => gate.promise)
    render(
      createElement(
        StartupErrorBoundary,
        {
          actions: {
            reloadSafely,
            recoveryExportAvailable: () => true,
            exportRecovery,
          },
        },
        createElement(BrokenPresentation),
      ),
    )

    const exportButton = screen.getByRole('button', {
      name: 'Export recovery data',
    })
    fireEvent.click(exportButton)
    fireEvent.click(exportButton)
    fireEvent.click(
      screen.getByRole('button', { name: 'Reload safely' }),
    )

    expect(exportRecovery).toHaveBeenCalledTimes(1)
    expect(reloadSafely).not.toHaveBeenCalled()
    gate.resolve(false)
    await waitFor(() =>
      expect(screen.getAllByRole('alert').at(-1)).toHaveTextContent(
        'Recovery data could not be exported',
      ),
    )
  })

  it('contains action failures without exposing private errors or retrying', async () => {
    const reloadSafely = vi.fn(async () => {
      throw new Error(SECRET)
    })
    const exportRecovery = vi.fn(async () => {
      throw new Error(SECRET)
    })
    render(
      createElement(
        StartupErrorBoundary,
        {
          actions: {
            reloadSafely,
            recoveryExportAvailable: () => true,
            exportRecovery,
          },
        },
        createElement(BrokenPresentation),
      ),
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Reload safely' }),
    )
    await waitFor(() =>
      expect(screen.getAllByRole('alert').at(-1)).toHaveTextContent(
        'This tab could not reload safely.',
      ),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Export recovery data',
      }),
    )
    await waitFor(() =>
      expect(screen.getAllByRole('alert').at(-1)).toHaveTextContent(
        'Recovery data could not be exported',
      ),
    )

    expect(reloadSafely).toHaveBeenCalledTimes(1)
    expect(exportRecovery).toHaveBeenCalledTimes(1)
    expect(document.body).not.toHaveTextContent(SECRET)
    expect(document.body).not.toHaveTextContent('secret-token')
  })

  it('hides export when capability inspection fails or reports no retained original', () => {
    const { rerender } = render(
      createElement(
        StartupErrorBoundary,
        {
          actions: {
            recoveryExportAvailable: () => false,
            exportRecovery: async () => true,
          },
        },
        createElement(BrokenPresentation),
      ),
    )
    expect(
      screen.queryByRole('button', {
        name: 'Export recovery data',
      }),
    ).not.toBeInTheDocument()

    rerender(
      createElement(
        StartupErrorBoundary,
        {
          actions: {
            recoveryExportAvailable: () => {
              throw new Error(SECRET)
            },
            exportRecovery: async () => true,
          },
        },
        createElement(BrokenPresentation),
      ),
    )
    expect(
      screen.queryByRole('button', {
        name: 'Export recovery data',
      }),
    ).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(SECRET)
  })

  it('has no automated accessibility violations in the fallback', async () => {
    const { container } = render(
      createElement(
        StartupErrorBoundary,
        {
          actions: {
            reloadSafely: async () => undefined,
            recoveryExportAvailable: () => true,
            exportRecovery: async () => true,
          },
        },
        createElement(BrokenPresentation),
      ),
    )
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })
    expect(results.violations).toEqual([])
  })
})

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}
