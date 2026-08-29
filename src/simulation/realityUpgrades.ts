import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import { getGameAssetsByKind } from '../game-data/catalog'
import { readUnityBoolean } from '../game-data/runtimeValueGuards'
import {
  DREAM_UPGRADE_FLAGS,
  type CanonicalGameStateV1,
  type DreamUpgradeFlag,
} from '../game-state/types'
import {
  addDiscrete,
  exactRoundedNonNegativeBigInt,
  isDiscreteResource,
} from './numeric'
import { tryDebitContinuous } from './transactions'

const SIMULATION_UPGRADE_KIND =
  'IdleDysonSwarm.Data.Balance.SimulationUpgradeDefinition'
const REALITY_UPGRADE_LAYER = 1
const INT_MAXIMUM = 2_147_483_647n

export const REALITY_UPGRADE_IDS = [
  'translation1',
  'translation2',
  'translation3',
  'translation4',
  'translation5',
  'translation6',
  'translation7',
  'translation8',
  'speed1',
  'speed2',
  'speed3',
  'speed4',
  'speed5',
  'speed6',
  'speed7',
  'speed8',
  'doubleTimeOwned',
  'workerAutoConvert',
] as const

export type RealityUpgradeId = (typeof REALITY_UPGRADE_IDS)[number]

export type CanonicalUpgradeOwnershipKey =
  | DreamUpgradeFlag
  | 'doubleTimeOwned'
  | 'workerAutoConvert'

export interface RealityUpgradePrerequisite {
  readonly key: CanonicalUpgradeOwnershipKey
  readonly mustBeOwned: boolean
}

export interface RealityUpgradeEffect {
  readonly effectType: number
  readonly targetKey: string | null
  readonly boolValue: boolean
  readonly numericValue: number
}

export interface RealityUpgradeDefinition {
  readonly key: RealityUpgradeId
  readonly cost: number
  readonly prerequisites: readonly RealityUpgradePrerequisite[]
  readonly purchaseEffects: readonly RealityUpgradeEffect[]
}

export type RealityUpgradePurchaseCode =
  | 'purchased'
  | 'unknown_upgrade'
  | 'missing_definition'
  | 'invalid_definition'
  | 'invalid_state'
  | 'already_owned'
  | 'prerequisites_not_met'
  | 'insufficient_strange_matter'

export interface RealityUpgradePurchaseResult {
  readonly accepted: boolean
  readonly changed: boolean
  readonly code: RealityUpgradePurchaseCode
  readonly candidate: CanonicalGameStateV1
  readonly definitionGap: string | null
}

const REALITY_UPGRADE_ID_SET = new Set<string>(REALITY_UPGRADE_IDS)
const DREAM_UPGRADE_FLAG_SET = new Set<string>(DREAM_UPGRADE_FLAGS)

const loadedRealityUpgradeDefinitions =
  loadRealityUpgradeDefinitions()

export const REALITY_UPGRADE_DEFINITIONS: ReadonlyMap<
  RealityUpgradeId,
  RealityUpgradeDefinition
> = loadedRealityUpgradeDefinitions.definitions

/**
 * Purchases one Reality-layer upgrade using only its exported authored
 * definition. Unsupported or malformed definitions fail without mutation.
 */
