import type { GameDecimal } from '../math/gameDecimal'
import type { CanonicalGameStateV1 } from './types'
import type {
  CanonicalGameStateV2,
  CanonicalResearchId,
  DreamTimerId,
} from './typesV2'
import type { CanonicalRuntimeSidecarV2 } from './runtimeV2'
import legacyIdMaps from '../game-data/generated/legacy-id-maps.json'
import runtimeCatalog from '../game-data/generated/runtime-catalog.json'
import skillTreePresentation from '../game-data/generated/skill-tree-presentation.json'

export type NumericSemanticClass =
  | 'ordinary-decimal'
  | 'integer-decimal'
  | 'exact-bigint'
  | 'bounded-number'

export type NumericPersistenceEncoding =
  | 'canonical-decimal-string'
  | 'canonical-bigint-string'
  | 'json-number'
  | 'generated-json-number'
  | 'not-persisted'

export type NumericFieldRole =
  | 'balance'
  | 'rate'
  | 'cost'
  | 'level'
  | 'inventory'
  | 'timer'
  | 'statistic'
  | 'control'
  | 'progress'
  | 'transaction-quantity'
  | 'transaction-result'
  | 'authored-coefficient'

export interface NumericFieldClassification {
  readonly boundary: string
  readonly path: string
  readonly intendedV2Path: string | null
  readonly semanticClass: NumericSemanticClass
  readonly invariants: readonly string[]
  readonly role: NumericFieldRole
  readonly persistenceEncoding: NumericPersistenceEncoding
  readonly parser: string
  readonly boundedConversions: readonly string[]
  readonly lifecycle: string
  readonly owner: string
  readonly stage0Coverage: 'mechanical' | 'inventory-only' | 'deferred'
  readonly closedKeySet?: {
    readonly id: string
    readonly source: string
    readonly keys: readonly string[]
  }
  readonly memberPolicies?: readonly {
    readonly key: string
    readonly semanticClass: NumericSemanticClass
    readonly persistenceEncoding: NumericPersistenceEncoding
    readonly parser: string
    readonly policy: string
  }[]
  readonly consumerPolicy?: string
  readonly metadataRuleId?: string
  readonly rationale?: string
}

export interface DeferredNumericCoverage {
  readonly boundary: string
  readonly reason: string
  readonly activationGate: string
}

type NumericLeafPaths<T, TPrefix extends string = '$'> =
  NonNullable<T> extends GameDecimal
    ? TPrefix
    : NonNullable<T> extends number | bigint
    ? TPrefix
    : NonNullable<T> extends readonly (infer TValue)[]
      ? number extends NonNullable<T>['length']
        ? NumericLeafPaths<TValue, `${TPrefix}.*`>
        : {
            [TKey in Exclude<
              keyof NonNullable<T>,
              keyof readonly unknown[]
            > & string]: NumericLeafPaths<
              NonNullable<T>[TKey & keyof NonNullable<T>],
              `${TPrefix}.${TKey}`
            >
          }[Exclude<
            keyof NonNullable<T>,
            keyof readonly unknown[]
          > & string]
      : NonNullable<T> extends object
        ? string extends keyof NonNullable<T>
          ? NonNullable<T> extends Readonly<Record<string, infer TValue>>
            ? NumericLeafPaths<TValue, `${TPrefix}.*`>
            : never
          : {
              [TKey in keyof NonNullable<T> & string]: NumericLeafPaths<
                NonNullable<T>[TKey],
                `${TPrefix}.${TKey}`
              >
            }[keyof NonNullable<T> & string]
        : never

const FACILITY_IDS = [
  'assembly_lines',
  'ai_managers',
  'servers',
  'data_centers',
  'planets',
  'matrioshka_brains',
  'birch_planets',
  'galactic_brains',
] as const

const DREAM_RESOURCE_FIELDS = [
  'hunters',
  'gatherers',
  'community',
  'housing',
  'villages',
  'workers',
  'cities',
  'factories',
  'bots',
  'rockets',
  'energy',
  'spaceFactories',
  'dysonPanels',
  'railgunCharge',
  'solarPanels',
  'fusion',
  'swarmPanels',
] as const

const DREAM_EDUCATION_IDS = [
  'engineering',
  'shipping',
  'worldTrade',
  'worldPeace',
  'mathematics',
  'advancedPhysics',
] as const

export const canonicalDreamTimerKeySet = Object.freeze([
  'hunterTimerProgress',
  'gathererTimerProgress',
  'communityTimerProgress',
  'housingTimerProgress',
  'villagesTimerProgress',
  'workersTimerProgress',
  'citiesTimerProgress',
  'factoriesTimerProgress',
  'botsTimerProgress',
  'spaceFactoriesTimerProgress',
] as const)

export const canonicalSkillStateKeySet = Object.freeze(
  skillTreePresentation.nodes.map((node) => node.skillId).sort(),
)

export const canonicalFragmentSkillKeySet = Object.freeze(
  runtimeCatalog.assets
    .filter(
      (asset) =>
        asset.kind === 'GameData.SkillDefinition' &&
        asset.data.isFragment === 1,
    )
    .map((asset) => asset.id)
    .sort(),
)

export const canonicalResearchKeySet = Object.freeze(
  [...legacyIdMaps.researchIds].sort(),
)

export const canonicalResearchLevelPolicies = Object.freeze(
  canonicalResearchKeySet.map((key) => {
    const definition = runtimeCatalog.assets.find(
      (asset) =>
        asset.kind === 'GameData.ResearchDefinition' && asset.id === key,
    )
    const maxLevel = definition?.data.maxLevel
    if (typeof maxLevel !== 'number' || !Number.isInteger(maxLevel)) {
      throw new Error(`Research '${key}' has no integer authored maxLevel.`)
    }
    if (maxLevel !== -1 && maxLevel !== 1) {
      throw new Error(
        `Research '${key}' has an unclassified maxLevel ${maxLevel}.`,
      )
    }
    return Object.freeze({
      key,
      semanticClass:
        maxLevel === -1 ? 'integer-decimal' : 'exact-bigint',
      persistenceEncoding:
        maxLevel === -1
          ? 'canonical-decimal-string'
          : 'canonical-bigint-string',
      parser:
        maxLevel === -1
          ? 'GameDecimal.parseCanonicalInteger'
          : 'parseCanonicalNonNegativeBigInt',
      policy:
        maxLevel === -1
          ? 'unbounded integer-valued GameDecimal level'
          : 'authored one-level flag represented as exact bigint',
    })
  }),
)

const STAT_TOTAL_ROOTS = [
  '$.statistics.lifetime',
  '$.statistics.currentQuantumRun',
  '$.statistics.recentProcessedSegment',
] as const

const STAT_WINDOW_ROOTS = [
  '$.statistics.minuteWindows.*',
  '$.statistics.halfHourWindows.*',
  '$.statistics.dailyWindows.*',
] as const

const STAT_EXACT_COUNT_FIELDS = [
  'ordinaryInfinityCount',
  'breakInfinityCount',
  'meteorDreamResets',
  'aiDreamResets',
  'globalWarmingDreamResets',
  'blackHoleDreamResets',
] as const

const STAT_RESOURCE_FIELDS = [
  'ordinaryInfinityPoints',
  'breakInfinityPoints',
  'botCapInfinityPoints',
  'botCapOverflowRewards',
  'strangeMatter',
  'realityWorkers',
  'automaticInfluence',
  'manualInfluence',
] as const

export const canonicalV1NumericPathInventory = Object.freeze([
  '$.modelVersion',
  '$.dyson.money',
  '$.dyson.science',
  '$.dyson.bots',
  '$.dyson.workers',
  '$.dyson.researchers',
  ...FACILITY_IDS.flatMap((id) => [
    `$.dyson.facilities.${id}.0` as const,
    `$.dyson.facilities.${id}.1` as const,
  ]),
  '$.dyson.manualCreationIntervalSeconds',
  '$.dyson.totalPanelsDecayed',
  '$.dyson.goalStage',
  '$.dyson.botDistribution',
  '$.infinity.points',
  '$.infinity.spentPoints',
  '$.infinity.breakTarget',
  '$.infinity.lastCycleDurationSeconds',
  '$.infinity.lastPointsGained',
  '$.infinity.storedTimeUsedThisCycleSeconds',
  '$.infinity.storedTimeUsedPreviousCycleSeconds',
  '$.infinity.secretsOfTheUniverse',
  '$.infinity.permanentSkillPoints',
  '$.skills.points',
  '$.skills.fragments',
  '$.skills.byId.*.level',
  '$.skills.byId.*.timerSeconds',
  '$.skills.byId.*.secondaryTimerSeconds',
  '$.skills.presets.0.botDistribution',
  '$.skills.presets.1.botDistribution',
  '$.skills.presets.2.botDistribution',
  '$.skills.presets.3.botDistribution',
  '$.skills.presets.4.botDistribution',
  '$.skills.tabPresetAutomation.bots',
  '$.skills.tabPresetAutomation.research',
  '$.research.levelsById.*',
  '$.research.progressById.*',
  '$.reality.universeDesignationCount',
  '$.reality.workersReady',
  '$.reality.workerGenerationProgress',
  '$.reality.influence',
  '$.quantum.pointsEarned',
  '$.quantum.pointsSpent',
  '$.quantum.divisionsPurchased',
  '$.quantum.permanentSecrets',
  '$.quantum.influenceSpeedBonus',
  '$.quantum.cashBonusLevels',
  '$.quantum.scienceBonusLevels',
  '$.avocado.infinityPoints',
  '$.avocado.influence',
  '$.avocado.strangeMatter',
  '$.avocado.overflowMultiplier',
  '$.timeline.automationTimeUntilNextEvent',
  '$.timeline.dysonAutomationTargetIndex',
  '$.timeline.researchAutomationTargetIndex',
  '$.timeline.infinityBoundaryRemaining',
  '$.timeline.infinityCycleSeconds',
  '$.timeline.infinityCycleStartingPoints',
  '$.timeline.storedTimeAvailableSeconds',
  '$.timeline.storedTimeCapacitySeconds',
  '$.timeline.doubleTime.bankSeconds',
  '$.timeline.doubleTime.rate',
  '$.secretProgress.step',
  ...DREAM_RESOURCE_FIELDS.map(
    (field) => `$.dream.resources.${field}` as const,
  ),
  '$.dream.parameters.hunterCost',
  '$.dream.parameters.gathererCost',
  '$.dream.parameters.communityBoostCost',
  '$.dream.parameters.communityBoostClock',
  '$.dream.parameters.communityBoostDuration',
  '$.dream.parameters.factoriesBoostCost',
  '$.dream.parameters.factoriesBoostClock',
  '$.dream.parameters.factoriesBoostDuration',
  '$.dream.parameters.rocketsPerSpaceFactory',
  '$.dream.parameters.railgunMaxCharge',
  '$.dream.parameters.solarCost',
  '$.dream.parameters.solarPanelGeneration',
  '$.dream.parameters.fusionCost',
  '$.dream.parameters.fusionGeneration',
  '$.dream.parameters.swarmPanelGeneration',
  ...DREAM_EDUCATION_IDS.flatMap((id) => [
    `$.dream.education.${id}.progress` as const,
    `$.dream.education.${id}.researchTime` as const,
    `$.dream.education.${id}.cost` as const,
  ]),
  '$.dream.timers.*',
  '$.dream.railgun.fireProgress',
  '$.dream.railgun.shotsRemaining',
  '$.dream.railgun.activeRailguns',
  '$.dream.railgun.reservedPanels',
  '$.dream.railgun.highestStoredPanels',
  '$.dream.railgun.lastRoundsFired',
  '$.dream.railgun.lastPanelsLaunched',
  '$.dream.resetCount',
  '$.dream.strangeMatter',
  '$.dream.disasterStage',
  '$.dream.huntersPerPurchase',
  '$.dream.gatherersPerPurchase',
  '$.statistics.trackedSimulatedSeconds',
  ...STAT_TOTAL_ROOTS.flatMap((root) => [
    ...STAT_EXACT_COUNT_FIELDS.map((field) => `${root}.${field}` as const),
    ...STAT_RESOURCE_FIELDS.map((field) => `${root}.${field}` as const),
    `${root}.realityCapacityStallSeconds` as const,
    `${root}.simulatedSeconds` as const,
  ]),
  '$.statistics.lastCompletedCycle.durationSeconds',
  '$.statistics.lastCompletedCycle.reward',
  ...STAT_WINDOW_ROOTS.flatMap((root) => [
    `${root}.sequence` as const,
    `${root}.simulatedSeconds` as const,
    `${root}.infinityCount` as const,
    `${root}.infinityPoints` as const,
    `${root}.dreamResetCount` as const,
    `${root}.strangeMatter` as const,
    `${root}.realityWorkers` as const,
  ]),
] as const)

