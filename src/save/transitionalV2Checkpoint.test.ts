import { gzipSync, strToU8 } from 'fflate'
import { describe, expect, test, vi } from 'vitest'
import {
  createDeterministicUnityFirstRunPreparedSave,
} from '../application/firstRun/unityFirstRunSave'
import { dehydrateGameState, hydrateGameState } from '../game-state/mapping'
import type { SaveRecord } from './graph'
import { prepareImportedSaveText } from './import'
import { PreparedSave } from './prepare'
import {
  IncompatibleTransitionalCheckpointError,
  PortableSaveRepository,
  type LegacySaveCandidate,
  type SaveStorageAdapter,
} from './repository'
import { deserializeWebSave, serializeWebSave } from './serialization'
import {
  recoverDecodedTransitionalV2PortableSave,
  recoverTransitionalV2Checkpoint,
  recoverTransitionalV2CheckpointWithMetadata,
} from './transitionalV2Checkpoint'
import {
  hashCanonicalTransitionalV2StoredTimeValue,
  validateRedundantTransitionalV2StoredTimeJob,
} from './transitionalV2StoredTimeJob'
import {
  V2_SCHEMA13_CAPPED_RESEARCH_IDS,
  V2_SCHEMA13_DREAM_EDUCATION_IDS,
  V2_SCHEMA13_DREAM_TIMER_IDS,
  V2_SCHEMA13_DREAM_UPGRADE_FLAGS,
  V2_SCHEMA13_FACILITY_IDS,
  V2_SCHEMA13_RESEARCH_IDS,
  V2_SCHEMA13_RETAINED_FACILITY_IDS,
  V2_SCHEMA13_SKILL_IDS,
  v2Schema13NumericEncoding,
} from './transitionalV2Schema13Manifest'
import {
  NUMBER_NOTATION_STORAGE_KEY,
  NumberNotationPreferenceService,
} from '../ui/number-notation'
import {
  RESEARCH_VISIBILITY_STORAGE_KEY,
  ResearchVisibilityPreferenceService,
} from '../ui/research-visibility'
import {
  DISCRETE_MAXIMUM,
  SIMULATION_RESOURCE_MAXIMUM,
} from '../simulation/numeric'
import {
  availableCanonicalInfinityShopPoints,
} from '../simulation/canonicalInfinityShop'
import { advanceRealityWorkers } from '../simulation/realityWorkers'
import {
  createCanonicalGameApplication,
} from '../application/canonicalGameApplication'
import {
  createCanonicalRuntimeSessionFactory,
} from '../application/canonicalRuntimeSession'
import { createProductionEventContext } from '../simulation/productionEventContext'
import { RepositoryStartupSaveResolver } from './startupResolver'
import { SaveImportLimitError } from './decodeIdb1'
import { packSettingsFlags } from './settingsFlags'
import { createBrowserRuntimeFoundation } from '../ui/runtime'
import {
  SingleHostSessionWriterAuthority,
} from '../platform/singleHostSessionWriterAuthority'
import { sha256Utf8 } from './automaticPurchaseEvidence'
import {
  TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD,
} from './transitionalV2Retirement'