export function purchaseRealityUpgrade(
  state: CanonicalGameStateV1,
  key: string,
  definitions = REALITY_UPGRADE_DEFINITIONS,
): RealityUpgradePurchaseResult {
  if (!isRealityUpgradeId(key)) {
    return rejectedPurchase(state, 'unknown_upgrade')
  }

  const definition = definitions.get(key)
  if (definition === undefined) {
    return rejectedPurchase(state, 'missing_definition')
  }

  const definitionGap = findDefinitionGap(key, definition)
  if (definitionGap !== null) {
    return {
      ...rejectedPurchase(state, 'invalid_definition'),
      definitionGap,
    }
  }

  if (!hasValidPurchaseState(state, definition)) {
    return rejectedPurchase(state, 'invalid_state')
  }

  const alreadyOwned = getUpgradeOwnership(state, key)
  if (alreadyOwned === null) {
    return rejectedPurchase(state, 'invalid_state')
  }
  if (alreadyOwned) {
    return rejectedPurchase(state, 'already_owned')
  }

  for (const prerequisite of definition.prerequisites) {
    const owned = getUpgradeOwnership(state, prerequisite.key)
    if (owned === null) {
      return rejectedPurchase(state, 'invalid_state')
    }
    if (owned !== prerequisite.mustBeOwned) {
      return rejectedPurchase(state, 'prerequisites_not_met')
    }
  }

  const debit = tryDebitContinuous(
    state.dream.strangeMatter,
    definition.cost,
  )
  if (debit.status === 'insufficient-funds') {
    return rejectedPurchase(
      state,
      'insufficient_strange_matter',
    )
  }
  if (debit.status !== 'success') {
    return rejectedPurchase(state, 'invalid_state')
  }

  let candidate = state
  for (const effect of definition.purchaseEffects) {
    candidate = applyRealityUpgradeEffect(candidate, effect)
  }

  candidate = {
    ...candidate,
    dream: {
      ...candidate.dream,
      strangeMatter: debit.balance,
    },
  }

  return {
    accepted: true,
    changed: true,
    code: 'purchased',
    candidate,
    definitionGap: null,
  }
}

/**
 * Reports incomplete exported coverage and effects that cannot be mapped to
 * the canonical headless state.
 */
export function findRealityUpgradeCanonicalGaps(
  definitions = REALITY_UPGRADE_DEFINITIONS,
): readonly string[] {
  const gaps =
    definitions === REALITY_UPGRADE_DEFINITIONS
      ? [...loadedRealityUpgradeDefinitions.gaps]
      : []

  for (const key of REALITY_UPGRADE_IDS) {
    if (!definitions.has(key)) {
      gaps.push(`missing_definition:${key}`)
    }
  }

  for (const [key, definition] of definitions) {
    if (!isRealityUpgradeId(key)) {
      gaps.push(`unexpected_definition:${key}`)
      continue
    }
    const gap = findDefinitionGap(key, definition)
    if (gap !== null) gaps.push(gap)
  }

  return [...new Set(gaps)]
}

function loadRealityUpgradeDefinitions(): {
  readonly definitions: ReadonlyMap<
    RealityUpgradeId,
    RealityUpgradeDefinition
  >
  readonly gaps: readonly string[]
} {
  const definitions = new Map<
    RealityUpgradeId,
    RealityUpgradeDefinition
  >()
  const gaps: string[] = []
  const seenKeys = new Set<RealityUpgradeId>()
  const rejectedKeys = new Set<RealityUpgradeId>()

  for (const asset of getGameAssetsByKind(SIMULATION_UPGRADE_KIND)) {
    if (asset.data.layer !== REALITY_UPGRADE_LAYER) continue

    const key = asset.data.key
    if (typeof key !== 'string' || !isRealityUpgradeId(key)) {
      gaps.push(`unsupported_asset:${asset.id}`)
      continue
    }
    if (seenKeys.has(key)) {
      gaps.push(`duplicate_definition:${key}`)
      rejectedKeys.add(key)
      definitions.delete(key)
      continue
    }
    seenKeys.add(key)

    const cost = parseCost(asset.data.cost)
    const prerequisites = parsePrerequisites(
      asset.data.prerequisites,
    )
    const purchaseEffects = parsePurchaseEffects(
      asset.data.purchaseEffects,
    )
    if (
      cost === null ||
      prerequisites === null ||
      purchaseEffects === null
    ) {
      gaps.push(`malformed_definition:${key}`)
      rejectedKeys.add(key)
      continue
    }

    if (!rejectedKeys.has(key)) {
      definitions.set(key, {
        key,
        cost,
        prerequisites,
        purchaseEffects,
      })
    }
  }

  return { definitions, gaps }
}

