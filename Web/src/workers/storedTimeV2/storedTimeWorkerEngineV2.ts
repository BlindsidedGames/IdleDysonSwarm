import {
  GAME_DECIMAL_ZERO,
  GAME_DECIMAL_MINIMUM_SCHEDULER_SECONDS,
  addGameDecimals,
  compareGameDecimals,
  gameDecimalFromCanonicalString,
  gameDecimalFromNumber,
  gameDecimalToCanonicalString,
  gameDecimalToSchedulerSeconds,
  subtractGameDecimals,
  type GameDecimal,
} from '../../math/gameDecimal'
import {
  advanceCanonicalEventTimeV2,
  normalizePreparedFastDreamCyclesV2,
  advancePreparedFastRepresentativeGroupV2,
  prepareCanonicalEventTimeCarrierV2,
  retimePreparedCanonicalEventTimeCarrierV2,
  registerCanonicalTimerAggregationAuthorityV2ForWorker,
  registerCanonicalQuantumEpochAuthorityV2ForWorker,
  resumeCanonicalEventTimeV2FromTransientAuthoritySeal,
  resumeCanonicalEventTimeV2,
  type CanonicalEventTimeCarrierV2,
  type CanonicalEventTimeV2AdvanceResult,
  type CanonicalEventTimeV2Continuation,
  type CanonicalEventTimeV2MaterialBoundarySeal,
  type CanonicalEventTimeV2Summary,
  type CanonicalQueuedInputV2,
  type CanonicalQuantumEpochAuthorityV2,
  type CanonicalTimerAggregationAuthorityV2,
} from '../../simulation/canonicalEventTimeModelV2'
import {
  registerInfinityRewardAuthorityV2ForWorker,
  type InfinityRewardAuthorityV2,
} from '../../simulation/infinityEconomyV2'
import {
  STORED_TIME_BALANCED_BUDGET_MILLISECONDS_V2,
  planStoredTimePolicyV2,
  type StoredTimePolicyPlanV2,
} from '../../simulation/storedTimePolicyV2'
import { STORED_TIME_FAST_DISCLOSURE_V2 } from '../../simulation/storedTimePolicyDisclosureV2'
import { DISCRETE_MAXIMUM } from '../../simulation/numeric'
import {
  CANONICAL_STORED_TIME_WORKER_ENGINE_BOUNDARY_V2,
  type StoredTimeWorkerEngineBoundaryV2,
} from './workerEngineBoundaryV2'
import {
  captureStoredTimeWorkerMessageV2,
  STORED_TIME_DREAM_REPLAY_LIMIT_V2,
  type StoredTimeWorkerAccountingDtoV2,
  type StoredTimeWorkerMainMessageV2,
  type StoredTimeWorkerMessageV2,
  type StoredTimeWorkerProgressDtoV2,
  type StoredTimeWorkerQueuedInputDtoV2,
  type StoredTimeWorkerFailureDiagnosticCodeV2,
  type StoredTimeWorkerSchedulerSummaryDtoV2,
} from './workerProtocolV2'
import {
  decodeStoredTimeWorkerPublicationV2,
  encodeStoredTimeWorkerPublicationV2,
  hashStoredTimeWorkerWireValueV2,
} from './workerWireV2'

export const STORED_TIME_FAST_DISCLOSURE_CODE_V2 =
  STORED_TIME_FAST_DISCLOSURE_V2.code
export const STORED_TIME_FAST_DISCLOSURE_TEXT_V2 =
  STORED_TIME_FAST_DISCLOSURE_V2.text
export const STORED_TIME_WORKER_MATERIAL_EVENT_BUDGET_V2 = 8 as const
const STORED_TIME_WORKER_SCHEDULER_EVENT_BUDGET_V2 = 8 as const
export const STORED_TIME_WORKER_CHUNK_WALL_BUDGET_MILLISECONDS_V2 = 40
export const STORED_TIME_WORKER_PROGRESS_INTERVAL_MILLISECONDS_V2 = 250
export const STORED_TIME_WORKER_CHECKPOINT_INTERVAL_MILLISECONDS_V2 = 5_000

type StartMessageV2 = Extract<StoredTimeWorkerMainMessageV2, { type: 'start' }>
type WorkerJobIdentityV2 = Omit<StartMessageV2, 'publication' | 'restart'|'queuedInputs'>
type CommittedMessageV2 = Extract<
  StoredTimeWorkerMainMessageV2,
  { type: 'checkpoint-committed' }
>
type AuthorityGrantedMessageV2 = Extract<
  StoredTimeWorkerMainMessageV2,
  { type: 'authority-granted' }
>

export interface StoredTimeWorkerEngineHostV2 {
  readonly nowMilliseconds: () => number
  readonly schedule: (task: () => void) => void
  readonly postMessage: (message: Readonly<StoredTimeWorkerMessageV2>) => void
}

interface PendingCheckpointV2 {
  readonly authorityPhase: import('./workerProtocolV2').StoredTimeWorkerAuthorityPhaseV2 | null
  readonly seal: Readonly<CanonicalEventTimeV2MaterialBoundarySeal> | null
  readonly pauseReason: 'balanced-wall-limit' | 'lifecycle' | 'fast-normalization-proof-failed' | null
  readonly accounting: Readonly<StoredTimeWorkerAccountingDtoV2>
  readonly queuedInputs: readonly Readonly<CanonicalQueuedInputV2>[]
  readonly completed: boolean
  readonly proposalHash: string
  readonly dreamResetCount: bigint
}

interface WorkerJobV2 {
  identity: Readonly<WorkerJobIdentityV2>
  carrier: Readonly<CanonicalEventTimeCarrierV2>
  readonly originDoubleTimeBankSeconds: number
  readonly originStoredTimeAvailableSeconds: number
  readonly accountingBaseProcessedSeconds: number
  readonly accountingBaseDoubleTimeConsumedSeconds: number
  readonly accountingBaseInfinityElapsedSeconds: number
  readonly originInfinityCycleSeconds: number
  readonly originInfinityBoundaryRemaining: number
  readonly accountingBaseRawTicks: bigint
  readonly accountingBaseRepresentativeGroups: number
  readonly summaryBase: Readonly<StoredTimeWorkerSchedulerSummaryDtoV2>
  readonly infinityRewardAuthority: Readonly<InfinityRewardAuthorityV2>
  readonly timerAggregationAuthority:
    Readonly<CanonicalTimerAggregationAuthorityV2> | null
  readonly quantumEpochAuthority: Readonly<CanonicalQuantumEpochAuthorityV2>
  readonly workDurationSeconds: number
  readonly plan: Readonly<StoredTimePolicyPlanV2>
  readonly startedAtMilliseconds: number
  lastProgressAtMilliseconds: number
  lastCheckpointAtMilliseconds: number
  maximumObservedChunkMilliseconds: number
  maximumObservedAtomicEventMilliseconds: number
  durableSeconds: number
  durableRawTicks: bigint
  durableRepresentativeGroups: number
  computedSeconds: number
  computedRawTicks: bigint
  fastCompletedRawTicks: bigint
  representativeGroups: number
  fastGroupIndex: number
  readonly fastWorkAnchor: GameDecimal
  fastCurrentMaterialEventsSeen: number
  fastCurrentZeroTimePassesSeen: number
  fastCountersNeedReset: boolean
  fastDreamCycleAnchor: Readonly<{
    carrier: Readonly<CanonicalEventTimeCarrierV2>
    startsAtGroupIndex: number
  }> | null
  fastDreamNormalizationFailed: boolean
  fastDreamNormalizationCheckpointNeeded: boolean
  exactContinuation: Readonly<CanonicalEventTimeV2Continuation> | null
  fastContinuation: Readonly<CanonicalEventTimeV2Continuation> | null
  resumeSeal: Readonly<CanonicalEventTimeV2MaterialBoundarySeal> | null
  resumeSealIsTransient: boolean
  pendingCheckpoint: Readonly<PendingCheckpointV2> | null
  cancelRequested: boolean
  cancelAfterAcknowledgement: boolean
  lifecyclePauseRequested: boolean
  authorityRevoked: boolean
  controlSequence: number
  summaryMaterialEvents: number
  summaryZeroTimePasses: number
  summaryBoundaryDigest: string
  summaryInfinityResetCount: bigint
  summaryLastInfinityResetElapsedSeconds: number | null
  summaryDreamResetCount: bigint
  summaryDreamFastNormalizedResetCount: bigint
  summaryDreamFastNormalizationFirstCycleElapsedSeconds: number | null
  summaryDreamFastNormalizationCycleSeconds: number | null
  summaryDreamMeteorResetCount: bigint
  summaryDreamAiResetCount: bigint
  summaryDreamGlobalWarmingResetCount: bigint
  summaryDreamBlackHoleResetCount: bigint
  summaryDreamStrangeMatterRequested: GameDecimal
  summaryDreamStrangeMatterEffective: GameDecimal
  summaryDreamStrangeMatterFinal: GameDecimal | null
  summaryDreamLifetimeStrangeMatterFinal: GameDecimal | null
  summaryDreamCurrentQuantumRunStrangeMatterFinal: GameDecimal | null
  summaryDreamRecentProcessedSegmentStrangeMatterFinal: GameDecimal | null
  summaryQuantumResetCount:bigint
  summaryQuantumEntanglementCount:bigint
  summaryQuantumAvailableShardsEffective:GameDecimal
  summaryQuantumLifetimeShardsEffective:GameDecimal
  summaryQuantumInfinityPointsConsumed:GameDecimal
  summaryQuantumAvailableShardsFinal:GameDecimal|null
  summaryQuantumLifetimeShardsFinal:GameDecimal|null
  summaryQuantumInfinityAvailableFinal:GameDecimal|null
  summaryQuantumInfinityAllocatedFinal:GameDecimal|null
  summaryQuantumResetSkillPointsFinal:bigint|null
  latestExactSummary: Readonly<CanonicalEventTimeV2Summary> | null
  acknowledgedDreamResetCount: bigint
  exactBoundaryPassesSeen: Record<string, bigint>
  queuedInputs: readonly Readonly<CanonicalQueuedInputV2>[]
  queuedInputsBaseProcessedSeconds: number
}

const NO_DORMANT_EVENTS = Object.freeze({
  reality: false,
  dreamReset: false,
  botCapTransition: false,
  infinityReset: false,
})

const ZERO_ACCOUNTING_V2 = Object.freeze({
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
}) satisfies Readonly<StoredTimeWorkerAccountingDtoV2>

const ZERO_SCHEDULER_SUMMARY_V2 = Object.freeze({
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
  boundaryDigest: 'cbf29ce484222325',
}) satisfies Readonly<StoredTimeWorkerSchedulerSummaryDtoV2>

const ZERO_PROGRESS_V2 = Object.freeze({
  computedSeconds: 0,
  durableSeconds: 0,
  computedRawTicks: '0',
  durableRawTicks: '0',
  representativeGroups: 0,
  elapsedWallMilliseconds: 0,
  maximumChunkMilliseconds: 0,
  maximumAtomicEventMilliseconds: 0,
  throughputTicksPerSecond: 0,
  etaMilliseconds: null,
  warmingUp: true,
}) satisfies Readonly<StoredTimeWorkerProgressDtoV2>

/**
 * Dormant worker-local engine. It owns opaque continuations/seals and emits
 * only neutral protocol DTOs; no production root or persistence adapter imports it.
 */
export class StoredTimeWorkerEngineV2 {
  readonly #host: Readonly<StoredTimeWorkerEngineHostV2>
  readonly #boundary: Readonly<StoredTimeWorkerEngineBoundaryV2>
  #job: WorkerJobV2 | null = null
  #scheduled = false
  #lastDiagnostic: string | null = null
  #lastMaximumObservedChunkMilliseconds = 0
  #lastMaximumObservedAtomicEventMilliseconds = 0

  constructor(
    host: Readonly<StoredTimeWorkerEngineHostV2>,
    boundary: Readonly<StoredTimeWorkerEngineBoundaryV2> =
      CANONICAL_STORED_TIME_WORKER_ENGINE_BOUNDARY_V2,
  ) {
    if (
      host === null ||
      typeof host !== 'object' ||
      typeof host.nowMilliseconds !== 'function' ||
      typeof host.schedule !== 'function' ||
      typeof host.postMessage !== 'function'
    ) {
      throw new TypeError('Stored Time worker engine host is invalid.')
    }
    this.#host = host
    this.#boundary = boundary
  }

