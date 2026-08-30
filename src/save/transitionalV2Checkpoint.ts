import {
  assertSuppliedSaveTextLimit,
  decodeBase64Bounded,
  DEFAULT_SAVE_IMPORT_LIMITS,
  gunzipBounded,
} from './decodeIdb1'
import { requireRecord, type SaveRecord } from './graph'
import { PreparedSave } from './prepare'
import {
  dehydrateGameState,
  hydrateGameState,
} from '../game-state/mapping'
import type {
  CanonicalGameStateV1,
  StatisticsWindowState,
} from '../game-state/types'

const CHECKPOINT_FORMAT = 'ids-web-production-v2-checkpoint-v1'
const PORTABLE_PREFIX = 'IDSWEB1:'
const MIGRATED_REVISION_FIELD =
  'transitionalProductionV2CheckpointRevision'

interface TransitionalCheckpoint {
  readonly revision: number
  readonly portableSave: string
}

/**
 * Recovers the numeric-model V2 checkpoint used by the short-lived Web
 * migration branch. The supplied base retains the original Unity graph and
 * fields that V2 did not own. Conversion fails closed when a V2 decimal cannot
 * be represented by the current field's exact number or bigint authority.
 */
export function recoverTransitionalV2Checkpoint(
  text: string,
  base: PreparedSave,
): PreparedSave | null {
  const checkpoint = decodeCheckpoint(text)
  if (checkpoint === null) return null
  const baseSource = base.copyValidatedState()
  if (
    toSafeIntegerOrNull(baseSource[MIGRATED_REVISION_FIELD]) !== null &&
    Number(baseSource[MIGRATED_REVISION_FIELD]) >= checkpoint.revision
  ) return null

  const dto = decodePortableSave(checkpoint.portableSave)
  const state = requireRecord(dto.state, 'schema 13 state')
  const session = hydrateGameState(base)
  const compatibleSource = withV1LedgerFields(state)
  const converted = convertCompatibleState(
    compatibleSource,
    session.state,
  )
  const prepared = dehydrateGameState(session, converted)
  const source = prepared.copyValidatedState()
  source[MIGRATED_REVISION_FIELD] = checkpoint.revision

  const skills = requireRecord(state.skills, 'schema 13 skills')
  const selectedPreset = toSafeIntegerOrNull(skills.selectedPreset)
  if (selectedPreset !== null && selectedPreset >= 1 && selectedPreset <= 5) {
    requireRecord(source.dysonVerseSaveData, 'Dyson save').selectedPreset =
      selectedPreset
  }
  return PreparedSave.fromDecoded(source)
}

function decodeCheckpoint(text: string): TransitionalCheckpoint | null {
  assertSuppliedSaveTextLimit(text)
  let parsed: unknown
  try {
    parsed = JSON.parse(text.trim())
  } catch {
    return null
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null
  }
  const record = parsed as Record<string, unknown>
  if (record.format !== CHECKPOINT_FORMAT) return null
  if (
    !Number.isSafeInteger(record.revision) ||
    Number(record.revision) < 0 ||
    typeof record.portableSave !== 'string'
  ) {
    throw new Error('Transitional V2 checkpoint metadata is invalid.')
  }
  return Object.freeze({
    revision: Number(record.revision),
    portableSave: record.portableSave,
  })
}

function decodePortableSave(text: string): SaveRecord {
  assertSuppliedSaveTextLimit(text)
  const trimmed = text.trim()
  if (!trimmed.startsWith(PORTABLE_PREFIX)) {
    throw new Error('Transitional V2 portable save has no IDSWEB1 envelope.')
  }
  const compressed = decodeBase64Bounded(
    trimmed.slice(PORTABLE_PREFIX.length),
    DEFAULT_SAVE_IMPORT_LIMITS.decodedPayloadBytes,
    'transitional V2 IDSWEB1',
  )
  const inflated = gunzipBounded(
    compressed,
    DEFAULT_SAVE_IMPORT_LIMITS.inflatedBinaryBytes,
    (bytes) => new Uint8Array(bytes),
    undefined,
    'transitional V2 IDSWEB1',
  )
  let json: string
  try {
    json = new TextDecoder('utf-8', { fatal: true }).decode(inflated)
  } catch {
    throw new Error('Transitional V2 save contains invalid UTF-8 JSON.')
  }
  const dto = requireRecord(JSON.parse(json), 'schema 13 portable save')
  if (dto.schemaVersion !== 13 || dto.modelVersion !== 2) {
    throw new Error('Transitional V2 save has an unsupported schema or model.')
  }
  return dto
}

