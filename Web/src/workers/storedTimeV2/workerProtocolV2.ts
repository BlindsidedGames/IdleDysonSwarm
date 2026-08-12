import type { DysonV2CommandFacilityId } from '../../simulation/dysonV2Commands'
import {
  STORED_TIME_POLICY_SUPPORT_V2,
  type StoredTimePolicyIdV2,
} from '../../simulation/storedTimePolicyV2'
import type { V2PurchaseMode } from '../../simulation/transactionsV2'
import type { QuantumUpgradeIdV2 } from '../../simulation/quantumCatalogV2'
import { QUANTUM_V2_UPGRADE_IDS } from '../../simulation/quantumCatalogV2'
import {
  captureStoredTimeWorkerDataV2,
  type StoredTimeWorkerLiveJobBudgetV2,
  decodeStoredTimeWorkerFrameV2,
  decodeStoredTimeWorkerPublicationV2,
  encodeStoredTimeWorkerFrameV2,
  type StoredTimeWorkerPublicationDtoV2,
} from './workerWireV2'

export const STORED_TIME_WORKER_PROTOCOL_VERSION_V2 = 1 as const
export const STORED_TIME_DREAM_REPLAY_LIMIT_V2 = 512 as const
export { STORED_TIME_POLICY_SUPPORT_V2, type StoredTimePolicyIdV2 }

export interface StoredTimeWorkerCapabilitiesV2 {
  readonly moduleWorker: true
  readonly transferableArrayBuffer: true
  readonly sharedArrayBuffer: false
}

export interface StoredTimeWorkerReadyV2 {
  readonly type: 'ready'
  readonly protocolVersion: 1
  readonly workerInstanceNonce: string
  readonly buildId: string
  readonly catalogHash: string
  readonly tuningHash: string
  readonly supportedPolicies: typeof STORED_TIME_POLICY_SUPPORT_V2
  readonly capabilities: Readonly<StoredTimeWorkerCapabilitiesV2>
}

export interface StoredTimeWorkerJobIdentityV2 {
  readonly protocolVersion: 1
  readonly workerInstanceNonce: string
  readonly jobId: string
  readonly originRevision: number
  readonly acknowledgedBaseRevision: number
  readonly policyId: StoredTimePolicyIdV2
  readonly policyVersion: 1
  readonly checkpointSequence: number
}

export interface StoredTimeWorkerControlIdentityV2
  extends StoredTimeWorkerJobIdentityV2 {
  readonly controlSequence: number
}

interface StoredTimeWorkerQueuedInputBaseDtoV2 {
  readonly id: string
  readonly remainingHorizonSeconds: number
  readonly commandVersion: 1
}
export interface StoredTimeWorkerQueuedDysonInputDtoV2 extends StoredTimeWorkerQueuedInputBaseDtoV2 {
  readonly commandKind:'dyson-facility-purchase'
  readonly facilityId: DysonV2CommandFacilityId
  readonly requestedMode: V2PurchaseMode
  readonly roundedBulkBuy: boolean
}
export interface StoredTimeWorkerQueuedQuantumUpgradeInputDtoV2 extends StoredTimeWorkerQueuedInputBaseDtoV2 {readonly commandKind:'quantum-upgrade-purchase';readonly upgradeId:QuantumUpgradeIdV2;readonly requestedMode:V2PurchaseMode}
export interface StoredTimeWorkerQueuedQuantumActionInputDtoV2 extends StoredTimeWorkerQueuedInputBaseDtoV2 {readonly commandKind:'quantum-action'}
export type StoredTimeWorkerQueuedInputDtoV2=StoredTimeWorkerQueuedDysonInputDtoV2|StoredTimeWorkerQueuedQuantumUpgradeInputDtoV2|StoredTimeWorkerQueuedQuantumActionInputDtoV2

export interface StoredTimeWorkerAccountingDtoV2 {
  readonly cumulativeProcessedSeconds: number
  readonly cumulativeDoubleTimeConsumedSeconds: number
  readonly cumulativeInfinityElapsedSeconds: number
  readonly cumulativeInfinityResetCount: string
  readonly lastInfinityResetElapsedSeconds: number | null
  readonly sealedInfinityCycleSeconds: number
  readonly sealedInfinityBoundaryRemaining: number
  readonly cumulativeRawAutomationTicks: string
  readonly cumulativeRepresentativeGroups: number
  readonly automationTimeUntilNextEvent: number
}

export interface StoredTimeWorkerProgressDtoV2 {
  readonly computedSeconds: number
  readonly durableSeconds: number
  readonly computedRawTicks: string
  readonly durableRawTicks: string
  readonly representativeGroups: number
  readonly elapsedWallMilliseconds: number
  readonly maximumChunkMilliseconds: number
  readonly maximumAtomicEventMilliseconds: number
  readonly throughputTicksPerSecond: number
  readonly etaMilliseconds: number | null
  readonly warmingUp: boolean
}