  accept(message: Readonly<StoredTimeWorkerMainMessageV2>): void {
    if (message.type === 'start') {
      this.#start(message)
      return
    }
    const job = this.#job
    if (job === null || !messageMatchesJob(message, job.identity)) return
    if (
      message.type === 'cancel' ||
      message.type === 'lifecycle-pause' ||
      message.type === 'authority-revoked'
    ) {
      if (message.controlSequence <= job.controlSequence) return
      job.controlSequence = message.controlSequence
    }
    if (message.type === 'cancel') {
      if (job.pendingCheckpoint?.authorityPhase !== null &&
        job.pendingCheckpoint?.authorityPhase !== undefined) {
        this.#postTerminalProgress(job, 'cancelled')
        this.#job = null
      } else if (job.pendingCheckpoint !== null) {
        job.cancelAfterAcknowledgement = true
      } else {
        job.cancelRequested = true
        this.#postTerminalProgress(job, 'cancelled')
        this.#job = null
      }
      return
    }
    if (message.type === 'lifecycle-pause') {
      if (job.pendingCheckpoint?.authorityPhase !== null &&
        job.pendingCheckpoint?.authorityPhase !== undefined) {
        this.#postTerminalProgress(job, 'paused', 'lifecycle')
        this.#job = null
        return
      }
      job.lifecyclePauseRequested = true
      this.#schedule()
      return
    }
    if (message.type === 'authority-revoked') {
      job.authorityRevoked = true
      this.#job = null
      return
    }
    if (message.type === 'checkpoint-committed') {
      this.#acknowledge(message)
    } else if (message.type === 'authority-granted') {
      this.#acknowledgeAuthority(message)
    }
  }

  snapshot(): Readonly<{
    active: boolean
    maximumObservedChunkMilliseconds: number
    maximumObservedAtomicEventMilliseconds: number
    disclosureCode: typeof STORED_TIME_FAST_DISCLOSURE_CODE_V2 | null
    diagnostic: string | null
  }> {
    return Object.freeze({
      active: this.#job !== null,
      maximumObservedChunkMilliseconds:
        this.#job?.maximumObservedChunkMilliseconds ??
        this.#lastMaximumObservedChunkMilliseconds,
      maximumObservedAtomicEventMilliseconds:
        this.#job?.maximumObservedAtomicEventMilliseconds ??
        this.#lastMaximumObservedAtomicEventMilliseconds,
      disclosureCode: this.#job?.plan.executionKind ===
        'fast-representative-groups'
        ? STORED_TIME_FAST_DISCLOSURE_CODE_V2
        : null,
      diagnostic: this.#lastDiagnostic,
    })
  }

