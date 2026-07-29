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
import type { CanonicalLifecycleApplicationPort } from '../../application/canonicalLifecycleCoordinator'
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
import type { TextDownloadPort } from '../../platform/browserSaveTransfer'
import { prepareIdb1Save, PreparedSave } from '../../save/prepare'
import type { SaveRepository } from '../../save/repository'
import { serializeWebSave } from '../../save/serialization'
import { MOBILE_LIFECYCLE_POLICY } from '../../simulation/lifecycleAwayTime'
import {
  createBrowserRuntimeFoundation,
  DEVELOPMENT_ONLY_BROWSER_PROFILE_ID,
  type BrowserRuntimeFoundationOptions,
} from './browserRuntimeFoundation'

const fixtureUrl = new URL(
  '../../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
  import.meta.url,
)

describe('browser runtime foundation composition', () => {
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
    let application: FakeRuntimeApplication | undefined
    const runtime = createRuntime({
      database,
      downloads,
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

    await expect(runtime.exportLastRecovery()).resolves.toBe(true)
    expect(downloads.last?.text).toBe(original)
    await runtime.shutdown()
  })

  test('retains a historical source exactly and repeated coordinated imports never replay away time', async () => {
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

  test('recovers an application-blocked startup through coordinated import before publishing ready', async () => {
    const database = new MemoryBrowserSaveDatabase()
    let application: FakeRuntimeApplication | undefined
    const phases: string[] = []
    const runtime = createRuntime({
      database,
      createApplication: (repository) => {
        application = new FakeRuntimeApplication(
          repository,
          database.events,
        )
        application.blocked = true
        application.importedState = runtimeStateWithoutQuitTimestamp()
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
      imported: true,
      recoveryAvailable: true,
    })
    expect(runtime.status().phase).toBe('ready')
    expect(phases.slice(-2)).toEqual(['blocked', 'ready'])
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
      'exportLastRecovery',
      'importSave',
      'inspectStorage',
      'openExternalUrl',
      'readClipboardText',
      'requestCheckpoint',
      'shutdown',
      'start',
      'status',
      'subscribeStatus',
      'writeClipboardText',
    ])
    expect(Object.values(runtime).every((value) => typeof value === 'function'))
      .toBe(true)
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
  checkpointGate: Promise<void> | undefined
  importedState: CanonicalRuntimeState | undefined
  rejectImports = false
  checkpointSkipsPersistence = false
  blocked = false
  awayCommitsStarted = 0
  awayCommits = 0
  importCalls = 0
  checkpointCalls = 0

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

  async start(): Promise<ApplicationSnapshot<CanonicalRuntimeState>> {
    this.events.push('application.start')
    await this.startGate
    this.events.push('application.start.done')
    return this.snapshot()
  }

  advanceActiveWithContinuation(
    milliseconds: number,
  ): CanonicalActiveAdvanceResult {
    return {
      transition: {
        accepted: true,
        changed: milliseconds > 0,
        revision: this.stateRevision,
      },
      consumedMilliseconds: milliseconds,
      remainingMilliseconds: 0,
      continuation: { kind: 'complete' },
    }
  }

  async dispatchPlayer(
    _envelope: ApplicationCommandEnvelope<CanonicalPlayerCommand>,
  ): Promise<CanonicalPlayerDispatchResult> {
    return {
      kind: 'transition',
      transition: {
        accepted: true,
        changed: false,
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
    if (this.rejectImports) {
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
}

class TestLifecycleAdapter implements LifecycleAdapter {
  private readonly listeners =
    new Set<(phase: LifecyclePhase) => void>()

  get listenerCount(): number {
    return this.listeners.size
  }

  subscribe(listener: (phase: LifecyclePhase) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(phase: LifecyclePhase): void {
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
  ): Promise<WriterLeaseAcquisition> {
    this.events.push('lease.acquire')
    await this.acquireGate
    if (
      this.lease?.ownerToken !== null &&
      this.lease?.ownerToken !== undefined &&
      this.lease.expiresAtUtcMilliseconds !== null &&
      this.lease.expiresAtUtcMilliseconds > nowUtcMilliseconds
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

  post(notice: OwnershipNotice): void {
    this.notices.push(notice)
  }

  subscribe(): () => void {
    return () => undefined
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
