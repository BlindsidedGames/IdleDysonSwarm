import {
  assertSuppliedSaveTextLimit,
  DEFAULT_SAVE_IMPORT_LIMITS,
  SaveImportLimitError,
  type SaveImportLimits,
} from './decodeIdb1'
import { requireRecord, type SaveRecord } from './graph'
import { PreparedSave } from './prepare'
import { packSettingsFlags } from './settingsFlags'
import {
  decodeWebSaveTextBounded,
  parseBoundedJsonText,
} from './serialization'
import {
  V2_SCHEMA13_CAPPED_RESEARCH_IDS,
  V2_SCHEMA13_RESEARCH_IDS,
  V2_SCHEMA13_SKILL_IDS,
  v2Schema13NumericEncoding,
} from './transitionalV2Schema13Manifest'
import {
  parseSchema13CanonicalBigInt,
  parseSchema13CanonicalDecimal,
  schema13DecimalToRoundedBigIntAtMost,
  schema13IntegerDecimalToBigIntAtMost,
  validateDecodedSchema13Envelope,
} from './transitionalV2Schema13'
import {
  requireClearedTransitionalV2StoredTimeJob,
  validateRedundantTransitionalV2StoredTimeJob,
} from './transitionalV2StoredTimeJob'
import {
  TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD,
} from './transitionalV2Retirement'
import {
  IncompatibleTransitionalCheckpointError,
  UnreadableTransitionalCheckpointError,
  type TransitionalCheckpointRecoveryContext,
  type TransitionalCheckpointRecoveryResult,
} from './repository'
import {
  dehydrateGameState,
  hydrateGameState,
} from '../game-state/mapping'
import { withDysonSkillEffectEvaluationSnapshot } from '../game-state/skillEffectEvaluationSnapshot'
import {
  DREAM_SPACE_AGE_CONSTANTS,
  runDreamRailgunAutomation,
} from '../simulation/dreamSpaceAge'
import {
  DISCRETE_MAXIMUM,
  SIMULATION_RESOURCE_MAXIMUM,
} from '../simulation/numeric'
import type {
  CanonicalGameStateV1,
  StatisticsWindowState,
} from '../game-state/types'

const CHECKPOINT_FORMAT = 'ids-web-production-v2-checkpoint-v1'
const PORTABLE_PREFIX = 'IDSWEB1:'
const CHECKPOINT_SCANNER_MAXIMUM_DEPTH = 128
const CHECKPOINT_FORMAT_KEY_TOKEN_BYTES = 2 + ('format'.length * 6)
const CHECKPOINT_FORMAT_VALUE_TOKEN_BYTES =
  2 + (CHECKPOINT_FORMAT.length * 6)
const TRANSITIONAL_CHECKPOINT_TEXT_LIMITS = Object.freeze({
  ...DEFAULT_SAVE_IMPORT_LIMITS,
  suppliedTextBytes: 32 * 1024 * 1024,
})
const V2_PRESENTATION_BOOLEAN_FIELDS = Object.freeze([
  'globalMute',
  'screensaverEnabled',
  'hidePurchased',
  'buyMax',
  'skillsBuyOnTap',
  'botsButtonToggle',
  'researchbuttonToggle',
  'skillsButtonToggle',
  'skillsFirstRunDone',
  'infinityButtonToggle',
  'infinityFirstRunDone',
  'realityButtonToggle',
  'realityFirstRun',
  'simulationsButtonToggle',
  'prestigeButtonToggle',
  'prestigeFirstRun',
  'settingsButtonToggle',
  'firstReality',
])

const V2_PLATFORM_BOOLEAN_FIELDS = Object.freeze([
  'debugOptions',
  'debugEverEnabled',
  'cheater',
  'unlockAllTabs',
])

const V2_DYSON_SNAPSHOT_FIELDS = Object.freeze([
  'panelsPerSecond',
  'panelLifetimeSeconds',
  'scienceMultiplier',
  'rudimentarySingularityProduction',
  'pocketDimensionsProduction',
  'scientificPlanetsProduction',
  'managerAssemblyLineProduction',
] as const)

const V2_CAPPED_SIMULATION_RESOURCE_PATHS = new Set([
  '$.dream.resources.dysonPanels',
  '$.dream.resources.swarmPanels',
  '$.dream.railgun.reservedPanels',
  '$.dream.railgun.highestStoredPanels',
])

const V2_ROUNDED_DECIMAL_TO_BIGINT_PATHS = new Set([
  '$.dream.parameters.solarPanelGeneration',
  '$.dream.parameters.fusionGeneration',
  '$.dream.parameters.swarmPanelGeneration',
])

const V2_CAPPED_RESEARCH_IDS = new Set<string>(
  V2_SCHEMA13_CAPPED_RESEARCH_IDS,
)

const V2_AUTHORED_BIGINT_MAXIMUMS = new Map([
  ['$.infinity.breakTarget', 2_147_483_647n],
])

const V2_DREAM_RESET_CAUSES = new Set([
  'Meteor',
  'ArtificialIntelligence',
  'GlobalWarming',
  'BlackHole',
])

const CURRENT_ONLY_STATE_PATHS = new Set([
  '$.modelVersion',
  '$.meta.navigationRouteDiscovery',
  '$.infinity.automaticResetEnabled',
  '$.infinity.currentCyclePeakIpPerMinute',
  '$.infinity.currentCyclePeakReward',
  '$.infinity.manualPeakIpPerMinute',
  '$.infinity.manualPeakReward',
  '$.infinity.manualCalibrationObservedActiveSeconds',
  '$.infinity.activeAutomaticThroughputCycleEligible',
  '$.timeline.processing',
  '$.dream.purchaseBatches',
  '$.statistics.recentInfinityCycles',
  '$.statistics.recentActiveAutomaticInfinityCycles',
])

const V2_NULLABLE_TEXT_PATHS = new Set([
  '$.meta.createdAtLegacyText',
  '$.timeline.lastSuspendedAtLegacyText',
  '$.statistics.lastCompletedCycle.dreamCause',
])

interface TransitionalCheckpoint {
  readonly revision?: number
  readonly portableSave: string
  readonly preferences?: SaveRecord
  readonly platform?: SaveRecord
}

type TransitionalCheckpointMetadata = Omit<
  TransitionalCheckpoint,
  'portableSave'
>

/**
 * Recovers the numeric-model V2 checkpoint used by the short-lived Web
 * migration branch. The supplied base retains the original Unity graph and
 * fields that V2 did not own. Conversion fails closed when a V2 decimal cannot
 * be represented by the current field's exact number or bigint authority.
 */