  #start(message: Readonly<StartMessageV2>): void {
    if (this.#job !== null) {
      this.#postFailure(message, 'invalid-message', false, 'start-invalid')
      return
    }
    try {
      const publication = decodeStoredTimeWorkerPublicationV2(message.publication)
      const restart = message.restart
      const accountingBase = restart?.cumulativeAccounting ?? ZERO_ACCOUNTING_V2
      const summaryBase = restart?.cumulativeSchedulerSummary ?? ZERO_SCHEDULER_SUMMARY_V2
      const expectedAvailable = message.admittedBankSeconds -
        accountingBase.cumulativeProcessedSeconds
      if (
        publication.state.timeline.storedTimeAvailableSeconds !== expectedAvailable
      ) {
        throw new RangeError(
          'Stored Time admission does not match the canonical publication bank.',
        )
      }
      let carrier = prepareCanonicalEventTimeCarrierV2(Object.freeze({
        state: publication.state,
        runtime: publication.runtime,
        revision: message.acknowledgedBaseRevision,
      }))
      const plan = planStoredTimePolicyV2(Object.freeze({
        policyId: message.policyId,
        policyVersion: message.policyVersion,
        requestedDurationSeconds:
          restart?.originalRequestedDurationSeconds ?? message.requestedDurationSeconds,
        initialAutomationHorizonSeconds:
          restart?.originalInitialAutomationHorizonSeconds ??
          carrier.state.timeline.automationTimeUntilNextEvent,
        automationIntervalSeconds: message.automationIntervalSeconds,
        initialAutomationTargetIndex:
          restart?.originalInitialAutomationTargetIndex ??
          carrier.state.timeline.dysonAutomationTargetIndex,
        hardEvents: Object.freeze([]),
      }))
      const originalRawTicks = restart?.originalRequestedRawAutomationTicks ??
        message.requestedRawAutomationTicks
      if (
        restart !== null &&
        (message.requestedDurationSeconds !==
            restart.originalRequestedDurationSeconds ||
          message.requestedRawAutomationTicks !==
            restart.originalRequestedRawAutomationTicks ||
          restart.completedRepresentativeGroups !==
            restart.cumulativeAccounting.cumulativeRepresentativeGroups ||
          restart.cumulativeSchedulerSummary.automationTicks !==
            restart.cumulativeAccounting.cumulativeRawAutomationTicks ||
          restart.cumulativeSchedulerSummary.storedTimeConsumedSeconds !==
            restart.cumulativeAccounting.cumulativeProcessedSeconds ||
          restart.cumulativeSchedulerSummary.baseSimulationSeconds !==
            restart.cumulativeAccounting.cumulativeProcessedSeconds ||
          restart.cumulativeAccounting.cumulativeInfinityElapsedSeconds !==
            restart.cumulativeAccounting.cumulativeProcessedSeconds ||
          restart.cumulativeAccounting.cumulativeInfinityResetCount !==
            restart.cumulativeSchedulerSummary.infinityResetCount ||
          restart.cumulativeAccounting.lastInfinityResetElapsedSeconds !==
            restart.cumulativeSchedulerSummary.lastInfinityResetElapsedSeconds ||
          !schedulerApproximatelyEqualV2(
            restart.cumulativeAccounting.sealedInfinityCycleSeconds,
            carrier.state.timeline.infinityCycleSeconds,
          ) ||
          !schedulerApproximatelyEqualV2(
            restart.cumulativeAccounting.sealedInfinityBoundaryRemaining,
            carrier.state.timeline.infinityBoundaryRemaining,
          ) ||
          restart.cumulativeSchedulerSummary.dreamSimulationSeconds !==
            restart.cumulativeAccounting.cumulativeProcessedSeconds +
              restart.cumulativeAccounting.cumulativeDoubleTimeConsumedSeconds ||
          restart.cumulativeAccounting.automationTimeUntilNextEvent !==
            carrier.state.timeline.automationTimeUntilNextEvent)
      ) {
        throw new RangeError('Stored Time restart accounting is inconsistent.')
      }
      if (plan.rawAutomationBoundaries !== BigInt(originalRawTicks)) {
        throw new RangeError('Stored Time raw automation count does not match the canonical plan.')
      }
      const completedRepresentativeGroups =
        restart?.completedRepresentativeGroups ?? 0
      if (completedRepresentativeGroups > plan.groups.length) {
        throw new RangeError('Stored Time representative-group restart cursor is invalid.')
      }
      if (
        plan.executionKind !== 'fast-representative-groups' &&
        completedRepresentativeGroups !== 0
      ) {
        throw new RangeError('Exact Stored Time restart cannot carry Fast groups.')
      }
      if (
        BigInt(accountingBase.cumulativeRawAutomationTicks) >
        plan.rawAutomationBoundaries
      ) {
        throw new RangeError('Stored Time restart raw automation exceeds its plan.')
      }
      const workDurationSeconds = restart?.sealedRemainingDurationSeconds ??
        message.requestedDurationSeconds
      if (
        !approximatelyEqualV2(
          accountingBase.cumulativeProcessedSeconds + workDurationSeconds,
          plan.requestedDurationSeconds,
        )
      ) {
        throw new RangeError('Stored Time restart duration does not close the original request.')
      }
      if (
        plan.executionKind === 'fast-representative-groups' &&
        completedRepresentativeGroups < plan.groups.length
      ) {
        const group = plan.groups[completedRepresentativeGroups]
        carrier = retimeCarrierV2(
          carrier,
          schedulerSpanV2(group.startsAt, group.endsAt),
        )
      }
      const now = requireMonotonicNow(this.#host.nowMilliseconds())
      this.#lastMaximumObservedChunkMilliseconds = 0
      this.#lastMaximumObservedAtomicEventMilliseconds = 0
      this.#job = {
        identity: compactJobIdentityV2(message),
        carrier,
        originDoubleTimeBankSeconds:
          carrier.state.timeline.doubleTime.bankSeconds,
        originStoredTimeAvailableSeconds:
          carrier.state.timeline.storedTimeAvailableSeconds,
        accountingBaseProcessedSeconds:
          accountingBase.cumulativeProcessedSeconds,
        accountingBaseDoubleTimeConsumedSeconds:
          accountingBase.cumulativeDoubleTimeConsumedSeconds,
        accountingBaseInfinityElapsedSeconds:
          accountingBase.cumulativeInfinityElapsedSeconds,
        originInfinityCycleSeconds:
          carrier.state.timeline.infinityCycleSeconds -
          accountingBase.cumulativeInfinityElapsedSeconds,
        originInfinityBoundaryRemaining:
          carrier.state.timeline.infinityBoundaryRemaining +
          accountingBase.cumulativeInfinityElapsedSeconds,
        accountingBaseRawTicks:
          BigInt(accountingBase.cumulativeRawAutomationTicks),
        accountingBaseRepresentativeGroups:
          accountingBase.cumulativeRepresentativeGroups,
        summaryBase,
        infinityRewardAuthority: registerInfinityRewardAuthorityV2ForWorker(
          message.permanentDoubleIp,
        ),
        timerAggregationAuthority:
          plan.executionKind === 'fast-representative-groups'
            ? registerCanonicalTimerAggregationAuthorityV2ForWorker()
            : null,
        quantumEpochAuthority: registerCanonicalQuantumEpochAuthorityV2ForWorker(),
        workDurationSeconds,
        plan,
        startedAtMilliseconds: now,
        lastProgressAtMilliseconds: now,
        lastCheckpointAtMilliseconds: now,
        maximumObservedChunkMilliseconds: 0,
        maximumObservedAtomicEventMilliseconds: 0,
        durableSeconds: accountingBase.cumulativeProcessedSeconds,
        durableRawTicks: BigInt(accountingBase.cumulativeRawAutomationTicks),
        durableRepresentativeGroups:
          accountingBase.cumulativeRepresentativeGroups,
        computedSeconds: accountingBase.cumulativeProcessedSeconds,
        computedRawTicks: BigInt(accountingBase.cumulativeRawAutomationTicks),
        fastCompletedRawTicks: BigInt(accountingBase.cumulativeRawAutomationTicks),
        representativeGroups: accountingBase.cumulativeRepresentativeGroups,
        fastGroupIndex: completedRepresentativeGroups,
        fastWorkAnchor: plan.groups[0]?.startsAt ?? GAME_DECIMAL_ZERO,
        fastCurrentMaterialEventsSeen: 0,
        fastCurrentZeroTimePassesSeen: 0,
        fastCountersNeedReset: false,
        fastDreamCycleAnchor: plan.executionKind === 'fast-representative-groups' &&
          BigInt(summaryBase.dreamResetCount) > 0n
          ? Object.freeze({
              carrier,
              startsAtGroupIndex: completedRepresentativeGroups,
            })
          : null,
        fastDreamNormalizationFailed: false,
        fastDreamNormalizationCheckpointNeeded: false,
        exactContinuation: null,
        fastContinuation: null,
        resumeSeal: null,
        resumeSealIsTransient: false,
        pendingCheckpoint: null,
        cancelRequested: false,
        cancelAfterAcknowledgement: false,
        lifecyclePauseRequested: false,
        authorityRevoked: false,
        controlSequence: 0,
        summaryMaterialEvents: summaryBase.materialEvents,
        summaryZeroTimePasses: summaryBase.zeroTimePasses,
        summaryBoundaryDigest: summaryBase.boundaryDigest,
        summaryInfinityResetCount: BigInt(summaryBase.infinityResetCount),
        summaryLastInfinityResetElapsedSeconds:
          summaryBase.lastInfinityResetElapsedSeconds,
        summaryDreamResetCount: BigInt(summaryBase.dreamResetCount),
        summaryDreamFastNormalizedResetCount:
          BigInt(summaryBase.dreamFastNormalizedResetCount),
        summaryDreamFastNormalizationFirstCycleElapsedSeconds:
          summaryBase.dreamFastNormalizationFirstCycleElapsedSeconds,
        summaryDreamFastNormalizationCycleSeconds:
          summaryBase.dreamFastNormalizationCycleSeconds,
        summaryDreamMeteorResetCount: BigInt(summaryBase.dreamMeteorResetCount),
        summaryDreamAiResetCount: BigInt(summaryBase.dreamAiResetCount),
        summaryDreamGlobalWarmingResetCount:
          BigInt(summaryBase.dreamGlobalWarmingResetCount),
        summaryDreamBlackHoleResetCount:
          BigInt(summaryBase.dreamBlackHoleResetCount),
        summaryDreamStrangeMatterRequested:
          gameDecimalFromCanonicalString(summaryBase.dreamStrangeMatterRequested),
        summaryDreamStrangeMatterEffective:
          gameDecimalFromCanonicalString(summaryBase.dreamStrangeMatterEffective),
        summaryDreamStrangeMatterFinal: summaryBase.dreamStrangeMatterFinal === null
          ? null
          : gameDecimalFromCanonicalString(summaryBase.dreamStrangeMatterFinal),
        summaryDreamLifetimeStrangeMatterFinal:
          summaryBase.dreamLifetimeStrangeMatterFinal === null
            ? null
            : gameDecimalFromCanonicalString(
              summaryBase.dreamLifetimeStrangeMatterFinal,
            ),
        summaryDreamCurrentQuantumRunStrangeMatterFinal:
          summaryBase.dreamCurrentQuantumRunStrangeMatterFinal === null
            ? null
            : gameDecimalFromCanonicalString(
              summaryBase.dreamCurrentQuantumRunStrangeMatterFinal,
            ),
        summaryDreamRecentProcessedSegmentStrangeMatterFinal:
          summaryBase.dreamRecentProcessedSegmentStrangeMatterFinal === null
            ? null
            : gameDecimalFromCanonicalString(
              summaryBase.dreamRecentProcessedSegmentStrangeMatterFinal,
            ),
        summaryQuantumResetCount:BigInt(summaryBase.quantumResetCount),
        summaryQuantumEntanglementCount:BigInt(summaryBase.quantumEntanglementCount),
        summaryQuantumAvailableShardsEffective:gameDecimalFromCanonicalString(summaryBase.quantumAvailableShardsEffective),
        summaryQuantumLifetimeShardsEffective:gameDecimalFromCanonicalString(summaryBase.quantumLifetimeShardsEffective),
        summaryQuantumInfinityPointsConsumed:gameDecimalFromCanonicalString(summaryBase.quantumInfinityPointsConsumed),
        summaryQuantumAvailableShardsFinal:summaryBase.quantumAvailableShardsFinal===null?null:gameDecimalFromCanonicalString(summaryBase.quantumAvailableShardsFinal),
        summaryQuantumLifetimeShardsFinal:summaryBase.quantumLifetimeShardsFinal===null?null:gameDecimalFromCanonicalString(summaryBase.quantumLifetimeShardsFinal),
        summaryQuantumInfinityAvailableFinal:summaryBase.quantumInfinityAvailableFinal===null?null:gameDecimalFromCanonicalString(summaryBase.quantumInfinityAvailableFinal),
        summaryQuantumInfinityAllocatedFinal:summaryBase.quantumInfinityAllocatedFinal===null?null:gameDecimalFromCanonicalString(summaryBase.quantumInfinityAllocatedFinal),
        summaryQuantumResetSkillPointsFinal:summaryBase.quantumResetSkillPointsFinal===null?null:BigInt(summaryBase.quantumResetSkillPointsFinal),
        latestExactSummary: null,
        acknowledgedDreamResetCount: BigInt(summaryBase.dreamResetCount),
        exactBoundaryPassesSeen: Object.create(null) as Record<string, bigint>,
        queuedInputs: captureCanonicalQueueV2(restart?.rebasedQueuedInputs ?? message.queuedInputs),
        queuedInputsBaseProcessedSeconds: accountingBase.cumulativeProcessedSeconds,
      }
      this.#schedule()
    } catch {
      this.#postFailure(
        message,
        'invalid-message',
        false,
        'start-invalid',
        restartDurableProgressV2(message),
      )
    }
  }

  #schedule(): void {
    if (this.#scheduled || this.#job === null) return
    this.#scheduled = true
    this.#host.schedule(() => {
      this.#scheduled = false
      void this.#step()
    })
  }

  async #step(): Promise<void> {
    const job = this.#job
    if (job === null || job.pendingCheckpoint !== null || job.authorityRevoked) return
    if (job.cancelRequested) {
      this.#postTerminalProgress(job, 'cancelled')
      this.#job = null
      return
    }
    const started = requireMonotonicNow(this.#host.nowMilliseconds())
    let finished = started
    let materialEventsInChunk = 0
    for (
      let atomicEvents = 0;
      atomicEvents < STORED_TIME_WORKER_MATERIAL_EVENT_BUDGET_V2;
      atomicEvents += 1
    ) {
      const atomicStarted = requireMonotonicNow(this.#host.nowMilliseconds())
      let result: Readonly<CanonicalEventTimeV2AdvanceResult>
      const materialEventsBefore = job.summaryMaterialEvents
      try {
        result = job.plan.executionKind === 'fast-representative-groups'
          ? this.#advanceFast(job)
          : this.#advanceExact(job)
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        this.#lastDiagnostic = job.plan.executionKind === 'fast-representative-groups'
          ? `fast-group=${job.fastGroupIndex};bank=${job.carrier.state.timeline.storedTimeAvailableSeconds};${detail}`
          : detail
        this.#postFailure(
          job.identity,
          'budget-exceeded',
          false,
          'advance-exception',
        )
        this.#job = null
        return
      }
      materialEventsInChunk +=
        job.summaryMaterialEvents - materialEventsBefore
      finished = requireMonotonicNow(this.#host.nowMilliseconds())
      if (finished < atomicStarted || atomicStarted < started) {
        this.#postFailure(job.identity, 'budget-exceeded', false, 'clock-invalid')
        this.#job = null
        return
      }
      job.maximumObservedChunkMilliseconds = Math.max(
        job.maximumObservedChunkMilliseconds,
        finished - started,
      )
      job.maximumObservedAtomicEventMilliseconds = Math.max(
        job.maximumObservedAtomicEventMilliseconds,
        finished - atomicStarted,
      )
      this.#lastMaximumObservedChunkMilliseconds = Math.max(
        this.#lastMaximumObservedChunkMilliseconds,
        finished - started,
      )
      this.#lastMaximumObservedAtomicEventMilliseconds = Math.max(
        this.#lastMaximumObservedAtomicEventMilliseconds,
        finished - atomicStarted,
      )
      if (
        finished - atomicStarted >=
        STORED_TIME_WORKER_CHUNK_WALL_BUDGET_MILLISECONDS_V2
      ) {
        this.#postFailure(
          job.identity,
          'budget-exceeded',
          true,
          'atomic-wall-budget',
        )
        this.#job = null
        return
      }
      if (
        result.status === 'blocked-unported-event' ||
        result.status === 'zero-time-loop'
      ) {
        this.#postFailure(
          job.identity,
          'blocked-unported-event',
          false,
          result.status === 'blocked-unported-event'
            ? 'unported-event'
            : 'advance-exception',
        )
        this.#job = null
        return
      }
      if (
        result.status === 'stored-time-exhausted' &&
        !isRepresentationalSchedulerTailV2(
          result.remainingSeconds,
          result.consumedSeconds,
        )
      ) {
        this.#lastDiagnostic = [
          'stored-time-exhausted',
          result.consumedSeconds,
          result.remainingSeconds,
          job.carrier.state.timeline.storedTimeAvailableSeconds,
        ].join(':')
        this.#postFailure(
          job.identity,
          'budget-exceeded',
          false,
          'stored-time-exhausted',
        )
        this.#job = null
        return
      }
      if (result.status === 'cancelled') {
        this.#postTerminalProgress(job, 'cancelled')
        this.#job = null
        return
      }
      try {
        if (job.plan.executionKind === 'fast-representative-groups') {
          recordFastAtomicCountersV2(job, result)
          this.#captureFastProgress(job, result)
        } else {
          job.computedSeconds = Math.min(
            job.plan.requestedDurationSeconds,
            job.accountingBaseProcessedSeconds + result.consumedSeconds,
          )
          job.computedRawTicks = job.accountingBaseRawTicks +
            result.summary.automationTicks
          job.latestExactSummary = result.summary
          job.summaryMaterialEvents = job.summaryBase.materialEvents +
            result.materialEvents
          job.summaryZeroTimePasses = job.summaryBase.zeroTimePasses +
            result.zeroTimePasses
          recordExactBoundaryDigestV2(job, result.summary)
        }
      } catch (error) {
        this.#lastDiagnostic = error instanceof Error ? error.message : String(error)
        this.#postFailure(
          job.identity,
          'budget-exceeded',
          false,
          'advance-exception',
        )
        this.#job = null
        return
      }
      if (this.#isComplete(job, result)) {
        await this.#postCompleted(job, result.carrier)
        return
      }
      const pauseReason = this.#pauseReason(job, finished)
      const periodicCheckpoint =
        finished - job.lastCheckpointAtMilliseconds >=
          STORED_TIME_WORKER_CHECKPOINT_INTERVAL_MILLISECONDS_V2
      const fastDreamAnchorCheckpoint =
        job.plan.executionKind === 'fast-representative-groups' &&
        job.acknowledgedDreamResetCount === 0n &&
        job.summaryDreamResetCount > 0n
      const fastDreamNormalizationCheckpoint =
        job.plan.executionKind === 'fast-representative-groups' &&
        job.fastDreamNormalizationCheckpointNeeded
      const dreamReplayCheckpoint =
        job.plan.executionKind !== 'fast-representative-groups' &&
        BigInt(job.summaryBase.dreamResetCount) + result.summary.dreamResetCount -
          job.acknowledgedDreamResetCount >=
            BigInt(
              STORED_TIME_DREAM_REPLAY_LIMIT_V2 -
              STORED_TIME_WORKER_SCHEDULER_EVENT_BUDGET_V2,
            )
      const quantumEpochCheckpoint = result.status === 'yielded' && (
        result.diagnosticCode === 'V2_QUANTUM_EPOCH_PRE_ACTION' ||
        result.diagnosticCode === 'V2_QUANTUM_EPOCH_POST_ACTION' ||
        result.diagnosticCode === 'V2_QUANTUM_EPOCH_PRE_INFINITY' ||
        result.diagnosticCode === 'V2_QUANTUM_EPOCH_POST_INFINITY'
      )
      if (quantumEpochCheckpoint && result.status === 'yielded' && result.continuation !== undefined) {
        if (
          job.plan.executionKind === 'fast-representative-groups' &&
          (result.diagnosticCode === 'V2_QUANTUM_EPOCH_PRE_INFINITY' ||
            result.diagnosticCode === 'V2_QUANTUM_EPOCH_POST_INFINITY')
        ) {
          job.fastDreamNormalizationFailed = true
          this.#postTerminalProgress(job, 'paused', 'fast-normalization-proof-failed')
          this.#job = null
          return
        }
        const seal = this.#boundary.sealLocalContinuation(result.continuation)
        job.exactContinuation = null
        job.fastContinuation = null
        await this.#postAuthorityRequest(job, seal.carrier, seal, authorityPhaseForDiagnostic(result.diagnosticCode))
        return
      }
      if (
        ((pauseReason !== null || periodicCheckpoint || dreamReplayCheckpoint) &&
          job.plan.executionKind !== 'fast-representative-groups') &&
        result.status === 'yielded' &&
        result.continuation !== undefined
      ) {
        const seal = this.#boundary.sealLocalContinuation(result.continuation)
        job.exactContinuation = null
        job.fastContinuation = null
        await this.#postCheckpoint(job, seal.carrier, seal, pauseReason)
        return
      }
      if (
        (pauseReason !== null || periodicCheckpoint || fastDreamAnchorCheckpoint ||
          fastDreamNormalizationCheckpoint) &&
        job.plan.executionKind === 'fast-representative-groups' &&
        result.status !== 'yielded'
      ) {
        await this.#postCheckpoint(job, job.carrier, null, pauseReason)
        return
      }
      if (
        materialEventsInChunk >=
          STORED_TIME_WORKER_MATERIAL_EVENT_BUDGET_V2 ||
        finished - started >=
        STORED_TIME_WORKER_CHUNK_WALL_BUDGET_MILLISECONDS_V2
      ) break
    }
    this.#maybePostProgress(job, finished)
    this.#schedule()
  }

  #advanceExact(job: WorkerJobV2): Readonly<CanonicalEventTimeV2AdvanceResult> {
    let result: Readonly<CanonicalEventTimeV2AdvanceResult>
    if (job.resumeSeal !== null) {
      const seal = job.resumeSeal
      job.resumeSeal = null
      const transient = job.resumeSealIsTransient
      job.resumeSealIsTransient = false
      result = transient
        ? resumeCanonicalEventTimeV2FromTransientAuthoritySeal(seal, job.carrier)
        : this.#boundary.resumeFromAcknowledgedSeal(seal, job.carrier)
    } else if (job.exactContinuation !== null) {
      const continuation = job.exactContinuation
      job.exactContinuation = null
      result = resumeCanonicalEventTimeV2(continuation)
    } else {
      result = advanceCanonicalEventTimeV2(Object.freeze({
        carrier: job.carrier,
        durationSeconds: job.workDurationSeconds,
        materialEventBudget: STORED_TIME_WORKER_SCHEDULER_EVENT_BUDGET_V2,
        mode: 'stored-time',
        context: contextV2(
          job.identity.automationIntervalSeconds,
          job.infinityRewardAuthority,
          null,
          job.quantumEpochAuthority,
        ),
        queuedInputs: job.queuedInputs,
        cancelRequested: null,
      }))
    }
    if (result.status === 'yielded' && result.continuation !== undefined) {
      job.exactContinuation = result.continuation
    } else if (
      result.status === 'completed' ||
      result.status === 'stored-time-exhausted'
    ) {
      job.carrier = result.carrier
    }
    return result
  }

  #advanceFast(job: WorkerJobV2): Readonly<CanonicalEventTimeV2AdvanceResult> {
    if (
      job.fastCountersNeedReset &&
      job.resumeSeal === null &&
      job.fastContinuation === null
    ) {
      job.fastCurrentMaterialEventsSeen = 0
      job.fastCurrentZeroTimePassesSeen = 0
      job.fastCountersNeedReset = false
    }
    let result: Readonly<CanonicalEventTimeV2AdvanceResult>
    if (job.resumeSeal !== null) {
      const seal = job.resumeSeal
      job.resumeSeal = null
      const transient = job.resumeSealIsTransient
      job.resumeSealIsTransient = false
      result = transient
        ? resumeCanonicalEventTimeV2FromTransientAuthoritySeal(seal, job.carrier)
        : this.#boundary.resumeFromAcknowledgedSeal(seal, job.carrier)
    } else if (job.fastContinuation !== null) {
      const continuation = job.fastContinuation
      job.fastContinuation = null
      result = resumeCanonicalEventTimeV2(continuation)
    } else if (job.fastGroupIndex < job.plan.groups.length) {
      const group = job.plan.groups[job.fastGroupIndex]
      const duration = remainingFastDurationToV2(job, group.endsAt)
      const nextInterval = nextFastAutomationIntervalV2(
        job.plan,
        job.fastGroupIndex,
        job.identity.automationIntervalSeconds,
      )
      result = advancePreparedFastRepresentativeGroupV2(Object.freeze({
        carrier: job.carrier,
        durationSeconds: duration,
        materialEventBudget: fastSchedulerEventBudgetV2(job),
        mode: 'stored-time',
        context: contextV2(
          job.plan.initialDueBoundary && job.fastGroupIndex === 0
            ? duration
            : nextInterval,
          job.infinityRewardAuthority,
          job.timerAggregationAuthority,
          job.quantumEpochAuthority,
        ),
        queuedInputs: currentFastQueuedInputsV2(job),
        cancelRequested: null,
      }))
    } else {
      const remainder = remainingFastDurationToV2(
        job,
        job.plan.requestedDuration,
      )
      if (remainder === 0) {
        return completedNoopResultV2(job.carrier, job)
      }
      result = advancePreparedFastRepresentativeGroupV2(Object.freeze({
        carrier: job.carrier,
        durationSeconds: remainder,
        materialEventBudget: fastSchedulerEventBudgetV2(job),
        mode: 'stored-time',
        context: contextV2(
          job.identity.automationIntervalSeconds,
          job.infinityRewardAuthority,
          job.timerAggregationAuthority,
          job.quantumEpochAuthority,
        ),
        queuedInputs: currentFastQueuedInputsV2(job),
        cancelRequested: null,
      }))
    }
    if (result.status === 'yielded' && result.continuation !== undefined) {
      job.fastContinuation = result.continuation
      return result
    }
    if (
      result.status !== 'completed' &&
      result.status !== 'stored-time-exhausted'
    ) return result
    job.carrier = normalizeInternalRevisionV2(
      result.carrier,
      job.identity.acknowledgedBaseRevision,
    )
    if (job.fastGroupIndex < job.plan.groups.length) {
      const group = job.plan.groups[job.fastGroupIndex]
      job.fastCompletedRawTicks += group.logicalRawTicks
      if (job.plan.initialDueBoundary && job.fastGroupIndex === 0) {
        job.fastCompletedRawTicks += 1n
      }
      job.computedRawTicks = job.fastCompletedRawTicks
      job.representativeGroups += 1
      recordFastSummaryV2(job, result)
      job.fastGroupIndex += 1
      job.fastCountersNeedReset = true
      const next = job.plan.groups[job.fastGroupIndex]
      const expectedHorizon = next === undefined
        ? schedulerSecondsV2(job.plan.finalRawAutomationTimeUntilNextEvent)
        : schedulerSpanV2(next.startsAt, next.endsAt)
      job.carrier = retimeFastCarrierV2(
        job.carrier,
        expectedHorizon,
        fastPlannedTargetIndexV2(job),
      )
      job.computedSeconds = fastCompletedSecondsV2(job)
      try {
        normalizeStableFastDreamCyclesV2(job, group, result)
      } catch (error) {
        throw new Error(`Fast Dream normalization failed: ${
          error instanceof Error ? error.message : String(error)
        }`)
      }
    } else {
      job.computedSeconds = job.identity.requestedDurationSeconds
      recordFastSummaryV2(job, result)
    }
    return result
  }

  #captureFastProgress(
    job: WorkerJobV2,
    result: Readonly<CanonicalEventTimeV2AdvanceResult>,
  ): void {
    if (result.status !== 'yielded') return
    const group = job.plan.groups[job.fastGroupIndex]
    const groupStart = schedulerSecondsV2(group.startsAt)
    job.computedSeconds = Math.min(
      job.identity.requestedDurationSeconds,
      groupStart + result.consumedSeconds,
    )
    const dueTick = job.plan.initialDueBoundary && job.fastGroupIndex === 0 &&
      result.summary.automationTicks > 0n
      ? 1n
      : 0n
    job.computedRawTicks = job.fastCompletedRawTicks + dueTick
  }

  #isComplete(
    job: WorkerJobV2,
    result: Readonly<CanonicalEventTimeV2AdvanceResult>,
  ): boolean {
    if (job.plan.executionKind !== 'fast-representative-groups') {
      return result.status === 'completed' ||
        result.status === 'stored-time-exhausted'
    }
    return job.fastGroupIndex >= job.plan.groups.length &&
      compareGameDecimals(job.plan.finalRemainder, GAME_DECIMAL_ZERO) === 0 ||
      job.fastGroupIndex >= job.plan.groups.length &&
        job.computedSeconds >= job.identity.requestedDurationSeconds
  }

  #pauseReason(
    job: WorkerJobV2,
    now: number,
  ): 'balanced-wall-limit' | 'lifecycle' | 'fast-normalization-proof-failed' | null {
    if (job.lifecyclePauseRequested) return 'lifecycle'
    if (job.fastDreamNormalizationFailed) return 'fast-normalization-proof-failed'
    if (
      job.identity.policyId === 'stored-time-balanced-v1' &&
      now - job.startedAtMilliseconds >=
        STORED_TIME_BALANCED_BUDGET_MILLISECONDS_V2
    ) return 'balanced-wall-limit'
    return null
  }

  async #postCheckpoint(
    job: WorkerJobV2,
    carrier: Readonly<CanonicalEventTimeCarrierV2>,
    seal: Readonly<CanonicalEventTimeV2MaterialBoundarySeal> | null,
    pauseReason: 'balanced-wall-limit' | 'lifecycle' | 'fast-normalization-proof-failed' | null,
  ): Promise<void> {
    const accounting = accountingV2(job, carrier)
    const publication = encodeStoredTimeWorkerPublicationV2(Object.freeze({
      state: carrier.state,
      runtime: carrier.runtime,
    }))
    const schedulerSummary = schedulerSummaryV2(job, carrier)
    const progress = progressV2(job, requireMonotonicNow(this.#host.nowMilliseconds()))
    const proposalHash = await hashStoredTimeWorkerWireValueV2(publication)
    if (this.#job !== job || job.authorityRevoked) return
    if (job.cancelRequested) {
      this.#postTerminalProgress(job, 'cancelled')
      this.#job = null
      return
    }
    const resolvedPauseReason = job.lifecyclePauseRequested
      ? 'lifecycle' as const
      : pauseReason
    job.pendingCheckpoint = Object.freeze({
      authorityPhase: null,
      seal,
      pauseReason: resolvedPauseReason,
      accounting,
      queuedInputs: seal?.remainingQueuedInputs ?? job.queuedInputs,
      completed: false,
      proposalHash,
      dreamResetCount: BigInt(schedulerSummary.dreamResetCount),
    })
    this.#post(Object.freeze({
      ...outboundIdentityV2(job, 1),
      type: 'checkpoint-candidate' as const,
      proposalHash,
      accounting,
      sealedRemainingDurationSeconds: Math.max(
        0,
        job.plan.requestedDurationSeconds - accounting.cumulativeProcessedSeconds,
      ),
      rebasedQueuedInputs: encodeCanonicalQueueV2(
        seal?.remainingQueuedInputs ?? job.queuedInputs,
      ),
      progress,
      schedulerSummary,
      publication,
    }))
  }

  async #postAuthorityRequest(
    job: WorkerJobV2,
    carrier: Readonly<CanonicalEventTimeCarrierV2>,
    seal: Readonly<CanonicalEventTimeV2MaterialBoundarySeal>,
    phase: import('./workerProtocolV2').StoredTimeWorkerAuthorityPhaseV2,
  ): Promise<void> {
    const accounting = accountingV2(job, carrier)
    const publication = encodeStoredTimeWorkerPublicationV2(Object.freeze({
      state: carrier.state,
      runtime: carrier.runtime,
    }))
    const schedulerSummary = schedulerSummaryV2(job, carrier)
    const proposalHash = await hashStoredTimeWorkerWireValueV2(publication)
    if (this.#job !== job || job.authorityRevoked) return
    job.pendingCheckpoint = Object.freeze({
      authorityPhase: phase,
      seal,
      pauseReason: null,
      accounting,
      queuedInputs: seal.remainingQueuedInputs,
      completed: false,
      proposalHash,
      dreamResetCount: BigInt(schedulerSummary.dreamResetCount),
    })
    this.#post(Object.freeze({
      ...outboundIdentityV2(job, 0),
      type: 'authority-request' as const,
      phase,
      proposalHash,
      accounting,
      rebasedQueuedInputs: encodeCanonicalQueueV2(seal.remainingQueuedInputs),
      progress: progressV2(job, requireMonotonicNow(this.#host.nowMilliseconds())),
      schedulerSummary,
      publication,
    }))
  }

  async #postCompleted(
    job: WorkerJobV2,
    carrier: Readonly<CanonicalEventTimeCarrierV2>,
  ): Promise<void> {
    job.carrier = carrier
    job.computedSeconds = job.plan.requestedDurationSeconds
    if (job.plan.executionKind === 'fast-representative-groups') {
      job.computedRawTicks = job.plan.rawAutomationBoundaries
    }
    const accounting = accountingV2(job, carrier)
    const publication = encodeStoredTimeWorkerPublicationV2(Object.freeze({
      state: carrier.state,
      runtime: carrier.runtime,
    }))
    const schedulerSummary = schedulerSummaryV2(job, carrier)
    const proposalHash = await hashStoredTimeWorkerWireValueV2(publication)
    if (this.#job !== job || job.authorityRevoked) return
    if (job.cancelRequested) {
      this.#postTerminalProgress(job, 'cancelled')
      this.#job = null
      return
    }
    const completedQueue=rebaseCanonicalQueueV2(job.queuedInputs,job.computedSeconds-job.queuedInputsBaseProcessedSeconds)
    job.pendingCheckpoint = Object.freeze({
      authorityPhase: null,
      seal: null,
      pauseReason: null,
      accounting,
      queuedInputs:completedQueue,
      completed: true,
      proposalHash,
      dreamResetCount: BigInt(schedulerSummary.dreamResetCount),
    })
    this.#post(Object.freeze({
      ...outboundIdentityV2(job, 1),
      type: 'completed' as const,
      completion: job.plan.automaticExact
        ? 'exact-small' as const
        : job.plan.executionKind === 'fast-representative-groups'
          ? 'fast' as const
          : 'exact' as const,
      proposalHash,
      accounting,
      rebasedQueuedInputs:encodeCanonicalQueueV2(completedQueue),
      progress: progressV2(job, requireMonotonicNow(this.#host.nowMilliseconds())),
      schedulerSummary,
      publication,
    }))
  }

  #acknowledge(message: Readonly<CommittedMessageV2>): void {
    const job = this.#job
    if (
      job === null ||
      job.pendingCheckpoint === null ||
      message.checkpointSequence !== job.identity.checkpointSequence + 1 ||
      message.publishedRevision !== job.identity.acknowledgedBaseRevision + 1 ||
      message.acknowledgedBaseRevision !== message.publishedRevision ||
      message.proposalHashEcho !== job.pendingCheckpoint.proposalHash ||
      !accountingEqualV2(message.accounting, job.pendingCheckpoint.accounting) ||
      message.sealedRemainingDurationSeconds !== Math.max(
        0,
        job.plan.requestedDurationSeconds -
          job.pendingCheckpoint.accounting.cumulativeProcessedSeconds,
      ) ||
      !queuesEqualV2(
        message.rebasedQueuedInputs,
        encodeCanonicalQueueV2(job.pendingCheckpoint.queuedInputs),
      )
    ) return
    try {
      const publication = decodeStoredTimeWorkerPublicationV2(message.publication)
      job.carrier = prepareCanonicalEventTimeCarrierV2(Object.freeze({
        state: publication.state,
        runtime: publication.runtime,
        revision: message.publishedRevision,
      }))
      const pending = job.pendingCheckpoint
      job.identity = Object.freeze({
        ...job.identity,
        acknowledgedBaseRevision: message.publishedRevision,
        checkpointSequence: message.checkpointSequence,
      })
      job.durableSeconds = message.accounting.cumulativeProcessedSeconds
      job.durableRawTicks = BigInt(message.accounting.cumulativeRawAutomationTicks)
      job.durableRepresentativeGroups =
        message.accounting.cumulativeRepresentativeGroups
      job.queuedInputs = captureCanonicalQueueV2(message.rebasedQueuedInputs)
      job.queuedInputsBaseProcessedSeconds = message.accounting.cumulativeProcessedSeconds
      job.lastCheckpointAtMilliseconds = requireMonotonicNow(
        this.#host.nowMilliseconds(),
      )
      job.pendingCheckpoint = null
      job.acknowledgedDreamResetCount = pending.dreamResetCount
      job.fastDreamNormalizationCheckpointNeeded = false
      if (pending.completed) {
        this.#job = null
        return
      }
      if (job.cancelAfterAcknowledgement) {
        this.#postTerminalProgress(job, 'cancelled')
        this.#job = null
        return
      }
      const acknowledgedPauseReason = job.lifecyclePauseRequested
        ? 'lifecycle' as const
        : pending.pauseReason
      if (acknowledgedPauseReason !== null) {
        this.#postTerminalProgress(job, 'paused', acknowledgedPauseReason)
        this.#job = null
        return
      }
      if (pending.seal !== null) job.resumeSeal = pending.seal
      job.resumeSealIsTransient = false
      if (
        pending.seal === null &&
        job.plan.executionKind === 'fast-representative-groups'
      ) {
        const next = job.plan.groups[job.fastGroupIndex]
        job.carrier = retimeFastCarrierV2(
          job.carrier,
          next === undefined
            ? schedulerSecondsV2(job.plan.finalRawAutomationTimeUntilNextEvent)
            : schedulerSpanV2(next.startsAt, next.endsAt),
          fastPlannedTargetIndexV2(job),
        )
      }
      this.#schedule()
    } catch {
      this.#postFailure(
        job.identity,
        'invalid-message',
        false,
        'acknowledgement-invalid',
      )
      this.#job = null
    }
  }

  #acknowledgeAuthority(message: Readonly<AuthorityGrantedMessageV2>): void {
    const job = this.#job
    const pending = job?.pendingCheckpoint
    if (
      job === null || pending === null || pending === undefined || pending.authorityPhase === null ||
      message.phase !== pending.authorityPhase ||
      message.proposalHashEcho !== pending.proposalHash ||
      message.acknowledgedBaseRevision !== job.identity.acknowledgedBaseRevision ||
      message.checkpointSequence !== job.identity.checkpointSequence
    ) return
    if (pending.seal !== null) {
      job.carrier = prepareCanonicalEventTimeCarrierV2(Object.freeze({
        state: pending.seal.carrier.state,
        runtime: pending.seal.carrier.runtime,
        revision: job.identity.acknowledgedBaseRevision,
      }))
    }
    job.pendingCheckpoint = null
    job.resumeSeal = pending.seal
    job.resumeSealIsTransient = true
    if (job.cancelAfterAcknowledgement || job.cancelRequested) {
      this.#postTerminalProgress(job, 'cancelled')
      this.#job = null
      return
    }
    if (job.lifecyclePauseRequested) {
      this.#postTerminalProgress(job, 'paused', 'lifecycle')
      this.#job = null
      return
    }
    this.#schedule()
  }

  #maybePostProgress(job: WorkerJobV2, now: number): void {
    if (
      now - job.lastProgressAtMilliseconds <
      STORED_TIME_WORKER_PROGRESS_INTERVAL_MILLISECONDS_V2
    ) return
    job.lastProgressAtMilliseconds = now
    this.#post(Object.freeze({
      ...outboundIdentityV2(job, 0),
      type: 'progress' as const,
      progress: progressV2(job, now),
    }))
  }

  #postTerminalProgress(
    job: WorkerJobV2,
    type: 'cancelled' | 'paused',
    reason?: 'balanced-wall-limit' | 'lifecycle' | 'fast-normalization-proof-failed',
  ): void {
    this.#post(Object.freeze({
      ...outboundIdentityV2(job, 0),
      type,
      ...(reason === undefined ? {} : { reason }),
      progress: durableProgressV2(
        job,
        requireMonotonicNow(this.#host.nowMilliseconds()),
      ),
    }) as Readonly<StoredTimeWorkerMessageV2>)
  }

  #postFailure(
    identity: Readonly<WorkerJobIdentityV2>,
    code: 'invalid-message' | 'budget-exceeded' | 'blocked-unported-event',
    retryable: boolean,
    diagnosticCode: StoredTimeWorkerFailureDiagnosticCodeV2,
    progressOverride?: Readonly<StoredTimeWorkerProgressDtoV2>,
  ): void {
    const activeJob = this.#job
    const progress = progressOverride ??
      (activeJob !== null && activeJob.identity === identity
        ? durableProgressV2(
          activeJob,
          requireMonotonicNow(this.#host.nowMilliseconds()),
        )
        : ZERO_PROGRESS_V2)
    this.#post(Object.freeze({
      type: 'failed' as const,
      protocolVersion: identity.protocolVersion,
      workerInstanceNonce: identity.workerInstanceNonce,
      jobId: identity.jobId,
      originRevision: identity.originRevision,
      acknowledgedBaseRevision: identity.acknowledgedBaseRevision,
      policyId: identity.policyId,
      policyVersion: identity.policyVersion,
      checkpointSequence: identity.checkpointSequence,
      code,
      retryable,
      diagnosticCode,
      progress,
    }))
  }

  #post(message: unknown): void {
    this.#host.postMessage(captureStoredTimeWorkerMessageV2(message))
  }
}

