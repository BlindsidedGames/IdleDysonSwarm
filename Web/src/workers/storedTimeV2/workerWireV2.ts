import {
  GAME_DECIMAL_BIGINT_MAX_DIGITS,
  GAME_DECIMAL_ENCODED_MAX_LENGTH,
  gameDecimalFromCanonicalString,
  gameDecimalToCanonicalString,
  isGameDecimal,
  isIntegerGameDecimal,
  type GameDecimal,
} from '../../math/gameDecimal'
import { cloneCanonicalGameStateV2 } from '../../game-state/cloneV2'
import {
  canonicalNumericFieldClassifications,
  canonicalResearchLevelPolicies,
  durableRuntimeNumericClassifications,
  plannedV2OnlyNumericClassifications,
  type DurableRuntimeManifestPath,
  type ExpandClosedV2ManifestPath,
  type IntendedV2ManifestPath,
  type NumericSemanticClass,
} from '../../game-state/numericFieldManifest'
import {
  cloneCanonicalRuntimeSidecarV2,
  type CanonicalRuntimeSidecarV2,
} from '../../game-state/runtimeV2'
import type { CanonicalGameStateV2 } from '../../game-state/typesV2'
import { validateCanonicalGameStateV2 } from '../../game-state/validateV2'

declare const DECIMAL_WIRE_STRING: unique symbol
declare const BIGINT_WIRE_STRING: unique symbol

export type CanonicalDecimalWireStringV2 = string & {
  readonly [DECIMAL_WIRE_STRING]: true
}
export type CanonicalBigIntWireStringV2 = string & {
  readonly [BIGINT_WIRE_STRING]: true
}

export type StoredTimeWireValueV2<T> = T extends GameDecimal
  ? CanonicalDecimalWireStringV2
  : T extends bigint
    ? CanonicalBigIntWireStringV2
    : T extends readonly (infer TEntry)[]
      ? number extends T['length']
        ? readonly StoredTimeWireValueV2<TEntry>[]
        : { readonly [TKey in keyof T]: StoredTimeWireValueV2<T[TKey]> }
      : T extends object
        ? { readonly [TKey in keyof T]: StoredTimeWireValueV2<T[TKey]> }
        : T

export interface StoredTimeWorkerPublicationV2 {
  readonly state: Readonly<CanonicalGameStateV2>
  readonly runtime: Readonly<CanonicalRuntimeSidecarV2>
}

export interface StoredTimeWorkerPublicationDtoV2 {
  readonly state: StoredTimeWireValueV2<CanonicalGameStateV2>
  readonly runtime: StoredTimeWireValueV2<CanonicalRuntimeSidecarV2>
}

interface WorkerWireCaptureBudgetV2 {
  containers: number
  entries: number
  encodedBytes: number
  liveGraphBytes: number
}

export const STORED_TIME_WORKER_WIRE_LIMITS_V2 = Object.freeze({
  // The product ceiling is 8 MiB.  The dormant worker deliberately uses a
  // tighter limit so the decoded JSON and both endpoint graphs have a proved
  // 32 MiB aggregate live-job ceiling.
  encodedBytes: 256 * 1024,
  maximumDepth: 128,
  maximumContainers: 4_096,
  maximumEntries: 16_384,
  maximumStringCodeUnits: 65_536,
  maximumCapturedGraphBytes: 1024 * 1024,
  decimalCharacters: GAME_DECIMAL_ENCODED_MAX_LENGTH,
  bigintDigits: GAME_DECIMAL_BIGINT_MAX_DIGITS,
})
export const STORED_TIME_WORKER_MAXIMUM_FRAME_BYTES_V2 =
  STORED_TIME_WORKER_WIRE_LIMITS_V2.encodedBytes
export const STORED_TIME_WORKER_MAXIMUM_LIVE_JOB_BYTES_V2 = 32 * 1024 * 1024
const MAXIMUM_DECODED_JSON_GRAPH_BYTES_V2 = 8 * 1024 * 1024
const MAXIMUM_CANONICAL_PUBLICATION_GRAPH_BYTES_V2 = 4 * 1024 * 1024
const WORKER_AND_PROTOCOL_OVERHEAD_BYTES_V2 =
  STORED_TIME_WORKER_MAXIMUM_LIVE_JOB_BYTES_V2 -
  2 * STORED_TIME_WORKER_MAXIMUM_FRAME_BYTES_V2 -
  2 * MAXIMUM_DECODED_JSON_GRAPH_BYTES_V2 -
  4 * STORED_TIME_WORKER_WIRE_LIMITS_V2.maximumCapturedGraphBytes -
  2 * MAXIMUM_CANONICAL_PUBLICATION_GRAPH_BYTES_V2
