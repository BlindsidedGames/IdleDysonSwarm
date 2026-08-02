import { requireRecord, type SaveRecord } from './graph'
import {
  assertSuppliedSaveTextLimit,
  DEFAULT_SAVE_IMPORT_LIMITS,
  SaveImportLimitError,
  type SaveImportLimits,
} from './decodeIdb1'

const WEB_SAVE_FORMAT = 'IDSWEB1'
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
  return `${JSON.stringify(sortObject({ ...envelope }), null, 2)}\n`
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
  const parsed = JSON.parse(text) as unknown
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

function encodeValue(value: unknown, seen: Set<object>): unknown {
  if (typeof value === 'bigint') return { $bigint: value.toString() }
  if (value instanceof Uint8Array) return { $bytes: encodeBase64(value) }
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) throw new Error('Canonical web saves cannot contain reference cycles.')
  seen.add(value)
  const encoded = Array.isArray(value)
    ? value.map((entry) => encodeValue(entry, seen))
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