function withV1LedgerFields(state: SaveRecord): SaveRecord {
  const compatible = { ...state }
  const infinity = requireRecord(state.infinity, 'schema 13 Infinity state')
  const availablePoints = decimalInteger(infinity.availablePoints)
  const allocatedPoints = decimalInteger(infinity.allocatedPoints)
  compatible.infinity = {
    ...infinity,
    points: availablePoints + allocatedPoints,
    spentPoints: allocatedPoints,
  }
  const quantum = requireRecord(state.quantum, 'schema 13 Quantum state')
  const availableShards = decimalInteger(quantum.availableShards)
  const lifetimeEarnedShards = decimalInteger(
    quantum.lifetimeEarnedShards,
  )
  if (availableShards > lifetimeEarnedShards) {
    throw new Error('Transitional V2 Quantum ledger is inconsistent.')
  }
  compatible.quantum = {
    ...quantum,
    pointsEarned: lifetimeEarnedShards,
    pointsSpent: lifetimeEarnedShards - availableShards,
  }
  return compatible
}

function convertCompatibleState(
  source: SaveRecord,
  base: CanonicalGameStateV1,
): CanonicalGameStateV1 {
  return convertLike(source, base, '$') as CanonicalGameStateV1
}

function convertLike(source: unknown, base: unknown, path: string): unknown {
  if (typeof base === 'bigint') return decimalInteger(source)
  if (typeof base === 'number') return finiteNonNegativeNumber(source, path)
  if (typeof base === 'boolean') {
    if (typeof source !== 'boolean') throw new TypeError(`${path} must be boolean.`)
    return source
  }
  if (typeof base === 'string') {
    if (typeof source !== 'string') throw new TypeError(`${path} must be text.`)
    return source
  }
  if (base === null) {
    if (source !== null && typeof source !== 'string') {
      throw new TypeError(`${path} must be nullable text.`)
    }
    return source
  }
  if (Array.isArray(base)) {
    if (!Array.isArray(source)) throw new TypeError(`${path} must be an array.`)
    if (isStatisticsWindowPath(path)) {
      return source.map((entry, index) =>
        convertStatisticsWindow(entry, `${path}.${index}`),
      )
    }
    if (base.length === 0) {
      return source.map((entry) => copyPrimitive(entry, path))
    }
    return source.map((entry, index) =>
      convertLike(entry, base[index] ?? base[0], `${path}.${index}`),
    )
  }
  if (base !== null && typeof base === 'object') {
    const sourceRecord = requireRecord(source, path)
    return Object.fromEntries(
      Object.entries(base).map(([key, baseValue]) => [
        key,
        Object.prototype.hasOwnProperty.call(sourceRecord, key)
          ? convertLike(sourceRecord[key], baseValue, `${path}.${key}`)
          : baseValue,
      ]),
    )
  }
  return base
}

function convertStatisticsWindow(
  value: unknown,
  path: string,
): StatisticsWindowState {
  const source = requireRecord(value, path)
  return {
    sequence: decimalInteger(source.sequence),
    simulatedSeconds: finiteNonNegativeNumber(
      source.simulatedSeconds,
      `${path}.simulatedSeconds`,
    ),
    infinityCount: decimalInteger(source.infinityCount),
    infinityPoints: decimalInteger(source.infinityPoints),
    dreamResetCount: decimalInteger(source.dreamResetCount),
    strangeMatter: finiteNonNegativeNumber(
      source.strangeMatter,
      `${path}.strangeMatter`,
    ),
    realityWorkers: decimalInteger(source.realityWorkers),
  }
}

function isStatisticsWindowPath(path: string): boolean {
  return (
    path.endsWith('.minuteWindows') ||
    path.endsWith('.halfHourWindows') ||
    path.endsWith('.dailyWindows')
  )
}

function copyPrimitive(value: unknown, path: string): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0))
  ) return value
  throw new TypeError(`${path} contains an unsupported empty-array entry.`)
}

function finiteNonNegativeNumber(value: unknown, path: string): number {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number) || number < 0 || Object.is(number, -0)) {
    throw new RangeError(`${path} cannot be represented as a finite non-negative number.`)
  }
  return number
}

function decimalInteger(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError('Transitional V2 integer is not exact.')
    }
    return BigInt(value)
  }
  if (typeof value !== 'string' || value.length > 65_536) {
    throw new TypeError('Transitional V2 integer has an invalid encoding.')
  }
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/u.exec(value)
  if (match === null) {
    throw new TypeError('Transitional V2 integer has an invalid decimal encoding.')
  }
  const fraction = match[2] ?? ''
  const exponent = Number(match[3] ?? 0)
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 65_536) {
    throw new RangeError('Transitional V2 integer exponent is out of range.')
  }
  let digits = `${match[1]}${fraction}`.replace(/^0+(?=\d)/u, '')
  const scale = exponent - fraction.length
  if (scale >= 0) {
    digits += '0'.repeat(scale)
  } else {
    const fractionalDigits = -scale
    if (
      fractionalDigits > digits.length ||
      !digits.endsWith('0'.repeat(fractionalDigits))
    ) {
      throw new RangeError('Transitional V2 integer contains a fractional value.')
    }
    digits = digits.slice(0, digits.length - fractionalDigits) || '0'
  }
  return BigInt(digits)
}

function toSafeIntegerOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null
}
