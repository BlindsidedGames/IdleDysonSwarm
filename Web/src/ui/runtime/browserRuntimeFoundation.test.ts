import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import type {
  ApplicationCommandEnvelope,
  ApplicationSnapshot,
  CheckpointResult,
  CommitFirstResult,
  ImportSaveRequest,
  ImportSaveResult,
} from '../../application/contracts'
import type {
  CanonicalActiveAdvanceResult,
  CanonicalPlayerCommand,
  CanonicalPlayerDispatchResult,
  CanonicalStoredTimeCommitResult,
} from '../../application/canonicalGameApplication'
import type {
  CanonicalLifecycleApplicationPort,
  CanonicalLifecycleClock,
} from '../../application/canonicalLifecycleCoordinator'
import {
  createUnityFirstRunPreparedSave,
} from '../../application/firstRun/unityFirstRunSave'
import {
  createProductionCanonicalApplicationFactory,
} from '../../application/productionApplicationFactory'
import type { FrontendApplicationSnapshot } from '../../application/frontendSnapshot'
import {
  CanonicalRuntimeSession,
  cloneCanonicalRuntimeState,
  type CanonicalRuntimeState,
} from '../../application/canonicalRuntimeSession'
import type {
  BrowserSaveDatabase,
  BrowserSaveMutation,
  WriterLeaseAcquisition,
  WriterLeaseFence,
} from '../../platform/browserSaveDatabase'
import { WriterLeaseLostError } from '../../platform/browserSaveDatabase'
import type { DepartureMarker } from '../../platform/browserDepartureMarker'
import type {
  ClipboardPort,
} from '../../platform/browserSystemPorts'
import type {
  IntervalScheduler,
  OwnershipNotice,
  OwnershipNoticeChannel,
} from '../../platform/browserWriterLease'
import type {
  LifecycleAdapter,
  LifecyclePhase,
} from '../../platform/contracts'
import type { DeepReadonly } from '../../core/contracts'
import type { TextDownloadPort } from '../../platform/browserSaveTransfer'
import { prepareIdb1Save, PreparedSave } from '../../save/prepare'
import type { SaveRepository } from '../../save/repository'
import {
  deserializeWebSave,
  serializeWebSave,
} from '../../save/serialization'
import {
  MOBILE_LIFECYCLE_POLICY,
  WEB_LIFECYCLE_POLICY,
} from '../../simulation/lifecycleAwayTime'
import {
  createBrowserRuntimeFoundation,
  DEVELOPMENT_ONLY_BROWSER_PROFILE_ID,
  type BrowserRuntimeFoundationOptions,
} from './browserRuntimeFoundation'
import type {
  ActiveTimeFrameScheduler,
  ActiveTimeMonotonicClock,
} from './activeTimeDriver'

const fixtureUrl = new URL(
  '../../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
  import.meta.url,
)