export interface StoredTimeWorkerSchedulerSummaryDtoV2 {
  readonly automationTicks: string
  readonly analyticallySkippedAutomationTicks: string
  readonly storedTimeConsumedSeconds: number
  readonly baseSimulationSeconds: number
  readonly dreamSimulationSeconds: number
  readonly infinityResetCount: string
  readonly dreamResetCount: string
  readonly dreamFastNormalizedResetCount: string
  readonly dreamFastNormalizationFirstCycleElapsedSeconds: number | null
  readonly dreamFastNormalizationCycleSeconds: number | null
  readonly dreamMeteorResetCount: string
  readonly dreamAiResetCount: string
  readonly dreamGlobalWarmingResetCount: string
  readonly dreamBlackHoleResetCount: string
  readonly dreamStrangeMatterRequested: string
  readonly dreamStrangeMatterEffective: string
  readonly dreamStrangeMatterFinal: string | null
  readonly dreamLifetimeStrangeMatterFinal: string | null
  readonly dreamCurrentQuantumRunStrangeMatterFinal: string | null
  readonly dreamRecentProcessedSegmentStrangeMatterFinal: string | null
  readonly quantumResetCount:string
  readonly quantumEntanglementCount:string
  readonly quantumAvailableShardsEffective:string
  readonly quantumLifetimeShardsEffective:string
  readonly quantumInfinityPointsConsumed:string
  readonly quantumAvailableShardsFinal:string|null
  readonly quantumLifetimeShardsFinal:string|null
  readonly quantumInfinityAvailableFinal:string|null
  readonly quantumInfinityAllocatedFinal:string|null
  readonly quantumResetSkillPointsFinal:string|null
  readonly lastInfinityResetElapsedSeconds: number | null
  readonly materialEvents: number
  readonly zeroTimePasses: number
  readonly boundaryDigest: string
}

export type StoredTimeWorkerFailureDiagnosticCodeV2 =
  | 'start-invalid'
  | 'advance-exception'
  | 'atomic-wall-budget'
  | 'clock-invalid'
  | 'stored-time-exhausted'
  | 'unported-event'
  | 'acknowledgement-invalid'
  | 'identity-mismatch'
  | 'transport-budget'

export type StoredTimeWorkerAuthorityPhaseV2 =
  | 'pre-infinity'
  | 'post-infinity'
  | 'pre-quantum'
  | 'post-quantum'

export interface StoredTimeWorkerRestartDtoV2 {
  readonly originalInitialAutomationHorizonSeconds: number
  readonly originalInitialAutomationTargetIndex: number
  readonly originalRequestedDurationSeconds: number
  readonly originalRequestedRawAutomationTicks: string
  readonly completedRepresentativeGroups: number
  readonly cumulativeAccounting: Readonly<StoredTimeWorkerAccountingDtoV2>
  readonly cumulativeSchedulerSummary: Readonly<StoredTimeWorkerSchedulerSummaryDtoV2>
  readonly sealedRemainingDurationSeconds: number
  readonly rebasedQueuedInputs: readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[]
  readonly priorCandidateHash: string
}

export type StoredTimeWorkerMainMessageV2 =
  | (StoredTimeWorkerJobIdentityV2 & {
      readonly type: 'start'
      readonly buildId: string
      readonly admittedBankSeconds: number
      readonly requestedDurationSeconds: number
      readonly requestedRawAutomationTicks: string
      readonly automationIntervalSeconds: number
      readonly permanentDoubleIp: boolean
      readonly materialEventBudget: 8
      readonly catalogHash: string
      readonly tuningHash: string
      readonly queuedInputs:readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[]
      readonly restart: Readonly<StoredTimeWorkerRestartDtoV2> | null
      readonly publication: Readonly<StoredTimeWorkerPublicationDtoV2>
    })
  | (StoredTimeWorkerControlIdentityV2 & {
      readonly type: 'cancel'
      readonly reason: 'user'
    })
  | (StoredTimeWorkerControlIdentityV2 & {
      readonly type: 'lifecycle-pause'
      readonly reason: 'browser-hidden' | 'native-background' | 'host-suspending'
    })
  | (StoredTimeWorkerControlIdentityV2 & {
      readonly type: 'authority-revoked'
      readonly reason: 'foreground-command' | 'writer-fence-lost' | 'indeterminate'
    })
  | (StoredTimeWorkerJobIdentityV2 & {
      readonly type: 'checkpoint-committed'
      readonly publishedRevision: number
      readonly proposalHashEcho: string
      readonly candidateHash: string
      readonly accounting: Readonly<StoredTimeWorkerAccountingDtoV2>
      readonly sealedRemainingDurationSeconds: number
      readonly rebasedQueuedInputs: readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[]
      readonly publication: Readonly<StoredTimeWorkerPublicationDtoV2>
    })
  | (StoredTimeWorkerJobIdentityV2 & {
      readonly type: 'authority-granted'
      readonly phase: StoredTimeWorkerAuthorityPhaseV2
      readonly proposalHashEcho: string
      readonly expectedPostHash: string | null
    })

export type StoredTimeWorkerMessageV2 =
  | StoredTimeWorkerReadyV2
  | (StoredTimeWorkerJobIdentityV2 & {
      readonly type: 'progress'
      readonly progress: Readonly<StoredTimeWorkerProgressDtoV2>
    })
  | (StoredTimeWorkerJobIdentityV2 & {
      readonly type: 'checkpoint-candidate'
      readonly proposalHash: string
      readonly accounting: Readonly<StoredTimeWorkerAccountingDtoV2>
      readonly sealedRemainingDurationSeconds: number
      readonly rebasedQueuedInputs: readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[]
      readonly progress: Readonly<StoredTimeWorkerProgressDtoV2>
      readonly schedulerSummary: Readonly<StoredTimeWorkerSchedulerSummaryDtoV2>
      readonly publication: Readonly<StoredTimeWorkerPublicationDtoV2>
    })
  | (StoredTimeWorkerJobIdentityV2 & {
      readonly type: 'authority-request'
      readonly phase: StoredTimeWorkerAuthorityPhaseV2
      readonly proposalHash: string
      readonly accounting: Readonly<StoredTimeWorkerAccountingDtoV2>
      readonly rebasedQueuedInputs: readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[]
      readonly progress: Readonly<StoredTimeWorkerProgressDtoV2>
      readonly schedulerSummary: Readonly<StoredTimeWorkerSchedulerSummaryDtoV2>
      readonly publication: Readonly<StoredTimeWorkerPublicationDtoV2>
    })
  | (StoredTimeWorkerJobIdentityV2 & {
      readonly type: 'completed'
      readonly completion: 'exact-small' | 'fast' | 'exact'
      readonly proposalHash: string
      readonly accounting: Readonly<StoredTimeWorkerAccountingDtoV2>
      readonly rebasedQueuedInputs:readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[]
      readonly progress: Readonly<StoredTimeWorkerProgressDtoV2>
      readonly schedulerSummary: Readonly<StoredTimeWorkerSchedulerSummaryDtoV2>
      readonly publication: Readonly<StoredTimeWorkerPublicationDtoV2>
    })
  | (StoredTimeWorkerJobIdentityV2 & {
      readonly type: 'cancelled'
      readonly progress: Readonly<StoredTimeWorkerProgressDtoV2>
    })
  | (StoredTimeWorkerJobIdentityV2 & {
      readonly type: 'paused'
      readonly reason: 'balanced-wall-limit' | 'lifecycle' | 'fast-normalization-proof-failed'
      readonly progress: Readonly<StoredTimeWorkerProgressDtoV2>
    })
  | (StoredTimeWorkerJobIdentityV2 & {
      readonly type: 'failed'
      readonly code:
        | 'engine-not-connected'
        | 'identity-mismatch'
        | 'invalid-message'
        | 'budget-exceeded'
        | 'blocked-unported-event'
      readonly retryable: boolean
      readonly diagnosticCode: StoredTimeWorkerFailureDiagnosticCodeV2
      readonly progress: Readonly<StoredTimeWorkerProgressDtoV2>
    })

