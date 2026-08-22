import { readFileSync } from 'node:fs'
import { describe, expect, test, vi } from 'vitest'
import { decodeIdb1SaveRoot } from './decodeIdb1'
import { PreparedSave } from './prepare'
import { PortableSaveRepository, type LegacySaveCandidate, type SaveStorageAdapter } from './repository'
import { serializeWebSave } from './serialization'

const fixtureUrl = new URL(
  '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
  import.meta.url,
)

class MemoryStorage implements SaveStorageAdapter {
  readonly files = new Map<string, string>()
  candidates: readonly LegacySaveCandidate[] = []
  replacements: Array<[string, string]> = []
  copies: Array<[string, string]> = []
  failAt: 'write' | 'read-temporary' | 'copy' | 'replace' | null = null
  corruptTemporaryRead = false
  substituteTemporaryRead: string | null = null

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
    if (path === '/current.tmp' && this.substituteTemporaryRead !== null) {
      return this.substituteTemporaryRead
    }
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
  test('automatically migrates lowercase IDB1 while retaining the exact recovery source', async () => {
    const storage = new MemoryStorage()
    const uppercase = readFileSync(fixtureUrl, 'utf8')
    const lowercase = `idb1:${uppercase.slice('IDB1:'.length)}`
    storage.files.set('/legacy', lowercase)
    storage.candidates = [{
      id: 'historical-lowercase-unity',
      sourcePath: '/legacy',
      text: lowercase,
    }]
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      decodeIdb1SaveRoot,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({
        status: 'migrated',
        source: { id: 'historical-lowercase-unity', text: lowercase },
      })
    expect(storage.files.get('/recovery/original-idb1.txt')).toBe(
      lowercase,
    )
    expect(storage.files.get('/current')).toMatch(/^IDSWEB1:/)
    expect((await repository.loadCurrent())?.targetSchema).toBe(12)
  })

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

