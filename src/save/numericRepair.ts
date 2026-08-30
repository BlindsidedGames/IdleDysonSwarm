import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import {
  asBigInt,
  ensureRecord,
  type SaveRecord,
  walkMutableGraph,
} from './graph'

export const CONTINUOUS_MAXIMUM = Number.MAX_VALUE
export const DISCRETE_MAXIMUM = 9_223_372_036_854_775_807n
export const STORED_TIME_MAXIMUM_SECONDS = Number.MAX_VALUE

export interface NumericRepairEntry {
  readonly path: string
  readonly original: string
  readonly replacement: string
  readonly rule: string
}

export interface NumericRepairResult {
  readonly entries: NumericRepairEntry[]
  readonly repairCount: number
}

const derivedProductionFields = [
  'botProduction',
  'assemblyLineBotProduction',
  'assemblyLineProduction',
  'managerProduction',
  'serverManagerProduction',
  'serverProduction',
  'dataCenterServerProduction',
  'dataCenterProduction',
  'planetsDataCenterProduction',
  'matrioshkaBrainPlanetProduction',
  'birchPlanetMatrioshkaProduction',
  'galacticBrainBirchProduction',
  'quantumComputingProduction',
  'pocketDimensionsWithoutAnythingElseProduction',
  'pocketProtectorsProduction',
  'pocketMultiverseProduction',
  'totalPlanetProduction',
  'stellarSacrificesProduction',
  'planetAssemblyProduction',
  'shellWorldsProduction',
] as const

// These five derived values are also the durable recurrence carriers used to
// seed dynamic Skill effects after reload. Preserve valid publications while
// still repairing missing, negative, or non-finite legacy values below.
const durableEvaluationSnapshotFields = [
  'panelsPerSec',
  'rudimentrySingularityProduction',
  'pocketDimensionsProduction',
  'scientificPlanetsProduction',
  'managerAssemblyLineProduction',
] as const

const authoredStructuralDefaults: Readonly<Record<string, number>> = {
  maxOfflineTime: 86_400,
  simulationAutomationTimeUntilNextEvent: 0.1,
  simulationInfinityBoundaryRemaining: 1 / 60,
  manualCreationTime: 10,
  moneyMulti: 1,
  scienceMulti: 1,
  panelsPerSecMulti: 1,
  panelLifetime: 10,
  assemblyLineModifier: 1,
  managerModifier: 1,
  serverModifier: 1,
  dataCenterModifier: 1,
  planetModifier: 1,
  matrioshkaBrainModifier: 1,
  birchPlanetModifier: 1,
  galacticBrainModifier: 1,
  scienceBoostPercent: 0.05,
  moneyMultiUpgradePercent: 0.05,
  assemblyLineUpgradePercent: 0.03,
  aiManagerUpgradePercent: 0.03,
  serverUpgradePercent: 0.03,
  dataCenterUpgradePercent: 0.03,
  planetUpgradePercent: 0.03,
  matrioshkaUpgradePercent: 0.03,
  birchUpgradePercent: 0.03,
  galacticUpgradePercent: 0.03,
}

