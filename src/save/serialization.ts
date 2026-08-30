import { Gunzip, gzipSync, strToU8 } from 'fflate'
import { isNonNegativeInteger } from '../core/finiteNonNegativeNumber'
import {
  deepCloneSave,
  isRecord,
  requireRecord,
  type SaveRecord,
} from './graph'
import {
  assertSuppliedSaveTextLimit,
  DEFAULT_SAVE_IMPORT_LIMITS,
  GZIP_INPUT_CHUNK_BYTES,
  MAXIMUM_GZIP_CALLBACK_BYTES,
  SaveImportLimitError,
  type SaveImportLimits,
} from './decodeIdb1'
import { assertGzipTrailerIntegrity } from './gzipIntegrity'
import { packSettingsFlags } from './settingsFlags'
import {
  TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD,
  TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD,
} from './transitionalV2Retirement'

const WEB_SAVE_FORMAT = 'IDSWEB1'
const WEB_SAVE_PREFIX = `${WEB_SAVE_FORMAT}:`
const MAXIMUM_DECODE_DEPTH = 128
const MAXIMUM_DECODE_CONTAINERS = 100_000
const MAXIMUM_DECODE_ENTRIES = 250_000

interface EncodedWebSave {
  readonly format: typeof WEB_SAVE_FORMAT
  readonly schema: number
  readonly state: unknown
}

export type DecodedWebSaveText =
  | Readonly<{
      kind: 'canonical'
      state: SaveRecord
    }>
  | Readonly<{
      kind: 'unsupported-envelope'
      envelope: SaveRecord
      canonicalError: Error
    }>

