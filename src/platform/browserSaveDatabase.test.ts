import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { CanonicalRuntimeSession } from '../application/canonicalRuntimeSession'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import {
  createProductionBrowserComposition,
  PRODUCTION_BROWSER_DATABASE_NAME,
  PRODUCTION_BROWSER_SAVE_PATHS,
} from '../browser/productionBrowserComposition'
import { PreparedSave, prepareIdb1Save } from '../save/prepare'
import {
  dehydrateGameState,
  hydrateGameState,
} from '../game-state/mapping'
import { CURRENT_SAVE_SCHEMA } from '../save/migrate'
import { PortableSaveRepository } from '../save/repository'
import {
  deserializeWebSave,
  serializeWebSave,
} from '../save/serialization'
import { ordinaryInfinityBotThreshold } from '../simulation/infinityCycle'
import { DISCRETE_MAXIMUM } from '../simulation/numeric'
import {
  createBrowserRuntimeFoundation,
} from '../ui/runtime'
import {
  IndexedDbBrowserSaveDatabase,
  type WriterLeaseFence,
  WriterLeaseLostError,
  WriterLeaseMetadataError,
} from './browserSaveDatabase'
import { IndexedDbSaveStorageAdapter } from './indexedDbSaveStorage'

const repositoryPaths = {
  current: '/current',
  temporary: '/current.tmp',
  legacyRecovery: '/recovery/original-idb1.txt',
} as const