  test('adopts legacy notation only after a successful automatic migration commit', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/legacy', 'IDB1:test')
    storage.candidates = [
      { id: 'canonical-unity', sourcePath: '/legacy', text: 'IDB1:test' },
    ]
    const adopter = {
      adoptLegacyUnityNumberFormatting: vi.fn(() => true),
    }
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12, numberFormatting: 2 }),
      { allowCanonicalPlayerWrites: false },
      undefined,
      adopter,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'migrated' })
    expect(adopter.adoptLegacyUnityNumberFormatting).toHaveBeenCalledOnce()
    expect(adopter.adoptLegacyUnityNumberFormatting).toHaveBeenCalledWith(2)

    await repository.migrateLegacyOnFirstLaunch()
    expect(adopter.adoptLegacyUnityNumberFormatting).toHaveBeenCalledOnce()
  })

  test('does not adopt legacy notation when automatic migration fails to commit', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/legacy', 'IDB1:test')
    storage.candidates = [
      { id: 'canonical-unity', sourcePath: '/legacy', text: 'IDB1:test' },
    ]
    storage.failAt = 'replace'
    const adopter = {
      adoptLegacyUnityNumberFormatting: vi.fn(() => true),
    }
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12, numberFormatting: 1 }),
      { allowCanonicalPlayerWrites: false },
      undefined,
      adopter,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'recovery-write-failed' })
    expect(adopter.adoptLegacyUnityNumberFormatting).not.toHaveBeenCalled()
  })

  test('keeps a committed migration when optional notation adoption throws', async () => {
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
      () => ({ saveVersion: 12, numberFormatting: 1 }),
      { allowCanonicalPlayerWrites: false },
      undefined,
      {
        adoptLegacyUnityNumberFormatting: () => {
          throw new Error('optional storage unavailable')
        },
      },
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'migrated' })
    expect(storage.files.get('/current')).toMatch(/^IDSWEB1:/)
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

  test('rejects a different valid payload returned by temporary read-back', async () => {
    const storage = new MemoryStorage()
    const currentBytes = serializeWebSave({
      saveVersion: 12,
      checkpointMarker: 'current',
    })
    storage.files.set('/current', currentBytes)
    storage.substituteTemporaryRead = serializeWebSave({
      saveVersion: 12,
      checkpointMarker: 'different-valid-save',
    })
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

  test('does not replace current when the candidate contains a lossy graph value', async () => {
    const storage = new MemoryStorage()
    const currentBytes = serializeWebSave({
      saveVersion: 12,
      checkpointMarker: 'current',
    })
    storage.files.set('/current', currentBytes)
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
          unknownForwardField: undefined,
        }),
      ),
    ).rejects.toThrow('undefined')
    expect(storage.replacements).toEqual([])
    expect(storage.files.get('/current')).toBe(currentBytes)
  })

  test('does not replace current when a source object collides with a codec tag', async () => {
    const storage = new MemoryStorage()
    const currentBytes = serializeWebSave({
      saveVersion: 12,
      checkpointMarker: 'current',
    })
    storage.files.set('/current', currentBytes)
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
          unknownForwardField: { $bigint: '123' },
        }),
      ),
    ).rejects.toThrow('reserved codec tags')
    expect(storage.replacements).toEqual([])
    expect(storage.files.get('/current')).toBe(currentBytes)
  })

  test('promotes same-device Unity Double IP evidence only during first migration', async () => {
    const storage = new MemoryStorage()
    storage.files.set('unity-readonly:canonical-unity', 'unity-paid')
    storage.candidates = [
      {
        id: 'canonical-unity',
        sourcePath: 'unity-readonly:canonical-unity',
        text: 'unity-paid',
        provenance: {
          kind: 'automatic-same-device-unity',
          platform: 'windows',
          sourceClass: 'unity-persistent-data-save',
          opaqueSourceIdentifier: 'canonical-unity',
          pathClass: 'unity-local-low',
        },
      },
    ]
    const promoted: Array<Record<string, unknown>> = []
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12, doubleIp: true }),
      { allowCanonicalPlayerWrites: false },
      {
        promoteAutomaticUnityPurchaseEvidence: async (evidence) => {
          promoted.push({ ...evidence })
        },
      },
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'migrated',
    })
    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'already-migrated',
    })
    expect(promoted).toEqual([expect.objectContaining({
      permanentDoubleInfinityPoints: true,
      platform: 'windows',
      sourceClass: 'unity-persistent-data-save',
      opaqueSourceIdentifier: 'canonical-unity',
      pathClass: 'unity-local-low',
      saveSchemaVersion: 12,
      contentSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    })])
  })

  test('does not invoke purchase promotion without affirmative Unity evidence', async () => {
    const storage = new MemoryStorage()
    storage.files.set('unity-readonly:canonical-unity', 'unity-unpaid')
    storage.candidates = [
      {
        id: 'canonical-unity',
        sourcePath: 'unity-readonly:canonical-unity',
        text: 'unity-unpaid',
        provenance: {
          kind: 'automatic-same-device-unity',
          platform: 'windows',
          sourceClass: 'unity-persistent-data-save',
          opaqueSourceIdentifier: 'canonical-unity',
          pathClass: 'unity-local-low',
        },
      },
    ]
    const promote = vi.fn(async () => undefined)
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12, doubleIp: false }),
      { allowCanonicalPlayerWrites: false },
      { promoteAutomaticUnityPurchaseEvidence: promote },
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'migrated',
    })
    expect(promote).not.toHaveBeenCalled()
  })

  test('never promotes a rediscovered browser import carrying Double IP', async () => {
    const storage = new MemoryStorage()
    storage.files.set('browser-import/retained-import', 'shared-paid-claim')
    storage.candidates = [{
      id: 'retained-import',
      sourcePath: 'browser-import/retained-import',
      text: 'shared-paid-claim',
      provenance: { kind: 'browser-retained-import' },
    }]
    const promote = vi.fn(async () => undefined)
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12, doubleIp: true }),
      { allowCanonicalPlayerWrites: false },
      { promoteAutomaticUnityPurchaseEvidence: promote },
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'migrated',
      source: { id: 'retained-import' },
    })
    expect(promote).not.toHaveBeenCalled()
  })

  test('rotates three verified backups before publishing a replacement', async () => {
    const storage = new MemoryStorage()
    storage.files.set(
      '/current',
      serializeWebSave({ saveVersion: 12, slot: 4 }),
    )
    storage.files.set(
      '/current.backup.1',
      serializeWebSave({ saveVersion: 12, slot: 3 }),
    )
    storage.files.set(
      '/current.backup.2',
      serializeWebSave({ saveVersion: 12, slot: 2 }),
    )
    storage.files.set(
      '/current.backup.3',
      serializeWebSave({ saveVersion: 12, slot: 1 }),
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

    await repository.commit(
      PreparedSave.fromDecoded({ saveVersion: 12, slot: 5 }),
    )

    expect(storage.files.get('/current.backup.1')).toBe(
      serializeWebSave({ saveVersion: 12, slot: 4 }),
    )
    expect(storage.files.get('/current.backup.2')).toBe(
      serializeWebSave({ saveVersion: 12, slot: 3 }),
    )
    expect(storage.files.get('/current.backup.3')).toBe(
      serializeWebSave({ saveVersion: 12, slot: 2 }),
    )
    expect(
      (await repository.loadCurrent())?.copyValidatedState().slot,
    ).toBe(5)
  })

  test('does not replace current when backup rotation fails', async () => {
    const storage = new MemoryStorage()
    const current = serializeWebSave({ saveVersion: 12, slot: 'current' })
    storage.files.set('/current', current)
    storage.failAt = 'copy'
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
        PreparedSave.fromDecoded({ saveVersion: 12, slot: 'candidate' }),
      ),
    ).rejects.toThrow('backup copy failed')
    expect(storage.files.get('/current')).toBe(current)
    expect(storage.replacements).toEqual([])
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

  test('blocks downgrade recovery when the newest readable backup has a future schema', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current', '{')
    storage.files.set(
      '/current.backup.1',
      serializeWebSave({ saveVersion: 13 }),
    )
    storage.files.set(
      '/current.backup.2',
      serializeWebSave({ saveVersion: 12, slot: 'older' }),
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

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'unsupported-future-version',
      source: 'backup',
    })
    expect(storage.replacements).toEqual([])
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
  })

  test('treats publication failure during valid backup recovery as terminal', async () => {
    const storage = new MemoryStorage()
    storage.files.set(
      '/current.backup.1',
      serializeWebSave({ saveVersion: 12, slot: 'recovered' }),
    )
    storage.failAt = 'write'
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
      status: 'recovery-write-failed',
      source: {
        id: 'web-backup',
        sourcePath: '/current.backup.1',
      },
      error: 'temporary write failed',
    })
    expect(storage.replacements).toEqual([])
  })

  test('stops fallback when the current save has a future schema', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current', serializeWebSave({ saveVersion: 13 }))
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
  })

  test('stops on an encountered future legacy candidate', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/future', 'future')
    storage.files.set('/valid', 'valid')
    storage.candidates = [
      { id: 'future', sourcePath: '/future', text: 'future' },
      { id: 'valid', sourcePath: '/valid', text: 'valid' },
    ]
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      (text) => ({ saveVersion: text === 'future' ? 13 : 12 }),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'unsupported-future-version',
      source: 'legacy',
      candidate: { id: 'future' },
    })
    expect(storage.copies).toEqual([])
    expect(storage.replacements).toEqual([])
  })

  test('classifies a valid recovery candidate write failure as terminal', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/legacy', 'good')
    storage.candidates = [
      { id: 'legacy', sourcePath: '/legacy', text: 'good' },
    ]
    storage.failAt = 'write'
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
      status: 'recovery-write-failed',
      source: { id: 'legacy' },
      error: 'temporary write failed',
    })
    expect(storage.replacements).toEqual([])
  })
})