type CanonicalInventoryPath =
  (typeof canonicalV1NumericPathInventory)[number]
type MissingCanonicalPath = Exclude<
  NumericLeafPaths<CanonicalGameStateV1>,
  CanonicalInventoryPath
>
type UnexpectedCanonicalPath = Exclude<
  CanonicalInventoryPath,
  NumericLeafPaths<CanonicalGameStateV1>
>

const CANONICAL_PATHS_ARE_EXHAUSTIVE: [
  MissingCanonicalPath,
  UnexpectedCanonicalPath,
] extends [never, never]
  ? true
  : never = true
void CANONICAL_PATHS_ARE_EXHAUSTIVE

const exactBigIntPaths = new Set<CanonicalInventoryPath>([
  '$.dyson.goalStage',
  '$.infinity.secretsOfTheUniverse',
  '$.infinity.permanentSkillPoints',
  '$.skills.points',
  '$.skills.fragments',
  '$.skills.byId.*.level',
  '$.reality.workersReady',
  '$.quantum.divisionsPurchased',
  '$.quantum.permanentSecrets',
  '$.dream.resetCount',
  '$.dream.disasterStage',
  ...STAT_TOTAL_ROOTS.flatMap((root) =>
    STAT_EXACT_COUNT_FIELDS.map((field) => `${root}.${field}` as const),
  ),
  ...STAT_WINDOW_ROOTS.flatMap((root) => [
    `${root}.sequence` as const,
    `${root}.infinityCount` as const,
    `${root}.dreamResetCount` as const,
  ]),
])

const integerDecimalPaths = new Set<CanonicalInventoryPath>([
  ...FACILITY_IDS.map((id) => `$.dyson.facilities.${id}.1` as const),
  '$.infinity.points',
  '$.infinity.spentPoints',
  '$.infinity.breakTarget',
  '$.infinity.lastPointsGained',
  '$.research.levelsById.*',
  '$.reality.universeDesignationCount',
  '$.reality.influence',
  '$.quantum.pointsEarned',
  '$.quantum.pointsSpent',
  '$.quantum.influenceSpeedBonus',
  '$.quantum.cashBonusLevels',
  '$.quantum.scienceBonusLevels',
  '$.timeline.infinityCycleStartingPoints',
  '$.dream.resources.hunters',
  '$.dream.resources.gatherers',
  '$.dream.resources.community',
  '$.dream.resources.housing',
  '$.dream.resources.villages',
  '$.dream.resources.workers',
  '$.dream.resources.cities',
  '$.dream.resources.factories',
  '$.dream.resources.bots',
  '$.dream.resources.rockets',
  '$.dream.resources.spaceFactories',
  '$.dream.resources.dysonPanels',
  '$.dream.resources.solarPanels',
  '$.dream.resources.fusion',
  '$.dream.resources.swarmPanels',
  '$.dream.parameters.hunterCost',
  '$.dream.parameters.gathererCost',
  '$.dream.parameters.communityBoostCost',
  '$.dream.parameters.factoriesBoostCost',
  '$.dream.parameters.rocketsPerSpaceFactory',
  '$.dream.parameters.solarCost',
  '$.dream.parameters.fusionCost',
  '$.dream.railgun.reservedPanels',
  '$.dream.railgun.highestStoredPanels',
  '$.dream.railgun.lastPanelsLaunched',
  '$.dream.strangeMatter',
  '$.dream.huntersPerPurchase',
  '$.dream.gatherersPerPurchase',
  ...DREAM_EDUCATION_IDS.map(
    (id) => `$.dream.education.${id}.cost` as const,
  ),
  ...STAT_TOTAL_ROOTS.flatMap((root) =>
    STAT_RESOURCE_FIELDS.map((field) => `${root}.${field}` as const),
  ),
  '$.statistics.lastCompletedCycle.reward',
  ...STAT_WINDOW_ROOTS.flatMap((root) => [
    `${root}.infinityPoints` as const,
    `${root}.strangeMatter` as const,
    `${root}.realityWorkers` as const,
  ]),
])

const boundedNumberPaths = new Set<CanonicalInventoryPath>([
  '$.modelVersion',
  '$.dyson.manualCreationIntervalSeconds',
  '$.dyson.botDistribution',
  '$.infinity.lastCycleDurationSeconds',
  '$.infinity.storedTimeUsedThisCycleSeconds',
  '$.infinity.storedTimeUsedPreviousCycleSeconds',
  '$.skills.byId.*.timerSeconds',
  '$.skills.byId.*.secondaryTimerSeconds',
  '$.skills.presets.0.botDistribution',
  '$.skills.presets.1.botDistribution',
  '$.skills.presets.2.botDistribution',
  '$.skills.presets.3.botDistribution',
  '$.skills.presets.4.botDistribution',
  '$.skills.tabPresetAutomation.bots',
  '$.skills.tabPresetAutomation.research',
  '$.reality.workerGenerationProgress',
  '$.timeline.automationTimeUntilNextEvent',
  '$.timeline.dysonAutomationTargetIndex',
  '$.timeline.researchAutomationTargetIndex',
  '$.timeline.infinityBoundaryRemaining',
  '$.timeline.infinityCycleSeconds',
  '$.timeline.storedTimeAvailableSeconds',
  '$.timeline.storedTimeCapacitySeconds',
  '$.timeline.doubleTime.bankSeconds',
  '$.timeline.doubleTime.rate',
  '$.secretProgress.step',
  '$.dream.parameters.communityBoostClock',
  '$.dream.parameters.communityBoostDuration',
  '$.dream.parameters.factoriesBoostClock',
  '$.dream.parameters.factoriesBoostDuration',
  ...DREAM_EDUCATION_IDS.map(
    (id) => `$.dream.education.${id}.researchTime` as const,
  ),
  '$.dream.timers.*',
  '$.dream.railgun.fireProgress',
  '$.dream.railgun.shotsRemaining',
  '$.dream.railgun.activeRailguns',
  '$.dream.railgun.lastRoundsFired',
  '$.statistics.trackedSimulatedSeconds',
  ...STAT_TOTAL_ROOTS.flatMap((root) => [
    `${root}.realityCapacityStallSeconds` as const,
    `${root}.simulatedSeconds` as const,
  ]),
  '$.statistics.lastCompletedCycle.durationSeconds',
  ...STAT_WINDOW_ROOTS.map((root) => `${root}.simulatedSeconds` as const),
])

function semanticClassForCanonicalPath(
  path: CanonicalInventoryPath,
): NumericSemanticClass {
  if (exactBigIntPaths.has(path)) return 'exact-bigint'
  if (integerDecimalPaths.has(path)) return 'integer-decimal'
  if (boundedNumberPaths.has(path)) return 'bounded-number'
  return 'ordinary-decimal'
}

const INTENDED_V2_PATH_OVERRIDES = {
  '$.infinity.points': '$.infinity.availablePoints',
  '$.infinity.spentPoints': '$.infinity.allocatedPoints',
  '$.quantum.pointsEarned': '$.quantum.lifetimeEarnedShards',
  '$.quantum.pointsSpent': null,
} as const satisfies Partial<Record<CanonicalInventoryPath, string | null>>

type IntendedV2PathFor<TPath extends CanonicalInventoryPath> =
  TPath extends keyof typeof INTENDED_V2_PATH_OVERRIDES
    ? (typeof INTENDED_V2_PATH_OVERRIDES)[TPath]
    : TPath

function intendedV2Path<TPath extends CanonicalInventoryPath>(
  path: TPath,
): IntendedV2PathFor<TPath> {
  if (Object.hasOwn(INTENDED_V2_PATH_OVERRIDES, path)) {
    return INTENDED_V2_PATH_OVERRIDES[
      path as keyof typeof INTENDED_V2_PATH_OVERRIDES
    ] as IntendedV2PathFor<TPath>
  }
  return path as IntendedV2PathFor<TPath>
}

interface CanonicalNumericMetadata {
  readonly ruleId: string
  readonly role: NumericFieldRole
  readonly invariants: readonly string[]
  readonly lifecycle: string
  readonly owner: string
}