export function recoverTransitionalV2Checkpoint(
  text: string,
  base: PreparedSave | (() => PreparedSave),
  context: Readonly<TransitionalCheckpointRecoveryContext> = {},
): PreparedSave | null {
  return recoverTransitionalV2CheckpointWithMetadata(
    text,
    base,
    context,
  )?.save ?? null
}

/** Repository integration that also carries outer-checkpoint local state. */
export function recoverTransitionalV2CheckpointWithMetadata(
  text: string,
  base: PreparedSave | (() => PreparedSave),
  context: Readonly<TransitionalCheckpointRecoveryContext> = {},
): TransitionalCheckpointRecoveryResult | null {
  let checkpoint: TransitionalCheckpoint | null
  try {
    checkpoint = decodeCheckpoint(text, context.importLimits)
  } catch (error) {
    if (error instanceof SaveImportLimitError) throw error
    throw unreadableCheckpoint('checkpoint envelope', error)
  }
  if (checkpoint === null) return null
  let dto: SaveRecord
  try {
    // Decode and authenticate the complete historical envelope before a lazy
    // manual-import base is constructed. Preview and confirm each inflate once.
    dto = decodePortableSave(
      checkpoint.portableSave,
      context.importLimits,
    )
  } catch (error) {
    if (error instanceof SaveImportLimitError) throw error
    throw unreadableCheckpoint('schema 13 payload', error)
  }
  return recoverDecodedTransitionalV2Checkpoint(
    dto,
    checkpoint,
    base,
    context,
  )
}

/** Converts an already transport-decoded raw schema-13 portable envelope. */
export function recoverDecodedTransitionalV2PortableSave(
  decoded: unknown,
  base: PreparedSave | (() => PreparedSave),
  context: Readonly<TransitionalCheckpointRecoveryContext> = {},
): PreparedSave {
  const recovered = recoverDecodedTransitionalV2Checkpoint(
    requireRecord(decoded, 'schema 13 portable save'),
    {},
    base,
    context,
  )
  if (recovered === null) {
    throw new Error('Raw schema-13 portable save was unexpectedly retired.')
  }
  return recovered.save
}

function recoverDecodedTransitionalV2Checkpoint(
  dto: SaveRecord,
  checkpoint: Readonly<TransitionalCheckpointMetadata>,
  base: PreparedSave | (() => PreparedSave),
  context: Readonly<TransitionalCheckpointRecoveryContext>,
): TransitionalCheckpointRecoveryResult | null {
  let state: SaveRecord
  let selectedPreset: number
  let pendingBaseSeconds: number
  let pendingDreamSeconds: number
  let runtimeSnapshot: SaveRecord
  let compatibleSource: SaveRecord
  try {
    dto = validateDecodedSchema13Envelope(dto)
    state = requireRecord(dto.state, 'schema 13 state')
    selectedPreset = requireSelectedPreset(state)
    ;({ pendingBaseSeconds, pendingDreamSeconds } =
      requirePendingRailgunState(state))
    runtimeSnapshot = requireRuntimeSnapshot(dto)
    if (checkpoint.preferences !== undefined) {
      validateCheckpointPreferences(checkpoint.preferences)
    }
    if (checkpoint.platform !== undefined) {
      validateCheckpointPlatform(checkpoint.platform)
    }
    validateTransitionalStoredTimeJob(dto, checkpoint, context)
    // Ledger consistency and capped reconstruction are independent of the
    // receiving compatibility base, so malformed input cannot cause that
    // potentially expensive factory to run.
    compatibleSource = withV1LedgerFields(state)
  } catch (error) {
    if (error instanceof SaveImportLimitError) throw error
    if (error instanceof IncompatibleTransitionalCheckpointError) throw error
    throw unreadableCheckpoint('schema 13 payload', error)
  }

  const resolvedBase = typeof base === 'function' ? base() : base
  const baseSource = resolvedBase.copyValidatedState()
  if (
    checkpoint.revision !== undefined &&
    toSafeIntegerOrNull(
      baseSource[TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD],
    ) !== null &&
    Number(baseSource[TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD]) >=
      checkpoint.revision
  ) return null

  const session = hydrateGameState(resolvedBase)
  try {
    assertCompatibleStateStructure(
      compatibleSource,
      session.state,
      '$',
    )
  } catch (error) {
    if (error instanceof SaveImportLimitError) throw error
    if (error instanceof IncompatibleTransitionalCheckpointError) throw error
    throw unreadableCheckpoint('schema 13 payload', error)
  }

  try {
    let converted = convertCompatibleState(
      compatibleSource,
      session.state,
    )
    converted = normalizeInactiveV2BreakTarget(converted)
    converted = applyV2StoredTimePolicy(
      converted,
      context.storedTimePolicyText,
      context.storedTimePresetFallback,
    )
    converted = settlePendingRailgun(
      converted,
      pendingBaseSeconds,
      pendingDreamSeconds,
    )
    converted = retireV2DoubleTimeBank(converted)
    let prepared = dehydrateGameState(session, converted)
    prepared = withDysonSkillEffectEvaluationSnapshot(
      prepared,
      convertRuntimeSnapshot(runtimeSnapshot),
    )
    const source = prepared.copyValidatedState()
    if (checkpoint.revision !== undefined) {
      source[TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD] = checkpoint.revision
    }
    requireRecord(source.dysonVerseSaveData, 'Dyson save').selectedPreset =
      selectedPreset
    applyV2DysonTuningProfile(source)
    if (
      checkpoint.preferences !== undefined &&
      checkpoint.platform !== undefined
    ) {
      applyCheckpointLocalState(
        source,
        checkpoint.preferences,
        checkpoint.platform,
      )
    }
    packSettingsFlags(source)
    const recovered = prepared.withValidatedState(source)
    return Object.freeze({
      save: recovered,
      devicePreferences: checkpoint.preferences === undefined
        ? undefined
        : Object.freeze({
            numberFormatting: Number(
              checkpoint.preferences.numberFormatting,
            ),
            hidePurchased: Boolean(checkpoint.preferences.hidePurchased),
          }),
    })
  } catch (error) {
    if (error instanceof IncompatibleTransitionalCheckpointError) throw error
    throw new IncompatibleTransitionalCheckpointError(
      `Transitional V2 progress cannot be represented by the current save model: ${errorMessage(error)}`,
    )
  }
}

