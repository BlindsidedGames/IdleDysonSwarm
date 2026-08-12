import {
  CANONICAL_DYSON_EVALUATION_SNAPSHOT_V2_KEYS,
  cloneCanonicalRuntimeSidecarV2,
  type CanonicalDysonEvaluationSnapshotV2,
  type CanonicalRuntimeSidecarV2,
} from '../game-state/runtimeV2'
import { getGameAsset } from '../game-data/catalog'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import { validateCanonicalGameStateV2 } from '../game-state/validateV2'
import {
  GAME_DECIMAL_ONE,
  GAME_DECIMAL_ZERO,
  addGameDecimals,
  compareGameDecimals,
  divideGameDecimals,
  equalGameDecimals,
  gameDecimalFromNumber,
  gameDecimalToSchedulerSeconds,
  isGameDecimal,
  multiplyGameDecimals,
  subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'
import {
  V2_EVENT_BOUNDARY_ORDER,
  resolveV2EventSlice,
} from './eventTimeV2'
import { DEFAULT_AUTOMATION_INTERVAL_SECONDS } from './eventTime'
import {
  deriveDysonV2FromCauses,
  inheritPreparedDysonV2SkillPlanForFastV2,
  registerPreparedDysonV2SkillPlanInheritanceAuthorityForEventV2,
  type DysonV2CatalogLookup,
} from './dysonV2Derivation'

const preparedSkillPlanInheritanceAuthority =
  registerPreparedDysonV2SkillPlanInheritanceAuthorityForEventV2()
import {
  applyCapturedDysonV2ProductionKernel,
  type DysonV2ProductionRates,
  type DysonV2ProductionSummary,
} from './dysonV2Production'
import {
  DYSON_V2_COMMAND_TARGETS,
  commitV2DysonFacilityPurchase,
  quoteV2DysonFacilityPurchase,
  runV2DysonAutomationTick,
  type DysonV2CommandFacilityId,
  type DysonV2AutomationPolicy,
} from './dysonV2Commands'
import {
  CAPPED_RESEARCH_V2_IDS,
  RESEARCH_V2_IDS,
  runV2ResearchAutomationTick,
} from './researchV2'
import {
  captureInfinityRewardAuthorityV2ForSimulation,
  infinityProductionHorizonV2,
  quoteInfinityResetBoundaryV2,
  type InfinityRewardAuthorityV2,
} from './infinityEconomyV2'
import {
  commitCanonicalInfinityResetV2,
  infinityBoundaryCountdownSecondsV2,
  quotePreparedCanonicalInfinityResetV2,
  registerCanonicalPreparedInfinityResetAuthorityV2ForEventModel,
} from './canonicalInfinityResetV2'
import { advancePreparedRealityWorkersV2 } from './realityV2'
import { recordRealityStatisticsSegmentV2 } from './realityStatisticsV2'
import { advanceDreamEducationV2,advanceDreamFoundationalV2,advanceDreamRailgunV2,advanceDreamSpaceAgeV2,prepareCanonicalDreamKernelStateV2,registerCanonicalDreamKernelAuthorityV2ForEventModel,runDreamConversionsV2,type DreamV2AmountSummary } from './dreamV2'
import { commitPreparedCanonicalDreamResetV2,normalizePreparedCanonicalFastDreamResetsV2,quotePreparedCanonicalAutomaticDreamResetV2,registerCanonicalFastDreamNormalizationAuthorityV2ForWorker,registerCanonicalPreparedDreamResetAuthorityV2ForEventModel } from './canonicalDreamResetV2'
import { CANONICAL_ACTIVE_SKILL_TIMER_IDS_V2 } from './skillCatalogV2'
import { advanceCanonicalSkillTimersV2 } from './skillTransactionsV2'
import type { V2PurchaseMode } from './transactionsV2'
import { commitQuantumUpgradeV2,quoteQuantumUpgradeV2 } from './quantumV2'
import { QUANTUM_V2_UPGRADE_IDS,type QuantumUpgradeIdV2 } from './quantumCatalogV2'
import { commitCanonicalQuantumResetV2,quoteCanonicalQuantumResetV2 } from './canonicalQuantumResetV2'
import {
  advanceV2TimeResourceSlice,
  validateV2TimelineResources,
  type V2TimeSliceMode,
} from './timeResourcesV2'
import { DISCRETE_MAXIMUM } from './numeric'

const fastDreamNormalizationAuthority =
  registerCanonicalFastDreamNormalizationAuthorityV2ForWorker()
const preparedDreamResetAuthority =
  registerCanonicalPreparedDreamResetAuthorityV2ForEventModel()
const dreamKernelAuthority = registerCanonicalDreamKernelAuthorityV2ForEventModel()
const preparedInfinityInitializationAuthority =
  registerCanonicalPreparedInfinityResetAuthorityV2ForEventModel()

const MAXIMUM_ZERO_TIME_PASSES = 32
const MAXIMUM_MATERIAL_EVENTS_PER_ADVANCE = 128
const MAXIMUM_QUEUED_INPUTS = 64
const DIAGNOSTIC_DIGEST_OFFSET_V2 = 14_695_981_039_346_656_037n
const DIAGNOSTIC_DIGEST_PRIME_V2 = 1_099_511_628_211n
const DIAGNOSTIC_DIGEST_MASK_V2 = (1n << 64n) - 1n
const PURCHASE_MODES = new Set<V2PurchaseMode>([
  'buy-1',
  'buy-10',
  'buy-50',
  'buy-100',
  'buy-max',
])
const validatedCanonicalStates = new WeakSet<object>()
const validatedRuntimeSidecars = new WeakSet<object>()
function leastCommonMultiple(left: number, right: number): number {
  let a = left
  let b = right
  while (b !== 0) [a, b] = [b, a % b]
  return (left / a) * right
}

const PRODUCTION_RATE_KEYS = Object.freeze([
  'money',
  'science',
  'panels',
  'bots',
  'assembly_lines',
  'ai_managers',
  'servers',
  'data_centers',
  'planets',
  'matrioshka_brains',
  'birch_planets',
] as const satisfies readonly (keyof DysonV2ProductionRates)[])

export interface CanonicalEventTimeCarrierV2 {
  readonly state: Readonly<CanonicalGameStateV2>
  readonly runtime: Readonly<CanonicalRuntimeSidecarV2>
  readonly revision: number
}

export interface CanonicalV2DormantDueEvents {
  readonly reality: boolean
  readonly dreamReset: boolean
  readonly botCapTransition: boolean
  readonly infinityReset: boolean
}

export const CANONICAL_V2_NO_DORMANT_DUE_EVENTS = Object.freeze({
  reality: false,
  dreamReset: false,
  botCapTransition: false,
  infinityReset: false,
} satisfies CanonicalV2DormantDueEvents)

export interface CanonicalTimerAggregationAuthorityV2 {
  readonly policy: 'stored-time-fast-v1'
}

const issuedTimerAggregationAuthorities = new WeakSet<object>()
const issuedQuantumEpochAuthorities = new WeakMap<object,
  'armed' | 'awaiting-action' | 'preparing-infinity' | 'awaiting-infinity'>()

export interface CanonicalQuantumEpochAuthorityV2 {
  readonly policy: 'stored-time-quantum-epochs-v1'
}

export function registerCanonicalQuantumEpochAuthorityV2ForWorker():
Readonly<CanonicalQuantumEpochAuthorityV2> {
  const authority = Object.freeze({ policy: 'stored-time-quantum-epochs-v1' as const })
  issuedQuantumEpochAuthorities.set(authority, 'armed')
  return authority
}

export function registerCanonicalTimerAggregationAuthorityV2ForWorker():
Readonly<CanonicalTimerAggregationAuthorityV2> {
  const authority = Object.freeze({ policy: 'stored-time-fast-v1' as const })
  issuedTimerAggregationAuthorities.add(authority)
  return authority
}

export interface CanonicalEventTimeV2Context {
  readonly automationIntervalSeconds: number
  readonly timerAggregationAuthority:
    Readonly<CanonicalTimerAggregationAuthorityV2> | null
  readonly quantumEpochAuthority: Readonly<CanonicalQuantumEpochAuthorityV2> | null
  readonly dormantDueEvents: Readonly<CanonicalV2DormantDueEvents>
  readonly catalogLookup: DysonV2CatalogLookup | null
  readonly infinityRewardAuthority: Readonly<InfinityRewardAuthorityV2>
}

interface CanonicalQueuedInputBaseV2 {
  readonly id: string
  readonly horizonSeconds: number
  readonly commandVersion: 1
}

export interface CanonicalQueuedDysonInputV2 extends CanonicalQueuedInputBaseV2 {
  readonly commandKind: 'dyson-facility-purchase'
  readonly facilityId: DysonV2CommandFacilityId
  readonly requestedMode: V2PurchaseMode
  readonly roundedBulkBuy: boolean
}

export interface CanonicalQueuedQuantumUpgradeInputV2 extends CanonicalQueuedInputBaseV2 {
  readonly commandKind: 'quantum-upgrade-purchase'
  readonly upgradeId: QuantumUpgradeIdV2
  readonly requestedMode: V2PurchaseMode
}

export interface CanonicalQueuedQuantumActionInputV2 extends CanonicalQueuedInputBaseV2 {
  readonly commandKind: 'quantum-action'
}

export type CanonicalQueuedInputV2=CanonicalQueuedDysonInputV2|CanonicalQueuedQuantumUpgradeInputV2|CanonicalQueuedQuantumActionInputV2

export interface CanonicalEventTimeV2AdvanceRequest {
  readonly carrier: Readonly<CanonicalEventTimeCarrierV2>
  readonly durationSeconds: number
  readonly materialEventBudget: number
  readonly mode: V2TimeSliceMode
  readonly context: Readonly<CanonicalEventTimeV2Context>
  readonly queuedInputs: readonly Readonly<CanonicalQueuedInputV2>[]
  readonly cancelRequested: (() => boolean) | null
}

export type CanonicalEventTimeV2Status =
  | 'completed'
  | 'stored-time-exhausted'
  | 'yielded'
  | 'cancelled'
  | 'blocked-unported-event'
  | 'zero-time-loop'

export interface CanonicalEventTimeV2Summary {
  readonly generated: Readonly<DysonV2ProductionRates>
  readonly effective: Readonly<DysonV2ProductionRates>
  readonly productionChanged: boolean
  readonly realityWorkers: GameDecimal
  readonly automaticInfluence: GameDecimal
  readonly dreamRequested: Readonly<DreamV2AmountSummary>
  readonly dreamEffective: Readonly<DreamV2AmountSummary>
  readonly dreamEnergyRequested: GameDecimal
  readonly dreamEnergyEffective: GameDecimal
  readonly dreamPanelsRequested: GameDecimal
  readonly dreamPanelsEffective: GameDecimal
  readonly dreamResetCount: bigint
  readonly dreamMeteorResetCount: bigint
  readonly dreamAiResetCount: bigint
  readonly dreamGlobalWarmingResetCount: bigint
  readonly dreamBlackHoleResetCount: bigint
  readonly dreamStrangeMatterRequested: GameDecimal
  readonly dreamStrangeMatterEffective: GameDecimal
  readonly dreamStrangeMatterFinal: GameDecimal | null
  readonly dreamLifetimeStrangeMatterFinal: GameDecimal | null
  readonly dreamCurrentQuantumRunStrangeMatterFinal: GameDecimal | null
  readonly dreamRecentProcessedSegmentStrangeMatterFinal: GameDecimal | null
  readonly quantumResetCount:bigint
  readonly quantumEntanglementCount:bigint
  readonly quantumAvailableShardsEffective:GameDecimal
  readonly quantumLifetimeShardsEffective:GameDecimal
  readonly quantumInfinityPointsConsumed:GameDecimal
  readonly quantumAvailableShardsFinal:GameDecimal|null
  readonly quantumLifetimeShardsFinal:GameDecimal|null
  readonly quantumInfinityAvailableFinal:GameDecimal|null
  readonly quantumInfinityAllocatedFinal:GameDecimal|null
  readonly quantumResetSkillPointsFinal:bigint|null
  readonly realityCapacityStallSeconds: number
  readonly automationTicks: bigint
  readonly analyticallySkippedAutomationTicks: bigint
  /** Domain-bounded by the eleven authored Dyson goal stages (0 through 10). */
  readonly goalStagesCompleted: readonly bigint[]
  readonly automationPolicy: DysonV2AutomationPolicy
  readonly advanceActiveOnlyTinker: boolean
  readonly baseSimulationSeconds: number
  readonly dreamSimulationSeconds: number
  readonly storedTimeConsumedSeconds: number
  readonly infinityResetCount: bigint
  readonly lastInfinityResetElapsedSeconds: number | null
  readonly boundaryOrder: typeof V2_EVENT_BOUNDARY_ORDER
  readonly boundaryPasses: Readonly<Record<CanonicalEventBoundaryPhaseV2, bigint>>
  readonly boundaryDigest: string
}

export type CanonicalEventBoundaryPhaseV2 =
  (typeof V2_EVENT_BOUNDARY_ORDER)[number]

export interface CanonicalEventTimeV2AdvanceResult {
  readonly carrier: Readonly<CanonicalEventTimeCarrierV2>
  readonly status: CanonicalEventTimeV2Status
  readonly consumedSeconds: number
  readonly remainingSeconds: number
  readonly materialEvents: number
  readonly zeroTimePasses: number
  readonly summary: Readonly<CanonicalEventTimeV2Summary>
  readonly diagnosticCode?: string
  readonly continuation?: Readonly<CanonicalEventTimeV2Continuation>
}

export interface CanonicalEventTimeV2Continuation {
  readonly kind: 'canonical-event-time-v2-continuation'
}

/**
 * Worker-local checkpoint proposal captured only after a complete material
 * boundary. The token and its hidden restart descriptor never cross the
 * worker wire; Stage 4D encodes the exposed data through its neutral DTO.
 */
export interface CanonicalEventTimeV2MaterialBoundarySeal {
  readonly kind: 'canonical-event-time-v2-material-boundary-seal'
  readonly originRevision: number
  readonly acknowledgedBaseRevision: number
  readonly carrier: Readonly<CanonicalEventTimeCarrierV2>
  readonly requestedSeconds: number
  readonly consumedSeconds: number
  readonly remainingSeconds: number
  readonly materialEvents: number
  readonly zeroTimePasses: number
  readonly remainingQueuedInputs: readonly Readonly<CanonicalQueuedInputV2>[]
  readonly summary: Readonly<CanonicalEventTimeV2Summary>
}

/** Internal guard is exported for exact hostile scheduler characterization. */
export class V2ZeroTimePassGuard {
  #passes = 0

  constructor(initialPasses = 0) {
    if (
      !Number.isSafeInteger(initialPasses) ||
      initialPasses < 0 ||
      initialPasses > MAXIMUM_ZERO_TIME_PASSES
    ) {
      throw new RangeError('V2 zero-time pass seed is outside its closed bounds.')
    }
    this.#passes = initialPasses
  }

  get passes(): number {
    return this.#passes
  }

  recordRepresentedOutcome(changed: boolean): void {
    if (!changed) throw new Error('V2_ZERO_TIME_EVENT_NO_PROGRESS')
    this.#passes += 1
    if (this.#passes > MAXIMUM_ZERO_TIME_PASSES) {
      throw new Error('V2_ZERO_TIME_PASS_LIMIT')
    }
  }

  reset(): void {
    this.#passes = 0
  }
}

interface MutableSummary {
  readonly detailed: boolean
  generated: Record<keyof DysonV2ProductionRates, GameDecimal>
  effective: Record<keyof DysonV2ProductionRates, GameDecimal>
  productionChanged: boolean
  realityWorkers: GameDecimal
  automaticInfluence: GameDecimal
  dreamRequested: Record<keyof DreamV2AmountSummary,GameDecimal>
  dreamEffective: Record<keyof DreamV2AmountSummary,GameDecimal>
  dreamEnergyRequested:GameDecimal
  dreamEnergyEffective:GameDecimal
  dreamPanelsRequested:GameDecimal
  dreamPanelsEffective:GameDecimal
  dreamResetCount:bigint
  dreamMeteorResetCount:bigint
  dreamAiResetCount:bigint
  dreamGlobalWarmingResetCount:bigint
  dreamBlackHoleResetCount:bigint
  dreamStrangeMatterRequested:GameDecimal
  dreamStrangeMatterEffective:GameDecimal
  dreamStrangeMatterFinal:GameDecimal|null
  dreamLifetimeStrangeMatterFinal:GameDecimal|null
  dreamCurrentQuantumRunStrangeMatterFinal:GameDecimal|null
  dreamRecentProcessedSegmentStrangeMatterFinal:GameDecimal|null
  quantumResetCount:bigint
  quantumEntanglementCount:bigint
  quantumAvailableShardsEffective:GameDecimal
  quantumLifetimeShardsEffective:GameDecimal
  quantumInfinityPointsConsumed:GameDecimal
  quantumAvailableShardsFinal:GameDecimal|null
  quantumLifetimeShardsFinal:GameDecimal|null
  quantumInfinityAvailableFinal:GameDecimal|null
  quantumInfinityAllocatedFinal:GameDecimal|null
  quantumResetSkillPointsFinal:bigint|null
  realityCapacityStallSeconds: number
  automationTicks: bigint
  analyticallySkippedAutomationTicks: bigint
  goalStagesCompleted: bigint[]
  baseSimulationSeconds: number
  dreamSimulationSeconds: number
  storedTimeConsumedSeconds: number
  infinityResetCount: bigint
  lastInfinityResetElapsedSeconds: number | null
  boundaryPasses: Record<CanonicalEventBoundaryPhaseV2, bigint>
  boundaryDigest: bigint
}

interface PendingBoundary {
  readonly automationDue: boolean
  readonly infinityDue: boolean
  readonly dreamResetDue: boolean
  readonly queuedInputIds: readonly string[]
}

interface BoundaryOutcome {
  readonly carrier: Readonly<CanonicalEventTimeCarrierV2>
  readonly changed: boolean
  readonly internalRevision: number
  readonly diagnosticCode?: string
}

interface CapturedEventTimeV2Context extends CanonicalEventTimeV2Context {
  readonly catalogLookup: DysonV2CatalogLookup
}

interface CapturedEventTimeV2Request
  extends Omit<CanonicalEventTimeV2AdvanceRequest, 'context' | 'queuedInputs'> {
  readonly context: Readonly<CapturedEventTimeV2Context>
  readonly queuedInputs: readonly Readonly<CanonicalQueuedInputV2>[]
}

interface ContinuationDescriptorV2 {
  readonly originRevision: number
  readonly sourceCarrier: Readonly<CanonicalEventTimeCarrierV2>
  readonly candidateCarrier: Readonly<CanonicalEventTimeCarrierV2>
  readonly remainingSeconds: number
  readonly remainingHorizon: GameDecimal
  readonly requestedSeconds: number
  readonly consumedSeconds: number
  readonly materialEvents: number
  readonly internalRevision: number
  readonly materialEventBudget: number
  readonly mode: V2TimeSliceMode
  readonly context: Readonly<CapturedEventTimeV2Context>
  readonly queuedInputs: readonly Readonly<CanonicalQueuedInputV2>[]
  readonly summary: MutableSummary
  readonly zeroTimePasses: number
}

type MaterialBoundarySealDescriptorV2 = ContinuationDescriptorV2

const continuationDescriptors = new WeakMap<object, ContinuationDescriptorV2>()
const materialBoundarySealDescriptors =
  new WeakMap<object, MaterialBoundarySealDescriptorV2>()
const internalRevisionSeeds = new WeakMap<object, number>()
const summarySeeds = new WeakMap<object, MutableSummary>()
const zeroTimePassSeeds = new WeakMap<object, number>()

export function advanceCanonicalEventTimeV2(
  request: Readonly<CanonicalEventTimeV2AdvanceRequest>,
): Readonly<CanonicalEventTimeV2AdvanceResult> {
  const capturedRequest = captureRequest(request)
  return advanceCapturedCanonicalEventTimeV2(capturedRequest, request) as
    Readonly<CanonicalEventTimeV2AdvanceResult>
}

/**
 * Worker-only Fast representative-group seam. The issued timer authority is
 * validated by captureRequest; durable scheduler/reset accounting remains
 * exact while observational per-command rate totals are intentionally omitted.
 */
export function advancePreparedFastRepresentativeGroupV2(
  request: Readonly<CanonicalEventTimeV2AdvanceRequest>,
): Readonly<CanonicalEventTimeV2AdvanceResult> {
  const capturedRequest = captureRequest(request)
  if (capturedRequest.context.timerAggregationAuthority === null) {
    throw new TypeError('Prepared Fast advancement requires worker-issued authority.')
  }
  return advanceCapturedCanonicalEventTimeV2(
    capturedRequest,
    request,
    createMutableSummary(false),
  ) as Readonly<CanonicalEventTimeV2AdvanceResult>
}

export interface PreparedFastDreamCycleNormalizationV2 {
  readonly carrier: Readonly<CanonicalEventTimeCarrierV2>
  readonly cycles: bigint
  readonly cause: 'Meteor' | 'ArtificialIntelligence' | 'GlobalWarming'
  readonly requestedReward: GameDecimal
  readonly effectiveReward: GameDecimal
  readonly dreamSimulationSeconds: number
  readonly cycleSeconds: number
  readonly firstCycleElapsedSeconds: number
}
interface PreparedFastDreamCycleNormalizationRequestV2 {
  readonly previousPostResetCarrier:Readonly<CanonicalEventTimeCarrierV2>
  readonly currentPostResetCarrier:Readonly<CanonicalEventTimeCarrierV2>
  readonly additionalCycles:bigint
  readonly cycleSegmentSeconds:readonly number[]
  readonly automationExecutionsPerCycle:number
  readonly timerAggregationAuthority:Readonly<CanonicalTimerAggregationAuthorityV2>
}

/** Worker-only O(1) Fast-policy recurrence after two authentic equal cycles. */
export function normalizePreparedFastDreamCyclesV2(request:Readonly<PreparedFastDreamCycleNormalizationRequestV2>):Readonly<PreparedFastDreamCycleNormalizationV2>|null{
  const captured=captureFastDreamNormalizationRequestV2(request)
  if(!issuedTimerAggregationAuthorities.has(captured.timerAggregationAuthority as object))throw new TypeError('Prepared Fast Dream normalization requires worker-issued authority.')
  if(typeof captured.additionalCycles!=='bigint'||captured.additionalCycles<1n||captured.additionalCycles>4096n||!Number.isSafeInteger(captured.automationExecutionsPerCycle)||captured.automationExecutionsPerCycle<1||captured.automationExecutionsPerCycle>4096)throw new RangeError('Prepared Fast Dream normalization request is invalid.')
  const cycleSegmentSeconds=captureFastDreamCycleSegmentsV2(captured.cycleSegmentSeconds,captured.automationExecutionsPerCycle)
  const cycleSeconds=replayFiniteClockV2(0,cycleSegmentSeconds,'add')
  if(cycleSeconds<=0)throw new RangeError('Prepared Fast Dream normalization cycle must advance time.')
  const previous=prepareCanonicalEventTimeCarrierV2(captured.previousPostResetCarrier),current=prepareCanonicalEventTimeCarrierV2(captured.currentPostResetCarrier)
  const stableDream=certifyStableFastDreamCycleV2(previous,current,cycleSegmentSeconds,captured.automationExecutionsPerCycle)
  if(stableDream===null)return null
  const count=Number(captured.additionalCycles),automationExecutions=count*captured.automationExecutionsPerCycle,totalSeconds=cycleSeconds*count
  if(!Number.isFinite(totalSeconds)||current.state.timeline.infinityBoundaryRemaining<=totalSeconds||current.state.timeline.storedTimeAvailableSeconds<totalSeconds)return null
  const double=current.state.timeline.doubleTime,doubleRequired=double.unlocked&&double.rate>0&&double.bankSeconds>0?double.rate*totalSeconds:0
  if(doubleRequired>0&&double.bankSeconds<doubleRequired)return null
  const clockedTimeline=Object.freeze({...current.state.timeline,automationTimeUntilNextEvent:current.state.timeline.automationTimeUntilNextEvent,dysonAutomationTargetIndex:(current.state.timeline.dysonAutomationTargetIndex+automationExecutions)%DYSON_V2_COMMAND_TARGETS.length,researchAutomationTargetIndex:current.state.infinity.automationUnlocked.research?(current.state.timeline.researchAutomationTargetIndex+automationExecutions)%RESEARCH_V2_IDS.length:current.state.timeline.researchAutomationTargetIndex,infinityBoundaryRemaining:current.state.timeline.infinityBoundaryRemaining-totalSeconds,infinityCycleSeconds:current.state.timeline.infinityCycleSeconds+totalSeconds})
  const resource=advanceV2TimeResourceSlice(clockedTimeline,'stored-time',totalSeconds);if(resource.status!=='ready')return null
  const clockedState=Object.freeze({...current.state,dream:stableDream,timeline:resource.timeline}) as CanonicalGameStateV2,reality=advancePreparedRealityWorkersV2(clockedState,totalSeconds)
  if(!reality.accepted||!equalPreparedTreeV2(reality.state.reality,current.state.reality)||compareGameDecimals(reality.workersGenerated,GAME_DECIMAL_ZERO)!==0||compareGameDecimals(reality.automaticInfluence,GAME_DECIMAL_ZERO)!==0)return null
  const statistics=recordRealityStatisticsSegmentV2(current.state.statistics,totalSeconds,Object.freeze({workersGenerated:reality.workersGenerated,workerGenerationStartProgress:current.state.reality.workerGenerationProgress,generationPerSecond:reality.generationPerSecond,automaticInfluence:reality.automaticInfluence,manualInfluence:GAME_DECIMAL_ZERO,stalledSeconds:reality.stalledSeconds}))
  const timeAdvanced=Object.freeze({...reality.state,statistics}) as CanonicalGameStateV2
  const firstCycleElapsedSeconds=current.state.statistics.trackedSimulatedSeconds+cycleSeconds
  const normalized=normalizePreparedCanonicalFastDreamResetsV2(fastDreamNormalizationAuthority,preparedDreamResetAuthority,Object.freeze({revision:current.revision,state:timeAdvanced,runtime:current.runtime}),Object.freeze({cycles:captured.additionalCycles,cycleSeconds,firstCycleElapsedSeconds}))
  const carrier=prepareCanonicalEventTimeCarrierV2(Object.freeze({revision:current.revision,state:normalized.publication.state,runtime:normalized.publication.runtime}))
  return Object.freeze({carrier,cycles:captured.additionalCycles,cause:normalized.cause,requestedReward:normalized.requestedReward,effectiveReward:normalized.effectiveReward,dreamSimulationSeconds:resource.dreamSimulationSeconds,cycleSeconds,firstCycleElapsedSeconds})
}

function captureFastDreamNormalizationRequestV2(value:unknown):Readonly<PreparedFastDreamCycleNormalizationRequestV2>{
  try{
    if(typeof value!=='object'||value===null||Object.getPrototypeOf(value)!==Object.prototype)throw new TypeError()
    const descriptors=Object.getOwnPropertyDescriptors(value),keys=['previousPostResetCarrier','currentPostResetCarrier','additionalCycles','cycleSegmentSeconds','automationExecutionsPerCycle','timerAggregationAuthority'] as const
    if(Reflect.ownKeys(descriptors).length!==keys.length||keys.some(key=>{const descriptor=descriptors[key];return descriptor===undefined||!('value'in descriptor)||!descriptor.enumerable||descriptor.get!==undefined||descriptor.set!==undefined}))throw new TypeError()
    return Object.freeze(Object.fromEntries(keys.map(key=>[key,descriptors[key]!.value])) as unknown as PreparedFastDreamCycleNormalizationRequestV2)
  }catch{throw new TypeError('Prepared Fast Dream normalization request must be a closed data object.')}
}

function advanceCapturedCanonicalEventTimeV2(
  capturedRequest: Readonly<CapturedEventTimeV2Request>,
  requestIdentity: object,
  preparedSummary?: MutableSummary,
): Readonly<CanonicalEventTimeV2AdvanceResult> {
  const original = capturedRequest.carrier
  const context = capturedRequest.context
  const automationPolicy: DysonV2AutomationPolicy =
    capturedRequest.mode === 'stored-time' ? 'force-buy-max' : 'preserve-configured-mode'
  if (
    context.timerAggregationAuthority !== null &&
    (original.state.dream.upgrades.railguns1 || original.state.dream.railgun.firing)
  ) {
    return freezeResult(
      original,
      'blocked-unported-event',
      capturedRequest.durationSeconds,
      0,
      0,
      createMutableSummary(),
      automationPolicy,
      false,
      'V2_DREAM_RAILGUN_FAST_REQUIRES_NORMALIZATION',
    )
  }
  const maximumConsumable = capturedRequest.mode === 'stored-time'
    ? Math.min(
      capturedRequest.durationSeconds,
      original.state.timeline.storedTimeAvailableSeconds,
    )
    : capturedRequest.durationSeconds
  if (maximumConsumable === 0) {
    return freezeResult(
      original,
      'stored-time-exhausted',
      capturedRequest.durationSeconds,
      0,
      0,
      createMutableSummary(),
      automationPolicy,
      false,
    )
  }

  let carrier = initializeEventClock(original, context)
  let consumedSeconds = 0
  let remainingHorizon = gameDecimalFromNumber(maximumConsumable)
  let materialEvents = 0
  let internalRevision = internalRevisionSeeds.get(requestIdentity) ?? 0
  const processedQueuedInputs = new Set<string>()
  const zeroGuard = new V2ZeroTimePassGuard(
    zeroTimePassSeeds.get(requestIdentity) ?? 0,
  )
  const summary = preparedSummary ??
    summarySeeds.get(requestIdentity) ?? createMutableSummary()
  const issueEpochYield = (diagnosticCode: string) => {
    const continuation = issueContinuationV2({
      originRevision: original.revision,
      sourceCarrier: original,
      candidateCarrier: carrier,
      remainingSeconds: gameDecimalToSchedulerSeconds(
        remainingHorizon,
        Number.MAX_VALUE,
      ).seconds,
      remainingHorizon,
      requestedSeconds: capturedRequest.durationSeconds,
      consumedSeconds,
      materialEvents,
      internalRevision,
      materialEventBudget: capturedRequest.materialEventBudget,
      mode: capturedRequest.mode,
      context,
      queuedInputs: Object.freeze(capturedRequest.queuedInputs
        .filter((input) => !processedQueuedInputs.has(input.id))
        .map((input) => Object.freeze({
          ...input,
          horizonSeconds: Math.max(0, input.horizonSeconds - consumedSeconds),
        }))),
      summary: cloneMutableSummary(summary),
      zeroTimePasses: zeroGuard.passes,
    })
    return freezeResult(
      original,
      'yielded',
      capturedRequest.durationSeconds,
      consumedSeconds,
      materialEvents,
      summary,
      automationPolicy,
      capturedRequest.mode === 'active',
      diagnosticCode,
      zeroGuard.passes,
      continuation,
    )
  }

  while (compareGameDecimals(remainingHorizon, GAME_DECIMAL_ZERO) > 0) {
    if (capturedRequest.cancelRequested?.() === true) {
      return freezeResult(
        original,
        'cancelled',
        capturedRequest.durationSeconds,
        0,
        0,
        createMutableSummary(),
        automationPolicy,
        false,
        'V2_EVENT_CANCELLED',
      )
    }
    const skipped = tryFastForwardStableAutomationV2(
      carrier,
      gameDecimalToSchedulerSeconds(remainingHorizon, Number.MAX_VALUE).seconds,
      capturedRequest.mode,
      context,
      capturedRequest.queuedInputs,
      internalRevision,
    )
    if (skipped !== undefined) {
      carrier = skipped.carrier
      consumedSeconds += skipped.seconds
      remainingHorizon = remainingHorizonAfterV2(
        remainingHorizon,
        skipped.seconds,
      )
      internalRevision = skipped.internalRevision
      if (summary.detailed) {
        summary.automationTicks += skipped.ticks
        summary.analyticallySkippedAutomationTicks += skipped.ticks
        summary.baseSimulationSeconds += skipped.baseSimulationSeconds
        summary.dreamSimulationSeconds += skipped.dreamSimulationSeconds
        summary.storedTimeConsumedSeconds += skipped.storedTimeConsumedSeconds
        summary.realityWorkers = addGameDecimals(
          summary.realityWorkers,
          skipped.realityWorkers,
        )
        summary.automaticInfluence = addGameDecimals(
          summary.automaticInfluence,
          skipped.automaticInfluence,
        )
        summary.realityCapacityStallSeconds += skipped.realityCapacityStallSeconds
      }
      continue
    }
    if (materialEvents >= capturedRequest.materialEventBudget) {
      const continuation = issueContinuationV2({
        originRevision: original.revision,
        sourceCarrier: original,
        candidateCarrier: carrier,
        remainingSeconds: gameDecimalToSchedulerSeconds(
          remainingHorizon,
          Number.MAX_VALUE,
        ).seconds,
        remainingHorizon,
        requestedSeconds: capturedRequest.durationSeconds,
        consumedSeconds,
        materialEvents,
        internalRevision,
        materialEventBudget: capturedRequest.materialEventBudget,
        mode: capturedRequest.mode,
        context,
        queuedInputs: Object.freeze(capturedRequest.queuedInputs
          .filter((input) => !processedQueuedInputs.has(input.id))
          .map((input) => Object.freeze({
            ...input,
            horizonSeconds: Math.max(0, input.horizonSeconds - consumedSeconds),
          }))),
        summary: cloneMutableSummary(summary),
        zeroTimePasses: zeroGuard.passes,
      })
      return freezeResult(
        original,
        'yielded',
        capturedRequest.durationSeconds,
        consumedSeconds,
        materialEvents,
        summary,
        automationPolicy,
        capturedRequest.mode === 'active',
        'V2_EVENT_MATERIAL_BUDGET',
        zeroGuard.passes,
        continuation,
      )
    }

    const remaining = gameDecimalToSchedulerSeconds(
      remainingHorizon,
      Number.MAX_VALUE,
    ).seconds
    const resolution = resolveV2EventSlice(
      eventCandidates(
        carrier,
        context.dormantDueEvents,
        capturedRequest.queuedInputs,
        processedQueuedInputs,
        consumedSeconds,
      ),
      remaining,
    )
    const captured = deriveDysonV2FromCauses(
      carrier.state,
      carrier.runtime,
      context.catalogLookup,
    )
    if (resolution.seconds > 0) {
      carrier = advanceContinuousSegment(
        carrier,
        captured.production,
        resolution.seconds,
        capturedRequest.mode,
        context.timerAggregationAuthority,
        resolution.dueEventIds,
        summary,
      )
      consumedSeconds += resolution.seconds
      remainingHorizon = remainingHorizonAfterV2(
        remainingHorizon,
        resolution.seconds,
      )
      zeroGuard.reset()
    }

    const dueQuantumInput = resolution.dueEventIds
      .filter((id) => id.startsWith('queued-input:'))
      .map((id) => capturedRequest.queuedInputs.find(
        (input) => input.id === id.slice('queued-input:'.length),
      ))
      .find((input) => input !== undefined &&
        input.commandKind !== 'dyson-facility-purchase')
    if (
      dueQuantumInput === undefined &&
      resolution.dueEventIds.includes('canonical-infinity') &&
      context.quantumEpochAuthority !== null &&
      issuedQuantumEpochAuthorities.get(context.quantumEpochAuthority) === 'armed'
    ) {
      issuedQuantumEpochAuthorities.set(context.quantumEpochAuthority, 'preparing-infinity')
    }
    if (
      dueQuantumInput !== undefined &&
      context.quantumEpochAuthority !== null &&
      issuedQuantumEpochAuthorities.get(context.quantumEpochAuthority) === 'armed'
    ) {
      issuedQuantumEpochAuthorities.set(context.quantumEpochAuthority, 'awaiting-action')
      return issueEpochYield('V2_QUANTUM_EPOCH_PRE_ACTION')
    }

    const beforeBoundary = carrier
    const dueQueuedInputIds = resolution.dueEventIds
      .filter((id) => id.startsWith('queued-input:'))
      .map((id) => id.slice('queued-input:'.length))
    const boundary = applyOrderedBoundaryHandlers(
      carrier,
      Object.freeze({
        automationDue: resolution.dueEventIds.includes('automation'),
        infinityDue: resolution.dueEventIds.includes('canonical-infinity'),
        dreamResetDue: resolution.dueEventIds.includes('dream-reset'),
        queuedInputIds: Object.freeze(dueQueuedInputIds),
      }),
      context,
      capturedRequest.queuedInputs,
      automationPolicy,
      internalRevision,
      summary,
      consumedSeconds,
    )
    materialEvents += 1
    if (boundary.diagnosticCode !== undefined) {
      return freezeResult(
        original,
        'blocked-unported-event',
        capturedRequest.durationSeconds,
        0,
        0,
        createMutableSummary(),
        automationPolicy,
        false,
        boundary.diagnosticCode,
      )
    }
    carrier = boundary.carrier
    for (const id of dueQueuedInputIds) processedQueuedInputs.add(id)
    internalRevision = boundary.internalRevision
    if (
      resolution.dueEventIds.includes('canonical-infinity') &&
      context.quantumEpochAuthority !== null &&
      issuedQuantumEpochAuthorities.get(context.quantumEpochAuthority) === 'preparing-infinity'
    ) {
      issuedQuantumEpochAuthorities.set(context.quantumEpochAuthority, 'awaiting-infinity')
      return issueEpochYield('V2_QUANTUM_EPOCH_PRE_INFINITY')
    }
    if (
      resolution.dueEventIds.includes('canonical-infinity') &&
      context.quantumEpochAuthority !== null &&
      issuedQuantumEpochAuthorities.get(context.quantumEpochAuthority) === 'awaiting-infinity'
    ) {
      issuedQuantumEpochAuthorities.set(context.quantumEpochAuthority, 'armed')
      return issueEpochYield('V2_QUANTUM_EPOCH_POST_INFINITY')
    }
    if (
      dueQuantumInput !== undefined &&
      context.quantumEpochAuthority !== null &&
      issuedQuantumEpochAuthorities.get(context.quantumEpochAuthority) === 'awaiting-action'
    ) {
      issuedQuantumEpochAuthorities.set(context.quantumEpochAuthority, 'armed')
      return issueEpochYield('V2_QUANTUM_EPOCH_POST_ACTION')
    }
    if (resolution.seconds === 0) {
      try {
        zeroGuard.recordRepresentedOutcome(
          boundary.changed || !sameCarrier(beforeBoundary, carrier),
        )
      } catch (error) {
        return freezeResult(
          original,
          'zero-time-loop',
          capturedRequest.durationSeconds,
          0,
          0,
          createMutableSummary(),
          automationPolicy,
          false,
          error instanceof Error ? error.message : 'V2_ZERO_TIME_LOOP',
          zeroGuard.passes,
        )
      }
    }
  }

  const status = consumedSeconds < capturedRequest.durationSeconds
    ? 'stored-time-exhausted'
    : 'completed'
  return freezeResult(
    withPublishedRevision(carrier, original.revision),
    status,
    capturedRequest.durationSeconds,
    consumedSeconds,
    materialEvents,
    summary,
    automationPolicy,
    capturedRequest.mode === 'active',
    undefined,
    zeroGuard.passes,
  )
}

/**
 * Admission boundary for lifecycle owners. The exact frozen carrier is
 * returned after the normal closed-shape, full V2 semantic, timeline, and
 * runtime checks register its immutable state for subsequent scheduler work.
 */
export function prepareCanonicalEventTimeCarrierV2(
  carrier: Readonly<CanonicalEventTimeCarrierV2>,
): Readonly<CanonicalEventTimeCarrierV2> {
  return captureCarrier(carrier)
}

/**
 * Derives the scheduler's initial clocks without advancing gameplay. Stored
 * Time uses this at admission so an immediately-started job authenticates the
 * same first Infinity horizon that the worker will initialize locally.
 */
export function initializeCanonicalEventTimeCarrierV2(
  carrier: Readonly<CanonicalEventTimeCarrierV2>,
  infinityRewardAuthority: Readonly<InfinityRewardAuthorityV2>,
): Readonly<CanonicalEventTimeCarrierV2> {
  const admitted = prepareCanonicalEventTimeCarrierV2(carrier)
  return initializeEventClock(admitted, Object.freeze({
    catalogLookup: getGameAsset,
    infinityRewardAuthority: captureInfinityRewardAuthorityV2ForSimulation(
      infinityRewardAuthority,
    ),
    automationIntervalSeconds: DEFAULT_AUTOMATION_INTERVAL_SECONDS,
  }))
}

/**
 * Retimes the two scheduler-owned Dyson clock fields on an already admitted
 * carrier. This deliberately cannot admit arbitrary state or runtime graphs:
 * the public preparation boundary must have validated both identities first.
 * It lets representative stored-time groups retain structural sharing without
 * repeating a whole-state validation for each deterministic clock update.
 */
export function retimePreparedCanonicalEventTimeCarrierV2(
  carrier: Readonly<CanonicalEventTimeCarrierV2>,
  automationTimeUntilNextEvent: number,
  dysonAutomationTargetIndex: number,
): Readonly<CanonicalEventTimeCarrierV2> {
  const properties = closedDataProperties(
    carrier,
    ['state', 'runtime', 'revision'],
    'Prepared V2 event carrier',
  )
  const state = dataValue(properties, 'state', 'Prepared V2 event carrier')
  const runtime = dataValue(properties, 'runtime', 'Prepared V2 event carrier')
  const revision = dataValue(properties, 'revision', 'Prepared V2 event carrier')
  if (
    state === null ||
    typeof state !== 'object' ||
    !validatedCanonicalStates.has(state) ||
    runtime === null ||
    typeof runtime !== 'object' ||
    !validatedRuntimeSidecars.has(runtime)
  ) {
    throw new TypeError('V2 event carrier must be admitted before it is retimed.')
  }
  if (
    typeof revision !== 'number' ||
    !Number.isSafeInteger(revision) ||
    revision < 0 ||
    revision === Number.MAX_SAFE_INTEGER
  ) {
    throw new TypeError('Prepared V2 event carrier revision is invalid.')
  }
  if (
    typeof automationTimeUntilNextEvent !== 'number' ||
    !Number.isFinite(automationTimeUntilNextEvent) ||
    automationTimeUntilNextEvent < 0 ||
    Object.is(automationTimeUntilNextEvent, -0)
  ) {
    throw new RangeError('Prepared V2 automation horizon must be finite and non-negative.')
  }
  if (
    !Number.isSafeInteger(dysonAutomationTargetIndex) ||
    dysonAutomationTargetIndex < 0 ||
    dysonAutomationTargetIndex > 7
  ) {
    throw new RangeError('Prepared V2 Dyson automation target index must be from 0 through 7.')
  }
  const canonicalState = state as Readonly<CanonicalGameStateV2>
  const timeline = Object.freeze({
    ...canonicalState.timeline,
    eventClockInitialized: true,
    automationTimeUntilNextEvent,
    dysonAutomationTargetIndex,
  })
  const nextState = Object.freeze({
    ...canonicalState,
    timeline,
  }) as Readonly<CanonicalGameStateV2>
  // The source timeline was validated at admission and the only two changed
  // fields were checked above; avoid rescanning unchanged time resources for
  // every representative group.
  validatedCanonicalStates.add(nextState as object)
  return Object.freeze({
    state: nextState,
    runtime: runtime as Readonly<CanonicalRuntimeSidecarV2>,
    revision,
  })
}

export function resumeCanonicalEventTimeV2(
  continuation: Readonly<CanonicalEventTimeV2Continuation>,
  cancelRequested: (() => boolean) | null = null,
): Readonly<CanonicalEventTimeV2AdvanceResult> {
  if (continuation === null || typeof continuation !== 'object') {
    throw new TypeError('V2 event continuation is not module-issued.')
  }
  const descriptor = continuationDescriptors.get(continuation)
  if (descriptor === undefined) {
    throw new TypeError('V2 event continuation is not module-issued.')
  }
  continuationDescriptors.delete(continuation)
  if (cancelRequested !== null && typeof cancelRequested !== 'function') {
    throw new TypeError('V2 continuation cancellation probe must be a function or null.')
  }
  const resumeSeconds = gameDecimalToSchedulerSeconds(
    descriptor.remainingHorizon,
    Number.MAX_VALUE,
  ).seconds
  const resumeRequest = Object.freeze({
    carrier: descriptor.candidateCarrier,
    durationSeconds: resumeSeconds,
    materialEventBudget: descriptor.materialEventBudget,
    mode: descriptor.mode,
    context: descriptor.context,
    queuedInputs: descriptor.queuedInputs,
    cancelRequested,
  })
  internalRevisionSeeds.set(resumeRequest, descriptor.internalRevision)
  summarySeeds.set(resumeRequest, cloneMutableSummary(descriptor.summary))
  zeroTimePassSeeds.set(resumeRequest, descriptor.zeroTimePasses)
  const resumed = advanceCanonicalEventTimeV2(resumeRequest)
  const combinedSummary = mutableSummaryFromFrozen(resumed.summary)
  const consumedSeconds = descriptor.consumedSeconds + resumed.consumedSeconds
  const materialEvents = descriptor.materialEvents + resumed.materialEvents
  if (resumed.status === 'yielded' && resumed.continuation !== undefined) {
    const child = continuationDescriptors.get(resumed.continuation)
    if (child === undefined) throw new Error('V2 continuation chain lost authenticity.')
    const remainingHorizon = remainingHorizonAfterV2(
      descriptor.remainingHorizon,
      resumed.consumedSeconds,
    )
    const chained = issueContinuationV2({
      ...child,
      originRevision: descriptor.originRevision,
      sourceCarrier: descriptor.sourceCarrier,
      requestedSeconds: descriptor.requestedSeconds,
      remainingSeconds: schedulerSecondsForV2(remainingHorizon),
      remainingHorizon,
      consumedSeconds,
      materialEvents,
      summary: combinedSummary,
      zeroTimePasses: child.zeroTimePasses,
    })
    return freezeResult(
      descriptor.sourceCarrier,
      'yielded',
      descriptor.requestedSeconds,
      consumedSeconds,
      materialEvents,
      combinedSummary,
      resumed.summary.automationPolicy,
      resumed.summary.advanceActiveOnlyTinker,
      resumed.diagnosticCode,
      resumed.zeroTimePasses,
      chained,
    )
  }
  if (
    resumed.status === 'cancelled' ||
    resumed.status === 'blocked-unported-event' ||
    resumed.status === 'zero-time-loop'
  ) {
    return freezeResult(
      descriptor.sourceCarrier,
      resumed.status,
      descriptor.requestedSeconds,
      0,
      0,
      createMutableSummary(),
      resumed.summary.automationPolicy,
      false,
      resumed.diagnosticCode,
      resumed.zeroTimePasses,
    )
  }
  return freezeResult(
    resumed.carrier,
    resumed.status,
    descriptor.requestedSeconds,
    consumedSeconds,
    materialEvents,
    combinedSummary,
    resumed.summary.automationPolicy,
    resumed.summary.advanceActiveOnlyTinker,
    resumed.diagnosticCode,
    resumed.zeroTimePasses,
  )
}

/**
 * Consumes one authentic yielded continuation at its already-completed
 * material boundary. It never advances, derives, or invents an endpoint.
 */
export function sealCanonicalEventTimeV2MaterialBoundary(
  continuation: Readonly<CanonicalEventTimeV2Continuation>,
): Readonly<CanonicalEventTimeV2MaterialBoundarySeal> {
  if (continuation === null || typeof continuation !== 'object') {
    throw new TypeError('V2 material-boundary seal requires a module-issued continuation.')
  }
  const descriptor = continuationDescriptors.get(continuation)
  if (descriptor === undefined) {
    throw new TypeError('V2 material-boundary seal requires a module-issued continuation.')
  }
  continuationDescriptors.delete(continuation)
  const automationPolicy: DysonV2AutomationPolicy = descriptor.mode === 'stored-time'
    ? 'force-buy-max'
    : 'preserve-configured-mode'
  const token = Object.freeze({
    kind: 'canonical-event-time-v2-material-boundary-seal' as const,
    originRevision: descriptor.originRevision,
    acknowledgedBaseRevision: descriptor.sourceCarrier.revision,
    carrier: descriptor.candidateCarrier,
    requestedSeconds: descriptor.requestedSeconds,
    consumedSeconds: descriptor.consumedSeconds,
    remainingSeconds: descriptor.remainingSeconds,
    materialEvents: descriptor.materialEvents,
    zeroTimePasses: descriptor.zeroTimePasses,
    remainingQueuedInputs: descriptor.queuedInputs,
    summary: freezeSummaryV2(
      descriptor.summary,
      automationPolicy,
      descriptor.mode === 'active',
    ),
  })
  materialBoundarySealDescriptors.set(token, {
    ...descriptor,
    summary: cloneMutableSummary(descriptor.summary),
  })
  return token
}

/**
 * Consumes an authentic seal after the main-thread authority has durably
 * acknowledged exactly one new publication revision. The acknowledged
 * carrier, rather than the uncommitted proposal, becomes the restart base.
 */
export function resumeCanonicalEventTimeV2FromAcknowledgedSeal(
  seal: Readonly<CanonicalEventTimeV2MaterialBoundarySeal>,
  acknowledgedCarrier: Readonly<CanonicalEventTimeCarrierV2>,
  cancelRequested: (() => boolean) | null = null,
): Readonly<CanonicalEventTimeV2AdvanceResult> {
  return resumeCanonicalEventTimeV2FromAuthoritySeal(
    seal, acknowledgedCarrier, cancelRequested, 1,
  )
}

export function resumeCanonicalEventTimeV2FromTransientAuthoritySeal(
  seal: Readonly<CanonicalEventTimeV2MaterialBoundarySeal>,
  acknowledgedCarrier: Readonly<CanonicalEventTimeCarrierV2>,
  cancelRequested: (() => boolean) | null = null,
): Readonly<CanonicalEventTimeV2AdvanceResult> {
  return resumeCanonicalEventTimeV2FromAuthoritySeal(
    seal, acknowledgedCarrier, cancelRequested, 0,
  )
}

function resumeCanonicalEventTimeV2FromAuthoritySeal(
  seal: Readonly<CanonicalEventTimeV2MaterialBoundarySeal>,
  acknowledgedCarrier: Readonly<CanonicalEventTimeCarrierV2>,
  cancelRequested: (() => boolean) | null,
  revisionIncrement: 0 | 1,
): Readonly<CanonicalEventTimeV2AdvanceResult> {
  if (seal === null || typeof seal !== 'object') {
    throw new TypeError('V2 acknowledged restart requires a module-issued material-boundary seal.')
  }
  const descriptor = materialBoundarySealDescriptors.get(seal)
  if (descriptor === undefined) {
    throw new TypeError('V2 acknowledged restart requires a module-issued material-boundary seal.')
  }
  materialBoundarySealDescriptors.delete(seal)
  if (cancelRequested !== null && typeof cancelRequested !== 'function') {
    throw new TypeError('V2 acknowledged restart cancellation probe must be a function or null.')
  }
  const acknowledged = captureCarrier(acknowledgedCarrier)
  if (acknowledged.revision !== descriptor.sourceCarrier.revision + revisionIncrement) {
    throw new RangeError(
      'V2 material-boundary acknowledgement must increment the durable base revision exactly once.',
    )
  }
  const resumeSeconds = gameDecimalToSchedulerSeconds(
    descriptor.remainingHorizon,
    Number.MAX_VALUE,
  ).seconds
  const resumeRequest = Object.freeze({
    carrier: acknowledged,
    durationSeconds: resumeSeconds,
    materialEventBudget: descriptor.materialEventBudget,
    mode: descriptor.mode,
    context: descriptor.context,
    queuedInputs: descriptor.queuedInputs,
    cancelRequested,
  })
  internalRevisionSeeds.set(resumeRequest, descriptor.internalRevision)
  summarySeeds.set(resumeRequest, cloneMutableSummary(descriptor.summary))
  zeroTimePassSeeds.set(resumeRequest, descriptor.zeroTimePasses)
  const resumed = advanceCanonicalEventTimeV2(resumeRequest)
  const cumulativeSummary = mutableSummaryFromFrozen(resumed.summary)
  const consumedSeconds = descriptor.consumedSeconds + resumed.consumedSeconds
  const materialEvents = descriptor.materialEvents + resumed.materialEvents
  if (resumed.status === 'yielded' && resumed.continuation !== undefined) {
    const child = continuationDescriptors.get(resumed.continuation)
    if (child === undefined) throw new Error('V2 acknowledged continuation lost authenticity.')
    continuationDescriptors.delete(resumed.continuation)
    const remainingHorizon = remainingHorizonAfterV2(
      descriptor.remainingHorizon,
      resumed.consumedSeconds,
    )
    const chained = issueContinuationV2({
      ...child,
      originRevision: descriptor.originRevision,
      sourceCarrier: acknowledged,
      requestedSeconds: descriptor.requestedSeconds,
      remainingSeconds: schedulerSecondsForV2(remainingHorizon),
      remainingHorizon,
      consumedSeconds,
      materialEvents,
      summary: cumulativeSummary,
      zeroTimePasses: child.zeroTimePasses,
    })
    return freezeResult(
      acknowledged,
      'yielded',
      descriptor.requestedSeconds,
      consumedSeconds,
      materialEvents,
      cumulativeSummary,
      resumed.summary.automationPolicy,
      resumed.summary.advanceActiveOnlyTinker,
      resumed.diagnosticCode,
      resumed.zeroTimePasses,
      chained,
    )
  }
  if (
    resumed.status === 'cancelled' ||
    resumed.status === 'blocked-unported-event' ||
    resumed.status === 'zero-time-loop'
  ) {
    return freezeResult(
      acknowledged,
      resumed.status,
      descriptor.requestedSeconds,
      descriptor.consumedSeconds,
      descriptor.materialEvents,
      cloneMutableSummary(descriptor.summary),
      resumed.summary.automationPolicy,
      descriptor.mode === 'active',
      resumed.diagnosticCode,
      descriptor.zeroTimePasses,
    )
  }
  return freezeResult(
    resumed.carrier,
    resumed.status,
    descriptor.requestedSeconds,
    consumedSeconds,
    materialEvents,
    cumulativeSummary,
    resumed.summary.automationPolicy,
    resumed.summary.advanceActiveOnlyTinker,
    resumed.diagnosticCode,
    resumed.zeroTimePasses,
  )
}

function advanceContinuousSegment(
  startingCarrier: Readonly<CanonicalEventTimeCarrierV2>,
  derived: ReturnType<typeof deriveDysonV2FromCauses>['production'],
  seconds: number,
  mode: V2TimeSliceMode,
  timerAggregationAuthority:
    Readonly<CanonicalTimerAggregationAuthorityV2> | null,
  dueEventIds: readonly string[],
  summary: MutableSummary,
): Readonly<CanonicalEventTimeCarrierV2> {
  let carrier = startingCarrier
  let remaining = seconds
  let splitCount = 0
  while (remaining > 0) {
    splitCount += 1
    if (splitCount > 2) {
      throw new Error('V2 Double Time segment split exceeded its bound.')
    }
    const double = carrier.state.timeline.doubleTime
    const doubleHorizon = double.unlocked && double.rate > 0 && double.bankSeconds > 0
      ? double.bankSeconds / double.rate
      : Number.POSITIVE_INFINITY
    const subsegment = Math.min(remaining, doubleHorizon)
    if (!(subsegment > 0)) {
      throw new Error('V2 continuous segment made no progress.')
    }

    const clockedTimeline = advanceSelectedSchedulerClockV2(
      carrier.state.timeline,
      subsegment,
      remaining === subsegment ? dueEventIds : Object.freeze([]),
    )
    const resource = advanceV2TimeResourceSlice(
      clockedTimeline,
      mode,
      subsegment,
    )
    if (resource.status !== 'ready') {
      throw new Error('V2 continuous segment exhausted unexpectedly.')
    }
    const clockedState = Object.freeze({
      ...carrier.state,
      timeline: resource.timeline,
    }) as CanonicalGameStateV2
    const production = applyCapturedDysonV2ProductionKernel(
      clockedState,
      derived,
      subsegment,
    )
    if (summary.detailed) {
      mergeProductionSummary(summary, production.summary)
      summary.baseSimulationSeconds += resource.baseSimulationSeconds
      summary.dreamSimulationSeconds += resource.dreamSimulationSeconds
      summary.storedTimeConsumedSeconds += resource.storedTimeConsumedSeconds
    }
    let dreamState=production.state
    if(dreamContinuousCanChange(production.state)){
      const dreamInput=prepareCanonicalDreamKernelStateV2(dreamKernelAuthority,Object.freeze({...production.state,timeline:clockedTimeline}) as CanonicalGameStateV2),dreamMultiplier=gameDecimalFromNumber(resource.effectiveDreamMultiplier),space=advanceDreamSpaceAgeV2(dreamInput,subsegment,dreamMultiplier)
      if(!space.accepted)throw new Error('V2 Dream Space-Age advancement failed.')
      const foundational=advanceDreamFoundationalV2(space.state,subsegment,dreamMultiplier);if(!foundational.accepted)throw new Error('V2 Dream foundational advancement failed.')
      const education=advanceDreamEducationV2(foundational.state,subsegment,dreamMultiplier);if(!education.accepted)throw new Error('V2 Dream education advancement failed.')
      if(summary.detailed){mergeDreamAmounts(summary.dreamRequested,foundational.requested);mergeDreamAmounts(summary.dreamEffective,foundational.produced);summary.dreamEnergyRequested=addGameDecimals(summary.dreamEnergyRequested,space.requestedEnergyGenerated);summary.dreamEnergyEffective=addGameDecimals(summary.dreamEnergyEffective,space.energyGenerated);summary.dreamPanelsRequested=addGameDecimals(summary.dreamPanelsRequested,space.factoryCycles);summary.dreamPanelsEffective=addGameDecimals(summary.dreamPanelsEffective,space.panelsProduced)}
      dreamState=education.state
    }
    const pendingBaseSeconds=dreamState.dream.railgun.pendingBaseSeconds+subsegment
    const pendingDreamSeconds=dreamState.dream.railgun.pendingDreamSeconds+resource.dreamSimulationSeconds
    if(!Number.isFinite(pendingBaseSeconds)||!Number.isFinite(pendingDreamSeconds))throw new RangeError('V2 Dream railgun interval recurrence overflowed.')
    dreamState=Object.freeze({...dreamState,dream:Object.freeze({...dreamState.dream,railgun:Object.freeze({...dreamState.dream.railgun,pendingBaseSeconds,pendingDreamSeconds})})}) as CanonicalGameStateV2
    let stateAfterTimers=Object.freeze({...dreamState,timeline:resource.timeline}) as CanonicalGameStateV2
    if (CANONICAL_ACTIVE_SKILL_TIMER_IDS_V2.some(
      (id) => production.state.skills.byId[id]!.owned,
    )) {
      if (timerAggregationAuthority !== null) {
        stateAfterTimers = advancePreparedSkillTimersForFastV2(
          stateAfterTimers,
          subsegment,
        )
      } else {
        const skillTimers = advanceCanonicalSkillTimersV2(
          stateAfterTimers,
          subsegment,
        )
        if (!skillTimers.accepted) {
          throw new Error(`V2 skill timer advancement failed: ${skillTimers.code}.`)
        }
        stateAfterTimers = skillTimers.state
      }
    }
    carrier = Object.freeze({
      ...carrier,
      state: stateAfterTimers,
    })
    remaining = Math.max(0, remaining - subsegment)
  }
  const reality = advancePreparedRealityWorkersV2(carrier.state, seconds)
  if (!reality.accepted) {
    throw new Error(`V2 Reality worker advancement failed: ${reality.code}.`)
  }
  if (summary.detailed) {
    summary.realityWorkers = addGameDecimals(
      summary.realityWorkers,
      reality.workersGenerated,
    )
    summary.automaticInfluence = addGameDecimals(
      summary.automaticInfluence,
      reality.automaticInfluence,
    )
    summary.realityCapacityStallSeconds += reality.stalledSeconds
  }
  const statistics = recordRealityStatisticsSegmentV2(
    reality.state.statistics,
    seconds,
    Object.freeze({
      workersGenerated: reality.workersGenerated,
      workerGenerationStartProgress:
        startingCarrier.state.reality.workerGenerationProgress,
      generationPerSecond: reality.generationPerSecond,
      automaticInfluence: reality.automaticInfluence,
      manualInfluence: GAME_DECIMAL_ZERO,
      stalledSeconds: reality.stalledSeconds,
    }),
  )
  return Object.freeze({...carrier,state:Object.freeze({ ...reality.state, statistics }) as CanonicalGameStateV2})
}

function advanceSelectedSchedulerClockV2(
  timeline: Readonly<CanonicalGameStateV2['timeline']>,
  seconds: number,
  selectedDueEventIds: readonly string[],
): Readonly<CanonicalGameStateV2['timeline']> {
  const decrement = (remaining: number, selectedId: string): number => {
    if (seconds <= remaining) return Math.max(0, remaining - seconds)
    if (selectedDueEventIds.includes(selectedId) && remaining > 0) return 0
    throw new RangeError('V2 rounded scheduler segment crosses a non-selected event boundary.')
  }
  const infinityCycleSeconds = timeline.infinityCycleSeconds + seconds
  if (!Number.isFinite(infinityCycleSeconds)) {
    throw new RangeError('V2 rounded scheduler segment overflowed Infinity cycle time.')
  }
  return Object.freeze({
    ...timeline,
    eventClockInitialized: true,
    automationTimeUntilNextEvent: decrement(
      timeline.automationTimeUntilNextEvent,
      'automation',
    ),
    infinityBoundaryRemaining: decrement(
      timeline.infinityBoundaryRemaining,
      'canonical-infinity',
    ),
    infinityCycleSeconds,
  })
}
function dreamContinuousCanChange(state:Readonly<CanonicalGameStateV2>):boolean{const resources=state.dream.resources,parameters=state.dream.parameters;if(parameters.communityBoostClock>0||parameters.factoriesBoostClock>0)return true;if(Object.values(state.dream.education).some(subject=>subject.active&&!subject.complete))return true;if(compareGameDecimals(resources.solarPanels,GAME_DECIMAL_ZERO)>0||compareGameDecimals(resources.fusion,GAME_DECIMAL_ZERO)>0||compareGameDecimals(resources.swarmPanels,GAME_DECIMAL_ZERO)>0||compareGameDecimals(resources.spaceFactories,GAME_DECIMAL_ZERO)>0)return true;return ['hunters','gatherers','community','housing','villages','workers','cities','factories','bots'].some(key=>compareGameDecimals(resources[key as keyof typeof resources],GAME_DECIMAL_ONE)>=0)}
function dreamAutomaticResetReadyPrepared(state:Readonly<CanonicalGameStateV2>):boolean{if(state.dream.resetCount===DISCRETE_MAXIMUM)return false;const stage=state.dream.disasterStage;return (stage===0n||stage===1n)?compareGameDecimals(state.dream.resources.cities,GAME_DECIMAL_ONE)>=0:stage===2n?compareGameDecimals(state.dream.resources.bots,gameDecimalFromNumber(100))>=0:stage===3n?compareGameDecimals(state.dream.resources.spaceFactories,gameDecimalFromNumber(5))>=0:false}

function certifyStableFastDreamCycleV2(previous:Readonly<CanonicalEventTimeCarrierV2>,current:Readonly<CanonicalEventTimeCarrierV2>,cycleSegmentSeconds:readonly number[],automationExecutionsPerCycle:number):CanonicalGameStateV2['dream']|null{
  const before=previous.state,after=current.state,beforeTimeline=before.timeline,afterTimeline=after.timeline
  if(after.dream.resetCount!==before.dream.resetCount+1n||after.dream.disasterStage!==before.dream.disasterStage||certifyCanonicalNoOpAutomationTickV2(before,0)===undefined||certifyCanonicalNoOpAutomationTickV2(after,0)===undefined)return null
  let expectedResourceTimeline=beforeTimeline
  for(const seconds of cycleSegmentSeconds){
    const resource=advanceV2TimeResourceSlice(expectedResourceTimeline,'stored-time',seconds)
    if(resource.status!=='ready')return null
    expectedResourceTimeline=resource.timeline
  }
  const expectedTimeline=Object.freeze({...beforeTimeline,
    dysonAutomationTargetIndex:(beforeTimeline.dysonAutomationTargetIndex+automationExecutionsPerCycle)%DYSON_V2_COMMAND_TARGETS.length,
    researchAutomationTargetIndex:before.infinity.automationUnlocked.research?(beforeTimeline.researchAutomationTargetIndex+automationExecutionsPerCycle)%RESEARCH_V2_IDS.length:beforeTimeline.researchAutomationTargetIndex,
    infinityBoundaryRemaining:replayFiniteClockV2(beforeTimeline.infinityBoundaryRemaining,cycleSegmentSeconds,'subtract'),
    infinityCycleSeconds:replayFiniteClockV2(beforeTimeline.infinityCycleSeconds,cycleSegmentSeconds,'add'),
    storedTimeAvailableSeconds:expectedResourceTimeline.storedTimeAvailableSeconds,
    doubleTime:expectedResourceTimeline.doubleTime,
  })
  const operationBound=automationExecutionsPerCycle*128+1
  if(!compatibleFastDreamClockV2(afterTimeline.infinityBoundaryRemaining,expectedTimeline.infinityBoundaryRemaining,beforeTimeline.infinityBoundaryRemaining,operationBound)||!compatibleFastDreamClockV2(afterTimeline.infinityCycleSeconds,expectedTimeline.infinityCycleSeconds,beforeTimeline.infinityCycleSeconds,operationBound)||!compatibleFastDreamClockV2(afterTimeline.storedTimeAvailableSeconds,expectedTimeline.storedTimeAvailableSeconds,beforeTimeline.storedTimeAvailableSeconds,operationBound)||!compatibleFastDreamClockV2(afterTimeline.doubleTime.bankSeconds,expectedTimeline.doubleTime.bankSeconds,beforeTimeline.doubleTime.bankSeconds,operationBound))return null
  const canonicalizedAfterTimeline=Object.freeze({...afterTimeline,infinityBoundaryRemaining:expectedTimeline.infinityBoundaryRemaining,infinityCycleSeconds:expectedTimeline.infinityCycleSeconds,storedTimeAvailableSeconds:expectedTimeline.storedTimeAvailableSeconds,doubleTime:Object.freeze({...afterTimeline.doubleTime,bankSeconds:expectedTimeline.doubleTime.bankSeconds})})
  const expectedTracked=replayFiniteClockV2(before.statistics.trackedSimulatedSeconds,cycleSegmentSeconds,'add')
  if(!equalPreparedTreeV2(canonicalizedAfterTimeline,expectedTimeline)||!compatibleFastDreamClockV2(after.statistics.trackedSimulatedSeconds,expectedTracked,before.statistics.trackedSimulatedSeconds,operationBound)||!equalPreparedTreeV2(previous.runtime,current.runtime))return null
  const canonicalizedDream=canonicalizeFastDreamCycleTimingV2(before.dream,after.dream,operationBound)
  if(canonicalizedDream===null)return null
  const normalizedAfter=Object.freeze({...after,dream:Object.freeze({...canonicalizedDream,resetCount:before.dream.resetCount,strangeMatter:before.dream.strangeMatter}),timeline:before.timeline,statistics:normalizeFastCycleStatisticsV2(after.statistics,before.statistics)})
  if(!equalPreparedTreeV2(before,normalizedAfter))return null
  return Object.freeze({...before.dream,resetCount:after.dream.resetCount,strangeMatter:after.dream.strangeMatter})
}

function canonicalizeFastDreamCycleTimingV2(before:CanonicalGameStateV2['dream'],after:CanonicalGameStateV2['dream'],operationBound:number):CanonicalGameStateV2['dream']|null{
  for(const id of Object.keys(before.timers) as (keyof typeof before.timers)[])if(!compatibleFastDreamClockV2(after.timers[id],before.timers[id],before.timers[id],operationBound))return null
  if(!compatibleFastDreamClockV2(after.parameters.communityBoostClock,before.parameters.communityBoostClock,before.parameters.communityBoostClock,operationBound)||!compatibleFastDreamClockV2(after.parameters.factoriesBoostClock,before.parameters.factoriesBoostClock,before.parameters.factoriesBoostClock,operationBound)||!compatibleFastDreamClockV2(after.railgun.fireProgress,before.railgun.fireProgress,before.railgun.fireProgress,operationBound)||!compatibleFastDreamClockV2(after.railgun.pendingBaseSeconds,before.railgun.pendingBaseSeconds,before.railgun.pendingBaseSeconds,operationBound)||!compatibleFastDreamClockV2(after.railgun.pendingDreamSeconds,before.railgun.pendingDreamSeconds,before.railgun.pendingDreamSeconds,operationBound))return null
  return Object.freeze({...after,timers:before.timers,parameters:Object.freeze({...after.parameters,communityBoostClock:before.parameters.communityBoostClock,factoriesBoostClock:before.parameters.factoriesBoostClock}),railgun:Object.freeze({...after.railgun,fireProgress:before.railgun.fireProgress,pendingBaseSeconds:before.railgun.pendingBaseSeconds,pendingDreamSeconds:before.railgun.pendingDreamSeconds})})
}

function compatibleFastDreamClockV2(actual:number,expected:number,anchor:number,operationBound:number):boolean{
  if(!Number.isFinite(actual)||!Number.isFinite(expected)||!Number.isFinite(anchor))return false
  const magnitude=Math.max(1,Math.abs(actual),Math.abs(expected),Math.abs(anchor))
  const maximumRoundingDrift=Number.EPSILON*magnitude*operationBound*8
  return Math.abs(actual-expected)<=maximumRoundingDrift
}

function captureFastDreamCycleSegmentsV2(value:readonly number[],expectedLength:number):readonly number[]{
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length!==expectedLength)throw new TypeError('Prepared Fast Dream cycle segments must be one dense ordinary array entry per automation execution.')
  const descriptors=Object.getOwnPropertyDescriptors(value)
  const segments:number[]=[]
  for(let index=0;index<value.length;index+=1){const descriptor=descriptors[String(index)];if(descriptor===undefined||!('value'in descriptor)||!descriptor.enumerable||descriptor.get!==undefined||descriptor.set!==undefined||typeof descriptor.value!=='number'||!Number.isFinite(descriptor.value)||descriptor.value<=0)throw new TypeError('Prepared Fast Dream cycle segments must contain positive finite data values.');segments.push(descriptor.value)}
  if(Reflect.ownKeys(descriptors).some(key=>key!=='length'&&(!/^\d+$/.test(String(key))||Number(key)>=value.length)))throw new TypeError('Prepared Fast Dream cycle segments must be closed.')
  return Object.freeze(segments)
}

