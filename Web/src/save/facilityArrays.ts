import { type SaveRecord } from './graph'

export const facilityArrayNames = [
  'assemblyLines',
  'managers',
  'servers',
  'dataCenters',
  'planets',
  'matrioshkaBrains',
  'birchPlanets',
  'galacticBrains',
] as const

export function normalizeFacilityArrays(infinity: SaveRecord): void {
  for (const name of facilityArrayNames) {
    const existing = Array.isArray(infinity[name]) ? infinity[name] : []
    const dense = [
      finiteNonNegative(existing[0]),
      finiteNonNegative(existing[1]),
    ]
    const indices = infinity[`${name}SparseIndices`]
    const values = infinity[`${name}SparseValues`]
    if (Array.isArray(indices) && Array.isArray(values)) {
      for (let index = 0; index < Math.min(indices.length, values.length); index += 1) {
        const slot = Number(indices[index])
        const sparseValue = finiteNonNegative(values[index])
        if (slot === 0 || slot === 1) dense[slot] = Math.max(dense[slot], sparseValue)
      }
    }
    infinity[name] = dense
    infinity[`${name}SparseIndices`] = null
    infinity[`${name}SparseValues`] = null
  }
}

function finiteNonNegative(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : 0
}
