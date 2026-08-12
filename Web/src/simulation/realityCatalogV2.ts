import { getGameAsset, getGameAssetsByKind } from '../game-data/catalog'
import type { RuntimeGameAsset } from '../game-data/types'

const REALITY_TUNING_KIND = 'IdleDysonSwarm.Data.Balance.RealitySystemTuning'
const REALITY_TUNING_ID = 'RealitySystemTuning'
const UPGRADE_KIND = 'IdleDysonSwarm.Data.Balance.SimulationUpgradeDefinition'
const REALITY_LAYER = 1

export const REALITY_UPGRADE_IDS_V2 = Object.freeze([
  'translation1', 'translation2', 'translation3', 'translation4',
  'translation5', 'translation6', 'translation7', 'translation8',
  'speed1', 'speed2', 'speed3', 'speed4',
  'speed5', 'speed6', 'speed7', 'speed8',
  'doubleTimeOwned', 'workerAutoConvert',
] as const)

export type RealityUpgradeIdV2 = (typeof REALITY_UPGRADE_IDS_V2)[number]

export type RealityUpgradeOwnershipKeyV2 =
  | RealityUpgradeIdV2

export type RealityUpgradeEffectV2 =
  | {
      readonly kind: 'set-owned'
      readonly key: RealityUpgradeOwnershipKeyV2
      readonly value: boolean
    }
  | {
      readonly kind: 'grant-skill-points'
      readonly amount: bigint
    }
  | {
      readonly kind: 'set-double-time-bank'
      readonly seconds: number
    }

export interface RealityUpgradeDefinitionV2 {
  readonly id: RealityUpgradeIdV2
  readonly cost: bigint
  readonly prerequisites: readonly Readonly<{
    key: RealityUpgradeOwnershipKeyV2
    mustBeOwned: boolean
  }>[]
  readonly effects: readonly RealityUpgradeEffectV2[]
}

export interface RealityCatalogV2 {
  readonly workerBatchSize: bigint
  readonly baseWorkerGenerationPerSecond: number
  readonly avocadoLogThreshold: number
  readonly upgradeIds: readonly RealityUpgradeIdV2[]
  readonly upgrades: Readonly<Record<RealityUpgradeIdV2, RealityUpgradeDefinitionV2>>
}

export interface RealityCatalogSourceV2 {
  readonly get: (kind: string, id: string) => RuntimeGameAsset | undefined
  readonly list: (kind: string) => readonly RuntimeGameAsset[]
}

const DEFAULT_SOURCE: RealityCatalogSourceV2 = Object.freeze({
  get: getGameAsset,
  list: getGameAssetsByKind,
})

