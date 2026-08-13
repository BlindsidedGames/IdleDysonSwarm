import { gzipSync, strToU8 } from 'fflate'
import { readFileSync } from 'node:fs'
import { describe, expect, test, vi } from 'vitest'
import { createDeterministicUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import { gameDecimalFromCanonicalString } from '../math/gameDecimal'
import { encodeSchema13WebSave } from './schema13'
import { prepareImportedSaveText } from './import'
import { deserializeWebSave, serializeWebSave } from './serialization'
import type { LegacySaveCandidate, SaveStorageAdapter } from './repository'
import {
  ProductionV2SaveRepository,
  createProductionV2RepositoryPaths,
  promoteAutomaticUnityPurchaseEvidenceV2,
  type ProductionV2RepositoryPaths,
} from './productionV2Repository'

const NOW = '2026-08-12T00:00:00.000Z'
const PATHS = Object.freeze({
  current: '/profile/current.idsw',
  temporary: '/profile/current.idsw.tmp',
  backups: Object.freeze([
    '/profile/current.1.idsw',
    '/profile/current.2.idsw',
    '/profile/current.3.idsw',
  ]),
  preMigrationRecovery: '/profile/recovery/pre-schema13.idsw',
  preMigrationRecoveryTemporary: '/profile/recovery/pre-schema13.idsw.tmp',
  importedRecovery: '/profile/recovery/import-original.idsw',
  importedRecoveryTemporary: '/profile/recovery/import-original.idsw.tmp',
  storedTimePolicy: '/profile/local/stored-time-policy.json',
  storedTimeJob: '/profile/stored-time/job.json',
  storedTimeJobTemporary: '/profile/stored-time/job.json.tmp',
} satisfies ProductionV2RepositoryPaths)

describe('ProductionV2SaveRepository', () => {
  test('extends the existing production slot without colliding with legacy recovery', () => {
    const paths = createProductionV2RepositoryPaths(Object.freeze({
      current: '/profile/current.idsw',
      temporary: '/profile/current.idsw.tmp',
      legacyRecovery: '/profile/recovery/original-idb1.txt',
    }))
    expect(paths.current).toBe('/profile/current.idsw')
    expect(paths.temporary).toBe('/profile/current.idsw.tmp')
    expect(paths.preMigrationRecovery).not.toBe('/profile/recovery/original-idb1.txt')
    expect(new Set([
      paths.current,
      paths.temporary,
      ...paths.backups,
      paths.preMigrationRecovery,
      paths.preMigrationRecoveryTemporary,
      paths.importedRecovery,
      paths.importedRecoveryTemporary,
      paths.storedTimePolicy,
      paths.storedTimeJob,
      paths.storedTimeJobTemporary,
    ]).size).toBe(12)
  })

  test('migrates the existing schema-12 slot only after retaining its exact bytes', async () => {
    const original = schema12Text()
    const storage = new MemoryStorage([[PATHS.current, original]])
    const repository = new ProductionV2SaveRepository(storage, PATHS)

    const opened = await repository.openOrMigrate({
      observedAtUtc: NOW,
      createFirstRunSave: createDeterministicUnityFirstRunPreparedSave,
    })

    expect(opened.source).toBe('migrated-current')
    expect(opened.save.schemaVersion).toBe(13)
    expect(opened.checkpoint.revision).toBe(0)
    expect(await repository.exportPreMigrationRecovery()).toBe(original)
    expect(storage.files.get(PATHS.current)).not.toBe(original)
    expect(storage.events.indexOf(`replace:${PATHS.preMigrationRecovery}`))
      .toBeLessThan(storage.events.indexOf(`replace:${PATHS.current}`))

    const reopened = await repository.openOrMigrate({
      observedAtUtc: '2026-08-12T00:01:00.000Z',
      createFirstRunSave: () => { throw new Error('must not create a new game') },
    })
    expect(reopened.source).toBe('schema13')
    expect(reopened.checkpoint).toEqual(opened.checkpoint)
    expect(await repository.exportPreMigrationRecovery()).toBe(original)
  })

  test('persists a trusted prepared portable save with exact staged and committed readbacks', async () => {
    const storage = new MemoryStorage([[PATHS.current, schema12Text()]])
    const repository = new ProductionV2SaveRepository(storage, PATHS)
    const opened = await repository.openOrMigrate({
      observedAtUtc: NOW,
      createFirstRunSave: createDeterministicUnityFirstRunPreparedSave,
    })
    const portableSave = encodeSchema13WebSave(Object.freeze({
      savedAtUtc: '2026-08-12T00:00:05.000Z',
      state: opened.save.state,
      runtime: opened.save.runtime,
    }))

    const checkpoint = await repository.checkpointPreparedPortable(
      portableSave,
      opened.checkpoint.preferences,
      opened.checkpoint.platform,
      5,
    )

    expect(checkpoint.portableSave).toBe(portableSave)
    expect((await repository.loadCurrent())?.checkpoint).toEqual(checkpoint)
    expect(storage.events).toContain(`replace:${PATHS.current}`)
  })

  test('recovers a valid schema-12 backup without replacing the retained source bytes', async () => {
    const backup = schema12Text()
    const storage = new MemoryStorage([
      [PATHS.current, 'corrupt-current'],
      [PATHS.backups[0], backup],
    ])
    const repository = new ProductionV2SaveRepository(storage, PATHS)

    const opened = await repository.openOrMigrate({
      observedAtUtc: NOW,
      createFirstRunSave: createDeterministicUnityFirstRunPreparedSave,
    })

    expect(opened.source).toBe('migrated-backup')
    expect(await repository.exportPreMigrationRecovery()).toBe(backup)
    expect(opened.save.schemaVersion).toBe(13)
  })

  test('accepts the shipped Unity IDB1 format on the same one-way startup path', async () => {
    const original = readFileSync(
      new URL('../application/firstRun/generated/first-run-schema-12.idb1.txt', import.meta.url),
      'utf8',
    ).trim()
    const storage = new MemoryStorage([[PATHS.current, original]])
    const repository = new ProductionV2SaveRepository(storage, PATHS)

    const opened = await repository.openOrMigrate({
      observedAtUtc: NOW,
      createFirstRunSave: createDeterministicUnityFirstRunPreparedSave,
    })

    expect(opened.source).toBe('migrated-current')
    expect(opened.save.schemaVersion).toBe(13)
    expect(await repository.exportPreMigrationRecovery()).toBe(original)
  })

  test('discovers and migrates an existing native Unity save before creating a new game', async () => {
    const firstRun = createDeterministicUnityFirstRunPreparedSave()
    const original = serializeWebSave(firstRun.withValidatedState(Object.freeze({
      ...firstRun.copyValidatedState(),
      doubleIp: true,
    })).copyValidatedState())
    expect(deserializeWebSave(original).doubleIp).toBe(true)
    expect(deserializeWebSave(original).saveVersion).toBe(12)
    expect(prepareImportedSaveText(
      original,
      NOW,
      undefined,
      { kind: 'automatic-unity-migration', observedAtUtc: NOW },
    ).copyValidatedState().doubleIp).toBe(false)
    const candidate = Object.freeze({
      id: 'native-save',
      sourcePath: 'unity-readonly:native-save',
      text: original,
      provenance: Object.freeze({
        kind: 'automatic-same-device-unity' as const,
        platform: 'android' as const,
        sourceClass: 'unity-persistent-data-save' as const,
        opaqueSourceIdentifier: 'native-save',
        pathClass: 'unity-local-low' as const,
      }),
    })
    const storage = new MemoryStorage([], [candidate])
    const promoted: unknown[] = []
    const repository = new ProductionV2SaveRepository(storage, PATHS, {
      promoteAutomaticUnityPurchaseEvidence: async (evidence) => {
        promoted.push(evidence)
      },
    })

    const opened = await repository.openOrMigrate({
      observedAtUtc: NOW,
      createFirstRunSave: createDeterministicUnityFirstRunPreparedSave,
    })

    expect(opened.source).toBe('migrated-legacy')
    expect(opened.save.schemaVersion).toBe(13)
    expect(await repository.exportPreMigrationRecovery()).toBe(original)
    expect(storage.files.has(PATHS.current)).toBe(true)
    expect(promoted).toEqual([])

    await promoteAutomaticUnityPurchaseEvidenceV2(
      Object.freeze({
        promoteAutomaticUnityPurchaseEvidence: async (evidence) => {
          promoted.push(evidence)
        },
      }),
      candidate,
      firstRun.withValidatedState(Object.freeze({
        ...firstRun.copyValidatedState(),
        doubleIp: true,
      })),
    )
    expect(promoted).toEqual([expect.objectContaining({
      permanentDoubleInfinityPoints: true,
      opaqueSourceIdentifier: 'native-save',
      saveSchemaVersion: 12,
      contentSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
    })])
  })

  test('never promotes purchase evidence from a shared browser import', async () => {
    const firstRun = createDeterministicUnityFirstRunPreparedSave()
    const original = serializeWebSave(firstRun.withValidatedState(Object.freeze({
      ...firstRun.copyValidatedState(),
      doubleIp: true,
    })).copyValidatedState())
    const storage = new MemoryStorage([], [Object.freeze({
      id: 'shared-save',
      sourcePath: 'browser-import/shared-save',
      text: original,
      provenance: Object.freeze({ kind: 'browser-retained-import' as const }),
    })])
    const promote = vi.fn(async () => undefined)
    const repository = new ProductionV2SaveRepository(storage, PATHS, {
      promoteAutomaticUnityPurchaseEvidence: promote,
    })

    await expect(repository.openOrMigrate({
      observedAtUtc: NOW,
      createFirstRunSave: createDeterministicUnityFirstRunPreparedSave,
    })).resolves.toMatchObject({ source: 'migrated-legacy' })
    expect(promote).not.toHaveBeenCalled()
  })

  test('does not replace an invalid discovered legacy save with a new game', async () => {
    const storage = new MemoryStorage([], [Object.freeze({
      id: 'broken',
      sourcePath: 'retained:broken',
      text: 'not-a-save',
      provenance: Object.freeze({ kind: 'browser-retained-import' as const }),
    })])
    const repository = new ProductionV2SaveRepository(storage, PATHS)

    await expect(repository.openOrMigrate({
      observedAtUtc: NOW,
      createFirstRunSave: createDeterministicUnityFirstRunPreparedSave,
    })).rejects.toThrow(/No discovered legacy save/i)
    expect(storage.files.has(PATHS.current)).toBe(false)
  })

  test('fails closed when current and backups exist but none can be migrated', async () => {
    const storage = new MemoryStorage([[PATHS.current, futureSaveText()]])
    const repository = new ProductionV2SaveRepository(storage, PATHS)

    await expect(repository.openOrMigrate({
      observedAtUtc: NOW,
      createFirstRunSave: createDeterministicUnityFirstRunPreparedSave,
    })).rejects.toThrow(/No valid current or backup/i)
    expect(storage.files.get(PATHS.current)).toBe(futureSaveText())
    expect(await repository.exportPreMigrationRecovery()).toBeNull()
  })

  test('imports schema 0-12 text, preserves receiver-local values, and retains the first exact import', async () => {
    const storage = new MemoryStorage([[PATHS.current, schema12Text()]])
    const repository = new ProductionV2SaveRepository(storage, PATHS)
    const opened = await repository.openOrMigrate({
      observedAtUtc: NOW,
      createFirstRunSave: createDeterministicUnityFirstRunPreparedSave,
    })
    const senderState = createDeterministicUnityFirstRunPreparedSave().copyValidatedState()
    senderState.globalMute = !opened.checkpoint.preferences.globalMute
    senderState.debugOptions = !opened.checkpoint.platform.debugOptions
    senderState.money = 12345
    const importedText = serializeWebSave(senderState)

    const imported = await repository.importPortable(
      importedText,
      '2026-08-12T00:02:00.000Z',
      opened.checkpoint,
    )

    expect(imported.revision).toBe(1)
    expect(imported.preferences).toEqual(opened.checkpoint.preferences)
    expect(imported.platform).toEqual(opened.checkpoint.platform)
    expect(await repository.exportImportedRecovery()).toBe(importedText)
    expect((await repository.loadCurrent())?.checkpoint).toEqual(imported)

    const secondText = schema12Text()
    await repository.importPortable(
      secondText,
      '2026-08-12T00:03:00.000Z',
      imported,
    )
    expect(await repository.exportImportedRecovery()).toBe(importedText)
  })

  test('imports schema 13 while keeping receiver preferences/platform and rejects invalid input without writes', async () => {
    const storage = new MemoryStorage([[PATHS.current, schema12Text()]])
    const repository = new ProductionV2SaveRepository(storage, PATHS)
    const opened = await repository.openOrMigrate({
      observedAtUtc: NOW,
      createFirstRunSave: createDeterministicUnityFirstRunPreparedSave,
    })
    const source = migratePreparedSaveToV2(
      createDeterministicUnityFirstRunPreparedSave(),
      Object.freeze({ kind: 'trusted-same-device' }),
    )
    const incoming = encodeSchema13WebSave(Object.freeze({
      savedAtUtc: '2026-08-12T00:04:00.000Z',
      state: Object.freeze({
        ...source.state,
        dyson: Object.freeze({
          ...source.state.dyson,
          money: gameDecimalFromCanonicalString('1e1000'),
        }),
      }),
      runtime: source.runtime,
    }))
    const imported = await repository.importPortable(
      incoming,
      '2026-08-12T00:05:00.000Z',
      opened.checkpoint,
    )
    expect(imported.preferences).toEqual(opened.checkpoint.preferences)
    expect(imported.platform).toEqual(opened.checkpoint.platform)
    expect((await repository.loadCurrent())?.save.state.dyson.money.exponent).toBe(1000)

    const currentBefore = storage.files.get(PATHS.current)
    const recoveryBefore = storage.files.get(PATHS.importedRecovery)
    await expect(repository.importPortable(
      futureSaveText(),
      '2026-08-12T00:06:00.000Z',
      imported,
    )).rejects.toThrow()
    expect(storage.files.get(PATHS.current)).toBe(currentBefore)
    expect(storage.files.get(PATHS.importedRecovery)).toBe(recoveryBefore)
  })

  test('rejects accessor options and malformed path/storage boundaries without invoking getters', () => {
    let getters = 0
    const hostilePaths = Object.defineProperty({}, 'current', {
      enumerable: true,
      get: () => { getters += 1; return PATHS.current },
    })
    expect(() => new ProductionV2SaveRepository(
      new MemoryStorage(),
      hostilePaths as ProductionV2RepositoryPaths,
    )).toThrow()
    expect(getters).toBe(0)

    const hostileStorage = Object.defineProperty({}, 'exists', {
      get: () => { getters += 1; return () => false },
    })
    expect(() => new ProductionV2SaveRepository(
      hostileStorage as SaveStorageAdapter,
      PATHS,
    )).toThrow()
    expect(getters).toBe(0)
  })

  test('repairs only a corrupt recovery artifact and preserves an older valid one', async () => {
    const original = schema12Text()
    const storage = new MemoryStorage([
      [PATHS.current, original],
      [PATHS.preMigrationRecovery, 'interrupted'],
    ])
    const repository = new ProductionV2SaveRepository(storage, PATHS)
    await repository.openOrMigrate({
      observedAtUtc: NOW,
      createFirstRunSave: createDeterministicUnityFirstRunPreparedSave,
    })
    expect(await repository.exportPreMigrationRecovery()).toBe(original)

    const retained = storage.files.get(PATHS.preMigrationRecovery)!
    storage.files.set(PATHS.current, schema12Text())
    const secondRepository = new ProductionV2SaveRepository(storage, PATHS)
    await secondRepository.openOrMigrate({
      observedAtUtc: '2026-08-12T00:10:00.000Z',
      createFirstRunSave: createDeterministicUnityFirstRunPreparedSave,
    })
    expect(await secondRepository.exportPreMigrationRecovery()).toBe(retained)
  })
})

function schema12Text(): string {
  return serializeWebSave(
    createDeterministicUnityFirstRunPreparedSave().copyValidatedState(),
  )
}

function futureSaveText(): string {
  const compressed = gzipSync(strToU8(JSON.stringify({ schemaVersion: 14 })), {
    level: 9,
    mtime: 0,
  })
  return `IDSWEB1:${Buffer.from(compressed).toString('base64')}`
}

class MemoryStorage implements SaveStorageAdapter {
  readonly files = new Map<string, string>()
  readonly events: string[] = []
  readonly candidates: readonly LegacySaveCandidate[]

  constructor(
    entries: readonly (readonly [string, string])[] = [],
    candidates: readonly LegacySaveCandidate[] = [],
  ) {
    for (const [path, text] of entries) this.files.set(path, text)
    this.candidates = Object.freeze([...candidates])
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path)
  }

  async readText(path: string): Promise<string> {
    const text = this.files.get(path)
    if (text === undefined) throw new Error(`Missing ${path}`)
    return text
  }

  async writeText(path: string, contents: string): Promise<void> {
    this.events.push(`write:${path}`)
    this.files.set(path, contents)
  }

  async replaceAtomically(temporaryPath: string, destinationPath: string): Promise<void> {
    const text = this.files.get(temporaryPath)
    if (text === undefined) throw new Error(`Missing ${temporaryPath}`)
    this.events.push(`replace:${destinationPath}`)
    this.files.set(destinationPath, text)
    this.files.delete(temporaryPath)
  }

  async copy(sourcePath: string, destinationPath: string): Promise<void> {
    const text = this.files.get(sourcePath)
    if (text === undefined) throw new Error(`Missing ${sourcePath}`)
    this.events.push(`copy:${sourcePath}->${destinationPath}`)
    this.files.set(destinationPath, text)
  }

  async discoverLegacyCandidates(): Promise<readonly LegacySaveCandidate[]> {
    return this.candidates
  }
}
