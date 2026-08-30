import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'
import {
  assertSuppliedSaveTextLimit,
  DEFAULT_SAVE_IMPORT_LIMITS,
} from './decodeIdb1'
import { requireRecord, type SaveRecord } from './graph'
import { parseBoundedJsonText } from './serialization'
import {
  parseSchema13CanonicalBigInt,
  parseSchema13CanonicalDecimal,
  validateDecodedSchema13Envelope,
} from './transitionalV2Schema13'

const ACTIVE_JOB_FORMAT = 'ids-web-production-v2-stored-time-job-v1'
const CLEARED_JOB_FORMAT =
  'ids-web-production-v2-stored-time-job-cleared-v1'
const MAXIMUM_JOB_TEXT_BYTES = 32 * 1024 * 1024
const MAXIMUM_WORKER_RECORD_BYTES = 256 * 1024
const MAXIMUM_WORKER_DEPTH = 128
const MAXIMUM_WORKER_CONTAINERS = 4_096
const MAXIMUM_WORKER_ENTRIES = 16_384
const MAXIMUM_WORKER_STRING_CODE_UNITS = 65_536

const JOB_RECORD_FIELDS = Object.freeze([
  'kind',
  'jobId',
  'workerInstanceNonce',
  'writerOwnerId',
  'writerGeneration',
  'originRevision',
  'acknowledgedBaseRevision',
  'proposedBaseRevision',
  'buildId',
  'catalogHash',
  'tuningHash',
  'policyId',
  'policyVersion',
  'checkpointSequence',
  'admittedBankSeconds',
  'requestedDurationSeconds',
  'tuningProfileId',
  'unrequestedReserveSeconds',
  'requestedRawAutomationTicks',
  'automationIntervalSeconds',
  'originAuthority',
  'cumulativeAccounting',
  'sealedRemainingDurationSeconds',
  'schedulerSummary',
  'rebasedQueuedInputs',
  'publicationHash',
  'publication',
  'candidateHash',
] as const)

const ORIGIN_AUTHORITY_FIELDS = Object.freeze([
  'storedTimeAvailableSeconds',
  'doubleTimeUnlocked',
  'doubleTimeBankSeconds',
  'doubleTimeRate',
  'infinityCycleSeconds',
  'infinityBoundaryRemaining',
  'initialAutomationHorizonSeconds',
  'initialAutomationTargetIndex',
  'initialResearchAutomationTargetIndex',
  'researchAutomationUnlocked',
  'permanentDoubleIp',
  'dreamStrangeMatter',
  'dreamResetCount',
  'lifetimeStrangeMatter',
  'currentQuantumRunStrangeMatter',
  'recentProcessedSegmentStrangeMatter',
  'lifetimeMeteorDreamResets',
  'lifetimeAiDreamResets',
  'lifetimeGlobalWarmingDreamResets',
  'lifetimeBlackHoleDreamResets',
  'currentQuantumRunMeteorDreamResets',
  'currentQuantumRunAiDreamResets',
  'currentQuantumRunGlobalWarmingDreamResets',
  'currentQuantumRunBlackHoleDreamResets',
  'recentProcessedSegmentMeteorDreamResets',
  'recentProcessedSegmentAiDreamResets',
  'recentProcessedSegmentGlobalWarmingDreamResets',
  'recentProcessedSegmentBlackHoleDreamResets',
  'originQueuedInputs',
] as const)

const ACCOUNTING_FIELDS = Object.freeze([
  'cumulativeProcessedSeconds',
  'cumulativeDoubleTimeConsumedSeconds',
  'cumulativeInfinityElapsedSeconds',
  'cumulativeInfinityResetCount',
  'lastInfinityResetElapsedSeconds',
  'sealedInfinityCycleSeconds',
  'sealedInfinityBoundaryRemaining',
  'cumulativeRawAutomationTicks',
  'cumulativeRepresentativeGroups',
  'automationTimeUntilNextEvent',
] as const)

