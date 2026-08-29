import {
  isFiniteNonNegativeNumber,
  isFinitePositiveNumber,
  isSafeNonNegativeInteger,
} from '../core/finiteNonNegativeNumber'
import type { RuntimeGameAsset } from '../game-data/types'
import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import type { DysonSkillEffectEvaluationSnapshot } from '../game-state/skillEffectEvaluationSnapshot'
import type {
  CanonicalGameStateV1,
  ProcessingSource,
} from '../game-state/types'
import { validateCanonicalGameState } from '../game-state/validate'
import {
  evaluateCanonicalBotCapCheckpoint,
} from './canonicalBotCapCheckpoint'
import { advanceCanonicalGoalProgression } from './canonicalGoalProgression'
import {
  CANONICAL_DYSON_PRESENTATION_TUNING,
  deriveBasicDysonState,
  type DysonEntitlements,
  type DysonPresentationTuning,
} from './canonicalDysonDerivation'
import {
  runCanonicalDysonAutomation,
} from './canonicalDysonCommands'
import {
  applyCanonicalInfinityReset,
  type CanonicalInfinityResetAssetLookup,
} from './canonicalInfinityReset'
import { recordCanonicalStatisticsSegment } from './canonicalStatistics'
import {
  clampPreBreakInfinityBots,
  createBasicDysonInfinityState,
  infinityPointsForBots,
  infinityPointsPerMinute,
  ordinaryInfinityBotThreshold,
  preferredInfinityRatePeak,
} from './infinityCycle'
import {
  applyDysonProductionArrivals,
} from './dysonProductionArrivals'
import {
  applyCanonicalSkillIntervalEffects,
  timeToNextInfinityEventAfterStellarSettlement,
} from './canonicalSkillIntervalEffects'
import {
  applyCanonicalDreamReset,
  canApplyCanonicalAutomaticDreamReset,
  type CanonicalDreamResetDefinitions,
} from './canonicalDreamReset'
import {
  runDreamFoundationalInformationConversions,
  runDreamFoundationalInformationProduction,
} from './dreamFoundationalInformation'
import { advanceDreamEducation } from './dreamEducationUpgrades'
import {
  runDreamRailgunAutomation,
  runDreamSpaceAgeProduction,
} from './dreamSpaceAge'
import {
  addContinuous,
  addDiscrete,
  DISCRETE_MAXIMUM,
} from './numeric'
import {
  applyCanonicalQuantumReset,
  applyQuantumEntanglementConversion,
} from './quantumTransitions'
import {
  REALITY_UPGRADE_IDS,
  type RealityUpgradeDefinition,
  type RealityUpgradeId,
} from './realityUpgrades'
import {
  advanceRealityWorkers,
  type RealityWorkerTuning,
} from './realityWorkers'
import { runResearchAutomationTick } from './researchAutomation'
import {
  advanceCanonicalTinker,
  deriveCanonicalTinkerStats,
  startCanonicalTinker,
  setCanonicalTinkerRepeat,
  timeToCanonicalTinkerCompletion,
  type CanonicalTinkerRuntimeState,
} from './canonicalTinker'
import { withCanonicalBotAllocation } from './canonicalBotAllocation'
import {
  createSimulationSummary,
  type EventTimeSimulationModel,
  type SimulationAutomationPolicy,
  type SimulationPresentationSummary,
  type SimulationQueuedInput,
} from './types'
import { TIME_EPSILON_SECONDS as TIME_EPSILON } from './timeTolerance'

export const CANONICAL_QUANTUM_LEAP_INPUT = 'quantum-leap'
export const UNITY_QUANTUM_ACTION_INPUT = 'quantum_action'
const QUANTUM_LEAP_INFINITY_GATE = 42n
const OWNED_EVENT_TIME_STATE = Symbol('owned-event-time-state')

/**
 * Transactional runtime carrier. Compatibility tuning and the evaluation
 * snapshot are save/session-specific and therefore travel with game state.
 */
export interface CanonicalEventTimeState {
  readonly gameState: CanonicalGameStateV1
  readonly compatibilityTuning: Readonly<DysonCompatibilityTuning>
  readonly evaluationSnapshot: Readonly<DysonSkillEffectEvaluationSnapshot>
  readonly entitlements: Readonly<DysonEntitlements>
  readonly tinker: Readonly<CanonicalTinkerRuntimeState>
}

export type CanonicalInfinityBoundaryEvaluation =
  | { readonly status: 'not-ready' }
  | {
      readonly status: 'ready'
      readonly breakInfinity: boolean
      readonly requestedReward: bigint
    }

export interface CanonicalEventTimeContext {
  readonly mode: ProcessingSource
  readonly automationIntervalSeconds: number
  /**
   * Duration represented by one automation action in this authoritative
   * update. Active play and Stored Time both allow one action per update.
   */
  readonly automationActionIntervalSeconds?: number
  /** Converts advanced game seconds into the real or bank time used by rates. */
  readonly rateClockMultiplier?: number
  readonly dysonPresentationTuning?: Readonly<DysonPresentationTuning>
  readonly realityWorkerTuning: Readonly<RealityWorkerTuning>
  readonly dreamResetDefinitions: CanonicalDreamResetDefinitions
  readonly realityUpgradeDefinitions: ReadonlyMap<
    RealityUpgradeId,
    RealityUpgradeDefinition
  >
  readonly infinityResetAssetLookup: CanonicalInfinityResetAssetLookup
}

export interface CanonicalEventTimeIssue {
  readonly code: string
  readonly path: string
  readonly detail: string
}

export interface CanonicalQueuedInputOutcome {
  readonly accepted: boolean
  readonly changed: boolean
  readonly code:
    | 'QUANTUM_LEAP_APPLIED'
    | 'QUANTUM_ENTANGLEMENT_APPLIED'
    | 'QUANTUM_LEAP_REQUIRES_42_TOTAL_INFINITY_POINTS'
    | 'CANONICAL_EVENT_INPUT_UNSUPPORTED'
    | 'CANONICAL_EVENT_QUANTUM_RESET_REJECTED'
}

interface PendingInterval {
  readonly seconds: number
  readonly summary: SimulationPresentationSummary
}

interface ArtifactSkillPointResult {
  readonly ok: boolean
  readonly value: bigint
  readonly issue?: CanonicalEventTimeIssue
}

interface CapturedContext {
  readonly mode: ProcessingSource
  readonly automationIntervalSeconds: number
  readonly automationActionIntervalSeconds: number
  readonly rateClockMultiplier: number
  readonly dysonPresentationTuning: Readonly<DysonPresentationTuning>
  readonly realityWorkerTuning: Readonly<RealityWorkerTuning>
  readonly dreamResetDefinitions: CanonicalDreamResetDefinitions
  readonly realityUpgradeDefinitions: ReadonlyMap<
    RealityUpgradeId,
    RealityUpgradeDefinition
  >
  readonly infinityResetAssetLookup: CanonicalInfinityResetAssetLookup
}

const preparedContexts = new WeakSet<object>()
const capturedContextCache = new WeakMap<object, CapturedContext>()

export interface CanonicalEventTimeContextVariants {
  readonly active: Readonly<CanonicalEventTimeContext>
  readonly storedTime: Readonly<CanonicalEventTimeContext>
}

const preparedContextVariants = new WeakMap<
  object,
  Readonly<CanonicalEventTimeContextVariants>
>()
const adjustedContextCache = new WeakMap<
  object,
  {
    readonly automationIntervalSeconds: number
    readonly rateClockMultiplier: number
    readonly context: Readonly<CanonicalEventTimeContext>
  }
>()

/**
 * Canonical whole-game composition for the shared event-time scheduler.
 *
 * The model owns no presentation, persistence, wall-clock, or mutable catalog
 * reads. Missing lower-level behavior rejects through `issue` and `validate`.
 */
