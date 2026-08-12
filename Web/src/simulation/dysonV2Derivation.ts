import { getGameAsset } from '../game-data/catalog'
import type { RuntimeAssetReference, RuntimeGameAsset, RuntimeAssetValue } from '../game-data/types'
import type { V2LegacyRuntimeEvidence } from '../game-state/mappingV2'
import { canonicalFragmentSkillKeySet } from '../game-state/numericFieldManifest'
import {
  cloneCanonicalRuntimeSidecarV2,
  isValidatedCanonicalRuntimeSidecarV2,
  type CanonicalRuntimeSidecarV2,
} from '../game-state/runtimeV2'
import {
  resolveDysonTuningProfileV2,
  selectDysonTuningProfileV2,
} from '../game-state/dysonTuningV2'
import type { CanonicalFacilityId } from '../game-state/types'
import type { CanonicalGameStateV2, CanonicalResearchId } from '../game-state/typesV2'
import {
  GAME_DECIMAL_ONE,
  GAME_DECIMAL_ZERO,
  addGameDecimals,
  compareGameDecimals,
  divideGameDecimals,
  floorGameDecimal,
  gameDecimalFromBigInt,
  gameDecimalFromNumber,
  isGameDecimal,
  logGameDecimal,
  maxGameDecimal,
  minGameDecimal,
  multiplyGameDecimals,
  powGameDecimal,
  subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'
import { deriveSecretBuffs, type SecretResearchCoefficientId } from './secretBuffs'
import { productionScalingThresholdV2 } from './skillTransactionsV2'
import {
  advanceActiveDysonV2Production,
  advanceOfflineDysonV2Production,
  deriveDysonV2Production,
  DYSON_V2_FACILITY_IDS,
  type DerivedDysonV2Production,
  type DysonV2DerivationParameters,
  type DysonV2ProductionAdvanceResult,
  type DysonV2StatEffect,
} from './dysonV2Production'

export type DysonV2CatalogLookup = (kind: string, id: string) => RuntimeGameAsset | undefined

export interface DerivedDysonV2Causes {
  readonly parameters: Readonly<DysonV2DerivationParameters>
  readonly production: Readonly<DerivedDysonV2Production>
  readonly auxiliary: Readonly<{
    scienceBoostPerSecond: GameDecimal
    moneyUpgradePerSecond: GameDecimal
    tinkerAssemblyYield: GameDecimal
    scientificPlanetsProduction: GameDecimal
  }>
  readonly nextEvaluationSnapshot: Readonly<DysonV2EvaluationSnapshot>
}

export interface DysonV2EvaluationSnapshot {
  readonly panelsPerSecond: GameDecimal
  readonly panelLifetimeSeconds: GameDecimal
  readonly scienceMultiplier: GameDecimal
  readonly rudimentarySingularityProduction: GameDecimal
  readonly pocketDimensionsProduction: GameDecimal
  readonly scientificPlanetsProduction: GameDecimal
  readonly managerAssemblyLineProduction: GameDecimal
}

export interface DysonV2RuntimeEvidence {
  /**
   * Compatibility-only adapter for pre-sidecar isolated tests. The vector is
   * accepted only when it exactly selects a closed named V2 tuning profile.
   */
  readonly compatibilityTuning: Readonly<V2LegacyRuntimeEvidence['compatibilityTuning']>
  readonly evaluationSnapshot: Readonly<DysonV2EvaluationSnapshot>
}

export type DysonV2CauseEvidence =
  | Readonly<V2LegacyRuntimeEvidence>
  | Readonly<DysonV2RuntimeEvidence>
  | Readonly<CanonicalRuntimeSidecarV2>

interface ResolvedRuntimeEvidenceV2 {
  readonly tuning: Readonly<V2LegacyRuntimeEvidence['compatibilityTuning']>
  readonly evaluationSnapshot: Readonly<DysonV2EvaluationSnapshot>
}

const COMPATIBILITY_TUNING_KEYS = Object.freeze([
  'panelsPerSecMulti',
  'scienceBoostPercent',
  'moneyMultiUpgradePercent',
  'assemblyLineUpgradePercent',
  'aiManagerUpgradePercent',
  'serverUpgradePercent',
  'dataCenterUpgradePercent',
  'planetUpgradePercent',
  'matrioshkaUpgradePercent',
  'birchUpgradePercent',
  'galacticUpgradePercent',
] as const satisfies readonly (keyof V2LegacyRuntimeEvidence['compatibilityTuning'])[])

const EVALUATION_SNAPSHOT_KEYS = Object.freeze([
  'panelsPerSecond',
  'panelLifetimeSeconds',
  'scienceMultiplier',
  'rudimentarySingularityProduction',
  'pocketDimensionsProduction',
  'scientificPlanetsProduction',
  'managerAssemblyLineProduction',
] as const satisfies readonly (keyof DysonV2EvaluationSnapshot)[])

const FACILITY_MODIFIER_STATS: Readonly<Record<CanonicalFacilityId, string>> = Object.freeze({
  assembly_lines: 'Facility.AssemblyLine.Modifier',
  ai_managers: 'Facility.Manager.Modifier',
  servers: 'Facility.Server.Modifier',
  data_centers: 'Facility.DataCenter.Modifier',
  planets: 'Facility.Planet.Modifier',
  matrioshka_brains: 'Facility.Matrioshka.Modifier',
  birch_planets: 'Facility.Birch.Modifier',
  galactic_brains: 'Facility.Galactic.Modifier',
})

const FACILITY_PRODUCTION_STATS: Readonly<Partial<Record<CanonicalFacilityId, string>>> = Object.freeze({
  assembly_lines: 'Facility.AssemblyLine.Production',
  ai_managers: 'Facility.Manager.Production',
  servers: 'Facility.Server.Production',
  data_centers: 'Facility.DataCenter.Production',
  planets: 'Facility.Planet.Production',
})

const MATERIALIZED_STATS = Object.freeze([
  'Global.MoneyMultiplier',
  'Global.ScienceMultiplier',
  'Global.PanelLifetime',
  'Global.PanelsPerSecond',
  'Global.PlanetsPerSecond',
  'Global.MoneyPerSecond',
  'Global.SciencePerSecond',
  'Global.ScienceBoostPerSecond',
  'Global.MoneyMultiUpgradePerSecond',
  'Global.Tinker.AssemblyYield',
  ...Object.values(FACILITY_MODIFIER_STATS),
  ...Object.values(FACILITY_PRODUCTION_STATS),
] as const)

const RESEARCH_SPECS = Object.freeze([
  ['research.money_multiplier', 'effect.research.money_multiplier', 'Global.MoneyMultiplier', 'moneyMultiUpgradePercent', -1, 0],
  ['research.science_boost', 'effect.research.science_multiplier', 'Global.ScienceMultiplier', 'scienceBoostPercent', -1, 0],
  ['research.assembly_line_upgrade', 'effect.research.assembly_line_modifier', 'Facility.AssemblyLine.Modifier', 'assemblyLineUpgradePercent', -1, 0],
  ['research.ai_manager_upgrade', 'effect.research.ai_manager_modifier', 'Facility.Manager.Modifier', 'aiManagerUpgradePercent', -1, 0],
  ['research.server_upgrade', 'effect.research.server_modifier', 'Facility.Server.Modifier', 'serverUpgradePercent', -1, 0],
  ['research.data_center_upgrade', 'effect.research.data_center_modifier', 'Facility.DataCenter.Modifier', 'dataCenterUpgradePercent', -1, 0],
  ['research.planet_upgrade', 'effect.research.planet_modifier', 'Facility.Planet.Modifier', 'planetUpgradePercent', -1, 0],
  ['research.matrioshka_brains_upgrade', 'effect.research.matrioshka_modifier', 'Facility.Matrioshka.Modifier', 'matrioshkaUpgradePercent', -1, 0],
  ['research.birch_planets_upgrade', 'effect.research.birch_modifier', 'Facility.Birch.Modifier', 'birchUpgradePercent', -1, 0],
  ['research.galactic_brains_upgrade', 'effect.research.galactic_modifier', 'Facility.Galactic.Modifier', 'galacticUpgradePercent', -1, 0],
  ['research.panel_lifetime_1', 'effect.research.panel_lifetime_1', 'Global.PanelLifetime', null, 1, 1],
  ['research.panel_lifetime_2', 'effect.research.panel_lifetime_2', 'Global.PanelLifetime', null, 1, 2],
  ['research.panel_lifetime_3', 'effect.research.panel_lifetime_3', 'Global.PanelLifetime', null, 1, 3],
  ['research.panel_lifetime_4', 'effect.research.panel_lifetime_4', 'Global.PanelLifetime', null, 1, 4],
] as const)

const INFINITY_THRESHOLDS: Readonly<Record<CanonicalFacilityId, number>> = Object.freeze({
  assembly_lines: 0,
  ai_managers: 2,
  servers: 3,
  data_centers: 4,
  planets: 5,
  matrioshka_brains: 5,
  birch_planets: 10,
  galactic_brains: 20,
})
const FAST_TIMER_SKILL_IDS = Object.freeze([
  'androids',
  'pocketAndroids',
  'superRadiantScattering',
] as const)

const defaultResearchEffects = new WeakMap<
  object,
  WeakMap<object, Map<bigint, EffectByStat>>
>()
const defaultSkillDatabaseValidated = new WeakSet<object>()
interface DefaultCompiledSkillPlanV2 {
  database: RuntimeGameAsset
  catalogIds: readonly string[]
  catalogIdSet: ReadonlySet<string>
  ownedLevels: readonly (bigint | null)[]
  effects: readonly Readonly<ParsedEffect>[]
  snapshotIndependent: boolean
}
let lastDefaultCompiledSkillPlan: Readonly<DefaultCompiledSkillPlanV2> | undefined
const defaultCompiledSkillPlansBySkillState = new WeakMap<
  object,
  Readonly<DefaultCompiledSkillPlanV2>
>()
export interface PreparedDysonV2SkillPlanInheritanceAuthority {
  readonly kind: 'prepared-dyson-skill-plan-inheritance-v1'
}
const issuedPreparedSkillPlanInheritanceAuthorities = new WeakSet<object>()
let defaultCompiledSkillPlanCompilations = 0
let defaultCompiledSkillPlanHits = 0
const defaultCatalogClosureValidated = new WeakSet<object>()
const validatedNativeRuntimeEvidence = new WeakMap<
  object,
  Readonly<ResolvedRuntimeEvidenceV2>
>()
let lastDefaultSnapshotIndependentDerivation: Readonly<{
  state: Readonly<CanonicalGameStateV2>
  tuning: Readonly<V2LegacyRuntimeEvidence['compatibilityTuning']>
  result: Readonly<DerivedDysonV2Causes>
}> | undefined
const EMPTY_EFFECTS_BY_STAT = Object.freeze({}) as EffectByStat

export function getDysonV2CompiledSkillPlanCacheDiagnosticsForTests(): Readonly<{
  readonly compilations: number
  readonly hits: number
}> {
  return Object.freeze({
    compilations: defaultCompiledSkillPlanCompilations,
    hits: defaultCompiledSkillPlanHits,
  })
}

export function registerPreparedDysonV2SkillPlanInheritanceAuthorityForEventV2(): Readonly<PreparedDysonV2SkillPlanInheritanceAuthority> {
  const authority = Object.freeze({
    kind: 'prepared-dyson-skill-plan-inheritance-v1' as const,
  })
  issuedPreparedSkillPlanInheritanceAuthorities.add(authority)
  return authority
}

export function inheritPreparedDysonV2SkillPlanForFastV2(
  authority: Readonly<PreparedDysonV2SkillPlanInheritanceAuthority>,
  sourceById: Readonly<CanonicalGameStateV2['skills']['byId']>,
  nextById: Readonly<CanonicalGameStateV2['skills']['byId']>,
): void {
  if (
    typeof authority !== 'object' ||
    authority === null ||
    !issuedPreparedSkillPlanInheritanceAuthorities.has(authority as object) ||
    !Object.isFrozen(sourceById) ||
    !Object.isFrozen(nextById)
  ) {
    throw new TypeError('Prepared Dyson V2 Skill plan inheritance requires frozen records.')
  }
  const plan = defaultCompiledSkillPlansBySkillState.get(sourceById as object)
  if (plan === undefined) {
    throw new TypeError('Prepared Dyson V2 Skill plan inheritance requires a validated source plan.')
  }
  for (const id of FAST_TIMER_SKILL_IDS) {
    const source = sourceById[id]!
    const next = nextById[id]!
    if (
      source.owned !== next.owned ||
      source.level !== next.level ||
      source.secondaryTimerSeconds !== next.secondaryTimerSeconds ||
      !Number.isFinite(next.timerSeconds) ||
      next.timerSeconds < source.timerSeconds
    ) {
      throw new TypeError(`Prepared Dyson V2 Skill plan inheritance changed '${id}' structurally.`)
    }
  }
  defaultCompiledSkillPlansBySkillState.set(nextById as object, plan)
}

export function deriveDysonV2FromCauses(
  state: Readonly<CanonicalGameStateV2>,
  runtimeEvidence: DysonV2CauseEvidence,
  lookup: DysonV2CatalogLookup = getGameAsset,
): Readonly<DerivedDysonV2Causes> {
  requireFrozenBoundary(state, runtimeEvidence)
  const { tuning, evaluationSnapshot } = validateRuntimeEvidence(
    runtimeEvidence,
    state.infinity.secretsOfTheUniverse,
  )
  validateCatalogClosure(state, lookup)
  const compiledSkillPlan = lookup === getGameAsset
    ? defaultCompiledSkillPlansBySkillState.get(state.skills.byId as object)
    : undefined
  if (
    lookup === getGameAsset &&
    (defaultSkillDatabaseValidated.has(state.skills.byId as object) ||
      compiledSkillPlan?.snapshotIndependent === true) &&
    lastDefaultSnapshotIndependentDerivation !== undefined &&
    lastDefaultSnapshotIndependentDerivation.tuning === tuning &&
    sameDefaultNoSkillCauses(
      lastDefaultSnapshotIndependentDerivation.state,
      state,
    )
  ) {
    return lastDefaultSnapshotIndependentDerivation.result
  }
  const secrets = deriveSecretBuffs(state.infinity.secretsOfTheUniverse)
  const research = materializeResearch(state, tuning, secrets.researchCoefficientOverrides, lookup)
  const skills = materializeSkills(state, evaluationSnapshot, tuning, lookup)
  const quantumCash = addGameDecimals(
    GAME_DECIMAL_ONE,
    multiplyGameDecimals(state.quantum.cashBonusLevels, gameDecimalFromNumber(0.05)),
  )
  const quantumScience = addGameDecimals(
    GAME_DECIMAL_ONE,
    multiplyGameDecimals(state.quantum.scienceBonusLevels, gameDecimalFromNumber(0.05)),
  )
  const avocado = deriveAvocadoMultiplier(state, lookup)
  const totalInfinity = addGameDecimals(
    state.infinity.availablePoints,
    state.infinity.allocatedPoints,
  )
  const moneyMultiplier = applyEffects(GAME_DECIMAL_ONE, [
    ...effectsAt(research, 'Global.MoneyMultiplier'),
    ...effectsAt(skills, 'Global.MoneyMultiplier'),
    multiplier('prestige.cash_multiplier', quantumCash, 85),
    multiplier('secrets.cash_multiplier', gameDecimalFromNumber(secrets.multipliers.cash), 90),
    multiplier('prestige.avocato_multiplier', avocado, 95),
  ])
  const scienceMultiplier = applyEffects(GAME_DECIMAL_ONE, [
    ...effectsAt(research, 'Global.ScienceMultiplier'),
    ...effectsAt(skills, 'Global.ScienceMultiplier'),
    multiplier('prestige.science_multiplier', quantumScience, 85),
    multiplier('secrets.science_multiplier', gameDecimalFromNumber(secrets.multipliers.science), 90),
    multiplier('prestige.avocato_multiplier', avocado, 95),
  ])
  const secretFacility = Object.freeze({
    assembly_lines: secrets.multipliers.assemblyLines,
    ai_managers: secrets.multipliers.aiManagers,
    servers: secrets.multipliers.servers,
    data_centers: 1,
    planets: secrets.multipliers.planets,
    matrioshka_brains: 1,
    birch_planets: 1,
    galactic_brains: 1,
  } satisfies Record<CanonicalFacilityId, number>)
  const facilityModifiers = Object.freeze(Object.fromEntries(
    DYSON_V2_FACILITY_IDS.map((id) => [id, applyEffects(GAME_DECIMAL_ONE, [
      ...effectsAt(research, FACILITY_MODIFIER_STATS[id]),
      ...effectsAt(skills, FACILITY_MODIFIER_STATS[id]),
      multiplier('prestige.infinity', infinityMultiplier(totalInfinity, INFINITY_THRESHOLDS[id]), 88),
      multiplier('secrets.facility', gameDecimalFromNumber(secretFacility[id]), 90),
      multiplier('prestige.avocato_modifier', avocado, 95),
    ])]),
  ) as Record<CanonicalFacilityId, GameDecimal>)
  const effectMap: Partial<Record<ParametersKey, readonly DysonV2StatEffect[]>> = {
    panelLifetimeSeconds: freezeEffects([
      ...effectsAt(research, 'Global.PanelLifetime'),
      ...effectsAt(skills, 'Global.PanelLifetime'),
    ]),
    panels: freezeEffects(effectsAt(skills, 'Global.PanelsPerSecond')),
    money: freezeEffects(effectsAt(skills, 'Global.MoneyPerSecond')),
    science: freezeEffects(effectsAt(skills, 'Global.SciencePerSecond')),
  }
  for (const id of DYSON_V2_FACILITY_IDS) {
    const stat = FACILITY_PRODUCTION_STATS[id]
    effectMap[id] = freezeEffects(stat === undefined ? [] : effectsAt(skills, stat))
  }
  const planetEffects = effectsAt(skills, 'Global.PlanetsPerSecond')
  const parameters: Readonly<DysonV2DerivationParameters> = Object.freeze({
    panelRateMultiplier: gameDecimalFromNumber(tuning.panelsPerSecMulti),
    panelLifetimeSeconds: gameDecimalFromNumber(10),
    moneyMultiplier,
    scienceMultiplier,
    planetGenerationPerSecond: applyEffects(GAME_DECIMAL_ZERO, planetEffects),
    facilityModifiers,
    effects: Object.freeze(effectMap),
  })
  const production = deriveDysonV2Production(state, parameters)
  const auxiliary = Object.freeze({
    scienceBoostPerSecond: applyEffects(GAME_DECIMAL_ZERO, effectsAt(skills, 'Global.ScienceBoostPerSecond')),
    moneyUpgradePerSecond: applyEffects(GAME_DECIMAL_ZERO, effectsAt(skills, 'Global.MoneyMultiUpgradePerSecond')),
    tinkerAssemblyYield: applyEffects(GAME_DECIMAL_ZERO, effectsAt(skills, 'Global.Tinker.AssemblyYield')),
    scientificPlanetsProduction: applyEffects(
      GAME_DECIMAL_ZERO,
      planetEffects.filter((effect) => effect.id === 'effect.scientificPlanets.planets_per_second'),
    ),
  })
  const nextEvaluationSnapshot = Object.freeze({
    panelsPerSecond: production.rates.panels,
    panelLifetimeSeconds: production.panelLifetimeSeconds,
    scienceMultiplier,
    rudimentarySingularityProduction:
      production.intermediates.rudimentarySingularityProduction,
    pocketDimensionsProduction:
      production.intermediates.pocketDimensionsProduction,
    scientificPlanetsProduction: auxiliary.scientificPlanetsProduction,
    managerAssemblyLineProduction: production.rates.assembly_lines,
  })
  const result = Object.freeze({
    parameters,
    production,
    auxiliary,
    nextEvaluationSnapshot,
  })
  if (
    lookup === getGameAsset &&
    (defaultSkillDatabaseValidated.has(state.skills.byId as object) ||
      defaultCompiledSkillPlansBySkillState.get(state.skills.byId as object)
        ?.snapshotIndependent === true)
  ) {
    lastDefaultSnapshotIndependentDerivation = Object.freeze({ state, tuning, result })
  }
  return result
}

function sameDefaultNoSkillCauses(
  left: Readonly<CanonicalGameStateV2>,
  right: Readonly<CanonicalGameStateV2>,
): boolean {
  return left.research.levelsById === right.research.levelsById &&
    left.skills.byId === right.skills.byId &&
    left.skills.fragments === right.skills.fragments &&
    left.skills.points === right.skills.points &&
    left.infinity.availablePoints === right.infinity.availablePoints &&
    left.infinity.allocatedPoints === right.infinity.allocatedPoints &&
    left.infinity.secretsOfTheUniverse === right.infinity.secretsOfTheUniverse &&
    left.quantum.cashBonusLevels === right.quantum.cashBonusLevels &&
    left.quantum.scienceBonusLevels === right.quantum.scienceBonusLevels &&
    left.quantum.unlocks === right.quantum.unlocks &&
    left.avocado === right.avocado &&
    left.dyson.facilities === right.dyson.facilities &&
    left.dyson.bots === right.dyson.bots &&
    left.dyson.workers === right.dyson.workers &&
    left.dyson.researchers === right.dyson.researchers &&
    left.dyson.totalPanelsDecayed === right.dyson.totalPanelsDecayed &&
    left.dyson.botDistribution === right.dyson.botDistribution
}

type ParametersKey = 'panelLifetimeSeconds' | 'panels' | 'money' | 'science' | CanonicalFacilityId

export function advanceActiveDysonV2FromCauses(
  state: Readonly<CanonicalGameStateV2>,
  evidence: DysonV2CauseEvidence,
  seconds: number,
  lookup: DysonV2CatalogLookup = getGameAsset,
): Readonly<DysonV2ProductionAdvanceResult> {
  return advanceActiveDysonV2Production(
    state,
    deriveDysonV2FromCauses(state, evidence, lookup).parameters,
    seconds,
  )
}

export function advanceOfflineDysonV2FromCauses(
  state: Readonly<CanonicalGameStateV2>,
  evidence: DysonV2CauseEvidence,
  seconds: number,
  lookup: DysonV2CatalogLookup = getGameAsset,
): Readonly<DysonV2ProductionAdvanceResult> {
  return advanceOfflineDysonV2Production(
    state,
    deriveDysonV2FromCauses(state, evidence, lookup).parameters,
    seconds,
  )
}

type EffectByStat = Readonly<Record<string, readonly DysonV2StatEffect[]>>

function materializeResearch(
  state: Readonly<CanonicalGameStateV2>,
  tuning: Readonly<V2LegacyRuntimeEvidence['compatibilityTuning']>,
  overrides: Readonly<Partial<Record<SecretResearchCoefficientId, number>>>,
  lookup: DysonV2CatalogLookup,
): EffectByStat {
  if (lookup === getGameAsset) {
    const byTuning = defaultResearchEffects.get(state.research as object)
    const bySecrets = byTuning?.get(tuning as object)
    const cached = bySecrets?.get(state.infinity.secretsOfTheUniverse)
    if (cached !== undefined) return cached
  }
  const result: Record<string, DysonV2StatEffect[]> = {}
  for (const [researchId, effectId, target, coefficientField, maxLevel, perLevel] of RESEARCH_SPECS) {
    const definition = lookup('GameData.ResearchDefinition', researchId)
    const effect = lookup('GameData.EffectDefinition', effectId)
    const references = requireReferences(definition?.data.effects, `${researchId}.effects`)
    if (
      definition?.kind !== 'GameData.ResearchDefinition' ||
      definition.id !== researchId ||
      definition.data.maxLevel !== maxLevel ||
      references.length !== 1 ||
      references[0]?.id !== effectId
    ) {
      throw new Error(`Research catalog '${researchId}' does not match its closed Dyson contract.`)
    }
    const parsed = parseEffect(effect, effectId)
    if (
      parsed.targetStatId !== target ||
      parsed.operation !== 0 ||
      parsed.order !== 0 ||
      parsed.value !== 0 ||
      parsed.perLevel !== perLevel ||
      parsed.conditionId !== null ||
      parsed.conditionAssetId !== null ||
      parsed.targetFacilityIds.length !== 0 ||
      parsed.targetFacilityTags.length !== 0
    ) {
      throw new Error(`Research effect '${effectId}' does not match its closed Dyson contract.`)
    }
    const level = researchLevel(state, researchId)
    if (compareGameDecimals(level, GAME_DECIMAL_ZERO) === 0) continue
    const coefficient = coefficientField === null
      ? gameDecimalFromNumber(perLevel)
      : gameDecimalFromNumber(
          overrides[researchId as SecretResearchCoefficientId] ?? tuning[coefficientField],
        )
    addEffect(result, target, {
      id: effectId,
      operation: 'add',
      value: multiplyGameDecimals(level, coefficient),
      order: 0,
    })
  }
  const frozen = freezeByStat(result)
  if (lookup === getGameAsset) {
    let byTuning = defaultResearchEffects.get(state.research as object)
    if (byTuning === undefined) {
      byTuning = new WeakMap<object, Map<bigint, EffectByStat>>()
      defaultResearchEffects.set(state.research as object, byTuning)
    }
    let bySecrets = byTuning.get(tuning as object)
    if (bySecrets === undefined) {
      bySecrets = new Map<bigint, EffectByStat>()
      byTuning.set(tuning as object, bySecrets)
    }
    bySecrets.set(state.infinity.secretsOfTheUniverse, frozen)
  }
  return frozen
}

function researchLevel(state: Readonly<CanonicalGameStateV2>, id: CanonicalResearchId): GameDecimal {
  const value = state.research.levelsById[id]
  return typeof value === 'bigint' ? gameDecimalFromBigInt(value) : value
}

function materializeSkills(
  state: Readonly<CanonicalGameStateV2>,
  evaluationSnapshot: Readonly<DysonV2EvaluationSnapshot>,
  tuning: Readonly<V2LegacyRuntimeEvidence['compatibilityTuning']>,
  lookup: DysonV2CatalogLookup,
): EffectByStat {
  if (
    lookup === getGameAsset &&
    defaultSkillDatabaseValidated.has(state.skills.byId as object)
  ) return EMPTY_EFFECTS_BY_STAT
  const database = lookup('GameData.SkillDatabase', 'SkillDatabase')
  if (database?.kind !== 'GameData.SkillDatabase' || database.id !== 'SkillDatabase') {
    throw new Error('Generated catalog is missing the closed SkillDatabase.')
  }
  const inheritedPlan = lookup === getGameAsset
    ? defaultCompiledSkillPlansBySkillState.get(state.skills.byId as object)
    : undefined
  if (inheritedPlan?.database === database) {
    defaultCompiledSkillPlanHits += 1
    return evaluateCompiledSkills(
      inheritedPlan.effects,
      state,
      evaluationSnapshot,
      tuning,
      lookup,
    )
  }
  let references: readonly Readonly<RuntimeAssetReference>[] | undefined
  let catalogIds: readonly (string | null)[]
  let catalogIdSet: ReadonlySet<string>
  if (
    lookup === getGameAsset &&
    lastDefaultCompiledSkillPlan?.database === database
  ) {
    catalogIds = lastDefaultCompiledSkillPlan.catalogIds
    catalogIdSet = lastDefaultCompiledSkillPlan.catalogIdSet
  } else {
    references = requireReferences(database.data.skills, 'SkillDatabase.skills')
    catalogIds = references.map((reference) => reference.id)
    catalogIdSet = new Set(catalogIds.filter((id): id is string => id !== null))
  }
  const stateIds = Object.keys(state.skills.byId)
  if (
    catalogIds.some((id) => id === null) ||
    catalogIds.length !== stateIds.length ||
    catalogIdSet.size !== catalogIds.length ||
    stateIds.some((id) => !catalogIdSet.has(id))
  ) {
    throw new Error('Generated SkillDatabase and canonical V2 Skill keys have drifted.')
  }
  if (
    lookup === getGameAsset &&
    !Object.values(state.skills.byId).some((skill) => skill.owned)
  ) {
    defaultSkillDatabaseValidated.add(state.skills.byId as object)
    return EMPTY_EFFECTS_BY_STAT
  }
  const cachedDefaultPlan = lookup === getGameAsset &&
      lastDefaultCompiledSkillPlan?.database === database &&
      defaultCompiledSkillPlanMatchesState(lastDefaultCompiledSkillPlan, state)
    ? lastDefaultCompiledSkillPlan
    : undefined
  let compiledEffects: readonly Readonly<ParsedEffect>[]
  if (cachedDefaultPlan !== undefined) {
    defaultCompiledSkillPlanHits += 1
    compiledEffects = cachedDefaultPlan.effects
    defaultCompiledSkillPlansBySkillState.set(
      state.skills.byId as object,
      cachedDefaultPlan,
    )
  } else {
    const effects: Readonly<ParsedEffect>[] = []
    references ??= requireReferences(database.data.skills, 'SkillDatabase.skills')
    for (const reference of references) {
      const skillId = reference.id!
      if (!state.skills.byId[skillId]!.owned) continue
      const skill = lookup('GameData.SkillDefinition', skillId)
      if (skill?.kind !== 'GameData.SkillDefinition' || skill.id !== skillId) {
        throw new Error(`Generated SkillDatabase references missing skill '${skillId}'.`)
      }
      for (const effectReference of requireReferences(
        skill.data.effects,
        `skills.${skillId}.effects`,
      )) {
        if (effectReference.id === null) continue
        const parsed = parseEffect(
          lookup('GameData.EffectDefinition', effectReference.id),
          effectReference.id,
        )
        if (
          !MATERIALIZED_STATS.includes(
            parsed.targetStatId as typeof MATERIALIZED_STATS[number],
          ) ||
          !matchesFacility(parsed, parsed.targetStatId)
        ) continue
        effects.push(parsed)
      }
    }
    compiledEffects = Object.freeze(effects)
    if (lookup === getGameAsset) {
      defaultCompiledSkillPlanCompilations += 1
      const plan = Object.freeze({
        database,
        catalogIds: Object.freeze(catalogIds as readonly string[]),
        catalogIdSet,
        ownedLevels: Object.freeze(catalogIds.map((skillId) => {
          const skill = state.skills.byId[skillId!]!
          return skill.owned ? skill.level : null
        })),
        effects: compiledEffects,
        snapshotIndependent: compiledEffects.every(
          (effect) => effect.id === 'effect.androids.panel_lifetime' ||
            effect.id.startsWith('effect.superRadiantScattering.'),
        ),
      })
      lastDefaultCompiledSkillPlan = plan
      defaultCompiledSkillPlansBySkillState.set(state.skills.byId as object, plan)
    }
  }
  return evaluateCompiledSkills(
    compiledEffects,
    state,
    evaluationSnapshot,
    tuning,
    lookup,
  )
}

function evaluateCompiledSkills(
  compiledEffects: readonly Readonly<ParsedEffect>[],
  state: Readonly<CanonicalGameStateV2>,
  evaluationSnapshot: Readonly<DysonV2EvaluationSnapshot>,
  tuning: Readonly<V2LegacyRuntimeEvidence['compatibilityTuning']>,
  lookup: DysonV2CatalogLookup,
): EffectByStat {
  const result: Record<string, DysonV2StatEffect[]> = {}
  let superRadiantScattering: GameDecimal | undefined
  for (const parsed of compiledEffects) {
    if (!conditionMet(parsed, state, lookup)) continue
    const dynamic = parsed.id.startsWith('effect.superRadiantScattering.')
      ? (superRadiantScattering ??= gameDecimalFromNumber(
          1 + 0.01 * (state.skills.byId.superRadiantScattering?.timerSeconds ?? 0),
        ))
      : resolveDynamicEffect(parsed.id, state, evaluationSnapshot, tuning)
    const rawValue = dynamic ?? gameDecimalFromNumber(Math.abs(parsed.value + parsed.perLevel))
    const translated = translateEffect(parsed, rawValue, dynamic === undefined ? parsed.value + parsed.perLevel : undefined)
    if (translated !== null) addEffect(result, parsed.targetStatId, translated)
  }
  return freezeByStat(result)
}

function defaultCompiledSkillPlanMatchesState(
  plan: Readonly<{ catalogIds: readonly string[]; ownedLevels: readonly (bigint | null)[] }>,
  state: Readonly<CanonicalGameStateV2>,
): boolean {
  for (let index = 0; index < plan.catalogIds.length; index += 1) {
    const skill = state.skills.byId[plan.catalogIds[index]!]!
    const expectedLevel = plan.ownedLevels[index]
    if (skill.owned !== (expectedLevel !== null)) return false
    if (expectedLevel !== null && skill.level !== expectedLevel) return false
  }
  return true
}

interface ParsedEffect {
  readonly id: string
  readonly targetStatId: string
  readonly operation: number
  readonly value: number
  readonly perLevel: number
  readonly order: number
  readonly conditionId: string | null
  readonly conditionAssetId: string | null
  readonly targetFacilityIds: readonly string[]
  readonly targetFacilityTags: readonly string[]
}

function parseEffect(asset: RuntimeGameAsset | undefined, expectedId: string): ParsedEffect {
  if (asset?.kind !== 'GameData.EffectDefinition' || asset.id !== expectedId) {
    throw new Error(`Generated catalog is missing effect '${expectedId}'.`)
  }
  const data = asset.data
  const parsed: ParsedEffect = {
    id: requireString(data.id, `${expectedId}.id`),
    targetStatId: requireString(data.targetStatId, `${expectedId}.targetStatId`),
    operation: requireNumber(data.operation, `${expectedId}.operation`),
    value: requireNumber(data.value, `${expectedId}.value`),
    perLevel: requireNumber(data.perLevel, `${expectedId}.perLevel`),
    order: requireNumber(data.order, `${expectedId}.order`),
    conditionId: requireNullableString(data.conditionId, `${expectedId}.conditionId`),
    conditionAssetId: optionalReferenceId(data._condition, `${expectedId}._condition`),
    targetFacilityIds: requireStrings(data.targetFacilityIds, `${expectedId}.targetFacilityIds`),
    targetFacilityTags: requireStrings(data.targetFacilityTags, `${expectedId}.targetFacilityTags`),
  }
  if (parsed.id !== expectedId || !Number.isSafeInteger(parsed.operation) || !Number.isFinite(parsed.order)) {
    throw new Error(`Generated effect '${expectedId}' has unsupported identity or ordering.`)
  }
  return parsed
}

function translateEffect(
  effect: ParsedEffect,
  magnitude: GameDecimal,
  authoredValue?: number,
): DysonV2StatEffect | null {
  if (effect.operation === 2) {
    const exponent = authoredValue ?? effect.value + effect.perLevel
    if (!Number.isFinite(exponent)) throw new Error(`Effect '${effect.id}' has an invalid exponent.`)
    if (Math.abs(exponent - 1) <= 1e-12) return null
    return Object.freeze({ id: effect.id, operation: 'power', exponent, order: effect.order })
  }
  const operation = effect.operation === 0
    ? (authoredValue !== undefined && authoredValue < 0 ? 'subtract' : 'add')
    : effect.operation === 1
      ? 'multiply'
      : effect.operation === 3
        ? 'override'
        : effect.operation === 4
          ? 'clamp-min'
          : effect.operation === 5
            ? 'clamp-max'
            : unsupportedOperation(effect)
  if (operation === 'subtract' && effect.id !== 'effect.burnOut.panel_lifetime') {
    throw new Error(`Generated negative effect '${effect.id}' is outside the closed translation contract.`)
  }
  // Unity's SkillEffectProvider omits authored/dynamic identity effects within
  // 1e-12. This compatibility filter is local to Skill materialization; it is
  // not an affordability, currency, debit, or general Decimal equality rule.
  if (
    (operation === 'add' || operation === 'subtract') &&
    compareGameDecimals(magnitude, gameDecimalFromNumber(1e-12)) <= 0
  ) return null
  if (
    operation === 'multiply' &&
    compareGameDecimals(distanceFromOne(magnitude), gameDecimalFromNumber(1e-12)) <= 0
  ) return null
  return Object.freeze({ id: effect.id, operation, value: magnitude, order: effect.order })
}

function resolveDynamicEffect(
  effectId: string,
  state: Readonly<CanonicalGameStateV2>,
  snapshot: Readonly<DysonV2EvaluationSnapshot>,
  tuning: Readonly<V2LegacyRuntimeEvidence['compatibilityTuning']>,
): GameDecimal | undefined {
  switch (effectId) {
    case 'effect.staying_power.assembly_lines':
      return addGameDecimals(GAME_DECIMAL_ONE, multiplyGameDecimals(
        gameDecimalFromNumber(Math.fround(0.01)),
        snapshot.panelLifetimeSeconds,
      ))
    case 'effect.rudimentary_singularity.data_centers':
      return snapshot.rudimentarySingularityProduction
    case 'effect.pocket_dimensions.planets':
      return snapshot.pocketDimensionsProduction
    case 'effect.parallel_computation.data_centers': {
      const servers = facilityTotal(state, 'servers')
      return compareGameDecimals(servers, GAME_DECIMAL_ONE) > 0
        ? addGameDecimals(GAME_DECIMAL_ONE, multiplyGameDecimals(
            gameDecimalFromNumber(Math.fround(0.1)),
            logGameDecimal(servers, 2),
          ))
        : GAME_DECIMAL_ONE
    }
    case 'effect.panelMaintenance.panel_lifetime':
      return gameDecimalFromNumber(
        state.quantum.unlocks.botMultitasking ? 100 : (1 - state.dyson.botDistribution) * 100,
      )
    case 'effect.androids.panel_lifetime':
      return gameDecimalFromNumber(Math.floor(Math.min(200, (state.skills.byId.androids?.timerSeconds ?? 0) / 3)))
    case 'effect.panelWarranty.panel_lifetime':
      return state.skills.fragments > 1n
        ? powGameDecimal(gameDecimalFromNumber(2), checkedFragmentExponent(state.skills.fragments))
        : GAME_DECIMAL_ONE
    case 'effect.artificiallyEnhancedPanels.panel_lifetime': {
      const managers = facilityTotal(state, 'ai_managers')
      return compareGameDecimals(managers, GAME_DECIMAL_ONE) >= 0
        ? multiplyGameDecimals(gameDecimalFromNumber(5), logGameDecimal(managers, 10))
        : GAME_DECIMAL_ZERO
    }
    case 'effect.renewableEnergy.panel_lifetime':
      return compareGameDecimals(state.dyson.workers, gameDecimalFromNumber(1e7)) >= 0
        ? addGameDecimals(GAME_DECIMAL_ONE, multiplyGameDecimals(
            gameDecimalFromNumber(0.1),
            logGameDecimal(divideGameDecimals(state.dyson.workers, gameDecimalFromNumber(1e6)), 10),
          ))
        : GAME_DECIMAL_ONE
    case 'effect.citadelCouncil.panel_lifetime':
      return compareGameDecimals(state.dyson.totalPanelsDecayed, GAME_DECIMAL_ONE) > 0
        ? logGameDecimal(state.dyson.totalPanelsDecayed, 1.2)
        : GAME_DECIMAL_ZERO
    case 'effect.stellarDominance.panel_lifetime':
      return gameDecimalFromNumber(
        compareGameDecimals(state.dyson.bots, stellarRequiredBots(state, snapshot)) > 0 ? 10 : 1,
      )
    case 'effect.reapers.panels_per_second':
      return compareGameDecimals(state.dyson.totalPanelsDecayed, gameDecimalFromNumber(2)) > 0
        ? addGameDecimals(GAME_DECIMAL_ONE, multiplyGameDecimals(logGameDecimal(state.dyson.totalPanelsDecayed, 2), gameDecimalFromNumber(0.1)))
        : GAME_DECIMAL_ONE
    case 'effect.rocketMania.panels_per_second':
      return compareGameDecimals(snapshot.panelsPerSecond, gameDecimalFromNumber(20)) > 0
        ? logGameDecimal(snapshot.panelsPerSecond, 20)
        : GAME_DECIMAL_ONE
    case 'effect.scientificPlanets.planets_per_second': {
      let value = compareGameDecimals(state.dyson.researchers, GAME_DECIMAL_ONE) > 0
        ? logGameDecimal(state.dyson.researchers, 10)
        : GAME_DECIMAL_ZERO
      if (state.skills.byId.hubbleTelescope?.owned) value = multiplyGameDecimals(value, gameDecimalFromNumber(2))
      if (state.skills.byId.jamesWebbTelescope?.owned) value = multiplyGameDecimals(value, gameDecimalFromNumber(4))
      if (state.skills.byId.terraformingProtocols?.owned) value = addGameDecimals(value, gameDecimalFromBigInt(state.skills.fragments))
      return value
    }
    case 'effect.planetAssembly.planets_per_second': {
      const assembly = facilityTotal(state, 'assembly_lines')
      return compareGameDecimals(assembly, gameDecimalFromNumber(10)) >= 0
        ? logGameDecimal(assembly, 10)
        : GAME_DECIMAL_ZERO
    }
    case 'effect.shellWorlds.planets_per_second': {
      const planets = facilityTotal(state, 'planets')
      return state.skills.byId.planetAssembly?.owned &&
        compareGameDecimals(planets, gameDecimalFromNumber(2)) >= 0
        ? logGameDecimal(planets, 2)
        : GAME_DECIMAL_ZERO
    }
    case 'effect.shouldersOfTheFallen.planets_per_second': {
      const level = researchLevel(state, 'research.science_boost')
      return compareGameDecimals(level, GAME_DECIMAL_ZERO) > 0 &&
        state.skills.byId.scientificPlanets?.owned
        ? logGameDecimal(level, 2)
        : GAME_DECIMAL_ZERO
    }
    case 'effect.stellarSacrifices.planets_per_second': {
      if (compareGameDecimals(state.dyson.bots, stellarRequiredBots(state, snapshot)) < 0) {
        return GAME_DECIMAL_ZERO
      }
      let galaxies = snapshotGalaxies(snapshot)
      if (state.skills.byId.stellarObliteration?.owned) galaxies = multiplyGameDecimals(galaxies, gameDecimalFromNumber(1_000))
      if (state.skills.byId.supernova?.owned) galaxies = multiplyGameDecimals(galaxies, gameDecimalFromNumber(1_000))
      if (compareGameDecimals(galaxies, gameDecimalFromNumber(10)) > 0) {
        return powGameDecimal(logGameDecimal(galaxies, 10), 2)
      }
      return compareGameDecimals(galaxies, GAME_DECIMAL_ONE) > 0
        ? logGameDecimal(galaxies, 10)
        : GAME_DECIMAL_ZERO
    }
    case 'effect.shouldersOfGiants.science_boost_per_second':
      return state.skills.byId.scientificPlanets?.owned
        ? addGameDecimals(snapshot.scientificPlanetsProduction, shouldersBonus(state))
        : GAME_DECIMAL_ZERO
    case 'effect.whatCouldHaveBeen.science_boost_per_second':
      return state.skills.byId.shouldersOfGiants?.owned &&
        state.skills.byId.scientificPlanets?.owned
        ? addGameDecimals(
            snapshot.pocketDimensionsProduction,
            state.skills.byId.shoulderSurgery?.owned ? shouldersBonus(state) : GAME_DECIMAL_ZERO,
          )
        : GAME_DECIMAL_ZERO
    case 'effect.shouldersOfTheEnlightened.money_multi_upgrade_per_second':
      return state.skills.byId.scientificPlanets?.owned
        ? addGameDecimals(snapshot.scientificPlanetsProduction, shouldersBonus(state))
        : GAME_DECIMAL_ZERO
    case 'effect.manualLabour.tinker_assembly_yield':
      return minGameDecimal(
        divideGameDecimals(facilityTotal(state, 'assembly_lines'), gameDecimalFromNumber(50)),
        multiplyGameDecimals(snapshot.managerAssemblyLineProduction, gameDecimalFromNumber(20)),
      )
    case 'effect.versatileProductionTactics.tinker_assembly_yield':
      return gameDecimalFromNumber(1.5)
  }
  const modifier = /^effect\.([^.]+)\.[^.]+_modifier$/u.exec(effectId)?.[1]
  if (modifier === 'fragmentAssembly') return gameDecimalFromNumber(state.skills.fragments > 4n ? 3 : 1)
  if (modifier === 'progressiveAssembly') return addGameDecimals(GAME_DECIMAL_ONE, multiplyGameDecimals(gameDecimalFromBigInt(state.skills.fragments), gameDecimalFromNumber(0.5)))
  if (modifier === 'versatileProductionTactics') {
    if (effectId.endsWith('.assembly_lines_modifier')) return gameDecimalFromNumber(1.5)
    if (effectId.endsWith('.planets_modifier')) {
      const pair = state.dyson.facilities.planets
      const effective = addGameDecimals(
        pair[0],
        multiplyGameDecimals(pair[1], gameDecimalFromNumber(state.skills.byId.terraIrradiant?.owned ? 12 : 1)),
      )
      return gameDecimalFromNumber(
        compareGameDecimals(
          effective,
          gameDecimalFromNumber(productionScalingThresholdV2(state)),
        ) >= 0 ? 1.5 : 1,
      )
    }
    return GAME_DECIMAL_ONE
  }
  if (modifier === 'oneMinutePlan') return gameDecimalFromNumber(compareGameDecimals(snapshot.panelLifetimeSeconds, gameDecimalFromNumber(60)) > 0 ? 5 : 1.5)
  if (modifier === 'dysonSubsidies') return gameDecimalFromNumber(
    compareGameDecimals(snapshotStars(snapshot), GAME_DECIMAL_ONE) > 0 ? 2 : 1,
  )
  if (modifier === 'purityOfBody') return state.skills.points > 0n ? multiplyGameDecimals(gameDecimalFromBigInt(state.skills.points), gameDecimalFromNumber(1.25)) : GAME_DECIMAL_ONE
  if (modifier === 'clusterNetworking' || modifier === 'parallelProcessing' || modifier === 'hypercubeNetworks') {
    const servers = facilityTotal(state, 'servers')
    if (compareGameDecimals(servers, GAME_DECIMAL_ONE) <= 0) return GAME_DECIMAL_ONE
    const coefficient = modifier === 'clusterNetworking'
      ? Math.fround(0.05)
      : modifier === 'parallelProcessing'
        ? Math.fround(0.05)
        : 0.1
    return addGameDecimals(
      GAME_DECIMAL_ONE,
      multiplyGameDecimals(
        gameDecimalFromNumber(coefficient),
        logGameDecimal(servers, modifier === 'clusterNetworking' || modifier === 'hypercubeNetworks' ? 10 : 2),
      ),
    )
  }
  if (modifier === 'whatWillComeToPass') return addGameDecimals(
    GAME_DECIMAL_ONE,
    multiplyGameDecimals(state.dyson.facilities.data_centers[1], gameDecimalFromNumber(0.01)),
  )
  if (modifier === 'galacticPradigmShift') return gameDecimalFromNumber(
    compareGameDecimals(snapshotGalaxies(snapshot), GAME_DECIMAL_ONE) > 0 ? 3 : 1.5,
  )
  if (modifier === 'purityOfSEssence') return state.skills.points > 0n ? multiplyGameDecimals(gameDecimalFromBigInt(state.skills.points), gameDecimalFromNumber(1.42)) : GAME_DECIMAL_ONE
  if (modifier === 'superRadiantScattering') return gameDecimalFromNumber(1 + 0.01 * (state.skills.byId.superRadiantScattering?.timerSeconds ?? 0))
  const moneySkill = extractEffectSkill(effectId, '.money_multiplier')
  if (moneySkill !== undefined) return resolveMoneyScienceDynamic(moneySkill, 'money', state, snapshot, tuning)
  const scienceSkill = extractEffectSkill(effectId, '.science_multiplier')
  if (scienceSkill !== undefined) return resolveMoneyScienceDynamic(scienceSkill, 'science', state, snapshot, tuning)
  return undefined
}

function matchesFacility(effect: ParsedEffect, stat: string): boolean {
  const facility = facilityForStat(stat)
  if (facility === undefined) return effect.targetFacilityIds.length === 0 && effect.targetFacilityTags.length === 0
  if (effect.targetFacilityTags.length > 0) throw new Error(`Effect '${effect.id}' uses unsupported facility tags.`)
  return effect.targetFacilityIds.length === 0 || effect.targetFacilityIds.some((id) => id.toLowerCase() === facility.toLowerCase())
}

function conditionMet(
  effect: ParsedEffect,
  state: Readonly<CanonicalGameStateV2>,
  lookup: DysonV2CatalogLookup,
): boolean {
  if (effect.conditionAssetId === null && effect.conditionId === null) return true
  if (effect.conditionAssetId === null) {
    const match = /^(assembly_lines|ai_managers|servers|data_centers|planets)_69$/u.exec(effect.conditionId!)
    if (match === null) throw new Error(`Effect '${effect.id}' has unsupported legacy condition '${effect.conditionId}'.`)
    return compareGameDecimals(state.dyson.facilities[match[1] as CanonicalFacilityId][1], gameDecimalFromNumber(69)) >= 0
  }
  const condition = lookup('IdleDysonSwarm.Data.Conditions.FacilityCountCondition', effect.conditionAssetId)
    ?? lookup('IdleDysonSwarm.Data.Conditions.FacilityStateCondition', effect.conditionAssetId)
  if (condition === undefined) throw new Error(`Effect '${effect.id}' references missing condition '${effect.conditionAssetId}'.`)
  const countCondition = condition.kind === 'IdleDysonSwarm.Data.Conditions.FacilityCountCondition'
  const facilityReference = condition.data._facilityId
  const facility = countCondition
    ? typeof facilityReference === 'object' && facilityReference !== null && 'id' in facilityReference
      ? (facilityReference as RuntimeAssetReference).id as CanonicalFacilityId
      : missingConditionFacility(condition.id)
    : facilityForStat(effect.targetStatId) ?? missingConditionFacility(condition.id)
  const pair = state.dyson.facilities[facility]
  if (pair === undefined) throw new Error(`Condition '${condition.id}' has unknown facility '${facility}'.`)
  const countType = requireNumber(condition.data._countType ?? condition.data._property, `${condition.id}.countType`)
  const value = countCondition
    ? countType === 0
      ? addGameDecimals(pair[0], pair[1])
      : countType === 1
        ? pair[1]
        : countType === 2
          ? pair[0]
          : unsupportedCondition(condition.id)
    : countType === 0
      ? pair[1]
      : countType === 1
        ? pair[0]
        : countType === 2
          ? addGameDecimals(pair[0], pair[1])
          : unsupportedCondition(condition.id)
  const threshold = gameDecimalFromNumber(requireNumber(condition.data._threshold, `${condition.id}.threshold`))
  const operator = requireNumber(condition.data._operator, `${condition.id}.operator`)
  const comparison = compareGameDecimals(value, threshold)
  if (operator === 0) return comparison === 0
  if (operator === 1) return comparison !== 0
  if (operator === 2) return comparison > 0
  if (operator === 3) return comparison >= 0
  if (operator === 4) return comparison < 0
  if (operator === 5) return comparison <= 0
  throw new Error(`Condition '${condition.id}' has unsupported operator '${operator}'.`)
}

function deriveAvocadoMultiplier(state: Readonly<CanonicalGameStateV2>, lookup: DysonV2CatalogLookup): GameDecimal {
  if (!state.avocado.unlocked) return GAME_DECIMAL_ONE
  const tuning = lookup('IdleDysonSwarm.Data.Balance.RealitySystemTuning', 'RealitySystemTuning')
  const thresholdValue = tuning?.data.avocadoLogThreshold
  if (!Number.isSafeInteger(thresholdValue) || (thresholdValue as number) <= 0) {
    throw new Error('Generated RealitySystemTuning has no valid avocadoLogThreshold.')
  }
  const threshold = gameDecimalFromNumber(thresholdValue as number)
  let result = GAME_DECIMAL_ONE
  for (const value of [state.avocado.infinityPoints, state.avocado.influence, state.avocado.strangeMatter]) {
    if (compareGameDecimals(value, threshold) >= 0) result = multiplyGameDecimals(result, logGameDecimal(value, 10))
  }
  if (compareGameDecimals(state.avocado.overflowMultiplier, GAME_DECIMAL_ONE) >= 0) {
    result = multiplyGameDecimals(result, addGameDecimals(GAME_DECIMAL_ONE, state.avocado.overflowMultiplier))
  }
  return result
}

function resolveMoneyScienceDynamic(
  skillId: string,
  target: 'money' | 'science',
  state: Readonly<CanonicalGameStateV2>,
  snapshot: Readonly<DysonV2EvaluationSnapshot>,
  tuning: Readonly<V2LegacyRuntimeEvidence['compatibilityTuning']>,
): GameDecimal | undefined {
  if (skillId === 'regulatedAcademia') {
    const level = researchLevel(
      state,
      target === 'money' ? 'research.money_multiplier' : 'research.science_boost',
    )
    const coefficient = gameDecimalFromNumber(
      target === 'money' ? tuning.moneyMultiUpgradePercent : tuning.scienceBoostPercent,
    )
    const factor = addGameDecimals(
      gameDecimalFromNumber(1.02),
      multiplyGameDecimals(
        gameDecimalFromNumber(1.01),
        gameDecimalFromBigInt(state.skills.fragments === 0n ? 0n : state.skills.fragments - 1n),
      ),
    )
    return multiplyGameDecimals(
      multiplyGameDecimals(level, coefficient),
      subtractGameDecimals(factor, GAME_DECIMAL_ONE),
    )
  }
  if (skillId === 'economicRevolution' && target === 'money') {
    return gameDecimalFromNumber(state.dyson.botDistribution <= 0.5 || state.quantum.unlocks.botMultitasking ? 5 : 1)
  }
  if (skillId === 'scientificRevolution' && target === 'science') {
    return gameDecimalFromNumber(state.dyson.botDistribution >= 0.5 || state.quantum.unlocks.botMultitasking ? 5 : 1)
  }
  if (skillId === 'workerBoost' && target === 'money') {
    return gameDecimalFromNumber(state.quantum.unlocks.botMultitasking ? 100 : (1 - state.dyson.botDistribution) * 100)
  }
  if (skillId === 'producedAsScienceTree' && target === 'science') {
    return gameDecimalFromNumber(state.quantum.unlocks.botMultitasking ? 100 : state.dyson.botDistribution * 100)
  }
  if (skillId === 'shouldersOfTheRevolution' && target === 'money') {
    return addGameDecimals(
      GAME_DECIMAL_ONE,
      multiplyGameDecimals(researchLevel(state, 'research.science_boost'), gameDecimalFromNumber(0.01)),
    )
  }
  if (skillId === 'shouldersOfPrecursors' && target === 'money') return snapshot.scienceMultiplier
  if (skillId === 'idleSpaceFlight' && target === 'science') {
    return divideGameDecimals(
      multiplyGameDecimals(
        multiplyGameDecimals(snapshot.panelsPerSecond, snapshot.panelLifetimeSeconds),
        gameDecimalFromNumber(0.01),
      ),
      gameDecimalFromNumber(100_000_000),
    )
  }
  if (skillId === 'higgsBoson' && target === 'money') {
    const galaxies = floorGameDecimal(snapshotGalaxies(snapshot))
    return compareGameDecimals(galaxies, GAME_DECIMAL_ONE) >= 0
      ? addGameDecimals(GAME_DECIMAL_ONE, multiplyGameDecimals(galaxies, gameDecimalFromNumber(0.1)))
      : GAME_DECIMAL_ONE
  }
  if (skillId === 'dysonSubsidies' && target === 'money') {
    return compareGameDecimals(floorGameDecimal(snapshotStars(snapshot)), GAME_DECIMAL_ONE) < 0
      ? gameDecimalFromNumber(3)
      : GAME_DECIMAL_ONE
  }
  if (skillId === 'purityOfMind' || skillId === 'purityOfSEssence') {
    const coefficient = skillId === 'purityOfMind' ? 1.5 : 1.42
    return state.skills.points > 0n
      ? multiplyGameDecimals(gameDecimalFromBigInt(state.skills.points), gameDecimalFromNumber(coefficient))
      : GAME_DECIMAL_ONE
  }
  if (skillId === 'monetaryPolicy' && target === 'money') {
    return addGameDecimals(
      GAME_DECIMAL_ONE,
      multiplyGameDecimals(gameDecimalFromBigInt(state.skills.fragments), gameDecimalFromNumber(0.75)),
    )
  }
  if (skillId === 'tasteOfPower') {
    return gameDecimalFromNumber(
      state.skills.byId.indulgingInPower?.owned
        ? state.skills.byId.addictionToPower?.owned ? 0.5 : 0.6
        : 0.75,
    )
  }
  if (skillId === 'stellarObliteration') {
    const galaxies = snapshotGalaxies(snapshot)
    return compareGameDecimals(floorGameDecimal(galaxies), GAME_DECIMAL_ONE) < 0 ||
      compareGameDecimals(galaxies, GAME_DECIMAL_ZERO) === 0
      ? GAME_DECIMAL_ONE
      : divideGameDecimals(GAME_DECIMAL_ONE, galaxies)
  }
  if (skillId === 'stellarDominance' && target === 'money') {
    return gameDecimalFromNumber(compareGameDecimals(state.dyson.bots, stellarRequiredBots(state, snapshot)) > 0 ? 0.01 : 1)
  }
  if (skillId === 'superRadiantScattering') {
    return gameDecimalFromNumber(1 + 0.01 * (state.skills.byId.superRadiantScattering?.timerSeconds ?? 0))
  }
  return undefined
}

function snapshotStars(snapshot: Readonly<DysonV2EvaluationSnapshot>): GameDecimal {
  return divideGameDecimals(
    multiplyGameDecimals(snapshot.panelsPerSecond, snapshot.panelLifetimeSeconds),
    gameDecimalFromNumber(20_000),
  )
}

function snapshotGalaxies(snapshot: Readonly<DysonV2EvaluationSnapshot>): GameDecimal {
  return divideGameDecimals(snapshotStars(snapshot), gameDecimalFromNumber(100_000_000_000))
}

function stellarRequiredBots(
  state: Readonly<CanonicalGameStateV2>,
  snapshot: Readonly<DysonV2EvaluationSnapshot>,
): GameDecimal {
  let required = snapshotStars(snapshot)
  if (state.skills.byId.supernova?.owned) required = multiplyGameDecimals(required, gameDecimalFromNumber(1_000_000))
  else if (state.skills.byId.stellarObliteration?.owned) required = multiplyGameDecimals(required, gameDecimalFromNumber(1_000))
  required = maxGameDecimal(required, GAME_DECIMAL_ONE)
  if (state.skills.byId.stellarDominance?.owned) required = multiplyGameDecimals(required, gameDecimalFromNumber(100))
  if (state.skills.byId.stellarImprovements?.owned) required = divideGameDecimals(required, gameDecimalFromNumber(1_000))
  return required
}

function shouldersBonus(state: Readonly<CanonicalGameStateV2>): GameDecimal {
  const level = researchLevel(state, 'research.science_boost')
  return state.skills.byId.shouldersOfTheFallen?.owned &&
    compareGameDecimals(level, GAME_DECIMAL_ZERO) > 0
    ? logGameDecimal(level, 2)
    : GAME_DECIMAL_ZERO
}

function facilityTotal(state: Readonly<CanonicalGameStateV2>, id: CanonicalFacilityId): GameDecimal {
  return addGameDecimals(state.dyson.facilities[id][0], state.dyson.facilities[id][1])
}

function extractEffectSkill(effectId: string, suffix: string): string | undefined {
  if (!effectId.startsWith('effect.') || !effectId.endsWith(suffix)) return undefined
  const skillId = effectId.slice('effect.'.length, -suffix.length)
  return skillId.length > 0 ? skillId : undefined
}

function infinityMultiplier(total: GameDecimal, threshold: number): GameDecimal {
  if (compareGameDecimals(total, gameDecimalFromNumber(threshold)) < 0) return GAME_DECIMAL_ONE
  return addGameDecimals(GAME_DECIMAL_ONE, minGameDecimal(total, gameDecimalFromNumber(1e44)))
}

function applyEffects(base: GameDecimal, effects: readonly DysonV2StatEffect[]): GameDecimal {
  let result = base
  for (const effect of effects.map((entry, index) => ({ entry, index })).sort((a, b) => a.entry.order - b.entry.order || a.index - b.index).map(({ entry }) => entry)) {
    switch (effect.operation) {
      case 'add': result = addGameDecimals(result, effect.value); break
      case 'subtract':
        if (compareGameDecimals(result, effect.value) < 0) throw new RangeError(`Effect '${effect.id}' would make its target negative.`)
        result = subtractGameDecimals(result, effect.value); break
      case 'multiply': result = multiplyGameDecimals(result, effect.value); break
      case 'power': result = powGameDecimal(result, effect.exponent); break
      case 'override': result = effect.value; break
      case 'clamp-min': result = maxGameDecimal(result, effect.value); break
      case 'clamp-max': result = minGameDecimal(result, effect.value); break
    }
  }
  return result
}

function multiplier(id: string, value: GameDecimal, order: number): DysonV2StatEffect {
  return Object.freeze({ id, operation: 'multiply', value, order })
}

function distanceFromOne(value: GameDecimal): GameDecimal {
  return compareGameDecimals(value, GAME_DECIMAL_ONE) >= 0
    ? subtractGameDecimals(value, GAME_DECIMAL_ONE)
    : subtractGameDecimals(GAME_DECIMAL_ONE, value)
}

function checkedFragmentExponent(fragments: bigint): number {
  const maximumFragments = BigInt(canonicalFragmentSkillKeySet.length)
  if (fragments < 0n || fragments > maximumFragments) {
    throw new RangeError(
      `Panel Warranty fragments must be between zero and ${maximumFragments.toString()}.`,
    )
  }
  return Number(fragments - 1n)
}

function addEffect(result: Record<string, DysonV2StatEffect[]>, stat: string, effect: DysonV2StatEffect): void {
  ;(result[stat] ??= []).push(effect)
}

function freezeByStat(result: Record<string, DysonV2StatEffect[]>): EffectByStat {
  return Object.freeze(Object.fromEntries(Object.entries(result).map(([stat, effects]) => [stat, freezeEffects(effects)])))
}

function freezeEffects(effects: readonly DysonV2StatEffect[]): readonly DysonV2StatEffect[] {
  return Object.freeze([...effects])
}

function effectsAt(byStat: EffectByStat, stat: string): readonly DysonV2StatEffect[] {
  return byStat[stat] ?? []
}

function validateRuntimeEvidence(
  evidence: DysonV2CauseEvidence,
  secretsOfTheUniverse: bigint,
): Readonly<ResolvedRuntimeEvidenceV2> {
  if (Object.getOwnPropertyDescriptor(evidence, 'dysonTuningProfile') !== undefined) {
    const cached = validatedNativeRuntimeEvidence.get(evidence as object)
    if (cached !== undefined) return cached
    if (isValidatedCanonicalRuntimeSidecarV2(evidence)) {
      const resolved = Object.freeze({
        tuning: resolveDysonTuningProfileV2(evidence.dysonTuningProfile),
        evaluationSnapshot: evidence.dysonEvaluationSnapshot,
      })
      validatedNativeRuntimeEvidence.set(evidence, resolved)
      return resolved
    }
    const snapshotDescriptor = Object.getOwnPropertyDescriptor(
      evidence,
      'dysonEvaluationSnapshot',
    )
    if (
      snapshotDescriptor === undefined ||
      !('value' in snapshotDescriptor) ||
      !Object.isFrozen(snapshotDescriptor.value)
    ) {
      throw new TypeError('Native Dyson V2 evaluation snapshot must be a frozen data property.')
    }
    const runtime = cloneCanonicalRuntimeSidecarV2(
      evidence as unknown as Readonly<CanonicalRuntimeSidecarV2>,
    )
    const resolved = Object.freeze({
      tuning: resolveDysonTuningProfileV2(runtime.dysonTuningProfile),
      evaluationSnapshot: runtime.dysonEvaluationSnapshot,
    })
    validatedNativeRuntimeEvidence.set(evidence as object, resolved)
    return resolved
  }
  const tuningRecord = requireClosedFrozenDataRecord(
    requireOwnDataProperty(evidence, 'compatibilityTuning', 'Dyson V2 runtime evidence'),
    COMPATIBILITY_TUNING_KEYS,
    'Dyson V2 compatibility tuning',
  )
  for (const field of COMPATIBILITY_TUNING_KEYS) {
    const value = tuningRecord[field]
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`Legacy tuning '${field}' must be finite and non-negative.`)
    }
  }
  const legacyDescriptor = Object.getOwnPropertyDescriptor(
    evidence,
    'skillEffectEvaluationSnapshot',
  )
  const runtimeDescriptor = Object.getOwnPropertyDescriptor(
    evidence,
    'evaluationSnapshot',
  )
  if ((legacyDescriptor === undefined) === (runtimeDescriptor === undefined)) {
    throw new TypeError('Dyson V2 runtime evidence must contain exactly one evaluation snapshot.')
  }
  const selectedProfile = selectDysonTuningProfileV2(
    tuningRecord as unknown as Readonly<V2LegacyRuntimeEvidence['compatibilityTuning']>,
    legacyDescriptor === undefined ? 0n : secretsOfTheUniverse,
  )
  const tuning = resolveDysonTuningProfileV2(selectedProfile)

  if (legacyDescriptor !== undefined) {
    const snapshotRecord = requireClosedFrozenDataRecord(
      requireDataDescriptorValue(
        legacyDescriptor,
        'Dyson V2 runtime evidence.skillEffectEvaluationSnapshot',
      ),
      EVALUATION_SNAPSHOT_KEYS,
      'Legacy evaluation snapshot',
    )
    for (const field of EVALUATION_SNAPSHOT_KEYS) {
      const value = snapshotRecord[field]
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new Error(`Legacy snapshot '${field}' must be finite and non-negative.`)
      }
    }
    return Object.freeze({
      tuning,
      evaluationSnapshot: Object.freeze({
        panelsPerSecond: gameDecimalFromNumber(snapshotRecord.panelsPerSecond as number),
        panelLifetimeSeconds: gameDecimalFromNumber(snapshotRecord.panelLifetimeSeconds as number),
        scienceMultiplier: gameDecimalFromNumber(snapshotRecord.scienceMultiplier as number),
        rudimentarySingularityProduction: gameDecimalFromNumber(
          snapshotRecord.rudimentarySingularityProduction as number,
        ),
        pocketDimensionsProduction: gameDecimalFromNumber(
          snapshotRecord.pocketDimensionsProduction as number,
        ),
        scientificPlanetsProduction: gameDecimalFromNumber(
          snapshotRecord.scientificPlanetsProduction as number,
        ),
        managerAssemblyLineProduction: gameDecimalFromNumber(
          snapshotRecord.managerAssemblyLineProduction as number,
        ),
      }),
    })
  }

  const snapshotRecord = requireClosedFrozenDataRecord(
    requireDataDescriptorValue(
      runtimeDescriptor!,
      'Dyson V2 runtime evidence.evaluationSnapshot',
    ),
    EVALUATION_SNAPSHOT_KEYS,
    'Dyson V2 runtime evaluation snapshot',
  )
  for (const field of EVALUATION_SNAPSHOT_KEYS) {
    if (!isGameDecimal(snapshotRecord[field])) {
      throw new TypeError(
        `Dyson V2 runtime evaluation snapshot '${field}' must be a frozen GameDecimal value.`,
      )
    }
  }
  return Object.freeze({
    tuning,
    evaluationSnapshot: snapshotRecord as unknown as Readonly<DysonV2EvaluationSnapshot>,
  })
}