export const STORED_TIME_WORKER_FRAME_MEMORY_BUDGET_V2 = Object.freeze({
  maximumInputFrames: 1,
  maximumCandidateFrames: 1,
  maximumFrameBytes: STORED_TIME_WORKER_MAXIMUM_FRAME_BYTES_V2,
  maximumDecodedJsonGraphs: 2,
  // A descriptor preflight bounds syntax before JSON.parse. 32x the encoded
  // bytes covers UTF-16 source plus worst-case parser nodes for the minimum
  // two-byte container/value syntax accepted by that preflight.
  decodedJsonGraphBytes: MAXIMUM_DECODED_JSON_GRAPH_BYTES_V2,
  maximumCapturedDtoGraphs: 4,
  capturedDtoGraphBytes:
    STORED_TIME_WORKER_WIRE_LIMITS_V2.maximumCapturedGraphBytes,
  maximumCanonicalPublicationGraphs: 2,
  // The closed canonical tree is bounded by the 1 MiB captured graph plus at
  // most 16,384 restored Decimal/bigint nodes and container headers.
  canonicalPublicationGraphBytes: MAXIMUM_CANONICAL_PUBLICATION_GRAPH_BYTES_V2,
  // The exact remainder is reserved for engine objects, MessageChannel tasks,
  // the O(1) scheduler summary, and fixed protocol bookkeeping.
  workerAndProtocolOverheadBytes: WORKER_AND_PROTOCOL_OVERHEAD_BYTES_V2,
  maximumLiveBytes: STORED_TIME_WORKER_MAXIMUM_LIVE_JOB_BYTES_V2,
})

const PROVED_MAXIMUM_LIVE_JOB_BYTES_V2 =
  (STORED_TIME_WORKER_FRAME_MEMORY_BUDGET_V2.maximumInputFrames +
    STORED_TIME_WORKER_FRAME_MEMORY_BUDGET_V2.maximumCandidateFrames) *
      STORED_TIME_WORKER_FRAME_MEMORY_BUDGET_V2.maximumFrameBytes +
  STORED_TIME_WORKER_FRAME_MEMORY_BUDGET_V2.maximumDecodedJsonGraphs *
    STORED_TIME_WORKER_FRAME_MEMORY_BUDGET_V2.decodedJsonGraphBytes +
  STORED_TIME_WORKER_FRAME_MEMORY_BUDGET_V2.maximumCapturedDtoGraphs *
    STORED_TIME_WORKER_FRAME_MEMORY_BUDGET_V2.capturedDtoGraphBytes +
  STORED_TIME_WORKER_FRAME_MEMORY_BUDGET_V2.maximumCanonicalPublicationGraphs *
    STORED_TIME_WORKER_FRAME_MEMORY_BUDGET_V2.canonicalPublicationGraphBytes +
  STORED_TIME_WORKER_FRAME_MEMORY_BUDGET_V2.workerAndProtocolOverheadBytes

if (PROVED_MAXIMUM_LIVE_JOB_BYTES_V2 >
  STORED_TIME_WORKER_MAXIMUM_LIVE_JOB_BYTES_V2) {
  throw new Error('Stored Time worker live-job memory proof exceeds 32 MiB.')
}

export function getProvedStoredTimeWorkerLiveJobBytesV2(): number {
  return PROVED_MAXIMUM_LIVE_JOB_BYTES_V2
}

export interface StoredTimeWorkerLiveJobBudgetV2 {
  readonly liveBytes: number
  reserveInputFrame(frame: ArrayBuffer): () => void
  reserveCandidateFrame(frame: ArrayBuffer): () => void
  releaseFrames(): void
}

/**
 * Executable form of the aggregate main+worker live-data proof. The fixed
 * reservation covers both decoded/captured DTO sides, two canonical
 * publications, and engine/protocol overhead. Only the one input and one
 * candidate transferable may be added concurrently.
 */