describe('transitional production V2 checkpoint recovery', () => {
  test('previews a raw schema-13 export with receiver-owned preferences and round-trips it', () => {
    const compatibilityBase = createDeterministicUnityFirstRunPreparedSave()
    const receiver = compatibilityBase.copyValidatedState()
    receiver.globalMute = true
    receiver.hidePurchased = false
    receiver.debugEverEnabled = true
    receiver.debugOptions = true
    receiver.cheater = true
    receiver.unlockAllTabs = true
    receiver.processingStoredTimePreset = 'accurate'
    packSettingsFlags(receiver)
    receiver.receiverOnlyFutureGameplay = { mustNotBecomeImportedProgress: true }
    const state = encodeState(hydrateGameState(compatibilityBase).state)
    ;(state.dyson as SaveRecord).money = '12345'
    ;(state.timeline as SaveRecord).lastSuspendedAtLegacyText =
      '2026-08-29T00:00:00.000Z'
    ;(state.timeline as SaveRecord).storedTimeAvailableSeconds = 3_600
    ;(state.timeline as SaveRecord).storedTimeCapacitySeconds = 7_200

    const preview = prepareImportedSaveText(
      portableText(state),
      '2026-08-30T01:00:00.000Z',
      undefined,
      {
        kind: 'manual-shared-import',
        importedAtUtc: '2026-08-30T01:00:00.000Z',
      },
      receiver,
      () => compatibilityBase,
    )
    const previewRecord = preview.copyValidatedState()
    const previewState = hydrateGameState(preview).state

    expect(previewState.dyson.money).toBe(12_345)
    expect(previewState.timeline.lastSuspendedAtLegacyText).toBeNull()
    expect(previewState.timeline.storedTimeAvailableSeconds).toBe(3_600)
    expect(previewState.timeline.storedTimeCapacitySeconds).toBe(7_200)
    expect(previewState.timeline.processing.storedTimePreset)
      .toBe('accurate')
    expect(previewRecord).toMatchObject({
      dateQuitString: '',
      lastSuccessfulLoadUtc: '2026-08-30T01:00:00.000Z',
      globalMute: true,
      hidePurchased: false,
      debugEverEnabled: true,
      debugOptions: true,
      cheater: true,
      unlockAllTabs: true,
      doubleIp: false,
    })
    expect(previewRecord).not.toHaveProperty('receiverOnlyFutureGameplay')

    const reloaded = roundTrip(preview)
    expect(hydrateGameState(reloaded).state).toMatchObject({
      dyson: { money: 12_345 },
      timeline: {
        lastSuspendedAtLegacyText: null,
        storedTimeAvailableSeconds: 3_600,
        storedTimeCapacitySeconds: 7_200,
        processing: { storedTimePreset: 'accurate' },
      },
    })
    expect(reloaded.copyValidatedState()).toMatchObject({
      dateQuitString: '',
      lastSuccessfulLoadUtc: '2026-08-30T01:00:00.000Z',
      globalMute: true,
      hidePurchased: false,
      debugEverEnabled: true,
      debugOptions: true,
      cheater: true,
      unlockAllTabs: true,
    })
  })

  test('confirms a raw schema-13 replacement from blocked startup and reloads it', async () => {
    const compatibilityBase = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(compatibilityBase).state)
    ;(state.dyson as SaveRecord).money = '54321'
    ;(state.timeline as SaveRecord).lastSuspendedAtLegacyText =
      '2026-08-29T00:00:00.000Z'
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', 'IDSWEB1:not-a-valid-current-save')
    let recoveryBaseCalls = 0
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        backups: ['/current.backup.1'],
      },
      () => {
        throw new Error('not a legacy save')
      },
    )
    const application = createCanonicalGameApplication({
      repository,
      startupResolver: new RepositoryStartupSaveResolver(
        repository,
        () => compatibilityBase,
      ),
      sessionFactory: createCanonicalRuntimeSessionFactory({
        entitlements: { permanentDoubleIp: true },
      }),
      engine: { eventContext: createProductionEventContext() },
      createTransitionalRecoveryBase: () => {
        recoveryBaseCalls += 1
        return compatibilityBase
      },
    })

    await expect(application.start()).resolves.toMatchObject({
      phase: 'blocked',
      outcome: 'all-candidates-invalid',
    })
    expect(storage.files.get('/recovery/rejected-current.idsw'))
      .toBe('IDSWEB1:not-a-valid-current-save')

    const future = serializeWebSave({ saveVersion: 17 })
    await expect(application.importSave({
      text: future,
      importedAtUtc: '2026-08-30T02:00:00.000Z',
      overwriteApproved: true,
    })).resolves.toMatchObject({
      imported: false,
      committed: false,
      code: 'APP-IMPORT-INVALID',
    })
    expect(recoveryBaseCalls).toBe(0)
    expect(storage.files.get('/current'))
      .toBe('IDSWEB1:not-a-valid-current-save')
    expect(storage.files.has('/current.backup.1')).toBe(false)

    const corrupted = await application.importSave({
      text: corruptPortableChecksum(portableText(state)),
      importedAtUtc: '2026-08-30T02:00:00.000Z',
      overwriteApproved: true,
    })
    expect(corrupted).toMatchObject({
      imported: false,
      committed: false,
      code: 'APP-IMPORT-INVALID',
    })
    expect(storage.files.get('/current'))
      .toBe('IDSWEB1:not-a-valid-current-save')
    expect(storage.files.get('/recovery/rejected-current.idsw'))
      .toBe('IDSWEB1:not-a-valid-current-save')
    expect(recoveryBaseCalls).toBe(0)

    await expect(application.importSave({
      text: portableText(state),
      importedAtUtc: '2026-08-30T02:00:00.000Z',
      overwriteApproved: true,
    })).resolves.toMatchObject({ imported: true })
    expect(recoveryBaseCalls).toBe(1)
    expect(storage.files.get('/current.backup.1'))
      .toBe('IDSWEB1:not-a-valid-current-save')
    const reloaded = await repository.loadCurrent()
    expect(reloaded).not.toBeNull()
    expect(hydrateGameState(reloaded!).state).toMatchObject({
      dyson: { money: 54_321 },
      timeline: { lastSuspendedAtLegacyText: null },
    })
    expect(reloaded!.copyValidatedState()).toMatchObject({
      dateQuitString: '',
      lastSuccessfulLoadUtc: '2026-08-30T02:00:00.000Z',
      doubleIp: false,
    })
    const runtime = application.snapshot()
    expect(runtime.phase).toBe('ready')
    if (runtime.phase === 'ready') {
      expect(runtime.state.entitlements.permanentDoubleIp).toBe(true)
    }
  })

  test('requires approval and rotates an unsupported future current before raw schema-13 recovery', async () => {
    const compatibilityBase = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(compatibilityBase).state)
    ;(state.dyson as SaveRecord).money = '98765'
    const futureCurrent = serializeWebSave({ saveVersion: 17 })
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', futureCurrent)
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        backups: ['/current.backup.1'],
      },
      () => {
        throw new Error('not a legacy save')
      },
    )
    let recoveryBaseCalls = 0
    const application = createCanonicalGameApplication({
      repository,
      startupResolver: new RepositoryStartupSaveResolver(
        repository,
        () => compatibilityBase,
      ),
      sessionFactory: createCanonicalRuntimeSessionFactory({
        entitlements: { permanentDoubleIp: false },
      }),
      engine: { eventContext: createProductionEventContext() },
      createTransitionalRecoveryBase: () => {
        recoveryBaseCalls += 1
        return compatibilityBase
      },
    })

    await expect(application.start()).resolves.toMatchObject({
      phase: 'blocked',
      outcome: 'unsupported-future-version',
    })
    expect(storage.files.get('/current')).toBe(futureCurrent)

    await expect(application.importSave({
      text: portableText(state),
      importedAtUtc: '2026-08-30T03:00:00.000Z',
      overwriteApproved: false,
    })).resolves.toMatchObject({
      imported: false,
      committed: false,
      code: 'APP-IMPORT-OVERWRITE-REQUIRED',
    })
    expect(recoveryBaseCalls).toBe(0)
    expect(storage.files.get('/current')).toBe(futureCurrent)
    expect(storage.files.has('/current.backup.1')).toBe(false)

    await expect(application.importSave({
      text: portableText(state),
      importedAtUtc: '2026-08-30T03:00:00.000Z',
      overwriteApproved: true,
    })).resolves.toMatchObject({ imported: true })
    expect(recoveryBaseCalls).toBe(1)
    expect(storage.files.get('/current.backup.1')).toBe(futureCurrent)
    expect(
      hydrateGameState((await repository.loadCurrent())!).state.dyson.money,
    ).toBe(98_765)
  })

  test('retains decodable receiver-local state during a non-schema blocked rescue import', async () => {
    const compatibilityBase = createDeterministicUnityFirstRunPreparedSave()
    const receiverSession = hydrateGameState(compatibilityBase)
    const receiverPrepared = dehydrateGameState(receiverSession, {
      ...receiverSession.state,
      dyson: { ...receiverSession.state.dyson, money: 999 },
      timeline: {
        ...receiverSession.state.timeline,
        storedTimeAvailableSeconds: 111,
        storedTimeCapacitySeconds: 222,
      },
    })
    const receiver = receiverPrepared.copyValidatedState()
    receiver.globalMute = true
    receiver.debugOptions = true
    receiver.debugEverEnabled = true
    receiver.cheater = true
    receiver.unlockAllTabs = true
    receiver.processingStoredTimePreset = 'accurate'
    packSettingsFlags(receiver)
    const state = encodeState(hydrateGameState(compatibilityBase).state)
    ;(state.dyson as SaveRecord).money = '11223'
    const timeline = state.timeline as SaveRecord
    timeline.storedTimeAvailableSeconds = 3_333
    timeline.storedTimeCapacitySeconds = 4_444
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', serializeWebSave(receiver))
    const repository = new PortableSaveRepository(
      storage,
      IMPORT_TEST_PATHS,
      () => {
        throw new Error('not a legacy save')
      },
    )
    const application = createCanonicalGameApplication({
      repository,
      startupResolver: {
        resolve: async () => ({
          kind: 'blocked',
          reason: 'storage-failed',
          error: 'transient startup failure',
        }),
      },
      sessionFactory: createCanonicalRuntimeSessionFactory({
        entitlements: { permanentDoubleIp: false },
      }),
      engine: { eventContext: createProductionEventContext() },
      createTransitionalRecoveryBase: () => compatibilityBase,
    })

    await expect(application.start()).resolves.toMatchObject({
      phase: 'blocked',
      outcome: 'storage-failed',
    })
    await expect(application.importSave({
      text: portableText(state),
      importedAtUtc: '2026-08-30T03:30:00.000Z',
      overwriteApproved: true,
    })).resolves.toMatchObject({ imported: true })

    const imported = (await repository.loadCurrent())!.copyValidatedState()
    expect(imported).toMatchObject({
      globalMute: true,
      debugOptions: true,
      debugEverEnabled: true,
      cheater: true,
      unlockAllTabs: true,
      processingStoredTimePreset: 'accurate',
    })
    expect(hydrateGameState(PreparedSave.fromDecoded(imported)).state)
      .toMatchObject({
        dyson: { money: 11_223 },
        timeline: {
          storedTimeAvailableSeconds: 3_333,
          storedTimeCapacitySeconds: 4_444,
          processing: { storedTimePreset: 'accurate' },
        },
      })
  })

  test('keeps blocked browser preview and confirm on receiver-local state without leaking receiver gameplay', async () => {
    const compatibilityBase = createDeterministicUnityFirstRunPreparedSave()
    const receiverSession = hydrateGameState(compatibilityBase)
    const receiverPrepared = dehydrateGameState(receiverSession, {
      ...receiverSession.state,
      dyson: { ...receiverSession.state.dyson, money: 999 },
      infinity: { ...receiverSession.state.infinity, points: 1n },
      timeline: {
        ...receiverSession.state.timeline,
        storedTimeAvailableSeconds: 111,
        storedTimeCapacitySeconds: 222,
      },
    })
    const receiver = receiverPrepared.copyValidatedState()
    receiver.globalMute = true
    receiver.debugOptions = true
    receiver.debugEverEnabled = true
    receiver.cheater = true
    receiver.unlockAllTabs = true
    receiver.processingStoredTimePreset = 'accurate'
    packSettingsFlags(receiver)

    const state = encodeState(hydrateGameState(compatibilityBase).state)
    ;(state.dyson as SaveRecord).money = '11223'
    const infinity = state.infinity as SaveRecord
    infinity.availablePoints = '7'
    infinity.allocatedPoints = '3'
    const timeline = state.timeline as SaveRecord
    timeline.storedTimeAvailableSeconds = 3_333
    timeline.storedTimeCapacitySeconds = 4_444
    const text = portableText(state)
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', serializeWebSave(receiver))
    const runtime = createImportTestRuntime(
      storage,
      compatibilityBase,
      true,
    )

    await expect(runtime.start()).resolves.toMatchObject({ phase: 'blocked' })
    await expect(runtime.previewImport({
      source: 'paste',
      text,
      importedAtUtc: '2026-08-30T03:45:00.000Z',
      overwriteApproved: true,
    })).resolves.toMatchObject({
      accepted: true,
      preview: { infinityPoints: 10n },
    })
    await expect(runtime.importSave({
      source: 'paste',
      text,
      importedAtUtc: '2026-08-30T03:45:00.000Z',
      overwriteApproved: true,
    })).resolves.toMatchObject({ imported: true })

    const imported = PreparedSave.fromDecoded(deserializeWebSave(
      storage.files.get('/current')!,
    ))
    expect(imported.copyValidatedState()).toMatchObject({
      globalMute: true,
      debugOptions: true,
      debugEverEnabled: true,
      cheater: true,
      unlockAllTabs: true,
      processingStoredTimePreset: 'accurate',
    })
    expect(hydrateGameState(imported).state).toMatchObject({
      dyson: { money: 11_223 },
      infinity: { points: 10n },
      timeline: {
        storedTimeAvailableSeconds: 3_333,
        storedTimeCapacitySeconds: 4_444,
        processing: { storedTimePreset: 'accurate' },
      },
    })
    await runtime.shutdown()
  })

  test('previews, confirms, and reloads a raw schema-13 paste through the browser runtime', async () => {
    const compatibilityBase = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(compatibilityBase).state)
    const infinity = state.infinity as SaveRecord
    infinity.availablePoints = '7'
    infinity.allocatedPoints = '3'
    const text = portableText(state)
    const storage = new TransitionalMemoryStorage()
    const runtime = createImportTestRuntime(storage, compatibilityBase)

    await expect(runtime.start()).resolves.toMatchObject({ phase: 'ready' })
    await expect(runtime.previewImport({
      source: 'paste',
      text,
      importedAtUtc: '2026-08-30T04:00:00.000Z',
      overwriteApproved: true,
    })).resolves.toMatchObject({
      accepted: true,
      preview: { infinityPoints: 10n },
    })
    await expect(runtime.importSave({
      source: 'paste',
      text,
      importedAtUtc: '2026-08-30T04:00:00.000Z',
      overwriteApproved: true,
    })).resolves.toMatchObject({ imported: true })
    await runtime.shutdown()

    const reloaded = createImportTestRuntime(storage, compatibilityBase)
    await expect(reloaded.start()).resolves.toMatchObject({ phase: 'ready' })
    const current = await reloaded.readCurrentSaveText()
    expect(current).not.toBeNull()
    expect(hydrateGameState(PreparedSave.fromDecoded(
      deserializeWebSave(current!),
    )).state.infinity.points).toBe(10n)
    await reloaded.shutdown()
  })

  test('uses the ready receiver platform state for raw schema-13 file preview and import', async () => {
    const compatibilityBase = createDeterministicUnityFirstRunPreparedSave()
    const receiver = compatibilityBase.copyValidatedState()
    receiver.globalMute = true
    receiver.debugOptions = true
    receiver.debugEverEnabled = true
    receiver.cheater = true
    receiver.unlockAllTabs = true
    receiver.processingStoredTimePreset = 'accurate'
    packSettingsFlags(receiver)
    const state = encodeState(hydrateGameState(compatibilityBase).state)
    ;(state.dyson as SaveRecord).money = '24680'
    const text = portableText(state)
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', serializeWebSave(receiver))
    const runtime = createImportTestRuntime(storage, compatibilityBase)
    const file = {
      name: 'v2-export.idsw',
      size: new TextEncoder().encode(text).byteLength,
      text: async () => text,
    }

    await expect(runtime.start()).resolves.toMatchObject({ phase: 'ready' })
    await expect(runtime.previewImport({
      source: 'file',
      file,
      importedAtUtc: '2026-08-30T05:00:00.000Z',
      overwriteApproved: true,
    })).resolves.toMatchObject({ accepted: true })
    await expect(runtime.importSave({
      source: 'file',
      file,
      importedAtUtc: '2026-08-30T05:00:00.000Z',
      overwriteApproved: true,
    })).resolves.toMatchObject({ imported: true })
    await runtime.shutdown()

    const current = PreparedSave.fromDecoded(deserializeWebSave(
      storage.files.get('/current')!,
    ))
    expect(hydrateGameState(current).state).toMatchObject({
      dyson: { money: 24_680 },
      timeline: { processing: { storedTimePreset: 'accurate' } },
    })
    expect(current.copyValidatedState()).toMatchObject({
      globalMute: true,
      debugOptions: true,
      debugEverEnabled: true,
      cheater: true,
      unlockAllTabs: true,
    })
  })

  test('recovers a blocked browser runtime from a raw schema-13 paste', async () => {
    const compatibilityBase = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(compatibilityBase).state)
    ;(state.dyson as SaveRecord).money = '13579'
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', 'IDSWEB1:invalid-blocked-current')
    const runtime = createImportTestRuntime(storage, compatibilityBase)

    await expect(runtime.start()).resolves.toMatchObject({ phase: 'blocked' })
    await expect(runtime.previewImport({
      source: 'paste',
      text: portableText(state),
      importedAtUtc: '2026-08-30T06:00:00.000Z',
      overwriteApproved: true,
    })).resolves.toMatchObject({ accepted: true })
    await expect(runtime.importSave({
      source: 'paste',
      text: portableText(state),
      importedAtUtc: '2026-08-30T06:00:00.000Z',
      overwriteApproved: true,
    })).resolves.toMatchObject({ imported: true })
    expect(runtime.status()).toMatchObject({ phase: 'ready' })
    expect(storage.files.get('/current.backup.1'))
      .toBe('IDSWEB1:invalid-blocked-current')
    expect(storage.files.get('/recovery/rejected-current.idsw'))
      .toBe('IDSWEB1:invalid-blocked-current')
    await runtime.shutdown()
  })

  test.each([
    {
      stage: 'decoded-payload' as const,
      limits: {
        suppliedTextBytes: 2 * 1024 * 1024,
        decodedPayloadBytes: 1,
        inflatedBinaryBytes: 8 * 1024 * 1024,
      },
    },
    {
      stage: 'inflated-binary' as const,
      limits: {
        suppliedTextBytes: 2 * 1024 * 1024,
        decodedPayloadBytes: 1024 * 1024,
        inflatedBinaryBytes: 64,
      },
    },
  ])('preserves the $stage limit classification for raw schema-13 preview', ({
    stage,
    limits,
  }) => {
    const compatibilityBase = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(compatibilityBase).state)

    try {
      prepareImportedSaveText(
        portableText(state),
        '2026-08-30T01:00:00.000Z',
        limits,
        undefined,
        compatibilityBase.copyValidatedState(),
        () => compatibilityBase,
      )
      throw new Error('Expected the raw schema-13 import to exceed its limit.')
    } catch (error) {
      expect(error).toBeInstanceOf(SaveImportLimitError)
      expect(error).toMatchObject({ stage })
    }
  })

  test('accepts every released schema-13 authored boundary', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const dyson = state.dyson as SaveRecord
    dyson.manualCreationIntervalSeconds = Number.MIN_VALUE
    dyson.botDistribution = 1
    dyson.goalStage = '10'
    const infinity = state.infinity as SaveRecord
    infinity.secretsOfTheUniverse = '27'
    infinity.permanentSkillPoints = '10'
    const skills = state.skills as SaveRecord
    skills.selectedPreset = 5
    skills.activeAutoAssignment = [V2_SCHEMA13_SKILL_IDS[0]]
    ;(skills.tabPresetAutomation as SaveRecord).bots = 5
    ;(skills.tabPresetAutomation as SaveRecord).research = 5
    for (const preset of skills.presets as SaveRecord[]) {
      preset.skillIds = [V2_SCHEMA13_SKILL_IDS[0]]
      preset.botDistribution = 1
      preset.colorId = 'pink'
    }
    const levels = (state.research as SaveRecord).levelsById as SaveRecord
    for (const id of V2_SCHEMA13_CAPPED_RESEARCH_IDS) levels[id] = '1'
    const reality = state.reality as SaveRecord
    reality.workersReady = '128'
    reality.workerGenerationProgress = 1 - Number.EPSILON
    const quantum = state.quantum as SaveRecord
    quantum.divisionsPurchased = '19'
    quantum.permanentSecrets = '27'
    const timeline = state.timeline as SaveRecord
    timeline.dysonAutomationTargetIndex = 7
    timeline.researchAutomationTargetIndex =
      V2_SCHEMA13_RESEARCH_IDS.length - 1
    timeline.storedTimeAvailableSeconds = 42_000_000
    timeline.storedTimeCapacitySeconds = 42_000_000
    ;(timeline.doubleTime as SaveRecord).bankSeconds = 42_000_000
    ;(timeline.doubleTime as SaveRecord).rate = 10
    ;(state.secretProgress as SaveRecord).step = 7
    const dream = state.dream as SaveRecord
    dream.disasterStage = '42'
    const railgun = dream.railgun as SaveRecord
    railgun.shotsRemaining = 10
    railgun.activeRailguns = Number.MAX_SAFE_INTEGER
    railgun.lastRoundsFired = 110

    expect(() => recoverTransitionalV2Checkpoint(
      checkpointText(state, 1),
      base,
    )).not.toThrow()
  })

  test.each([
    ['Dyson Buy mode', (state: SaveRecord) => {
      ;((state.dyson as SaveRecord).automation as SaveRecord).buyMode =
        'buy-future'
    }],
    ['Skill preset color', (state: SaveRecord) => {
      ;(((state.skills as SaveRecord).presets as SaveRecord[])[0]!)
        .colorId = 'violet'
    }],
    ['duplicate auto-assignment Skill', (state: SaveRecord) => {
      ;(state.skills as SaveRecord).activeAutoAssignment = [
        V2_SCHEMA13_SKILL_IDS[0],
        V2_SCHEMA13_SKILL_IDS[0],
      ]
    }],
    ['unknown preset Skill', (state: SaveRecord) => {
      ;(((state.skills as SaveRecord).presets as SaveRecord[])[0]!)
        .skillIds = ['futureSkill']
    }],
    ['Dyson bot distribution', (state: SaveRecord) => {
      ;(state.dyson as SaveRecord).botDistribution = 1.01
    }],
    ['preset bot distribution', (state: SaveRecord) => {
      ;(((state.skills as SaveRecord).presets as SaveRecord[])[0]!)
        .botDistribution = 1.01
    }],
    ['manual creation interval', (state: SaveRecord) => {
      ;(state.dyson as SaveRecord).manualCreationIntervalSeconds = 0
    }],
    ['preset automation slot', (state: SaveRecord) => {
      ;((state.skills as SaveRecord).tabPresetAutomation as SaveRecord)
        .bots = 6
    }],
    ['Dyson target index', (state: SaveRecord) => {
      ;(state.timeline as SaveRecord).dysonAutomationTargetIndex = 8
    }],
    ['Research target index', (state: SaveRecord) => {
      ;(state.timeline as SaveRecord).researchAutomationTargetIndex =
        V2_SCHEMA13_RESEARCH_IDS.length
    }],
    ['Double Time rate', (state: SaveRecord) => {
      ;((state.timeline as SaveRecord).doubleTime as SaveRecord).rate = 11
    }],
    ['Stored Time capacity', (state: SaveRecord) => {
      ;(state.timeline as SaveRecord).storedTimeCapacitySeconds = 0
    }],
    ['Stored Time balance', (state: SaveRecord) => {
      const timeline = state.timeline as SaveRecord
      timeline.storedTimeAvailableSeconds = 2
      timeline.storedTimeCapacitySeconds = 1
    }],
    ['Double Time bank', (state: SaveRecord) => {
      ;((state.timeline as SaveRecord).doubleTime as SaveRecord).bankSeconds =
        42_000_001
    }],
    ['Reality worker progress', (state: SaveRecord) => {
      ;(state.reality as SaveRecord).workerGenerationProgress = 1
    }],
    ['railgun shots', (state: SaveRecord) => {
      ;((state.dream as SaveRecord).railgun as SaveRecord).shotsRemaining = 11
    }],
    ['active railguns', (state: SaveRecord) => {
      ;((state.dream as SaveRecord).railgun as SaveRecord).activeRailguns =
        Number.MAX_SAFE_INTEGER + 1
    }],
    ['last railgun rounds', (state: SaveRecord) => {
      ;((state.dream as SaveRecord).railgun as SaveRecord).lastRoundsFired = 111
    }],
    ['pending railgun relation', (state: SaveRecord) => {
      const railgun = (state.dream as SaveRecord).railgun as SaveRecord
      railgun.pendingBaseSeconds = 1
      railgun.pendingDreamSeconds = 0
    }],
    ['secret step', (state: SaveRecord) => {
      ;(state.secretProgress as SaveRecord).step = 8
    }],
    ['Dyson goal stage', (state: SaveRecord) => {
      ;(state.dyson as SaveRecord).goalStage = '11'
    }],
    ['Secrets of the Universe', (state: SaveRecord) => {
      ;(state.infinity as SaveRecord).secretsOfTheUniverse = '28'
    }],
    ['Permanent Skill rank', (state: SaveRecord) => {
      ;(state.infinity as SaveRecord).permanentSkillPoints = '11'
    }],
    ['Quantum Divisions', (state: SaveRecord) => {
      ;(state.quantum as SaveRecord).divisionsPurchased = '20'
    }],
    ['Permanent Quantum Secrets', (state: SaveRecord) => {
      ;(state.quantum as SaveRecord).permanentSecrets = '28'
    }],
    ['Reality workers ready', (state: SaveRecord) => {
      ;(state.reality as SaveRecord).workersReady = '129'
    }],
    ['Dream disaster stage', (state: SaveRecord) => {
      ;(state.dream as SaveRecord).disasterStage = '4'
    }],
    ['Skill fragment count', (state: SaveRecord) => {
      ;(state.skills as SaveRecord).fragments = '1'
    }],
    ['Dream reset cause', (state: SaveRecord) => {
      ;((state.statistics as SaveRecord).lastCompletedCycle as SaveRecord)
        .dreamCause = 'FutureDisaster'
    }],
    ['minute window count', (state: SaveRecord) => {
      const statistics = state.statistics as SaveRecord
      statistics.minuteWindows = (
        statistics.minuteWindows as SaveRecord[]
      ).slice(0, 59)
    }],
  ] as const)('rejects released schema-13 invariant violation: %s', (
    _label,
    mutate,
  ) => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    mutate(state)

    expect(() => recoverTransitionalV2Checkpoint(
      checkpointText(state, 1),
      base,
    )).toThrow()
  })

  test.each([
    ['Decimal as a JSON number', (state: SaveRecord) => {
      ;(state.dyson as SaveRecord).money = 1
    }],
    ['bigint as a Decimal string', (state: SaveRecord) => {
      ;(state.dyson as SaveRecord).goalStage = '1e0'
    }],
    ['bounded number as a string', (state: SaveRecord) => {
      ;(state.timeline as SaveRecord).infinityCycleSeconds = '0'
    }],
    ['Decimal without exponent', (state: SaveRecord) => {
      ;(state.dyson as SaveRecord).money = '1'
    }],
    ['Decimal with leading zero', (state: SaveRecord) => {
      ;(state.dyson as SaveRecord).money = '01e0'
    }],
    ['Decimal with positive exponent sign', (state: SaveRecord) => {
      ;(state.dyson as SaveRecord).money = '1e+0'
    }],
    ['Decimal with trailing mantissa zero', (state: SaveRecord) => {
      ;(state.dyson as SaveRecord).money = '1.0e0'
    }],
    ['bigint with leading zero', (state: SaveRecord) => {
      ;(state.dyson as SaveRecord).goalStage = '01'
    }],
  ] as const)('rejects noncanonical schema-13 numeric carrier: %s', (
    _label,
    mutate,
  ) => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    mutate(state)

    expect(() => recoverTransitionalV2Checkpoint(
      checkpointTextRaw(state, 1),
      base,
    )).toThrow()
  })

  test('rejects numeric enum negative zero before constructing a base', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    ;(state.skills as SaveRecord).selectedPreset = -0
    let baseCalls = 0

    expect(() => recoverDecodedTransitionalV2PortableSave(
      decodedPortableEnvelope(state),
      () => {
        baseCalls += 1
        return base
      },
    )).toThrow(/unsupported enum value/u)
    expect(baseCalls).toBe(0)
  })

  test.each([
    ['revision', (checkpoint: string) =>
      checkpoint.replace('"revision":0', '"revision":-0')],
    ['number formatting', (checkpoint: string) =>
      checkpoint.replace('"numberFormatting":0', '"numberFormatting":-0')],
    ['frame rate', (checkpoint: string) =>
      checkpoint.replace('"frameRate":60', '"frameRate":-0')],
  ] as const)('rejects outer checkpoint %s negative zero', (
    _label,
    mutate,
  ) => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)

    expect(() => recoverTransitionalV2Checkpoint(
      mutate(checkpointText(state, 0)),
      base,
    )).toThrow()
  })

  test.each([
    [
      'direct duplicate',
      '{"format":"ids-web-production-v2-checkpoint-v1","revision":0,"revision":1,"portableSave":"x","preferences":{},"platform":{}}',
    ],
    [
      'escaped-equivalent duplicate',
      String.raw`{"format":"ids-web-production-v2-checkpoint-v1","revision":0,"\u0072evision":1,"portableSave":"x","preferences":{},"platform":{}}`,
    ],
    [
      'format duplicate whose last value is unrelated',
      '{"format":"ids-web-production-v2-checkpoint-v1","format":"unrelated"}',
    ],
    [
      'escaped format duplicate whose last value is unrelated',
      String.raw`{"format":"ids-web-production-v2-checkpoint-v1","\u0066ormat":"unrelated"}`,
    ],
  ] as const)('rejects an outer checkpoint %s before key collapse', (
    _label,
    checkpoint,
  ) => {
    const base = createDeterministicUnityFirstRunPreparedSave()

    expect(() => recoverTransitionalV2Checkpoint(checkpoint, base))
      .toThrow(/duplicate-equivalent/u)
  })

  test('does not classify unrelated duplicate-format JSON as a V2 checkpoint', () => {
    const unrelated = String.raw`{"format":"unrelated","\u0066ormat":"also-unrelated"}`

    expect(recoverTransitionalV2Checkpoint(
      unrelated,
      createDeterministicUnityFirstRunPreparedSave(),
    )).toBeNull()
  })

  test('does not classify a nested V2 format with an unrelated duplicate key', () => {
    const unrelated =
      '{"nested":{"format":"ids-web-production-v2-checkpoint-v1"},"other":1,"other":2}'

    expect(recoverTransitionalV2Checkpoint(
      unrelated,
      createDeterministicUnityFirstRunPreparedSave(),
    )).toBeNull()
  })

  test('enforces the outer checkpoint entry budget before classification', () => {
    const entries = Array.from(
      { length: 250_001 },
      (_, index) => `"entry${index}":0`,
    ).join(',')
    const checkpoint =
      `{"format":"ids-web-production-v2-checkpoint-v1",${entries}}`
    const parse = vi.spyOn(JSON, 'parse')
    try {
      expect(() => recoverTransitionalV2Checkpoint(
        checkpoint,
        createDeterministicUnityFirstRunPreparedSave(),
      )).toThrow(/maximum entry count/u)
      expect(parse.mock.calls.some(([source]) => source === checkpoint))
        .toBe(false)
    } finally {
      parse.mockRestore()
    }
  })

  test('fails closed when a rejected checkpoint has an over-depth value before its format', () => {
    const nested = `${'['.repeat(129)}0${']'.repeat(129)}`
    const checkpoint =
      `{"padding":${nested},"format":"ids-web-production-v2-checkpoint-v1"}`

    expect(() => recoverTransitionalV2Checkpoint(
      checkpoint,
      createDeterministicUnityFirstRunPreparedSave(),
    )).toThrow(/maximum decode depth/u)
  })

  test.each([
    [
      'key',
      `{"${'x'.repeat(65_537)}":0,"format":"ids-web-production-v2-checkpoint-v1","format":"unrelated"}`,
    ],
    [
      'format value',
      `{"format":"${'x'.repeat(65_537)}","format":"ids-web-production-v2-checkpoint-v1"}`,
    ],
  ] as const)('does not reparse an oversized top-level %s token', (
    _label,
    checkpoint,
  ) => {
    const parse = vi.spyOn(JSON, 'parse')
    try {
      expect(() => recoverTransitionalV2Checkpoint(
        checkpoint,
        createDeterministicUnityFirstRunPreparedSave(),
      )).toThrow(/duplicate-equivalent/u)
      expect(parse.mock.calls.every(([source]) =>
        typeof source !== 'string' || source.length < 1_024,
      )).toBe(true)
    } finally {
      parse.mockRestore()
    }
  })

  test('fails fast on the largest valid Decimal exponent for an exact current level', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    ;((state.research as SaveRecord).levelsById as SaveRecord)
      ['research.money_multiplier'] = '1e8999999999999999'

    expect(() => recoverTransitionalV2Checkpoint(
      checkpointText(state, 1),
      base,
    )).toThrow(/exact integer range/u)
  })

  test('preserves a schema-13 available Quantum balance above lifetime progress', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const quantum = state.quantum as SaveRecord
    quantum.availableShards = '2e0'
    quantum.lifetimeEarnedShards = '1e0'
    let baseCalls = 0

    const recovered = recoverTransitionalV2Checkpoint(
      checkpointText(state, 1),
      () => {
        baseCalls += 1
        return base
      },
    )!
    const restored = hydrateGameState(recovered).state.quantum

    expect(restored.pointsEarned).toBe(2n)
    expect(restored.pointsSpent).toBe(0n)
    expect(baseCalls).toBe(1)
  })

  test('accepts cleared and authentic redundant V2 Stored Time job sidecars', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const dto = decodedPortableEnvelope(state)

    expect(() => validateRedundantTransitionalV2StoredTimeJob(
      JSON.stringify({
        format: 'ids-web-production-v2-stored-time-job-cleared-v1',
      }),
      7,
      dto,
    )).not.toThrow()
    expect(() => validateRedundantTransitionalV2StoredTimeJob(
      storedTimeJobText(dto, 7),
      7,
      dto,
    )).not.toThrow()
    const originEnvelope = JSON.parse(storedTimeJobText(dto, 7)) as SaveRecord
    const originRecord = originEnvelope.record as SaveRecord
    originRecord.kind = 'stored-time-origin-v2'
    originRecord.originRevision = 7
    originRecord.acknowledgedBaseRevision = 7
    originRecord.proposedBaseRevision = 7
    originRecord.checkpointSequence = 0
    expect(() => validateRedundantTransitionalV2StoredTimeJob(
      rehashStoredTimeJobEnvelope(originEnvelope),
      7,
      dto,
    )).not.toThrow()

    const olderState = structuredClone(state)
    ;(olderState.dyson as SaveRecord).money = '1e0'
    expect(() => validateRedundantTransitionalV2StoredTimeJob(
      storedTimeJobText(decodedPortableEnvelope(olderState), 6),
      7,
      dto,
    )).not.toThrow()
  })

  test('matches the released V2 sorted-key worker SHA-256 vector', () => {
    // The released 69854cf9 worker hashes this exact canonical text:
    // {"a":null,"z":[3,{"a":"V2","b":false}]}
    expect(hashCanonicalTransitionalV2StoredTimeValue({
      z: [3, { b: false, a: 'V2' }],
      a: null,
    })).toBe(
      'ff46dd317e805cfa09fe6d1caf813483e374a98e7510fea49e2e3b5e4ceae46d',
    )
  })

  test.each([
    [
      'single-digit revision rewrite',
      (record: SaveRecord) => {
        record.originRevision = 5
        record.acknowledgedBaseRevision = 5
        record.proposedBaseRevision = 6
      },
      /candidate hash/u,
    ],
    [
      'publication state rewrite',
      (record: SaveRecord) => {
        const publication = record.publication as SaveRecord
        const state = publication.state as SaveRecord
        ;(state.dyson as SaveRecord).money = '1e0'
      },
      /publication hash/u,
    ],
    [
      'candidate digest rewrite',
      (record: SaveRecord) => {
        record.candidateHash = `1${String(record.candidateHash).slice(1)}`
      },
      /candidate hash/u,
    ],
  ] as const)('rejects a Stored Time %s before retirement ordering', (
    _label,
    mutate,
    expected,
  ) => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const dto = decodedPortableEnvelope(state)
    const envelope = JSON.parse(storedTimeJobText(dto, 8)) as SaveRecord
    mutate(envelope.record as SaveRecord)

    expect(() => validateRedundantTransitionalV2StoredTimeJob(
      JSON.stringify(envelope),
      7,
      dto,
    )).toThrow(expected)
  })

  test.each([
    [
      'origin revision mismatch',
      (record: SaveRecord) => {
        record.kind = 'stored-time-origin-v2'
        record.originRevision = 7
        record.acknowledgedBaseRevision = 6
        record.proposedBaseRevision = 7
        record.checkpointSequence = 0
      },
    ],
    [
      'checkpoint proposed revision gap',
      (record: SaveRecord) => {
        record.proposedBaseRevision = 6
      },
    ],
    [
      'checkpoint sequence mismatch',
      (record: SaveRecord) => {
        record.checkpointSequence = 2
      },
    ],
    [
      'checkpoint origin after acknowledgement',
      (record: SaveRecord) => {
        record.originRevision = 7
      },
    ],
  ] as const)('rejects a Stored Time %s before retirement ordering', (
    _label,
    mutate,
  ) => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const dto = decodedPortableEnvelope(state)
    const envelope = JSON.parse(storedTimeJobText(dto, 7)) as SaveRecord
    mutate(envelope.record as SaveRecord)

    expect(() => validateRedundantTransitionalV2StoredTimeJob(
      JSON.stringify(envelope),
      7,
      dto,
    )).toThrow(/inconsistent revision clock/u)
  })

  test.each([
    {
      label: 'newer publication',
      job: (dto: SaveRecord) => storedTimeJobText(dto, 8),
      expected: /newer than/u,
    },
    {
      label: 'equal-revision mismatched publication',
      job: (dto: SaveRecord) => {
        const mismatched = structuredClone(dto)
        ;((mismatched.state as SaveRecord).dyson as SaveRecord).money = '1e0'
        return storedTimeJobText(mismatched, 7)
      },
      expected: /not redundant/u,
    },
    {
      label: 'unknown record field',
      job: (dto: SaveRecord) => {
        const envelope = JSON.parse(storedTimeJobText(dto, 7)) as SaveRecord
        ;(envelope.record as SaveRecord).futureField = true
        return JSON.stringify(envelope)
      },
      expected: /exactly its declared fields/u,
    },
    {
      label: 'duplicate-equivalent field',
      job: () => '{"format":"ids-web-production-v2-stored-time-job-cleared-v1","\\u0066ormat":"ids-web-production-v2-stored-time-job-cleared-v1"}',
      expected: /duplicate-equivalent/u,
    },
  ])('fails closed for a $label Stored Time sidecar', ({ job, expected }) => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const dto = decodedPortableEnvelope(state)

    expect(() => validateRedundantTransitionalV2StoredTimeJob(
      job(dto),
      7,
      dto,
    )).toThrow(expected)
  })

  test('recovers the newer outer checkpoint over an older valid V2 job', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const outerState = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    ;(outerState.dyson as SaveRecord).money = '5.4321e4'
    const olderState = structuredClone(outerState)
    ;(olderState.dyson as SaveRecord).money = '1.2345e4'
    const current = checkpointText(outerState, 7)
    const job = storedTimeJobText(decodedPortableEnvelope(olderState), 6)
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', current)
    storage.files.set('/stored-time/job.json', job)
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        backups: ['/current.backup.1'],
        transitionalStoredTimeJob: '/stored-time/job.json',
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => base,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'recovered-backup', sourcePath: '/current' })
    expect(
      hydrateGameState((await repository.loadCurrent())!).state.dyson.money,
    ).toBe(54_321)
    const migratedText = storage.files.get('/current')!
    expect(
      deserializeWebSave(migratedText)
        [TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD],
    ).toBe(await sha256Utf8(job))
    expect(storage.files.get('/stored-time/job.json')).toBe(job)
    expect(storage.files.get('/recovery/rejected-current.idsw')).toBe(current)

    // Simulate a later canonical publication having rotated the migrated save
    // into backup. The exact local proof makes the still-retained active V2 job
    // harmless if the active canonical slot is subsequently damaged.
    storage.files.set('/current.backup.1', migratedText)
    storage.files.set('/current', 'damaged-canonical-current')
    const restarted = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        backups: ['/current.backup.1'],
        transitionalStoredTimeJob: '/stored-time/job.json',
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => base,
    )

    await expect(restarted.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({
        status: 'recovered-backup',
        sourcePath: '/current.backup.1',
      })
    expect(
      hydrateGameState((await restarted.loadCurrent())!).state.dyson.money,
    ).toBe(54_321)
    expect(storage.files.get('/stored-time/job.json')).toBe(job)
  })

  test('rejects changed V2 job bytes that do not match a canonical recovery proof', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const current = checkpointText(state, 7)
    const job = storedTimeJobText(decodedPortableEnvelope(state), 7)
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', current)
    storage.files.set('/stored-time/job.json', job)
    const paths = {
      current: '/current',
      temporary: '/current.tmp',
      legacyRecovery: '/recovery/rejected-current.idsw',
      backups: [
        '/current.backup.1',
        '/current.backup.2',
        '/current.backup.3',
      ] as const,
      transitionalStoredTimeJob: '/stored-time/job.json',
    }
    const createRepository = () => new PortableSaveRepository(
      storage,
      paths,
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => base,
    )

    await expect(createRepository().migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'recovered-backup' })
    const migratedText = storage.files.get('/current')!
    storage.files.set('/current.backup.1', migratedText)
    storage.files.set('/current', 'damaged-canonical-current')
    const changedJob = job.replace(
      'job-authentic-fixture',
      'job-authentic-fixture-changed',
    )
    storage.files.set('/stored-time/job.json', changedJob)

    await expect(createRepository().migrateLegacyOnFirstLaunch()).rejects
      .toBeInstanceOf(IncompatibleTransitionalCheckpointError)
    expect(storage.files.get('/current')).toBe('damaged-canonical-current')
    expect(storage.files.get('/stored-time/job.json')).toBe(changedJob)
  })

  test('does not accept a retirement proof from an arbitrary recovery candidate', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const job = storedTimeJobText(decodedPortableEnvelope(state), 7)
    const candidateState = base.copyValidatedState()
    candidateState.transitionalProductionV2CheckpointRevision = 7
    candidateState.transitionalProductionV2StoredTimeJobSha256 =
      await sha256Utf8(job)
    const candidateText = serializeWebSave(candidateState)
    const candidate: LegacySaveCandidate = {
      id: 'untrusted-candidate',
      sourcePath: '/legacy/untrusted.idsw',
      text: candidateText,
    }
    const storage = new TransitionalMemoryStorage()
    storage.files.set(candidate.sourcePath, candidateText)
    storage.files.set('/stored-time/job.json', job)
    vi.spyOn(storage, 'discoverLegacyCandidates').mockResolvedValue([candidate])
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        transitionalStoredTimeJob: '/stored-time/job.json',
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => base,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).rejects
      .toBeInstanceOf(IncompatibleTransitionalCheckpointError)
    expect(storage.files.has('/current')).toBe(false)
    expect(storage.files.get('/stored-time/job.json')).toBe(job)
    expect(storage.files.get(candidate.sourcePath)).toBe(candidateText)
  })

  test('carries a host backup proof through blocked replacement and later rotations', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const job = storedTimeJobText(decodedPortableEnvelope(state), 7)
    const provenState = base.copyValidatedState()
    provenState.transitionalProductionV2CheckpointRevision = 7
    provenState.transitionalProductionV2StoredTimeJobSha256 =
      await sha256Utf8(job)
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', 'damaged-before-approved-replacement')
    storage.files.set('/current.backup.1', serializeWebSave(provenState))
    storage.files.set('/stored-time/job.json', job)
    const paths = {
      current: '/current',
      temporary: '/current.tmp',
      legacyRecovery: '/recovery/rejected-current.idsw',
      backups: [
        '/current.backup.1',
        '/current.backup.2',
        '/current.backup.3',
      ] as const,
      transitionalStoredTimeJob: '/stored-time/job.json',
    }
    const createRepository = () => new PortableSaveRepository(
      storage,
      paths,
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => base,
    )

    let replacement = await createRepository().commit(base)
    for (let index = 0; index < 4; index += 1) {
      replacement = await createRepository().commit(replacement)
    }
    expect(
      replacement.copyValidatedState()
        [TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD],
    ).toBe(await sha256Utf8(job))
    storage.files.set('/current', 'damaged-after-proof-rotation')

    await expect(createRepository().migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({
        status: 'recovered-backup',
        sourcePath: '/current.backup.1',
      })
    expect(storage.files.get('/stored-time/job.json')).toBe(job)
    expect(
      deserializeWebSave(storage.files.get('/current')!)
        [TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD],
    ).toBe(await sha256Utf8(job))
  })

  test('retains host proof in the temporary slot across three failed replacements', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const job = storedTimeJobText(decodedPortableEnvelope(state), 7)
    const provenState = base.copyValidatedState()
    provenState.transitionalProductionV2CheckpointRevision = 7
    provenState.transitionalProductionV2StoredTimeJobSha256 =
      await sha256Utf8(job)
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', 'damaged-current')
    storage.files.set('/current.backup.1', serializeWebSave(provenState))
    storage.files.set('/stored-time/job.json', job)
    let failuresRemaining = 3
    vi.spyOn(storage, 'replaceAtomically').mockImplementation(async (
      temporaryPath,
      destinationPath,
    ) => {
      if (failuresRemaining > 0) {
        failuresRemaining -= 1
        throw new Error('simulated atomic replacement failure')
      }
      storage.files.set(destinationPath, await storage.readText(temporaryPath))
      storage.files.delete(temporaryPath)
    })
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        backups: [
          '/current.backup.1',
          '/current.backup.2',
          '/current.backup.3',
        ],
        transitionalStoredTimeJob: '/stored-time/job.json',
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => base,
    )

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(repository.commit(base)).rejects.toThrow(
        /simulated atomic replacement failure/u,
      )
      expect(
        deserializeWebSave(storage.files.get('/current.tmp')!)
          [TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD],
      ).toBe(await sha256Utf8(job))
    }
    await expect(repository.commit(base)).resolves.toBeInstanceOf(PreparedSave)
    expect(
      deserializeWebSave(storage.files.get('/current')!)
        [TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD],
    ).toBe(await sha256Utf8(job))
    expect(storage.files.get('/stored-time/job.json')).toBe(job)
  })

  test('does not accept a corrupt temporary slot as host retirement proof', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const job = storedTimeJobText(decodedPortableEnvelope(state), 7)
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', 'damaged-current')
    storage.files.set('/current.tmp', 'corrupt-temporary-proof')
    storage.files.set('/stored-time/job.json', job)
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        transitionalStoredTimeJob: '/stored-time/job.json',
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => base,
    )

    await expect(repository.commit(base)).rejects.toThrow(
      /no exact host-owned canonical retirement proof/u,
    )
    expect(storage.files.get('/current')).toBe('damaged-current')
    expect(storage.files.get('/current.tmp')).toBe('corrupt-temporary-proof')
    expect(storage.files.get('/stored-time/job.json')).toBe(job)
  })

  test('does not bootstrap revision-only evidence from the temporary slot', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const job = storedTimeJobText(decodedPortableEnvelope(state), 7)
    const revisionOnly = base.copyValidatedState()
    revisionOnly.transitionalProductionV2CheckpointRevision = 7
    const temporary = serializeWebSave(revisionOnly)
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', 'damaged-current')
    storage.files.set('/current.tmp', temporary)
    storage.files.set('/stored-time/job.json', job)
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        transitionalStoredTimeJob: '/stored-time/job.json',
      },
      () => {
        throw new Error('not a legacy save')
      },
    )

    await expect(repository.commit(base)).rejects.toThrow(
      /no exact host-owned canonical retirement proof/u,
    )
    expect(storage.files.get('/current')).toBe('damaged-current')
    expect(storage.files.get('/current.tmp')).toBe(temporary)
    expect(storage.files.get('/stored-time/job.json')).toBe(job)
  })

  test('does not re-read a sidecar when the candidate already carries proof', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const job = storedTimeJobText(decodedPortableEnvelope(state), 7)
    const provenState = base.copyValidatedState()
    provenState.transitionalProductionV2CheckpointRevision = 7
    provenState.transitionalProductionV2StoredTimeJobSha256 =
      await sha256Utf8(job)
    const proven = base.withValidatedState(provenState)
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', serializeWebSave(provenState))
    storage.files.set('/stored-time/job.json', job)
    const read = vi.spyOn(storage, 'readText')
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        transitionalStoredTimeJob: '/stored-time/job.json',
      },
      () => {
        throw new Error('not a legacy save')
      },
    )

    await expect(repository.commit(proven)).resolves.toBeInstanceOf(PreparedSave)
    expect(read.mock.calls.filter(([path]) =>
      path === '/stored-time/job.json'
    )).toHaveLength(0)
  })

  test('bootstraps a revision-only host migration on commit and recovers it later', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const job = storedTimeJobText(decodedPortableEnvelope(state), 7)
    const revisionOnly = base.copyValidatedState()
    revisionOnly.transitionalProductionV2CheckpointRevision = 7
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', serializeWebSave(revisionOnly))
    storage.files.set('/stored-time/job.json', job)
    const paths = {
      current: '/current',
      temporary: '/current.tmp',
      legacyRecovery: '/recovery/rejected-current.idsw',
      backups: [
        '/current.backup.1',
        '/current.backup.2',
        '/current.backup.3',
      ] as const,
      transitionalStoredTimeJob: '/stored-time/job.json',
    }
    const createRepository = () => new PortableSaveRepository(
      storage,
      paths,
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => base,
    )

    await expect(createRepository().migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'already-migrated' })
    const upgraded = await createRepository().commit(base)
    expect(
      upgraded.copyValidatedState()
        [TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD],
    ).toBe(await sha256Utf8(job))
    expect(
      (await createRepository().loadCurrent())!.copyValidatedState()
        [TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD],
    ).toBe(await sha256Utf8(job))
    await createRepository().commit(upgraded)
    storage.files.set('/current', 'damaged-after-proof-bootstrap')

    await expect(createRepository().migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({
        status: 'recovered-backup',
        sourcePath: '/current.backup.1',
      })
    expect(storage.files.get('/stored-time/job.json')).toBe(job)
  })

  test('recovers a damaged current directly from a revision-only canonical backup', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const job = storedTimeJobText(decodedPortableEnvelope(state), 7)
    const revisionOnly = base.copyValidatedState()
    revisionOnly.transitionalProductionV2CheckpointRevision = 7
    const backup = serializeWebSave(revisionOnly)
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', 'damaged-before-fixed-build-startup')
    storage.files.set('/current.backup.1', backup)
    storage.files.set('/stored-time/job.json', job)
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        backups: [
          '/current.backup.1',
          '/current.backup.2',
          '/current.backup.3',
        ],
        transitionalStoredTimeJob: '/stored-time/job.json',
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => base,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({
        status: 'recovered-backup',
        sourcePath: '/current.backup.1',
      })
    expect(
      deserializeWebSave(storage.files.get('/current')!)
        [TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD],
    ).toBe(await sha256Utf8(job))
    expect(storage.files.get('/stored-time/job.json')).toBe(job)
  })

  test.each(['newer-job', 'malformed-job'] as const)(
    'does not bootstrap revision-only host evidence for a %s',
    async (failure) => {
      const base = createDeterministicUnityFirstRunPreparedSave()
      const state = encodeAuthenticSchema13NumericLeaves(
        encodeState(hydrateGameState(base).state),
        '$',
      ) as SaveRecord
      let job = storedTimeJobText(
        decodedPortableEnvelope(state),
        failure === 'newer-job' ? 8 : 7,
      )
      if (failure === 'malformed-job') {
        const envelope = JSON.parse(job) as SaveRecord
        ;(envelope.record as SaveRecord).futureField = true
        job = JSON.stringify(envelope)
      }
      const revisionOnly = base.copyValidatedState()
      revisionOnly.transitionalProductionV2CheckpointRevision = 7
      const backup = serializeWebSave(revisionOnly)
      const storage = new TransitionalMemoryStorage()
      storage.files.set('/current', 'damaged-before-fixed-build-startup')
      storage.files.set('/current.backup.1', backup)
      storage.files.set('/stored-time/job.json', job)
      const repository = new PortableSaveRepository(
        storage,
        {
          current: '/current',
          temporary: '/current.tmp',
          legacyRecovery: '/recovery/rejected-current.idsw',
          backups: [
            '/current.backup.1',
            '/current.backup.2',
            '/current.backup.3',
          ],
          transitionalStoredTimeJob: '/stored-time/job.json',
        },
        () => {
          throw new Error('not a legacy save')
        },
        undefined,
        undefined,
        undefined,
        undefined,
        recoverTransitionalV2CheckpointWithMetadata,
        () => base,
      )

      await expect(repository.migrateLegacyOnFirstLaunch()).rejects
        .toBeInstanceOf(IncompatibleTransitionalCheckpointError)
      expect(storage.files.get('/current'))
        .toBe('damaged-before-fixed-build-startup')
      expect(storage.files.get('/current.backup.1')).toBe(backup)
      expect(storage.files.get('/stored-time/job.json')).toBe(job)
    },
  )

  test.each(['hash-mismatch', 'newer-job'] as const)(
    'blocks commit when the host proof has a %s',
    async (failure) => {
      const base = createDeterministicUnityFirstRunPreparedSave()
      const state = encodeAuthenticSchema13NumericLeaves(
        encodeState(hydrateGameState(base).state),
        '$',
      ) as SaveRecord
      const job = storedTimeJobText(
        decodedPortableEnvelope(state),
        failure === 'newer-job' ? 8 : 7,
      )
      const provenState = base.copyValidatedState()
      provenState.transitionalProductionV2CheckpointRevision = 7
      provenState.transitionalProductionV2StoredTimeJobSha256 =
        failure === 'hash-mismatch' ? 'a'.repeat(64) : await sha256Utf8(job)
      const proofText = serializeWebSave(provenState)
      const storage = new TransitionalMemoryStorage()
      storage.files.set('/current', 'damaged-before-approved-replacement')
      storage.files.set('/current.backup.1', proofText)
      storage.files.set('/stored-time/job.json', job)
      const repository = new PortableSaveRepository(
        storage,
        {
          current: '/current',
          temporary: '/current.tmp',
          legacyRecovery: '/recovery/rejected-current.idsw',
          transitionalStoredTimeJob: '/stored-time/job.json',
        },
        () => {
          throw new Error('not a legacy save')
        },
        undefined,
        undefined,
        undefined,
        undefined,
        recoverTransitionalV2CheckpointWithMetadata,
        () => base,
      )

      await expect(repository.commit(base)).rejects.toThrow(
        /no exact host-owned canonical retirement proof/u,
      )
      expect(storage.files.get('/current'))
        .toBe('damaged-before-approved-replacement')
      expect(storage.files.get('/current.backup.1')).toBe(proofText)
      expect(storage.files.get('/stored-time/job.json')).toBe(job)
    },
  )

  test('does not publish a retirement proof before canonical replacement succeeds', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const current = checkpointText(state, 7)
    const job = storedTimeJobText(decodedPortableEnvelope(state), 7)
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', current)
    storage.files.set('/stored-time/job.json', job)
    vi.spyOn(storage, 'replaceAtomically').mockRejectedValueOnce(
      new Error('canonical replace failed'),
    )
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        transitionalStoredTimeJob: '/stored-time/job.json',
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => base,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'recovery-write-failed' })
    expect(storage.files.get('/current')).toBe(current)
    expect(storage.files.get('/stored-time/job.json')).toBe(job)
    expect(storage.files.get('/recovery/rejected-current.idsw')).toBe(current)
  })

  test('blocks a newer durable V2 job while retaining both exact source files', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const current = checkpointText(state, 7)
    const dto = decodedPortableEnvelope(state)
    const job = storedTimeJobText(dto, 8)
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', current)
    storage.files.set('/stored-time/job.json', job)
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        backups: ['/current.backup.1'],
        transitionalStoredTimeJob: '/stored-time/job.json',
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => base,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).rejects
      .toBeInstanceOf(IncompatibleTransitionalCheckpointError)
    expect(storage.files.get('/current')).toBe(current)
    expect(storage.files.get('/stored-time/job.json')).toBe(job)
    expect(storage.files.get('/recovery/rejected-current.idsw')).toBe(current)
  })

  test('does not start fresh when an active V2 job has no outer checkpoint', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const job = storedTimeJobText(decodedPortableEnvelope(state), 7)
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/stored-time/job.json', job)
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        transitionalStoredTimeJob: '/stored-time/job.json',
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => base,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).rejects
      .toBeInstanceOf(IncompatibleTransitionalCheckpointError)
    expect(storage.files.get('/stored-time/job.json')).toBe(job)
    expect(storage.files.has('/current')).toBe(false)
  })

  test('blocks an unreadable V2 job without discarding its outer checkpoint', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const current = checkpointText(state, 7)
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', current)
    storage.files.set('/stored-time/job.json', 'unreadable-job-bytes')
    vi.spyOn(storage, 'readText').mockImplementation(async (path) => {
      if (path === '/stored-time/job.json') {
        throw new Error('sidecar read failed')
      }
      const value = storage.files.get(path)
      if (value === undefined) throw new Error(`Missing ${path}`)
      return value
    })
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        transitionalStoredTimeJob: '/stored-time/job.json',
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => base,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).rejects
      .toBeInstanceOf(IncompatibleTransitionalCheckpointError)
    expect(storage.files.get('/current')).toBe(current)
    expect(storage.files.get('/stored-time/job.json')).toBe(
      'unreadable-job-bytes',
    )
    expect(storage.files.get('/recovery/rejected-current.idsw')).toBe(current)
  })

  test('does not reinterpret a future canonical save as schema 13', () => {
    const compatibilityBase = createDeterministicUnityFirstRunPreparedSave()
    let recoveryBaseCalls = 0
    const future = serializeWebSave({ saveVersion: 17 })

    expect(() => prepareImportedSaveText(
      future,
      '2026-08-30T01:00:00.000Z',
      undefined,
      undefined,
      compatibilityBase.copyValidatedState(),
      () => {
        recoveryBaseCalls += 1
        return compatibilityBase
      },
    )).toThrow(/newer than supported schema/u)
    expect(recoveryBaseCalls).toBe(0)
  })

  test.each([
    {
      label: 'nested unknown state',
      createText: (state: SaveRecord) => {
        ;((state.dyson as SaveRecord).automation as SaveRecord)
          .futureAutomationState = true
        return portableText(state)
      },
    },
    {
      label: 'invalid runtime profile',
      createText: (state: SaveRecord) => portableText(state, {
        ...defaultRuntime(),
        dysonTuningProfile: 'future-profile',
      }),
    },
  ])('rejects raw schema-13 $label before constructing its compatibility base', ({
    createText,
  }) => {
    const compatibilityBase = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(compatibilityBase).state)
    let recoveryBaseCalls = 0

    expect(() => prepareImportedSaveText(
      createText(state),
      '2026-08-30T01:00:00.000Z',
      undefined,
      undefined,
      compatibilityBase.copyValidatedState(),
      () => {
        recoveryBaseCalls += 1
        return compatibilityBase
      },
    )).toThrow()
    expect(recoveryBaseCalls).toBe(0)
  })

  test('decodes one raw schema-13 transport once before constructing one compatibility base', () => {
    const compatibilityBase = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(compatibilityBase).state)
    const text = portableText(state)
    let recoveryBaseCalls = 0
    const decode = vi.spyOn(TextDecoder.prototype, 'decode')

    try {
      expect(prepareImportedSaveText(
        text,
        '2026-08-30T01:00:00.000Z',
        undefined,
        undefined,
        compatibilityBase.copyValidatedState(),
        () => {
          recoveryBaseCalls += 1
          return compatibilityBase
        },
      )).toBeInstanceOf(PreparedSave)
      expect(decode).toHaveBeenCalledTimes(1)
      expect(recoveryBaseCalls).toBe(1)
    } finally {
      decode.mockRestore()
    }
  })

  test('restores gameplay progress into the retained Unity graph exactly once', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const dyson = state.dyson as SaveRecord
    dyson.money = '12345'
    dyson.bots = '42'
    const infinity = state.infinity as SaveRecord
    infinity.availablePoints = '7'
    infinity.allocatedPoints = '3'
    delete infinity.points
    delete infinity.spentPoints
    const quantum = state.quantum as SaveRecord
    quantum.availableShards = '4'
    quantum.lifetimeEarnedShards = '9'
    delete quantum.pointsEarned
    delete quantum.pointsSpent
    ;(state.skills as SaveRecord).selectedPreset = 3

    const recovered = recoverTransitionalV2Checkpoint(
      checkpointText(state, 17),
      base,
    )

    expect(recovered).not.toBeNull()
    const hydrated = hydrateGameState(recovered!)
    expect(hydrated.state.dyson).toMatchObject({ money: 12_345, bots: 42 })
    expect(hydrated.state.infinity).toMatchObject({
      points: 10n,
      spentPoints: 3n,
    })
    expect(hydrated.state.quantum).toMatchObject({
      pointsEarned: 9n,
      pointsSpent: 5n,
    })
    expect(hydrated.state.timeline.processing.storedTimePreset).toBe('fast')
    expect(
      (recovered!.copyValidatedState().dysonVerseSaveData as SaveRecord)
        .selectedPreset,
    ).toBe(3)
    expect(
      recovered!.copyValidatedState()
        .transitionalProductionV2CheckpointRevision,
    ).toBe(17)
    expect(
      recoverTransitionalV2Checkpoint(checkpointText(state, 17), recovered!),
    ).toBeNull()
  })

  test('accepts the historical 32 MiB outer checkpoint boundary while retaining the portable limit', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    ;(state.dyson as SaveRecord).money = '314159'
    const checkpoint = checkpointText(state, 1)
    const outerPadding = ' '.repeat(2 * 1024 * 1024)

    const recovered = recoverTransitionalV2Checkpoint(
      `${checkpoint}${outerPadding}`,
      base,
    )

    expect(hydrateGameState(recovered!).state.dyson.money).toBe(314_159)
    expect(() => recoverTransitionalV2Checkpoint(
      `${portableText(state)}${outerPadding}`,
      base,
    )).toThrow(/supplied-text limit/u)
  })

  test('normalizes the authentic inactive V2 zero Break target sentinel', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    ;(state.infinity as SaveRecord).breakTarget = '0'
    ;((state.quantum as SaveRecord).unlocks as SaveRecord).breakTheLoop = false

    const recovered = recoverTransitionalV2Checkpoint(
      checkpointText(state, 1),
      base,
    )

    expect(hydrateGameState(recovered!).state.infinity.breakTarget).toBe(1n)
  })

  test('rejects an active V2 Break target of zero', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    ;(state.infinity as SaveRecord).breakTarget = '0'
    ;((state.quantum as SaveRecord).unlocks as SaveRecord).breakTheLoop = true

    expect(() =>
      recoverTransitionalV2Checkpoint(checkpointText(state, 1), base),
    ).toThrow(/must be positive/u)
  })

  test('recovers an authentic V2-first current slot with no older save source', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    ;(state.dyson as SaveRecord).money = '54321'
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', checkpointText(state, 8))
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => createDeterministicUnityFirstRunPreparedSave(),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'recovered-backup',
      sourcePath: '/current',
    })
    expect(
      hydrateGameState((await repository.loadCurrent())!).state.dyson.money,
    ).toBe(54_321)
    expect(storage.files.get('/recovery/rejected-current.idsw'))
      .toContain('ids-web-production-v2-checkpoint-v1')
  })

  test('restores V2 local preferences over stale pre-recovery device values', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', checkpointText(state, 8, {
      preferences: {
        ...defaultPreferences(),
        numberFormatting: 2,
        hidePurchased: true,
      },
    }))
    const preferenceStorage = new PreferenceMemoryStorage()
    preferenceStorage.setItem(
      NUMBER_NOTATION_STORAGE_KEY,
      JSON.stringify({ version: 1, mode: 'standard' }),
    )
    preferenceStorage.setItem(
      RESEARCH_VISIBILITY_STORAGE_KEY,
      JSON.stringify({ version: 1, hideCompleted: false }),
    )
    const notation = new NumberNotationPreferenceService({
      storage: preferenceStorage,
    })
    const visibility = new ResearchVisibilityPreferenceService({
      storage: preferenceStorage,
    })
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      notation,
      visibility,
      recoverTransitionalV2CheckpointWithMetadata,
      () => createDeterministicUnityFirstRunPreparedSave(),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'recovered-backup' })

    expect(notation.getSnapshot()).toBe('engineering')
    expect(visibility.getSnapshot()).toBe(true)
    expect(JSON.parse(
      preferenceStorage.getItem(NUMBER_NOTATION_STORAGE_KEY)!,
    )).toEqual({ version: 1, mode: 'engineering' })
    expect(JSON.parse(
      preferenceStorage.getItem(RESEARCH_VISIBILITY_STORAGE_KEY)!,
    )).toEqual({ version: 1, hideCompleted: true })
  })

  test('recovers a retained schema-13 portable import and overlays a newer V2 checkpoint', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const importedState = encodeState(hydrateGameState(base).state)
    ;(importedState.dyson as SaveRecord).money = '12345'
    const importedPortable = portableText(importedState)
    const currentState = encodeState(hydrateGameState(base).state)
    ;(currentState.dyson as SaveRecord).money = '54321'
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', checkpointText(currentState, 0))
    storage.files.set('/recovery/import-original.idsw', importedPortable)
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        retainedRecoverySources: ['/recovery/import-original.idsw'],
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => createDeterministicUnityFirstRunPreparedSave(),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({
        status: 'recovered-backup',
        sourcePath: '/current',
      })
    expect(
      hydrateGameState((await repository.loadCurrent())!).state.dyson.money,
    ).toBe(54_321)
  })

  test('uses a retained schema-13 portable import when the current slot is unreadable', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const importedState = encodeState(hydrateGameState(base).state)
    ;(importedState.dyson as SaveRecord).money = '24680'
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', 'damaged-current')
    storage.files.set(
      '/recovery/import-original.idsw',
      portableText(importedState),
    )
    const preferenceStorage = new PreferenceMemoryStorage()
    preferenceStorage.setItem(
      NUMBER_NOTATION_STORAGE_KEY,
      JSON.stringify({ version: 1, mode: 'scientific' }),
    )
    preferenceStorage.setItem(
      RESEARCH_VISIBILITY_STORAGE_KEY,
      JSON.stringify({ version: 1, hideCompleted: false }),
    )
    const notation = new NumberNotationPreferenceService({
      storage: preferenceStorage,
    })
    const visibility = new ResearchVisibilityPreferenceService({
      storage: preferenceStorage,
    })
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        retainedRecoverySources: ['/recovery/import-original.idsw'],
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      notation,
      visibility,
      recoverTransitionalV2CheckpointWithMetadata,
      () => createDeterministicUnityFirstRunPreparedSave(),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({
        status: 'recovered-backup',
        sourcePath: '/recovery/import-original.idsw',
      })
    expect(
      hydrateGameState((await repository.loadCurrent())!).state.dyson.money,
    ).toBe(24_680)
    expect(notation.getSnapshot()).toBe('scientific')
    expect(visibility.getSnapshot()).toBe(false)
  })

  test('does not bootstrap revision-only evidence from a retained canonical import', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeAuthenticSchema13NumericLeaves(
      encodeState(hydrateGameState(base).state),
      '$',
    ) as SaveRecord
    const job = storedTimeJobText(decodedPortableEnvelope(state), 7)
    const retainedState = base.copyValidatedState()
    retainedState.transitionalProductionV2CheckpointRevision = 7
    const retained = serializeWebSave(retainedState)
    const storage = new TransitionalMemoryStorage()
    storage.files.set('/current', 'damaged-current')
    storage.files.set('/recovery/import-original.idsw', retained)
    storage.files.set('/stored-time/job.json', job)
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        retainedRecoverySources: ['/recovery/import-original.idsw'],
        transitionalStoredTimeJob: '/stored-time/job.json',
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => base,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).rejects
      .toBeInstanceOf(IncompatibleTransitionalCheckpointError)
    expect(storage.files.get('/current')).toBe('damaged-current')
    expect(storage.files.get('/recovery/import-original.idsw')).toBe(retained)
    expect(storage.files.get('/stored-time/job.json')).toBe(job)
  })

  test('skips a checkpoint with a damaged gzip checksum and recovers the older V2 backup', async () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const damagedState = encodeState(hydrateGameState(base).state)
    ;(damagedState.dyson as SaveRecord).money = '99999'
    const backupState = encodeState(hydrateGameState(base).state)
    ;(backupState.dyson as SaveRecord).money = '76543'
    const storage = new TransitionalMemoryStorage()
    storage.files.set(
      '/current',
      corruptCheckpointPortableChecksum(checkpointText(damagedState, 2)),
    )
    storage.files.set('/current.backup.1', checkpointText(backupState, 1))
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      recoverTransitionalV2CheckpointWithMetadata,
      () => createDeterministicUnityFirstRunPreparedSave(),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({
        status: 'recovered-backup',
        sourcePath: '/current.backup.1',
      })
    expect(
      hydrateGameState((await repository.loadCurrent())!).state.dyson.money,
    ).toBe(76_543)
    expect(storage.files.get('/recovery/rejected-current.idsw')).toBe(
      corruptCheckpointPortableChecksum(checkpointText(damagedState, 2)),
    )
  })

  test('restores the durable runtime snapshot and local checkpoint state', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const recovered = recoverTransitionalV2Checkpoint(
      checkpointText(state, 3, {
        runtime: {
          dysonEvaluationSnapshot: {
            panelsPerSecond: '101.25',
            panelLifetimeSeconds: '202.5',
            scienceMultiplier: '3.75',
            rudimentarySingularityProduction: '4.5',
            pocketDimensionsProduction: '5.25',
            scientificPlanetsProduction: '6.75',
            managerAssemblyLineProduction: '7.5',
          },
          dysonTuningProfile: 'web-authored-v1',
        },
        preferences: {
          ...defaultPreferences(),
          globalMute: true,
          numberFormatting: 2,
          frameRate: 120,
        },
        platform: {
          debugOptions: true,
          debugEverEnabled: true,
          cheater: true,
          unlockAllTabs: true,
        },
      }),
      base,
    )

    expect(recovered).not.toBeNull()
    expect(hydrateGameState(recovered!).skillEffectEvaluationSnapshot)
      .toEqual({
        panelsPerSecond: 101.25,
        panelLifetimeSeconds: 202.5,
        scienceMultiplier: 3.75,
        rudimentarySingularityProduction: 4.5,
        pocketDimensionsProduction: 5.25,
        scientificPlanetsProduction: 6.75,
        managerAssemblyLineProduction: 7.5,
      })
    expect(recovered!.copyValidatedState()).toMatchObject({
      globalMute: true,
      numberFormatting: 2,
      frameRate: 120,
      debugOptions: true,
      debugEverEnabled: true,
      cheater: true,
      unlockAllTabs: true,
    })
  })

  test('settles a valid pending V2 railgun interval instead of rejecting the save', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const dream = state.dream as SaveRecord
    const railgun = dream.railgun as SaveRecord
    railgun.pendingBaseSeconds = 0.25
    railgun.pendingDreamSeconds = 0.5

    expect(
      recoverTransitionalV2Checkpoint(checkpointText(state, 2), base),
    ).not.toBeNull()
  })

  test('settles every volley in the maximum authentic V2 pending interval', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const dream = state.dream as SaveRecord
    const resources = dream.resources as SaveRecord
    const parameters = dream.parameters as SaveRecord
    const upgrades = dream.upgrades as SaveRecord
    const railgun = dream.railgun as SaveRecord
    resources.energy = '12'
    resources.railgunCharge = '0'
    resources.dysonPanels = '120'
    resources.swarmPanels = '0'
    parameters.railgunMaxCharge = '1'
    parameters.solarPanelGeneration = '0'
    parameters.fusionGeneration = '0'
    parameters.swarmPanelGeneration = '0'
    upgrades.railguns1 = true
    railgun.firing = false
    railgun.fireProgress = 0
    railgun.shotsRemaining = 0
    railgun.activeRailguns = 0
    railgun.reservedPanels = '0'
    railgun.pendingBaseSeconds = 1
    railgun.pendingDreamSeconds = 11

    const recovered = recoverTransitionalV2Checkpoint(
      checkpointText(state, 3),
      base,
    )

    expect(recovered).not.toBeNull()
    const recoveredDream = hydrateGameState(recovered!).state.dream
    expect(recoveredDream).toMatchObject({
      resources: {
        dysonPanels: 0n,
        swarmPanels: 110n,
      },
      railgun: {
        firing: true,
        fireProgress: 0,
        shotsRemaining: 10,
        activeRailguns: 1,
        reservedPanels: 10n,
      },
    })
    expect(recoveredDream.resources.energy).toBeCloseTo(0, 12)
    expect(recoveredDream.resources.railgunCharge).toBeCloseTo(1, 12)
  })

  test('retains authentic fractional progress after a pending V2 round', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const dream = state.dream as SaveRecord
    const resources = dream.resources as SaveRecord
    const parameters = dream.parameters as SaveRecord
    const upgrades = dream.upgrades as SaveRecord
    const railgun = dream.railgun as SaveRecord
    resources.energy = '0'
    resources.railgunCharge = '1'
    resources.dysonPanels = '0'
    resources.swarmPanels = '0'
    parameters.railgunMaxCharge = '1'
    parameters.solarPanelGeneration = '0'
    parameters.fusionGeneration = '0'
    parameters.swarmPanelGeneration = '0'
    upgrades.railguns1 = true
    railgun.firing = true
    railgun.fireProgress = 0.05
    railgun.shotsRemaining = 10
    railgun.activeRailguns = 1
    railgun.reservedPanels = '10'
    railgun.pendingBaseSeconds = 0.1
    railgun.pendingDreamSeconds = 0.1

    const recovered = recoverTransitionalV2Checkpoint(
      checkpointText(state, 3),
      base,
    )

    expect(recovered).not.toBeNull()
    const recoveredDream = hydrateGameState(recovered!).state.dream
    expect(recoveredDream.railgun).toMatchObject({
      firing: true,
      shotsRemaining: 9,
      activeRailguns: 1,
      reservedPanels: 9n,
    })
    expect(recoveredDream.railgun.fireProgress).toBeCloseTo(0.05, 12)
    expect(recoveredDream.resources.swarmPanels).toBe(1n)
    expect(recoveredDream.resources.railgunCharge).toBeCloseTo(0.9, 12)
  })

  test.each([
    ['stored-time-fast-v1', 'fast'],
    ['stored-time-balanced-v1', 'balanced'],
    ['stored-time-exact-v1', 'accurate'],
  ] as const)('restores V2 Stored Time policy %s as %s', (
    policyId,
    expected,
  ) => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const recovered = recoverTransitionalV2Checkpoint(
      checkpointText(state, 4),
      base,
      {
        storedTimePolicyText: JSON.stringify({
          format: 'ids-web-production-v2-stored-time-policy-v1',
          policyId,
        }),
      },
    )

    expect(
      hydrateGameState(recovered!).state.timeline.processing.storedTimePreset,
    ).toBe(expected)
  })

  test('consolidates the retired V2 Double Time bank into Stored Time', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const timeline = state.timeline as SaveRecord
    timeline.storedTimeAvailableSeconds = 100
    timeline.storedTimeCapacitySeconds = 150
    timeline.doubleTime = {
      unlocked: true,
      enabled: true,
      bankSeconds: 75,
      rate: 3,
    }

    const recovered = recoverTransitionalV2Checkpoint(
      checkpointText(state, 5),
      base,
    )

    expect(hydrateGameState(recovered!).state.timeline).toMatchObject({
      storedTimeAvailableSeconds: 150,
      storedTimeCapacitySeconds: 150,
      doubleTime: {
        unlocked: true,
        enabled: false,
        bankSeconds: 0,
        rate: 0,
      },
    })
  })

  test.each([
    {
      label: 'invalid selected preset',
      mutate: (state: SaveRecord) => {
        ;(state.skills as SaveRecord).selectedPreset = 6
      },
      expected: /selectedPreset contains an unsupported enum value/u,
    },
    {
      label: 'truncated preset inventory',
      mutate: (state: SaveRecord) => {
        ;(state.skills as SaveRecord).presets = (
          (state.skills as SaveRecord).presets as unknown[]
        ).slice(0, 4)
      },
      expected: /exactly 5 entries/u,
    },
  ])('rejects a structurally damaged checkpoint with $label', ({
    mutate,
    expected,
  }) => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    mutate(state)

    expect(() =>
      recoverTransitionalV2Checkpoint(checkpointText(state, 1), base),
    ).toThrow(expected)
  })

  test.each([
    {
      label: 'unknown root field',
      mutate: (state: SaveRecord) => {
        state.futureModelState = true
      },
      expected: /\$\.state\.futureModelState is an undeclared field/u,
    },
    {
      label: 'unknown nested field',
      mutate: (state: SaveRecord) => {
        ;((state.dyson as SaveRecord).automation as SaveRecord)
          .futureAutomationState = true
      },
      expected: /\$\.state\.dyson\.automation\.futureAutomationState is an undeclared field/u,
    },
    {
      label: 'current-only field absent from V2',
      mutate: (state: SaveRecord) => {
        ;(state.timeline as SaveRecord).processing = {}
      },
      expected: /\$\.state\.timeline\.processing is an undeclared field/u,
    },
  ])('rejects $label in the closed schema-13 tree', ({
    mutate,
    expected,
  }) => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    mutate(state)

    expect(() => recoverTransitionalV2Checkpoint(
      checkpointText(state, 1),
      base,
    )).toThrow(expected)
  })

  test('does not accept a current-base-only dynamic key as schema-13 state', () => {
    const initial = createDeterministicUnityFirstRunPreparedSave()
    const widened = initial.copyValidatedState()
    const infinityData = (
      widened.dysonVerseSaveData as SaveRecord
    ).dysonVerseInfinityData as SaveRecord
    infinityData.researchLevelsById = {
      ...(infinityData.researchLevelsById as SaveRecord),
      'research.current_only_future': 0,
    }
    infinityData.researchProgressById = {
      ...(infinityData.researchProgressById as SaveRecord),
      'research.current_only_future': 0,
    }
    const widenedBase = initial.withValidatedState(widened)
    const state = encodeState(hydrateGameState(widenedBase).state)
    ;((state.research as SaveRecord).levelsById as SaveRecord)
      ['research.current_only_future'] = '0'

    expect(() => recoverTransitionalV2Checkpoint(
      checkpointText(state, 1),
      widenedBase,
    )).toThrow(/research\.current_only_future is an undeclared field/u)
  })

  test.each([
    {
      label: 'decode depth',
      mutate: (state: SaveRecord) => {
        let nested: unknown = ''
        for (let depth = 0; depth < 130; depth += 1) nested = [nested]
        ;(state.skills as SaveRecord).activeAutoAssignment = [nested]
      },
      expected: /maximum decode depth/u,
    },
    {
      label: 'container count',
      mutate: (state: SaveRecord) => {
        ;(state.skills as SaveRecord).activeAutoAssignment =
          Array.from({ length: 100_001 }, () => [])
      },
      expected: /maximum container count/u,
    },
    {
      label: 'entry count',
      mutate: (state: SaveRecord) => {
        ;(state.skills as SaveRecord).activeAutoAssignment =
          Array.from({ length: 250_001 }, () => '')
      },
      expected: /maximum entry count/u,
    },
    {
      label: 'string length',
      mutate: (state: SaveRecord) => {
        ;(((state.skills as SaveRecord).presets as SaveRecord[])[0]!)
          .name = 'x'.repeat(65_537)
      },
      expected: /string length limit/u,
    },
  ])('enforces the historical schema-13 $label budget', ({
    mutate,
    expected,
  }) => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    mutate(state)

    expect(() => recoverTransitionalV2Checkpoint(
      checkpointText(state, 1),
      base,
    )).toThrow(expected)
  })

  test('accepts schema-13 nullable text independently of the retained base value', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    ;(state.meta as SaveRecord).createdAtLegacyText = null
    ;(state.timeline as SaveRecord).lastSuspendedAtLegacyText = null
    ;(
      (state.statistics as SaveRecord).lastCompletedCycle as SaveRecord
    ).dreamCause = null

    expect(
      recoverTransitionalV2Checkpoint(checkpointText(state, 1), base),
    ).not.toBeNull()
  })

  test('uses the V2 cycle cause to saturate a large Infinity reward at discrete authority', () => {
    const initial = createDeterministicUnityFirstRunPreparedSave()
    const initialSession = hydrateGameState(initial)
    const base = dehydrateGameState(initialSession, {
      ...initialSession.state,
      statistics: {
        ...initialSession.state.statistics,
        lastCompletedCycle: {
          valid: true,
          breakInfinity: false,
          durationSeconds: 10,
          reward: 5,
          dreamCause: 'Meteor',
        },
      },
    })
    const state = encodeState(hydrateGameState(base).state)
    ;(state.statistics as SaveRecord).lastCompletedCycle = {
      valid: true,
      breakInfinity: true,
      durationSeconds: 20,
      reward: '1e20',
      dreamCause: null,
    }

    const reloaded = roundTrip(
      recoverTransitionalV2Checkpoint(checkpointText(state, 1), base)!,
    )

    expect(hydrateGameState(reloaded).state.statistics.lastCompletedCycle)
      .toMatchObject({
        reward: DISCRETE_MAXIMUM,
        dreamCause: null,
      })
  })

  test('uses the V2 cycle cause to restore a Dream reward as a saturated continuous value', () => {
    const initial = createDeterministicUnityFirstRunPreparedSave()
    const initialSession = hydrateGameState(initial)
    const base = dehydrateGameState(initialSession, {
      ...initialSession.state,
      statistics: {
        ...initialSession.state.statistics,
        lastCompletedCycle: {
          valid: true,
          breakInfinity: true,
          durationSeconds: 10,
          reward: 5n,
          dreamCause: null,
        },
      },
    })
    const state = encodeState(hydrateGameState(base).state)
    ;(state.statistics as SaveRecord).lastCompletedCycle = {
      valid: true,
      breakInfinity: false,
      durationSeconds: 20,
      reward: '1e400',
      dreamCause: 'Meteor',
    }

    const reloaded = roundTrip(
      recoverTransitionalV2Checkpoint(checkpointText(state, 1), base)!,
    )

    expect(hydrateGameState(reloaded).state.statistics.lastCompletedCycle)
      .toMatchObject({
        reward: Number.MAX_VALUE,
        dreamCause: 'Meteor',
      })
  })

  test('saturates an overflowing continuous decimal instead of rejecting the save', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    ;(state.dyson as SaveRecord).money = '1e400'
    const infinity = state.infinity as SaveRecord
    infinity.availablePoints = '0'
    infinity.allocatedPoints = '0'
    const quantum = state.quantum as SaveRecord
    quantum.availableShards = '0'
    quantum.lifetimeEarnedShards = '0'

    const recovered = recoverTransitionalV2Checkpoint(
      checkpointText(state, 1),
      base,
    )

    expect(hydrateGameState(recovered!).state.dyson.money)
      .toBe(Number.MAX_VALUE)
  })

  test.each([
    ['dyson panel inventory', 'resources', 'dysonPanels'],
    ['swarm panel inventory', 'resources', 'swarmPanels'],
    ['reserved railgun panels', 'railgun', 'reservedPanels'],
    ['highest stored railgun panels', 'railgun', 'highestStoredPanels'],
  ] as const)('round-trips capped V2 %s at the authentic Decimal ceiling', (
    _label,
    section,
    field,
  ) => {
    const recoverAt = (value: string) => {
      const base = createDeterministicUnityFirstRunPreparedSave()
      const state = encodeState(hydrateGameState(base).state)
      const dream = state.dream as SaveRecord
      const target = dream[section] as SaveRecord
      target[field] = value
      return hydrateGameState(roundTrip(
        recoverTransitionalV2Checkpoint(
          checkpointText(state, 1),
          base,
        )!,
      )).state.dream[section][field]
    }

    const largestHistoricalFiniteInteger = BigInt(
      `17976931348623157${'0'.repeat(292)}`,
    )
    expect(recoverAt('1.7976931348623157e308'))
      .toBe(largestHistoricalFiniteInteger)
    expect(recoverAt('1e309'))
      .toBe(SIMULATION_RESOURCE_MAXIMUM)
  })

  test.each([
    '2147483648',
    '1e1000',
  ])('saturates V2 Infinity Break target %s at its current authored ceiling', (
    value,
  ) => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    ;(state.infinity as SaveRecord).breakTarget = value

    const recovered = hydrateGameState(roundTrip(
      recoverTransitionalV2Checkpoint(checkpointText(state, 1), base)!,
    )).state

    expect(recovered.infinity.breakTarget).toBe(2_147_483_647n)
  })

  test.each([
    ['4.9e-1', 0n],
    ['5e-1', 1n],
    ['1.49e0', 1n],
    ['1.5e0', 2n],
  ] as const)(
    'rounds authentic ordinary Dream generation Decimal %s half-up into bigint',
    (value, expected) => {
      const base = createDeterministicUnityFirstRunPreparedSave()
      const state = encodeState(hydrateGameState(base).state)
      const parameters = (state.dream as SaveRecord).parameters as SaveRecord
      parameters.solarPanelGeneration = value
      parameters.fusionGeneration = value
      parameters.swarmPanelGeneration = value

      const recovered = hydrateGameState(roundTrip(
        recoverTransitionalV2Checkpoint(checkpointText(state, 1), base)!,
      )).state.dream.parameters

      expect(recovered.solarPanelGeneration).toBe(expected)
      expect(recovered.fusionGeneration).toBe(expected)
      expect(recovered.swarmPanelGeneration).toBe(expected)
    },
  )

  test('saturates schema-13 unbounded integer progress at current gameplay authority', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const hugeDecimal = '1e8999999999999999'
    const hugeBigInt = `1${'0'.repeat(1_000)}`
    const infinity = state.infinity as SaveRecord
    infinity.availablePoints = hugeDecimal
    infinity.allocatedPoints = '0'
    infinity.breakTarget = hugeDecimal
    const skills = state.skills as SaveRecord
    skills.points = hugeBigInt
    const reality = state.reality as SaveRecord
    reality.universeDesignationCount = hugeDecimal
    const quantum = state.quantum as SaveRecord
    quantum.availableShards = hugeDecimal
    quantum.lifetimeEarnedShards = hugeDecimal
    quantum.influenceSpeedBonus = hugeDecimal
    quantum.cashBonusLevels = hugeDecimal
    quantum.scienceBonusLevels = hugeDecimal
    ;(state.timeline as SaveRecord).infinityCycleStartingPoints = hugeDecimal
    const dream = state.dream as SaveRecord
    const resources = dream.resources as SaveRecord
    resources.hunters = hugeDecimal
    resources.gatherers = hugeDecimal
    const parameters = dream.parameters as SaveRecord
    for (const field of [
      'hunterCost',
      'gathererCost',
      'rocketsPerSpaceFactory',
      'solarCost',
      'solarPanelGeneration',
      'fusionCost',
      'fusionGeneration',
      'swarmPanelGeneration',
    ]) parameters[field] = hugeDecimal
    dream.resetCount = hugeBigInt
    dream.huntersPerPurchase = hugeDecimal
    dream.gatherersPerPurchase = hugeDecimal
    const statistics = state.statistics as SaveRecord
    for (const totalsName of [
      'lifetime',
      'currentQuantumRun',
      'recentProcessedSegment',
    ]) {
      const totals = statistics[totalsName] as SaveRecord
      for (const field of [
        'ordinaryInfinityCount',
        'breakInfinityCount',
        'meteorDreamResets',
        'aiDreamResets',
        'globalWarmingDreamResets',
        'blackHoleDreamResets',
      ]) totals[field] = hugeBigInt
      for (const field of [
        'ordinaryInfinityPoints',
        'breakInfinityPoints',
        'botCapInfinityPoints',
        'botCapOverflowRewards',
        'realityWorkers',
      ]) totals[field] = hugeDecimal
    }
    for (const collection of [
      'minuteWindows',
      'halfHourWindows',
      'dailyWindows',
    ]) {
      const first = (statistics[collection] as SaveRecord[])[0]!
      first.sequence = hugeBigInt
      first.infinityCount = hugeBigInt
      first.infinityPoints = hugeDecimal
      first.dreamResetCount = hugeBigInt
      first.realityWorkers = hugeDecimal
    }

    const recovered = hydrateGameState(roundTrip(
      recoverTransitionalV2Checkpoint(checkpointText(state, 1), base)!,
    )).state

    expect(recovered.infinity.points).toBe(DISCRETE_MAXIMUM)
    expect(recovered.infinity.breakTarget).toBe(2_147_483_647n)
    expect(recovered.skills.points).toBe(DISCRETE_MAXIMUM)
    expect(recovered.reality.universeDesignationCount)
      .toBe(SIMULATION_RESOURCE_MAXIMUM)
    expect(recovered.quantum.pointsEarned).toBe(DISCRETE_MAXIMUM)
    expect(recovered.quantum.influenceSpeedBonus)
      .toBe(DISCRETE_MAXIMUM)
    expect(recovered.timeline.infinityCycleStartingPoints)
      .toBe(DISCRETE_MAXIMUM)
    expect(recovered.dream.resources.hunters).toBe(DISCRETE_MAXIMUM)
    expect(recovered.dream.parameters.solarPanelGeneration)
      .toBe(DISCRETE_MAXIMUM)
    expect(recovered.dream.parameters.fusionGeneration)
      .toBe(DISCRETE_MAXIMUM)
    expect(recovered.dream.parameters.swarmPanelGeneration)
      .toBe(DISCRETE_MAXIMUM)
    expect(recovered.dream.resetCount).toBe(DISCRETE_MAXIMUM)
    expect(recovered.statistics.lifetime.breakInfinityPoints)
      .toBe(DISCRETE_MAXIMUM)
    expect(recovered.statistics.minuteWindows[0]?.infinityPoints)
      .toBe(DISCRETE_MAXIMUM)
    expect(availableCanonicalInfinityShopPoints(recovered))
      .toBe(DISCRETE_MAXIMUM)
    expect(advanceRealityWorkers(recovered, 0).status)
      .not.toBe('invalid-state')
  })

  test('preserves a schema-13 universe designation beyond the discrete ceiling', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const designation = 9_223_372_036_854_776_000n
    ;(state.reality as SaveRecord).universeDesignationCount =
      '9.223372036854776e18'

    const recovered = hydrateGameState(roundTrip(
      recoverTransitionalV2Checkpoint(checkpointText(state, 1), base)!,
    )).state

    expect(recovered.reality.universeDesignationCount).toBe(designation)
  })

  test('preserves spendable balance when saturating oversized V2 ledgers', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const available = 5_000_000_000_000_000_000n
    const huge = '1e8999999999999999'
    const infinity = state.infinity as SaveRecord
    infinity.availablePoints = available.toString()
    infinity.allocatedPoints = huge
    const quantum = state.quantum as SaveRecord
    quantum.availableShards = available.toString()
    quantum.lifetimeEarnedShards = huge

    const recovered = hydrateGameState(roundTrip(
      recoverTransitionalV2Checkpoint(checkpointText(state, 1), base)!,
    )).state

    expect(recovered.infinity.points).toBe(DISCRETE_MAXIMUM)
    expect(recovered.infinity.spentPoints)
      .toBe(DISCRETE_MAXIMUM - available)
    expect(availableCanonicalInfinityShopPoints(recovered)).toBe(available)
    expect(recovered.quantum.pointsEarned).toBe(DISCRETE_MAXIMUM)
    expect(recovered.quantum.pointsSpent)
      .toBe(DISCRETE_MAXIMUM - available)
    expect(
      recovered.quantum.pointsEarned - recovered.quantum.pointsSpent,
    ).toBe(available)
  })

  test('preserves exact V2 Skill and unbounded Research levels through the safe-integer ceiling', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const skills = (state.skills as SaveRecord).byId as SaveRecord
    const skillId = Object.keys(skills)[0]!
    ;(skills[skillId] as SaveRecord).level =
      String(Number.MAX_SAFE_INTEGER)
    const research = state.research as SaveRecord
    ;(research.levelsById as SaveRecord)['research.money_multiplier'] =
      String(Number.MAX_SAFE_INTEGER)

    const recovered = recoverTransitionalV2Checkpoint(
      checkpointText(state, 1),
      base,
    )
    const hydrated = hydrateGameState(recovered!)

    expect(hydrated.state.skills.byId[skillId]?.level)
      .toBe(Number.MAX_SAFE_INTEGER)
    expect(hydrated.state.research.levelsById['research.money_multiplier'])
      .toBe(Number.MAX_SAFE_INTEGER)
  })

  test.each([
    ['Skill', (state: SaveRecord) => {
      const skills = (state.skills as SaveRecord).byId as SaveRecord
      const skillId = Object.keys(skills)[0]!
      ;(skills[skillId] as SaveRecord).level = '9007199254740992'
    }],
    ['Research', (state: SaveRecord) => {
      const research = state.research as SaveRecord
      ;(research.levelsById as SaveRecord)['research.money_multiplier'] =
        '9007199254740992'
    }],
  ] as const)('fails closed when an exact V2 %s level exceeds the current integer range', (
    _label,
    mutate,
  ) => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    mutate(state)

    expect(() =>
      recoverTransitionalV2Checkpoint(checkpointText(state, 1), base),
    ).toThrow(/exact integer range/u)
  })

  test('rejects a capped V2 Research level above its authored maximum', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const research = state.research as SaveRecord
    ;(research.levelsById as SaveRecord)['research.panel_lifetime_1'] = '2'

    expect(() =>
      recoverTransitionalV2Checkpoint(checkpointText(state, 1), base),
    ).toThrow(/authored maximum/u)
  })

  test.each([
    {
      label: 'owned gameplay section',
      remove: (state: SaveRecord) => delete state.dyson,
      expectedPath: '$.state.dyson',
    },
    {
      label: 'V2-only railgun field',
      remove: (state: SaveRecord) => {
        delete ((state.dream as SaveRecord).railgun as SaveRecord)
          .pendingBaseSeconds
      },
      expectedPath: '$.state.dream.railgun.pendingBaseSeconds',
    },
  ])('rejects a checkpoint missing a required $label', ({
    remove,
    expectedPath,
  }) => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    remove(state)

    expect(() =>
      recoverTransitionalV2Checkpoint(checkpointText(state, 1), base),
    ).toThrow(expectedPath)
  })
})