describe('browser runtime foundation composition', () => {
  test('creates an authentic empty development profile and reconstructs identical gameplay without import', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00.000Z',
    )
    const currentPath =
      `/development-only/${DEVELOPMENT_ONLY_BROWSER_PROFILE_ID}/current.idsw`
    const createApplication =
      createProductionCanonicalApplicationFactory({
        createFirstRunSave: () =>
          createUnityFirstRunPreparedSave({
            startedAtUtc:
              lifecycleClock.sample().serializedUtcText,
          }),
        readHostEntitlements: () =>
          Object.freeze({ permanentDoubleIp: false }),
      })
    const createProductionRuntime = (ownerToken: string) =>
      createBrowserRuntimeFoundation({
        createApplication,
        lifecyclePolicy: MOBILE_LIFECYCLE_POLICY,
        allowedExternalOrigins: [],
        database,
        lifecycle: new TestLifecycleAdapter('background'),
        lifecycleClock,
        activeTimeClock: new ManualActiveTimeClock(),
        activeTimeScheduler:
          new ManualAnimationFrameScheduler(),
        storageManager: {
          persisted: async () => true,
          persist: async () => true,
          estimate: async () => ({
            usage: 1,
            quota: 1_000,
          }),
        },
        nowUtcMilliseconds: () => 1_000,
        ownerToken,
        autoHeartbeat: false,
      })

    const firstRuntime = createProductionRuntime('first-owner')
    await expect(firstRuntime.start()).resolves.toMatchObject({
      phase: 'ready',
    })
    const firstSnapshot = firstRuntime.snapshot()
    expect(firstSnapshot).toMatchObject({
      phase: 'ready',
      source: 'first-run',
    })
    if (firstSnapshot.phase !== 'ready') return
    const development = firstRuntime.development
    expect(development).toBeDefined()
    expect(development?.status()).toMatchObject({
      enabled: false,
      entitled: true,
      purchasedInGame: false,
    })
    await expect(
      development?.apply({ kind: 'purchase-debug-options' }),
    ).resolves.toMatchObject({ applied: true })
    expect(development?.status()).toMatchObject({
      enabled: true,
      entitled: true,
      purchasedInGame: false,
    })
    await expect(
      development?.apply({
        kind: 'add-quantum-shards',
        amount: 100_000n,
      }),
    ).resolves.toMatchObject({ applied: true })
    await expect(
      development?.apply({
        kind: 'add-strange-matter',
        amount: 500_000n,
      }),
    ).resolves.toMatchObject({ applied: true })
    await expect(
      development?.apply({
        kind: 'add-influence',
        amount: 1_000n,
      }),
    ).resolves.toMatchObject({ applied: true })
    await expect(
      development?.simulateOfflineTime(42_000_000),
    ).resolves.toMatchObject({ applied: true })
    const offlineSnapshot = firstRuntime.snapshot()
    expect(offlineSnapshot.phase).toBe('ready')
    if (offlineSnapshot.phase === 'ready') {
      expect(
        offlineSnapshot.gameplay.resources.time
          .storedTimeAvailableSeconds,
      ).toBe(
        offlineSnapshot.gameplay.resources.time
          .storedTimeCapacitySeconds,
      )
      expect(
        offlineSnapshot.gameplay.resources.time.doubleTimeBankSeconds,
      ).toBe(42_000_000)
    }
    await expect(
      development?.setDysonBots(195_000),
    ).resolves.toMatchObject({
      applied: true,
      bots: 195_000,
    })
    await expect(
      development?.unlockReality(),
    ).resolves.toMatchObject({
      applied: true,
      secretsOfTheUniverse: 27n,
    })
    const progressedSnapshot = firstRuntime.snapshot()
    expect(progressedSnapshot).toMatchObject({
      phase: 'ready',
      gameplay: {
        resources: {
          dyson: {
            bots: 195_000,
            workers: 97_500,
            researchers: 97_500,
          },
          infinity: {
            points: 27n,
            spentPoints: 27n,
            secretsOfTheUniverse: 27n,
          },
        },
        visibility: {
          reality: {
            routeVisible: true,
            routeUnlocked: true,
          },
        },
      },
    })
    if (progressedSnapshot.phase !== 'ready') return
    const firstGameplay = structuredClone(
      progressedSnapshot.gameplay,
    )
    const firstStoredSave = await database.readFile(currentPath)
    await firstRuntime.shutdown()

    const secondRuntime = createProductionRuntime('second-owner')
    await expect(secondRuntime.start()).resolves.toMatchObject({
      phase: 'ready',
    })
    const secondSnapshot = secondRuntime.snapshot()
    expect(secondSnapshot).toMatchObject({
      phase: 'ready',
      source: 'primary',
    })
    if (secondSnapshot.phase !== 'ready') return
    expect(secondSnapshot.gameplay).toEqual(firstGameplay)
    expect(await database.readFile(currentPath)).toBe(
      firstStoredSave,
    )
    await secondRuntime.shutdown()
  })

  test('recovers an expired crashed owner without losing the durable checkpoint or allowing stale writes', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const leaseClock = mutableClock(1_000)
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00.000Z',
    )
    const currentPath =
      `/development-only/${DEVELOPMENT_ONLY_BROWSER_PROFILE_ID}/current.idsw`
    const createApplication =
      createProductionCanonicalApplicationFactory({
        createFirstRunSave: () =>
          createUnityFirstRunPreparedSave({
            startedAtUtc:
              lifecycleClock.sample().serializedUtcText,
          }),
        readHostEntitlements: () =>
          Object.freeze({ permanentDoubleIp: false }),
      })
    const createProductionRuntime = (ownerToken: string) =>
      createBrowserRuntimeFoundation({
        createApplication,
        lifecyclePolicy: MOBILE_LIFECYCLE_POLICY,
        allowedExternalOrigins: [],
        database,
        lifecycle: new TestLifecycleAdapter('background'),
        lifecycleClock,
        activeTimeClock: new ManualActiveTimeClock(),
        activeTimeScheduler:
          new ManualAnimationFrameScheduler(),
        storageManager: {
          persisted: async () => true,
          persist: async () => true,
          estimate: async () => ({
            usage: 1,
            quota: 1_000,
          }),
        },
        nowUtcMilliseconds: leaseClock.now,
        ownerToken,
        leaseDurationMilliseconds: 1_000,
        heartbeatMilliseconds: 500,
        autoHeartbeat: false,
      })

    const crashedRuntime = createProductionRuntime('crashed-owner')
    await expect(crashedRuntime.start()).resolves.toMatchObject({
      phase: 'ready',
    })
    const crashedSnapshot = crashedRuntime.snapshot()
    expect(crashedSnapshot.phase).toBe('ready')
    if (crashedSnapshot.phase !== 'ready') return
    const durableGameplay = structuredClone(crashedSnapshot.gameplay)
    const durableSave = await database.readFile(currentPath)

    const blockedRuntime = createProductionRuntime('blocked-owner')
    await expect(blockedRuntime.start()).resolves.toMatchObject({
      phase: 'blocked',
      code: 'writer-owned',
    })

    leaseClock.set(2_001)
    const recoveredRuntime = createProductionRuntime('recovered-owner')
    await expect(recoveredRuntime.start()).resolves.toMatchObject({
      phase: 'ready',
    })
    const recoveredSnapshot = recoveredRuntime.snapshot()
    expect(recoveredSnapshot.phase).toBe('ready')
    if (recoveredSnapshot.phase !== 'ready') return
    expect(recoveredSnapshot.gameplay).toEqual(durableGameplay)
    expect(await database.readFile(currentPath)).toBe(durableSave)

    await expect(
      crashedRuntime.requestCheckpoint(),
    ).rejects.toBeInstanceOf(WriterLeaseLostError)
    expect(crashedRuntime.status().phase).toBe('ownership-lost')
    expect(await database.readFile(currentPath)).toBe(durableSave)

    await crashedRuntime.shutdown()
    await blockedRuntime.shutdown()
    await expect(database.inspectWriterLease()).resolves.toMatchObject({
      ownerToken: 'recovered-owner',
      generation: 2,
    })
    await recoveredRuntime.shutdown()
  })

  test('round-trips an advanced imported save through lifecycle replay and reconstruction', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00.000Z',
    )
    const currentPath =
      `/development-only/${DEVELOPMENT_ONLY_BROWSER_PROFILE_ID}/current.idsw`
    const createApplication =
      createProductionCanonicalApplicationFactory({
        createFirstRunSave: () =>
          createUnityFirstRunPreparedSave({
            startedAtUtc:
              lifecycleClock.sample().serializedUtcText,
          }),
        readHostEntitlements: () =>
          Object.freeze({ permanentDoubleIp: false }),
      })
    const createProductionRuntime = (
      ownerToken: string,
      lifecycle: TestLifecycleAdapter,
    ) =>
      createBrowserRuntimeFoundation({
        createApplication,
        lifecyclePolicy: MOBILE_LIFECYCLE_POLICY,
        allowedExternalOrigins: [],
        database,
        lifecycle,
        lifecycleClock,
        activeTimeClock: new ManualActiveTimeClock(),
        activeTimeScheduler:
          new ManualAnimationFrameScheduler(),
        storageManager: {
          persisted: async () => true,
          persist: async () => true,
          estimate: async () => ({
            usage: 1,
            quota: 1_000,
          }),
        },
        nowUtcMilliseconds: () => 1_000,
        ownerToken,
        autoHeartbeat: false,
      })
    const importedState = prepareIdb1Save(
      readFileSync(fixtureUrl, 'utf8'),
    ).prepared.copyValidatedState()
    importedState.dateQuitString = ''
    importedState.lastSuccessfulLoadUtc =
      '2026-07-29T00:00:00.000Z'
    const advancedSave = serializeWebSave(importedState)
    const firstLifecycle =
      new TestLifecycleAdapter('background')
    const firstRuntime = createProductionRuntime(
      'advanced-first-owner',
      firstLifecycle,
    )

    await expect(firstRuntime.start()).resolves.toMatchObject({
      phase: 'ready',
    })
    await expect(
      firstRuntime.importSave({
        text: advancedSave,
        importedAtUtc: '2026-07-29T00:00:00.000Z',
        overwriteApproved: true,
      }),
    ).resolves.toMatchObject({
      imported: true,
      lifecycleReset: true,
    })
    const importedSnapshot = firstRuntime.snapshot()
    expect(importedSnapshot.phase).toBe('ready')
    if (importedSnapshot.phase !== 'ready') return

    lifecycleClock.set('2026-07-29T00:00:10.000Z')
    const mutationsBeforeBackground = database.mutations.length
    firstLifecycle.emit('background')
    await waitUntil(
      () =>
        database.mutations.length >
        mutationsBeforeBackground,
    )

    const snapshotBeforeReplay = firstRuntime.snapshot()
    const revisionBeforeReplay =
      snapshotBeforeReplay.phase === 'ready'
        ? snapshotBeforeReplay.revision.state
        : -1
    lifecycleClock.set('2026-07-29T00:00:20.000Z')
    firstLifecycle.emit('active')
    await waitUntil(() => {
      const snapshot = firstRuntime.snapshot()
      return (
        snapshot.phase === 'ready' &&
        snapshot.revision.state > revisionBeforeReplay
      )
    })
    await expect(firstRuntime.requestCheckpoint()).resolves.toBe(true)
    const replayedSnapshot = firstRuntime.snapshot()
    expect(replayedSnapshot.phase).toBe('ready')
    if (replayedSnapshot.phase !== 'ready') return
    const replayedGameplay = structuredClone(
      replayedSnapshot.gameplay,
    )
    await firstRuntime.shutdown()

    const secondRuntime = createProductionRuntime(
      'advanced-second-owner',
      new TestLifecycleAdapter('background'),
    )
    await expect(secondRuntime.start()).resolves.toMatchObject({
      phase: 'ready',
    })
    const reconstructed = secondRuntime.snapshot()
    expect(reconstructed).toMatchObject({
      phase: 'ready',
      source: 'primary',
    })
    if (reconstructed.phase !== 'ready') return
    const {
      lastSuspendedAtLegacyText: _transportOnlyDepartureMarker,
      ...replayedTimeline
    } = replayedGameplay.progression.timeline
    expect(reconstructed.gameplay).toMatchObject({
      ...replayedGameplay,
      progression: {
        ...replayedGameplay.progression,
        // Background startup may consume or refresh this transport-only
        // marker; the durable gameplay and replay result must still match.
        timeline: replayedTimeline,
      },
    })
    expect(await database.fileExists(currentPath)).toBe(true)
    await secondRuntime.shutdown()
  })

  test('acquires the writer fence before application construction and blocks a second owner without constructing it', async () => {
    const database = new MemoryBrowserSaveDatabase()
    database.forceLease({
      ownerToken: 'existing-owner',
      generation: 4,
      expiresAtUtcMilliseconds: 5_000,
    })
    let constructions = 0
    const runtime = createRuntime({
      database,
      ownerToken: 'blocked-owner',
      createApplication: () => {
        constructions += 1
        throw new Error('Blocked runtime must not construct an application.')
      },
    })

    await expect(runtime.start()).resolves.toMatchObject({
      phase: 'blocked',
      code: 'writer-owned',
      generation: 4,
    })
    expect(constructions).toBe(0)
    expect(database.events).toEqual(['lease.acquire'])
    await runtime.shutdown()
  })

  test('retries a blocked writer acquisition in place after the stale lease expires', async () => {
    const database = new MemoryBrowserSaveDatabase()
    database.forceLease({
      ownerToken: 'stale-owner',
      generation: 4,
      expiresAtUtcMilliseconds: 5_000,
    })
    let nowUtcMilliseconds = 1_000
    const runtime = createRuntime({
      database,
      ownerToken: 'replacement-owner',
      nowUtcMilliseconds: () => nowUtcMilliseconds,
    })

    await expect(runtime.start()).resolves.toMatchObject({
      phase: 'blocked',
      code: 'writer-owned',
      generation: 4,
    })

    nowUtcMilliseconds = 5_001
    await expect(runtime.start()).resolves.toMatchObject({
      phase: 'ready',
    })
    await expect(database.inspectWriterLease()).resolves.toMatchObject({
      ownerToken: 'replacement-owner',
      generation: 5,
    })
    expect(
      database.events.filter((event) => event === 'lease.acquire'),
    ).toHaveLength(2)
    await runtime.shutdown()
  })

  test('explicitly takes over a live writer only through the development recovery control', async () => {
    const database = new MemoryBrowserSaveDatabase()
    database.forceLease({
      ownerToken: 'stranded-owner',
      generation: 4,
      expiresAtUtcMilliseconds: 5_000,
    })
    const runtime = createRuntime({
      database,
      ownerToken: 'replacement-owner',
    })

    await expect(runtime.start()).resolves.toMatchObject({
      phase: 'blocked',
      code: 'writer-owned',
    })
    await expect(
      runtime.takeOverWriterOwnership(),
    ).resolves.toMatchObject({ phase: 'ready' })
    await expect(database.inspectWriterLease()).resolves.toMatchObject({
      ownerToken: 'replacement-owner',
      generation: 5,
    })
    await runtime.shutdown()
  })

  test('reconstructs immediately when an explicit same-tab reload replaces its previous generation', async () => {
    const database = new MemoryBrowserSaveDatabase()
    database.forceLease({
      ownerToken: 'same-tab',
      generation: 4,
      expiresAtUtcMilliseconds: 5_000,
    })
    const runtime = createRuntime({
      database,
      ownerToken: 'same-tab',
      allowUnexpiredSameOwnerTakeover: true,
    })

    await expect(runtime.start()).resolves.toMatchObject({
      phase: 'ready',
    })
    await expect(database.inspectWriterLease()).resolves.toMatchObject({
      ownerToken: 'same-tab',
      generation: 5,
    })
    await runtime.shutdown()
  })

  test('publishes an immediate retry deadline when the current owner announces release', async () => {
    const database = new MemoryBrowserSaveDatabase()
    database.forceLease({
      ownerToken: 'existing-owner',
      generation: 4,
      expiresAtUtcMilliseconds: 5_000,
    })
    const notices = new RecordingNoticeChannel()
    const runtime = createRuntime({
      database,
      ownerToken: 'blocked-owner',
      noticeChannel: notices,
    })
    await runtime.start()

    notices.emit({
      kind: 'released',
      generation: 4,
      expiresAtUtcMilliseconds: null,
    })

    expect(runtime.status()).toMatchObject({
      phase: 'blocked',
      code: 'writer-owned',
      expiresAtUtcMilliseconds: 1_000,
    })
    await runtime.shutdown()
  })

  test('orders acquisition, delayed startup, and queued lifecycle phases behind database revalidation', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const startGate = deferred<void>()
    const events = database.events
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      createApplication: (repository) => {
        events.push('application.construct')
        application = new FakeRuntimeApplication(repository, events)
        application.startGate = startGate.promise
        return application
      },
    })

    const starting = runtime.start()
    await waitUntil(() => events.includes('application.start'))
    expect(events.slice(0, 5)).toEqual([
      'lease.acquire',
      'lease.inspect',
      'application.construct',
      'lease.inspect',
      'application.start',
    ])

    lifecycle.emit('background')
    await flushMicrotasks()
    expect(application?.awayCommits).toBe(0)

    startGate.resolve()
    await expect(starting).resolves.toMatchObject({
      phase: 'ready',
    })
    await waitUntil(() => application?.awayCommits === 1)

    const awayIndex = events.indexOf('application.away')
    expect(awayIndex).toBeGreaterThan(events.indexOf('application.start.done'))
    expect(events[awayIndex - 1]).toBe('lease.inspect')
    await runtime.shutdown()
  })

  test('suppresses late ready publication when the lease expires during startup', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const clock = mutableClock(1_000)
    const startGate = deferred<void>()
    const phases: string[] = []
    const runtime = createRuntime({
      database,
      nowUtcMilliseconds: clock.now,
      leaseDurationMilliseconds: 1_000,
      heartbeatMilliseconds: 500,
      createApplication: (repository) => {
        const application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.startGate = startGate.promise
        return application
      },
    })
    runtime.subscribeStatus((status) => phases.push(status.phase))

    const starting = runtime.start()
    await waitUntil(() =>
      database.events.includes('application.start'),
    )
    clock.set(2_001)
    startGate.resolve()

    await expect(starting).resolves.toMatchObject({
      phase: 'ownership-lost',
    })
    expect(phases).not.toContain('ready')
    await runtime.shutdown()
  })

  test('constructs no late graph when heartbeat takeover is discovered during storage inspection', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const inspectGate = deferred<boolean>()
    const heartbeat = new ManualIntervalScheduler()
    let inspectStarted = false
    let constructions = 0
    const runtime = createRuntime({
      database,
      leaseScheduler: heartbeat,
      autoHeartbeat: true,
      storageManager: {
        persisted: async () => {
          inspectStarted = true
          return inspectGate.promise
        },
        persist: async () => true,
        estimate: async () => ({ usage: 1, quota: 1_000 }),
      },
      createApplication: (repository) => {
        constructions += 1
        return new FakeRuntimeApplication(
          repository,
          database.events,
        )
      },
    })

    const starting = runtime.start()
    await waitUntil(() => inspectStarted)
    database.forceLease({
      ownerToken: 'takeover',
      generation: 2,
      expiresAtUtcMilliseconds: 10_000,
    })
    heartbeat.fire()
    await waitUntil(() => runtime.status().phase === 'ownership-lost')
    inspectGate.resolve(true)

    await expect(starting).resolves.toMatchObject({
      phase: 'ownership-lost',
    })
    expect(constructions).toBe(0)
    expect((runtime.status()).phase).toBe('ownership-lost')
    await runtime.shutdown()
  })

  test('shutdown drains a late acquisition, releases its fence once, and constructs no application', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const acquireGate = deferred<void>()
    database.acquireGate = acquireGate.promise
    let constructions = 0
    const runtime = createRuntime({
      database,
      createApplication: (repository) => {
        constructions += 1
        return new FakeRuntimeApplication(
          repository,
          database.events,
        )
      },
    })

    const starting = runtime.start()
    await waitUntil(() =>
      database.events.includes('lease.acquire'),
    )
    const shutdown = runtime.shutdown()
    expect(runtime.status().phase).toBe('stopping')
    acquireGate.resolve()

    await shutdown
    await expect(starting).resolves.toMatchObject({
      phase: 'stopped',
    })
    expect(constructions).toBe(0)
    expect(database.releaseCalls).toBe(1)
    await expect(database.inspectWriterLease()).resolves.toBeNull()
  })

  test('discards the graph when ownership is lost during a lifecycle operation', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const awayGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.awayGate = awayGate.promise
        return application
      },
    })
    await runtime.start()

    lifecycle.emit('background')
    await waitUntil(() => application?.awayCommitsStarted === 1)
    database.forceLease({
      ownerToken: 'takeover',
      generation: 2,
      expiresAtUtcMilliseconds: 10_000,
    })
    awayGate.resolve()

    await waitUntil(() => runtime.status().phase === 'ownership-lost')
    await expect(
      runtime.importSave({
        text: 'bounded',
        importedAtUtc: '2026-07-29T00:00:00Z',
        overwriteApproved: true,
      }),
    ).rejects.toThrow('does not own an active application graph')
    await runtime.shutdown()
  })

  test('closes lifecycle and checkpoint admission synchronously, drains accepted work, and releases exactly once', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const awayGate = deferred<void>()
    const notices = new RecordingNoticeChannel()
    let application: FakeRuntimeApplication | undefined
    const statuses: string[] = []
    const runtime = createRuntime({
      database,
      lifecycle,
      noticeChannel: notices,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.awayGate = awayGate.promise
        return application
      },
    })
    runtime.subscribeStatus((status) => statuses.push(status.phase))
    await runtime.start()

    lifecycle.emit('background')
    await waitUntil(() => application?.awayCommitsStarted === 1)
    const shutdown = runtime.shutdown()
    expect(runtime.status().phase).toBe('stopping')
    expect(lifecycle.listenerCount).toBe(0)
    expect(await runtime.requestCheckpoint()).toBe(false)
    lifecycle.emit('active')
    await flushMicrotasks()
    expect(application?.awayCommitsStarted).toBe(1)

    let settled = false
    void shutdown.then(() => {
      settled = true
    })
    await flushMicrotasks()
    expect(settled).toBe(false)
    awayGate.resolve()
    await shutdown

    expect(runtime.status().phase).toBe('stopped')
    expect(database.releaseCalls).toBe(1)
    expect(notices.notices.map((notice) => notice.kind)).toEqual([
      'acquired',
      'released',
    ])
    expect(notices.closed).toBe(true)
    expect(statuses.slice(-2)).toEqual(['stopping', 'stopped'])
    const mutationsAfterDrain = database.mutations.length
    await expect(
      runtime.importSave({
        text: 'post-shutdown',
        importedAtUtc: '2026-07-29T00:00:00Z',
        overwriteApproved: true,
      }),
    ).rejects.toThrow('does not own an active application graph')
    expect(database.mutations).toHaveLength(mutationsAfterDrain)
  })

  test('retains an exact bounded invalid import before canonical validation and never replaces the current save', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const downloads = new RecordingDownloads()
    const clipboard = new RecordingClipboard()
    const activeClock = new ManualActiveTimeClock()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      downloads,
      clipboard,
      activeTimeClock: activeClock,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.rejectImports = true
        return application
      },
    })
    await runtime.start()
    expect(runtime.recoveryExportAvailable()).toBe(false)
    const snapshotPublications: number[] = []
    runtime.subscribeSnapshot((snapshot) => {
      if (snapshot.phase === 'ready') {
        snapshotPublications.push(snapshot.revision.state)
      }
    })
    activeClock.set(7)
    const original = 'bounded but deliberately invalid canonical input'

    await expect(
      runtime.importSave({
        text: original,
        importedAtUtc: '2026-07-29T00:00:00Z',
        overwriteApproved: true,
        source: 'paste',
      }),
    ).resolves.toMatchObject({
      imported: false,
      code: 'APP-IMPORT-INVALID',
      recoveryAvailable: true,
    })
    expect(database.mutations.map((mutation) => mutation.kind)).toEqual([
      'retain-legacy',
    ])
    expect(application?.importCalls).toBe(1)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 7, sessionRevision: 1 },
    ])
    expect(runtime.snapshot()).toMatchObject({
      phase: 'ready',
      revision: { state: 1 },
    })
    // Active-time settlement publishes once; the terminal failed-import
    // outcome then republishes the authoritative final snapshot explicitly.
    expect(snapshotPublications).toEqual([1, 1])
    expect(runtime.recoveryExportAvailable()).toBe(true)

    await expect(runtime.exportLastRecovery()).resolves.toBe(true)
    expect(downloads.last?.text).toBe(original)
    await expect(runtime.copyLastRecovery()).resolves.toBe(true)
    expect(clipboard.value).toBe(original)
    await runtime.shutdown()
  })

  test('retains a historical source exactly and repeated manual shared imports never replay away time', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        const imported = runtimeStateWithoutQuitTimestamp()
        imported.gameState.timeline.lastSuspendedAtLegacyText =
          '2026-07-29T00:00:00Z'
        application.importedState = imported
        return application
      },
      lifecycleClock: fixedClock('2026-07-29T00:00:10Z'),
    })
    await runtime.start()
    const supplied = serializeWebSave({
      saveVersion: 12,
      marker: 'imported',
      dateQuitString: '2026-07-01T00:00:00Z',
    })

    const first = await
      runtime.importSave({
        importedAtUtc: '2026-07-29T00:00:10Z',
        overwriteApproved: true,
        context: {
          kind: 'manual-shared-import',
          importedAtUtc: '2026-07-29T00:00:10Z',
        },
        source: 'file',
        file: {
          name: 'unity-save.txt',
          size: new TextEncoder().encode(supplied).byteLength,
          text: async () => supplied,
        },
      })
    expect(first).toMatchObject({
      imported: true,
      sessionRevision: 2,
      recoveryAvailable: true,
      lifecycleReset: true,
    })
    lifecycle.emit('active')
    await expect(runtime.requestCheckpoint()).resolves.toBe(true)
    expect(application?.awayCommits).toBe(0)
    await expect(
      runtime.importSave({
        text: supplied,
        importedAtUtc: '2026-07-29T00:00:10Z',
        overwriteApproved: true,
        context: {
          kind: 'manual-shared-import',
          importedAtUtc: '2026-07-29T00:00:10Z',
        },
      }),
    ).resolves.toMatchObject({
      imported: true,
      sessionRevision: 3,
      lifecycleReset: true,
    })
    lifecycle.emit('active')
    await expect(runtime.requestCheckpoint()).resolves.toBe(true)
    const mutationKinds = database.mutations.map(
      (mutation) => mutation.kind,
    )
    expect(mutationKinds[0]).toBe('retain-legacy')
    expect(mutationKinds).toContain('replace')
    expect(application?.importCalls).toBe(2)
    expect(application?.awayCommits).toBe(0)
    expect((await database.listLegacyCandidates())[0]?.text).toBe(
      supplied,
    )
    await runtime.shutdown()
  })

  test('previews imported point progress without retaining or replacing the save', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const runtime = createRuntime({ database })
    await runtime.start()
    const mutationsBeforePreview = database.mutations.length
    const supplied = serializeWebSave({
      saveVersion: 12,
      dysonVerseSaveData: {
        dysonVerseInfinityData: {},
        dysonVersePrestigeData: { infinityPoints: 42n },
        dysonVerseSkillTreeData: { skillPointsTree: 7n },
      },
      prestigePlus: { points: 3n },
    })

    await expect(runtime.previewImport({
      text: supplied,
      importedAtUtc: '2026-07-29T00:00:10Z',
      overwriteApproved: false,
    })).resolves.toEqual({
      accepted: true,
      preview: {
        infinityPoints: 42n,
        quantumPoints: 3n,
        skillPoints: 7n,
      },
    })
    expect(database.mutations).toHaveLength(mutationsBeforePreview)
    await runtime.shutdown()
  })

  test.each([
    {
      label: 'automatic Unity migration',
      context: {
        kind: 'automatic-unity-migration' as const,
        observedAtUtc: '2026-07-29T00:16:40Z',
      },
    },
    {
      label: 'transitional Web upgrade',
      context: {
        kind: 'transitional-web-upgrade' as const,
        upgradedAtUtc: '2026-07-29T00:16:40Z',
      },
    },
  ])(
    'replays a preserved $label timestamp once through the browser runtime',
    async ({ context }) => {
      const database = new MemoryBrowserSaveDatabase()
      const lifecycle = new TestLifecycleAdapter()
      let application: FakeRuntimeApplication | undefined
      const runtime = createRuntime({
        database,
        lifecycle,
        createApplication: (repository) => {
          application = new FakeRuntimeApplication(
            repository,
            database.events,
          )
          const imported = runtimeStateWithoutQuitTimestamp()
          imported.gameState.timeline = {
            ...imported.gameState.timeline,
            lastSuspendedAtLegacyText: '2026-07-29T00:00:00Z',
            storedTimeAvailableSeconds: 90,
            storedTimeCapacitySeconds: 100,
          }
          application.importedState = imported
          return application
        },
        lifecycleClock: fixedClock('2026-07-29T00:16:40Z'),
      })
      await runtime.start()

      await expect(
        runtime.importSave({
          text: serializeWebSave({
            saveVersion: 12,
            marker: 'trusted-local-import',
          }),
          importedAtUtc: '2026-07-29T00:16:40Z',
          overwriteApproved: true,
          context,
        }),
      ).resolves.toMatchObject({
        imported: true,
        lifecycleReset: true,
      })
      lifecycle.emit('active')
      await expect(runtime.requestCheckpoint()).resolves.toBe(true)
      lifecycle.emit('active')
      await expect(runtime.requestCheckpoint()).resolves.toBe(true)

      expect(application?.awayCommits).toBe(1)
      const snapshot = application?.snapshot()
      expect(snapshot?.phase).toBe('ready')
      if (snapshot?.phase === 'ready') {
        expect(
          snapshot.state.gameState.timeline.lastSuspendedAtLegacyText,
        ).toBeNull()
        expect(
          snapshot.state.gameState.timeline.storedTimeAvailableSeconds,
        ).toBe(100)
      }
      await runtime.shutdown()
    },
  )

  test('recovers an application-blocked startup through coordinated import before publishing ready', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    let application: FakeRuntimeApplication | undefined
    const phases: string[] = []
    const runtime = createRuntime({
      database,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.blocked = true
        application.importedState = runtimeStateWithoutQuitTimestamp()
        application.rejectImportAttempts.add(1)
        return application
      },
    })
    runtime.subscribeStatus((status) => phases.push(status.phase))
    await expect(runtime.start()).resolves.toMatchObject({
      phase: 'blocked',
      code: 'application-blocked',
    })

    const supplied = serializeWebSave({
      saveVersion: 12,
      marker: 'recovery',
    })
    await expect(
      runtime.importSave({
        text: supplied,
        importedAtUtc: '2026-07-29T00:00:00Z',
        overwriteApproved: true,
      }),
    ).resolves.toMatchObject({
      imported: false,
      code: 'APP-IMPORT-INVALID',
    })
    expect(runtime.status().phase).toBe('blocked')
    expect(frames.pending).toBe(0)

    await expect(
      runtime.importSave({
        text: supplied,
        importedAtUtc: '2026-07-29T00:00:00Z',
        overwriteApproved: true,
      }),
    ).resolves.toMatchObject({
      imported: true,
      recoveryAvailable: true,
    })
    expect(runtime.status().phase).toBe('ready')
    expect(phases.slice(-2)).toEqual(['blocked', 'ready'])
    expect(frames.pending).toBe(1)

    activeClock.set(9)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 1)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 9, sessionRevision: 2 },
    ])
    await runtime.shutdown()
  })

  test('keeps foreground stopped between overlapping imports and resumes only after the final failed import settles', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    const firstGate = deferred<void>()
    const secondGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.importedState =
          runtimeStateWithoutQuitTimestamp()
        application.importGates.set(1, firstGate.promise)
        application.importGates.set(2, secondGate.promise)
        application.rejectImportAttempts.add(2)
        return application
      },
    })
    await runtime.start()

    activeClock.set(10)
    const first = runtime.importSave({
      text: serializeWebSave({
        saveVersion: 12,
        marker: 'first',
      }),
      importedAtUtc: '2026-07-29T00:00:00Z',
      overwriteApproved: true,
    })
    await waitUntil(() => application?.importCalls === 1)
    const second = runtime.importSave({
      text: serializeWebSave({
        saveVersion: 12,
        marker: 'second',
      }),
      importedAtUtc: '2026-07-29T00:00:01Z',
      overwriteApproved: true,
    })
    expect(frames.pending).toBe(0)

    firstGate.resolve()
    await expect(first).resolves.toMatchObject({
      imported: true,
      sessionRevision: 2,
      lifecycleReset: true,
    })
    await waitUntil(() => application?.importCalls === 2)
    expect(frames.pending).toBe(0)

    activeClock.set(100)
    secondGate.resolve()
    await expect(second).resolves.toMatchObject({
      imported: false,
      code: 'APP-IMPORT-INVALID',
    })
    expect(frames.pending).toBe(1)

    activeClock.set(111)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 2)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 10, sessionRevision: 1 },
      { milliseconds: 11, sessionRevision: 2 },
    ])
    await runtime.shutdown()
  })

  test('coalesces only complete active results and publishes rejected or partial results immediately', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const activeClock = new ManualActiveTimeClock()
    const activeFrames = new ManualAnimationFrameScheduler()
    const presentationFrames = new ManualAnimationFrameScheduler()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      activeTimeClock: activeClock,
      activeTimeScheduler: activeFrames,
      frontendSnapshotScheduler: presentationFrames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.activeOutcomes.push(
          'success',
          'rejected',
          'partial',
          'success',
        )
        return application
      },
    })
    await runtime.start()
    const revisions: number[] = []
    runtime.subscribeSnapshot((snapshot) => {
      if (snapshot.phase === 'ready') {
        revisions.push(snapshot.revision.state)
      }
    })

    activeClock.set(1)
    activeFrames.fire()
    await waitUntil(() => application?.activeRequests.length === 1)
    await flushMicrotasks()
    expect(presentationFrames.pending).toBe(1)
    expect(revisions).toEqual([])
    expect(runtime.snapshot()).toMatchObject({
      phase: 'ready',
      revision: { state: 1 },
    })

    activeClock.set(2)
    activeFrames.fire()
    await waitUntil(() => application?.activeRequests.length === 2)
    await flushMicrotasks()
    expect(presentationFrames.pending).toBe(0)
    expect(revisions).toEqual([1])

    activeClock.set(3)
    activeFrames.fire()
    await waitUntil(() => application?.activeRequests.length === 3)
    await flushMicrotasks()
    expect(presentationFrames.pending).toBe(0)
    expect(revisions).toEqual([1, 2])

    activeClock.set(4)
    activeFrames.fire()
    await waitUntil(() => application?.activeRequests.length === 4)
    await flushMicrotasks()
    expect(presentationFrames.pending).toBe(1)
    expect(revisions).toEqual([1, 2])
    expect(runtime.snapshot()).toMatchObject({
      phase: 'ready',
      revision: { state: 3 },
    })

    presentationFrames.fire()
    expect(revisions).toEqual([1, 2, 3])
    expect(runtime.status()).toMatchObject({
      phase: 'ready',
      warnings: [
        { code: 'active-time-failed' },
        { code: 'active-time-failed' },
      ],
    })
    await runtime.shutdown()
  })

  test('publishes a committed import failure as blocked with recovery available', async () => {
    const database = new MemoryBrowserSaveDatabase()
    let application: FakeRuntimeApplication | undefined
    const phases: string[] = []
    const snapshots: string[] = []
    const runtime = createRuntime({
      database,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.committedImportFailure = true
        return application
      },
    })
    runtime.subscribeStatus((status) => phases.push(status.phase))
    runtime.subscribeSnapshot((snapshot) => snapshots.push(snapshot.phase))
    await runtime.start()

    await expect(runtime.importSave({
      text: serializeWebSave({
        saveVersion: 12,
        marker: 'committed-but-invalid',
      }),
      importedAtUtc: '2026-07-29T00:00:00Z',
      overwriteApproved: true,
    })).resolves.toMatchObject({
      imported: false,
      committed: true,
      code: 'APP-POST-COMMIT-RELOAD',
      recoveryAvailable: true,
    })

    expect(runtime.status()).toMatchObject({
      phase: 'blocked',
      code: 'application-blocked',
    })
    expect(runtime.snapshot()).toMatchObject({
      phase: 'blocked',
    })
    expect(phases.at(-1)).toBe('blocked')
    expect(snapshots.at(-1)).toBe('blocked')
    await runtime.shutdown()
  })

  test.each(['background', 'focus-lost'] as const)(
    'does not let overlapping import completion override a newer %s intent',
    async (nonActivePhase) => {
      const database = new MemoryBrowserSaveDatabase()
      const lifecycle = new TestLifecycleAdapter()
      const lifecycleClock = new ManualLifecycleClock(
        '2026-07-29T00:00:00Z',
      )
      const activeClock = new ManualActiveTimeClock()
      const frames = new ManualAnimationFrameScheduler()
      const firstGate = deferred<void>()
      const secondGate = deferred<void>()
      let application: FakeRuntimeApplication | undefined
      const runtime = createRuntime({
        database,
        lifecycle,
        lifecycleClock,
        activeTimeClock: activeClock,
        activeTimeScheduler: frames,
        createApplication: (repository) => {
          application = new FakeRuntimeApplication(
            repository,
            database.events,
          )
          const imported = runtimeStateWithoutQuitTimestamp()
          imported.gameState.timeline.storedTimeAvailableSeconds = 0
          imported.gameState.timeline.storedTimeCapacitySeconds = 100
          imported.gameState.timeline.doubleTime.bankSeconds = 0
          application.importedState = imported
          application.importGates.set(1, firstGate.promise)
          application.importGates.set(2, secondGate.promise)
          return application
        },
      })
      await runtime.start()

      activeClock.set(10)
      const first = runtime.importSave({
        text: serializeWebSave({
          saveVersion: 12,
          marker: 'first',
        }),
        importedAtUtc: '2026-07-29T00:00:00Z',
        overwriteApproved: true,
      })
      await waitUntil(() => application?.importCalls === 1)
      const second = runtime.importSave({
        text: serializeWebSave({
          saveVersion: 12,
          marker: 'second',
        }),
        importedAtUtc: '2026-07-29T00:00:01Z',
        overwriteApproved: true,
      })

      firstGate.resolve()
      await expect(first).resolves.toMatchObject({
        imported: true,
        sessionRevision: 2,
      })
      await waitUntil(() => application?.importCalls === 2)
      expect(frames.pending).toBe(0)

      lifecycle.emit(nonActivePhase)
      secondGate.resolve()
      await expect(second).resolves.toMatchObject({
        imported: true,
        sessionRevision: 3,
      })
      await waitUntil(() => application?.awayCommits === 1)
      expect(frames.pending).toBe(0)
      expect(application?.activeRequests).toEqual([
        { milliseconds: 10, sessionRevision: 1 },
      ])

      lifecycleClock.set('2026-07-29T00:00:05Z')
      activeClock.set(1_000)
      lifecycle.emit('active')
      await waitUntil(() => application?.awayCommits === 2)
      await waitUntil(() => frames.pending === 1)
      activeClock.set(1_007)
      frames.fire()
      await waitUntil(() => application?.activeRequests.length === 2)
      expect(application?.activeRequests).toEqual([
        { milliseconds: 10, sessionRevision: 1 },
        { milliseconds: 7, sessionRevision: 3 },
      ])
      await runtime.shutdown()
    },
  )

  test('keeps visible focus loss active and converts hidden time to offline credit without fast-forwarding gameplay', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00Z',
    )
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      lifecycleClock,
      lifecyclePolicy: WEB_LIFECYCLE_POLICY,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.setTimeResources(0, 100, 0)
        return application
      },
    })
    await runtime.start()
    expect(frames.pending).toBe(1)

    activeClock.set(100)
    lifecycleClock.set('2026-07-29T00:00:01Z')
    lifecycle.emit('focus-lost')
    await flushMicrotasks()

    expect(application?.awayCommits).toBe(0)
    expect(frames.pending).toBe(1)

    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 1)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 100, sessionRevision: 1 },
    ])

    activeClock.set(200)
    lifecycleClock.set('2026-07-29T00:00:02Z')
    lifecycle.emit('background')
    await waitUntil(() => application?.awayCommits === 1)
    await waitUntil(() => application?.activeRequests.length === 2)

    expect(frames.pending).toBe(0)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 100, sessionRevision: 1 },
      { milliseconds: 100, sessionRevision: 1 },
    ])

    lifecycleClock.set('2026-07-29T00:00:07Z')
    lifecycle.emit('active')
    await waitUntil(() => application?.awayCommits === 2)
    await waitUntil(() => frames.pending === 1)

    // The hidden five seconds become offline resources. They are never sent
    // to the active-time simulation driver as a 5,000 ms catch-up request.
    expect(application?.activeRequests).toHaveLength(2)
    const replayed = application?.snapshot()
    expect(replayed?.phase).toBe('ready')
    if (replayed?.phase === 'ready') {
      expect(replayed.state.gameState.timeline).toMatchObject({
        storedTimeAvailableSeconds: 5,
        storedTimeCapacitySeconds: 100,
        lastSuspendedAtLegacyText: null,
        doubleTime: { bankSeconds: 10 },
      })
    }

    activeClock.set(213)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 3)
    expect(application?.activeRequests[2]).toEqual({
      milliseconds: 13,
      sessionRevision: 1,
    })
    await runtime.shutdown()
  })

  test('never restarts foreground when ownership is lost during the final overlapping import', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    const firstGate = deferred<void>()
    const secondGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.importedState =
          runtimeStateWithoutQuitTimestamp()
        application.importGates.set(1, firstGate.promise)
        application.importGates.set(2, secondGate.promise)
        return application
      },
    })
    await runtime.start()

    activeClock.set(10)
    const first = runtime.importSave({
      text: serializeWebSave({
        saveVersion: 12,
        marker: 'first',
      }),
      importedAtUtc: '2026-07-29T00:00:00Z',
      overwriteApproved: true,
    })
    await waitUntil(() => application?.importCalls === 1)
    const second = runtime.importSave({
      text: serializeWebSave({
        saveVersion: 12,
        marker: 'second',
      }),
      importedAtUtc: '2026-07-29T00:00:01Z',
      overwriteApproved: true,
    })

    firstGate.resolve()
    await expect(first).resolves.toMatchObject({
      imported: true,
      sessionRevision: 2,
    })
    await waitUntil(() => application?.importCalls === 2)
    expect(frames.pending).toBe(0)

    database.forceLease({
      ownerToken: 'replacement',
      generation: 2,
      expiresAtUtcMilliseconds: 10_000,
    })
    secondGate.resolve()
    const settled = await Promise.allSettled([second])
    expect(settled[0]?.status).toBe('rejected')
    await waitUntil(() =>
      runtime.status().phase === 'ownership-lost',
    )
    expect(frames.pending).toBe(0)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 10, sessionRevision: 1 },
    ])
    await runtime.shutdown()
  })

  test('rejects an oversized supplied import before any mutation', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const runtime = createRuntime({ database })
    await runtime.start()

    await expect(
      runtime.importSave({
        text: 'x'.repeat(2 * 1024 * 1024 + 1),
        importedAtUtc: '2026-07-29T00:00:00Z',
        overwriteApproved: true,
      }),
    ).resolves.toMatchObject({
      imported: false,
      code: 'RUNTIME-IMPORT-LIMIT',
      recoveryAvailable: false,
    })
    expect(database.mutations).toEqual([])
    expect(runtime.recoveryExportAvailable()).toBe(false)
    await runtime.shutdown()
  })

  test('checks file size before reading or retaining an oversized source', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const runtime = createRuntime({ database })
    let reads = 0
    await runtime.start()

    await expect(
      runtime.importSave({
        source: 'file',
        file: {
          name: 'oversized-save.txt',
          size: 2 * 1024 * 1024 + 1,
          text: async () => {
            reads += 1
            return 'must-not-be-read'
          },
        },
        importedAtUtc: '2026-07-29T00:00:00Z',
        overwriteApproved: true,
      }),
    ).resolves.toMatchObject({
      imported: false,
      code: 'RUNTIME-IMPORT-LIMIT',
      recoveryAvailable: false,
    })
    expect(reads).toBe(0)
    expect(database.mutations).toEqual([])
    await runtime.shutdown()
  })

  test('surfaces persistent-storage denial and exposes narrow storage inspection', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const runtime = createRuntime({
      database,
      storageManager: {
        persisted: async () => false,
        persist: async () => false,
        estimate: async () => ({ usage: 95, quota: 100 }),
      },
    })

    await expect(runtime.start()).resolves.toMatchObject({
      phase: 'ready',
      warnings: [
        { code: 'persistent-storage-denied' },
        { code: 'quota-pressure' },
      ],
    })
    await expect(runtime.inspectStorage(false)).resolves.toMatchObject({
      persisted: false,
      usageBytes: 95,
      quotaBytes: 100,
      quotaPressure: true,
    })
    await runtime.shutdown()
  })

  test('fences explicit and safe-reload checkpoints and preserves the last verified save on quota failure', async () => {
    const database = new MemoryBrowserSaveDatabase()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.setDirty('verified')
        return application
      },
    })
    await runtime.start()
    await expect(runtime.requestCheckpoint()).resolves.toBe(true)
    const currentPath =
      `/development-only/${DEVELOPMENT_ONLY_BROWSER_PROFILE_ID}/current.idsw`
    const verified = await database.readFile(currentPath)

    application?.setDirty('candidate')
    database.failNextMutation = 'replace'
    await expect(
      runtime.checkpointBeforeSafeReload(),
    ).resolves.toBe(false)
    expect(await database.readFile(currentPath)).toBe(verified)
    expect(runtime.status()).toMatchObject({
      phase: 'ready',
      warnings: [{ code: 'checkpoint-failed' }],
    })
    await runtime.shutdown()
  })

  test('detects ownership loss at the final checkpoint fence and publishes no successful result', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const checkpointGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.setDirty('delayed')
        application.checkpointGate = checkpointGate.promise
        application.checkpointSkipsPersistence = true
        return application
      },
    })
    await runtime.start()

    const checkpoint = runtime.requestCheckpoint()
    await waitUntil(() => application?.checkpointCalls === 1)
    database.forceLease({
      ownerToken: 'replacement',
      generation: 2,
      expiresAtUtcMilliseconds: 10_000,
    })
    checkpointGate.resolve()

    await expect(checkpoint).resolves.toBe(false)
    expect(runtime.status().phase).toBe('ownership-lost')
    await runtime.shutdown()
  })

  test('keeps delayed startup background time out of active delivery until the latest raw phase resumes', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00Z',
    )
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    const startGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      lifecycleClock,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.startGate = startGate.promise
        return application
      },
    })

    const starting = runtime.start()
    await waitUntil(() =>
      database.events.includes('application.start'),
    )
    lifecycle.emit('background')
    activeClock.set(1_000)
    startGate.resolve()

    await expect(starting).resolves.toMatchObject({
      phase: 'ready',
    })
    await waitUntil(() => application?.awayCommits === 1)
    expect(frames.pending).toBe(0)
    expect(application?.activeRequests).toEqual([])

    activeClock.set(3_000)
    lifecycleClock.set('2026-07-29T00:00:10Z')
    lifecycle.emit('active')
    await waitUntil(() => application?.awayCommits === 2)
    await waitUntil(() => frames.pending === 1)
    expect(frames.pending).toBe(1)

    activeClock.set(3_017)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 1)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 17, sessionRevision: 1 },
    ])
    await runtime.shutdown()
  })

  test.each(['background', 'focus-lost'] as const)(
    'seeds initial %s through the startup fence and replays exact away credit before foreground time',
    async (initialPhase) => {
      const database = new MemoryBrowserSaveDatabase()
      const lifecycle = new TestLifecycleAdapter(initialPhase)
      const lifecycleClock = new ManualLifecycleClock(
        '2026-07-29T00:00:00Z',
      )
      const activeClock = new ManualActiveTimeClock()
      const frames = new ManualAnimationFrameScheduler()
      const startGate = deferred<void>()
      let application: FakeRuntimeApplication | undefined
      const runtime = createRuntime({
        database,
        lifecycle,
        lifecycleClock,
        activeTimeClock: activeClock,
        activeTimeScheduler: frames,
        createApplication: (repository) => {
          application = new FakeRuntimeApplication(
            repository,
            database.events,
          )
          application.setTimeResources(0, 100, 0)
          application.startGate = startGate.promise
          return application
        },
      })

      const starting = runtime.start()
      await waitUntil(() =>
        database.events.includes('application.start'),
      )
      lifecycleClock.set('2026-07-29T00:00:10Z')
      startGate.resolve()
      await expect(starting).resolves.toMatchObject({
        phase: 'ready',
      })
      expect(application?.awayCommits).toBe(1)
      expect(frames.pending).toBe(0)
      expect(application?.activeRequests).toEqual([])
      expect(
        application?.snapshot().phase === 'ready'
          ? application.snapshot().state.gameState.timeline
              .lastSuspendedAtLegacyText
          : undefined,
      ).toBe('2026-07-29T00:00:00Z')

      activeClock.set(5_000)
      lifecycle.emit('active')
      await waitUntil(() => application?.awayCommits === 2)
      await waitUntil(() => frames.pending === 1)

      const replayed = application?.snapshot()
      expect(replayed?.phase).toBe('ready')
      if (replayed?.phase === 'ready') {
        expect(replayed.state.gameState.timeline).toMatchObject({
          storedTimeAvailableSeconds: 10,
          storedTimeCapacitySeconds: 100,
          lastSuspendedAtLegacyText: null,
          doubleTime: { bankSeconds: 20 },
        })
      }

      activeClock.set(5_013)
      frames.fire()
      await waitUntil(() => application?.activeRequests.length === 1)
      expect(application?.activeRequests).toEqual([
        { milliseconds: 13, sessionRevision: 1 },
      ])
      expect(application?.awayCommits).toBe(2)
      await runtime.shutdown()
    },
  )

  test('orders an initial background seed before active received during delayed startup without stale suspension', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter('background')
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00Z',
    )
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    const startGate = deferred<void>()
    const awayGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      lifecycleClock,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.startGate = startGate.promise
        application.awayGate = awayGate.promise
        application.setTimeResources(0, 100, 0)
        return application
      },
    })

    const starting = runtime.start()
    await waitUntil(() =>
      database.events.includes('application.start'),
    )
    lifecycleClock.set('2026-07-29T00:00:01Z')
    lifecycle.emit('active')
    activeClock.set(1_000)
    startGate.resolve()

    await waitUntil(() => application?.awayCommitsStarted === 1)
    expect(database.events.indexOf('application.away')).toBeGreaterThan(
      database.events.indexOf('application.start.done'),
    )
    lifecycleClock.set('2026-07-29T00:00:10Z')
    awayGate.resolve()

    await expect(starting).resolves.toMatchObject({
      phase: 'ready',
    })
    await waitUntil(() => application?.awayCommits === 2)
    await waitUntil(() => frames.pending === 1)

    const replayed = application?.snapshot()
    expect(replayed?.phase).toBe('ready')
    if (replayed?.phase === 'ready') {
      expect(replayed.state.gameState.timeline).toMatchObject({
        storedTimeAvailableSeconds: 1,
        storedTimeCapacitySeconds: 100,
        lastSuspendedAtLegacyText: null,
        doubleTime: { bankSeconds: 2 },
      })
    }

    activeClock.set(1_021)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 1)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 21, sessionRevision: 1 },
    ])
    expect(application?.awayCommits).toBe(2)
    await runtime.shutdown()
  })

  test('pairs cold replay and initial background seeding to one observation-time sample before queued active replay', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter('background')
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00Z',
    )
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    const startGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      lifecycleClock,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.startGate = startGate.promise
        application.setTimeResources(0, 100, 0)
        application.setDepartureTimestamp(
          '2026-07-28T23:59:50Z',
        )
        return application
      },
    })

    const starting = runtime.start()
    await waitUntil(() =>
      database.events.includes('application.start'),
    )
    lifecycleClock.set('2026-07-29T00:00:05Z')
    lifecycle.emit('active')
    lifecycleClock.set('2026-07-29T00:00:10Z')
    activeClock.set(1_000)
    startGate.resolve()

    await expect(starting).resolves.toMatchObject({
      phase: 'ready',
    })
    await waitUntil(() => application?.awayCommits === 3)
    await waitUntil(() => frames.pending === 1)

    const replayed = application?.snapshot()
    expect(replayed?.phase).toBe('ready')
    if (replayed?.phase === 'ready') {
      expect(replayed.state.gameState.timeline).toMatchObject({
        storedTimeAvailableSeconds: 15,
        storedTimeCapacitySeconds: 100,
        lastSuspendedAtLegacyText: null,
        doubleTime: { bankSeconds: 30 },
      })
    }

    activeClock.set(1_012)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 1)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 12, sessionRevision: 1 },
    ])
    expect(application?.awayCommits).toBe(3)
    await runtime.shutdown()
  })

  test('preserves an unconsumed cold baseline when replay fails once before initial background persistence', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter('background')
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00Z',
    )
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      lifecycleClock,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.setTimeResources(0, 100, 0)
        application.setDepartureTimestamp(
          '2026-07-28T23:59:50Z',
        )
        application.failAwayCommitAttempts.add(1)
        return application
      },
    })

    await expect(runtime.start()).resolves.toMatchObject({
      phase: 'ready',
      warnings: [
        {
          code: 'persistence-failed',
          reason:
            'Startup away-time replay did not establish a safe foreground baseline: commit-failed; foreground sampling remains paused until canonical replay succeeds.',
        },
      ],
    })
    expect(application?.awayCommitsStarted).toBe(2)
    expect(application?.awayCommits).toBe(1)
    expect(frames.pending).toBe(0)
    const persistedBackground = application?.snapshot()
    expect(persistedBackground?.phase).toBe('ready')
    if (persistedBackground?.phase === 'ready') {
      expect(
        persistedBackground.state.gameState.timeline,
      ).toMatchObject({
        storedTimeAvailableSeconds: 0,
        lastSuspendedAtLegacyText:
          '2026-07-28T23:59:50Z',
        doubleTime: { bankSeconds: 0 },
      })
    }

    lifecycleClock.set('2026-07-29T00:00:05Z')
    activeClock.set(1_000)
    lifecycle.emit('active')
    await waitUntil(() => application?.awayCommits === 2)
    await waitUntil(() => frames.pending === 1)

    const replayed = application?.snapshot()
    expect(replayed?.phase).toBe('ready')
    if (replayed?.phase === 'ready') {
      expect(replayed.state.gameState.timeline).toMatchObject({
        storedTimeAvailableSeconds: 15,
        storedTimeCapacitySeconds: 100,
        lastSuspendedAtLegacyText: null,
        doubleTime: { bankSeconds: 30 },
      })
    }

    activeClock.set(1_011)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 1)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 11, sessionRevision: 1 },
    ])
    await runtime.shutdown()
  })

  test.each([
    {
      sequence: 'focus-lost then background',
      departures: [
        ['focus-lost', '2026-07-29T00:00:00Z'],
        ['background', '2026-07-29T00:00:05Z'],
      ],
    },
    {
      sequence: 'background then focus-lost',
      departures: [
        ['background', '2026-07-29T00:00:00Z'],
        ['focus-lost', '2026-07-29T00:00:05Z'],
      ],
    },
    {
      sequence: 'background then terminating',
      departures: [
        ['background', '2026-07-29T00:00:00Z'],
        ['terminating', '2026-07-29T00:00:05Z'],
      ],
    },
    {
      sequence: 'repeated mixed non-active phases',
      departures: [
        ['background', '2026-07-29T00:00:00Z'],
        ['background', '2026-07-29T00:00:02Z'],
        ['focus-lost', '2026-07-29T00:00:04Z'],
        ['focus-lost', '2026-07-29T00:00:06Z'],
        ['terminating', '2026-07-29T00:00:08Z'],
      ],
    },
  ] as const)(
    'preserves one departure baseline through $sequence and replays away time exactly once',
    async ({ departures }) => {
      const database = new MemoryBrowserSaveDatabase()
      const lifecycle = new TestLifecycleAdapter()
      const lifecycleClock = new ManualLifecycleClock(
        '2026-07-29T00:00:00Z',
      )
      const activeClock = new ManualActiveTimeClock()
      const frames = new ManualAnimationFrameScheduler()
      let application: FakeRuntimeApplication | undefined
      const runtime = createRuntime({
        database,
        lifecycle,
        lifecycleClock,
        activeTimeClock: activeClock,
        activeTimeScheduler: frames,
        createApplication: (repository) => {
          application = new FakeRuntimeApplication(
            repository,
            database.events,
          )
          application.setTimeResources(0, 100, 0)
          return application
        },
      })
      await runtime.start()

      for (
        let index = 0;
        index < departures.length;
        index += 1
      ) {
        const [phase, utc] = departures[index]
        lifecycleClock.set(utc)
        lifecycle.emit(phase)
        await waitUntil(
          () => application?.awayCommits === index + 1,
        )
        const departed = application?.snapshot()
        expect(departed?.phase).toBe('ready')
        if (departed?.phase === 'ready') {
          expect(
            departed.state.gameState.timeline
              .lastSuspendedAtLegacyText,
          ).toBe('2026-07-29T00:00:00Z')
        }
      }
      expect(frames.pending).toBe(0)
      expect(application?.activeRequests).toEqual([])

      activeClock.set(1_000)
      lifecycleClock.set('2026-07-29T00:00:10Z')
      lifecycle.emit('active')
      await waitUntil(
        () =>
          application?.awayCommits === departures.length + 1,
      )
      await waitUntil(() => frames.pending === 1)

      const replayed = application?.snapshot()
      expect(replayed?.phase).toBe('ready')
      if (replayed?.phase === 'ready') {
        expect(replayed.state.gameState.timeline).toMatchObject({
          storedTimeAvailableSeconds: 10,
          storedTimeCapacitySeconds: 100,
          lastSuspendedAtLegacyText: null,
          doubleTime: { bankSeconds: 20 },
        })
      }

      lifecycle.emit('active')
      await runtime.requestCheckpoint()
      expect(application?.awayCommits).toBe(
        departures.length + 1,
      )

      activeClock.set(1_017)
      frames.fire()
      await waitUntil(() => application?.activeRequests.length === 1)
      expect(application?.activeRequests).toEqual([
        { milliseconds: 17, sessionRevision: 1 },
      ])
      expect(application?.awayCommits).toBe(
        departures.length + 1,
      )
      await runtime.shutdown()
    },
  )

  test('keeps foreground stopped after replay commit failure and retries the original departure without duplication', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00Z',
    )
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      lifecycleClock,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.setTimeResources(0, 100, 0)
        return application
      },
    })
    await runtime.start()

    lifecycle.emit('background')
    await waitUntil(() => application?.awayCommits === 1)
    expect(frames.pending).toBe(0)

    application!.failAwayCommit = true
    lifecycleClock.set('2026-07-29T00:00:05Z')
    lifecycle.emit('active')
    await waitUntil(() =>
      runtime.status().phase === 'ready' &&
      runtime.status().warnings.some(
        (warning) =>
          warning.code === 'persistence-failed' &&
          warning.reason.includes('commit-failed'),
      ),
    )
    expect(application?.awayCommitsStarted).toBe(2)
    expect(application?.awayCommits).toBe(1)
    expect(application?.activeRequests).toEqual([])
    expect(frames.pending).toBe(0)

    application!.failAwayCommit = false
    lifecycleClock.set('2026-07-29T00:00:07Z')
    lifecycle.emit('focus-lost')
    await waitUntil(() => application?.awayCommits === 2)
    const retriedDeparture = application?.snapshot()
    expect(retriedDeparture?.phase).toBe('ready')
    if (retriedDeparture?.phase === 'ready') {
      expect(
        retriedDeparture.state.gameState.timeline
          .lastSuspendedAtLegacyText,
      ).toBe('2026-07-29T00:00:00Z')
    }

    activeClock.set(1_000)
    lifecycleClock.set('2026-07-29T00:00:10Z')
    lifecycle.emit('active')
    await waitUntil(() => application?.awayCommits === 3)
    await waitUntil(() => frames.pending === 1)

    const replayed = application?.snapshot()
    expect(replayed?.phase).toBe('ready')
    if (replayed?.phase === 'ready') {
      expect(replayed.state.gameState.timeline).toMatchObject({
        storedTimeAvailableSeconds: 10,
        storedTimeCapacitySeconds: 100,
        lastSuspendedAtLegacyText: null,
        doubleTime: { bankSeconds: 20 },
      })
    }

    activeClock.set(1_011)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 1)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 11, sessionRevision: 1 },
    ])
    expect(application?.awayCommits).toBe(3)
    await runtime.shutdown()
  })

  test('uses the raw active receipt clock when replay persistence is delayed', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00Z',
    )
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    const replayGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      lifecycleClock,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.setTimeResources(0, 100, 0)
        return application
      },
    })
    await runtime.start()

    lifecycle.emit('background')
    await waitUntil(() => application?.awayCommits === 1)
    application!.awayGate = replayGate.promise
    activeClock.set(1_000)
    lifecycleClock.set('2026-07-29T00:00:01Z')
    lifecycle.emit('active')
    await waitUntil(() => application?.awayCommitsStarted === 2)

    lifecycleClock.set('2026-07-29T00:00:10Z')
    replayGate.resolve()
    await waitUntil(() => application?.awayCommits === 2)
    await waitUntil(() => frames.pending === 1)

    const replayed = application?.snapshot()
    expect(replayed?.phase).toBe('ready')
    if (replayed?.phase === 'ready') {
      expect(replayed.state.gameState.timeline).toMatchObject({
        storedTimeAvailableSeconds: 1,
        storedTimeCapacitySeconds: 100,
        lastSuspendedAtLegacyText: null,
        doubleTime: { bankSeconds: 2 },
      })
    }

    activeClock.set(1_007)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 1)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 7, sessionRevision: 1 },
    ])
    await runtime.shutdown()
  })

  test('does not clear a newer departure received while the previous replay is committing', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00Z',
    )
    const marker = new MemoryDepartureMarker()
    const replayGate = deferred<void>()
    const secondDepartureGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      lifecycleClock,
      departureMarker: marker,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.setTimeResources(0, 100, 0)
        return application
      },
    })
    await runtime.start()

    lifecycle.emit('background')
    await waitUntil(() => application?.awayCommits === 1)
    expect(marker.read()).toBe('2026-07-29T00:00:00Z')

    application!.awayGate = replayGate.promise
    lifecycleClock.set('2026-07-29T00:00:01Z')
    lifecycle.emit('active')
    await waitUntil(() => application?.awayCommitsStarted === 2)

    application!.awayCommitGates.set(3, secondDepartureGate.promise)
    lifecycleClock.set('2026-07-29T00:00:02Z')
    lifecycle.emit('background')
    expect(marker.read()).toBe('2026-07-29T00:00:02Z')

    replayGate.resolve()
    await waitUntil(() => application?.awayCommitsStarted === 3)
    expect(marker.read()).toBe('2026-07-29T00:00:02Z')

    secondDepartureGate.resolve()
    await waitUntil(() => application?.awayCommits === 3)
    application!.awayGate = undefined
    lifecycleClock.set('2026-07-29T00:00:05Z')
    lifecycle.emit('active')
    await waitUntil(() => application?.awayCommits === 4)
    expect(marker.read()).toBeNull()
    const snapshot = application?.snapshot()
    expect(snapshot?.phase).toBe('ready')
    if (snapshot?.phase === 'ready') {
      expect(
        snapshot.state.gameState.timeline.storedTimeAvailableSeconds,
      ).toBe(4)
    }
    await runtime.shutdown()
  })

  test('keeps startup foreground stopped when cold replay commit fails and resumes only after a safe retry', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:05Z',
    )
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      lifecycleClock,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.setTimeResources(0, 100, 0)
        application.setDepartureTimestamp(
          '2026-07-29T00:00:00Z',
        )
        application.failAwayCommit = true
        return application
      },
    })

    await expect(runtime.start()).resolves.toMatchObject({
      phase: 'ready',
      warnings: [
        {
          code: 'persistence-failed',
          reason:
            'Startup away-time replay did not establish a safe foreground baseline: commit-failed; foreground sampling remains paused until canonical replay succeeds.',
        },
      ],
    })
    expect(application?.awayCommitsStarted).toBe(1)
    expect(application?.awayCommits).toBe(0)
    expect(frames.pending).toBe(0)

    application!.failAwayCommit = false
    activeClock.set(1_000)
    lifecycleClock.set('2026-07-29T00:00:10Z')
    lifecycle.emit('active')
    await waitUntil(() => application?.awayCommits === 1)
    await waitUntil(() => frames.pending === 1)

    const replayed = application?.snapshot()
    expect(replayed?.phase).toBe('ready')
    if (replayed?.phase === 'ready') {
      expect(replayed.state.gameState.timeline).toMatchObject({
        storedTimeAvailableSeconds: 10,
        storedTimeCapacitySeconds: 100,
        lastSuspendedAtLegacyText: null,
        doubleTime: { bankSeconds: 20 },
      })
    }

    activeClock.set(1_009)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 1)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 9, sessionRevision: 1 },
    ])
    await runtime.shutdown()
  })

  test('starts post-resume time only after background and active reconcile behind delayed startup', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00Z',
    )
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    const startGate = deferred<void>()
    const awayGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      lifecycleClock,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.startGate = startGate.promise
        application.awayGate = awayGate.promise
        application.setTimeResources(0, 100, 0)
        return application
      },
    })

    const starting = runtime.start()
    await waitUntil(() =>
      database.events.includes('application.start'),
    )
    lifecycle.emit('background')
    lifecycleClock.set('2026-07-29T00:00:01Z')
    lifecycle.emit('active')
    lifecycleClock.set('2026-07-29T00:00:10Z')
    activeClock.set(1_000)
    startGate.resolve()

    await expect(starting).resolves.toMatchObject({
      phase: 'ready',
    })
    await waitUntil(() => application?.awayCommitsStarted === 1)
    expect(frames.pending).toBe(0)

    activeClock.set(1_100)
    awayGate.resolve()
    await waitUntil(() => application?.awayCommits === 2)
    await waitUntil(() => frames.pending === 1)

    const replayed = application?.snapshot()
    expect(replayed?.phase).toBe('ready')
    if (replayed?.phase === 'ready') {
      expect(replayed.state.gameState.timeline).toMatchObject({
        storedTimeAvailableSeconds: 1,
        storedTimeCapacitySeconds: 100,
        lastSuspendedAtLegacyText: null,
        doubleTime: { bankSeconds: 2 },
      })
    }

    activeClock.set(1_200)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 1)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 100, sessionRevision: 1 },
    ])
    await runtime.shutdown()
  })

  test('keeps delayed-startup foreground stopped when queued active replay fails and recovers the original baseline on a later focus cycle', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00Z',
    )
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    const startGate = deferred<void>()
    const replayGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      lifecycleClock,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.startGate = startGate.promise
        application.awayCommitGates.set(
          2,
          replayGate.promise,
        )
        application.failAwayCommitAttempts.add(2)
        application.setTimeResources(0, 100, 0)
        return application
      },
    })

    const starting = runtime.start()
    await waitUntil(() =>
      database.events.includes('application.start'),
    )
    lifecycle.emit('background')
    lifecycleClock.set('2026-07-29T00:00:01Z')
    lifecycle.emit('active')
    activeClock.set(1_000)
    startGate.resolve()

    await expect(starting).resolves.toMatchObject({
      phase: 'ready',
    })
    await waitUntil(
      () => application?.awayCommitsStarted === 2,
    )
    expect(application?.awayCommits).toBe(1)
    expect(frames.pending).toBe(0)
    expect(application?.activeRequests).toEqual([])

    activeClock.set(1_100)
    replayGate.resolve()
    await waitUntil(() =>
      runtime.status().phase === 'ready' &&
      runtime.status().warnings.some(
        (warning) =>
          warning.code === 'persistence-failed' &&
          warning.reason ===
            'Away-time replay did not establish a safe foreground baseline: commit-failed; foreground sampling remains paused until canonical replay succeeds.',
      ),
    )
    expect(application?.awayCommits).toBe(1)
    expect(frames.pending).toBe(0)
    expect(application?.activeRequests).toEqual([])

    lifecycleClock.set('2026-07-29T00:00:04Z')
    lifecycle.emit('focus-lost')
    lifecycleClock.set('2026-07-29T00:00:05Z')
    activeClock.set(2_000)
    lifecycle.emit('active')
    await waitUntil(() => application?.awayCommits === 3)
    await waitUntil(() => frames.pending === 1)

    const replayed = application?.snapshot()
    expect(replayed?.phase).toBe('ready')
    if (replayed?.phase === 'ready') {
      expect(replayed.state.gameState.timeline).toMatchObject({
        storedTimeAvailableSeconds: 5,
        storedTimeCapacitySeconds: 100,
        lastSuspendedAtLegacyText: null,
        doubleTime: { bankSeconds: 10 },
      })
    }

    activeClock.set(2_017)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 1)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 17, sessionRevision: 1 },
    ])
    await runtime.shutdown()
  })

  test('delivers exact foreground time once and publishes only frozen fenced snapshots', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        return application
      },
    })
    await runtime.start()
    const initial = runtime.snapshot()
    expect(initial.phase).toBe('ready')
    expect(Object.isFrozen(initial)).toBe(true)
    expect(runtime.snapshot()).toBe(initial)

    activeClock.set(10)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 1)
    await waitUntil(() =>
      runtime.snapshot().phase === 'ready' &&
      runtime.snapshot().revision.state === 1,
    )
    activeClock.set(10)
    frames.fire()
    await flushMicrotasks()
    expect(application?.activeRequests).toHaveLength(1)

    activeClock.set(25)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 2)
    await waitUntil(() =>
      runtime.snapshot().phase === 'ready' &&
      runtime.snapshot().revision.state === 2,
    )

    expect(application?.activeRequests).toEqual([
      { milliseconds: 10, sessionRevision: 1 },
      { milliseconds: 15, sessionRevision: 1 },
    ])
    expect(
      application?.activeRequests.reduce(
        (sum, request) => sum + request.milliseconds,
        0,
      ),
    ).toBe(25)
    expect(Object.isFrozen(runtime.snapshot())).toBe(true)
    await runtime.shutdown()
  })

  test('serializes overlapping commands from one activation revision and publishes no stale result', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const gate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.playerGate = gate.promise
        return application
      },
    })
    await runtime.start()
    const publications: FrontendApplicationSnapshot[] = []
    runtime.subscribeSnapshot((snapshot) =>
      publications.push(snapshot as FrontendApplicationSnapshot),
    )

    const first = runtime.dispatchPlayer({
      kind: 'dyson.purchase-basic-facility',
      facilityId: 'assembly_lines',
    })
    await waitUntil(() => application?.playerEnvelopes.length === 1)
    const second = runtime.dispatchPlayer({
      kind: 'dyson.purchase-basic-facility',
      facilityId: 'assembly_lines',
    })
    await flushMicrotasks()
    expect(application?.playerEnvelopes).toHaveLength(1)
    gate.resolve()

    await expect(first).resolves.toMatchObject({
      status: 'accepted',
      stateRevision: 1,
      activationRevision: { session: 1, state: 0 },
    })
    await expect(second).resolves.toMatchObject({
      status: 'accepted',
      stateRevision: 2,
      activationRevision: { session: 1, state: 0 },
    })
    expect(application?.playerEnvelopes).toHaveLength(2)
    expect(publications).toHaveLength(2)
    expect(publications[0]?.phase).toBe('ready')
    if (publications[0]?.phase === 'ready') {
      expect(publications[0].revision.state).toBe(1)
    }
    expect(publications[1]?.phase).toBe('ready')
    if (publications[1]?.phase === 'ready') {
      expect(publications[1].revision.state).toBe(2)
    }
    await runtime.shutdown()
  })

  test('admits an ordinary purchase after already queued active time', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        return application
      },
    })
    await runtime.start()

    activeClock.set(10)
    frames.fire()
    const purchase = runtime.dispatchPlayer({
      kind: 'dyson.purchase-basic-facility',
      facilityId: 'assembly_lines',
    })

    await expect(purchase).resolves.toMatchObject({
      status: 'accepted',
      activationRevision: { session: 1, state: 0 },
      stateRevision: 2,
    })
    expect(application?.activeRequests).toEqual([
      { milliseconds: 10, sessionRevision: 1 },
    ])
    expect(application?.playerEnvelopes).toHaveLength(1)
    expect(application?.playerEnvelopes[0]).toMatchObject({
      sessionRevision: 1,
      expectedStateRevision: 1,
      command: {
        kind: 'dyson.purchase-basic-facility',
        facilityId: 'assembly_lines',
      },
    })
    await runtime.shutdown()
  })

  test('captures transient hold continuation and repeat-off after already admitted active time', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    const playerGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.playerGate = playerGate.promise
        return application
      },
    })
    await runtime.start()

    const repeatOn = runtime.dispatchPlayer({
      kind: 'tinker.start',
      repeat: true,
    })
    await waitUntil(() => application?.playerEnvelopes.length === 1)
    activeClock.set(10)
    frames.fire()
    const repeatOff = repeatOn.then(() =>
      runtime.dispatchPlayer({
        kind: 'tinker.set-repeat',
        enabled: false,
      }),
    )
    playerGate.resolve()

    await expect(repeatOn).resolves.toMatchObject({
      status: 'accepted',
      activationRevision: { session: 1, state: 0 },
      stateRevision: 1,
    })
    await expect(repeatOff).resolves.toMatchObject({
      status: 'accepted',
      activationRevision: { session: 1, state: 2 },
      stateRevision: 3,
    })
    expect(application?.activeRequests).toEqual([
      { milliseconds: 10, sessionRevision: 1 },
    ])
    expect(
      application?.playerEnvelopes.map(
        (envelope) => envelope.expectedStateRevision,
      ),
    ).toEqual([0, 2])
    await runtime.shutdown()
  })

  test('captures absolute settings after already admitted active time', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        return application
      },
    })
    await runtime.start()

    activeClock.set(10)
    frames.fire()
    const distribution = runtime.dispatchPlayer({
      kind: 'dyson.set-bot-distribution',
      distribution: 0.75,
    })

    await expect(distribution).resolves.toMatchObject({
      status: 'accepted',
      activationRevision: { session: 1, state: 1 },
      stateRevision: 2,
    })
    activeClock.set(20)
    frames.fire()
    const researchSetting = runtime.dispatchPlayer({
      kind: 'research.set-buy-mode',
      buyMode: 'buy-10',
    })

    await expect(researchSetting).resolves.toMatchObject({
      status: 'accepted',
      activationRevision: { session: 1, state: 3 },
      stateRevision: 4,
    })
    activeClock.set(30)
    frames.fire()
    const facilityAutomation = runtime.dispatchPlayer({
      kind: 'dyson.set-facility-automation',
      facilityId: 'assembly_lines',
      enabled: true,
    })

    await expect(facilityAutomation).resolves.toMatchObject({
      status: 'accepted',
      activationRevision: { session: 1, state: 5 },
      stateRevision: 6,
    })
    expect(application?.activeRequests).toEqual([
      { milliseconds: 10, sessionRevision: 1 },
      { milliseconds: 10, sessionRevision: 1 },
      { milliseconds: 10, sessionRevision: 1 },
    ])
    expect(application?.playerEnvelopes).toHaveLength(3)
    expect(application?.playerEnvelopes[0]).toMatchObject({
      expectedStateRevision: 1,
      command: {
        kind: 'dyson.set-bot-distribution',
        distribution: 0.75,
      },
    })
    expect(application?.playerEnvelopes[1]).toMatchObject({
      expectedStateRevision: 3,
      command: {
        kind: 'research.set-buy-mode',
        buyMode: 'buy-10',
      },
    })
    await runtime.shutdown()
  })

  test('routes lifecycle save even when captured active-time delivery fails', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const activeClock = new ManualActiveTimeClock()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      activeTimeClock: activeClock,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.throwActive = true
        return application
      },
    })
    await runtime.start()

    activeClock.set(12)
    lifecycle.emit('background')
    await waitUntil(() => application?.awayCommits === 1)
    await waitUntil(() =>
      runtime.status().phase === 'ready' &&
      runtime.status().warnings.some(
        (warning) => warning.code === 'persistence-failed',
      ),
    )

    expect(application?.activeRequests).toEqual([
      { milliseconds: 12, sessionRevision: 1 },
    ])
    expect(database.events.indexOf('application.active')).toBeLessThan(
      database.events.indexOf('application.away'),
    )
    expect(runtime.status()).toMatchObject({
      phase: 'ready',
      warnings: [{ code: 'persistence-failed' }],
    })
    await runtime.shutdown()
  })

  test('applies pre-import elapsed time only to the replaced session and resumes from a fresh baseline', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    const importGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.importGate = importGate.promise
        application.importedState = runtimeStateWithoutQuitTimestamp()
        return application
      },
    })
    await runtime.start()
    activeClock.set(10)
    const importing = runtime.importSave({
      text: serializeWebSave({
        saveVersion: 12,
        marker: 'replacement',
      }),
      importedAtUtc: '2026-07-29T00:00:00Z',
      overwriteApproved: true,
    })
    await waitUntil(() => application?.importCalls === 1)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 10, sessionRevision: 1 },
    ])
    expect(database.events.indexOf('application.active')).toBeLessThan(
      database.events.indexOf('application.import'),
    )

    activeClock.set(100)
    importGate.resolve()
    await expect(importing).resolves.toMatchObject({
      imported: true,
      sessionRevision: 2,
    })
    activeClock.set(110)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 2)

    expect(application?.activeRequests).toEqual([
      { milliseconds: 10, sessionRevision: 1 },
      { milliseconds: 10, sessionRevision: 2 },
    ])
    await runtime.shutdown()
  })

  test('keeps delayed import background time out of active delivery and away replay', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00Z',
    )
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    const importGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      lifecycleClock,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.importGate = importGate.promise
        application.importedState =
          runtimeStateWithoutQuitTimestamp()
        return application
      },
    })
    await runtime.start()

    activeClock.set(10)
    const importing = runtime.importSave({
      text: serializeWebSave({
        saveVersion: 12,
        marker: 'replacement',
      }),
      importedAtUtc: '2026-07-29T00:00:00Z',
      overwriteApproved: true,
    })
    await waitUntil(() => application?.importCalls === 1)
    lifecycle.emit('background')
    activeClock.set(1_000)
    importGate.resolve()

    await expect(importing).resolves.toMatchObject({
      imported: true,
      sessionRevision: 2,
    })
    await waitUntil(() => application?.awayCommits === 1)
    expect(frames.pending).toBe(0)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 10, sessionRevision: 1 },
    ])

    activeClock.set(3_000)
    lifecycleClock.set('2026-07-29T00:00:10Z')
    lifecycle.emit('active')
    await waitUntil(() => application?.awayCommits === 2)
    await waitUntil(() => frames.pending === 1)
    expect(frames.pending).toBe(1)

    activeClock.set(3_019)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 2)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 10, sessionRevision: 1 },
      { milliseconds: 19, sessionRevision: 2 },
    ])
    await runtime.shutdown()
  })

  test('starts post-resume time only after background and active reconcile behind delayed import', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00Z',
    )
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    const importGate = deferred<void>()
    const awayGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      lifecycleClock,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.importGate = importGate.promise
        application.awayGate = awayGate.promise
        const imported = runtimeStateWithoutQuitTimestamp()
        imported.gameState.timeline.storedTimeAvailableSeconds = 0
        imported.gameState.timeline.storedTimeCapacitySeconds = 100
        imported.gameState.timeline.doubleTime.bankSeconds = 0
        application.importedState = imported
        return application
      },
    })
    await runtime.start()

    activeClock.set(10)
    const importing = runtime.importSave({
      text: serializeWebSave({
        saveVersion: 12,
        marker: 'replacement',
      }),
      importedAtUtc: '2026-07-29T00:00:00Z',
      overwriteApproved: true,
    })
    await waitUntil(() => application?.importCalls === 1)
    lifecycle.emit('background')
    lifecycleClock.set('2026-07-29T00:00:01Z')
    lifecycle.emit('active')
    lifecycleClock.set('2026-07-29T00:00:10Z')
    activeClock.set(1_000)
    importGate.resolve()

    await expect(importing).resolves.toMatchObject({
      imported: true,
      sessionRevision: 2,
    })
    await waitUntil(() => application?.awayCommitsStarted === 1)
    expect(frames.pending).toBe(0)

    activeClock.set(1_100)
    awayGate.resolve()
    await waitUntil(() => application?.awayCommits === 2)
    await waitUntil(() => frames.pending === 1)

    const replayed = application?.snapshot()
    expect(replayed?.phase).toBe('ready')
    if (replayed?.phase === 'ready') {
      expect(replayed.state.gameState.timeline).toMatchObject({
        storedTimeAvailableSeconds: 1,
        storedTimeCapacitySeconds: 100,
        lastSuspendedAtLegacyText: null,
        doubleTime: { bankSeconds: 2 },
      })
    }

    activeClock.set(1_200)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 2)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 10, sessionRevision: 1 },
      { milliseconds: 100, sessionRevision: 2 },
    ])
    await runtime.shutdown()
  })

  test('keeps delayed-import foreground stopped when queued active replay fails and recovers the original baseline on a later focus cycle', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00Z',
    )
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    const importGate = deferred<void>()
    const replayGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      lifecycleClock,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.importGate = importGate.promise
        application.awayCommitGates.set(
          2,
          replayGate.promise,
        )
        application.failAwayCommitAttempts.add(2)
        const imported = runtimeStateWithoutQuitTimestamp()
        imported.gameState.timeline.storedTimeAvailableSeconds = 0
        imported.gameState.timeline.storedTimeCapacitySeconds = 100
        imported.gameState.timeline.doubleTime.bankSeconds = 0
        application.importedState = imported
        return application
      },
    })
    await runtime.start()

    activeClock.set(10)
    const importing = runtime.importSave({
      text: serializeWebSave({
        saveVersion: 12,
        marker: 'replacement',
      }),
      importedAtUtc: '2026-07-29T00:00:00Z',
      overwriteApproved: true,
    })
    await waitUntil(() => application?.importCalls === 1)
    lifecycle.emit('background')
    lifecycleClock.set('2026-07-29T00:00:01Z')
    lifecycle.emit('active')
    activeClock.set(1_000)
    importGate.resolve()

    await expect(importing).resolves.toMatchObject({
      imported: true,
      sessionRevision: 2,
    })
    await waitUntil(
      () => application?.awayCommitsStarted === 2,
    )
    expect(application?.awayCommits).toBe(1)
    expect(frames.pending).toBe(0)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 10, sessionRevision: 1 },
    ])

    activeClock.set(1_100)
    replayGate.resolve()
    await waitUntil(() =>
      runtime.status().phase === 'ready' &&
      runtime.status().warnings.some(
        (warning) =>
          warning.code === 'persistence-failed' &&
          warning.reason ===
            'Away-time replay did not establish a safe foreground baseline: commit-failed; foreground sampling remains paused until canonical replay succeeds.',
      ),
    )
    expect(application?.awayCommits).toBe(1)
    expect(frames.pending).toBe(0)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 10, sessionRevision: 1 },
    ])

    lifecycleClock.set('2026-07-29T00:00:04Z')
    lifecycle.emit('focus-lost')
    lifecycleClock.set('2026-07-29T00:00:05Z')
    activeClock.set(2_000)
    lifecycle.emit('active')
    await waitUntil(() => application?.awayCommits === 3)
    await waitUntil(() => frames.pending === 1)

    const replayed = application?.snapshot()
    expect(replayed?.phase).toBe('ready')
    if (replayed?.phase === 'ready') {
      expect(replayed.state.gameState.timeline).toMatchObject({
        storedTimeAvailableSeconds: 5,
        storedTimeCapacitySeconds: 100,
        lastSuspendedAtLegacyText: null,
        doubleTime: { bankSeconds: 10 },
      })
    }

    activeClock.set(2_013)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 2)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 10, sessionRevision: 1 },
      { milliseconds: 13, sessionRevision: 2 },
    ])
    await runtime.shutdown()
  })

  test('fails an invalid active receipt clock closed during delayed import and recovers on a later valid active phase', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00Z',
    )
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    const importGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      lifecycleClock,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.importGate = importGate.promise
        application.importedState =
          runtimeStateWithoutQuitTimestamp()
        return application
      },
    })
    await runtime.start()

    activeClock.set(10)
    const importing = runtime.importSave({
      text: serializeWebSave({
        saveVersion: 12,
        marker: 'replacement',
      }),
      importedAtUtc: '2026-07-29T00:00:00Z',
      overwriteApproved: true,
    })
    await waitUntil(() => application?.importCalls === 1)

    lifecycleClock.set('invalid-clock-sample')
    lifecycle.emit('active')
    activeClock.set(1_000)
    importGate.resolve()
    await expect(importing).resolves.toMatchObject({
      imported: true,
      sessionRevision: 2,
    })
    await waitUntil(() =>
      runtime.status().phase === 'ready' &&
      runtime.status().warnings.some(
        (warning) =>
          warning.code === 'persistence-failed' &&
          warning.reason ===
            'Lifecycle clock capture failed; the phase was not applied and foreground sampling remains paused.',
      ),
    )

    expect(frames.pending).toBe(0)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 10, sessionRevision: 1 },
    ])
    expect(application?.awayCommits).toBe(0)

    lifecycleClock.set('2026-07-29T00:00:01Z')
    lifecycle.emit('active')
    await waitUntil(() => frames.pending === 1)
    activeClock.set(1_013)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 2)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 10, sessionRevision: 1 },
      { milliseconds: 13, sessionRevision: 2 },
    ])
    await runtime.shutdown()
  })

  test('flushes active time synchronously but rejects a non-active phase with an invalid receipt clock', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const lifecycleClock = new ManualLifecycleClock(
      '2026-07-29T00:00:00Z',
    )
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      lifecycle,
      lifecycleClock,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        return application
      },
    })
    await runtime.start()

    activeClock.set(12)
    lifecycleClock.set('invalid-clock-sample')
    lifecycle.emit('background')
    await waitUntil(() =>
      runtime.status().phase === 'ready' &&
      runtime.status().warnings.some(
        (warning) =>
          warning.reason ===
          'Lifecycle clock capture failed; the phase was not applied and foreground sampling remains paused.',
      ),
    )

    expect(application?.activeRequests).toEqual([
      { milliseconds: 12, sessionRevision: 1 },
    ])
    expect(application?.awayCommits).toBe(0)
    expect(frames.pending).toBe(0)

    lifecycleClock.set('2026-07-29T00:00:01Z')
    lifecycle.emit('active')
    await waitUntil(() => frames.pending === 1)
    activeClock.set(20)
    frames.fire()
    await waitUntil(() => application?.activeRequests.length === 2)
    expect(application?.activeRequests).toEqual([
      { milliseconds: 12, sessionRevision: 1 },
      { milliseconds: 8, sessionRevision: 1 },
    ])
    await runtime.shutdown()
  })

  test('contains invalid monotonic samples across lifecycle, import, and shutdown', async () => {
    const lifecycleDatabase = new MemoryBrowserSaveDatabase()
    const lifecycle = new TestLifecycleAdapter()
    const lifecycleClock = new ManualActiveTimeClock()
    let lifecycleApplication: FakeRuntimeApplication | undefined
    const lifecycleRuntime = createRuntime({
      database: lifecycleDatabase,
      lifecycle,
      activeTimeClock: lifecycleClock,
      createApplication: (repository) => {
        lifecycleApplication = new FakeRuntimeApplication(
          repository,
          lifecycleDatabase.events,
        )
        return lifecycleApplication
      },
    })
    await lifecycleRuntime.start()
    lifecycleClock.set(Number.NaN)
    lifecycle.emit('background')
    await waitUntil(() => lifecycleApplication?.awayCommits === 1)
    expect(lifecycleRuntime.status()).toMatchObject({
      phase: 'ready',
      warnings: [{ code: 'active-time-failed' }],
    })
    await lifecycleRuntime.shutdown()

    const importDatabase = new MemoryBrowserSaveDatabase()
    const importClock = new ManualActiveTimeClock()
    let importApplication: FakeRuntimeApplication | undefined
    const importRuntime = createRuntime({
      database: importDatabase,
      activeTimeClock: importClock,
      createApplication: (repository) => {
        importApplication = new FakeRuntimeApplication(
          repository,
          importDatabase.events,
        )
        importApplication.importedState =
          runtimeStateWithoutQuitTimestamp()
        return importApplication
      },
    })
    await importRuntime.start()
    importClock.set(Number.NaN)
    await expect(
      importRuntime.importSave({
        text: serializeWebSave({
          saveVersion: 12,
          marker: 'invalid-clock-import',
        }),
        importedAtUtc: '2026-07-29T00:00:00Z',
        overwriteApproved: true,
      }),
    ).resolves.toMatchObject({
      imported: true,
      sessionRevision: 2,
    })
    expect(importRuntime.status()).toMatchObject({
      phase: 'ready',
      warnings: [{ code: 'active-time-failed' }],
    })
    await importRuntime.shutdown()

    const shutdownDatabase = new MemoryBrowserSaveDatabase()
    const shutdownClock = new ManualActiveTimeClock()
    const shutdownFrames = new ManualAnimationFrameScheduler()
    const shutdownRuntime = createRuntime({
      database: shutdownDatabase,
      activeTimeClock: shutdownClock,
      activeTimeScheduler: shutdownFrames,
    })
    await shutdownRuntime.start()
    shutdownClock.set(Number.NaN)
    await expect(shutdownRuntime.shutdown()).resolves.toBeUndefined()
    expect(shutdownRuntime.status().phase).toBe('stopped')
    expect(shutdownDatabase.releaseCalls).toBe(1)
    expect(shutdownFrames.pending).toBe(0)
  })

  test('publishes no mutated result when writer ownership changes during a player command', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const playerGate = deferred<void>()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.playerGate = playerGate.promise
        return application
      },
    })
    await runtime.start()
    const publications: string[] = []
    runtime.subscribeSnapshot((snapshot) =>
      publications.push(snapshot.phase),
    )

    const command = runtime.dispatchPlayer({
      kind: 'tinker.start',
      repeat: false,
    })
    await waitUntil(() => application?.playerEnvelopes.length === 1)
    database.forceLease({
      ownerToken: 'replacement',
      generation: 2,
      expiresAtUtcMilliseconds: 10_000,
    })
    playerGate.resolve()

    await expect(command).resolves.toMatchObject({
      status: 'failed',
      code: 'RUNTIME-PLAYER-AUTHORITY-LOST',
      retryable: false,
    })
    await waitUntil(() => runtime.status().phase === 'ownership-lost')
    expect(application?.snapshot()).toMatchObject({
      phase: 'ready',
      revision: { state: 1 },
    })
    expect(runtime.snapshot()).toEqual({
      version: 1,
      phase: 'idle',
    })
    expect(publications).toEqual(['idle'])
    await runtime.shutdown()
  })

  test('drains residual active time and checkpoints dirty state before orderly lease release', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const activeClock = new ManualActiveTimeClock()
    const frames = new ManualAnimationFrameScheduler()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      activeTimeClock: activeClock,
      activeTimeScheduler: frames,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        return application
      },
    })
    await runtime.start()
    activeClock.set(15)

    await runtime.shutdown()

    expect(application?.activeRequests).toEqual([
      { milliseconds: 15, sessionRevision: 1 },
    ])
    expect(application?.checkpointCalls).toBe(1)
    expect(database.events.indexOf('application.active')).toBeLessThan(
      database.events.indexOf('application.checkpoint'),
    )
    expect(database.events.indexOf('application.checkpoint')).toBeLessThan(
      database.events.indexOf('lease.release'),
    )
    expect(frames.pending).toBe(0)
    expect(runtime.status().phase).toBe('stopped')
  })

  test('lazily delegates clipboard and allowlisted navigation without exposing platform objects', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const clipboard = new RecordingClipboard()
    const opened: string[] = []
    const runtime = createRuntime({
      database,
      clipboard,
      navigationOpener: (url) => {
        opened.push(url)
      },
      allowedExternalOrigins: ['https://example.com'],
    })

    clipboard.value = 'pasted'
    await expect(runtime.readClipboardText()).resolves.toBe('pasted')
    await runtime.writeClipboardText('copied')
    expect(clipboard.value).toBe('copied')
    await runtime.openExternalUrl('https://example.com/help?q=1')
    expect(opened).toEqual(['https://example.com/help?q=1'])
    await expect(
      runtime.openExternalUrl('https://untrusted.example/help'),
    ).rejects.toThrow('not approved')

    expect(Object.keys(runtime).sort()).toEqual([
      'checkpointBeforeSafeReload',
      'copyLastRecovery',
      'development',
      'dispatchPlayer',
      'exportCurrentSave',
      'exportLastRecovery',
      'exportSkillPreset',
      'importSave',
      'inspectStorage',
      'openExternalUrl',
      'previewImport',
      'previewSkillPresetImport',
      'previewSkillPresetQueueChange',
      'readClipboardText',
      'readCurrentSaveText',
      'recoveryExportAvailable',
      'requestCheckpoint',
      'setGameplayPreviewDemand',
      'shutdown',
      'snapshot',
      'start',
      'status',
      'storedTime',
      'subscribeSnapshot',
      'subscribeStatus',
      'synchronizeHostEntitlements',
      'takeOverWriterOwnership',
      'writeClipboardText',
    ])
    const { development, storedTime, ...hostMethods } = runtime
    expect(
      Object.values(hostMethods).every(
        (value) => typeof value === 'function',
      ),
    ).toBe(true)
    expect(typeof development?.setDysonBots).toBe('function')
    expect(typeof development?.unlockReality).toBe('function')
    expect(typeof development?.status).toBe('function')
    expect(typeof development?.apply).toBe('function')
    expect(typeof development?.simulateOfflineTime).toBe('function')
    expect(typeof storedTime?.status).toBe('function')
    expect(typeof storedTime?.subscribe).toBe('function')
    expect(typeof storedTime?.cancel).toBe('function')
    await runtime.shutdown()
  })

  test('checkpoints and exports the current canonical save', async () => {
    const downloads = new RecordingDownloads()
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      downloads,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(repository, [])
        return application
      },
    })
    await runtime.start()
    application?.setDirty('exported-checkpoint')

    const exportedText = await runtime.readCurrentSaveText()
    expect(exportedText).toMatch(/^IDSWEB1:/)
    expect(
      deserializeWebSave(exportedText ?? ''),
    ).toMatchObject({ marker: 'exported-checkpoint' })

    await expect(runtime.exportCurrentSave()).resolves.toBe(true)
    expect(downloads.last).toMatchObject({
      fileName: 'idle-dyson-swarm-save.idsw',
      mediaType: 'text/plain;charset=utf-8',
    })
    expect(downloads.last?.text).toMatch(/^IDSWEB1:/)
    expect(
      deserializeWebSave(downloads.last?.text ?? ''),
    ).toMatchObject({ marker: 'exported-checkpoint' })

    await runtime.shutdown()
  })

  test('keeps the host-neutral contract free of application, repository, save, and platform imports', () => {
    const contractSource = readFileSync(
      new URL('./contracts.ts', import.meta.url),
      'utf8',
    )
    expect(contractSource).not.toMatch(
      /from ['"].*(application|platform|save)/,
    )
    expect(contractSource).not.toContain('CanonicalGameApplicationFacade')
    expect(contractSource).not.toContain('SaveRepository')
  })
})

