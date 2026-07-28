import { describe, expect, test } from 'vitest'
import { PortableSaveRepository, type LegacySaveCandidate, type SaveStorageAdapter } from './repository'

class MemoryStorage implements SaveStorageAdapter {
  readonly files = new Map<string, string>()
  candidates: readonly LegacySaveCandidate[] = []
  replacements: Array<[string, string]> = []
  copies: Array<[string, string]> = []

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

  async replaceAtomically(temporaryPath: string, destinationPath: string): Promise<void> {
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
})