function validateTransitionalStoredTimeJob(
  dto: SaveRecord,
  checkpoint: Readonly<TransitionalCheckpointMetadata>,
  context: Readonly<TransitionalCheckpointRecoveryContext>,
): void {
  if (context.storedTimeJobReadError !== undefined) {
    throw new IncompatibleTransitionalCheckpointError(
      `Transitional V2 Stored Time job could not be read: ${context.storedTimeJobReadError}`,
    )
  }
  if (context.storedTimeJobText === undefined) return
  try {
    if (checkpoint.revision === undefined) {
      requireClearedTransitionalV2StoredTimeJob(
        context.storedTimeJobText,
      )
      return
    }
    validateRedundantTransitionalV2StoredTimeJob(
      context.storedTimeJobText,
      checkpoint.revision,
      dto,
    )
  } catch (error) {
    throw new IncompatibleTransitionalCheckpointError(
      `Transitional V2 Stored Time job cannot be safely retired: ${errorMessage(error)}`,
    )
  }
}

function decodeCheckpoint(
  text: string,
  importLimits: Readonly<SaveImportLimits> | undefined,
): TransitionalCheckpoint | null {
  assertSuppliedSaveTextLimit(
    text,
    importLimits ?? TRANSITIONAL_CHECKPOINT_TEXT_LIMITS,
  )
  const trimmed = text.trim()
  if (trimmed.startsWith(PORTABLE_PREFIX)) {
    // Raw schema-13 portable saves retained their stricter 2 MiB boundary.
    assertSuppliedSaveTextLimit(
      text,
      importLimits ?? DEFAULT_SAVE_IMPORT_LIMITS,
    )
    return Object.freeze({ portableSave: trimmed })
  }
  let parsed: unknown
  try {
    parsed = parseBoundedJsonText(trimmed)
  } catch (error) {
    // The token-aware top-level scanner classifies rejected syntax without a
    // second unbounded JSON parse or accepting a collapsed duplicate-key tree.
    if (scanTransitionalCheckpointFormat(trimmed) !== 'absent') throw error
    return null
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null
  }
  const record = parsed as Record<string, unknown>
  if (record.format !== CHECKPOINT_FORMAT) return null
  assertExactFields(
    record,
    ['format', 'revision', 'portableSave', 'preferences', 'platform'],
    'transitional V2 checkpoint',
  )
  if (
    !Number.isSafeInteger(record.revision) ||
    Number(record.revision) < 0 ||
    Object.is(record.revision, -0) ||
    typeof record.portableSave !== 'string'
  ) {
    throw new Error('Transitional V2 checkpoint metadata is invalid.')
  }
  return Object.freeze({
    revision: Number(record.revision),
    portableSave: record.portableSave,
    preferences: requireRecord(
      record.preferences,
      'transitional V2 presentation preferences',
    ),
    platform: requireRecord(
      record.platform,
      'transitional V2 platform state',
    ),
  })
}

type TransitionalCheckpointFormatScan =
  | 'declared'
  | 'absent'
  | 'indeterminate'

function scanTransitionalCheckpointFormat(
  text: string,
): TransitionalCheckpointFormatScan {
  let index = skipJsonWhitespace(text, 0)
  if (text[index] !== '{') return 'absent'
  index = skipJsonWhitespace(text, index + 1)
  while (index < text.length && text[index] !== '}') {
    if (text[index] !== '"') return 'indeterminate'
    const keyEnd = scanJsonStringEnd(text, index)
    if (keyEnd < 0) return 'indeterminate'
    let key: unknown = null
    if (keyEnd - index <= CHECKPOINT_FORMAT_KEY_TOKEN_BYTES) {
      try {
        key = JSON.parse(text.slice(index, keyEnd)) as unknown
      } catch {
        return 'indeterminate'
      }
    }
    index = skipJsonWhitespace(text, keyEnd)
    if (text[index] !== ':') return 'indeterminate'
    index = skipJsonWhitespace(text, index + 1)
    if (key === 'format' && text[index] === '"') {
      const valueEnd = scanJsonStringEnd(text, index)
      if (valueEnd < 0) return 'indeterminate'
      if (valueEnd - index <= CHECKPOINT_FORMAT_VALUE_TOKEN_BYTES) {
        try {
          if (
            (JSON.parse(text.slice(index, valueEnd)) as unknown) ===
            CHECKPOINT_FORMAT
          ) return 'declared'
        } catch {
          return 'indeterminate'
        }
      }
    }
    index = skipJsonValue(text, index)
    if (index < 0) return 'indeterminate'
    index = skipJsonWhitespace(text, index)
    if (text[index] === '}') return 'absent'
    if (text[index] !== ',') return 'indeterminate'
    index = skipJsonWhitespace(text, index + 1)
  }
  return text[index] === '}' ? 'absent' : 'indeterminate'
}

function skipJsonWhitespace(text: string, start: number): number {
  let index = start
  while (
    text[index] === ' ' ||
    text[index] === '\n' ||
    text[index] === '\r' ||
    text[index] === '\t'
  ) index += 1
  return index
}

function scanJsonStringEnd(text: string, start: number): number {
  let index = start + 1
  while (index < text.length) {
    if (text[index] === '"') return index + 1
    if (text[index] === '\\') {
      index += 2
      continue
    }
    if (text.charCodeAt(index) <= 0x1f) return -1
    index += 1
  }
  return -1
}

function skipJsonValue(text: string, start: number): number {
  if (text[start] === '"') return scanJsonStringEnd(text, start)
  if (text[start] !== '{' && text[start] !== '[') {
    let index = start
    while (
      index < text.length &&
      text[index] !== ',' &&
      text[index] !== '}'
    ) index += 1
    return index === start ? -1 : index
  }
  const stack: string[] = [text[start]!]
  let index = start + 1
  while (index < text.length) {
    const token = text[index]
    if (token === '"') {
      index = scanJsonStringEnd(text, index)
      if (index < 0) return -1
      continue
    }
    if (token === '{' || token === '[') {
      stack.push(token)
      if (stack.length > CHECKPOINT_SCANNER_MAXIMUM_DEPTH) return -1
    } else if (token === '}' || token === ']') {
      const expected = token === '}' ? '{' : '['
      if (stack.pop() !== expected) return -1
      if (stack.length === 0) return index + 1
    }
    index += 1
  }
  return -1
}

function decodePortableSave(
  text: string,
  importLimits: Readonly<SaveImportLimits> = DEFAULT_SAVE_IMPORT_LIMITS,
): SaveRecord {
  const trimmed = text.trim()
  if (!trimmed.startsWith(PORTABLE_PREFIX)) {
    throw new Error('Transitional V2 portable save has no IDSWEB1 envelope.')
  }
  const decoded = decodeWebSaveTextBounded(trimmed, importLimits)
  if (decoded.kind === 'canonical') {
    throw new Error('Transitional V2 payload contains a canonical web save.')
  }
  return decoded.envelope
}