function createRuntime(
  overrides: Partial<BrowserRuntimeFoundationOptions> = {},
) {
  const database =
    overrides.database ?? new MemoryBrowserSaveDatabase()
  const lifecycle =
    overrides.lifecycle ?? new TestLifecycleAdapter()
  return createBrowserRuntimeFoundation({
    createApplication:
      overrides.createApplication ??
      ((repository) =>
        new FakeRuntimeApplication(
          repository,
          (database as MemoryBrowserSaveDatabase).events,
        )),
    lifecyclePolicy:
      overrides.lifecyclePolicy ?? MOBILE_LIFECYCLE_POLICY,
    allowedExternalOrigins:
      overrides.allowedExternalOrigins ?? ['https://example.com'],
    database,
    lifecycle,
    lifecycleClock:
      overrides.lifecycleClock ??
      fixedClock('2026-07-29T00:00:00Z'),
    activeTimeClock:
      overrides.activeTimeClock ?? new ManualActiveTimeClock(),
    activeTimeScheduler:
      overrides.activeTimeScheduler ??
      new ManualAnimationFrameScheduler(),
    activeTimeDeliveryIntervalMilliseconds:
      overrides.activeTimeDeliveryIntervalMilliseconds ?? 1,
    storageManager:
      overrides.storageManager ?? {
        persisted: async () => true,
        persist: async () => true,
        estimate: async () => ({ usage: 1, quota: 1_000 }),
      },
    clipboard: overrides.clipboard ?? new RecordingClipboard(),
    navigationOpener:
      overrides.navigationOpener ?? (() => undefined),
    downloads: overrides.downloads ?? new RecordingDownloads(),
    nowUtcMilliseconds:
      overrides.nowUtcMilliseconds ?? (() => 1_000),
    ownerToken: overrides.ownerToken ?? 'test-owner',
    leaseDurationMilliseconds:
      overrides.leaseDurationMilliseconds ?? 1_000,
    heartbeatMilliseconds:
      overrides.heartbeatMilliseconds ?? 500,
    leaseScheduler:
      overrides.leaseScheduler ?? new ManualIntervalScheduler(),
    checkpointScheduler:
      overrides.checkpointScheduler ?? new ManualIntervalScheduler(),
    autoHeartbeat: overrides.autoHeartbeat ?? false,
    legacyIdFactory:
      overrides.legacyIdFactory ?? (() => 'retained-original'),
    ...overrides,
  })
}

