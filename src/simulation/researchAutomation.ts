import { getGameAssetsByKind } from '../game-data/catalog'
import type { RuntimeGameAsset } from '../game-data/types'
import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import type {
  CanonicalFacilityId,
  CanonicalGameStateV1,
} from '../game-state/types'
import { CONTINUOUS_MAXIMUM, floorToDiscrete } from './numeric'
import type { SimulationAutomationPolicy } from './types'
import {
  buyModeAmount,
  buyXCost,
  maxAffordable,
  tryDebitContinuous,
} from './transactions'

const RESEARCH_KIND = 'GameData.ResearchDefinition'

export const UNITY_RESEARCH_PRESENTATION_ORDER = Object.freeze([
  'research.assembly_line_upgrade',
  'research.ai_manager_upgrade',
  'research.server_upgrade',
  'research.data_center_upgrade',
  'research.planet_upgrade',
  'research.matrioshka_brains_upgrade',
  'research.birch_planets_upgrade',
  'research.galactic_brains_upgrade',
  'research.panel_lifetime_1',
  'research.science_boost',
  'research.money_multiplier',
  'research.panel_lifetime_2',
  'research.panel_lifetime_3',
  'research.panel_lifetime_4',
] as const)

const AUTOMATION_IDS_BY_GROUP: Readonly<Record<number, string | undefined>> = {
  2: 'research.science_boost',
  3: 'research.money_multiplier',
  4: 'research.assembly_line_upgrade',
  5: 'research.ai_manager_upgrade',
  6: 'research.server_upgrade',
  7: 'research.data_center_upgrade',
  8: 'research.planet_upgrade',
  9: 'research.matrioshka_brains_upgrade',
  10: 'research.birch_planets_upgrade',
  11: 'research.galactic_brains_upgrade',
}

const COEFFICIENT_BY_RESEARCH_ID: Readonly<
  Record<string, keyof DysonCompatibilityTuning | undefined>
> = {
  'research.money_multiplier': 'moneyMultiUpgradePercent',
  'research.science_boost': 'scienceBoostPercent',
  'research.assembly_line_upgrade': 'assemblyLineUpgradePercent',
  'research.ai_manager_upgrade': 'aiManagerUpgradePercent',
  'research.server_upgrade': 'serverUpgradePercent',
  'research.data_center_upgrade': 'dataCenterUpgradePercent',
  'research.planet_upgrade': 'planetUpgradePercent',
  'research.matrioshka_brains_upgrade': 'matrioshkaUpgradePercent',
  'research.birch_planets_upgrade': 'birchUpgradePercent',
  'research.galactic_brains_upgrade': 'galacticUpgradePercent',
}

const PANEL_LIFETIME_SECONDS_BY_RESEARCH_ID: Readonly<
  Record<string, number | undefined>
> = {
  'research.panel_lifetime_1': 1,
  'research.panel_lifetime_2': 2,
  'research.panel_lifetime_3': 3,
  'research.panel_lifetime_4': 4,
}

interface ResearchDefinition {
  readonly id: string
  readonly autoBuyGroup: number
  readonly baseCost: number
  readonly exponent: number
  readonly maxLevel: number
  readonly prerequisiteResearchIds: readonly string[]
  readonly prerequisiteFacilityId?: CanonicalFacilityId
  readonly prerequisiteFacilityOwned: number
}

export interface ResearchAutomationPurchase {
  readonly researchId: string
  readonly quantity: bigint
  readonly cost: number
}

export interface ResearchAutomationTickResult {
  readonly state: CanonicalGameStateV1
  readonly visitedResearchIds: readonly string[]
  readonly purchases: readonly ResearchAutomationPurchase[]
}

export type CanonicalResearchPurchaseResult =
  | {
      readonly accepted: true
      readonly changed: boolean
      readonly state: CanonicalGameStateV1
      readonly purchase?: ResearchAutomationPurchase
    }
  | {
      readonly accepted: false
      readonly code: string
      readonly reason: string
      readonly state: CanonicalGameStateV1
    }