export function serializeWebSave(save: SaveRecord): string {
  const schema = Number(save.saveVersion)
  if (!isNonNegativeInteger(schema)) {
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
  shareable.cheater = false
  shareable.unlockAllTabs = false
  // Number notation is versioned device-local presentation state. Legacy
  // Unity/Web graph data may still contain this field for migration input,
  // but a portable share must never carry the sender's selection.
  delete shareable.numberFormatting
  delete shareable.hidePurchased
  // These local recovery proofs refer to retired files on the exporting
  // device. A receiver must never authorize its sidecar from sender claims.
  delete shareable[TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD]
  delete shareable[TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD]
  if (isRecord(shareable.bottomNavigationPreferences)) {
    delete shareable.bottomNavigationPreferences.size
  }
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
  const decoded = decodeWebSaveTextBounded(text, limits)
  if (decoded.kind === 'unsupported-envelope') {
    throw decoded.canonicalError
  }
  return decoded.state
}

/**
 * Performs the bounded IDSWEB1 transport decode exactly once and classifies
 * the parsed envelope before applying the canonical value codec. Historical
 * schema adapters can consume the unsupported parsed envelope without a
 * second synchronous base64/gzip/CRC/JSON pass.
 */
export function decodeWebSaveTextBounded(
  text: string,
  limits: Readonly<SaveImportLimits>,
): DecodedWebSaveText {
  assertSuppliedSaveTextLimit(text, limits)
  const trimmed = text.trim()
  const json = trimmed.toUpperCase().startsWith(WEB_SAVE_PREFIX)
    ? decodeCompressedEnvelope(
        trimmed.slice(WEB_SAVE_PREFIX.length),
        limits,
      )
    : trimmed
  const parsed = parseBoundedJsonText(json)
  const envelope = requireRecord(parsed, 'web save envelope')
  if (envelope.format !== WEB_SAVE_FORMAT) {
    return Object.freeze({
      kind: 'unsupported-envelope',
      envelope,
      canonicalError: new Error(
        `Unsupported web save envelope ${String(envelope.format)}.`,
      ),
    })
  }
  if (!isNonNegativeInteger(envelope.schema)) {
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
  return Object.freeze({ kind: 'canonical', state })
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

interface JsonParseBudget {
  containers: number
  entries: number
}

/**
 * Parses the transport JSON while retaining evidence that JSON.parse would
 * discard, notably duplicate-equivalent object keys. The raw syntax tree uses
 * the same structural budgets as reconstructed canonical values so an
 * unsupported historical envelope cannot bypass them before classification.
 */
export function parseBoundedJsonText(text: string): unknown {
  let index = 0
  const budget: JsonParseBudget = { containers: 0, entries: 0 }
  const numberPattern =
    /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y

  function skipWhitespace(): void {
    while (
      text[index] === ' ' ||
      text[index] === '\n' ||
      text[index] === '\r' ||
      text[index] === '\t'
    ) {
      index += 1
    }
  }

  function parseString(): string {
    const start = index
    let containsEscape = false
    index += 1
    while (index < text.length) {
      const code = text.charCodeAt(index)
      if (text[index] === '"') {
        index += 1
        if (!containsEscape) {
          return text.slice(start + 1, index - 1)
        }
        try {
          return JSON.parse(text.slice(start, index)) as string
        } catch {
          throw new Error(
            'Canonical web save contains invalid JSON string syntax.',
          )
        }
      }
      if (text[index] === '\\') {
        containsEscape = true
        index += 2
        continue
      }
      if (code <= 0x1f) {
        throw new Error(
          'Canonical web save contains invalid JSON string syntax.',
        )
      }
      index += 1
    }
    throw new Error('Canonical web save contains an unterminated JSON string.')
  }

  function parseNumber(): number {
    numberPattern.lastIndex = index
    const match = numberPattern.exec(text)
    if (match === null) {
      throw new Error('Canonical web save contains invalid JSON number syntax.')
    }
    index = numberPattern.lastIndex
    const value = Number(match[0])
    if (!Number.isFinite(value)) {
      throw new Error('Canonical web save JSON numbers must be finite.')
    }
    return value
  }

  function parseArray(depth: number): unknown[] {
    consumeJsonContainerBudget(budget)
    index += 1
    skipWhitespace()
    const output: unknown[] = []
    if (text[index] === ']') {
      index += 1
      return output
    }
    while (true) {
      consumeJsonEntryBudget(budget)
      output.push(parseValue(depth + 1))
      skipWhitespace()
      if (text[index] === ']') {
        index += 1
        return output
      }
      if (text[index] !== ',') {
        throw new Error('Canonical web save contains invalid JSON array syntax.')
      }
      index += 1
      skipWhitespace()
    }
  }

  function parseObject(depth: number): Record<string, unknown> {
    consumeJsonContainerBudget(budget)
    index += 1
    skipWhitespace()
    const output = Object.create(null) as Record<string, unknown>
    const keys = new Set<string>()
    if (text[index] === '}') {
      index += 1
      return output
    }
    while (true) {
      if (text[index] !== '"') {
        throw new Error(
          'Canonical web save contains an invalid JSON object key.',
        )
      }
      const key = parseString()
      if (keys.has(key)) {
        throw new Error(
          'Canonical web save contains a duplicate-equivalent object key.',
        )
      }
      if (isPrototypePollutingKey(key)) {
        throw new Error('Canonical web save contains a forbidden object key.')
      }
      keys.add(key)
      consumeJsonEntryBudget(budget)
      skipWhitespace()
      if (text[index] !== ':') {
        throw new Error('Canonical web save contains invalid JSON object syntax.')
      }
      index += 1
      output[key] = parseValue(depth + 1)
      skipWhitespace()
      if (text[index] === '}') {
        index += 1
        return output
      }
      if (text[index] !== ',') {
        throw new Error('Canonical web save contains invalid JSON object syntax.')
      }
      index += 1
      skipWhitespace()
    }
  }

  function parseValue(depth: number): unknown {
    if (depth > MAXIMUM_DECODE_DEPTH) {
      throw new Error(
        `Canonical web save exceeds the maximum decode depth of ${MAXIMUM_DECODE_DEPTH}.`,
      )
    }
    skipWhitespace()
    const token = text[index]
    if (token === '"') return parseString()
    if (token === '{') return parseObject(depth)
    if (token === '[') return parseArray(depth)
    if (text.startsWith('true', index)) {
      index += 4
      return true
    }
    if (text.startsWith('false', index)) {
      index += 5
      return false
    }
    if (text.startsWith('null', index)) {
      index += 4
      return null
    }
    if (
      token === '-' ||
      (token !== undefined && token >= '0' && token <= '9')
    ) {
      return parseNumber()
    }
    throw new Error('Canonical web save contains invalid JSON syntax.')
  }

  const result = parseValue(0)
  skipWhitespace()
  if (index !== text.length) {
    throw new Error('Canonical web save contains trailing JSON content.')
  }
  return result
}

function consumeJsonContainerBudget(budget: JsonParseBudget): void {
  budget.containers += 1
  if (budget.containers > MAXIMUM_DECODE_CONTAINERS) {
    throw new Error(
      `Canonical web save exceeds the maximum container count of ${MAXIMUM_DECODE_CONTAINERS}.`,
    )
  }
}

function consumeJsonEntryBudget(budget: JsonParseBudget): void {
  budget.entries += 1
  if (budget.entries > MAXIMUM_DECODE_ENTRIES) {
    throw new Error(
      `Canonical web save exceeds the maximum entry count of ${MAXIMUM_DECODE_ENTRIES}.`,
    )
  }
}

function isPrototypePollutingKey(value: string): boolean {
  return (
    value === '__proto__' ||
    value === 'constructor' ||
    value === 'prototype'
  )
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
  assertGzipTrailerIntegrity(compressed, output, 'IDSWEB1 payload')
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
