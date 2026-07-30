import type { RuntimeGameAsset } from '../game-data/types'
import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import type { DysonSkillEffectEvaluationSnapshot } from '../game-state/skillEffectEvaluationSnapshot'
import type { CanonicalGameStateV1 } from '../game-state/types'
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
  createBasicDysonInfinityState,
  infinityPointsForBots,
  ordinaryInfinityBotThreshold,
  timeToNextInfinityEvent,
} from './infinityCycle'
import {
  applyDysonProductionArrivals,
} from './dysonProductionArrivals'
import {
  applyCanonicalDreamReset,
  type CanonicalDreamResetDefinitions,
} from './canonicalDreamReset'
import {
  runDreamFoundationalInformationConversions,
  runDreamFoundationalInformationProduction,
} from './dreamFoundationalInformation'
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
  completeDreamDoubleTimeTick,
  prepareDreamDoubleTimeTick,
  type DreamDoubleTimeTick,
} from './timeResources'
import {
  advanceCanonicalTinker,
  deriveCanonicalTinkerStats,
  startCanonicalTinker,
  setCanonicalTinkerRepeat,
  timeToCanonicalTinkerCompletion,
  type CanonicalTinkerRuntimeState,
} from './canonicalTinker'
import { withCanonicalBotAllocation } from './canonicalBotAllocation'
import type {
  EventTimeSimulationModel,
  SimulationAutomationPolicy,
  SimulationPresentationSummary,
  SimulationQueuedInput,
} from './types'

export const CANONICAL_QUANTUM_LEAP_INPUT = 'quantum-leap'
export const UNITY_QUANTUM_ACTION_INPUT = 'quantum_action'
const QUANTUM_LEAP_INFINITY_GATE = 42n
const TIME_EPSILON = 1e-12

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
  readonly automationIntervalSeconds: number
  readonly dysonPresentationTuning?: Readonly<DysonPresentationTuning>
  /**
   * Tinker uses Unity wall Time.deltaTime. Stored/away simulations set this
   * false so their simulated seconds cannot complete the transient action.
   */
  readonly advanceTinker?: boolean
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
  readonly doubleTimeTick: DreamDoubleTimeTick
  readonly summary: SimulationPresentationSummary
}

interface ArtifactSkillPointResult {
  readonly ok: boolean
  readonly value: bigint
  readonly issue?: CanonicalEventTimeIssue
}

interface CapturedContext {
  readonly automationIntervalSeconds: number
  readonly dysonPresentationTuning: Readonly<DysonPresentationTuning>
  readonly advanceTinker: boolean
  readonly realityWorkerTuning: Readonly<RealityWorkerTuning>
  readonly dreamResetDefinitions: CanonicalDreamResetDefinitions
  readonly realityUpgradeDefinitions: ReadonlyMap<
    RealityUpgradeId,
    RealityUpgradeDefinition
  >
  readonly infinityResetAssetLookup: CanonicalInfinityResetAssetLookup
}

/**
 * Canonical whole-game composition for the shared event-time scheduler.
 *
 * The model owns no presentation, persistence, wall-clock, or mutable catalog
 * reads. Missing lower-level behavior rejects through `issue` and `validate`.
 */