function replayFiniteClockV2(start:number,segments:readonly number[],operation:'add'|'subtract'):number{
  let value=start
  for(const seconds of segments){value=operation==='add'?value+seconds:Math.max(0,value-seconds);if(!Number.isFinite(value))throw new RangeError('Prepared Fast Dream cycle clock overflowed.')}
  return value
}

function normalizeFastCycleStatisticsV2(current:CanonicalGameStateV2['statistics'],previous:CanonicalGameStateV2['statistics']):CanonicalGameStateV2['statistics']{
  const totals=(value:CanonicalGameStateV2['statistics']['lifetime'],prior:CanonicalGameStateV2['statistics']['lifetime'])=>Object.freeze({...value,meteorDreamResets:prior.meteorDreamResets,aiDreamResets:prior.aiDreamResets,globalWarmingDreamResets:prior.globalWarmingDreamResets,blackHoleDreamResets:prior.blackHoleDreamResets,strangeMatter:prior.strangeMatter,realityCapacityStallSeconds:prior.realityCapacityStallSeconds,simulatedSeconds:prior.simulatedSeconds})
  return Object.freeze({...current,trackedSinceUpdate:previous.trackedSinceUpdate,trackingStartedMarker:previous.trackingStartedMarker,trackedSimulatedSeconds:previous.trackedSimulatedSeconds,lifetime:totals(current.lifetime,previous.lifetime),currentQuantumRun:totals(current.currentQuantumRun,previous.currentQuantumRun),recentProcessedSegment:totals(current.recentProcessedSegment,previous.recentProcessedSegment),lastCompletedCycle:previous.lastCompletedCycle,minuteWindows:previous.minuteWindows,halfHourWindows:previous.halfHourWindows,dailyWindows:previous.dailyWindows})
}