export type CanonicalResearchPurchasePreviewCode =
  | 'purchasable'
  | 'unknown-research'
  | 'definition-gap'
  | 'already-maxed'
  | 'prerequisites-not-met'
  | 'automation-disabled'
  | 'invalid-state'
  | 'invalid-tuning'
  | 'invalid-cost'
  | 'invalid-quantity'
  | 'insufficient-science'
  | 'output-maxed'

export interface CanonicalResearchPurchasePreview {
  readonly researchId: string
  readonly eligible: boolean
  readonly code: CanonicalResearchPurchasePreviewCode
  readonly currentLevel: number
  readonly maximumLevel: number | null
  readonly selectedQuantity: bigint
  readonly affordableQuantity: bigint
  readonly cost: number
  readonly issue: string | null
}

export interface CanonicalResearchPresentationFacts {
  readonly prerequisitesMet: boolean
  readonly visible: boolean
  readonly maxed: boolean
  readonly automationActive: boolean
  readonly effectKind: 'percentage' | 'panel-lifetime-seconds'
  readonly perLevelEffect: number
  readonly currentEffect: number
  readonly projectedEffect: number
  readonly passiveProgress: number
}

interface InternalResearchPurchasePreview
  extends CanonicalResearchPurchasePreview {
  readonly nextScience: number
  readonly nextLevel: number
}

/**
 * Quotes one manual research purchase without changing state. Definition
 * parsing, repeatable-skill tuning, buy mode, caps, prerequisites, and debit
 * validation are shared with both manual and automation execution.
 */
export function previewCanonicalResearchPurchase(
  state: Readonly<CanonicalGameStateV1>,
  tuning: Readonly<DysonCompatibilityTuning>,
  researchId: string,
): CanonicalResearchPurchasePreview {
  let definitions: readonly ResearchDefinition[]
  try {
    definitions = loadDefinitions()
  } catch (error) {
    return publicPreview(
      emptyPreview(
        researchId,
        'definition-gap',
        error instanceof Error ? error.message : String(error),
      ),
    )
  }
  const definition = definitions.find(
    (candidate) => candidate.id === researchId,
  )
  if (definition === undefined) {
    return publicPreview(emptyPreview(researchId, 'unknown-research'))
  }
  return publicPreview(
    previewPurchase(
      definition,
      state,
      tuning,
      state.dyson.science,
      state.research.levelsById,
      false,
    ),
  )
}

/**
 * Projects Unity-authored ResearchPresenter display facts without duplicating
 * purchase eligibility or cost calculations in the frontend. The projected
 * quantity must come from the canonical purchase preview for the same card.
 */
export function selectCanonicalResearchPresentationFacts(
  state: Readonly<CanonicalGameStateV1>,
  tuning: Readonly<DysonCompatibilityTuning>,
  researchId: string,
  projectedQuantity: bigint,
): CanonicalResearchPresentationFacts | undefined {
  let definition: ResearchDefinition | undefined
  try {
    definition = loadDefinitions().find(
      (candidate) => candidate.id === researchId,
    )
  } catch {
    return undefined
  }
  if (definition === undefined) return undefined

  const currentLevel = state.research.levelsById[researchId] ?? 0
  const meetsPrerequisites = prerequisitesMet(
    definition,
    state,
    state.research.levelsById,
  )
  const maxed =
    definition.maxLevel >= 0 &&
    currentLevel >= definition.maxLevel
  const coefficientField = COEFFICIENT_BY_RESEARCH_ID[researchId]
  const lifetimeSeconds =
    PANEL_LIFETIME_SECONDS_BY_RESEARCH_ID[researchId]
  const effectKind =
    lifetimeSeconds === undefined
      ? 'percentage'
      : 'panel-lifetime-seconds'
  const perLevelEffect =
    lifetimeSeconds ??
    (coefficientField === undefined
      ? 0
      : tuning[coefficientField] * 100)
  const projectedLevel =
    currentLevel + Number(projectedQuantity)

  return Object.freeze({
    prerequisitesMet: meetsPrerequisites,
    visible:
      (meetsPrerequisites || currentLevel > 0) &&
      !maxed,
    maxed,
    automationActive:
      state.infinity.automationUnlocked.research &&
      isAutomationEnabled(definition, state),
    effectKind,
    perLevelEffect,
    currentEffect: currentLevel * perLevelEffect,
    projectedEffect: projectedLevel * perLevelEffect,
    passiveProgress:
      state.research.progressById[researchId] ?? 0,
  })
}

