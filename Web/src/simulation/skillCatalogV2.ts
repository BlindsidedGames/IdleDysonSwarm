import {
  getGameAsset,
  getGameAssetsByKind,
} from '../game-data/catalog'
import type { RuntimeGameAsset } from '../game-data/types'
import {
  canonicalFragmentSkillKeySet,
  canonicalSkillStateKeySet,
} from '../game-state/numericFieldManifest'

const SKILL_DATABASE_KIND = 'GameData.SkillDatabase'
const SKILL_DATABASE_ID = 'SkillDatabase'
const SKILL_DEFINITION_KIND = 'GameData.SkillDefinition'
const EFFECT_DEFINITION_KIND = 'GameData.EffectDefinition'
const EXPECTED_SKILL_COUNT = 104
const EXPECTED_SKILL_EFFECT_REFERENCE_COUNT = 134

const SKILL_DATA_KEYS = Object.freeze([
  'cost',
  'effects',
  'exclusiveWithIds',
  'firstRunBlocked',
  'isFragment',
  'paragadeLine',
  'powerLine',
  'purityLine',
  'refundable',
  'requiredSkillIds',
  'shadowRequirementIds',
  'stellarLine',
  'terraLine',
  'unrefundableWithIds',
] as const)

const EFFECT_DATA_KEYS = Object.freeze([
  'conditionId',
  'id',
  'operation',
  'order',
  'perLevel',
  'targetFacilityIds',
  'targetFacilityTags',
  'targetStatId',
  'value',
] as const)

export type CanonicalSkillUnlockV2 =
  | 'always'
  | 'first-infinity'
  | 'fragments'
  | 'purity'
  | 'terra'
  | 'power'
  | 'paragade'
  | 'stellar'

export interface CanonicalSkillDefinitionV2 {
  readonly id: string
  readonly cost: bigint
  readonly refundable: boolean
  readonly fragment: boolean
  readonly unlock: CanonicalSkillUnlockV2
  readonly required: readonly string[]
  readonly shadowRequired: readonly string[]
  readonly exclusiveWith: readonly string[]
  readonly unrefundableWith: readonly string[]
  readonly effectIds: readonly string[]
}

export interface CanonicalSkillCatalogV2 {
  readonly skillIds: readonly string[]
  readonly fragmentSkillIds: readonly string[]
  readonly effectIds: readonly string[]
  readonly byId: Readonly<Record<string, CanonicalSkillDefinitionV2>>
}

export interface CanonicalSkillCatalogSourceV2 {
  readonly get: (kind: string, id: string) => RuntimeGameAsset | undefined
  readonly list: (kind: string) => readonly RuntimeGameAsset[]
}

/**
 * Skill-local timer ownership. The first three timers advance during active
 * production while their owning Skill is owned. idleElectricSheep is retained
 * only as a migrated owner-local timer; its current effect doubles stored-time
 * duration directly and does not advance the legacy timer.
 */
export const CANONICAL_SKILL_TIMER_OWNERS_V2 = Object.freeze({
  androids: 'active-production',
  pocketAndroids: 'active-production',
  superRadiantScattering: 'active-production',
  idleElectricSheep: 'legacy-preserved',
} as const)

export const CANONICAL_ACTIVE_SKILL_TIMER_IDS_V2 = Object.freeze([
  'androids',
  'pocketAndroids',
  'superRadiantScattering',
] as const)

const DEFAULT_SOURCE: CanonicalSkillCatalogSourceV2 = Object.freeze({
  get: getGameAsset,
  list: getGameAssetsByKind,
})

