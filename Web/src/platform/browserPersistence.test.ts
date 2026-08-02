import { describe, expect, test } from 'vitest'
import { PreparedSave } from '../save/prepare'
import { PortableSaveRepository } from '../save/repository'
import { serializeWebSave } from '../save/serialization'
import {
  type BrowserSaveDatabase,
  type BrowserSaveMutation,
  type WriterLeaseAcquisition,
  type WriterLeaseFence,
  WriterLeaseLostError,
} from './browserSaveDatabase'
import { BrowserStorageStatusAdapter } from './browserStorageStatus'
import {
  BrowserWriterLease,
  type BrowserWriterAuthority,
  type IntervalScheduler,
  type OwnershipNotice,
  type OwnershipNoticeChannel,
} from './browserWriterLease'
import { IndexedDbSaveStorageAdapter } from './indexedDbSaveStorage'

const repositoryPaths = {
  current: '/current',
  temporary: '/current.tmp',
  legacyRecovery: '/recovery/original-idb1.txt',
} as const

describe('browser writer ownership and fenced persistence', () => {
  test('allows exactly one simultaneous acquisition', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const clock = mutableClock(1_000)
    const first = createLease(database, clock, 'first')
    const second = createLease(database, clock, 'second')

    const acquisitions = await Promise.all([
      first.acquire(),
      second.acquire(),
    ])

    expect(
      acquisitions.filter((result) => result.acquired),
    ).toHaveLength(1)
    expect(
      [first.state().kind, second.state().kind].sort(),
    ).toEqual(['blocked', 'writable'])
    expect((await database.inspectWriterLease())?.generation).toBe(1)

    const blocked = first.state().kind === 'blocked' ? first : second
    let advanced = false
    await expect(
      blocked.runAuthoritativeOperation(() => {
        advanced = true
      }),
    ).rejects.toBeInstanceOf(WriterLeaseLostError)
    expect(advanced).toBe(false)
  })

  test('supports explicit release and monotonically fenced handoff', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const clock = mutableClock(1_000)
    const first = createLease(database, clock, 'first')
    const second = createLease(database, clock, 'second')

    const acquired = await first.acquire()
    expect(acquired).toMatchObject({
      acquired: true,
      fence: { generation: 1 },
    })
    await expect(second.acquire()).resolves.toMatchObject({
      acquired: false,
      generation: 1,
    })

    await expect(first.release()).resolves.toBe(true)
    await expect(second.acquire()).resolves.toMatchObject({
      acquired: true,
      fence: { generation: 2 },
    })
  })

  test('recovers an expired owner and rejects every stale mutation', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const clock = mutableClock(1_000)
    const first = createLease(database, clock, 'first')
    const second = createLease(database, clock, 'second')
    await first.acquire()
    const firstStorage = storageFor(database, first, clock)
    await firstStorage.writeText('/current', 'verified')

    clock.set(2_001)
    await expect(second.acquire()).resolves.toMatchObject({
      acquired: true,
      fence: { generation: 2 },
    })

    await expect(
      firstStorage.writeText('/current', 'stale'),
    ).rejects.toMatchObject({
      code: 'lease-lost',
    })
    expect(await database.readFile('/current')).toBe('verified')
    await expect(first.renew()).rejects.toBeInstanceOf(
      WriterLeaseLostError,
    )
    expect(first.state().kind).toBe('lost')
  })

  test('preserves the last verified save when quota aborts atomic promotion', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const clock = mutableClock(1_000)
    const lease = createLease(database, clock, 'owner')
    await lease.acquire()
    const storage = storageFor(database, lease, clock)
    const repository = new PortableSaveRepository(
      storage,
      repositoryPaths,
      () => ({ saveVersion: 12 }),
    )
    const current = PreparedSave.fromDecoded({
      saveVersion: 12,
      marker: 'verified',
    })
    await repository.commit(current)
    const verifiedText = await storage.readText('/current')

    database.failNextMutation = 'replace'
    await expect(
      repository.commit(
        PreparedSave.fromDecoded({
          saveVersion: 12,
          marker: 'candidate',
        }),
      ),
    ).rejects.toMatchObject({
      code: 'quota-exceeded',
    })

    expect(await storage.readText('/current')).toBe(verifiedText)
    expect(
      serializeWebSave(
        (await repository.loadCurrent())!.copyValidatedState(),
      ),
    ).toBe(verifiedText)
  })

  test('records persistent-storage denial and quota pressure without claiming durability', async () => {
    const status = await new BrowserStorageStatusAdapter({
      persisted: async () => false,
      persist: async () => false,
      estimate: async () => ({
        usage: 95,
        quota: 100,
      }),
    }).inspect(true)

    expect(status).toEqual({
      persistenceSupported: true,
      persistenceRequested: true,
      persisted: false,
      usageBytes: 95,
      quotaBytes: 100,
      remainingBytes: 5,
      quotaPressure: true,
    })
  })

  test('enforces a heartbeat no slower than half the lease and no longer than ten seconds', () => {
    const database = new MemoryBrowserSaveDatabase()

    expect(
      () =>
        new BrowserWriterLease({
          database,
          ownerToken: 'invalid',
          leaseDurationMilliseconds: 1_000,
          heartbeatMilliseconds: 501,
        }),
    ).toThrow('no more than half')
    expect(
      () =>
        new BrowserWriterLease({
          database,
          ownerToken: 'invalid',
          leaseDurationMilliseconds: 30_000,
          heartbeatMilliseconds: 10_001,
        }),
    ).toThrow('at most 10 seconds')
  })

  test('acquire racing release never republishes writable and releases the acquired fence once', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const gate = deferred<void>()
    database.acquireGate = gate.promise
    const clock = mutableClock(1_000)
    const notices = new TestNoticeChannel()
    const lease = createLease(
      database,
      clock,
      'owner',
      { noticeChannel: notices },
    )
    const states: string[] = []
    lease.subscribe((state) => states.push(state.kind))

    const acquiring = lease.acquire()
    const releasing = lease.release()
    expect(lease.state().kind).toBe('released')
    gate.resolve()

    await expect(acquiring).rejects.toBeInstanceOf(
      WriterLeaseLostError,
    )
    await expect(releasing).resolves.toBe(true)
    expect(database.releaseCalls).toBe(1)
    expect(states).toEqual(['released'])
    expect(notices.notices.map((notice) => notice.kind)).toEqual([
      'released',
    ])
  })

  test('wakes a blocked lease when the owning context announces release', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const clock = mutableClock(1_000)
    const owner = createLease(database, clock, 'owner')
    await owner.acquire()
    const notices = new TestNoticeChannel()
    const blocked = createLease(
      database,
      clock,
      'blocked',
      { noticeChannel: notices },
    )
    await expect(blocked.acquire()).resolves.toMatchObject({
      acquired: false,
      expiresAtUtcMilliseconds: 2_000,
    })

    notices.emit({
      kind: 'released',
      generation: 1,
      expiresAtUtcMilliseconds: null,
    })

    expect(blocked.state()).toEqual({
      kind: 'blocked',
      generation: 1,
      expiresAtUtcMilliseconds: 1_000,
    })
    await blocked.shutdown()
    await owner.shutdown()
  })

  test('dispose racing acquire is immediately terminal and publishes nothing afterward', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const gate = deferred<void>()
    database.acquireGate = gate.promise
    const clock = mutableClock(1_000)
    const notices = new TestNoticeChannel()
    const lease = createLease(
      database,
      clock,
      'owner',
      { noticeChannel: notices },
    )
    const states: string[] = []
    lease.subscribe((state) => states.push(state.kind))

    const acquiring = lease.acquire()
    lease.dispose()
    expect(lease.state().kind).toBe('disposed')
    expect(lease.cancellationRequested()).toBe(true)
    expect(() => lease.currentFence()).toThrow(
      WriterLeaseLostError,
    )
    gate.resolve()

    await expect(acquiring).rejects.toBeInstanceOf(
      WriterLeaseLostError,
    )
    await expect(lease.shutdown()).resolves.toBe(true)
    expect(database.releaseCalls).toBe(1)
    expect(states).toEqual(['disposed'])
    expect(notices.notices).toEqual([])
    expect(notices.closed).toBe(true)
  })

  test('heartbeat racing release cannot publish renewal after terminal release', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const clock = mutableClock(1_000)
    const scheduler = new ManualIntervalScheduler()
    const notices = new TestNoticeChannel()
    const lease = createLease(
      database,
      clock,
      'owner',
      {
        autoHeartbeat: true,
        scheduler,
        noticeChannel: notices,
      },
    )
    await lease.acquire()
    const gate = deferred<void>()
    database.renewGate = gate.promise
    clock.set(1_400)
    scheduler.fire()
    await Promise.resolve()

    const releasing = lease.release()
    expect(lease.state().kind).toBe('released')
    gate.resolve()

    await expect(releasing).resolves.toBe(true)
    await Promise.resolve()
    expect(lease.state().kind).toBe('released')
    expect(database.releaseCalls).toBe(1)
    expect(notices.notices.map((notice) => notice.kind)).toEqual([
      'acquired',
      'released',
    ])
  })

  test('database takeover blocks operation entry before the callback runs', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const clock = mutableClock(1_000)
    const lease = createLease(database, clock, 'owner')
    await lease.acquire()
    database.forceLease({
      ownerToken: 'replacement',
      generation: 2,
      expiresAtUtcMilliseconds: 2_000,
    })
    let entered = false

    await expect(
      lease.runAuthoritativeOperation(() => {
        entered = true
      }),
    ).rejects.toBeInstanceOf(WriterLeaseLostError)
    expect(entered).toBe(false)
    expect(lease.cancellationRequested()).toBe(true)
    expect(lease.state().kind).toBe('lost')
  })

  test('in-flight authority exposes expiry cancellation and rejects a late result', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const clock = mutableClock(1_000)
    const lease = createLease(database, clock, 'owner')
    await lease.acquire()
    const finish = deferred<string>()
    const started = deferred<void>()
    let authority: BrowserWriterAuthority | undefined
    const operation = lease.runAuthoritativeOperation((signal) => {
      authority = signal
      started.resolve()
      return finish.promise
    })
    await started.promise

    expect(authority?.deadlineUtcMilliseconds).toBe(2_000)
    clock.set(2_001)
    expect(authority?.isAuthoritative()).toBe(false)
    expect(authority?.cancellationRequested()).toBe(true)
    finish.resolve('published-after-expiry')

    await expect(operation).rejects.toBeInstanceOf(
      WriterLeaseLostError,
    )
    expect(lease.state().kind).toBe('lost')
  })

  test('database loss flips cancellation for an operation already in flight', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const clock = mutableClock(1_000)
    const lease = createLease(database, clock, 'owner')
    await lease.acquire()
    const finish = deferred<void>()
    let authority: BrowserWriterAuthority | undefined
    const operation = lease.runAuthoritativeOperation((signal) => {
      authority = signal
      return finish.promise
    })
    await Promise.resolve()
    database.forceLease({
      ownerToken: 'replacement',
      generation: 2,
      expiresAtUtcMilliseconds: 2_000,
    })

    await expect(lease.assertWritable()).rejects.toBeInstanceOf(
      WriterLeaseLostError,
    )
    expect(authority?.cancellationRequested()).toBe(true)
    finish.resolve()
    await expect(operation).rejects.toBeInstanceOf(
      WriterLeaseLostError,
    )
  })
})