/**
 * Purchases one authored research definition through the same cost,
 * prerequisite, cap, buy-mode, and numeric transaction path used by
 * automation, without requiring the automation unlock or per-item toggle.
 */
export function purchaseCanonicalResearch(
  state: CanonicalGameStateV1,
  tuning: Readonly<DysonCompatibilityTuning>,
  researchId: string,
): CanonicalResearchPurchaseResult {
  let definition: ResearchDefinition | undefined
  try {
    definition = loadDefinitions().find(
      (candidate) => candidate.id === researchId,
    )
  } catch (error) {
    return {
      accepted: false,
      code: 'RESEARCH-DEFINITION-GAP',
      reason:
        error instanceof Error ? error.message : String(error),
      state,
    }
  }
  if (definition === undefined) {
    return {
      accepted: false,
      code: 'RESEARCH-UNKNOWN',
      reason: `Unknown research '${researchId}'.`,
      state,
    }
  }
  const preview = previewPurchase(
    definition,
    state,
    tuning,
    state.dyson.science,
    state.research.levelsById,
    false,
  )
  if (preview.code === 'already-maxed') {
    return {
      accepted: true,
      changed: false,
      state,
    }
  }
  if (!preview.eligible) {
    return {
      accepted: false,
      code: researchFailureCode(preview.code),
      reason:
        preview.issue ??
        `Research '${researchId}' is not purchasable (${preview.code}).`,
      state,
    }
  }
  const detail = Object.freeze({
    researchId,
    quantity: preview.selectedQuantity,
    cost: preview.cost,
  })
  return {
    accepted: true,
    changed: true,
    state: {
      ...state,
      dyson: {
        ...state.dyson,
        science: preview.nextScience,
      },
      research: {
        ...state.research,
        levelsById: {
          ...state.research.levelsById,
          [researchId]: preview.nextLevel,
        },
      },
    },
    purchase: detail,
  }
}

/**
 * Runs one Unity-parity research automation pass without mutating its inputs.
 *
 * Definitions are visited once in ordinal ID order, rotated by the durable
 * target index. Successful purchases immediately affect the shared science
 * balance and research levels seen by later definitions in the same pass.
 */
export function runResearchAutomationTick(
  state: Readonly<CanonicalGameStateV1>,
  tuning: Readonly<DysonCompatibilityTuning>,
  policy: SimulationAutomationPolicy = 'preserve-configured-mode',
): ResearchAutomationTickResult {
  if (!state.infinity.automationUnlocked.research) {
    return {
      state,
      visitedResearchIds: Object.freeze([]),
      purchases: Object.freeze([]),
    }
  }

  const definitions = loadDefinitions()
  if (definitions.length === 0) {
    return {
      state,
      visitedResearchIds: Object.freeze([]),
      purchases: Object.freeze([]),
    }
  }

  const rawIndex = state.timeline.researchAutomationTargetIndex
  if (!Number.isSafeInteger(rawIndex)) {
    throw new Error(
      'Research automation target index must be a safe integer.',
    )
  }
  const first = ((rawIndex % definitions.length) + definitions.length) %
    definitions.length
  const ordered = definitions.map(
    (_, offset) => definitions[(first + offset) % definitions.length],
  )
  const visitedResearchIds = ordered.map((definition) => definition.id)
  const levelsById = { ...state.research.levelsById }
  const purchases: ResearchAutomationPurchase[] = []
  let science = state.dyson.science

  for (const definition of ordered) {
    const purchase = tryPurchase(
      definition,
      state,
      tuning,
      science,
      levelsById,
      true,
      policy,
    )
    if (purchase === undefined) continue

    science = purchase.science
    levelsById[definition.id] = purchase.level
    purchases.push(
      Object.freeze({
        researchId: definition.id,
        quantity: purchase.quantity,
        cost: purchase.cost,
      }),
    )
  }

  const nextIndex = (first + 1) % definitions.length
  return {
    state: {
      ...state,
      dyson: {
        ...state.dyson,
        science,
      },
      research: {
        ...state.research,
        levelsById,
      },
      timeline: {
        ...state.timeline,
        researchAutomationTargetIndex: nextIndex,
      },
    },
    visitedResearchIds: Object.freeze(visitedResearchIds),
    purchases: Object.freeze(purchases),
  }
}