function canonicalMetadataForPath(
  path: CanonicalInventoryPath,
  semanticClass: NumericSemanticClass,
): CanonicalNumericMetadata {
  const rule = (
    ruleId: string,
    role: NumericFieldRole,
    invariant: string,
    lifecycle: string,
    owner: string,
  ): CanonicalNumericMetadata => ({
    ruleId,
    role,
    invariants: Object.freeze([
      ...invariantsForClass(semanticClass, role),
      invariant,
    ]),
    lifecycle,
    owner,
  })

  if (path === '$.modelVersion') {
    return rule(
      'model-version',
      'control',
      'literal canonical model version 2 after migration',
      'set only by the coordinated V2 migration',
      'canonical state migration',
    )
  }
  if (path === '$.dyson.money' || path === '$.dyson.science') {
    return rule(
      'dyson-continuous-balances',
      'balance',
      'non-negative scalable continuous balance',
      'credited by production, debited by transactions, and reset atomically by Infinity',
      'Dyson production and transaction owners',
    )
  }
  if (/^\$\.dyson\.facilities\.[^.]+\.0$/.test(path)) {
    return rule(
      'dyson-automatic-facility-slots',
      'inventory',
      'fractional automatic production is valid',
      'credited by rate-times-seconds production and reset atomically by Infinity',
      'Dyson production arrivals',
    )
  }
  if (/^\$\.dyson\.facilities\.[^.]+\.1$/.test(path)) {
    return rule(
      'dyson-manual-facility-slots',
      'inventory',
      'whole manually purchased units only',
      'credited by purchase commits and reset atomically by Infinity',
      'Dyson facility transaction engine',
    )
  }
  if (
    path === '$.dyson.bots' ||
    path === '$.dyson.workers' ||
    path === '$.dyson.researchers'
  ) {
    return rule(
      'dyson-scalable-workforce',
      'inventory',
      'fractional simulation production is valid',
      'produced and allocated by Dyson simulation; reset atomically by Infinity',
      'Dyson simulation and bot allocation owners',
    )
  }
  if (path === '$.dyson.manualCreationIntervalSeconds') {
    return rule(
      'dyson-manual-interval',
      'timer',
      'strictly positive authored interval in seconds',
      'recomputed from authored tuning; never spent as economy value',
      'Dyson Tinker scheduler',
    )
  }
  if (path === '$.dyson.totalPanelsDecayed') {
    return rule(
      'dyson-decayed-panel-statistic',
      'statistic',
      'scalable accumulated panel production with fractional arrivals permitted',
      'accumulated by Dyson production and reset atomically by Infinity',
      'Dyson production arrivals',
    )
  }
  if (path === '$.dyson.goalStage') {
    return rule(
      'dyson-goal-stage',
      'control',
      'exact authored progression stage from 0 through 10',
      'advanced idempotently through the ten authored rewards and reset by Infinity',
      'canonical Dyson goal progression',
    )
  }
  if (path === '$.dyson.botDistribution') {
    return rule(
      'dyson-bot-distribution',
      'control',
      'closed fraction from 0 through 1',
      'preserved setting changed only by bot-allocation commands',
      'canonical bot allocation transaction',
    )
  }
  if (path === '$.infinity.points' || path === '$.infinity.spentPoints') {
    return rule(
      'legacy-infinity-ledgers',
      'balance',
      'non-negative schema-12 ledger input; available = points - spentPoints',
      'migrated once into direct availablePoints and allocatedPoints; not retained as earned-minus-spent authority',
      'V1-to-V2 Infinity account migration',
    )
  }
  if (path === '$.infinity.breakTarget') {
    return rule(
      'infinity-break-target',
      'level',
      'whole scalable reward target',
      'preserved player target and changed only by the Infinity target command',
      'Infinity break-target transaction',
    )
  }
  if (path === '$.infinity.lastPointsGained') {
    return rule(
      'infinity-last-reward',
      'statistic',
      'whole represented resource reward',
      'replaced after each committed Infinity reset',
      'Infinity reset transaction',
    )
  }
  if (
    path === '$.infinity.lastCycleDurationSeconds' ||
    path === '$.infinity.storedTimeUsedThisCycleSeconds' ||
    path === '$.infinity.storedTimeUsedPreviousCycleSeconds'
  ) {
    return rule(
      'infinity-cycle-time',
      'timer',
      'finite non-negative elapsed seconds',
      'rolled over only by committed Infinity lifecycle accounting',
      'Infinity reset and stored-time accounting owners',
    )
  }
  if (path === '$.infinity.secretsOfTheUniverse') {
    return rule(
      'infinity-secrets-rank',
      'level',
      'exact permanent rank from 0 through 27',
      'preserved through ordinary prestige and changed only by its permanent-rank owner',
      'Infinity permanent progression transactions',
    )
  }
  if (path === '$.infinity.permanentSkillPoints') {
    return rule(
      'infinity-permanent-skill-rank',
      'level',
      'exact permanent Skill rank from 0 through 10',
      'preserved through ordinary prestige and changed only by its permanent-rank owner',
      'Infinity permanent progression transactions',
    )
  }
  if (path === '$.skills.points') {
    return rule(
      'skill-point-balance',
      'balance',
      'exact spendable Skill currency',
      'debited/refunded atomically by Skill transactions and preserved according to prestige rules',
      'canonical Skill transactions',
    )
  }
  if (path === '$.skills.fragments') {
    return rule(
      'skill-fragment-owned-count',
      'inventory',
      'must equal the count of owned skills in the closed seven-ID fragment Skill catalog',
      'derived from Skill ownership changes; never accepted as an independent currency or counter',
      'canonical Skill transactions',
    )
  }
  if (path === '$.skills.byId.*.level') {
    return rule(
      'skill-levels',
      'level',
      'exact non-negative legacy ownership/rank marker; the generated 104-skill catalog declares no maximum level',
      'preserved losslessly, while V2 gameplay ownership continues to use the separate owned flag',
      'legacy Skill migration and canonical Skill ownership transactions',
    )
  }
  if (
    path === '$.skills.byId.*.timerSeconds' ||
    path === '$.skills.byId.*.secondaryTimerSeconds'
  ) {
    return rule(
      'skill-timers',
      'timer',
      'finite non-negative skill-owned elapsed seconds',
      'advanced by simulation and reset with the owning Skill effect',
      'Skill effect timer simulation',
    )
  }
  if (path.includes('$.skills.presets.') && path.endsWith('.botDistribution')) {
    return rule(
      'skill-preset-distributions',
      'control',
      'closed fraction from 0 through 1',
      'preserved preset setting changed only by preset transactions',
      'Skill preset transactions',
    )
  }
  if (path.startsWith('$.skills.tabPresetAutomation.')) {
    return rule(
      'skill-preset-automation-slots',
      'control',
      'integer slot from 0 through 5',
      'preserved setting changed only by tab-preset commands',
      'Skill preset automation transactions',
    )
  }
  if (path === '$.research.levelsById.*') {
    return rule(
      'research-levels',
      'level',
      'closed 14-ID family with per-member capped/exact or unbounded-Decimal policy',
      'purchased atomically and reset by the owning Infinity/Quantum prestige rule',
      'Research transaction engine',
    )
  }
  if (path === '$.research.progressById.*') {
    return rule(
      'research-progress',
      'progress',
      'non-negative migrated legacy progress value for a closed Research ID; no V2 passive producer or completion consumer is defined',
      'preserved unchanged by Research purchases and automation, then reset to zero with Research state on Infinity',
      'Research migration and Infinity reset',
    )
  }
  if (path === '$.reality.universeDesignationCount') {
    return rule(
      'reality-universe-designation',
      'inventory',
      'whole scalable universe designation total',
      'advanced by worker generation and reset only by the Reality/Quantum owner',
      'Reality worker simulation',
    )
  }
  if (path === '$.reality.workersReady') {
    return rule(
      'reality-ready-workers',
      'inventory',
      'exact ready-worker inventory from 0 through the authored worker batch size (128)',
      'credited by completed batches and consumed atomically by gather',
      'Reality worker simulation and gather transaction',
    )
  }
  if (path === '$.reality.workerGenerationProgress') {
    return rule(
      'reality-worker-progress',
      'progress',
      'half-open remainder fraction from 0 inclusive to 1 exclusive',
      'advanced by Reality simulation and cleared when a worker batch completes',
      'Reality worker simulation',
    )
  }
  if (path === '$.reality.influence') {
    return rule(
      'reality-influence-balance',
      'balance',
      'whole authoritative available Influence balance',
      'credited by gather and debited directly by Reality transactions',
      'Reality gather and upgrade transactions',
    )
  }
  if (path === '$.quantum.pointsEarned') {
    return rule(
      'legacy-quantum-earned-ledger',
      'statistic',
      'whole schema-12 lifetime-earned Shard ledger',
      'migrated to lifetimeEarnedShards and used with spent only to seed availableShards',
      'V1-to-V2 Quantum account migration',
    )
  }
  if (path === '$.quantum.pointsSpent') {
    return rule(
      'legacy-quantum-spent-ledger',
      'statistic',
      'whole schema-12 spent Shard ledger not retained in V2',
      'consumed once to seed availableShards and then removed',
      'V1-to-V2 Quantum account migration',
    )
  }
  if (path === '$.quantum.divisionsPurchased') {
    return rule(
      'quantum-divisions-rank',
      'level',
      'exact Quantum Divisions rank from 0 through 19',
      'preserved across ordinary resets and changed only by Quantum progression transactions',
      'Quantum upgrade transactions',
    )
  }
  if (path === '$.quantum.permanentSecrets') {
    return rule(
      'quantum-permanent-secrets-rank',
      'level',
      'exact permanent Quantum Secrets rank from 0 through 27',
      'preserved across ordinary resets and changed only by Quantum progression transactions',
      'Quantum upgrade transactions',
    )
  }
  if (
    path === '$.quantum.influenceSpeedBonus' ||
    path === '$.quantum.cashBonusLevels' ||
    path === '$.quantum.scienceBonusLevels'
  ) {
    return rule(
      'quantum-unbounded-booster-levels',
      'level',
      'whole unbounded scalable booster level',
      'purchased atomically and preserved by Quantum upgrade policy',
      'Quantum upgrade transactions',
    )
  }
  if (path.startsWith('$.avocado.')) {
    return rule(
      path.endsWith('overflowMultiplier')
        ? 'avocato-overflow-multiplier'
        : 'avocato-feed-accumulators',
      path.endsWith('overflowMultiplier') ? 'rate' : 'balance',
      path.endsWith('overflowMultiplier')
        ? 'non-negative scalable multiplier'
        : 'non-negative scalable feed accumulator',
      'feed-all proves destination growth, then source zero and destination credit commit atomically; preserved by Avocato policy',
      'Avocato feed transaction',
    )
  }
  if (path === '$.timeline.infinityCycleStartingPoints') {
    return rule(
      'timeline-infinity-starting-balance',
      'statistic',
      'whole represented cycle-start Infinity balance snapshot',
      'replaced at the committed Infinity cycle boundary',
      'event-time Infinity lifecycle owner',
    )
  }
  if (
    path === '$.timeline.dysonAutomationTargetIndex' ||
    path === '$.timeline.researchAutomationTargetIndex'
  ) {
    return rule(
      'timeline-automation-indices',
      'control',
      'non-negative safe integer within the closed target list',
      'advanced only by deterministic automation scheduling',
      'event-time automation scheduler',
    )
  }
  if (path === '$.timeline.doubleTime.rate') {
    return rule(
      'timeline-double-time-rate',
      'control',
      'integer from 0 through 10',
      'preserved setting changed only by the Double Time rate command',
      'Double Time transaction and lifecycle owner',
    )
  }
  if (path === '$.timeline.storedTimeCapacitySeconds') {
    return rule(
      'timeline-stored-time-capacity',
      'timer',
      'strictly positive capacity no greater than the authoritative 42000000-second stored-time maximum',
      'repaired before use and changed only by the stored-time capacity owner',
      'stored-time resource policy',
    )
  }
  if (path === '$.timeline.storedTimeAvailableSeconds') {
    return rule(
      'timeline-stored-time-bank',
      'timer',
      'finite non-negative seconds no greater than storedTimeCapacitySeconds',
      'credited only within remaining capacity and consumed by stored-time simulation',
      'stored-time resource policy',
    )
  }
  if (path === '$.timeline.doubleTime.bankSeconds') {
    return rule(
      'timeline-double-time-bank',
      'timer',
      'finite non-negative seconds no greater than the independent authoritative 42000000-second maximum',
      'credited and consumed independently of stored-time capacity',
      'Dream Double Time resource policy',
    )
  }
  if (path.startsWith('$.timeline.')) {
    return rule(
      'timeline-bounded-seconds',
      'timer',
      'finite non-negative seconds within scheduler or storage policy bounds',
      'advanced, banked, consumed, or rolled over only by lifecycle/event-time accounting',
      'event-time scheduler and lifecycle accounting',
    )
  }
  if (path === '$.secretProgress.step') {
    return rule(
      'avocato-meditation-step',
      'control',
      'integer from 0 through 7',
      'advanced one step at a time by the meditation transaction',
      'Avocato meditation transaction',
    )
  }
  if (path.startsWith('$.dream.resources.')) {
    const continuous =
      path === '$.dream.resources.energy' ||
      path === '$.dream.resources.railgunCharge'
    return rule(
      continuous
        ? 'dream-continuous-resources'
        : 'dream-whole-producer-inventories',
      'inventory',
      continuous
        ? 'non-negative scalable continuous resource'
        : 'whole scalable cycle-produced inventory',
      'produced/consumed by atomic Dream simulation and transfer operations; wiped by the owning Dream reset',
      'Dream simulation and transfer owners',
    )
  }
  if (
    path.endsWith('Cost') ||
    path.endsWith('.cost')
  ) {
    return rule(
      'dream-integer-currency-costs',
      'cost',
      'whole non-negative cost rounded upward before affordability',
      'changed only by authored upgrades/reset initialization; read by immutable purchase quotes',
      'Dream transaction definitions and quote engine',
    )
  }
  if (path.endsWith('Generation')) {
    return rule(
      'dream-generation-rates',
      'rate',
      'non-negative scalable production rate/effect',
      'changed only by authored Dream upgrades and consumed by bulk production',
      'Dream production and upgrade owners',
    )
  }
  if (
    path.endsWith('Clock') ||
    path.endsWith('Duration') ||
    path.endsWith('.researchTime') ||
    path === '$.dream.timers.*'
  ) {
    return rule(
      'dream-bounded-timers',
      'timer',
      'finite non-negative seconds; timer family is closed to 10 IDs',
      'advanced analytically by Dream simulation and cleared by the relevant completion/reset',
      'Dream timer simulation',
    )
  }
  if (path.endsWith('.progress') || path === '$.dream.railgun.fireProgress') {
    return rule(
      'dream-progress-values',
      'progress',
      'finite non-negative progress with owner-defined completion threshold',
      'advanced analytically and consumed/cleared on completion',
      'Dream education or railgun simulation',
    )
  }
  if (
    path === '$.dream.parameters.rocketsPerSpaceFactory' ||
    path === '$.dream.parameters.railgunMaxCharge'
  ) {
    return rule(
      'dream-scalable-authored-parameters',
      'control',
      'non-negative authored conversion/charge parameter',
      'changed only by authored Dream upgrade/reset initialization',
      'Dream upgrade and Space-Age simulation owners',
    )
  }
  if (path === '$.dream.railgun.shotsRemaining') {
    return rule(
      'dream-railgun-round-state',
      'control',
      'integer from 0 through the authored ten-round volley size',
      'advanced only by bounded railgun event processing and cleared after a volley/reset',
      'Dream railgun simulation',
    )
  }
  if (path === '$.dream.railgun.lastRoundsFired') {
    return rule(
      'dream-railgun-call-round-state',
      'control',
      'integer from 0 through 110: ten rounds per volley across the maximum eleven-times accelerated one-second call',
      'records the total rounds settled by the last bounded railgun call and clears on reset',
      'Dream railgun simulation',
    )
  }
  if (path === '$.dream.railgun.activeRailguns') {
    return rule(
      'dream-active-railgun-payload',
      'control',
      'non-negative safe integer mechanical payload',
      'reserved at volley start and cleared after completion/reset',
      'Dream railgun simulation',
    )
  }
  if (
    path === '$.dream.railgun.reservedPanels' ||
    path === '$.dream.railgun.highestStoredPanels' ||
    path === '$.dream.railgun.lastPanelsLaunched'
  ) {
    return rule(
      'dream-panel-escrow-and-telemetry',
      'inventory',
      'whole scalable panel quantity',
      'reservation debits source before launch; telemetry is replaced; all clear on owning reset',
      'Dream railgun escrow/launch transaction',
    )
  }
  if (path === '$.dream.resetCount') {
    return rule(
      'dream-exact-reset-count',
      'control',
      'exact non-negative legacy-compatible one-at-a-time reset count',
      'preserved losslessly; future atomic Dream reset increments saturate at DISCRETE_MAXIMUM',
      'Dream reset transaction',
    )
  }
  if (path === '$.dream.disasterStage') {
    return rule(
      'dream-disaster-stage',
      'control',
      'exact closed stage set 0, 1, 2, 3, or 42',
      'derived from the committed Dream counter-upgrade sequence and cleared by reset initialization',
      'Dream reset transaction',
    )
  }
  if (path === '$.dream.strangeMatter') {
    return rule(
      'dream-strange-matter-balance',
      'balance',
      'whole authoritative available Strange Matter balance',
      'credited by Dream resets and debited directly by Dream/Developer transactions',
      'Dream reset and transaction owners',
    )
  }
  if (
    path === '$.dream.huntersPerPurchase' ||
    path === '$.dream.gatherersPerPurchase'
  ) {
    return rule(
      'dream-units-per-purchase',
      'transaction-quantity',
      'whole scalable authored units per fixed purchase batch',
      'changed only by Dream upgrades and preserved/reset by Dream progression policy',
      'Dream upgrade and foundational purchase owners',
    )
  }
  if (path.startsWith('$.statistics.')) {
    const field = path.split('.').at(-1) ?? ''
    const seconds = field.includes('Seconds')
    const exactCount =
      field === 'sequence' ||
      field.endsWith('Count') ||
      field.endsWith('Resets')
    return rule(
      seconds
        ? 'statistics-bounded-seconds'
        : exactCount
          ? 'statistics-exact-event-counts'
          : 'statistics-resource-values',
      'statistic',
      seconds
        ? 'finite non-negative elapsed seconds'
        : exactCount
          ? 'exact non-negative one-at-a-time event/window count'
          : 'whole non-negative scalable resource statistic',
      'preserved in lifetime totals or rolled over/cleared only by the statistics recorder',
      'canonical simulation statistics recorder',
    )
  }
  throw new Error(`Canonical numeric path has no explicit metadata rule: ${path}`)
}