describe('IndexedDbBrowserSaveDatabase', () => {
  test('retains the deployed schema-13 browser backup namespace for recovery', () => {
    expect(PRODUCTION_BROWSER_SAVE_PATHS.retainedRecoverySources).toEqual([
      '/development-only/development-only-default-profile/recovery/import-original.idsw',
      '/development-only/development-only-default-profile/recovery/pre-schema13-original.idsw',
    ])
    expect(PRODUCTION_BROWSER_SAVE_PATHS.transitionalRecoverySources).toEqual([
      '/development-only/development-only-default-profile/backups/current.1.idsw',
      '/development-only/development-only-default-profile/backups/current.2.idsw',
      '/development-only/development-only-default-profile/backups/current.3.idsw',
    ])
    expect(PRODUCTION_BROWSER_SAVE_PATHS.transitionalStoredTimePolicy).toBe(
      '/development-only/development-only-default-profile/local/stored-time-policy.json',
    )
    expect(PRODUCTION_BROWSER_SAVE_PATHS.transitionalStoredTimeJob).toBe(
      '/development-only/development-only-default-profile/stored-time/job.json',
    )
  })

  test('serializes simultaneous production lease acquisition to exactly one writer', async () => {
    const harness = new HarnessIndexedDbFactory()
    const database = new IndexedDbBrowserSaveDatabase(
      'simultaneous-acquire',
      harness.asFactory(),
    )

    const [first, second] = await Promise.all([
      database.acquireWriterLease('first', 1_000, 1_000),
      database.acquireWriterLease('second', 1_000, 1_000),
    ])

    expect([first, second].filter((result) => result.acquired)).toHaveLength(1)
    expect(await database.inspectWriterLease()).toMatchObject({
      generation: 1,
      expiresAtUtcMilliseconds: 2_000,
    })
    expect(harness.requestLog.slice(0, 4)).toEqual([
      'readwrite:metadata:get',
      'readwrite:metadata:put',
      'readwrite:metadata:get',
      'readonly:metadata:get',
    ])
  })

  test('atomically replaces files and rejects a stale production fence', async () => {
    const harness = new HarnessIndexedDbFactory()
    const database = new IndexedDbBrowserSaveDatabase(
      'fenced-replace',
      harness.asFactory(),
    )
    const first = await database.acquireWriterLease(
      'first',
      1_000,
      1_000,
    )
    expect(first.acquired).toBe(true)
    if (!first.acquired) throw new Error('Expected the first writer lease.')

    await database.mutateFiles(
      { kind: 'write', path: '/current', contents: 'verified' },
      first.fence,
      1_000,
    )
    await database.mutateFiles(
      {
        kind: 'write',
        path: '/current.tmp',
        contents: 'candidate',
      },
      first.fence,
      1_000,
    )
    await database.mutateFiles(
      {
        kind: 'replace',
        temporaryPath: '/current.tmp',
        destinationPath: '/current',
      },
      first.fence,
      1_000,
    )

    expect(await database.readFile('/current')).toBe('candidate')
    expect(await database.fileExists('/current.tmp')).toBe(false)

    const second = await database.acquireWriterLease(
      'second',
      2_001,
      1_000,
    )
    expect(second).toMatchObject({
      acquired: true,
      fence: { generation: 2 },
    })
    await expect(
      database.mutateFiles(
        { kind: 'write', path: '/current', contents: 'stale' },
        first.fence,
        2_001,
      ),
    ).rejects.toBeInstanceOf(WriterLeaseLostError)
    expect(await database.readFile('/current')).toBe('candidate')
  })

  test('reconstructs a verified repository through a fresh production database instance', async () => {
    const harness = new HarnessIndexedDbFactory()
    const firstDatabase = new IndexedDbBrowserSaveDatabase(
      'repository-reconstruction',
      harness.asFactory(),
    )
    const acquisition = await firstDatabase.acquireWriterLease(
      'owner',
      1_000,
      10_000,
    )
    if (!acquisition.acquired) throw new Error('Expected writer ownership.')
    const firstRepository = repositoryFor(
      firstDatabase,
      acquisition.fence,
      1_000,
    )

    await firstRepository.commit(
      PreparedSave.fromDecoded({
        saveVersion: 12,
        marker: 'persisted-across-reconstruction',
      }),
    )

    const reconstructedDatabase = new IndexedDbBrowserSaveDatabase(
      'repository-reconstruction',
      harness.asFactory(),
    )
    const reconstructedRepository = repositoryFor(
      reconstructedDatabase,
      acquisition.fence,
      1_000,
    )
    expect(
      (await reconstructedRepository.loadCurrent())?.copyValidatedState(),
    ).toMatchObject({
      saveVersion: CURRENT_SAVE_SCHEMA,
      marker: 'persisted-across-reconstruction',
    })
  })

  test('aborts a quota-failed atomic replace and reconstructs the prior primary through a fresh wrapper', async () => {
    const harness = new HarnessIndexedDbFactory()
    const databaseName = 'quota-atomic-replace'
    const database = new IndexedDbBrowserSaveDatabase(
      databaseName,
      harness.asFactory(),
    )
    const acquisition = await database.acquireWriterLease(
      'owner',
      1_000,
      10_000,
    )
    if (!acquisition.acquired) throw new Error('Expected writer ownership.')
    const storage = storageFor(database, acquisition.fence, 1_000)
    const repository = repositoryFor(
      database,
      acquisition.fence,
      1_000,
    )
    const verified = PreparedSave.fromDecoded({
      saveVersion: 12,
      marker: 'last-verified-primary',
    })
    await repository.commit(verified)
    await storage.writeText(
      repositoryPaths.temporary,
      serializeWebSave({
        saveVersion: 12,
        marker: 'uncommitted-candidate',
      }),
    )

    harness.failNextRequest(
      'readwrite:files:put',
      new DOMException(
        'Scripted production quota failure.',
        'QuotaExceededError',
      ),
    )
    await expect(
      storage.replaceAtomically(
        repositoryPaths.temporary,
        repositoryPaths.current,
      ),
    ).rejects.toMatchObject({
      code: 'quota-exceeded',
    })
    expect(harness.injectedRequestFailures).toBe(1)
    expect(harness.transactionAborts).toBe(1)

    const reconstructedDatabase =
      new IndexedDbBrowserSaveDatabase(
        databaseName,
        harness.asFactory(),
      )
    const reconstructed = repositoryFor(
      reconstructedDatabase,
      acquisition.fence,
      1_000,
    )
    expect(
      (await reconstructed.loadCurrent())?.copyValidatedState(),
    ).toMatchObject({
      saveVersion: CURRENT_SAVE_SCHEMA,
      marker: 'last-verified-primary',
    })
  })

  test('copies and retains exact recovery text through the production adapter and a fresh wrapper', async () => {
    const harness = new HarnessIndexedDbFactory()
    const databaseName = 'production-recovery'
    const database = new IndexedDbBrowserSaveDatabase(
      databaseName,
      harness.asFactory(),
    )
    const acquisition = await database.acquireWriterLease(
      'owner',
      1_000,
      10_000,
    )
    if (!acquisition.acquired) throw new Error('Expected writer ownership.')
    const storage = storageFor(database, acquisition.fence, 1_000)
    const sourcePath = '/legacy/source'
    const recoveryText = 'IDB1:exact-original-recovery-text'
    await storage.writeText(sourcePath, recoveryText)
    await storage.copy(sourcePath, repositoryPaths.legacyRecovery)
    await storage.retainLegacyCandidate(
      'IDB1:exact-retained-candidate',
      'retained-id',
    )

    const reconstructedDatabase =
      new IndexedDbBrowserSaveDatabase(
        databaseName,
        harness.asFactory(),
      )
    const reconstructedStorage = storageFor(
      reconstructedDatabase,
      acquisition.fence,
      1_000,
    )
    expect(
      await reconstructedStorage.readText(
        repositoryPaths.legacyRecovery,
      ),
    ).toBe(recoveryText)
    expect(
      await reconstructedStorage.discoverLegacyCandidates(),
    ).toEqual([
      {
        id: 'retained-id',
        sourcePath: 'browser-import/retained-id',
        text: 'IDB1:exact-retained-candidate',
        provenance: { kind: 'browser-retained-import' },
      },
    ])
  })

  test.each([
    {
      generation: -1,
      message: 'nonnegative safe integer',
    },
    {
      generation: 1.5,
      message: 'nonnegative safe integer',
    },
    {
      generation: Number.MAX_SAFE_INTEGER,
      message: 'cannot be incremented safely',
    },
  ])('rejects corrupt generation $generation before any lease write', async ({
    generation,
    message,
  }) => {
    const harness = new HarnessIndexedDbFactory()
    const databaseName = `corrupt-generation-${generation}`
    const database = new IndexedDbBrowserSaveDatabase(
      databaseName,
      harness.asFactory(),
    )
    await database.inspectWriterLease()
    const stored = {
      key: 'writer-lease',
      ownerToken: null,
      generation,
      expiresAtUtcMilliseconds: null,
    }
    harness.seedRecord(
      databaseName,
      'metadata',
      'writer-lease',
      stored,
    )
    const requestCount = harness.requestLog.length

    await expect(
      database.acquireWriterLease('owner', 1_000, 1_000),
    ).rejects.toBeInstanceOf(WriterLeaseMetadataError)
    await expect(
      database.acquireWriterLease('owner', 1_000, 1_000),
    ).rejects.toThrow(message)
    expect(
      harness.requestLog
        .slice(requestCount)
        .filter((entry) => entry.endsWith(':put')),
    ).toEqual([])
    expect(
      harness.readRecord(
        databaseName,
        'metadata',
        'writer-lease',
      ),
    ).toEqual(stored)
  })

  test('reopens after version change and unexpected close, retries blocked opens, and closes late success', async () => {
    const harness = new HarnessIndexedDbFactory()
    const databaseName = 'connection-lifecycle'
    const database = new IndexedDbBrowserSaveDatabase(
      databaseName,
      harness.asFactory(),
    )

    await expect(database.inspectWriterLease()).resolves.toBeNull()
    expect(harness.openAttempts(databaseName)).toBe(1)

    harness.triggerVersionChange(databaseName)
    await expect(database.inspectWriterLease()).resolves.toBeNull()
    expect(harness.openAttempts(databaseName)).toBe(2)

    harness.triggerUnexpectedClose(databaseName)
    await expect(database.inspectWriterLease()).resolves.toBeNull()
    expect(harness.openAttempts(databaseName)).toBe(3)

    const blockedName = 'blocked-open'
    const blockedDatabase = new IndexedDbBrowserSaveDatabase(
      blockedName,
      harness.asFactory(),
    )
    harness.blockNextOpen = true
    await expect(blockedDatabase.inspectWriterLease()).rejects.toThrow(
      'blocked',
    )
    await expect(blockedDatabase.inspectWriterLease()).resolves.toBeNull()
    await nextTask()

    expect(harness.openAttempts(blockedName)).toBe(2)
    expect(harness.lastBlockedConnection?.closed).toBe(true)
  })

  test('allows an explicit same-owner reload takeover and fences the previous document', async () => {
    const harness = new HarnessIndexedDbFactory()
    const database = new IndexedDbBrowserSaveDatabase(
      'same-owner-reload',
      harness.asFactory(),
    )
    const first = await database.acquireWriterLease(
      'same-tab',
      1_000,
      15_000,
    )
    if (!first.acquired) throw new Error('Expected writer ownership.')

    const reloaded = await database.acquireWriterLease(
      'same-tab',
      1_100,
      15_000,
      true,
    )

    expect(reloaded).toMatchObject({
      acquired: true,
      fence: {
        ownerToken: 'same-tab',
        generation: 2,
        expiresAtUtcMilliseconds: 16_100,
      },
    })
    await expect(
      database.mutateFiles(
        { kind: 'write', path: '/current', contents: 'stale' },
        first.fence,
        1_100,
      ),
    ).rejects.toBeInstanceOf(WriterLeaseLostError)
  })

  test('allows a deliberate recovery takeover to fence a different live owner', async () => {
    const harness = new HarnessIndexedDbFactory()
    const database = new IndexedDbBrowserSaveDatabase(
      'explicit-recovery-takeover',
      harness.asFactory(),
    )
    const first = await database.acquireWriterLease(
      'stranded-owner',
      1_000,
      15_000,
    )
    if (!first.acquired) throw new Error('Expected writer ownership.')

    const replacement = await database.acquireWriterLease(
      'recovery-owner',
      1_100,
      15_000,
      false,
      true,
    )

    expect(replacement).toMatchObject({
      acquired: true,
      fence: {
        ownerToken: 'recovery-owner',
        generation: 2,
      },
    })
    await expect(
      database.mutateFiles(
        { kind: 'write', path: '/current', contents: 'stale' },
        first.fence,
        1_100,
      ),
    ).rejects.toBeInstanceOf(WriterLeaseLostError)
  })

  test('production composition preserves the deployed storage identity, rotates three backups, reconstructs, and recovers', async () => {
    const harness = new HarnessIndexedDbFactory()
    const checkpointGate = deferred<void>()
    const firstCheckpointScheduler = new ManualIntervalScheduler()
    let checkpointCalls = 0

    const createComposition = (
      ownerToken: string,
      checkpointScheduler = new ManualIntervalScheduler(),
      gateCheckpoint = false,
    ) =>
      createProductionBrowserComposition({
        entitlementDocument: {
          querySelectorAll: () => [
            { getAttribute: () => 'false' },
          ],
        },
        lifecycleClock: fixedLifecycleClock(),
        monotonicClock: { nowMilliseconds: () => 0 },
        createRuntime: (options) =>
          createBrowserRuntimeFoundation({
            ...options,
            createApplication: (repository) => {
              const application = options.createApplication(repository)
              if (!gateCheckpoint) return application
              return new Proxy(application, {
                get(target, property, receiver) {
                  if (property !== 'checkpoint') {
                    const value = Reflect.get(target, property, receiver)
                    return typeof value === 'function'
                      ? value.bind(target)
                      : value
                  }
                  return async () => {
                    checkpointCalls += 1
                    await checkpointGate.promise
                    return application.checkpoint()
                  }
                },
              })
            },
            indexedDbFactory: harness.asFactory(),
            ownerToken,
            autoHeartbeat: false,
            nowUtcMilliseconds: () => 1_000,
            lifecycle: backgroundLifecycle(),
            activeTimeScheduler: idleFrameScheduler,
            storageManager: durableStorageManager,
            checkpointScheduler,
          }),
      })

    const first = createComposition(
      'first-production-owner',
      firstCheckpointScheduler,
      true,
    )
    await expect(first.runtime.start()).resolves.toMatchObject({
      phase: 'ready',
    })
    await expect(
      first.runtime.dispatchPlayer({
        kind: 'dyson.set-bot-distribution',
        distribution: 0.75,
      }),
    ).resolves.toMatchObject({
      status: 'accepted',
    })
    const skillPresetLayouts = [
      ['banking'],
      ['avocados'],
      ['startHereTree'],
      ['manualLabour'],
      ['fragmentAssembly'],
    ] as const
    for (let index = 0; index < skillPresetLayouts.length; index += 1) {
      await expect(
        first.runtime.dispatchPlayer({
          kind: 'skill.set-preset-assignment',
          slot: (index + 1) as 1 | 2 | 3 | 4 | 5,
          skillIds: skillPresetLayouts[index],
        }),
      ).resolves.toMatchObject({ status: 'accepted' })
    }
    await expect(
      first.runtime.dispatchPlayer({
        kind: 'skill.select-preset',
        slot: 5,
      }),
    ).resolves.toMatchObject({ status: 'accepted' })
    firstCheckpointScheduler.fire()
    firstCheckpointScheduler.fire()
    await waitUntil(() => checkpointCalls === 1)

    const blocked = createComposition('blocked-production-owner')
    await expect(blocked.runtime.start()).resolves.toMatchObject({
      phase: 'blocked',
      code: 'writer-owned',
    })

    checkpointGate.resolve()
    await expect(first.runtime.requestCheckpoint()).resolves.toBe(true)
    expect(checkpointCalls).toBe(1)
    for (const distribution of [0.7, 0.65, 0.6]) {
      await expect(
        first.runtime.dispatchPlayer({
          kind: 'dyson.set-bot-distribution',
          distribution,
        }),
      ).resolves.toMatchObject({ status: 'accepted' })
      await expect(first.runtime.requestCheckpoint()).resolves.toBe(true)
    }
    const expected = structuredClone(first.runtime.snapshot())
    const expectedGameplay = (() => {
      if (expected.phase !== 'ready') return undefined
      const {
        lastSuspendedAtLegacyText: _transportOnlySuspensionMarker,
        ...expectedTimeline
      } = expected.gameplay.progression.timeline
      return {
        ...structuredClone(expected.gameplay),
        // Preset-application feedback is intentionally transient. The
        // selected slot and five durable layouts below must reconstruct,
        // while a new runtime starts with no stale notification.
        runtime: {
          ...structuredClone(expected.gameplay.runtime),
          lastSkillPresetApplication: null,
        },
        progression: {
          ...structuredClone(expected.gameplay.progression),
          // This marker is intentionally lifecycle-dependent: startup may
          // consume it for one-time elapsed-time accounting or backgrounding
          // may refresh it. The persistence assertion covers durable gameplay.
          timeline: expectedTimeline,
        },
      }
    })()
    await first.runtime.shutdown()
    await blocked.runtime.shutdown()

    const productionDatabase = new IndexedDbBrowserSaveDatabase(
      PRODUCTION_BROWSER_DATABASE_NAME,
      harness.asFactory(),
    )
    await expect(
      productionDatabase.fileExists(
        PRODUCTION_BROWSER_SAVE_PATHS.current,
      ),
    ).resolves.toBe(true)
    for (const backup of PRODUCTION_BROWSER_SAVE_PATHS.backups) {
      await expect(
        productionDatabase.fileExists(backup),
      ).resolves.toBe(true)
    }

    const reconstructed = createComposition(
      'reconstructed-production-owner',
    )
    await expect(reconstructed.runtime.start()).resolves.toMatchObject({
      phase: 'ready',
    })
    expect(reconstructed.runtime.snapshot()).toMatchObject({
      phase: 'ready',
      source: 'primary',
      gameplay: expectedGameplay,
    })
    const reconstructedSnapshot = reconstructed.runtime.snapshot()
    expect(reconstructedSnapshot.phase).toBe('ready')
    if (reconstructedSnapshot.phase === 'ready') {
      expect(
        reconstructedSnapshot.gameplay.progression.skills.presets.map(
          (preset) => preset.skillIds,
        ),
      ).toEqual(skillPresetLayouts)
      expect(
        reconstructedSnapshot.gameplay.progression.skills
          .activeAutoAssignment,
      ).toEqual(skillPresetLayouts[4])
      expect(
        reconstructedSnapshot.gameplay.runtime.selectedSkillPresetSlot,
      ).toBe(5)
    }
    await reconstructed.runtime.shutdown()

    const maintenanceLease = await productionDatabase.acquireWriterLease(
      'recovery-test-maintenance',
      2_000,
      15_000,
    )
    expect(maintenanceLease.acquired).toBe(true)
    if (!maintenanceLease.acquired) {
      throw new Error('Expected recovery-test writer ownership.')
    }
    await productionDatabase.mutateFiles(
      {
        kind: 'write',
        path: PRODUCTION_BROWSER_SAVE_PATHS.current,
        contents: 'corrupted-current-save',
      },
      maintenanceLease.fence,
      2_000,
    )
    await productionDatabase.releaseWriterLease(
      maintenanceLease.fence,
    )

    const recovered = createComposition('recovered-production-owner')
    await expect(recovered.runtime.start()).resolves.toMatchObject({
      phase: 'ready',
      warnings: [
        expect.objectContaining({ code: 'backup-recovered' }),
      ],
    })
    await expect(
      productionDatabase.readFile(
        PRODUCTION_BROWSER_SAVE_PATHS.legacyRecovery,
      ),
    ).resolves.toBe('corrupted-current-save')
    await recovered.runtime.shutdown()
  })

  test('keeps a maximum Skill Point Purity save finite through the production runtime, Stored Time, and reopen', async () => {
    const harness = new HarnessIndexedDbFactory()
    const database = new IndexedDbBrowserSaveDatabase(
      PRODUCTION_BROWSER_DATABASE_NAME,
      harness.asFactory(),
    )
    const seedLease = await database.acquireWriterLease(
      'purity-seed-owner',
      1_000,
      15_000,
    )
    expect(seedLease.acquired).toBe(true)
    if (!seedLease.acquired) {
      throw new Error('Expected Purity fixture writer ownership.')
    }
    await database.mutateFiles(
      {
        kind: 'write',
        path: PRODUCTION_BROWSER_SAVE_PATHS.current,
        contents: serializeWebSave(
          createPurityDevelopmentSave().copyValidatedState(),
        ),
      },
      seedLease.fence,
      1_000,
    )
    await database.releaseWriterLease(seedLease.fence)

    const createComposition = (ownerToken: string) =>
      createProductionBrowserComposition({
        entitlementDocument: {
          querySelectorAll: () => [
            { getAttribute: () => 'false' },
          ],
        },
        lifecycleClock: fixedLifecycleClock(),
        monotonicClock: { nowMilliseconds: () => 0 },
        developmentBuild: true,
        createRuntime: (options) =>
          createBrowserRuntimeFoundation({
            ...options,
            indexedDbFactory: harness.asFactory(),
            ownerToken,
            autoHeartbeat: false,
            nowUtcMilliseconds: () => 1_000,
            lifecycle: backgroundLifecycle(),
            activeTimeScheduler: idleFrameScheduler,
            storageManager: durableStorageManager,
          }),
      })

    const first = createComposition('purity-runtime-owner')
    await expect(first.runtime.start()).resolves.toMatchObject({
      phase: 'ready',
    })
    const development = first.runtime.development
    expect(development).toBeDefined()
    if (development === undefined) {
      throw new Error('Expected production development controls.')
    }

    await expect(development.apply({
      kind: 'add-skill-points',
      amount: DISCRETE_MAXIMUM,
    })).resolves.toMatchObject({ applied: true })
    expectPuritySnapshotReady(first.runtime.snapshot())

    await expect(
      development.simulateOfflineTime(10),
    ).resolves.toMatchObject({ applied: true })
    await expect(first.runtime.dispatchPlayer({
      kind: 'time.request-stored-time-spend',
      requestedSeconds: 10,
    })).resolves.toMatchObject({
      status: 'accepted',
      kind: 'stored-time',
      admittedSeconds: 10,
      consumedSeconds: 10,
      remainingSeconds: 0,
    })
    expectPuritySnapshotReady(first.runtime.snapshot())
    await expect(first.runtime.requestCheckpoint()).resolves.toBe(true)

    const savedText = await first.runtime.readCurrentSaveText()
    expect(savedText).not.toBeNull()
    if (savedText !== null) {
      expect(invalidNumberPaths(deserializeWebSave(savedText))).toEqual([])
    }
    await first.runtime.shutdown()

    const reopened = createComposition('purity-reopen-owner')
    await expect(reopened.runtime.start()).resolves.toMatchObject({
      phase: 'ready',
    })
    expect(reopened.runtime.snapshot()).toMatchObject({ source: 'primary' })
    expectPuritySnapshotReady(reopened.runtime.snapshot())
    await reopened.runtime.shutdown()
  })

  test('updates the final Dyson goal after every Division purchase and reconstructs it from the production save', async () => {
    const harness = new HarnessIndexedDbFactory()
    const database = new IndexedDbBrowserSaveDatabase(
      PRODUCTION_BROWSER_DATABASE_NAME,
      harness.asFactory(),
    )
    const seedLease = await database.acquireWriterLease(
      'division-goal-seed',
      1_000,
      15_000,
    )
    if (!seedLease.acquired) {
      throw new Error('Expected the Division-goal seed writer lease.')
    }
    const seedRepository = new PortableSaveRepository(
      storageFor(database, seedLease.fence, 1_000),
      PRODUCTION_BROWSER_SAVE_PATHS,
      () => ({ saveVersion: CURRENT_SAVE_SCHEMA }),
    )
    const hydrated = hydrateGameState(
      createUnityFirstRunPreparedSave({
        startedAtUtc: '2026-09-01T00:00:00.000Z',
      }),
    )
    await seedRepository.commit(
      dehydrateGameState(hydrated, {
        ...hydrated.state,
        dyson: {
          ...hydrated.state.dyson,
          goalStage: 10n,
        },
        quantum: {
          ...hydrated.state.quantum,
          pointsEarned: 2_000_000n,
          pointsSpent: 0n,
          divisionsPurchased: 0n,
        },
      }),
    )
    await database.releaseWriterLease(seedLease.fence)

    const createComposition = (ownerToken: string) =>
      createProductionBrowserComposition({
        entitlementDocument: {
          querySelectorAll: () => [
            { getAttribute: () => 'false' },
          ],
        },
        lifecycleClock: fixedLifecycleClock(),
        monotonicClock: { nowMilliseconds: () => 0 },
        createRuntime: (options) =>
          createBrowserRuntimeFoundation({
            ...options,
            indexedDbFactory: harness.asFactory(),
            ownerToken,
            autoHeartbeat: false,
            nowUtcMilliseconds: () => 1_000,
            lifecycle: backgroundLifecycle(),
            activeTimeScheduler: idleFrameScheduler,
            storageManager: durableStorageManager,
            checkpointScheduler: new ManualIntervalScheduler(),
          }),
      })

    const first = createComposition('division-goal-player')
    await expect(first.runtime.start()).resolves.toMatchObject({
      phase: 'ready',
    })
    expectDivisionGoal(first.runtime.snapshot(), 0n)

    const observedDivisions: bigint[] = []
    const unsubscribe = first.runtime.subscribeSnapshot((snapshot) => {
      if (
        snapshot.phase === 'ready' &&
        snapshot.gameplay.derived.dyson.status === 'ready'
      ) {
        observedDivisions.push(
          snapshot.gameplay.progression.quantum.divisionsPurchased,
        )
      }
    })

    for (let division = 1n; division <= 19n; division += 1n) {
      const observationsBeforePurchase = observedDivisions.length
      await expect(
        first.runtime.dispatchPlayer({
          kind: 'quantum.purchase-upgrade',
          upgradeId: 'Division',
        }),
      ).resolves.toMatchObject({
        status: 'accepted',
      })
      await waitUntil(
        () => observedDivisions.length > observationsBeforePurchase,
      )
      expect(observedDivisions.at(-1)).toBe(division)
      expectDivisionGoal(first.runtime.snapshot(), division)
    }

    const maximumSnapshot = first.runtime.snapshot()
    const maximumRevision = maximumSnapshot.phase === 'ready'
      ? maximumSnapshot.revision.state
      : -1
    await expect(
      first.runtime.dispatchPlayer({
        kind: 'quantum.purchase-upgrade',
        upgradeId: 'Division',
      }),
    ).resolves.toMatchObject({
      status: 'rejected',
      code: 'quantum-upgrade:already-maxed',
      stateRevision: maximumRevision,
    })
    expectDivisionGoal(first.runtime.snapshot(), 19n)

    unsubscribe()
    await expect(first.runtime.requestCheckpoint()).resolves.toBe(true)
    await first.runtime.shutdown()

    const reconstructed = createComposition(
      'division-goal-reconstructed-player',
    )
    await expect(reconstructed.runtime.start()).resolves.toMatchObject({
      phase: 'ready',
    })
    expectDivisionGoal(reconstructed.runtime.snapshot(), 19n)
    await reconstructed.runtime.shutdown()
  })
})