function requireOwnDataProperty(
  source: object,
  property: string,
  path: string,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, property)
  if (descriptor === undefined) {
    throw new TypeError(`${path} is missing '${property}'.`)
  }
  return requireDataDescriptorValue(descriptor, `${path}.${property}`)
}

function requireDataDescriptorValue(
  descriptor: PropertyDescriptor,
  path: string,
): unknown {
  if (!('value' in descriptor)) {
    throw new TypeError(`${path} must be a data property.`)
  }
  return descriptor.value
}

function requireClosedFrozenDataRecord<const Key extends string>(
  value: unknown,
  expectedKeys: readonly Key[],
  path: string,
): Readonly<Record<Key, unknown>> {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    !Object.isFrozen(value) ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError(`${path} must be a frozen data-only object.`)
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const actualKeys = Object.keys(descriptors).sort()
  const closedKeys = [...expectedKeys].sort()
  if (
    actualKeys.length !== closedKeys.length ||
    actualKeys.some((key, index) => key !== closedKeys[index])
  ) {
    throw new TypeError(`${path} must contain exactly the closed key set.`)
  }
  for (const key of expectedKeys) {
    const descriptor = descriptors[key]
    if (
      descriptor === undefined ||
      !('value' in descriptor) ||
      descriptor.enumerable !== true ||
      descriptor.configurable !== false ||
      descriptor.writable !== false
    ) {
      throw new TypeError(`${path}.${key} must be a frozen data property.`)
    }
  }
  return Object.freeze(Object.fromEntries(
    expectedKeys.map((key) => [key, (descriptors[key] as PropertyDescriptor & { value: unknown }).value]),
  )) as Readonly<Record<Key, unknown>>
}

