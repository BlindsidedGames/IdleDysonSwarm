import { isNonArrayRecord } from '../core/nonArrayRecord'

export type SaveRecord = Record<string, unknown>

export function isRecord(value: unknown): value is SaveRecord {
  return isNonArrayRecord(value)
}

export function requireRecord(value: unknown, label = 'value'): SaveRecord {
  if (!isRecord(value)) throw new Error(`${label} must be an object`)
  return value
}

export function ensureRecord(parent: SaveRecord, key: string): SaveRecord {
  const current = parent[key]
  if (isRecord(current)) return current
  const created: SaveRecord = {}
  parent[key] = created
  return created
}

export function ensureArray<T = unknown>(
  parent: SaveRecord,
  key: string,
): T[] {
  const current = parent[key]
  if (Array.isArray(current)) return current as T[]
  const created: T[] = []
  parent[key] = created
  return created
}

export function asFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function asInteger(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isInteger(value) ? value : fallback
}

export function asBigInt(value: unknown, fallback = 0n): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value)
  return fallback
}

export function deepCloneSave<T>(value: T): T {
  return clone(value, new Map()) as T
}

function clone(value: unknown, seen: Map<object, unknown>): unknown {
  if (
    value === null ||
    typeof value !== 'object' ||
    value instanceof Date
  ) {
    return value
  }
  const existing = seen.get(value)
  if (existing !== undefined) return existing
  if (value instanceof Uint8Array) return value.slice()
  if (Array.isArray(value)) {
    const result: unknown[] = []
    seen.set(value, result)
    for (const item of value) result.push(clone(item, seen))
    return result
  }
  const result: SaveRecord = {}
  seen.set(value, result)
  for (const [key, entry] of Object.entries(value)) {
    result[key] = clone(entry, seen)
  }
  return result
}

export function walkMutableGraph(
  value: unknown,
  visit: (parent: SaveRecord | unknown[], key: string | number, value: unknown, path: string) => void,
  path = 'saveSettings',
  seen = new Set<object>(),
): void {
  if (value === null || typeof value !== 'object') return
  if (seen.has(value)) return
  seen.add(value)
  if (value instanceof Uint8Array) return
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      const childPath = `${path}[${index}]`
      visit(value, index, entry, childPath)
      walkMutableGraph(value[index], visit, childPath, seen)
    })
    return
  }
  const record = value as SaveRecord
  for (const [key, entry] of Object.entries(record)) {
    const childPath = `${path}.${key}`
    visit(record, key, entry, childPath)
    walkMutableGraph(record[key], visit, childPath, seen)
  }
}