export function captureRealityCatalogV2(
  source: RealityCatalogSourceV2 = DEFAULT_SOURCE,
): Readonly<RealityCatalogV2> {
  const tuning = captureAssetEnvelope(
    source.get(REALITY_TUNING_KIND, REALITY_TUNING_ID),
    REALITY_TUNING_KIND,
    'RealitySystemTuning asset',
  )
  if (tuning.id !== REALITY_TUNING_ID) {
    throw new Error(`Reality catalog is missing '${REALITY_TUNING_KIND}:${REALITY_TUNING_ID}'.`)
  }
  const tuningData = closedData(
    tuning.data,
    ['avocadoLogThreshold', 'baseWorkerGenerationSpeed', 'workerBatchSize'],
    'RealitySystemTuning',
  )
  const workerBatchSize = positiveSafeInteger(tuningData.workerBatchSize, 'workerBatchSize')
  if (workerBatchSize !== 128) {
    throw new Error('Reality worker batch size must remain exactly 128.')
  }
  const baseWorkerGenerationPerSecond = nonNegativeFiniteNumber(
    tuningData.baseWorkerGenerationSpeed,
    'baseWorkerGenerationSpeed',
  )
  const avocadoLogThreshold = nonNegativeFiniteNumber(
    tuningData.avocadoLogThreshold,
    'avocadoLogThreshold',
  )
  if (baseWorkerGenerationPerSecond !== 4 || avocadoLogThreshold !== 10) {
    throw new Error('Reality tuning has drifted from the authored 4/10 rate contract.')
  }

  const listed = source.list(UPGRADE_KIND)
  requireDataArray(listed, 'Simulation upgrade catalog')
  const upgrades: Partial<Record<RealityUpgradeIdV2, RealityUpgradeDefinitionV2>> = {}
  const seen = new Set<string>()
  for (let index = 0; index < listed.length; index += 1) {
    const assetDescriptor = Object.getOwnPropertyDescriptor(listed, String(index))
    if (assetDescriptor === undefined || !('value' in assetDescriptor)) {
      throw new Error('Simulation upgrade catalog must be data-only.')
    }
    const asset = captureAssetEnvelope(
      assetDescriptor.value,
      UPGRADE_KIND,
      `Simulation upgrade asset ${index}`,
    )
    const data = closedData(
      asset.data,
      ['cost', 'key', 'layer', 'prerequisites', 'purchaseEffects'],
      `Simulation upgrade '${asset.id}'`,
    )
    if (data.layer !== REALITY_LAYER) continue
    if (typeof data.key !== 'string' || !isRealityUpgradeIdV2(data.key)) {
      throw new Error(`Reality upgrade '${asset.id}' has an unsupported key.`)
    }
    if (asset.id !== data.key || seen.has(data.key)) {
      throw new Error(`Reality upgrade '${data.key}' has duplicate or mismatched identity.`)
    }
    seen.add(data.key)
    upgrades[data.key] = parseUpgrade(data.key, data)
  }
  if (
    seen.size !== REALITY_UPGRADE_IDS_V2.length ||
    REALITY_UPGRADE_IDS_V2.some((id) => upgrades[id] === undefined)
  ) {
    throw new Error('Reality catalog must close exactly the 18 authored upgrades.')
  }
  validatePrerequisiteGraph(upgrades as Readonly<
    Record<RealityUpgradeIdV2, RealityUpgradeDefinitionV2>
  >)
  validateExactAuthoredDefinitions(upgrades as Readonly<
    Record<RealityUpgradeIdV2, RealityUpgradeDefinitionV2>
  >)

  return Object.freeze({
    workerBatchSize: BigInt(workerBatchSize),
    baseWorkerGenerationPerSecond,
    avocadoLogThreshold,
    upgradeIds: REALITY_UPGRADE_IDS_V2,
    upgrades: Object.freeze(upgrades) as Readonly<
      Record<RealityUpgradeIdV2, RealityUpgradeDefinitionV2>
    >,
  })
}

function validateExactAuthoredDefinitions(
  upgrades: Readonly<Record<RealityUpgradeIdV2, RealityUpgradeDefinitionV2>>,
): void {
  for (let tier = 1; tier <= 8; tier += 1) {
    for (const family of ['translation', 'speed'] as const) {
      const id = `${family}${tier}` as RealityUpgradeIdV2
      const definition = upgrades[id]
      const expectedCost = 2n ** BigInt(tier + (family === 'translation' ? 2 : 10))
      const expectedPrerequisite = tier === 1
        ? []
        : [{ key: `${family}${tier - 1}` as RealityUpgradeIdV2, mustBeOwned: true }]
      if (
        definition.cost !== expectedCost ||
        definition.prerequisites.length !== expectedPrerequisite.length ||
        definition.prerequisites.some((entry, index) =>
          entry.key !== expectedPrerequisite[index]!.key ||
          entry.mustBeOwned !== expectedPrerequisite[index]!.mustBeOwned) ||
        definition.effects.length !== 2 ||
        definition.effects[0]?.kind !== 'set-owned' ||
        definition.effects[0].key !== id ||
        !definition.effects[0].value ||
        definition.effects[1]?.kind !== 'grant-skill-points' ||
        definition.effects[1].amount !== 1n
      ) {
        throw new Error(`Reality upgrade '${id}' has drifted from its exact authored semantics.`)
      }
    }
  }
  const doubleTime = upgrades.doubleTimeOwned
  if (
    doubleTime.cost !== 5n ||
    doubleTime.prerequisites.length !== 0 ||
    doubleTime.effects.length !== 2 ||
    doubleTime.effects[0]?.kind !== 'set-owned' ||
    doubleTime.effects[0].key !== 'doubleTimeOwned' ||
    !doubleTime.effects[0].value ||
    doubleTime.effects[1]?.kind !== 'set-double-time-bank' ||
    doubleTime.effects[1].seconds !== 600
  ) {
    throw new Error("Reality upgrade 'doubleTimeOwned' has drifted from its exact authored semantics.")
  }
  const auto = upgrades.workerAutoConvert
  if (
    auto.cost !== 10n ||
    auto.prerequisites.length !== 0 ||
    auto.effects.length !== 1 ||
    auto.effects[0]?.kind !== 'set-owned' ||
    auto.effects[0].key !== 'workerAutoConvert' ||
    !auto.effects[0].value
  ) {
    throw new Error("Reality upgrade 'workerAutoConvert' has drifted from its exact authored semantics.")
  }
}

