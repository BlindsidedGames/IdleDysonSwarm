import { describe, expect, test, vi } from 'vitest'
import {
  createProductionNativeComposition,
} from '../native/productionNativeComposition'
import {
  createProductionHostComposition,
} from '../productionHostComposition'
import type {
  HostEntitlementOwnership,
  StoreProductId,
} from '../store/contracts'
import { PortableSaveRepository } from '../save/repository'
import {
  recoverTransitionalV2CheckpointWithMetadata,
} from '../save/transitionalV2Checkpoint'
import {
  createBrowserRuntimeFoundation,
  type BrowserRuntimeFoundationOptions,
  type BrowserUiRuntimeFoundation,
} from '../ui/runtime'
import {
  isLifecyclePhase,
  LIFECYCLE_PHASES,
} from './contracts'
import {
  CapacitorNativeHostBridge,
  createNativeHostEnvironment,
  type CapacitorNativeHostPlugin,
  type NativeHostBridgeApi,
} from './nativeHostBridge'
import {
  SingleHostSessionWriterAuthority,
} from './singleHostSessionWriterAuthority'
import { NATIVE_WEB_SAVE_PATHS } from './platformSaveStorage'
import {
  MOBILE_LIFECYCLE_POLICY,
  WEB_LIFECYCLE_POLICY,
} from '../simulation/lifecycleAwayTime'