function equalPreparedTreeV2(left:unknown,right:unknown):boolean{if(Object.is(left,right))return true;if(left===null||right===null||typeof left!=='object'||typeof right!=='object'||Object.getPrototypeOf(left)!==Object.getPrototypeOf(right))return false;const leftKeys=Reflect.ownKeys(left),rightKeys=Reflect.ownKeys(right);return leftKeys.length===rightKeys.length&&leftKeys.every(key=>rightKeys.includes(key)&&equalPreparedTreeV2(Object.getOwnPropertyDescriptor(left,key)?.value,Object.getOwnPropertyDescriptor(right,key)?.value))}

interface StableAutomationFastForwardV2 {
  readonly carrier: Readonly<CanonicalEventTimeCarrierV2>
  readonly seconds: number
  readonly ticks: bigint
  readonly internalRevision: number
  readonly baseSimulationSeconds: number
  readonly dreamSimulationSeconds: number
  readonly storedTimeConsumedSeconds: number
  readonly realityWorkers: GameDecimal
  readonly automaticInfluence: GameDecimal
  readonly realityCapacityStallSeconds: number
}

/**
 * Exact narrow fast path: eight no-op automation rotations return the target
 * index to its source value. It is deliberately disabled for any production,
 * recurrence drift, Double Time, queued input, or competing event horizon.
 */