function fastSchedulerEventBudgetV2(job: Readonly<WorkerJobV2>): number {
  const stage = job.carrier.state.dream.disasterStage
  return stage >= 1n && stage <= 3n
    ? 1
    : STORED_TIME_WORKER_SCHEDULER_EVENT_BUDGET_V2
}

function normalizeStableFastDreamCyclesV2(
  job:WorkerJobV2,
  completedGroup:Readonly<StoredTimePolicyPlanV2['groups'][number]>,
  result:Readonly<CanonicalEventTimeV2AdvanceResult>,
):void{
  void completedGroup
  if(result.summary.dreamResetCount===0n)return
  if(result.summary.dreamResetCount!==1n||result.summary.dreamBlackHoleResetCount!==0n){job.fastDreamCycleAnchor=null;return}
  const anchor=job.fastDreamCycleAnchor
  if(anchor!==null&&(job.plan.hardEventSplits.length!==0||job.timerAggregationAuthority===null)){
    const cycleGroupCount=job.fastGroupIndex-anchor.startsAtGroupIndex
    if(cycleGroupCount>0&&job.fastGroupIndex+cycleGroupCount<=job.plan.groups.length)job.fastDreamNormalizationFailed=true
    job.fastDreamCycleAnchor=job.fastGroupIndex>=job.plan.groups.length?null:Object.freeze({carrier:job.carrier,startsAtGroupIndex:job.fastGroupIndex})
    return
  }
  if(anchor!==null&&job.plan.hardEventSplits.length===0&&job.timerAggregationAuthority!==null){
    const cycleGroupCount=job.fastGroupIndex-anchor.startsAtGroupIndex
    if(cycleGroupCount>0){const cycleSegmentSeconds:number[]=[];for(let offset=0;offset<cycleGroupCount;offset+=1)cycleSegmentSeconds.push(schedulerSpanV2(job.plan.groups[anchor.startsAtGroupIndex+offset]!.startsAt,job.plan.groups[anchor.startsAtGroupIndex+offset]!.endsAt));let additionalCycles=0,cursor=job.fastGroupIndex
      while(cursor+cycleGroupCount<=job.plan.groups.length){let matches=true;for(let offset=0;offset<cycleGroupCount;offset+=1){const pattern=job.plan.groups[anchor.startsAtGroupIndex+offset]!,candidate=job.plan.groups[cursor+offset]!;if(pattern.logicalRawTicks!==candidate.logicalRawTicks||compareGameDecimals(pattern.continuousDuration,candidate.continuousDuration)!==0){matches=false;break}}if(!matches)break;additionalCycles+=1;cursor+=cycleGroupCount}
      const cycleSeconds=cycleSegmentSeconds.reduce((total,seconds)=>total+seconds,0),storedAvailable=job.carrier.state.timeline.storedTimeAvailableSeconds,storedReserve=Number.EPSILON*Math.max(1,storedAvailable)*16,storedCycles=Math.max(0,Math.floor((storedAvailable-storedReserve)/cycleSeconds)),double=job.carrier.state.timeline.doubleTime,doubleCycles=double.unlocked&&double.rate>0&&double.bankSeconds>0?Math.max(0,Math.floor((double.bankSeconds-Number.EPSILON*Math.max(1,double.bankSeconds)*16)/(double.rate*cycleSeconds))):additionalCycles
      const headroom=job.carrier.state.dream.resetCount>=DISCRETE_MAXIMUM?0n:DISCRETE_MAXIMUM-job.carrier.state.dream.resetCount,bounded=Math.min(Number(headroom<BigInt(additionalCycles)?headroom:BigInt(additionalCycles)),storedCycles,doubleCycles)
      if(bounded>0){const normalized=normalizePreparedFastDreamCyclesV2(Object.freeze({previousPostResetCarrier:anchor.carrier,currentPostResetCarrier:job.carrier,additionalCycles:BigInt(bounded),cycleSegmentSeconds:Object.freeze(cycleSegmentSeconds),automationExecutionsPerCycle:cycleGroupCount,timerAggregationAuthority:job.timerAggregationAuthority}));if(normalized!==null){let rawTicksPerCycle=0n;for(let offset=0;offset<cycleGroupCount;offset+=1)rawTicksPerCycle+=job.plan.groups[anchor.startsAtGroupIndex+offset]!.logicalRawTicks;job.carrier=normalized.carrier;job.fastCompletedRawTicks+=rawTicksPerCycle*BigInt(bounded);job.computedRawTicks=job.fastCompletedRawTicks;job.representativeGroups+=bounded*cycleGroupCount;job.fastGroupIndex+=bounded*cycleGroupCount;job.computedSeconds=fastCompletedSecondsV2(job);recordNormalizedFastDreamSummaryV2(job,normalized);const next=job.plan.groups[job.fastGroupIndex],expectedHorizon=next===undefined?schedulerSecondsV2(job.plan.finalRawAutomationTimeUntilNextEvent):schedulerSpanV2(next.startsAt,next.endsAt);job.carrier=retimeFastCarrierV2(job.carrier,expectedHorizon,fastPlannedTargetIndexV2(job))}else job.fastDreamNormalizationFailed=true}
    }
  }
  job.fastDreamCycleAnchor=job.fastGroupIndex>=job.plan.groups.length?null:Object.freeze({carrier:job.carrier,startsAtGroupIndex:job.fastGroupIndex})
}