describe('native host bootstrap boundary', () => {
  test('recognizes only canonical lifecycle phases', () => {
    expect(LIFECYCLE_PHASES).toEqual([
      'active',
      'background',
      'focus-lost',
      'terminating',
    ])
    expect(LIFECYCLE_PHASES.every(isLifecyclePhase)).toBe(true)
    expect(isLifecyclePhase('suspended')).toBe(false)
    expect(isLifecyclePhase(null)).toBe(false)
  })

  test('remains conservatively backgrounded past the bootstrap timeout until reconciliation proves active', async () => {
    vi.useFakeTimers()
    const currentLifecycle = deferred<{ phase: 'active' }>()
    const plugin = {
      addListener: vi.fn(async () => ({
        remove: async () => undefined,
      })),
      currentLifecycle: vi.fn(() => currentLifecycle.promise),
    } as unknown as CapacitorNativeHostPlugin
    const bridge = new CapacitorNativeHostBridge('android', plugin)
    const observed: string[] = []
    bridge.subscribeLifecycle((phase) => observed.push(phase))

    await vi.advanceTimersByTimeAsync(2_000)
    expect(bridge.currentLifecyclePhase()).toBe('background')
    expect(observed).toEqual([])

    currentLifecycle.resolve({ phase: 'active' })
    await bridge.ready()
    expect(bridge.currentLifecyclePhase()).toBe('active')
    expect(observed).toEqual(['active'])
    vi.useRealTimers()
  })

  test('subscribes before querying and prevents a stale lifecycle query from overwriting a newer event', async () => {
    const listenerRegistered = deferred<{
      remove(): Promise<void>
    }>()
    const currentLifecycle = deferred<{ phase: 'active' }>()
    let publishNativePhase:
      | ((event: { phase: 'background' }) => void)
      | undefined
    const plugin = {
      addListener: vi.fn((eventName, listener) => {
        expect(eventName).toBe('lifecycleChanged')
        publishNativePhase = listener as typeof publishNativePhase
        return listenerRegistered.promise
      }),
      currentLifecycle: vi.fn(() => currentLifecycle.promise),
    } as unknown as CapacitorNativeHostPlugin
    const bridge = new CapacitorNativeHostBridge('android', plugin)
    const observed: string[] = []
    bridge.subscribeLifecycle((phase) => observed.push(phase))

    expect(plugin.currentLifecycle).not.toHaveBeenCalled()
    listenerRegistered.resolve({ remove: async () => undefined })
    await Promise.resolve()
    expect(plugin.currentLifecycle).toHaveBeenCalledOnce()

    publishNativePhase?.({ phase: 'background' })
    currentLifecycle.resolve({ phase: 'active' })
    await bridge.ready()

    expect(bridge.currentLifecyclePhase()).toBe('background')
    expect(observed).toEqual([])
  })

  test('does not duplicate a delayed current-state reconciliation that matches the conservative phase', async () => {
    const currentLifecycle = deferred<{ phase: 'background' }>()
    const plugin = {
      addListener: vi.fn(async () => ({
        remove: async () => undefined,
      })),
      currentLifecycle: vi.fn(() => currentLifecycle.promise),
    } as unknown as CapacitorNativeHostPlugin
    const bridge = new CapacitorNativeHostBridge('ios', plugin)
    const observed: string[] = []
    bridge.subscribeLifecycle((phase) => observed.push(phase))
    await Promise.resolve()
    currentLifecycle.resolve({ phase: 'background' })
    await bridge.ready()

    expect(bridge.currentLifecyclePhase()).toBe('background')
    expect(observed).toEqual([])
  })

  test('keeps the subscribed lifecycle stream when the current-state query fails', async () => {
    let publishNativePhase:
      | ((event: { phase: 'focus-lost' }) => void)
      | undefined
    const plugin = {
      addListener: vi.fn(async (_eventName, listener) => {
        publishNativePhase = listener as typeof publishNativePhase
        return { remove: async () => undefined }
      }),
      currentLifecycle: vi.fn(async () => {
        throw new Error('query unavailable')
      }),
    } as unknown as CapacitorNativeHostPlugin
    const bridge = new CapacitorNativeHostBridge('ios', plugin)
    const observed: string[] = []
    bridge.subscribeLifecycle((phase) => observed.push(phase))
    await bridge.ready()

    publishNativePhase?.({ phase: 'focus-lost' })
    expect(bridge.currentLifecyclePhase()).toBe('focus-lost')
    expect(observed).toEqual(['focus-lost'])
  })

  test('selects native before constructing browser persistence', () => {
    const browser = vi.fn(() => {
      throw new Error('browser composition must remain unopened')
    })
    const nativeRuntime = Object.freeze({}) as BrowserUiRuntimeFoundation
    const bridge = fakeBridge()
    const composition = createProductionHostComposition({
      detectNativeBridge: () => bridge,
      createBrowserComposition: browser,
      createNativeComposition: () => ({
        hostKind: 'desktop-native',
        runtime: nativeRuntime,
        releasePlatformServices:
          createNativeHostEnvironment(bridge).releasePlatformServices,
        saveSchemaVersion: 12,
        sampleUtc: () => '2026-08-02T00:00:00.000Z',
        resetSave: vi.fn(),
        prepareForSafeReload: vi.fn(),
        reloadSafely: vi.fn(),
      }),
    })

    expect(browser).not.toHaveBeenCalled()
    expect(composition.hostKind).toBe('desktop-native')
    expect(composition.pwaUpdatesAvailable).toBe(false)
    expect(composition.releasePlatformServices?.hostKind)
      .toBe('desktop-native')
  })

  test('injects rooted native saves, lifecycle and Store services into the native graph', async () => {
    const bridge = fakeBridge()
    const environment = createNativeHostEnvironment(bridge)
    let captured: Readonly<BrowserRuntimeFoundationOptions> | undefined
    const runtime = Object.freeze({}) as BrowserUiRuntimeFoundation
    const composition = createProductionNativeComposition(
      environment,
      {
        createRuntime: (options) => {
          captured = options
          return runtime
        },
      },
    )

    expect(composition.runtime).toBe(runtime)
    expect(captured?.database).toBeUndefined()
    expect(captured?.writerAuthority).toBeInstanceOf(
      SingleHostSessionWriterAuthority,
    )
    expect(captured?.saveRepositoryPaths).toBe(
      NATIVE_WEB_SAVE_PATHS,
    )
    expect(captured?.allowCanonicalPlayerWrites).toBe(true)
    expect(captured?.recoverTransitionalCheckpoint).toBe(
      recoverTransitionalV2CheckpointWithMetadata,
    )
    expect(NATIVE_WEB_SAVE_PATHS.retainedRecoverySources).toEqual([
      'save/recovery/import-original.idsw',
      'save/recovery/pre-schema13-original.idsw',
    ])
    expect(NATIVE_WEB_SAVE_PATHS.backups).toEqual([
      'backups/idle_dyson_swarm_web_save.1.idsw',
      'backups/idle_dyson_swarm_web_save.2.idsw',
      'backups/idle_dyson_swarm_web_save.3.idsw',
    ])
    expect(NATIVE_WEB_SAVE_PATHS.transitionalRecoverySources)
      .toBeUndefined()
    expect(NATIVE_WEB_SAVE_PATHS.transitionalStoredTimePolicy).toBe(
      'save/local/stored-time-policy.json',
    )
    expect(NATIVE_WEB_SAVE_PATHS.transitionalStoredTimeJob).toBe(
      'save/stored-time/job.json',
    )
    expect(captured?.lifecycle).toBe(environment.lifecycle)
    expect(captured?.lifecyclePolicy).toBe(WEB_LIFECYCLE_POLICY)
    await captured?.saveStorage?.writeText(
      NATIVE_WEB_SAVE_PATHS.temporary,
      'IDSWEB1:native',
    )
    expect(bridge.writeText).toHaveBeenCalledWith(
      NATIVE_WEB_SAVE_PATHS.temporary,
      'IDSWEB1:native',
    )
    await expect(
      environment.releasePlatformServices.store.products(),
    ).resolves.toHaveLength(5)
    await expect(
      environment.releasePlatformServices.entitlements.readOwnership(),
    ).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: false,
    })
  })

  test('preserves five independent Skill presets through a mobile-native runtime checkpoint, reload, export, and import', async () => {
    const bridge = {
      ...fakeBridge(),
      target: 'android' as const,
    } satisfies NativeHostBridgeApi
    const layouts = [
      ['banking'],
      ['avocados'],
      ['startHereTree'],
      ['manualLabour'],
      ['fragmentAssembly'],
    ] as const
    const createComposition = () =>
      createProductionNativeComposition(
        createNativeHostEnvironment(bridge),
        {
          lifecycleClock: {
            sample: () => ({
              utcMilliseconds: 1_000,
              serializedUtcText: '1970-01-01T00:00:01.000Z',
            }),
          },
          monotonicClock: { nowMilliseconds: () => 0 },
          createRuntime: (options) =>
            createBrowserRuntimeFoundation({
              ...options,
              activeTimeScheduler: {
                requestFrame: () => 1,
                cancelFrame: () => undefined,
              },
              checkpointScheduler: {
                setInterval: () => 1,
                clearInterval: () => undefined,
              },
              nowUtcMilliseconds: () => 1_000,
              storageManager: {
                persisted: async () => true,
                persist: async () => true,
                estimate: async () => ({ usage: 1, quota: 1_000 }),
              },
            }),
        },
      )

    const first = createComposition()
    await expect(first.runtime.start()).resolves.toMatchObject({
      phase: 'ready',
    })
    for (let index = 0; index < layouts.length; index += 1) {
      await expect(
        first.runtime.dispatchPlayer({
          kind: 'skill.set-preset-assignment',
          slot: (index + 1) as 1 | 2 | 3 | 4 | 5,
          skillIds: layouts[index],
        }),
      ).resolves.toMatchObject({ status: 'accepted' })
    }
    await expect(
      first.runtime.dispatchPlayer({
        kind: 'skill.select-preset',
        slot: 4,
      }),
    ).resolves.toMatchObject({ status: 'accepted' })
    await expect(first.runtime.requestCheckpoint()).resolves.toBe(true)
    const exported = await first.runtime.readCurrentSaveExport()
    expect(exported).toMatchObject({ basis: 'current' })
    await first.runtime.shutdown()

    const reconstructed = createComposition()
    await expect(reconstructed.runtime.start()).resolves.toMatchObject({
      phase: 'ready',
      warnings: [],
    })
    assertPersistedSkillPresets(reconstructed.runtime, layouts, 4)

    await expect(
      reconstructed.runtime.dispatchPlayer({
        kind: 'skill.set-preset-assignment',
        slot: 2,
        skillIds: [],
      }),
    ).resolves.toMatchObject({ status: 'accepted' })
    expect(exported).not.toBeNull()
    if (exported === null) return
    await expect(
      reconstructed.runtime.importSave({
        source: 'paste',
        text: exported.text,
        importedAtUtc: '1970-01-01T00:00:01.000Z',
        overwriteApproved: true,
      }),
    ).resolves.toMatchObject({ imported: true })
    assertPersistedSkillPresets(reconstructed.runtime, layouts, 4)
    await reconstructed.runtime.shutdown()
  })

  test('uses the mobile checkpoint policy for Android and iOS hosts', () => {
    for (const target of ['android', 'ios'] as const) {
      const bridge = { ...fakeBridge(), target }
      let captured: Readonly<BrowserRuntimeFoundationOptions> | undefined

      createProductionNativeComposition(
        createNativeHostEnvironment(bridge),
        {
          createRuntime: (options) => {
            captured = options
            return Object.freeze({}) as BrowserUiRuntimeFoundation
          },
        },
      )

      expect(captured?.lifecyclePolicy).toBe(MOBILE_LIFECYCLE_POLICY)
    }
  })

  test('normalizes a partial native catalog without inventing availability', async () => {
    const bridge = fakeBridge()
    bridge.storeProducts.mockResolvedValue([{
      productId: 'ids.doubleip',
      localizedPrice: '$1.99',
      available: true,
    }])
    const services = createNativeHostEnvironment(
      bridge,
    ).releasePlatformServices

    await expect(services.store.products()).resolves.toEqual([
      { productId: 'ids.tiptier1', localizedPrice: null, available: false },
      { productId: 'ids.tiptier2', localizedPrice: null, available: false },
      { productId: 'ids.tiptier3', localizedPrice: null, available: false },
      { productId: 'ids.devoptions', localizedPrice: null, available: false },
      { productId: 'ids.doubleip', localizedPrice: '$1.99', available: true },
    ])
  })

  test('normalizes missing native entitlement fields fail closed', async () => {
    const bridge = fakeBridge()
    bridge.readEntitlements.mockResolvedValue({
      developerOptions: true,
    } as HostEntitlementOwnership)
    const services = createNativeHostEnvironment(
      bridge,
    ).releasePlatformServices

    await expect(services.entitlements.readOwnership()).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: true,
      supporterCatGallery: false,
    })
  })

  test('installs a native termination handshake that checkpoints and shuts down', async () => {
    let terminationHandler: (() => Promise<boolean>) | undefined
    const bridge = {
      ...fakeBridge(),
      installTerminationCheckpoint: vi.fn((handler: () => Promise<boolean>) => {
        terminationHandler = handler
        return () => undefined
      }),
    } satisfies NativeHostBridgeApi
    const runtime = {
      status: vi.fn(() => ({ phase: 'ready', warnings: [] } as const)),
      checkpointBeforeSafeReload: vi.fn(async () => true),
      shutdown: vi.fn(async () => undefined),
    } as unknown as BrowserUiRuntimeFoundation

    createProductionNativeComposition(
      createNativeHostEnvironment(bridge),
      { createRuntime: () => runtime },
    )

    await expect(terminationHandler?.()).resolves.toBe(true)
    expect(runtime.checkpointBeforeSafeReload).toHaveBeenCalledOnce()
    expect(runtime.shutdown).toHaveBeenCalledOnce()
  })

  test('routes same-device Unity purchase evidence only through a capable native host', async () => {
    const promote = vi.fn(async () => undefined)
    const bridge = {
      ...fakeBridge(),
      target: 'android' as const,
      promoteAutomaticUnityPurchaseEvidence: promote,
    } satisfies NativeHostBridgeApi
    let captured: Readonly<BrowserRuntimeFoundationOptions> | undefined

    createProductionNativeComposition(
      createNativeHostEnvironment(bridge),
      {
        createRuntime: (options) => {
          captured = options
          return Object.freeze({}) as BrowserUiRuntimeFoundation
        },
      },
    )

    const evidence = Object.freeze({
      kind: 'automatic-same-device-unity' as const,
      platform: 'android' as const,
      sourceClass: 'unity-persistent-data-save' as const,
      opaqueSourceIdentifier: 'android-unity-save',
      pathClass: 'capacitor-external-files' as const,
      permanentDoubleInfinityPoints: true,
      contentSha256: 'a'.repeat(64),
      saveSchemaVersion: 11,
    })
    await captured?.automaticPurchaseEvidencePromoter
      ?.promoteAutomaticUnityPurchaseEvidence(evidence)

    expect(promote).toHaveBeenCalledWith(evidence)
  })

  test('migrates a paid mobile Unity candidate whose one-use token binds every layer', async () => {
    const token = '8f8ca502-4cb2-4a34-8ede-2c4d04ca7141'
    const promote = vi.fn(async () => undefined)
    const bridge = {
      ...fakeBridge(),
      target: 'android' as const,
      discoverUnitySaves: vi.fn(async () => [Object.freeze({
        id: token,
        text: 'native-unity-paid-save',
        provenance: Object.freeze({
          kind: 'automatic-same-device-unity' as const,
          platform: 'android' as const,
          sourceClass: 'unity-persistent-data-save' as const,
          opaqueSourceIdentifier: token,
          pathClass: 'capacitor-external-files' as const,
        }),
      })]),
      promoteAutomaticUnityPurchaseEvidence: promote,
    } satisfies NativeHostBridgeApi
    let captured: Readonly<BrowserRuntimeFoundationOptions> | undefined

    createProductionNativeComposition(
      createNativeHostEnvironment(bridge),
      {
        createRuntime: (options) => {
          captured = options
          return Object.freeze({}) as BrowserUiRuntimeFoundation
        },
      },
    )
    const storage = captured?.saveStorage
    const paths = captured?.saveRepositoryPaths
    expect(storage).toBeDefined()
    expect(paths).toBeDefined()
    const repository = new PortableSaveRepository(
      storage!,
      paths!,
      () => ({ saveVersion: 12, doubleIp: true }),
      { allowCanonicalPlayerWrites: true },
      captured?.automaticPurchaseEvidencePromoter,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'migrated',
      source: {
        id: token,
        sourcePath: `unity-readonly:${token}`,
        provenance: { opaqueSourceIdentifier: token },
      },
    })
    expect(promote).toHaveBeenCalledOnce()
    expect(promote).toHaveBeenCalledWith(expect.objectContaining({
      opaqueSourceIdentifier: token,
      permanentDoubleInfinityPoints: true,
    }))
  })
})

