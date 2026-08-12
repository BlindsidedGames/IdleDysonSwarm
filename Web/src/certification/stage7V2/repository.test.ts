import { gzipSync, gunzipSync, strFromU8, strToU8 } from 'fflate'
import { describe, expect, test } from 'vitest'
import { createDeterministicUnityFirstRunPreparedSave } from '../../application/firstRun/unityFirstRunSave'
import { migratePreparedSaveToV2 } from '../../game-state/mappingV2'
import { CURRENT_SAVE_SCHEMA } from '../../save/migrate'
import { NATIVE_WEB_SAVE_PATHS } from '../../platform/platformSaveStorage'
import {
  encodeSchema13WebSave,
  type Schema13PlatformState,
  type Schema13WebSaveSource,
} from '../../save/schema13'
import {
  createStage7V2CertificationPaths,
  stage7V2CertificationCleanupPaths,
  STAGE7_V2_CERTIFICATION_MAXIMUM_TEXT_BYTES,
  type Stage7V2CertificationStorage,
} from './contracts'
import {
  Stage7V2InjectedNativeRootedStorage,
  createStage7V2NativeCertificationStorage,
  type Stage7V2NativeCertificationRootedPort,
} from './nativeRootedStorage'
import { Stage7V2CertificationRepository } from './repository'

const BUILD_SCOPE = 'stage7a-test-build'
const SAVED_AT = '2026-08-10T00:00:00.000Z'
const PLATFORM: Readonly<Schema13PlatformState> = Object.freeze({
  debugOptions: true,
  debugEverEnabled: true,
  cheater: false,
  unlockAllTabs: false,
})

