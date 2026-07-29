// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import App from './App'
import {
  createProductionBrowserComposition,
} from './browser/productionBrowserComposition'
import enCatalog from './ui/i18n/catalogs/compiled/en.json'
import type {
  BrowserUiRuntimeFoundation,
  FrontendApplicationSnapshot,
  UiRuntimeFoundationStatus,
  UiRuntimeImportResult,
} from './ui/runtime'

afterEach(cleanup)

describe('application startup host', () => {
  test('mounts the snapshot-driven Dyson slice only after runtime readiness', () => {
    const blocked = new TestRuntime({
      phase: 'blocked',
      code: 'writer-owned',
      reason: 'private',
    })
    const blockedRender = renderApp(blocked.runtime, {
      confirmOverwrite: () => true,
      sampleUtc: () => '2026-07-29T00:00:00.000Z',
    })
    expect(blocked.snapshotReads).toBe(0)
    expect(blocked.snapshotSubscriptions).toBe(0)
    blockedRender.unmount()

    const ready = new TestRuntime({
      phase: 'ready',
      warnings: [],
    })
    ready.snapshotValue = readySnapshot()
    renderApp(ready.runtime, {
      confirmOverwrite: () => true,
      sampleUtc: () => '2026-07-29T00:00:00.000Z',
    })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Bots' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('startup-save-file'),
    ).not.toBeInTheDocument()
    expect(ready.snapshotReads).toBeGreaterThan(0)
    expect(ready.snapshotSubscriptions).toBe(1)
  })

  test('maps recovery safely and requires explicit overwrite approval before import', async () => {
    const runtime = new TestRuntime({
      phase: 'blocked',
      code: 'application-blocked',
      applicationOutcome: 'all-candidates-invalid',
      reason: 'C:\\private\\player-save.txt token=secret',
    })
    const confirmOverwrite = vi.fn(() => false)
    const sampleUtc = vi.fn(() => '2026-07-29T00:00:00.000Z')
    renderApp(runtime.runtime, {
      confirmOverwrite,
      sampleUtc,
    })

    expect(
      screen.getByRole('heading', {
        name: 'Saved progress needs attention',
      }),
    ).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(
      /private|player-save|secret/,
    )
    expect(
      screen.queryByRole('button', {
        name: 'Export recovery data',
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/its retained recovery data can then be exported/i),
    ).toBeInTheDocument()

    fireEvent.change(
      screen.getByTestId('startup-save-file'),
      {
        target: {
          files: [
            new File(['IDB1:test'], 'save.txt', {
              type: 'text/plain',
            }),
          ],
        },
      },
    )
    await waitFor(() =>
      expect(confirmOverwrite).toHaveBeenCalledTimes(1),
    )
    expect(runtime.imports).toHaveLength(0)
    expect(sampleUtc).not.toHaveBeenCalled()
  })

  test('routes approved import through the runtime and exposes recovery export only after retention', async () => {
    const runtime = new TestRuntime({
      phase: 'blocked',
      code: 'application-blocked',
      applicationOutcome: 'unsupported-future-version',
      reason: 'private',
    })
    runtime.importResult = {
      imported: false,
      committed: false,
      code: 'RUNTIME-IMPORT-INVALID',
      reason: 'private parse detail',
      recoveryAvailable: true,
    }
    const user = userEvent.setup()
    renderApp(runtime.runtime, {
      confirmOverwrite: () => true,
      sampleUtc: () => '2026-07-29T00:00:00.000Z',
    })

    fireEvent.change(
      screen.getByTestId('startup-save-file'),
      {
        target: {
          files: [new File(['bad'], 'save.txt')],
        },
      },
    )
    await screen.findByRole('button', {
      name: 'Export recovery data',
    })
    expect(runtime.imports).toHaveLength(1)
    expect(runtime.imports[0]).toMatchObject({
      source: 'file',
      importedAtUtc: '2026-07-29T00:00:00.000Z',
      overwriteApproved: true,
    })

    await user.click(
      screen.getByRole('button', {
        name: 'Export recovery data',
      }),
    )
    expect(runtime.exports).toBe(1)
  })

  test('disables conflicting recovery actions while import is pending and ignores rapid duplicate selection', async () => {
    const runtime = new TestRuntime({
      phase: 'blocked',
      code: 'application-blocked',
      applicationOutcome: 'all-candidates-invalid',
      reason: 'private',
    })
    const importGate = deferred<void>()
    runtime.importGate = importGate.promise
    renderApp(runtime.runtime, {
      confirmOverwrite: () => true,
      sampleUtc: () => '2026-07-29T00:00:00.000Z',
    })
    const input = screen.getByTestId('startup-save-file')

    fireEvent.change(input, {
      target: { files: [new File(['first'], 'first.txt')] },
    })
    await screen.findByText('Importing the selected save…')
    expect(
      screen.getByRole('button', { name: 'Import a save' }),
    ).toBeDisabled()

    fireEvent.change(input, {
      target: { files: [new File(['second'], 'second.txt')] },
    })
    expect(runtime.imports).toHaveLength(1)

    importGate.resolve()
    await screen.findByText(
      'The save could not be imported. Your existing progress was not replaced.',
    )
  })

  test.each([
    {
      name: 'writer-blocked Check again',
      status: {
        phase: 'blocked',
        code: 'writer-owned',
        reason: 'private',
      },
      buttonName: 'Check again',
    },
    {
      name: 'application-blocked Retry',
      status: {
        phase: 'blocked',
        code: 'application-blocked',
        applicationOutcome: 'storage-failed',
        reason: 'private',
      },
      buttonName: 'Try startup again',
    },
    {
      name: 'ownership-lost Check again',
      status: {
        phase: 'ownership-lost',
        reason: 'private',
      },
      buttonName: 'Check again',
    },
  ] as const)(
    'keeps the production $name recovery action functional',
    async ({ status, buttonName }) => {
      const runtime = new TestRuntime(status)
      const reloadPage = vi.fn()
      const composition = createProductionBrowserComposition({
        createRuntime: () => runtime.runtime,
        reloadPage,
      })
      const user = userEvent.setup()
      renderApp(runtime.runtime, {
        confirmOverwrite: () => true,
        sampleUtc: () => '2026-07-29T00:00:00.000Z',
        reloadSafely: composition.reloadSafely,
      })

      await user.click(
        screen.getByRole('button', { name: buttonName }),
      )
      await waitFor(() => expect(reloadPage).toHaveBeenCalledOnce())
      expect(runtime.checkpointCalls).toBe(0)
      expect(runtime.shutdownCalls).toBe(1)
    },
  )

  test('maps rejected import and reload promises to redacted localized feedback', async () => {
    const runtime = new TestRuntime({
      phase: 'blocked',
      code: 'application-blocked',
      applicationOutcome: 'all-candidates-invalid',
      reason: 'private',
    })
    runtime.rejectImport = true
    renderApp(runtime.runtime, {
      confirmOverwrite: () => true,
      sampleUtc: () => '2026-07-29T00:00:00.000Z',
    })

    fireEvent.change(
      screen.getByTestId('startup-save-file'),
      {
        target: {
          files: [new File(['secret payload'], 'save.txt')],
        },
      },
    )
    expect(
      await screen.findByText(
        'The save could not be imported. Your existing progress was not replaced.',
      ),
    ).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(
      /secret payload|private exception/,
    )

    cleanup()
    const reloadRuntime = new TestRuntime({
      phase: 'blocked',
      code: 'writer-owned',
      reason: 'private',
    })
    const user = userEvent.setup()
    renderApp(reloadRuntime.runtime, {
      confirmOverwrite: () => true,
      sampleUtc: () => '2026-07-29T00:00:00.000Z',
      reloadSafely: async () => {
        throw new Error('private exception')
      },
    })
    await user.click(
      screen.getByRole('button', { name: 'Check again' }),
    )
    expect(
      await screen.findByText(
        'This tab could not reload safely. Your progress was not reset.',
      ),
    ).toBeInTheDocument()
    expect(document.body.textContent).not.toContain(
      'private exception',
    )
  })

  test('maps a rejected recovery export to localized feedback', async () => {
    const runtime = new TestRuntime({
      phase: 'blocked',
      code: 'application-blocked',
      applicationOutcome: 'all-candidates-invalid',
      reason: 'private',
    })
    runtime.importResult = {
      imported: false,
      committed: false,
      code: 'invalid',
      reason: 'private',
      recoveryAvailable: true,
    }
    runtime.rejectExport = true
    const user = userEvent.setup()
    renderApp(runtime.runtime, {
      confirmOverwrite: () => true,
      sampleUtc: () => '2026-07-29T00:00:00.000Z',
    })

    fireEvent.change(
      screen.getByTestId('startup-save-file'),
      {
        target: { files: [new File(['bad'], 'save.txt')] },
      },
    )
    await user.click(
      await screen.findByRole('button', {
        name: 'Export recovery data',
      }),
    )
    expect(
      await screen.findByText(
        'Recovery data could not be exported from this tab.',
      ),
    ).toBeInTheDocument()
  })
})