function persistenceForClass(
  semanticClass: NumericSemanticClass,
): Pick<NumericFieldClassification, 'persistenceEncoding' | 'parser'> {
  if (
    semanticClass === 'ordinary-decimal' ||
    semanticClass === 'integer-decimal'
  ) {
    return {
      persistenceEncoding: 'canonical-decimal-string',
      parser: 'GameDecimal.parseCanonical',
    }
  }
  if (semanticClass === 'exact-bigint') {
    return {
      persistenceEncoding: 'canonical-bigint-string',
      parser: 'parseCanonicalNonNegativeBigInt',
    }
  }
  return {
    persistenceEncoding: 'json-number',
    parser: 'parseFiniteBoundedNumber',
  }
}

function invariantsForClass(
  semanticClass: NumericSemanticClass,
  role: NumericFieldRole,
): readonly string[] {
  const roleInvariant =
    role === 'progress'
      ? 'owner-defined progress range'
      : role === 'timer'
        ? 'finite non-negative seconds'
        : 'non-negative'
  if (semanticClass === 'ordinary-decimal') {
    return Object.freeze(['normalized GameDecimal', roleInvariant])
  }
  if (semanticClass === 'integer-decimal') {
    return Object.freeze([
      'normalized GameDecimal',
      'floor(value) == value',
      'non-negative',
    ])
  }
  if (semanticClass === 'exact-bigint') {
    return Object.freeze([
      'exact integer',
      'non-negative',
      'authored or practical bound where declared by owner',
    ])
  }
  return Object.freeze([
    'finite JavaScript number',
    roleInvariant,
    'owner-declared bounded range',
  ])
}

function conversionsForClass(
  semanticClass: NumericSemanticClass,
): readonly string[] {
  if (
    semanticClass === 'ordinary-decimal' ||
    semanticClass === 'integer-decimal'
  ) {
    return Object.freeze([
      'legacy number/bigint to GameDecimal through a checked migration adapter',
      'GameDecimal to number only at a separately manifested bounded boundary',
    ])
  }
  if (semanticClass === 'exact-bigint') {
    return Object.freeze([
      'legacy number to bigint only after finite safe-integer validation',
      'bigint never narrows through number',
    ])
  }
  return Object.freeze([
    'GameDecimal to number only after range comparison and checked conversion',
  ])
}

function closedKeySetForPath(
  path: CanonicalInventoryPath,
): NumericFieldClassification['closedKeySet'] {
  if (path.startsWith('$.skills.byId.*.')) {
    return Object.freeze({
      id: 'canonical-skill-state-ids',
      source: 'generated/skill-tree-presentation.json nodes.skillId',
      keys: canonicalSkillStateKeySet,
    })
  }
  if (path.startsWith('$.research.')) {
    return Object.freeze({
      id: 'canonical-research-ids',
      source: 'generated/legacy-id-maps.json researchIds',
      keys: canonicalResearchKeySet,
    })
  }
  if (path === '$.dream.timers.*') {
    return Object.freeze({
      id: 'canonical-dream-timer-ids',
      source: 'mapping DREAM_TIMER_FIELDS and Dream simulation owners',
      keys: canonicalDreamTimerKeySet,
    })
  }
  return undefined
}

export const canonicalNumericFieldClassifications = Object.freeze(
  canonicalV1NumericPathInventory.map((path) => {
    const semanticClass = semanticClassForCanonicalPath(path)
    const metadata = canonicalMetadataForPath(path, semanticClass)
    return Object.freeze({
      boundary: 'CanonicalGameStateV1-to-V2',
      path,
      intendedV2Path: intendedV2Path(path),
      semanticClass,
      invariants: metadata.invariants,
      role: metadata.role,
      ...persistenceForClass(semanticClass),
      boundedConversions: conversionsForClass(semanticClass),
      lifecycle: metadata.lifecycle,
      owner: metadata.owner,
      stage0Coverage: 'mechanical' as const,
      metadataRuleId: metadata.ruleId,
      closedKeySet: closedKeySetForPath(path),
      memberPolicies:
        path === '$.research.levelsById.*'
          ? canonicalResearchLevelPolicies
          : undefined,
      rationale:
        path === '$.quantum.pointsSpent'
          ? 'Legacy spent-ledger input derives availableShards during migration and has no V2 leaf.'
          : undefined,
    }) satisfies NumericFieldClassification
  }),
)

export const plannedV2OnlyNumericClassifications = Object.freeze([
  Object.freeze({
    boundary: 'CanonicalGameStateV2-planned',
    path: '$.skills.selectedPreset',
    intendedV2Path: '$.skills.selectedPreset',
    semanticClass: 'bounded-number',
    invariants: Object.freeze([
      'finite integer from 1 through 5',
      'identifies exactly one authored Skill preset slot',
    ]),
    role: 'control',
    persistenceEncoding: 'json-number',
    parser: 'descriptor-safe bounded enum parser',
    boundedConversions: Object.freeze([
      'legacy selectedPreset is clamped to an authored slot during migration',
      'never converted through GameDecimal',
    ]),
    lifecycle: 'durable gameplay selection updated atomically with preset loading',
    owner: 'V2 Skill preset command authority',
    stage0Coverage: 'mechanical',
    rationale: 'The former application carrier is now portable V2 state so reload and import preserve the active preset.',
  } satisfies NumericFieldClassification),
  Object.freeze({
    boundary: 'CanonicalGameStateV2-planned',
    path: '$.quantum.availableShards',
    intendedV2Path: '$.quantum.availableShards',
    semanticClass: 'integer-decimal',
    invariants: Object.freeze([
      'normalized GameDecimal',
      'floor(value) == value',
      'non-negative authoritative available balance',
    ]),
    role: 'balance',
    persistenceEncoding: 'canonical-decimal-string',
    parser: 'GameDecimal.parseCanonical',
    boundedConversions: Object.freeze([
      'schema-12 earned minus spent is computed as Decimal during migration',
      'never derived from lifetimeEarnedShards after migration',
      'never narrows through number',
    ]),
    lifecycle:
      'direct affordability balance; debited by Quantum transactions and reset only by the Quantum owner',
    owner: 'Quantum transaction and leap/entanglement owners',
    stage0Coverage: 'inventory-only',
    rationale:
      'This direct V2 balance has no single V1 leaf; pointsEarned and pointsSpent are migration inputs only.',
  } satisfies NumericFieldClassification),
  ...([
    '$.dream.railgun.pendingBaseSeconds',
    '$.dream.railgun.pendingDreamSeconds',
  ] as const).map((path) => Object.freeze({
    boundary: 'CanonicalGameStateV2-planned',
    path,
    intendedV2Path: path,
    semanticClass: 'bounded-number',
    invariants: Object.freeze([
      'finite non-negative seconds without signed zero',
      'pendingDreamSeconds is at least pendingBaseSeconds',
    ]),
    role: 'timer',
    persistenceEncoding: 'json-number',
    parser: 'descriptor-safe finite-number parser',
    boundedConversions: Object.freeze([
      'never narrowed from Decimal',
      'accumulation rejects non-finite results',
    ]),
    lifecycle:
      'advanced for every continuous segment, consumed only by the next automation settlement, and cleared by Dream reset',
    owner: 'canonical Dream event-time owner',
    stage0Coverage: 'mechanical',
    rationale:
      'Durable recurrence preserves the railgun interval across material boundaries, checkpoints, and reload.',
  }) satisfies NumericFieldClassification),
] as const)

export const durableRuntimeNumericPathInventory = Object.freeze([
  '$.runtime.dysonEvaluationSnapshot.panelsPerSecond',
  '$.runtime.dysonEvaluationSnapshot.panelLifetimeSeconds',
  '$.runtime.dysonEvaluationSnapshot.scienceMultiplier',
  '$.runtime.dysonEvaluationSnapshot.rudimentarySingularityProduction',
  '$.runtime.dysonEvaluationSnapshot.pocketDimensionsProduction',
  '$.runtime.dysonEvaluationSnapshot.scientificPlanetsProduction',
  '$.runtime.dysonEvaluationSnapshot.managerAssemblyLineProduction',
] as const)