function checkpointText(
  state: SaveRecord,
  revision: number,
  overrides: Readonly<{
    runtime?: SaveRecord
    preferences?: SaveRecord
    platform?: SaveRecord
  }> = {},
): string {
  const portableSave = portableText(state, overrides.runtime)
  return JSON.stringify({
    format: 'ids-web-production-v2-checkpoint-v1',
    revision,
    portableSave,
    preferences: overrides.preferences ?? defaultPreferences(),
    platform: overrides.platform ?? defaultPlatform(),
  })
}

function checkpointTextRaw(
  state: SaveRecord,
  revision: number,
): string {
  return JSON.stringify({
    format: 'ids-web-production-v2-checkpoint-v1',
    revision,
    portableSave: portableText(state, defaultRuntime(), false),
    preferences: defaultPreferences(),
    platform: defaultPlatform(),
  })
}

function storedTimeJobText(
  checkpointDto: SaveRecord,
  publicationRevision: number,
): string {
  const hash = '0'.repeat(64)
  const workerState = {
    ...(checkpointDto.state as SaveRecord),
    modelVersion: 2,
  }
  const zeroAccounting = {
    cumulativeProcessedSeconds: 0,
    cumulativeDoubleTimeConsumedSeconds: 0,
    cumulativeInfinityElapsedSeconds: 0,
    cumulativeInfinityResetCount: '0',
    lastInfinityResetElapsedSeconds: null,
    sealedInfinityCycleSeconds: 0,
    sealedInfinityBoundaryRemaining: 0,
    cumulativeRawAutomationTicks: '0',
    cumulativeRepresentativeGroups: 0,
    automationTimeUntilNextEvent: 0,
  }
  const zeroSchedulerSummary = {
    automationTicks: '0',
    analyticallySkippedAutomationTicks: '0',
    storedTimeConsumedSeconds: 0,
    baseSimulationSeconds: 0,
    dreamSimulationSeconds: 0,
    infinityResetCount: '0',
    dreamResetCount: '0',
    dreamFastNormalizedResetCount: '0',
    dreamFastNormalizationFirstCycleElapsedSeconds: null,
    dreamFastNormalizationCycleSeconds: null,
    dreamMeteorResetCount: '0',
    dreamAiResetCount: '0',
    dreamGlobalWarmingResetCount: '0',
    dreamBlackHoleResetCount: '0',
    dreamStrangeMatterRequested: '0',
    dreamStrangeMatterEffective: '0',
    dreamStrangeMatterFinal: null,
    dreamLifetimeStrangeMatterFinal: null,
    dreamCurrentQuantumRunStrangeMatterFinal: null,
    dreamRecentProcessedSegmentStrangeMatterFinal: null,
    quantumResetCount: '0',
    quantumEntanglementCount: '0',
    quantumAvailableShardsEffective: '0',
    quantumLifetimeShardsEffective: '0',
    quantumInfinityPointsConsumed: '0',
    quantumAvailableShardsFinal: null,
    quantumLifetimeShardsFinal: null,
    quantumInfinityAvailableFinal: null,
    quantumInfinityAllocatedFinal: null,
    quantumResetSkillPointsFinal: null,
    lastInfinityResetElapsedSeconds: null,
    materialEvents: 0,
    zeroTimePasses: 0,
    boundaryDigest: '0000000000000000',
  }
  const originAuthority = {
    storedTimeAvailableSeconds: 100,
    doubleTimeUnlocked: false,
    doubleTimeBankSeconds: 0,
    doubleTimeRate: 2,
    infinityCycleSeconds: 0,
    infinityBoundaryRemaining: 0,
    initialAutomationHorizonSeconds: 0,
    initialAutomationTargetIndex: 0,
    initialResearchAutomationTargetIndex: 0,
    researchAutomationUnlocked: false,
    permanentDoubleIp: false,
    dreamStrangeMatter: '0',
    dreamResetCount: '0',
    lifetimeStrangeMatter: '0',
    currentQuantumRunStrangeMatter: '0',
    recentProcessedSegmentStrangeMatter: '0',
    lifetimeMeteorDreamResets: '0',
    lifetimeAiDreamResets: '0',
    lifetimeGlobalWarmingDreamResets: '0',
    lifetimeBlackHoleDreamResets: '0',
    currentQuantumRunMeteorDreamResets: '0',
    currentQuantumRunAiDreamResets: '0',
    currentQuantumRunGlobalWarmingDreamResets: '0',
    currentQuantumRunBlackHoleDreamResets: '0',
    recentProcessedSegmentMeteorDreamResets: '0',
    recentProcessedSegmentAiDreamResets: '0',
    recentProcessedSegmentGlobalWarmingDreamResets: '0',
    recentProcessedSegmentBlackHoleDreamResets: '0',
    originQueuedInputs: [],
  }
  return rehashStoredTimeJobEnvelope({
    format: 'ids-web-production-v2-stored-time-job-v1',
    record: {
      kind: 'stored-time-checkpoint-v2',
      jobId: 'job-authentic-fixture',
      workerInstanceNonce: 'worker-authentic-fixture',
      writerOwnerId: 'writer-authentic-fixture',
      writerGeneration: 1,
      originRevision: Math.max(0, publicationRevision - 1),
      acknowledgedBaseRevision: Math.max(0, publicationRevision - 1),
      proposedBaseRevision: publicationRevision,
      buildId: 'test-release-build-a',
      catalogHash: hash,
      tuningHash: hash,
      policyId: 'stored-time-fast-v1',
      policyVersion: 1,
      checkpointSequence: 1,
      admittedBankSeconds: 100,
      requestedDurationSeconds: 50,
      tuningProfileId: 'web-authored-v1',
      unrequestedReserveSeconds: 50,
      requestedRawAutomationTicks: '0',
      automationIntervalSeconds: 0.1,
      originAuthority,
      cumulativeAccounting: zeroAccounting,
      sealedRemainingDurationSeconds: 50,
      schedulerSummary: zeroSchedulerSummary,
      rebasedQueuedInputs: [],
      publicationHash: hash,
      publication: {
        state: workerState,
        runtime: checkpointDto.runtime,
      },
      candidateHash: hash,
    },
  })
}

