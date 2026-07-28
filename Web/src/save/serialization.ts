import { requireRecord, type SaveRecord } from './graph'

const WEB_SAVE_FORMAT = 'IDSWEB1'

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
  const state = requireRecord(decodeValue(envelope.state), 'web save state')
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

function decodeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeValue)
  if (value === null || typeof value !== 'object') return value
  const record = value as Record<string, unknown>
  if (
    Object.keys(record).length === 1 &&
    typeof record.$bigint === 'string'
  ) {
    return BigInt(record.$bigint)
  }
  if (
    Object.keys(record).length === 1 &&
    typeof record.$bytes === 'string'
  ) {
    return decodeBase64(record.$bytes)
  }
  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => [key, decodeValue(entry)]),
  )
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

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}