export const durableRuntimeNumericClassifications = Object.freeze(
  durableRuntimeNumericPathInventory.map((path) =>
    Object.freeze({
      boundary: 'Schema13RuntimeSidecarV2',
      path,
      intendedV2Path: path,
      semanticClass: 'ordinary-decimal',
      invariants: Object.freeze([
        'normalized non-negative GameDecimal recurrence value',
        'closed seven-field Dyson evaluation snapshot',
      ]),
      role: path.endsWith('panelLifetimeSeconds') ? 'timer' : 'rate',
      persistenceEncoding: 'canonical-decimal-string',
      parser: 'GameDecimal.parseCanonical',
      boundedConversions: Object.freeze([
        'legacy finite number is lifted exactly once during V1-to-V2 migration',
        'subsequent recalculations remain GameDecimal and never narrow through number',
      ]),
      lifecycle:
        'portable gameplay recurrence state; published atomically with V2 state and preserved across schema-13 reload',
      owner: 'Dyson V2 derivation, runtime session, and schema-13 codec',
      stage0Coverage: 'mechanical',
      rationale:
        'Dynamic Dyson effects consume the preceding evaluation snapshot, so reload continuity requires durable portable storage.',
    }) satisfies NumericFieldClassification,
  ),
)

export type IntendedV2ManifestPath =
  | NonNullable<IntendedV2PathFor<CanonicalInventoryPath>>
  | '$.quantum.availableShards'
  | '$.dream.railgun.pendingBaseSeconds'
  | '$.dream.railgun.pendingDreamSeconds'
  | '$.skills.selectedPreset'

export type ExpandClosedV2ManifestPath<TPath extends string> =
  TPath extends '$.research.levelsById.*'
    ? `$.research.levelsById.${CanonicalResearchId}`
    : TPath extends '$.research.progressById.*'
      ? `$.research.progressById.${CanonicalResearchId}`
      : TPath extends '$.dream.timers.*'
        ? `$.dream.timers.${DreamTimerId}`
        : TPath

export type MissingCanonicalV2NumericManifestPath = Exclude<
  NumericLeafPaths<CanonicalGameStateV2>,
  ExpandClosedV2ManifestPath<IntendedV2ManifestPath>
>
export type UnexpectedCanonicalV2NumericManifestPath = Exclude<
  ExpandClosedV2ManifestPath<IntendedV2ManifestPath>,
  NumericLeafPaths<CanonicalGameStateV2>
>

const CANONICAL_V2_PATHS_MATCH_INTENDED_MANIFEST: [
  MissingCanonicalV2NumericManifestPath,
  UnexpectedCanonicalV2NumericManifestPath,
] extends [never, never]
  ? true
  : never = true
void CANONICAL_V2_PATHS_MATCH_INTENDED_MANIFEST

export type DurableRuntimeManifestPath =
  (typeof durableRuntimeNumericPathInventory)[number]

export type MissingDurableRuntimeV2NumericManifestPath = Exclude<
  NumericLeafPaths<CanonicalRuntimeSidecarV2, '$.runtime'>,
  DurableRuntimeManifestPath
>
export type UnexpectedDurableRuntimeV2NumericManifestPath = Exclude<
  DurableRuntimeManifestPath,
  NumericLeafPaths<CanonicalRuntimeSidecarV2, '$.runtime'>
>

const DURABLE_RUNTIME_V2_PATHS_MATCH_MANIFEST: [
  MissingDurableRuntimeV2NumericManifestPath,
  UnexpectedDurableRuntimeV2NumericManifestPath,
] extends [never, never]
  ? true
  : never = true
void DURABLE_RUNTIME_V2_PATHS_MATCH_MANIFEST

export const frontendResourceNumericPathInventory = Object.freeze([
  'FrontendCanonicalResources.dyson.money',
  'FrontendCanonicalResources.dyson.science',
  'FrontendCanonicalResources.dyson.bots',
  'FrontendCanonicalResources.dyson.workers',
  'FrontendCanonicalResources.dyson.researchers',
  'FrontendCanonicalResources.infinity.points',
  'FrontendCanonicalResources.infinity.spentPoints',
  'FrontendCanonicalResources.infinity.availablePoints',
  'FrontendCanonicalResources.infinity.secretsOfTheUniverse',
  'FrontendCanonicalResources.infinity.permanentSkillPoints',
  'FrontendCanonicalResources.skills.points',
  'FrontendCanonicalResources.skills.fragments',
  'FrontendCanonicalResources.reality.universeDesignationCount',
  'FrontendCanonicalResources.reality.workersReady',
  'FrontendCanonicalResources.reality.workerGenerationProgress',
  'FrontendCanonicalResources.reality.influence',
  'FrontendCanonicalResources.quantum.pointsEarned',
  'FrontendCanonicalResources.quantum.pointsSpent',
  'FrontendCanonicalResources.quantum.availablePoints',
  'FrontendCanonicalResources.quantum.permanentSecrets',
  'FrontendCanonicalResources.quantum.influenceSpeedBonus',
  'FrontendCanonicalResources.quantum.cashBonusLevels',
  'FrontendCanonicalResources.quantum.scienceBonusLevels',
  'FrontendCanonicalResources.avocado.infinityPoints',
  'FrontendCanonicalResources.avocado.influence',
  'FrontendCanonicalResources.avocado.strangeMatter',
  'FrontendCanonicalResources.avocado.overflowMultiplier',
  ...DREAM_RESOURCE_FIELDS.map(
    (field) => `FrontendCanonicalResources.dream.${field}` as const,
  ),
  'FrontendCanonicalResources.dream.strangeMatter',
  'FrontendCanonicalResources.time.storedTimeAvailableSeconds',
  'FrontendCanonicalResources.time.storedTimeCapacitySeconds',
  'FrontendCanonicalResources.time.doubleTimeBankSeconds',
] as const)

function frontendResourceSourcePath(path: string): CanonicalInventoryPath {
  const suffix = path.slice('FrontendCanonicalResources.'.length)
  const aliases: Readonly<Record<string, CanonicalInventoryPath>> = {
    'infinity.availablePoints': '$.infinity.points',
    'quantum.availablePoints': '$.quantum.pointsEarned',
    'dream.strangeMatter': '$.dream.strangeMatter',
    'time.storedTimeAvailableSeconds':
      '$.timeline.storedTimeAvailableSeconds',
    'time.storedTimeCapacitySeconds':
      '$.timeline.storedTimeCapacitySeconds',
    'time.doubleTimeBankSeconds': '$.timeline.doubleTime.bankSeconds',
  }
  if (suffix.startsWith('dream.') && suffix !== 'dream.strangeMatter') {
    return `$.dream.resources.${suffix.slice('dream.'.length)}` as
      CanonicalInventoryPath
  }
  return aliases[suffix] ?? (`$.${suffix}` as CanonicalInventoryPath)
}

export const frontendResourceNumericClassifications = Object.freeze(
  frontendResourceNumericPathInventory.map((path) => {
    const sourcePath = frontendResourceSourcePath(path)
    const source = canonicalNumericFieldClassifications.find(
      (entry) => entry.path === sourcePath,
    )
    if (source === undefined) {
      throw new Error(`Frontend numeric resource lacks canonical source: ${path}`)
    }
    return Object.freeze({
      ...source,
      boundary: 'FrontendCanonicalResources',
      path,
      persistenceEncoding: 'not-persisted' as const,
      parser: 'projectFromValidatedCanonicalState',
      lifecycle: 'read-only projection; frontend cannot mutate authority',
      owner: 'frontend snapshot selector',
      stage0Coverage: 'mechanical' as const,
    }) satisfies NumericFieldClassification
  }),
)

export const generatedDataNumericPathInventory = Object.freeze([
  'GameData.EffectDefinition.data.operation',
  'GameData.EffectDefinition.data.order',
  'GameData.EffectDefinition.data.perLevel',
  'GameData.EffectDefinition.data.value',
  'GameData.FacilityDefinition.data.baseCost',
  'GameData.FacilityDefinition.data.baseProduction',
  'GameData.FacilityDefinition.data.costExponent',
  'GameData.ResearchDefinition.data.autoBuyGroup',
  'GameData.ResearchDefinition.data.baseCost',
  'GameData.ResearchDefinition.data.exponent',
  'GameData.ResearchDefinition.data.maxLevel',
  'GameData.ResearchDefinition.data.prerequisiteFacilityOwned',
  'GameData.SkillDefinition.data.cost',
  'GameData.SkillDefinition.data.firstRunBlocked',
  'GameData.SkillDefinition.data.isFragment',
  'GameData.SkillDefinition.data.paragadeLine',
  'GameData.SkillDefinition.data.powerLine',
  'GameData.SkillDefinition.data.purityLine',
  'GameData.SkillDefinition.data.refundable',
  'GameData.SkillDefinition.data.stellarLine',
  'GameData.SkillDefinition.data.terraLine',
  'IdleDysonSwarm.Data.Balance.FacilityBalanceProfile.data.entries.*.displayOrder',
  'IdleDysonSwarm.Data.Balance.FacilityBalanceProfile.data.entries.*.group',
  'IdleDysonSwarm.Data.Balance.FacilityBalanceProfile.data.entries.*.modifierKind',
  'IdleDysonSwarm.Data.Balance.FacilityBalanceProfile.data.entries.*.prerequisiteOwned',
  'IdleDysonSwarm.Data.Balance.FacilityBalanceProfile.data.entries.*.quantumGate',
  'IdleDysonSwarm.Data.Balance.RealitySystemTuning.data.avocadoLogThreshold',
  'IdleDysonSwarm.Data.Balance.RealitySystemTuning.data.baseWorkerGenerationSpeed',
  'IdleDysonSwarm.Data.Balance.RealitySystemTuning.data.workerBatchSize',
  'IdleDysonSwarm.Data.Balance.SimulationUpgradeDefinition.data.cost',
  'IdleDysonSwarm.Data.Balance.SimulationUpgradeDefinition.data.layer',
  'IdleDysonSwarm.Data.Balance.SimulationUpgradeDefinition.data.prerequisites.*.mustBeOwned',
  'IdleDysonSwarm.Data.Balance.SimulationUpgradeDefinition.data.purchaseEffects.*.boolValue',
  'IdleDysonSwarm.Data.Balance.SimulationUpgradeDefinition.data.purchaseEffects.*.effectType',
  'IdleDysonSwarm.Data.Balance.SimulationUpgradeDefinition.data.purchaseEffects.*.numericValue',
  'IdleDysonSwarm.Data.Conditions.FacilityCountCondition.data._countType',
  'IdleDysonSwarm.Data.Conditions.FacilityCountCondition.data._operator',
  'IdleDysonSwarm.Data.Conditions.FacilityCountCondition.data._threshold',
  'IdleDysonSwarm.Data.Conditions.FacilityStateCondition.data._operator',
  'IdleDysonSwarm.Data.Conditions.FacilityStateCondition.data._property',
  'IdleDysonSwarm.Data.Conditions.FacilityStateCondition.data._threshold',
  'IdleDysonSwarm.Data.QuantumUpgradeDefinition.data.baseCost',
  'IdleDysonSwarm.Data.QuantumUpgradeDefinition.data.costScaling',
  'IdleDysonSwarm.Data.QuantumUpgradeDefinition.data.isRepeatable',
  'IdleDysonSwarm.Data.QuantumUpgradeDefinition.data.maxPurchases',
] as const)

const generatedDecimalPaths = new Set<string>([
  'GameData.FacilityDefinition.data.baseCost',
  'GameData.FacilityDefinition.data.baseProduction',
  'GameData.ResearchDefinition.data.baseCost',
  'IdleDysonSwarm.Data.Balance.RealitySystemTuning.data.baseWorkerGenerationSpeed',
])

const generatedIntegerDecimalPaths = new Set<string>([
  'GameData.ResearchDefinition.data.prerequisiteFacilityOwned',
  'IdleDysonSwarm.Data.Balance.FacilityBalanceProfile.data.entries.*.prerequisiteOwned',
  'IdleDysonSwarm.Data.Balance.SimulationUpgradeDefinition.data.cost',
  'IdleDysonSwarm.Data.Conditions.FacilityCountCondition.data._threshold',
  'IdleDysonSwarm.Data.Conditions.FacilityStateCondition.data._threshold',
  'IdleDysonSwarm.Data.QuantumUpgradeDefinition.data.baseCost',
])

