import {
  bitsetToSkillIds,
  dependencySafeSkillOrder,
  legacyKeysToSkillIds,
  researchLegacyFields,
  skillIdsToBitset,
  skillIdsToLegacyKeys,
  skillLegacyKeyToId,
} from './legacyIds'
import {
  asFiniteNumber,
  deepCloneSave,
  ensureArray,
  ensureRecord,
  requireRecord,
  type SaveRecord,
} from './graph'
import { normalizeFacilityArrays } from './facilityArrays'
import { repairNumericSave, type NumericRepairResult } from './numericRepair'
import { applyPackedSettingsFlags, packSettingsFlags } from './settingsFlags'
import { validatePreparedSave, type SaveValidationResult } from './validate'

export const CURRENT_SAVE_SCHEMA = 13
export const LEGACY_V1_SAVE_SCHEMA = 12

export class UnsupportedFutureSaveSchemaError extends Error {
  readonly sourceSchema: number
  readonly supportedSchema: number

  constructor(sourceSchema: number, supportedSchema: number) {
    super(
      `Save schema ${sourceSchema} is newer than supported schema ${supportedSchema}.`,
    )
    this.name = 'UnsupportedFutureSaveSchemaError'
    this.sourceSchema = sourceSchema
    this.supportedSchema = supportedSchema
  }
}

export interface SaveMigrationResult {
  readonly save: SaveRecord
  readonly sourceSchema: number
  readonly targetSchema: 12
  readonly appliedSteps: readonly string[]
  readonly numericRepair: NumericRepairResult
  readonly validation: SaveValidationResult
}

export function migrateDecodedSave(candidate: unknown): SaveMigrationResult {
  const source = requireRecord(candidate, 'decoded save')
  const save = deepCloneSave(source)
  const sourceSchema =
    typeof save.saveVersion === 'number' && Number.isInteger(save.saveVersion)
      ? save.saveVersion
      : 0
  if (sourceSchema > LEGACY_V1_SAVE_SCHEMA) {
    throw new UnsupportedFutureSaveSchemaError(
      sourceSchema,
      LEGACY_V1_SAVE_SCHEMA,
    )
  }

  const appliedSteps: string[] = []
  ensureSaveShape(save)
  applyPackedSettingsFlags(save)
  appliedSteps.push('ensure-root-and-dyson-shape')
  migrateAvotation(save)
  migrateSkills(save, sourceSchema < LEGACY_V1_SAVE_SCHEMA)
  appliedSteps.push('stable-skill-ids-and-bitsets')
  migrateResearch(save)
  appliedSteps.push('stable-research-ids')
  migrateAvocado(save)
  appliedSteps.push('avocado-container')
  migrateMegaStructures(save)
  normalizeFacilityArrays(
    ensureRecord(ensureRecord(save, 'dysonVerseSaveData'), 'dysonVerseInfinityData'),
  )
  appliedSteps.push('dense-facility-arrays')
  ensureSimulationMathematicsParity(save)
  const numericRepair = repairNumericSave(save)
  packSettingsFlags(save)
  appliedSteps.push('packed-settings-flags')
  save.lastMigratedFromVersion = sourceSchema
  save.saveVersion = LEGACY_V1_SAVE_SCHEMA
  const validation = validatePreparedSave(save, LEGACY_V1_SAVE_SCHEMA)

  return {
    save,
    sourceSchema,
    targetSchema: LEGACY_V1_SAVE_SCHEMA,
    appliedSteps,
    numericRepair,
    validation,
  }
}