const JOB_KEYS = Object.freeze([
  'type',
  'protocolVersion',
  'workerInstanceNonce',
  'jobId',
  'originRevision',
  'acknowledgedBaseRevision',
  'policyId',
  'policyVersion',
  'checkpointSequence',
] as const)
const CONTROL_KEYS = Object.freeze([...JOB_KEYS, 'controlSequence'] as const)

const VARIANT_KEYS = Object.freeze({
  ready: Object.freeze([
    'type', 'protocolVersion', 'workerInstanceNonce', 'buildId', 'catalogHash',
    'tuningHash', 'supportedPolicies', 'capabilities',
  ]),
  start: Object.freeze([
    ...JOB_KEYS, 'admittedBankSeconds', 'requestedDurationSeconds',
    'requestedRawAutomationTicks', 'automationIntervalSeconds',
    'permanentDoubleIp',
    'materialEventBudget', 'buildId', 'catalogHash',
    'tuningHash', 'queuedInputs','restart', 'publication',
  ]),
  cancel: Object.freeze([...CONTROL_KEYS, 'reason']),
  'lifecycle-pause': Object.freeze([...CONTROL_KEYS, 'reason']),
  'authority-revoked': Object.freeze([...CONTROL_KEYS, 'reason']),
  'checkpoint-committed': Object.freeze([
    ...JOB_KEYS, 'publishedRevision', 'proposalHashEcho', 'candidateHash', 'accounting',
    'sealedRemainingDurationSeconds', 'rebasedQueuedInputs', 'publication',
  ]),
  'authority-granted': Object.freeze([
    ...JOB_KEYS, 'phase', 'proposalHashEcho', 'expectedPostHash',
  ]),
  progress: Object.freeze([...JOB_KEYS, 'progress']),
  'checkpoint-candidate': Object.freeze([
    ...JOB_KEYS, 'proposalHash', 'accounting', 'sealedRemainingDurationSeconds',
    'rebasedQueuedInputs', 'progress', 'schedulerSummary', 'publication',
  ]),
  'authority-request': Object.freeze([
    ...JOB_KEYS, 'phase', 'proposalHash', 'accounting', 'rebasedQueuedInputs',
    'progress', 'schedulerSummary', 'publication',
  ]),
  completed: Object.freeze([
    ...JOB_KEYS, 'completion', 'proposalHash', 'accounting', 'progress',
    'rebasedQueuedInputs','schedulerSummary', 'publication',
  ]),
  cancelled: Object.freeze([...JOB_KEYS, 'progress']),
  paused: Object.freeze([...JOB_KEYS, 'reason', 'progress']),
  failed: Object.freeze([
    ...JOB_KEYS, 'code', 'retryable', 'diagnosticCode', 'progress',
  ]),
} as const)

const issuedMainMessages = new WeakSet<object>()
const issuedWorkerMessages = new WeakSet<object>()

export function captureStoredTimeWorkerMainMessageV2(
  value: unknown,
): Readonly<StoredTimeWorkerMainMessageV2> {
  if (value !== null && typeof value === 'object' && issuedMainMessages.has(value)) {
    return value as Readonly<StoredTimeWorkerMainMessageV2>
  }
  const captured = captureMessage(value, new Set([
    'start', 'cancel', 'lifecycle-pause', 'authority-revoked',
    'checkpoint-committed', 'authority-granted',
  ])) as Readonly<StoredTimeWorkerMainMessageV2>
  issuedMainMessages.add(captured)
  return captured
}

export function decodeStoredTimeWorkerMainFrameV2(
  value: unknown,
): Readonly<StoredTimeWorkerMainMessageV2> {
  return captureStoredTimeWorkerMainMessageV2(
    decodeStoredTimeWorkerFrameV2(value),
  )
}

export function postStoredTimeWorkerMainFrameV2(
  target: Readonly<{
    postMessage(message: unknown, transfer: readonly Transferable[]): void
  }>,
  value: unknown,
  liveBudget?: StoredTimeWorkerLiveJobBudgetV2,
): Readonly<StoredTimeWorkerMainMessageV2> {
  const captured = captureStoredTimeWorkerMainMessageV2(value)
  const frame = encodeStoredTimeWorkerFrameV2(captured)
  const release = liveBudget?.reserveInputFrame(frame)
  try {
    target.postMessage(frame, [frame])
  } finally {
    release?.()
  }
  return captured
}