const SCHEDULER_SUMMARY_FIELDS = Object.freeze([
  'automationTicks',
  'analyticallySkippedAutomationTicks',
  'storedTimeConsumedSeconds',
  'baseSimulationSeconds',
  'dreamSimulationSeconds',
  'infinityResetCount',
  'dreamResetCount',
  'dreamFastNormalizedResetCount',
  'dreamFastNormalizationFirstCycleElapsedSeconds',
  'dreamFastNormalizationCycleSeconds',
  'dreamStrangeMatterRequested',
  'dreamStrangeMatterEffective',
  'dreamStrangeMatterFinal',
  'dreamLifetimeStrangeMatterFinal',
  'dreamCurrentQuantumRunStrangeMatterFinal',
  'dreamRecentProcessedSegmentStrangeMatterFinal',
  'quantumResetCount',
  'quantumEntanglementCount',
  'quantumAvailableShardsEffective',
  'quantumLifetimeShardsEffective',
  'quantumInfinityPointsConsumed',
  'quantumAvailableShardsFinal',
  'quantumLifetimeShardsFinal',
  'quantumInfinityAvailableFinal',
  'quantumInfinityAllocatedFinal',
  'quantumResetSkillPointsFinal',
  'dreamMeteorResetCount',
  'dreamAiResetCount',
  'dreamGlobalWarmingResetCount',
  'dreamBlackHoleResetCount',
  'lastInfinityResetElapsedSeconds',
  'materialEvents',
  'zeroTimePasses',
  'boundaryDigest',
] as const)

const CANONICAL_INTEGER_PATTERN = /^(?:0|[1-9]\d{0,4095})$/u
const IDENTIFIER_PATTERN = /^[A-Za-z0-9._:-]+$/u
const HASH_PATTERN = /^[a-f0-9]{64}$/u
const DIGEST_PATTERN = /^[a-f0-9]{16}$/u
const STORED_TIME_POLICIES = new Set([
  'stored-time-fast-v1',
  'stored-time-balanced-v1',
  'stored-time-exact-v1',
])
const QUEUED_FACILITY_IDS = new Set([
  'assembly_lines',
  'ai_managers',
  'servers',
  'data_centers',
  'planets',
  'matrioshka_brains',
  'birch_planets',
  'galactic_brains',
])
const QUEUED_QUANTUM_UPGRADE_IDS = new Set([
  'BotMultitasking',
  'DoubleIP',
  'BreakTheLoop',
  'QuantumEntanglement',
  'Automation',
  'Secrets',
  'Division',
  'Avocado',
  'Fragments',
  'Purity',
  'Terra',
  'Power',
  'Paragade',
  'Stellar',
  'InfluenceSpeed',
  'CashBonus',
  'ScienceBonus',
  'MatrioshkaBrains',
  'BirchPlanets',
  'GalacticBrains',
])
const QUEUED_PURCHASE_MODES = new Set([
  'buy-1',
  'buy-10',
  'buy-50',
  'buy-100',
  'buy-max',
])

/**
 * Proves that a retired V2 Stored-Time job is no newer than the exact outer
 * checkpoint. An older valid job was superseded by that checkpoint; a job at
 * the same revision must contain its exact publication. A newer or otherwise
 * unverifiable durable job must not be ignored because V2 persisted it before
 * publishing the matching outer save.
 */
export function validateRedundantTransitionalV2StoredTimeJob(
  text: string,
  checkpointRevision: number,
  checkpointDto: SaveRecord,
): void {
  const validated = validateActiveStoredTimeJob(text, checkpointDto.savedAtUtc)
  if (validated === null) return
  const { proposedRevision, projectedState, runtime } = validated
  if (proposedRevision > checkpointRevision) {
    throw new Error(
      'Transitional V2 Stored Time job is newer than its outer checkpoint.',
    )
  }
  if (proposedRevision < checkpointRevision) return
  if (
    !sameDataTree(projectedState, checkpointDto.state) ||
    !sameDataTree(runtime, checkpointDto.runtime)
  ) {
    throw new Error(
      'Transitional V2 Stored Time job is not redundant with its outer checkpoint.',
    )
  }
}

/**
 * Fully validates a sidecar whose exact text is anchored by a canonical
 * recovery proof, then proves that it is no newer than that canonical save.
 */
export function validateSupersededTransitionalV2StoredTimeJob(
  text: string,
  checkpointRevision: number,
): void {
  const validated = validateActiveStoredTimeJob(text)
  if (
    validated !== null &&
    validated.proposedRevision > checkpointRevision
  ) {
    throw new Error(
      'Transitional V2 Stored Time job is newer than its canonical recovery proof.',
    )
  }
}