const generatedExactBigIntPaths = new Set<string>([
  'GameData.SkillDefinition.data.cost',
  'IdleDysonSwarm.Data.Balance.RealitySystemTuning.data.workerBatchSize',
  'IdleDysonSwarm.Data.QuantumUpgradeDefinition.data.maxPurchases',
])

const generatedBooleanNumberPaths = new Set<string>([
  'GameData.SkillDefinition.data.firstRunBlocked',
  'GameData.SkillDefinition.data.isFragment',
  'GameData.SkillDefinition.data.paragadeLine',
  'GameData.SkillDefinition.data.powerLine',
  'GameData.SkillDefinition.data.purityLine',
  'GameData.SkillDefinition.data.refundable',
  'GameData.SkillDefinition.data.stellarLine',
  'GameData.SkillDefinition.data.terraLine',
  'IdleDysonSwarm.Data.Balance.SimulationUpgradeDefinition.data.prerequisites.*.mustBeOwned',
  'IdleDysonSwarm.Data.Balance.SimulationUpgradeDefinition.data.purchaseEffects.*.boolValue',
  'IdleDysonSwarm.Data.QuantumUpgradeDefinition.data.isRepeatable',
])

export const generatedDataNumericClassifications = Object.freeze(
  generatedDataNumericPathInventory.map((path) => {
    const semanticClass: NumericSemanticClass = generatedExactBigIntPaths.has(
      path,
    )
      ? 'exact-bigint'
      : generatedIntegerDecimalPaths.has(path)
        ? 'integer-decimal'
        : generatedDecimalPaths.has(path)
          ? 'ordinary-decimal'
          : 'bounded-number'
    const role: NumericFieldRole = generatedBooleanNumberPaths.has(path)
      ? 'control'
      : path.endsWith('.maxPurchases') || path.endsWith('.quantumGate')
        ? 'control'
      : path.includes('cost') || path.includes('Cost')
        ? 'cost'
        : path.includes('Production') || path.includes('GenerationSpeed')
          ? 'rate'
        : semanticClass === 'bounded-number'
          ? 'authored-coefficient'
          : 'inventory'
    return Object.freeze({
      boundary: 'generated-runtime-catalog',
      path,
      intendedV2Path: null,
      semanticClass,
      invariants:
        generatedBooleanNumberPaths.has(path)
          ? Object.freeze(['integer 0 or 1 before boolean conversion'])
          : path.endsWith('.quantumGate')
            ? Object.freeze(['integer enum value from 1 through 3'])
            : path.endsWith('.maxPurchases')
              ? Object.freeze([
                  'finite authored integer cap',
                  '0 means no maximum; positive values are checked bigint caps',
                ])
          : path.endsWith('.value') || path.endsWith('.numericValue')
          ? Object.freeze([
              'finite authored value; sign and range are target-specific',
            ])
          : invariantsForClass(semanticClass, role),
      role,
      persistenceEncoding: 'generated-json-number' as const,
      parser: 'generatedCatalogPathValidator',
      boundedConversions:
        semanticClass === 'bounded-number'
          ? Object.freeze([
              'remain bounded authored data or lift at the target-specific consumer',
            ])
          : conversionsForClass(semanticClass),
      lifecycle: 'immutable authored data; never written to player saves',
      owner: 'generated data loader and target-specific simulation consumer',
      stage0Coverage: 'inventory-only' as const,
      consumerPolicy:
        path === 'GameData.EffectDefinition.data.value' ||
        path === 'GameData.EffectDefinition.data.perLevel'
          ? 'Resolve targetStatId and operation first; lift scalable effects to GameDecimal, retain only bounded authored control coefficients as number.'
          : path.endsWith('.purchaseEffects.*.numericValue')
            ? 'Resolve effectType and target key first; lift costs, rates, multipliers, and scalable outputs to GameDecimal; use checked exact conversion for bounded ranks.'
            : undefined,
    }) satisfies NumericFieldClassification
  }),
)

export const skillTreePresentationNumericPathInventory = Object.freeze([
  'skill-tree-presentation.formatVersion',
  'skill-tree-presentation.nodeCount',
  'skill-tree-presentation.nodes.*.cost',
  'skill-tree-presentation.nodes.*.legacySkillKey',
  'skill-tree-presentation.nodes.*.x',
  'skill-tree-presentation.nodes.*.y',
] as const)

export const skillTreePresentationNumericClassifications = Object.freeze(
  skillTreePresentationNumericPathInventory.map((path) => {
    const semanticClass: NumericSemanticClass = path.endsWith('.cost')
      ? 'exact-bigint'
      : 'bounded-number'
    const role: NumericFieldRole = path.endsWith('.cost')
      ? 'cost'
      : 'control'
    return Object.freeze({
      boundary: 'generated-skill-tree-presentation',
      path,
      intendedV2Path: null,
      semanticClass,
      invariants: path.endsWith('.cost')
        ? Object.freeze([
            'finite non-negative safe integer in generated JSON',
            'display-only copy of exact authored Skill cost',
          ])
        : path.endsWith('.x') || path.endsWith('.y')
          ? Object.freeze(['finite bounded UI geometry coordinate'])
          : Object.freeze(['finite non-negative authored metadata integer']),
      role,
      persistenceEncoding: 'generated-json-number',
      parser: 'skillTreePresentationPathValidator',
      boundedConversions: path.endsWith('.cost')
        ? Object.freeze([
            'checked safe-integer number to bigint for display comparison only',
            'canonical affordability always uses backend Skill definition cost',
          ])
        : Object.freeze(['no economy conversion permitted']),
      lifecycle: 'immutable presentation data; never written to player saves',
      owner: 'Skills presentation catalog loader',
      stage0Coverage: 'inventory-only',
    }) satisfies NumericFieldClassification
  }),
)

const transactionAndDtoNumericInventory = [
  {
    boundary: 'CanonicalGameCommand',
    path: 'dream.purchase-space-age.quantity',
    semanticClass: 'exact-bigint',
    role: 'transaction-quantity',
    invariants: ['positive integer', 'at most 1000 fixed-price batches'],
    owner: 'Dream Space-Age transaction engine',
  },
  {
    boundary: 'CanonicalGameCommand',
    path: 'quantum.purchase-upgrade.quantity',
    semanticClass: 'integer-decimal',
    role: 'transaction-quantity',
    invariants: ['positive integer or buy-max mode'],
    owner: 'Quantum upgrade transaction engine',
  },
  {
    boundary: 'CanonicalGameCommand',
    path: 'infinity.set-break-target.target',
    semanticClass: 'integer-decimal',
    role: 'level',
    invariants: ['non-negative integer'],
    owner: 'Infinity break-target transaction',
  },
  {
    boundary: 'CanonicalGameCommand',
    path: 'time.request-stored-time-spend.requestedSeconds',
    semanticClass: 'bounded-number',
    role: 'timer',
    invariants: ['finite non-negative seconds'],
    owner: 'stored-time lifecycle transaction',
  },
  {
    boundary: 'simulation.transactions.DebitResult',
    path: 'balance',
    semanticClass: 'ordinary-decimal',
    role: 'transaction-result',
    invariants: ['normalized non-negative GameDecimal'],
    owner: 'transaction engine',
  },
  {
    boundary: 'simulation.transactions.DebitResult',
    path: 'charged',
    semanticClass: 'ordinary-decimal',
    role: 'transaction-result',
    invariants: ['normalized non-negative GameDecimal'],
    owner: 'transaction engine',
  },
  {
    boundary: 'simulation.transactions.FacilityPurchaseResult',
    path: 'quantity',
    semanticClass: 'integer-decimal',
    role: 'transaction-result',
    invariants: ['non-negative integer'],
    owner: 'Dyson facility transaction engine',
  },
  {
    boundary: 'simulation.transactions.FacilityPurchaseResult',
    path: 'cost',
    semanticClass: 'ordinary-decimal',
    role: 'transaction-result',
    invariants: ['normalized non-negative GameDecimal'],
    owner: 'Dyson facility transaction engine',
  },
  {
    boundary: 'simulation.types.SimulationQueuedInput',
    path: 'timeSeconds',
    semanticClass: 'bounded-number',
    role: 'timer',
    invariants: ['finite non-negative seconds within requested slice'],
    owner: 'event-time scheduler',
  },
  {
    boundary: 'simulation.types.SimulationQueuedInput',
    path: 'discreteValue',
    semanticClass: 'integer-decimal',
    role: 'transaction-quantity',
    invariants: ['non-negative integer'],
    owner: 'queued command decoder and command-specific owner',
  },
  {
    boundary: 'simulation.types.SimulationQueuedInput',
    path: 'continuousValue',
    semanticClass: 'ordinary-decimal',
    role: 'transaction-quantity',
    invariants: ['normalized non-negative GameDecimal'],
    owner: 'queued command decoder and command-specific owner',
  },
] as const satisfies readonly {
  readonly boundary: string
  readonly path: string
  readonly semanticClass: NumericSemanticClass
  readonly role: NumericFieldRole
  readonly invariants: readonly string[]
  readonly owner: string
}[]

export const transactionAndDtoNumericClassifications = Object.freeze(
  transactionAndDtoNumericInventory.map((entry) => {
  const persistence = persistenceForClass(entry.semanticClass)
  return Object.freeze({
    ...entry,
    intendedV2Path: null,
    ...persistence,
    persistenceEncoding: 'not-persisted' as const,
    boundedConversions: conversionsForClass(entry.semanticClass),
    lifecycle: 'ephemeral validated DTO; authority changes only on commit',
    stage0Coverage: 'inventory-only' as const,
    }) satisfies NumericFieldClassification
  }),
)

