import {
  CanonicalEventTimeModel,
  prepareCanonicalEventTimeContextVariants,
  withCanonicalEventTimeAutomationInterval,
  type CanonicalEventTimeContext,
} from '../../simulation/canonicalEventTimeModel'
import { advanceEventTime } from '../../simulation/eventTime'
import {
  completeStoredTimeInfinityAggregate,
} from '../../simulation/storedTimeAccounting'
import {
  createSimulationSummary,
  transferEventTimeModelOwnership,
  type SimulationPresentationSummary,
} from '../../simulation/types'
import { normalizeCanonicalTinkerRuntimeState } from '../../simulation/canonicalTinker'
import type { CanonicalRuntimeState } from '../../application/canonicalRuntimeSession'
import type {
  StoredTimeJobProgress,
  StoredTimeJobTerminalMessage,
} from './storedTimeProtocol'
import {
  planStoredTimePolicy,
  type StoredTimePolicyPlan,
} from '../../simulation/storedTimePolicy'

const TIME_EPSILON = 1e-12

export interface StoredTimeSimulationOptions {
  readonly jobId: string
  readonly state: CanonicalRuntimeState
  readonly requestedSeconds: number
  readonly infinityMinimumCycleSeconds: number
  readonly eventContext: Readonly<CanonicalEventTimeContext>
  readonly nowMilliseconds?: () => number
}

/**
 * Owns one detached Stored Time candidate. Each step is wall-time bounded and
 * the caller yields between steps, allowing cancellation and progress frames
 * to be processed without exposing an uncommitted state to the application.
 */
export class StoredTimeSimulation {
  private state: CanonicalRuntimeState
  private readonly requestedSeconds: number
  private readonly infinityMinimumCycleSeconds: number
  private readonly context: Readonly<CanonicalEventTimeContext>
  private readonly jobId: string
  private readonly startedAt: number
  private readonly now: () => number
  private readonly bankBefore: number
  private readonly currentUsageBefore: number
  private readonly previousUsageBefore: number
  private readonly preservedTinker: CanonicalRuntimeState['tinker']
  private readonly plan: Readonly<StoredTimePolicyPlan>
  private readonly summary = createSimulationSummary()
  private consumedSeconds = 0
  private maximumChunkMilliseconds = 0
  private representativeGroupIndex = 0
  private representativeGroupConsumedSeconds = 0
  private finalRemainderConsumedSeconds = 0
  private terminal: StoredTimeJobTerminalMessage | null = null

  constructor(options: Readonly<StoredTimeSimulationOptions>) {
    this.jobId = options.jobId
    this.state = structuredClone(options.state)
    this.requestedSeconds = options.requestedSeconds
    this.infinityMinimumCycleSeconds = options.infinityMinimumCycleSeconds
    this.context = prepareCanonicalEventTimeContextVariants(
      options.eventContext,
    ).storedTime
    this.now = options.nowMilliseconds ?? (() => performance.now())
    this.startedAt = this.now()
    this.bankBefore =
      this.state.gameState.timeline.storedTimeAvailableSeconds
    this.currentUsageBefore =
      this.state.gameState.infinity.storedTimeUsedThisCycleSeconds
    this.previousUsageBefore =
      this.state.gameState.infinity.storedTimeUsedPreviousCycleSeconds
    this.preservedTinker = structuredClone(this.state.tinker)
    this.plan = planStoredTimePolicy({
      requestedSeconds: this.requestedSeconds,
      automationIntervalSeconds: this.context.automationIntervalSeconds,
      automationTimeUntilNextEvent:
        this.state.gameState.timeline.automationTimeUntilNextEvent,
    })
    if (this.plan.executionKind === 'representative-groups') {
      this.retimeAutomation(
        this.plan.groups[0]?.durationSeconds ??
          this.context.automationIntervalSeconds,
      )
    }
  }