function createPurityDevelopmentSave(): PreparedSave {
  const prepared = prepareIdb1Save(readFileSync(
    new URL(
      '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
      import.meta.url,
    ),
    'utf8',
  )).prepared
  const session = new CanonicalRuntimeSession(prepared, {
    entitlements: { permanentDoubleIp: false },
  })
  const candidate = structuredClone(session.initialState)
  const owned = (id: string) => ({
    ...(candidate.gameState.skills.byId[id] ?? {
      level: 0,
      timerSeconds: 0,
      secondaryTimerSeconds: 0,
    }),
    owned: true,
  })
  candidate.gameState = {
    ...candidate.gameState,
    skills: {
      ...candidate.gameState.skills,
      points: 0n,
      activeAutoAssignment: [],
      byId: {
        ...candidate.gameState.skills.byId,
        purityOfMind: owned('purityOfMind'),
        purityOfBody: owned('purityOfBody'),
        purityOfSEssence: owned('purityOfSEssence'),
      },
    },
    infinity: {
      ...candidate.gameState.infinity,
      automaticResetEnabled: false,
    },
    quantum: {
      ...candidate.gameState.quantum,
      unlocks: {
        ...candidate.gameState.quantum.unlocks,
        purity: true,
      },
    },
    timeline: {
      ...candidate.gameState.timeline,
      storedTimeAvailableSeconds: 0,
    },
  }
  candidate.debugOptionsEnabled = true
  candidate.debugEntitlementPurchased = true
  return session.prepare(candidate)
}