function recordNormalizedFastDreamSummaryV2(job:WorkerJobV2,normalized:NonNullable<ReturnType<typeof normalizePreparedFastDreamCyclesV2>>):void{
  job.fastDreamNormalizationCheckpointNeeded=true
  job.summaryMaterialEvents+=1
  if(!Number.isSafeInteger(job.summaryMaterialEvents))throw new RangeError('Stored Time scheduler material-event accounting overflowed.')
  job.summaryBoundaryDigest=combineBoundaryDigestV2(job.summaryBoundaryDigest,`fast-dream-normalized:${normalized.cycles.toString()}`)
  job.summaryDreamResetCount+=normalized.cycles
  job.summaryDreamFastNormalizedResetCount+=normalized.cycles
  job.summaryDreamFastNormalizationFirstCycleElapsedSeconds=normalized.firstCycleElapsedSeconds
  job.summaryDreamFastNormalizationCycleSeconds=normalized.cycleSeconds
  if(normalized.cause==='Meteor')job.summaryDreamMeteorResetCount+=normalized.cycles
  else if(normalized.cause==='ArtificialIntelligence')job.summaryDreamAiResetCount+=normalized.cycles
  else job.summaryDreamGlobalWarmingResetCount+=normalized.cycles
  job.summaryDreamStrangeMatterRequested=addGameDecimals(job.summaryDreamStrangeMatterRequested,normalized.requestedReward)
  job.summaryDreamStrangeMatterEffective=addGameDecimals(job.summaryDreamStrangeMatterEffective,normalized.effectiveReward)
  job.summaryDreamStrangeMatterFinal=normalized.carrier.state.dream.strangeMatter
  job.summaryDreamLifetimeStrangeMatterFinal=normalized.carrier.state.statistics.lifetime.strangeMatter
  job.summaryDreamCurrentQuantumRunStrangeMatterFinal=normalized.carrier.state.statistics.currentQuantumRun.strangeMatter
  job.summaryDreamRecentProcessedSegmentStrangeMatterFinal=normalized.carrier.state.statistics.recentProcessedSegment.strangeMatter
}