function requireSelectedPreset(state: SaveRecord): number {
  const skills = requireRecord(state.skills, 'schema 13 skills')
  const selectedPreset = toSafeIntegerOrNull(skills.selectedPreset)
  if (selectedPreset === null || selectedPreset < 1 || selectedPreset > 5) {
    throw new TypeError(
      'Transitional V2 selected Skill preset must be an integer from 1 to 5.',
    )
  }
  return selectedPreset
}

function requirePendingRailgunState(state: SaveRecord): Readonly<{
  pendingBaseSeconds: number
  pendingDreamSeconds: number
}> {
  const dream = requireRecord(state.dream, 'schema 13 Dream state')
  const railgun = requireRecord(dream.railgun, 'schema 13 railgun state')
  const pendingBaseSeconds = requireFiniteNonNegativeNumberValue(
    railgun.pendingBaseSeconds,
    '$.dream.railgun.pendingBaseSeconds',
  )
  const pendingDreamSeconds = requireFiniteNonNegativeNumberValue(
    railgun.pendingDreamSeconds,
    '$.dream.railgun.pendingDreamSeconds',
  )
  if (pendingDreamSeconds < pendingBaseSeconds) {
    throw new TypeError(
      '$.dream.railgun.pendingDreamSeconds must be at least pending base seconds.',
    )
  }
  if (
    !Number.isSafeInteger(railgun.activeRailguns) ||
    Number(railgun.activeRailguns) < 0
  ) {
    throw new TypeError(
      '$.dream.railgun.activeRailguns must be a non-negative safe integer.',
    )
  }
  if (
    !Number.isSafeInteger(railgun.lastRoundsFired) ||
    Number(railgun.lastRoundsFired) < 0 ||
    Number(railgun.lastRoundsFired) > 110
  ) {
    throw new TypeError(
      '$.dream.railgun.lastRoundsFired must be an integer from 0 to 110.',
    )
  }
  parseSchema13CanonicalDecimal(
    railgun.reservedPanels,
    '$.dream.railgun.reservedPanels',
    true,
  )
  parseSchema13CanonicalDecimal(
    railgun.highestStoredPanels,
    '$.dream.railgun.highestStoredPanels',
    true,
  )
  parseSchema13CanonicalDecimal(
    railgun.lastPanelsLaunched,
    '$.dream.railgun.lastPanelsLaunched',
    true,
  )
  return Object.freeze({ pendingBaseSeconds, pendingDreamSeconds })
}

function requireRuntimeSnapshot(dto: SaveRecord): SaveRecord {
  const runtime = requireRecord(dto.runtime, 'schema 13 runtime')
  assertExactFields(
    runtime,
    ['dysonEvaluationSnapshot', 'dysonTuningProfile'],
    'schema 13 runtime',
  )
  if (runtime.dysonTuningProfile !== 'web-authored-v1') {
    throw new TypeError('Transitional V2 Dyson tuning profile is unsupported.')
  }
  const snapshot = requireRecord(
    runtime.dysonEvaluationSnapshot,
    'schema 13 Dyson evaluation snapshot',
  )
  assertExactFields(
    snapshot,
    V2_DYSON_SNAPSHOT_FIELDS,
    'schema 13 Dyson evaluation snapshot',
  )
  for (const field of V2_DYSON_SNAPSHOT_FIELDS) {
    assertNumericEncoding(
      snapshot[field],
      `$.runtime.dysonEvaluationSnapshot.${field}`,
    )
  }
  return snapshot
}

function convertRuntimeSnapshot(snapshot: SaveRecord): Readonly<{
  panelsPerSecond: number
  panelLifetimeSeconds: number
  scienceMultiplier: number
  rudimentarySingularityProduction: number
  pocketDimensionsProduction: number
  scientificPlanetsProduction: number
  managerAssemblyLineProduction: number
}> {
  return Object.freeze(Object.fromEntries(
    V2_DYSON_SNAPSHOT_FIELDS.map((field) => [
      field,
      finiteNonNegativeNumber(
        snapshot[field],
        `$.runtime.dysonEvaluationSnapshot.${field}`,
      ),
    ]),
  ) as {
    panelsPerSecond: number
    panelLifetimeSeconds: number
    scienceMultiplier: number
    rudimentarySingularityProduction: number
    pocketDimensionsProduction: number
    scientificPlanetsProduction: number
    managerAssemblyLineProduction: number
  })
}

function validateCheckpointPreferences(preferences: SaveRecord): void {
  assertExactFields(
    preferences,
    [
      ...V2_PRESENTATION_BOOLEAN_FIELDS,
      'numberFormatting',
      'frameRate',
    ],
    'transitional V2 presentation preferences',
  )
  for (const field of V2_PRESENTATION_BOOLEAN_FIELDS) {
    if (typeof preferences[field] !== 'boolean') {
      throw new TypeError(`Transitional V2 preference '${field}' must be boolean.`)
    }
  }
  if (
    !Number.isSafeInteger(preferences.numberFormatting) ||
    Number(preferences.numberFormatting) < 0 ||
    Object.is(preferences.numberFormatting, -0) ||
    Number(preferences.numberFormatting) > 2
  ) {
    throw new TypeError(
      'Transitional V2 number formatting must be an integer from 0 to 2.',
    )
  }
  if (
    !Number.isSafeInteger(preferences.frameRate) ||
    Number(preferences.frameRate) < 0 ||
    Object.is(preferences.frameRate, -0) ||
    Number(preferences.frameRate) > 1_000
  ) {
    throw new TypeError(
      'Transitional V2 frame rate must be an integer from 0 to 1000.',
    )
  }
}

function validateCheckpointPlatform(platform: SaveRecord): void {
  assertExactFields(
    platform,
    V2_PLATFORM_BOOLEAN_FIELDS,
    'transitional V2 platform state',
  )
  for (const field of V2_PLATFORM_BOOLEAN_FIELDS) {
    if (typeof platform[field] !== 'boolean') {
      throw new TypeError(`Transitional V2 platform field '${field}' must be boolean.`)
    }
  }
}

function applyCheckpointLocalState(
  source: SaveRecord,
  preferences: SaveRecord,
  platform: SaveRecord,
): void {
  for (const field of V2_PRESENTATION_BOOLEAN_FIELDS) {
    source[field] = preferences[field]
  }
  source.numberFormatting = preferences.numberFormatting
  source.frameRate = preferences.frameRate
  for (const field of V2_PLATFORM_BOOLEAN_FIELDS) {
    source[field] = platform[field]
  }
}

