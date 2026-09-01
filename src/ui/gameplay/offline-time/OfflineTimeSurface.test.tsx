// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test } from 'vitest'
import {
  createCanonicalGameApplication,
} from '../../../application/canonicalGameApplication'
import {
  createCanonicalRuntimeSessionFactory,
} from '../../../application/canonicalRuntimeSession'
import {
  dehydrateGameState,
  hydrateGameState,
} from '../../../game-state/mapping'
import { SingleHostSessionWriterAuthority } from '../../../platform/singleHostSessionWriterAuthority'
import { prepareIdb1Save } from '../../../save/prepare'
import type {
  LegacySaveCandidate,
  SaveStorageAdapter,
} from '../../../save/repository'
import type { CanonicalEventTimeContext } from '../../../simulation/canonicalEventTimeModel'
import {
  createProductionEventContext,
} from '../../../simulation/productionEventContext'
import type {
  StoredTimeJobRequest,
  StoredTimeJobRunner,
  StoredTimeJobRunOptions,
} from '../../../workers/storedTime/storedTimeJobRunner'
import { StoredTimeSimulation } from '../../../workers/storedTime/storedTimeSimulation'
import type { StoredTimeJobTerminalMessage } from '../../../workers/storedTime/storedTimeProtocol'
import {
  createBrowserRuntimeFoundation,
  type BrowserUiRuntimeFoundation,
} from '../../runtime'
import {
  GAMEPLAY_ROUTE_STORAGE_KEY,
  ReadyDysonRuntimeHost,
} from '../dyson/ReadyDysonSlice'
import fixtureText from '../../../../test/fixtures/schema-08-canonical-idb1-main-save.txt?raw'

const preparedFixture = prepareIdb1Save(fixtureText).prepared

const activeRuntimes: BrowserUiRuntimeFoundation[] = []

afterEach(async () => {
  cleanup()
  localStorage.clear()
  await Promise.all(
    activeRuntimes.splice(0).map((runtime) => runtime.shutdown()),
  )
})

