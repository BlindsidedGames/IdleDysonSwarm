import { gzipSync, strToU8 } from 'fflate'
import type { SaveRecord } from '../../src/save/graph'

// Frozen pre-optimization algorithms, kept outside the production dependency
// graph for differential certification and an advisory performance report.
export function referenceBitDecrement(value: number): number {
  if (Number.isNaN(value) || value === Number.NEGATIVE_INFINITY) return value
  if (value === 0) return -Number.MIN_VALUE
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, value, false)
  let bits = view.getBigUint64(0, false)
  bits += value > 0 ? -1n : 1n
  view.setBigUint64(0, bits, false)
  return view.getFloat64(0, false)
}

export function referenceBitIncrement(value: number): number {
  if (Number.isNaN(value) || value === Number.POSITIVE_INFINITY) return value
  if (value === 0) return Number.MIN_VALUE
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, value, false)
  let bits = view.getBigUint64(0, false)
  bits += value > 0 ? 1n : -1n
  view.setBigUint64(0, bits, false)
  return view.getFloat64(0, false)
}

export function referenceSerializeWebSave(save: SaveRecord): string {
  const schema = Number(save.saveVersion)
  if (!Number.isInteger(schema) || schema < 0) {
    throw new Error('Canonical web saves require a non-negative integer schema.')
  }
  const envelope = {
    format: 'IDSWEB1',
    schema,
    state: encodeValue(save, new Set()),
  }
  const json = JSON.stringify(sortObject({ ...envelope }))
  return `IDSWEB1:${encodeBase64(gzipSync(strToU8(json), { level: 9, mtime: 0 }))}`
}

function encodeValue(value: unknown, seen: Set<object>): unknown {
  if (typeof value === 'bigint') return { $bigint: value.toString() }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new Error('Canonical web saves cannot contain non-finite or negative-zero numbers.')
    }
    return value
  }
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    throw new Error(`Canonical web saves cannot contain ${typeof value} values.`)
  }
  if (value instanceof Uint8Array) return { $bytes: encodeBase64(value) }
  if (value === null || typeof value !== 'object') return value
  if (!Array.isArray(value)) {
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error('Canonical web saves can contain only plain objects, arrays, and byte arrays.')
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new Error('Canonical web saves cannot contain symbol-keyed properties.')
    }
    const sourceKeys = Object.keys(value)
    if (sourceKeys.length === 1 && (sourceKeys[0] === '$bigint' || sourceKeys[0] === '$bytes')) {
      throw new Error('Canonical web saves cannot contain objects that collide with reserved codec tags.')
    }
  }
  if (seen.has(value)) throw new Error('Canonical web saves cannot contain reference cycles.')
  seen.add(value)
  const encoded = Array.isArray(value)
    ? Array.from(value, (entry) => encodeValue(entry, seen))
    : sortObject(Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      encodeValue(entry, seen),
    ])))
  seen.delete(value)
  return encoded
}

function sortObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  ))
}

function encodeBase64(value: Uint8Array): string {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary)
}