function validateCatalogClosure(state: Readonly<CanonicalGameStateV2>, lookup: DysonV2CatalogLookup): void {
  if (
    lookup === getGameAsset &&
    defaultCatalogClosureValidated.has(state.research.levelsById as object)
  ) return
  for (const id of DYSON_V2_FACILITY_IDS) {
    const asset = lookup('GameData.FacilityDefinition', id)
    if (asset?.kind !== 'GameData.FacilityDefinition' || asset.id !== id || typeof asset.data.baseProduction !== 'number' || !Number.isFinite(asset.data.baseProduction)) {
      throw new Error(`Generated facility catalog '${id}' is missing or invalid.`)
    }
  }
  if (Object.keys(state.research.levelsById).length !== RESEARCH_SPECS.length) throw new Error('Canonical V2 research keys have drifted from the closed Dyson catalog.')
  if (lookup === getGameAsset) {
    defaultCatalogClosureValidated.add(state.research.levelsById as object)
  }
}

function requireFrozenBoundary(state: Readonly<CanonicalGameStateV2>, evidence: DysonV2CauseEvidence): void {
  if (state.modelVersion !== 2 || !Object.isFrozen(state) || !Object.isFrozen(evidence)) throw new TypeError('Dyson V2 cause derivation requires frozen canonical state and runtime evidence.')
}