function parseCost(value: unknown): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > Number(INT_MAXIMUM)
  ) {
    return null
  }
  return value
}

function parsePrerequisites(
  value: unknown,
): readonly RealityUpgradePrerequisite[] | null {
  if (!Array.isArray(value)) return null

  const prerequisites: RealityUpgradePrerequisite[] = []
  for (const entry of value) {
    if (
      entry === null ||
      Array.isArray(entry) ||
      typeof entry !== 'object' ||
      !('key' in entry) ||
      typeof entry.key !== 'string' ||
      !isCanonicalOwnershipKey(entry.key) ||
      !('mustBeOwned' in entry)
    ) {
      return null
    }
    const mustBeOwned = parseBoolean(entry.mustBeOwned)
    if (mustBeOwned === null) return null
    prerequisites.push({
      key: entry.key,
      mustBeOwned,
    })
  }
  return prerequisites
}

function parsePurchaseEffects(
  value: unknown,
): readonly RealityUpgradeEffect[] | null {
  if (!Array.isArray(value)) return null

  const purchaseEffects: RealityUpgradeEffect[] = []
  for (const entry of value) {
    if (
      entry === null ||
      Array.isArray(entry) ||
      typeof entry !== 'object' ||
      !('effectType' in entry) ||
      typeof entry.effectType !== 'number' ||
      !Number.isInteger(entry.effectType) ||
      !('targetKey' in entry) ||
      (entry.targetKey !== null &&
        typeof entry.targetKey !== 'string') ||
      !('boolValue' in entry) ||
      !('numericValue' in entry) ||
      typeof entry.numericValue !== 'number'
    ) {
      return null
    }
    const boolValue = parseBoolean(entry.boolValue)
    if (boolValue === null) return null
    purchaseEffects.push({
      effectType: entry.effectType,
      targetKey: entry.targetKey,
      boolValue,
      numericValue: entry.numericValue,
    })
  }
  return purchaseEffects
}

function parseBoolean(value: unknown): boolean | null {
  return readUnityBoolean(value) ?? null
}

function findDefinitionGap(
  mapKey: RealityUpgradeId,
  definition: RealityUpgradeDefinition,
): string | null {
  if (definition.key !== mapKey) {
    return `definition_key_mismatch:${mapKey}:${definition.key}`
  }
  if (
    typeof definition.cost !== 'number' ||
    !Number.isInteger(definition.cost) ||
    definition.cost <= 0 ||
    definition.cost > Number(INT_MAXIMUM)
  ) {
    return `invalid_cost:${mapKey}`
  }
  if (!Array.isArray(definition.prerequisites)) {
    return `invalid_prerequisites:${mapKey}`
  }
  for (let index = 0; index < definition.prerequisites.length; index++) {
    const prerequisite = definition.prerequisites[index]
    if (
      prerequisite === null ||
      typeof prerequisite !== 'object' ||
      !isCanonicalOwnershipKey(prerequisite.key) ||
      typeof prerequisite.mustBeOwned !== 'boolean'
    ) {
      return `invalid_prerequisite:${mapKey}:${index}`
    }
  }
  if (
    !Array.isArray(definition.purchaseEffects) ||
    definition.purchaseEffects.length === 0
  ) {
    return `missing_effects:${mapKey}`
  }
  for (let index = 0; index < definition.purchaseEffects.length; index++) {
    if (
      !canApplyRealityUpgradeEffect(
        definition.purchaseEffects[index],
      )
    ) {
      return `unsupported_effect:${mapKey}:${index}`
    }
  }
  return null
}