function tryFastForwardStableAutomationV2(
  carrier: Readonly<CanonicalEventTimeCarrierV2>,
  remainingSeconds: number,
  mode: V2TimeSliceMode,
  context: Readonly<CapturedEventTimeV2Context>,
  queuedInputs: readonly Readonly<CanonicalQueuedInputV2>[],
  internalRevision: number,
): Readonly<StableAutomationFastForwardV2> | undefined {
  if(dreamContinuousCanChange(carrier.state)||dreamAutomaticResetReadyPrepared(carrier.state))return undefined
  const hasActiveSkillTimer = CANONICAL_ACTIVE_SKILL_TIMER_IDS_V2.some(
    (id) => carrier.state.skills.byId[id]!.owned,
  )
  if (
    hasActiveSkillTimer &&
    context.timerAggregationAuthority === null
  ) return undefined
  const interval = context.automationIntervalSeconds
  const automationRotationCycleTicks = leastCommonMultiple(
    DYSON_V2_COMMAND_TARGETS.length,
    carrier.state.infinity.automationUnlocked.research
      ? RESEARCH_V2_IDS.length
      : 1,
  )
  const cycleSeconds = interval * automationRotationCycleTicks
  if (
    queuedInputs.length !== 0 ||
    Object.values(context.dormantDueEvents).some(Boolean) ||
    !Number.isFinite(cycleSeconds) ||
    remainingSeconds <= cycleSeconds ||
    carrier.state.timeline.automationTimeUntilNextEvent !== interval ||
    carrier.state.timeline.infinityBoundaryRemaining <= cycleSeconds ||
    (carrier.state.timeline.doubleTime.unlocked &&
      carrier.state.timeline.doubleTime.bankSeconds > 0 &&
      carrier.state.timeline.doubleTime.rate > 0)
  ) return undefined
  const derived = deriveDysonV2FromCauses(
    carrier.state,
    carrier.runtime,
    context.catalogLookup,
  )
  if (
    !PRODUCTION_RATE_KEYS.every((key) =>
      equalGameDecimals(derived.production.rates[key], GAME_DECIMAL_ZERO),
    ) ||
    publishEvaluationSnapshot(
      carrier.runtime,
      derived.nextEvaluationSnapshot,
    ) !== carrier.runtime ||
    isDysonGoalCompleteV2(
      carrier.state,
      carrier.state.dyson.goalStage,
      derived.nextEvaluationSnapshot,
    )
  ) return undefined

  const dysonAutomationProvablyDisabled =
    !carrier.state.infinity.automationUnlocked.bots ||
    Object.values(carrier.state.dyson.automation.enabledFacilities)
      .every((enabled) => !enabled)
  const researchAutomationProvablyDisabled =
    !carrier.state.infinity.automationUnlocked.research ||
    Object.values(carrier.state.research.automation.enabledById)
      .every((enabled) => !enabled)
  let probeState = carrier.state as CanonicalGameStateV2
  let probeRevision = internalRevision
  if (dysonAutomationProvablyDisabled && researchAutomationProvablyDisabled) {
    // A disabled sweep still advances the canonical automation phase/revision.
    // The full rotation returns both target indexes to their source values, so
    // no quote construction is needed to prove this particular cycle is inert.
    probeRevision += automationRotationCycleTicks * (
      carrier.state.infinity.automationUnlocked.research ? 2 : 1
    )
  } else {
    for (let index = 0; index < automationRotationCycleTicks; index += 1) {
      const dysonProbe = runV2DysonAutomationTick(
        probeState,
        probeRevision,
        mode === 'stored-time' ? 'force-buy-max' : 'preserve-configured-mode',
      )
      if (dysonProbe.attempts.some((attempt) => attempt.result.changed)) return undefined
      if (dysonProbe.state.infinity.automationUnlocked.research) {
        const researchProbe = runV2ResearchAutomationTick(
          dysonProbe.state,
          carrier.runtime,
          dysonProbe.revision,
          mode === 'stored-time' ? 'force-buy-max' : 'preserve-configured-mode',
        )
        if (researchProbe.attempts.some((attempt) => attempt.result.changed)) return undefined
        probeState = researchProbe.state
        probeRevision = researchProbe.revision
      } else {
        probeState = dysonProbe.state
        probeRevision = dysonProbe.revision
      }
    }
  }
  if (
    probeState.timeline.dysonAutomationTargetIndex !==
      carrier.state.timeline.dysonAutomationTargetIndex ||
    probeState.timeline.researchAutomationTargetIndex !==
      carrier.state.timeline.researchAutomationTargetIndex
  ) return undefined
  const internalRevisionsPerCycle = probeRevision - internalRevision
  if (!Number.isSafeInteger(internalRevisionsPerCycle) || internalRevisionsPerCycle < 1) {
    return undefined
  }

  let cycles = Math.floor(remainingSeconds / cycleSeconds)
  if (cycles * cycleSeconds >= remainingSeconds) cycles -= 1
  if (cycles <= 0) return undefined
  const endpointForCycles = (cycleCount: number) => {
    const seconds = cycleCount * cycleSeconds
    if (seconds >= carrier.state.timeline.infinityBoundaryRemaining) return undefined
    const infinityCycleSeconds = carrier.state.timeline.infinityCycleSeconds + seconds
    if (!Number.isFinite(infinityCycleSeconds)) return undefined
    const clockedTimeline = Object.freeze({
      ...carrier.state.timeline,
      automationTimeUntilNextEvent: interval,
      infinityBoundaryRemaining:
        carrier.state.timeline.infinityBoundaryRemaining - seconds,
      infinityCycleSeconds,
    })
    const resource = advanceV2TimeResourceSlice(clockedTimeline, mode, seconds)
    if (resource.status !== 'ready') return undefined
    const clockedState = Object.freeze({
      ...carrier.state,
      timeline: resource.timeline,
    }) as CanonicalGameStateV2
  const reality = advancePreparedRealityWorkersV2(clockedState, seconds)
    if (!reality.accepted) return undefined
    const statistics = recordRealityStatisticsSegmentV2(
      reality.state.statistics,
      seconds,
      Object.freeze({
      workersGenerated: reality.workersGenerated,
      workerGenerationStartProgress:
        carrier.state.reality.workerGenerationProgress,
      generationPerSecond: reality.generationPerSecond,
      automaticInfluence: reality.automaticInfluence,
        manualInfluence: GAME_DECIMAL_ZERO,
        stalledSeconds: reality.stalledSeconds,
      }),
    )
    let state = Object.freeze({
      ...reality.state,
      statistics,
    }) as CanonicalGameStateV2
    if (hasActiveSkillTimer) {
      state = advancePreparedSkillTimersForFastV2(state, seconds)
    }
    const endpoint = deriveDysonV2FromCauses(
      state,
      carrier.runtime,
      context.catalogLookup,
    )
    return Object.freeze({
      seconds,
      state,
      runtime: publishEvaluationSnapshot(
        carrier.runtime,
        endpoint.nextEvaluationSnapshot,
      ),
      resource,
      reality,
      goalComplete: isDysonGoalCompleteV2(
        state,
        state.dyson.goalStage,
        endpoint.nextEvaluationSnapshot,
      ),
    })
  }
  let endpoint = endpointForCycles(cycles)
  if (endpoint === undefined) return undefined
  if (endpoint.goalComplete) {
    let low = 1
    let high = cycles
    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      const candidate = endpointForCycles(middle)
      if (candidate === undefined) return undefined
      if (candidate.goalComplete) high = middle
      else low = middle + 1
    }
    cycles = low - 1
    if (cycles <= 0) return undefined
    endpoint = endpointForCycles(cycles)
    if (endpoint === undefined || endpoint.goalComplete) return undefined
  }
  const seconds = endpoint.seconds
  const state = endpoint.state
  const ticks = BigInt(cycles * automationRotationCycleTicks)
  const nextInternalRevision = internalRevision + cycles * internalRevisionsPerCycle
  if (!Number.isSafeInteger(nextInternalRevision)) return undefined
  return Object.freeze({
    carrier: Object.freeze({ ...carrier, state, runtime: endpoint.runtime }),
    seconds,
    ticks,
    internalRevision: nextInternalRevision,
    baseSimulationSeconds: endpoint.resource.baseSimulationSeconds,
    dreamSimulationSeconds: endpoint.resource.dreamSimulationSeconds,
    storedTimeConsumedSeconds: endpoint.resource.storedTimeConsumedSeconds,
    realityWorkers: endpoint.reality.workersGenerated,
    automaticInfluence: endpoint.reality.automaticInfluence,
    realityCapacityStallSeconds: endpoint.reality.stalledSeconds,
  })
}