export function repairNumericSave(settings: SaveRecord): NumericRepairResult {
  const entries: NumericRepairEntry[] = []
  const add = (
    path: string,
    original: unknown,
    replacement: unknown,
    rule: string,
  ): void => {
    entries.push({
      path,
      original: format(original),
      replacement: format(replacement),
      rule,
    })
  }

  const dyson = ensureRecord(settings, 'dysonVerseSaveData')
  const infinity = ensureRecord(dyson, 'dysonVerseInfinityData')
  repairBots(settings, infinity, add)
  repairResearchLevels(infinity, add)
  for (const field of durableEvaluationSnapshotFields) {
    if (!isFiniteNonNegativeNumber(infinity[field])) infinity[field] = 0
  }
  for (const field of derivedProductionFields) infinity[field] = 0

  clampTimeBank(settings, 'offlineTime', add)
  const prestige = ensureRecord(settings, 'sdPrestige')
  const doubleTimeRate = clampInteger(Number(prestige.doubleTimeRate ?? 0), 0, 10)
  const originalDoubleTimeRate = prestige.doubleTimeRate
  const doubleTimeRateChanged =
    typeof originalDoubleTimeRate === 'bigint'
      ? originalDoubleTimeRate !== BigInt(doubleTimeRate)
      : originalDoubleTimeRate !== doubleTimeRate
  prestige.doubleTimeRate = doubleTimeRate
  if (doubleTimeRateChanged) {
    add(
      'saveSettings.sdPrestige.doubleTimeRate',
      originalDoubleTimeRate,
      doubleTimeRate,
      'double_time_rate_0_to_10',
    )
  }
  clampTimeBank(prestige, 'doubleTime', add, settings, 'saveSettings.sdPrestige')

  const maxOffline = settings.maxOfflineTime
  if (maxOffline === Number.POSITIVE_INFINITY) {
    settings.maxOfflineTime = STORED_TIME_MAXIMUM_SECONDS
    settings.cheater = true
    add(
      'saveSettings.maxOfflineTime',
      maxOffline,
      STORED_TIME_MAXIMUM_SECONDS,
      'stored_time_cap_and_comparison_flag',
    )
  } else if (
    typeof maxOffline !== 'number' ||
    !Number.isFinite(maxOffline) ||
    maxOffline <= 0
  ) {
    settings.maxOfflineTime = 86_400
    add(
      'saveSettings.maxOfflineTime',
      maxOffline,
      86_400,
      'invalid_structure_to_authored_default',
    )
  }

  walkMutableGraph(settings, (parent, key, value, path) => {
    if (path.endsWith('.dysonVerseInfinityData.bots')) return
    if (typeof value === 'number') {
      const field = String(key)
      const structural = isStructural(field)
      const authoredDefault = authoredStructuralDefaults[field] ?? 0
      let replacement: number | null = null
      let rule = ''
      if (value === Number.POSITIVE_INFINITY) {
        replacement = structural && authoredDefault > 0
          ? authoredDefault
          : CONTINUOUS_MAXIMUM
        rule =
          structural && authoredDefault > 0
            ? 'invalid_structure_to_authored_default'
            : 'positive_infinity_to_finite_cap'
      } else if (!Number.isFinite(value) || value < 0) {
        replacement = structural && authoredDefault > 0 ? authoredDefault : 0
        rule =
          structural && authoredDefault > 0
            ? 'invalid_structure_to_authored_default'
            : 'invalid_progress_to_zero'
      } else if (structural && authoredDefault > 0 && value === 0) {
        replacement = authoredDefault
        rule = 'invalid_structure_to_authored_default'
      }
      if (replacement !== null && replacement !== value) {
        parent[key as never] = replacement as never
        add(path, value, replacement, rule)
      }
    } else if (typeof value === 'bigint' && value < 0n) {
      parent[key as never] = 0n as never
      add(path, value, 0n, 'negative_discrete_progress_to_zero')
    }
  })

  repairAuthoredBounds(settings, add)
  const reality = ensureRecord(settings, 'saveData')
  const progress = reality.workerGenerationProgress
  const repairedProgress =
    isFiniteNonNegativeNumber(progress)
      ? progress % 1
      : 0
  if (progress !== undefined && progress !== repairedProgress) {
    reality.workerGenerationProgress = repairedProgress
    add(
      'saveSettings.saveData.workerGenerationProgress',
      progress,
      repairedProgress,
      'fractional_reality_progress_0_to_1',
    )
  }

  if (entries.length > 0) {
    settings.numericRepairNoticePending = true
    settings.lastNumericRepairLog = entries
      .slice(0, 128)
      .map(
        (entry) =>
          `${entry.path}|${entry.original}|${entry.replacement}|${entry.rule}`,
      )
  }
  return { entries, repairCount: entries.length }
}

function repairBots(
  settings: SaveRecord,
  infinity: SaveRecord,
  add: (path: string, original: unknown, replacement: unknown, rule: string) => void,
): void {
  const bots = infinity.bots
  if (bots === CONTINUOUS_MAXIMUM) {
    if (!settings.botCapTransitionPending && !settings.botCapRewardsGranted) {
      settings.botCapTransitionPending = true
    }
    settings.infinityInProgress = settings.botCapRewardsGranted === true
    settings.botCapTransitionPending = settings.botCapRewardsGranted !== true
    return
  }
  if (typeof bots !== 'number' || !Number.isFinite(bots) || bots < 0) {
    infinity.bots = 0
    settings.botCapTransitionPending = false
    settings.botCapRewardsGranted = false
    settings.infinityInProgress = false
    add(
      'saveSettings.dysonVerseSaveData.dysonVerseInfinityData.bots',
      bots,
      0,
      'invalid_bot_progress_to_zero_no_reward',
    )
  }
}