function expectPuritySnapshotReady(
  snapshot: ReturnType<
    ReturnType<typeof createProductionBrowserComposition>['runtime']['snapshot']
  >,
): void {
  expect(snapshot.phase).toBe('ready')
  if (snapshot.phase !== 'ready') return
  expect(snapshot.gameplay.resources.skills.points).toBe(DISCRETE_MAXIMUM)
  expect(snapshot.gameplay.progression.quantum.unlocks.purity).toBe(true)
  expect(snapshot.gameplay.progression.skills.byId.purityOfMind?.owned).toBe(true)
  expect(snapshot.gameplay.progression.skills.byId.purityOfBody?.owned).toBe(true)
  expect(snapshot.gameplay.progression.skills.byId.purityOfSEssence?.owned).toBe(true)
  expect(snapshot.gameplay.derived.dyson.status).toBe('ready')
  expect(invalidNumberPaths(snapshot)).toEqual([])
}

function invalidNumberPaths(
  value: unknown,
  path = '$',
  seen = new WeakSet<object>(),
): string[] {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? [] : [path]
  }
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return []
  }
  seen.add(value)
  return Object.entries(value).flatMap(([key, entry]) =>
    invalidNumberPaths(entry, `${path}.${key}`, seen),
  )
}

function expectDivisionGoal(
  snapshot: ReturnType<
    ReturnType<typeof createProductionBrowserComposition>['runtime']['snapshot']
  >,
  divisionsPurchased: bigint,
): void {
  expect(snapshot.phase).toBe('ready')
  if (snapshot.phase !== 'ready') {
    throw new Error('Expected a ready player-facing runtime snapshot.')
  }
  expect(
    snapshot.gameplay.progression.quantum.divisionsPurchased,
  ).toBe(divisionsPurchased)
  expect(snapshot.gameplay.derived.dyson.status).toBe('ready')
  if (snapshot.gameplay.derived.dyson.status !== 'ready') {
    throw new Error('Expected ready Dyson presentation facts.')
  }
  const threshold = ordinaryInfinityBotThreshold(divisionsPurchased)
  expect(
    snapshot.gameplay.derived.dyson.value.presentation.currentGoal,
  ).toEqual({
    kind: 'reach-bots',
    target: threshold,
  })
  expect(snapshot.gameplay.derived.infinity).toMatchObject({
    mode: 'ordinary',
    resetThresholdBots: threshold,
  })
}

