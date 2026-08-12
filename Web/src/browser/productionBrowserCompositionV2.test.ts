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
import { createProductionBrowserCompositionV2 } from './productionBrowserCompositionV2'

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
    expect(await first.runtime.requestCheckpoint()).toBe(true)
    const paths = createProductionV2RepositoryPaths(DEVELOPMENT_ONLY_BROWSER_SAVE_PATHS)
    expect(database.files.get(paths.preMigrationRecovery)).toBe(original)
    expect(database.files.get(paths.current)).toContain('ids-web-production-v2-checkpoint-v1')
    await first.runtime.shutdown()

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
})

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