function repairResearchLevels(
  infinity: SaveRecord,
  add: (path: string, original: unknown, replacement: unknown, rule: string) => void,
): void {
  const candidate = infinity.researchLevelsById
  if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) return
  const levels = candidate as SaveRecord
  for (const [id, value] of Object.entries(levels)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) continue
    const floored = Math.floor(value)
    if (floored === value) continue
    levels[id] = floored
    add(
      `saveSettings.dysonVerseSaveData.dysonVerseInfinityData.researchLevelsById[${id}]`,
      value,
      floored,
      'fractional_discrete_level_floor',
    )
  }
}

function clampTimeBank(
  owner: SaveRecord,
  field: string,
  add: (path: string, original: unknown, replacement: unknown, rule: string) => void,
  root = owner,
  pathPrefix = 'saveSettings',
): void {
  const value = owner[field]
  if (
    typeof value === 'number' &&
    (value === Number.POSITIVE_INFINITY || value > STORED_TIME_MAXIMUM_SECONDS)
  ) {
    owner[field] = STORED_TIME_MAXIMUM_SECONDS
    root.cheater = true
    add(
      `${pathPrefix}.${field}`,
      value,
      STORED_TIME_MAXIMUM_SECONDS,
      'stored_time_cap_and_comparison_flag',
    )
  }
}

function repairAuthoredBounds(
  settings: SaveRecord,
  add: (path: string, original: unknown, replacement: unknown, rule: string) => void,
): void {
  const dyson = ensureRecord(settings, 'dysonVerseSaveData')
  for (let preset = 1; preset <= 5; preset += 1) {
    clampNormalized(dyson, `botDistPreset${preset}`, `saveSettings.dysonVerseSaveData.botDistPreset${preset}`, add)
  }
  const prestigePlus = ensureRecord(settings, 'prestigePlus')
  clampBigInt(prestigePlus, 'divisionsPurchased', 0n, 19n, 'saveSettings.prestigePlus.divisionsPurchased', add)
  clampBigInt(prestigePlus, 'secrets', 0n, 27n, 'saveSettings.prestigePlus.secrets', add)
  const prestige = ensureRecord(dyson, 'dysonVersePrestigeData')
  clampNormalized(
    prestige,
    'botDistribution',
    'saveSettings.dysonVerseSaveData.dysonVersePrestigeData.botDistribution',
    add,
  )
  clampBigInt(
    prestige,
    'secretsOfTheUniverse',
    0n,
    27n,
    'saveSettings.dysonVerseSaveData.dysonVersePrestigeData.secretsOfTheUniverse',
    add,
  )
  clampBigInt(
    prestige,
    'permanentSkillPoint',
    0n,
    10n,
    'saveSettings.dysonVerseSaveData.dysonVersePrestigeData.permanentSkillPoint',
    add,
  )
}

function clampNormalized(
  owner: SaveRecord,
  field: string,
  path: string,
  add: (path: string, original: unknown, replacement: unknown, rule: string) => void,
): void {
  const original = owner[field]
  const value = typeof original === 'number' && Number.isFinite(original) ? original : 0
  const replacement = Math.max(0, Math.min(1, value))
  if (replacement === original) return
  owner[field] = replacement
  add(path, original, replacement, 'authored_normalized_range')
}

function clampBigInt(
  owner: SaveRecord,
  field: string,
  minimum: bigint,
  maximum: bigint,
  path: string,
  add: (path: string, original: unknown, replacement: unknown, rule: string) => void,
): void {
  const original = owner[field]
  const value = asBigInt(original)
  const replacement = value < minimum ? minimum : value > maximum ? maximum : value
  if (replacement === original) return
  owner[field] = replacement
  add(path, original, replacement, 'authored_discrete_bounds')
}

function isStructural(field: string): boolean {
  const lowered = field.toLowerCase()
  return (
    lowered.includes('modifier') ||
    lowered.includes('multi') ||
    lowered.includes('percent') ||
    lowered.includes('duration') ||
    lowered.includes('researchtime') ||
    lowered.endsWith('cost') ||
    lowered.includes('maxcharge') ||
    lowered.includes('lifetime') ||
    lowered.includes('generation')
  )
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, Math.trunc(Number.isFinite(value) ? value : 0)))
}

function format(value: unknown): string {
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN'
    if (value === Number.POSITIVE_INFINITY) return 'Infinity'
    if (value === Number.NEGATIVE_INFINITY) return '-Infinity'
  }
  return String(value ?? 'null')
}