class FakeRuntimeApplication
  implements CanonicalLifecycleApplicationPort
{
  private state = runtimeStateWithoutQuitTimestamp()
  private sessionRevision = 1
  private stateRevision = 0
  private durableRevision: number | null = 0
  private dirty = false
  private checkpointMarker = 'checkpoint'
  readonly repository: SaveRepository
  readonly events: string[]
  startGate: Promise<void> | undefined
  awayGate: Promise<void> | undefined
  readonly awayCommitGates =
    new Map<number, Promise<void>>()
  playerGate: Promise<void> | undefined
  importGate: Promise<void> | undefined
  readonly importGates =
    new Map<number, Promise<void>>()
  checkpointGate: Promise<void> | undefined
  importedState: CanonicalRuntimeState | undefined
  rejectImports = false
  readonly rejectImportAttempts = new Set<number>()
  committedImportFailure = false
  checkpointSkipsPersistence = false
  blocked = false
  throwActive = false
  throwPlayer = false
  failAwayCommit = false
  readonly failAwayCommitAttempts = new Set<number>()
  awayCommitsStarted = 0
  awayCommits = 0
  importCalls = 0
  checkpointCalls = 0
  readonly activeRequests: Array<{
    readonly milliseconds: number
    readonly sessionRevision: number
  }> = []
  readonly activeOutcomes: Array<'success' | 'rejected' | 'partial'> = []
  readonly playerEnvelopes:
    ApplicationCommandEnvelope<CanonicalPlayerCommand>[] = []

  constructor(repository: SaveRepository, events: string[]) {
    this.repository = repository
    this.events = events
  }

  snapshot(): ApplicationSnapshot<CanonicalRuntimeState> {
    if (this.blocked) {
      return {
        version: 1,
        phase: 'blocked',
        outcome: 'all-candidates-invalid',
        error: 'Scripted blocked startup.',
      }
    }
    return {
      version: 1,
      phase: 'ready',
      source: 'primary',
      revision: {
        session: this.sessionRevision,
        state: this.stateRevision,
        durable: this.durableRevision,
      },
      checkpoint: this.dirty
        ? {
            kind: 'dirty',
            durableRevision: this.durableRevision,
            reason: 'state-changed',
          }
        : {
            kind: 'clean',
            durableRevision: this.durableRevision ?? 0,
          },
      operation: 'none',
      state: cloneCanonicalRuntimeState(this.state),
    }
  }

  frontendSnapshot(): DeepReadonly<FrontendApplicationSnapshot> {
    const snapshot = this.snapshot()
    if (snapshot.phase === 'blocked') {
      return deepFreezeTestSnapshot({
        version: 1,
        phase: 'blocked',
        outcome: snapshot.outcome,
        error: snapshot.error,
      })
    }
    if (snapshot.phase !== 'ready') {
      return deepFreezeTestSnapshot({
        version: 1,
        phase: snapshot.phase,
      })
    }
    return deepFreezeTestSnapshot({
      version: 1,
      phase: 'ready',
      source: snapshot.source,
      revision: structuredClone(snapshot.revision),
      checkpoint: structuredClone(snapshot.checkpoint),
      operation: snapshot.operation,
      gameplay: {
        marker: this.stateRevision,
      },
    } as unknown as FrontendApplicationSnapshot)
  }

  async start(): Promise<ApplicationSnapshot<CanonicalRuntimeState>> {
    this.events.push('application.start')
    await this.startGate
    this.events.push('application.start.done')
    return this.snapshot()
  }

  advanceActiveWithContinuation(
    milliseconds: number,
  ): CanonicalActiveAdvanceResult {
    this.events.push('application.active')
    this.activeRequests.push({
      milliseconds,
      sessionRevision: this.sessionRevision,
    })
    if (this.throwActive) {
      this.throwActive = false
      throw new Error('Scripted active-time failure.')
    }
    const outcome = this.activeOutcomes.shift() ?? 'success'
    if (outcome === 'rejected') {
      return {
        transition: {
          accepted: false,
          code: 'TEST-ACTIVE-REJECTED',
          reason: 'Scripted active-time rejection.',
          revision: this.stateRevision,
        },
        consumedMilliseconds: 0,
        remainingMilliseconds: milliseconds,
        continuation: { kind: 'complete' },
      }
    }
    if (milliseconds > 0) {
      this.stateRevision += 1
      this.dirty = true
    }
    const partial = outcome === 'partial'
    return {
      transition: {
        accepted: true,
        changed: milliseconds > 0,
        revision: this.stateRevision,
      },
      consumedMilliseconds: partial ? milliseconds / 2 : milliseconds,
      remainingMilliseconds: partial ? milliseconds / 2 : 0,
      continuation: { kind: 'complete' },
    }
  }

  async dispatchPlayer(
    envelope: ApplicationCommandEnvelope<CanonicalPlayerCommand>,
    cancelRequested?: () => boolean,
  ): Promise<CanonicalPlayerDispatchResult> {
    this.events.push('application.player')
    this.playerEnvelopes.push(envelope)
    await this.playerGate
    if (this.throwPlayer) {
      this.throwPlayer = false
      throw new Error('Scripted player-command failure.')
    }
    if (cancelRequested?.()) {
      return {
        kind: 'transition',
        transition: {
          accepted: false,
          code: 'APP-CANCELLED',
          reason: 'Writer authority was cancelled.',
          revision: this.stateRevision,
        },
      }
    }
    if (envelope.sessionRevision !== this.sessionRevision) {
      return {
        kind: 'transition',
        transition: {
          accepted: false,
          code: 'APP-STALE-SESSION',
          reason: 'The player command targeted an old session.',
          revision: this.stateRevision,
        },
      }
    }
    if (envelope.expectedStateRevision !== this.stateRevision) {
      return {
        kind: 'transition',
        transition: {
          accepted: false,
          code: 'SIM-STALE-REVISION',
          reason: 'The player command targeted an old state revision.',
          revision: this.stateRevision,
        },
      }
    }
    this.stateRevision += 1
    this.dirty = true
    return {
      kind: 'transition',
      transition: {
        accepted: true,
        changed: true,
        revision: this.stateRevision,
      },
    }
  }

  async commitStoredTime(): Promise<CanonicalStoredTimeCommitResult> {
    return {
      committed: false,
      transition: {
        accepted: false,
        code: 'TEST-NOT-SUPPORTED',
        reason: 'Stored time is outside this runtime test.',
        revision: this.stateRevision,
      },
      consumedSeconds: 0,
      remainingSeconds: 0,
      code: 'TEST-NOT-SUPPORTED',
      reason: 'Stored time is outside this runtime test.',
    }
  }

  async commitAwayReplacement(
    _envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    state: Readonly<CanonicalRuntimeState>,
  ): Promise<CommitFirstResult> {
    this.awayCommitsStarted += 1
    this.events.push('application.away')
    await this.awayGate
    await this.awayCommitGates.get(
      this.awayCommitsStarted,
    )
    if (
      this.failAwayCommit ||
      this.failAwayCommitAttempts.delete(
        this.awayCommitsStarted,
      )
    ) {
      return {
        committed: false,
        code: 'TEST-AWAY-COMMIT-FAILED',
        reason: 'Scripted away-time commit failure.',
      }
    }
    this.state = cloneCanonicalRuntimeState(state)
    this.awayCommits += 1
    this.stateRevision += 1
    this.durableRevision = this.stateRevision
    return committed(this.stateRevision)
  }

  async commitBotCapCheckpoint(): Promise<CommitFirstResult> {
    return committed(this.stateRevision)
  }

  async importSave(
    request: ImportSaveRequest,
  ): Promise<ImportSaveResult> {
    this.importCalls += 1
    this.events.push('application.import')
    await this.importGate
    await this.importGates.get(this.importCalls)
    if (
      this.rejectImports ||
      this.rejectImportAttempts.delete(this.importCalls)
    ) {
      return {
        imported: false,
        committed: false,
        code: 'APP-IMPORT-INVALID',
        reason: 'Scripted canonical validation failure.',
      }
    }
    await this.repository.commit(
      PreparedSave.fromDecoded({
        saveVersion: 12,
        marker: 'imported',
      }),
      request.target,
    )
    if (this.committedImportFailure) {
      this.blocked = true
      return {
        imported: false,
        committed: true,
        code: 'APP-POST-COMMIT-RELOAD',
        reason: 'Scripted post-commit reload failure.',
      }
    }
    if (this.importedState !== undefined) {
      this.state = cloneCanonicalRuntimeState(this.importedState)
    }
    this.blocked = false
    this.sessionRevision += 1
    this.stateRevision = 0
    this.durableRevision = 0
    this.dirty = false
    return {
      imported: true,
      sessionRevision: this.sessionRevision,
    }
  }

  async checkpoint(): Promise<CheckpointResult> {
    this.checkpointCalls += 1
    this.events.push('application.checkpoint')
    await this.checkpointGate
    try {
      if (!this.checkpointSkipsPersistence) {
        await this.repository.commit(
          PreparedSave.fromDecoded({
            saveVersion: 12,
            marker: this.checkpointMarker,
          }),
        )
      }
      this.dirty = false
      this.durableRevision = this.stateRevision
      return {
        committed: true,
        targetStateRevision: this.stateRevision,
        durableRevision: this.stateRevision,
      }
    } catch (error) {
      return {
        committed: false,
        code: 'TEST-CHECKPOINT-FAILED',
        reason:
          error instanceof Error ? error.message : String(error),
      }
    }
  }

  setDirty(marker: string): void {
    this.checkpointMarker = marker
    this.stateRevision += 1
    this.dirty = true
  }

  setTimeResources(
    bankSeconds: number,
    capacitySeconds: number,
    doubleTimeBankSeconds: number,
  ): void {
    this.state.gameState.timeline.storedTimeAvailableSeconds =
      bankSeconds
    this.state.gameState.timeline.storedTimeCapacitySeconds =
      capacitySeconds
    this.state.gameState.timeline.doubleTime.bankSeconds =
      doubleTimeBankSeconds
  }

  setDepartureTimestamp(value: string | null): void {
    this.state.gameState.timeline.lastSuspendedAtLegacyText = value
  }
}