  step(
    processingBudgetMilliseconds: number,
    cancelRequested: boolean,
  ): StoredTimeJobTerminalMessage | null {
    if (this.terminal !== null) return this.terminal
    if (cancelRequested) return this.finishCancelled()
    const phase = this.currentPhase()
    const remainingSeconds = phase.remainingSeconds
    if (remainingSeconds <= TIME_EPSILON) {
      return this.finishCompleted(false)
    }

    const chunkStartedAt = this.now()
    const phaseContext = phase.kind === 'representative-group'
      ? withCanonicalEventTimeAutomationInterval(
          this.context,
          phase.totalSeconds,
        )
      : this.context
    const model = CanonicalEventTimeModel.fromOwnedState(
      eventCarrier(this.state),
      phaseContext,
    )
    const result = advanceEventTime({
      startingState: transferEventTimeModelOwnership(model),
      cloneStartingState: false,
      durationSeconds: remainingSeconds,
      automationIntervalSeconds: phaseContext.automationIntervalSeconds,
      automationTimeUntilNextEvent:
        this.state.gameState.timeline.automationTimeUntilNextEvent,
      automationPolicy: 'force-buy-max',
      infinityMinimumCycleSeconds: this.infinityMinimumCycleSeconds,
      processingBudgetMilliseconds,
      collectEvents: false,
      collectWorkMetrics: false,
    })
    const chunkMilliseconds = Math.max(0, this.now() - chunkStartedAt)
    this.maximumChunkMilliseconds = Math.max(
      this.maximumChunkMilliseconds,
      chunkMilliseconds,
    )
    this.consumedSeconds = Math.min(
      this.requestedSeconds,
      this.consumedSeconds + result.consumedSeconds,
    )
    const botCapRequired =
      result.diagnosticCode ===
      'CANONICAL_EVENT_BOT_CAP_PERSISTENCE_REQUIRED'
    if (
      !result.completed &&
      result.validationStatus !== 'yielded' &&
      !botCapRequired
    ) {
      return this.finishFailed(
        result.diagnosticCode ?? 'STORED-TIME-SIMULATION-INCOMPLETE',
        `Stored Time simulation ended as ${result.validationStatus}.`,
      )
    }
    this.state = {
      ...this.state,
      ...result.candidateState.takeState(),
      tinker: structuredClone(this.preservedTinker),
    }
    mergeSummary(this.summary, result.summary)

    if (phase.kind === 'representative-group') {
      this.representativeGroupConsumedSeconds += result.consumedSeconds
    } else if (phase.kind === 'final-remainder') {
      this.finalRemainderConsumedSeconds += result.consumedSeconds
    }

    if (result.completed) {
      if (phase.kind === 'exact') return this.finishCompleted(false)
      if (phase.kind === 'representative-group') {
        this.representativeGroupIndex += 1
        this.representativeGroupConsumedSeconds = 0
        const next = this.plan.groups[this.representativeGroupIndex]
        this.retimeAutomation(
          next?.durationSeconds ?? this.context.automationIntervalSeconds,
        )
        if (
          next === undefined &&
          this.plan.finalRemainderSeconds <= TIME_EPSILON
        ) {
          return this.finishCompleted(false)
        }
        return null
      }
      return this.finishCompleted(false)
    }
    if (botCapRequired && this.consumedSeconds > TIME_EPSILON) {
      if (this.plan.executionKind === 'representative-groups') {
        this.retimeAutomation(this.context.automationIntervalSeconds)
      }
      return this.finishCompleted(true)
    }
    if (result.validationStatus === 'yielded') return null
    return this.finishFailed(
      result.diagnosticCode ?? 'STORED-TIME-SIMULATION-INCOMPLETE',
      `Stored Time simulation ended as ${result.validationStatus}.`,
    )
  }

  progress(): StoredTimeJobProgress {
    const elapsedMilliseconds = Math.max(0, this.now() - this.startedAt)
    const fraction = this.requestedSeconds <= 0
      ? 0
      : Math.max(
          0,
          Math.min(1, this.consumedSeconds / this.requestedSeconds),
        )
    const estimatedRemainingMilliseconds =
      fraction > 0 && fraction < 1
        ? Math.max(0, elapsedMilliseconds * (1 - fraction) / fraction)
        : fraction >= 1
          ? 0
          : null
    return Object.freeze({
      jobId: this.jobId,
      requestedSeconds: this.requestedSeconds,
      computedSeconds: this.consumedSeconds,
      fraction,
      elapsedMilliseconds,
      estimatedRemainingMilliseconds,
      maximumChunkMilliseconds: this.maximumChunkMilliseconds,
    })
  }

  /** Read-only instrumentation for deterministic worker-core profiling. */
  diagnostics() {
    return Object.freeze({
      executionKind: this.plan.executionKind,
      representativeGroupsPlanned:
        this.plan.executionKind === 'representative-groups'
          ? this.plan.groups.length
          : 0,
      finalRemainderPlannedSeconds:
        this.plan.executionKind === 'representative-groups'
          ? this.plan.finalRemainderSeconds
          : 0,
      representativeGroupsCompleted: this.representativeGroupIndex,
      finalRemainderConsumedSeconds: this.finalRemainderConsumedSeconds,
      summary: Object.freeze(structuredClone(this.summary)),
    })
  }

  private currentPhase():
    | {
        readonly kind: 'exact'
        readonly remainingSeconds: number
        readonly totalSeconds: number
      }
    | {
        readonly kind: 'representative-group'
        readonly remainingSeconds: number
        readonly totalSeconds: number
      }
    | {
        readonly kind: 'final-remainder'
        readonly remainingSeconds: number
        readonly totalSeconds: number
      } {
    if (this.plan.executionKind === 'exact') {
      return {
        kind: 'exact',
        remainingSeconds: Math.max(
          0,
          this.requestedSeconds - this.consumedSeconds,
        ),
        totalSeconds: this.requestedSeconds,
      }
    }
    const group = this.plan.groups[this.representativeGroupIndex]
    if (group !== undefined) {
      return {
        kind: 'representative-group',
        remainingSeconds: Math.max(
          0,
          group.durationSeconds - this.representativeGroupConsumedSeconds,
        ),
        totalSeconds: group.durationSeconds,
      }
    }
    return {
      kind: 'final-remainder',
      remainingSeconds: Math.max(
        0,
        this.plan.finalRemainderSeconds -
          this.finalRemainderConsumedSeconds,
      ),
      totalSeconds: this.plan.finalRemainderSeconds,
    }
  }