function rehashStoredTimeJobEnvelope(envelope: SaveRecord): string {
  const record = envelope.record as SaveRecord
  record.publicationHash = hashCanonicalTransitionalV2StoredTimeValue(
    record.publication,
  )
  const { candidateHash: _candidateHash, ...core } = record
  record.candidateHash = hashCanonicalTransitionalV2StoredTimeValue(core)
  return JSON.stringify(envelope)
}

function decodedPortableEnvelope(
  state: SaveRecord,
  runtime: SaveRecord = defaultRuntime(),
): SaveRecord {
  return {
    schemaVersion: 13,
    modelVersion: 2,
    savedAtUtc: '2026-08-30T00:00:00.000Z',
    state,
    runtime: encodeAuthenticSchema13NumericLeaves(
      runtime,
      '$.runtime',
    ) as SaveRecord,
  }
}

function portableText(
  state: SaveRecord,
  runtime: SaveRecord = defaultRuntime(),
  canonicalizeNumericLeaves = true,
): string {
  const portable = {
    schemaVersion: 13,
    modelVersion: 2,
    savedAtUtc: '2026-08-30T00:00:00.000Z',
    state: canonicalizeNumericLeaves
      ? encodeAuthenticSchema13NumericLeaves(state, '$')
      : state,
    runtime: canonicalizeNumericLeaves
      ? encodeAuthenticSchema13NumericLeaves(runtime, '$.runtime')
      : runtime,
  }
  const compressed = gzipSync(strToU8(JSON.stringify(portable)), {
    level: 9,
    mtime: 0,
  })
  return `IDSWEB1:${Buffer.from(compressed).toString('base64')}`
}