function repositoryFor(
  database: IndexedDbBrowserSaveDatabase,
  fence: WriterLeaseFence,
  nowUtcMilliseconds: number,
): PortableSaveRepository {
  return new PortableSaveRepository(
    storageFor(database, fence, nowUtcMilliseconds),
    repositoryPaths,
    () => ({ saveVersion: CURRENT_SAVE_SCHEMA }),
  )
}

function storageFor(
  database: IndexedDbBrowserSaveDatabase,
  fence: WriterLeaseFence,
  nowUtcMilliseconds: number,
): IndexedDbSaveStorageAdapter {
  return new IndexedDbSaveStorageAdapter({
    database,
    lease: { currentFence: () => fence },
    nowUtcMilliseconds: () => nowUtcMilliseconds,
  })
}

interface HarnessStore {
  readonly keyPath: string
  records: Map<IDBValidKey, unknown>
}

interface HarnessDatabaseState {
  version: number
  readonly stores: Map<string, HarnessStore>
  readonly connections: Set<HarnessDatabase>
  transactionTail: Promise<void>
}

class HarnessIndexedDbFactory {
  readonly requestLog: string[] = []
  injectedRequestFailures = 0
  transactionAborts = 0
  blockNextOpen = false
  lastBlockedConnection: HarnessDatabase | undefined
  private readonly databases = new Map<string, HarnessDatabaseState>()
  private readonly attempts = new Map<string, number>()
  private requestFailure:
    | {
        readonly label: string
        readonly error: DOMException
      }
    | undefined