class TestLifecycleAdapter implements LifecycleAdapter {
  private readonly listeners =
    new Set<(phase: LifecyclePhase) => void>()
  private phase: LifecyclePhase

  constructor(initialPhase: LifecyclePhase = 'active') {
    this.phase = initialPhase
  }

  get listenerCount(): number {
    return this.listeners.size
  }

  subscribe(listener: (phase: LifecyclePhase) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  currentPhase(): LifecyclePhase {
    return this.phase
  }

  emit(phase: LifecyclePhase): void {
    this.phase = phase
    for (const listener of [...this.listeners]) listener(phase)
  }
}

class MemoryBrowserSaveDatabase implements BrowserSaveDatabase {
  private lease:
    | {
        readonly ownerToken: string | null
        readonly generation: number
        readonly expiresAtUtcMilliseconds: number | null
      }
    | undefined
  private files = new Map<string, string>()
  private candidates = new Map<string, string>()
  readonly events: string[] = []
  readonly mutations: BrowserSaveMutation[] = []
  failNextMutation: BrowserSaveMutation['kind'] | undefined
  acquireGate: Promise<void> | undefined
  releaseCalls = 0

  async acquireWriterLease(
    ownerToken: string,
    nowUtcMilliseconds: number,
    leaseDurationMilliseconds: number,
    allowUnexpiredSameOwnerTakeover = false,
    allowUnexpiredAnyOwnerTakeover = false,
  ): Promise<WriterLeaseAcquisition> {
    this.events.push('lease.acquire')
    await this.acquireGate
    if (
      this.lease?.ownerToken !== null &&
      this.lease?.ownerToken !== undefined &&
      this.lease.expiresAtUtcMilliseconds !== null &&
      this.lease.expiresAtUtcMilliseconds > nowUtcMilliseconds &&
      !allowUnexpiredAnyOwnerTakeover &&
      !(
        allowUnexpiredSameOwnerTakeover &&
        this.lease.ownerToken === ownerToken
      )
    ) {
      return {
        acquired: false,
        generation: this.lease.generation,
        expiresAtUtcMilliseconds:
          this.lease.expiresAtUtcMilliseconds,
      }
    }
    const fence = {
      ownerToken,
      generation: (this.lease?.generation ?? 0) + 1,
      expiresAtUtcMilliseconds:
        nowUtcMilliseconds + leaseDurationMilliseconds,
    }
    this.lease = fence
    return { acquired: true, fence }
  }