function applyV2DysonTuningProfile(source: SaveRecord): void {
  const dyson = requireRecord(source.dysonVerseSaveData, 'Dyson save')
  const infinity = requireRecord(
    dyson.dysonVerseInfinityData,
    'Dyson infinity data',
  )
  Object.assign(infinity, {
    panelsPerSecMulti: 1,
    scienceBoostPercent: 0.05,
    moneyMultiUpgradePercent: 0.05,
    assemblyLineUpgradePercent: 0.03,
    aiManagerUpgradePercent: 0.03,
    serverUpgradePercent: 0.03,
    dataCenterUpgradePercent: 0.03,
    planetUpgradePercent: 0.03,
    matrioshkaUpgradePercent: 0.03,
    birchUpgradePercent: 0.03,
    galacticUpgradePercent: 0.03,
  })
}

function settlePendingRailgun(
  state: CanonicalGameStateV1,
  pendingBaseSeconds: number,
  pendingDreamSeconds: number,
): CanonicalGameStateV1 {
  if (pendingBaseSeconds === 0) {
    if (pendingDreamSeconds !== 0) {
      throw new IncompatibleTransitionalCheckpointError(
        'Transitional V2 pending Dream time has no corresponding base interval.',
      )
    }
    return state
  }
  if (
    !state.dream.upgrades.railguns1 &&
    !state.dream.railgun.firing
  ) return state
  const multiplier = pendingDreamSeconds / pendingBaseSeconds
  if (
    pendingBaseSeconds > 1 ||
    !Number.isFinite(multiplier) ||
    multiplier < 1 ||
    multiplier > 11
  ) {
    throw new IncompatibleTransitionalCheckpointError(
      'Transitional V2 pending railgun interval exceeds the supported automation boundary.',
    )
  }
  const input = Object.freeze({
    effectiveDoubleTimeMultiplier: multiplier,
    doubleTimeActive: multiplier > 1,
    doubleTimeRate: Math.ceil(multiplier - 1),
  })

  // The retired V2 kernel accumulated the complete accelerated interval once
  // and could settle several ten-round volleys in its bounded 112-boundary
  // loop. The current gameplay kernel deliberately starts at most one volley
  // per update, so passing the whole V2 interval to it would discard the time
  // remaining after that first volley. Partition only this compatibility
  // settlement into at-most-one-shot slices, retaining the current live-game
  // automation boundary everywhere else.
  const shotIntervalSeconds =
    DREAM_SPACE_AGE_CONSTANTS.railgunVolleyDurationSeconds /
    DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley
  const sliceCount = Math.ceil(
    pendingDreamSeconds / shotIntervalSeconds,
  )
  const maximumCompatibilityBoundaries = 112
  if (
    !Number.isSafeInteger(sliceCount) ||
    sliceCount < 1 ||
    sliceCount >= maximumCompatibilityBoundaries
  ) {
    throw new IncompatibleTransitionalCheckpointError(
      'Transitional V2 pending railgun interval exceeds the historical compatibility boundary.',
    )
  }

  let candidate = state
  let roundsFired = 0
  let panelsLaunched = 0n
  let finalSliceFired = false
  let normalizeBoundaryProgress = false
  for (let slice = 0; slice < sliceCount; slice += 1) {
    const dreamStart = slice * shotIntervalSeconds
    const dreamEnd = Math.min(
      pendingDreamSeconds,
      (slice + 1) * shotIntervalSeconds,
    )
    const dreamSeconds = dreamEnd - dreamStart
    if (!(dreamSeconds > 0)) continue
    const result = runDreamRailgunAutomation(candidate, {
      ...input,
      tickSeconds: dreamSeconds / multiplier,
    })
    if (result.status !== 'success') {
      throw new IncompatibleTransitionalCheckpointError(
        'Transitional V2 pending railgun interval could not be settled safely.',
      )
    }
    candidate = result.state
    roundsFired += candidate.dream.railgun.lastRoundsFired ?? 0
    panelsLaunched += result.panelsLaunched
    finalSliceFired = result.shotFired
  }

  // V2 attempted the next idle volley boundary even when the accumulated
  // interval ended exactly on the preceding volley. A minimum positive tick
  // lets the current authority perform the same charge/reservation work; its
  // subnormal timer residue is then normalized back to V2's exact zero.
  if (finalSliceFired && !candidate.dream.railgun.firing) {
    const boundary = runDreamRailgunAutomation(candidate, {
      ...input,
      tickSeconds: Number.MIN_VALUE,
    })
    if (boundary.status !== 'success') {
      throw new IncompatibleTransitionalCheckpointError(
        'Transitional V2 pending railgun boundary could not be settled safely.',
      )
    }
    candidate = boundary.state
    normalizeBoundaryProgress = true
  }

  return {
    ...candidate,
    dream: {
      ...candidate.dream,
      railgun: {
        ...candidate.dream.railgun,
        fireProgress: normalizeBoundaryProgress ||
          candidate.dream.railgun.fireProgress <=
            Number.EPSILON *
            Math.max(1, pendingDreamSeconds) *
            maximumCompatibilityBoundaries
          ? 0
          : candidate.dream.railgun.fireProgress,
        lastRoundsFired: roundsFired,
        lastPanelsLaunched: panelsLaunched,
      },
    },
  }
}

function applyV2StoredTimePolicy(
  state: CanonicalGameStateV1,
  policyText: string | undefined,
  fallbackPreset: CanonicalGameStateV1['timeline']['processing']['storedTimePreset'] =
    'fast',
): CanonicalGameStateV1 {
  let preset: CanonicalGameStateV1['timeline']['processing']['storedTimePreset'] =
    fallbackPreset
  if (policyText !== undefined) {
    try {
      const parsed = requireRecord(
        JSON.parse(policyText),
        'transitional V2 Stored Time policy',
      )
      if (parsed.format === 'ids-web-production-v2-stored-time-policy-v1') {
        if (parsed.policyId === 'stored-time-balanced-v1') preset = 'balanced'
        if (parsed.policyId === 'stored-time-exact-v1') preset = 'accurate'
      }
    } catch {
      // Historical V2 also fell back to fast when this local sidecar was bad.
    }
  }
  return {
    ...state,
    timeline: {
      ...state.timeline,
      processing: {
        ...state.timeline.processing,
        storedTimePreset: preset,
      },
    },
  }
}

function normalizeInactiveV2BreakTarget(
  state: CanonicalGameStateV1,
): CanonicalGameStateV1 {
  if (state.infinity.breakTarget !== 0n) return state
  if (state.quantum.unlocks.breakTheLoop) {
    throw new IncompatibleTransitionalCheckpointError(
      'Transitional V2 Infinity Break target must be positive after Break The Loop is unlocked.',
    )
  }
  return {
    ...state,
    infinity: {
      ...state.infinity,
      // V2 used zero while this target was behaviorally inactive. The current
      // carrier requires its equivalent pre-unlock sentinel to be one.
      breakTarget: 1n,
    },
  }
}

