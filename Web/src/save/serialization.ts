import { Gunzip, gzipSync, strToU8 } from 'fflate'
import { deepCloneSave, requireRecord, type SaveRecord } from './graph'
import {
  assertSuppliedSaveTextLimit,
  DEFAULT_SAVE_IMPORT_LIMITS,
  SaveImportLimitError,
  type SaveImportLimits,
} from './decodeIdb1'
import { packSettingsFlags } from './settingsFlags'

const WEB_SAVE_FORMAT = 'IDSWEB1'
const WEB_SAVE_PREFIX = `${WEB_SAVE_FORMAT}:`
const GZIP_INPUT_CHUNK_BYTES = 64
const MAXIMUM_GZIP_CALLBACK_BYTES = 128 * 1024
const MAXIMUM_DECODE_DEPTH = 128
const MAXIMUM_DECODE_CONTAINERS = 100_000
const MAXIMUM_DECODE_ENTRIES = 250_000

interface EncodedWebSave {
  readonly format: typeof WEB_SAVE_FORMAT
  readonly schema: number
  readonly state: unknown
}

export function serializeWebSave(save: SaveRecord): string {
  const schema = Number(save.saveVersion)
  if (!Number.isInteger(schema) || schema < 0) {
    throw new Error('Canonical web saves require a non-negative integer schema.')
  }
  const envelope: EncodedWebSave = {
    format: WEB_SAVE_FORMAT,
    schema,
    state: encodeValue(save, new Set()),
  }
  const json = JSON.stringify(sortObject({ ...envelope }))
  return `${WEB_SAVE_PREFIX}${encodeBase64(gzipSync(strToU8(json), {
    level: 9,
    mtime: 0,
  }))}`
}

/**
 * Produces a player-shareable save without copying device/store ownership.
 * Gameplay's Quantum Double IP upgrade is a separate nested progression flag
 * and is intentionally preserved.
 */
export function serializeSharedWebSave(save: SaveRecord): string {
  return serializeWebSave(stripNonShareableEntitlementClaims(save))
}

export function stripNonShareableEntitlementClaims(
  save: SaveRecord,
): SaveRecord {
  const shareable = deepCloneSave(save)
  shareable.doubleIp = false
  shareable.debugOptions = false
  shareable.debugEverEnabled = false
  packSettingsFlags(shareable)
  return shareable
}

export function deserializeWebSave(text: string): SaveRecord {
  return deserializeWebSaveBounded(
    text,
    DEFAULT_SAVE_IMPORT_LIMITS,
  )
}

export function deserializeWebSaveBounded(
  text: string,
  limits: Readonly<SaveImportLimits>,
): SaveRecord {
  assertSuppliedSaveTextLimit(text, limits)
  const trimmed = text.trim()
  const json = trimmed.toUpperCase().startsWith(WEB_SAVE_PREFIX)
    ? decodeCompressedEnvelope(
        trimmed.slice(WEB_SAVE_PREFIX.length),
        limits,
      )
    : trimmed
  const parsed = JSON.parse(json) as unknown
  const envelope = requireRecord(parsed, 'web save envelope')
  if (envelope.format !== WEB_SAVE_FORMAT) {
    throw new Error(`Unsupported web save envelope ${String(envelope.format)}.`)
  }
  if (
    typeof envelope.schema !== 'number' ||
    !Number.isInteger(envelope.schema) ||
    envelope.schema < 0
  ) {
    throw new Error('Canonical web save envelope has an invalid schema.')
  }
  const state = requireRecord(
    decodeValue(
      envelope.state,
      {
        decodedBytes: 0,
        containers: 0,
        entries: 0,
        decodedByteLimit: limits.decodedPayloadBytes,
      },
      0,
    ),
    'web save state',
  )
  if (state.saveVersion !== envelope.schema) {
    throw new Error(
      `Web save envelope schema ${envelope.schema} does not match state schema ${String(state.saveVersion)}.`,
    )
  }
  return state
}

function decodeCompressedEnvelope(
  payload: string,
  limits: Readonly<SaveImportLimits>,
): string {
  if (payload.length === 0) {
    throw new Error('Canonical web save payload is empty.')
  }
  const compressed = decodeBase64Payload(
    payload,
    limits.decodedPayloadBytes,
  )
  const inflated = gunzipBounded(
    compressed,
    limits.inflatedBinaryBytes,
  )
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(inflated)
  } catch {
    throw new Error('Canonical web save contains invalid UTF-8 JSON.')
  }
}

function decodeBase64Payload(value: string, limitBytes: number): Uint8Array {
  const decodedLength = base64DecodedLength(value)
  if (decodedLength > limitBytes) {
    throw new SaveImportLimitError('decoded-payload', limitBytes)
  }
  let binary: string
  try {
    binary = atob(value)
  } catch {
    throw new Error('Canonical web save payload is not valid base64.')
  }
  const decoded = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    decoded[index] = binary.charCodeAt(index)
  }
  return decoded
}