describe('Stage 7 V2 certification repository', () => {
  test('remains build-scoped after the coordinated production schema activation', () => {
    const storage = new MemoryStorage()
    const repository = new Stage7V2CertificationRepository({
      buildScope: BUILD_SCOPE,
      storage,
    })
    expect(storage.operations).toEqual([])
    expect(repository.paths().root).toBe(
      'stage7-v2-certification/stage7a-test-build',
    )
    expect(CURRENT_SAVE_SCHEMA).toBe(13)
    expect(() => createStage7V2CertificationPaths('../live')).toThrow()
    expect(() => createStage7V2CertificationPaths('C:live')).toThrow()
    let getters = 0
    expect(() => new Stage7V2CertificationRepository(Object.defineProperty({}, 'buildScope', {
      get: () => { getters += 1; return BUILD_SCOPE },
      enumerable: true,
    }) as never)).toThrow()
    expect(getters).toBe(0)
    const hostileStorage = Object.defineProperty({}, 'exists', {
      get: () => { getters += 1; return async () => false },
    })
    expect(() => new Stage7V2CertificationRepository({
      buildScope: BUILD_SCOPE,
      storage: hostileStorage as never,
    })).toThrow()
    expect(getters).toBe(0)
  })

  test('checkpoints, verifies readback, rotates backups, and recovers without startup auto-open', async () => {
    const storage = new MemoryStorage()
    const repository = new Stage7V2CertificationRepository({ buildScope: BUILD_SCOPE, storage })
    const source = fixtureSource()
    await repository.checkpoint(source, PLATFORM)
    await repository.checkpoint({ ...source, savedAtUtc: '2026-08-10T00:00:01.000Z' }, {
      ...PLATFORM,
      debugOptions: false,
    })
    const expectedBackup = storage.files.get(repository.paths().backups[0])
    expect(expectedBackup).toBeDefined()
    storage.files.set(repository.paths().current, '{corrupt')

    const recovered = await repository.recoverNewestValid()
    expect(recovered?.sourcePath).toBe(repository.paths().backups[0])
    expect(recovered?.save.savedAtUtc).toBe(SAVED_AT)
    expect(recovered?.platform.debugOptions).toBe(true)
    expect(storage.files.get(repository.paths().current)).toBe(expectedBackup)
  })

  test('prepared checkpoints read back exact bytes and remain fully decoded on the next load', async () => {
    const storage = new MemoryStorage()
    const repository = new Stage7V2CertificationRepository({ buildScope: BUILD_SCOPE, storage })
    await repository.checkpointPrepared(fixtureSource(), PLATFORM, 12)
    const loaded = await repository.loadCurrent()
    expect(loaded?.revision).toBe(12)
    expect(loaded?.save.savedAtUtc).toBe(SAVED_AT)
    expect(loaded?.platform).toEqual(PLATFORM)
    expect(storage.operations).toContain(
      `replace:${repository.paths().temporary}:${repository.paths().current}`,
    )
  })

  test('keeps receiver platform state outside portable export and retains original imports', async () => {
    const storage = new MemoryStorage()
    const repository = new Stage7V2CertificationRepository({ buildScope: BUILD_SCOPE, storage })
    const portable = encodeSchema13WebSave(fixtureSource())
    const imported = await repository.importPortable(portable, PLATFORM)
    expect(imported.platform).toEqual(PLATFORM)
    expect(imported.portableSave).toBe(portable)
    expect(await repository.exportPortable()).toBe(portable)
    expect(await repository.exportRetainedImport()).toBe(portable)
    expect(portable).not.toContain('debugEverEnabled')

    const nextPortable = encodeSchema13WebSave({
      ...fixtureSource(),
      savedAtUtc: '2026-08-10T00:00:02.000Z',
    })
    await repository.importPortable(nextPortable, {
      ...PLATFORM,
      debugOptions: false,
      debugEverEnabled: false,
    })
    expect((await repository.loadCurrent())?.platform).toEqual({
      debugOptions: false,
      debugEverEnabled: false,
      cheater: false,
      unlockAllTabs: false,
    })
    expect(await repository.exportRetainedImport()).toBe(portable)
  })

  test('defaults missing, corrupt, and unknown policy values to Fast and accepts only the closed three', async () => {
    const storage = new MemoryStorage()
    const repository = new Stage7V2CertificationRepository({ buildScope: BUILD_SCOPE, storage })
    expect(await repository.readStoredTimePolicy()).toBe('stored-time-fast-v1')
    storage.files.set(repository.paths().storedTimePolicy, '{')
    expect(await repository.readStoredTimePolicy()).toBe('stored-time-fast-v1')
    storage.files.set(repository.paths().storedTimePolicy,
      JSON.stringify({ format: 'stage7-v2-certification-policy-v1', policyId: 'other' }))
    expect(await repository.readStoredTimePolicy()).toBe('stored-time-fast-v1')
    for (const policyId of [
      'stored-time-fast-v1',
      'stored-time-balanced-v1',
      'stored-time-exact-v1',
    ] as const) {
      await repository.writeStoredTimePolicy(policyId)
      expect(await repository.readStoredTimePolicy()).toBe(policyId)
    }
    await expect(repository.writeStoredTimePolicy('other' as never)).rejects.toThrow()
  })

  test('atomically persists the process-restart evidence draft under the certification writer fence', async () => {
    const storage = new MemoryStorage()
    const repository = new Stage7V2CertificationRepository({ buildScope: BUILD_SCOPE, storage })
    expect(await repository.readEvidenceDraft()).toBeNull()
    await repository.persistEvidenceDraft('{"format":"draft-a"}')
    expect(await repository.readEvidenceDraft()).toBe('{"format":"draft-a"}')
    expect(storage.operations).toContain(`replace:${repository.paths().evidenceDraftTemporary}:${repository.paths().evidenceDraft}`)
    storage.corruptNextWrite = true
    await expect(repository.persistEvidenceDraft('{"format":"draft-b"}')).rejects.toThrow()
    expect(await repository.readEvidenceDraft()).toBe('{"format":"draft-a"}')
  })

  test('rejects hostile Stored Time record descriptors without invoking getters', async () => {
    const storage = new MemoryStorage()
    const repository = new Stage7V2CertificationRepository({ buildScope: BUILD_SCOPE, storage })
    let getters = 0
    const hostile = Object.defineProperty({}, 'kind', {
      enumerable: true,
      get: () => { getters += 1; return 'stored-time-origin-v2' },
    })
    await expect(repository.persistStoredTimeJobRecord(hostile)).rejects.toThrow()
    expect(getters).toBe(0)
    expect(storage.files.has(repository.paths().storedTimeJob)).toBe(false)
  })

  test('preserves the last verified current checkpoint on interrupted replace and rejects bad readback', async () => {
    const storage = new MemoryStorage()
    const repository = new Stage7V2CertificationRepository({ buildScope: BUILD_SCOPE, storage })
    await repository.checkpoint(fixtureSource(), PLATFORM)
    const before = storage.files.get(repository.paths().current)
    storage.failReplace = true
    await expect(repository.checkpoint({
      ...fixtureSource(),
      savedAtUtc: '2026-08-10T00:00:03.000Z',
    }, PLATFORM)).rejects.toThrow('injected replace failure')
    expect(storage.files.get(repository.paths().current)).toBe(before)

    storage.failReplace = false
    storage.corruptNextWrite = true
    await expect(repository.checkpoint(fixtureSource(), PLATFORM)).rejects.toThrow()
    expect(storage.files.get(repository.paths().current)).toBe(before)
  })

  test('atomically stages retained imports and repairs only through verified replacement', async () => {
    const storage = new MemoryStorage()
    const repository = new Stage7V2CertificationRepository({ buildScope: BUILD_SCOPE, storage })
    const portable = encodeSchema13WebSave(fixtureSource())
    storage.failReplace = true
    await expect(repository.importPortable(portable, PLATFORM)).rejects.toThrow()
    expect(storage.files.has(repository.paths().recoveryImport)).toBe(false)
    storage.failReplace = false
    await repository.importPortable(portable, PLATFORM)
    expect(await repository.exportRetainedImport()).toBe(portable)

    storage.files.set(repository.paths().recoveryImport, '{corrupt')
    await repository.importPortable(portable, PLATFORM)
    expect(await repository.exportRetainedImport()).toBe(portable)
  })

  test('serializes same-instance and same-storage writers across temp rotation and cleanup races', async () => {
    const storage = new MemoryStorage()
    const first = new Stage7V2CertificationRepository({ buildScope: BUILD_SCOPE, storage })
    const second = new Stage7V2CertificationRepository({ buildScope: BUILD_SCOPE, storage })
    storage.resetPause(first.paths().temporary)
    const firstWrite = first.checkpoint(fixtureSource(), PLATFORM)
    await storage.paused
    const secondWrite = second.checkpoint({
      ...fixtureSource(), savedAtUtc: '2026-08-10T00:00:09.000Z',
    }, PLATFORM)
    await Promise.resolve()
    expect(storage.operations.filter((value) => value.startsWith('write:'))).toHaveLength(1)
    storage.releasePause()
    await Promise.all([firstWrite, secondWrite])
    expect((await second.loadCurrent())?.save.savedAtUtc).toBe('2026-08-10T00:00:09.000Z')

    storage.resetPause(first.paths().recoveryImportTemporary)
    const importing = first.importPortable(encodeSchema13WebSave(fixtureSource()), PLATFORM)
    await storage.paused
    const cleaning = second.cleanup()
    await Promise.resolve()
    expect(storage.operations.at(-1)).not.toMatch(/^remove:/u)
    storage.releasePause()
    await importing
    await cleaning
    expect(stage7V2CertificationCleanupPaths(first.paths())
      .every((path) => !storage.files.has(path))).toBe(true)
  })

  test('skips corrupt and forward-schema candidates without overwriting the last valid backup', async () => {
    const storage = new MemoryStorage()
    const repository = new Stage7V2CertificationRepository({ buildScope: BUILD_SCOPE, storage })
    await repository.checkpoint(fixtureSource(), PLATFORM)
    await repository.checkpoint({
      ...fixtureSource(),
      savedAtUtc: '2026-08-10T00:00:04.000Z',
    }, PLATFORM)
    const validBackup = storage.files.get(repository.paths().backups[0])!
    storage.files.set(repository.paths().current, checkpointEnvelope(forwardSchemaSave(), PLATFORM))
    const recovered = await repository.recoverNewestValid()
    expect(recovered?.sourcePath).toBe(repository.paths().backups[0])
    expect(storage.files.get(repository.paths().current)).toBe(validBackup)
  })

  test('enforces the 32 MiB outer bound before persistence and on readback', async () => {
    const storage = new MemoryStorage()
    const repository = new Stage7V2CertificationRepository({ buildScope: BUILD_SCOPE, storage })
    const oversized = 'x'.repeat(STAGE7_V2_CERTIFICATION_MAXIMUM_TEXT_BYTES + 1)
    await expect(repository.importPortable(oversized, PLATFORM)).rejects.toThrow('32 MiB')
    expect(storage.operations).toEqual([])
    storage.files.set(repository.paths().current, oversized)
    await expect(repository.loadCurrent()).rejects.toThrow('32 MiB')
    storage.files.set(repository.paths().current, 42 as never)
    await expect(repository.loadCurrent()).rejects.toThrow('must be a string')
  })

  test('removes exactly the build-scoped certification artifacts', async () => {
    const storage = new MemoryStorage()
    const repository = new Stage7V2CertificationRepository({ buildScope: BUILD_SCOPE, storage })
    for (const path of stage7V2CertificationCleanupPaths(repository.paths())) {
      storage.files.set(path, 'value')
    }
    storage.files.set('production/current.idsw', 'untouched')
    await repository.cleanup()
    expect([...storage.files]).toEqual([['production/current.idsw', 'untouched']])
  })
})