function renderApp(
  runtime: BrowserUiRuntimeFoundation,
  options: {
    readonly confirmOverwrite: (message: string) => boolean
    readonly sampleUtc: () => string
    readonly reloadSafely?: () => Promise<void>
  },
) {
  return render(
    <IntlProvider locale="en" messages={enCatalog}>
      <App
        runtime={runtime}
        locale="en"
        saveSchemaVersion={12}
        sampleUtc={options.sampleUtc}
        reloadSafely={
          options.reloadSafely ?? (async () => undefined)
        }
        confirmOverwrite={options.confirmOverwrite}
      />
    </IntlProvider>,
  )
}

class TestRuntime {
  readonly #status: UiRuntimeFoundationStatus
  readonly imports: unknown[] = []
  exports = 0
  importResult: UiRuntimeImportResult = {
    imported: false,
    committed: false,
    code: 'not-configured',
    reason: 'not-configured',
    recoveryAvailable: false,
  }
  importGate: Promise<void> | undefined
  rejectImport = false
  rejectExport = false
  checkpointCalls = 0
  shutdownCalls = 0
  snapshotReads = 0
  snapshotSubscriptions = 0
  snapshotValue: FrontendApplicationSnapshot = {
    version: 1,
    phase: 'idle',
  }

  constructor(status: UiRuntimeFoundationStatus) {
    this.#status = Object.freeze(status)
  }