function compactJobIdentityV2(
  message: Readonly<StartMessageV2>,
): Readonly<WorkerJobIdentityV2> {
  return Object.freeze({
    type: 'start' as const,
    protocolVersion: message.protocolVersion,
    workerInstanceNonce: message.workerInstanceNonce,
    jobId: message.jobId,
    originRevision: message.originRevision,
    acknowledgedBaseRevision: message.acknowledgedBaseRevision,
    policyId: message.policyId,
    policyVersion: message.policyVersion,
    checkpointSequence: message.checkpointSequence,
    buildId: message.buildId,
    admittedBankSeconds: message.admittedBankSeconds,
    requestedDurationSeconds: message.requestedDurationSeconds,
    requestedRawAutomationTicks: message.requestedRawAutomationTicks,
    automationIntervalSeconds: message.automationIntervalSeconds,
    permanentDoubleIp: message.permanentDoubleIp,
    materialEventBudget: message.materialEventBudget,
    catalogHash: message.catalogHash,
    tuningHash: message.tuningHash,
  })
}

function contextV2(
  automationIntervalSeconds: number,
  infinityRewardAuthority: Readonly<InfinityRewardAuthorityV2>,
  timerAggregationAuthority:
    Readonly<CanonicalTimerAggregationAuthorityV2> | null,
  quantumEpochAuthority: Readonly<CanonicalQuantumEpochAuthorityV2>,
) {
  return Object.freeze({
    automationIntervalSeconds,
    timerAggregationAuthority,
    quantumEpochAuthority,
    dormantDueEvents: NO_DORMANT_EVENTS,
    catalogLookup: null,
    infinityRewardAuthority,
  })
}

function retimeCarrierV2(
  carrier: Readonly<CanonicalEventTimeCarrierV2>,
  automationTimeUntilNextEvent: number,
): Readonly<CanonicalEventTimeCarrierV2> {
  return retimePreparedCanonicalEventTimeCarrierV2(
    carrier,
    automationTimeUntilNextEvent,
    carrier.state.timeline.dysonAutomationTargetIndex,
  )
}

function retimeFastCarrierV2(
  carrier: Readonly<CanonicalEventTimeCarrierV2>,
  automationTimeUntilNextEvent: number,
  dysonAutomationTargetIndex: number,
): Readonly<CanonicalEventTimeCarrierV2> {
  return retimePreparedCanonicalEventTimeCarrierV2(
    carrier,
    automationTimeUntilNextEvent,
    dysonAutomationTargetIndex,
  )
}

function fastPlannedTargetIndexV2(job: WorkerJobV2): number {
  const dueNow = job.plan.initialDueBoundary && job.computedRawTicks > 0n
    ? 1
    : 0
  return (job.plan.initialAutomationTargetIndex +
    job.representativeGroups + dueNow) % 8
}

function normalizeInternalRevisionV2(
  carrier: Readonly<CanonicalEventTimeCarrierV2>,
  revision: number,
): Readonly<CanonicalEventTimeCarrierV2> {
  return Object.freeze({
    state: carrier.state,
    runtime: carrier.runtime,
    revision,
  })
}

function schedulerSecondsV2(value: GameDecimal): number {
  return gameDecimalToSchedulerSeconds(value, 42_000_000).seconds
}

function schedulerSpanV2(start: GameDecimal, end: GameDecimal): number {
  if (compareGameDecimals(end, start) <= 0) return 0
  return schedulerSecondsV2(subtractGameDecimals(end, start))
}

function remainingFastDurationToV2(
  job: WorkerJobV2,
  target: GameDecimal,
): number {
  const absoluteTargetSeconds = schedulerSpanV2(job.fastWorkAnchor, target)
  const actuallyConsumedSeconds = job.accountingBaseProcessedSeconds +
    job.originStoredTimeAvailableSeconds -
    job.carrier.state.timeline.storedTimeAvailableSeconds
  const remaining = absoluteTargetSeconds - actuallyConsumedSeconds
  if (remaining > 0) {
    return Math.min(
      remaining,
      job.carrier.state.timeline.storedTimeAvailableSeconds,
    )
  }
  if (remaining === 0) return 0
  if (approximatelyEqualV2(absoluteTargetSeconds, actuallyConsumedSeconds)) {
    return 0
  }
  throw new RangeError('Fast Stored Time absolute duration accounting moved backwards.')
}

function nextFastAutomationIntervalV2(
  plan: Readonly<StoredTimePolicyPlanV2>,
  groupIndex: number,
  authoredIntervalSeconds: number,
): number {
  const next = plan.groups[groupIndex + 1]
  return next === undefined
    ? authoredIntervalSeconds
    : schedulerSpanV2(next.startsAt, next.endsAt)
}

function fastCompletedSecondsV2(job: WorkerJobV2): number {
  const completed = job.plan.groups[job.fastGroupIndex - 1]
  return completed === undefined
    ? 0
    : Math.min(job.identity.requestedDurationSeconds, schedulerSecondsV2(completed.endsAt))
}

function completedNoopResultV2(
  carrier: Readonly<CanonicalEventTimeCarrierV2>,
  job: WorkerJobV2,
): Readonly<CanonicalEventTimeV2AdvanceResult> {
  return Object.freeze({
    carrier,
    status: 'completed' as const,
    consumedSeconds: 0,
    remainingSeconds: 0,
    materialEvents: 0,
    zeroTimePasses: 0,
    summary: Object.freeze({
      generated: Object.freeze({}),
      effective: Object.freeze({}),
      productionChanged: false,
      automationTicks: job.computedRawTicks,
      analyticallySkippedAutomationTicks: 0n,
      goalStagesCompleted: Object.freeze([]),
      automationPolicy: 'force-buy-max' as const,
      advanceActiveOnlyTinker: false,
      baseSimulationSeconds: 0,
      dreamSimulationSeconds: 0,
      storedTimeConsumedSeconds: 0,
      infinityResetCount: 0n,
      lastInfinityResetElapsedSeconds: null,
      boundaryOrder: Object.freeze([
        'production-arrival', 'queued-input', 'automation',
        'derived-timers-and-double-time', 'dream-reset',
        'bot-cap-transition', 'infinity-reset',
      ] as const),
      boundaryPasses: Object.freeze({
        'production-arrival': 0n,
        'queued-input': 0n,
        automation: 0n,
        'derived-timers-and-double-time': 0n,
        'dream-reset': 0n,
        'bot-cap-transition': 0n,
        'infinity-reset': 0n,
      }),
      boundaryDigest: '0000000000000000',
    }),
  }) as unknown as Readonly<CanonicalEventTimeV2AdvanceResult>
}

function recordFastSummaryV2(
  job: WorkerJobV2,
  result: Readonly<CanonicalEventTimeV2AdvanceResult>,
): void {
  job.summaryMaterialEvents += 1
  if (!Number.isSafeInteger(job.summaryMaterialEvents)) {
    throw new RangeError('Stored Time scheduler material-event accounting overflowed.')
  }
  job.summaryBoundaryDigest = combineBoundaryDigestV2(
    job.summaryBoundaryDigest,
    `fast-representative-group:${job.fastGroupIndex}`,
  )
  job.summaryInfinityResetCount += result.summary.infinityResetCount
  if (result.summary.lastInfinityResetElapsedSeconds !== null) {
    job.summaryLastInfinityResetElapsedSeconds =
      job.computedSeconds + result.summary.lastInfinityResetElapsedSeconds
  }
  job.summaryDreamResetCount += result.summary.dreamResetCount
  job.summaryDreamMeteorResetCount += result.summary.dreamMeteorResetCount
  job.summaryDreamAiResetCount += result.summary.dreamAiResetCount
  job.summaryDreamGlobalWarmingResetCount +=
    result.summary.dreamGlobalWarmingResetCount
  job.summaryDreamBlackHoleResetCount += result.summary.dreamBlackHoleResetCount
  job.summaryDreamStrangeMatterRequested = addGameDecimals(
    job.summaryDreamStrangeMatterRequested,
    result.summary.dreamStrangeMatterRequested,
  )
  job.summaryDreamStrangeMatterEffective = addGameDecimals(
    job.summaryDreamStrangeMatterEffective,
    result.summary.dreamStrangeMatterEffective,
  )
  if (result.summary.dreamStrangeMatterFinal !== null) {
    job.summaryDreamStrangeMatterFinal = result.summary.dreamStrangeMatterFinal
  }
  if (result.summary.dreamLifetimeStrangeMatterFinal !== null) {
    job.summaryDreamLifetimeStrangeMatterFinal =
      result.summary.dreamLifetimeStrangeMatterFinal
  }
  if (result.summary.dreamCurrentQuantumRunStrangeMatterFinal !== null) {
    job.summaryDreamCurrentQuantumRunStrangeMatterFinal =
      result.summary.dreamCurrentQuantumRunStrangeMatterFinal
  }
  if (result.summary.dreamRecentProcessedSegmentStrangeMatterFinal !== null) {
    job.summaryDreamRecentProcessedSegmentStrangeMatterFinal =
      result.summary.dreamRecentProcessedSegmentStrangeMatterFinal
  }
  job.summaryQuantumResetCount+=result.summary.quantumResetCount
  job.summaryQuantumEntanglementCount+=result.summary.quantumEntanglementCount
  job.summaryQuantumAvailableShardsEffective=addGameDecimals(job.summaryQuantumAvailableShardsEffective,result.summary.quantumAvailableShardsEffective)
  job.summaryQuantumLifetimeShardsEffective=addGameDecimals(job.summaryQuantumLifetimeShardsEffective,result.summary.quantumLifetimeShardsEffective)
  job.summaryQuantumInfinityPointsConsumed=addGameDecimals(job.summaryQuantumInfinityPointsConsumed,result.summary.quantumInfinityPointsConsumed)
  if(result.summary.quantumAvailableShardsFinal!==null)job.summaryQuantumAvailableShardsFinal=result.summary.quantumAvailableShardsFinal
  if(result.summary.quantumLifetimeShardsFinal!==null)job.summaryQuantumLifetimeShardsFinal=result.summary.quantumLifetimeShardsFinal
  if(result.summary.quantumInfinityAvailableFinal!==null)job.summaryQuantumInfinityAvailableFinal=result.summary.quantumInfinityAvailableFinal
  if(result.summary.quantumInfinityAllocatedFinal!==null)job.summaryQuantumInfinityAllocatedFinal=result.summary.quantumInfinityAllocatedFinal
  if(result.summary.quantumResetSkillPointsFinal!==null)job.summaryQuantumResetSkillPointsFinal=result.summary.quantumResetSkillPointsFinal
}

function recordExactBoundaryDigestV2(
  job: WorkerJobV2,
  summary: Readonly<CanonicalEventTimeV2Summary>,
): void {
  for (const phase of summary.boundaryOrder) {
    const current = summary.boundaryPasses[phase]
    const previous = job.exactBoundaryPassesSeen[phase] ?? 0n
    if (current < previous) {
      throw new RangeError('Stored Time exact boundary accounting moved backwards.')
    }
    const delta = current - previous
    if (delta > 0n) {
      job.summaryBoundaryDigest = combineBoundaryDigestV2(
        job.summaryBoundaryDigest,
        `${phase}:${delta.toString()}`,
      )
      job.exactBoundaryPassesSeen[phase] = current
    }
  }
}

function recordFastAtomicCountersV2(
  job: WorkerJobV2,
  result: Readonly<CanonicalEventTimeV2AdvanceResult>,
): void {
  const materialDelta = result.materialEvents - job.fastCurrentMaterialEventsSeen
  if (materialDelta < 0) {
    throw new RangeError('Stored Time material-event accounting moved backwards.')
  }
  job.fastCurrentMaterialEventsSeen = result.materialEvents
  if (result.zeroTimePasses > job.fastCurrentZeroTimePassesSeen) {
    job.summaryZeroTimePasses +=
      result.zeroTimePasses - job.fastCurrentZeroTimePassesSeen
  }
  job.fastCurrentZeroTimePassesSeen = result.zeroTimePasses
  if (!Number.isSafeInteger(job.summaryZeroTimePasses)) {
    throw new RangeError('Stored Time zero-time pass accounting overflowed.')
  }
}