function validateActiveStoredTimeJob(
  text: string,
  savedAtUtc: unknown = '1970-01-01T00:00:00.000Z',
): Readonly<{
  proposedRevision: number
  projectedState: SaveRecord
  runtime: unknown
}> | null {
  const envelope = decodeStoredTimeJobEnvelope(text)
  if (envelope.format === CLEARED_JOB_FORMAT) {
    assertExactFields(
      envelope,
      ['format'],
      'transitional V2 cleared Stored Time job envelope',
    )
    return null
  }
  assertExactFields(
    envelope,
    ['format', 'record'],
    'transitional V2 Stored Time job envelope',
  )
  if (envelope.format !== ACTIVE_JOB_FORMAT) {
    throw new TypeError('Transitional V2 Stored Time job format is unsupported.')
  }
  const record = requireRecord(
    envelope.record,
    'transitional V2 Stored Time job record',
  )
  validateWorkerRecordBudgets(record)
  validateJobRecordStructure(record)

  const proposedRevision = requireSafeInteger(
    record.proposedBaseRevision,
    'transitional V2 Stored Time proposed revision',
  )
  const publication = requireRecord(
    record.publication,
    'transitional V2 Stored Time publication',
  )
  assertExactFields(
    publication,
    ['state', 'runtime'],
    'transitional V2 Stored Time publication',
  )
  const workerState = requireRecord(
    publication.state,
    'transitional V2 Stored Time publication state',
  )
  if (workerState.modelVersion !== 2) {
    throw new TypeError(
      'Transitional V2 Stored Time publication model version is unsupported.',
    )
  }
  const projectedState = { ...workerState }
  delete projectedState.modelVersion
  validateDecodedSchema13Envelope({
    schemaVersion: 13,
    modelVersion: 2,
    savedAtUtc,
    state: projectedState,
    runtime: publication.runtime,
  })
  const publicationHash = hashCanonicalTransitionalV2StoredTimeValue(
    publication,
  )
  if (record.publicationHash !== publicationHash) {
    throw new Error(
      'Transitional V2 Stored Time publication hash does not match its authenticated publication.',
    )
  }
  const { candidateHash: _candidateHash, ...recordCore } = record
  const candidateHash = hashCanonicalTransitionalV2StoredTimeValue(recordCore)
  if (record.candidateHash !== candidateHash) {
    throw new Error(
      'Transitional V2 Stored Time candidate hash does not match its authenticated record.',
    )
  }
  return Object.freeze({
    proposedRevision,
    projectedState,
    runtime: publication.runtime,
  })
}

/**
 * Exact synchronous counterpart of the released V2 worker's
 * `hashStoredTimeWorkerWireValueV2`: recursively sorted-key JSON encoded as
 * UTF-8, then SHA-256.
 */
export function hashCanonicalTransitionalV2StoredTimeValue(
  value: unknown,
): string {
  return bytesToHex(sha256(utf8ToBytes(canonicalStoredTimeWorkerJson(value))))
}

function canonicalStoredTimeWorkerJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStoredTimeWorkerJson).join(',')}]`
  }
  const record = value as Readonly<Record<string, unknown>>
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalStoredTimeWorkerJson(record[key])}`
  ).join(',')}}`
}

/** Requires that an unmatched sidecar be the exact historical cleared marker. */
export function requireClearedTransitionalV2StoredTimeJob(text: string): void {
  const envelope = decodeStoredTimeJobEnvelope(text)
  assertExactFields(
    envelope,
    ['format'],
    'transitional V2 cleared Stored Time job envelope',
  )
  if (envelope.format !== CLEARED_JOB_FORMAT) {
    throw new Error(
      'An active transitional V2 Stored Time job requires its exact outer checkpoint.',
    )
  }
}

function decodeStoredTimeJobEnvelope(text: string): SaveRecord {
  assertSuppliedSaveTextLimit(text, {
    ...DEFAULT_SAVE_IMPORT_LIMITS,
    suppliedTextBytes: MAXIMUM_JOB_TEXT_BYTES,
  })
  return requireRecord(
    parseBoundedJsonText(text),
    'transitional V2 Stored Time job envelope',
  )
}

function validateJobRecordStructure(record: SaveRecord): void {
  assertExactFields(
    record,
    JOB_RECORD_FIELDS,
    'transitional V2 Stored Time job record',
  )
  if (
    record.kind !== 'stored-time-origin-v2' &&
    record.kind !== 'stored-time-checkpoint-v2'
  ) {
    throw new TypeError('Transitional V2 Stored Time job kind is unsupported.')
  }
  for (const field of ['jobId', 'workerInstanceNonce', 'writerOwnerId'] as const) {
    requireIdentifier(record[field], `Stored Time job ${field}`)
  }
  requireIdentifier(record.buildId, 'Stored Time job buildId')
  for (const field of [
    'catalogHash',
    'tuningHash',
    'publicationHash',
    'candidateHash',
  ] as const) {
    requireHash(record[field], `Stored Time job ${field}`)
  }
  requireSafeInteger(
    record.writerGeneration,
    'Stored Time job writerGeneration',
  )
  const originRevision = requireSafeInteger(
    record.originRevision,
    'Stored Time job originRevision',
  )
  const acknowledgedRevision = requireSafeInteger(
    record.acknowledgedBaseRevision,
    'Stored Time job acknowledgedBaseRevision',
  )
  const proposedRevision = requireSafeInteger(
    record.proposedBaseRevision,
    'Stored Time job proposedBaseRevision',
  )
  const checkpointSequence = requireSafeInteger(
    record.checkpointSequence,
    'Stored Time job checkpointSequence',
  )
  if (record.kind === 'stored-time-origin-v2') {
    if (
      checkpointSequence !== 0 ||
      originRevision !== acknowledgedRevision ||
      acknowledgedRevision !== proposedRevision
    ) {
      throw new RangeError(
        'Stored Time origin record has inconsistent revision clock fields.',
      )
    }
  } else if (
    checkpointSequence < 1 ||
    originRevision > acknowledgedRevision ||
    proposedRevision !== acknowledgedRevision + 1 ||
    proposedRevision - originRevision !== checkpointSequence
  ) {
    throw new RangeError(
      'Stored Time checkpoint record has inconsistent revision clock fields.',
    )
  }
  if (!STORED_TIME_POLICIES.has(String(record.policyId))) {
    throw new TypeError('Transitional V2 Stored Time policy is unsupported.')
  }
  if (record.policyVersion !== 1) {
    throw new TypeError('Transitional V2 Stored Time policy version is unsupported.')
  }
  if (record.tuningProfileId !== 'web-authored-v1') {
    throw new TypeError('Transitional V2 Stored Time tuning profile is unsupported.')
  }
  const admittedBank = requirePositiveFinite(
    record.admittedBankSeconds,
    'Stored Time admitted bank',
  )
  const requestedDuration = requirePositiveFinite(
    record.requestedDurationSeconds,
    'Stored Time requested duration',
  )
  const reserve = requireFiniteNonNegative(
    record.unrequestedReserveSeconds,
    'Stored Time unrequested reserve',
  )
  if (!approximatelyEqual(requestedDuration + reserve, admittedBank)) {
    throw new RangeError('Stored Time reserve does not match its admitted bank.')
  }
  requireCanonicalInteger(
    record.requestedRawAutomationTicks,
    'Stored Time requested raw automation ticks',
  )
  if (record.automationIntervalSeconds !== 0.1) {
    throw new RangeError('Stored Time automation interval is unsupported.')
  }
  requireFiniteNonNegative(
    record.sealedRemainingDurationSeconds,
    'Stored Time sealed remaining duration',
  )
  validateOriginAuthority(record.originAuthority, admittedBank)
  validateAccounting(record.cumulativeAccounting)
  validateSchedulerSummary(record.schedulerSummary)
  validateQueuedInputs(record.rebasedQueuedInputs, 'rebasedQueuedInputs')
}

function validateWorkerRecordBudgets(record: SaveRecord): void {
  if (new TextEncoder().encode(JSON.stringify(record)).byteLength >
    MAXIMUM_WORKER_RECORD_BYTES) {
    throw new RangeError(
      'Transitional V2 Stored Time job exceeds its worker record byte budget.',
    )
  }
  const budget = { containers: 0, entries: 0 }
  const visit = (value: unknown, depth: number): void => {
    if (depth > MAXIMUM_WORKER_DEPTH) {
      throw new RangeError(
        'Transitional V2 Stored Time job exceeds its worker depth budget.',
      )
    }
    if (typeof value === 'string') {
      if (value.length > MAXIMUM_WORKER_STRING_CODE_UNITS) {
        throw new RangeError(
          'Transitional V2 Stored Time job exceeds its worker string budget.',
        )
      }
      return
    }
    if (value === null || typeof value !== 'object') return
    budget.containers += 1
    const entries = Array.isArray(value)
      ? value
      : Object.values(value as SaveRecord)
    budget.entries += entries.length
    if (budget.containers > MAXIMUM_WORKER_CONTAINERS) {
      throw new RangeError(
        'Transitional V2 Stored Time job exceeds its worker container budget.',
      )
    }
    if (budget.entries > MAXIMUM_WORKER_ENTRIES) {
      throw new RangeError(
        'Transitional V2 Stored Time job exceeds its worker entry budget.',
      )
    }
    entries.forEach((entry) => visit(entry, depth + 1))
  }
  visit(record, 0)
}

function validateOriginAuthority(value: unknown, admittedBank: number): void {
  const record = requireRecord(value, 'Stored Time origin authority')
  assertExactFields(
    record,
    ORIGIN_AUTHORITY_FIELDS,
    'Stored Time origin authority',
  )
  for (const field of [
    'storedTimeAvailableSeconds',
    'doubleTimeBankSeconds',
    'doubleTimeRate',
    'infinityCycleSeconds',
    'infinityBoundaryRemaining',
    'initialAutomationHorizonSeconds',
  ] as const) {
    requireFiniteNonNegative(record[field], `Stored Time origin ${field}`)
  }
  if (!approximatelyEqual(Number(record.storedTimeAvailableSeconds), admittedBank)) {
    throw new RangeError('Stored Time origin bank does not match admission.')
  }
  for (const field of [
    'doubleTimeUnlocked',
    'researchAutomationUnlocked',
    'permanentDoubleIp',
  ] as const) {
    if (typeof record[field] !== 'boolean') {
      throw new TypeError(`Stored Time origin ${field} must be boolean.`)
    }
  }
  const dysonTarget = requireSafeInteger(
    record.initialAutomationTargetIndex,
    'Stored Time origin automation target',
  )
  const researchTarget = requireSafeInteger(
    record.initialResearchAutomationTargetIndex,
    'Stored Time origin Research automation target',
  )
  if (dysonTarget > 7 || researchTarget > 13) {
    throw new RangeError('Stored Time origin automation target is unsupported.')
  }
  for (const field of [
    'dreamStrangeMatter',
    'lifetimeStrangeMatter',
    'currentQuantumRunStrangeMatter',
    'recentProcessedSegmentStrangeMatter',
  ] as const) {
    parseSchema13CanonicalDecimal(
      record[field],
      `Stored Time origin ${field}`,
      false,
    )
  }
  for (const field of [
    'dreamResetCount',
    'lifetimeMeteorDreamResets',
    'lifetimeAiDreamResets',
    'lifetimeGlobalWarmingDreamResets',
    'lifetimeBlackHoleDreamResets',
    'currentQuantumRunMeteorDreamResets',
    'currentQuantumRunAiDreamResets',
    'currentQuantumRunGlobalWarmingDreamResets',
    'currentQuantumRunBlackHoleDreamResets',
    'recentProcessedSegmentMeteorDreamResets',
    'recentProcessedSegmentAiDreamResets',
    'recentProcessedSegmentGlobalWarmingDreamResets',
    'recentProcessedSegmentBlackHoleDreamResets',
  ] as const) {
    parseSchema13CanonicalBigInt(record[field], `Stored Time origin ${field}`)
  }
  validateQueuedInputs(record.originQueuedInputs, 'originQueuedInputs')
}

function validateAccounting(value: unknown): void {
  const record = requireRecord(value, 'Stored Time accounting')
  assertExactFields(record, ACCOUNTING_FIELDS, 'Stored Time accounting')
  for (const field of [
    'cumulativeProcessedSeconds',
    'cumulativeDoubleTimeConsumedSeconds',
    'cumulativeInfinityElapsedSeconds',
    'sealedInfinityCycleSeconds',
    'sealedInfinityBoundaryRemaining',
    'automationTimeUntilNextEvent',
  ] as const) {
    requireFiniteNonNegative(record[field], `Stored Time accounting ${field}`)
  }
  for (const field of [
    'cumulativeInfinityResetCount',
    'cumulativeRawAutomationTicks',
  ] as const) {
    requireCanonicalInteger(record[field], `Stored Time accounting ${field}`)
  }
  requireSafeInteger(
    record.cumulativeRepresentativeGroups,
    'Stored Time accounting representative groups',
  )
  requireNullableFiniteNonNegative(
    record.lastInfinityResetElapsedSeconds,
    'Stored Time accounting last Infinity reset',
  )
}

function validateSchedulerSummary(value: unknown): void {
  const record = requireRecord(value, 'Stored Time scheduler summary')
  assertExactFields(
    record,
    SCHEDULER_SUMMARY_FIELDS,
    'Stored Time scheduler summary',
  )
  for (const field of [
    'automationTicks',
    'analyticallySkippedAutomationTicks',
    'infinityResetCount',
    'dreamResetCount',
    'dreamFastNormalizedResetCount',
    'dreamMeteorResetCount',
    'dreamAiResetCount',
    'dreamGlobalWarmingResetCount',
    'dreamBlackHoleResetCount',
    'quantumResetCount',
    'quantumEntanglementCount',
  ] as const) {
    requireCanonicalInteger(
      record[field],
      `Stored Time scheduler ${field}`,
    )
  }
  for (const field of [
    'dreamStrangeMatterRequested',
    'dreamStrangeMatterEffective',
    'quantumAvailableShardsEffective',
    'quantumLifetimeShardsEffective',
    'quantumInfinityPointsConsumed',
  ] as const) {
    parseSchema13CanonicalDecimal(
      record[field],
      `Stored Time scheduler ${field}`,
      false,
    )
  }
  for (const field of [
    'dreamStrangeMatterFinal',
    'dreamLifetimeStrangeMatterFinal',
    'dreamCurrentQuantumRunStrangeMatterFinal',
    'dreamRecentProcessedSegmentStrangeMatterFinal',
    'quantumAvailableShardsFinal',
    'quantumLifetimeShardsFinal',
    'quantumInfinityAvailableFinal',
    'quantumInfinityAllocatedFinal',
  ] as const) {
    if (record[field] !== null) {
      parseSchema13CanonicalDecimal(
        record[field],
        `Stored Time scheduler ${field}`,
        false,
      )
    }
  }
  if (record.quantumResetSkillPointsFinal !== null) {
    requireCanonicalInteger(
      record.quantumResetSkillPointsFinal,
      'Stored Time scheduler reset Skill Points',
    )
  }
  for (const field of [
    'storedTimeConsumedSeconds',
    'baseSimulationSeconds',
    'dreamSimulationSeconds',
  ] as const) {
    requireFiniteNonNegative(record[field], `Stored Time scheduler ${field}`)
  }
  requireNullableFiniteNonNegative(
    record.dreamFastNormalizationFirstCycleElapsedSeconds,
    'Stored Time scheduler first normalized Dream cycle',
  )
  requireNullableFiniteNonNegative(
    record.dreamFastNormalizationCycleSeconds,
    'Stored Time scheduler normalized Dream cycle',
  )
  requireNullableFiniteNonNegative(
    record.lastInfinityResetElapsedSeconds,
    'Stored Time scheduler last Infinity reset',
  )
  requireSafeInteger(record.materialEvents, 'Stored Time scheduler material events')
  requireSafeInteger(record.zeroTimePasses, 'Stored Time scheduler zero-time passes')
  if (
    typeof record.boundaryDigest !== 'string' ||
    !DIGEST_PATTERN.test(record.boundaryDigest)
  ) {
    throw new TypeError('Stored Time scheduler boundary digest is invalid.')
  }
}

function validateQueuedInputs(value: unknown, label: string): void {
  if (!Array.isArray(value) || value.length > 64) {
    throw new TypeError(`${label} must be an array of at most 64 entries.`)
  }
  const identifiers = new Set<string>()
  value.forEach((entry, index) => {
    const record = requireRecord(entry, `${label}.${index}`)
    const kind = record.commandKind
    const fields = kind === 'dyson-facility-purchase'
      ? [
          'id', 'remainingHorizonSeconds', 'commandVersion', 'commandKind',
          'facilityId', 'requestedMode', 'roundedBulkBuy',
        ]
      : kind === 'quantum-upgrade-purchase'
        ? [
            'id', 'remainingHorizonSeconds', 'commandVersion', 'commandKind',
            'upgradeId', 'requestedMode',
          ]
        : kind === 'quantum-action'
          ? ['id', 'remainingHorizonSeconds', 'commandVersion', 'commandKind']
          : null
    if (fields === null) {
      throw new TypeError(`${label}.${index} has an unsupported command kind.`)
    }
    assertExactFields(record, fields, `${label}.${index}`)
    const id = requireIdentifier(record.id, `${label}.${index}.id`)
    if (identifiers.has(id)) {
      throw new TypeError(`${label} command IDs must be unique.`)
    }
    identifiers.add(id)
    requireFiniteNonNegative(
      record.remainingHorizonSeconds,
      `${label}.${index}.remainingHorizonSeconds`,
    )
    if (record.commandVersion !== 1) {
      throw new TypeError(`${label}.${index} command version is unsupported.`)
    }
    if (kind === 'dyson-facility-purchase') {
      if (!QUEUED_FACILITY_IDS.has(String(record.facilityId))) {
        throw new TypeError(`${label}.${index} facility is unsupported.`)
      }
      if (typeof record.roundedBulkBuy !== 'boolean') {
        throw new TypeError(`${label}.${index} rounded purchase flag is invalid.`)
      }
    }
    if (
      kind === 'quantum-upgrade-purchase' &&
      !QUEUED_QUANTUM_UPGRADE_IDS.has(String(record.upgradeId))
    ) {
      throw new TypeError(`${label}.${index} Quantum upgrade is unsupported.`)
    }
    if (
      kind !== 'quantum-action' &&
      !QUEUED_PURCHASE_MODES.has(String(record.requestedMode))
    ) {
      throw new TypeError(`${label}.${index} purchase mode is unsupported.`)
    }
  })
}

function assertExactFields(
  record: SaveRecord,
  fields: readonly string[],
  label: string,
): void {
  const actual = Object.keys(record)
  if (
    actual.length !== fields.length ||
    actual.some((field) => !fields.includes(field))
  ) {
    throw new TypeError(`${label} must contain exactly its declared fields.`)
  }
}

function requireIdentifier(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > 128 ||
    !IDENTIFIER_PATTERN.test(value)
  ) {
    throw new TypeError(`${label} is invalid.`)
  }
  return value
}

function requireHash(value: unknown, label: string): void {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a lowercase SHA-256 hash.`)
  }
}

