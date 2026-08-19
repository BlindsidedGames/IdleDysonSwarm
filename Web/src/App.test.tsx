// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
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
    const readyRender = renderApp(ready.runtime, {
      confirmOverwrite: () => true,
      sampleUtc: () => '2026-07-29T00:00:00.000Z',
    })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Bots' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('textbox', { name: 'Save text' }),
    ).not.toBeInTheDocument()
    expect(ready.snapshotReads).toBeGreaterThan(0)
    expect(ready.snapshotSubscriptions).toBe(1)

    const offlineTimeItem = readyRender.container.querySelector(
      '.dyson-navigation--drawer [data-navigation-id="offline-time"]',
    )
    expect(offlineTimeItem).not.toBeNull()
    expect(
      offlineTimeItem?.querySelector('.dyson-navigation__progress i'),
    ).toHaveStyle({ inlineSize: '50%' })
    expect(
      offlineTimeItem?.querySelector('button'),
    ).toHaveAccessibleName('Offline Time, 30m 0s of 1h 0s stored')
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
      screen.getByRole('textbox', { name: 'Save text' }),
      { target: { value: 'IDB1:test' } },
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Import a save' }),
    )
    expect(confirmOverwrite).toHaveBeenCalledTimes(1)
    expect(runtime.imports).toHaveLength(0)
    expect(sampleUtc).not.toHaveBeenCalled()
  })

  test('has no serious or critical automated violations in blocked save recovery', async () => {
    const runtime = new TestRuntime({
      phase: 'blocked',
      code: 'application-blocked',
      applicationOutcome: 'all-candidates-invalid',
      reason: 'private',
    })
    const { container } = renderApp(runtime.runtime, {
      confirmOverwrite: () => false,
      sampleUtc: () => '2026-08-19T00:00:00.000Z',
    })
    await screen.findByRole('heading', {
      name: 'Saved progress needs attention',
    })
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    })

    expect(
      results.violations.filter((violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
      ),
    ).toEqual([])
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
      screen.getByRole('textbox', { name: 'Save text' }),
      { target: { value: 'bad' } },
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Import a save' }),
    )
    await screen.findByRole('button', {
      name: 'Export recovery data',
    })
    expect(runtime.imports).toHaveLength(1)
    expect(runtime.imports[0]).toMatchObject({
      source: 'paste',
      text: 'bad',
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
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Save text' }),
      { target: { value: 'first' } },
    )
    const importButton = screen.getByRole('button', {
      name: 'Import a save',
    })
    fireEvent.click(importButton)
    await screen.findByText('Importing the selected save…')
    expect(importButton).toBeDisabled()

    fireEvent.click(importButton)
    expect(runtime.imports).toHaveLength(1)

    importGate.resolve()
    await screen.findByText(
      'The save could not be imported. Your existing progress was not replaced.',
    )
  })

  test.each([
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

  test('takes over writer ownership in place without reloading the page', async () => {
    const runtime = new TestRuntime({
      phase: 'blocked',
      code: 'writer-owned',
      reason: 'private',
    })
    const reloadSafely = vi.fn()
    const user = userEvent.setup()
    renderApp(runtime.runtime, {
      confirmOverwrite: () => true,
      sampleUtc: () => '2026-07-29T00:00:00.000Z',
      reloadSafely,
    })

    await user.click(
      screen.getByRole('button', { name: 'Use this tab' }),
    )

    expect(runtime.takeOverCalls).toBe(1)
    expect(runtime.startCalls).toBe(0)
    expect(reloadSafely).not.toHaveBeenCalled()
    expect(runtime.shutdownCalls).toBe(0)
  })

  test('copies retained original text and records Start Fresh without deleting recovery', async () => {
    window.localStorage.clear()
    const runtime = new TestRuntime({
      phase: 'blocked',
      code: 'application-blocked',
      applicationOutcome: 'all-candidates-invalid',
      reason: 'private',
    })
    runtime.recoveryAvailable = true
    const resetSave = vi.fn().mockResolvedValue({
      imported: true,
      sessionRevision: 2,
      recoveryAvailable: true,
    })
    const user = userEvent.setup()
    renderApp(runtime.runtime, {
      confirmOverwrite: () => true,
      sampleUtc: () => '2026-07-29T00:00:00.000Z',
      resetSave,
    })

    await user.click(screen.getByRole('button', { name: 'Copy Original' }))
    expect(runtime.copyCalls).toBe(1)
    expect(runtime.recoveryAvailable).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Start Fresh' }))
    await waitFor(() => expect(resetSave).toHaveBeenCalledOnce())
    expect(JSON.parse(
      window.localStorage.getItem('idle-dyson-swarm.recovery-choice') ?? '{}',
    )).toEqual({
      choice: 'start-fresh',
      recordedAtUtc: '2026-07-29T00:00:00.000Z',
    })
    expect(runtime.recoveryAvailable).toBe(true)
  })

  test('notifies the player when startup restored a verified backup', () => {
    const runtime = new TestRuntime({
      phase: 'ready',
      warnings: [
        {
          code: 'backup-recovered',
          reason: 'private storage detail',
        },
      ],
    })
    const snapshot = readySnapshot()
    if (snapshot.phase !== 'ready') throw new Error('Expected ready fixture.')
    runtime.snapshotValue = {
      ...snapshot,
      source: 'recovered-canonical',
    }
    renderApp(runtime.runtime, {
      confirmOverwrite: () => true,
      sampleUtc: () => '2026-07-29T00:00:00.000Z',
    })

    expect(
      screen.getByText(
        'Your current save could not be opened. The newest verified backup was restored.',
      ),
    ).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('private storage detail')
  })

  test('automatically retries expired writer ownership in place', async () => {
    const runtime = new TestRuntime({
      phase: 'blocked',
      code: 'writer-owned',
      reason: 'private',
      expiresAtUtcMilliseconds: Date.now() + 10,
    })
    const reloadSafely = vi.fn()
    renderApp(runtime.runtime, {
      confirmOverwrite: () => true,
      sampleUtc: () => '2026-07-29T00:00:00.000Z',
      reloadSafely,
    })

    await waitFor(
      () => expect(runtime.startCalls).toBe(1),
      { timeout: 1_000 },
    )
    expect(reloadSafely).not.toHaveBeenCalled()
    expect(runtime.shutdownCalls).toBe(0)
  })

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
      screen.getByRole('textbox', { name: 'Save text' }),
      { target: { value: 'secret payload' } },
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Import a save' }),
    )
    expect(
      await screen.findByText(
        'The save could not be imported. Your existing progress was not replaced.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Save text' }),
    ).toHaveValue('secret payload')
    expect(document.body.textContent).not.toMatch(
      /private exception/,
    )

    cleanup()
    const reloadRuntime = new TestRuntime({
      phase: 'ownership-lost',
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
      screen.getByRole('textbox', { name: 'Save text' }),
      { target: { value: 'bad' } },
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Import a save' }),
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
    readonly resetSave?: () => Promise<UiRuntimeImportResult>
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
        resetSave={options.resetSave}
      />
    </IntlProvider>,
  )
}