export function captureCanonicalSkillCatalogV2(
  source: CanonicalSkillCatalogSourceV2 = DEFAULT_SOURCE,
): Readonly<CanonicalSkillCatalogV2> {
  const database = source.get(SKILL_DATABASE_KIND, SKILL_DATABASE_ID)
  requireAsset(database, SKILL_DATABASE_KIND, SKILL_DATABASE_ID)
  exactDataKeys(database.data, ['skills'], 'SkillDatabase')
  const databaseIds = referenceIds(database.data.skills, 'SkillDatabase.skills')
  if (
    databaseIds.length !== EXPECTED_SKILL_COUNT ||
    new Set(databaseIds).size !== EXPECTED_SKILL_COUNT
  ) {
    throw new Error('Generated SkillDatabase must contain 104 unique Skill references.')
  }

  const canonicalIds = [...canonicalSkillStateKeySet]
  if (
    canonicalIds.length !== EXPECTED_SKILL_COUNT ||
    canonicalIds.some((id) => !databaseIds.includes(id)) ||
    databaseIds.some((id) => !canonicalIds.includes(id))
  ) {
    throw new Error('Generated SkillDatabase and canonical V2 Skill keys have drifted.')
  }

  const listedDefinitions = source.list(SKILL_DEFINITION_KIND)
  requirePlainArray(listedDefinitions, 'Skill definition list')
  if (
    listedDefinitions.length !== EXPECTED_SKILL_COUNT ||
    new Set(listedDefinitions.map((asset) => asset.id)).size !== EXPECTED_SKILL_COUNT ||
    listedDefinitions.some((asset) => !databaseIds.includes(asset.id))
  ) {
    throw new Error('Generated catalog must contain exactly the 104 declared Skill definitions.')
  }

  const definitions: Record<string, CanonicalSkillDefinitionV2> = {}
  const effectIds: string[] = []
  for (const id of databaseIds) {
    const asset = source.get(SKILL_DEFINITION_KIND, id)
    requireAsset(asset, SKILL_DEFINITION_KIND, id)
    exactDataKeys(asset.data, SKILL_DATA_KEYS, `Skill '${id}'`)
    const definition = parseSkillDefinition(asset, canonicalIds)
    definitions[id] = definition
    effectIds.push(...definition.effectIds)
  }
  if (
    effectIds.length !== EXPECTED_SKILL_EFFECT_REFERENCE_COUNT ||
    new Set(effectIds).size !== EXPECTED_SKILL_EFFECT_REFERENCE_COUNT
  ) {
    throw new Error('Generated Skill catalog must contain 134 unique Skill effect references.')
  }
  for (const effectId of effectIds) {
    validateEffect(source.get(EFFECT_DEFINITION_KIND, effectId), effectId)
  }

  const fragments = databaseIds.filter((id) => definitions[id]!.fragment).sort()
  if (
    fragments.length !== canonicalFragmentSkillKeySet.length ||
    fragments.some((id, index) => id !== canonicalFragmentSkillKeySet[index])
  ) {
    throw new Error('Generated fragment Skill ownership has drifted from the V2 manifest.')
  }

  return Object.freeze({
    skillIds: Object.freeze([...databaseIds]),
    fragmentSkillIds: Object.freeze(fragments),
    effectIds: Object.freeze([...effectIds]),
    byId: Object.freeze(definitions),
  })
}

export const canonicalSkillCatalogV2 = captureCanonicalSkillCatalogV2()

function parseSkillDefinition(
  asset: RuntimeGameAsset,
  canonicalIds: readonly string[],
): Readonly<CanonicalSkillDefinitionV2> {
  const data = asset.data
  const gates = [
    ['firstRunBlocked', 'first-infinity'],
    ['isFragment', 'fragments'],
    ['purityLine', 'purity'],
    ['terraLine', 'terra'],
    ['powerLine', 'power'],
    ['paragadeLine', 'paragade'],
    ['stellarLine', 'stellar'],
  ] as const
  const enabledGates = gates.filter(([field]) => booleanFlag(data[field], `${asset.id}.${field}`))
  if (enabledGates.length > 1) {
    throw new Error(`Skill '${asset.id}' declares multiple unlock authorities.`)
  }
  const required = stringIds(data.requiredSkillIds, `${asset.id}.requiredSkillIds`, canonicalIds)
  const shadowRequired = stringIds(data.shadowRequirementIds, `${asset.id}.shadowRequirementIds`, canonicalIds)
  const exclusiveWith = stringIds(data.exclusiveWithIds, `${asset.id}.exclusiveWithIds`, canonicalIds)
  const unrefundableWith = stringIds(data.unrefundableWithIds, `${asset.id}.unrefundableWithIds`, canonicalIds)
  const effectIds = referenceIds(data.effects, `${asset.id}.effects`)
  const cost = data.cost
  if (typeof cost !== 'number' || !Number.isSafeInteger(cost) || cost < 0) {
    throw new Error(`Skill '${asset.id}' has an invalid exact cost.`)
  }
  return Object.freeze({
    id: asset.id,
    cost: BigInt(cost),
    refundable: booleanFlag(data.refundable, `${asset.id}.refundable`),
    fragment: booleanFlag(data.isFragment, `${asset.id}.isFragment`),
    unlock: enabledGates[0]?.[1] ?? 'always',
    required,
    shadowRequired,
    exclusiveWith,
    unrefundableWith,
    effectIds,
  })
}

