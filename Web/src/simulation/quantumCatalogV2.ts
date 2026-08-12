import { getGameAssetsByKind } from '../game-data/catalog'
import { integerGameDecimalFromNumber, type GameDecimal } from '../math/gameDecimal'

export const QUANTUM_V2_GENERATED_KIND = 'IdleDysonSwarm.Data.QuantumUpgradeDefinition'

export const QUANTUM_V2_UPGRADE_IDS = Object.freeze([
  'BotMultitasking', 'DoubleIP', 'BreakTheLoop', 'QuantumEntanglement',
  'Automation', 'Secrets', 'Division', 'Avocado', 'Fragments', 'Purity',
  'Terra', 'Power', 'Paragade', 'Stellar', 'InfluenceSpeed', 'CashBonus',
  'ScienceBonus', 'MatrioshkaBrains', 'BirchPlanets', 'GalacticBrains',
] as const)
export type QuantumUpgradeIdV2 = typeof QUANTUM_V2_UPGRADE_IDS[number]

export const QUANTUM_V2_BULK_UPGRADE_IDS = Object.freeze([
  'InfluenceSpeed', 'CashBonus', 'ScienceBonus',
] as const satisfies readonly QuantumUpgradeIdV2[])
export type QuantumBulkUpgradeIdV2 = typeof QUANTUM_V2_BULK_UPGRADE_IDS[number]

export interface QuantumUpgradeDefinitionV2 {
  readonly id: QuantumUpgradeIdV2
  readonly baseCost: GameDecimal
  readonly costScaling: 'flat' | 'exponential'
  readonly repeatable: boolean
  readonly maximumPurchases: bigint | null
  readonly unitsPerPurchase: bigint
  readonly source: 'generated-unity-asset' | 'unity-compatibility-fallback'
}

type Authored = readonly [number, 0 | 1, 0 | 1, number, bigint]
const GENERATED = Object.freeze({
  Automation: [1, 0, 0, 1, 1n], Avocado: [42, 0, 0, 1, 1n],
  BotMultitasking: [1, 0, 0, 1, 1n], BreakTheLoop: [6, 0, 0, 1, 1n],
  CashBonus: [1, 0, 1, 0, 1n], Division: [2, 1, 1, 19, 1n],
  DoubleIP: [1, 0, 0, 1, 1n], Fragments: [2, 0, 0, 1, 1n],
  InfluenceSpeed: [1, 0, 1, 0, 4n], Paragade: [1, 0, 0, 1, 1n],
  Power: [2, 0, 0, 1, 1n], Purity: [3, 0, 0, 1, 1n],
  QuantumEntanglement: [12, 0, 0, 1, 1n], ScienceBonus: [1, 0, 1, 0, 1n],
  Secrets: [1, 0, 1, 9, 3n], Stellar: [4, 0, 0, 1, 1n],
  Terra: [2, 0, 0, 1, 1n],
} as const satisfies Partial<Record<QuantumUpgradeIdV2, Authored>>)

const COMPATIBILITY = Object.freeze({
  MatrioshkaBrains: [5, 0, 0, 1, 1n],
  BirchPlanets: [10, 0, 0, 1, 1n],
  GalacticBrains: [20, 0, 0, 1, 1n],
} as const satisfies Partial<Record<QuantumUpgradeIdV2, Authored>>)

const GENERATED_IDS = Object.freeze(Object.keys(GENERATED) as (keyof typeof GENERATED)[])
const DATA_KEYS = Object.freeze(['baseCost', 'costScaling', 'id', 'isRepeatable', 'maxPurchases'])

export function validateQuantumV2CatalogIngress(assets: unknown): boolean {
  try { compileGenerated(assets); return true } catch { return false }
}