export function captureStoredTimeWorkerMessageV2(
  value: unknown,
): Readonly<StoredTimeWorkerMessageV2> {
  if (value !== null && typeof value === 'object' && issuedWorkerMessages.has(value)) {
    return value as Readonly<StoredTimeWorkerMessageV2>
  }
  const captured = captureMessage(value, new Set([
    'ready', 'progress', 'checkpoint-candidate', 'authority-request', 'completed', 'cancelled',
    'paused', 'failed',
  ])) as Readonly<StoredTimeWorkerMessageV2>
  issuedWorkerMessages.add(captured)
  return captured
}

export function decodeStoredTimeWorkerFrameMessageV2(
  value: unknown,
): Readonly<StoredTimeWorkerMessageV2> {
  return captureStoredTimeWorkerMessageV2(decodeStoredTimeWorkerFrameV2(value))
}

export function postStoredTimeWorkerFrameMessageV2(
  target: Readonly<{
    postMessage(message: unknown, transfer: readonly Transferable[]): void
  }>,
  value: unknown,
  liveBudget?: StoredTimeWorkerLiveJobBudgetV2,
): Readonly<StoredTimeWorkerMessageV2> {
  const captured = captureStoredTimeWorkerMessageV2(value)
  const frame = encodeStoredTimeWorkerFrameV2(captured)
  const release = liveBudget?.reserveCandidateFrame(frame)
  try {
    target.postMessage(frame, [frame])
  } finally {
    release?.()
  }
  return captured
}

export function createStoredTimeWorkerTransportBudgetTerminalV2(
  value: unknown,
  durableAccounting?: unknown,
): Readonly<{
  failure: Extract<StoredTimeWorkerMessageV2, { type: 'failed' }>
  revocation: Extract<StoredTimeWorkerMainMessageV2, { type: 'authority-revoked' }>
}> {
  const message = captureStoredTimeWorkerMainMessageV2(value)
  const accounting = durableAccounting === undefined
    ? message.type === 'start' ? message.restart?.cumulativeAccounting : undefined
    : validateAccounting(durableAccounting)
  const progress = Object.freeze({
    computedSeconds: accounting?.cumulativeProcessedSeconds ?? 0,
    durableSeconds: accounting?.cumulativeProcessedSeconds ?? 0,
    computedRawTicks: accounting?.cumulativeRawAutomationTicks ?? '0',
    durableRawTicks: accounting?.cumulativeRawAutomationTicks ?? '0',
    representativeGroups: accounting?.cumulativeRepresentativeGroups ?? 0,
    elapsedWallMilliseconds: 0,
    maximumChunkMilliseconds: 0,
    maximumAtomicEventMilliseconds: 0,
    throughputTicksPerSecond: 0,
    etaMilliseconds: null,
    warmingUp: true,
  })
  const common = {
    protocolVersion: message.protocolVersion,
    workerInstanceNonce: message.workerInstanceNonce,
    jobId: message.jobId,
    originRevision: message.originRevision,
    acknowledgedBaseRevision: message.acknowledgedBaseRevision,
    policyId: message.policyId,
    policyVersion: message.policyVersion,
    checkpointSequence: message.checkpointSequence,
  } as const
  return Object.freeze({
    failure: captureStoredTimeWorkerMessageV2(Object.freeze({
      type: 'failed',
      ...common,
      code: 'budget-exceeded',
      retryable: true,
      diagnosticCode: 'transport-budget',
      progress,
    })) as Extract<StoredTimeWorkerMessageV2, { type: 'failed' }>,
    revocation: captureStoredTimeWorkerMainMessageV2(Object.freeze({
      type: 'authority-revoked',
      ...common,
      controlSequence: Number.MAX_SAFE_INTEGER,
      reason: 'writer-fence-lost',
    })) as Extract<StoredTimeWorkerMainMessageV2, { type: 'authority-revoked' }>,
  })
}

function captureMessage(value: unknown, allowed: ReadonlySet<string>): unknown {
  const captured = captureStoredTimeWorkerDataV2(value)
  const base = requireRecord(captured, 'Stored Time worker message')
  const type = base.type
  if (typeof type !== 'string' || !allowed.has(type) || !(type in VARIANT_KEYS)) {
    throw new TypeError('Stored Time worker message has an unsupported type.')
  }
  requireExactKeys(base, VARIANT_KEYS[type as keyof typeof VARIANT_KEYS], type)
  if (type === 'ready') validateReady(base)
  else validateJobMessage(base, type)
  return Object.freeze(base)
}

function validateReady(value: Readonly<Record<string, unknown>>): void {
  requireLiteral(value.protocolVersion, 1, 'ready.protocolVersion')
  requireIdentifier(value.workerInstanceNonce, 'ready.workerInstanceNonce')
  requireIdentifier(value.buildId, 'ready.buildId')
  requireHash(value.catalogHash, 'ready.catalogHash')
  requireHash(value.tuningHash, 'ready.tuningHash')
  if (!Array.isArray(value.supportedPolicies) ||
    value.supportedPolicies.length !== STORED_TIME_POLICY_SUPPORT_V2.length) {
    throw new TypeError('ready.supportedPolicies must contain the closed policy support list.')
  }
  for (const [index, expected] of STORED_TIME_POLICY_SUPPORT_V2.entries()) {
    const support = requireRecord(value.supportedPolicies[index], `ready.supportedPolicies.${index}`)
    requireExactKeys(support, ['id', 'version'], `ready.supportedPolicies.${index}`)
    requireLiteral(support.id, expected.id, `ready.supportedPolicies.${index}.id`)
    requireLiteral(support.version, expected.version, `ready.supportedPolicies.${index}.version`)
  }
  const capabilities = requireRecord(value.capabilities, 'ready.capabilities')
  requireExactKeys(
    capabilities,
    ['moduleWorker', 'transferableArrayBuffer', 'sharedArrayBuffer'],
    'ready.capabilities',
  )
  requireLiteral(capabilities.moduleWorker, true, 'ready.capabilities.moduleWorker')
  requireLiteral(
    capabilities.transferableArrayBuffer,
    true,
    'ready.capabilities.transferableArrayBuffer',
  )
  requireLiteral(
    capabilities.sharedArrayBuffer,
    false,
    'ready.capabilities.sharedArrayBuffer',
  )
}

