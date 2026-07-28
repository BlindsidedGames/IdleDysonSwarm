import { getGameAssetsByKind } from '../game-data/catalog'
import type { ExportedGameAsset } from '../game-data/types'
import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import type {
  CanonicalFacilityId,
  CanonicalGameStateV1,
} from '../game-state/types'
import { floorToDiscrete } from './numeric'
import {
  buyModeAmount,
  buyXCost,
  maxAffordable,
  tryDebitContinuous,
} from './transactions'

const RESEARCH_KIND = 'GameData.ResearchDefinition'

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
):
  | {
      readonly science: number
      readonly level: number
      readonly quantity: bigint
      readonly cost: number
    }
  | undefined {
  if (!isAutomationEnabled(definition, state)) return undefined
  if (!prerequisitesMet(definition, state, levelsById)) return undefined
  if (!Number.isFinite(science) || science < 0) return undefined

  const currentLevel = levelsById[definition.id] ?? 0
  if (
    !Number.isFinite(currentLevel) ||
    currentLevel < 0 ||
    (definition.maxLevel >= 0 && currentLevel >= definition.maxLevel)
  ) {
    return undefined
  }

  let costBase = definition.baseCost
  const coefficientField = COEFFICIENT_BY_RESEARCH_ID[definition.id]
  const repeatableOwned =
    state.skills.byId.repeatableResearch?.owned === true
  if (repeatableOwned && coefficientField !== undefined) {
    const percentPerLevel = tuning[coefficientField]
    if (!Number.isFinite(percentPerLevel) || percentPerLevel < 0) {
      return undefined
    }
    if (percentPerLevel > 0) {
      costBase /= 1 + currentLevel * percentPerLevel
    }
  }
  if (!Number.isFinite(costBase) || costBase <= 0) return undefined

  let affordable = maxAffordable(
    science,
    costBase,
    definition.exponent,
    currentLevel,
  )
  if (definition.maxLevel >= 0) {
    const remaining = floorToDiscrete(
      definition.maxLevel - currentLevel,
    )
    if (affordable > remaining) affordable = remaining
  }
  if (affordable <= 0n) return undefined

  let selected = buyModeAmount(
    state.research.automation.buyMode,
    state.research.automation.roundedBulkBuy,
    floorToDiscrete(currentLevel),
    affordable,
  )
  if (definition.maxLevel >= 0) {
    const remaining = floorToDiscrete(
      definition.maxLevel - currentLevel,
    )
    if (selected > remaining) selected = remaining
  }
  if (selected <= 0n || selected > BigInt(Number.MAX_SAFE_INTEGER)) {
    return undefined
  }

  const cost = buyXCost(
    selected,
    costBase,
    definition.exponent,
    currentLevel,
  )
  const debit = tryDebitContinuous(science, cost, selected)
  if (debit.status !== 'success') return undefined

  const nextLevel = currentLevel + Number(selected)
  if (!Number.isFinite(nextLevel) || nextLevel <= currentLevel) {
    return undefined
  }
  return {
    science: debit.balance,
    level: nextLevel,
    quantity: selected,
    cost: debit.charged,
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

function parseDefinition(asset: ExportedGameAsset): ResearchDefinition {
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
  asset: ExportedGameAsset,
  field: string,
): number {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value
  throw invalidDefinition(asset, field)
}

function requirePositiveNumber(
  value: unknown,
  asset: ExportedGameAsset,
  field: string,
): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value
  }
  throw invalidDefinition(asset, field)
}

function requireFacilityId(
  value: unknown,
  asset: ExportedGameAsset,
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
  asset: ExportedGameAsset,
  field?: string,
): Error {
  return new Error(
    `Research definition '${asset.id}' has invalid exported data${
      field === undefined ? '' : ` for '${field}'`
    }.`,
  )
}