export function createStoredTimeWorkerLiveJobBudgetV2(): StoredTimeWorkerLiveJobBudgetV2 {
  const fixedBytes = PROVED_MAXIMUM_LIVE_JOB_BYTES_V2 -
    2 * STORED_TIME_WORKER_MAXIMUM_FRAME_BYTES_V2
  let inputBytes = 0
  let candidateBytes = 0
  let generation = 0
  const reserve = (kind: 'input' | 'candidate', frame: ArrayBuffer) => {
    if (!(frame instanceof ArrayBuffer) ||
      Object.getPrototypeOf(frame) !== ArrayBuffer.prototype ||
      frame.byteLength < 1 ||
      frame.byteLength > STORED_TIME_WORKER_MAXIMUM_FRAME_BYTES_V2) {
      throw new RangeError('Stored Time worker frame cannot enter the live-job budget.')
    }
    if ((kind === 'input' ? inputBytes : candidateBytes) !== 0) {
      throw new Error(`Stored Time worker already owns a live ${kind} frame.`)
    }
    const next = fixedBytes + inputBytes + candidateBytes + frame.byteLength
    if (next > STORED_TIME_WORKER_MAXIMUM_LIVE_JOB_BYTES_V2) {
      throw new RangeError('Stored Time worker live-job data exceeds 32 MiB.')
    }
    const issuedGeneration = generation
    if (kind === 'input') inputBytes = frame.byteLength
    else candidateBytes = frame.byteLength
    let released = false
    return () => {
      if (released || issuedGeneration !== generation) return
      released = true
      if (kind === 'input') inputBytes = 0
      else candidateBytes = 0
    }
  }
  return Object.freeze({
    get liveBytes() { return fixedBytes + inputBytes + candidateBytes },
    reserveInputFrame: (frame: ArrayBuffer) => reserve('input', frame),
    reserveCandidateFrame: (frame: ArrayBuffer) => reserve('candidate', frame),
    releaseFrames: () => {
      generation += 1
      inputBytes = 0
      candidateBytes = 0
    },
  })
}

type WireNumericPaths<T, TPrefix extends string = '$'> =
  T extends CanonicalDecimalWireStringV2 | CanonicalBigIntWireStringV2
    ? TPrefix
    : T extends number
      ? TPrefix
    : T extends readonly (infer TEntry)[]
      ? number extends T['length']
        ? WireNumericPaths<TEntry, `${TPrefix}.*`>
        : {
            [TKey in Exclude<keyof T, keyof readonly unknown[]> & string]:
              WireNumericPaths<T[TKey & keyof T], `${TPrefix}.${TKey}`>
          }[Exclude<keyof T, keyof readonly unknown[]> & string]
      : T extends object
        ? string extends keyof T
          ? WireNumericPaths<T[keyof T], `${TPrefix}.*`>
          : {
              [TKey in keyof T & string]: WireNumericPaths<
                T[TKey],
                `${TPrefix}.${TKey}`
              >
            }[keyof T & string]
        : never

type NormalizePublicationWirePath<TPath extends string> =
  TPath extends `$.state.${infer TRest}` ? `$.${TRest}` : TPath

type WorkerWireNumericPath = NormalizePublicationWirePath<
  WireNumericPaths<StoredTimeWorkerPublicationDtoV2>
>
type ExpectedWorkerWireNumericPath =
  | ExpandClosedV2ManifestPath<IntendedV2ManifestPath>
  | DurableRuntimeManifestPath

export type MissingStoredTimeWorkerWireNumericPath = Exclude<
  ExpectedWorkerWireNumericPath,
  WorkerWireNumericPath
>
export type UnexpectedStoredTimeWorkerWireNumericPath = Exclude<
  WorkerWireNumericPath,
  ExpectedWorkerWireNumericPath
>

const WORKER_WIRE_NUMERIC_PATHS_MATCH_MANIFEST: [
  MissingStoredTimeWorkerWireNumericPath,
  UnexpectedStoredTimeWorkerWireNumericPath,
] extends [never, never]
  ? true
  : never = true
void WORKER_WIRE_NUMERIC_PATHS_MATCH_MANIFEST

const numericEntries = [
  ...canonicalNumericFieldClassifications,
  ...plannedV2OnlyNumericClassifications,
  ...durableRuntimeNumericClassifications,
].filter((entry) => entry.intendedV2Path !== null)

