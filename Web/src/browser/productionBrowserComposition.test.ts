import { describe, expect, test } from 'vitest'
import type {
  FirstLaunchMigrationResult,
  SaveCommitTarget,
  SaveRepository,
} from '../save/repository'
import type { PreparedSave } from '../save/prepare'
import {
  WEB_LIFECYCLE_POLICY,
} from '../simulation/lifecycleAwayTime'
import type {
  BrowserRuntimeFoundationOptions,
  BrowserUiRuntimeFoundation,
} from '../ui/runtime'
import {
  createProductionBrowserComposition,
} from './productionBrowserComposition'
import type { ReleasePlatformServices } from '../platform/releaseFoundation'

describe('production browser composition', () => {
  test('loads native verified ownership before constructing canonical gameplay', async () => {
    let captured: Readonly<BrowserRuntimeFoundationOptions> | undefined
    const runtime = Object.freeze({}) as BrowserUiRuntimeFoundation
    createProductionBrowserComposition({
      developmentBuild: false,
      entitlementDocument: entitlementDocument('false'),
      releasePlatformServices: {
        hostKind: 'mobile-native',
        entitlements: {
          readOwnership: async () => ({
            doubleInfinityPoints: true,
            developerOptions: true,
          }),
          refreshOwnership: async () => ({
            doubleInfinityPoints: true,
            developerOptions: true,
          }),
        },
      } as unknown as ReleasePlatformServices,
      createRuntime: (options) => {
        captured = options
        return runtime
      },
    })
    expect(captured?.developmentControlsAvailable).toBe(true)
    expect(captured?.developmentControlsRequireEntitlement).toBe(true)
    await captured?.hostEntitlements?.initialize()
    const started = await captured?.createApplication(
      new FirstRunRepository(),
    ).start()
    expect(started).toMatchObject({
      phase: 'ready',
      state: {
        entitlements: { permanentDoubleIp: true },
      },
    })
  })

  test('keeps developer controls free in a development build with browser platform services', () => {
    let captured: Readonly<BrowserRuntimeFoundationOptions> | undefined
    const runtime = Object.freeze({}) as BrowserUiRuntimeFoundation

    createProductionBrowserComposition({
      developmentBuild: true,
      entitlementDocument: entitlementDocument('false'),
      releasePlatformServices: {
        hostKind: 'web',
        entitlements: {
          readOwnership: async () => ({
            doubleInfinityPoints: false,
            developerOptions: false,
          }),
          refreshOwnership: async () => ({
            doubleInfinityPoints: false,
            developerOptions: false,
          }),
        },
      } as unknown as ReleasePlatformServices,
      createRuntime: (options) => {
        captured = options
        return runtime
      },
    })

    expect(captured?.developmentControlsAvailable).toBe(true)
    expect(captured?.developmentControlsRequireEntitlement).toBe(false)
  })

  test('binds authentic first-run data, explicit host authority, and shared browser clocks outside React', async () => {
    const lifecycleClock = new RecordingLifecycleClock(
      '2026-07-29T03:04:05.000Z',
    )
    const monotonicClock = {
      nowMilliseconds: () => 123,
    }
    let captured:
      | Readonly<BrowserRuntimeFoundationOptions>
      | undefined
    const runtime = Object.freeze({
      marker: 'runtime-facade',
    }) as unknown as BrowserUiRuntimeFoundation

    const composition = createProductionBrowserComposition({
      lifecycleClock,
      monotonicClock,
      entitlementDocument: entitlementDocument('false'),
      writerIdentity: {
        ownerToken: 'reload-tab',
        allowUnexpiredSameOwnerTakeover: true,
      },
      createRuntime: (options) => {
        captured = options
        return runtime
      },
    })

    expect(composition.runtime).toBe(runtime)
    expect(composition.saveSchemaVersion).toBe(12)
    expect(captured).toBeDefined()
    if (captured === undefined) return
    expect(captured.lifecyclePolicy).toBe(WEB_LIFECYCLE_POLICY)
    expect(captured.allowedExternalOrigins).toEqual([])
    expect(captured.lifecycleClock).toBe(lifecycleClock)
    expect(captured.activeTimeClock).toBe(monotonicClock)
    expect(captured.ownerToken).toBe('reload-tab')
    expect(captured.allowUnexpiredSameOwnerTakeover).toBe(true)
    expect(captured.databaseName).toBeUndefined()
    expect(captured.profileId).toBeUndefined()
    expect(lifecycleClock.samples).toBe(0)

    const repository = new FirstRunRepository()
    const application = captured.createApplication(repository)
    const started = await application.start()
    expect(started).toMatchObject({
      phase: 'ready',
      source: 'first-run',
    })
    if (started.phase !== 'ready') return
    expect(
      started.state.gameState.meta.createdAtLegacyText,
    ).toBe('2026-07-29T03:04:05.000Z')
    expect(started.state.entitlements).toEqual({
      permanentDoubleIp: false,
    })
    expect(repository.commitTargets).toEqual(['development'])
    expect(lifecycleClock.samples).toBe(1)

    expect(composition.sampleUtc()).toBe(
      '2026-07-29T03:04:05.000Z',
    )
    expect(captured.nowUtcMilliseconds?.()).toBe(
      Date.parse('2026-07-29T03:04:05.000Z'),
    )
    expect(lifecycleClock.samples).toBe(3)
  })

  test('replaces the current session with the canonical Unity first-run save through the runtime', async () => {
    let resetRequest:
      | Parameters<BrowserUiRuntimeFoundation['importSave']>[0]
      | undefined
    const runtime = Object.freeze({
      importSave: async (
        request: Parameters<
          BrowserUiRuntimeFoundation['importSave']
        >[0],
      ) => {
        resetRequest = request
        return {
          imported: true,
          sessionRevision: 2,
          recoveryAvailable: true,
          lifecycleReset: true,
        } as const
      },
    }) as unknown as BrowserUiRuntimeFoundation
    const composition = createProductionBrowserComposition({
      lifecycleClock: new RecordingLifecycleClock(
        '2026-07-29T03:04:05.000Z',
      ),
      entitlementDocument: entitlementDocument('false'),
      createRuntime: () => runtime,
    })

    await expect(composition.resetSave()).resolves.toMatchObject({
      imported: true,
      lifecycleReset: true,
    })
    expect(resetRequest).toMatchObject({
      source: 'paste',
      importedAtUtc: '2026-07-29T03:04:05.000Z',
      overwriteApproved: true,
    })
    expect(resetRequest?.text).toMatch(/^IDSWEB1:/)
  })

  test('reloads only after a verified checkpoint and orderly shutdown', async () => {
    const events: string[] = []
    const runtime = reloadRuntime({
      status: readyStatus(),
      checkpoint: async () => {
        events.push('checkpoint')
        return true
      },
      shutdown: async () => {
        events.push('shutdown')
      },
    })
    const composition = createProductionBrowserComposition({
      entitlementDocument: entitlementDocument('false'),
      createRuntime: () => runtime,
      reloadPage: () => events.push('reload'),
    })

    await expect(composition.reloadSafely()).resolves.toBeUndefined()
    expect(events).toEqual(['checkpoint', 'shutdown', 'reload'])
  })

  test('prepares an accepted package update without reloading before its worker activates', async () => {
    const events: string[] = []
    const runtime = reloadRuntime({
      status: readyStatus(),
      checkpoint: async () => {
        events.push('checkpoint')
        return true
      },
      shutdown: async () => {
        events.push('shutdown')
      },
    })
    const composition = createProductionBrowserComposition({
      entitlementDocument: entitlementDocument('false'),
      createRuntime: () => runtime,
      reloadPage: () => events.push('reload'),
    })

    await expect(
      composition.prepareForUpdateActivation(),
    ).resolves.toBeUndefined()
    expect(events).toEqual(['checkpoint', 'shutdown'])
  })

  test('does not activate a package update from a recovery state without a verified checkpoint', async () => {
    const events: string[] = []
    const runtime = reloadRuntime({
      status: {
        phase: 'blocked',
        code: 'application-blocked',
        reason: 'startup unavailable',
      },
      checkpoint: async () => {
        events.push('checkpoint')
        return false
      },
      shutdown: async () => {
        events.push('shutdown')
      },
    })
    const composition = createProductionBrowserComposition({
      entitlementDocument: entitlementDocument('false'),
      createRuntime: () => runtime,
    })

    await expect(
      composition.prepareForUpdateActivation(),
    ).rejects.toThrow('ready runtime and verified checkpoint')
    expect(events).toEqual([])
  })

  test('keeps the current session alive when the safe-reload checkpoint is not verified', async () => {
    const events: string[] = []
    const runtime = reloadRuntime({
      status: readyStatus(),
      checkpoint: async () => {
        events.push('checkpoint')
        return false
      },
      shutdown: async () => {
        events.push('shutdown')
      },
    })
    const composition = createProductionBrowserComposition({
      entitlementDocument: entitlementDocument('false'),
      createRuntime: () => runtime,
      reloadPage: () => events.push('reload'),
    })

    await expect(composition.reloadSafely()).rejects.toThrow(
      'verified checkpoint',
    )
    expect(events).toEqual(['checkpoint'])
  })

  test('propagates a handled checkpoint failure without shutdown or reload', async () => {
    const events: string[] = []
    const runtime = reloadRuntime({
      status: readyStatus(),
      checkpoint: async () => {
        events.push('checkpoint')
        throw new Error('private checkpoint failure')
      },
      shutdown: async () => {
        events.push('shutdown')
      },
    })
    const composition = createProductionBrowserComposition({
      entitlementDocument: entitlementDocument('false'),
      createRuntime: () => runtime,
      reloadPage: () => events.push('reload'),
    })

    await expect(composition.reloadSafely()).rejects.toThrow(
      'private checkpoint failure',
    )
    expect(events).toEqual(['checkpoint'])
  })

  test.each([
    {
      name: 'writer-blocked',
      status: {
        phase: 'blocked',
        code: 'writer-owned',
        reason: 'another owner',
      },
    },
    {
      name: 'application-blocked',
      status: {
        phase: 'blocked',
        code: 'application-blocked',
        reason: 'startup unavailable',
      },
    },
    {
      name: 'ownership-lost',
      status: {
        phase: 'ownership-lost',
        reason: 'lease replaced',
      },
    },
  ] as const)(
    'allows $name recovery reload without inventing a checkpoint',
    async ({ status }) => {
      const events: string[] = []
      const runtime = reloadRuntime({
        status,
        checkpoint: async () => {
          events.push('checkpoint')
          return false
        },
        shutdown: async () => {
          events.push('shutdown')
        },
      })
      const composition = createProductionBrowserComposition({
        entitlementDocument: entitlementDocument('false'),
        createRuntime: () => runtime,
        reloadPage: () => events.push('reload'),
      })

      await expect(composition.reloadSafely()).resolves.toBeUndefined()
      expect(events).toEqual(['shutdown', 'reload'])
    },
  )

  test('begins non-ready shutdown before a queued ready transition can race the bypass', async () => {
    const events: string[] = []
    let status: ReturnType<BrowserUiRuntimeFoundation['status']> = {
      phase: 'blocked',
      code: 'writer-owned',
      reason: 'another owner',
    }
    const runtime = Object.freeze({
      status: () => status,
      checkpointBeforeSafeReload: async () => {
        events.push('checkpoint')
        return false
      },
      shutdown: async () => {
        events.push(`shutdown:${status.phase}`)
      },
    }) as unknown as BrowserUiRuntimeFoundation
    const composition = createProductionBrowserComposition({
      entitlementDocument: entitlementDocument('false'),
      createRuntime: () => runtime,
      reloadPage: () => events.push('reload'),
    })
    const queuedReady = Promise.resolve().then(() => {
      status = readyStatus()
      events.push('ready-transition')
    })

    await composition.reloadSafely()
    await queuedReady

    expect(events).toEqual([
      'shutdown:blocked',
      'ready-transition',
      'reload',
    ])
  })
})