function fakeBridge() {
  const files = new Map<string, string>()
  return {
    target: 'electron' as const,
    exists: vi.fn(async (path: string) => files.has(path)),
    readText: vi.fn(async (path: string) => {
      const value = files.get(path)
      if (value === undefined) throw new Error('missing')
      return value
    }),
    writeText: vi.fn(async (path: string, text: string) => {
      files.set(path, text)
    }),
    replaceAtomically: vi.fn(async (temporary: string, current: string) => {
      const text = files.get(temporary)
      if (text === undefined) throw new Error('missing temporary')
      files.set(current, text)
      files.delete(temporary)
    }),
    copy: vi.fn(async (source: string, destination: string) => {
      const text = files.get(source)
      if (text === undefined) throw new Error('missing source')
      files.set(destination, text)
    }),
    discoverUnitySaves: vi.fn(async () => []),
    currentLifecyclePhase: vi.fn(() => 'active' as const),
    subscribeLifecycle: vi.fn(() => () => undefined),
    metadata: vi.fn(async () => ({
      applicationVersion: '4.0.0',
      buildNumber: '2026080200',
    })),
    exportDiagnostics: vi.fn(async () => ({ exported: true as const })),
    storeProducts: vi.fn(async () => []),
    storePurchase: vi.fn(async (productId: StoreProductId) => ({
      accepted: false as const,
      productId,
      code: 'store-unavailable' as const,
    })),
    storeRestorePurchases: vi.fn(async () => ({
      restoredProductIds: [] as const,
    })),
    readEntitlements: vi.fn(async () => ({
      doubleInfinityPoints: false,
      developerOptions: false,
    })),
  } satisfies NativeHostBridgeApi & {
    readonly storeProducts: ReturnType<typeof vi.fn>
    readonly writeText: ReturnType<typeof vi.fn>
  }
}