  asFactory(): IDBFactory {
    return this as unknown as IDBFactory
  }

  open(name: string, version?: number): IDBOpenDBRequest {
    this.attempts.set(name, (this.attempts.get(name) ?? 0) + 1)
    const request = new HarnessOpenRequest()
    const blocked = this.blockNextOpen
    this.blockNextOpen = false
    queueMicrotask(() => {
      const state =
        this.databases.get(name) ??
        this.createDatabaseState(name)
      const database = new HarnessDatabase(
        state,
        this.requestLog,
        (label) => this.takeRequestFailure(label),
        () => {
          this.transactionAborts += 1
        },
      )
      state.connections.add(database)
      request.setResult(database.asDatabase())
      const finishOpen = () => {
        const requestedVersion = version ?? Math.max(state.version, 1)
        if (requestedVersion > state.version) {
          state.version = requestedVersion
          request.dispatchUpgrade()
        }
        request.dispatchSuccess()
      }
      if (blocked) {
        this.lastBlockedConnection = database
        request.dispatchBlocked()
        setTimeout(finishOpen, 0)
        return
      }
      finishOpen()
    })
    return request.asOpenRequest()
  }

  openAttempts(name: string): number {
    return this.attempts.get(name) ?? 0
  }

  failNextRequest(label: string, error: DOMException): void {
    this.requestFailure = { label, error }
  }

