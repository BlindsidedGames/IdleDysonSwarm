import { requireRecord } from '../save/graph'
import type { PreparedSave } from '../save/prepare'

/**
 * Legacy save-resident balance inputs required while authored Dyson tuning is
 * still being moved out of the player graph.
 */
export interface DysonCompatibilityTuning {
  readonly panelsPerSecMulti: number
  readonly scienceBoostPercent: number
  readonly moneyMultiUpgradePercent: number
  readonly assemblyLineUpgradePercent: number
  readonly aiManagerUpgradePercent: number
  readonly serverUpgradePercent: number
  readonly dataCenterUpgradePercent: number
  readonly planetUpgradePercent: number
  readonly matrioshkaUpgradePercent: number
  readonly birchUpgradePercent: number
  readonly galacticUpgradePercent: number
}

const TUNING_FIELDS = [
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
] as const satisfies readonly (keyof DysonCompatibilityTuning)[]

export function extractDysonCompatibilityTuning(
  prepared: PreparedSave,
): Readonly<DysonCompatibilityTuning> {
  const source = prepared.copyValidatedState()
  const dyson = requireRecord(
    source.dysonVerseSaveData,
    'Dyson save',
  )
  const infinity = requireRecord(
    dyson.dysonVerseInfinityData,
    'Dyson infinity data',
  )
  const entries = TUNING_FIELDS.map((field) => [
    field,
    requireFiniteNonNegative(infinity[field], field),
  ])
  return Object.freeze(
    Object.fromEntries(entries) as unknown as DysonCompatibilityTuning,
  )
}

function requireFiniteNonNegative(
  value: unknown,
  field: keyof DysonCompatibilityTuning,
): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value
  }
  throw new Error(
    `Dyson compatibility tuning '${field}' must be a finite non-negative number.`,
  )
}