function tryPurchase(
  definition: ResearchDefinition,
  state: Readonly<CanonicalGameStateV1>,
  tuning: Readonly<DysonCompatibilityTuning>,
  science: number,
  levelsById: Readonly<Record<string, number>>,
  requireAutomationEnabled: boolean,
  policy: SimulationAutomationPolicy =
    'preserve-configured-mode',
):
  | {
      readonly science: number
      readonly level: number
      readonly quantity: bigint
      readonly cost: number
    }
  | undefined {
  const preview = previewPurchase(
    definition,
    state,
    tuning,
    science,
    levelsById,
    requireAutomationEnabled,
    policy,
  )
  if (!preview.eligible) return undefined
  return {
    science: preview.nextScience,
    level: preview.nextLevel,
    quantity: preview.selectedQuantity,
    cost: preview.cost,
  }
}

function previewPurchase(
  definition: ResearchDefinition,
  state: Readonly<CanonicalGameStateV1>,
  tuning: Readonly<DysonCompatibilityTuning>,
  science: number,
  levelsById: Readonly<Record<string, number>>,
  requireAutomationEnabled: boolean,
  policy: SimulationAutomationPolicy =
    'preserve-configured-mode',
): InternalResearchPurchasePreview {
  const currentLevel = levelsById[definition.id] ?? 0
  const maximumLevel =
    definition.maxLevel >= 0 ? definition.maxLevel : null
  const base = {
    researchId: definition.id,
    currentLevel,
    maximumLevel,
  }
  if (
    requireAutomationEnabled &&
    !isAutomationEnabled(definition, state)
  ) {
    return emptyPreview(
      definition.id,
      'automation-disabled',
      null,
      base,
    )
  }
  if (
    !Number.isFinite(science) ||
    science < 0 ||
    !Number.isFinite(currentLevel) ||
    currentLevel < 0
  ) {
    return emptyPreview(
      definition.id,
      'invalid-state',
      null,
      base,
    )
  }
  if (
    definition.maxLevel >= 0 &&
    currentLevel >= definition.maxLevel
  ) {
    return emptyPreview(
      definition.id,
      'already-maxed',
      null,
      base,
    )
  }

  let costBase = definition.baseCost
  const coefficientField = COEFFICIENT_BY_RESEARCH_ID[definition.id]
  const repeatableOwned =
    state.skills.byId.repeatableResearch?.owned === true
  if (repeatableOwned && coefficientField !== undefined) {
    const percentPerLevel = tuning[coefficientField]
    if (!Number.isFinite(percentPerLevel) || percentPerLevel < 0) {
      return emptyPreview(
        definition.id,
        'invalid-tuning',
        `Compatibility tuning '${coefficientField}' is invalid.`,
        base,
      )
    }
    if (percentPerLevel > 0) {
      costBase /= 1 + currentLevel * percentPerLevel
    }
  }
  if (!Number.isFinite(costBase) || costBase <= 0) {
    return emptyPreview(
      definition.id,
      'invalid-cost',
      null,
      base,
    )
  }

  let affordable = maxAffordable(
    science,
    costBase,
    definition.exponent,
    currentLevel,
  )
  let remaining: bigint | null = null
  if (definition.maxLevel >= 0) {
    remaining = floorToDiscrete(definition.maxLevel - currentLevel)
    if (affordable > remaining) affordable = remaining
  }
  let selected = buyModeAmount(
    policy === 'force-buy-max'
      ? 'buy-max'
      : state.research.automation.buyMode,
    state.research.automation.roundedBulkBuy,
    floorToDiscrete(currentLevel),
    affordable,
  )
  if (remaining !== null && selected > remaining) selected = remaining
  if (selected <= 0n || selected > BigInt(Number.MAX_SAFE_INTEGER)) {
    return {
      ...emptyPreview(
        definition.id,
        'invalid-quantity',
        null,
        base,
      ),
      affordableQuantity: affordable,
    }
  }

  const cost = buyXCost(
    selected,
    costBase,
    definition.exponent,
    currentLevel,
  )
  const facts = {
    researchId: definition.id,
    currentLevel,
    maximumLevel,
    selectedQuantity: selected,
    affordableQuantity: affordable,
    cost,
  }
  if (!prerequisitesMet(definition, state, levelsById)) {
    return ineligiblePreview(
      facts,
      'prerequisites-not-met',
      science,
      currentLevel,
    )
  }
  if (cost === CONTINUOUS_MAXIMUM) {
    return ineligiblePreview(
      facts,
      'output-maxed',
      science,
      currentLevel,
    )
  }
  if (affordable <= 0n) {
    return ineligiblePreview(
      facts,
      'insufficient-science',
      science,
      currentLevel,
    )
  }
  const debit = tryDebitContinuous(science, cost, selected)
  if (debit.status !== 'success') {
    const code: CanonicalResearchPurchasePreviewCode =
      debit.status === 'insufficient-funds'
        ? 'insufficient-science'
        : debit.status === 'output-maxed' ||
            debit.status === 'maxed'
          ? 'output-maxed'
          : debit.status === 'invalid-quantity'
            ? 'invalid-quantity'
            : debit.status === 'invalid-balance'
              ? 'invalid-state'
              : 'invalid-cost'
    return ineligiblePreview(
      facts,
      code,
      science,
      currentLevel,
    )
  }
  const nextLevel = currentLevel + Number(selected)
  if (!Number.isFinite(nextLevel) || nextLevel <= currentLevel) {
    return ineligiblePreview(
      facts,
      'output-maxed',
      science,
      currentLevel,
    )
  }
  return {
    ...facts,
    eligible: true,
    code: 'purchasable',
    issue: null,
    nextScience: debit.balance,
    nextLevel,
  }
}