function schedulerSummaryV2(
  job: WorkerJobV2,
  carrier: Readonly<CanonicalEventTimeCarrierV2>,
): Readonly<StoredTimeWorkerSchedulerSummaryDtoV2> {
  if (job.plan.executionKind !== 'fast-representative-groups') {
    const summary = job.latestExactSummary
    if (summary === null) {
      throw new Error('Exact Stored Time summary is unavailable.')
    }
    return Object.freeze({
      automationTicks:
        (job.accountingBaseRawTicks + summary.automationTicks).toString(),
      analyticallySkippedAutomationTicks:
        (BigInt(job.summaryBase.analyticallySkippedAutomationTicks) +
          summary.analyticallySkippedAutomationTicks).toString(),
      storedTimeConsumedSeconds: job.computedSeconds,
      baseSimulationSeconds: job.computedSeconds,
      dreamSimulationSeconds:
        job.computedSeconds + expectedDoubleTimeConsumedV2(job),
      infinityResetCount:
        (BigInt(job.summaryBase.infinityResetCount) +
          summary.infinityResetCount).toString(),
      dreamResetCount:
        (BigInt(job.summaryBase.dreamResetCount) +
          summary.dreamResetCount).toString(),
      dreamFastNormalizedResetCount:
        job.summaryBase.dreamFastNormalizedResetCount,
      dreamFastNormalizationFirstCycleElapsedSeconds:
        job.summaryBase.dreamFastNormalizationFirstCycleElapsedSeconds,
      dreamFastNormalizationCycleSeconds:
        job.summaryBase.dreamFastNormalizationCycleSeconds,
      dreamMeteorResetCount:
        (BigInt(job.summaryBase.dreamMeteorResetCount) +
          summary.dreamMeteorResetCount).toString(),
      dreamAiResetCount:
        (BigInt(job.summaryBase.dreamAiResetCount) +
          summary.dreamAiResetCount).toString(),
      dreamGlobalWarmingResetCount:
        (BigInt(job.summaryBase.dreamGlobalWarmingResetCount) +
          summary.dreamGlobalWarmingResetCount).toString(),
      dreamBlackHoleResetCount:
        (BigInt(job.summaryBase.dreamBlackHoleResetCount) +
          summary.dreamBlackHoleResetCount).toString(),
      dreamStrangeMatterRequested: gameDecimalToCanonicalString(
        addGameDecimals(
          gameDecimalFromCanonicalString(job.summaryBase.dreamStrangeMatterRequested),
          summary.dreamStrangeMatterRequested,
        ),
      ),
      dreamStrangeMatterEffective: gameDecimalToCanonicalString(
        addGameDecimals(
          gameDecimalFromCanonicalString(job.summaryBase.dreamStrangeMatterEffective),
          summary.dreamStrangeMatterEffective,
        ),
      ),
      dreamStrangeMatterFinal:
        summary.dreamStrangeMatterFinal === null
          ? job.summaryBase.dreamStrangeMatterFinal
          : gameDecimalToCanonicalString(summary.dreamStrangeMatterFinal),
      dreamLifetimeStrangeMatterFinal:
        summary.dreamLifetimeStrangeMatterFinal === null
          ? job.summaryBase.dreamLifetimeStrangeMatterFinal
          : gameDecimalToCanonicalString(summary.dreamLifetimeStrangeMatterFinal),
      dreamCurrentQuantumRunStrangeMatterFinal:
        summary.dreamCurrentQuantumRunStrangeMatterFinal === null
          ? job.summaryBase.dreamCurrentQuantumRunStrangeMatterFinal
          : gameDecimalToCanonicalString(summary.dreamCurrentQuantumRunStrangeMatterFinal),
      dreamRecentProcessedSegmentStrangeMatterFinal:
        summary.dreamRecentProcessedSegmentStrangeMatterFinal === null
          ? job.summaryBase.dreamRecentProcessedSegmentStrangeMatterFinal
          : gameDecimalToCanonicalString(summary.dreamRecentProcessedSegmentStrangeMatterFinal),
      quantumResetCount:(BigInt(job.summaryBase.quantumResetCount)+summary.quantumResetCount).toString(),
      quantumEntanglementCount:(BigInt(job.summaryBase.quantumEntanglementCount)+summary.quantumEntanglementCount).toString(),
      quantumAvailableShardsEffective:gameDecimalToCanonicalString(addGameDecimals(gameDecimalFromCanonicalString(job.summaryBase.quantumAvailableShardsEffective),summary.quantumAvailableShardsEffective)),
      quantumLifetimeShardsEffective:gameDecimalToCanonicalString(addGameDecimals(gameDecimalFromCanonicalString(job.summaryBase.quantumLifetimeShardsEffective),summary.quantumLifetimeShardsEffective)),
      quantumInfinityPointsConsumed:gameDecimalToCanonicalString(addGameDecimals(gameDecimalFromCanonicalString(job.summaryBase.quantumInfinityPointsConsumed),summary.quantumInfinityPointsConsumed)),
      quantumAvailableShardsFinal:summary.quantumAvailableShardsFinal===null?job.summaryBase.quantumAvailableShardsFinal:gameDecimalToCanonicalString(summary.quantumAvailableShardsFinal),
      quantumLifetimeShardsFinal:summary.quantumLifetimeShardsFinal===null?job.summaryBase.quantumLifetimeShardsFinal:gameDecimalToCanonicalString(summary.quantumLifetimeShardsFinal),
      quantumInfinityAvailableFinal:summary.quantumInfinityAvailableFinal===null?job.summaryBase.quantumInfinityAvailableFinal:gameDecimalToCanonicalString(summary.quantumInfinityAvailableFinal),
      quantumInfinityAllocatedFinal:summary.quantumInfinityAllocatedFinal===null?job.summaryBase.quantumInfinityAllocatedFinal:gameDecimalToCanonicalString(summary.quantumInfinityAllocatedFinal),
      quantumResetSkillPointsFinal:summary.quantumResetSkillPointsFinal===null?job.summaryBase.quantumResetSkillPointsFinal:summary.quantumResetSkillPointsFinal.toString(),
      lastInfinityResetElapsedSeconds:
        schedulerResetAccountingV2(job, carrier).lastElapsed,
      materialEvents: job.summaryMaterialEvents,
      zeroTimePasses: job.summaryZeroTimePasses,
      boundaryDigest: job.summaryBoundaryDigest,
    })
  }
  const actualAutomationExecutions = BigInt(job.representativeGroups) +
    (job.plan.initialDueBoundary && job.computedRawTicks > 0n ? 1n : 0n)
  const skipped = job.computedRawTicks > actualAutomationExecutions
    ? job.computedRawTicks - actualAutomationExecutions
    : 0n
  const doubleTimeConsumedSeconds = Math.max(
    0,
    expectedDoubleTimeConsumedV2(job),
  )
  return Object.freeze({
    automationTicks: job.computedRawTicks.toString(),
    analyticallySkippedAutomationTicks: skipped.toString(),
    storedTimeConsumedSeconds: job.computedSeconds,
    baseSimulationSeconds: job.computedSeconds,
    dreamSimulationSeconds: job.computedSeconds + doubleTimeConsumedSeconds,
    infinityResetCount: job.summaryInfinityResetCount.toString(),
    dreamResetCount: job.summaryDreamResetCount.toString(),
    dreamFastNormalizedResetCount:
      job.summaryDreamFastNormalizedResetCount.toString(),
    dreamFastNormalizationFirstCycleElapsedSeconds:
      job.summaryDreamFastNormalizationFirstCycleElapsedSeconds,
    dreamFastNormalizationCycleSeconds:
      job.summaryDreamFastNormalizationCycleSeconds,
    dreamMeteorResetCount: job.summaryDreamMeteorResetCount.toString(),
    dreamAiResetCount: job.summaryDreamAiResetCount.toString(),
    dreamGlobalWarmingResetCount:
      job.summaryDreamGlobalWarmingResetCount.toString(),
    dreamBlackHoleResetCount: job.summaryDreamBlackHoleResetCount.toString(),
    dreamStrangeMatterRequested:
      gameDecimalToCanonicalString(job.summaryDreamStrangeMatterRequested),
    dreamStrangeMatterEffective:
      gameDecimalToCanonicalString(job.summaryDreamStrangeMatterEffective),
    dreamStrangeMatterFinal: job.summaryDreamStrangeMatterFinal === null
      ? null
      : gameDecimalToCanonicalString(job.summaryDreamStrangeMatterFinal),
    dreamLifetimeStrangeMatterFinal:
      job.summaryDreamLifetimeStrangeMatterFinal === null
        ? null
        : gameDecimalToCanonicalString(job.summaryDreamLifetimeStrangeMatterFinal),
    dreamCurrentQuantumRunStrangeMatterFinal:
      job.summaryDreamCurrentQuantumRunStrangeMatterFinal === null
        ? null
        : gameDecimalToCanonicalString(
          job.summaryDreamCurrentQuantumRunStrangeMatterFinal,
        ),
    dreamRecentProcessedSegmentStrangeMatterFinal:
      job.summaryDreamRecentProcessedSegmentStrangeMatterFinal === null
        ? null
        : gameDecimalToCanonicalString(
          job.summaryDreamRecentProcessedSegmentStrangeMatterFinal,
        ),
    quantumResetCount:job.summaryQuantumResetCount.toString(),
    quantumEntanglementCount:job.summaryQuantumEntanglementCount.toString(),
    quantumAvailableShardsEffective:gameDecimalToCanonicalString(job.summaryQuantumAvailableShardsEffective),
    quantumLifetimeShardsEffective:gameDecimalToCanonicalString(job.summaryQuantumLifetimeShardsEffective),
    quantumInfinityPointsConsumed:gameDecimalToCanonicalString(job.summaryQuantumInfinityPointsConsumed),
    quantumAvailableShardsFinal:job.summaryQuantumAvailableShardsFinal===null?null:gameDecimalToCanonicalString(job.summaryQuantumAvailableShardsFinal),
    quantumLifetimeShardsFinal:job.summaryQuantumLifetimeShardsFinal===null?null:gameDecimalToCanonicalString(job.summaryQuantumLifetimeShardsFinal),
    quantumInfinityAvailableFinal:job.summaryQuantumInfinityAvailableFinal===null?null:gameDecimalToCanonicalString(job.summaryQuantumInfinityAvailableFinal),
    quantumInfinityAllocatedFinal:job.summaryQuantumInfinityAllocatedFinal===null?null:gameDecimalToCanonicalString(job.summaryQuantumInfinityAllocatedFinal),
    quantumResetSkillPointsFinal:job.summaryQuantumResetSkillPointsFinal===null?null:job.summaryQuantumResetSkillPointsFinal.toString(),
    lastInfinityResetElapsedSeconds: job.summaryLastInfinityResetElapsedSeconds,
    materialEvents: job.summaryMaterialEvents,
    zeroTimePasses: job.summaryZeroTimePasses,
    boundaryDigest: job.summaryBoundaryDigest,
  })
}

function combineBoundaryDigestV2(left: string, right: string): string {
  let digest = BigInt(`0x${left}`)
  const prime = 1_099_511_628_211n
  const mask = (1n << 64n) - 1n
  for (let index = 0; index < right.length; index += 1) {
    digest ^= BigInt(right.charCodeAt(index))
    digest = digest * prime & mask
  }
  return digest.toString(16).padStart(16, '0')
}

function accountingV2(
  job: WorkerJobV2,
  carrier: Readonly<CanonicalEventTimeCarrierV2>,
): Readonly<StoredTimeWorkerAccountingDtoV2> {
  const timeline = carrier.state.timeline
  const resetAccounting = schedulerResetAccountingV2(job, carrier)
  const quantumResetCount = job.plan.executionKind === 'fast-representative-groups'
    ? job.summaryQuantumResetCount
    : BigInt(job.summaryBase.quantumResetCount) +
      (job.latestExactSummary?.quantumResetCount ?? 0n)
  return Object.freeze({
    cumulativeProcessedSeconds: job.computedSeconds,
    cumulativeDoubleTimeConsumedSeconds: expectedDoubleTimeConsumedV2(job),
    cumulativeInfinityElapsedSeconds:
      job.accountingBaseInfinityElapsedSeconds +
      (job.computedSeconds - job.accountingBaseProcessedSeconds),
    cumulativeInfinityResetCount: resetAccounting.count.toString(),
    lastInfinityResetElapsedSeconds: resetAccounting.lastElapsed,
    sealedInfinityCycleSeconds: resetAccounting.count === 0n
      ? quantumResetCount > 0n
        ? timeline.infinityCycleSeconds
        : job.originInfinityCycleSeconds + job.computedSeconds
      : job.computedSeconds - resetAccounting.lastElapsed!,
    sealedInfinityBoundaryRemaining: resetAccounting.count === 0n
      ? quantumResetCount > 0n
        ? timeline.infinityBoundaryRemaining
        : job.originInfinityBoundaryRemaining - job.computedSeconds
      : timeline.infinityBoundaryRemaining,
    cumulativeRawAutomationTicks: job.computedRawTicks.toString(),
    cumulativeRepresentativeGroups: job.representativeGroups,
    automationTimeUntilNextEvent:
      job.plan.executionKind === 'fast-representative-groups'
        ? job.computedSeconds >= job.identity.requestedDurationSeconds
          ? schedulerSecondsV2(job.plan.finalRawAutomationTimeUntilNextEvent)
          : job.identity.automationIntervalSeconds
        : timeline.automationTimeUntilNextEvent,
  })
}