  seedRecord(
    databaseName: string,
    storeName: string,
    key: IDBValidKey,
    value: unknown,
  ): void {
    const store = this.databases
      .get(databaseName)
      ?.stores.get(storeName)
    if (store === undefined) {
      throw new Error(
        `Harness store ${databaseName}/${storeName} does not exist.`,
      )
    }
    store.records.set(key, cloneValue(value))
  }

  readRecord(
    databaseName: string,
    storeName: string,
    key: IDBValidKey,
  ): unknown {
    return cloneValue(
      this.databases
        .get(databaseName)
        ?.stores.get(storeName)
        ?.records.get(key),
    )
  }

  triggerVersionChange(name: string): void {
    for (const connection of [
      ...(this.databases.get(name)?.connections ?? []),
    ]) {
      connection.dispatchVersionChange()
    }
  }

  triggerUnexpectedClose(name: string): void {
    for (const connection of [
      ...(this.databases.get(name)?.connections ?? []),
    ]) {
      connection.dispatchUnexpectedClose()
    }
  }

  private createDatabaseState(
    name: string,
  ): HarnessDatabaseState {
    const state: HarnessDatabaseState = {
      version: 0,
      stores: new Map(),
      connections: new Set(),
      transactionTail: Promise.resolve(),
    }
    this.databases.set(name, state)
    return state
  }

  private takeRequestFailure(
    label: string,
  ): DOMException | undefined {
    if (this.requestFailure?.label !== label) return undefined
    const { error } = this.requestFailure
    this.requestFailure = undefined
    this.injectedRequestFailures += 1
    return error
  }
}

class HarnessOpenRequest {
  result!: IDBDatabase
  error: DOMException | null = null
  onblocked: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onsuccess: ((event: Event) => void) | null = null
  onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null =
    null

  asOpenRequest(): IDBOpenDBRequest {
    return this as unknown as IDBOpenDBRequest
  }

  setResult(database: IDBDatabase): void {
    this.result = database
  }

  dispatchUpgrade(): void {
    this.onupgradeneeded?.(
      new Event('upgradeneeded') as IDBVersionChangeEvent,
    )
  }

  dispatchBlocked(): void {
    this.onblocked?.(new Event('blocked'))
  }

  dispatchSuccess(): void {
    this.onsuccess?.(new Event('success'))
  }
}

class HarnessDatabase {
  onversionchange: ((event: IDBVersionChangeEvent) => void) | null =
    null
  onclose: ((event: Event) => void) | null = null
  closed = false

  constructor(
    private readonly state: HarnessDatabaseState,
    private readonly requestLog: string[],
    private readonly takeRequestFailure: (
      label: string,
    ) => DOMException | undefined,
    private readonly recordTransactionAbort: () => void,
  ) {}

  asDatabase(): IDBDatabase {
    return this as unknown as IDBDatabase
  }

  get objectStoreNames(): DOMStringList {
    const names = [...this.state.stores.keys()]
    return {
      contains: (name: string) => names.includes(name),
      item: (index: number) => names[index] ?? null,
      length: names.length,
      [Symbol.iterator]: () => names[Symbol.iterator](),
    } as DOMStringList
  }

  createObjectStore(
    name: string,
    options?: IDBObjectStoreParameters,
  ): IDBObjectStore {
    const keyPath = options?.keyPath
    if (typeof keyPath !== 'string') {
      throw new Error('The harness requires a string keyPath.')
    }
    this.state.stores.set(name, {
      keyPath,
      records: new Map(),
    })
    return {} as IDBObjectStore
  }

  transaction(
    storeNames: string | Iterable<string>,
    mode: IDBTransactionMode = 'readonly',
  ): IDBTransaction {
    if (this.closed) {
      throw new DOMException(
        'The database connection is closed.',
        'InvalidStateError',
      )
    }
    const names =
      typeof storeNames === 'string'
        ? [storeNames]
        : [...storeNames]
    return new HarnessTransaction(
      this.state,
      names,
      mode,
      this.requestLog,
      this.takeRequestFailure,
      this.recordTransactionAbort,
    ).asTransaction()
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.state.connections.delete(this)
  }

  dispatchVersionChange(): void {
    if (this.closed) return
    this.onversionchange?.(
      new Event('versionchange') as IDBVersionChangeEvent,
    )
  }

  dispatchUnexpectedClose(): void {
    if (this.closed) return
    this.closed = true
    this.state.connections.delete(this)
    this.onclose?.(new Event('close'))
  }
}

class HarnessTransaction {
  error: DOMException | null = null
  onabort: ((event: Event) => void) | null = null
  oncomplete: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  private readonly workingStores = new Map<string, HarnessStore>()
  private readonly pending: Array<() => void> = []
  private readonly releaseTurn: () => void
  private active = false
  private processing = false
  private finished = false
  private revision = 0

  constructor(
    private readonly state: HarnessDatabaseState,
    private readonly storeNames: readonly string[],
    private readonly mode: IDBTransactionMode,
    private readonly requestLog: string[],
    private readonly takeRequestFailure: (
      label: string,
    ) => DOMException | undefined,
    private readonly recordTransactionAbort: () => void,
  ) {
    const previous = state.transactionTail
    let releaseTurn = () => undefined
    state.transactionTail = new Promise<void>((resolve) => {
      releaseTurn = resolve
    })
    this.releaseTurn = releaseTurn
    void previous.then(() => {
      if (this.finished) return
      for (const name of this.storeNames) {
        const source = this.state.stores.get(name)
        if (source === undefined) {
          this.fail(
            new DOMException(
              `Object store ${name} does not exist.`,
              'NotFoundError',
            ),
          )
          return
        }
        this.workingStores.set(name, {
          keyPath: source.keyPath,
          records: new Map(
            [...source.records].map(([key, value]) => [
              key,
              cloneValue(value),
            ]),
          ),
        })
      }
      this.active = true
      this.drain()
    })
  }

