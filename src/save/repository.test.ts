import { readFileSync } from 'node:fs'
import { describe, expect, test, vi } from 'vitest'
import { decodeIdb1SaveRoot } from './decodeIdb1'
import { prepareImportedSaveText } from './import'
import { PreparedSave } from './prepare'
import {
  PortableSaveRepository,
  UnreadableTransitionalCheckpointError,
  type LegacySaveCandidate,
  type SaveStorageAdapter,
} from './repository'
import { serializeWebSave } from './serialization'
import { packSettingsFlags } from './settingsFlags'
import { dehydrateGameState, hydrateGameState } from '../game-state/mapping'
import { upgradeStoredTimeCapacity } from '../simulation/timeResources'

const fixtureUrl = new URL(
  '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
  import.meta.url,
)

class MemoryStorage implements SaveStorageAdapter {
  readonly files = new Map<string, string>()
  readonly unprobeablePaths = new Set<string>()
  readonly unreadablePaths = new Set<string>()
  candidates: readonly LegacySaveCandidate[] = []
  replacements: Array<[string, string]> = []
  copies: Array<[string, string]> = []
  failAt: 'write' | 'read-temporary' | 'copy' | 'replace' | null = null
  corruptTemporaryRead = false
  substituteTemporaryRead: string | null = null

  async exists(path: string): Promise<boolean> {
    if (this.unprobeablePaths.has(path)) {
      throw new Error(`Cannot inspect ${path}`)
    }
    return this.files.has(path)
  }

  async readText(path: string): Promise<string> {
    if (this.unreadablePaths.has(path)) {
      throw new Error(`Unreadable ${path}`)
    }
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
  test('preserves the reported 64-to-128-day upgrade through export, import, checkpoint, and reload', async () => {
    const storage = new MemoryStorage()
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      decodeIdb1SaveRoot,
    )
    const sixtyFourDays = 64 * 86_400
    const source = PreparedSave.fromDecoded({
      saveVersion: 12,
      offlineTime: sixtyFourDays,
      maxOfflineTime: sixtyFourDays,
    })
    const session = hydrateGameState(source)
    const upgraded = upgradeStoredTimeCapacity({
      bankSeconds: session.state.timeline.storedTimeAvailableSeconds,
      capacitySeconds: session.state.timeline.storedTimeCapacitySeconds,
      cheater: false,
    })
    expect(upgraded).toMatchObject({
      upgraded: true,
      bankSeconds: 0,
      capacitySeconds: 128 * 86_400,
    })

    const exported = serializeWebSave(dehydrateGameState(session, {
      ...session.state,
      timeline: {
        ...session.state.timeline,
        storedTimeAvailableSeconds: upgraded.bankSeconds,
        storedTimeCapacitySeconds: upgraded.capacitySeconds,
      },
    }).copyValidatedState())
    const imported = prepareImportedSaveText(
      exported,
      '2026-08-27T00:00:00.000Z',
    )
    expect(hydrateGameState(imported).state.timeline).toMatchObject({
      storedTimeAvailableSeconds: 0,
      storedTimeCapacitySeconds: 128 * 86_400,
    })

    await repository.commit(imported)
    const reloaded = hydrateGameState((await repository.loadCurrent())!)

    expect(reloaded.state.timeline).toMatchObject({
      storedTimeAvailableSeconds: 0,
      storedTimeCapacitySeconds: 128 * 86_400,
    })
  })

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
    expect((await repository.loadCurrent())?.targetSchema).toBe(14)
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