function validateJobMessage(
  value: Readonly<Record<string, unknown>>,
  type: string,
): void {
  requireLiteral(value.protocolVersion, 1, `${type}.protocolVersion`)
  requireIdentifier(value.workerInstanceNonce, `${type}.workerInstanceNonce`)
  requireIdentifier(value.jobId, `${type}.jobId`)
  requireSafeInteger(value.originRevision, `${type}.originRevision`)
  requireSafeInteger(value.acknowledgedBaseRevision, `${type}.acknowledgedBaseRevision`)
  if (
    typeof value.policyId !== 'string' ||
    !STORED_TIME_POLICY_SUPPORT_V2.some((entry) => entry.id === value.policyId)
  ) throw new TypeError(`${type}.policyId is unsupported.`)
  requireLiteral(value.policyVersion, 1, `${type}.policyVersion`)
  requireSafeInteger(value.checkpointSequence, `${type}.checkpointSequence`)
  if (type === 'cancel' || type === 'lifecycle-pause' || type === 'authority-revoked') {
    requireSafeInteger(value.controlSequence, `${type}.controlSequence`)
  }

  if (type === 'start') {
    requireFiniteNonNegative(value.admittedBankSeconds, 'start.admittedBankSeconds')
    requireFiniteNonNegative(value.requestedDurationSeconds, 'start.requestedDurationSeconds')
    if ((value.requestedDurationSeconds as number) <= 0 ||
      (value.requestedDurationSeconds as number) > (value.admittedBankSeconds as number)) {
      throw new RangeError('start requested duration must be positive and within the admitted bank.')
    }
    requireCanonicalInteger(value.requestedRawAutomationTicks, 'start.requestedRawAutomationTicks')
    if (typeof value.automationIntervalSeconds !== 'number' ||
      !Number.isFinite(value.automationIntervalSeconds) ||
      value.automationIntervalSeconds <= 0) {
      throw new RangeError('start.automationIntervalSeconds must be positive and finite.')
    }
    if (typeof value.permanentDoubleIp !== 'boolean') {
      throw new TypeError('start.permanentDoubleIp must be boolean.')
    }
    requireLiteral(value.materialEventBudget, 8, 'start.materialEventBudget')
    requireIdentifier(value.buildId, 'start.buildId')
    requireHash(value.catalogHash, 'start.catalogHash')
    requireHash(value.tuningHash, 'start.tuningHash')
    validateQueue(value.queuedInputs)
    validateRestart(value.restart)
    validatePublication(value.publication)
  } else if (type === 'checkpoint-committed') {
    requireSafeInteger(value.publishedRevision, 'checkpoint-committed.publishedRevision')
    requireHash(value.proposalHashEcho, 'checkpoint-committed.proposalHashEcho')
    requireHash(value.candidateHash, 'checkpoint-committed.candidateHash')
    validateAccounting(value.accounting)
    requireFiniteNonNegative(
      value.sealedRemainingDurationSeconds,
      'checkpoint-committed.sealedRemainingDurationSeconds',
    )
    validateQueue(value.rebasedQueuedInputs)
    validatePublication(value.publication)
  } else if (type === 'authority-granted') {
    validateAuthorityPhase(value.phase, 'authority-granted.phase')
    requireHash(value.proposalHashEcho, 'authority-granted.proposalHashEcho')
    if (String(value.phase).startsWith('pre-')) {
      requireHash(value.expectedPostHash, 'authority-granted.expectedPostHash')
    } else if (value.expectedPostHash !== null) {
      throw new TypeError('authority-granted.expectedPostHash must be null for POST.')
    }
  } else if (type === 'checkpoint-candidate') {
    requireHash(value.proposalHash, 'checkpoint-candidate.proposalHash')
    validateAccounting(value.accounting)
    requireFiniteNonNegative(
      value.sealedRemainingDurationSeconds,
      'checkpoint-candidate.sealedRemainingDurationSeconds',
    )
    validateQueue(value.rebasedQueuedInputs)
    validateProgress(value.progress)
    validateSchedulerSummary(value.schedulerSummary)
    validatePublication(value.publication)
  } else if (type === 'authority-request') {
    validateAuthorityPhase(value.phase, 'authority-request.phase')
    requireHash(value.proposalHash, 'authority-request.proposalHash')
    validateAccounting(value.accounting)
    validateQueue(value.rebasedQueuedInputs)
    validateProgress(value.progress)
    validateSchedulerSummary(value.schedulerSummary)
    validatePublication(value.publication)
  } else if (type === 'completed') {
    if (!['exact-small', 'fast', 'exact'].includes(String(value.completion))) {
      throw new TypeError('completed.completion is unsupported.')
    }
    requireHash(value.proposalHash, 'completed.proposalHash')
    validateAccounting(value.accounting)
    validateQueue(value.rebasedQueuedInputs)
    validateProgress(value.progress)
    validateSchedulerSummary(value.schedulerSummary)
    validatePublication(value.publication)
  } else if (type === 'progress' || type === 'cancelled' || type === 'paused') {
    validateProgress(value.progress)
  }

  if (type === 'cancel') requireLiteral(value.reason, 'user', 'cancel.reason')
  if (type === 'lifecycle-pause' &&
    !['browser-hidden', 'native-background', 'host-suspending'].includes(String(value.reason))) {
    throw new TypeError('lifecycle-pause.reason is unsupported.')
  }
  if (type === 'authority-revoked' &&
    !['foreground-command', 'writer-fence-lost', 'indeterminate'].includes(String(value.reason))) {
    throw new TypeError('authority-revoked.reason is unsupported.')
  }
  if (type === 'paused' && !['balanced-wall-limit', 'lifecycle', 'fast-normalization-proof-failed'].includes(String(value.reason))) {
    throw new TypeError('paused.reason is unsupported.')
  }
  if (type === 'failed') {
    if (!['engine-not-connected', 'identity-mismatch', 'invalid-message',
      'budget-exceeded', 'blocked-unported-event'].includes(String(value.code))) {
      throw new TypeError('failed.code is unsupported.')
    }
    if (typeof value.retryable !== 'boolean') throw new TypeError('failed.retryable must be boolean.')
    if (![
      'start-invalid', 'advance-exception', 'atomic-wall-budget',
      'clock-invalid', 'stored-time-exhausted', 'unported-event',
      'acknowledgement-invalid', 'identity-mismatch', 'transport-budget',
    ].includes(String(value.diagnosticCode))) {
      throw new TypeError('failed.diagnosticCode is unsupported.')
    }
    validateProgress(value.progress)
  }
}