function advancePreparedSkillTimersForFastV2(
  state: Readonly<CanonicalGameStateV2>,
  seconds: number,
): Readonly<CanonicalGameStateV2> {
  const byId = { ...state.skills.byId }
  let changed = false
  for (const id of CANONICAL_ACTIVE_SKILL_TIMER_IDS_V2) {
    const runtime = byId[id]!
    if (!runtime.owned) continue
    const timerSeconds = Math.min(
      Number.MAX_VALUE,
      runtime.timerSeconds + seconds,
    )
    if (timerSeconds === runtime.timerSeconds) continue
    byId[id] = Object.freeze({ ...runtime, timerSeconds })
    changed = true
  }
  if (!changed) return state
  const frozenById = Object.freeze(byId)
  inheritPreparedDysonV2SkillPlanForFastV2(
    preparedSkillPlanInheritanceAuthority,
    state.skills.byId,
    frozenById,
  )
  return Object.freeze({
    ...state,
    skills: Object.freeze({
      ...state.skills,
      byId: frozenById,
    }),
  }) as CanonicalGameStateV2
}

function applyOrderedBoundaryHandlers(
  startingCarrier: Readonly<CanonicalEventTimeCarrierV2>,
  pending: Readonly<PendingBoundary>,
  context: Readonly<CapturedEventTimeV2Context>,
  queuedInputs: readonly Readonly<CanonicalQueuedInputV2>[],
  automationPolicy: DysonV2AutomationPolicy,
  startingInternalRevision: number,
  summary: MutableSummary,
  elapsedSeconds: number,
): Readonly<BoundaryOutcome> {
  let carrier = startingCarrier
  let changed = false
  let internalRevision = startingInternalRevision
  let diagnosticCode: string | undefined
  const handlers = Object.freeze([
    Object.freeze({
      phase: 'production-arrival' as const,
      apply: () => undefined,
    }),
    Object.freeze({
      phase: 'queued-input' as const,
      apply: () => {
        for (const input of queuedInputs) {
          if (!pending.queuedInputIds.includes(input.id)) continue
          if(input.commandKind==='dyson-facility-purchase'){
            const quote=quoteV2DysonFacilityPurchase(carrier.state as CanonicalGameStateV2,internalRevision,input.facilityId,input.requestedMode,input.roundedBulkBuy),committed=commitV2DysonFacilityPurchase(quote,carrier.state as CanonicalGameStateV2,internalRevision)
            if(!committed.accepted)continue
            if(committed.state!==carrier.state){carrier=Object.freeze({...carrier,state:committed.state});changed=true}
            internalRevision=committed.revision
            if(summary.quantumResetCount+summary.quantumEntanglementCount>0n){summary.quantumAvailableShardsFinal=carrier.state.quantum.availableShards;summary.quantumLifetimeShardsFinal=carrier.state.quantum.lifetimeEarnedShards;summary.quantumInfinityAvailableFinal=carrier.state.infinity.availablePoints;summary.quantumInfinityAllocatedFinal=carrier.state.infinity.allocatedPoints}
          }else if(input.commandKind==='quantum-upgrade-purchase'){
            const quote=quoteQuantumUpgradeV2(carrier.state as CanonicalGameStateV2,internalRevision,input.upgradeId,input.requestedMode),committed=commitQuantumUpgradeV2(quote,carrier.state as CanonicalGameStateV2,internalRevision)
            if(!committed.accepted)continue
            if(committed.state!==carrier.state){carrier=Object.freeze({...carrier,state:committed.state});changed=true}
            internalRevision=committed.revision
            if(summary.quantumResetCount+summary.quantumEntanglementCount>0n){summary.quantumAvailableShardsFinal=carrier.state.quantum.availableShards;summary.quantumLifetimeShardsFinal=carrier.state.quantum.lifetimeEarnedShards;summary.quantumInfinityAvailableFinal=carrier.state.infinity.availablePoints;summary.quantumInfinityAllocatedFinal=carrier.state.infinity.allocatedPoints}
          }else{
            const publication=Object.freeze({revision:internalRevision,state:carrier.state,runtime:carrier.runtime}),quote=quoteCanonicalQuantumResetV2(publication,Object.freeze({kind:'quantum-action' as const})),committed=commitCanonicalQuantumResetV2(quote,publication)
            if(!committed.accepted||committed.publication===null)continue
            carrier=Object.freeze({state:committed.publication.state,runtime:committed.publication.runtime,revision:carrier.revision});internalRevision=committed.publication.revision;changed=true
            if(quote.operation==='ordinary-leap')summary.quantumResetCount+=1n;else if(quote.operation==='entanglement')summary.quantumEntanglementCount+=1n
            summary.quantumAvailableShardsEffective=addGameDecimals(summary.quantumAvailableShardsEffective,quote.effectiveAvailableShards)
            summary.quantumLifetimeShardsEffective=addGameDecimals(summary.quantumLifetimeShardsEffective,quote.effectiveLifetimeShards)
            summary.quantumInfinityPointsConsumed=addGameDecimals(summary.quantumInfinityPointsConsumed,quote.infinityPointsConsumed)
            summary.quantumAvailableShardsFinal=carrier.state.quantum.availableShards
            summary.quantumLifetimeShardsFinal=carrier.state.quantum.lifetimeEarnedShards
            summary.quantumInfinityAvailableFinal=carrier.state.infinity.availablePoints
            summary.quantumInfinityAllocatedFinal=carrier.state.infinity.allocatedPoints
            summary.quantumResetSkillPointsFinal=quote.operation==='ordinary-leap'?quote.resetSkillPoints:null
          }
        }
      },
    }),
    Object.freeze({
      phase: 'automation' as const,
      apply: () => {
        if (!pending.automationDue) return
        const certifiedNoOpAdvance = certifyCanonicalNoOpAutomationTickV2(
          carrier.state,
          internalRevision,
        )
        const researchAutomated = certifiedNoOpAdvance ?? (() => {
          const dysonAutomated = runV2DysonAutomationTick(
            carrier.state as CanonicalGameStateV2,
            internalRevision,
            automationPolicy,
          )
          return dysonAutomated.state.infinity.automationUnlocked.research
            ? runV2ResearchAutomationTick(
                dysonAutomated.state,
                carrier.runtime,
                dysonAutomated.revision,
                automationPolicy,
              )
            : Object.freeze({
                state: dysonAutomated.state,
                revision: dysonAutomated.revision,
              })
        })()
        const converted=runDreamConversionsV2(prepareCanonicalDreamKernelStateV2(dreamKernelAuthority,researchAutomated.state as CanonicalGameStateV2))
        if(!converted.accepted){diagnosticCode='V2_DREAM_CONVERSION_FAILED';return}
        let automatedState=converted.state
        const pendingBaseSeconds=automatedState.dream.railgun.pendingBaseSeconds,pendingDreamSeconds=automatedState.dream.railgun.pendingDreamSeconds
        if((automatedState.dream.upgrades.railguns1||automatedState.dream.railgun.firing)&&pendingBaseSeconds>0){
          const railgunSeconds=pendingBaseSeconds
          if(railgunSeconds>1){diagnosticCode='V2_DREAM_RAILGUN_INTERVAL_UNBOUNDED';return}
          const railgunMultiplier=pendingDreamSeconds/pendingBaseSeconds,consumedBank=Math.max(0,pendingDreamSeconds-pendingBaseSeconds),publishedTimeline=automatedState.timeline,authorizedTimeline=Object.freeze({...publishedTimeline,doubleTime:Object.freeze({...publishedTimeline.doubleTime,bankSeconds:publishedTimeline.doubleTime.bankSeconds+consumedBank})}),railgunInput=Object.freeze({...automatedState,timeline:authorizedTimeline}) as CanonicalGameStateV2,railgun=advanceDreamRailgunV2(railgunInput,railgunSeconds,gameDecimalFromNumber(railgunMultiplier))
          if(!railgun.accepted){diagnosticCode='V2_DREAM_RAILGUN_AUTOMATION_REJECTED';return}
          automatedState=Object.freeze({...railgun.state,timeline:publishedTimeline}) as CanonicalGameStateV2
        }
        if(pendingBaseSeconds!==0||pendingDreamSeconds!==0)automatedState=Object.freeze({...automatedState,dream:Object.freeze({...automatedState.dream,railgun:Object.freeze({...automatedState.dream.railgun,pendingBaseSeconds:0,pendingDreamSeconds:0})})}) as CanonicalGameStateV2
        const timeline = Object.freeze({
          ...automatedState.timeline,
          automationTimeUntilNextEvent: context.automationIntervalSeconds,
        })
        carrier = Object.freeze({
          state: Object.freeze({ ...automatedState, timeline }) as CanonicalGameStateV2,
          runtime: carrier.runtime,
          revision: carrier.revision,
        })
        internalRevision = researchAutomated.revision
        if (summary.detailed) summary.automationTicks += 1n
        changed = true
      },
    }),
    Object.freeze({
      phase: 'derived-timers-and-double-time' as const,
      apply: () => {
        if (context.dormantDueEvents.reality) {
          diagnosticCode = 'V2_UNPORTED_REALITY_EVENT_DUE'
          return
        }
        const goals = advanceDysonGoalProgressionV2(
          carrier.state,
          carrier.runtime,
          context.catalogLookup,
        )
        if (!goals.ok) {
          diagnosticCode = goals.diagnosticCode
          return
        }
        if (goals.state !== carrier.state) {
          carrier = Object.freeze({ ...carrier, state: goals.state })
          if (summary.detailed) {
            summary.goalStagesCompleted.push(...goals.completedStages)
          }
          changed = true
        }
        const runtime = publishEvaluationSnapshot(
          carrier.runtime,
          goals.finalized.nextEvaluationSnapshot,
        )
        changed ||= runtime !== carrier.runtime
        if (runtime !== carrier.runtime) carrier = Object.freeze({ ...carrier, runtime })
      },
    }),
    Object.freeze({
      phase: 'dream-reset' as const,
      apply: () => {
        if(!pending.dreamResetDue&&!context.dormantDueEvents.dreamReset&&!dreamAutomaticResetReadyPrepared(carrier.state))return
        const publication=Object.freeze({revision:internalRevision,state:carrier.state,runtime:carrier.runtime}),quote=quotePreparedCanonicalAutomaticDreamResetV2(preparedDreamResetAuthority,publication)
        if(!quote.accepted){diagnosticCode=quote.code==='reset-count-saturated'?'V2_DREAM_RESET_SATURATED':'V2_DREAM_RESET_NOT_READY';return}
        const committed=commitPreparedCanonicalDreamResetV2(preparedDreamResetAuthority,quote,publication)
        if(!committed.accepted||committed.publication===null){diagnosticCode='V2_DREAM_RESET_FAILED';return}
        carrier=Object.freeze({state:committed.publication.state,runtime:committed.publication.runtime,revision:carrier.revision});internalRevision=committed.publication.revision;summary.dreamResetCount+=1n;if(quote.cause==='Meteor')summary.dreamMeteorResetCount+=1n;else if(quote.cause==='ArtificialIntelligence')summary.dreamAiResetCount+=1n;else if(quote.cause==='GlobalWarming')summary.dreamGlobalWarmingResetCount+=1n;else if(quote.cause==='BlackHole')summary.dreamBlackHoleResetCount+=1n;summary.dreamStrangeMatterRequested=addGameDecimals(summary.dreamStrangeMatterRequested,quote.requestedReward);summary.dreamStrangeMatterEffective=addGameDecimals(summary.dreamStrangeMatterEffective,quote.effectiveReward);summary.dreamStrangeMatterFinal=carrier.state.dream.strangeMatter;summary.dreamLifetimeStrangeMatterFinal=carrier.state.statistics.lifetime.strangeMatter;summary.dreamCurrentQuantumRunStrangeMatterFinal=carrier.state.statistics.currentQuantumRun.strangeMatter;summary.dreamRecentProcessedSegmentStrangeMatterFinal=carrier.state.statistics.recentProcessedSegment.strangeMatter;changed=true
      },
    }),
    Object.freeze({
      phase: 'bot-cap-transition' as const,
      apply: () => {
        if (context.dormantDueEvents.botCapTransition) {
          diagnosticCode = 'V2_UNPORTED_BOT_CAP_DUE'
        }
      },
    }),
    Object.freeze({
      phase: 'infinity-reset' as const,
      apply: () => {
        if (pending.infinityDue || context.dormantDueEvents.infinityReset) {
          // A queued Quantum leap runs earlier in this same canonical boundary and
          // rebuilds the Infinity horizon.  Never apply the stale tick-start due
          // bit to that post-leap state; Entanglement leaves the due horizon at
          // zero and therefore still precedes the authentic Infinity reset.
          if (
            pending.infinityDue &&
            !context.dormantDueEvents.infinityReset &&
            carrier.state.timeline.infinityBoundaryRemaining > 0
          ) return
          try {
            const evaluation = quoteInfinityResetBoundaryV2(
              carrier.state,
              carrier.runtime,
              internalRevision,
              context.infinityRewardAuthority,
            )
            if (!evaluation.ready) {
              diagnosticCode = 'V2_INFINITY_RESET_NOT_READY'
              return
            }
            const reset = commitCanonicalInfinityResetV2(
              evaluation,
              carrier.state,
              carrier.runtime,
              internalRevision,
            )
            carrier = Object.freeze({
              state: reset.state,
              runtime: reset.runtime,
              revision: carrier.revision,
            })
            internalRevision = reset.revision
            summary.infinityResetCount += 1n
            summary.lastInfinityResetElapsedSeconds = elapsedSeconds
            if(summary.quantumResetCount+summary.quantumEntanglementCount>0n){summary.quantumAvailableShardsFinal=carrier.state.quantum.availableShards;summary.quantumLifetimeShardsFinal=carrier.state.quantum.lifetimeEarnedShards;summary.quantumInfinityAvailableFinal=carrier.state.infinity.availablePoints;summary.quantumInfinityAllocatedFinal=carrier.state.infinity.allocatedPoints}
            changed = true
          } catch {
            diagnosticCode = 'V2_INFINITY_RESET_FAILED'
          }
        }
      },
    }),
  ])
  for (const handler of handlers) {
    if (
      handler.phase === 'infinity-reset' &&
      context.quantumEpochAuthority !== null &&
      issuedQuantumEpochAuthorities.get(context.quantumEpochAuthority) === 'preparing-infinity'
    ) break
    if (summary.detailed) {
      recordBoundaryPhase(
        summary,
        handler.phase,
        boundaryPhaseWasDue(handler.phase, pending, context.dormantDueEvents),
      )
    }
    handler.apply()
    if (
      handler.phase === 'queued-input' &&
      context.quantumEpochAuthority !== null &&
      issuedQuantumEpochAuthorities.get(context.quantumEpochAuthority) === 'awaiting-action'
    ) break
    if (diagnosticCode !== undefined) break
  }
  return Object.freeze({ carrier, changed, internalRevision, diagnosticCode })
}