function corruptCheckpointPortableChecksum(text: string): string {
  const checkpoint = JSON.parse(text) as SaveRecord
  checkpoint.portableSave = corruptPortableChecksum(
    String(checkpoint.portableSave),
  )
  return JSON.stringify(checkpoint)
}

function corruptPortableChecksum(portableSave: string): string {
  const compressed = Buffer.from(
    portableSave.slice('IDSWEB1:'.length),
    'base64',
  )
  compressed[compressed.length - 8] = compressed[compressed.length - 8]! ^ 1
  return `IDSWEB1:${compressed.toString('base64')}`
}

function roundTrip(save: PreparedSave): PreparedSave {
  return PreparedSave.fromDecoded(deserializeWebSave(serializeWebSave(
    save.copyValidatedState(),
  )))
}

function encodeState(value: unknown): SaveRecord {
  const state = encodeValue(value) as SaveRecord
  delete state.challenges
  delete state.modelVersion
  delete (state.avocado as SaveRecord).overflowPoints
  const meta = state.meta as SaveRecord
  delete meta.navigationRouteDiscovery
  const navigation = (meta.navigationVisibility ?? {}) as SaveRecord
  meta.navigationVisibility = {
    story: navigation.story ?? false,
    wiki: navigation.wiki ?? false,
    statistics: navigation.statistics ?? false,
  }
  const infinity = state.infinity as SaveRecord
  delete infinity.automaticResetEnabled
  delete infinity.currentCyclePeakIpPerMinute
  delete infinity.currentCyclePeakReward
  delete infinity.manualPeakIpPerMinute
  delete infinity.manualPeakReward
  delete infinity.manualCalibrationObservedActiveSeconds
  delete infinity.activeAutomaticThroughputCycleEligible
  infinity.availablePoints ??= '0'
  infinity.allocatedPoints ??= '0'
  delete infinity.points
  delete infinity.spentPoints
  const dyson = state.dyson as SaveRecord
  dyson.facilities = projectRecord(
    dyson.facilities,
    V2_SCHEMA13_FACILITY_IDS,
  )
  const dysonAutomation = dyson.automation as SaveRecord
  dysonAutomation.enabledFacilities = projectRecord(
    dysonAutomation.enabledFacilities,
    V2_SCHEMA13_FACILITY_IDS,
  )
  infinity.retainedFacilities = projectRecord(
    infinity.retainedFacilities,
    V2_SCHEMA13_RETAINED_FACILITY_IDS,
  )
  const quantum = state.quantum as SaveRecord
  quantum.availableShards ??= '0'
  quantum.lifetimeEarnedShards ??= '0'
  delete quantum.pointsEarned
  delete quantum.pointsSpent
  const research = state.research as SaveRecord
  research.levelsById = completeResearchRecord(
    research.levelsById,
    '0',
  )
  research.progressById = completeResearchRecord(
    research.progressById,
    '0',
  )
  const researchAutomation = research.automation as SaveRecord
  researchAutomation.enabledById = completeResearchRecord(
    researchAutomation.enabledById,
    false,
  )
  const skills = state.skills as SaveRecord
  skills.selectedPreset ??= 1
  const currentSkillStates = skills.byId as SaveRecord
  skills.byId = Object.fromEntries(
    V2_SCHEMA13_SKILL_IDS.map((id) => {
      const value = currentSkillStates[id]
      const skill = value as SaveRecord
      return [id, { ...skill, level: String(skill.level) }]
    }),
  )
  const railgun = (state.dream as SaveRecord).railgun as SaveRecord
  railgun.pendingBaseSeconds ??= 0
  railgun.pendingDreamSeconds ??= 0
  railgun.activeRailguns ??= 0
  railgun.reservedPanels ??= '0'
  railgun.highestStoredPanels ??= '0'
  railgun.lastRoundsFired ??= 0
  railgun.lastPanelsLaunched ??= '0'
  delete (state.timeline as SaveRecord).processing
  delete (state.dream as SaveRecord).purchaseBatches
  const dream = state.dream as SaveRecord
  dream.education = projectRecord(
    dream.education,
    V2_SCHEMA13_DREAM_EDUCATION_IDS,
  )
  dream.timers = projectRecord(
    dream.timers,
    V2_SCHEMA13_DREAM_TIMER_IDS,
  )
  dream.upgrades = projectRecord(
    dream.upgrades,
    V2_SCHEMA13_DREAM_UPGRADE_FLAGS,
  )
  const statistics = state.statistics as SaveRecord
  delete statistics.recentInfinityCycles
  delete statistics.recentActiveAutomaticInfinityCycles
  return state
}