function facilityForStat(stat: string): CanonicalFacilityId | undefined {
  return (Object.entries(FACILITY_MODIFIER_STATS).find(([, value]) => value === stat)?.[0]
    ?? Object.entries(FACILITY_PRODUCTION_STATS).find(([, value]) => value === stat)?.[0]) as CanonicalFacilityId | undefined
}

function requireReferences(value: RuntimeAssetValue | undefined, path: string): readonly RuntimeAssetReference[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'object' && entry !== null && 'id' in entry)) throw new Error(`Generated catalog '${path}' must be a reference list.`)
  return value as unknown as readonly RuntimeAssetReference[]
}

function optionalReferenceId(value: RuntimeAssetValue | undefined, path: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'object' || Array.isArray(value) || !('id' in value)) throw new Error(`Generated catalog '${path}' must be a reference.`)
  const id = value.id
  if (id !== null && typeof id !== 'string') throw new Error(`Generated catalog '${path}.id' must be a string or null.`)
  return id
}

function requireString(value: RuntimeAssetValue | undefined, path: string): string {
  if (typeof value !== 'string') throw new Error(`Generated catalog '${path}' must be a string.`)
  return value
}

function requireNullableString(value: RuntimeAssetValue | undefined, path: string): string | null {
  if (value !== null && typeof value !== 'string') throw new Error(`Generated catalog '${path}' must be a string or null.`)
  return value
}

function requireNumber(value: RuntimeAssetValue | undefined, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Generated catalog '${path}' must be a finite number.`)
  return value
}

function requireStrings(value: RuntimeAssetValue | undefined, path: string): readonly string[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) throw new Error(`Generated catalog '${path}' must be a string list.`)
  return value
}

function unsupportedOperation(effect: ParsedEffect): never { throw new Error(`Effect '${effect.id}' has unsupported operation '${effect.operation}'.`) }
function unsupportedCondition(id: string): never { throw new Error(`Condition '${id}' has an unsupported count selector.`) }
function missingConditionFacility(id: string): never { throw new Error(`Condition '${id}' has no supported facility context.`) }