export class CanonicalEventTimeModel
  implements EventTimeSimulationModel<CanonicalEventTimeModel>
{
  private carrier: CanonicalEventTimeState
  private readonly context: CapturedContext
  private pendingInterval: PendingInterval | null = null
  private currentIssue: CanonicalEventTimeIssue | undefined
  private queuedInputOutcome: CanonicalQueuedInputOutcome | undefined

  constructor(
    state: Readonly<CanonicalEventTimeState>,
    context: Readonly<CanonicalEventTimeContext>,
  ) {
    this.carrier = cloneCarrier(state)
    this.context = captureContext(context)
  }

  get state(): CanonicalEventTimeState {
    return cloneCarrier(this.carrier)
  }

  get issue(): CanonicalEventTimeIssue | undefined {
    return this.currentIssue === undefined
      ? undefined
      : Object.freeze({ ...this.currentIssue })
  }

  get lastQueuedInputOutcome():
    | CanonicalQueuedInputOutcome
    | undefined {
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
            doubleTimeTick: {
              ...this.pendingInterval.doubleTimeTick,
            },
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
    if (
      this.carrier.gameState.dyson.bots === Number.MAX_VALUE ||
      isAutomaticDreamResetReady(this.carrier.gameState)
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
    if (this.context.advanceTinker) {
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
    const infinityHorizon = timeToNextInfinityEvent(
      this.carrier.gameState.dyson.bots,
      derived.productionArrivalRates.bots,
      createInfinityCycleState(this.carrier),
      Number.MAX_VALUE,
      infinityMinimumCycleSeconds,
    )
    this.replaceGameState(
      withNextInfinityBoundary(
        this.carrier.gameState,
        infinityHorizon,
      ),
    )
    const tinkerHorizon = this.context.advanceTinker
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

    const startingState = withCanonicalBotAllocation(
      this.carrier.gameState,
    )
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

      const doubleTimeTick = prepareDreamDoubleTimeTick(
        startingState.timeline.doubleTime.unlocked,
        startingState.timeline.doubleTime.bankSeconds,
        startingState.timeline.doubleTime.rate,
        seconds,
      )
      let candidate = applyDysonProductionArrivals(
        startingState,
        derived.value.productionArrivalRates,
        seconds,
      )
      const tinker = this.context.advanceTinker
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
        doubleTimeMultiplier:
          doubleTimeTick.effectiveMultiplier,
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
          doubleTimeMultiplier:
            doubleTimeTick.effectiveMultiplier,
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
      candidate = withAdvancedClock(reality.state, seconds)

      this.carrier = {
        ...this.carrier,
        gameState: candidate,
        tinker: tinker.runtime,
      }
      this.pendingInterval = {
        seconds,
        doubleTimeTick,
        summary: createIntervalSummary(
          reality.workersGenerated,
          reality.automaticInfluence,
          reality.stalledSeconds,
        ),
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
      let candidate = runCanonicalDysonAutomation(
        this.carrier.gameState,
        policy,
      ).state
      candidate = runResearchAutomationTick(
        candidate,
        this.carrier.compatibilityTuning,
        policy,
      ).state
      candidate =
        runDreamFoundationalInformationConversions(candidate).state
      const railgun = runDreamRailgunAutomation(candidate, {
        tickSeconds: this.context.automationIntervalSeconds,
        doubleTimeActive:
          this.pendingInterval?.doubleTimeTick.active ??
          candidate.timeline.doubleTime.enabled,
        doubleTimeRate: candidate.timeline.doubleTime.rate,
      })
      if (railgun.status !== 'success') {
        this.fail(
          'CANONICAL_EVENT_RAILGUN_AUTOMATION_REJECTED',
          'dream.railgun',
          'Dream railgun automation rejected its explicit interval.',
        )
        return
      }
      this.replaceGameState({
        ...railgun.state,
        timeline: {
          ...railgun.state.timeline,
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
        doubleTimeTick: prepareDreamDoubleTimeTick(
          this.carrier.gameState.timeline.doubleTime.unlocked,
          this.carrier.gameState.timeline.doubleTime.bankSeconds,
          this.carrier.gameState.timeline.doubleTime.rate,
          0,
        ),
        summary: emptySummary(),
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

    const state = this.carrier.gameState
    const completed = completeDreamDoubleTimeTick(
      state.timeline.doubleTime.unlocked,
      state.timeline.doubleTime.bankSeconds,
      pending.doubleTimeTick,
    )
    this.replaceGameState({
      ...state,
      timeline: {
        ...state.timeline,
        doubleTime: {
          ...state.timeline.doubleTime,
          bankSeconds: completed.bankSeconds,
          enabled: completed.enabled,
        },
      },
    })
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
    const event = emptySummary()
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

  applyInfinityReset(
    minimumCycleSeconds: number,
    summary: SimulationPresentationSummary,
  ): void {
    if (this.currentIssue !== undefined) return
    const evaluation = evaluateCanonicalInfinityBoundary(
      this.carrier,
      minimumCycleSeconds,
    )
    if (evaluation.status === 'not-ready') {
      if (!this.scheduleNextInfinityBoundary(
        minimumCycleSeconds,
      )) return
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
    const event = emptySummary()
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
    const derived = this.deriveForNextState(
      this.carrier.gameState,
      'eventTime.infinityBoundary',
    )
    if (derived === undefined) return false
    const horizon = timeToNextInfinityEvent(
      this.carrier.gameState.dyson.bots,
      derived.productionArrivalRates.bots,
      createInfinityCycleState(this.carrier),
      Number.MAX_VALUE,
      minimumCycleSeconds,
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
    if (this.currentIssue !== undefined) return
    this.currentIssue = Object.freeze({ code, path, detail })
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

function captureContext(
  context: Readonly<CanonicalEventTimeContext>,
): CapturedContext {
  return Object.freeze({
    automationIntervalSeconds: context.automationIntervalSeconds,
    dysonPresentationTuning: Object.freeze({
      ...(context.dysonPresentationTuning ??
        CANONICAL_DYSON_PRESENTATION_TUNING),
    }),
    advanceTinker: context.advanceTinker ?? true,
    realityWorkerTuning: Object.freeze({
      ...context.realityWorkerTuning,
    }),
    dreamResetDefinitions: cloneDefinitionMap(
      context.dreamResetDefinitions,
    ),
    realityUpgradeDefinitions: cloneDefinitionMap(
      context.realityUpgradeDefinitions,
    ),
    infinityResetAssetLookup: context.infinityResetAssetLookup,
  })
}

function cloneDefinitionMap<K, V>(
  source: ReadonlyMap<K, V>,
): ReadonlyMap<K, V> {
  return new Map(
    [...source].map(([key, value]) => [
      key,
      structuredClone(value),
    ]),
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
    if (!Number.isFinite(value) || value < 0) {
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
    if (!Number.isFinite(value) || value < 0) {
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
    if (!Number.isFinite(value) || value < 0) {
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
    !Number.isFinite(context.automationIntervalSeconds) ||
    context.automationIntervalSeconds <= 0 ||
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
    phase <= 0 ||
    phase > context.automationIntervalSeconds
  ) {
    return Object.freeze({
      code: 'CANONICAL_EVENT_AUTOMATION_PHASE_INVALID',
      path: 'gameState.timeline.automationTimeUntilNextEvent',
      detail: 'Automation phase must be within the captured interval.',
    })
  }
  return undefined
}

function withAdvancedClock(
  state: CanonicalGameStateV1,
  seconds: number,
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

function isAutomaticDreamResetReady(
  state: Readonly<CanonicalGameStateV1>,
): boolean {
  switch (state.dream.disasterStage) {
    case 0n:
    case 1n:
      return state.dream.resources.cities >= 1
    case 2n:
      return state.dream.resources.bots >= 100
    case 3n:
      return state.dream.resources.spaceFactories >= 5
    default:
      return false
  }
}

/**
 * Adapts canonical durable state to the characterized Infinity primitives.
 * No reward or readiness formula is duplicated in the composition model.
 */
export function evaluateCanonicalInfinityBoundary(
  carrier: Readonly<CanonicalEventTimeState>,
  minimumCycleSeconds: number,
): CanonicalInfinityBoundaryEvaluation {
  const state = carrier.gameState
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
      ? breakReward < state.infinity.breakTarget
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
  automaticInfluence: bigint,
  realityCapacityStallSeconds: number,
): SimulationPresentationSummary {
  return {
    ...emptySummary(),
    realityWorkers,
    automaticInfluence,
    realityCapacityStallSeconds,
  }
}

function emptySummary(): SimulationPresentationSummary {
  return {
    ordinaryInfinityCount: 0n,
    breakInfinityCount: 0n,
    ordinaryInfinityPoints: 0n,
    breakInfinityPoints: 0n,
    botCapInfinityPoints: 0n,
    botCapOverflowRewards: 0n,
    meteorDreamResets: 0n,
    aiDreamResets: 0n,
    globalWarmingDreamResets: 0n,
    blackHoleDreamResets: 0n,
    strangeMatter: 0n,
    realityWorkers: 0n,
    automaticInfluence: 0n,
    manualInfluence: 0n,
    realityCapacityStallSeconds: 0,
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
  target.strangeMatter = addDiscrete(
    target.strangeMatter,
    source.strangeMatter,
  )
  target.realityWorkers = addDiscrete(
    target.realityWorkers,
    source.realityWorkers,
  )
  target.automaticInfluence = addDiscrete(
    target.automaticInfluence,
    source.automaticInfluence,
  )
  target.manualInfluence = addDiscrete(
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
  if (!Number.isFinite(value) || value < 0) return null
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
    !Number.isSafeInteger(rounded) ||
    rounded < 0
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
