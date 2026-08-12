import {
  type CanonicalRuntimeSidecarV2,
} from '../../game-state/runtimeV2'
import type { CanonicalGameStateV2 } from '../../game-state/typesV2'
import { cloneCanonicalGameStateV2 } from '../../game-state/cloneV2'
import {
  addGameDecimals,
  compareGameDecimals,
  equalGameDecimals,
  gameDecimalFromCanonicalString,
  gameDecimalFromBigInt,
  gameDecimalToCanonicalString,
  gameDecimalToNumberChecked,
  multiplyGameDecimals,
  subtractGameDecimals,
} from '../../math/gameDecimal'
import { DEFAULT_AUTOMATION_INTERVAL_SECONDS } from '../../simulation/eventTime'
import { commitQuantumUpgradeV2,quoteQuantumUpgradeV2 } from '../../simulation/quantumV2'
import {
  commitCanonicalQuantumResetV2,
  quoteCanonicalQuantumResetV2,
} from '../../simulation/canonicalQuantumResetV2'
import { realityArtifactSkillPointsV2 } from '../../simulation/realityV2'
import {
  captureInfinityRewardAuthorityV2ForSimulation,
  type InfinityRewardAuthorityV2,
} from '../../simulation/infinityEconomyV2'
import {
  commitPreparedCanonicalInfinityResetV2,
  quotePreparedCanonicalInfinityResetV2,
  registerCanonicalPreparedInfinityResetAuthorityV2ForStoredTime,
} from '../../simulation/canonicalInfinityResetV2'
import {
  planStoredTimePolicyV2,
  type StoredTimePolicyPlanV2,
} from '../../simulation/storedTimePolicyV2'
import { initializeCanonicalEventTimeCarrierV2 } from '../../simulation/canonicalEventTimeModelV2'
import {
  captureStoredTimeWorkerMainMessageV2,
  captureStoredTimeWorkerMessageV2,
  captureStoredTimeWorkerQueuedInputsV2,
  STORED_TIME_DREAM_REPLAY_LIMIT_V2,
  STORED_TIME_WORKER_PROTOCOL_VERSION_V2,
  type StoredTimePolicyIdV2,
  type StoredTimeWorkerAccountingDtoV2,
  type StoredTimeWorkerMainMessageV2,
  type StoredTimeWorkerMessageV2,
  type StoredTimeWorkerQueuedInputDtoV2,
  type StoredTimeWorkerReadyV2,
  type StoredTimeWorkerSchedulerSummaryDtoV2,
} from './workerProtocolV2'
import {
  captureStoredTimeWorkerDataV2,
  decodeStoredTimeWorkerPublicationV2,
  encodeStoredTimeWorkerPublicationV2,
  encodeValidatedStoredTimeWorkerPublicationV2,
  hashStoredTimeWorkerWireValueV2,
  type StoredTimeWorkerPublicationDtoV2,
} from './workerWireV2'

export interface StoredTimeAuthorityPublicationV2 {
  readonly revision: number
  readonly state: Readonly<CanonicalGameStateV2>
  readonly runtime: Readonly<CanonicalRuntimeSidecarV2>
}

export interface StoredTimeWriterFenceV2 {
  readonly ownerId: string
  readonly generation: number
}

export type StoredTimeCheckpointWriteStatusV2 =
  | 'committed'
  | 'definite-failure'
  | 'ambiguous'

export interface StoredTimeCheckpointWriteReceiptV2 {
  readonly status: StoredTimeCheckpointWriteStatusV2
}

export interface StoredTimeCheckpointRepositoryV2 {
  read(
    fence: Readonly<StoredTimeWriterFenceV2>,
  ): unknown | Promise<unknown>
  persist(
    record: Readonly<StoredTimeCheckpointRecordV2>,
    fence: Readonly<StoredTimeWriterFenceV2>,
  ):
    | Readonly<StoredTimeCheckpointWriteReceiptV2>
    | Promise<Readonly<StoredTimeCheckpointWriteReceiptV2>>
}

interface StoredTimeCheckpointRecordCoreV2 {
  readonly kind: 'stored-time-origin-v2' | 'stored-time-checkpoint-v2'
  readonly jobId: string
  readonly workerInstanceNonce: string
  readonly writerOwnerId: string
  readonly writerGeneration: number
  readonly originRevision: number
  readonly acknowledgedBaseRevision: number
  readonly proposedBaseRevision: number
  readonly buildId: string
  readonly catalogHash: string
  readonly tuningHash: string
  readonly tuningProfileId: CanonicalRuntimeSidecarV2['dysonTuningProfile']
  readonly policyId: StoredTimePolicyIdV2
  readonly policyVersion: 1
  readonly checkpointSequence: number
  readonly admittedBankSeconds: number
  readonly requestedDurationSeconds: number
  readonly unrequestedReserveSeconds: number
  readonly requestedRawAutomationTicks: string
  readonly automationIntervalSeconds: number
  readonly originAuthority: Readonly<StoredTimeOriginAuthorityV2>
  readonly cumulativeAccounting: Readonly<StoredTimeWorkerAccountingDtoV2>
  readonly schedulerSummary: Readonly<StoredTimeWorkerSchedulerSummaryDtoV2>
  readonly sealedRemainingDurationSeconds: number
  readonly rebasedQueuedInputs: readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[]
  readonly publicationHash: string
  readonly publication: Readonly<StoredTimeWorkerPublicationDtoV2>
}

interface StoredTimeOriginAuthorityV2 {
  readonly storedTimeAvailableSeconds: number
  readonly doubleTimeUnlocked: boolean
  readonly doubleTimeBankSeconds: number
  readonly doubleTimeRate: number
  readonly infinityCycleSeconds: number
  readonly infinityBoundaryRemaining: number
  readonly initialAutomationHorizonSeconds: number
  readonly initialAutomationTargetIndex: number
  readonly initialResearchAutomationTargetIndex: number
  readonly researchAutomationUnlocked: boolean
  readonly permanentDoubleIp: boolean
  readonly dreamStrangeMatter: string
  readonly dreamResetCount: string
  readonly lifetimeStrangeMatter: string
  readonly currentQuantumRunStrangeMatter: string
  readonly recentProcessedSegmentStrangeMatter: string
  readonly lifetimeMeteorDreamResets: string
  readonly lifetimeAiDreamResets: string
  readonly lifetimeGlobalWarmingDreamResets: string
  readonly lifetimeBlackHoleDreamResets: string
  readonly currentQuantumRunMeteorDreamResets: string
  readonly currentQuantumRunAiDreamResets: string
  readonly currentQuantumRunGlobalWarmingDreamResets: string
  readonly currentQuantumRunBlackHoleDreamResets: string
  readonly recentProcessedSegmentMeteorDreamResets: string
  readonly recentProcessedSegmentAiDreamResets: string
  readonly recentProcessedSegmentGlobalWarmingDreamResets: string
  readonly recentProcessedSegmentBlackHoleDreamResets: string
  readonly originQueuedInputs:readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[]
}

export interface StoredTimeCheckpointRecordV2
  extends StoredTimeCheckpointRecordCoreV2 {
  readonly candidateHash: string
}

export interface StoredTimeJobAuthorityOptionsV2 {
  readonly initialPublication: Readonly<StoredTimeAuthorityPublicationV2>
  readonly ready: Readonly<StoredTimeWorkerReadyV2>
  readonly expectedIdentity: Readonly<{
    readonly buildId: string
    readonly catalogHash: string
    readonly tuningHash: string
  }>
  readonly infinityRewardAuthority: Readonly<InfinityRewardAuthorityV2>
  readonly repository: Readonly<StoredTimeCheckpointRepositoryV2>
  readonly captureWriterFence: () => unknown
  readonly createJobId?: (() => string) | undefined
}

export interface StoredTimeJobAdmissionRequestV2 {
  readonly expectedRevision: number
  readonly policyId: StoredTimePolicyIdV2
  readonly policyVersion: 1
  readonly requestedDurationSeconds: number
  readonly queuedInputs?:readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[]
}

export type StoredTimeJobAdmissionStatusV2 =
  | 'started'
  | 'stale-revision'
  | 'busy'
  | 'persistence-failed'
  | 'recovery-required'
  | 'indeterminate'

export interface StoredTimeJobAdmissionResultV2 {
  readonly status: StoredTimeJobAdmissionStatusV2
  readonly publication: Readonly<StoredTimeAuthorityPublicationV2>
  readonly start: Readonly<StoredTimeWorkerMainMessageV2> | null
  readonly error?: string
}

export interface StoredTimeJobRecoveryResultV2 {
  readonly status: 'recovered' | 'empty' | 'busy' | 'indeterminate'
  readonly publication: Readonly<StoredTimeAuthorityPublicationV2>
  readonly start: Readonly<StoredTimeWorkerMainMessageV2> | null
  readonly error?: string
}

export type StoredTimeCheckpointCommitStatusV2 =
  | 'committed'
  | 'committed-cancelled'
  | 'committed-revoked'
  | 'terminal-aborted'
  | 'revision-exhausted'
  | 'retryable-failure'
  | 'rejected'
  | 'busy'
  | 'indeterminate'

export interface StoredTimeCheckpointCommitResultV2 {
  readonly status: StoredTimeCheckpointCommitStatusV2
  readonly publication: Readonly<StoredTimeAuthorityPublicationV2>
  readonly acknowledgement: Readonly<StoredTimeWorkerMainMessageV2> | null
  readonly terminalControl: Readonly<StoredTimeWorkerMainMessageV2> | null
  readonly error?: string
}

export interface StoredTimeJobControlRequestV2 {
  readonly expectedRevision: number
}

export interface StoredTimeJobControlResultV2 {
  readonly status:
    | 'sent'
    | 'cancelled'
    | 'cancelled-after-commit'
    | 'revoked'
    | 'revoked-after-commit'
    | 'stale-revision'
    | 'no-job'
    | 'indeterminate'
    | 'busy'
  readonly publication: Readonly<StoredTimeAuthorityPublicationV2>
  readonly message: Readonly<StoredTimeWorkerMainMessageV2> | null
}

interface ActiveLeaseV2 {
  readonly jobId: string
  readonly workerInstanceNonce: string
  readonly originRevision: number
  acknowledgedBaseRevision: number
  readonly policyId: StoredTimePolicyIdV2
  readonly policyVersion: 1
  checkpointSequence: number
  controlSequence: number
  readonly admittedBankSeconds: number
  readonly requestedDurationSeconds: number
  readonly requestedRawAutomationTicks: string
  readonly automationIntervalSeconds: number
  readonly policyPlan: Readonly<StoredTimePolicyPlanV2>
  readonly originAuthority: Readonly<StoredTimeOriginAuthorityV2>
  cumulativeAccounting: Readonly<StoredTimeWorkerAccountingDtoV2>
  cumulativeSchedulerSummary: Readonly<StoredTimeWorkerSchedulerSummaryDtoV2>
  remainingQueuedInputs:readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[]
  priorCandidateHash: string
  readonly fence: Readonly<StoredTimeWriterFenceV2>
  terminalAfterWrite: Readonly<{
    type: 'cancel' | 'authority-revoked'
    reason: 'user' | 'foreground-command'
  }> | null
  awaitingWorkerCancellation: boolean
  awaitingWorkerPause: boolean
}

interface TransientAuthorityHeadV2 {
  readonly phase: import('./workerProtocolV2').StoredTimeWorkerAuthorityPhaseV2
  readonly proposalHash: string
  readonly publication: Readonly<StoredTimeAuthorityPublicationV2>
  readonly accounting: Readonly<StoredTimeWorkerAccountingDtoV2>
  readonly schedulerSummary: Readonly<StoredTimeWorkerSchedulerSummaryDtoV2>
  readonly remainingQueuedInputs: readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[]
  readonly expectedPostHash: string | null
}

type CheckpointReadResultV2 = Readonly<
  | { status: 'empty' }
  | { status: 'ok'; record: Readonly<StoredTimeCheckpointRecordV2> }
  | { status: 'invalid'; error: string }
>

const RECORD_KEYS = Object.freeze([
  'kind', 'jobId', 'workerInstanceNonce', 'writerOwnerId', 'writerGeneration',
  'originRevision', 'acknowledgedBaseRevision', 'proposedBaseRevision',
  'buildId', 'catalogHash', 'tuningHash', 'policyId', 'policyVersion',
  'checkpointSequence', 'admittedBankSeconds', 'requestedDurationSeconds',
  'tuningProfileId', 'unrequestedReserveSeconds', 'requestedRawAutomationTicks',
  'automationIntervalSeconds', 'originAuthority',
  'cumulativeAccounting', 'sealedRemainingDurationSeconds',
  'schedulerSummary',
  'rebasedQueuedInputs', 'publicationHash', 'publication', 'candidateHash',
] as const)
const issuedCheckpointRecords = new WeakSet<object>()
const preparedInfinityResetAuthority =
  registerCanonicalPreparedInfinityResetAuthorityV2ForStoredTime()
const canonicalHashCache = new WeakMap<object, Promise<string>>()

const ZERO_ACCOUNTING: Readonly<StoredTimeWorkerAccountingDtoV2> = Object.freeze({
  cumulativeProcessedSeconds: 0,
  cumulativeDoubleTimeConsumedSeconds: 0,
  cumulativeInfinityElapsedSeconds: 0,
  cumulativeInfinityResetCount: '0',
  lastInfinityResetElapsedSeconds: null,
  sealedInfinityCycleSeconds: 0,
  sealedInfinityBoundaryRemaining: 0,
  cumulativeRawAutomationTicks: '0',
  cumulativeRepresentativeGroups: 0,
  automationTimeUntilNextEvent: 0,
})

const ZERO_SCHEDULER_SUMMARY: Readonly<StoredTimeWorkerSchedulerSummaryDtoV2> =
  Object.freeze({
    automationTicks: '0',
    analyticallySkippedAutomationTicks: '0',
    storedTimeConsumedSeconds: 0,
    baseSimulationSeconds: 0,
    dreamSimulationSeconds: 0,
    infinityResetCount: '0',
    dreamResetCount: '0',
    dreamFastNormalizedResetCount: '0',
    dreamFastNormalizationFirstCycleElapsedSeconds: null,
    dreamFastNormalizationCycleSeconds: null,
    dreamMeteorResetCount: '0',
    dreamAiResetCount: '0',
    dreamGlobalWarmingResetCount: '0',
    dreamBlackHoleResetCount: '0',
    dreamStrangeMatterRequested: '0',
    dreamStrangeMatterEffective: '0',
    dreamStrangeMatterFinal: null,
    dreamLifetimeStrangeMatterFinal: null,
    dreamCurrentQuantumRunStrangeMatterFinal: null,
    dreamRecentProcessedSegmentStrangeMatterFinal: null,
    quantumResetCount:'0',quantumEntanglementCount:'0',quantumAvailableShardsEffective:'0',quantumLifetimeShardsEffective:'0',quantumInfinityPointsConsumed:'0',quantumAvailableShardsFinal:null,quantumLifetimeShardsFinal:null,quantumInfinityAvailableFinal:null,quantumInfinityAllocatedFinal:null,quantumResetSkillPointsFinal:null,
    lastInfinityResetElapsedSeconds: null,
    materialEvents: 0,
    zeroTimePasses: 0,
    boundaryDigest: '0000000000000000',
  })

/** Dormant main-thread owner for one read-back-fenced Stored Time worker job. */
export class StoredTimeJobAuthorityV2 {
  #publication: Readonly<StoredTimeAuthorityPublicationV2>
  readonly #ready: Readonly<StoredTimeWorkerReadyV2>
  readonly #repository: Readonly<StoredTimeCheckpointRepositoryV2>
  readonly #captureWriterFence: () => unknown
  readonly #createJobId: () => string
  readonly #infinityRewardAuthority: Readonly<InfinityRewardAuthorityV2>
  readonly #permanentDoubleIp: boolean
  #lease: ActiveLeaseV2 | null = null
  #admissionInFlight = false
  #recoveryInFlight = false
  #writeInFlight: Promise<Readonly<StoredTimeCheckpointCommitResultV2>> | null = null
  #indeterminate = false
  #recoveredPriorHash: string | null = null
  #controlInFlight = false
  #transientAuthorityHead: Readonly<TransientAuthorityHeadV2> | null = null