describe('Stage 7 injected native certification storage', () => {
  test('rejects absolute/traversal paths and leaves symlink rejection to the rooted native port', async () => {
    const port = new NativeMemoryPort()
    const storage = new Stage7V2InjectedNativeRootedStorage(BUILD_SCOPE, port)
    expect(() => storage.writeText('/absolute', 'x')).toThrow()
    expect(() => storage.writeText(
      'stage7-v2-certification/stage7a-test-build/../live',
      'x',
    )).toThrow()
    port.symlinkBlocked = true
    await expect(storage.writeText(
      'stage7-v2-certification/stage7a-test-build/checkpoint/current.json',
      'x',
    )).rejects.toThrow('symbolic link')
  })

  test('connects the rooted native host cleanup without touching production save paths', async () => {
    const bridge = new NativeHostMemoryBridge()
    const storage = createStage7V2NativeCertificationStorage(BUILD_SCOPE, bridge)
    const repository = new Stage7V2CertificationRepository({ buildScope: BUILD_SCOPE, storage })
    await repository.checkpoint(fixtureSource(), PLATFORM)
    await repository.cleanup()
    expect(bridge.removed).toEqual(stage7V2CertificationCleanupPaths(repository.paths()))
    expect(bridge.removed.some((path) => Object.values(NATIVE_WEB_SAVE_PATHS)
      .flat().includes(path))).toBe(false)
  })
})