function validateAuthorityPhase(value: unknown, label: string): void {
  if (!['pre-infinity', 'post-infinity', 'pre-quantum', 'post-quantum'].includes(String(value))) {
    throw new TypeError(`${label} is unsupported.`)
  }
}

function validateRestart(value: unknown): Readonly<StoredTimeWorkerRestartDtoV2> | null {
  if (value === null) return null
  const record = requireRecord(value, 'start.restart')
  requireExactKeys(record, [
    'originalInitialAutomationHorizonSeconds',
    'originalInitialAutomationTargetIndex',
    'originalRequestedDurationSeconds',
    'originalRequestedRawAutomationTicks',
    'completedRepresentativeGroups',
    'cumulativeAccounting',
    'cumulativeSchedulerSummary',
    'sealedRemainingDurationSeconds',
    'rebasedQueuedInputs',
    'priorCandidateHash',
  ], 'start.restart')
  requireFiniteNonNegative(
    record.originalInitialAutomationHorizonSeconds,
    'start.restart.originalInitialAutomationHorizonSeconds',
  )
  requireSafeInteger(
    record.originalInitialAutomationTargetIndex,
    'start.restart.originalInitialAutomationTargetIndex',
  )
  if ((record.originalInitialAutomationTargetIndex as number) > 7) {
    throw new RangeError('start.restart original target index must be within 0..7.')
  }
  requireFiniteNonNegative(
    record.originalRequestedDurationSeconds,
    'start.restart.originalRequestedDurationSeconds',
  )
  if ((record.originalRequestedDurationSeconds as number) <= 0) {
    throw new RangeError('start.restart original duration must be positive.')
  }
  requireCanonicalInteger(
    record.originalRequestedRawAutomationTicks,
    'start.restart.originalRequestedRawAutomationTicks',
  )
  requireSafeInteger(
    record.completedRepresentativeGroups,
    'start.restart.completedRepresentativeGroups',
  )
  validateAccounting(record.cumulativeAccounting)
  validateSchedulerSummary(record.cumulativeSchedulerSummary)
  requireFiniteNonNegative(
    record.sealedRemainingDurationSeconds,
    'start.restart.sealedRemainingDurationSeconds',
  )
  validateQueue(record.rebasedQueuedInputs)
  requireHash(record.priorCandidateHash, 'start.restart.priorCandidateHash')
  return Object.freeze(record) as unknown as Readonly<StoredTimeWorkerRestartDtoV2>
}

function validateAccounting(value: unknown): Readonly<StoredTimeWorkerAccountingDtoV2> {
  const record = requireRecord(value, 'accounting')
  requireExactKeys(record, [
    'cumulativeProcessedSeconds', 'cumulativeDoubleTimeConsumedSeconds',
    'cumulativeInfinityElapsedSeconds', 'cumulativeInfinityResetCount',
    'lastInfinityResetElapsedSeconds', 'sealedInfinityCycleSeconds',
    'sealedInfinityBoundaryRemaining', 'cumulativeRawAutomationTicks',
    'cumulativeRepresentativeGroups', 'automationTimeUntilNextEvent',
  ], 'accounting')
  requireFiniteNonNegative(record.cumulativeProcessedSeconds, 'accounting.cumulativeProcessedSeconds')
  requireFiniteNonNegative(record.cumulativeDoubleTimeConsumedSeconds, 'accounting.cumulativeDoubleTimeConsumedSeconds')
  requireFiniteNonNegative(record.cumulativeInfinityElapsedSeconds, 'accounting.cumulativeInfinityElapsedSeconds')
  requireCanonicalInteger(record.cumulativeInfinityResetCount, 'accounting.cumulativeInfinityResetCount')
  if (record.lastInfinityResetElapsedSeconds !== null) {
    requireFiniteNonNegative(
      record.lastInfinityResetElapsedSeconds,
      'accounting.lastInfinityResetElapsedSeconds',
    )
  }
  requireFiniteNonNegative(record.sealedInfinityCycleSeconds, 'accounting.sealedInfinityCycleSeconds')
  requireFiniteNonNegative(
    record.sealedInfinityBoundaryRemaining,
    'accounting.sealedInfinityBoundaryRemaining',
  )
  requireCanonicalInteger(record.cumulativeRawAutomationTicks, 'accounting.cumulativeRawAutomationTicks')
  requireSafeInteger(record.cumulativeRepresentativeGroups, 'accounting.cumulativeRepresentativeGroups')
  requireFiniteNonNegative(record.automationTimeUntilNextEvent, 'accounting.automationTimeUntilNextEvent')
  return Object.freeze(record) as unknown as Readonly<StoredTimeWorkerAccountingDtoV2>
}