describe('Offline Time completion boundary through the UI runtime', () => {
  test('keeps pending confirmation dismissal separate from active processing', async () => {
    const { runtime } = await createRuntimeHarness()
    renderRuntime(runtime)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Spend 1m 0s' }),
    )
    expect(
      screen.getByRole('button', { name: 'Tap again to confirm' }),
    ).not.toBeNull()

    fireEvent.pointerDown(
      screen.getByRole('heading', { name: 'Stored Offline Time' }),
    )

    expect(screen.getByRole('button', { name: 'Spend 1m 0s' })).not.toBeNull()
    expect(runtime.storedTime?.status().kind).toBe('idle')
  })

  test('dismisses only the committed completion when its backdrop is activated', async () => {
    const { runtime, runner } = await createRuntimeHarness()
    renderRuntime(runtime)
    const before = runtime.snapshot()
    expect(before.phase).toBe('ready')
    if (before.phase !== 'ready') return
    const bankBefore =
      before.gameplay.resources.time.storedTimeAvailableSeconds

    await beginStoredTimeSpend()

    const processingDialog = await screen.findByRole('dialog', {
      name: 'Offline Time simulation progress',
    })
    const processingBackdrop = processingDialog.parentElement
    expect(processingBackdrop).not.toBeNull()

    fireEvent.pointerDown(processingBackdrop!, { pointerId: 1 })
    fireEvent.pointerUp(processingBackdrop!, { pointerId: 1 })
    fireEvent.click(processingBackdrop!)

    expect(runtime.storedTime?.status().kind).toBe('running')
    expect(
      screen.getByRole('dialog', {
        name: 'Offline Time simulation progress',
      }),
    ).not.toBeNull()

    runner.finish()

    const completionDialog = await screen.findByRole('dialog', {
      name: 'Offline Time Complete',
    })
    await waitFor(() => expect(runtime.storedTime?.status().kind).toBe('idle'))
    const snapshot = runtime.snapshot()
    expect(snapshot.phase).toBe('ready')
    if (snapshot.phase !== 'ready') return
    expect(snapshot.gameplay.resources.time.storedTimeAvailableSeconds).toBe(
      bankBefore - 60,
    )

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    expect(document.activeElement).toBe(continueButton)

    fireEvent.click(completionDialog)
    expect(
      screen.getByRole('dialog', { name: 'Offline Time Complete' }),
    ).not.toBeNull()

    const completionBackdrop = completionDialog.parentElement!
    fireEvent.pointerDown(completionDialog, { pointerId: 2 })
    fireEvent.pointerUp(completionBackdrop, { pointerId: 2 })
    fireEvent.click(completionBackdrop)
    expect(
      screen.getByRole('dialog', { name: 'Offline Time Complete' }),
    ).not.toBeNull()

    fireEvent.pointerDown(completionBackdrop, { pointerId: 3 })
    fireEvent.pointerUp(completionDialog, { pointerId: 3 })
    fireEvent.click(completionBackdrop)
    expect(
      screen.getByRole('dialog', { name: 'Offline Time Complete' }),
    ).not.toBeNull()

    fireEvent.pointerDown(completionBackdrop, { pointerId: 4 })
    fireEvent.pointerUp(completionBackdrop, { pointerId: 4 })
    fireEvent.click(completionBackdrop)

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Offline Time Complete' }),
      ).toBeNull()
    })
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Spend Again: 1m 0s' }),
    )
  })

  test('retains the explicit keyboard and screen-reader completion control', async () => {
    const { runtime, runner } = await createRuntimeHarness()
    renderRuntime(runtime)

    await beginStoredTimeSpend()
    await screen.findByRole('dialog', {
      name: 'Offline Time simulation progress',
    })
    runner.finish()

    const continueButton = await screen.findByRole('button', {
      name: 'Continue',
    })
    await waitFor(() => expect(document.activeElement).toBe(continueButton))
    fireEvent.click(continueButton)

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Offline Time Complete' }),
      ).toBeNull()
    })
  })
})

async function beginStoredTimeSpend(): Promise<void> {
  const spend = await screen.findByRole('button', { name: 'Spend 1m 0s' })
  fireEvent.click(spend)
  const confirmation = screen.getByRole('button', {
    name: 'Tap again to confirm',
  })
  fireEvent.click(confirmation)
}

function renderRuntime(runtime: BrowserUiRuntimeFoundation): void {
  localStorage.setItem(GAMEPLAY_ROUTE_STORAGE_KEY, 'offline-time')
  render(
    <IntlProvider locale="en" messages={{}} onError={() => undefined}>
      <ReadyDysonRuntimeHost runtime={runtime} locale="en" />
    </IntlProvider>,
  )
}