function eventCandidates(
  carrier: Readonly<CanonicalEventTimeCarrierV2>,
  dormant: Readonly<CanonicalV2DormantDueEvents>,
  queuedInputs: readonly Readonly<CanonicalQueuedInputV2>[],
  processedQueuedInputs: ReadonlySet<string>,
  consumedSeconds: number,
) {
  const candidates: { readonly id: string; readonly horizon: GameDecimal }[] = [
    Object.freeze({
      id: 'automation',
      horizon: gameDecimalFromNumber(
        carrier.state.timeline.automationTimeUntilNextEvent,
      ),
    }),
    Object.freeze({
      id: 'canonical-infinity',
      horizon: gameDecimalFromNumber(
        carrier.state.timeline.infinityBoundaryRemaining,
      ),
    }),
  ]
  if (dormant.reality) candidates.push(Object.freeze({ id: 'reality', horizon: GAME_DECIMAL_ZERO }))
  if (dormant.dreamReset||dreamAutomaticResetReadyPrepared(carrier.state)) candidates.push(Object.freeze({ id: 'dream-reset', horizon: GAME_DECIMAL_ZERO }))
  if(carrier.state.dream.parameters.communityBoostClock>0)candidates.push(Object.freeze({id:'dream-community-boost-end',horizon:gameDecimalFromNumber(carrier.state.dream.parameters.communityBoostClock)}))
  if(carrier.state.dream.parameters.factoriesBoostClock>0)candidates.push(Object.freeze({id:'dream-factories-boost-end',horizon:gameDecimalFromNumber(carrier.state.dream.parameters.factoriesBoostClock)}))
  if (dormant.botCapTransition) candidates.push(Object.freeze({ id: 'bot-cap', horizon: GAME_DECIMAL_ZERO }))
  if (dormant.infinityReset) candidates.push(Object.freeze({ id: 'infinity-reset', horizon: GAME_DECIMAL_ZERO }))
  for (const input of queuedInputs) {
    if (processedQueuedInputs.has(input.id)) continue
    candidates.push(Object.freeze({
      id: `queued-input:${input.id}`,
      horizon: gameDecimalFromNumber(Math.max(0, input.horizonSeconds - consumedSeconds)),
    }))
  }
  return Object.freeze(candidates)
}

function initializeEventClock(
  carrier: Readonly<CanonicalEventTimeCarrierV2>,
  context: Readonly<Pick<
    CapturedEventTimeV2Context,
    'catalogLookup' | 'infinityRewardAuthority' | 'automationIntervalSeconds'
  >>,
): Readonly<CanonicalEventTimeCarrierV2> {
  if (carrier.state.timeline.eventClockInitialized) return carrier
  const derived = deriveDysonV2FromCauses(
    carrier.state,
    carrier.runtime,
    context.catalogLookup,
  )
  const boundary = quotePreparedCanonicalInfinityResetV2(
    preparedInfinityInitializationAuthority,
    carrier.state,
    carrier.runtime,
    carrier.revision,
    context.infinityRewardAuthority,
  )
  const infinityBoundaryRemaining = infinityBoundaryCountdownSecondsV2(
    infinityProductionHorizonV2(
      carrier.state.dyson.bots,
      derived.production.rates.bots,
      boundary.requiredBots,
    ),
  )
  const timeline = Object.freeze({
    ...carrier.state.timeline,
    eventClockInitialized: true,
    automationTimeUntilNextEvent:
      carrier.state.timeline.automationTimeUntilNextEvent > 0
        ? carrier.state.timeline.automationTimeUntilNextEvent
        : context.automationIntervalSeconds,
    infinityBoundaryRemaining,
  })
  return Object.freeze({
    ...carrier,
    state: Object.freeze({ ...carrier.state, timeline }) as CanonicalGameStateV2,
  })
}

function certifyCanonicalNoOpAutomationTickV2(
  state: Readonly<CanonicalGameStateV2>,
  sourceRevision: number,
): Readonly<{ state: CanonicalGameStateV2; revision: number }> | undefined {
  const researchUnlocked = state.infinity.automationUnlocked.research
  const dysonSweepDisabled =
    !state.infinity.automationUnlocked.bots ||
    Object.values(state.dyson.automation.enabledFacilities)
      .every((enabled) => !enabled)
  const researchSweepDisabled =
    !researchUnlocked ||
    (Object.values(state.research.automation.enabledById)
      .every((enabled) => !enabled) &&
      CAPPED_RESEARCH_V2_IDS.every(
        (id) => state.research.levelsById[id] === 1n,
      ))
  const zeroCurrencies =
    equalGameDecimals(state.dyson.money, GAME_DECIMAL_ZERO) &&
    equalGameDecimals(state.dyson.science, GAME_DECIMAL_ZERO)
  if (!(zeroCurrencies || (dysonSweepDisabled && researchSweepDisabled))) {
    return undefined
  }
  const revision = sourceRevision + (researchUnlocked ? 2 : 1)
  if (!Number.isSafeInteger(revision)) return undefined
  const timeline = Object.freeze({
    ...state.timeline,
    dysonAutomationTargetIndex:
      (state.timeline.dysonAutomationTargetIndex + 1) % DYSON_V2_COMMAND_TARGETS.length,
    researchAutomationTargetIndex: researchUnlocked
      ? (state.timeline.researchAutomationTargetIndex + 1) % RESEARCH_V2_IDS.length
      : state.timeline.researchAutomationTargetIndex,
  })
  return Object.freeze({
    state: Object.freeze({ ...state, timeline }) as CanonicalGameStateV2,
    revision,
  })
}

type DysonGoalProgressionV2Result =
  | Readonly<{
      ok: true
      state: Readonly<CanonicalGameStateV2>
      completedStages: readonly bigint[]
      finalized: ReturnType<typeof deriveDysonV2FromCauses>
    }>
  | Readonly<{
      ok: false
      diagnosticCode: 'V2_DYSON_GOAL_PROGRESSION_REJECTED'
    }>

interface GoalSkillDefinitionV2 {
  readonly id: string
  readonly cost: bigint
  readonly refundable: boolean
  readonly fragment: boolean
  readonly required: readonly string[]
  readonly shadowRequired: readonly string[]
  readonly exclusiveWith: readonly string[]
  readonly unlock:
    | 'always'
    | 'first-infinity'
    | 'fragments'
    | 'purity'
    | 'terra'
    | 'power'
    | 'paragade'
    | 'stellar'
}

/**
 * The authored ladder has exactly ten rewards, so catch-up is strictly bounded.
 * Skill auto-assignment is applied after each award, matching the V1 phase and
 * allowing each newly owned skill to affect the next derived goal check.
 */
function advanceDysonGoalProgressionV2(
  source: Readonly<CanonicalGameStateV2>,
  runtime: Readonly<CanonicalRuntimeSidecarV2>,
  lookup: DysonV2CatalogLookup | undefined,
): DysonGoalProgressionV2Result {
  let state = source
  const completedStages: bigint[] = []
  let finalized: ReturnType<typeof deriveDysonV2FromCauses> | undefined
  try {
    for (let pass = 0; pass < 10 && state.dyson.goalStage < 10n; pass += 1) {
      const derived = deriveDysonV2FromCauses(state, runtime, lookup)
      finalized = derived
      const stage = state.dyson.goalStage
      if (!isDysonGoalCompleteV2(state, stage, derived.nextEvaluationSnapshot)) break
      const awardedPoints = state.skills.points >= DISCRETE_MAXIMUM
        ? DISCRETE_MAXIMUM
        : state.skills.points + 1n
      state = Object.freeze({
        ...state,
        dyson: Object.freeze({ ...state.dyson, goalStage: stage + 1n }),
        skills: Object.freeze({ ...state.skills, points: awardedPoints }),
      }) as CanonicalGameStateV2
      state = runGoalSkillAutoAssignmentV2(state, lookup)
      completedStages.push(stage)
      finalized = undefined
    }
    finalized ??= deriveDysonV2FromCauses(state, runtime, lookup)
    return Object.freeze({
      ok: true,
      state,
      completedStages: Object.freeze(completedStages),
      finalized,
    })
  } catch {
    return Object.freeze({
      ok: false,
      diagnosticCode: 'V2_DYSON_GOAL_PROGRESSION_REJECTED',
    })
  }
}

function isDysonGoalCompleteV2(
  state: Readonly<CanonicalGameStateV2>,
  stage: bigint,
  snapshot: Readonly<CanonicalDysonEvaluationSnapshotV2>,
): boolean {
  const panelArea = multiplyGameDecimals(
    snapshot.panelsPerSecond,
    snapshot.panelLifetimeSeconds,
  )
  const stars = divideGameDecimals(panelArea, gameDecimalFromNumber(20_000))
  const galaxies = divideGameDecimals(stars, gameDecimalFromNumber(100_000_000_000))
  switch (stage) {
    case 0n:
      return compareGameDecimals(state.dyson.bots, gameDecimalFromNumber(10)) >= 0
    case 1n:
      return compareGameDecimals(
        state.dyson.facilities.assembly_lines[1],
        gameDecimalFromNumber(5),
      ) >= 0
    case 2n:
      return compareGameDecimals(panelArea, gameDecimalFromNumber(20_000)) >= 0
    case 3n: {
      const manualMultiplier = state.skills.byId.terraIrradiant?.owned === true ? 12 : 1
      const planets = addGameDecimals(
        state.dyson.facilities.planets[0],
        multiplyGameDecimals(
          state.dyson.facilities.planets[1],
          gameDecimalFromNumber(manualMultiplier),
        ),
      )
      return compareGameDecimals(planets, gameDecimalFromNumber(20)) >= 0
    }
    case 4n:
      return compareGameDecimals(
        state.dyson.totalPanelsDecayed,
        gameDecimalFromNumber(1_000_000_000_000),
      ) >= 0
    case 5n:
      return compareGameDecimals(stars, gameDecimalFromNumber(1_000_000_000)) >= 0
    case 6n:
      return compareGameDecimals(stars, gameDecimalFromNumber(10_000_000_000)) >= 0
    case 7n:
      return compareGameDecimals(galaxies, GAME_DECIMAL_ONE) > 0
    case 8n:
      return compareGameDecimals(galaxies, gameDecimalFromNumber(10)) > 0
    case 9n:
      return compareGameDecimals(galaxies, gameDecimalFromNumber(100)) > 0
    default:
      return false
  }
}

