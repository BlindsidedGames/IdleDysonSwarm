import { describe, expect, test } from 'vitest'
import { PreparedSave } from './prepare'
import { PortableSaveRepository, type LegacySaveCandidate, type SaveStorageAdapter } from './repository'
import { serializeWebSave } from './serialization'

class MemoryStorage implements SaveStorageAdapter {
  readonly files = new Map<string, string>()
  candidates: readonly LegacySaveCandidate[] = []
  replacements: Array<[string, string]> = []
  copies: Array<[string, string]> = []
  failAt: 'write' | 'read-temporary' | 'copy' | 'replace' | null = null
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
    if (this.failAt === 'copy') throw new Error('backup copy failed')
    this.copies.push([sourcePath, destinationPath])
    this.files.set(destinationPath, await this.readText(sourcePath))
  }

  async discoverLegacyCandidates(): Promise<readonly LegacySaveCandidate[]> {
    return this.candidates
  }
}

describe('portable transactional save repository', () => {

  test.each([
    ['write', 'temporary write failed'],
    ['read-temporary', 'temporary verification read failed'],
    ['copy', 'backup copy failed'],
    ['replace', 'atomic replace failed'],
  ] as const)(
    'preserves the current save when %s fails',
    async (failAt, message) => {
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

      await expect(repository.commit(candidate)).rejects.toThrow(message)
      expect(storage.files.get('/current')).toBe(currentBytes)
    },
  )

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
    ).rejects.toThrow('Temporary save verification failed')
    expect(storage.replacements).toEqual([])
    expect(storage.files.get('/current')).toBe(currentBytes)
  })

  test('recovers the newest valid Web backup before considering Unity candidates', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current', '{')
    storage.files.set('/current.backup.1', 'also invalid')
    storage.files.set(
      '/current.backup.2',
      serializeWebSave({ saveVersion: 12, slot: 'recovered' }),
    )
    storage.files.set('/legacy', 'legacy')
    storage.candidates = [
      { id: 'legacy', sourcePath: '/legacy', text: 'legacy' },
    ]
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12, slot: 'legacy' }),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'recovered-backup',
      sourcePath: '/current.backup.2',
    })
    expect(
      (await repository.loadCurrent())?.copyValidatedState().slot,
    ).toBe('recovered')
    expect(storage.copies).toEqual([
      ['/current', '/recovery/original-idb1.txt'],
    ])
    expect(storage.replacements).toEqual([['/current.tmp', '/current']])
  })

  test('does not silently start fresh when every Web backup is invalid', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current.backup.1', 'invalid backup')
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12 }),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'current-invalid',
    })
    expect(storage.files.has('/current')).toBe(false)
    expect(storage.files.get('/current.backup.1')).toBe('invalid backup')
  })

  test('stops fallback when the current save has a future schema', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current', serializeWebSave({ saveVersion: 23 }))
    storage.files.set('/legacy', 'good')
    storage.candidates = [
      { id: 'legacy', sourcePath: '/legacy', text: 'good' },
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

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'unsupported-future-version',
      source: 'current',
    })
    expect(storage.copies).toEqual([])
    expect(storage.replacements).toEqual([])
    expect(storage.files.get('/current')).toBe(serializeWebSave({ saveVersion: 23 }))
  })
})