function gunzipBounded(compressed: Uint8Array, limitBytes: number): Uint8Array {
  if (compressed.byteLength < 18) {
    throw new Error('Canonical web save contains invalid gzip data.')
  }
  const advertisedBytes = new DataView(
    compressed.buffer,
    compressed.byteOffset + compressed.byteLength - 4,
    4,
  ).getUint32(0, true)
  if (advertisedBytes > limitBytes) {
    throw new SaveImportLimitError('inflated-binary', limitBytes)
  }

  const output = new Uint8Array(advertisedBytes)
  let emittedBytes = 0
  const gunzip = new Gunzip((chunk) => {
    const nextEmittedBytes = emittedBytes + chunk.byteLength
    if (
      chunk.byteLength > MAXIMUM_GZIP_CALLBACK_BYTES ||
      nextEmittedBytes > limitBytes
    ) {
      throw new SaveImportLimitError('inflated-binary', limitBytes)
    }
    if (nextEmittedBytes > advertisedBytes) {
      throw new Error(
        'Canonical web save gzip output exceeds its advertised size.',
      )
    }
    output.set(chunk, emittedBytes)
    emittedBytes = nextEmittedBytes
  })
  for (
    let offset = 0;
    offset < compressed.byteLength;
    offset += GZIP_INPUT_CHUNK_BYTES
  ) {
    const end = Math.min(
      compressed.byteLength,
      offset + GZIP_INPUT_CHUNK_BYTES,
    )
    gunzip.push(
      compressed.subarray(offset, end),
      end === compressed.byteLength,
    )
  }
  if (emittedBytes !== advertisedBytes) {
    throw new Error(
      'Canonical web save gzip output does not match its advertised size.',
    )
  }
  return output
}

function encodeValue(value: unknown, seen: Set<object>): unknown {
  if (typeof value === 'bigint') return { $bigint: value.toString() }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new Error('Canonical web saves cannot contain non-finite or negative-zero numbers.')
    }
    return value
  }
  if (
    value === undefined ||
    typeof value === 'function' ||
    typeof value === 'symbol'
  ) {
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
    if (
      sourceKeys.length === 1 &&
      (sourceKeys[0] === '$bigint' || sourceKeys[0] === '$bytes')
    ) {
      throw new Error('Canonical web saves cannot contain objects that collide with reserved codec tags.')
    }
  }
  if (seen.has(value)) throw new Error('Canonical web saves cannot contain reference cycles.')
  seen.add(value)
  const encoded = Array.isArray(value)
    ? Array.from(value, (entry) => encodeValue(entry, seen))
    : sortObject(
        Object.fromEntries(
          Object.entries(value).map(([key, entry]) => [
            key,
            encodeValue(entry, seen),
          ]),
        ),
      )
  seen.delete(value)
  return encoded
}

interface WebSaveDecodeBudget {
  decodedBytes: number
  containers: number
  entries: number
  readonly decodedByteLimit: number
}

function decodeValue(
  value: unknown,
  budget: WebSaveDecodeBudget,
  depth: number,
): unknown {
  if (depth > MAXIMUM_DECODE_DEPTH) {
    throw new Error(
      `Canonical web save exceeds the maximum decode depth of ${MAXIMUM_DECODE_DEPTH}.`,
    )
  }
  if (Array.isArray(value)) {
    consumeContainerBudget(value.length, budget)
    return value.map((entry) =>
      decodeValue(entry, budget, depth + 1),
    )
  }
  if (value === null || typeof value !== 'object') return value
  const record = value as Record<string, unknown>
  const entries = Object.entries(record)
  consumeContainerBudget(entries.length, budget)
  if (
    entries.length === 1 &&
    typeof record.$bigint === 'string'
  ) {
    return BigInt(record.$bigint)
  }
  if (
    entries.length === 1 &&
    typeof record.$bytes === 'string'
  ) {
    return decodeBase64(record.$bytes, budget)
  }
  return Object.fromEntries(
    entries.map(([key, entry]) => [
      key,
      decodeValue(entry, budget, depth + 1),
    ]),
  )
}

function consumeContainerBudget(
  entries: number,
  budget: WebSaveDecodeBudget,
): void {
  budget.containers += 1
  budget.entries += entries
  if (budget.containers > MAXIMUM_DECODE_CONTAINERS) {
    throw new Error(
      `Canonical web save exceeds the maximum container count of ${MAXIMUM_DECODE_CONTAINERS}.`,
    )
  }
  if (budget.entries > MAXIMUM_DECODE_ENTRIES) {
    throw new Error(
      `Canonical web save exceeds the maximum entry count of ${MAXIMUM_DECODE_ENTRIES}.`,
    )
  }
}

function sortObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    ),
  ) as T
}

function encodeBase64(value: Uint8Array): string {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decodeBase64(
  value: string,
  budget: WebSaveDecodeBudget,
): Uint8Array {
  const decodedLength = base64DecodedLength(value)
  if (
    budget.decodedBytes + decodedLength >
    budget.decodedByteLimit
  ) {
    throw new SaveImportLimitError(
      'decoded-payload',
      budget.decodedByteLimit,
    )
  }
  budget.decodedBytes += decodedLength

  let binary: string
  try {
    binary = atob(value)
  } catch {
    throw new Error('Canonical web save contains invalid base64 bytes.')
  }
  const decoded = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    decoded[index] = binary.charCodeAt(index)
  }
  return decoded
}

function base64DecodedLength(value: string): number {
  if (value.length % 4 === 1) {
    throw new Error('Canonical web save contains invalid base64 bytes.')
  }
  const padding =
    value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  return Math.floor((value.length * 3) / 4) - padding
}