function assertPersistedSkillPresets(
  runtime: BrowserUiRuntimeFoundation,
  layouts: readonly (readonly string[])[],
  selectedSlot: number,
): void {
  const snapshot = runtime.snapshot()
  expect(snapshot.phase).toBe('ready')
  if (snapshot.phase !== 'ready') return
  expect(
    snapshot.gameplay.progression.skills.presets.map(
      (preset) => preset.skillIds,
    ),
  ).toEqual(layouts)
  expect(
    snapshot.gameplay.progression.skills.activeAutoAssignment,
  ).toEqual(layouts[selectedSlot - 1])
  expect(snapshot.gameplay.runtime.selectedSkillPresetSlot).toBe(
    selectedSlot,
  )
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}


test.each(['android','ios'] as const)('exposes %s achievement reporting and Settings UI through the native composition', async target => {
  const submitAchievements = vi.fn(async () => undefined)
  const showAchievements = vi.fn(async () => undefined)
  const plugin = {
    currentLifecycle: async () => ({phase:'active'}),
    addListener: async () => ({remove: async () => undefined}),
    achievementStatus: async () => ({available:true}),
    submitAchievements, showAchievements,
  } as unknown as CapacitorNativeHostPlugin
  const bridge = new CapacitorNativeHostBridge(target, plugin)
  await bridge.ready()
  const environment = createNativeHostEnvironment(bridge)
  expect(environment.achievements?.persistEvidence).toBe(true)
  expect(environment.releasePlatformServices.achievementProvider).toBe(target === 'android' ? 'play-games' : 'game-center')
  await environment.achievements?.submit({unlocked:['achievement.first_bot'], statistics:{},presence:''})
  expect(submitAchievements).toHaveBeenCalledWith({unlocked:['achievement.first_bot']})
  await environment.releasePlatformServices.showAchievements?.()
  expect(showAchievements).toHaveBeenCalledOnce()
})