  constructor(options: Readonly<StoredTimeJobAuthorityOptionsV2>) {
    const properties = dataProperties(options, [
      'initialPublication', 'ready', 'expectedIdentity', 'repository',
      'infinityRewardAuthority', 'captureWriterFence', 'createJobId',
    ], ['createJobId'], 'Stored Time job authority options')
    this.#publication = capturePublication(
      propertyValue(properties, 'initialPublication', 'Stored Time job authority options'),
    )
    const ready = captureStoredTimeWorkerMessageV2(
      propertyValue(properties, 'ready', 'Stored Time job authority options'),
    )
    if (ready.type !== 'ready') throw new TypeError('Stored Time authority requires a ready handshake.')
    const expectedIdentity = captureExpectedIdentity(
      propertyValue(properties, 'expectedIdentity', 'Stored Time job authority options'),
    )
    if (
      ready.buildId !== expectedIdentity.buildId ||
      ready.catalogHash !== expectedIdentity.catalogHash ||
      ready.tuningHash !== expectedIdentity.tuningHash
    ) throw new TypeError('Stored Time worker ready identity does not match this main release.')
    this.#ready = ready
    this.#infinityRewardAuthority = captureInfinityRewardAuthorityV2ForSimulation(
      propertyValue(
        properties,
        'infinityRewardAuthority',
        'Stored Time job authority options',
      ),
    )
    this.#permanentDoubleIp = this.#infinityRewardAuthority.permanentDoubleIp
    const repository = propertyValue(properties, 'repository', 'Stored Time job authority options')
    if (repository === null || typeof repository !== 'object') {
      throw new TypeError('Stored Time checkpoint repository is invalid.')
    }
    const read = captureRepositoryMethod(repository, 'read')
    const persist = captureRepositoryMethod(repository, 'persist')
    this.#repository = Object.freeze({
      read: read.bind(repository),
      persist: persist.bind(repository),
    })
    const captureFence = propertyValue(properties, 'captureWriterFence', 'Stored Time job authority options')
    if (typeof captureFence !== 'function') throw new TypeError('Writer-fence capture must be a function.')
    this.#captureWriterFence = captureFence as () => unknown
    const createJobId = properties.createJobId?.value
    if (createJobId !== undefined && typeof createJobId !== 'function') {
      throw new TypeError('Stored Time job-ID factory must be a function.')
    }
    this.#createJobId = (createJobId as (() => string) | undefined) ?? createRandomJobId
  }

  snapshot(): Readonly<StoredTimeAuthorityPublicationV2> {
    return this.#publication
  }

  async recoverDurableCheckpoint(): Promise<Readonly<StoredTimeJobRecoveryResultV2>> {
    if (this.#indeterminate) return recoveryResult('indeterminate', this.#publication)
    if (this.#lease !== null || this.#writeInFlight !== null ||
      this.#admissionInFlight || this.#recoveryInFlight) {
      return recoveryResult('busy', this.#publication)
    }
    this.#recoveryInFlight = true
    try {
    const fence = captureFence(this.#captureWriterFence())
    const durable = await this.#readRecord(fence)
    if (durable.status === 'empty') return recoveryResult('empty', this.#publication)
    if (durable.status === 'invalid') {
      this.#indeterminate = true
      return recoveryResult('indeterminate', this.#publication, durable.error)
    }
    if (
      durable.record.buildId !== this.#ready.buildId ||
      durable.record.catalogHash !== this.#ready.catalogHash ||
      durable.record.tuningHash !== this.#ready.tuningHash ||
      durable.record.tuningProfileId !==
        this.#publication.runtime.dysonTuningProfile ||
      durable.record.originAuthority.permanentDoubleIp !== this.#permanentDoubleIp
    ) {
      this.#indeterminate = true
      return recoveryResult(
        'indeterminate', this.#publication,
        'Durable Stored Time checkpoint identity does not match this release.',
      )
    }
    const current = encodeAuthorityPublication(this.#publication)
    const currentHash = await hashCanonicalValueV2(current)
    const { candidateHash: _candidateHash, ...core } = durable.record
    const recomputedCandidateHash = await hashCanonicalValueV2(core)
    if (
      durable.record.proposedBaseRevision !== this.#publication.revision ||
      durable.record.publicationHash !== currentHash ||
      durable.record.candidateHash !== recomputedCandidateHash ||
      canonicalJson(durable.record.publication) !== canonicalJson(current) ||
      !fencesEqual(fence, Object.freeze({
        ownerId: durable.record.writerOwnerId,
        generation: durable.record.writerGeneration,
      }))
    ) {
      this.#indeterminate = true
      return recoveryResult(
        'indeterminate', this.#publication,
        'Durable Stored Time checkpoint does not match the supplied publication and writer fence.',
      )
    }
    if (durable.record.kind === 'stored-time-origin-v2') {
      this.#recoveredPriorHash = durable.record.candidateHash
      return recoveryResult('recovered', this.#publication)
    }
    const policyPlan = planStoredTimePolicyV2(Object.freeze({
      policyId: durable.record.policyId,
      policyVersion: 1,
      requestedDurationSeconds: durable.record.requestedDurationSeconds,
      initialAutomationHorizonSeconds:
        durable.record.originAuthority.initialAutomationHorizonSeconds,
      automationIntervalSeconds: durable.record.automationIntervalSeconds,
      initialAutomationTargetIndex:
        durable.record.originAuthority.initialAutomationTargetIndex,
      hardEvents: Object.freeze([]),
    }))
    if (
      durable.record.automationIntervalSeconds !==
        DEFAULT_AUTOMATION_INTERVAL_SECONDS ||
      durable.record.requestedRawAutomationTicks !==
        policyPlan.rawAutomationBoundaries.toString() ||
      !approximatelyEqual(
        durable.record.cumulativeAccounting.cumulativeProcessedSeconds +
          durable.record.sealedRemainingDurationSeconds,
        durable.record.requestedDurationSeconds,
      )
    ) {
      this.#indeterminate = true
      return recoveryResult(
        'indeterminate', this.#publication,
        'Durable Stored Time checkpoint does not reproduce its trusted policy plan.',
      )
    }
    const originAccounting = Object.freeze({
      ...ZERO_ACCOUNTING,
      sealedInfinityCycleSeconds:
        durable.record.originAuthority.infinityCycleSeconds,
      sealedInfinityBoundaryRemaining:
        durable.record.originAuthority.infinityBoundaryRemaining,
      automationTimeUntilNextEvent:
        durable.record.originAuthority.initialAutomationHorizonSeconds,
    })
    const recoveredLease: ActiveLeaseV2 = {
      jobId: durable.record.jobId,
      workerInstanceNonce: this.#ready.workerInstanceNonce,
      originRevision: durable.record.originRevision,
      acknowledgedBaseRevision: durable.record.acknowledgedBaseRevision,
      policyId: durable.record.policyId,
      policyVersion: 1,
      checkpointSequence: durable.record.checkpointSequence,
      controlSequence: 0,
      admittedBankSeconds: durable.record.admittedBankSeconds,
      requestedDurationSeconds: durable.record.requestedDurationSeconds,
      requestedRawAutomationTicks: durable.record.requestedRawAutomationTicks,
      automationIntervalSeconds: durable.record.automationIntervalSeconds,
      policyPlan,
      originAuthority: durable.record.originAuthority,
      cumulativeAccounting: originAccounting,
      cumulativeSchedulerSummary: ZERO_SCHEDULER_SUMMARY,
      remainingQueuedInputs:durable.record.originAuthority.originQueuedInputs,
      priorCandidateHash: durable.record.candidateHash,
      fence,
      terminalAfterWrite: null,
      awaitingWorkerCancellation: false,
      awaitingWorkerPause: false,
    }
    try {
      const authority = validateAccountingProof(
        durable.record.cumulativeAccounting,
        durable.record.schedulerSummary,
        recoveredLease,
      )
      const rebuilt = authoritativePublication(
        durable.record.publication,
        durable.record.cumulativeAccounting,
        durable.record.schedulerSummary,
        authority,
        recoveredLease,
        null,
        null,
        durable.record.rebasedQueuedInputs,
      )
      if (
        rebuilt.revision !== durable.record.proposedBaseRevision ||
        canonicalJson(encodeAuthorityPublication(rebuilt)) !==
          canonicalJson(durable.record.publication)
      ) {
        throw new RangeError('Durable Stored Time publication is not authoritative.')
      }
    } catch (error) {
      this.#indeterminate = true
      return recoveryResult('indeterminate', this.#publication, errorMessage(error))
    }
    recoveredLease.acknowledgedBaseRevision = durable.record.proposedBaseRevision
    recoveredLease.cumulativeAccounting = durable.record.cumulativeAccounting
    recoveredLease.cumulativeSchedulerSummary = durable.record.schedulerSummary
    recoveredLease.remainingQueuedInputs = durable.record.rebasedQueuedInputs
    this.#lease = recoveredLease
    const start = captureStoredTimeWorkerMainMessageV2(Object.freeze({
      type: 'start',
      protocolVersion: STORED_TIME_WORKER_PROTOCOL_VERSION_V2,
      workerInstanceNonce: this.#ready.workerInstanceNonce,
      jobId: durable.record.jobId,
      originRevision: durable.record.originRevision,
      acknowledgedBaseRevision: durable.record.proposedBaseRevision,
      policyId: durable.record.policyId,
      policyVersion: 1,
      checkpointSequence: durable.record.checkpointSequence,
      admittedBankSeconds: durable.record.admittedBankSeconds,
      requestedDurationSeconds: durable.record.requestedDurationSeconds,
      requestedRawAutomationTicks: durable.record.requestedRawAutomationTicks,
      automationIntervalSeconds: durable.record.automationIntervalSeconds,
      permanentDoubleIp: durable.record.originAuthority.permanentDoubleIp,
      materialEventBudget: 8,
      buildId: this.#ready.buildId,
      catalogHash: this.#ready.catalogHash,
      tuningHash: this.#ready.tuningHash,
      queuedInputs:Object.freeze([]),
      restart: Object.freeze({
        originalInitialAutomationHorizonSeconds:
          durable.record.originAuthority.initialAutomationHorizonSeconds,
        originalInitialAutomationTargetIndex:
          durable.record.originAuthority.initialAutomationTargetIndex,
        originalRequestedDurationSeconds: durable.record.requestedDurationSeconds,
        originalRequestedRawAutomationTicks:
          durable.record.requestedRawAutomationTicks,
        completedRepresentativeGroups:
          durable.record.cumulativeAccounting.cumulativeRepresentativeGroups,
        cumulativeAccounting: durable.record.cumulativeAccounting,
        cumulativeSchedulerSummary: durable.record.schedulerSummary,
        sealedRemainingDurationSeconds:
          durable.record.sealedRemainingDurationSeconds,
        rebasedQueuedInputs: durable.record.rebasedQueuedInputs,
        priorCandidateHash: durable.record.candidateHash,
      }),
      publication: durable.record.publication,
    }))
    return recoveryResult('recovered', this.#publication, undefined, start)
    } finally {
      this.#recoveryInFlight = false
    }
  }

  async admit(
    request: Readonly<StoredTimeJobAdmissionRequestV2>,
  ): Promise<Readonly<StoredTimeJobAdmissionResultV2>> {
    const captured = captureAdmissionRequest(request)
    if (this.#indeterminate) return admissionResult('indeterminate', this.#publication, null)
    if (this.#lease !== null || this.#writeInFlight !== null ||
      this.#admissionInFlight || this.#recoveryInFlight) {
      return admissionResult('busy', this.#publication, null)
    }
    if (captured.expectedRevision !== this.#publication.revision) {
      return admissionResult('stale-revision', this.#publication, null)
    }
    this.#admissionInFlight = true
    try {
    const admittedBankSeconds = this.#publication.state.timeline.storedTimeAvailableSeconds
    if (!(admittedBankSeconds > 0) ||
      captured.requestedDurationSeconds > admittedBankSeconds) {
      throw new RangeError('Stored Time request must be positive and within the admitted bank.')
    }
    const policyPlan = planStoredTimePolicyV2(Object.freeze({
      policyId: captured.policyId,
      policyVersion: 1,
      requestedDurationSeconds: captured.requestedDurationSeconds,
      initialAutomationHorizonSeconds:
        this.#publication.state.timeline.automationTimeUntilNextEvent,
      automationIntervalSeconds: DEFAULT_AUTOMATION_INTERVAL_SECONDS,
      initialAutomationTargetIndex:
        this.#publication.state.timeline.dysonAutomationTargetIndex,
      hardEvents: Object.freeze([]),
    }))
    const requestedRawAutomationTicks = policyPlan.rawAutomationBoundaries.toString()
    const fence = captureFence(this.#captureWriterFence())
    const jobId = requireIdentifier(this.#createJobId(), 'Stored Time job ID')
    const encoded = encodeAuthorityPublication(this.#publication)
    const publicationHash = await hashCanonicalValueV2(encoded)
    const prior = await this.#readRecord(fence)
    if (prior.status === 'invalid') return this.#fenceAdmission(prior.error)
    if (
      prior.status === 'ok' &&
      prior.record.candidateHash !== this.#recoveredPriorHash
    ) {
      return admissionResult(
        'recovery-required', this.#publication, null,
        'A durable Stored Time record must be explicitly recovered before admission.',
      )
    }
    const initializedOrigin = initializeCanonicalEventTimeCarrierV2(
      Object.freeze({
        revision: this.#publication.revision,
        state: this.#publication.state,
        runtime: this.#publication.runtime,
      }),
      this.#infinityRewardAuthority,
    )
    const originTimeline = initializedOrigin.state.timeline
    const originAccounting = Object.freeze({
      ...ZERO_ACCOUNTING,
      sealedInfinityCycleSeconds:
        originTimeline.infinityCycleSeconds,
      sealedInfinityBoundaryRemaining:
        originTimeline.infinityBoundaryRemaining,
      automationTimeUntilNextEvent:
        originTimeline.automationTimeUntilNextEvent,
    })
    const originAuthority = captureOriginAuthority(Object.freeze({
      storedTimeAvailableSeconds: admittedBankSeconds,
      doubleTimeUnlocked: this.#publication.state.timeline.doubleTime.unlocked,
      doubleTimeBankSeconds: this.#publication.state.timeline.doubleTime.bankSeconds,
      doubleTimeRate: this.#publication.state.timeline.doubleTime.rate,
      infinityCycleSeconds: originTimeline.infinityCycleSeconds,
      infinityBoundaryRemaining:
        originTimeline.infinityBoundaryRemaining,
      initialAutomationHorizonSeconds:
        originTimeline.automationTimeUntilNextEvent,
      initialAutomationTargetIndex:
        this.#publication.state.timeline.dysonAutomationTargetIndex,
      initialResearchAutomationTargetIndex:
        this.#publication.state.timeline.researchAutomationTargetIndex,
      researchAutomationUnlocked:
        this.#publication.state.infinity.automationUnlocked.research,
      permanentDoubleIp: this.#permanentDoubleIp,
      dreamStrangeMatter: gameDecimalToCanonicalString(
        this.#publication.state.dream.strangeMatter,
      ),
      dreamResetCount: this.#publication.state.dream.resetCount.toString(),
      lifetimeStrangeMatter: gameDecimalToCanonicalString(
        this.#publication.state.statistics.lifetime.strangeMatter,
      ),
      currentQuantumRunStrangeMatter: gameDecimalToCanonicalString(
        this.#publication.state.statistics.currentQuantumRun.strangeMatter,
      ),
      recentProcessedSegmentStrangeMatter: gameDecimalToCanonicalString(
        this.#publication.state.statistics.recentProcessedSegment.strangeMatter,
      ),
      lifetimeMeteorDreamResets:
        this.#publication.state.statistics.lifetime.meteorDreamResets.toString(),
      lifetimeAiDreamResets:
        this.#publication.state.statistics.lifetime.aiDreamResets.toString(),
      lifetimeGlobalWarmingDreamResets:
        this.#publication.state.statistics.lifetime.globalWarmingDreamResets.toString(),
      lifetimeBlackHoleDreamResets:
        this.#publication.state.statistics.lifetime.blackHoleDreamResets.toString(),
      currentQuantumRunMeteorDreamResets:
        this.#publication.state.statistics.currentQuantumRun.meteorDreamResets.toString(),
      currentQuantumRunAiDreamResets:
        this.#publication.state.statistics.currentQuantumRun.aiDreamResets.toString(),
      currentQuantumRunGlobalWarmingDreamResets:
        this.#publication.state.statistics.currentQuantumRun.globalWarmingDreamResets.toString(),
      currentQuantumRunBlackHoleDreamResets:
        this.#publication.state.statistics.currentQuantumRun.blackHoleDreamResets.toString(),
      recentProcessedSegmentMeteorDreamResets:
        this.#publication.state.statistics.recentProcessedSegment.meteorDreamResets.toString(),
      recentProcessedSegmentAiDreamResets:
        this.#publication.state.statistics.recentProcessedSegment.aiDreamResets.toString(),
      recentProcessedSegmentGlobalWarmingDreamResets:
        this.#publication.state.statistics.recentProcessedSegment.globalWarmingDreamResets.toString(),
      recentProcessedSegmentBlackHoleDreamResets:
        this.#publication.state.statistics.recentProcessedSegment.blackHoleDreamResets.toString(),
      originQueuedInputs:captured.queuedInputs??Object.freeze([]),
    }))
    const core: StoredTimeCheckpointRecordCoreV2 = Object.freeze({
      kind: 'stored-time-origin-v2',
      jobId,
      workerInstanceNonce: this.#ready.workerInstanceNonce,
      writerOwnerId: fence.ownerId,
      writerGeneration: fence.generation,
      originRevision: this.#publication.revision,
      acknowledgedBaseRevision: this.#publication.revision,
      proposedBaseRevision: this.#publication.revision,
      buildId: this.#ready.buildId,
      catalogHash: this.#ready.catalogHash,
      tuningHash: this.#ready.tuningHash,
      tuningProfileId: this.#publication.runtime.dysonTuningProfile,
      policyId: captured.policyId,
      policyVersion: 1,
      checkpointSequence: 0,
      admittedBankSeconds,
      requestedDurationSeconds: captured.requestedDurationSeconds,
      unrequestedReserveSeconds:
        admittedBankSeconds - captured.requestedDurationSeconds,
      requestedRawAutomationTicks,
      automationIntervalSeconds: DEFAULT_AUTOMATION_INTERVAL_SECONDS,
      originAuthority,
      cumulativeAccounting: originAccounting,
      schedulerSummary: ZERO_SCHEDULER_SUMMARY,
      sealedRemainingDurationSeconds: captured.requestedDurationSeconds,
      rebasedQueuedInputs: Object.freeze([]),
      publicationHash,
      publication: encoded,
    })
    const origin = await completeRecord(core)
    const write = await this.#persistRecord(origin, fence)
    if (write.status === 'definite-failure') {
      return admissionResult(
        'persistence-failed',
        this.#publication,
        null,
        'Stored Time origin persistence failed before lease grant.',
      )
    }
    const readBack = await this.#readRecord(fence)
    if (readBack.status === 'ok' && recordsEqual(readBack.record, origin)) {
      const finalFence = captureFence(this.#captureWriterFence())
      if (!fencesEqual(finalFence, fence)) {
        return this.#fenceAdmission(
          'Writer authority changed during Stored Time origin persistence.',
        )
      }
      this.#lease = {
        jobId,
        workerInstanceNonce: this.#ready.workerInstanceNonce,
        originRevision: this.#publication.revision,
        acknowledgedBaseRevision: this.#publication.revision,
        policyId: captured.policyId,
        policyVersion: 1,
        checkpointSequence: 0,
        controlSequence: 0,
        admittedBankSeconds,
        requestedDurationSeconds: captured.requestedDurationSeconds,
        requestedRawAutomationTicks,
        automationIntervalSeconds: DEFAULT_AUTOMATION_INTERVAL_SECONDS,
        policyPlan,
        originAuthority,
        cumulativeAccounting: originAccounting,
        cumulativeSchedulerSummary: ZERO_SCHEDULER_SUMMARY,
        remainingQueuedInputs:captured.queuedInputs??Object.freeze([]),
        priorCandidateHash: origin.candidateHash,
        fence,
        terminalAfterWrite: null,
        awaitingWorkerCancellation: false,
        awaitingWorkerPause: false,
      }
      this.#recoveredPriorHash = null
      const start = captureStoredTimeWorkerMainMessageV2(Object.freeze({
        type: 'start',
        protocolVersion: STORED_TIME_WORKER_PROTOCOL_VERSION_V2,
        workerInstanceNonce: this.#ready.workerInstanceNonce,
        jobId,
        originRevision: this.#publication.revision,
        acknowledgedBaseRevision: this.#publication.revision,
        policyId: captured.policyId,
        policyVersion: 1,
        checkpointSequence: 0,
        admittedBankSeconds,
        requestedDurationSeconds: captured.requestedDurationSeconds,
        requestedRawAutomationTicks,
        automationIntervalSeconds: DEFAULT_AUTOMATION_INTERVAL_SECONDS,
        permanentDoubleIp: originAuthority.permanentDoubleIp,
        materialEventBudget: 8,
        buildId: this.#ready.buildId,
        catalogHash: this.#ready.catalogHash,
        tuningHash: this.#ready.tuningHash,
        queuedInputs:captured.queuedInputs??Object.freeze([]),
        restart: null,
        publication: encoded,
      }))
      return admissionResult('started', this.#publication, start)
    }
    if (
      write.status === 'ambiguous' && readBackMatchesPrior(readBack, prior)
    ) {
      return admissionResult(
        'persistence-failed', this.#publication, null,
        'Ambiguous Stored Time origin write did not commit.',
      )
    }
    return this.#fenceAdmission('Stored Time origin persistence became indeterminate.')
    } finally {
      this.#admissionInFlight = false
    }
  }

  commitCandidate(
    value: unknown,
  ): Promise<Readonly<StoredTimeCheckpointCommitResultV2>> {
    if (this.#indeterminate) {
      return Promise.resolve(commitResult('indeterminate', this.#publication, null, null))
    }
    if (this.#writeInFlight !== null) {
      return Promise.resolve(commitResult('busy', this.#publication, null, null))
    }
    let captured: Readonly<StoredTimeWorkerMessageV2>
    try {
      captured = captureStoredTimeWorkerMessageV2(value)
    } catch {
      return Promise.resolve(commitResult('rejected', this.#publication, null, null))
    }
    if (captured.type !== 'checkpoint-candidate' && captured.type !== 'completed' &&
      captured.type !== 'authority-request') {
      return Promise.resolve(commitResult('rejected', this.#publication, null, null))
    }
    const lease = this.#lease
    if (lease === null || !candidateMatchesLease(captured, lease)) {
      return Promise.resolve(commitResult('rejected', this.#publication, null, null))
    }
    const currentFence = captureFence(this.#captureWriterFence())
    if (!fencesEqual(currentFence, lease.fence)) {
      this.#lease = null
      this.#transientAuthorityHead = null
      return Promise.resolve(commitResult(
        'rejected', this.#publication, null,
        createControlMessage(lease, 'authority-revoked', 'writer-fence-lost'),
      ))
    }
    const operation = captured.type === 'authority-request'
      ? this.#commitTransientAuthorityRequest(captured, lease)
      : this.#commitCapturedCandidate(captured, lease)
    this.#writeInFlight = operation
    void operation.finally(() => {
      if (this.#writeInFlight === operation) this.#writeInFlight = null
    })
    return operation
  }

  acknowledgeWorkerTerminal(value: unknown): boolean {
    const captured = captureStoredTimeWorkerMessageV2(value)
    const lease = this.#lease
    if (
      (captured.type !== 'cancelled' && captured.type !== 'paused' &&
        captured.type !== 'failed') ||
      lease === null ||
      captured.workerInstanceNonce !== lease.workerInstanceNonce ||
      captured.jobId !== lease.jobId ||
      captured.originRevision !== lease.originRevision ||
      captured.acknowledgedBaseRevision !== lease.acknowledgedBaseRevision ||
      captured.policyId !== lease.policyId ||
      captured.policyVersion !== lease.policyVersion ||
      captured.checkpointSequence !== lease.checkpointSequence ||
      !terminalProgressMatches(captured.progress, lease) ||
      (captured.type === 'cancelled' && !lease.awaitingWorkerCancellation) ||
      (captured.type === 'paused' && captured.reason === 'lifecycle' &&
        !lease.awaitingWorkerPause) ||
      (captured.type === 'paused' && captured.reason === 'balanced-wall-limit' &&
        lease.policyId !== 'stored-time-balanced-v1')
    ) return false
    this.#recoveredPriorHash = lease.priorCandidateHash
    this.#lease = null
    this.#transientAuthorityHead = null
    return true
  }

  async cancel(
    request: Readonly<StoredTimeJobControlRequestV2>,
  ): Promise<Readonly<StoredTimeJobControlResultV2>> {
    const expectedRevision = captureControlRequest(request)
    if (this.#controlInFlight) return controlResult('busy', this.#publication, null)
    this.#controlInFlight = true
    try {
    if (this.#indeterminate) return controlResult('indeterminate', this.#publication, null)
    if (expectedRevision !== this.#publication.revision) {
      return controlResult('stale-revision', this.#publication, null)
    }
    const lease = this.#lease
    if (lease === null) return controlResult('no-job', this.#publication, null)
    if (lease.awaitingWorkerCancellation) {
      return controlResult('busy', this.#publication, null)
    }
    if (this.#writeInFlight !== null) {
      lease.terminalAfterWrite = Object.freeze({ type: 'cancel', reason: 'user' })
      const committed = await this.#writeInFlight
      if (committed.status === 'indeterminate') {
        return controlResult('indeterminate', this.#publication, null)
      }
      return controlResult(
        committed.status === 'committed-cancelled'
          ? 'cancelled-after-commit'
          : 'cancelled',
        this.#publication,
        committed.terminalControl,
      )
    }
    const message = createControlMessage(lease, 'cancel', 'user')
    lease.awaitingWorkerCancellation = true
    return controlResult('sent', this.#publication, message)
    } finally {
      this.#controlInFlight = false
    }
  }

  requestLifecyclePause(
    request: Readonly<StoredTimeJobControlRequestV2>,
    reason: 'browser-hidden' | 'native-background' | 'host-suspending',
  ): Readonly<StoredTimeJobControlResultV2> {
    const expectedRevision = captureControlRequest(request)
    if (this.#controlInFlight) return controlResult('busy', this.#publication, null)
    if (this.#indeterminate) return controlResult('indeterminate', this.#publication, null)
    if (expectedRevision !== this.#publication.revision) {
      return controlResult('stale-revision', this.#publication, null)
    }
    const lease = this.#lease
    if (lease === null) return controlResult('no-job', this.#publication, null)
    if (this.#writeInFlight !== null || lease.terminalAfterWrite !== null) {
      if (lease.terminalAfterWrite !== null) {
        return controlResult('no-job', this.#publication, null)
      }
      lease.awaitingWorkerPause = true
      return controlResult(
        'sent', this.#publication,
        createControlMessage(lease, 'lifecycle-pause', reason),
      )
    }
    lease.awaitingWorkerPause = true
    return controlResult(
      'sent', this.#publication,
      createControlMessage(lease, 'lifecycle-pause', reason),
    )
  }

  async revokeForForeground(
    request: Readonly<StoredTimeJobControlRequestV2>,
  ): Promise<Readonly<StoredTimeJobControlResultV2>> {
    const expectedRevision = captureControlRequest(request)
    if (this.#controlInFlight) return controlResult('busy', this.#publication, null)
    this.#controlInFlight = true
    try {
    if (this.#indeterminate) return controlResult('indeterminate', this.#publication, null)
    if (expectedRevision !== this.#publication.revision) {
      return controlResult('stale-revision', this.#publication, null)
    }
    const lease = this.#lease
    if (lease === null) return controlResult('no-job', this.#publication, null)
    if (this.#writeInFlight !== null) {
      lease.terminalAfterWrite = Object.freeze({
      type: 'authority-revoked',
      reason: 'foreground-command',
      })
      const committed = await this.#writeInFlight
      if (committed.status === 'indeterminate') {
        return controlResult('indeterminate', this.#publication, null)
      }
      return controlResult(
        committed.status === 'committed-revoked'
          ? 'revoked-after-commit'
          : 'revoked',
        this.#publication,
        committed.terminalControl,
      )
    }
    const message = createControlMessage(
      lease, 'authority-revoked', 'foreground-command',
    )
    this.#lease = null
    this.#transientAuthorityHead = null
    return controlResult('revoked', this.#publication, message)
    } finally {
      this.#controlInFlight = false
    }
  }

  async #commitCapturedCandidate(
    candidate: Extract<Readonly<StoredTimeWorkerMessageV2>, { type: 'checkpoint-candidate' | 'completed' }>,
    lease: ActiveLeaseV2,
  ): Promise<Readonly<StoredTimeCheckpointCommitResultV2>> {
    try {
      const proposalHash = await hashCanonicalValueV2(candidate.publication)
      if (proposalHash !== candidate.proposalHash) {
        return this.#failedCommit(lease, 'rejected', 'Proposal hash mismatch.')
      }
      const remaining = candidate.type === 'completed'
        ? 0
        : candidate.sealedRemainingDurationSeconds
      const queue = candidate.rebasedQueuedInputs
      const transient = this.#transientAuthorityHead
      if (transient?.phase.startsWith('pre-')) {
        return this.#failedCommit(
          lease,
          'rejected',
          'Durable publication cannot commit an outstanding transient PRE.',
        )
      }
      const infinityResetCount = BigInt(candidate.schedulerSummary.infinityResetCount)
      const durableInfinityResetCount = BigInt(
        lease.cumulativeSchedulerSummary.infinityResetCount,
      )
      if (
        infinityResetCount > durableInfinityResetCount &&
        (transient === null ||
          transient.schedulerSummary.infinityResetCount !==
            candidate.schedulerSummary.infinityResetCount)
      ) {
        return this.#failedCommit(
          lease,
          'rejected',
          'Positive Infinity reset accounting lacks an authenticated transient POST.',
        )
      }
      const validationLease: ActiveLeaseV2 = transient === null ? lease : {
        ...lease,
        cumulativeAccounting: transient.accounting,
        cumulativeSchedulerSummary: transient.schedulerSummary,
        remainingQueuedInputs: transient.remainingQueuedInputs,
      }
      const validationPublication = transient?.publication ?? this.#publication
      if (
        lease.acknowledgedBaseRevision === Number.MAX_SAFE_INTEGER - 1 &&
        remaining > 0
      ) {
        return this.#failedCommit(
          lease,
          'revision-exhausted',
          'Stored Time checkpoint cannot consume the last safe revision before completion.',
        )
      }
      const accountingAuthority = validateAccountingProof(
        candidate.accounting,
        candidate.schedulerSummary,
        validationLease,
      )
      const authoritativeAccounting = normalizeInfinitySealAccounting(
        candidate.accounting,
        validationLease,
        candidate.schedulerSummary,
      )
      const authoritative = authoritativePublication(
        candidate.publication,
        authoritativeAccounting,
        candidate.schedulerSummary,
        accountingAuthority,
        validationLease,
        validationPublication.state,
        validationPublication.runtime,
        queue,
        this.#infinityRewardAuthority,
      )
      const encoded = encodeValidatedStoredTimeWorkerPublicationV2(authoritative)
      const publicationHash = await hashCanonicalValueV2(encoded)
      if (!approximatelyEqual(
        candidate.accounting.cumulativeProcessedSeconds + remaining,
        lease.requestedDurationSeconds,
      )) {
        throw new RangeError('Candidate processed and remaining duration do not match the admitted request.')
      }
      const core: StoredTimeCheckpointRecordCoreV2 = Object.freeze({
        kind: 'stored-time-checkpoint-v2',
        jobId: lease.jobId,
        workerInstanceNonce: this.#ready.workerInstanceNonce,
        writerOwnerId: lease.fence.ownerId,
        writerGeneration: lease.fence.generation,
        originRevision: lease.originRevision,
        acknowledgedBaseRevision: lease.acknowledgedBaseRevision,
        proposedBaseRevision: lease.acknowledgedBaseRevision + 1,
        buildId: this.#ready.buildId,
        catalogHash: this.#ready.catalogHash,
        tuningHash: this.#ready.tuningHash,
        tuningProfileId: this.#publication.runtime.dysonTuningProfile,
        policyId: lease.policyId,
        policyVersion: 1,
        checkpointSequence: lease.checkpointSequence + 1,
        admittedBankSeconds: lease.admittedBankSeconds,
        requestedDurationSeconds: lease.requestedDurationSeconds,
        unrequestedReserveSeconds:
          lease.admittedBankSeconds - lease.requestedDurationSeconds,
        requestedRawAutomationTicks: lease.requestedRawAutomationTicks,
        automationIntervalSeconds: lease.automationIntervalSeconds,
        originAuthority: lease.originAuthority,
        cumulativeAccounting: authoritativeAccounting,
        schedulerSummary: candidate.schedulerSummary,
        sealedRemainingDurationSeconds: remaining,
        rebasedQueuedInputs: queue,
        publicationHash,
        publication: encoded,
      })
      const record = await completeRecord(core)
      const receipt = await this.#persistRecord(record, lease.fence)
      if (receipt.status === 'definite-failure') {
        return this.#failedCommit(
          lease,
          'retryable-failure',
          'Stored Time checkpoint persistence failed.',
        )
      }
      const readBack = await this.#readRecord(lease.fence)
      if (readBack.status === 'ok' && recordsEqual(readBack.record, record)) {
        const finalFence = captureFence(this.#captureWriterFence())
        if (!fencesEqual(finalFence, lease.fence)) {
          return this.#fenceCommit(
            'Writer authority changed during Stored Time checkpoint persistence.',
          )
        }
        this.#publication = authoritative
        lease.acknowledgedBaseRevision = authoritative.revision
        lease.checkpointSequence += 1
        lease.cumulativeAccounting = authoritativeAccounting
        lease.cumulativeSchedulerSummary = candidate.schedulerSummary
        lease.remainingQueuedInputs=queue
        lease.priorCandidateHash = record.candidateHash
        this.#transientAuthorityHead = null
        const acknowledgement = Object.freeze({
          type: 'checkpoint-committed',
          protocolVersion: STORED_TIME_WORKER_PROTOCOL_VERSION_V2,
          workerInstanceNonce: this.#ready.workerInstanceNonce,
          jobId: lease.jobId,
          originRevision: lease.originRevision,
          acknowledgedBaseRevision: authoritative.revision,
          policyId: lease.policyId,
          policyVersion: 1,
          checkpointSequence: lease.checkpointSequence,
          publishedRevision: authoritative.revision,
          proposalHashEcho: candidate.proposalHash,
          candidateHash: record.candidateHash,
          accounting: authoritativeAccounting,
          sealedRemainingDurationSeconds: remaining,
          rebasedQueuedInputs: queue,
          publication: encoded,
        }) as Readonly<StoredTimeWorkerMainMessageV2>
        if (candidate.type === 'completed' || lease.terminalAfterWrite !== null) {
          const terminal = lease.terminalAfterWrite !== null
            ? createControlMessage(
              lease,
              lease.terminalAfterWrite.type,
              lease.terminalAfterWrite.reason,
            )
            : null
          if (lease.terminalAfterWrite?.type === 'cancel') {
            lease.awaitingWorkerCancellation = true
          } else {
            this.#lease = null
            this.#transientAuthorityHead = null
          }
          const committedStatus = lease.terminalAfterWrite?.type === 'cancel'
            ? 'committed-cancelled'
            : lease.terminalAfterWrite?.type === 'authority-revoked'
              ? 'committed-revoked'
              : 'committed'
          return commitResult(
            committedStatus,
            authoritative,
            acknowledgement,
            terminal,
          )
        }
        return commitResult('committed', authoritative, acknowledgement, null)
      }
      if (
        receipt.status === 'ambiguous' && readBack.status === 'ok' &&
        readBack.record.candidateHash === lease.priorCandidateHash
      ) {
        return this.#failedCommit(
          lease,
          'retryable-failure',
          'Ambiguous checkpoint write did not commit.',
        )
      }
      return this.#fenceCommit('Stored Time checkpoint persistence became indeterminate.')
    } catch (error) {
      return this.#failedCommit(lease, 'rejected', errorMessage(error))
    }
  }

  async #commitTransientAuthorityRequest(
    candidate: Extract<Readonly<StoredTimeWorkerMessageV2>, { type: 'authority-request' }>,
    lease: ActiveLeaseV2,
  ): Promise<Readonly<StoredTimeCheckpointCommitResultV2>> {
    try {
      const proposalHash = await hashCanonicalValueV2(candidate.publication)
      if (proposalHash !== candidate.proposalHash) {
        return this.#revokeTransientCommit(
          lease,
          'Transient authority proposal hash mismatch.',
        )
      }
      const prior = this.#transientAuthorityHead
      if (prior !== null && candidate.phase === prior.phase) {
        const queue = captureStoredTimeWorkerQueuedInputsV2(candidate.rebasedQueuedInputs)
        if (
          proposalHash !== prior.proposalHash ||
          !sameDataTree(candidate.accounting, prior.accounting) ||
          !sameDataTree(candidate.schedulerSummary, prior.schedulerSummary) ||
          !sameDataTree(queue, prior.remainingQueuedInputs)
        ) {
          return this.#revokeTransientCommit(
            lease,
            'Transient authority duplicate does not match the issued operation.',
          )
        }
        const controlled = this.#abortTransientIfControlled(
          lease,
          'Transient authority duplicate was superseded by terminal control.',
        )
        if (controlled !== null) return controlled
        return commitResult('committed', this.#publication, Object.freeze({
          type: 'authority-granted' as const,
          protocolVersion: STORED_TIME_WORKER_PROTOCOL_VERSION_V2,
          workerInstanceNonce: lease.workerInstanceNonce,
          jobId: lease.jobId,
          originRevision: lease.originRevision,
          acknowledgedBaseRevision: lease.acknowledgedBaseRevision,
          policyId: lease.policyId,
          policyVersion: 1 as const,
          checkpointSequence: lease.checkpointSequence,
          phase: candidate.phase,
          proposalHashEcho: proposalHash,
          expectedPostHash: prior.expectedPostHash,
        }), null)
      }
      const expectedPhase = prior === null || prior.phase.startsWith('post-')
        ? candidate.phase.startsWith('pre-')
        : candidate.phase === prior.phase.replace('pre-', 'post-')
      if (!expectedPhase) {
        return this.#revokeTransientCommit(
          lease,
          'Transient authority phase is stale or out of order.',
        )
      }
      const basePublication = prior?.publication ?? this.#publication
      const validationLease: ActiveLeaseV2 = {
        ...lease,
        cumulativeAccounting: prior?.accounting ?? lease.cumulativeAccounting,
        cumulativeSchedulerSummary:
          prior?.schedulerSummary ?? lease.cumulativeSchedulerSummary,
        remainingQueuedInputs:
          prior?.remainingQueuedInputs ?? lease.remainingQueuedInputs,
      }
      const accountingAuthority = validateAccountingProof(
        candidate.accounting,
        candidate.schedulerSummary,
        validationLease,
      )
      const decoded = decodeStoredTimeWorkerPublicationV2(candidate.publication)
      const transientAccountingAuthority = Object.freeze({
        ...accountingAuthority,
        // The cumulative plan proves this countdown within the scheduler bound.
        // Preserve the sequential material-boundary value across transient epochs.
        automationTimeUntilNextEvent:
          decoded.state.timeline.automationTimeUntilNextEvent,
      })
      const authoritativeAccounting = normalizeInfinitySealAccounting(
        candidate.accounting,
        validationLease,
        candidate.schedulerSummary,
      )
      const queue = captureStoredTimeWorkerQueuedInputsV2(candidate.rebasedQueuedInputs)
      const authoritative = authoritativePublication(
        candidate.publication,
        authoritativeAccounting,
        candidate.schedulerSummary,
        transientAccountingAuthority,
        validationLease,
        basePublication.state,
        basePublication.runtime,
        queue,
        this.#infinityRewardAuthority,
      )
      if (!sameDataTree(decoded.state, authoritative.state) ||
        !sameDataTree(decoded.runtime, authoritative.runtime)) {
        return this.#revokeTransientCommit(
          lease,
          `Transient authority publication is not canonical (${firstDataTreeDifference(decoded.state, authoritative.state, 'state') ?? firstDataTreeDifference(decoded.runtime, authoritative.runtime, 'runtime') ?? 'unknown'}).`,
        )
      }
      if (
        candidate.phase.startsWith('post-') &&
        prior?.expectedPostHash !== proposalHash
      ) {
        return this.#revokeTransientCommit(
          lease,
          'Transient authority POST does not match its issued PRE acknowledgement.',
        )
      }
      const expectedPostHash = candidate.phase === 'pre-infinity' ||
        candidate.phase === 'pre-quantum'
        ? await hashCanonicalValueV2(expectedTransientPostPublicationV2(
          candidate.phase,
          authoritative,
          queue,
          lease.acknowledgedBaseRevision,
          this.#infinityRewardAuthority,
        ))
        : null
      const controlled = this.#abortTransientIfControlled(
        lease,
        'Transient authority operation was superseded by terminal control.',
      )
      if (controlled !== null) return controlled
      this.#transientAuthorityHead = Object.freeze({
        phase: candidate.phase,
        proposalHash,
        publication: Object.freeze({
          revision: lease.acknowledgedBaseRevision,
          state: decoded.state,
          runtime: decoded.runtime,
        }),
        accounting: authoritativeAccounting,
        schedulerSummary: candidate.schedulerSummary,
        remainingQueuedInputs: queue,
        expectedPostHash,
      })
      const acknowledgement = Object.freeze({
        type: 'authority-granted' as const,
        protocolVersion: STORED_TIME_WORKER_PROTOCOL_VERSION_V2,
        workerInstanceNonce: lease.workerInstanceNonce,
        jobId: lease.jobId,
        originRevision: lease.originRevision,
        acknowledgedBaseRevision: lease.acknowledgedBaseRevision,
        policyId: lease.policyId,
        policyVersion: 1 as const,
        checkpointSequence: lease.checkpointSequence,
        phase: candidate.phase,
        proposalHashEcho: proposalHash,
        expectedPostHash,
      })
      return commitResult('committed', this.#publication, acknowledgement, null)
    } catch (error) {
      return this.#revokeTransientCommit(lease, errorMessage(error))
    }
  }

  async #persistRecord(
    record: Readonly<StoredTimeCheckpointRecordV2>,
    fence: Readonly<StoredTimeWriterFenceV2>,
  ): Promise<Readonly<StoredTimeCheckpointWriteReceiptV2>> {
    try {
      const receipt = captureStoredTimeWorkerDataV2(
        await this.#repository.persist(record, fence),
      ) as Readonly<Record<string, unknown>>
      requireExactKeys(receipt, ['status'], 'Checkpoint write receipt')
      if (!['committed', 'definite-failure', 'ambiguous'].includes(String(receipt.status))) {
        throw new TypeError('Checkpoint write receipt status is invalid.')
      }
      return Object.freeze({ status: receipt.status as StoredTimeCheckpointWriteStatusV2 })
    } catch {
      return Object.freeze({ status: 'ambiguous' })
    }
  }

  async #readRecord(
    fence: Readonly<StoredTimeWriterFenceV2>,
  ): Promise<CheckpointReadResultV2> {
    try {
      const value = await this.#repository.read(fence)
      if (value === null) return Object.freeze({ status: 'empty' })
      return Object.freeze({ status: 'ok', record: captureCheckpointRecordV2(value) })
    } catch (error) {
      return Object.freeze({ status: 'invalid', error: errorMessage(error) })
    }
  }

  #fenceAdmission(error: string): Readonly<StoredTimeJobAdmissionResultV2> {
    this.#indeterminate = true
    this.#lease = null
    this.#transientAuthorityHead = null
    return admissionResult('indeterminate', this.#publication, null, error)
  }

  #fenceCommit(error: string): Readonly<StoredTimeCheckpointCommitResultV2> {
    this.#indeterminate = true
    this.#lease = null
    this.#transientAuthorityHead = null
    return commitResult('indeterminate', this.#publication, null, null, error)
  }

  #revokeTransientCommit(
    lease: ActiveLeaseV2,
    error: string,
  ): Readonly<StoredTimeCheckpointCommitResultV2> {
    const controlled = this.#abortTransientIfControlled(lease, error)
    if (controlled !== null) return controlled
    const terminal = createControlMessage(
      lease, 'authority-revoked', 'foreground-command',
    )
    this.#lease = null
    this.#transientAuthorityHead = null
    return commitResult('rejected', this.#publication, null, terminal, error)
  }

  #abortTransientIfControlled(
    lease: ActiveLeaseV2,
    error: string,
  ): Readonly<StoredTimeCheckpointCommitResultV2> | null {
    if (lease.terminalAfterWrite !== null) {
      return this.#failedCommit(lease, 'rejected', error)
    }
    if (!lease.awaitingWorkerPause) return null
    this.#transientAuthorityHead = null
    return commitResult(
      'terminal-aborted', this.#publication, null, null, error,
    )
  }

  #failedCommit(
    lease: ActiveLeaseV2,
    status: 'retryable-failure' | 'rejected' | 'revision-exhausted',
    error: string,
  ): Readonly<StoredTimeCheckpointCommitResultV2> {
    if (lease.terminalAfterWrite === null) {
      return commitResult(status, this.#publication, null, null, error)
    }
    const terminal = createControlMessage(
      lease,
      lease.terminalAfterWrite.type,
      lease.terminalAfterWrite.reason,
    )
    if (lease.terminalAfterWrite.type === 'cancel') {
      lease.awaitingWorkerCancellation = true
    } else {
      this.#lease = null
      this.#transientAuthorityHead = null
    }
    return commitResult('terminal-aborted', this.#publication, null, terminal, error)
  }
}

export async function hashStoredTimeWorkerPublicationV2(
  value: unknown,
): Promise<string> {
  return hashCanonicalValueV2(value)
}

export function captureCheckpointRecordV2(
  value: unknown,
): Readonly<StoredTimeCheckpointRecordV2> {
  if (value !== null && typeof value === 'object' && issuedCheckpointRecords.has(value)) {
    return value as Readonly<StoredTimeCheckpointRecordV2>
  }
  const captured = captureStoredTimeWorkerDataV2(value) as Readonly<Record<string, unknown>>
  requireExactKeys(captured, RECORD_KEYS, 'Stored Time checkpoint record')
  requireIdentifier(captured.jobId, 'Checkpoint job ID')
  requireIdentifier(captured.workerInstanceNonce, 'Checkpoint worker nonce')
  requireIdentifier(captured.writerOwnerId, 'Checkpoint writer owner')
  requireHash(captured.buildId, 'Checkpoint build ID', true)
  requireHash(captured.catalogHash, 'Checkpoint catalog hash')
  requireHash(captured.tuningHash, 'Checkpoint tuning hash')
  requireHash(captured.publicationHash, 'Checkpoint publication hash')
  requireHash(captured.candidateHash, 'Checkpoint candidate hash')
  if (!['stored-time-origin-v2', 'stored-time-checkpoint-v2'].includes(String(captured.kind))) {
    throw new TypeError('Checkpoint record kind is unsupported.')
  }
  if (!['stored-time-fast-v1', 'stored-time-balanced-v1', 'stored-time-exact-v1']
    .includes(String(captured.policyId)) || captured.policyVersion !== 1) {
    throw new TypeError('Checkpoint policy identity is unsupported.')
  }
  if (captured.tuningProfileId !== 'web-authored-v1') {
    throw new TypeError('Checkpoint tuning profile is unsupported.')
  }
  for (const key of [
    'writerGeneration', 'originRevision', 'acknowledgedBaseRevision',
    'proposedBaseRevision', 'checkpointSequence',
  ] as const) requireSafeInteger(captured[key], `Checkpoint ${key}`)
  requirePositiveFinite(captured.admittedBankSeconds, 'Checkpoint admitted bank')
  requirePositiveFinite(captured.requestedDurationSeconds, 'Checkpoint requested duration')
  if (typeof captured.unrequestedReserveSeconds !== 'number' ||
    !Number.isFinite(captured.unrequestedReserveSeconds) ||
    captured.unrequestedReserveSeconds < 0 ||
    !approximatelyEqual(
      captured.requestedDurationSeconds + captured.unrequestedReserveSeconds,
      captured.admittedBankSeconds,
    )) throw new RangeError('Checkpoint reserve does not match its origin bank.')
  if (typeof captured.requestedRawAutomationTicks !== 'string' ||
    !/^(?:0|[1-9]\d{0,4095})$/u.test(captured.requestedRawAutomationTicks)) {
    throw new TypeError('Checkpoint raw automation tick count is not canonical.')
  }
  if (captured.automationIntervalSeconds !== DEFAULT_AUTOMATION_INTERVAL_SECONDS) {
    throw new RangeError('Checkpoint automation interval is not the trusted authored interval.')
  }
  const originAuthority = captureOriginAuthority(captured.originAuthority)
  if (!approximatelyEqual(
    originAuthority.storedTimeAvailableSeconds,
    captured.admittedBankSeconds as number,
  )) throw new RangeError('Checkpoint origin authority does not match its admitted bank.')
  if (typeof captured.sealedRemainingDurationSeconds !== 'number' ||
    !Number.isFinite(captured.sealedRemainingDurationSeconds) ||
    captured.sealedRemainingDurationSeconds < 0) {
    throw new RangeError('Checkpoint remaining duration is invalid.')
  }
  decodeStoredTimeWorkerPublicationV2(captured.publication)
  return Object.freeze(captured) as unknown as Readonly<StoredTimeCheckpointRecordV2>
}

function captureOriginAuthority(value: unknown): Readonly<StoredTimeOriginAuthorityV2> {
  const properties = dataProperties(value, [
    'storedTimeAvailableSeconds', 'doubleTimeUnlocked',
    'doubleTimeBankSeconds', 'doubleTimeRate', 'infinityCycleSeconds',
    'infinityBoundaryRemaining', 'initialAutomationHorizonSeconds',
    'initialAutomationTargetIndex', 'initialResearchAutomationTargetIndex',
    'researchAutomationUnlocked', 'permanentDoubleIp', 'dreamStrangeMatter',
    'dreamResetCount', 'lifetimeStrangeMatter',
    'currentQuantumRunStrangeMatter', 'recentProcessedSegmentStrangeMatter',
    'lifetimeMeteorDreamResets', 'lifetimeAiDreamResets',
    'lifetimeGlobalWarmingDreamResets', 'lifetimeBlackHoleDreamResets',
    'currentQuantumRunMeteorDreamResets', 'currentQuantumRunAiDreamResets',
    'currentQuantumRunGlobalWarmingDreamResets',
    'currentQuantumRunBlackHoleDreamResets',
    'recentProcessedSegmentMeteorDreamResets',
    'recentProcessedSegmentAiDreamResets',
    'recentProcessedSegmentGlobalWarmingDreamResets',
    'recentProcessedSegmentBlackHoleDreamResets',
    'originQueuedInputs',
  ], [], 'Stored Time origin authority')
  const result = {
    storedTimeAvailableSeconds: propertyValue(
      properties, 'storedTimeAvailableSeconds', 'Stored Time origin authority',
    ),
    doubleTimeUnlocked: propertyValue(
      properties, 'doubleTimeUnlocked', 'Stored Time origin authority',
    ),
    doubleTimeBankSeconds: propertyValue(
      properties, 'doubleTimeBankSeconds', 'Stored Time origin authority',
    ),
    doubleTimeRate: propertyValue(
      properties, 'doubleTimeRate', 'Stored Time origin authority',
    ),
    infinityCycleSeconds: propertyValue(
      properties, 'infinityCycleSeconds', 'Stored Time origin authority',
    ),
    infinityBoundaryRemaining: propertyValue(
      properties, 'infinityBoundaryRemaining', 'Stored Time origin authority',
    ),
    initialAutomationHorizonSeconds: propertyValue(
      properties, 'initialAutomationHorizonSeconds', 'Stored Time origin authority',
    ),
    initialAutomationTargetIndex: propertyValue(
      properties, 'initialAutomationTargetIndex', 'Stored Time origin authority',
    ),
    initialResearchAutomationTargetIndex: propertyValue(
      properties,
      'initialResearchAutomationTargetIndex',
      'Stored Time origin authority',
    ),
    researchAutomationUnlocked: propertyValue(
      properties, 'researchAutomationUnlocked', 'Stored Time origin authority',
    ),
    permanentDoubleIp: propertyValue(
      properties, 'permanentDoubleIp', 'Stored Time origin authority',
    ),
    dreamStrangeMatter: propertyValue(
      properties, 'dreamStrangeMatter', 'Stored Time origin authority',
    ),
    dreamResetCount: propertyValue(properties, 'dreamResetCount', 'Stored Time origin authority'),
    lifetimeStrangeMatter: propertyValue(properties, 'lifetimeStrangeMatter', 'Stored Time origin authority'),
    currentQuantumRunStrangeMatter: propertyValue(properties, 'currentQuantumRunStrangeMatter', 'Stored Time origin authority'),
    recentProcessedSegmentStrangeMatter: propertyValue(properties, 'recentProcessedSegmentStrangeMatter', 'Stored Time origin authority'),
    lifetimeMeteorDreamResets: propertyValue(properties, 'lifetimeMeteorDreamResets', 'Stored Time origin authority'),
    lifetimeAiDreamResets: propertyValue(properties, 'lifetimeAiDreamResets', 'Stored Time origin authority'),
    lifetimeGlobalWarmingDreamResets: propertyValue(properties, 'lifetimeGlobalWarmingDreamResets', 'Stored Time origin authority'),
    lifetimeBlackHoleDreamResets: propertyValue(properties, 'lifetimeBlackHoleDreamResets', 'Stored Time origin authority'),
    currentQuantumRunMeteorDreamResets: propertyValue(properties, 'currentQuantumRunMeteorDreamResets', 'Stored Time origin authority'),
    currentQuantumRunAiDreamResets: propertyValue(properties, 'currentQuantumRunAiDreamResets', 'Stored Time origin authority'),
    currentQuantumRunGlobalWarmingDreamResets: propertyValue(properties, 'currentQuantumRunGlobalWarmingDreamResets', 'Stored Time origin authority'),
    currentQuantumRunBlackHoleDreamResets: propertyValue(properties, 'currentQuantumRunBlackHoleDreamResets', 'Stored Time origin authority'),
    recentProcessedSegmentMeteorDreamResets: propertyValue(properties, 'recentProcessedSegmentMeteorDreamResets', 'Stored Time origin authority'),
    recentProcessedSegmentAiDreamResets: propertyValue(properties, 'recentProcessedSegmentAiDreamResets', 'Stored Time origin authority'),
    recentProcessedSegmentGlobalWarmingDreamResets: propertyValue(properties, 'recentProcessedSegmentGlobalWarmingDreamResets', 'Stored Time origin authority'),
    recentProcessedSegmentBlackHoleDreamResets: propertyValue(properties, 'recentProcessedSegmentBlackHoleDreamResets', 'Stored Time origin authority'),
    originQueuedInputs:captureStoredTimeWorkerQueuedInputsV2(propertyValue(properties,'originQueuedInputs','Stored Time origin authority')),
  }
  for (const key of [
    'storedTimeAvailableSeconds', 'doubleTimeBankSeconds', 'doubleTimeRate',
    'infinityCycleSeconds', 'infinityBoundaryRemaining',
    'initialAutomationHorizonSeconds',
  ] as const) requireFiniteNonNegative(result[key], `Stored Time origin ${key}`)
  if (typeof result.doubleTimeUnlocked !== 'boolean') {
    throw new TypeError('Stored Time origin Double Time unlock must be boolean.')
  }
  if (typeof result.researchAutomationUnlocked !== 'boolean') {
    throw new TypeError('Stored Time origin Research automation unlock must be boolean.')
  }
  if (typeof result.permanentDoubleIp !== 'boolean') {
    throw new TypeError('Stored Time origin permanent Double-IP entitlement must be boolean.')
  }
  const dreamStrangeMatter = gameDecimalFromCanonicalString(
    result.dreamStrangeMatter as string,
  )
  if (gameDecimalToCanonicalString(dreamStrangeMatter) !== result.dreamStrangeMatter) {
    throw new TypeError('Stored Time origin Strange Matter must be canonical.')
  }
  for (const key of [
    'lifetimeStrangeMatter', 'currentQuantumRunStrangeMatter',
    'recentProcessedSegmentStrangeMatter',
  ] as const) {
    const decimal = gameDecimalFromCanonicalString(result[key] as string)
    if (gameDecimalToCanonicalString(decimal) !== result[key]) {
      throw new TypeError(`Stored Time origin ${key} must be canonical.`)
    }
  }
  for (const key of [
    'dreamResetCount',
    'lifetimeMeteorDreamResets', 'lifetimeAiDreamResets',
    'lifetimeGlobalWarmingDreamResets', 'lifetimeBlackHoleDreamResets',
    'currentQuantumRunMeteorDreamResets', 'currentQuantumRunAiDreamResets',
    'currentQuantumRunGlobalWarmingDreamResets',
    'currentQuantumRunBlackHoleDreamResets',
    'recentProcessedSegmentMeteorDreamResets',
    'recentProcessedSegmentAiDreamResets',
    'recentProcessedSegmentGlobalWarmingDreamResets',
    'recentProcessedSegmentBlackHoleDreamResets',
  ] as const) {
    if (typeof result[key] !== 'string' || !/^(?:0|[1-9]\d*)$/u.test(result[key])) {
      throw new TypeError(`Stored Time origin ${key} must be a canonical integer.`)
    }
  }
  requireSafeInteger(
    result.initialAutomationTargetIndex,
    'Stored Time origin automation target index',
  )
  if (result.initialAutomationTargetIndex > 7) {
    throw new RangeError('Stored Time origin automation target index must be within 0..7.')
  }
  requireSafeInteger(
    result.initialResearchAutomationTargetIndex,
    'Stored Time origin Research automation target index',
  )
  if (result.initialResearchAutomationTargetIndex > 13) {
    throw new RangeError(
      'Stored Time origin Research automation target index must be within 0..13.',
    )
  }
  return Object.freeze(result) as Readonly<StoredTimeOriginAuthorityV2>
}

function validateDreamPublicationAccounting(
  candidate: Readonly<CanonicalGameStateV2>,
  summary: Readonly<StoredTimeWorkerSchedulerSummaryDtoV2>,
  lease: ActiveLeaseV2,
  acknowledgedState: Readonly<CanonicalGameStateV2> | null,
): void {
  const finalProofs = [
    [summary.dreamStrangeMatterFinal, candidate.dream.strangeMatter,
      lease.originAuthority.dreamStrangeMatter, 'Dream Strange Matter'],
    [summary.dreamLifetimeStrangeMatterFinal,
      candidate.statistics.lifetime.strangeMatter,
      lease.originAuthority.lifetimeStrangeMatter, 'lifetime Strange Matter'],
    [summary.dreamCurrentQuantumRunStrangeMatterFinal,
      candidate.statistics.currentQuantumRun.strangeMatter,
      lease.originAuthority.currentQuantumRunStrangeMatter,
      'current-Quantum-run Strange Matter'],
    [summary.dreamRecentProcessedSegmentStrangeMatterFinal,
      candidate.statistics.recentProcessedSegment.strangeMatter,
      lease.originAuthority.recentProcessedSegmentStrangeMatter,
      'recent-segment Strange Matter'],
  ] as const
  const totalResets = BigInt(summary.dreamResetCount)
  for (const [finalText, actual, originText, label] of finalProofs) {
    if ((totalResets === 0n) !== (finalText === null)) {
      throw new RangeError(`${label} final proof does not match the cumulative reset count.`)
    }
    if (finalText !== null) {
      const final = gameDecimalFromCanonicalString(finalText)
      if (
        compareGameDecimals(actual, final) !== 0 ||
        compareGameDecimals(final, gameDecimalFromCanonicalString(originText)) < 0
      ) {
        throw new RangeError(`${label} does not match its authenticated final proof.`)
      }
    }
  }
  if (acknowledgedState === null) return

  const currentCounts = [
    BigInt(summary.dreamMeteorResetCount),
    BigInt(summary.dreamAiResetCount),
    BigInt(summary.dreamGlobalWarmingResetCount),
    BigInt(summary.dreamBlackHoleResetCount),
  ] as const
  const previousCounts = [
    BigInt(lease.cumulativeSchedulerSummary.dreamMeteorResetCount),
    BigInt(lease.cumulativeSchedulerSummary.dreamAiResetCount),
    BigInt(lease.cumulativeSchedulerSummary.dreamGlobalWarmingResetCount),
    BigInt(lease.cumulativeSchedulerSummary.dreamBlackHoleResetCount),
  ] as const
  const deltas = currentCounts.map((count, index) => count - previousCounts[index]!)
  const deltaTotal = deltas.reduce((total, count) => total + count, 0n)
  const normalizedTotal = BigInt(summary.dreamFastNormalizedResetCount)
  const previousNormalizedTotal = BigInt(
    lease.cumulativeSchedulerSummary.dreamFastNormalizedResetCount,
  )
  const normalizedDelta = normalizedTotal - previousNormalizedTotal
  const upgradeIds = Object.keys(acknowledgedState.dream.upgrades) as
    (keyof typeof acknowledgedState.dream.upgrades)[]
  if (upgradeIds.some((id) =>
    candidate.dream.upgrades[id] !== acknowledgedState.dream.upgrades[id]
  )) {
    throw new RangeError('Stored Time cannot rewrite Dream reset-persistent upgrades.')
  }
  const permittedCauseIndex =
    acknowledgedState.dream.disasterStage === 0n ||
    acknowledgedState.dream.disasterStage === 1n
      ? 0
      : acknowledgedState.dream.disasterStage === 2n
        ? 1
        : acknowledgedState.dream.disasterStage === 3n
          ? 2
          : -1
  const claimedCauseIndex = deltas.findIndex((count) => count > 0n)
  const expectedFinalStage = deltaTotal === 0n
    ? acknowledgedState.dream.disasterStage
    : !acknowledgedState.dream.upgrades.counterMeteor
      ? 1n
      : !acknowledgedState.dream.upgrades.counterAi
        ? 2n
        : !acknowledgedState.dream.upgrades.counterGw
          ? 3n
          : 42n
  const fastNormalized = lease.policyPlan.executionKind ===
    'fast-representative-groups'
  if (
    deltaTotal > BigInt(fastNormalized ? 4096 : STORED_TIME_DREAM_REPLAY_LIMIT_V2) ||
    deltas.filter((count) => count > 0n).length > 1 ||
    deltas.some((count) => count < 0n) ||
    normalizedDelta < 0n ||
    normalizedDelta > deltaTotal ||
    (!fastNormalized && normalizedDelta !== 0n) ||
    deltas[3] !== 0n ||
    (deltaTotal > 0n && claimedCauseIndex !== permittedCauseIndex) ||
    candidate.dream.disasterStage !== expectedFinalStage
  ) {
    throw new RangeError('Dream resets between durable checkpoints are not replayable.')
  }
  const reward = gameDecimalFromBigInt(
    deltas[0]! > 0n ? 1n : deltas[1]! > 0n ? 10n : deltas[2]! > 0n ? 20n : 0n,
  )
  let currency = acknowledgedState.dream.strangeMatter
  let lifetime = acknowledgedState.statistics.lifetime.strangeMatter
  let currentRun = acknowledgedState.statistics.currentQuantumRun.strangeMatter
  let recent = acknowledgedState.statistics.recentProcessedSegment.strangeMatter
  let requested = gameDecimalFromCanonicalString(
    lease.cumulativeSchedulerSummary.dreamStrangeMatterRequested,
  )
  let effective = gameDecimalFromCanonicalString(
    lease.cumulativeSchedulerSummary.dreamStrangeMatterEffective,
  )
  let normalizedRepresented = gameDecimalFromBigInt(0n)
  let lastSequentialRepresented = gameDecimalFromBigInt(0n)
  const sequentialDelta = deltaTotal - normalizedDelta
  for (let index = 0; index < Number(sequentialDelta); index += 1) {
    requested = addGameDecimals(requested, reward)
    const nextCurrency = addGameDecimals(currency, reward)
    const represented = subtractGameDecimals(nextCurrency, currency)
    lastSequentialRepresented = represented
    currency = nextCurrency
    effective = addGameDecimals(effective, represented)
    lifetime = addGameDecimals(lifetime, represented)
    currentRun = addGameDecimals(currentRun, represented)
    recent = addGameDecimals(recent, represented)
  }
  if (normalizedDelta > 0n) {
    const aggregateReward = multiplyGameDecimals(
      reward,
      gameDecimalFromBigInt(normalizedDelta),
    )
    requested = addGameDecimals(requested, aggregateReward)
    const nextCurrency = addGameDecimals(currency, aggregateReward)
    const represented = subtractGameDecimals(nextCurrency, currency)
    normalizedRepresented = represented
    currency = nextCurrency
    effective = addGameDecimals(effective, represented)
    lifetime = addGameDecimals(lifetime, represented)
    currentRun = addGameDecimals(currentRun, represented)
    recent = addGameDecimals(recent, represented)
  }
  const expected = [
    [currency, candidate.dream.strangeMatter, 'Dream Strange Matter'],
    [lifetime, candidate.statistics.lifetime.strangeMatter, 'lifetime Strange Matter'],
    [currentRun, candidate.statistics.currentQuantumRun.strangeMatter,
      'current-Quantum-run Strange Matter'],
    [recent, candidate.statistics.recentProcessedSegment.strangeMatter,
      'recent-segment Strange Matter'],
    [requested, gameDecimalFromCanonicalString(summary.dreamStrangeMatterRequested),
      'requested Dream Strange Matter'],
    [effective, gameDecimalFromCanonicalString(summary.dreamStrangeMatterEffective),
      'effective Dream Strange Matter'],
  ] as const
  for (const [wanted, actual, label] of expected) {
    if (compareGameDecimals(wanted, actual) !== 0) {
      throw new RangeError(`${label} does not match authenticated reset normalization.`)
    }
  }
  validateDreamWindowAccounting(
    acknowledgedState,
    candidate,
    deltaTotal,
    sequentialDelta,
    normalizedDelta,
    normalizedRepresented,
    lastSequentialRepresented,
    reward,
    summary.dreamFastNormalizationFirstCycleElapsedSeconds,
    summary.dreamFastNormalizationCycleSeconds,
  )
  const infinityDelta = BigInt(summary.infinityResetCount) -
    BigInt(lease.cumulativeSchedulerSummary.infinityResetCount)
  if (deltaTotal > 0n && infinityDelta === 0n) {
    const cause = claimedCauseIndex === 0
      ? 'Meteor'
      : claimedCauseIndex === 1
        ? 'ArtificialIntelligence'
        : 'GlobalWarming'
    const expectedLastReward = normalizedDelta > 0n
      ? normalizedRepresented
      : lastSequentialRepresented
    const last = candidate.statistics.lastCompletedCycle
    if (
      !last.valid ||
      last.breakInfinity ||
      last.durationSeconds !== 0 ||
      last.dreamCause !== cause ||
      compareGameDecimals(last.reward, expectedLastReward) !== 0
    ) {
      throw new RangeError(
        'Last completed cycle does not match authenticated Dream reset accounting.',
      )
    }
  }
}

function validateDreamWindowAccounting(
  acknowledged: Readonly<CanonicalGameStateV2>,
  candidate: Readonly<CanonicalGameStateV2>,
  resetDelta: bigint,
  sequentialResetDelta: bigint,
  normalizedResetDelta: bigint,
  normalizedEffectiveReward: ReturnType<typeof gameDecimalFromBigInt>,
  lastSequentialEffectiveReward: ReturnType<typeof gameDecimalFromBigInt>,
  nominalReward: ReturnType<typeof gameDecimalFromBigInt>,
  firstNormalizedCycleElapsedSeconds: number | null,
  normalizedCycleSeconds: number | null,
): void {
  for (const [key, width] of [
    ['minuteWindows', 60], ['halfHourWindows', 1_800], ['dailyWindows', 86_400],
  ] as const) {
    const previous = acknowledged.statistics[key]
    const next = candidate.statistics[key]
    if (normalizedResetDelta > 0n) {
      if (
        sequentialResetDelta !== 1n ||
        firstNormalizedCycleElapsedSeconds === null ||
        normalizedCycleSeconds === null
      ) {
        throw new RangeError('Fast Dream window normalization metadata is incomplete.')
      }
      const expectedCounts = next.map((bucket, index) =>
        previous[index]?.sequence === bucket.sequence
          ? previous[index]!.dreamResetCount
          : 0n
      )
      const expectedMatter = next.map((bucket, index) =>
        previous[index]?.sequence === bucket.sequence
          ? previous[index]!.strangeMatter
          : gameDecimalFromBigInt(0n)
      )
      const apply = (sequence: bigint, count: bigint, reward: ReturnType<typeof gameDecimalFromBigInt>) => {
        const index = Number(sequence % BigInt(next.length))
        if (next[index]?.sequence !== sequence) return
        expectedCounts[index] = expectedCounts[index]! + count
        expectedMatter[index] = addGameDecimals(expectedMatter[index]!, reward)
      }
      const sequentialElapsed = firstNormalizedCycleElapsedSeconds - normalizedCycleSeconds
      apply(
        BigInt(Math.floor(sequentialElapsed / width)),
        1n,
        lastSequentialEffectiveReward,
      )
      const normalizedCount = Number(normalizedResetDelta)
      const finalElapsed = firstNormalizedCycleElapsedSeconds +
        (normalizedCount - 1) * normalizedCycleSeconds
      const finalSequence = BigInt(Math.floor(finalElapsed / width))
      const retained = finalSequence < BigInt(next.length)
        ? Number(finalSequence) + 1
        : next.length
      const finalOffset = ((finalElapsed % width) + width) % width
      for (let offset = retained - 1; offset >= 0; offset -= 1) {
        const minimum = Math.max(
          0,
          Math.floor(
            (finalOffset + (offset - 1) * width) / normalizedCycleSeconds,
          ) + 1,
        )
        const maximum = Math.min(
          normalizedCount - 1,
          Math.floor(
            (finalOffset + offset * width) / normalizedCycleSeconds,
          ),
        )
        const bucketCount = maximum >= minimum
          ? BigInt(maximum - minimum + 1)
          : 0n
        apply(
          finalSequence - BigInt(offset),
          bucketCount,
          offset === 0 ? normalizedEffectiveReward : gameDecimalFromBigInt(0n),
        )
      }
      for (const [index, bucket] of next.entries()) {
        if (
          bucket.dreamResetCount !== expectedCounts[index] ||
          compareGameDecimals(bucket.strangeMatter, expectedMatter[index]!) !== 0
        ) {
          throw new RangeError(`${key} does not match exact Fast Dream normalization.`)
        }
      }
      continue
    }
    const orderedNext = next.map((bucket, index) => ({ bucket, index })).sort((left, right) =>
      left.bucket.sequence < right.bucket.sequence
        ? -1
        : left.bucket.sequence > right.bucket.sequence ? 1 : 0
    )
    const finalSequence = BigInt(Math.floor(
      candidate.statistics.trackedSimulatedSeconds / width,
    ))
    let positiveResetDelta = 0n
    let remainingSequential = sequentialResetDelta
    let sawNormalizedFinalBucket = false
    for (const { bucket, index } of orderedNext) {
      const indexedPrior = previous[index]
      const prior = indexedPrior?.sequence === bucket.sequence ? indexedPrior : undefined
      const priorCount = prior?.dreamResetCount ?? 0n
      const priorMatter = prior?.strangeMatter ?? gameDecimalFromBigInt(0n)
      if (
        bucket.dreamResetCount < priorCount ||
        compareGameDecimals(bucket.strangeMatter, priorMatter) < 0
      ) {
        throw new RangeError(`${key} rewrote an overlapping Dream-reset bucket.`)
      }
      const bucketDelta = bucket.dreamResetCount - priorCount
      positiveResetDelta += bucketDelta
      let maximumMatter = priorMatter
      const sequentialHere = bucketDelta < remainingSequential
        ? bucketDelta
        : remainingSequential
      remainingSequential -= sequentialHere
      for (let replay = 0; replay < Number(sequentialHere); replay += 1) {
        maximumMatter = addGameDecimals(maximumMatter, nominalReward)
      }
      if (normalizedResetDelta > 0n && bucket.sequence === finalSequence) {
        maximumMatter = addGameDecimals(maximumMatter, normalizedEffectiveReward)
        sawNormalizedFinalBucket = true
      }
      if (compareGameDecimals(bucket.strangeMatter, maximumMatter) > 0) {
        throw new RangeError(`${key} minted retained Strange Matter.`)
      }
    }
    if (positiveResetDelta > resetDelta) {
      throw new RangeError(`${key} minted retained Dream-reset counts.`)
    }
    const trackedDelta = candidate.statistics.trackedSimulatedSeconds -
      acknowledged.statistics.trackedSimulatedSeconds
    if (
      trackedDelta >= 0 &&
      trackedDelta <= width * next.length &&
      positiveResetDelta !== resetDelta
    ) {
      throw new RangeError(`${key} lost retained Dream-reset counts inside its horizon.`)
    }
    if (normalizedResetDelta > 0n && !sawNormalizedFinalBucket) {
      throw new RangeError(`${key} omitted the normalized Dream-reset final bucket.`)
    }
  }
}

function validateQuantumPublicationAccounting(candidate:Readonly<CanonicalGameStateV2>,candidateRuntime:Readonly<CanonicalRuntimeSidecarV2>,summary:Readonly<StoredTimeWorkerSchedulerSummaryDtoV2>,lease:ActiveLeaseV2,acknowledged:Readonly<CanonicalGameStateV2>,acknowledgedRuntime:Readonly<CanonicalRuntimeSidecarV2>,nextQueue:readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[],accounting:Readonly<StoredTimeWorkerAccountingDtoV2>,infinityRewardAuthority:Readonly<InfinityRewardAuthorityV2>):Readonly<{automationTimeUntilNextEvent:number;dysonAutomationTargetIndex:number;researchAutomationTargetIndex:number}>|null{
  const elapsed=accounting.cumulativeProcessedSeconds-lease.cumulativeAccounting.cumulativeProcessedSeconds
  if(!Number.isFinite(elapsed)||elapsed<0)throw new RangeError('Queued-input checkpoint elapsed time is invalid.')
  const remainingIds=new Set(nextQueue.map(input=>input.id)),processed=lease.remainingQueuedInputs.filter(input=>!remainingIds.has(input.id)),expected=lease.remainingQueuedInputs.filter(input=>remainingIds.has(input.id)).map(input=>Object.freeze({...input,remainingHorizonSeconds:Math.max(0,input.remainingHorizonSeconds-elapsed)}))
  if(!queueListEqual(expected,nextQueue))throw new RangeError('Candidate queued-input rebase is not authoritative.')
  const quantumInputs=processed.filter(input=>input.commandKind!=='dyson-facility-purchase').sort((left,right)=>left.remainingHorizonSeconds-right.remainingHorizonSeconds)
  const resetCount=BigInt(summary.quantumResetCount),priorResetCount=BigInt(lease.cumulativeSchedulerSummary.quantumResetCount),entangleCount=BigInt(summary.quantumEntanglementCount),priorEntangleCount=BigInt(lease.cumulativeSchedulerSummary.quantumEntanglementCount),resetDelta=resetCount-priorResetCount,entangleDelta=entangleCount-priorEntangleCount
  if(resetDelta<0n||entangleDelta<0n||resetDelta+entangleDelta>BigInt(quantumInputs.filter(input=>input.commandKind==='quantum-action').length))throw new RangeError('Candidate Quantum action counts are invalid or stale.')
  const effectiveAvailable=gameDecimalFromCanonicalString(summary.quantumAvailableShardsEffective),priorEffectiveAvailable=gameDecimalFromCanonicalString(lease.cumulativeSchedulerSummary.quantumAvailableShardsEffective),effectiveLifetime=gameDecimalFromCanonicalString(summary.quantumLifetimeShardsEffective),priorEffectiveLifetime=gameDecimalFromCanonicalString(lease.cumulativeSchedulerSummary.quantumLifetimeShardsEffective),consumed=gameDecimalFromCanonicalString(summary.quantumInfinityPointsConsumed),priorConsumed=gameDecimalFromCanonicalString(lease.cumulativeSchedulerSummary.quantumInfinityPointsConsumed),deltaEffectiveAvailable=subtractGameDecimals(effectiveAvailable,priorEffectiveAvailable),deltaEffectiveLifetime=subtractGameDecimals(effectiveLifetime,priorEffectiveLifetime),deltaConsumed=subtractGameDecimals(consumed,priorConsumed)
  if(compareGameDecimals(effectiveAvailable,priorEffectiveAvailable)<0||compareGameDecimals(effectiveLifetime,priorEffectiveLifetime)<0||compareGameDecimals(consumed,priorConsumed)<0)throw new RangeError('Candidate Quantum represented accounting moved backwards.')
  if(quantumInputs.length===0){
    if(!equalGameDecimals(effectiveAvailable,priorEffectiveAvailable)||!equalGameDecimals(effectiveLifetime,priorEffectiveLifetime)||!equalGameDecimals(consumed,priorConsumed)||!sameDataTree(candidate.quantum,acknowledged.quantum))throw new RangeError('Candidate Quantum state changed without an authenticated queued command.')
    if(summary.quantumResetSkillPointsFinal!==lease.cumulativeSchedulerSummary.quantumResetSkillPointsFinal)throw new RangeError('Candidate Quantum reset Skill pool changed without a reset.')
    const infinityDelta=BigInt(summary.infinityResetCount)-BigInt(lease.cumulativeSchedulerSummary.infinityResetCount)
    if(infinityDelta===0n){
      if(!equalGameDecimals(candidate.infinity.availablePoints,acknowledged.infinity.availablePoints)||!equalGameDecimals(candidate.infinity.allocatedPoints,acknowledged.infinity.allocatedPoints))throw new RangeError('Candidate Infinity balances changed without an authenticated reset.')
      if(!sameSkillAuthorityAfterGoalProgressionV2(candidate,acknowledged))throw new RangeError(`Candidate Skill authority changed without an authenticated reset (${firstDataTreeDifference(candidate.skills,acknowledged.skills,'skills')??'unknown'}).`)
      if(!sameInfinityTotalsAuthorityV2(candidate,acknowledged))throw new RangeError('Candidate Infinity statistics changed without an authenticated reset.')
    }
    if(infinityDelta!==0n){
      if(infinityDelta!==1n||elapsed!==0)throw new RangeError('A Quantum pre-action Infinity epoch must contain exactly one zero-duration reset.')
      const evaluation=quotePreparedCanonicalInfinityResetV2(preparedInfinityResetAuthority,acknowledged,acknowledgedRuntime,lease.acknowledgedBaseRevision,infinityRewardAuthority)
      if(!evaluation.ready)throw new RangeError('The acknowledged Infinity epoch is not authentically ready.')
      const reset=commitPreparedCanonicalInfinityResetV2(preparedInfinityResetAuthority,evaluation,acknowledged,acknowledgedRuntime,lease.acknowledgedBaseRevision)
      if(!sameDataTree(candidate,reset.state)||!sameDataTree(candidateRuntime,reset.runtime))throw new RangeError('Candidate Infinity epoch does not match main-thread reset replay.')
    }
    return null
  }
  let replay=cloneCanonicalGameStateV2(acknowledged),runtime=acknowledgedRuntime,revision=lease.acknowledgedBaseRevision,resetsRemaining=resetDelta,entanglesRemaining=entangleDelta,replayedAvailable=gameDecimalFromBigInt(0n),replayedLifetime=gameDecimalFromBigInt(0n),replayedConsumed=gameDecimalFromBigInt(0n),cursor=0,automationHorizon=acknowledged.timeline.automationTimeUntilNextEvent,dysonTarget=acknowledged.timeline.dysonAutomationTargetIndex,researchTarget=acknowledged.timeline.researchAutomationTargetIndex,replayedTicks=0n,lastOrdinaryResetElapsed:number|null=null,lastOrdinaryResetBoundary:number|null=null
  const advanceTiming=(next:number)=>{const duration=next-cursor;if(duration<0)throw new RangeError('Queued Quantum command order moved backwards.');if(duration===0)return;const plan=planStoredTimePolicyV2(Object.freeze({policyId:'stored-time-exact-v1' as const,policyVersion:1 as const,requestedDurationSeconds:duration,initialAutomationHorizonSeconds:automationHorizon,automationIntervalSeconds:lease.automationIntervalSeconds,initialAutomationTargetIndex:dysonTarget,hardEvents:Object.freeze([])})),ticks=plan.rawAutomationBoundaries;replayedTicks+=ticks;dysonTarget=(dysonTarget+Number(ticks%8n))%8;if(replay.infinity.automationUnlocked.research)researchTarget=(researchTarget+Number(ticks%14n))%14;automationHorizon=gameDecimalToNumberChecked(plan.finalRawAutomationTimeUntilNextEvent,{maximum:Number.MAX_VALUE});cursor=next}
  for(const input of quantumInputs){
    advanceTiming(input.remainingHorizonSeconds)
    if(input.commandKind==='quantum-upgrade-purchase'){
      const quote=quoteQuantumUpgradeV2(replay,revision,input.upgradeId,input.requestedMode),commit=commitQuantumUpgradeV2(quote,replay,revision)
      if(commit.accepted){replay=commit.state;revision=commit.revision}
      continue
    }
    const publication=Object.freeze({revision,state:replay,runtime}),quote=quoteCanonicalQuantumResetV2(publication,Object.freeze({kind:'quantum-action' as const})),commit=commitCanonicalQuantumResetV2(quote,publication)
    if(!commit.accepted||commit.publication===null)continue
    if(quote.operation==='ordinary-leap'){if(resetsRemaining<=0n)throw new RangeError('Candidate omitted an authenticated ordinary Quantum reset.');resetsRemaining-=1n;automationHorizon=0;dysonTarget=0;researchTarget=0;lastOrdinaryResetElapsed=input.remainingHorizonSeconds;lastOrdinaryResetBoundary=commit.publication.state.timeline.infinityBoundaryRemaining}else if(quote.operation==='entanglement'){if(entanglesRemaining<=0n)throw new RangeError('Candidate omitted an authenticated Entanglement.');entanglesRemaining-=1n}
    replayedAvailable=addGameDecimals(replayedAvailable,quote.effectiveAvailableShards)
    replayedLifetime=addGameDecimals(replayedLifetime,quote.effectiveLifetimeShards)
    replayedConsumed=addGameDecimals(replayedConsumed,quote.infinityPointsConsumed)
    replay=commit.publication.state;runtime=commit.publication.runtime;revision=commit.publication.revision
  }
  advanceTiming(elapsed)
  if(resetsRemaining!==0n||entanglesRemaining!==0n)throw new RangeError('Candidate Quantum action kind does not match its authenticated queued commands.')
  if(!equalGameDecimals(deltaEffectiveAvailable,replayedAvailable)||!equalGameDecimals(deltaEffectiveLifetime,replayedLifetime)||!equalGameDecimals(deltaConsumed,replayedConsumed))throw new RangeError('Candidate Quantum represented accounting does not match main-thread replay.')
  if(!sameDataTree(candidate,replay)||!sameDataTree(candidateRuntime,runtime))throw new RangeError(`Candidate post-Quantum publication does not match main-thread replay (${firstDataTreeDifference(candidate,replay,'state')??firstDataTreeDifference(candidateRuntime,runtime,'runtime')??'unknown'}).`)
  const expectedPool=realityArtifactSkillPointsV2(acknowledged)+(acknowledged.secretProgress.completed?4n:0n);if(resetDelta>0n&&summary.quantumResetSkillPointsFinal!==expectedPool.toString())throw new RangeError('Candidate Quantum reset Skill pool is invalid.');if(resetDelta===0n&&summary.quantumResetSkillPointsFinal!==lease.cumulativeSchedulerSummary.quantumResetSkillPointsFinal)throw new RangeError('Candidate Quantum reset Skill pool changed without a reset.')
  const rawDelta=BigInt(accounting.cumulativeRawAutomationTicks)-BigInt(lease.cumulativeAccounting.cumulativeRawAutomationTicks);if(rawDelta!==replayedTicks||!schedulerApproximatelyEqual(candidate.timeline.automationTimeUntilNextEvent,automationHorizon)||candidate.timeline.dysonAutomationTargetIndex!==dysonTarget||candidate.timeline.researchAutomationTargetIndex!==researchTarget)throw new RangeError('Candidate post-Quantum automation phase is not authoritative.')
  const infinityDelta=BigInt(summary.infinityResetCount)-BigInt(lease.cumulativeSchedulerSummary.infinityResetCount);if(infinityDelta===0n&&(!equalGameDecimals(candidate.infinity.availablePoints,replay.infinity.availablePoints)||!equalGameDecimals(candidate.infinity.allocatedPoints,replay.infinity.allocatedPoints)))throw new RangeError('Candidate post-Quantum Infinity accounts are not authoritative.');if(lastOrdinaryResetElapsed!==null&&lastOrdinaryResetBoundary!==null&&infinityDelta===0n){const sinceReset=elapsed-lastOrdinaryResetElapsed;if(!schedulerApproximatelyEqual(candidate.timeline.infinityCycleSeconds,sinceReset)||!schedulerApproximatelyEqual(candidate.timeline.infinityBoundaryRemaining,lastOrdinaryResetBoundary-sinceReset))throw new RangeError('Candidate post-Quantum Infinity horizon is not authoritative.')}
  if(resetDelta>0n&&!sameQuantumResetSkillAuthorityV2(candidate,replay))throw new RangeError('Candidate Quantum reset Skill pool or assignment is not conserved.')
  return Object.freeze({automationTimeUntilNextEvent:automationHorizon,dysonAutomationTargetIndex:dysonTarget,researchAutomationTargetIndex:researchTarget})
}

function expectedTransientPostPublicationV2(
  phase: 'pre-infinity' | 'pre-quantum',
  publication: Readonly<StoredTimeAuthorityPublicationV2>,
  queue: readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[],
  revision: number,
  infinityRewardAuthority: Readonly<InfinityRewardAuthorityV2>,
): Readonly<StoredTimeWorkerPublicationDtoV2> {
  if (phase === 'pre-infinity') {
    const quote = quotePreparedCanonicalInfinityResetV2(
      preparedInfinityResetAuthority,
      publication.state, publication.runtime, revision, infinityRewardAuthority,
    )
    if (!quote.ready) {
      throw new RangeError('Transient Infinity PRE is not authentically reset-ready.')
    }
    const committed = commitPreparedCanonicalInfinityResetV2(
      preparedInfinityResetAuthority,
      quote, publication.state, publication.runtime, revision,
    )
    return encodeValidatedStoredTimeWorkerPublicationV2(Object.freeze({
      state: committed.state,
      runtime: committed.runtime,
    }))
  }
  const input = queue.find((entry) =>
    entry.commandKind !== 'dyson-facility-purchase' &&
    entry.remainingHorizonSeconds === 0
  )
  if (input === undefined) {
    throw new RangeError('Transient Quantum PRE has no due authenticated command.')
  }
  if (input.commandKind === 'quantum-upgrade-purchase') {
    const quote = quoteQuantumUpgradeV2(
      publication.state, revision, input.upgradeId, input.requestedMode,
    )
    const committed = commitQuantumUpgradeV2(quote, publication.state, revision)
    return encodeValidatedStoredTimeWorkerPublicationV2(Object.freeze({
      state: committed.accepted ? committed.state : publication.state,
      runtime: publication.runtime,
    }))
  }
  const source = Object.freeze({
    revision,
    state: publication.state,
    runtime: publication.runtime,
  })
  const quote = quoteCanonicalQuantumResetV2(
    source, Object.freeze({ kind: 'quantum-action' as const }),
  )
  const committed = commitCanonicalQuantumResetV2(quote, source)
  return encodeValidatedStoredTimeWorkerPublicationV2(Object.freeze({
    state: committed.accepted && committed.publication !== null
      ? committed.publication.state
      : publication.state,
    runtime: committed.accepted && committed.publication !== null
      ? committed.publication.runtime
      : publication.runtime,
  }))
}

function sameQuantumResetSkillAuthorityV2(candidate:Readonly<CanonicalGameStateV2>,replayed:Readonly<CanonicalGameStateV2>):boolean{if(candidate.skills.points!==replayed.skills.points||candidate.skills.fragments!==replayed.skills.fragments||candidate.skills.autoAssignNonRefundable!==replayed.skills.autoAssignNonRefundable||!sameDataTree(candidate.skills.activeAutoAssignment,replayed.skills.activeAutoAssignment)||!sameDataTree(candidate.skills.presets,replayed.skills.presets))return false;const ids=Object.keys(replayed.skills.byId);return Object.keys(candidate.skills.byId).length===ids.length&&ids.every(id=>{const left=candidate.skills.byId[id],right=replayed.skills.byId[id];return left!==undefined&&right!==undefined&&left.owned===right.owned&&left.level===right.level})}

function sameSkillAuthorityAfterGoalProgressionV2(
  candidate: Readonly<CanonicalGameStateV2>,
  acknowledged: Readonly<CanonicalGameStateV2>,
): boolean {
  if (sameQuantumResetSkillAuthorityV2(candidate, acknowledged)) return true
  const goalDelta = candidate.dyson.goalStage - acknowledged.dyson.goalStage
  if (goalDelta <= 0n || candidate.dyson.goalStage > 10n) return false
  const maximum = 9_223_372_036_854_775_807n
  const expectedPoints = acknowledged.skills.points >= maximum - goalDelta
    ? maximum
    : acknowledged.skills.points + goalDelta
  if (candidate.skills.points !== expectedPoints) return false
  return sameQuantumResetSkillAuthorityV2(
    Object.freeze({
      ...candidate,
      skills: Object.freeze({
        ...candidate.skills,
        points: acknowledged.skills.points,
      }),
    }),
    acknowledged,
  )
}
function sameInfinityTotalsAuthorityV2(candidate:Readonly<CanonicalGameStateV2>,acknowledged:Readonly<CanonicalGameStateV2>):boolean{return(['lifetime','currentQuantumRun','recentProcessedSegment'] as const).every(root=>{const left=candidate.statistics[root],right=acknowledged.statistics[root];return left.ordinaryInfinityCount===right.ordinaryInfinityCount&&left.breakInfinityCount===right.breakInfinityCount&&equalGameDecimals(left.ordinaryInfinityPoints,right.ordinaryInfinityPoints)&&equalGameDecimals(left.breakInfinityPoints,right.breakInfinityPoints)})}
function validateQuantumFinalProofs(candidate:Readonly<CanonicalGameStateV2>,summary:Readonly<StoredTimeWorkerSchedulerSummaryDtoV2>):void{const totalActions=BigInt(summary.quantumResetCount)+BigInt(summary.quantumEntanglementCount),finals=[summary.quantumAvailableShardsFinal,summary.quantumLifetimeShardsFinal,summary.quantumInfinityAvailableFinal,summary.quantumInfinityAllocatedFinal] as const;if((totalActions===0n)!==finals.every(value=>value===null))throw new RangeError('Candidate Quantum final proofs do not match its action count.');if(totalActions===0n)return;const actual=[candidate.quantum.availableShards,candidate.quantum.lifetimeEarnedShards,candidate.infinity.availablePoints,candidate.infinity.allocatedPoints] as const;for(let index=0;index<finals.length;index+=1){const value=finals[index];if(value===null||!equalGameDecimals(actual[index]!,gameDecimalFromCanonicalString(value)))throw new RangeError('Candidate Quantum final balance proof is invalid.')}}
function queueListEqual(left:readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[],right:readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[]):boolean{return left.length===right.length&&left.every((value,index)=>{const other=right[index];if(other===undefined||value.id!==other.id||value.commandKind!==other.commandKind||value.commandVersion!==other.commandVersion||!schedulerApproximatelyEqual(value.remainingHorizonSeconds,other.remainingHorizonSeconds))return false;if(value.commandKind==='quantum-action')return other.commandKind==='quantum-action';if(value.commandKind==='dyson-facility-purchase')return other.commandKind==='dyson-facility-purchase'&&value.facilityId===other.facilityId&&value.requestedMode===other.requestedMode&&value.roundedBulkBuy===other.roundedBulkBuy;return other.commandKind==='quantum-upgrade-purchase'&&value.upgradeId===other.upgradeId&&value.requestedMode===other.requestedMode})}
function sameDataTree(left:unknown,right:unknown):boolean{if(Object.is(left,right))return true;if(left===null||right===null||typeof left!=='object'||typeof right!=='object'||Array.isArray(left)!==Array.isArray(right))return false;const leftKeys=Reflect.ownKeys(left),rightKeys=Reflect.ownKeys(right);return leftKeys.length===rightKeys.length&&leftKeys.every(key=>rightKeys.includes(key)&&sameDataTree(Object.getOwnPropertyDescriptor(left,key)?.value,Object.getOwnPropertyDescriptor(right,key)?.value))}
function firstDataTreeDifference(left:unknown,right:unknown,path:string):string|null{if(Object.is(left,right))return null;if(left===null||right===null||typeof left!=='object'||typeof right!=='object'||Array.isArray(left)!==Array.isArray(right))return `${path}:${String(left)}!=${String(right)}`;const leftKeys=Reflect.ownKeys(left),rightKeys=Reflect.ownKeys(right);if(leftKeys.length!==rightKeys.length)return `${path}.keys`;for(const key of leftKeys){if(!rightKeys.includes(key))return `${path}.${String(key)}`;const difference=firstDataTreeDifference(Object.getOwnPropertyDescriptor(left,key)?.value,Object.getOwnPropertyDescriptor(right,key)?.value,`${path}.${String(key)}`);if(difference!==null)return difference}return null}

function authoritativePublication(
  proposal: Readonly<StoredTimeWorkerPublicationDtoV2>,
  accounting: Readonly<StoredTimeWorkerAccountingDtoV2>,
  summary: Readonly<StoredTimeWorkerSchedulerSummaryDtoV2>,
  authority: Readonly<{
    doubleTimeConsumedSeconds: number
    automationTimeUntilNextEvent: number
    dysonAutomationTargetIndex: number
    researchAutomationTargetIndex: number
  }>,
  lease: ActiveLeaseV2,
  acknowledgedState: Readonly<CanonicalGameStateV2> | null = null,
  acknowledgedRuntime: Readonly<CanonicalRuntimeSidecarV2> | null = null,
  rebasedQueuedInputs:readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[]=Object.freeze([]),
  infinityRewardAuthority:Readonly<InfinityRewardAuthorityV2>|null=null,
): Readonly<StoredTimeAuthorityPublicationV2> {
  const decoded = decodeStoredTimeWorkerPublicationV2(proposal)
  validateQuantumFinalProofs(decoded.state,summary)
  const quantumAutomationAuthority=acknowledgedState!==null&&acknowledgedRuntime!==null&&infinityRewardAuthority!==null?validateQuantumPublicationAccounting(decoded.state,decoded.runtime,summary,lease,acknowledgedState,acknowledgedRuntime,rebasedQueuedInputs,accounting,infinityRewardAuthority):null
  const quantumResetDelta = BigInt(summary.quantumResetCount) -
    BigInt(lease.cumulativeSchedulerSummary.quantumResetCount)
  if (quantumResetDelta === 0n) {
    validateDreamPublicationAccounting(decoded.state, summary, lease, acknowledgedState)
  }
  const expectedDreamResetCount = acknowledgedState === null
    ? BigInt(lease.originAuthority.dreamResetCount) + BigInt(summary.dreamResetCount)
    : acknowledgedState.dream.resetCount +
      (BigInt(summary.dreamResetCount) -
        BigInt(lease.cumulativeSchedulerSummary.dreamResetCount))
  if (decoded.state.dream.resetCount !== expectedDreamResetCount) {
    throw new RangeError(
      'Candidate Dream reset count does not match its authenticated cumulative summary.',
    )
  }
  const dreamCauseProofs = [
    ['meteorDreamResets', 'dreamMeteorResetCount', 'MeteorDreamResets'],
    ['aiDreamResets', 'dreamAiResetCount', 'AiDreamResets'],
    ['globalWarmingDreamResets', 'dreamGlobalWarmingResetCount', 'GlobalWarmingDreamResets'],
    ['blackHoleDreamResets', 'dreamBlackHoleResetCount', 'BlackHoleDreamResets'],
  ] as const
  if (quantumResetDelta === 0n) for (const root of [
    'lifetime', 'currentQuantumRun', 'recentProcessedSegment',
  ] as const) {
    for (const [stateKey, summaryKey, originSuffix] of dreamCauseProofs) {
      const originKey = `${root}${originSuffix[0]!.toUpperCase()}${originSuffix.slice(1)}` as
        keyof StoredTimeOriginAuthorityV2
      const expected = acknowledgedState === null
        ? BigInt(lease.originAuthority[originKey] as string) + BigInt(summary[summaryKey])
        : acknowledgedState.statistics[root][stateKey] +
          (BigInt(summary[summaryKey]) -
            BigInt(lease.cumulativeSchedulerSummary[summaryKey]))
      if (decoded.state.statistics[root][stateKey] !== expected) {
        throw new RangeError(
          `Candidate ${root} ${stateKey} does not match authenticated Dream reset accounting.`,
        )
      }
    }
  }
  const storedTimeAvailableSeconds =
    lease.admittedBankSeconds - accounting.cumulativeProcessedSeconds
  const doubleTimeBankSeconds = lease.originAuthority.doubleTimeBankSeconds -
    authority.doubleTimeConsumedSeconds
  const infinityEpochDelta = BigInt(summary.infinityResetCount) -
    BigInt(lease.cumulativeSchedulerSummary.infinityResetCount)
  const authenticatedInfinityEpoch = infinityEpochDelta > 0n
  const quantumEpochElapsed = accounting.cumulativeProcessedSeconds -
    lease.cumulativeAccounting.cumulativeProcessedSeconds
  const cumulativeInfinityResets = BigInt(summary.infinityResetCount)
  const lastInfinityResetElapsed = summary.lastInfinityResetElapsedSeconds
  const infinityCycleSeconds = quantumAutomationAuthority !== null || authenticatedInfinityEpoch
    ? decoded.state.timeline.infinityCycleSeconds
    : acknowledgedState !== null && infinityEpochDelta === 0n
      ? acknowledgedState.timeline.infinityCycleSeconds + quantumEpochElapsed
      : cumulativeInfinityResets > 0n && lastInfinityResetElapsed !== null
        ? accounting.cumulativeProcessedSeconds - lastInfinityResetElapsed
      : accounting.sealedInfinityCycleSeconds
  const infinityBoundaryRemaining = quantumAutomationAuthority !== null || authenticatedInfinityEpoch
    ? decoded.state.timeline.infinityBoundaryRemaining
    : acknowledgedState !== null && infinityEpochDelta === 0n
      ? acknowledgedState.timeline.infinityBoundaryRemaining - quantumEpochElapsed
      : accounting.sealedInfinityBoundaryRemaining
  const fastClockOperationBound = Math.max(
    1,
    accounting.cumulativeRepresentativeGroups -
      lease.cumulativeAccounting.cumulativeRepresentativeGroups,
  )
  const timelineMatches = (left: number, right: number) =>
    schedulerApproximatelyEqual(left, right) ||
    (lease.policyPlan.executionKind === 'fast-representative-groups' &&
      schedulerApproximatelyEqualWithOperationBound(
        left,
        right,
        fastClockOperationBound,
      ))
  for (const [name, value] of [
    ['stored balance', storedTimeAvailableSeconds],
    ['Double Time balance', doubleTimeBankSeconds],
    ['Infinity cycle', infinityCycleSeconds],
    ['Infinity boundary', infinityBoundaryRemaining],
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || Object.is(value, -0)) {
      throw new RangeError(`Authoritative ${name} accounting is invalid.`)
    }
  }
  if (
    !timelineMatches(
      decoded.state.timeline.infinityCycleSeconds,
      infinityCycleSeconds,
    ) ||
    !timelineMatches(
      decoded.state.timeline.infinityBoundaryRemaining,
      infinityBoundaryRemaining,
    )
  ) {
    throw new RangeError(
      `Candidate Infinity timeline does not match its authenticated material-boundary seal (${decoded.state.timeline.infinityCycleSeconds}/${infinityCycleSeconds}; ${decoded.state.timeline.infinityBoundaryRemaining}/${infinityBoundaryRemaining}).`,
    )
  }
  const timeline = Object.freeze({
    ...decoded.state.timeline,
    storedTimeAvailableSeconds,
    doubleTime: Object.freeze({
      ...decoded.state.timeline.doubleTime,
      unlocked: lease.originAuthority.doubleTimeUnlocked,
      enabled:
        lease.originAuthority.doubleTimeUnlocked && doubleTimeBankSeconds > 0,
      bankSeconds: doubleTimeBankSeconds,
      rate: lease.originAuthority.doubleTimeRate,
    }),
    infinityCycleSeconds,
    infinityBoundaryRemaining,
    automationTimeUntilNextEvent: quantumAutomationAuthority?.automationTimeUntilNextEvent??authority.automationTimeUntilNextEvent,
    dysonAutomationTargetIndex: quantumAutomationAuthority?.dysonAutomationTargetIndex??authority.dysonAutomationTargetIndex,
    researchAutomationTargetIndex: quantumAutomationAuthority?.researchAutomationTargetIndex??authority.researchAutomationTargetIndex,
  })
  const state = Object.freeze({
    ...decoded.state,
    timeline,
  }) as CanonicalGameStateV2
  return Object.freeze({
    revision: lease.acknowledgedBaseRevision + 1,
    state,
    runtime: decoded.runtime,
  })
}

function normalizeInfinitySealAccounting(
  accounting: Readonly<StoredTimeWorkerAccountingDtoV2>,
  lease: ActiveLeaseV2,
  summary: Readonly<StoredTimeWorkerSchedulerSummaryDtoV2>,
): Readonly<StoredTimeWorkerAccountingDtoV2> {
  const resetCount = BigInt(accounting.cumulativeInfinityResetCount)
  const quantumResetDelta = BigInt(summary.quantumResetCount) -
    BigInt(lease.cumulativeSchedulerSummary.quantumResetCount)
  const hasQuantumReset = BigInt(summary.quantumResetCount) > 0n
  const processedDelta = accounting.cumulativeProcessedSeconds -
    lease.cumulativeAccounting.cumulativeProcessedSeconds
  const lastResetElapsed = accounting.lastInfinityResetElapsedSeconds
  return Object.freeze({
    ...accounting,
    sealedInfinityCycleSeconds: resetCount === 0n && quantumResetDelta === 0n
      ? hasQuantumReset
        ? lease.cumulativeAccounting.sealedInfinityCycleSeconds + processedDelta
        : lease.originAuthority.infinityCycleSeconds +
          accounting.cumulativeInfinityElapsedSeconds
      : resetCount === 0n
        ? accounting.sealedInfinityCycleSeconds
        : accounting.cumulativeProcessedSeconds - lastResetElapsed!,
    sealedInfinityBoundaryRemaining: resetCount === 0n && quantumResetDelta === 0n
      ? hasQuantumReset
        ? lease.cumulativeAccounting.sealedInfinityBoundaryRemaining - processedDelta
        : lease.originAuthority.infinityBoundaryRemaining -
          accounting.cumulativeInfinityElapsedSeconds
      : accounting.sealedInfinityBoundaryRemaining,
  })
}

function validateAccountingProof(
  value: Readonly<StoredTimeWorkerAccountingDtoV2>,
  summary: Readonly<StoredTimeWorkerSchedulerSummaryDtoV2>,
  lease: ActiveLeaseV2,
): Readonly<{
  doubleTimeConsumedSeconds: number
  automationTimeUntilNextEvent: number
  dysonAutomationTargetIndex: number
  researchAutomationTargetIndex: number
}> {
  if (
    value.cumulativeProcessedSeconds < lease.cumulativeAccounting.cumulativeProcessedSeconds ||
    value.cumulativeProcessedSeconds > lease.requestedDurationSeconds ||
    value.cumulativeDoubleTimeConsumedSeconds <
      lease.cumulativeAccounting.cumulativeDoubleTimeConsumedSeconds ||
    value.cumulativeDoubleTimeConsumedSeconds > lease.originAuthority.doubleTimeBankSeconds ||
    value.cumulativeInfinityElapsedSeconds <
      lease.cumulativeAccounting.cumulativeInfinityElapsedSeconds ||
    value.cumulativeInfinityElapsedSeconds > lease.requestedDurationSeconds ||
    BigInt(value.cumulativeRawAutomationTicks) <
      BigInt(lease.cumulativeAccounting.cumulativeRawAutomationTicks) ||
    value.cumulativeRepresentativeGroups <
      lease.cumulativeAccounting.cumulativeRepresentativeGroups
  ) throw new RangeError('Candidate cumulative accounting is stale or outside its admitted bounds.')
  const resetCount = BigInt(value.cumulativeInfinityResetCount)
  const previousResetCount = BigInt(
    lease.cumulativeAccounting.cumulativeInfinityResetCount,
  )
  const quantumResetDelta = BigInt(summary.quantumResetCount) -
    BigInt(lease.cumulativeSchedulerSummary.quantumResetCount)
  const hasQuantumReset = BigInt(summary.quantumResetCount) > 0n
  if (
    resetCount < previousResetCount ||
    resetCount > BigInt(summary.materialEvents) ||
    summary.infinityResetCount !== value.cumulativeInfinityResetCount ||
    summary.lastInfinityResetElapsedSeconds !==
      value.lastInfinityResetElapsedSeconds
  ) {
    throw new RangeError('Candidate Infinity reset accounting is invalid or stale.')
  }
  const dreamResetCount = BigInt(summary.dreamResetCount)
  const previousDreamResetCount = BigInt(
    lease.cumulativeSchedulerSummary.dreamResetCount,
  )
  const dreamRequested = gameDecimalFromCanonicalString(
    summary.dreamStrangeMatterRequested,
  )
  const dreamEffective = gameDecimalFromCanonicalString(
    summary.dreamStrangeMatterEffective,
  )
  const previousDreamRequested = gameDecimalFromCanonicalString(
    lease.cumulativeSchedulerSummary.dreamStrangeMatterRequested,
  )
  const previousDreamEffective = gameDecimalFromCanonicalString(
    lease.cumulativeSchedulerSummary.dreamStrangeMatterEffective,
  )
  const causeCounts = [
    BigInt(summary.dreamMeteorResetCount),
    BigInt(summary.dreamAiResetCount),
    BigInt(summary.dreamGlobalWarmingResetCount),
    BigInt(summary.dreamBlackHoleResetCount),
  ] as const
  const previousCauseCounts = [
    BigInt(lease.cumulativeSchedulerSummary.dreamMeteorResetCount),
    BigInt(lease.cumulativeSchedulerSummary.dreamAiResetCount),
    BigInt(lease.cumulativeSchedulerSummary.dreamGlobalWarmingResetCount),
    BigInt(lease.cumulativeSchedulerSummary.dreamBlackHoleResetCount),
  ] as const
  const deltaCauseCounts = causeCounts.map(
    (count, index) => count - previousCauseCounts[index]!,
  )
  const deltaDreamResets = dreamResetCount - previousDreamResetCount
  if (
    dreamResetCount < previousDreamResetCount ||
    dreamResetCount > BigInt(summary.materialEvents) ||
    causeCounts.some((count, index) => count < previousCauseCounts[index]!) ||
    causeCounts.reduce((total, count) => total + count, 0n) !== dreamResetCount ||
    causeCounts[3] !== 0n ||
    deltaDreamResets > BigInt(STORED_TIME_DREAM_REPLAY_LIMIT_V2) ||
    deltaCauseCounts.filter((count) => count > 0n).length > 1 ||
    compareGameDecimals(dreamRequested, previousDreamRequested) < 0 ||
    compareGameDecimals(dreamEffective, previousDreamEffective) < 0 ||
    compareGameDecimals(dreamEffective, dreamRequested) > 0
  ) {
    throw new RangeError('Candidate Dream reset accounting is invalid or stale.')
  }
  const lastResetElapsed = value.lastInfinityResetElapsedSeconds
  if (resetCount === 0n) {
    if (lastResetElapsed !== null) {
      throw new RangeError('Zero Infinity resets cannot carry a last-reset time.')
    }
    const expectedUnresetCycle = hasQuantumReset
      ? lease.cumulativeAccounting.sealedInfinityCycleSeconds +
        (value.cumulativeProcessedSeconds - lease.cumulativeAccounting.cumulativeProcessedSeconds)
      : lease.originAuthority.infinityCycleSeconds + value.cumulativeInfinityElapsedSeconds
    const expectedUnresetBoundary = hasQuantumReset
      ? lease.cumulativeAccounting.sealedInfinityBoundaryRemaining -
        (value.cumulativeProcessedSeconds - lease.cumulativeAccounting.cumulativeProcessedSeconds)
      : lease.originAuthority.infinityBoundaryRemaining - value.cumulativeInfinityElapsedSeconds
    if (quantumResetDelta === 0n && (
      !schedulerApproximatelyEqual(
        value.sealedInfinityCycleSeconds,
        expectedUnresetCycle,
      ) ||
      !schedulerApproximatelyEqual(
        value.sealedInfinityBoundaryRemaining,
        expectedUnresetBoundary,
      ))
    ) {
      throw new RangeError('Unreset Infinity timing does not match its origin.')
    }
  } else {
    if (
      lastResetElapsed === null ||
      lastResetElapsed > value.cumulativeProcessedSeconds ||
      (resetCount === previousResetCount &&
        !approximatelyEqual(
          lastResetElapsed,
          lease.cumulativeAccounting.lastInfinityResetElapsedSeconds!,
        )) ||
      !schedulerApproximatelyEqual(
        value.sealedInfinityCycleSeconds,
        value.cumulativeProcessedSeconds - lastResetElapsed,
      )
    ) {
      throw new RangeError(`Candidate last Infinity reset time is inconsistent (${lastResetElapsed}/${lease.cumulativeAccounting.lastInfinityResetElapsedSeconds}; ${value.sealedInfinityCycleSeconds}/${value.cumulativeProcessedSeconds - lastResetElapsed!}).`)
    }
  }
  const partialPlan = planStoredTimePolicyV2(Object.freeze({
    policyId: lease.policyId,
    policyVersion: 1,
    requestedDurationSeconds: value.cumulativeProcessedSeconds,
    initialAutomationHorizonSeconds:
      lease.originAuthority.initialAutomationHorizonSeconds,
    automationIntervalSeconds: lease.automationIntervalSeconds,
    initialAutomationTargetIndex:
      lease.originAuthority.initialAutomationTargetIndex,
    hardEvents: Object.freeze([]),
  }))
  const rawTicks = BigInt(value.cumulativeRawAutomationTicks)
  const hasQueuedInputs = lease.originAuthority.originQueuedInputs.some(
    (input) => input.commandKind === 'quantum-action',
  )
  const maximumRawTicks = hasQueuedInputs
    ? planStoredTimePolicyV2(Object.freeze({
        policyId: lease.policyId,
        policyVersion: 1,
        requestedDurationSeconds: value.cumulativeProcessedSeconds,
        initialAutomationHorizonSeconds: 0,
        automationIntervalSeconds: lease.automationIntervalSeconds,
        initialAutomationTargetIndex: 0,
        hardEvents: Object.freeze([]),
      })).rawAutomationBoundaries
    : lease.policyPlan.rawAutomationBoundaries
  if (
    (!hasQueuedInputs && rawTicks !== partialPlan.rawAutomationBoundaries) ||
    rawTicks > maximumRawTicks ||
    BigInt(summary.automationTicks) !== rawTicks ||
    BigInt(summary.analyticallySkippedAutomationTicks) > rawTicks
  ) throw new RangeError('Candidate automation accounting does not match the canonical policy plan.')
  const expectedDoubleTimeConsumedSeconds = Math.min(
    lease.originAuthority.doubleTimeBankSeconds,
    lease.originAuthority.doubleTimeUnlocked
      ? value.cumulativeProcessedSeconds * lease.originAuthority.doubleTimeRate
      : 0,
  )
  if (
    !approximatelyEqual(
      value.cumulativeDoubleTimeConsumedSeconds,
      expectedDoubleTimeConsumedSeconds,
    ) ||
    !approximatelyEqual(
      value.cumulativeInfinityElapsedSeconds,
      value.cumulativeProcessedSeconds,
    ) ||
    !approximatelyEqual(
      summary.storedTimeConsumedSeconds,
      value.cumulativeProcessedSeconds,
    ) ||
    !approximatelyEqual(summary.baseSimulationSeconds, value.cumulativeProcessedSeconds) ||
    !approximatelyEqual(
      summary.dreamSimulationSeconds,
      value.cumulativeProcessedSeconds + expectedDoubleTimeConsumedSeconds,
    )
  ) throw new RangeError('Candidate time-resource summary does not match origin accounting.')

  let automationExecutions = rawTicks
  if (lease.policyPlan.executionKind === 'fast-representative-groups') {
    const dueNow = lease.policyPlan.initialDueBoundary ? 1n : 0n
    const futureRawTicks = rawTicks - dueNow
    let representedRawTicks = 0n
    let completedGroups = 0
    for (const group of lease.policyPlan.groups) {
      if (representedRawTicks + group.logicalRawTicks > futureRawTicks) break
      representedRawTicks += group.logicalRawTicks
      completedGroups += 1
    }
    if (
      completedGroups !== value.cumulativeRepresentativeGroups ||
      completedGroups > 4_096
    ) throw new RangeError('Candidate Fast representative-group accounting is invalid.')
    automationExecutions = BigInt(completedGroups) +
      (rawTicks > 0n ? dueNow : 0n)
  } else if (value.cumulativeRepresentativeGroups !== 0) {
    throw new RangeError('Exact Stored Time accounting cannot contain representative groups.')
  }
  const automationTimeUntilNextEvent = gameDecimalToNumberChecked(
    partialPlan.finalRawAutomationTimeUntilNextEvent,
    { maximum: hasQueuedInputs ? Number.MAX_VALUE : lease.automationIntervalSeconds },
  )
  if (!hasQueuedInputs && !approximatelyEqual(
    value.automationTimeUntilNextEvent,
    automationTimeUntilNextEvent,
  )) throw new RangeError('Candidate automation countdown does not match canonical timing.')
  const dysonAutomationTargetIndex = (
    lease.originAuthority.initialAutomationTargetIndex +
    Number(automationExecutions % 8n)
  ) % 8
  const researchAutomationTargetIndex = lease.originAuthority
    .researchAutomationUnlocked
    ? (
        lease.originAuthority.initialResearchAutomationTargetIndex +
        Number(automationExecutions % 14n)
      ) % 14
    : lease.originAuthority.initialResearchAutomationTargetIndex
  return Object.freeze({
    doubleTimeConsumedSeconds: expectedDoubleTimeConsumedSeconds,
    automationTimeUntilNextEvent,
    dysonAutomationTargetIndex,
    researchAutomationTargetIndex,
  })
}

function candidateMatchesLease(
  value: Extract<Readonly<StoredTimeWorkerMessageV2>, { type: 'checkpoint-candidate' | 'authority-request' | 'completed' }>,
  lease: ActiveLeaseV2,
): boolean {
  return value.workerInstanceNonce.length > 0 &&
    value.workerInstanceNonce === lease.workerInstanceNonce &&
    value.jobId === lease.jobId &&
    value.originRevision === lease.originRevision &&
    value.acknowledgedBaseRevision === lease.acknowledgedBaseRevision &&
    value.policyId === lease.policyId &&
    value.policyVersion === lease.policyVersion &&
    value.checkpointSequence === lease.checkpointSequence +
      (value.type === 'authority-request' ? 0 : 1)
}

function terminalProgressMatches(
  progress: Readonly<Extract<StoredTimeWorkerMessageV2, {
    type: 'cancelled' | 'paused' | 'failed'
  }>['progress']>,
  lease: ActiveLeaseV2,
): boolean {
  return approximatelyEqual(
    progress.durableSeconds,
    lease.cumulativeAccounting.cumulativeProcessedSeconds,
  ) && approximatelyEqual(progress.computedSeconds, progress.durableSeconds) &&
    progress.durableRawTicks ===
      lease.cumulativeAccounting.cumulativeRawAutomationTicks &&
    progress.computedRawTicks === progress.durableRawTicks &&
    progress.representativeGroups ===
      lease.cumulativeAccounting.cumulativeRepresentativeGroups
}

function createControlMessage(
  lease: ActiveLeaseV2,
  type: 'cancel' | 'lifecycle-pause' | 'authority-revoked',
  reason: 'user' | 'browser-hidden' | 'native-background' | 'host-suspending' |
    'foreground-command' | 'writer-fence-lost' | 'indeterminate',
): Readonly<StoredTimeWorkerMainMessageV2> {
  lease.controlSequence += 1
  return captureStoredTimeWorkerMainMessageV2(Object.freeze({
    type,
    protocolVersion: 1,
    workerInstanceNonce: lease.workerInstanceNonce,
    jobId: lease.jobId,
    originRevision: lease.originRevision,
    acknowledgedBaseRevision: lease.acknowledgedBaseRevision,
    policyId: lease.policyId,
    policyVersion: 1,
    checkpointSequence: lease.checkpointSequence,
    controlSequence: lease.controlSequence,
    reason,
  }))
}

async function completeRecord(
  core: Readonly<StoredTimeCheckpointRecordCoreV2>,
): Promise<Readonly<StoredTimeCheckpointRecordV2>> {
  const candidateHash = await hashCanonicalValueV2(core)
  const record = Object.freeze({ ...core, candidateHash }) as Readonly<
    StoredTimeCheckpointRecordV2
  >
  issuedCheckpointRecords.add(record)
  return record
}

async function hashCanonicalValueV2(value: unknown): Promise<string> {
  if (value !== null && typeof value === 'object') {
    const cached = canonicalHashCache.get(value)
    if (cached !== undefined) return cached
    const pending = computeCanonicalHashV2(value)
    canonicalHashCache.set(value, pending)
    return pending
  }
  return computeCanonicalHashV2(value)
}

async function computeCanonicalHashV2(value: unknown): Promise<string> {
  return hashStoredTimeWorkerWireValueV2(value)
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const record = value as Readonly<Record<string, unknown>>
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  ).join(',')}}`
}

function capturePublication(value: unknown): Readonly<StoredTimeAuthorityPublicationV2> {
  const properties = dataProperties(
    value, ['revision', 'state', 'runtime'], [], 'Stored Time authority publication',
  )
  const revision = propertyValue(properties, 'revision', 'Stored Time authority publication')
  requireSafeInteger(revision, 'Stored Time authority revision')
  if (revision === Number.MAX_SAFE_INTEGER) throw new RangeError('Stored Time authority revision is not incrementable.')
  const restored = decodeStoredTimeWorkerPublicationV2(
    encodeStoredTimeWorkerPublicationV2(Object.freeze({
      state: propertyValue(properties, 'state', 'Stored Time authority publication'),
      runtime: propertyValue(properties, 'runtime', 'Stored Time authority publication'),
    })),
  )
  return Object.freeze({ revision, state: restored.state, runtime: restored.runtime })
}

function encodeAuthorityPublication(
  value: Readonly<StoredTimeAuthorityPublicationV2>,
): Readonly<StoredTimeWorkerPublicationDtoV2> {
  return encodeStoredTimeWorkerPublicationV2(Object.freeze({
    state: value.state,
    runtime: value.runtime,
  }))
}

function captureAdmissionRequest(value: unknown): Readonly<StoredTimeJobAdmissionRequestV2> {
  const properties = dataProperties(value, [
    'expectedRevision', 'policyId', 'policyVersion',
    'requestedDurationSeconds','queuedInputs',
  ], ['queuedInputs'], 'Stored Time admission request')
  const expectedRevision = propertyValue(properties, 'expectedRevision', 'Stored Time admission request')
  requireSafeInteger(expectedRevision, 'Stored Time expected revision')
  const policyId = propertyValue(properties, 'policyId', 'Stored Time admission request')
  if (!['stored-time-fast-v1', 'stored-time-balanced-v1', 'stored-time-exact-v1'].includes(String(policyId))) {
    throw new TypeError('Stored Time policy is unsupported.')
  }
  if (propertyValue(properties, 'policyVersion', 'Stored Time admission request') !== 1) {
    throw new TypeError('Stored Time policy version is unsupported.')
  }
  const duration = propertyValue(properties, 'requestedDurationSeconds', 'Stored Time admission request')
  requirePositiveFinite(duration, 'Stored Time requested duration')
  return Object.freeze({
    expectedRevision,
    policyId: policyId as StoredTimePolicyIdV2,
    policyVersion: 1,
    requestedDurationSeconds: duration,
    queuedInputs:properties.queuedInputs===undefined?Object.freeze([]):captureStoredTimeWorkerQueuedInputsV2(properties.queuedInputs.value),
  })
}

function captureControlRequest(value: unknown): number {
  const properties = dataProperties(
    value, ['expectedRevision'], [], 'Stored Time control request',
  )
  const revision = propertyValue(properties, 'expectedRevision', 'Stored Time control request')
  requireSafeInteger(revision, 'Stored Time control revision')
  return revision
}

function captureFence(value: unknown): Readonly<StoredTimeWriterFenceV2> {
  const properties = dataProperties(
    value, ['ownerId', 'generation'], [], 'Stored Time writer fence',
  )
  const ownerId = requireIdentifier(
    propertyValue(properties, 'ownerId', 'Stored Time writer fence'),
    'Stored Time writer owner',
  )
  const generation = propertyValue(properties, 'generation', 'Stored Time writer fence')
  requireSafeInteger(generation, 'Stored Time writer generation')
  return Object.freeze({ ownerId, generation })
}

function captureExpectedIdentity(value: unknown): Readonly<{
  buildId: string
  catalogHash: string
  tuningHash: string
}> {
  const properties = dataProperties(
    value, ['buildId', 'catalogHash', 'tuningHash'], [],
    'Stored Time expected worker identity',
  )
  const buildId = requireIdentifier(
    propertyValue(properties, 'buildId', 'Stored Time expected worker identity'),
    'Stored Time expected build ID',
  )
  const catalogHash = propertyValue(
    properties, 'catalogHash', 'Stored Time expected worker identity',
  )
  const tuningHash = propertyValue(
    properties, 'tuningHash', 'Stored Time expected worker identity',
  )
  requireHash(catalogHash, 'Stored Time expected catalog hash')
  requireHash(tuningHash, 'Stored Time expected tuning hash')
  return Object.freeze({
    buildId,
    catalogHash: catalogHash as string,
    tuningHash: tuningHash as string,
  })
}

function dataProperties(
  value: unknown,
  expected: readonly string[],
  optional: readonly string[],
  path: string,
): Readonly<Record<string, PropertyDescriptor>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${path} must be a plain object.`)
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) throw new TypeError(`${path} cannot contain symbols.`)
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Object.keys(descriptors)
  const required = expected.filter((key) => !optional.includes(key))
  if (required.some((key) => !(key in descriptors)) ||
    keys.some((key) => !expected.includes(key))) {
    throw new TypeError(`${path} must contain exactly its declared fields.`)
  }
  for (const descriptor of Object.values(descriptors)) {
    if (!descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError(`${path} must contain enumerable data properties.`)
    }
  }
  return descriptors
}

function captureRepositoryMethod<TName extends 'read' | 'persist'>(
  repository: object,
  name: TName,
): StoredTimeCheckpointRepositoryV2[TName] {
  let cursor: object | null = repository
  while (cursor !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(cursor, name)
    if (descriptor !== undefined) {
      if (!('value' in descriptor) || typeof descriptor.value !== 'function') {
        throw new TypeError(`Stored Time checkpoint repository ${name} must be a data method.`)
      }
      return descriptor.value as StoredTimeCheckpointRepositoryV2[TName]
    }
    cursor = Object.getPrototypeOf(cursor) as object | null
  }
  throw new TypeError(`Stored Time checkpoint repository ${name} method is missing.`)
}

function propertyValue(
  properties: Readonly<Record<string, PropertyDescriptor>>,
  key: string,
  path: string,
): unknown {
  const descriptor = properties[key]
  if (descriptor === undefined || !('value' in descriptor)) throw new TypeError(`${path}.${key} is missing.`)
  return descriptor.value
}

function requireExactKeys(value: Readonly<Record<string, unknown>>, expected: readonly string[], path: string): void {
  const keys = Object.keys(value)
  if (keys.length !== expected.length || keys.some((key) => !expected.includes(key))) {
    throw new TypeError(`${path} must contain exactly its declared fields.`)
  }
}

function requireIdentifier(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 128 ||
    !/^[A-Za-z0-9._:-]+$/u.test(value)) throw new TypeError(`${path} is invalid.`)
  return value
}

function requireHash(value: unknown, path: string, identifier = false): void {
  if (identifier) {
    requireIdentifier(value, path)
    return
  }
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) {
    throw new TypeError(`${path} must be a SHA-256 hash.`)
  }
}

function requireSafeInteger(value: unknown, path: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) {
    throw new TypeError(`${path} must be a non-negative safe integer.`)
  }
}

function requirePositiveFinite(value: unknown, path: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || Object.is(value, -0)) {
    throw new TypeError(`${path} must be positive and finite.`)
  }
}

function requireFiniteNonNegative(value: unknown, path: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 ||
    Object.is(value, -0)) {
    throw new TypeError(`${path} must be finite and non-negative.`)
  }
}

function createRandomJobId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return `job-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function fencesEqual(left: Readonly<StoredTimeWriterFenceV2>, right: Readonly<StoredTimeWriterFenceV2>): boolean {
  return left.ownerId === right.ownerId && left.generation === right.generation
}

function recordsEqual(left: Readonly<StoredTimeCheckpointRecordV2>, right: Readonly<StoredTimeCheckpointRecordV2>): boolean {
  return canonicalJson(left) === canonicalJson(right)
}

function readBackMatchesPrior(
  readBack: CheckpointReadResultV2,
  prior: CheckpointReadResultV2,
): boolean {
  if (readBack.status === 'empty') return prior.status === 'empty'
  return readBack.status === 'ok' && prior.status === 'ok' &&
    recordsEqual(readBack.record, prior.record)
}

function approximatelyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= Number.EPSILON * Math.max(1, Math.abs(left), Math.abs(right)) * 4
}

function schedulerApproximatelyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= Math.max(
    1e-12,
    Number.EPSILON * Math.max(1, Math.abs(left), Math.abs(right)) * 16,
  )
}

function schedulerApproximatelyEqualWithOperationBound(
  left: number,
  right: number,
  operationBound: number,
): boolean {
  return Math.abs(left - right) <= Number.EPSILON *
    Math.max(1, Math.abs(left), Math.abs(right)) * operationBound * 16
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function admissionResult(
  status: StoredTimeJobAdmissionStatusV2,
  publication: Readonly<StoredTimeAuthorityPublicationV2>,
  start: Readonly<StoredTimeWorkerMainMessageV2> | null,
  error?: string,
): Readonly<StoredTimeJobAdmissionResultV2> {
  return Object.freeze({ status, publication, start, ...(error === undefined ? {} : { error }) })
}

function commitResult(
  status: StoredTimeCheckpointCommitStatusV2,
  publication: Readonly<StoredTimeAuthorityPublicationV2>,
  acknowledgement: Readonly<StoredTimeWorkerMainMessageV2> | null,
  terminalControl: Readonly<StoredTimeWorkerMainMessageV2> | null,
  error?: string,
): Readonly<StoredTimeCheckpointCommitResultV2> {
  return Object.freeze({ status, publication, acknowledgement, terminalControl, ...(error === undefined ? {} : { error }) })
}

function controlResult(
  status: StoredTimeJobControlResultV2['status'],
  publication: Readonly<StoredTimeAuthorityPublicationV2>,
  message: Readonly<StoredTimeWorkerMainMessageV2> | null,
): Readonly<StoredTimeJobControlResultV2> {
  return Object.freeze({ status, publication, message })
}

function recoveryResult(
  status: StoredTimeJobRecoveryResultV2['status'],
  publication: Readonly<StoredTimeAuthorityPublicationV2>,
  error?: string,
  start: Readonly<StoredTimeWorkerMainMessageV2> | null = null,
): Readonly<StoredTimeJobRecoveryResultV2> {
  return Object.freeze({
    status,
    publication,
    start,
    ...(error === undefined ? {} : { error }),
  })
}