function runGoalSkillAutoAssignmentV2(
  state: Readonly<CanonicalGameStateV2>,
  lookup: DysonV2CatalogLookup | undefined,
): Readonly<CanonicalGameStateV2> {
  if (state.skills.activeAutoAssignment.length === 0 || state.skills.points <= 0n) {
    return state
  }
  let points = state.skills.points
  let fragments = state.skills.fragments
  const byId = { ...state.skills.byId }
  let changed = false
  let passesRemaining = state.skills.activeAutoAssignment.length
  let assignedAny: boolean
  do {
    assignedAny = false
    for (const id of state.skills.activeAutoAssignment) {
      const definition = goalSkillDefinitionV2(id, lookup)
      if (
        byId[id]?.owned === true ||
        points < definition.cost ||
        !isGoalSkillUnlockedV2(definition, state) ||
        !definition.required.every((required) => byId[required]?.owned === true) ||
        !definition.shadowRequired.every((required) => byId[required]?.owned === true) ||
        definition.exclusiveWith.some((exclusive) => byId[exclusive]?.owned === true) ||
        (!state.skills.autoAssignNonRefundable && !definition.refundable)
      ) continue
      points -= definition.cost
      fragments += definition.fragment ? 1n : 0n
      byId[id] = Object.freeze({
        ...(byId[id] ?? {
          owned: false,
          level: 0n,
          timerSeconds: 0,
          secondaryTimerSeconds: 0,
        }),
        owned: true,
      })
      assignedAny = true
      changed = true
      if (points <= 0n) break
    }
    passesRemaining -= 1
  } while (assignedAny && points > 0n && passesRemaining > 0)
  if (!changed) return state
  return Object.freeze({
    ...state,
    skills: Object.freeze({
      ...state.skills,
      points,
      fragments,
      byId: Object.freeze(byId),
    }),
  }) as CanonicalGameStateV2
}

function goalSkillDefinitionV2(
  id: string,
  lookup: DysonV2CatalogLookup | undefined,
): Readonly<GoalSkillDefinitionV2> {
  const asset = lookup?.('GameData.SkillDefinition', id)
  if (asset?.kind !== 'GameData.SkillDefinition' || asset.id !== id) {
    throw new Error(`V2 goal auto-assignment is missing Skill '${id}'.`)
  }
  const data = asset.data
  const boolean = (field: string): boolean => {
    const value = data[field]
    if (value === true || value === 1) return true
    if (value === false || value === 0) return false
    throw new Error(`V2 Skill '${id}' has invalid '${field}'.`)
  }
  const ids = (field: string): readonly string[] => {
    const value = data[field]
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
      throw new Error(`V2 Skill '${id}' has invalid '${field}'.`)
    }
    return value
  }
  const cost = data.cost
  if (typeof cost !== 'number' || !Number.isSafeInteger(cost) || cost < 0) {
    throw new Error(`V2 Skill '${id}' has invalid 'cost'.`)
  }
  const unlockFields = [
    ['firstRunBlocked', 'first-infinity'],
    ['isFragment', 'fragments'],
    ['purityLine', 'purity'],
    ['terraLine', 'terra'],
    ['powerLine', 'power'],
    ['paragadeLine', 'paragade'],
    ['stellarLine', 'stellar'],
  ] as const
  let unlock: GoalSkillDefinitionV2['unlock'] = 'always'
  for (const [field, candidate] of unlockFields) {
    if (boolean(field)) {
      unlock = candidate
      break
    }
  }
  return Object.freeze({
    id,
    cost: BigInt(cost),
    refundable: boolean('refundable'),
    fragment: boolean('isFragment'),
    required: ids('requiredSkillIds'),
    shadowRequired: ids('shadowRequirementIds'),
    exclusiveWith: ids('exclusiveWithIds'),
    unlock,
  })
}

function isGoalSkillUnlockedV2(
  definition: Readonly<GoalSkillDefinitionV2>,
  state: Readonly<CanonicalGameStateV2>,
): boolean {
  switch (definition.unlock) {
    case 'always': return true
    case 'first-infinity': return state.meta.firstInfinityComplete
    case 'fragments': return state.quantum.unlocks.fragments
    case 'purity': return state.quantum.unlocks.purity
    case 'terra': return state.quantum.unlocks.terra
    case 'power': return state.quantum.unlocks.power
    case 'paragade': return state.quantum.unlocks.paragade
    case 'stellar': return state.quantum.unlocks.stellar
  }
}

function publishEvaluationSnapshot(
  runtime: Readonly<CanonicalRuntimeSidecarV2>,
  snapshot: Readonly<CanonicalDysonEvaluationSnapshotV2>,
): Readonly<CanonicalRuntimeSidecarV2> {
  if (CANONICAL_DYSON_EVALUATION_SNAPSHOT_V2_KEYS.every((key) =>
    equalGameDecimals(runtime.dysonEvaluationSnapshot[key], snapshot[key]),
  )) return runtime
  return cloneCanonicalRuntimeSidecarV2({
    dysonEvaluationSnapshot: snapshot,
    dysonTuningProfile: runtime.dysonTuningProfile,
  })
}

function mergeProductionSummary(
  target: MutableSummary,
  source: Readonly<DysonV2ProductionSummary>,
): void {
  for (const key of PRODUCTION_RATE_KEYS) {
    target.generated[key] = addGameDecimals(target.generated[key], source.generated[key])
    target.effective[key] = addGameDecimals(target.effective[key], source.effective[key])
  }
  target.productionChanged ||= source.changed
}
function zeroDreamAmounts():Record<keyof DreamV2AmountSummary,GameDecimal>{return {community:GAME_DECIMAL_ZERO,housing:GAME_DECIMAL_ZERO,workers:GAME_DECIMAL_ZERO,factories:GAME_DECIMAL_ZERO,bots:GAME_DECIMAL_ZERO,rockets:GAME_DECIMAL_ZERO}}
function mergeDreamAmounts(target:Record<keyof DreamV2AmountSummary,GameDecimal>,source:Readonly<DreamV2AmountSummary>):void{for(const key of Object.keys(target) as (keyof DreamV2AmountSummary)[])target[key]=addGameDecimals(target[key],source[key])}

function createMutableSummary(detailed = true): MutableSummary {
  return {
    detailed,
    generated: zeroRates(),
    effective: zeroRates(),
    productionChanged: false,
    realityWorkers: GAME_DECIMAL_ZERO,
    automaticInfluence: GAME_DECIMAL_ZERO,
    dreamRequested:zeroDreamAmounts(),dreamEffective:zeroDreamAmounts(),dreamEnergyRequested:GAME_DECIMAL_ZERO,dreamEnergyEffective:GAME_DECIMAL_ZERO,dreamPanelsRequested:GAME_DECIMAL_ZERO,dreamPanelsEffective:GAME_DECIMAL_ZERO,dreamResetCount:0n,dreamMeteorResetCount:0n,dreamAiResetCount:0n,dreamGlobalWarmingResetCount:0n,dreamBlackHoleResetCount:0n,dreamStrangeMatterRequested:GAME_DECIMAL_ZERO,dreamStrangeMatterEffective:GAME_DECIMAL_ZERO,dreamStrangeMatterFinal:null,dreamLifetimeStrangeMatterFinal:null,dreamCurrentQuantumRunStrangeMatterFinal:null,dreamRecentProcessedSegmentStrangeMatterFinal:null,quantumResetCount:0n,quantumEntanglementCount:0n,quantumAvailableShardsEffective:GAME_DECIMAL_ZERO,quantumLifetimeShardsEffective:GAME_DECIMAL_ZERO,quantumInfinityPointsConsumed:GAME_DECIMAL_ZERO,quantumAvailableShardsFinal:null,quantumLifetimeShardsFinal:null,quantumInfinityAvailableFinal:null,quantumInfinityAllocatedFinal:null,quantumResetSkillPointsFinal:null,
    realityCapacityStallSeconds: 0,
    automationTicks: 0n,
    analyticallySkippedAutomationTicks: 0n,
    goalStagesCompleted: [],
    baseSimulationSeconds: 0,
    dreamSimulationSeconds: 0,
    storedTimeConsumedSeconds: 0,
    infinityResetCount: 0n,
    lastInfinityResetElapsedSeconds: null,
    boundaryPasses: zeroBoundaryPasses(),
    boundaryDigest: DIAGNOSTIC_DIGEST_OFFSET_V2,
  }
}

function cloneMutableSummary(source: MutableSummary): MutableSummary {
  return {
    detailed: source.detailed,
    generated: { ...source.generated },
    effective: { ...source.effective },
    productionChanged: source.productionChanged,
    realityWorkers: source.realityWorkers,
    automaticInfluence: source.automaticInfluence,
    dreamRequested:{...source.dreamRequested},dreamEffective:{...source.dreamEffective},dreamEnergyRequested:source.dreamEnergyRequested,dreamEnergyEffective:source.dreamEnergyEffective,dreamPanelsRequested:source.dreamPanelsRequested,dreamPanelsEffective:source.dreamPanelsEffective,dreamResetCount:source.dreamResetCount,dreamMeteorResetCount:source.dreamMeteorResetCount,dreamAiResetCount:source.dreamAiResetCount,dreamGlobalWarmingResetCount:source.dreamGlobalWarmingResetCount,dreamBlackHoleResetCount:source.dreamBlackHoleResetCount,dreamStrangeMatterRequested:source.dreamStrangeMatterRequested,dreamStrangeMatterEffective:source.dreamStrangeMatterEffective,dreamStrangeMatterFinal:source.dreamStrangeMatterFinal,dreamLifetimeStrangeMatterFinal:source.dreamLifetimeStrangeMatterFinal,dreamCurrentQuantumRunStrangeMatterFinal:source.dreamCurrentQuantumRunStrangeMatterFinal,dreamRecentProcessedSegmentStrangeMatterFinal:source.dreamRecentProcessedSegmentStrangeMatterFinal,quantumResetCount:source.quantumResetCount,quantumEntanglementCount:source.quantumEntanglementCount,quantumAvailableShardsEffective:source.quantumAvailableShardsEffective,quantumLifetimeShardsEffective:source.quantumLifetimeShardsEffective,quantumInfinityPointsConsumed:source.quantumInfinityPointsConsumed,quantumAvailableShardsFinal:source.quantumAvailableShardsFinal,quantumLifetimeShardsFinal:source.quantumLifetimeShardsFinal,quantumInfinityAvailableFinal:source.quantumInfinityAvailableFinal,quantumInfinityAllocatedFinal:source.quantumInfinityAllocatedFinal,quantumResetSkillPointsFinal:source.quantumResetSkillPointsFinal,
    realityCapacityStallSeconds: source.realityCapacityStallSeconds,
    automationTicks: source.automationTicks,
    analyticallySkippedAutomationTicks: source.analyticallySkippedAutomationTicks,
    goalStagesCompleted: [...source.goalStagesCompleted],
    baseSimulationSeconds: source.baseSimulationSeconds,
    dreamSimulationSeconds: source.dreamSimulationSeconds,
    storedTimeConsumedSeconds: source.storedTimeConsumedSeconds,
    infinityResetCount: source.infinityResetCount,
    lastInfinityResetElapsedSeconds: source.lastInfinityResetElapsedSeconds,
    boundaryPasses: { ...source.boundaryPasses },
    boundaryDigest: source.boundaryDigest,
  }
}

function mutableSummaryFromFrozen(
  source: Readonly<CanonicalEventTimeV2Summary>,
): MutableSummary {
  return {
    detailed: true,
    generated: { ...source.generated },
    effective: { ...source.effective },
    productionChanged: source.productionChanged,
    realityWorkers: source.realityWorkers,
    automaticInfluence: source.automaticInfluence,
    dreamRequested:{...source.dreamRequested},dreamEffective:{...source.dreamEffective},dreamEnergyRequested:source.dreamEnergyRequested,dreamEnergyEffective:source.dreamEnergyEffective,dreamPanelsRequested:source.dreamPanelsRequested,dreamPanelsEffective:source.dreamPanelsEffective,dreamResetCount:source.dreamResetCount,dreamMeteorResetCount:source.dreamMeteorResetCount,dreamAiResetCount:source.dreamAiResetCount,dreamGlobalWarmingResetCount:source.dreamGlobalWarmingResetCount,dreamBlackHoleResetCount:source.dreamBlackHoleResetCount,dreamStrangeMatterRequested:source.dreamStrangeMatterRequested,dreamStrangeMatterEffective:source.dreamStrangeMatterEffective,dreamStrangeMatterFinal:source.dreamStrangeMatterFinal,dreamLifetimeStrangeMatterFinal:source.dreamLifetimeStrangeMatterFinal,dreamCurrentQuantumRunStrangeMatterFinal:source.dreamCurrentQuantumRunStrangeMatterFinal,dreamRecentProcessedSegmentStrangeMatterFinal:source.dreamRecentProcessedSegmentStrangeMatterFinal,quantumResetCount:source.quantumResetCount,quantumEntanglementCount:source.quantumEntanglementCount,quantumAvailableShardsEffective:source.quantumAvailableShardsEffective,quantumLifetimeShardsEffective:source.quantumLifetimeShardsEffective,quantumInfinityPointsConsumed:source.quantumInfinityPointsConsumed,quantumAvailableShardsFinal:source.quantumAvailableShardsFinal,quantumLifetimeShardsFinal:source.quantumLifetimeShardsFinal,quantumInfinityAvailableFinal:source.quantumInfinityAvailableFinal,quantumInfinityAllocatedFinal:source.quantumInfinityAllocatedFinal,quantumResetSkillPointsFinal:source.quantumResetSkillPointsFinal,
    realityCapacityStallSeconds: source.realityCapacityStallSeconds,
    automationTicks: source.automationTicks,
    analyticallySkippedAutomationTicks: source.analyticallySkippedAutomationTicks,
    goalStagesCompleted: [...source.goalStagesCompleted],
    baseSimulationSeconds: source.baseSimulationSeconds,
    dreamSimulationSeconds: source.dreamSimulationSeconds,
    storedTimeConsumedSeconds: source.storedTimeConsumedSeconds,
    infinityResetCount: source.infinityResetCount,
    lastInfinityResetElapsedSeconds: source.lastInfinityResetElapsedSeconds,
    boundaryPasses: { ...source.boundaryPasses },
    boundaryDigest: BigInt(`0x${source.boundaryDigest}`),
  }
}

function issueContinuationV2(
  descriptor: ContinuationDescriptorV2,
): Readonly<CanonicalEventTimeV2Continuation> {
  validatedCanonicalStates.add(descriptor.candidateCarrier.state as object)
  validatedRuntimeSidecars.add(descriptor.candidateCarrier.runtime as object)
  const token = Object.freeze({
    kind: 'canonical-event-time-v2-continuation' as const,
  })
  continuationDescriptors.set(token, descriptor)
  return token
}

function remainingHorizonAfterV2(
  remaining: GameDecimal,
  consumedSeconds: number,
): GameDecimal {
  const consumed = gameDecimalFromNumber(consumedSeconds)
  return compareGameDecimals(consumed, remaining) >= 0
    ? GAME_DECIMAL_ZERO
    : subtractGameDecimals(remaining, consumed)
}

function schedulerSecondsForV2(remaining: GameDecimal): number {
  return gameDecimalToSchedulerSeconds(remaining, Number.MAX_VALUE).seconds
}

function zeroRates(): Record<keyof DysonV2ProductionRates, GameDecimal> {
  return Object.fromEntries(
    PRODUCTION_RATE_KEYS.map((key) => [key, GAME_DECIMAL_ZERO]),
  ) as Record<keyof DysonV2ProductionRates, GameDecimal>
}

function zeroBoundaryPasses(): Record<CanonicalEventBoundaryPhaseV2, bigint> {
  return Object.fromEntries(
    V2_EVENT_BOUNDARY_ORDER.map((phase) => [phase, 0n]),
  ) as Record<CanonicalEventBoundaryPhaseV2, bigint>
}

function recordBoundaryPhase(
  summary: MutableSummary,
  phase: CanonicalEventBoundaryPhaseV2,
  due: boolean,
): void {
  summary.boundaryPasses[phase] += 1n
  let digest = summary.boundaryDigest
  for (let index = 0; index < phase.length; index += 1) {
    digest ^= BigInt(phase.charCodeAt(index))
    digest = (digest * DIAGNOSTIC_DIGEST_PRIME_V2) &
      DIAGNOSTIC_DIGEST_MASK_V2
  }
  digest ^= due ? 0x31n : 0x30n
  digest = (digest * DIAGNOSTIC_DIGEST_PRIME_V2) &
    DIAGNOSTIC_DIGEST_MASK_V2
  digest ^= 0xffn
  summary.boundaryDigest = (digest * DIAGNOSTIC_DIGEST_PRIME_V2) &
    DIAGNOSTIC_DIGEST_MASK_V2
}

function boundaryPhaseWasDue(
  phase: CanonicalEventBoundaryPhaseV2,
  pending: Readonly<PendingBoundary>,
  dormant: Readonly<CanonicalV2DormantDueEvents>,
): boolean {
  switch (phase) {
    case 'production-arrival':
    case 'derived-timers-and-double-time':
      return true
    case 'queued-input':
      return pending.queuedInputIds.length > 0
    case 'automation':
      return pending.automationDue
    case 'dream-reset':
      return pending.dreamResetDue || dormant.dreamReset
    case 'bot-cap-transition':
      return dormant.botCapTransition
    case 'infinity-reset':
      return pending.infinityDue || dormant.infinityReset
  }
}

function canonicalBoundaryDigest(value: bigint): string {
  return value.toString(16).padStart(16, '0')
}

function freezeResult(
  carrier: Readonly<CanonicalEventTimeCarrierV2>,
  status: CanonicalEventTimeV2Status,
  requestedSeconds: number,
  consumedSeconds: number,
  materialEvents: number,
  summary: MutableSummary,
  automationPolicy: DysonV2AutomationPolicy,
  advanceActiveOnlyTinker: boolean,
  diagnosticCode?: string,
  zeroTimePasses = 0,
  continuation?: Readonly<CanonicalEventTimeV2Continuation>,
): Readonly<CanonicalEventTimeV2AdvanceResult> {
  if (
    status === 'completed' ||
    status === 'stored-time-exhausted' ||
    status === 'yielded'
  ) {
    validatedCanonicalStates.add(carrier.state as object)
    validatedRuntimeSidecars.add(carrier.runtime as object)
  }
  const frozenSummary = freezeSummaryV2(
    summary,
    automationPolicy,
    advanceActiveOnlyTinker,
  )
  return Object.freeze({
    carrier,
    status,
    consumedSeconds,
    remainingSeconds: Math.max(0, requestedSeconds - consumedSeconds),
    materialEvents,
    zeroTimePasses,
    summary: frozenSummary,
    ...(diagnosticCode === undefined ? {} : { diagnosticCode }),
    ...(continuation === undefined ? {} : { continuation }),
  })
}

