import {
  assertSuppliedSaveTextLimit,
  DEFAULT_SAVE_IMPORT_LIMITS,
  type SaveImportLimits,
} from './decodeIdb1'
import {
  decodeCompressedWebSaveEnvelope,
  deserializeWebSaveBounded,
  deserializeWebSaveJsonBounded,
  WEB_SAVE_PREFIX,
} from './serialization'
import {
  LEGACY_V1_SAVE_SCHEMA,
  UnsupportedFutureSaveSchemaError,
} from './migrate'
import type { SaveRecord } from './graph'

const MAXIMUM_PROBE_DEPTH = 128
const MAXIMUM_PROBE_CONTAINERS = 100_000
const MAXIMUM_PROBE_ENTRIES = 250_000
const numberPattern = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y
const containerValue = Symbol('IDSWEB1 container value')

type ProbeScalar = string | number | boolean | null | typeof containerValue

export type IdsWeb1SchemaProbe = Readonly<{
  kind: 'legacy' | 'web-native' | 'unrecognized'
  schema: number | null
  modelVersion: number | null
  inflatedJson: string
}>

interface ProbeBudget {
  containers: number
  entries: number
}

/**
 * Reads only enough of a bounded IDSWEB1 document to identify its outer save
 * schema. It does not validate, decode, or construct gameplay state.
 */
export function probeIdsWeb1SchemaBounded(
  text: string,
  limits: Readonly<SaveImportLimits> = DEFAULT_SAVE_IMPORT_LIMITS,
): IdsWeb1SchemaProbe | null {
  assertSuppliedSaveTextLimit(text, limits)
  const trimmed = text.trim()
  if (!trimmed.toUpperCase().startsWith(WEB_SAVE_PREFIX)) return null

  const inflatedJson = decodeCompressedWebSaveEnvelope(
    trimmed.slice(WEB_SAVE_PREFIX.length),
    limits,
  )
  const fields = scanTopLevelFields(inflatedJson)
  const legacySchema = nonNegativeInteger(fields.get('schema'))
  const schemaVersion = nonNegativeInteger(fields.get('schemaVersion'))
  const modelVersion = nonNegativeInteger(fields.get('modelVersion'))
  const legacy = fields.get('format') === 'IDSWEB1' && legacySchema !== null
  const webNative = schemaVersion !== null && modelVersion !== null

  if (legacy && webNative) {
    throw new Error('IDSWEB1 save has an ambiguous schema envelope.')
  }
  if (legacy) {
    return Object.freeze({
      kind: 'legacy',
      schema: legacySchema,
      modelVersion: null,
      inflatedJson,
    })
  }
  if (webNative) {
    return Object.freeze({
      kind: 'web-native',
      schema: schemaVersion,
      modelVersion,
      inflatedJson,
    })
  }
  return Object.freeze({
    kind: 'unrecognized',
    schema: null,
    modelVersion: null,
    inflatedJson,
  })
}

/**
 * Live schema-12 entrypoint. Future Web-native envelopes are rejected before
 * the legacy graph decoder can misclassify them as corrupt saves.
 */
export function deserializeCurrentWebSaveBounded(
  text: string,
  limits: Readonly<SaveImportLimits> = DEFAULT_SAVE_IMPORT_LIMITS,
): SaveRecord {
  const probe = probeIdsWeb1SchemaBounded(text, limits)
  if (
    probe?.schema !== null &&
    probe?.schema !== undefined &&
    probe.schema > LEGACY_V1_SAVE_SCHEMA
  ) {
    throw new UnsupportedFutureSaveSchemaError(
      probe.schema,
      LEGACY_V1_SAVE_SCHEMA,
    )
  }
  return probe === null
    ? deserializeWebSaveBounded(text, limits)
    : deserializeWebSaveJsonBounded(probe.inflatedJson, limits)
}

function nonNegativeInteger(value: ProbeScalar | undefined): number | null {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0
    ? value
    : null
}