function validatePrerequisiteGraph(
  upgrades: Readonly<Record<RealityUpgradeIdV2, RealityUpgradeDefinitionV2>>,
): void {
  const visited = new Set<RealityUpgradeIdV2>()
  const visiting = new Set<RealityUpgradeIdV2>()
  const visit = (id: RealityUpgradeIdV2): void => {
    if (visited.has(id)) return
    if (visiting.has(id)) {
      throw new Error(`Reality upgrade '${id}' belongs to a prerequisite cycle.`)
    }
    visiting.add(id)
    for (const prerequisite of upgrades[id].prerequisites) visit(prerequisite.key)
    visiting.delete(id)
    visited.add(id)
  }
  for (const id of REALITY_UPGRADE_IDS_V2) visit(id)
}

export const canonicalRealityCatalogV2 = captureRealityCatalogV2()

function parseUpgrade(
  id: RealityUpgradeIdV2,
  data: Readonly<Record<string, unknown>>,
): Readonly<RealityUpgradeDefinitionV2> {
  const cost = positiveSafeInteger(data.cost, `${id}.cost`)
  const prerequisites = parsePrerequisites(data.prerequisites, id)
  const effects = parseEffects(data.purchaseEffects, id)
  if (effects.length === 0) throw new Error(`Reality upgrade '${id}' has no effects.`)
  if (!effects.some((effect) => effect.kind === 'set-owned' && effect.key === id && effect.value)) {
    throw new Error(`Reality upgrade '${id}' does not author its one-time ownership effect.`)
  }
  return Object.freeze({
    id,
    cost: BigInt(cost),
    prerequisites,
    effects,
  })
}

function parsePrerequisites(
  value: unknown,
  owner: RealityUpgradeIdV2,
): readonly Readonly<{ key: RealityUpgradeOwnershipKeyV2; mustBeOwned: boolean }>[] {
  requireDataArray(value, `${owner}.prerequisites`)
  const output: Readonly<{ key: RealityUpgradeOwnershipKeyV2; mustBeOwned: boolean }>[] = []
  const seen = new Set<string>()
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (descriptor === undefined || !('value' in descriptor)) {
      throw new Error(`${owner}.prerequisites must be data-only.`)
    }
    const entry = closedData(
      descriptor.value,
      ['key', 'mustBeOwned'],
      `${owner}.prerequisites.${index}`,
    )
    if (typeof entry.key !== 'string' || !isRealityUpgradeIdV2(entry.key) || seen.has(entry.key)) {
      throw new Error(`${owner} has an invalid prerequisite.`)
    }
    seen.add(entry.key)
    output.push(Object.freeze({
      key: entry.key,
      mustBeOwned: booleanFlag(entry.mustBeOwned, `${owner}.prerequisites.${index}`),
    }))
  }
  return Object.freeze(output)
}

