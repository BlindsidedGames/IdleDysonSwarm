// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { createDeterministicUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import type { LifecycleAdapter, LifecyclePhase } from '../platform/contracts'
import type {
  BrowserSaveDatabase,
  BrowserSaveMutation,
  WriterLeaseAcquisition,
  WriterLeaseFence,
} from '../platform/browserSaveDatabase'
import { createProductionV2RepositoryPaths } from '../save/productionV2Repository'
import { serializeWebSave } from '../save/serialization'
import { DEVELOPMENT_ONLY_BROWSER_SAVE_PATHS } from '../ui/runtime'
import type { BrowserUiRuntimeFoundation } from '../ui/runtime'
import {
  createBrowserReloadActionsV2,
  createProductionBrowserCompositionV2,
} from './productionBrowserCompositionV2'

const NOW_MS = Date.parse('2026-08-12T02:00:00.000Z')

describe('production browser V2 composition', () => {
  test('claims the existing slot, migrates once, checkpoints, and reloads schema 13', async () => {
    const database = new MemoryBrowserSaveDatabase()
    const original = serializeWebSave(
      createDeterministicUnityFirstRunPreparedSave().copyValidatedState(),
    )
    database.files.set(DEVELOPMENT_ONLY_BROWSER_SAVE_PATHS.current, original)
    const lifecycle = new StaticLifecycle()
    const options = {
      database,
      lifecycle,
      clock: fixedClock(),
      writerIdentity: {
        ownerToken: 'v2-browser-test-a',
        allowUnexpiredSameOwnerTakeover: false,
      },
    } as const
    const first = createProductionBrowserCompositionV2(options)

    expect(first.saveSchemaVersion).toBe(13)
    await expect(first.runtime.start()).resolves.toMatchObject({ phase: 'ready' })
    await expect(first.prepareForUpdateActivation()).resolves.toBeUndefined()
    expect(first.runtime.status()).toEqual({ phase: 'stopped' })
    const paths = createProductionV2RepositoryPaths(DEVELOPMENT_ONLY_BROWSER_SAVE_PATHS)
    expect(database.files.get(paths.preMigrationRecovery)).toBe(original)
    expect(database.files.get(paths.current)).toContain('ids-web-production-v2-checkpoint-v1')

    const second = createProductionBrowserCompositionV2({
      ...options,
      writerIdentity: {
        ownerToken: 'v2-browser-test-b',
        allowUnexpiredSameOwnerTakeover: false,
      },
    })
    await expect(second.runtime.start()).resolves.toMatchObject({ phase: 'ready' })
    expect(second.runtime.snapshot()).toMatchObject({ phase: 'ready' })
    expect(database.files.get(paths.preMigrationRecovery)).toBe(original)
    await second.runtime.shutdown()
  }, 30_000)

  test('prepares a package update only after a verified schema-13 checkpoint and shutdown', async () => {
    const events: string[] = []
    const actions = createBrowserReloadActionsV2(reloadRuntimeV2({
      status: readyStatus(),
      checkpoint: async () => {
        events.push('checkpoint')
        return true
      },
      shutdown: async () => { events.push('shutdown') },
    }), () => events.push('reload'))

    await expect(actions.prepareForUpdateActivation()).resolves.toBeUndefined()
    expect(events).toEqual(['checkpoint', 'shutdown'])
  })

  test.each([
    { phase: 'idle' },
    { phase: 'starting' },
    {
      phase: 'blocked',
      code: 'application-blocked',
      reason: 'startup unavailable',
    },
    { phase: 'ownership-lost', reason: 'lease replaced' },
    { phase: 'stopping' },
    { phase: 'stopped' },
  ] as const)(
    'refuses package activation while the V2 runtime is $phase',
    async (status) => {
      const events: string[] = []
      const actions = createBrowserReloadActionsV2(reloadRuntimeV2({
        status,
        checkpoint: async () => {
          events.push('checkpoint')
          return true
        },
        shutdown: async () => { events.push('shutdown') },
      }), () => events.push('reload'))

      await expect(actions.prepareForUpdateActivation()).rejects.toThrow(
        'ready V2 runtime and verified schema-13 checkpoint',
      )
      expect(events).toEqual([])
    },
  )

  test('keeps the ready session alive when package checkpoint verification fails', async () => {
    const events: string[] = []
    const actions = createBrowserReloadActionsV2(reloadRuntimeV2({
      status: readyStatus(),
      checkpoint: async () => {
        events.push('checkpoint')
        return false
      },
      shutdown: async () => { events.push('shutdown') },
    }), () => events.push('reload'))

    await expect(actions.prepareForUpdateActivation()).rejects.toThrow(
      'verified schema-13 checkpoint',
    )
    expect(events).toEqual(['checkpoint'])
  })

  test('propagates a package checkpoint failure without shutdown or activation', async () => {
    const events: string[] = []
    const actions = createBrowserReloadActionsV2(reloadRuntimeV2({
      status: readyStatus(),
      checkpoint: async () => {
        events.push('checkpoint')
        throw new Error('schema-13 checkpoint failed')
      },
      shutdown: async () => { events.push('shutdown') },
    }), () => events.push('reload'))

    await expect(actions.prepareForUpdateActivation()).rejects.toThrow(
      'schema-13 checkpoint failed',
    )
    expect(events).toEqual(['checkpoint'])
  })

  test('keeps verified safe reload ordering separate from update activation', async () => {
    const events: string[] = []
    const actions = createBrowserReloadActionsV2(reloadRuntimeV2({
      status: readyStatus(),
      checkpoint: async () => {
        events.push('checkpoint')
        return true
      },
      shutdown: async () => { events.push('shutdown') },
    }), () => events.push('reload'))

    await expect(actions.reloadSafely()).resolves.toBeUndefined()
    expect(events).toEqual(['checkpoint', 'shutdown', 'reload'])
  })

  test.each([
    {
      name: 'writer-blocked',
      status: { phase: 'blocked', code: 'writer-owned', reason: 'another owner' },
    },
    {
      name: 'application-blocked',
      status: { phase: 'blocked', code: 'application-blocked', reason: 'startup unavailable' },
    },
    {
      name: 'ownership-lost',
      status: { phase: 'ownership-lost', reason: 'lease replaced' },
    },
    { name: 'stopped', status: { phase: 'stopped' } },
  ] as const)(
    'allows $name recovery reload without inventing a schema-13 checkpoint',
    async ({ status }) => {
      const events: string[] = []
      const actions = createBrowserReloadActionsV2(reloadRuntimeV2({
        status,
        checkpoint: async () => {
          events.push('checkpoint')
          return false
        },
        shutdown: async () => { events.push('shutdown') },
      }), () => events.push('reload'))

      await expect(actions.reloadSafely()).resolves.toBeUndefined()
      expect(events).toEqual(['shutdown', 'reload'])
    },
  )

  test.each(['idle', 'starting', 'stopping'] as const)(
    'rejects ordinary safe reload while the V2 runtime is %s',
    async (phase) => {
      const events: string[] = []
      const actions = createBrowserReloadActionsV2(reloadRuntimeV2({
        status: { phase },
        checkpoint: async () => true,
        shutdown: async () => { events.push('shutdown') },
      }), () => events.push('reload'))

      await expect(actions.reloadSafely()).rejects.toThrow(
        `Safe reload is unavailable while the V2 runtime is ${phase}.`,
      )
      expect(events).toEqual([])
    },
  )
})