function completeResearchRecord(
  value: unknown,
  fallback: string | boolean,
): SaveRecord {
  const source = value as SaveRecord
  return Object.fromEntries(
    V2_SCHEMA13_RESEARCH_IDS.map((id) => {
      const entry = source?.[id] ?? fallback
      return [
        id,
        typeof fallback === 'string' ? String(entry) : entry,
      ]
    }),
  )
}

function projectRecord(
  value: unknown,
  keys: readonly string[],
): SaveRecord {
  const source = value as SaveRecord
  return Object.fromEntries(keys.map((key) => [key, source[key]]))
}

function defaultRuntime(): SaveRecord {
  return {
    dysonEvaluationSnapshot: {
      panelsPerSecond: '0',
      panelLifetimeSeconds: '10',
      scienceMultiplier: '1',
      rudimentarySingularityProduction: '0',
      pocketDimensionsProduction: '0',
      scientificPlanetsProduction: '0',
      managerAssemblyLineProduction: '0',
    },
    dysonTuningProfile: 'web-authored-v1',
  }
}

function defaultPreferences(): SaveRecord {
  return {
    globalMute: false,
    screensaverEnabled: true,
    hidePurchased: true,
    buyMax: true,
    numberFormatting: 0,
    skillsBuyOnTap: false,
    frameRate: 60,
    botsButtonToggle: false,
    researchbuttonToggle: false,
    skillsButtonToggle: false,
    skillsFirstRunDone: false,
    infinityButtonToggle: false,
    infinityFirstRunDone: false,
    realityButtonToggle: false,
    realityFirstRun: false,
    simulationsButtonToggle: false,
    prestigeButtonToggle: false,
    prestigeFirstRun: false,
    settingsButtonToggle: false,
    firstReality: false,
  }
}