  readonly runtime = {
    status: () => this.#status,
    subscribeStatus: () => () => undefined,
    snapshot: () => {
      this.snapshotReads += 1
      return this.snapshotValue
    },
    subscribeSnapshot: () => {
      this.snapshotSubscriptions += 1
      return () => undefined
    },
    dispatchPlayer: async () => ({
      status: 'failed',
      code: 'test-not-configured',
      reason: 'test-not-configured',
    }),
    importSave: async (request: unknown) => {
      this.imports.push(request)
      await this.importGate
      if (this.rejectImport) {
        throw new Error('private exception')
      }
      return this.importResult
    },
    exportLastRecovery: async () => {
      this.exports += 1
      if (this.rejectExport) {
        throw new Error('private exception')
      }
      return true
    },
    checkpointBeforeSafeReload: async () => {
      this.checkpointCalls += 1
      return true
    },
    shutdown: async () => {
      this.shutdownCalls += 1
    },
  } as unknown as BrowserUiRuntimeFoundation
}

function readySnapshot(): FrontendApplicationSnapshot {
  const facilities = {
    assembly_lines: [0, 0],
    ai_managers: [0, 0],
    servers: [0, 0],
    data_centers: [0, 0],
    planets: [0, 0],
    matrioshka_brains: [0, 0],
    birch_planets: [0, 0],
    galactic_brains: [0, 0],
  }
  return {
    version: 1,
    phase: 'ready',
    source: 'primary',
    revision: { session: 1, state: 0, durable: 0 },
    checkpoint: { kind: 'clean', durableRevision: 0 },
    operation: { kind: 'none' },
    gameplay: {
      resources: {
        dyson: {
          money: 0,
          science: 0,
          bots: 0,
          workers: 0,
          researchers: 0,
        },
      },
      progression: { dyson: { facilities } },
      derived: {
        dyson: {
          status: 'ready',
          value: {
            rates: {
              money: 0,
              science: 0,
              panels: 0,
              bots: 0,
              assembly_lines: 0,
              ai_managers: 0,
              servers: 0,
              data_centers: 0,
              planets: 0,
            },
          },
        },
        dysonBotDistribution: {
          workersFraction: 1,
          scientistsFraction: 0,
        },
      },
      visibility: {
        dyson: {
          showTinker: true,
          visibleBasicFacilityIds: [],
          showNextTierTeaser: true,
        },
      },
      runtime: {
        tinker: {
          status: 'ready',
          value: {
            runtime: {
              running: false,
              repeat: false,
              elapsedSeconds: 0,
              effectiveManualLabour: false,
              cooldownSeconds: 0.5,
            },
            stats: {
              botYield: 1,
              assemblyYield: 0,
              cooldownSeconds: 0.5,
            },
            presentationMode: 'default',
            canStart: true,
            eligibility: 'available',
            timeToCompletionSeconds: null,
          },
        },
      },
      commands: {
        byKind: {
          'dyson.purchase-basic-facility': {
            routeAvailable: true,
          },
        },
      },
      previews: {
        dyson: {
          basicFacilities: [
            'assembly_lines',
            'ai_managers',
            'servers',
            'data_centers',
            'planets',
          ].map((facilityId) => ({
            facilityId,
            eligible: false,
            selectedQuantity: 1n,
            affordableQuantity: 0n,
            cost: 100,
            status: 'insufficient-funds',
          })),
        },
      },
    },
  } as unknown as FrontendApplicationSnapshot
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}