  async renewWriterLease(
    fence: WriterLeaseFence,
    nowUtcMilliseconds: number,
    leaseDurationMilliseconds: number,
  ): Promise<WriterLeaseFence> {
    this.assertFence(fence, nowUtcMilliseconds)
    const renewed = {
      ...fence,
      expiresAtUtcMilliseconds:
        nowUtcMilliseconds + leaseDurationMilliseconds,
    }
    this.lease = renewed
    return renewed
  }

  async releaseWriterLease(
    fence: WriterLeaseFence,
  ): Promise<boolean> {
    this.events.push('lease.release')
    this.releaseCalls += 1
    if (
      this.lease?.ownerToken !== fence.ownerToken ||
      this.lease.generation !== fence.generation
    ) {
      return false
    }
    this.lease = {
      ownerToken: null,
      generation: this.lease.generation,
      expiresAtUtcMilliseconds: null,
    }
    return true
  }

  async inspectWriterLease(): Promise<WriterLeaseFence | null> {
    this.events.push('lease.inspect')
    return this.lease?.ownerToken !== null &&
      this.lease?.ownerToken !== undefined &&
      this.lease.expiresAtUtcMilliseconds !== null
      ? {
          ownerToken: this.lease.ownerToken,
          generation: this.lease.generation,
          expiresAtUtcMilliseconds:
            this.lease.expiresAtUtcMilliseconds,
        }
      : null
  }