function validateEffect(asset: RuntimeGameAsset | undefined, id: string): void {
  requireAsset(asset, EFFECT_DEFINITION_KIND, id)
  exactDataKeys(asset.data, EFFECT_DATA_KEYS, `Effect '${id}'`, ['_condition'])
  const data = asset.data
  if (data.id !== id) throw new Error(`Effect '${id}' has a mismatched embedded ID.`)
  if (
    typeof data.operation !== 'number' ||
    !Number.isSafeInteger(data.operation) ||
    data.operation < 0 ||
    data.operation > 5 ||
    typeof data.value !== 'number' ||
    !Number.isFinite(data.value) ||
    typeof data.perLevel !== 'number' ||
    !Number.isFinite(data.perLevel) ||
    typeof data.order !== 'number' ||
    !Number.isFinite(data.order) ||
    typeof data.targetStatId !== 'string' ||
    (data.conditionId !== null && typeof data.conditionId !== 'string')
  ) {
    throw new Error(`Effect '${id}' has an invalid closed numeric or target contract.`)
  }
  stringIds(data.targetFacilityIds, `${id}.targetFacilityIds`)
  stringIds(data.targetFacilityTags, `${id}.targetFacilityTags`)
  if (data._condition !== undefined && data._condition !== null) {
    const condition = data._condition
    if (!isPlainRecord(condition)) throw new Error(`Effect '${id}' has an invalid condition reference.`)
    exactDataKeys(condition, ['id'], `${id}._condition`)
    if (condition.id !== null && typeof condition.id !== 'string') {
      throw new Error(`Effect '${id}' has an invalid condition reference ID.`)
    }
  }
}

function requireAsset(
  asset: RuntimeGameAsset | undefined,
  kind: string,
  id: string,
): asserts asset is RuntimeGameAsset {
  if (asset?.kind !== kind || asset.id !== id || !isPlainRecord(asset.data)) {
    throw new Error(`Generated catalog is missing closed asset '${kind}:${id}'.`)
  }
}

function exactDataKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
  label: string,
  optional: readonly string[] = [],
): void {
  if (!isPlainRecord(value)) throw new Error(`${label} must be a plain data object.`)
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(descriptors)
  if (
    keys.length < expected.length ||
    keys.length > expected.length + optional.length ||
    keys.some((key) =>
      typeof key !== 'string' ||
      (!expected.includes(key) && !optional.includes(key)),
    ) ||
    expected.some((key) => !Object.prototype.hasOwnProperty.call(descriptors, key)) ||
    Object.values(descriptors).some((descriptor) => !('value' in descriptor))
  ) {
    throw new Error(`${label} must contain exactly its declared data fields.`)
  }
}

function referenceIds(value: unknown, label: string): readonly string[] {
  requirePlainArray(value, label)
  const result: string[] = []
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (descriptor === undefined || !('value' in descriptor) || !isPlainRecord(descriptor.value)) {
      throw new Error(`${label} must contain data-only references.`)
    }
    exactDataKeys(descriptor.value, ['id'], `${label}.${index}`)
    if (typeof descriptor.value.id !== 'string' || descriptor.value.id.length === 0) {
      throw new Error(`${label} contains an invalid reference ID.`)
    }
    result.push(descriptor.value.id)
  }
  if (new Set(result).size !== result.length) throw new Error(`${label} contains duplicate references.`)
  return Object.freeze(result)
}

function stringIds(
  value: unknown,
  label: string,
  allowed?: readonly string[],
): readonly string[] {
  requirePlainArray(value, label)
  const result: string[] = []
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (descriptor === undefined || !('value' in descriptor) || typeof descriptor.value !== 'string' || descriptor.value.length === 0) {
      throw new Error(`${label} must contain non-empty data-only string IDs.`)
    }
    if (allowed !== undefined && !allowed.includes(descriptor.value)) {
      throw new Error(`${label} references unknown Skill '${descriptor.value}'.`)
    }
    result.push(descriptor.value)
  }
  if (new Set(result).size !== result.length) throw new Error(`${label} contains duplicate IDs.`)
  return Object.freeze(result)
}

function booleanFlag(value: unknown, label: string): boolean {
  if (value === true || value === 1) return true
  if (value === false || value === 0) return false
  throw new Error(`${label} must be a closed boolean flag.`)
}

function requirePlainArray(
  value: unknown,
  label: string,
): asserts value is readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new Error(`${label} must be an ordinary array.`)
  }
  const length = Object.getOwnPropertyDescriptor(value, 'length')
  if (length === undefined || !('value' in length) || length.value !== value.length) {
    throw new Error(`${label} must expose a data-only length.`)
  }
}

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}