export function compileQuantumV2Catalog(
  assets: unknown = getGameAssetsByKind(QUANTUM_V2_GENERATED_KIND),
): Readonly<Record<QuantumUpgradeIdV2, QuantumUpgradeDefinitionV2>> {
  const generated = compileGenerated(assets)
  const entries = QUANTUM_V2_UPGRADE_IDS.map((id) => {
    const authored = id in GENERATED
      ? GENERATED[id as keyof typeof GENERATED]
      : COMPATIBILITY[id as keyof typeof COMPATIBILITY]
    const source = id in GENERATED ? 'generated-unity-asset' : 'unity-compatibility-fallback'
    if (id in GENERATED && !generated.has(id)) throw new Error(`Missing Quantum V2 asset ${id}.`)
    return [id, definition(id, authored, source)] as const
  })
  return Object.freeze(Object.fromEntries(entries)) as Readonly<Record<QuantumUpgradeIdV2, QuantumUpgradeDefinitionV2>>
}

function definition(id: QuantumUpgradeIdV2, authored: Authored, source: QuantumUpgradeDefinitionV2['source']): QuantumUpgradeDefinitionV2 {
  return Object.freeze({
    id,
    baseCost: integerGameDecimalFromNumber(authored[0]),
    costScaling: authored[1] === 0 ? 'flat' : 'exponential',
    repeatable: authored[2] === 1,
    maximumPurchases: authored[3] === 0 ? null : BigInt(authored[3]),
    unitsPerPurchase: authored[4],
    source,
  })
}

function compileGenerated(input: unknown): ReadonlySet<string> {
  const assets = closedArray(input, 'Quantum V2 assets')
  if (assets.length !== GENERATED_IDS.length) throw new Error('Quantum V2 generated asset count mismatch.')
  const found = new Set<string>()
  for (let index = 0; index < assets.length; index += 1) {
    const envelope = closedRecord(assets[index], ['id', 'kind', 'data'], `Quantum asset ${index}`)
    const id = envelope.id
    if (typeof id !== 'string' || !(id in GENERATED) || found.has(id)) throw new Error('Quantum V2 asset id mismatch.')
    if (envelope.kind !== QUANTUM_V2_GENERATED_KIND) throw new Error('Quantum V2 asset kind mismatch.')
    const data = closedRecord(envelope.data, DATA_KEYS, `Quantum asset ${id}.data`)
    const expected = GENERATED[id as keyof typeof GENERATED]
    if (data.id !== id || !Object.is(data.baseCost, expected[0]) || !Object.is(data.costScaling, expected[1]) ||
      !Object.is(data.isRepeatable, expected[2]) || !Object.is(data.maxPurchases, expected[3])) {
      throw new Error(`Quantum V2 authored contract mismatch for ${id}.`)
    }
    found.add(id)
  }
  return found
}

function closedArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) throw new Error(`${path} must be an ordinary array.`)
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length')
  const keys = Reflect.ownKeys(descriptors)
  if (keys.length !== value.length + 1 || lengthDescriptor === undefined || !('value' in lengthDescriptor) || lengthDescriptor.value !== value.length ||
    lengthDescriptor.enumerable ||
    Array.from({ length: value.length }, (_, i) => descriptors[String(i)]).some((d) => d === undefined || !d.enumerable || !('value' in d))) {
    throw new Error(`${path} must be dense and data-only.`)
  }
  return Array.from({ length: value.length }, (_, i) => descriptors[String(i)]!.value)
}

function closedRecord(value: unknown, keys: readonly string[], path: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`${path} must be an ordinary object.`)
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const actual = Reflect.ownKeys(descriptors)
  if (actual.length !== keys.length || actual.some((key) => typeof key !== 'string' || !keys.includes(key)) ||
    keys.some((key) => descriptors[key] === undefined || !descriptors[key]!.enumerable || !('value' in descriptors[key]!))) {
    throw new Error(`${path} must contain exactly its data fields.`)
  }
  return Object.freeze(Object.fromEntries(keys.map((key) => [key, descriptors[key]!.value])))
}

export const QUANTUM_V2_DEFINITIONS = compileQuantumV2Catalog()