function schedulerResetAccountingV2(
  job: WorkerJobV2,
  carrier: Readonly<CanonicalEventTimeCarrierV2>,
): Readonly<{
  count: bigint
  lastElapsed: number | null
}> {
  if (job.plan.executionKind === 'fast-representative-groups') {
    return Object.freeze({
      count: job.summaryInfinityResetCount,
      lastElapsed: job.summaryLastInfinityResetElapsedSeconds,
    })
  }
  const summary = job.latestExactSummary
  const count = BigInt(job.summaryBase.infinityResetCount) +
    (summary?.infinityResetCount ?? 0n)
  const baseCount = BigInt(job.summaryBase.infinityResetCount)
  return Object.freeze({
    count,
    lastElapsed: count > baseCount
      ? job.summaryLastInfinityResetElapsedSeconds ??
        schedulerSecondsV2(subtractGameDecimals(
          gameDecimalFromNumber(job.computedSeconds),
          gameDecimalFromNumber(carrier.state.timeline.infinityCycleSeconds),
        ))
      : job.summaryBase.lastInfinityResetElapsedSeconds,
  })
}

function expectedDoubleTimeConsumedV2(job: WorkerJobV2): number {
  const incremental = job.carrier.state.timeline.doubleTime.unlocked
    ? Math.min(
      job.originDoubleTimeBankSeconds,
      (job.computedSeconds - job.accountingBaseProcessedSeconds) *
        job.carrier.state.timeline.doubleTime.rate,
    )
    : 0
  return job.accountingBaseDoubleTimeConsumedSeconds + incremental
}

function progressV2(
  job: WorkerJobV2,
  now: number,
): Readonly<StoredTimeWorkerProgressDtoV2> {
  const elapsed = Math.max(0, now - job.startedAtMilliseconds)
  const computedTicks = Number(
    job.computedRawTicks - job.accountingBaseRawTicks,
  )
  const throughput = elapsed > 0 && Number.isFinite(computedTicks)
    ? computedTicks / (elapsed / 1_000)
    : 0
  const remainingTicks = Number(job.plan.rawAutomationBoundaries - job.computedRawTicks)
  const warmingUp = elapsed < 1_000 || throughput === 0
  const eta = !warmingUp && throughput > 0 && Number.isFinite(remainingTicks)
    ? Math.max(0, remainingTicks / throughput * 1_000)
    : null
  return Object.freeze({
    computedSeconds: job.computedSeconds,
    durableSeconds: job.durableSeconds,
    computedRawTicks: job.computedRawTicks.toString(),
    durableRawTicks: job.durableRawTicks.toString(),
    representativeGroups: job.representativeGroups,
    elapsedWallMilliseconds: elapsed,
    maximumChunkMilliseconds: job.maximumObservedChunkMilliseconds,
    maximumAtomicEventMilliseconds: job.maximumObservedAtomicEventMilliseconds,
    throughputTicksPerSecond: Number.isFinite(throughput) ? throughput : 0,
    etaMilliseconds: eta,
    warmingUp,
  })
}

function durableProgressV2(
  job: WorkerJobV2,
  now: number,
): Readonly<StoredTimeWorkerProgressDtoV2> {
  const progress = progressV2(job, now)
  return Object.freeze({
    ...progress,
    computedSeconds: job.durableSeconds,
    computedRawTicks: job.durableRawTicks.toString(),
    representativeGroups: job.durableRepresentativeGroups,
  })
}

function restartDurableProgressV2(
  identity: Readonly<StartMessageV2>,
): Readonly<StoredTimeWorkerProgressDtoV2> {
  const accounting = identity.restart?.cumulativeAccounting
  if (accounting === undefined) return ZERO_PROGRESS_V2
  return Object.freeze({
    computedSeconds: accounting.cumulativeProcessedSeconds,
    durableSeconds: accounting.cumulativeProcessedSeconds,
    computedRawTicks: accounting.cumulativeRawAutomationTicks,
    durableRawTicks: accounting.cumulativeRawAutomationTicks,
    representativeGroups: accounting.cumulativeRepresentativeGroups,
    elapsedWallMilliseconds: 0,
    maximumChunkMilliseconds: 0,
    maximumAtomicEventMilliseconds: 0,
    throughputTicksPerSecond: 0,
    etaMilliseconds: null,
    warmingUp: true,
  })
}

function outboundIdentityV2(job: WorkerJobV2, sequenceIncrement: 0 | 1) {
  return Object.freeze({
    protocolVersion: 1 as const,
    workerInstanceNonce: job.identity.workerInstanceNonce,
    jobId: job.identity.jobId,
    originRevision: job.identity.originRevision,
    acknowledgedBaseRevision: job.identity.acknowledgedBaseRevision,
    policyId: job.identity.policyId,
    policyVersion: 1 as const,
    checkpointSequence: job.identity.checkpointSequence + sequenceIncrement,
  })
}

function authorityPhaseForDiagnostic(
  diagnostic: string | undefined,
): import('./workerProtocolV2').StoredTimeWorkerAuthorityPhaseV2 {
  if (diagnostic === 'V2_QUANTUM_EPOCH_PRE_INFINITY') return 'pre-infinity'
  if (diagnostic === 'V2_QUANTUM_EPOCH_POST_INFINITY') return 'post-infinity'
  if (diagnostic === 'V2_QUANTUM_EPOCH_PRE_ACTION') return 'pre-quantum'
  if (diagnostic === 'V2_QUANTUM_EPOCH_POST_ACTION') return 'post-quantum'
  throw new TypeError('Stored Time authority request has an unsupported phase.')
}

function messageMatchesJob(
  message: Readonly<StoredTimeWorkerMainMessageV2>,
  identity: Readonly<WorkerJobIdentityV2>,
): boolean {
  const common = message.workerInstanceNonce === identity.workerInstanceNonce &&
    message.jobId === identity.jobId &&
    message.originRevision === identity.originRevision &&
    message.policyId === identity.policyId &&
    message.policyVersion === identity.policyVersion
  if (!common) return false
  return message.type === 'checkpoint-committed'
    ? message.acknowledgedBaseRevision === identity.acknowledgedBaseRevision + 1 &&
      message.checkpointSequence === identity.checkpointSequence + 1
    : message.acknowledgedBaseRevision === identity.acknowledgedBaseRevision &&
      message.checkpointSequence === identity.checkpointSequence
}

function accountingEqualV2(
  left: Readonly<StoredTimeWorkerAccountingDtoV2>,
  right: Readonly<StoredTimeWorkerAccountingDtoV2>,
): boolean {
  return left.cumulativeProcessedSeconds === right.cumulativeProcessedSeconds &&
    left.cumulativeDoubleTimeConsumedSeconds ===
      right.cumulativeDoubleTimeConsumedSeconds &&
    left.cumulativeInfinityElapsedSeconds === right.cumulativeInfinityElapsedSeconds &&
    left.cumulativeInfinityResetCount === right.cumulativeInfinityResetCount &&
    left.lastInfinityResetElapsedSeconds === right.lastInfinityResetElapsedSeconds &&
    schedulerApproximatelyEqualV2(
      left.sealedInfinityCycleSeconds,
      right.sealedInfinityCycleSeconds,
    ) &&
    schedulerApproximatelyEqualV2(
      left.sealedInfinityBoundaryRemaining,
      right.sealedInfinityBoundaryRemaining,
    ) &&
    left.cumulativeRawAutomationTicks === right.cumulativeRawAutomationTicks &&
    left.cumulativeRepresentativeGroups === right.cumulativeRepresentativeGroups &&
    left.automationTimeUntilNextEvent === right.automationTimeUntilNextEvent
}

function captureCanonicalQueueV2(
  queue: readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[],
): readonly Readonly<CanonicalQueuedInputV2>[] {
  return Object.freeze(queue.map((input) => input.commandKind==='dyson-facility-purchase'?Object.freeze({id:input.id,horizonSeconds:input.remainingHorizonSeconds,commandVersion:1 as const,commandKind:input.commandKind,facilityId:input.facilityId,requestedMode:input.requestedMode,roundedBulkBuy:input.roundedBulkBuy}):input.commandKind==='quantum-upgrade-purchase'?Object.freeze({id:input.id,horizonSeconds:input.remainingHorizonSeconds,commandVersion:1 as const,commandKind:input.commandKind,upgradeId:input.upgradeId,requestedMode:input.requestedMode}):Object.freeze({id:input.id,horizonSeconds:input.remainingHorizonSeconds,commandVersion:1 as const,commandKind:'quantum-action' as const})))
}

function encodeCanonicalQueueV2(
  queue: readonly Readonly<CanonicalQueuedInputV2>[],
): readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[] {
  return Object.freeze(queue.map((input) => input.commandKind==='dyson-facility-purchase'?Object.freeze({id:input.id,remainingHorizonSeconds:input.horizonSeconds,commandVersion:1 as const,commandKind:input.commandKind,facilityId:input.facilityId,requestedMode:input.requestedMode,roundedBulkBuy:input.roundedBulkBuy}):input.commandKind==='quantum-upgrade-purchase'?Object.freeze({id:input.id,remainingHorizonSeconds:input.horizonSeconds,commandVersion:1 as const,commandKind:input.commandKind,upgradeId:input.upgradeId,requestedMode:input.requestedMode}):Object.freeze({id:input.id,remainingHorizonSeconds:input.horizonSeconds,commandVersion:1 as const,commandKind:'quantum-action' as const})))
}

function rebaseCanonicalQueueV2(queue:readonly Readonly<CanonicalQueuedInputV2>[],elapsed:number):readonly Readonly<CanonicalQueuedInputV2>[]{return Object.freeze(queue.filter(input=>input.horizonSeconds>elapsed).map(input=>Object.freeze({...input,horizonSeconds:Math.max(0,input.horizonSeconds-elapsed)})))}
function currentFastQueuedInputsV2(job:Readonly<WorkerJobV2>):readonly Readonly<CanonicalQueuedInputV2>[] {const elapsed=Math.max(0,job.computedSeconds-job.queuedInputsBaseProcessedSeconds);return Object.freeze(job.queuedInputs.filter(input=>elapsed===0?input.horizonSeconds>=0:input.horizonSeconds>elapsed).map(input=>Object.freeze({...input,horizonSeconds:Math.max(0,input.horizonSeconds-elapsed)})))}

function queuesEqualV2(
  left: readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[],
  right: readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[],
): boolean {
  return left.length === right.length && left.every((input, index) => {
    const expected = right[index]
    return expected !== undefined&&input.id===expected.id&&input.remainingHorizonSeconds===expected.remainingHorizonSeconds&&input.commandVersion===expected.commandVersion&&input.commandKind===expected.commandKind&&
      (input.commandKind==='quantum-action'||expected.commandKind!=='quantum-action'&&(
        input.commandKind==='dyson-facility-purchase'&&expected.commandKind==='dyson-facility-purchase'?input.facilityId===expected.facilityId&&input.requestedMode===expected.requestedMode&&input.roundedBulkBuy===expected.roundedBulkBuy:
        input.commandKind==='quantum-upgrade-purchase'&&expected.commandKind==='quantum-upgrade-purchase'&&input.upgradeId===expected.upgradeId&&input.requestedMode===expected.requestedMode))
  })
}

function requireMonotonicNow(value: number): number {
  if (!Number.isFinite(value) || value < 0 || Object.is(value, -0)) {
    throw new RangeError('Stored Time worker monotonic clock is invalid.')
  }
  return value
}

function approximatelyEqualV2(left: number, right: number): boolean {
  return Math.abs(left - right) <= Number.EPSILON *
    Math.max(1, Math.abs(left), Math.abs(right)) * 4
}

function schedulerApproximatelyEqualV2(left: number, right: number): boolean {
  return Math.abs(left - right) <= Math.max(
    GAME_DECIMAL_MINIMUM_SCHEDULER_SECONDS,
    Number.EPSILON * Math.max(1, Math.abs(left), Math.abs(right)) *
      STORED_TIME_WORKER_SCHEDULER_EVENT_BUDGET_V2 * 2,
  )
}

function isRepresentationalSchedulerTailV2(
  remainingSeconds: number,
  consumedSeconds: number,
): boolean {
  return remainingSeconds <= Math.max(
    GAME_DECIMAL_MINIMUM_SCHEDULER_SECONDS,
    Number.EPSILON * Math.max(1, Math.abs(consumedSeconds)) *
      STORED_TIME_WORKER_SCHEDULER_EVENT_BUDGET_V2 * 2,
  )
}