class RecordingLifecycleClock {
  readonly #serializedUtcText: string
  samples = 0

  constructor(serializedUtcText: string) {
    this.#serializedUtcText = serializedUtcText
  }

  sample() {
    this.samples += 1
    return Object.freeze({
      utcMilliseconds: Date.parse(this.#serializedUtcText),
      serializedUtcText: this.#serializedUtcText,
    })
  }
}

class FirstRunRepository implements SaveRepository {
  readonly commitTargets: SaveCommitTarget[] = []

  async hasCurrent(): Promise<boolean> {
    return false
  }

  async loadCurrent(): Promise<null> {
    return null
  }

  async migrateLegacyOnFirstLaunch():
    Promise<FirstLaunchMigrationResult> {
    return { status: 'no-legacy-save' }
  }

  async commit(
    save: PreparedSave,
    target: SaveCommitTarget = 'development',
  ): Promise<PreparedSave> {
    this.commitTargets.push(target)
    return save
  }
}

function entitlementDocument(content: string) {
  return {
    querySelectorAll: () => [
      {
        getAttribute: (name: string) =>
          name === 'content' ? content : null,
      },
    ],
  }
}

function reloadRuntime(operations: {
  readonly status: ReturnType<BrowserUiRuntimeFoundation['status']>
  readonly checkpoint: () => Promise<boolean>
  readonly shutdown: () => Promise<void>
}): BrowserUiRuntimeFoundation {
  return Object.freeze({
    status: () => operations.status,
    checkpointBeforeSafeReload: operations.checkpoint,
    shutdown: operations.shutdown,
  }) as unknown as BrowserUiRuntimeFoundation
}

function readyStatus(): ReturnType<BrowserUiRuntimeFoundation['status']> {
  return Object.freeze({ phase: 'ready', warnings: [] })
}