function createLease(
  database: BrowserSaveDatabase,
  clock: ReturnType<typeof mutableClock>,
  ownerToken: string,
  overrides: Partial<
    ConstructorParameters<typeof BrowserWriterLease>[0]
  > = {},
): BrowserWriterLease {
  return new BrowserWriterLease({
    database,
    ownerToken,
    nowUtcMilliseconds: clock.now,
    leaseDurationMilliseconds: 1_000,
    heartbeatMilliseconds: 500,
    autoHeartbeat: false,
    ...overrides,
  })
}

function storageFor(
  database: BrowserSaveDatabase,
  lease: BrowserWriterLease,
  clock: ReturnType<typeof mutableClock>,
): IndexedDbSaveStorageAdapter {
  return new IndexedDbSaveStorageAdapter({
    database,
    lease,
    nowUtcMilliseconds: clock.now,
  })
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
  failNextMutation: BrowserSaveMutation['kind'] | undefined
  acquireGate: Promise<void> | undefined
  renewGate: Promise<void> | undefined
  releaseCalls = 0

  async acquireWriterLease(
    ownerToken: string,
    nowUtcMilliseconds: number,
    leaseDurationMilliseconds: number,
    allowUnexpiredSameOwnerTakeover = false,
  ): Promise<WriterLeaseAcquisition> {
    await this.acquireGate
    if (
      this.lease?.ownerToken !== null &&
      this.lease?.ownerToken !== undefined &&
      this.lease.expiresAtUtcMilliseconds !== null &&
      this.lease.expiresAtUtcMilliseconds > nowUtcMilliseconds &&
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
    await this.renewGate
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

  forceLease(fence: WriterLeaseFence): void {
    this.lease = fence
  }

  async inspectWriterLease(): Promise<WriterLeaseFence | null> {
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

class TestNoticeChannel implements OwnershipNoticeChannel {
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

function deferred<T>(): {
  readonly promise: Promise<T>
  resolve(value: T): void
} {
  let resolve: ((value: T) => void) | undefined
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return {
    promise,
    resolve: (value) => resolve!(value),
  }
}