function scanTopLevelFields(json: string): Map<string, ProbeScalar> {
  let index = 0
  const budget: ProbeBudget = { containers: 0, entries: 0 }
  const topLevel = new Map<string, ProbeScalar>()

  function skipWhitespace(): void {
    while (
      json[index] === ' ' ||
      json[index] === '\n' ||
      json[index] === '\r' ||
      json[index] === '\t'
    ) {
      index += 1
    }
  }

  function parseString(): string {
    const start = index
    index += 1
    while (index < json.length) {
      const code = json.charCodeAt(index)
      if (json[index] === '"') {
        index += 1
        try {
          return JSON.parse(json.slice(start, index)) as string
        } catch {
          throw new Error('IDSWEB1 schema probe found invalid JSON string syntax.')
        }
      }
      if (json[index] === '\\') {
        index += 2
        continue
      }
      if (code <= 0x1f) {
        throw new Error('IDSWEB1 schema probe found invalid JSON string syntax.')
      }
      index += 1
    }
    throw new Error('IDSWEB1 schema probe found an unterminated JSON string.')
  }

  function parseNumber(): number {
    numberPattern.lastIndex = index
    const match = numberPattern.exec(json)
    if (match === null) {
      throw new Error('IDSWEB1 schema probe found invalid JSON number syntax.')
    }
    index = numberPattern.lastIndex
    const value = Number(match[0])
    if (!Number.isFinite(value)) {
      throw new Error('IDSWEB1 schema probe requires finite JSON numbers.')
    }
    return value
  }

  function parseArray(depth: number): typeof containerValue {
    consumeContainer(budget)
    index += 1
    skipWhitespace()
    if (json[index] === ']') {
      index += 1
      return containerValue
    }
    while (true) {
      consumeEntry(budget)
      parseValue(depth + 1)
      skipWhitespace()
      if (json[index] === ']') {
        index += 1
        return containerValue
      }
      if (json[index] !== ',') {
        throw new Error('IDSWEB1 schema probe found invalid JSON array syntax.')
      }
      index += 1
      skipWhitespace()
    }
  }

  function parseObject(
    depth: number,
    captureTopLevel: boolean,
  ): typeof containerValue {
    consumeContainer(budget)
    index += 1
    skipWhitespace()
    const keys = captureTopLevel ? new Set<string>() : null
    if (json[index] === '}') {
      index += 1
      return containerValue
    }
    while (true) {
      if (json[index] !== '"') {
        throw new Error('IDSWEB1 schema probe found an invalid object key.')
      }
      const key = parseString()
      if (keys?.has(key)) {
        throw new Error('IDSWEB1 schema probe found a duplicate object key.')
      }
      if (captureTopLevel && isPrototypePollutingKey(key)) {
        throw new Error('IDSWEB1 schema probe found a forbidden object key.')
      }
      keys?.add(key)
      consumeEntry(budget)
      skipWhitespace()
      if (json[index] !== ':') {
        throw new Error('IDSWEB1 schema probe found invalid JSON object syntax.')
      }
      index += 1
      const value = parseValue(depth + 1)
      if (captureTopLevel) topLevel.set(key, value)
      skipWhitespace()
      if (json[index] === '}') {
        index += 1
        return containerValue
      }
      if (json[index] !== ',') {
        throw new Error('IDSWEB1 schema probe found invalid JSON object syntax.')
      }
      index += 1
      skipWhitespace()
    }
  }

  function parseValue(depth: number): ProbeScalar {
    if (depth > MAXIMUM_PROBE_DEPTH) {
      throw new Error('IDSWEB1 schema probe exceeds the maximum decode depth.')
    }
    skipWhitespace()
    const token = json[index]
    if (token === '"') return parseString()
    if (token === '{') return parseObject(depth, depth === 0)
    if (token === '[') return parseArray(depth)
    if (json.startsWith('true', index)) {
      index += 4
      return true
    }
    if (json.startsWith('false', index)) {
      index += 5
      return false
    }
    if (json.startsWith('null', index)) {
      index += 4
      return null
    }
    if (token === '-' || (token !== undefined && /[0-9]/u.test(token))) {
      return parseNumber()
    }
    throw new Error('IDSWEB1 schema probe found invalid JSON syntax.')
  }

  skipWhitespace()
  if (json[index] !== '{') {
    throw new Error('IDSWEB1 schema probe requires a top-level object.')
  }
  parseObject(0, true)
  skipWhitespace()
  if (index !== json.length) {
    throw new Error('IDSWEB1 schema probe found trailing JSON content.')
  }
  return topLevel
}

function consumeContainer(budget: ProbeBudget): void {
  budget.containers += 1
  if (budget.containers > MAXIMUM_PROBE_CONTAINERS) {
    throw new Error('IDSWEB1 schema probe exceeds the maximum container count.')
  }
}

function consumeEntry(budget: ProbeBudget): void {
  budget.entries += 1
  if (budget.entries > MAXIMUM_PROBE_ENTRIES) {
    throw new Error('IDSWEB1 schema probe exceeds the maximum entry count.')
  }
}

function isPrototypePollutingKey(value: string): boolean {
  return (
    value === '__proto__' ||
    value === 'constructor' ||
    value === 'prototype'
  )
}