const v2TransactionDtoNumericInventory = [
  ['V2PurchaseQuote.sourceRevision', 'bounded-number', 'control'],
  ['V2PurchaseQuote.batches', 'integer-decimal', 'transaction-quantity'],
  ['V2PurchaseQuote.unitsGranted', 'ordinary-decimal', 'transaction-result'],
  ['V2PurchaseQuote.quotedCost', 'ordinary-decimal', 'cost'],
  ['V2PurchaseQuote.debitedAmount', 'ordinary-decimal', 'transaction-result'],
  ['V2PurchaseQuote.sourceBalance', 'ordinary-decimal', 'balance'],
  ['V2PurchaseQuote.sourceOutput', 'ordinary-decimal', 'transaction-result'],
  ['V2PurchaseQuote.expectedBalance', 'ordinary-decimal', 'balance'],
  ['V2PurchaseQuote.expectedOutput', 'ordinary-decimal', 'transaction-result'],
  ['V2PurchaseCommitResult.revision', 'bounded-number', 'control'],
  ['V2PurchaseCommitResult.balance', 'ordinary-decimal', 'balance'],
  ['V2PurchaseCommitResult.output', 'ordinary-decimal', 'transaction-result'],
  ['V2PurchaseCommitResult.quotedCost', 'ordinary-decimal', 'cost'],
  ['V2PurchaseCommitResult.debitedAmount', 'ordinary-decimal', 'transaction-result'],
  ['V2PurchaseCommitResult.unitsGranted', 'ordinary-decimal', 'transaction-result'],
  ['V2BulkCorrectionResult.batches', 'integer-decimal', 'transaction-quantity'],
  ['V2BulkCorrectionResult.cost', 'ordinary-decimal', 'cost'],
  ['V2BulkCorrectionResult.corrections', 'bounded-number', 'control'],
  ['V2GeometricAffordabilityResult.batches', 'integer-decimal', 'transaction-quantity'],
  ['V2GeometricAffordabilityResult.cost', 'ordinary-decimal', 'cost'],
  ['V2GeometricAffordabilityResult.corrections', 'bounded-number', 'control'],
  ['V2AtomicAccount.balance', 'ordinary-decimal', 'balance'],
  ['V2AtomicLeg.amount', 'ordinary-decimal', 'transaction-quantity'],
  ['V2AtomicExchangeQuote.sourceRevision', 'bounded-number', 'control'],
  ['V2AtomicExchangeQuote.before.*.balance', 'ordinary-decimal', 'balance'],
  ['V2AtomicExchangeQuote.after.*.balance', 'ordinary-decimal', 'balance'],
  ['V2AtomicExchangeQuote.debited.*.amount', 'ordinary-decimal', 'transaction-result'],
  ['V2AtomicExchangeQuote.credited.*.amount', 'ordinary-decimal', 'transaction-result'],
  ['V2AtomicExchangeCommitResult.revision', 'bounded-number', 'control'],
  ['V2AtomicExchangeCommitResult.accounts.*.balance', 'ordinary-decimal', 'balance'],
  ['DysonV2FacilityPurchaseQuote.sourceRevision', 'bounded-number', 'control'],
  ['DysonV2FacilityPurchaseQuote.batches', 'integer-decimal', 'transaction-quantity'],
  ['DysonV2FacilityPurchaseQuote.unitsGranted', 'ordinary-decimal', 'transaction-result'],
  ['DysonV2FacilityPurchaseQuote.quotedCost', 'ordinary-decimal', 'cost'],
  ['DysonV2FacilityPurchaseQuote.debitedAmount', 'ordinary-decimal', 'transaction-result'],
  ['DysonV2FacilityPurchaseResult.revision', 'bounded-number', 'control'],
  ['DysonV2FacilityPurchaseResult.batches', 'integer-decimal', 'transaction-quantity'],
  ['DysonV2FacilityPurchaseResult.quotedCost', 'ordinary-decimal', 'cost'],
  ['DysonV2FacilityPurchaseResult.debitedAmount', 'ordinary-decimal', 'transaction-result'],
  ['DysonV2FacilityPurchaseResult.unitsGranted', 'ordinary-decimal', 'transaction-result'],
  ['ResearchV2PurchaseQuote.sourceRevision', 'bounded-number', 'control'],
  ['ResearchV2PurchaseQuote.currentLevel', 'integer-decimal', 'level'],
  ['ResearchV2PurchaseQuote.maximumLevel', 'exact-bigint', 'level'],
  ['ResearchV2PurchaseQuote.affordableBatches', 'integer-decimal', 'transaction-quantity'],
  ['ResearchV2PurchaseQuote.batches', 'integer-decimal', 'transaction-quantity'],
  ['ResearchV2PurchaseQuote.quotedCost', 'ordinary-decimal', 'cost'],
  ['ResearchV2PurchaseQuote.debitedAmount', 'ordinary-decimal', 'transaction-result'],
  ['ResearchV2PurchaseResult.revision', 'bounded-number', 'control'],
  ['ResearchV2PurchaseResult.batches', 'integer-decimal', 'transaction-quantity'],
  ['ResearchV2PurchaseResult.quotedCost', 'ordinary-decimal', 'cost'],
  ['ResearchV2PurchaseResult.debitedAmount', 'ordinary-decimal', 'transaction-result'],
  ['ResearchV2PhaseAccounting.sourceRevision', 'bounded-number', 'control'],
  ['ResearchV2PhaseAccounting.startTargetIndex', 'bounded-number', 'control'],
  ['ResearchV2PhaseAccounting.nextTargetIndex', 'bounded-number', 'control'],
  ['ResearchV2PhaseAccounting.visitedResearchCount', 'bounded-number', 'statistic'],
  ['ResearchV2PhaseAccounting.successfulPurchaseCount', 'bounded-number', 'statistic'],
  ['ResearchV2PhaseAccounting.purchasedBatches', 'integer-decimal', 'transaction-result'],
  ['ResearchV2PhaseAccounting.scienceDebited', 'ordinary-decimal', 'transaction-result'],
  ['InfinityShopQuoteV2.sourceRevision', 'bounded-number', 'control'],
  ['InfinityShopQuoteV2.quotedCost', 'integer-decimal', 'cost'],
  ['InfinityShopQuoteV2.debitedAmount', 'integer-decimal', 'transaction-result'],
  ['InfinityShopQuoteV2.allocatedAmount', 'integer-decimal', 'transaction-result'],
  ['InfinityShopCommitResultV2.revision', 'bounded-number', 'control'],
  ['InfinityShopCommitResultV2.quotedCost', 'integer-decimal', 'cost'],
  ['InfinityShopCommitResultV2.debitedAmount', 'integer-decimal', 'transaction-result'],
  ['InfinityShopCommitResultV2.allocatedAmount', 'integer-decimal', 'transaction-result'],
  ['RealityWorkerAdvanceResultV2.generationPerSecond', 'ordinary-decimal', 'rate'],
  ['RealityWorkerAdvanceResultV2.workersGenerated', 'integer-decimal', 'transaction-result'],
  ['RealityWorkerAdvanceResultV2.automaticInfluence', 'integer-decimal', 'transaction-result'],
  ['RealityWorkerAdvanceResultV2.stalledSeconds', 'bounded-number', 'timer'],
  ['RealityGatherResultV2.influenceGathered', 'integer-decimal', 'transaction-result'],
  ['RealityStrangeMatterAccountV2.revision', 'bounded-number', 'control'],
  ['RealityStrangeMatterAccountV2.balance', 'integer-decimal', 'balance'],
  ['RealityUpgradeQuoteV2.sourceRevision', 'bounded-number', 'control'],
  ['RealityUpgradeQuoteV2.cost', 'integer-decimal', 'cost'],
  ['RealityUpgradeQuoteV2.sourceBalance', 'integer-decimal', 'balance'],
  ['RealityUpgradeQuoteV2.expectedBalance', 'integer-decimal', 'balance'],
  ['RealityUpgradeCommitResultV2.cost', 'integer-decimal', 'cost'],
  ['QuantumPurchaseQuoteV2.sourceRevision', 'bounded-number', 'control'],
  ['QuantumPurchaseQuoteV2.currentPurchases', 'integer-decimal', 'level'],
  ['QuantumPurchaseQuoteV2.maximumPurchases', 'exact-bigint', 'level'],
  ['QuantumPurchaseQuoteV2.batches', 'integer-decimal', 'transaction-quantity'],
  ['QuantumPurchaseQuoteV2.quotedCost', 'integer-decimal', 'cost'],
  ['QuantumPurchaseResultV2.revision', 'bounded-number', 'control'],
  ['QuantumPurchaseResultV2.batches', 'integer-decimal', 'transaction-quantity'],
  ['QuantumPurchaseResultV2.quotedCost', 'integer-decimal', 'cost'],
  ['QuantumPurchaseResultV2.debitedAmount', 'integer-decimal', 'transaction-result'],
  ['DreamCommandQuoteV2.sourceRevision', 'bounded-number', 'control'],
  ['DreamCommandQuoteV2.batches', 'integer-decimal', 'transaction-quantity'],
  ['DreamCommandQuoteV2.unitsGranted', 'ordinary-decimal', 'transaction-result'],
  ['DreamCommandQuoteV2.quotedCost', 'ordinary-decimal', 'cost'],
  ['DreamCommandQuoteV2.debitedStrangeMatter', 'integer-decimal', 'transaction-result'],
  ['AvocadoCommandQuoteV2.sourceRevision', 'bounded-number', 'control'],
  ['AvocadoCommandQuoteV2.transferred', 'ordinary-decimal', 'transaction-result'],
  ['AvocadoCommandQuoteV2.effectiveCredit', 'ordinary-decimal', 'transaction-result'],
  ['AvocadoCommandQuoteV2.skillPointsGranted', 'exact-bigint', 'transaction-result'],
  ['AvocadoStrangeMatterAccountV2.revision', 'bounded-number', 'control'],
  ['AvocadoStrangeMatterAccountV2.balance', 'integer-decimal', 'balance'],
  ['DeveloperOptionsQuoteV2.sourceRevision', 'bounded-number', 'control'],
  ['DeveloperOptionsQuoteV2.quotedShardCost', 'integer-decimal', 'cost'],
  ['DeveloperOptionsQuoteV2.quotedStrangeMatterCost', 'integer-decimal', 'cost'],
  ['DeveloperOptionsQuoteV2.debitedShards', 'integer-decimal', 'transaction-result'],
  ['DeveloperOptionsQuoteV2.debitedStrangeMatter', 'integer-decimal', 'transaction-result'],
  ['CanonicalDreamResetQuoteV2.sourceRevision', 'bounded-number', 'control'],
  ['CanonicalDreamResetQuoteV2.requestedReward', 'integer-decimal', 'transaction-result'],
  ['CanonicalDreamResetQuoteV2.effectiveReward', 'integer-decimal', 'transaction-result'],
] as const satisfies readonly (
  readonly [string, NumericSemanticClass, NumericFieldRole]
)[]

export const v2TransactionDtoNumericClassifications = Object.freeze(
  v2TransactionDtoNumericInventory.map(([path, semanticClass, role]) =>
    Object.freeze({
      boundary: 'V2 transaction quote and result DTOs',
      path,
      intendedV2Path: null,
      semanticClass,
      invariants: invariantsForClass(semanticClass, role),
      role,
      ...persistenceForClass(semanticClass),
      persistenceEncoding: 'not-persisted' as const,
      boundedConversions: conversionsForClass(semanticClass),
      lifecycle: 'ephemeral immutable V2 quote/result; never authoritative persistence',
      owner: path.slice(0, path.indexOf('.')),
      stage0Coverage: 'mechanical' as const,
      consumerPolicy:
        semanticClass === 'bounded-number'
          ? 'May remain number only for validated revisions, counts, indices, timers, or controls.'
          : 'Must retain its exact GameDecimal or bigint carrier through every backend and frontend boundary.',
    }) satisfies NumericFieldClassification,
  ),
)