function fixtureSource(): Readonly<Schema13WebSaveSource> {
  const migrated = migratePreparedSaveToV2(
    createDeterministicUnityFirstRunPreparedSave(),
    Object.freeze({ kind: 'trusted-same-device' }),
  )
  return Object.freeze({
    savedAtUtc: SAVED_AT,
    state: migrated.state,
    runtime: migrated.runtime,
  })
}

function checkpointEnvelope(
  portableSave: string,
  platform: Readonly<Schema13PlatformState>,
): string {
  return JSON.stringify({
    format: 'stage7-v2-certification-checkpoint-v1',
    portableSave,
    platform,
  })
}

function forwardSchemaSave(): string {
  const encoded = encodeSchema13WebSave(fixtureSource())
  const compressed = Uint8Array.from(Buffer.from(encoded.slice('IDSWEB1:'.length), 'base64'))
  const parsed = JSON.parse(strFromU8(gunzipSync(compressed))) as Record<string, unknown>
  parsed.schemaVersion = 14
  return `IDSWEB1:${Buffer.from(gzipSync(strToU8(JSON.stringify(parsed)))).toString('base64')}`
}

class MemoryStorage implements Stage7V2CertificationStorage {
  readonly files = new Map<string, string>()
  readonly operations: string[] = []
  failReplace = false
  corruptNextWrite = false
  pausePath: string | null = null
  #pauseResolve: (() => void) | null = null
  #pausedResolve: (() => void) | null = null
  paused: Promise<void> = Promise.resolve()
  #writerTail: Promise<void> = Promise.resolve()