function readyStatus() {
  return Object.freeze({ phase: 'ready' as const, warnings: Object.freeze([]) })
}

function reloadRuntimeV2(operations: Readonly<{
  status: ReturnType<BrowserUiRuntimeFoundation['status']>
  checkpoint: () => Promise<boolean>
  shutdown: () => Promise<void>
}>): BrowserUiRuntimeFoundation {
  return Object.freeze({
    status: () => operations.status,
    checkpointBeforeSafeReload: operations.checkpoint,
    shutdown: operations.shutdown,
  }) as unknown as BrowserUiRuntimeFoundation
}

function fixedClock() {
  return Object.freeze({
    sample: () => Object.freeze({
      utcMilliseconds: NOW_MS,
      serializedUtcText: new Date(NOW_MS).toISOString(),
    }),
  })
}

class StaticLifecycle implements LifecycleAdapter {
  currentPhase(): LifecyclePhase { return 'active' }
  subscribe(_listener: (phase: LifecyclePhase) => void) { return () => undefined }
}

class MemoryBrowserSaveDatabase implements BrowserSaveDatabase {
  readonly files = new Map<string, string>()
  #fence: WriterLeaseFence | null = null
  #generation = 0

  async acquireWriterLease(
    ownerToken: string,
    nowUtcMilliseconds: number,
    leaseDurationMilliseconds: number,
    _allowSame = false,
    allowAny = false,
  ): Promise<WriterLeaseAcquisition> {
    if (this.#fence !== null && this.#fence.expiresAtUtcMilliseconds > nowUtcMilliseconds && !allowAny) {
      return Object.freeze({
        acquired: false as const,
        generation: this.#fence.generation,
        expiresAtUtcMilliseconds: this.#fence.expiresAtUtcMilliseconds,
      })
    }
    this.#generation += 1
    this.#fence = Object.freeze({
      ownerToken,
      generation: this.#generation,
      expiresAtUtcMilliseconds: nowUtcMilliseconds + leaseDurationMilliseconds,
    })
    return Object.freeze({ acquired: true as const, fence: this.#fence })
  }

  async renewWriterLease(fence: WriterLeaseFence, now: number, duration: number) {
    this.#assert(fence)
    this.#fence = Object.freeze({ ...fence, expiresAtUtcMilliseconds: now + duration })
    return this.#fence
  }

  async releaseWriterLease(fence: WriterLeaseFence) {
    if (!sameFence(this.#fence, fence)) return false
    this.#fence = null
    return true
  }

  async inspectWriterLease() { return this.#fence }
  async fileExists(path: string) { return this.files.has(path) }
  async readFile(path: string) {
    const value = this.files.get(path)
    if (value === undefined) throw new Error(`Missing ${path}`)
    return value
  }
  async listLegacyCandidates() { return Object.freeze([]) }

  async mutateFiles(mutation: BrowserSaveMutation, fence: WriterLeaseFence) {
    this.#assert(fence)
    switch (mutation.kind) {
      case 'write':
        this.files.set(mutation.path, mutation.contents)
        return
      case 'replace': {
        const value = await this.readFile(mutation.temporaryPath)
        this.files.set(mutation.destinationPath, value)
        this.files.delete(mutation.temporaryPath)
        return
      }
      case 'copy':
        this.files.set(mutation.destinationPath, await this.readFile(mutation.sourcePath))
        return
      case 'retain-legacy':
        return
    }
  }

  #assert(fence: WriterLeaseFence) {
    if (!sameFence(this.#fence, fence)) throw new Error('stale fence')
  }
}

function sameFence(left: WriterLeaseFence | null, right: WriterLeaseFence): boolean {
  return left !== null && left.ownerToken === right.ownerToken &&
    left.generation === right.generation &&
    left.expiresAtUtcMilliseconds === right.expiresAtUtcMilliseconds
}