const currentUnboundedRuntimeCarrierInventory = [
  ['FrontendMegaStructurePurchasePreview.selectedQuantity', 'integer-decimal', 'transaction-quantity'],
  ['FrontendMegaStructurePurchasePreview.cost', 'ordinary-decimal', 'cost'],
  ['CanonicalResearchPurchasePreview.currentLevel', 'integer-decimal', 'level'],
  ['CanonicalResearchPurchasePreview.selectedQuantity', 'integer-decimal', 'transaction-quantity'],
  ['CanonicalResearchPurchasePreview.affordableQuantity', 'integer-decimal', 'transaction-quantity'],
  ['CanonicalResearchPurchasePreview.cost', 'ordinary-decimal', 'cost'],
  ['FrontendResearchCardPreview.perLevelEffect', 'ordinary-decimal', 'rate'],
  ['FrontendResearchCardPreview.currentEffect', 'ordinary-decimal', 'rate'],
  ['FrontendResearchCardPreview.projectedEffect', 'ordinary-decimal', 'rate'],
  ['FrontendResearchCardPreview.passiveProgress', 'ordinary-decimal', 'progress'],
  ['FrontendInfinityShopPreview.cost', 'integer-decimal', 'cost'],
  ['FrontendDreamPurchasePreview.cost', 'integer-decimal', 'cost'],
  ['FrontendDreamInfluencePurchaseModePreview.batches', 'integer-decimal', 'transaction-quantity'],
  ['FrontendDreamInfluencePurchaseModePreview.unitsRequested', 'integer-decimal', 'transaction-quantity'],
  ['FrontendDreamInfluencePurchaseModePreview.unitsGranted', 'integer-decimal', 'transaction-result'],
  ['FrontendDreamInfluencePurchaseModePreview.totalCost', 'integer-decimal', 'cost'],
  ['FrontendDreamInfluencePurchaseModePreview.buyMaxBatchCap', 'integer-decimal', 'transaction-quantity'],
  ['FrontendDreamUpgradePreview.cost', 'integer-decimal', 'cost'],
  ['FrontendDreamEducationPreview.cost', 'integer-decimal', 'cost'],
  ['FrontendDreamResetPreview.requestedReward', 'integer-decimal', 'transaction-result'],
  ['FrontendRealityUpgradePreview.cost', 'integer-decimal', 'cost'],
  ['FrontendQuantumUpgradePreview.cost', 'integer-decimal', 'cost'],
  ['FrontendQuantumUpgradePreview.purchaseModes.*.batches', 'integer-decimal', 'transaction-quantity'],
  ['FrontendQuantumUpgradePreview.purchaseModes.*.totalCost', 'integer-decimal', 'cost'],
  ['FrontendAvocadoFeedPreview.amount', 'integer-decimal', 'transaction-quantity'],
  ['FrontendQuantumLeapPreview.artifactSkillPoints', 'exact-bigint', 'transaction-result'],
  ['FrontendRealityDerivedFacts.generationPerSecond', 'ordinary-decimal', 'rate'],
  ['FrontendRealityDerivedFacts.workerGenerationAnimationRatePerSecond', 'bounded-number', 'rate'],
  ['FrontendRealityDerivedFacts.workerGenerationFillFraction', 'bounded-number', 'progress'],
  ['FrontendRealityDerivedFacts.workerBatchSize', 'exact-bigint', 'inventory'],
  ['FrontendRealityDerivedFacts.nextUniverseDesignation', 'integer-decimal', 'inventory'],
  ['FrontendRealityDerivedFacts.workerBatchFillFraction', 'bounded-number', 'progress'],
  ['FrontendRealityDerivedFacts.artifact.scrambleIntervalSeconds', 'bounded-number', 'timer'],
  ['FrontendDysonDerivedFactsV2.value.globals.moneyMultiplier', 'ordinary-decimal', 'rate'],
  ['FrontendDysonDerivedFactsV2.value.globals.scienceMultiplier', 'ordinary-decimal', 'rate'],
  ['FrontendDysonDerivedFactsV2.value.globals.panelsPerSecond', 'ordinary-decimal', 'rate'],
  ['FrontendDysonDerivedFactsV2.value.globals.panelLifetimeSeconds', 'ordinary-decimal', 'timer'],
  ['FrontendDysonDerivedFactsV2.value.rates.*', 'ordinary-decimal', 'rate'],
  ['FrontendBasicFacilityFactsV2.ownership.automatic', 'ordinary-decimal', 'inventory'],
  ['FrontendBasicFacilityFactsV2.ownership.manual', 'integer-decimal', 'inventory'],
  ['FrontendBasicFacilityFactsV2.ownership.total', 'ordinary-decimal', 'inventory'],
  ['FrontendBasicFacilityFactsV2.production.perSecond', 'ordinary-decimal', 'rate'],
  ['FrontendBasicFacilityFactsV2.production.secondsPerUnit', 'bounded-number', 'timer'],
  ['FrontendBasicFacilityFactsV2.productionProgress.normalized', 'bounded-number', 'progress'],
  ['FrontendBasicFacilityFactsV2.details.baseProductionPerSecond', 'ordinary-decimal', 'rate'],
  ['FrontendBasicFacilityFactsV2.details.effectiveProducerCount', 'ordinary-decimal', 'inventory'],
  ['FrontendBasicFacilityFactsV2.details.modifier', 'ordinary-decimal', 'rate'],
  ['FrontendBasicFacilityFactsV2.details.contributions.*.value', 'ordinary-decimal', 'transaction-result'],
  ['FrontendBasicFacilityFactsV2.details.contributions.*.delta', 'ordinary-decimal', 'transaction-result'],
  ['FrontendBasicFacilityFactsV2.details.contributions.*.runningTotal', 'ordinary-decimal', 'transaction-result'],
  ['FrontendBasicFacilityFactsV2.details.contributions.*.automaticManualTuple.*', 'ordinary-decimal', 'inventory'],
  ['FrontendBasicFacilityFactsV2.details.upstreamSources.*.contributionPerSecond', 'ordinary-decimal', 'rate'],
  ['AvocadoMultiplierV2.infinityPoints', 'ordinary-decimal', 'rate'],
  ['AvocadoMultiplierV2.influence', 'ordinary-decimal', 'rate'],
  ['AvocadoMultiplierV2.strangeMatter', 'ordinary-decimal', 'rate'],
  ['AvocadoMultiplierV2.overflow', 'ordinary-decimal', 'rate'],
  ['AvocadoMultiplierV2.total', 'ordinary-decimal', 'rate'],
  ['DysonProductionArrivalResult.money', 'ordinary-decimal', 'transaction-result'],
  ['DysonProductionArrivalResult.science', 'ordinary-decimal', 'transaction-result'],
  ['DysonProductionArrivalResult.panels', 'ordinary-decimal', 'transaction-result'],
  ['DysonProductionArrivalResult.bots', 'ordinary-decimal', 'transaction-result'],
  ['DerivedBasicDysonState.rates.*', 'ordinary-decimal', 'rate'],
  ['DreamFoundationalProductionFacts.*.progressPerSecond', 'ordinary-decimal', 'rate'],
  ['DreamFoundationalProductionFacts.*.cyclesPerSecond', 'ordinary-decimal', 'rate'],
  ['DreamSpaceAgeProductionFacts.energyGenerated', 'ordinary-decimal', 'transaction-result'],
  ['DreamSpaceAgeProductionFacts.*PerSecond', 'ordinary-decimal', 'rate'],
  ['DreamRailgunAdvanceResult.panelsLaunched', 'integer-decimal', 'transaction-result'],
  ['DreamRailgunReadinessFacts.panelsPerShot', 'integer-decimal', 'transaction-quantity'],
  ['DreamRailgunReadinessFacts.panelsPerVolley', 'integer-decimal', 'transaction-quantity'],
  ['DreamSpaceAgePurchaseResult.cost', 'integer-decimal', 'cost'],
  ['RealityWorkerFacts.generationPerSecond', 'ordinary-decimal', 'rate'],
  ['RealityWorkerAdvanceResult.workersGenerated', 'integer-decimal', 'transaction-result'],
  ['RealityGatherResult.amount', 'integer-decimal', 'transaction-result'],
  ['CanonicalSkillPurchasePreview.cost', 'exact-bigint', 'cost'],
  ['CanonicalSkillTransactionResult.pointsRequired', 'exact-bigint', 'transaction-result'],
  ['CanonicalSkillTransactionResult.pointsReturned', 'exact-bigint', 'transaction-result'],
  ['CanonicalInfinityReset.requestedReward', 'integer-decimal', 'transaction-quantity'],
  ['CanonicalInfinityReset.rewardGranted', 'integer-decimal', 'transaction-result'],
  ['CanonicalDreamReset.requestedReward', 'integer-decimal', 'transaction-quantity'],
  ['CanonicalDreamReset.rewardGranted', 'integer-decimal', 'transaction-result'],
  ['CanonicalInfinityShopPurchaseResult.cost', 'integer-decimal', 'cost'],
  ['QuantumUpgradePurchaseResult.cost', 'integer-decimal', 'cost'],
  ['RealityUpgradePurchaseResult.cost', 'integer-decimal', 'cost'],
  ['SimulationPresentationSummary.*InfinityPoints', 'integer-decimal', 'statistic'],
  ['SimulationPresentationSummary.botCapOverflowRewards', 'integer-decimal', 'statistic'],
  ['SimulationPresentationSummary.strangeMatter', 'integer-decimal', 'statistic'],
  ['SimulationPresentationSummary.realityWorkers', 'integer-decimal', 'statistic'],
  ['SimulationPresentationSummary.*Influence', 'integer-decimal', 'statistic'],
  ['SimulationWorkMetrics.schedulerPasses', 'exact-bigint', 'statistic'],
  ['SimulationWorkMetrics.continuousSegments', 'exact-bigint', 'statistic'],
  ['SimulationWorkMetrics.materialEvents', 'exact-bigint', 'statistic'],
  ['SimulationWorkMetrics.automationEvents', 'exact-bigint', 'statistic'],
] as const satisfies readonly (
  readonly [string, NumericSemanticClass, NumericFieldRole]
)[]

export const currentUnboundedRuntimeNumericCarrierClassifications =
  Object.freeze(
    currentUnboundedRuntimeCarrierInventory.map(
      ([path, semanticClass, role]) =>
        Object.freeze({
          boundary: 'current-non-persisted-runtime-carriers',
          path,
          intendedV2Path: null,
          semanticClass,
          invariants: invariantsForClass(semanticClass, role),
          role,
          persistenceEncoding: 'not-persisted',
          parser: 'projectFromValidatedCanonicalOrGeneratedInput',
          boundedConversions: conversionsForClass(semanticClass),
          lifecycle:
            'ephemeral quote, preview, derived result, or scheduler carrier; never owns authoritative persistence',
          owner:
            'named backend transaction, simulation, snapshot, or scheduler producer',
          stage0Coverage: 'inventory-only',
          consumerPolicy:
            'V2 port must retain this class end to end; presentation may narrow only a separately bounded fraction, duration, index, or geometry value.',
        }) satisfies NumericFieldClassification,
    ),
  )

export const deferredNumericCoverage = Object.freeze(
  [] as const satisfies readonly DeferredNumericCoverage[],
)

export function validateNumericFieldClassifications(
  entries: readonly NumericFieldClassification[],
): readonly string[] {
  const errors: string[] = []
  const byIdentity = new Map<string, NumericFieldClassification>()
  for (const entry of entries) {
    const identity = `${entry.boundary}\u0000${entry.path}`
    const previous = byIdentity.get(identity)
    if (previous !== undefined) {
      if (
        previous.semanticClass !== entry.semanticClass ||
        previous.persistenceEncoding !== entry.persistenceEncoding
      ) {
        errors.push(
          `Incompatible numeric classifications for ${entry.boundary}:${entry.path}.`,
        )
      } else {
        errors.push(
          `Duplicate numeric classification for ${entry.boundary}:${entry.path}.`,
        )
      }
      continue
    }
    byIdentity.set(identity, entry)
    if (entry.invariants.length === 0) {
      errors.push(
        `Numeric classification has no invariants: ${entry.boundary}:${entry.path}.`,
      )
    }
    if (entry.owner.trim().length === 0) {
      errors.push(
        `Numeric classification has no owner: ${entry.boundary}:${entry.path}.`,
      )
    }
    if (entry.closedKeySet !== undefined) {
      const keys = entry.closedKeySet.keys
      if (keys.length === 0 || new Set(keys).size !== keys.length) {
        errors.push(
          `Numeric classification has an invalid closed key set: ${entry.boundary}:${entry.path}.`,
        )
      }
      if (entry.memberPolicies !== undefined) {
        const policyKeys = entry.memberPolicies.map((policy) => policy.key)
        if (
          new Set(policyKeys).size !== policyKeys.length ||
          [...keys].sort().join('\u0000') !==
            [...policyKeys].sort().join('\u0000')
        ) {
          errors.push(
            `Numeric member policies do not cover the closed key set: ${entry.boundary}:${entry.path}.`,
          )
        }
      }
    }
    if (
      entry.boundary === 'CanonicalGameStateV1-to-V2' &&
      (entry.path.startsWith('$.skills.byId.*.') ||
        entry.path.startsWith('$.research.') ||
        entry.path === '$.dream.timers.*') &&
      entry.closedKeySet === undefined
    ) {
      errors.push(
        `Open canonical numeric family lacks a closed key set: ${entry.path}.`,
      )
    }
  }
  return Object.freeze(errors)
}

const entries = Object.freeze([
  ...canonicalNumericFieldClassifications,
  ...plannedV2OnlyNumericClassifications,
  ...durableRuntimeNumericClassifications,
  ...frontendResourceNumericClassifications,
  ...generatedDataNumericClassifications,
  ...skillTreePresentationNumericClassifications,
  ...transactionAndDtoNumericClassifications,
  ...v2TransactionDtoNumericClassifications,
  ...currentUnboundedRuntimeNumericCarrierClassifications,
])
const validationErrors = validateNumericFieldClassifications(entries)
if (validationErrors.length > 0) {
  throw new Error(validationErrors.join(' '))
}

export const numericFieldManifest = Object.freeze({
  formatVersion: 1,
  intendedCanonicalModelVersion: 2,
  intendedSaveSchema: 13,
  entries,
  deferredCoverage: deferredNumericCoverage,
  validationErrors,
})
