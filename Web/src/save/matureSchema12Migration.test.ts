import { describe, expect, test } from 'vitest'
import { createDeterministicUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { gameDecimalToCanonicalString } from '../math/gameDecimal'
import { deriveExpectedLegacyDysonTuningV2 } from '../game-state/dysonTuningV2'
import type { SaveRecord } from './graph'
import type { LegacySaveCandidate, SaveStorageAdapter } from './repository'
import {
  ProductionV2SaveRepository,
  type ProductionV2RepositoryPaths,
} from './productionV2Repository'
import { deserializeWebSave, serializeWebSave } from './serialization'
import { packSettingsFlags } from './settingsFlags'

const NOW = '2026-08-12T02:00:00.000Z'
const PATHS = Object.freeze({
  current: '/mature/current.idsw',
  temporary: '/mature/current.idsw.tmp',
  backups: Object.freeze([
    '/mature/current.1.idsw',
    '/mature/current.2.idsw',
    '/mature/current.3.idsw',
  ]),
  preMigrationRecovery: '/mature/recovery/pre-schema13.idsw',
  preMigrationRecoveryTemporary: '/mature/recovery/pre-schema13.idsw.tmp',
  importedRecovery: '/mature/recovery/import-original.idsw',
  importedRecoveryTemporary: '/mature/recovery/import-original.idsw.tmp',
  storedTimePolicy: '/mature/local/stored-time-policy.json',
  storedTimeJob: '/mature/stored-time/job.json',
  storedTimeJobTemporary: '/mature/stored-time/job.json.tmp',
} satisfies ProductionV2RepositoryPaths)

/**
 * Synthetic, non-private mature schema-12 corpus. Unlike the immutable
 * first-run golden, this deliberately exercises late-game values and local
 * ownership boundaries without depending on a player's browser profile.
 */
describe('mature schema-12 Web migration corpus', () => {
  test('migrates advanced and extreme finite progress while retaining exact source bytes', async () => {
    const mature = matureSchema12({
      debugOptions: true,
      debugEverEnabled: true,
      cheater: true,
      unlockAllTabs: true,
    })
    const storage = new MemoryStorage([[PATHS.current, mature]])
    const repository = new ProductionV2SaveRepository(storage, PATHS)

    const opened = await repository.openOrMigrate({
      observedAtUtc: NOW,
      createFirstRunSave: createDeterministicUnityFirstRunPreparedSave,
    })

    expect(opened.source).toBe('migrated-current')
    expect(await repository.exportPreMigrationRecovery()).toBe(mature)
    expect(opened.checkpoint.platform).toEqual({
      debugOptions: true,
      debugEverEnabled: true,
      cheater: true,
      unlockAllTabs: true,
    })
    expect(gameDecimalToCanonicalString(opened.save.state.dyson.money)).toBe('1e300')
    expect(gameDecimalToCanonicalString(opened.save.state.dyson.science)).toBe('9.5e299')
    expect(gameDecimalToCanonicalString(opened.save.state.dyson.bots)).toBe('1e250')
    expect(opened.save.state.infinity.availablePoints.mantissa).not.toBe(0)
    expect(opened.save.state.infinity.secretsOfTheUniverse).toBe(27n)
    expect(opened.save.state.skills.points).toBe(9_007_199_254_740_991n)
    expect(opened.save.state.skills.selectedPreset).toBe(3)
    expect(opened.save.state.skills.presets[2]).toMatchObject({
      name: 'Late Game',
      botDistribution: 0.73,
      colorId: 'gold',
    })
    expect(opened.save.state.research.levelsById['research.science_boost'])
      .toBeDefined()

    const reopened = await repository.openOrMigrate({
      observedAtUtc: '2026-08-12T02:01:00.000Z',
      createFirstRunSave: () => { throw new Error('must reopen schema 13') },
    })
    expect(reopened.source).toBe('schema13')
    expect(reopened.checkpoint).toEqual(opened.checkpoint)
    expect(await repository.exportPreMigrationRecovery()).toBe(mature)
  })

  test('recovers the newest valid mature backup and leaves corrupt current evidence intact', async () => {
    const mature = matureSchema12()
    const storage = new MemoryStorage([
      [PATHS.current, 'corrupt-current-evidence'],
      [PATHS.backups[0], mature],
    ])
    const repository = new ProductionV2SaveRepository(storage, PATHS)

    const opened = await repository.openOrMigrate({
      observedAtUtc: NOW,
      createFirstRunSave: createDeterministicUnityFirstRunPreparedSave,
    })

    expect(opened.source).toBe('migrated-backup')
    expect(await repository.exportPreMigrationRecovery()).toBe(mature)
    expect(gameDecimalToCanonicalString(opened.save.state.dyson.money)).toBe('1e300')
  })

  test('manual mature import keeps receiver-local platform claims and retains the first exact import', async () => {
    const receiver = matureSchema12({
      debugOptions: true,
      debugEverEnabled: true,
      cheater: true,
      unlockAllTabs: true,
    })
    const sender = matureSchema12({
      debugOptions: false,
      debugEverEnabled: false,
      cheater: false,
      unlockAllTabs: false,
    }, 2)
    const storage = new MemoryStorage([[PATHS.current, receiver]])
    const repository = new ProductionV2SaveRepository(storage, PATHS)
    const opened = await repository.openOrMigrate({
      observedAtUtc: NOW,
      createFirstRunSave: createDeterministicUnityFirstRunPreparedSave,
    })

    const imported = await repository.importPortable(
      sender,
      '2026-08-12T02:02:00.000Z',
      opened.checkpoint,
    )

    expect(imported.platform).toEqual(opened.checkpoint.platform)
    expect(imported.preferences).toEqual(opened.checkpoint.preferences)
    expect(imported.revision).toBe(opened.checkpoint.revision + 1)
    expect(await repository.exportImportedRecovery()).toBe(sender)
    expect(gameDecimalToCanonicalString(
      (await repository.loadCurrent())!.save.state.dyson.money,
    )).toBe('1e300')
    expect((await repository.loadCurrent())!.save.state.skills.selectedPreset).toBe(2)

    const second = matureSchema12({}, 4)
    await repository.importPortable(
      second,
      '2026-08-12T02:03:00.000Z',
      imported,
    )
    expect(await repository.exportImportedRecovery()).toBe(sender)
  })
})

function matureSchema12(
  platform: Partial<Readonly<{
    debugOptions: boolean
    debugEverEnabled: boolean
    cheater: boolean
    unlockAllTabs: boolean
  }>> = {},
  selectedPreset = 3,
): string {
  const source = createDeterministicUnityFirstRunPreparedSave().copyValidatedState()
  const dyson = record(source.dysonVerseSaveData)
  const infinity = record(dyson.dysonVerseInfinityData)
  const prestige = record(dyson.dysonVersePrestigeData)
  const skillTree = record(dyson.dysonVerseSkillTreeData)
  const tuning = deriveExpectedLegacyDysonTuningV2(27n)

  infinity.money = 1e300
  infinity.science = 9.5e299
  infinity.bots = 1e250
  infinity.workers = 2.7e249
  infinity.researchers = 7.3e249
  infinity.assemblyLines = [1e120, 1e110]
  infinity.aiManagers = [1e90, 1e80]
  infinity.researchLevelsById = {
    ...record(infinity.researchLevelsById),
    'research.science_boost': 1e150,
  }
  // Schema 12's discrete prestige currencies are bounded exact integers;
  // extreme magnitudes belong only to the continuous economy leaves above.
  prestige.infinityPoints = Number.MAX_SAFE_INTEGER
  prestige.spentInfinityPoints = 1_000_000_000
  prestige.secretsOfTheUniverse = 27
  Object.assign(infinity, tuning)
  prestige.botDistribution = 0.73
  skillTree.skillPointsTree = Number.MAX_SAFE_INTEGER
  skillTree.fragments = 123_456_789
  dyson.selectedPreset = selectedPreset
  dyson.preset3Name = 'Late Game'
  dyson.preset3ColorId = 'gold'
  dyson.botDistPreset3 = 0.73
  dyson.skillAutoAssignmentIds3 = ['startHereTree']

  source.debugOptions = platform.debugOptions ?? false
  source.debugEverEnabled = platform.debugEverEnabled ?? false
  source.cheater = platform.cheater ?? false
  source.unlockAllTabs = platform.unlockAllTabs ?? false
  packSettingsFlags(source)
  source.saveVersion = 12
  const encoded = serializeWebSave(source)
  expect(deserializeWebSave(encoded).saveVersion).toBe(12)
  return encoded
}

function record(value: unknown): SaveRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Mature fixture source shape changed.')
  }
  return value as SaveRecord
}

class MemoryStorage implements SaveStorageAdapter {
  readonly files = new Map<string, string>()

  constructor(entries: readonly (readonly [string, string])[] = []) {
    for (const [path, text] of entries) this.files.set(path, text)
  }

  async exists(path: string): Promise<boolean> { return this.files.has(path) }
  async readText(path: string): Promise<string> {
    const text = this.files.get(path)
    if (text === undefined) throw new Error(`Missing ${path}`)
    return text
  }
  async writeText(path: string, contents: string): Promise<void> {
    this.files.set(path, contents)
  }
  async replaceAtomically(temporaryPath: string, destinationPath: string): Promise<void> {
    const text = await this.readText(temporaryPath)
    this.files.set(destinationPath, text)
    this.files.delete(temporaryPath)
  }
  async copy(sourcePath: string, destinationPath: string): Promise<void> {
    this.files.set(destinationPath, await this.readText(sourcePath))
  }
  async discoverLegacyCandidates(): Promise<readonly LegacySaveCandidate[]> { return [] }
}