function ensureSaveShape(save: SaveRecord): void {
  applyDefaults(save, {
    buyMode: 0,
    researchBuyMode: 0,
    screensaverEnabled: true,
    hidePurchased: true,
    buyMax: true,
    maxOfflineTime: 86_400,
    simulationAutomationTimeUntilNextEvent: 0.1,
    simulationInfinityBoundaryRemaining: 1 / 60,
    skillsButtonToggle: true,
    infinityButtonToggle: true,
    realityButtonToggle: true,
    simulationsButtonToggle: true,
    prestigeButtonToggle: true,
    statisticsButtonToggle: true,
    infinityAutoResearchToggleAi: true,
    infinityAutoResearchToggleAssembly: true,
    infinityAutoResearchToggleMoney: true,
    infinityAutoResearchTogglePlanet: true,
    infinityAutoResearchToggleServer: true,
    infinityAutoResearchToggleDataCenter: true,
    infinityAutoResearchToggleScience: true,
    infinityAutoResearchToggleMatrioshkaBrains: true,
    infinityAutoResearchToggleBirchPlanets: true,
    infinityAutoResearchToggleGalacticBrains: true,
    infinityAutoAssembly: true,
    infinityAutoManagers: true,
    infinityAutoServers: true,
    infinityAutoDataCenters: true,
    infinityAutoPlanets: true,
    infinityAutoMatrioshkaBrains: true,
    infinityAutoBirchPlanets: true,
    infinityAutoGalacticBrains: true,
    autoAssignNonRefundableSkills: true,
    botsTabPresetOverride: 0,
    researchTabPresetOverride: 0,
  })
  const reality = ensureRecord(save, 'saveData')
  applyDefaults(reality, { huntersPerPurchase: 1n, gatherersPerPurchase: 1n })
  ensureSimulationStatistics(ensureRecord(save, 'simulationStatistics'))
  const dyson = ensureRecord(save, 'dysonVerseSaveData')
  applyDefaults(dyson, { manualCreationTime: 10 })
  const simulationPrestige = ensureRecord(save, 'sdPrestige')
  applyDefaults(simulationPrestige, { disasterStage: 1n })
  const simulation = ensureRecord(save, 'sdSimulation')
  applyDefaults(simulation, {
    hunterCost: 100n,
    gathererCost: 100n,
    communityBoostIsFree: true,
    communityBoostDuration: 1200,
    engineeringResearchTime: 600,
    engineeringCost: 1000,
    shippingResearchTime: 1800,
    shippingCost: 5000,
    worldTradeResearchTime: 3600,
    worldTradeCost: 7000,
    worldPeaceResearchTime: 7200,
    worldPeaceCost: 8000,
    mathematicsResearchTime: 3600,
    mathematicsCost: 10_000,
    advancedPhysicsResearchTime: 7200,
    advancedPhysicsCost: 11_000,
    factoriesBoostCost: 5000,
    factoriesBoostDuration: 1200,
    rocketsPerSpaceFactory: 10n,
    railgunMaxCharge: 25_000_000,
    solarCost: 50n,
    solarPanelGeneration: 100n,
    fusionCost: 100_000n,
    fusionGeneration: 1_250_000n,
    swarmPanelGeneration: 3212n,
  })
  ensureRecord(save, 'prestigePlus')
  ensureRecord(save, 'avocadoData')
  ensureArray(save, 'lastNumericRepairLog')

  const infinity = ensureRecord(dyson, 'dysonVerseInfinityData')
  applyDefaults(infinity, {
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
  })
  const prestige = ensureRecord(dyson, 'dysonVersePrestigeData')
  applyDefaults(prestige, { botDistribution: 0.5 })
  ensureRecord(dyson, 'dysonVerseSkillTreeData')
  for (let preset = 0; preset <= 5; preset += 1) {
    ensureArray(dyson, `skillAutoAssignmentList${preset || ''}`)
    ensureArray(dyson, `skillAutoAssignmentIds${preset || ''}`)
  }
  for (let preset = 1; preset <= 5; preset += 1) {
    dyson[`preset${preset}Name`] ??= `Preset ${preset}`
  }
  const selectedPreset =
    typeof dyson.selectedPreset === 'number' ? Math.trunc(dyson.selectedPreset) : 1
  dyson.selectedPreset = Math.max(1, Math.min(5, selectedPreset))
}

function applyDefaults(
  target: SaveRecord,
  defaults: Readonly<Record<string, unknown>>,
): void {
  for (const [key, value] of Object.entries(defaults)) {
    if (target[key] === undefined) target[key] = value
  }
}

function ensureSimulationStatistics(statistics: SaveRecord): void {
  ensureRecord(statistics, 'lifetime')
  ensureRecord(statistics, 'currentQuantumRun')
  ensureRecord(statistics, 'lastCompletedCycle')
  ensureRecord(statistics, 'recentProcessedSegment')
  statistics.minuteWindows = ensureBucketArray(statistics.minuteWindows, 60)
  statistics.halfHourWindows = ensureBucketArray(statistics.halfHourWindows, 48)
  statistics.dailyWindows = ensureBucketArray(statistics.dailyWindows, 30)
  if (statistics.trackedSinceUpdate !== true) {
    statistics.trackedSinceUpdate = true
    statistics.trackingStartedUtc = 'tracked-since-update'
  }
}

function ensureBucketArray(value: unknown, length: number): SaveRecord[] {
  const source = Array.isArray(value) ? value : []
  return Array.from({ length }, (_, index) =>
    source[index] !== null && typeof source[index] === 'object'
      ? (source[index] as SaveRecord)
      : {},
  )
}