const exactNumericSemanticClasses = new Map<string, NumericSemanticClass>(
  numericEntries.flatMap((entry) =>
    entry.intendedV2Path !== null && !entry.intendedV2Path.includes('*')
      ? [[entry.intendedV2Path, entry.semanticClass] as const]
      : []
  ),
)
const wildcardNumericSemanticClasses = numericEntries.flatMap((entry) => {
  if (entry.intendedV2Path === null || !entry.intendedV2Path.includes('*')) return []
  const expression = entry.intendedV2Path
    .replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
    .replaceAll('\\*', '.+')
  return [Object.freeze({
    expression: new RegExp(`^${expression}$`, 'u'),
    semanticClass: entry.semanticClass,
  })]
})
const researchSemanticClasses = new Map(
  canonicalResearchLevelPolicies.map((policy) => [policy.key, policy.semanticClass]),
)

const decodedPublicationCache = new WeakMap<
  object,
  Readonly<StoredTimeWorkerPublicationV2>
>()

export function encodeStoredTimeWorkerPublicationV2(
  value: unknown,
): Readonly<StoredTimeWorkerPublicationDtoV2> {
  const properties = requireClosedDataObject(
    value,
    ['state', 'runtime'],
    '$',
  )
  const state = cloneCanonicalGameStateV2(
    dataValue(properties, 'state', '$') as Readonly<CanonicalGameStateV2>,
  )
  const runtime = cloneCanonicalRuntimeSidecarV2(
    dataValue(properties, 'runtime', '$') as Readonly<CanonicalRuntimeSidecarV2>,
  )
  const encoded = Object.freeze({
    state: encodeTrustedValue(state, new Set()) as StoredTimeWireValueV2<CanonicalGameStateV2>,
    runtime: encodeTrustedValue(runtime, new Set()) as StoredTimeWireValueV2<CanonicalRuntimeSidecarV2>,
  })
  enforceEncodedBytes(encoded)
  return encoded
}

/**
 * Worker-internal fast path after a caller has already performed full V2
 * validation and frozen publication. Import enforcement keeps it inside the
 * isolated Stored Time boundary.
 */
export function encodeValidatedStoredTimeWorkerPublicationV2(
  value: Readonly<StoredTimeWorkerPublicationV2>,
): Readonly<StoredTimeWorkerPublicationDtoV2> {
  if (!Object.isFrozen(value) || !Object.isFrozen(value.state) ||
    !Object.isFrozen(value.runtime)) {
    throw new TypeError('Validated Stored Time publication must be frozen.')
  }
  const encoded = Object.freeze({
    state: encodeTrustedValue(
      value.state,
      new Set(),
    ) as StoredTimeWireValueV2<CanonicalGameStateV2>,
    runtime: encodeTrustedValue(
      value.runtime,
      new Set(),
    ) as StoredTimeWireValueV2<CanonicalRuntimeSidecarV2>,
  })
  enforceEncodedBytes(encoded)
  return encoded
}

export function decodeStoredTimeWorkerPublicationV2(
  value: unknown,
): Readonly<StoredTimeWorkerPublicationV2> {
  if (value !== null && typeof value === 'object') {
    const cached = decodedPublicationCache.get(value)
    if (cached !== undefined) return cached
  }
  const budget = { containers: 0, entries: 0, encodedBytes: 0, liveGraphBytes: 0 }
  const captured = captureEncodedValue(value, '$', 0, budget, new Set())
  enforceEncodedBytes(captured)
  const root = requireClosedDataObject(captured, ['state', 'runtime'], '$')
  const state = restoreEncodedValue(
    dataValue(root, 'state', '$'),
    '$',
  ) as CanonicalGameStateV2
  const runtime = restoreEncodedValue(
    dataValue(root, 'runtime', '$'),
    '$.runtime',
  ) as CanonicalRuntimeSidecarV2
  const validation = validateCanonicalGameStateV2(state)
  if (!validation.valid) {
    throw new TypeError(
      `Stored Time worker state is invalid: ${validation.errors.join(' ')}`,
    )
  }
  const restored = Object.freeze({
    state: cloneCanonicalGameStateV2(state),
    runtime: cloneCanonicalRuntimeSidecarV2(runtime),
  })
  if (value !== null && typeof value === 'object') {
    decodedPublicationCache.set(value, restored)
  }
  decodedPublicationCache.set(captured as object, restored)
  return restored
}

/**
 * Captures an arbitrary outbound data-only value before structured clone can
 * invoke an enumerable accessor. This helper is also used for protocol DTOs.
 */