function retireV2DoubleTimeBank(
  state: CanonicalGameStateV1,
): CanonicalGameStateV1 {
  const timeline = state.timeline
  return {
    ...state,
    timeline: {
      ...timeline,
      storedTimeAvailableSeconds: Math.min(
        timeline.storedTimeCapacitySeconds,
        timeline.storedTimeAvailableSeconds + timeline.doubleTime.bankSeconds,
      ),
      doubleTime: {
        ...timeline.doubleTime,
        enabled: false,
        bankSeconds: 0,
        rate: 0,
      },
    },
  }
}

function assertExactFields(
  value: SaveRecord,
  expected: readonly string[],
  path: string,
): void {
  const actual = Object.keys(value)
  if (
    actual.length !== expected.length ||
    actual.some((field) => !expected.includes(field))
  ) {
    throw new TypeError(`${path} must contain exactly its declared fields.`)
  }
}

function withV1LedgerFields(state: SaveRecord): SaveRecord {
  const compatible = { ...state }
  const infinity = requireRecord(state.infinity, 'schema 13 Infinity state')
  const cappedAvailablePoints = schema13IntegerDecimalToBigIntAtMost(
    infinity.availablePoints,
    DISCRETE_MAXIMUM,
    '$.infinity.availablePoints',
    'saturate',
  )
  const cappedSpentPoints = schema13IntegerDecimalToBigIntAtMost(
    infinity.allocatedPoints,
    DISCRETE_MAXIMUM - cappedAvailablePoints,
    '$.infinity.allocatedPoints',
    'saturate',
  )
  compatible.infinity = {
    ...infinity,
    points: cappedAvailablePoints + cappedSpentPoints,
    spentPoints: cappedSpentPoints,
  }
  const quantum = requireRecord(state.quantum, 'schema 13 Quantum state')
  const cappedAvailableShards = schema13IntegerDecimalToBigIntAtMost(
    quantum.availableShards,
    DISCRETE_MAXIMUM,
    '$.quantum.availableShards',
    'saturate',
  )
  const suppliedLifetimeEarnedShards = schema13IntegerDecimalToBigIntAtMost(
    quantum.lifetimeEarnedShards,
    DISCRETE_MAXIMUM,
    '$.quantum.lifetimeEarnedShards',
    'saturate',
  )
  // Shipped schema 13 did not require lifetime >= available. Preserve the
  // spendable balance and raise the narrowed lifetime only enough to avoid a
  // negative current spent ledger.
  const cappedLifetimeEarnedShards = suppliedLifetimeEarnedShards <
    cappedAvailableShards
    ? cappedAvailableShards
    : suppliedLifetimeEarnedShards
  const cappedSpentShards =
    cappedLifetimeEarnedShards - cappedAvailableShards
  compatible.quantum = {
    ...quantum,
    pointsEarned: cappedAvailableShards + cappedSpentShards,
    pointsSpent: cappedSpentShards,
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
  if (CURRENT_ONLY_STATE_PATHS.has(path)) return base
  if (V2_NULLABLE_TEXT_PATHS.has(path)) {
    if (source !== null && typeof source !== 'string') {
      throw new TypeError(`${path} must be nullable text.`)
    }
    return source
  }
  if (path === '$.meta.navigationVisibility') {
    return convertV2NavigationVisibility(source, base)
  }
  if (path === '$.statistics.lastCompletedCycle') {
    return convertV2LastCompletedCycle(source)
  }
  if (path === '$.skills.byId') {
    return convertV2SkillStates(source)
  }
  if (isV2ResearchRecordPath(path)) {
    return convertV2ResearchRecord(source, path)
  }
  if (typeof base === 'bigint') return cappedCanonicalInteger(source, path)
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
    const requiredLength = requiredV2ArrayLength(path)
    if (requiredLength !== null && source.length !== requiredLength) {
      throw new TypeError(
        `${path} must contain exactly ${requiredLength} entries.`,
      )
    }
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
      Object.entries(base).map(([key, baseValue]) => {
        const propertyPath = `${path}.${key}`
        if (CURRENT_ONLY_STATE_PATHS.has(propertyPath)) {
          return [key, baseValue]
        }
        if (!Object.prototype.hasOwnProperty.call(sourceRecord, key)) {
          throw new TypeError(
            `Transitional V2 save is missing required field ${propertyPath}.`,
          )
        }
        return [
          key,
          convertLike(sourceRecord[key], baseValue, propertyPath),
        ]
      }),
    )
  }
  return base
}

function assertCompatibleStateStructure(
  source: unknown,
  base: unknown,
  path: string,
): void {
  if (CURRENT_ONLY_STATE_PATHS.has(path)) return
  if (V2_NULLABLE_TEXT_PATHS.has(path)) {
    if (source !== null && typeof source !== 'string') {
      throw new TypeError(`${path} must be nullable text.`)
    }
    return
  }
  if (path === '$.meta.navigationVisibility') {
    convertV2NavigationVisibility(source, base)
    return
  }
  if (path === '$.statistics.lastCompletedCycle') {
    assertV2LastCompletedCycleStructure(source)
    return
  }
  if (path === '$.skills.byId') {
    assertV2SkillStatesStructure(source)
    return
  }
  if (isV2ResearchRecordPath(path)) {
    assertV2ResearchRecordStructure(source, path)
    return
  }
  if (typeof base === 'bigint') {
    assertV2IntegerEncoding(source, path)
    return
  }
  if (typeof base === 'number') {
    assertNumericEncoding(source, path)
    return
  }
  if (typeof base === 'boolean') {
    if (typeof source !== 'boolean') throw new TypeError(`${path} must be boolean.`)
    return
  }
  if (typeof base === 'string') {
    if (typeof source !== 'string') throw new TypeError(`${path} must be text.`)
    return
  }
  if (base === null) {
    if (source !== null && typeof source !== 'string') {
      throw new TypeError(`${path} must be nullable text.`)
    }
    return
  }
  if (Array.isArray(base)) {
    if (!Array.isArray(source)) throw new TypeError(`${path} must be an array.`)
    const requiredLength = requiredV2ArrayLength(path)
    if (requiredLength !== null && source.length !== requiredLength) {
      throw new TypeError(
        `${path} must contain exactly ${requiredLength} entries.`,
      )
    }
    if (base.length === 0) {
      source.forEach((entry) => copyPrimitive(entry, path))
      return
    }
    source.forEach((entry, index) =>
      assertCompatibleStateStructure(
        entry,
        base[index] ?? base[0],
        `${path}.${index}`,
      ),
    )
    return
  }
  if (base !== null && typeof base === 'object') {
    const sourceRecord = requireRecord(source, path)
    for (const [key, baseValue] of Object.entries(base)) {
      const propertyPath = `${path}.${key}`
      if (CURRENT_ONLY_STATE_PATHS.has(propertyPath)) continue
      if (!Object.prototype.hasOwnProperty.call(sourceRecord, key)) {
        throw new TypeError(
          `Transitional V2 save is missing required field ${propertyPath}.`,
        )
      }
      assertCompatibleStateStructure(
        sourceRecord[key],
        baseValue,
        propertyPath,
      )
    }
  }
}