function migrateAvotation(save: SaveRecord): void {
  const step =
    typeof save.avotationProgressStep === 'number'
      ? Math.trunc(save.avotationProgressStep)
      : 0
  const normalizedStep = Math.max(0, Math.min(7, step))
  save.avotationProgressStep = normalizedStep
  if (save.avotation === true || normalizedStep >= 7) {
    save.avotation = true
    save.avotationProgressStep = 7
  }
}

function migrateSkills(save: SaveRecord, runVersionedReorder: boolean): void {
  const dyson = ensureRecord(save, 'dysonVerseSaveData')
  const infinity = ensureRecord(dyson, 'dysonVerseInfinityData')
  const prestige = ensureRecord(dyson, 'dysonVersePrestigeData')
  const skillTree = ensureRecord(dyson, 'dysonVerseSkillTreeData')
  const legacyOwnership = ensureRecord(infinity, 'SkillTreeSaveData')
  const ownedById = ensureRecord(infinity, 'skillOwnedById')
  const stateById = ensureRecord(infinity, 'skillStateById')

  let ownedBits = decodeBitset(infinity.skillOwnedBits, infinity.skillOwnedBitsBase64)
  const hadBits = ownedBits.length > 0
  if (!hadBits) {
    const ownedIds: string[] = []
    for (const [key, id] of Object.entries(skillLegacyKeyToId)) {
      const state = stateById[id]
      const owned =
        (state !== null &&
          typeof state === 'object' &&
          (state as SaveRecord).owned === true) ||
        ownedById[id] === true ||
        legacyOwnership[key] === true ||
        skillTree[id] === true
      if (owned) ownedIds.push(id)
    }
    ownedBits = skillIdsToBitset(ownedIds)
  }
  ownedBits = skillIdsToBitset(bitsetToSkillIds(ownedBits))
  infinity.skillOwnedBits = ownedBits
  infinity.skillOwnedBitsBase64 = encodeBase64(ownedBits)

  const ownedIdSet = new Set(bitsetToSkillIds(ownedBits))
  for (const id of Object.values(skillLegacyKeyToId)) {
    const key = String(skillIdsToLegacyKeys([id])[0])
    const owned = ownedIdSet.has(id)
    const state =
      stateById[id] !== null && typeof stateById[id] === 'object'
        ? (stateById[id] as SaveRecord)
        : {}
    state.owned = owned
    state.level = owned ? Math.max(1, Number(state.level ?? 0)) : 0
    state.timerSeconds = asFiniteNumber(state.timerSeconds)
    state.secondaryTimerSeconds = asFiniteNumber(state.secondaryTimerSeconds)
    stateById[id] = state
    ownedById[id] = owned
    legacyOwnership[key] = owned
    skillTree[id] = owned
  }
  migrateSkillTimer(prestige, 'androidsSkillTimer', stateById, 'androids')
  migrateSkillTimer(prestige, 'pocketAndroidsTimer', stateById, 'pocketAndroids')
  migrateSkillTimer(
    skillTree,
    'superRadiantScatteringTimer',
    stateById,
    'superRadiantScattering',
  )
  migrateSkillTimer(
    skillTree,
    'idleElectricSheepTimer',
    stateById,
    'idleElectricSheep',
  )

  for (let preset = 0; preset <= 5; preset += 1) {
    const suffix = preset || ''
    const idsKey = `skillAutoAssignmentIds${suffix}`
    const legacyKey = `skillAutoAssignmentList${suffix}`
    const bitsKey = `skillAutoAssignmentBits${suffix}`
    const base64Key =
      preset === 0
        ? 'skillAutoAssignmentBitsBase64'
        : `skillAutoAssignmentBitsBase64_${preset}`
    let ids = stringArray(dyson[idsKey])
    const idsWerePresent = ids.length > 0
    let rebuiltFromBits = false
    if (ids.length === 0) ids = legacyKeysToSkillIds(dyson[legacyKey])
    if (ids.length === 0) {
      ids = bitsetToSkillIds(decodeBitset(dyson[bitsKey], dyson[base64Key]))
      rebuiltFromBits = ids.length > 0
    }
    ids = [...new Set(ids.filter((id) => id in skillIdsToLegacyKeysMap))]
    if (
      preset > 0 &&
      (runVersionedReorder || (!idsWerePresent && rebuiltFromBits))
    ) {
      ids = dependencySafeSkillOrder(ids)
    }
    dyson[idsKey] = ids
    dyson[legacyKey] = skillIdsToLegacyKeys(ids)
    if (preset === 0) {
      const bits = skillIdsToBitset(ids)
      dyson[bitsKey] = bits
      dyson[base64Key] = encodeBase64(bits)
    } else {
      dyson[bitsKey] = null
      dyson[base64Key] = null
    }
  }
}

