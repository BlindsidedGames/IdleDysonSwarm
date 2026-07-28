import { describe, expect, test } from 'vitest'
import { PreparedSave } from './prepare'
import { PortableSaveRepository, type LegacySaveCandidate, type SaveStorageAdapter } from './repository'
import { serializeWebSave } from './serialization'

class MemoryStorage implements SaveStorageAdapter {
  readonly files = new Map<string, string>()
  candidates: readonly LegacySaveCandidate[] = []
  replacements: Array<[string, string]> = []
  copies: Array<[string, string]> = []
  failAt: 'write' | 'read-temporary' | 'replace' | null = null
  corruptTemporaryRead = false

  async exists(path: string): Promise<boolean> {
    return this.files.has(path)
  }

  async readText(path: string): Promise<string> {
    if (path === '/current.tmp' && this.failAt === 'read-temporary') {
      throw new Error('temporary verification read failed')
    }
    const value = this.files.get(path)
    if (value === undefined) throw new Error(`Missing ${path}`)
    if (path === '/current.tmp' && this.corruptTemporaryRead) return '{'
    return value
  }

  async writeText(path: string, contents: string): Promise<void> {
    if (this.failAt === 'write') throw new Error('temporary write failed')
    this.files.set(path, contents)
  }

  async replaceAtomically(temporaryPath: string, destinationPath: string): Promise<void> {
    if (this.failAt === 'replace') throw new Error('atomic replace failed')
    this.replacements.push([temporaryPath, destinationPath])
    this.files.set(destinationPath, await this.readText(temporaryPath))
    this.files.delete(temporaryPath)
  }

  async copy(sourcePath: string, destinationPath: string): Promise<void> {
    this.copies.push([sourcePath, destinationPath])
    this.files.set(destinationPath, await this.readText(sourcePath))
  }

  async discoverLegacyCandidates(): Promise<readonly LegacySaveCandidate[]> {
    return this.candidates
  }
}

describe('portable transactional save repository', () => {
  test('migrates once, atomically promotes, and preserves the Odin source', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/legacy', 'IDB1:test')
    storage.candidates = [
      { id: 'canonical-unity', sourcePath: '/legacy', text: 'IDB1:test' },
    ]
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12 }),
    )

    const result = await repository.migrateLegacyOnFirstLaunch()
    expect(result.status).toBe('migrated')
    expect(storage.replacements).toEqual([['/current.tmp', '/current']])
    expect(storage.copies).toEqual([
      ['/legacy', '/recovery/original-idb1.txt'],
    ])
    expect(storage.files.get('/legacy')).toBe('IDB1:test')

    const second = await repository.migrateLegacyOnFirstLaunch()
    expect(second.status).toBe('already-migrated')
    expect(storage.replacements).toHaveLength(1)
  })

  test('falls back to a valid recovery candidate when the first legacy file is corrupt', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/corrupt', 'bad')
    storage.files.set('/backup', 'good')
    storage.candidates = [
      { id: 'canonical', sourcePath: '/corrupt', text: 'bad' },
      { id: 'backup', sourcePath: '/backup', text: 'good' },
    ]
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      (text) => {
        if (text === 'bad') throw new Error('corrupt Odin')
        return { saveVersion: 12 }
      },
    )

    const result = await repository.migrateLegacyOnFirstLaunch()
    expect(result.status).toBe('migrated')
    if (result.status === 'migrated') expect(result.source.id).toBe('backup')
    expect(storage.files.get('/recovery/original-idb1.txt')).toBe('good')
  })

  test('loads current saves only through migration, repair, and validation', async () => {
    const storage = new MemoryStorage()
    storage.files.set(
      '/current',
      serializeWebSave(PreparedSave.fromDecoded({ saveVersion: 8 }).copyState()),
    )
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => {
        throw new Error('legacy decoder should not run')
      },
    )

    const prepared = await repository.loadCurrent()
    expect(prepared).not.toBeNull()
    expect(prepared?.targetSchema).toBe(12)
    expect(prepared?.copyState().saveVersion).toBe(12)
  })

  test('rejects a future-schema current save before publication', async () => {
    const storage = new MemoryStorage()
    storage.files.set(
      '/current',
      serializeWebSave({ saveVersion: 13 }),
    )
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12 }),
    )

    await expect(repository.loadCurrent()).rejects.toThrow(
      'newer than supported schema',
    )
  })

  test.each(['write', 'read-temporary', 'replace'] as const)(
    'preserves the current save when %s fails',
    async (failAt) => {
      const storage = new MemoryStorage()
      const current = PreparedSave.fromDecoded({
        saveVersion: 12,
        checkpointMarker: 'current',
      })
      const candidate = PreparedSave.fromDecoded({
        saveVersion: 12,
        checkpointMarker: 'candidate',
      })
      const currentBytes = serializeWebSave(current.copyValidatedState())
      storage.files.set('/current', currentBytes)
      storage.failAt = failAt
      const repository = new PortableSaveRepository(
        storage,
        {
          current: '/current',
          temporary: '/current.tmp',
          legacyRecovery: '/recovery/original-idb1.txt',
        },
        () => ({ saveVersion: 12 }),
      )

      await expect(repository.commit(candidate)).rejects.toThrow()
      expect(storage.files.get('/current')).toBe(currentBytes)
    },
  )

  test('blocks canonical player-save writes by default', async () => {
    const storage = new MemoryStorage()
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12 }),
    )

    await expect(
      repository.commit(
        PreparedSave.fromDecoded({ saveVersion: 12 }),
        'canonical-player',
      ),
    ).rejects.toThrow('disabled until mapping coverage is complete')
    expect(storage.files.size).toBe(0)
  })

  test('does not replace current when temporary verification is corrupt', async () => {
    const storage = new MemoryStorage()
    const current = PreparedSave.fromDecoded({
      saveVersion: 12,
      checkpointMarker: 'current',
    })
    const currentBytes = serializeWebSave(current.copyValidatedState())
    storage.files.set('/current', currentBytes)
    storage.corruptTemporaryRead = true
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12 }),
    )

    await expect(
      repository.commit(
        PreparedSave.fromDecoded({
          saveVersion: 12,
          checkpointMarker: 'candidate',
        }),
      ),
    ).rejects.toThrow()
    expect(storage.replacements).toEqual([])
    expect(storage.files.get('/current')).toBe(currentBytes)
  })

  test('recovers from a corrupt current save using a valid legacy candidate', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current', '{')
    storage.files.set('/legacy', 'good')
    storage.candidates = [
      { id: 'legacy-recovery', sourcePath: '/legacy', text: 'good' },
    ]
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 8 }),
    )

    const result = await repository.migrateLegacyOnFirstLaunch()
    expect(result.status).toBe('migrated')
    expect(storage.files.get('/recovery/original-idb1.txt')).toBe('good')
    expect(await repository.loadCurrent()).not.toBeNull()
  })
})