class TestRuntime {
  readonly #status: UiRuntimeFoundationStatus
  readonly imports: unknown[] = []
  exports = 0
  copyCalls = 0
  recoveryAvailable = false
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
  startCalls = 0
  takeOverCalls = 0
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
    takeOverWriterOwnership: async () => {
      this.takeOverCalls += 1
      return this.#status
    },
    development: {
      status: () => ({
        enabled: true,
        entitled: true,
        quantumShards: 0n,
        strangeMatter: 0n,
      }),
      setDysonBots: async () => ({
        applied: false,
        code: 'test-not-configured',
        reason: 'test-not-configured',
      }),
      unlockReality: async () => ({
        applied: false,
        code: 'test-not-configured',
        reason: 'test-not-configured',
      }),
      apply: async () => ({
        applied: false,
        code: 'test-not-configured',
        reason: 'test-not-configured',
      }),
      simulateOfflineTime: async () => ({
        applied: false,
        code: 'test-not-configured',
        reason: 'test-not-configured',
      }),
    },
    start: async () => {
      this.startCalls += 1
      return this.#status
    },
    snapshot: () => {
      this.snapshotReads += 1
      return this.snapshotValue
    },
    subscribeSnapshot: () => {
      this.snapshotSubscriptions += 1
      return () => undefined
    },
    setGameplayPreviewDemand: () => undefined,
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
    recoveryExportAvailable: () => this.recoveryAvailable,
    copyLastRecovery: async () => {
      this.copyCalls += 1
      return this.recoveryAvailable
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
        infinity: {
          points: 0n,
          spentPoints: 0n,
          availablePoints: 0n,
          secretsOfTheUniverse: 0n,
          permanentSkillPoints: 0n,
        },
        quantum: {
          pointsEarned: 0n,
          pointsSpent: 0n,
          availablePoints: 0n,
          permanentSecrets: 0n,
          influenceSpeedBonus: 0n,
          cashBonusLevels: 0n,
          scienceBonusLevels: 0n,
        },
        skills: {
          points: 0n,
          fragments: 0n,
        },
        time: {
          storedTimeAvailableSeconds: 1_800,
          storedTimeCapacitySeconds: 3_600,
          doubleTimeBankSeconds: 0,
        },
      },
      progression: {
        secretProgress: {
          step: 7,
          completed: true,
        },
        dyson: {
          facilities,
          totalPanelsDecayed: 0,
          botDistribution: 0,
          automation: {
            buyMode: 'buy-1',
            roundedBulkBuy: false,
          },
        },
        infinity: {
          automationUnlocked: {
            research: false,
            bots: false,
          },
        },
        quantum: {
          unlocks: {
            botMultitasking: false,
          },
        },
        skills: {
          byId: {},
          activeAutoAssignment: [],
          presets: [
            { name: 'Preset 1', skillIds: [], botDistribution: 0, colorId: 'cyan' },
            { name: 'Preset 2', skillIds: [], botDistribution: 0, colorId: 'orange' },
            { name: 'Preset 3', skillIds: [], botDistribution: 0, colorId: 'gold' },
            { name: 'Preset 4', skillIds: [], botDistribution: 0, colorId: 'rose' },
            { name: 'Preset 5', skillIds: [], botDistribution: 0, colorId: 'pink' },
          ],
          autoAssignNonRefundable: false,
          tabPresetAutomation: {
            bots: 0,
            research: 0,
          },
        },
      },
      derived: {
        dyson: {
          status: 'ready',
          value: {
            globals: {
              moneyMultiplier: 1,
              scienceMultiplier: 1,
              panelsPerSecond: 0,
              panelLifetimeSeconds: 10,
            },
            presentation: {
              facilities: {},
              activePanelMetric: {
                kind: 'active-panels',
                value: 0,
              },
              swarmVisualization: {
                phase: 'stellar-swarm',
                activePanels: 0,
                completion: 0,
              },
              currentGoal: {
                kind: 'create-bots',
                target: 10,
              },
            },
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
        infinity: {
          mode: 'ordinary',
          currentReward: 0n,
          navigationReward: null,
          progressFraction: 0,
          resetThresholdBots: 4.2e19,
          botsRemainingToReset: 4.2e19,
          currentRewardThresholdBots: null,
          nextRewardThresholdBots: null,
          botsRemainingToNextReward: null,
          breakTargetProgress: null,
          showRealityWarning: false,
        },
      },
      visibility: {
        dyson: {
          showTinker: true,
          visibleBasicFacilityIds: [],
          showNextTierTeaser: true,
        },
        skills: {
          routeUnlocked: false,
        },
        infinity: {
          routeUnlocked: false,
        },
        reality: {
          routeVisible: false,
          routeUnlocked: false,
          unlockProgress: {
            currentSecrets: 0n,
            requiredSecrets: 27n,
            fraction: 0,
          },
        },
        simulations: {
          routeUnlocked: false,
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
          'dyson.set-bot-distribution': {
            routeAvailable: true,
          },
          'dyson.set-buy-mode': {
            routeAvailable: true,
          },
          'dyson.set-rounded-bulk-buy': {
            routeAvailable: true,
          },
          'dyson.set-facility-automation': {
            routeAvailable: true,
          },
          'skill.set-tab-preset-automation': {
            routeAvailable: true,
          },
          'avocado.complete-meditation-step': {
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