export function captureStoredTimeWorkerDataV2(value: unknown): unknown {
  const budget = { containers: 0, entries: 0, encodedBytes: 0, liveGraphBytes: 0 }
  const captured = captureEncodedValue(value, '$', 0, budget, new Set())
  enforceEncodedBytes(captured)
  return captured
}

/** Deterministic hash shared by both sides of the neutral worker boundary. */
export async function hashStoredTimeWorkerWireValueV2(
  value: unknown,
): Promise<string> {
  const captured = captureStoredTimeWorkerDataV2(value)
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalWorkerJsonV2(captured)),
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}

export function encodeStoredTimeWorkerFrameV2(value: unknown): ArrayBuffer {
  const captured = captureStoredTimeWorkerDataV2(value)
  const bytes = new TextEncoder().encode(JSON.stringify(captured))
  if (bytes.byteLength < 1 ||
    bytes.byteLength > STORED_TIME_WORKER_MAXIMUM_FRAME_BYTES_V2) {
    throw new RangeError('Stored Time worker frame exceeds its 256 KiB budget.')
  }
  // TextEncoder creates a tightly sized Uint8Array; returning its buffer avoids
  // a second full-size allocation immediately before transfer detaches it.
  if (bytes.byteOffset !== 0 || bytes.byteLength !== bytes.buffer.byteLength) {
    throw new Error('TextEncoder returned a non-canonical worker frame buffer.')
  }
  return bytes.buffer as ArrayBuffer
}

export function decodeStoredTimeWorkerFrameV2(value: unknown): unknown {
  if (!(value instanceof ArrayBuffer) ||
    Object.getPrototypeOf(value) !== ArrayBuffer.prototype) {
    throw new TypeError('Stored Time worker frame must be an ArrayBuffer.')
  }
  if (value.byteLength < 1 ||
    value.byteLength > STORED_TIME_WORKER_MAXIMUM_FRAME_BYTES_V2) {
    throw new RangeError('Stored Time worker frame exceeds its 256 KiB budget.')
  }
  preflightStoredTimeWorkerJsonBytesV2(new Uint8Array(value))
  let decoded: unknown
  try {
    decoded = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(value))
  } catch {
    throw new TypeError('Stored Time worker frame is not canonical UTF-8 JSON.')
  }
  return captureStoredTimeWorkerDataV2(decoded)
}

function preflightStoredTimeWorkerJsonBytesV2(bytes: Uint8Array): void {
  let depth = 0
  let containers = 0
  let separators = 0
  let stringBytes = 0
  let inString = false
  let escaped = false
  for (const byte of bytes) {
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (byte === 0x5c) {
        escaped = true
      } else if (byte === 0x22) {
        inString = false
        stringBytes = 0
      } else {
        stringBytes += 1
        if (stringBytes >
          STORED_TIME_WORKER_WIRE_LIMITS_V2.maximumStringCodeUnits * 4) {
          throw new RangeError('Stored Time worker frame string exceeds its preflight budget.')
        }
      }
      continue
    }
    if (byte === 0x22) {
      inString = true
      continue
    }
    if (byte === 0x7b || byte === 0x5b) {
      depth += 1
      containers += 1
      if (depth > STORED_TIME_WORKER_WIRE_LIMITS_V2.maximumDepth ||
        containers > STORED_TIME_WORKER_WIRE_LIMITS_V2.maximumContainers) {
        throw new RangeError('Stored Time worker frame exceeds its structural preflight budget.')
      }
    } else if (byte === 0x7d || byte === 0x5d) {
      depth -= 1
      if (depth < 0) {
        throw new TypeError('Stored Time worker frame has invalid JSON structure.')
      }
    } else if (byte === 0x2c || byte === 0x3a) {
      separators += 1
      if (separators > 2 * STORED_TIME_WORKER_WIRE_LIMITS_V2.maximumEntries) {
        throw new RangeError('Stored Time worker frame exceeds its entry preflight budget.')
      }
    }
  }
  if (inString || depth !== 0) {
    throw new TypeError('Stored Time worker frame has invalid JSON structure.')
  }
}