function freezeSummaryV2(
  summary: MutableSummary,
  automationPolicy: DysonV2AutomationPolicy,
  advanceActiveOnlyTinker: boolean,
): Readonly<CanonicalEventTimeV2Summary> {
  return Object.freeze({
    generated: Object.freeze({ ...summary.generated }),
    effective: Object.freeze({ ...summary.effective }),
    productionChanged: summary.productionChanged,
    realityWorkers: summary.realityWorkers,
    automaticInfluence: summary.automaticInfluence,
    dreamRequested:Object.freeze({...summary.dreamRequested}),dreamEffective:Object.freeze({...summary.dreamEffective}),dreamEnergyRequested:summary.dreamEnergyRequested,dreamEnergyEffective:summary.dreamEnergyEffective,dreamPanelsRequested:summary.dreamPanelsRequested,dreamPanelsEffective:summary.dreamPanelsEffective,dreamResetCount:summary.dreamResetCount,dreamMeteorResetCount:summary.dreamMeteorResetCount,dreamAiResetCount:summary.dreamAiResetCount,dreamGlobalWarmingResetCount:summary.dreamGlobalWarmingResetCount,dreamBlackHoleResetCount:summary.dreamBlackHoleResetCount,dreamStrangeMatterRequested:summary.dreamStrangeMatterRequested,dreamStrangeMatterEffective:summary.dreamStrangeMatterEffective,dreamStrangeMatterFinal:summary.dreamStrangeMatterFinal,dreamLifetimeStrangeMatterFinal:summary.dreamLifetimeStrangeMatterFinal,dreamCurrentQuantumRunStrangeMatterFinal:summary.dreamCurrentQuantumRunStrangeMatterFinal,dreamRecentProcessedSegmentStrangeMatterFinal:summary.dreamRecentProcessedSegmentStrangeMatterFinal,quantumResetCount:summary.quantumResetCount,quantumEntanglementCount:summary.quantumEntanglementCount,quantumAvailableShardsEffective:summary.quantumAvailableShardsEffective,quantumLifetimeShardsEffective:summary.quantumLifetimeShardsEffective,quantumInfinityPointsConsumed:summary.quantumInfinityPointsConsumed,quantumAvailableShardsFinal:summary.quantumAvailableShardsFinal,quantumLifetimeShardsFinal:summary.quantumLifetimeShardsFinal,quantumInfinityAvailableFinal:summary.quantumInfinityAvailableFinal,quantumInfinityAllocatedFinal:summary.quantumInfinityAllocatedFinal,quantumResetSkillPointsFinal:summary.quantumResetSkillPointsFinal,
    realityCapacityStallSeconds: summary.realityCapacityStallSeconds,
    automationTicks: summary.automationTicks,
    analyticallySkippedAutomationTicks: summary.analyticallySkippedAutomationTicks,
    goalStagesCompleted: Object.freeze([...summary.goalStagesCompleted]),
    automationPolicy,
    advanceActiveOnlyTinker,
    baseSimulationSeconds: summary.baseSimulationSeconds,
    dreamSimulationSeconds: summary.dreamSimulationSeconds,
    storedTimeConsumedSeconds: summary.storedTimeConsumedSeconds,
    infinityResetCount: summary.infinityResetCount,
    lastInfinityResetElapsedSeconds: summary.lastInfinityResetElapsedSeconds,
    boundaryOrder: V2_EVENT_BOUNDARY_ORDER,
    boundaryPasses: Object.freeze({ ...summary.boundaryPasses }),
    boundaryDigest: canonicalBoundaryDigest(summary.boundaryDigest),
  })
}

function captureRequest(value: unknown): Readonly<CapturedEventTimeV2Request> {
  const request = closedDataProperties(value, [
    'carrier',
    'durationSeconds',
    'materialEventBudget',
    'mode',
    'context',
    'queuedInputs',
    'cancelRequested',
  ], 'V2 event request')
  const carrier = captureCarrier(dataValue(request, 'carrier', 'V2 event request'))
  const durationSeconds = dataValue(request, 'durationSeconds', 'V2 event request')
  const materialEventBudget = dataValue(
    request,
    'materialEventBudget',
    'V2 event request',
  )
  const mode = dataValue(request, 'mode', 'V2 event request')
  const context = captureContext(dataValue(request, 'context', 'V2 event request'))
  const queuedInputs = captureQueuedInputs(
    dataValue(request, 'queuedInputs', 'V2 event request'),
  )
  const cancelRequested = dataValue(request, 'cancelRequested', 'V2 event request')
  if (
    typeof durationSeconds !== 'number' ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    Object.is(durationSeconds, -0)
  ) {
    throw new RangeError('V2 event duration must be finite and positive.')
  }
  if (mode !== 'active' && mode !== 'stored-time') {
    throw new TypeError('V2 event mode is unsupported.')
  }
  if (mode === 'active' && context.timerAggregationAuthority !== null) {
    throw new TypeError('V2 Fast timer aggregation is restricted to Stored Time.')
  }
  if (
    typeof materialEventBudget !== 'number' ||
    !Number.isSafeInteger(materialEventBudget) ||
    materialEventBudget < 1 ||
    materialEventBudget > MAXIMUM_MATERIAL_EVENTS_PER_ADVANCE
  ) {
    throw new RangeError(
      `V2 material-event budget must be a safe integer from 1 through ${MAXIMUM_MATERIAL_EVENTS_PER_ADVANCE}.`,
    )
  }
  if (cancelRequested !== null && typeof cancelRequested !== 'function') {
    throw new TypeError('V2 cancellation probe must be a function or null.')
  }
  return Object.freeze({
    carrier,
    durationSeconds,
    materialEventBudget,
    mode,
    context,
    queuedInputs,
    cancelRequested: cancelRequested as (() => boolean) | null,
  })
}

function captureCarrier(value: unknown): Readonly<CanonicalEventTimeCarrierV2> {
  const carrier = closedDataProperties(
    value,
    ['state', 'runtime', 'revision'],
    'V2 event carrier',
  )
  const state = dataValue(carrier, 'state', 'V2 event carrier')
  const runtime = dataValue(carrier, 'runtime', 'V2 event carrier')
  const revision = dataValue(carrier, 'revision', 'V2 event carrier')
  if (
    typeof revision !== 'number' ||
    !Number.isSafeInteger(revision) ||
    revision < 0 ||
    revision === Number.MAX_SAFE_INTEGER
  ) {
    throw new TypeError('V2 event carrier must be frozen with an incrementable revision.')
  }
  const canonicalState = state as Readonly<CanonicalGameStateV2>
  if (!validatedCanonicalStates.has(canonicalState as object)) {
    assertFrozenDataGraph(state, 'V2 event carrier.state')
    const validation = validateCanonicalGameStateV2(canonicalState)
    if (!validation.valid) {
      throw new TypeError(`V2 event carrier state is invalid: ${validation.errors.join(' ')}`)
    }
    validateV2TimelineResources(canonicalState.timeline)
    validatedCanonicalStates.add(canonicalState as object)
  }
  if (
    runtime === null ||
    typeof runtime !== 'object' ||
    !validatedRuntimeSidecars.has(runtime)
  ) {
    cloneCanonicalRuntimeSidecarV2(
      runtime as Readonly<CanonicalRuntimeSidecarV2>,
    )
    validatedRuntimeSidecars.add(runtime as object)
  }
  return value as Readonly<CanonicalEventTimeCarrierV2>
}

function captureContext(value: unknown): Readonly<CapturedEventTimeV2Context> {
  const context = closedDataProperties(value, [
    'automationIntervalSeconds',
    'timerAggregationAuthority',
    'quantumEpochAuthority',
    'dormantDueEvents',
    'catalogLookup',
    'infinityRewardAuthority',
  ], 'V2 event context')
  const automationIntervalSeconds = dataValue(
    context,
    'automationIntervalSeconds',
    'V2 event context',
  )
  if (
    typeof automationIntervalSeconds !== 'number' ||
    !Number.isFinite(automationIntervalSeconds) ||
    automationIntervalSeconds <= 0
  ) throw new RangeError('V2 automation interval must be finite and positive.')
  const timerAggregationAuthority = dataValue(
    context,
    'timerAggregationAuthority',
    'V2 event context',
  )
  if (timerAggregationAuthority !== null) {
    if (
      typeof timerAggregationAuthority !== 'object' ||
      !issuedTimerAggregationAuthorities.has(timerAggregationAuthority)
    ) {
      throw new TypeError('V2 timer aggregation authority was not issued.')
    }
  }
  const quantumEpochAuthority = dataValue(
    context,
    'quantumEpochAuthority',
    'V2 event context',
  )
  if (quantumEpochAuthority !== null && (
    typeof quantumEpochAuthority !== 'object' ||
    !issuedQuantumEpochAuthorities.has(quantumEpochAuthority)
  )) throw new TypeError('V2 Quantum epoch authority was not issued.')
  const dormantProperties = closedDataProperties(
    dataValue(context, 'dormantDueEvents', 'V2 event context'),
    ['reality', 'dreamReset', 'botCapTransition', 'infinityReset'],
    'V2 dormant due events',
  )
  const dormantDueEvents = Object.fromEntries(
    ['reality', 'dreamReset', 'botCapTransition', 'infinityReset'].map((key) => {
      const entry = dataValue(dormantProperties, key, 'V2 dormant due events')
      if (typeof entry !== 'boolean') {
        throw new TypeError('V2 dormant due-event declarations must be boolean.')
      }
      return [key, entry]
    }),
  ) as unknown as CanonicalV2DormantDueEvents
  const configuredLookup = dataValue(context, 'catalogLookup', 'V2 event context')
  if (configuredLookup !== null && typeof configuredLookup !== 'function') {
    throw new TypeError('V2 event catalog lookup must be a function or null.')
  }
  return Object.freeze({
    automationIntervalSeconds,
    timerAggregationAuthority: timerAggregationAuthority as
      Readonly<CanonicalTimerAggregationAuthorityV2> | null,
    quantumEpochAuthority: quantumEpochAuthority as
      Readonly<CanonicalQuantumEpochAuthorityV2> | null,
    dormantDueEvents: Object.freeze(dormantDueEvents),
    catalogLookup: (configuredLookup ?? getGameAsset) as DysonV2CatalogLookup,
    infinityRewardAuthority: captureInfinityRewardAuthorityV2ForSimulation(
      dataValue(context, 'infinityRewardAuthority', 'V2 event context'),
    ),
  })
}

function captureQueuedInputs(value: unknown): readonly Readonly<CanonicalQueuedInputV2>[] {
  if (!Array.isArray(value) || !Object.isFrozen(value) || value.length > MAXIMUM_QUEUED_INPUTS) {
    throw new TypeError(`V2 queued inputs must be a frozen array of at most ${MAXIMUM_QUEUED_INPUTS} entries.`)
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const ownKeys = Reflect.ownKeys(value)
  if (
    ownKeys.length !== value.length + 1 ||
    ownKeys.some((key) => key !== 'length' && (
      typeof key !== 'string' || !/^(?:0|[1-9]\d*)$/u.test(key)
    ))
  ) throw new TypeError('V2 queued inputs must be a dense data-only array.')
  const ids = new Set<string>()
  const result: Readonly<CanonicalQueuedInputV2>[] = []
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)]
    if (descriptor === undefined || !('value' in descriptor)) {
      throw new TypeError('V2 queued inputs must contain data-only entries.')
    }
    const entry=descriptor.value
    const header=closedDataPropertiesByDiscriminant(entry,`V2 queued input ${index}`)
    const properties = closedDataProperties(entry,header.keys,`V2 queued input ${index}`)
    const id = dataValue(properties, 'id', `V2 queued input ${index}`)
    const horizonSeconds = dataValue(properties, 'horizonSeconds', `V2 queued input ${index}`)
    const commandVersion=dataValue(properties,'commandVersion',`V2 queued input ${index}`),commandKind=dataValue(properties,'commandKind',`V2 queued input ${index}`)
    if (typeof id !== 'string' || id.trim() === '' || ids.has(id)) {
      throw new TypeError('V2 queued input IDs must be unique nonblank strings.')
    }
    if (
      typeof horizonSeconds !== 'number' ||
      !Number.isFinite(horizonSeconds) ||
      horizonSeconds < 0 ||
      Object.is(horizonSeconds, -0)
    ) throw new RangeError('V2 queued input horizons must be finite and non-negative.')
    if(commandVersion!==1||commandKind!==header.commandKind)throw new TypeError('V2 queued input command identity is unsupported.')
    ids.add(id)
    if(commandKind==='dyson-facility-purchase'){
      const facilityId=dataValue(properties,'facilityId',`V2 queued input ${index}`),requestedMode=dataValue(properties,'requestedMode',`V2 queued input ${index}`),roundedBulkBuy=dataValue(properties,'roundedBulkBuy',`V2 queued input ${index}`)
      if(!DYSON_V2_COMMAND_TARGETS.includes(facilityId as DysonV2CommandFacilityId))throw new TypeError('V2 queued input facility is unsupported.')
      if(!PURCHASE_MODES.has(requestedMode as V2PurchaseMode))throw new TypeError('V2 queued input purchase mode is unsupported.')
      if(typeof roundedBulkBuy!=='boolean')throw new TypeError('V2 queued input rounded-bulk flag must be boolean.')
      result.push(Object.freeze({id,horizonSeconds,commandVersion:1,commandKind,facilityId:facilityId as DysonV2CommandFacilityId,requestedMode:requestedMode as V2PurchaseMode,roundedBulkBuy}))
    }else if(commandKind==='quantum-upgrade-purchase'){
      const upgradeId=dataValue(properties,'upgradeId',`V2 queued input ${index}`),requestedMode=dataValue(properties,'requestedMode',`V2 queued input ${index}`)
      if(!QUANTUM_V2_UPGRADE_IDS.includes(upgradeId as QuantumUpgradeIdV2))throw new TypeError('V2 queued input Quantum upgrade is unsupported.')
      if(!PURCHASE_MODES.has(requestedMode as V2PurchaseMode))throw new TypeError('V2 queued input purchase mode is unsupported.')
      result.push(Object.freeze({id,horizonSeconds,commandVersion:1,commandKind,upgradeId:upgradeId as QuantumUpgradeIdV2,requestedMode:requestedMode as V2PurchaseMode}))
    }else result.push(Object.freeze({id,horizonSeconds,commandVersion:1,commandKind:'quantum-action'}))
  }
  return Object.freeze(result)
}

function closedDataPropertiesByDiscriminant(value:unknown,path:string):Readonly<{commandKind:CanonicalQueuedInputV2['commandKind'];keys:readonly string[]}>{if(value===null||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)throw new TypeError(`${path} must be a plain data object.`);const descriptor=Object.getOwnPropertyDescriptor(value,'commandKind');if(descriptor===undefined||!('value'in descriptor))throw new TypeError(`${path} command kind is missing.`);if(descriptor.value==='dyson-facility-purchase')return Object.freeze({commandKind:descriptor.value,keys:Object.freeze(['id','horizonSeconds','commandVersion','commandKind','facilityId','requestedMode','roundedBulkBuy'])});if(descriptor.value==='quantum-upgrade-purchase')return Object.freeze({commandKind:descriptor.value,keys:Object.freeze(['id','horizonSeconds','commandVersion','commandKind','upgradeId','requestedMode'])});if(descriptor.value==='quantum-action')return Object.freeze({commandKind:descriptor.value,keys:Object.freeze(['id','horizonSeconds','commandVersion','commandKind'])});throw new TypeError(`${path} command kind is unsupported.`)}

function closedDataProperties(
  value: unknown,
  expectedKeys: readonly string[],
  path: string,
): Readonly<Record<string, PropertyDescriptor>> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    !Object.isFrozen(value)
  ) throw new TypeError(`${path} must be a frozen closed plain object.`)
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(value)
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key) => {
      if (typeof key !== 'string' || !expectedKeys.includes(key)) return true
      const descriptor = descriptors[key]
      return descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)
    })
  ) throw new TypeError(`${path} must contain exactly its declared data fields.`)
  return descriptors
}

function dataValue(
  properties: Readonly<Record<string, PropertyDescriptor>>,
  key: string,
  path: string,
): unknown {
  const descriptor = properties[key]
  if (descriptor === undefined || !('value' in descriptor)) {
    throw new TypeError(`${path} is missing '${key}'.`)
  }
  return descriptor.value
}

function assertFrozenDataGraph(root: unknown, path: string): void {
  const queue: unknown[] = [root]
  const visited = new Set<object>()
  let entries = 0
  while (queue.length > 0) {
    const value = queue.pop()
    if (value === null || typeof value !== 'object') continue
    if (visited.has(value)) continue
    visited.add(value)
    if (!Object.isFrozen(value)) throw new TypeError(`${path} must be deeply frozen.`)
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== Array.prototype) {
      throw new TypeError(`${path} must contain only plain data containers.`)
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') {
        if (isGameDecimal(value)) continue
        throw new TypeError(`${path} must not contain symbol keys.`)
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (descriptor === undefined || !('value' in descriptor)) {
        throw new TypeError(`${path} must contain only data properties.`)
      }
      if (Array.isArray(value) && key === 'length') continue
      entries += 1
      if (entries > 20_000) throw new RangeError(`${path} exceeds its data-entry budget.`)
      queue.push(descriptor.value)
    }
  }
}

function sameCarrier(
  left: Readonly<CanonicalEventTimeCarrierV2>,
  right: Readonly<CanonicalEventTimeCarrierV2>,
): boolean {
  return left.state === right.state &&
    left.runtime === right.runtime &&
    left.revision === right.revision
}

function withPublishedRevision(
  carrier: Readonly<CanonicalEventTimeCarrierV2>,
  sourceRevision: number,
): Readonly<CanonicalEventTimeCarrierV2> {
  return Object.freeze({ ...carrier, revision: sourceRevision + 1 })
}