const skillIdsToLegacyKeysMap = Object.fromEntries(
  Object.values(skillLegacyKeyToId).map((id) => [id, true]),
)

function migrateSkillTimer(
  legacyOwner: SaveRecord,
  legacyField: string,
  states: SaveRecord,
  skillId: string,
): void {
  const seconds = asFiniteNumber(legacyOwner[legacyField])
  if (seconds > 0) {
    const state = ensureRecord(states, skillId)
    state.timerSeconds = Math.max(asFiniteNumber(state.timerSeconds), seconds)
  }
  legacyOwner[legacyField] = 0
}

function migrateResearch(save: SaveRecord): void {
  const infinity = ensureRecord(
    ensureRecord(save, 'dysonVerseSaveData'),
    'dysonVerseInfinityData',
  )
  const levels = ensureRecord(infinity, 'researchLevelsById')
  ensureRecord(infinity, 'researchProgressById')
  const stableLevelsWerePresent = Object.keys(levels).length > 0
  for (const [id, mapping] of Object.entries(researchLegacyFields)) {
    const legacyValue = mapping.boolean
      ? infinity[mapping.field] === true
        ? 1
        : 0
      : toNonNegativeNumber(infinity[mapping.field])
    const level = stableLevelsWerePresent && Object.hasOwn(levels, id)
      ? toNonNegativeNumber(levels[id])
      : legacyValue
    levels[id] = level
    infinity[mapping.field] = mapping.boolean
      ? level >= 1
      : typeof infinity[mapping.field] === 'bigint'
        ? BigInt(Math.floor(level))
        : Math.floor(level)
  }
  for (const field of [
    'matrioshkaUpgradePercent',
    'birchUpgradePercent',
    'galacticUpgradePercent',
  ]) {
    if (toNonNegativeNumber(infinity[field]) <= 0) infinity[field] = 0.03
  }
}

function migrateAvocado(save: SaveRecord): void {
  const prestigePlus = ensureRecord(save, 'prestigePlus')
  const avocado = ensureRecord(save, 'avocadoData')
  const legacyValues = [
    ['avocatoIP', 'infinityPoints'],
    ['avocatoInfluence', 'influence'],
    ['avocatoStrangeMatter', 'strangeMatter'],
    ['avocatoOverflow', 'overflowMultiplier'],
  ] as const
  const hasLegacy = legacyValues.some(
    ([legacy]) => toNonNegativeNumber(prestigePlus[legacy]) > 0,
  )
  if (
    (avocado.unlocked !== true && prestigePlus.avocatoPurchased === true) ||
    hasLegacy
  ) {
    avocado.unlocked = prestigePlus.avocatoPurchased === true
    for (const [legacy, current] of legacyValues) {
      avocado[current] =
        toNonNegativeNumber(avocado[current]) +
        toNonNegativeNumber(prestigePlus[legacy])
      prestigePlus[legacy] = 0
    }
  }
}

function migrateMegaStructures(save: SaveRecord): void {
  const infinity = ensureRecord(
    ensureRecord(save, 'dysonVerseSaveData'),
    'dysonVerseInfinityData',
  )
  for (const [array, modifier] of [
    ['matrioshkaBrains', 'matrioshkaBrainModifier'],
    ['birchPlanets', 'birchPlanetModifier'],
    ['galacticBrains', 'galacticBrainModifier'],
  ] as const) {
    if (!Array.isArray(infinity[array]) || infinity[array].length !== 2) {
      infinity[array] = [0, 0]
    }
    if (toNonNegativeNumber(infinity[modifier]) === 0) infinity[modifier] = 1
  }
}

function ensureSimulationMathematicsParity(save: SaveRecord): void {
  const prestige = ensureRecord(save, 'sdPrestige')
  const simulation = ensureRecord(save, 'sdSimulation')
  if (prestige.mathematics3 !== true) return
  simulation.mathematicsComplete = true
  if (toNonNegativeNumber(simulation.solarPanelGeneration) < 200) {
    simulation.solarPanelGeneration = 200
  }
}

function decodeBitset(bits: unknown, base64: unknown): Uint8Array {
  if (bits instanceof Uint8Array) return bits.slice()
  if (Array.isArray(bits) && bits.length > 0) return Uint8Array.from(bits.map(Number))
  if (typeof base64 !== 'string' || base64.length === 0) return new Uint8Array()
  try {
    return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
  } catch {
    return new Uint8Array()
  }
}

function encodeBase64(value: Uint8Array): string {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []
}

function toNonNegativeNumber(value: unknown): number {
  if (typeof value === 'bigint') return Number(value < 0n ? 0n : value)
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : 0
}