  asTransaction(): IDBTransaction {
    return this as unknown as IDBTransaction
  }

  objectStore(name: string): IDBObjectStore {
    if (!this.storeNames.includes(name)) {
      throw new DOMException(
        `Object store ${name} is outside this transaction.`,
        'NotFoundError',
      )
    }
    return new HarnessObjectStore(this, name).asObjectStore()
  }

  abort(): void {
    if (this.finished) {
      throw new DOMException(
        'The transaction is already finished.',
        'InvalidStateError',
      )
    }
    this.finished = true
    this.pending.length = 0
    this.recordTransactionAbort()
    this.releaseTurn()
    this.onabort?.(new Event('abort'))
  }

  request<T>(
    storeName: string,
    operationName: string,
    operation: (store: HarnessStore) => T,
  ): IDBRequest<T> {
    if (this.finished) {
      throw new DOMException(
        'The transaction is not active.',
        'TransactionInactiveError',
      )
    }
    const request = new HarnessRequest<T>()
    this.revision += 1
    this.pending.push(() => {
      const store = this.workingStores.get(storeName)
      if (store === undefined) {
        this.fail(
          new DOMException(
            `Object store ${storeName} does not exist.`,
            'NotFoundError',
          ),
        )
        return
      }
      const label =
        `${this.mode}:${storeName}:${operationName}`
      this.requestLog.push(label)
      const injectedFailure =
        this.takeRequestFailure(label)
      if (injectedFailure !== undefined) {
        request.fail(injectedFailure)
        this.fail(injectedFailure)
        return
      }
      try {
        request.succeed(cloneValue(operation(store)))
      } catch (error) {
        request.fail(error)
        this.fail(error)
      }
    })
    this.drain()
    return request.asRequest()
  }

  private drain(): void {
    if (
      !this.active ||
      this.processing ||
      this.finished
    ) {
      return
    }
    const task = this.pending.shift()
    if (task === undefined) {
      this.scheduleCompletion()
      return
    }
    this.processing = true
    queueMicrotask(() => {
      if (this.finished) return
      task()
      this.processing = false
      this.drain()
    })
  }

  private scheduleCompletion(): void {
    const revision = this.revision
    setTimeout(() => {
      if (
        this.finished ||
        this.processing ||
        this.pending.length > 0 ||
        revision !== this.revision
      ) {
        return
      }
      if (this.mode === 'readwrite') {
        for (const [name, working] of this.workingStores) {
          const destination = this.state.stores.get(name)
          if (destination !== undefined) {
            destination.records = new Map(working.records)
          }
        }
      }
      this.finished = true
      this.releaseTurn()
      this.oncomplete?.(new Event('complete'))
    }, 0)
  }

  private fail(error: unknown): void {
    if (this.finished) return
    this.error =
      error instanceof DOMException
        ? error
        : new DOMException(String(error), 'UnknownError')
    this.finished = true
    this.pending.length = 0
    this.recordTransactionAbort()
    this.releaseTurn()
    this.onerror?.(new Event('error'))
    this.onabort?.(new Event('abort'))
  }
}

class HarnessObjectStore {
  constructor(
    private readonly transaction: HarnessTransaction,
    private readonly storeName: string,
  ) {}

  asObjectStore(): IDBObjectStore {
    return this as unknown as IDBObjectStore
  }

  get(key: IDBValidKey): IDBRequest<unknown> {
    return this.transaction.request(
      this.storeName,
      'get',
      (store) => store.records.get(key),
    )
  }

  getKey(key: IDBValidKey): IDBRequest<IDBValidKey | undefined> {
    return this.transaction.request(
      this.storeName,
      'getKey',
      (store) => (store.records.has(key) ? key : undefined),
    )
  }

  getAll(): IDBRequest<unknown[]> {
    return this.transaction.request(
      this.storeName,
      'getAll',
      (store) => [...store.records.values()],
    )
  }

  put(value: unknown): IDBRequest<IDBValidKey> {
    return this.transaction.request(
      this.storeName,
      'put',
      (store) => {
        const record = value as Record<string, unknown>
        const key = record[store.keyPath] as IDBValidKey
        store.records.set(key, cloneValue(value))
        return key
      },
    )
  }

  delete(key: IDBValidKey): IDBRequest<undefined> {
    return this.transaction.request(
      this.storeName,
      'delete',
      (store) => {
        store.records.delete(key)
        return undefined
      },
    )
  }
}

class HarnessRequest<T> {
  result!: T
  error: DOMException | null = null
  onsuccess: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  asRequest(): IDBRequest<T> {
    return this as unknown as IDBRequest<T>
  }

  succeed(value: T): void {
    this.result = value
    this.onsuccess?.(new Event('success'))
  }

  fail(error: unknown): void {
    this.error =
      error instanceof DOMException
        ? error
        : new DOMException(String(error), 'UnknownError')
    this.onerror?.(new Event('error'))
  }
}

function cloneValue<T>(value: T): T {
  return value === undefined
    ? value
    : structuredClone(value)
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

class ManualIntervalScheduler {
  private callback: (() => void) | undefined

  setInterval(callback: () => void): unknown {
    this.callback = callback
    return callback
  }

  clearInterval(handle: unknown): void {
    if (this.callback === handle) this.callback = undefined
  }

  fire(): void {
    this.callback?.()
  }
}

const idleFrameScheduler = {
  requestFrame: () => 1,
  cancelFrame: () => undefined,
}

const durableStorageManager = {
  persisted: async () => true,
  persist: async () => true,
  estimate: async () => ({ usage: 1, quota: 1_000 }),
}

function backgroundLifecycle() {
  return {
    currentPhase: () => 'background' as const,
    subscribe: () => () => undefined,
  }
}

function fixedLifecycleClock() {
  return {
    sample: () => ({
      utcMilliseconds: 1_000,
      serializedUtcText: '1970-01-01T00:00:01.000Z',
    }),
  }
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

async function waitUntil(
  predicate: () => boolean,
  attempts = 100,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) return
    await nextTask()
  }
  throw new Error('Timed out waiting for the persistence test condition.')
}