function emptyPreview(
  researchId: string,
  code: Exclude<
    CanonicalResearchPurchasePreviewCode,
    'purchasable'
  >,
  issue: string | null = null,
  level: {
    readonly currentLevel: number
    readonly maximumLevel: number | null
  } = { currentLevel: 0, maximumLevel: null },
): InternalResearchPurchasePreview {
  return {
    researchId,
    eligible: false,
    code,
    currentLevel: level.currentLevel,
    maximumLevel: level.maximumLevel,
    selectedQuantity: 0n,
    affordableQuantity: 0n,
    cost: 0,
    issue,
    nextScience: 0,
    nextLevel: level.currentLevel,
  }
}

function ineligiblePreview(
  facts: Pick<
    InternalResearchPurchasePreview,
    | 'researchId'
    | 'currentLevel'
    | 'maximumLevel'
    | 'selectedQuantity'
    | 'affordableQuantity'
    | 'cost'
  >,
  code: Exclude<
    CanonicalResearchPurchasePreviewCode,
    'purchasable'
  >,
  nextScience: number,
  nextLevel: number,
): InternalResearchPurchasePreview {
  return {
    ...facts,
    eligible: false,
    code,
    issue: null,
    nextScience,
    nextLevel,
  }
}

function publicPreview(
  preview: InternalResearchPurchasePreview,
): CanonicalResearchPurchasePreview {
  return Object.freeze({
    researchId: preview.researchId,
    eligible: preview.eligible,
    code: preview.code,
    currentLevel: preview.currentLevel,
    maximumLevel: preview.maximumLevel,
    selectedQuantity: preview.selectedQuantity,
    affordableQuantity: preview.affordableQuantity,
    cost: preview.cost,
    issue: preview.issue,
  })
}