function canonicalWorkerJsonV2(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map(canonicalWorkerJsonV2).join(',')}]`
  }
  const record = value as Readonly<Record<string, unknown>>
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalWorkerJsonV2(record[key])}`
  ).join(',')}}`
}

function encodeTrustedValue(value: unknown, seen: Set<object>): unknown {
  if (isGameDecimal(value)) {
    return gameDecimalToCanonicalString(value) as CanonicalDecimalWireStringV2
  }
  if (typeof value === 'bigint') {
    const encoded = value.toString()
    if (encoded.length > GAME_DECIMAL_BIGINT_MAX_DIGITS) {
      throw new RangeError('Stored Time worker bigint exceeds its digit budget.')
    }
    return encoded as CanonicalBigIntWireStringV2
  }
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) {
    throw new TypeError('Stored Time worker input must be an unaliased tree.')
  }
  seen.add(value)
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => encodeTrustedValue(entry, seen)))
  }
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      encodeTrustedValue(entry, seen),
    ]),
  ))
}

function captureEncodedValue(
  value: unknown,
  path: string,
  depth: number,
  budget: WorkerWireCaptureBudgetV2,
  seen: Set<object>,
): unknown {
  if (depth > STORED_TIME_WORKER_WIRE_LIMITS_V2.maximumDepth) {
    throw new RangeError('Stored Time worker DTO exceeds its depth budget.')
  }
  if (value === null || typeof value === 'boolean') {
    consumeEncodedBytes(budget, value === null ? 4 : value ? 4 : 5)
    consumeLiveGraphBytes(budget, 8)
    return value
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new TypeError(`${path} must be a finite canonical number.`)
    }
    consumeEncodedBytes(budget, JSON.stringify(value).length)
    consumeLiveGraphBytes(budget, 8)
    return value
  }
  if (typeof value === 'string') {
    if (value.length > STORED_TIME_WORKER_WIRE_LIMITS_V2.maximumStringCodeUnits) {
      throw new RangeError(`${path} exceeds the worker string budget.`)
    }
    consumeEncodedBytes(
      budget,
      new TextEncoder().encode(JSON.stringify(value)).byteLength,
    )
    consumeLiveGraphBytes(budget, 24 + value.length * 2)
    return value
  }
  if (typeof value !== 'object') {
    throw new TypeError(`${path} contains an unsupported worker DTO value.`)
  }
  if (seen.has(value)) {
    throw new TypeError(`Stored Time worker DTO must be an unaliased acyclic tree at ${path}.`)
  }
  seen.add(value)
  budget.containers += 1
  consumeLiveGraphBytes(budget, 64)
  if (budget.containers > STORED_TIME_WORKER_WIRE_LIMITS_V2.maximumContainers) {
    throw new RangeError('Stored Time worker DTO exceeds its container budget.')
  }
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      throw new TypeError(`${path} must use the canonical array prototype.`)
    }
    consumeEncodedBytes(budget, 2)
    const descriptors = Object.getOwnPropertyDescriptors(value)
    const keys = Reflect.ownKeys(value)
    if (
      keys.length !== value.length + 1 ||
      keys.some((key) => {
        if (key === 'length') return false
        if (typeof key !== 'string' || !/^(?:0|[1-9]\d*)$/u.test(key)) return true
        const descriptor = descriptors[key]
        return descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)
      })
    ) {
      throw new TypeError(`${path} must be a dense data-only array.`)
    }
    budget.entries += value.length
    consumeLiveGraphBytes(budget, value.length * 16)
    enforceEntryBudget(budget)
    return Object.freeze(Array.from({ length: value.length }, (_, index) => {
      if (index > 0) consumeEncodedBytes(budget, 1)
      return captureEncodedValue(
        dataValue(descriptors, String(index), path),
        `${path}.${index}`,
        depth + 1,
        budget,
        seen,
      )
    }))
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${path} must be a plain worker DTO object.`)
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(value)
  if (keys.some((key) => {
    if (typeof key !== 'string') return true
    const descriptor = descriptors[key]
    return descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)
  })) {
    throw new TypeError(`${path} must contain enumerable string data properties only.`)
  }
  budget.entries += keys.length
  consumeLiveGraphBytes(budget, keys.length * 32)
  enforceEntryBudget(budget)
  consumeEncodedBytes(budget, 2)
  return Object.freeze(Object.fromEntries(keys.map((key, index) => {
    const name = key as string
    if (name.length > STORED_TIME_WORKER_WIRE_LIMITS_V2.maximumStringCodeUnits) {
      throw new RangeError(`${path} contains a key beyond the worker string budget.`)
    }
    if (index > 0) consumeEncodedBytes(budget, 1)
    consumeEncodedBytes(
      budget,
      new TextEncoder().encode(JSON.stringify(name)).byteLength + 1,
    )
    consumeLiveGraphBytes(budget, 24 + name.length * 2)
    return [
      name,
      captureEncodedValue(
        dataValue(descriptors, name, path),
        `${path}.${name}`,
        depth + 1,
        budget,
        seen,
      ),
    ]
  })))
}