function validateProgress(value: unknown): Readonly<StoredTimeWorkerProgressDtoV2> {
  const record = requireRecord(value, 'progress')
  requireExactKeys(record, [
    'computedSeconds', 'durableSeconds', 'computedRawTicks', 'durableRawTicks',
    'representativeGroups', 'elapsedWallMilliseconds', 'throughputTicksPerSecond',
    'maximumChunkMilliseconds', 'maximumAtomicEventMilliseconds',
    'etaMilliseconds', 'warmingUp',
  ], 'progress')
  for (const key of ['computedSeconds', 'durableSeconds', 'elapsedWallMilliseconds',
    'maximumChunkMilliseconds', 'maximumAtomicEventMilliseconds',
    'throughputTicksPerSecond'] as const) requireFiniteNonNegative(record[key], `progress.${key}`)
  requireCanonicalInteger(record.computedRawTicks, 'progress.computedRawTicks')
  requireCanonicalInteger(record.durableRawTicks, 'progress.durableRawTicks')
  requireSafeInteger(record.representativeGroups, 'progress.representativeGroups')
  if (record.etaMilliseconds !== null) requireFiniteNonNegative(record.etaMilliseconds, 'progress.etaMilliseconds')
  if (typeof record.warmingUp !== 'boolean') throw new TypeError('progress.warmingUp must be boolean.')
  return Object.freeze(record) as unknown as Readonly<StoredTimeWorkerProgressDtoV2>
}

function validateSchedulerSummary(
  value: unknown,
): Readonly<StoredTimeWorkerSchedulerSummaryDtoV2> {
  const record = requireRecord(value, 'schedulerSummary')
  requireExactKeys(record, [
    'automationTicks', 'analyticallySkippedAutomationTicks',
    'storedTimeConsumedSeconds', 'baseSimulationSeconds',
    'dreamSimulationSeconds', 'infinityResetCount',
    'dreamResetCount', 'dreamFastNormalizedResetCount',
    'dreamFastNormalizationFirstCycleElapsedSeconds',
    'dreamFastNormalizationCycleSeconds',
    'dreamStrangeMatterRequested',
    'dreamStrangeMatterEffective',
    'dreamStrangeMatterFinal',
    'dreamLifetimeStrangeMatterFinal',
    'dreamCurrentQuantumRunStrangeMatterFinal',
    'dreamRecentProcessedSegmentStrangeMatterFinal',
    'quantumResetCount','quantumEntanglementCount',
    'quantumAvailableShardsEffective','quantumLifetimeShardsEffective',
    'quantumInfinityPointsConsumed','quantumAvailableShardsFinal',
    'quantumLifetimeShardsFinal','quantumInfinityAvailableFinal',
    'quantumInfinityAllocatedFinal','quantumResetSkillPointsFinal',
    'dreamMeteorResetCount', 'dreamAiResetCount',
    'dreamGlobalWarmingResetCount', 'dreamBlackHoleResetCount',
    'lastInfinityResetElapsedSeconds', 'materialEvents', 'zeroTimePasses',
    'boundaryDigest',
  ], 'schedulerSummary')
  requireCanonicalInteger(record.automationTicks, 'schedulerSummary.automationTicks')
  requireCanonicalInteger(
    record.analyticallySkippedAutomationTicks,
    'schedulerSummary.analyticallySkippedAutomationTicks',
  )
  requireCanonicalInteger(record.infinityResetCount, 'schedulerSummary.infinityResetCount')
  requireCanonicalInteger(record.dreamResetCount, 'schedulerSummary.dreamResetCount')
  requireCanonicalInteger(
    record.dreamFastNormalizedResetCount,
    'schedulerSummary.dreamFastNormalizedResetCount',
  )
  const normalizedDreamResetCount = BigInt(
    record.dreamFastNormalizedResetCount as string,
  )
  if (
    (record.dreamFastNormalizationFirstCycleElapsedSeconds === null) !==
      (record.dreamFastNormalizationCycleSeconds === null) ||
    (normalizedDreamResetCount === 0n) !==
      (record.dreamFastNormalizationCycleSeconds === null)
  ) {
    throw new RangeError(
      'schedulerSummary Fast Dream normalization metadata must exactly accompany normalized resets.',
    )
  }
  if(record.dreamFastNormalizationFirstCycleElapsedSeconds!==null)requireFiniteNonNegative(record.dreamFastNormalizationFirstCycleElapsedSeconds,'schedulerSummary.dreamFastNormalizationFirstCycleElapsedSeconds')
  if(record.dreamFastNormalizationCycleSeconds!==null){requireFiniteNonNegative(record.dreamFastNormalizationCycleSeconds,'schedulerSummary.dreamFastNormalizationCycleSeconds');if(record.dreamFastNormalizationCycleSeconds===0)throw new RangeError('schedulerSummary.dreamFastNormalizationCycleSeconds must be positive.')}
  for (const key of [
    'dreamMeteorResetCount', 'dreamAiResetCount',
    'dreamGlobalWarmingResetCount', 'dreamBlackHoleResetCount',
    'quantumResetCount','quantumEntanglementCount',
  ] as const) requireCanonicalInteger(record[key], `schedulerSummary.${key}`)
  for (const key of [
    'dreamStrangeMatterRequested',
    'dreamStrangeMatterEffective',
    'quantumAvailableShardsEffective','quantumLifetimeShardsEffective',
    'quantumInfinityPointsConsumed',
  ] as const) requireCanonicalDecimal(record[key], `schedulerSummary.${key}`)
  for (const key of [
    'dreamStrangeMatterFinal',
    'dreamLifetimeStrangeMatterFinal',
    'dreamCurrentQuantumRunStrangeMatterFinal',
    'dreamRecentProcessedSegmentStrangeMatterFinal',
    'quantumAvailableShardsFinal','quantumLifetimeShardsFinal',
    'quantumInfinityAvailableFinal','quantumInfinityAllocatedFinal',
  ] as const) {
    if (record[key] !== null) {
      requireCanonicalDecimal(record[key], `schedulerSummary.${key}`)
    }
  }
  if(record.quantumResetSkillPointsFinal!==null)requireCanonicalInteger(record.quantumResetSkillPointsFinal,'schedulerSummary.quantumResetSkillPointsFinal')
  if (record.lastInfinityResetElapsedSeconds !== null) {
    requireFiniteNonNegative(
      record.lastInfinityResetElapsedSeconds,
      'schedulerSummary.lastInfinityResetElapsedSeconds',
    )
  }
  for (const key of [
    'storedTimeConsumedSeconds', 'baseSimulationSeconds',
    'dreamSimulationSeconds',
  ] as const) requireFiniteNonNegative(record[key], `schedulerSummary.${key}`)
  requireSafeInteger(record.materialEvents, 'schedulerSummary.materialEvents')
  requireSafeInteger(record.zeroTimePasses, 'schedulerSummary.zeroTimePasses')
  if (typeof record.boundaryDigest !== 'string' || !/^[a-f0-9]{16}$/u.test(record.boundaryDigest)) {
    throw new TypeError('schedulerSummary.boundaryDigest must be a canonical 64-bit digest.')
  }
  return Object.freeze(record) as unknown as Readonly<StoredTimeWorkerSchedulerSummaryDtoV2>
}

