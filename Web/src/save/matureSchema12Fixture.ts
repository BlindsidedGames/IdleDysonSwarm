import { deriveExpectedLegacyDysonTuningV2 } from '../game-state/dysonTuningV2'
import type { SaveRecord } from './graph'
import { serializeWebSave } from './serialization'
import { packSettingsFlags } from './settingsFlags'

export interface MatureSchema12FixtureOptions {
  readonly debugOptions?: boolean
  readonly debugEverEnabled?: boolean
  readonly cheater?: boolean
  readonly unlockAllTabs?: boolean
  readonly selectedPreset?: number
}

/** Synthetic, non-private late-game schema-12 save for migration and browser profiling. */
export function createMatureSchema12WebFixtureFromSource(
  sourceValue: Readonly<SaveRecord>,
  options: Readonly<MatureSchema12FixtureOptions> = {},
): string {
  const source = structuredClone(sourceValue) as SaveRecord
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
  prestige.infinityPoints = Number.MAX_SAFE_INTEGER
  prestige.spentInfinityPoints = 1_000_000_000
  prestige.secretsOfTheUniverse = 27
  Object.assign(infinity, tuning)
  prestige.botDistribution = 0.73
  skillTree.skillPointsTree = Number.MAX_SAFE_INTEGER
  skillTree.fragments = 123_456_789
  dyson.selectedPreset = options.selectedPreset ?? 3
  dyson.preset3Name = 'Late Game'
  dyson.preset3ColorId = 'gold'
  dyson.botDistPreset3 = 0.73
  dyson.skillAutoAssignmentIds3 = ['startHereTree']

  source.debugOptions = options.debugOptions ?? false
  source.debugEverEnabled = options.debugEverEnabled ?? false
  source.cheater = options.cheater ?? false
  source.unlockAllTabs = options.unlockAllTabs ?? false
  packSettingsFlags(source)
  source.saveVersion = 12
  return serializeWebSave(source)
}

function record(value: unknown): SaveRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Mature fixture source shape changed.')
  }
  return value as SaveRecord
}