async function createRuntimeHarness(): Promise<{
  readonly runtime: BrowserUiRuntimeFoundation
  readonly runner: ControlledStoredTimeJobRunner
}> {
  const hydrated = hydrateGameState(preparedFixture)
  const candidate = {
    ...structuredClone(hydrated.state),
    timeline: {
      ...hydrated.state.timeline,
      eventClockInitialized: true,
      automationTimeUntilNextEvent: 1,
      storedTimeAvailableSeconds: 600,
      storedTimeCapacitySeconds: 86_400,
    },
  }
  const dehydrated = dehydrateGameState(hydrated, candidate)
  const startingRecord = dehydrated.copyValidatedState()
  startingRecord.cheater = false
  const startingSave = dehydrated.withValidatedState(startingRecord)
  const storage = new MemorySaveStorage()
  const eventContext = createProductionEventContext()
  const runner = new ControlledStoredTimeJobRunner(eventContext)
  const runtime = createBrowserRuntimeFoundation({
    createApplication: (repository) => createCanonicalGameApplication({
      repository,
      startupResolver: {
        resolve: async () => ({
          kind: 'ready',
          source: 'primary',
          save: startingSave,
        }),
      },
      sessionFactory: createCanonicalRuntimeSessionFactory({
        entitlements: { permanentDoubleIp: false },
      }),
      engine: { eventContext },
      storedTimeJobRunner: runner,
    }),
    lifecyclePolicy: {
      saveOnPause: false,
      saveOnFocusLoss: false,
      replayOnFocusGain: false,
    },
    allowedExternalOrigins: [],
    saveStorage: storage,
    saveRepositoryPaths: {
      current: '/current',
      temporary: '/current.tmp',
      legacyRecovery: '/recovery/original.idsw',
    },
    allowCanonicalPlayerWrites: true,
    writerAuthority: new SingleHostSessionWriterAuthority({
      sessionId: 'offline-time-completion-test',
    }),
    lifecycle: {
      currentPhase: () => 'background',
      subscribe: () => () => undefined,
    },
    lifecycleClock: {
      sample: () => ({
        utcMilliseconds: Date.UTC(2026, 8, 1),
        serializedUtcText: '2026-09-01T00:00:00.000Z',
      }),
    },
  })
  activeRuntimes.push(runtime)
  await expect(runtime.start()).resolves.toMatchObject({ phase: 'ready' })
  return { runtime, runner }
}

class ControlledStoredTimeJobRunner implements StoredTimeJobRunner {
  private readonly eventContext: Readonly<CanonicalEventTimeContext>
  private finishPending: (() => void) | undefined

  constructor(eventContext: Readonly<CanonicalEventTimeContext>) {
    this.eventContext = eventContext
  }

  run(
    request: Readonly<StoredTimeJobRequest>,
    options: Readonly<StoredTimeJobRunOptions> = {},
  ): Promise<StoredTimeJobTerminalMessage> {
    const simulation = new StoredTimeSimulation({
      jobId: request.jobId,
      state: request.state,
      requestedSeconds: request.requestedSeconds,
      infinityMinimumCycleSeconds: request.infinityMinimumCycleSeconds,
      eventContext: this.eventContext,
    })
    options.onProgress?.(simulation.progress())
    return new Promise((resolve) => {
      this.finishPending = () => {
        const terminal = simulation.step(Number.POSITIVE_INFINITY, false)
        if (terminal === null) {
          throw new Error('Controlled Stored Time simulation did not finish.')
        }
        options.onProgress?.(simulation.progress())
        resolve(terminal)
      }
    })
  }

  finish(): void {
    const finish = this.finishPending
    if (finish === undefined) {
      throw new Error('No Stored Time job is waiting to finish.')
    }
    this.finishPending = undefined
    finish()
  }

  dispose(): void {
    this.finishPending = undefined
  }
}

class MemorySaveStorage implements SaveStorageAdapter {
  private readonly files = new Map<string, string>()

  async exists(path: string): Promise<boolean> {
    return this.files.has(path)
  }

  async readText(path: string): Promise<string> {
    const value = this.files.get(path)
    if (value === undefined) throw new Error(`Missing ${path}`)
    return value
  }

  async writeText(path: string, contents: string): Promise<void> {
    this.files.set(path, contents)
  }

  async replaceAtomically(
    temporaryPath: string,
    destinationPath: string,
  ): Promise<void> {
    this.files.set(destinationPath, await this.readText(temporaryPath))
    this.files.delete(temporaryPath)
  }

  async copy(sourcePath: string, destinationPath: string): Promise<void> {
    this.files.set(destinationPath, await this.readText(sourcePath))
  }

  async discoverLegacyCandidates(): Promise<readonly LegacySaveCandidate[]> {
    return []
  }

  async retainLegacyCandidate(
    text: string,
    id = `manual-${this.files.size}`,
  ): Promise<LegacySaveCandidate> {
    const sourcePath = `/recovery/${id}.idsw`
    this.files.set(sourcePath, text)
    return { id, sourcePath, text }
  }
}