function requireCanonicalDecimal(value: unknown, path: string): void {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*(?:\.\d+)?e-?\d+)$/u.test(value)) {
    throw new TypeError(`${path} must be a canonical non-negative Decimal string.`)
  }
}

function validateQueue(value: unknown): readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[] {
  if (!Array.isArray(value)) throw new TypeError('rebasedQueuedInputs must be an array.')
  if (value.length > 64) throw new RangeError('Queued command count cannot exceed 64.')
  const identifiers = new Set<string>()
  return Object.freeze(value.map((entry, index) => {
    const record = requireRecord(entry, `rebasedQueuedInputs.${index}`)
    const kind=record.commandKind
    const keys=kind==='dyson-facility-purchase'?['id','remainingHorizonSeconds','commandVersion','commandKind','facilityId','requestedMode','roundedBulkBuy']:kind==='quantum-upgrade-purchase'?['id','remainingHorizonSeconds','commandVersion','commandKind','upgradeId','requestedMode']:kind==='quantum-action'?['id','remainingHorizonSeconds','commandVersion','commandKind']:null
    if(keys===null)throw new TypeError('Queued command kind is unsupported.')
    requireExactKeys(record,keys,`rebasedQueuedInputs.${index}`)
    requireIdentifier(record.id, `rebasedQueuedInputs.${index}.id`)
    if(identifiers.has(record.id as string))throw new TypeError('Queued command IDs must be unique.')
    identifiers.add(record.id as string)
    requireFiniteNonNegative(record.remainingHorizonSeconds, `rebasedQueuedInputs.${index}.remainingHorizonSeconds`)
    if(record.commandVersion!==1)throw new TypeError('Queued command version is unsupported.')
    if(kind==='dyson-facility-purchase'){
      if(!['assembly_lines','ai_managers','servers','data_centers','planets','matrioshka_brains','birch_planets','galactic_brains'].includes(String(record.facilityId)))throw new TypeError('Queued facility ID is unsupported.')
      if(typeof record.roundedBulkBuy!=='boolean')throw new TypeError('Queued roundedBulkBuy must be boolean.')
    }else if(kind==='quantum-upgrade-purchase'&&!QUANTUM_V2_UPGRADE_IDS.includes(record.upgradeId as QuantumUpgradeIdV2))throw new TypeError('Queued Quantum upgrade ID is unsupported.')
    if(kind!=='quantum-action'&&!['buy-1','buy-10','buy-50','buy-100','buy-max'].includes(String(record.requestedMode)))throw new TypeError('Queued purchase mode is unsupported.')
    return Object.freeze(record) as unknown as Readonly<StoredTimeWorkerQueuedInputDtoV2>
  }))
}

export function captureStoredTimeWorkerQueuedInputsV2(value:unknown):readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[]{return validateQueue(captureStoredTimeWorkerDataV2(value))}

function validatePublication(value: unknown): void {
  decodeStoredTimeWorkerPublicationV2(value)
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${path} must be a plain object.`)
  }
  return value as Record<string, unknown>
}

function requireExactKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
  path: string,
): void {
  const keys = Object.keys(value)
  if (keys.length !== expected.length || keys.some((key) => !expected.includes(key))) {
    throw new TypeError(`${path} must contain exactly its declared fields.`)
  }
}

function requireIdentifier(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 128 ||
    !/^[A-Za-z0-9._:-]+$/u.test(value)) throw new TypeError(`${path} is invalid.`)
}

function requireHash(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) {
    throw new TypeError(`${path} must be a lowercase SHA-256 hash.`)
  }
}

function requireSafeInteger(value: unknown, path: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) {
    throw new TypeError(`${path} must be a non-negative safe integer.`)
  }
}

function requireFiniteNonNegative(value: unknown, path: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || Object.is(value, -0)) {
    throw new TypeError(`${path} must be finite and non-negative.`)
  }
}

function requireCanonicalInteger(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,4095})$/u.test(value)) {
    throw new TypeError(`${path} must be a canonical bounded integer string.`)
  }
}

function requireLiteral<T>(value: unknown, expected: T, path: string): asserts value is T {
  if (value !== expected) throw new TypeError(`${path} is unsupported.`)
}