function canApplyRealityUpgradeEffect(
  effect: RealityUpgradeEffect,
): boolean {
  if (
    effect === null ||
    typeof effect !== 'object' ||
    !Number.isInteger(effect.effectType) ||
    typeof effect.boolValue !== 'boolean' ||
    !Number.isFinite(effect.numericValue) ||
    (effect.targetKey !== null &&
      typeof effect.targetKey !== 'string')
  ) {
    return false
  }

  if (effect.effectType === 0 || effect.effectType === 1) {
    return (
      effect.targetKey !== null &&
      isCanonicalOwnershipKey(effect.targetKey)
    )
  }
  if (effect.effectType === 2) {
    return exactRoundedNonNegativeBigInt(effect.numericValue) !== null
  }
  if (effect.effectType === 8) {
    return (
      effect.targetKey === 'doubleTime' &&
      effect.numericValue >= 0
    )
  }
  return false
}

function applyRealityUpgradeEffect(
  state: CanonicalGameStateV1,
  effect: RealityUpgradeEffect,
): CanonicalGameStateV1 {
  if (effect.effectType === 0 || effect.effectType === 1) {
    return setUpgradeOwnership(
      state,
      effect.targetKey as CanonicalUpgradeOwnershipKey,
      effect.boolValue,
    )
  }
  if (effect.effectType === 2) {
    return {
      ...state,
      skills: {
        ...state.skills,
        points: addDiscrete(
          state.skills.points,
          exactRoundedNonNegativeBigInt(effect.numericValue)!,
        ),
      },
    }
  }
  // Effect type 8 is the authored grant for the retired consumable Double
  // Time bank. Keep accepting it so the Unity catalog remains compatible,
  // but ownership now supplies a permanent whole-game speed multiplier and
  // the legacy grant must not recreate mutable runtime state.
  return state
}

function getUpgradeOwnership(
  state: CanonicalGameStateV1,
  key: CanonicalUpgradeOwnershipKey,
): boolean | null {
  if (key === 'doubleTimeOwned') {
    return typeof state.timeline.doubleTime.unlocked === 'boolean'
      ? state.timeline.doubleTime.unlocked
      : null
  }
  if (key === 'workerAutoConvert') {
    return typeof state.reality.autoGather === 'boolean'
      ? state.reality.autoGather
      : null
  }
  const owned = state.dream.upgrades[key]
  return typeof owned === 'boolean' ? owned : null
}

function setUpgradeOwnership(
  state: CanonicalGameStateV1,
  key: CanonicalUpgradeOwnershipKey,
  value: boolean,
): CanonicalGameStateV1 {
  if (key === 'doubleTimeOwned') {
    return {
      ...state,
      timeline: {
        ...state.timeline,
        doubleTime: {
          ...state.timeline.doubleTime,
          unlocked: value,
          enabled: false,
          bankSeconds: 0,
          rate: 0,
        },
      },
    }
  }
  if (key === 'workerAutoConvert') {
    return {
      ...state,
      reality: {
        ...state.reality,
        autoGather: value,
      },
    }
  }
  return {
    ...state,
    dream: {
      ...state.dream,
      upgrades: {
        ...state.dream.upgrades,
        [key]: value,
      },
    },
  }
}

function hasValidPurchaseState(
  state: CanonicalGameStateV1,
  definition: RealityUpgradeDefinition,
): boolean {
  return (
    isFiniteNonNegativeNumber(state.dream.strangeMatter) &&
    (!definition.purchaseEffects.some(
      (effect) => effect.effectType === 2,
    ) ||
      isDiscreteResource(state.skills.points))
  )
}

function isRealityUpgradeId(
  value: string,
): value is RealityUpgradeId {
  return REALITY_UPGRADE_ID_SET.has(value)
}

function isCanonicalOwnershipKey(
  value: string,
): value is CanonicalUpgradeOwnershipKey {
  return (
    DREAM_UPGRADE_FLAG_SET.has(value) ||
    value === 'doubleTimeOwned' ||
    value === 'workerAutoConvert'
  )
}

function rejectedPurchase(
  state: CanonicalGameStateV1,
  code: Exclude<RealityUpgradePurchaseCode, 'purchased'>,
): RealityUpgradePurchaseResult {
  return {
    accepted: false,
    changed: false,
    code,
    candidate: state,
    definitionGap: null,
  }
}