function restoreEncodedValue(value: unknown, path: string): unknown {
  if (typeof value === 'string') {
    const semanticClass = semanticClassAt(path)
    if (semanticClass === 'ordinary-decimal' || semanticClass === 'integer-decimal') {
      if (value.length > GAME_DECIMAL_ENCODED_MAX_LENGTH) {
        throw new RangeError(`${path} exceeds the Decimal wire budget.`)
      }
      const decimal = gameDecimalFromCanonicalString(value)
      if (semanticClass === 'integer-decimal' && !isIntegerGameDecimal(decimal)) {
        throw new TypeError(`${path} must encode an integer-valued GameDecimal.`)
      }
      return decimal
    }
    if (semanticClass === 'exact-bigint') {
      if (!/^(?:0|[1-9]\d*)$/u.test(value)) {
        throw new TypeError(`${path} must encode a canonical non-negative bigint.`)
      }
      if (value.length > GAME_DECIMAL_BIGINT_MAX_DIGITS) {
        throw new RangeError(`${path} exceeds the bigint wire budget.`)
      }
      return BigInt(value)
    }
    return value
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry, index) =>
      restoreEncodedValue(entry, `${path}.${index}`),
    ))
  }
  if (value !== null && typeof value === 'object') {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      restoreEncodedValue(entry, `${path}.${key}`),
    ])))
  }
  return value
}

function semanticClassAt(path: string): NumericSemanticClass | undefined {
  if (path.startsWith('$.research.levelsById.')) {
    const id = path.slice('$.research.levelsById.'.length)
    return researchSemanticClasses.get(id)
  }
  return exactNumericSemanticClasses.get(path) ??
    wildcardNumericSemanticClasses.find((entry) => entry.expression.test(path))
      ?.semanticClass
}

function enforceEncodedBytes(value: unknown): void {
  const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength
  if (bytes > STORED_TIME_WORKER_WIRE_LIMITS_V2.encodedBytes) {
    throw new RangeError('Stored Time worker DTO exceeds its encoded byte budget.')
  }
}

function enforceEntryBudget(budget: { entries: number }): void {
  if (budget.entries > STORED_TIME_WORKER_WIRE_LIMITS_V2.maximumEntries) {
    throw new RangeError('Stored Time worker DTO exceeds its entry budget.')
  }
}

function consumeEncodedBytes(
  budget: WorkerWireCaptureBudgetV2,
  bytes: number,
): void {
  budget.encodedBytes += bytes
  if (budget.encodedBytes > STORED_TIME_WORKER_WIRE_LIMITS_V2.encodedBytes) {
    throw new RangeError('Stored Time worker DTO exceeds its encoded byte budget.')
  }
}

function consumeLiveGraphBytes(
  budget: WorkerWireCaptureBudgetV2,
  bytes: number,
): void {
  budget.liveGraphBytes += bytes
  if (budget.liveGraphBytes >
    STORED_TIME_WORKER_WIRE_LIMITS_V2.maximumCapturedGraphBytes) {
    throw new RangeError('Stored Time worker DTO exceeds its live graph budget.')
  }
}

function requireClosedDataObject(
  value: unknown,
  keys: readonly string[],
  path: string,
): Readonly<Record<string, PropertyDescriptor>> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`${path} must be a closed plain object.`)
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const actual = Reflect.ownKeys(value)
  if (
    actual.length !== keys.length ||
    actual.some((key) => {
      if (typeof key !== 'string' || !keys.includes(key)) return true
      const descriptor = descriptors[key]
      return descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)
    })
  ) {
    throw new TypeError(`${path} must contain exactly its declared data fields.`)
  }
  return descriptors
}

function dataValue(
  descriptors: Readonly<Record<string, PropertyDescriptor>>,
  key: string,
  path: string,
): unknown {
  const descriptor = descriptors[key]
  if (descriptor === undefined || !('value' in descriptor)) {
    throw new TypeError(`${path}.${key} must be a data property.`)
  }
  return descriptor.value
}