  resetPause(path: string): void {
    this.pausePath = path
    this.paused = new Promise((resolve) => { this.#pausedResolve = resolve })
  }
  releasePause(): void {
    this.pausePath = null
    this.#pauseResolve?.()
    this.#pauseResolve = null
  }

  async exists(path: string): Promise<boolean> {
    this.operations.push(`exists:${path}`)
    return this.files.has(path)
  }
  async readText(path: string): Promise<string> {
    this.operations.push(`read:${path}`)
    const value = this.files.get(path)
    if (value === undefined) throw new Error('missing')
    return value
  }
  async writeText(path: string, text: string): Promise<void> {
    this.operations.push(`write:${path}`)
    this.files.set(path, this.corruptNextWrite ? `${text}x` : text)
    this.corruptNextWrite = false
    if (path === this.pausePath) {
      this.#pausedResolve?.()
      await new Promise<void>((resolve) => { this.#pauseResolve = resolve })
    }
  }
  async replaceAtomically(temporaryPath: string, destinationPath: string): Promise<void> {
    this.operations.push(`replace:${temporaryPath}:${destinationPath}`)
    if (this.failReplace) throw new Error('injected replace failure')
    const value = this.files.get(temporaryPath)
    if (value === undefined) throw new Error('missing temporary')
    this.files.set(destinationPath, value)
    this.files.delete(temporaryPath)
  }
  async copy(sourcePath: string, destinationPath: string): Promise<void> {
    this.operations.push(`copy:${sourcePath}:${destinationPath}`)
    const value = this.files.get(sourcePath)
    if (value === undefined) throw new Error('missing source')
    this.files.set(destinationPath, value)
  }
  async removeExactly(paths: readonly string[]): Promise<void> {
    this.operations.push(`remove:${paths.join(',')}`)
    for (const path of paths) this.files.delete(path)
  }
  withExclusiveMutation<T>(
    operationOrRoot: string | (() => Promise<T>),
    nativeOperation?: () => Promise<T>,
  ): Promise<T> {
    const operation = typeof operationOrRoot === 'function'
      ? operationOrRoot
      : nativeOperation!
    const run = this.#writerTail.then(operation)
    this.#writerTail = run.then(() => undefined, () => undefined)
    return run
  }
}

class NativeMemoryPort extends MemoryStorage implements Stage7V2NativeCertificationRootedPort {
  symlinkBlocked = false
  override async writeText(path: string, text: string): Promise<void> {
    if (this.symlinkBlocked) throw new Error('symbolic link rejected')
    await super.writeText(path, text)
  }
}

class NativeHostMemoryBridge extends MemoryStorage {
  readonly removed: string[] = []
  async removeCertificationFiles(paths: readonly string[]): Promise<void> {
    this.removed.push(...paths)
    await super.removeExactly(paths)
  }
}