function convertV2NavigationVisibility(
  source: unknown,
  base: unknown,
): SaveRecord {
  const sourceRecord = requireRecord(
    source,
    '$.meta.navigationVisibility',
  )
  const baseRecord = requireRecord(
    base,
    'current navigation visibility',
  )
  const fields = ['story', 'wiki', 'statistics'] as const
  assertExactFields(
    sourceRecord,
    fields,
    '$.meta.navigationVisibility',
  )
  for (const field of fields) {
    if (typeof sourceRecord[field] !== 'boolean') {
      throw new TypeError(
        `$.meta.navigationVisibility.${field} must be boolean.`,
      )
    }
  }
  return {
    ...baseRecord,
    story: sourceRecord.story,
    wiki: sourceRecord.wiki,
    statistics: sourceRecord.statistics,
  }
}

function assertV2LastCompletedCycleStructure(source: unknown): void {
  const cycle = requireRecord(
    source,
    '$.statistics.lastCompletedCycle',
  )
  assertExactFields(
    cycle,
    ['valid', 'breakInfinity', 'durationSeconds', 'reward', 'dreamCause'],
    '$.statistics.lastCompletedCycle',
  )
  if (typeof cycle.valid !== 'boolean') {
    throw new TypeError('$.statistics.lastCompletedCycle.valid must be boolean.')
  }
  if (typeof cycle.breakInfinity !== 'boolean') {
    throw new TypeError(
      '$.statistics.lastCompletedCycle.breakInfinity must be boolean.',
    )
  }
  requireFiniteNonNegativeNumberValue(
    cycle.durationSeconds,
    '$.statistics.lastCompletedCycle.durationSeconds',
  )
  if (typeof cycle.reward !== 'string') {
    throw new TypeError(
      '$.statistics.lastCompletedCycle.reward must be an encoded integer.',
    )
  }
  parseSchema13CanonicalDecimal(
    cycle.reward,
    '$.statistics.lastCompletedCycle.reward',
    true,
  )
  if (
    cycle.dreamCause !== null &&
    (
      typeof cycle.dreamCause !== 'string' ||
      !V2_DREAM_RESET_CAUSES.has(cycle.dreamCause)
    )
  ) {
    throw new TypeError(
      '$.statistics.lastCompletedCycle.dreamCause is unsupported.',
    )
  }
}

function convertV2LastCompletedCycle(source: unknown): SaveRecord {
  assertV2LastCompletedCycleStructure(source)
  const cycle = source as SaveRecord
  return {
    valid: cycle.valid,
    breakInfinity: cycle.breakInfinity,
    durationSeconds: cycle.durationSeconds,
    reward: cycle.dreamCause === null
      ? cappedCanonicalInteger(
          cycle.reward,
          '$.statistics.lastCompletedCycle.reward',
        )
      : finiteNonNegativeNumber(
          cycle.reward,
          '$.statistics.lastCompletedCycle.reward',
        ),
    dreamCause: cycle.dreamCause,
  }
}

function isV2ResearchRecordPath(path: string): boolean {
  return path === '$.research.levelsById' ||
    path === '$.research.progressById' ||
    path === '$.research.automation.enabledById'
}

function assertV2SkillStatesStructure(source: unknown): void {
  const record = requireRecord(source, '$.skills.byId')
  assertExactFields(record, V2_SCHEMA13_SKILL_IDS, '$.skills.byId')
  for (const id of V2_SCHEMA13_SKILL_IDS) {
    const skill = requireRecord(record[id], `$.skills.byId.${id}`)
    assertExactFields(
      skill,
      ['owned', 'level', 'timerSeconds', 'secondaryTimerSeconds'],
      `$.skills.byId.${id}`,
    )
    if (typeof skill.owned !== 'boolean') {
      throw new TypeError(`$.skills.byId.${id}.owned must be boolean.`)
    }
    if (typeof skill.level !== 'string') {
      throw new TypeError(`$.skills.byId.${id}.level must be an exact integer string.`)
    }
    parseSchema13CanonicalBigInt(
      skill.level,
      `$.skills.byId.${id}.level`,
    )
    requireFiniteNonNegativeNumberValue(
      skill.timerSeconds,
      `$.skills.byId.${id}.timerSeconds`,
    )
    requireFiniteNonNegativeNumberValue(
      skill.secondaryTimerSeconds,
      `$.skills.byId.${id}.secondaryTimerSeconds`,
    )
  }
}

function convertV2SkillStates(source: unknown): SaveRecord {
  assertV2SkillStatesStructure(source)
  const record = source as SaveRecord
  return Object.fromEntries(V2_SCHEMA13_SKILL_IDS.map((id) => {
    const skill = record[id] as SaveRecord
    return [id, {
      owned: skill.owned,
      level: boundedExactIntegerNumber(
        skill.level,
        `$.skills.byId.${id}.level`,
      ),
      timerSeconds: skill.timerSeconds,
      secondaryTimerSeconds: skill.secondaryTimerSeconds,
    }]
  }))
}

function assertV2ResearchRecordStructure(
  source: unknown,
  path: string,
): void {
  const record = requireRecord(source, path)
  assertExactFields(record, V2_SCHEMA13_RESEARCH_IDS, path)
  for (const id of V2_SCHEMA13_RESEARCH_IDS) {
    if (path.endsWith('.enabledById')) {
      if (typeof record[id] !== 'boolean') {
        throw new TypeError(`${path}.${id} must be boolean.`)
      }
    } else if (path.endsWith('.levelsById')) {
      if (typeof record[id] !== 'string') {
        throw new TypeError(`${path}.${id} must be an encoded integer.`)
      }
      if (V2_CAPPED_RESEARCH_IDS.has(id)) {
        const level = parseSchema13CanonicalBigInt(
          record[id],
          `${path}.${id}`,
        )
        if (level > 1n) {
          throw new RangeError(
            `${path}.${id} exceeds its authored one-level cap.`,
          )
        }
      } else {
        parseSchema13CanonicalDecimal(
          record[id],
          `${path}.${id}`,
          true,
        )
      }
    } else {
      if (typeof record[id] !== 'string') {
        throw new TypeError(`${path}.${id} must be an encoded decimal.`)
      }
      assertNumericEncoding(record[id], `${path}.${id}`)
    }
  }
}