  async fileExists(path: string): Promise<boolean> {
    return this.files.has(path)
  }

  async readFile(path: string): Promise<string> {
    const value = this.files.get(path)
    if (value === undefined) throw new Error(`Missing ${path}`)
    return value
  }

  async listLegacyCandidates() {
    return [...this.candidates].map(([id, sourcePath]) => ({
      id,
      sourcePath,
      text: this.files.get(sourcePath)!,
    }))
  }

  async mutateFiles(
    mutation: BrowserSaveMutation,
    fence: WriterLeaseFence,
    nowUtcMilliseconds: number,
  ): Promise<void> {
    this.events.push(`mutation.${mutation.kind}`)
    this.assertFence(fence, nowUtcMilliseconds)
    const files = new Map(this.files)
    const candidates = new Map(this.candidates)
    switch (mutation.kind) {
      case 'write':
        files.set(mutation.path, mutation.contents)
        break
      case 'replace': {
        const temporary = files.get(mutation.temporaryPath)
        if (temporary === undefined) {
          throw new Error('Missing temporary save')
        }
        files.set(mutation.destinationPath, temporary)
        files.delete(mutation.temporaryPath)
        break
      }
      case 'copy': {
        const source = files.get(mutation.sourcePath)
        if (source === undefined) throw new Error('Missing source save')
        files.set(mutation.destinationPath, source)
        break
      }
      case 'retain-legacy':
        files.set(
          mutation.candidate.sourcePath,
          mutation.candidate.text,
        )
        candidates.set(
          mutation.candidate.id,
          mutation.candidate.sourcePath,
        )
        break
    }
    if (this.failNextMutation === mutation.kind) {
      this.failNextMutation = undefined
      throw new DOMException(
        'Scripted quota failure',
        'QuotaExceededError',
      )
    }
    this.files = files
    this.candidates = candidates
    this.mutations.push(mutation)
  }