function parseEffects(
  value: unknown,
  owner: RealityUpgradeIdV2,
): readonly RealityUpgradeEffectV2[] {
  requireDataArray(value, `${owner}.purchaseEffects`)
  const output: RealityUpgradeEffectV2[] = []
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (descriptor === undefined || !('value' in descriptor)) {
      throw new Error(`${owner}.purchaseEffects must be data-only.`)
    }
    const entry = closedData(
      descriptor.value,
      ['boolValue', 'effectType', 'numericValue', 'targetKey'],
      `${owner}.purchaseEffects.${index}`,
    )
    const type = entry.effectType
    const target = entry.targetKey
    const bool = booleanFlag(entry.boolValue, `${owner}.purchaseEffects.${index}`)
    const numeric = nonNegativeFiniteNumber(
      entry.numericValue,
      `${owner}.purchaseEffects.${index}.numericValue`,
    )
    if ((type === 0 || type === 1) && typeof target === 'string' && isRealityUpgradeIdV2(target)) {
      output.push(Object.freeze({ kind: 'set-owned', key: target, value: bool }))
      continue
    }
    if (type === 2 && target === null && Number.isSafeInteger(numeric)) {
      output.push(Object.freeze({ kind: 'grant-skill-points', amount: BigInt(numeric) }))
      continue
    }
    if (type === 8 && target === 'doubleTime') {
      output.push(Object.freeze({ kind: 'set-double-time-bank', seconds: numeric }))
      continue
    }
    throw new Error(`Reality upgrade '${owner}' has unsupported effect ${index}.`)
  }
  return Object.freeze(output)
}

function captureAssetEnvelope(
  asset: unknown,
  expectedKind: string,
  path: string,
): Readonly<RuntimeGameAsset> {
  const envelope = closedData(asset, ['id', 'kind', 'data'], path)
  if (
    typeof envelope.id !== 'string' ||
    envelope.id.length === 0 ||
    envelope.kind !== expectedKind ||
    envelope.data === null ||
    typeof envelope.data !== 'object' ||
    Array.isArray(envelope.data)
  ) {
    throw new Error(`${path} has an invalid closed asset envelope.`)
  }
  return Object.freeze({
    id: envelope.id,
    kind: expectedKind,
    data: envelope.data as Readonly<Record<string, never>>,
  })
}

function closedData(
  value: unknown,
  expected: readonly string[],
  path: string,
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${path} must be a closed data object.`)
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${path} must be a closed data object.`)
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(descriptors)
  if (
    keys.length !== expected.length ||
    keys.some((key) => typeof key !== 'string' || !expected.includes(key)) ||
    expected.some((key) => descriptors[key] === undefined || !('value' in descriptors[key]!))
  ) {
    throw new Error(`${path} must contain exactly its declared data fields.`)
  }
  return Object.freeze(Object.fromEntries(
    expected.map((key) => [key, (descriptors[key] as PropertyDescriptor & { value: unknown }).value]),
  ))
}

function requireDataArray(value: unknown, path: string): asserts value is readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new Error(`${path} must be an ordinary array.`)
  }
  const length = Object.getOwnPropertyDescriptor(value, 'length')
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(descriptors)
  if (
    length === undefined ||
    !('value' in length) ||
    length.value !== value.length ||
    keys.length !== value.length + 1 ||
    keys.some((key) => {
      if (key === 'length') return false
      if (typeof key !== 'string' || !/^(?:0|[1-9]\d*)$/u.test(key)) return true
      const index = Number(key)
      return index >= value.length || descriptors[key] === undefined || !('value' in descriptors[key]!)
    }) ||
    Array.from({ length: value.length }, (_, index) => String(index)).some(
      (key) => descriptors[key] === undefined || !('value' in descriptors[key]!),
    )
  ) {
    throw new Error(`${path} must expose a data-only length.`)
  }
}

function positiveSafeInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${path} must be a positive safe integer.`)
  }
  return value
}

function nonNegativeFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || Object.is(value, -0)) {
    throw new Error(`${path} must be a finite non-negative number.`)
  }
  return value
}

function booleanFlag(value: unknown, path: string): boolean {
  if (value === true || value === 1) return true
  if (value === false || value === 0) return false
  throw new Error(`${path} must be a closed boolean flag.`)
}

export function isRealityUpgradeIdV2(value: string): value is RealityUpgradeIdV2 {
  return REALITY_UPGRADE_IDS_V2.includes(value as RealityUpgradeIdV2)
}