export class CanonicalEventTimeModel
  implements EventTimeSimulationModel<CanonicalEventTimeModel>
{
  private ownedCarrier: CanonicalEventTimeState
  private readonly context: CapturedContext
  private pendingInterval: PendingInterval | null = null
  private currentIssue: CanonicalEventTimeIssue | undefined
  private queuedInputOutcome: CanonicalQueuedInputOutcome | undefined
  private ownershipTransferred = false

  static fromOwnedState(
    state: CanonicalEventTimeState,
    context: Readonly<CanonicalEventTimeContext>,
  ): CanonicalEventTimeModel {
    return new CanonicalEventTimeModel(
      state,
      context,
      OWNED_EVENT_TIME_STATE,
    )
  }

  constructor(
    state: Readonly<CanonicalEventTimeState>,
    context: Readonly<CanonicalEventTimeContext>,
    ownership?: typeof OWNED_EVENT_TIME_STATE,
  ) {
    this.context = prepareCanonicalEventTimeContext(context)
    this.ownedCarrier = normalizeAutomationPhase(
      ownership === OWNED_EVENT_TIME_STATE
        ? state as CanonicalEventTimeState
        : cloneCarrier(state),
      this.context.automationIntervalSeconds,
    )
  }

  private get carrier(): CanonicalEventTimeState {
    this.assertOwned()
    return this.ownedCarrier
  }

  private set carrier(value: CanonicalEventTimeState) {
    this.assertOwned()
    this.ownedCarrier = value
  }

  get state(): CanonicalEventTimeState {
    return cloneCarrier(this.carrier)
  }

  /**
   * Transfers the completed carrier without cloning it. A transferred model
   * is permanently consumed so no second owner can observe or mutate it.
   */
  takeState(): CanonicalEventTimeState {
    const carrier = this.carrier
    if (this.pendingInterval !== null) {
      throw new Error(
        'Cannot transfer canonical event state while an interval is pending.',
      )
    }
    this.ownershipTransferred = true
    return carrier
  }

  get issue(): CanonicalEventTimeIssue | undefined {
    this.assertOwned()
    return this.currentIssue === undefined
      ? undefined
      : Object.freeze({ ...this.currentIssue })
  }

  get lastQueuedInputOutcome():
    | CanonicalQueuedInputOutcome
    | undefined {
    this.assertOwned()
    return this.queuedInputOutcome === undefined
      ? undefined
      : Object.freeze({ ...this.queuedInputOutcome })
  }

  clone(): CanonicalEventTimeModel {
    const clone = new CanonicalEventTimeModel(
      this.carrier,
      this.context,
    )
    clone.pendingInterval =
      this.pendingInterval === null
        ? null
        : {
            seconds: this.pendingInterval.seconds,
            summary: { ...this.pendingInterval.summary },
          }
    clone.currentIssue =
      this.currentIssue === undefined
        ? undefined
        : { ...this.currentIssue }
    clone.queuedInputOutcome =
      this.queuedInputOutcome === undefined
        ? undefined
        : { ...this.queuedInputOutcome }
    return clone
  }

  validate(): string | undefined {
    this.assertOwned()
    if (this.currentIssue !== undefined) {
      return this.currentIssue.code
    }
    const canonical = validateCanonicalGameState(
      this.carrier.gameState,
    )
    if (!canonical.valid) {
      this.fail(
        'CANONICAL_EVENT_STATE_INVALID',
        'gameState',
        canonical.errors[0] ?? 'Canonical state validation failed.',
      )
      return 'CANONICAL_EVENT_STATE_INVALID'
    }
    const carrierIssue = validateCarrier(this.carrier, this.context)
    if (carrierIssue !== undefined) {
      this.currentIssue = carrierIssue
      return carrierIssue.code
    }
    return undefined
  }

  validateIncremental(): string | undefined {
    this.assertOwned()
    if (this.currentIssue !== undefined) {
      return this.currentIssue.code
    }
    const carrierIssue = validateCarrier(this.carrier, this.context)
    if (carrierIssue !== undefined) {
      this.currentIssue = carrierIssue
      return carrierIssue.code
    }
    return undefined
  }

  timeToNextMaterialEvent(
    maximumSeconds: number,
    infinityMinimumCycleSeconds: number,
  ): number {
    if (
      !Number.isFinite(maximumSeconds) ||
      maximumSeconds < 0 ||
      !Number.isFinite(infinityMinimumCycleSeconds) ||
      infinityMinimumCycleSeconds <= 0
    ) {
      this.fail(
        'CANONICAL_EVENT_HORIZON_INVALID',
        'eventTime',
        'Material-event bounds must be finite and non-negative.',
      )
      return 0
    }
    if (!this.carrier.gameState.timeline.eventClockInitialized) {
      return 0
    }
    const infinity = this.carrier.gameState.infinity
    if (
      (
        this.carrier.gameState.dyson.bots === Number.MAX_VALUE &&
        (
          infinity.automaticResetEnabled ||
          !infinity.botCapRewardsGranted
        )
      ) ||
      (
        this.context.mode === 'active' &&
        canApplyCanonicalAutomaticDreamReset(this.carrier.gameState)
      )
    ) {
      this.replaceGameState(
        withNextInfinityBoundary(
          this.carrier.gameState,
          0,
        ),
      )
      return 0
    }
    const derived = this.deriveForNextState(
      this.carrier.gameState,
      'eventTime.infinityHorizon',
    )
    if (derived === undefined) return 0
    if (this.context.mode === 'active') {
      const tinkerStats = deriveCanonicalTinkerStats(
        this.carrier.gameState,
        derived.auxiliary.tinkerAssemblyYield,
      )
      const synchronizedTinker = advanceCanonicalTinker(
        this.carrier.gameState,
        this.carrier.tinker,
        tinkerStats,
        0,
      )
      this.carrier = {
        ...this.carrier,
        gameState: synchronizedTinker.state,
        tinker: synchronizedTinker.runtime,
      }
    }
    const capReachedWithoutAutomation =
      !this.carrier.gameState.quantum.unlocks.breakTheLoop &&
      !infinity.automaticResetEnabled &&
      this.carrier.gameState.dyson.bots >=
        ordinaryInfinityBotThreshold(
          this.carrier.gameState.quantum.divisionsPurchased,
        )
    const infinityHorizon =
      (infinity.automaticResetEnabled ||
        (!this.carrier.gameState.quantum.unlocks.breakTheLoop &&
          !capReachedWithoutAutomation))
      ? timeToNextInfinityEventAfterStellarSettlement(
          this.carrier.gameState.dyson.bots,
          derived.productionArrivalRates.bots,
          derived.auxiliary.stellarSacrifice.botsPerSecond,
          derived.auxiliary.stellarSacrifice.planetsPerSecond,
          createInfinityCycleState(this.carrier),
          Number.MAX_VALUE,
          infinity.automaticResetEnabled
            ? infinityMinimumCycleSeconds
            : 0,
        )
      : Number.MAX_VALUE
    this.replaceGameState(
      withNextInfinityBoundary(
        this.carrier.gameState,
        infinityHorizon,
      ),
    )
    const tinkerHorizon = this.context.mode === 'active'
      ? timeToCanonicalTinkerCompletion(
          this.carrier.tinker,
          maximumSeconds,
        )
      : maximumSeconds
    return Math.min(
      maximumSeconds,
      infinityHorizon,
      tinkerHorizon,
    )
  }

  advanceContinuous(seconds: number): void {
    if (this.currentIssue !== undefined) return
    if (
      !Number.isFinite(seconds) ||
      seconds <= 0 ||
      this.pendingInterval !== null
    ) {
      this.fail(
        'CANONICAL_EVENT_INTERVAL_INVALID',
        'advanceContinuous',
        'A positive interval cannot begin while another interval is pending.',
      )
      return
    }

    const uncappedStartingState = this.carrier.gameState
    const cappedStartingBots = clampPreBreakInfinityBots(
      uncappedStartingState.dyson.bots,
      uncappedStartingState.quantum.unlocks.breakTheLoop,
      uncappedStartingState.quantum.divisionsPurchased,
    )
    const cappedStartingState =
      cappedStartingBots === uncappedStartingState.dyson.bots
        ? uncappedStartingState
        : {
            ...uncappedStartingState,
            dyson: {
              ...uncappedStartingState.dyson,
              bots: cappedStartingBots,
            },
          }
    const startingState = withCanonicalBotAllocation(cappedStartingState)
    this.replaceGameState(startingState)
    try {
      const derived = deriveBasicDysonState(
        startingState,
        this.carrier.compatibilityTuning,
        this.carrier.entitlements,
        this.carrier.evaluationSnapshot,
        this.context.dysonPresentationTuning,
      )
      if (!derived.ok) {
        const issue = derived.issues[0]
        this.fail(
          issue?.code ?? 'CANONICAL_EVENT_DYSON_DERIVATION_REJECTED',
          issue?.path ?? 'dyson',
          issue?.detail ?? 'Dyson derivation rejected the interval.',
        )
        return
      }

      let candidate = applyDysonProductionArrivals(
        startingState,
        derived.value.productionArrivalRates,
        seconds,
      )
      candidate = applyCanonicalSkillIntervalEffects(
        startingState,
        candidate,
        {
          seconds,
          botProductionPerSecond:
            derived.value.productionArrivalRates.bots,
          stellarPlanetsPerSecond:
            derived.value.auxiliary.stellarSacrifice.planetsPerSecond,
          stellarBotsPerSecond:
            derived.value.auxiliary.stellarSacrifice.botsPerSecond,
          scienceBoostPerSecond:
            derived.value.auxiliary.scienceBoostPerSecond,
          moneyUpgradePerSecond:
            derived.value.auxiliary.moneyUpgradePerSecond,
        },
      )
      const tinker = this.context.mode === 'active'
        ? advanceCanonicalTinker(
            candidate,
            this.carrier.tinker,
            deriveCanonicalTinkerStats(
              startingState,
              derived.value.auxiliary.tinkerAssemblyYield,
            ),
            seconds,
          )
        : {
            state: candidate,
            runtime: this.carrier.tinker,
          }
      candidate = withCanonicalBotAllocation(tinker.state)
      const space = runDreamSpaceAgeProduction(candidate, {
        tickSeconds: seconds,
        doubleTimeMultiplier: 1,
      })
      if (space.status !== 'success') {
        this.fail(
          'CANONICAL_EVENT_DREAM_SPACE_REJECTED',
          'dream.spaceAge',
          'Dream Space Age production rejected the interval.',
        )
        return
      }
      candidate = space.state
      const earlyDream =
        runDreamFoundationalInformationProduction(candidate, {
          tickSeconds: seconds,
          doubleTimeMultiplier: 1,
        })
      if (earlyDream.status !== 'success') {
        this.fail(
          'CANONICAL_EVENT_DREAM_PRODUCTION_REJECTED',
          'dream',
          'Dream Foundational/Information production rejected the interval.',
        )
        return
      }
      candidate = earlyDream.state
      const education = advanceDreamEducation(candidate, seconds, 1)
      if (!education.accepted) {
        this.fail(
          'CANONICAL_EVENT_DREAM_EDUCATION_REJECTED',
          'dream.education',
          'Dream Education research rejected the interval.',
        )
        return
      }
      candidate = education.candidate
      let intervalSummary = createSimulationSummary()
      const reality = advanceRealityWorkers(
        candidate,
        seconds,
        this.context.realityWorkerTuning,
      )
      if (reality.status !== 'success') {
        this.fail(
          `CANONICAL_EVENT_REALITY_${reality.status.toUpperCase().replace('-', '_')}`,
          'reality',
          `Reality worker production rejected as ${reality.status}.`,
        )
        return
      }
      candidate = reality.state
      intervalSummary = createIntervalSummary(
        reality.workersGenerated,
        reality.automaticInfluence,
        reality.stalledSeconds,
      )
      candidate = withAdvancedClock(
        candidate,
        seconds,
        this.context.rateClockMultiplier ?? 1,
      )
      if (this.context.mode === 'active') {
        candidate = withAdvancedManualInfinityObservation(
          candidate,
          seconds * (this.context.rateClockMultiplier ?? 1),
        )
        candidate = withUpdatedInfinityRatePeak(
          candidate,
          this.carrier.entitlements,
        )
      }

      this.carrier = {
        ...this.carrier,
        gameState: candidate,
        tinker: tinker.runtime,
      }
      this.pendingInterval = {
        seconds,
        summary: intervalSummary,
      }
    } catch (error) {
      this.fail(
        'CANONICAL_EVENT_INTERVAL_THREW',
        'advanceContinuous',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  applyProductionArrivals(
    _summary: SimulationPresentationSummary,
  ): void {
    // Production was atomically committed from tick-start snapshots above.
  }

  applyAutomation(
    policy: SimulationAutomationPolicy,
    _summary: SimulationPresentationSummary,
  ): void {
    if (this.currentIssue !== undefined) return
    try {
      const pricing = this.deriveForNextState(
        this.carrier.gameState,
        'automation.dysonPricing',
      )
      if (pricing === undefined) return
      let candidate = runCanonicalDysonAutomation(
        this.carrier.gameState,
        policy,
        pricing.planetPricingModifier,
      ).state
      candidate = runResearchAutomationTick(
        candidate,
        this.carrier.compatibilityTuning,
        policy,
      ).state
      candidate =
        runDreamFoundationalInformationConversions(candidate).state
      const railgun = runDreamRailgunAutomation(candidate, {
        tickSeconds: this.context.automationActionIntervalSeconds,
        effectiveDoubleTimeMultiplier: 1,
        doubleTimeActive: false,
        doubleTimeRate: 0,
      })
      if (railgun.status !== 'success') {
        this.fail(
          'CANONICAL_EVENT_RAILGUN_AUTOMATION_REJECTED',
          'dream.railgun',
          'Dream railgun automation rejected its explicit interval.',
        )
        return
      }
      candidate = railgun.state
      this.replaceGameState({
        ...candidate,
        timeline: {
          ...candidate.timeline,
          automationTimeUntilNextEvent:
            this.context.automationIntervalSeconds,
        },
      })
    } catch (error) {
      this.fail(
        'CANONICAL_EVENT_AUTOMATION_THREW',
        'automation',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  applyDerivedTimersAndDoubleTime(
    seconds: number,
    summary: SimulationPresentationSummary,
  ): void {
    if (this.currentIssue !== undefined) return
    let pending = this.pendingInterval
    if (pending === null) {
      if (seconds > TIME_EPSILON) {
        this.fail(
          'CANONICAL_EVENT_INTERVAL_MISSING',
          'statistics',
          'A positive boundary had no pending combined interval.',
        )
        return
      }
      pending = {
        seconds: 0,
        summary: createSimulationSummary(),
      }
      this.pendingInterval = pending
      return
    }
    if (Math.abs(pending.seconds - seconds) > TIME_EPSILON) {
      this.fail(
        'CANONICAL_EVENT_INTERVAL_MISMATCH',
        'statistics',
        'The scheduler boundary does not match the pending interval.',
      )
      return
    }

    if (!this.applyGoalProgression()) return
    if (!this.publishEvaluationSnapshot('evaluationSnapshot')) return
    mergeSummary(summary, pending.summary)
  }

  applyDreamReset(summary: SimulationPresentationSummary): void {
    if (this.currentIssue !== undefined) return
    const result = applyCanonicalDreamReset(
      this.carrier.gameState,
      { kind: 'automatic' },
      this.context.dreamResetDefinitions,
    )
    if (!result.ok) {
      const issue = result.issues[0]
      this.fail(
        issue?.code ?? 'CANONICAL_EVENT_DREAM_RESET_REJECTED',
        issue?.path ?? 'dream',
        issue?.detail ?? 'Dream reset assets rejected.',
      )
      return
    }
    if (!result.applied) return

    const deferredState = withDeferredEventStatistics(
      result.state,
      this.carrier.gameState.statistics,
    )
    this.replaceGameState(deferredState)
    const event = createSimulationSummary()
    event.strangeMatter = result.rewardGranted
    if (result.cause === 'Meteor') event.meteorDreamResets = 1n
    if (result.cause === 'ArtificialIntelligence') {
      event.aiDreamResets = 1n
    }
    if (result.cause === 'GlobalWarming') {
      event.globalWarmingDreamResets = 1n
    }
    if (result.cause === 'BlackHole') {
      event.blackHoleDreamResets = 1n
    }
    this.appendBoundaryEvent(summary, event)
  }

  sampleInfinityRatePeak(): void {
    if (this.currentIssue !== undefined) return
    this.replaceGameState(withUpdatedInfinityRatePeak(
      this.carrier.gameState,
      this.carrier.entitlements,
    ))
  }

  finishStep(): void {
    if (this.currentIssue !== undefined) return
    this.finalizePendingInterval()
  }

  applyBotCapTransition(
    _summary: SimulationPresentationSummary,
  ): void {
    if (this.currentIssue !== undefined) return
    const result = evaluateCanonicalBotCapCheckpoint(
      this.carrier.gameState,
    )
    if (result.action.kind === 'persist') {
      // The elapsed interval is already part of the resumable candidate.
      // Publish its statistics exactly once before persistence pauses the
      // scheduler; the checkpoint/reward itself remains unapplied.
      this.finalizePendingInterval()
      this.fail(
        'CANONICAL_EVENT_BOT_CAP_PERSISTENCE_REQUIRED',
        'infinity.botCap',
        `Bot-cap checkpoint '${result.action.checkpoint}' must be durably committed before simulation can continue.`,
      )
      return
    }
    if (result.action.kind === 'prestige') {
      this.replaceGameState(result.candidateState)
    }
  }

  /** Settles bot-cap checkpoints inside an unpublished Stored Time candidate. */
  applyDetachedBotCapTransition(
    summary: SimulationPresentationSummary,
  ): void {
    if (this.currentIssue !== undefined) return
    for (let pass = 0; pass < 3; pass += 1) {
      const result = evaluateCanonicalBotCapCheckpoint(
        this.carrier.gameState,
      )
      if (result.action.kind === 'continue-normal-prestige') return
      this.replaceGameState(result.candidateState)
      if (
        result.appliedReward.infinityPoints > 0n ||
        result.appliedReward.overflowMultiplier > 0
      ) {
        summary.botCapInfinityPoints +=
          result.appliedReward.infinityPoints
        summary.botCapOverflowRewards += BigInt(
          Math.trunc(result.appliedReward.overflowMultiplier),
        )
      }
      if (result.action.kind === 'prestige') return
    }
    this.fail(
      'CANONICAL_EVENT_BOT_CAP_CHECKPOINT_LOOP',
      'infinity.botCap',
      'Detached bot-cap settlement exceeded its finite checkpoint sequence.',
    )
  }

  applyInfinityReset(
    minimumCycleSeconds: number,
    summary: SimulationPresentationSummary,
    manual = false,
    scheduleAutomaticHorizon = true,
  ): void {
    if (this.currentIssue !== undefined) return
    const evaluation = evaluateCanonicalInfinityBoundary(
      this.carrier,
      minimumCycleSeconds,
      manual,
      manual,
    )
    if (evaluation.status === 'not-ready') {
      if (scheduleAutomaticHorizon) {
        if (!this.scheduleNextInfinityBoundary(
          minimumCycleSeconds,
        )) return
      } else {
        this.replaceGameState(
          withNextInfinityBoundary(
            this.carrier.gameState,
            Number.MAX_VALUE,
          ),
        )
      }
      this.finalizePendingInterval()
      return
    }
    if (
      typeof evaluation.requestedReward !== 'bigint' ||
      evaluation.requestedReward < 0n ||
      evaluation.requestedReward > DISCRETE_MAXIMUM
    ) {
      this.fail(
        'CANONICAL_EVENT_INFINITY_EVALUATION_INVALID',
        'infinity.requestedReward',
        'Infinity evaluation returned an invalid Int64 reward.',
      )
      return
    }

    const artifact = deriveCanonicalArtifactSkillPoints(
      this.carrier.gameState,
      this.context.realityUpgradeDefinitions,
    )
    if (!artifact.ok) {
      this.currentIssue = artifact.issue
      return
    }
    const resetSeed = {
      ...this.carrier.gameState,
      infinity: {
        ...this.carrier.gameState.infinity,
        lastCycleDurationSeconds:
          this.carrier.gameState.timeline.infinityCycleSeconds,
      },
    }
    const result = applyCanonicalInfinityReset(
      resetSeed,
      {
        breakInfinity: evaluation.breakInfinity,
        requestedReward: evaluation.requestedReward,
        artifactSkillPoints: artifact.value,
        automatic: !manual,
        processingSource: this.context.mode,
        activeIntervalMilliseconds:
          this.carrier.gameState.timeline.processing
            .activeIntervalMilliseconds,
      },
      this.context.infinityResetAssetLookup,
    )
    if (!result.ok) {
      const issue = result.issues[0]
      this.fail(
        issue?.code ?? 'CANONICAL_EVENT_INFINITY_RESET_REJECTED',
        issue?.path ?? 'infinity',
        issue?.detail ?? 'Infinity reset assets rejected.',
      )
      return
    }

    const nextState = withResetInfinityClock(
      withDeferredEventStatistics(
        result.state,
        this.carrier.gameState.statistics,
      ),
      minimumCycleSeconds,
    )
    this.replaceGameState(nextState)
    if (!this.publishEvaluationSnapshot(
      'infinity.evaluationSnapshot',
    )) return
    const event = createSimulationSummary()
    if (evaluation.breakInfinity) {
      event.breakInfinityCount = 1n
      event.breakInfinityPoints = result.rewardGranted
    } else {
      event.ordinaryInfinityCount = 1n
      event.ordinaryInfinityPoints = result.rewardGranted
    }
    this.appendBoundaryEvent(summary, event)
    this.finalizePendingInterval()
  }

  applyQueuedInput(
    input: SimulationQueuedInput,
    _summary: SimulationPresentationSummary,
  ): void {
    if (this.currentIssue !== undefined) return
    if (
      input.kind !== CANONICAL_QUANTUM_LEAP_INPUT &&
      input.kind !== UNITY_QUANTUM_ACTION_INPUT
    ) {
      this.queuedInputOutcome = {
        accepted: false,
        changed: false,
        code: 'CANONICAL_EVENT_INPUT_UNSUPPORTED',
      }
      this.fail(
        'CANONICAL_EVENT_INPUT_UNSUPPORTED',
        'queuedInput.kind',
        `Queued input '${input.kind}' has no canonical command handler.`,
      )
      return
    }
    this.applyQuantumLeap()
  }

  startTinker(repeat: boolean): boolean {
    if (this.currentIssue !== undefined) return false
    const derived = this.deriveForNextState(
      this.carrier.gameState,
      'tinker',
    )
    if (derived === undefined) return false
    try {
      const result = startCanonicalTinker(
        this.carrier.gameState,
        this.carrier.tinker,
        deriveCanonicalTinkerStats(
          this.carrier.gameState,
          derived.auxiliary.tinkerAssemblyYield,
        ),
        repeat,
      )
      const changed =
        result.state !== this.carrier.gameState ||
        !sameTinkerRuntime(result.runtime, this.carrier.tinker)
      this.carrier = {
        ...this.carrier,
        gameState: result.state,
        tinker: result.runtime,
      }
      return changed
    } catch (error) {
      this.fail(
        'CANONICAL_EVENT_TINKER_START_REJECTED',
        'tinker',
        error instanceof Error ? error.message : String(error),
      )
      return false
    }
  }

  setTinkerRepeat(enabled: boolean): boolean {
    if (this.currentIssue !== undefined) return false
    const result = setCanonicalTinkerRepeat(
      this.carrier.gameState,
      this.carrier.tinker,
      enabled,
    )
    const changed = !sameTinkerRuntime(
      result.runtime,
      this.carrier.tinker,
    )
    this.carrier = {
      ...this.carrier,
      gameState: result.state,
      tinker: result.runtime,
    }
    return changed
  }

  private applyQuantumLeap(): void {
    const state = this.carrier.gameState
    if (state.infinity.points < QUANTUM_LEAP_INFINITY_GATE) {
      this.queuedInputOutcome = {
        accepted: false,
        changed: false,
        code: 'QUANTUM_LEAP_REQUIRES_42_TOTAL_INFINITY_POINTS',
      }
      return
    }

    if (state.quantum.unlocks.quantumEntanglement) {
      const result = applyQuantumEntanglementConversion(state)
      this.replaceGameState(result.state)
      this.queuedInputOutcome = {
        accepted: true,
        changed: result.state !== state,
        code: 'QUANTUM_ENTANGLEMENT_APPLIED',
      }
      return
    }

    const artifact = deriveCanonicalArtifactSkillPoints(
      state,
      this.context.realityUpgradeDefinitions,
    )
    if (!artifact.ok) {
      this.currentIssue = artifact.issue
      this.queuedInputOutcome = {
        accepted: false,
        changed: false,
        code: 'CANONICAL_EVENT_QUANTUM_RESET_REJECTED',
      }
      return
    }
    const result = applyCanonicalQuantumReset(
      state,
      artifact.value,
      this.context.infinityResetAssetLookup,
    )
    if (!result.ok) {
      const issue = result.issues[0]
      this.fail(
        issue?.code ?? 'CANONICAL_EVENT_QUANTUM_RESET_REJECTED',
        issue?.path ?? 'quantum',
        issue?.detail ?? 'Quantum reset assets rejected.',
      )
      this.queuedInputOutcome = {
        accepted: false,
        changed: false,
        code: 'CANONICAL_EVENT_QUANTUM_RESET_REJECTED',
      }
      return
    }
    this.replaceGameState(
      withResetInfinityClock(
        result.state,
        Math.max(
          TIME_EPSILON,
          state.timeline.infinityBoundaryRemaining,
        ),
      ),
    )
    this.queuedInputOutcome = {
      accepted: true,
      changed: true,
      code: 'QUANTUM_LEAP_APPLIED',
    }
  }

  private replaceGameState(state: CanonicalGameStateV1): void {
    this.carrier = {
      ...this.carrier,
      gameState: state,
    }
  }

  private deriveForNextState(
    state: CanonicalGameStateV1,
    path: string,
  ) {
    const derived = deriveBasicDysonState(
      state,
      this.carrier.compatibilityTuning,
      this.carrier.entitlements,
      this.carrier.evaluationSnapshot,
      this.context.dysonPresentationTuning,
    )
    if (derived.ok) return derived.value
    const issue = derived.issues[0]
    this.fail(
      issue?.code ?? 'CANONICAL_EVENT_DYSON_DERIVATION_REJECTED',
      issue?.path ?? path,
      issue?.detail ??
        'Dyson derivation rejected the transactional state replacement.',
    )
    return undefined
  }

  private publishEvaluationSnapshot(path: string): boolean {
    const derived = this.deriveForNextState(
      this.carrier.gameState,
      path,
    )
    if (derived === undefined) return false
    this.carrier = {
      ...this.carrier,
      evaluationSnapshot: structuredClone(
        derived.nextEvaluationSnapshot,
      ),
    }
    return true
  }

  private applyGoalProgression(): boolean {
    const result = advanceCanonicalGoalProgression(
      this.carrier.gameState,
      (state) => {
        const derived = this.deriveForNextState(
          state,
          'dyson.goalProgression',
        )
        if (derived === undefined) {
          throw new Error(
            this.currentIssue?.detail ??
              'Dyson derivation rejected goal progression.',
          )
        }
        return {
          panelsPerSecond: derived.globals.panelsPerSecond,
          panelLifetimeSeconds:
            derived.globals.panelLifetimeSeconds,
        }
      },
    )
    if (!result.ok) {
      if (this.currentIssue === undefined) {
        this.fail(
          result.code,
          'dyson.goalStage',
          result.detail,
        )
      }
      return false
    }
    this.replaceGameState(result.state)
    return true
  }

  private scheduleNextInfinityBoundary(
    minimumCycleSeconds: number,
  ): boolean {
    const state = this.carrier.gameState
    const automaticResetEnabled = state.infinity.automaticResetEnabled
    const breakTheLoop = state.quantum.unlocks.breakTheLoop
    const ordinaryCapReached =
      !breakTheLoop &&
      state.dyson.bots >= ordinaryInfinityBotThreshold(
        state.quantum.divisionsPurchased,
      )
    if (!automaticResetEnabled && (breakTheLoop || ordinaryCapReached)) {
      this.replaceGameState(
        withNextInfinityBoundary(
          this.carrier.gameState,
          Number.MAX_VALUE,
        ),
      )
      return true
    }
    const derived = this.deriveForNextState(
      this.carrier.gameState,
      'eventTime.infinityBoundary',
    )
    if (derived === undefined) return false
    const horizon = timeToNextInfinityEventAfterStellarSettlement(
      this.carrier.gameState.dyson.bots,
      derived.productionArrivalRates.bots,
      derived.auxiliary.stellarSacrifice.botsPerSecond,
      derived.auxiliary.stellarSacrifice.planetsPerSecond,
      createInfinityCycleState(this.carrier),
      Number.MAX_VALUE,
      automaticResetEnabled ? minimumCycleSeconds : 0,
    )
    this.replaceGameState(
      withNextInfinityBoundary(
        this.carrier.gameState,
        horizon,
      ),
    )
    return true
  }

  private appendBoundaryEvent(
    summary: SimulationPresentationSummary,
    event: Readonly<SimulationPresentationSummary>,
  ): void {
    mergeSummary(summary, event)
    if (this.pendingInterval !== null) {
      mergeSummary(this.pendingInterval.summary, event)
    }
  }

  private finalizePendingInterval(): void {
    const pending = this.pendingInterval
    if (pending === null) return
    this.carrier = {
      ...this.carrier,
      gameState: {
        ...this.carrier.gameState,
        statistics: recordCanonicalStatisticsSegment(
          this.carrier.gameState.statistics,
          pending.seconds,
          pending.summary,
        ),
      },
    }
    this.pendingInterval = null
  }

  private fail(code: string, path: string, detail: string): void {
    this.assertOwned()
    if (this.currentIssue !== undefined) return
    this.currentIssue = Object.freeze({ code, path, detail })
  }

  private assertOwned(): void {
    if (!this.ownershipTransferred) return
    throw new Error(
      'Canonical event model state ownership has already been transferred.',
    )
  }
}

export function deriveCanonicalArtifactSkillPoints(
  state: Readonly<CanonicalGameStateV1>,
  definitions: ReadonlyMap<
    RealityUpgradeId,
    RealityUpgradeDefinition
  >,
): ArtifactSkillPointResult {
  let points = 0n
  for (const id of REALITY_UPGRADE_IDS) {
    if (!isRealityUpgradeOwned(state, id)) continue
    const definition = definitions.get(id)
    if (definition === undefined || definition.key !== id) {
      return {
        ok: false,
        value: 0n,
        issue: Object.freeze({
          code: 'CANONICAL_EVENT_REALITY_DEFINITION_MISSING',
          path: `gameData.realityUpgrades.${id}`,
          detail: `Owned Reality upgrade '${id}' has no matching captured definition.`,
        }),
      }
    }
    for (const effect of definition.purchaseEffects) {
      if (effect.effectType !== 2) continue
      const value = roundedNonNegativeDiscrete(effect.numericValue)
      if (value === null) {
        return {
          ok: false,
          value: 0n,
          issue: Object.freeze({
            code: 'CANONICAL_EVENT_ARTIFACT_SKILL_EFFECT_INVALID',
            path: `gameData.realityUpgrades.${id}.purchaseEffects`,
            detail: `Owned Reality upgrade '${id}' has an invalid AddSkillPoints effect.`,
          }),
        }
      }
      points = addDiscrete(points, value)
    }
  }
  if (state.secretProgress.completed) {
    points = addDiscrete(points, 4n)
  }
  return { ok: true, value: points }
}

/**
 * Detaches and locks application-lifetime event authorities once. Prepared
 * contexts are safe to share between models because neither their catalogs nor
 * any nested definition value exposes a runtime mutation surface.
 *
 * Definition semantics continue to fail closed in their owning domain. This
 * boundary validates the stronger ownership invariant: every exposed catalog
 * entry is detached from its source and deeply frozen.
 */
export function prepareCanonicalEventTimeContext(
  context: Readonly<CanonicalEventTimeContext>,
): CapturedContext {
  if (context.mode !== 'active' && context.mode !== 'stored-time') {
    throw new TypeError(
      "Canonical event-time context mode must be 'active' or 'stored-time'.",
    )
  }
  if (preparedContexts.has(context)) {
    return context as CapturedContext
  }
  const cached = capturedContextCache.get(context)
  if (cached !== undefined) return cached
  const prepared = Object.freeze({
    mode: context.mode,
    automationIntervalSeconds: context.automationIntervalSeconds,
    automationActionIntervalSeconds:
      context.automationActionIntervalSeconds ??
      context.automationIntervalSeconds,
    rateClockMultiplier: context.rateClockMultiplier ?? 1,
    dysonPresentationTuning: Object.freeze({
      ...(context.dysonPresentationTuning ??
        CANONICAL_DYSON_PRESENTATION_TUNING),
    }),
    realityWorkerTuning: Object.freeze({
      ...context.realityWorkerTuning,
    }),
    dreamResetDefinitions: createImmutableDefinitionMap(
      context.dreamResetDefinitions,
    ),
    realityUpgradeDefinitions: createImmutableDefinitionMap(
      context.realityUpgradeDefinitions,
    ),
    infinityResetAssetLookup: context.infinityResetAssetLookup,
  })
  assertPreparedDefinitionMap(
    context.dreamResetDefinitions,
    prepared.dreamResetDefinitions,
  )
  assertPreparedDefinitionMap(
    context.realityUpgradeDefinitions,
    prepared.realityUpgradeDefinitions,
  )
  preparedContexts.add(prepared)
  capturedContextCache.set(context, prepared)
  return prepared
}

/**
 * Prepares active and Stored Time progression modes without revalidating or
 * copying their shared immutable definition catalogs.
 */
export function prepareCanonicalEventTimeContextVariants(
  context: Readonly<CanonicalEventTimeContext>,
): Readonly<CanonicalEventTimeContextVariants> {
  const prepared = prepareCanonicalEventTimeContext(context)
  const cached = preparedContextVariants.get(prepared)
  if (cached !== undefined) return cached
  const active = prepared.mode === 'active'
    ? prepared
    : Object.freeze({
        ...prepared,
        mode: 'active' as const,
      })
  const storedTime = prepared.mode === 'stored-time'
    ? prepared
    : Object.freeze({
        ...prepared,
        mode: 'stored-time' as const,
      })
  if (active !== prepared) preparedContexts.add(active)
  if (storedTime !== prepared) preparedContexts.add(storedTime)
  const variants = Object.freeze({ active, storedTime })
  preparedContextVariants.set(prepared, variants)
  return variants
}

/**
 * Reuses prepared immutable catalogs while changing only the duration of one
 * authoritative update, without cloning generated definition maps.
 */
export function withCanonicalEventTimeAutomationInterval(
  context: Readonly<CanonicalEventTimeContext>,
  automationIntervalSeconds: number,
  rateClockMultiplier = 1,
): Readonly<CanonicalEventTimeContext> {
  if (
    !isFinitePositiveNumber(automationIntervalSeconds)
  ) {
    throw new RangeError('Automation interval must be finite and positive.')
  }
  if (!isFinitePositiveNumber(rateClockMultiplier)) {
    throw new RangeError('Rate clock multiplier must be finite and positive.')
  }
  const prepared = prepareCanonicalEventTimeContext(context)
  if (
    prepared.automationIntervalSeconds === automationIntervalSeconds &&
    prepared.rateClockMultiplier === rateClockMultiplier
  ) {
    return prepared
  }
  const cached = adjustedContextCache.get(prepared)
  if (
    cached?.automationIntervalSeconds === automationIntervalSeconds &&
    cached.rateClockMultiplier === rateClockMultiplier
  ) {
    return cached.context
  }
  const adjusted = Object.freeze({
    ...prepared,
    automationIntervalSeconds,
    automationActionIntervalSeconds: automationIntervalSeconds,
    rateClockMultiplier,
  })
  preparedContexts.add(adjusted)
  adjustedContextCache.set(prepared, {
    automationIntervalSeconds,
    rateClockMultiplier,
    context: adjusted,
  })
  return adjusted
}

function createImmutableDefinitionMap<K, V>(
  source: ReadonlyMap<K, V>,
): ReadonlyMap<K, V> {
  if (source instanceof ImmutableDefinitionMap) return source
  return Object.freeze(
    new ImmutableDefinitionMap(
      [...source].map(([key, value]) => [
        key,
        deepFreeze(structuredClone(value)),
      ]),
    ),
  )
}

class ImmutableDefinitionMap<K, V> implements ReadonlyMap<K, V> {
  readonly #entries: Map<K, V>

  constructor(entries: readonly (readonly [K, V])[]) {
    this.#entries = new Map(entries)
  }

  get size(): number {
    return this.#entries.size
  }

  get(key: K): V | undefined {
    return this.#entries.get(key)
  }

  has(key: K): boolean {
    return this.#entries.has(key)
  }

  entries(): MapIterator<[K, V]> {
    return this.#entries.entries()
  }

  keys(): MapIterator<K> {
    return this.#entries.keys()
  }

  values(): MapIterator<V> {
    return this.#entries.values()
  }

  forEach(
    callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void,
    thisArg?: unknown,
  ): void {
    this.#entries.forEach((value, key) => {
      callbackfn.call(thisArg, value, key, this)
    })
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries()
  }

  get [Symbol.toStringTag](): string {
    return 'ImmutableDefinitionMap'
  }
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return value
  seen.add(value)
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(Reflect.get(value, key), seen)
  }
  return Object.freeze(value)
}

function assertPreparedDefinitionMap<K, V>(
  source: ReadonlyMap<K, V>,
  prepared: ReadonlyMap<K, V>,
): void {
  if (prepared.size !== source.size || !Object.isFrozen(prepared)) {
    throw new Error('Canonical definition catalog preparation failed.')
  }
  for (const [key, value] of prepared) {
    if (!source.has(key) || !isDeeplyFrozen(value)) {
      throw new Error('Canonical definition catalog preparation failed.')
    }
  }
}

function isDeeplyFrozen(
  value: unknown,
  seen = new WeakSet<object>(),
): boolean {
  if (value === null || typeof value !== 'object') return true
  if (seen.has(value)) return true
  if (!Object.isFrozen(value)) return false
  seen.add(value)
  return Reflect.ownKeys(value).every((key) =>
    isDeeplyFrozen(Reflect.get(value, key), seen),
  )
}

function cloneCarrier(
  state: Readonly<CanonicalEventTimeState>,
): CanonicalEventTimeState {
  return structuredClone(state)
}

function validateCarrier(
  state: Readonly<CanonicalEventTimeState>,
  context: Readonly<CapturedContext>,
): CanonicalEventTimeIssue | undefined {
  for (const [path, value] of Object.entries(
    state.compatibilityTuning,
  )) {
    if (!isFiniteNonNegativeNumber(value)) {
      return Object.freeze({
        code: 'CANONICAL_EVENT_TUNING_INVALID',
        path: `compatibilityTuning.${path}`,
        detail: 'Compatibility tuning must be finite and non-negative.',
      })
    }
  }
  for (const [path, value] of Object.entries(
    context.dysonPresentationTuning,
  )) {
    if (!isFiniteNonNegativeNumber(value)) {
      return Object.freeze({
        code: 'CANONICAL_EVENT_PRESENTATION_TUNING_INVALID',
        path: `dysonPresentationTuning.${path}`,
        detail:
          'Dyson presentation tuning must be finite and non-negative.',
      })
    }
  }
  for (const [path, value] of Object.entries(
    state.evaluationSnapshot,
  )) {
    if (!isFiniteNonNegativeNumber(value)) {
      return Object.freeze({
        code: 'CANONICAL_EVENT_EVALUATION_SNAPSHOT_INVALID',
        path: `evaluationSnapshot.${path}`,
        detail: 'Evaluation snapshot values must be finite and non-negative.',
      })
    }
  }
  if (typeof state.entitlements.permanentDoubleIp !== 'boolean') {
    return Object.freeze({
      code: 'CANONICAL_EVENT_ENTITLEMENTS_INVALID',
      path: 'entitlements.permanentDoubleIp',
      detail: 'Platform entitlements must be an explicit boolean snapshot.',
    })
  }
  if (
    typeof state.tinker.running !== 'boolean' ||
    typeof state.tinker.repeat !== 'boolean' ||
    !isSafeNonNegativeInteger(state.tinker.cycleId) ||
    typeof state.tinker.effectiveManualLabour !== 'boolean' ||
    !Number.isFinite(state.tinker.elapsedSeconds) ||
    state.tinker.elapsedSeconds < 0 ||
    !Number.isFinite(state.tinker.cooldownSeconds) ||
    state.tinker.cooldownSeconds <= 0 ||
    state.tinker.elapsedSeconds >
      state.tinker.cooldownSeconds + TIME_EPSILON
  ) {
    return Object.freeze({
      code: 'CANONICAL_EVENT_TINKER_INVALID',
      path: 'tinker',
      detail:
        'Transient Tinker state must have finite bounded progress and a positive cooldown.',
    })
  }
  if (
    (context.mode !== 'active' && context.mode !== 'stored-time') ||
    !Number.isFinite(context.automationIntervalSeconds) ||
    context.automationIntervalSeconds <= 0 ||
    !Number.isFinite(context.rateClockMultiplier) ||
    context.rateClockMultiplier <= 0 ||
    context.realityWorkerTuning.workerBatchSize <= 0n ||
    !Number.isSafeInteger(
      context.realityWorkerTuning.baseWorkerGenerationSpeed,
    ) ||
    context.realityWorkerTuning.baseWorkerGenerationSpeed < 0
  ) {
    return Object.freeze({
      code: 'CANONICAL_EVENT_CONTEXT_INVALID',
      path: 'context',
      detail: 'Runtime interval and Reality tuning snapshot is invalid.',
    })
  }
  const phase =
    state.gameState.timeline.automationTimeUntilNextEvent
  if (
    !Number.isFinite(phase) ||
    phase < 0
  ) {
    return Object.freeze({
      code: 'CANONICAL_EVENT_AUTOMATION_PHASE_INVALID',
      path: 'gameState.timeline.automationTimeUntilNextEvent',
      detail: 'Legacy automation phase must be finite and non-negative.',
    })
  }
  return undefined
}

function withAdvancedClock(
  state: CanonicalGameStateV1,
  seconds: number,
  rateClockMultiplier: number,
): CanonicalGameStateV1 {
  return {
    ...state,
    timeline: {
      ...state.timeline,
      eventClockInitialized: true,
      automationTimeUntilNextEvent: Math.max(
        0,
        state.timeline.automationTimeUntilNextEvent - seconds,
      ),
      infinityBoundaryRemaining: Math.max(
        0,
        state.timeline.infinityBoundaryRemaining - seconds,
      ),
      infinityCycleSeconds: addContinuous(
        state.timeline.infinityCycleSeconds,
        seconds * rateClockMultiplier,
      ),
    },
  }
}

function withUpdatedInfinityRatePeak(
  state: CanonicalGameStateV1,
  entitlements: Readonly<DysonEntitlements>,
): CanonicalGameStateV1 {
  const infinity = createBasicDysonInfinityState({
    points: state.infinity.points,
    permanentSkillPoints: state.infinity.permanentSkillPoints,
    breakTheLoop: state.quantum.unlocks.breakTheLoop,
    divisionsPurchased: state.quantum.divisionsPurchased,
    breakTarget: state.infinity.breakTarget,
    permanentDoubleIp: entitlements.permanentDoubleIp,
    quantumDoubleIp: state.quantum.unlocks.doubleInfinityPoints,
    secondsInCurrentCycle: state.timeline.infinityCycleSeconds,
  })
  const reward = infinityPointsForBots(state.dyson.bots, infinity)
  const minimumObservedSeconds =
    state.timeline.processing.activeIntervalMilliseconds / 1000
  const rate = infinityPointsPerMinute(
    reward,
    Math.max(
      state.timeline.infinityCycleSeconds,
      minimumObservedSeconds,
    ),
  )
  const previousPeak = {
    rate: state.infinity.currentCyclePeakIpPerMinute ?? 0,
    reward: state.infinity.currentCyclePeakReward ?? 0n,
  }
  const selected = preferredInfinityRatePeak(previousPeak, { rate, reward })
  if (
    selected.rate === previousPeak.rate &&
    selected.reward === previousPeak.reward
  ) return state
  return {
    ...state,
    infinity: {
      ...state.infinity,
      currentCyclePeakIpPerMinute: selected.rate,
      currentCyclePeakReward: selected.reward,
    },
  }
}

function withAdvancedManualInfinityObservation(
  state: CanonicalGameStateV1,
  seconds: number,
): CanonicalGameStateV1 {
  if (state.infinity.automaticResetEnabled || seconds <= 0) return state
  return {
    ...state,
    infinity: {
      ...state.infinity,
      manualCalibrationObservedActiveSeconds: addContinuous(
        state.infinity.manualCalibrationObservedActiveSeconds ?? 0,
        seconds,
      ),
    },
  }
}

function withNextInfinityBoundary(
  state: CanonicalGameStateV1,
  nextBoundarySeconds: number,
): CanonicalGameStateV1 {
  return {
    ...state,
    timeline: {
      ...state.timeline,
      eventClockInitialized: true,
      infinityBoundaryRemaining: nextBoundarySeconds,
    },
  }
}

function normalizeAutomationPhase(
  state: CanonicalEventTimeState,
  automationIntervalSeconds: number,
): CanonicalEventTimeState {
  const phase = state.gameState.timeline.automationTimeUntilNextEvent
  if (
    !Number.isFinite(automationIntervalSeconds) ||
    automationIntervalSeconds <= 0 ||
    !Number.isFinite(phase) ||
    phase < 0 ||
    phase > TIME_EPSILON
  ) {
    return state
  }
  return {
    ...state,
    gameState: {
      ...state.gameState,
      timeline: {
        ...state.gameState.timeline,
        automationTimeUntilNextEvent: automationIntervalSeconds,
      },
    },
  }
}

/**
 * Adapts canonical durable state to the characterized Infinity primitives.
 * No reward or readiness formula is duplicated in the composition model.
 */
export function evaluateCanonicalInfinityBoundary(
  carrier: Readonly<CanonicalEventTimeState>,
  minimumCycleSeconds: number,
  ignoreAutomaticResetPreference = false,
  ignoreBreakTarget = false,
): CanonicalInfinityBoundaryEvaluation {
  const state = carrier.gameState
  if (
    !ignoreAutomaticResetPreference &&
    !state.infinity.automaticResetEnabled
  ) {
    return { status: 'not-ready' }
  }
  const infinity = createInfinityCycleState(carrier)
  const botCapTransition = state.infinity.botCapRewardsGranted
  if (
    !botCapTransition &&
    state.timeline.infinityCycleSeconds < minimumCycleSeconds
  ) {
    return { status: 'not-ready' }
  }

  const breakInfinity = state.quantum.unlocks.breakTheLoop
  const breakReward = infinityPointsForBots(
    state.dyson.bots,
    infinity,
  )
  if (
    !botCapTransition &&
    (breakInfinity
      ? breakReward < (ignoreBreakTarget ? 1n : state.infinity.breakTarget)
      : state.dyson.bots <
        ordinaryInfinityBotThreshold(
          state.quantum.divisionsPurchased,
        ))
  ) {
    return { status: 'not-ready' }
  }

  const ordinaryReward = infinityPointsForBots(
    ordinaryInfinityBotThreshold(
      state.quantum.divisionsPurchased,
    ),
    infinity,
  )
  return {
    status: 'ready',
    breakInfinity,
    requestedReward: breakInfinity
      ? breakReward
      : ordinaryReward,
  }
}

function createInfinityCycleState(
  carrier: Readonly<CanonicalEventTimeState>,
) {
  const state = carrier.gameState
  return createBasicDysonInfinityState({
    points: state.infinity.points,
    permanentSkillPoints: state.infinity.permanentSkillPoints,
    breakTheLoop: state.quantum.unlocks.breakTheLoop,
    divisionsPurchased: state.quantum.divisionsPurchased,
    breakTarget: state.infinity.breakTarget,
    permanentDoubleIp: carrier.entitlements.permanentDoubleIp,
    quantumDoubleIp:
      state.quantum.unlocks.doubleInfinityPoints,
    secondsInCurrentCycle:
      state.timeline.infinityCycleSeconds,
  })
}

function withDeferredEventStatistics(
  state: CanonicalGameStateV1,
  accountingBase: CanonicalGameStateV1['statistics'],
): CanonicalGameStateV1 {
  return {
    ...state,
    statistics: {
      ...state.statistics,
      trackedSinceUpdate: accountingBase.trackedSinceUpdate,
      trackingStartedMarker:
        accountingBase.trackingStartedMarker,
      trackedSimulatedSeconds:
        accountingBase.trackedSimulatedSeconds,
      lifetime: accountingBase.lifetime,
      currentQuantumRun: accountingBase.currentQuantumRun,
      recentProcessedSegment:
        accountingBase.recentProcessedSegment,
      minuteWindows: accountingBase.minuteWindows,
      halfHourWindows: accountingBase.halfHourWindows,
      dailyWindows: accountingBase.dailyWindows,
    },
  }
}

function withResetInfinityClock(
  state: CanonicalGameStateV1,
  minimumCycleSeconds: number,
): CanonicalGameStateV1 {
  return {
    ...state,
    timeline: {
      ...state.timeline,
      eventClockInitialized: true,
      infinityBoundaryRemaining: minimumCycleSeconds,
      infinityCycleSeconds: 0,
      infinityCycleStartingPoints: state.infinity.points,
      infinityHasPostResetStart: true,
    },
  }
}

function createIntervalSummary(
  realityWorkers: bigint,
  automaticInfluence: number,
  realityCapacityStallSeconds: number,
): SimulationPresentationSummary {
  return {
    ...createSimulationSummary(),
    realityWorkers,
    automaticInfluence,
    realityCapacityStallSeconds,
  }
}

function mergeSummary(
  target: SimulationPresentationSummary,
  source: Readonly<SimulationPresentationSummary>,
): void {
  target.ordinaryInfinityCount = addDiscrete(
    target.ordinaryInfinityCount,
    source.ordinaryInfinityCount,
  )
  target.breakInfinityCount = addDiscrete(
    target.breakInfinityCount,
    source.breakInfinityCount,
  )
  target.ordinaryInfinityPoints = addDiscrete(
    target.ordinaryInfinityPoints,
    source.ordinaryInfinityPoints,
  )
  target.breakInfinityPoints = addDiscrete(
    target.breakInfinityPoints,
    source.breakInfinityPoints,
  )
  target.botCapInfinityPoints = addDiscrete(
    target.botCapInfinityPoints,
    source.botCapInfinityPoints,
  )
  target.botCapOverflowRewards = addDiscrete(
    target.botCapOverflowRewards,
    source.botCapOverflowRewards,
  )
  target.meteorDreamResets = addDiscrete(
    target.meteorDreamResets,
    source.meteorDreamResets,
  )
  target.aiDreamResets = addDiscrete(
    target.aiDreamResets,
    source.aiDreamResets,
  )
  target.globalWarmingDreamResets = addDiscrete(
    target.globalWarmingDreamResets,
    source.globalWarmingDreamResets,
  )
  target.blackHoleDreamResets = addDiscrete(
    target.blackHoleDreamResets,
    source.blackHoleDreamResets,
  )
  target.strangeMatter = addContinuous(
    target.strangeMatter,
    source.strangeMatter,
  )
  target.realityWorkers = addDiscrete(
    target.realityWorkers,
    source.realityWorkers,
  )
  target.automaticInfluence = addContinuous(
    target.automaticInfluence,
    source.automaticInfluence,
  )
  target.manualInfluence = addContinuous(
    target.manualInfluence,
    source.manualInfluence,
  )
  target.realityCapacityStallSeconds = addContinuous(
    target.realityCapacityStallSeconds,
    source.realityCapacityStallSeconds,
  )
}

function isRealityUpgradeOwned(
  state: Readonly<CanonicalGameStateV1>,
  id: RealityUpgradeId,
): boolean {
  if (id === 'doubleTimeOwned') {
    return state.timeline.doubleTime.unlocked
  }
  if (id === 'workerAutoConvert') {
    return state.reality.autoGather
  }
  return state.dream.upgrades[id]
}

function roundedNonNegativeDiscrete(value: number): bigint | null {
  if (!isFiniteNonNegativeNumber(value)) return null
  const floor = Math.floor(value)
  const fraction = value - floor
  const rounded =
    fraction < 0.5
      ? floor
      : fraction > 0.5
        ? floor + 1
        : floor % 2 === 0
          ? floor
          : floor + 1
  if (
    !isSafeNonNegativeInteger(rounded)
  ) {
    return null
  }
  const result = BigInt(rounded)
  return result <= DISCRETE_MAXIMUM ? result : null
}

function sameTinkerRuntime(
  left: Readonly<CanonicalTinkerRuntimeState>,
  right: Readonly<CanonicalTinkerRuntimeState>,
): boolean {
  return (
    left.running === right.running &&
    left.repeat === right.repeat &&
    left.cycleId === right.cycleId &&
    left.elapsedSeconds === right.elapsedSeconds &&
    left.effectiveManualLabour === right.effectiveManualLabour &&
    left.cooldownSeconds === right.cooldownSeconds
  )
}

export function createCapturedInfinityAssetLookup(
  assets: readonly Readonly<RuntimeGameAsset>[],
): CanonicalInfinityResetAssetLookup {
  const captured = new Map(
    assets.map((asset) => [
      `${asset.kind}\u0000${asset.id}`,
      structuredClone(asset),
    ]),
  )
  return (kind, id) => captured.get(`${kind}\u0000${id}`)
}