function requireSafeInteger(value: unknown, label: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    Object.is(value, -0)
  ) {
    throw new TypeError(`${label} must be a non-negative safe integer.`)
  }
  return value
}

function requirePositiveFinite(value: unknown, label: string): number {
  const number = requireFiniteNonNegative(value, label)
  if (number === 0) throw new TypeError(`${label} must be positive.`)
  return number
}

function requireFiniteNonNegative(value: unknown, label: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    Object.is(value, -0)
  ) {
    throw new TypeError(`${label} must be finite and non-negative.`)
  }
  return value
}

function requireNullableFiniteNonNegative(value: unknown, label: string): void {
  if (value !== null) requireFiniteNonNegative(value, label)
}

function requireCanonicalInteger(value: unknown, label: string): void {
  if (typeof value !== 'string' || !CANONICAL_INTEGER_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a canonical bounded integer.`)
  }
}

function approximatelyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <=
    Math.max(1, Math.abs(left), Math.abs(right)) * 1e-12
}

function sameDataTree(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false
    return left.length === right.length &&
      left.every((entry, index) => sameDataTree(entry, right[index]))
  }
  if (
    left === null ||
    right === null ||
    typeof left !== 'object' ||
    typeof right !== 'object'
  ) return false
  const leftRecord = left as SaveRecord
  const rightRecord = right as SaveRecord
  const leftKeys = Object.keys(leftRecord)
  const rightKeys = Object.keys(rightRecord)
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key) =>
      Object.hasOwn(rightRecord, key) &&
      sameDataTree(leftRecord[key], rightRecord[key]),
    )
}