  private retimeAutomation(seconds: number): void {
    this.state = {
      ...this.state,
      gameState: {
        ...this.state.gameState,
        timeline: {
          ...this.state.gameState.timeline,
          automationTimeUntilNextEvent: Math.max(
            TIME_EPSILON,
            seconds,
          ),
        },
      },
    }
  }

  private finishCompleted(
    botCapPersistenceRequired: boolean,
  ): StoredTimeJobTerminalMessage {
    const consumedSeconds = Math.min(
      this.requestedSeconds,
      this.consumedSeconds,
    )
    const completedCycles =
      this.summary.ordinaryInfinityCount +
      this.summary.breakInfinityCount
    const usage = completeStoredTimeInfinityAggregate(
      this.currentUsageBefore,
      this.previousUsageBefore,
      consumedSeconds,
      completedCycles,
      this.state.gameState.infinity.lastCycleDurationSeconds,
    )
    if (this.plan.executionKind === 'representative-groups') {
      this.retimeAutomation(
        botCapPersistenceRequired
          ? this.context.automationIntervalSeconds
          : this.plan.finalAutomationTimeUntilNextEvent,
      )
    }
    this.state = {
      ...this.state,
      gameState: {
        ...this.state.gameState,
        infinity: {
          ...this.state.gameState.infinity,
          storedTimeUsedThisCycleSeconds: usage.currentCycleSeconds,
          storedTimeUsedPreviousCycleSeconds: usage.previousCycleSeconds,
        },
        timeline: {
          ...this.state.gameState.timeline,
          storedTimeAvailableSeconds: Math.max(
            0,
            this.bankBefore - consumedSeconds,
          ),
        },
      },
    }
    const terminal: StoredTimeJobTerminalMessage = Object.freeze({
      type: 'completed',
      protocolVersion: 1,
      jobId: this.jobId,
      candidate: this.state,
      consumedSeconds,
      remainingSeconds: Math.max(
        0,
        this.requestedSeconds - consumedSeconds,
      ),
      continuation: botCapPersistenceRequired
        ? { kind: 'bot-cap-persistence-required' as const }
        : { kind: 'complete' as const },
      progress: this.progress(),
    })
    this.terminal = terminal
    return terminal
  }

  private finishCancelled(): StoredTimeJobTerminalMessage {
    const terminal: StoredTimeJobTerminalMessage = Object.freeze({
      type: 'cancelled',
      protocolVersion: 1,
      jobId: this.jobId,
      progress: this.progress(),
    })
    this.terminal = terminal
    return terminal
  }

  private finishFailed(
    code: string,
    reason: string,
  ): StoredTimeJobTerminalMessage {
    const terminal: StoredTimeJobTerminalMessage = Object.freeze({
      type: 'failed',
      protocolVersion: 1,
      jobId: this.jobId,
      code,
      reason,
      progress: this.progress(),
    })
    this.terminal = terminal
    return terminal
  }
}

function eventCarrier(state: Readonly<CanonicalRuntimeState>) {
  return {
    gameState: state.gameState,
    compatibilityTuning: state.compatibilityTuning,
    evaluationSnapshot: state.evaluationSnapshot,
    entitlements: state.entitlements,
    tinker: normalizeCanonicalTinkerRuntimeState(state.tinker),
  }
}

function mergeSummary(
  target: SimulationPresentationSummary,
  source: Readonly<SimulationPresentationSummary>,
): void {
  target.ordinaryInfinityCount += source.ordinaryInfinityCount
  target.breakInfinityCount += source.breakInfinityCount
  target.ordinaryInfinityPoints += source.ordinaryInfinityPoints
  target.breakInfinityPoints += source.breakInfinityPoints
  target.botCapInfinityPoints += source.botCapInfinityPoints
  target.botCapOverflowRewards += source.botCapOverflowRewards
  target.meteorDreamResets += source.meteorDreamResets
  target.aiDreamResets += source.aiDreamResets
  target.globalWarmingDreamResets += source.globalWarmingDreamResets
  target.blackHoleDreamResets += source.blackHoleDreamResets
  target.strangeMatter += source.strangeMatter
  target.realityWorkers += source.realityWorkers
  target.automaticInfluence += source.automaticInfluence
  target.manualInfluence += source.manualInfluence
  target.realityCapacityStallSeconds += source.realityCapacityStallSeconds
}