  test('adopts legacy presentation preferences only after a successful automatic migration commit', async () => {
    const storage = new MemoryStorage()
    storage.files.set('unity-readonly:canonical-unity', 'IDB1:test')
    storage.candidates = [
      {
        id: 'canonical-unity',
        sourcePath: 'unity-readonly:canonical-unity',
        text: 'IDB1:test',
        provenance: {
          kind: 'automatic-same-device-unity',
          platform: 'android',
          sourceClass: 'unity-persistent-data-save',
          opaqueSourceIdentifier: 'canonical-unity',
          pathClass: 'capacitor-external-files',
        },
      },
    ]
    const adopter = {
      adoptLegacyUnityNumberFormatting: vi.fn(() => true),
    }
    const visibilityAdopter = {
      adoptLegacyUnityHidePurchased: vi.fn(() => true),
    }
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12, numberFormatting: 2, hidePurchased: true }),
      { allowCanonicalPlayerWrites: false },
      undefined,
      adopter,
      visibilityAdopter,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'migrated' })
    expect(adopter.adoptLegacyUnityNumberFormatting).toHaveBeenCalledOnce()
    expect(adopter.adoptLegacyUnityNumberFormatting).toHaveBeenCalledWith(2)
    expect(visibilityAdopter.adoptLegacyUnityHidePurchased).toHaveBeenCalledWith(true)

    await repository.migrateLegacyOnFirstLaunch()
    expect(adopter.adoptLegacyUnityNumberFormatting).toHaveBeenCalledOnce()
    expect(visibilityAdopter.adoptLegacyUnityHidePurchased).toHaveBeenCalledOnce()
  })

  test.each([
    {
      label: 'absent',
      decoded: { saveVersion: 12 },
    },
    {
      label: 'malformed',
      decoded: {
        saveVersion: 12,
        numberFormatting: '2',
        hidePurchased: 'true',
      },
    },
  ])('does not adopt migration-generated defaults when raw Unity preferences are $label', async ({ decoded }) => {
    const storage = new MemoryStorage()
    storage.files.set('unity-readonly:canonical-unity', 'IDB1:test')
    storage.candidates = [verifiedUnityCandidate()]
    const notationAdopter = {
      adoptLegacyUnityNumberFormatting: vi.fn(() => true),
    }
    const visibilityAdopter = {
      adoptLegacyUnityHidePurchased: vi.fn(() => true),
    }
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => decoded,
      { allowCanonicalPlayerWrites: false },
      undefined,
      notationAdopter,
      visibilityAdopter,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'migrated' })
    expect(notationAdopter.adoptLegacyUnityNumberFormatting).not.toHaveBeenCalled()
    expect(visibilityAdopter.adoptLegacyUnityHidePurchased).not.toHaveBeenCalled()
  })

  test('preserves an explicit false Unity Research visibility preference', async () => {
    const storage = new MemoryStorage()
    storage.files.set('unity-readonly:canonical-unity', 'IDB1:test')
    storage.candidates = [verifiedUnityCandidate()]
    const visibilityAdopter = {
      adoptLegacyUnityHidePurchased: vi.fn(() => true),
    }
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12, hidePurchased: false }),
      { allowCanonicalPlayerWrites: false },
      undefined,
      undefined,
      visibilityAdopter,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'migrated' })
    expect(visibilityAdopter.adoptLegacyUnityHidePurchased)
      .toHaveBeenCalledExactlyOnceWith(false)
  })

  test.each([
    {
      label: 'unprovenanced recovery candidate',
      id: 'legacy',
      sourcePath: '/legacy',
      provenance: undefined,
    },
    {
      label: 'browser-retained import',
      id: 'legacy',
      sourcePath: '/legacy',
      provenance: { kind: 'browser-retained-import' as const },
    },
    {
      label: 'mismatched native bridge path',
      id: 'canonical-unity',
      sourcePath: 'unity-readonly:different-source',
      provenance: {
        kind: 'automatic-same-device-unity' as const,
        platform: 'android' as const,
        sourceClass: 'unity-persistent-data-save' as const,
        opaqueSourceIdentifier: 'canonical-unity',
        pathClass: 'capacitor-external-files' as const,
      },
    },
    {
      label: 'mismatched candidate identity',
      id: 'different-source',
      sourcePath: 'unity-readonly:canonical-unity',
      provenance: {
        kind: 'automatic-same-device-unity' as const,
        platform: 'android' as const,
        sourceClass: 'unity-persistent-data-save' as const,
        opaqueSourceIdentifier: 'canonical-unity',
        pathClass: 'capacitor-external-files' as const,
      },
    },
  ])('does not adopt presentation preferences from $label', async (candidate) => {
    const storage = new MemoryStorage()
    storage.files.set(candidate.sourcePath, 'IDB1:test')
    storage.candidates = [{
      id: candidate.id,
      sourcePath: candidate.sourcePath,
      text: 'IDB1:test',
      provenance: candidate.provenance,
    }]
    const adopter = {
      adoptLegacyUnityNumberFormatting: vi.fn(() => true),
    }
    const visibilityAdopter = {
      adoptLegacyUnityHidePurchased: vi.fn(() => true),
    }
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12, numberFormatting: 2, hidePurchased: true }),
      { allowCanonicalPlayerWrites: false },
      undefined,
      adopter,
      visibilityAdopter,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'migrated' })
    expect(adopter.adoptLegacyUnityNumberFormatting).not.toHaveBeenCalled()
    expect(visibilityAdopter.adoptLegacyUnityHidePurchased).not.toHaveBeenCalled()
  })

  test('does not adopt legacy notation when automatic migration fails to commit', async () => {
    const storage = new MemoryStorage()
    storage.files.set('unity-readonly:canonical-unity', 'IDB1:test')
    storage.candidates = [
      {
        id: 'canonical-unity',
        sourcePath: 'unity-readonly:canonical-unity',
        text: 'IDB1:test',
        provenance: {
          kind: 'automatic-same-device-unity',
          platform: 'android',
          sourceClass: 'unity-persistent-data-save',
          opaqueSourceIdentifier: 'canonical-unity',
          pathClass: 'capacitor-external-files',
        },
      },
    ]
    storage.failAt = 'replace'
    const adopter = {
      adoptLegacyUnityNumberFormatting: vi.fn(() => true),
    }
    const visibilityAdopter = {
      adoptLegacyUnityHidePurchased: vi.fn(() => true),
    }
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12, numberFormatting: 1, hidePurchased: false }),
      { allowCanonicalPlayerWrites: false },
      undefined,
      adopter,
      visibilityAdopter,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'recovery-write-failed' })
    expect(adopter.adoptLegacyUnityNumberFormatting).not.toHaveBeenCalled()
    expect(visibilityAdopter.adoptLegacyUnityHidePurchased).not.toHaveBeenCalled()
  })

  test('keeps a committed migration when optional notation adoption throws', async () => {
    const storage = new MemoryStorage()
    storage.files.set('unity-readonly:canonical-unity', 'IDB1:test')
    storage.candidates = [
      {
        id: 'canonical-unity',
        sourcePath: 'unity-readonly:canonical-unity',
        text: 'IDB1:test',
        provenance: {
          kind: 'automatic-same-device-unity',
          platform: 'android',
          sourceClass: 'unity-persistent-data-save',
          opaqueSourceIdentifier: 'canonical-unity',
          pathClass: 'capacitor-external-files',
        },
      },
    ]
    const visibilityAdopter = {
      adoptLegacyUnityHidePurchased: vi.fn(() => true),
    }
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12, numberFormatting: 1, hidePurchased: false }),
      { allowCanonicalPlayerWrites: false },
      undefined,
      {
        adoptLegacyUnityNumberFormatting: () => {
          throw new Error('optional storage unavailable')
        },
      },
      visibilityAdopter,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'migrated' })
    expect(storage.files.get('/current')).toMatch(/^IDSWEB1:/)
    expect(visibilityAdopter.adoptLegacyUnityHidePurchased)
      .toHaveBeenCalledExactlyOnceWith(false)
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
    expect(prepared?.targetSchema).toBe(14)
    expect(prepared?.copyState().saveVersion).toBe(14)
  })

  test('rejects a future-schema current save before publication', async () => {
    const storage = new MemoryStorage()
    storage.files.set(
      '/current',
      serializeWebSave({ saveVersion: 15 }),
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
      saveSchemaVersion: 14,
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

  test('recovers a retained canonical Web export as well as Unity IDB1 text', async () => {
    const storage = new MemoryStorage()
    const retained = serializeWebSave({
      saveVersion: 12,
      slot: 'retained-web-export',
    })
    storage.files.set('/retained-web', retained)
    storage.candidates = [{
      id: 'retained-web',
      sourcePath: '/retained-web',
      text: retained,
      provenance: { kind: 'browser-retained-import' },
    }]
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original.idsw',
      },
      decodeIdb1SaveRoot,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'migrated',
      source: { id: 'retained-web' },
    })
    expect(
      (await repository.loadCurrent())?.copyValidatedState().slot,
    ).toBe('retained-web-export')
    expect(storage.files.get('/recovery/original.idsw')).toBe(retained)
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

  test('keeps a valid current save when a transitional backup is damaged', async () => {
    const storage = new MemoryStorage()
    const current = serializeWebSave({ saveVersion: 12, slot: 'current' })
    storage.files.set('/current', current)
    storage.files.set('/current.backup.1', 'damaged-v2-checkpoint')
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12 }),
      undefined,
      undefined,
      undefined,
      undefined,
      () => {
        throw new UnreadableTransitionalCheckpointError(
          'damaged transitional checkpoint',
        )
      },
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'already-migrated',
      save: expect.any(PreparedSave),
    })
    expect(storage.files.get('/current')).toBe(current)
    expect(storage.replacements).toEqual([])
    expect(storage.copies).toEqual([])
  })

  test('ignores an unreadable optional V2 Stored Time policy sidecar', async () => {
    const storage = new MemoryStorage()
    storage.files.set(
      '/current',
      serializeWebSave({ saveVersion: 12, slot: 'current' }),
    )
    vi.spyOn(storage, 'exists').mockImplementation(async (path) => {
      if (path === '/local/stored-time-policy.json') {
        throw new Error('optional sidecar unavailable')
      }
      return storage.files.has(path)
    })
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
        transitionalStoredTimePolicy: '/local/stored-time-policy.json',
      },
      () => ({ saveVersion: 12 }),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'already-migrated' })
    expect(storage.files.get('/current')).toBeDefined()
  })

  test('keeps a valid current save when a transitional backup cannot be represented', async () => {
    const storage = new MemoryStorage()
    storage.files.set(
      '/current',
      serializeWebSave({ saveVersion: 12, slot: 'current' }),
    )
    storage.files.set('/current.backup.1', 'recognized-v2-checkpoint')
    const recover = vi.fn(() => {
      throw new Error('V2 progress exceeds the current numeric model')
    })
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12 }),
      undefined,
      undefined,
      undefined,
      undefined,
      recover,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'already-migrated' })
    expect(recover).not.toHaveBeenCalled()
    expect(storage.replacements).toEqual([])
  })

  test('does not overlay a historical V2 backup onto an unmarked valid current save', async () => {
    const storage = new MemoryStorage()
    const current = serializeWebSave({ saveVersion: 12, slot: 'current' })
    storage.files.set('/current', current)
    storage.files.set('/historical/backups/current.1.idsw', 'v2-checkpoint')
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
        transitionalRecoverySources: [
          '/historical/backups/current.1.idsw',
        ],
      },
      () => ({ saveVersion: 12 }),
      undefined,
      undefined,
      undefined,
      undefined,
      (text) => text === 'v2-checkpoint'
        ? PreparedSave.fromDecoded({ saveVersion: 12, slot: 'v2' })
        : null,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'already-migrated' })
    expect(storage.files.get('/historical/backups/current.1.idsw'))
      .toBe('v2-checkpoint')
    expect(storage.files.get('/current')).toBe(current)
    expect(storage.copies).toEqual([])
  })

  test('does not overlay an unclocked V2 backup onto a valid current-format backup', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current', 'damaged-v2-current')
    storage.files.set(
      '/current.backup.1',
      serializeWebSave({ saveVersion: 12, slot: 'older-current-backup' }),
    )
    storage.files.set('/historical/backups/current.1.idsw', 'valid-v2-backup')
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        transitionalRecoverySources: [
          '/historical/backups/current.1.idsw',
        ],
      },
      () => ({ saveVersion: 12 }),
      undefined,
      undefined,
      undefined,
      undefined,
      (text, base) => {
        if (text === 'damaged-v2-current') {
          throw new UnreadableTransitionalCheckpointError('truncated V2')
        }
        if (text !== 'valid-v2-backup') return null
        const source = base.copyValidatedState()
        source.slot = 'newer-v2-backup'
        return base.withValidatedState(source)
      },
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({
        status: 'recovered-backup',
        sourcePath: '/current.backup.1',
      })
    expect(
      (await repository.loadCurrent())?.copyValidatedState().slot,
    ).toBe('older-current-backup')
    expect(storage.files.get('/recovery/rejected-current.idsw'))
      .toBe('damaged-v2-current')
  })

  test('uses a recognized active V2 checkpoint over its older current-format backup', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current', 'valid-active-v2')
    storage.files.set(
      '/current.backup.1',
      serializeWebSave({ saveVersion: 12, slot: 'older-current-backup' }),
    )
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
      },
      () => ({ saveVersion: 12 }),
      undefined,
      undefined,
      undefined,
      undefined,
      (text, base) => {
        if (text !== 'valid-active-v2') return null
        const source = base.copyValidatedState()
        source.slot = 'active-v2'
        return base.withValidatedState(source)
      },
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({
        status: 'recovered-backup',
        sourcePath: '/current',
      })
    expect(
      (await repository.loadCurrent())?.copyValidatedState().slot,
    ).toBe('active-v2')
    expect(storage.files.get('/recovery/rejected-current.idsw'))
      .toBe('valid-active-v2')
  })

  test('uses a newer V2 slot from the same rotation over its older canonical base', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current', 'damaged-current')
    storage.files.set('/current.backup.1', 'valid-newer-v2')
    storage.files.set(
      '/current.backup.2',
      serializeWebSave({ saveVersion: 12, slot: 'older-canonical-base' }),
    )
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
      },
      () => ({ saveVersion: 12 }),
      undefined,
      undefined,
      undefined,
      undefined,
      (text, base) => {
        if (text === 'damaged-current') {
          throw new UnreadableTransitionalCheckpointError('damaged current')
        }
        if (text !== 'valid-newer-v2') return null
        const source = base.copyValidatedState()
        source.slot = 'newer-v2-over-canonical-base'
        return base.withValidatedState(source)
      },
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({
        status: 'recovered-backup',
        sourcePath: '/current.backup.1',
      })
    expect(
      (await repository.loadCurrent())?.copyValidatedState().slot,
    ).toBe('newer-v2-over-canonical-base')
  })

  test('uses a V2 checkpoint in the shared native backup namespace with a retained base', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current', 'damaged-v2-current')
    storage.files.set('/current.backup.1', 'valid-v2-backup')
    storage.files.set(
      '/recovery/pre-schema13.idsw',
      serializeWebSave({ saveVersion: 12, slot: 'retained-base' }),
    )
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        retainedRecoverySources: ['/recovery/pre-schema13.idsw'],
      },
      () => ({ saveVersion: 12 }),
      undefined,
      undefined,
      undefined,
      undefined,
      (text, base) => {
        if (text === 'damaged-v2-current') {
          throw new UnreadableTransitionalCheckpointError('truncated V2')
        }
        if (text !== 'valid-v2-backup') return null
        const source = base.copyValidatedState()
        source.slot = 'native-v2-backup'
        return base.withValidatedState(source)
      },
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({
        status: 'recovered-backup',
        sourcePath: '/current.backup.1',
      })
    expect(
      (await repository.loadCurrent())?.copyValidatedState().slot,
    ).toBe('native-v2-backup')
  })

  test('recovers a V2 backup from a deterministic base when the current save is absent', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current.backup.1', 'valid-v2-backup')
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      (text, base) => {
        if (text !== 'valid-v2-backup') return null
        const source = base.copyValidatedState()
        source.recoveredV2Progress = 41
        return base.withValidatedState(source)
      },
      () => PreparedSave.fromDecoded({ saveVersion: 12 }),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({
        status: 'recovered-backup',
        sourcePath: '/current.backup.1',
      })
    expect(
      (await repository.loadCurrent())?.copyValidatedState()
        .recoveredV2Progress,
    ).toBe(41)
  })

  test('skips an unreadable transitional artifact and recovers an older V2 checkpoint', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/newest-v2', 'unreadable-v2')
    storage.files.set('/older-v2', 'valid-v2')
    storage.unreadablePaths.add('/newest-v2')
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        transitionalRecoverySources: ['/newest-v2', '/older-v2'],
      },
      () => ({ saveVersion: 12 }),
      undefined,
      undefined,
      undefined,
      undefined,
      (text, base) => {
        if (text !== 'valid-v2') return null
        const source = base.copyValidatedState()
        source.recoveredV2Progress = 43
        return base.withValidatedState(source)
      },
      () => PreparedSave.fromDecoded({ saveVersion: 12 }),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({
        status: 'recovered-backup',
        sourcePath: '/older-v2',
      })
  })

  test('skips an optional backup whose existence cannot be inspected', async () => {
    const storage = new MemoryStorage()
    storage.unprobeablePaths.add('/current.backup.1')
    storage.files.set('/current.backup.2', serializeWebSave({
      saveVersion: 12,
      slot: 'older-readable-backup',
    }))
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
      },
      () => ({ saveVersion: 12 }),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({
        status: 'recovered-backup',
        sourcePath: '/current.backup.2',
      })
    expect(
      (await repository.loadCurrent())?.copyValidatedState().slot,
    ).toBe('older-readable-backup')
  })

  test('skips an unreadable retained artifact and recovers an older retained save', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/newest-retained', 'unreadable-retained')
    storage.files.set(
      '/older-retained',
      serializeWebSave({ saveVersion: 12, slot: 'older-retained' }),
    )
    storage.unreadablePaths.add('/newest-retained')
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        retainedRecoverySources: ['/newest-retained', '/older-retained'],
      },
      () => ({ saveVersion: 12 }),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({
        status: 'recovered-backup',
        sourcePath: '/older-retained',
      })
    expect(
      (await repository.loadCurrent())?.copyValidatedState().slot,
    ).toBe('older-retained')
  })

  test('recovers a V2-first player from a deterministic base when no earlier save exists', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current', 'schema13-current-only')
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
      },
      () => {
        throw new Error('not a legacy save')
      },
      undefined,
      undefined,
      undefined,
      undefined,
      (text, base) => {
        if (text !== 'schema13-current-only') return null
        const source = base.copyValidatedState()
        source.recoveredV2Progress = 42
        return base.withValidatedState(source)
      },
      () => PreparedSave.fromDecoded({ saveVersion: 12 }),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'recovered-backup',
      sourcePath: '/current',
    })
    expect(storage.files.get('/recovery/rejected-current.idsw'))
      .toBe('schema13-current-only')
    expect(
      (await repository.loadCurrent())?.copyValidatedState()
        .recoveredV2Progress,
    ).toBe(42)
  })

  test('retains rejected V2 bytes and keeps V2 preferences when a legacy base is overlaid', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current', 'recognized-v2-current')
    storage.files.set('/legacy', 'legacy-base')
    storage.candidates = [verifiedUnityCandidate()]
    const notationAdopter = {
      adoptLegacyUnityNumberFormatting: vi.fn(() => true),
      restoreTransitionalV2NumberFormatting: vi.fn(() => true),
    }
    const visibilityAdopter = {
      adoptLegacyUnityHidePurchased: vi.fn(() => true),
      restoreTransitionalV2HidePurchased: vi.fn(() => true),
    }
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
      },
      () => ({
        saveVersion: 12,
        numberFormatting: 2,
        hidePurchased: false,
      }),
      undefined,
      undefined,
      notationAdopter,
      visibilityAdopter,
      (text, base) => {
        if (text !== 'recognized-v2-current') return null
        const source = base.copyValidatedState()
        source.recoveredV2Progress = 99
        source.numberFormatting = 1
        source.hidePurchased = true
        packSettingsFlags(source)
        return Object.freeze({
          save: base.withValidatedState(source),
          devicePreferences: Object.freeze({
            numberFormatting: 1,
            hidePurchased: true,
          }),
        })
      },
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'migrated' })
    expect(storage.files.get('/recovery/rejected-current.idsw'))
      .toBe('recognized-v2-current')
    expect(
      (await repository.loadCurrent())?.copyValidatedState(),
    ).toMatchObject({
      recoveredV2Progress: 99,
      numberFormatting: 1,
    })
    expect(notationAdopter.adoptLegacyUnityNumberFormatting)
      .not.toHaveBeenCalled()
    expect(visibilityAdopter.adoptLegacyUnityHidePurchased)
      .not.toHaveBeenCalled()
    expect(notationAdopter.restoreTransitionalV2NumberFormatting)
      .toHaveBeenCalledWith(1)
    expect(visibilityAdopter.restoreTransitionalV2HidePurchased)
      .toHaveBeenCalledWith(true)
  })

  test('preserves the durable Dyson evaluation snapshot through commit and reload', async () => {
    const storage = new MemoryStorage()
    const base = PreparedSave.fromDecoded({ saveVersion: 12 })
    const source = base.copyValidatedState()
    const infinity = (
      source.dysonVerseSaveData as Record<string, Record<string, unknown>>
    ).dysonVerseInfinityData
    Object.assign(infinity, {
      panelsPerSec: 11,
      panelLifetime: 12,
      scienceMulti: 13,
      rudimentrySingularityProduction: 14,
      pocketDimensionsProduction: 15,
      scientificPlanetsProduction: 16,
      managerAssemblyLineProduction: 17,
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

    await repository.commit(base.withValidatedState(source))
    const reloaded = await repository.loadCurrent()

    expect(reloaded).not.toBeNull()
    expect(hydrateGameState(reloaded!).skillEffectEvaluationSnapshot).toEqual({
      panelsPerSecond: 11,
      panelLifetimeSeconds: 12,
      scienceMultiplier: 13,
      rudimentarySingularityProduction: 14,
      pocketDimensionsProduction: 15,
      scientificPlanetsProduction: 16,
      managerAssemblyLineProduction: 17,
    })
  })

  test('keeps a valid current save ahead of a readable transitional backup', async () => {
    const storage = new MemoryStorage()
    const current = serializeWebSave({ saveVersion: 12, slot: 'current' })
    storage.files.set('/current', current)
    storage.files.set('/current.backup.1', 'transitional-checkpoint')
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12 }),
      undefined,
      undefined,
      undefined,
      undefined,
      (text) => text === 'transitional-checkpoint'
        ? PreparedSave.fromDecoded({ saveVersion: 12, slot: 'recovered-v2' })
        : null,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'already-migrated' })
    expect(storage.files.get('/current.backup.1'))
      .toBe('transitional-checkpoint')
    expect(
      (await repository.loadCurrent())?.copyValidatedState().slot,
    ).toBe('current')
    expect(storage.copies).toEqual([])
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
    expect(storage.files.get('/recovery/original-idb1.txt')).toBe('{')
    expect(storage.files.get('/legacy')).toBe('good')
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

  test('recovers an exact source retained by an earlier canonical migration', async () => {
    const storage = new MemoryStorage()
    const rejectedCheckpoint = JSON.stringify({
      format: 'ids-web-production-v2-checkpoint-v1',
      portableSave: 'IDSWEB1:experimental-v2',
    })
    const retained = serializeWebSave({
      saveVersion: 12,
      slot: 'before-schema-13',
    })
    storage.files.set('/current', rejectedCheckpoint)
    storage.files.set('/recovery/pre-schema13.idsw', retained)
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
        retainedRecoverySources: ['/recovery/pre-schema13.idsw'],
      },
      decodeIdb1SaveRoot,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'recovered-backup',
      sourcePath: '/recovery/pre-schema13.idsw',
    })
    expect(
      (await repository.loadCurrent())?.copyValidatedState().slot,
    ).toBe('before-schema-13')
    expect(storage.files.get('/recovery/rejected-current.idsw')).toBe(
      rejectedCheckpoint,
    )
    expect(storage.files.get('/recovery/pre-schema13.idsw')).toBe(retained)
  })

  test('reports the rejected current save instead of masking it with an unrelated legacy failure', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current', JSON.stringify({
      format: 'ids-web-production-v2-checkpoint-v1',
    }))
    storage.files.set('/legacy', 'not-idb1')
    storage.candidates = [{
      id: 'unrelated-import',
      sourcePath: '/legacy',
      text: 'not-idb1',
    }]
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/rejected-current.idsw',
      },
      decodeIdb1SaveRoot,
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toEqual({
      status: 'current-invalid',
      error: 'Unsupported web save envelope ids-web-production-v2-checkpoint-v1.',
    })
    expect(storage.files.get('/recovery/rejected-current.idsw')).toBe(
      storage.files.get('/current'),
    )
  })

  test('blocks downgrade recovery when the newest readable backup has a future schema', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current', '{')
    storage.files.set(
      '/current.backup.1',
      serializeWebSave({ saveVersion: 15 }),
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

  test('retains a legacy source when only an invalid backup caused the startup error', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current.backup.1', 'invalid backup')
    storage.files.set('/legacy', 'IDB1:legacy')
    storage.candidates = [{
      id: 'legacy',
      sourcePath: '/legacy',
      text: 'IDB1:legacy',
    }]
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12 }),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves
      .toMatchObject({ status: 'migrated' })
    expect(storage.files.get('/recovery/original-idb1.txt'))
      .toBe('IDB1:legacy')
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
    storage.files.set('/current', serializeWebSave({ saveVersion: 15 }))
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
      (text) => ({ saveVersion: text === 'future' ? 15 : 12 }),
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

function verifiedUnityCandidate(): LegacySaveCandidate {
  return {
    id: 'canonical-unity',
    sourcePath: 'unity-readonly:canonical-unity',
    text: 'IDB1:test',
    provenance: {
      kind: 'automatic-same-device-unity',
      platform: 'android',
      sourceClass: 'unity-persistent-data-save',
      opaqueSourceIdentifier: 'canonical-unity',
      pathClass: 'capacitor-external-files',
    },
  }
}