function researchFailureCode(
  code: CanonicalResearchPurchasePreviewCode,
): string {
  switch (code) {
    case 'unknown-research':
      return 'RESEARCH-UNKNOWN'
    case 'definition-gap':
      return 'RESEARCH-DEFINITION-GAP'
    case 'prerequisites-not-met':
      return 'RESEARCH-PREREQUISITE'
    case 'invalid-tuning':
      return 'RESEARCH-TUNING'
    default:
      return 'RESEARCH-UNAFFORDABLE'
  }
}

function isAutomationEnabled(
  definition: ResearchDefinition,
  state: Readonly<CanonicalGameStateV1>,
): boolean {
  if (definition.autoBuyGroup === 1) return true
  const automationId = AUTOMATION_IDS_BY_GROUP[definition.autoBuyGroup]
  return (
    automationId !== undefined &&
    state.research.automation.enabledById[automationId] === true
  )
}

function prerequisitesMet(
  definition: ResearchDefinition,
  state: Readonly<CanonicalGameStateV1>,
  levelsById: Readonly<Record<string, number>>,
): boolean {
  if (
    definition.prerequisiteResearchIds.some(
      (id) => (levelsById[id] ?? 0) <= 0,
    )
  ) {
    return false
  }
  const facilityId = definition.prerequisiteFacilityId
  if (facilityId === undefined) return true
  const owned = state.dyson.facilities[facilityId]
  return owned[0] + owned[1] >= definition.prerequisiteFacilityOwned
}

function loadDefinitions(): readonly ResearchDefinition[] {
  return getGameAssetsByKind(RESEARCH_KIND)
    .map(parseDefinition)
    .sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    )
}

function parseDefinition(asset: RuntimeGameAsset): ResearchDefinition {
  const data = asset.data
  const autoBuyGroup = requireInteger(data.autoBuyGroup, asset, 'autoBuyGroup')
  const baseCost = requirePositiveNumber(data.baseCost, asset, 'baseCost')
  const exponent = requirePositiveNumber(data.exponent, asset, 'exponent')
  const maxLevel = requireInteger(data.maxLevel, asset, 'maxLevel')
  if (exponent < 1 || maxLevel < -1) {
    throw invalidDefinition(asset)
  }

  const rawPrerequisites = data.prerequisiteResearchIds
  if (
    !Array.isArray(rawPrerequisites) ||
    rawPrerequisites.some((value) => typeof value !== 'string')
  ) {
    throw invalidDefinition(asset)
  }
  const rawFacilityId = data.prerequisiteFacilityId
  const prerequisiteFacilityId =
    rawFacilityId === undefined
      ? undefined
      : requireFacilityId(rawFacilityId, asset)
  const prerequisiteFacilityOwned =
    prerequisiteFacilityId === undefined
      ? 1
      : requirePositiveNumber(
          data.prerequisiteFacilityOwned ?? 1,
          asset,
          'prerequisiteFacilityOwned',
        )

  return {
    id: asset.id,
    autoBuyGroup,
    baseCost,
    exponent,
    maxLevel,
    prerequisiteResearchIds: rawPrerequisites as readonly string[],
    prerequisiteFacilityId,
    prerequisiteFacilityOwned,
  }
}

function requireInteger(
  value: unknown,
  asset: RuntimeGameAsset,
  field: string,
): number {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value
  throw invalidDefinition(asset, field)
}

function requirePositiveNumber(
  value: unknown,
  asset: RuntimeGameAsset,
  field: string,
): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value
  }
  throw invalidDefinition(asset, field)
}

function requireFacilityId(
  value: unknown,
  asset: RuntimeGameAsset,
): CanonicalFacilityId {
  if (
    value === 'assembly_lines' ||
    value === 'ai_managers' ||
    value === 'servers' ||
    value === 'data_centers' ||
    value === 'planets' ||
    value === 'matrioshka_brains' ||
    value === 'birch_planets' ||
    value === 'galactic_brains'
  ) {
    return value
  }
  throw invalidDefinition(asset, 'prerequisiteFacilityId')
}

function invalidDefinition(
  asset: RuntimeGameAsset,
  field?: string,
): Error {
  return new Error(
    `Research definition '${asset.id}' has invalid exported data${
      field === undefined ? '' : ` for '${field}'`
    }.`,
  )
}