function defaultPlatform(): SaveRecord {
  return {
    debugOptions: false,
    debugEverEnabled: false,
    cheater: false,
    unlockAllTabs: false,
  }
}

function encodeValue(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) return value.map(encodeValue)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, encodeValue(entry)]),
    )
  }
  return value
}

function encodeAuthenticSchema13NumericLeaves(
  value: unknown,
  path: string,
): unknown {
  const encoding = v2Schema13NumericEncoding(path)
  if (encoding === 'number') return value
  if (encoding === 'bigint') return String(value)
  if (encoding === 'research-level') {
    const id = path.slice('$.research.levelsById.'.length)
    return V2_SCHEMA13_CAPPED_RESEARCH_IDS.includes(
      id as (typeof V2_SCHEMA13_CAPPED_RESEARCH_IDS)[number],
    )
      ? String(value)
      : canonicalSchema13Decimal(value)
  }
  if (encoding === 'decimal' || encoding === 'integer-decimal') {
    return canonicalSchema13Decimal(value)
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      encodeAuthenticSchema13NumericLeaves(entry, `${path}.${index}`),
    )
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      encodeAuthenticSchema13NumericLeaves(entry, `${path}.${key}`),
    ]))
  }
  return value
}

function canonicalSchema13Decimal(value: unknown): string {
  const text = String(value).toLowerCase()
  const match = /^(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/u
    .exec(text)
  if (match === null) return text
  const integer = match[1] ?? ''
  const fraction = match[2] ?? match[3] ?? ''
  const digits = `${integer}${fraction}`
  const firstSignificant = digits.search(/[1-9]/u)
  if (firstSignificant === -1) return '0'
  const suppliedExponent = Number(match[4] ?? 0)
  const exponent = suppliedExponent + integer.length - firstSignificant - 1
  const significant = digits.slice(firstSignificant)
  let mantissa = Number(
    significant.length === 1
      ? significant
      : `${significant[0]}.${significant.slice(1)}`,
  )
  let normalizedExponent = exponent
  if (mantissa >= 10) {
    mantissa /= 10
    normalizedExponent += 1
  }
  return `${mantissa.toString()}e${normalizedExponent.toString()}`
}

const IMPORT_TEST_PATHS = Object.freeze({
  current: '/current',
  temporary: '/current.tmp',
  legacyRecovery: '/recovery/rejected-current.idsw',
  backups: ['/current.backup.1'],
})

function createImportTestRuntime(
  storage: TransitionalMemoryStorage,
  compatibilityBase: PreparedSave,
  forceStartupBlocked = false,
) {
  return createBrowserRuntimeFoundation({
    createApplication: (repository) => createCanonicalGameApplication({
      repository,
      startupResolver: forceStartupBlocked
        ? {
            resolve: async () => ({
              kind: 'blocked' as const,
              reason: 'storage-failed' as const,
              error: 'transient startup failure',
            }),
          }
        : new RepositoryStartupSaveResolver(
            repository,
            () => compatibilityBase,
          ),
      sessionFactory: createCanonicalRuntimeSessionFactory({
        entitlements: { permanentDoubleIp: false },
      }),
      engine: { eventContext: createProductionEventContext() },
      createTransitionalRecoveryBase: () => compatibilityBase,
    }),
    lifecyclePolicy: {
      saveOnPause: false,
      saveOnFocusLoss: false,
      replayOnFocusGain: false,
    },
    allowedExternalOrigins: [],
    saveStorage: storage,
    saveRepositoryPaths: IMPORT_TEST_PATHS,
    allowCanonicalPlayerWrites: true,
    writerAuthority: new SingleHostSessionWriterAuthority({
      sessionId: 'raw-v2-import-test',
    }),
    lifecycle: {
      currentPhase: () => 'background',
      subscribe: () => () => undefined,
    },
    lifecycleClock: {
      sample: () => ({
        utcMilliseconds: 0,
        serializedUtcText: '1970-01-01T00:00:00.000Z',
      }),
    },
    departureMarker: {
      read: () => null,
      record: () => undefined,
      clearIfMatches: () => undefined,
      clear: () => undefined,
    },
    activeTimeClock: { nowMilliseconds: () => 0 },
    activeTimeScheduler: {
      requestFrame: () => 1,
      cancelFrame: () => undefined,
    },
    frontendSnapshotScheduler: {
      requestFrame: (callback) => {
        callback()
        return 1
      },
      cancelFrame: () => undefined,
    },
    checkpointScheduler: {
      setInterval: () => 1,
      clearInterval: () => undefined,
    },
    storageManager: {
      persisted: async () => true,
      persist: async () => true,
      estimate: async () => ({ usage: 1, quota: 1_000 }),
    },
    recoverTransitionalCheckpoint:
      recoverTransitionalV2CheckpointWithMetadata,
    createTransitionalRecoveryBase: () => compatibilityBase,
  })
}

class TransitionalMemoryStorage implements SaveStorageAdapter {
  readonly files = new Map<string, string>()

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

class PreferenceMemoryStorage {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}