function convertV2ResearchRecord(
  source: unknown,
  path: string,
): SaveRecord {
  assertV2ResearchRecordStructure(source, path)
  const record = source as SaveRecord
  return Object.fromEntries(V2_SCHEMA13_RESEARCH_IDS.map((id) => [
    id,
    path.endsWith('.enabledById')
      ? record[id]
      : path.endsWith('.levelsById')
        ? boundedExactIntegerNumber(record[id], `${path}.${id}`)
      : finiteNonNegativeNumber(record[id], `${path}.${id}`),
  ]))
}

function requiredV2ArrayLength(path: string): number | null {
  if (path === '$.skills.presets') return 5
  if (path === '$.statistics.minuteWindows') return 60
  if (path === '$.statistics.halfHourWindows') return 48
  if (path === '$.statistics.dailyWindows') return 30
  if (/^\$\.dyson\.facilities\.[^.]+$/u.test(path)) return 2
  return null
}

function convertStatisticsWindow(
  value: unknown,
  path: string,
): StatisticsWindowState {
  const source = requireRecord(value, path)
  return {
    sequence: cappedCanonicalInteger(source.sequence, `${path}.sequence`),
    simulatedSeconds: finiteNonNegativeNumber(
      source.simulatedSeconds,
      `${path}.simulatedSeconds`,
    ),
    infinityCount: cappedCanonicalInteger(
      source.infinityCount,
      `${path}.infinityCount`,
    ),
    infinityPoints: cappedCanonicalInteger(
      source.infinityPoints,
      `${path}.infinityPoints`,
    ),
    dreamResetCount: cappedCanonicalInteger(
      source.dreamResetCount,
      `${path}.dreamResetCount`,
    ),
    strangeMatter: finiteNonNegativeNumber(
      source.strangeMatter,
      `${path}.strangeMatter`,
    ),
    realityWorkers: cappedCanonicalInteger(
      source.realityWorkers,
      `${path}.realityWorkers`,
    ),
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

function assertNumericEncoding(value: unknown, path: string): void {
  if (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    !Object.is(value, -0)
  ) return
  if (
    typeof value === 'string' &&
    value.length <= 65_536 &&
    /^(?:0|\d+(?:\.\d+)?(?:e[+-]?\d+)?)$/u.test(value)
  ) return
  throw new TypeError(`${path} has an invalid non-negative numeric encoding.`)
}

function requireFiniteNonNegativeNumberValue(
  value: unknown,
  path: string,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    Object.is(value, -0)
  ) {
    throw new TypeError(`${path} must be a finite non-negative number.`)
  }
  return value
}

function finiteNonNegativeNumber(value: unknown, path: string): number {
  const number = typeof value === 'number' ? value : Number(value)
  if (
    number === Number.POSITIVE_INFINITY &&
    typeof value === 'string' &&
    /^(?:0|\d+(?:\.\d+)?(?:e[+-]?\d+)?)$/u.test(value)
  ) return Number.MAX_VALUE
  if (!Number.isFinite(number) || number < 0 || Object.is(number, -0)) {
    throw new RangeError(`${path} cannot be represented as a finite non-negative number.`)
  }
  return number
}

function boundedExactIntegerNumber(value: unknown, path: string): number {
  const integer = V2_CAPPED_RESEARCH_IDS.has(
    path.slice('$.research.levelsById.'.length),
  ) || path.startsWith('$.skills.byId.')
    ? parseSchema13CanonicalBigInt(value, path)
    : schema13IntegerDecimalToBigIntAtMost(
        value,
        BigInt(Number.MAX_SAFE_INTEGER),
        path,
        'reject',
      )
  if (integer > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`${path} exceeds the current exact integer range.`)
  }
  const number = Number(integer)
  if (!Number.isSafeInteger(number)) {
    throw new RangeError(`${path} cannot be represented as a safe integer.`)
  }
  return number
}

function cappedCanonicalInteger(value: unknown, path: string): bigint {
  const authoredMaximum = V2_AUTHORED_BIGINT_MAXIMUMS.get(path)
  const maximum = authoredMaximum ?? (
    V2_CAPPED_SIMULATION_RESOURCE_PATHS.has(path)
      ? SIMULATION_RESOURCE_MAXIMUM
      : DISCRETE_MAXIMUM
  )
  if (typeof value === 'bigint') {
    return value > maximum ? maximum : value
  }
  const encoding = v2Schema13NumericEncoding(path)
  if (encoding === 'bigint') {
    const integer = parseSchema13CanonicalBigInt(value, path)
    return integer > maximum ? maximum : integer
  }
  if (
    encoding === 'decimal' ||
    encoding === 'integer-decimal' ||
    encoding === 'research-level'
  ) {
    if (V2_ROUNDED_DECIMAL_TO_BIGINT_PATHS.has(path)) {
      return schema13DecimalToRoundedBigIntAtMost(
        value,
        maximum,
        path,
      )
    }
    return schema13IntegerDecimalToBigIntAtMost(
      value,
      maximum,
      path,
      'saturate',
    )
  }
  throw new TypeError(`${path} is not an exact schema-13 integer field.`)
}

function assertV2IntegerEncoding(value: unknown, path: string): void {
  if (typeof value === 'bigint') return
  const encoding = v2Schema13NumericEncoding(path)
  if (encoding === 'bigint') {
    parseSchema13CanonicalBigInt(value, path)
    return
  }
  if (
    encoding === 'decimal' ||
    encoding === 'integer-decimal' ||
    encoding === 'research-level'
  ) {
    if (V2_ROUNDED_DECIMAL_TO_BIGINT_PATHS.has(path)) {
      parseSchema13CanonicalDecimal(value, path, false)
      return
    }
    parseSchema13CanonicalDecimal(value, path, true)
    return
  }
  throw new TypeError(`${path} is not an exact schema-13 integer field.`)
}

function toSafeIntegerOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null
}

function unreadableCheckpoint(
  section: string,
  error: unknown,
): UnreadableTransitionalCheckpointError {
  return new UnreadableTransitionalCheckpointError(
    `Transitional V2 ${section} is unreadable: ${errorMessage(error)}`,
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