  forceLease(fence: WriterLeaseFence): void {
    this.lease = fence
  }

  private assertFence(
    fence: WriterLeaseFence,
    nowUtcMilliseconds: number,
  ): void {
    if (
      this.lease?.ownerToken !== fence.ownerToken ||
      this.lease.generation !== fence.generation ||
      this.lease.expiresAtUtcMilliseconds === null ||
      this.lease.expiresAtUtcMilliseconds <= nowUtcMilliseconds
    ) {
      throw new WriterLeaseLostError()
    }
  }
}

class ManualIntervalScheduler implements IntervalScheduler {
  private callback: (() => void) | undefined

  setInterval(callback: () => void): unknown {
    this.callback = callback
    return 1
  }

  clearInterval(): void {
    this.callback = undefined
  }

  fire(): void {
    this.callback?.()
  }
}

class RecordingNoticeChannel implements OwnershipNoticeChannel {
  readonly notices: OwnershipNotice[] = []
  closed = false
  private listener: ((notice: OwnershipNotice) => void) | undefined

  post(notice: OwnershipNotice): void {
    this.notices.push(notice)
  }

  subscribe(listener: (notice: OwnershipNotice) => void): () => void {
    this.listener = listener
    return () => {
      this.listener = undefined
    }
  }

  emit(notice: OwnershipNotice): void {
    this.listener?.(notice)
  }

  close(): void {
    this.closed = true
  }
}

class RecordingClipboard implements ClipboardPort {
  value = ''

  async readText(): Promise<string> {
    return this.value
  }

  async writeText(value: string): Promise<void> {
    this.value = value
  }
}

class RecordingDownloads implements TextDownloadPort {
  last:
    | {
        readonly fileName: string
        readonly text: string
        readonly mediaType: string
      }
    | undefined

  downloadText(
    fileName: string,
    text: string,
    mediaType: string,
  ): void {
    this.last = { fileName, text, mediaType }
  }
}

class ManualActiveTimeClock implements ActiveTimeMonotonicClock {
  private current = 0

  nowMilliseconds(): number {
    return this.current
  }

  set(value: number): void {
    this.current = value
  }
}

class ManualLifecycleClock implements CanonicalLifecycleClock {
  private currentIso: string

  constructor(initialIso: string) {
    this.currentIso = initialIso
  }

  sample() {
    return {
      utcMilliseconds: Date.parse(this.currentIso),
      serializedUtcText: this.currentIso,
    }
  }

  set(value: string): void {
    this.currentIso = value
  }
}

class MemoryDepartureMarker implements DepartureMarker {
  private value: string | null = null

  read(): string | null {
    return this.value
  }

  record(serializedUtcText: string): void {
    this.value = serializedUtcText
  }

  clearIfMatches(utcMilliseconds: number): void {
    if (
      this.value !== null &&
      Date.parse(this.value) === utcMilliseconds
    ) {
      this.value = null
    }
  }

  clear(): void {
    this.value = null
  }
}

class ManualAnimationFrameScheduler
  implements ActiveTimeFrameScheduler
{
  private callbacks = new Map<number, () => void>()
  private nextHandle = 1

  get pending(): number {
    return this.callbacks.size
  }

  requestFrame(callback: () => void): unknown {
    const handle = this.nextHandle
    this.nextHandle += 1
    this.callbacks.set(handle, callback)
    return handle
  }

  cancelFrame(handle: unknown): void {
    if (typeof handle === 'number') this.callbacks.delete(handle)
  }

  fire(): void {
    const entry = this.callbacks.entries().next().value as
      | [number, () => void]
      | undefined
    if (entry === undefined) {
      throw new Error('No active-time animation frame is pending.')
    }
    this.callbacks.delete(entry[0])
    entry[1]()
  }
}

function deepFreezeTestSnapshot<T>(
  value: T,
): DeepReadonly<T> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Object.isFrozen(value)
  ) {
    return value as DeepReadonly<T>
  }
  for (const child of Object.values(value)) {
    deepFreezeTestSnapshot(child)
  }
  return Object.freeze(value) as DeepReadonly<T>
}

function runtimeStateWithoutQuitTimestamp(): CanonicalRuntimeState {
  const prepared = prepareIdb1Save(
    readFileSync(fixtureUrl, 'utf8'),
  ).prepared
  const runtime = cloneCanonicalRuntimeState(
    new CanonicalRuntimeSession(prepared, {
      entitlements: { permanentDoubleIp: false },
    }).initialState,
  )
  runtime.gameState.timeline.lastSuspendedAtLegacyText = null
  return runtime
}

function fixedClock(iso: string) {
  return {
    sample: () => ({
      utcMilliseconds: Date.parse(iso),
      serializedUtcText: iso,
    }),
  }
}

function mutableClock(initial: number): {
  now(): number
  set(value: number): void
} {
  let current = initial
  return {
    now: () => current,
    set: (value) => {
      current = value
    },
  }
}

function committed(revision: number): CommitFirstResult {
  return {
    committed: true,
    transition: {
      accepted: true,
      changed: true,
      revision,
    },
    durableRevision: revision,
  }
}

function deferred<T>(): {
  readonly promise: Promise<T>
  resolve(value?: T | PromiseLike<T>): void
} {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return {
    promise,
    resolve: (value) => resolve(value as T),
  }
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let pass = 0; pass < 100; pass += 1) {
    if (predicate()) return
    await Promise.resolve()
  }
  throw new Error('Timed out waiting for runtime test condition.')
}

async function flushMicrotasks(): Promise<void> {
  for (let pass = 0; pass < 8; pass += 1) {
    await Promise.resolve()
  }
}
