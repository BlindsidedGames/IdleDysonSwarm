import type { CanonicalRuntimeState } from '../../application/canonicalRuntimeSession'
import type { CanonicalEventTimeContext } from '../../simulation/canonicalEventTimeModel'
import { advanceGame } from '../../simulation/gameStep'
import {
  planStoredTimePolicy,
  speedUpStoredTimeTicks,
  STORED_TIME_MINIMUM_REMAINING_TICKS,
} from '../../simulation/storedTimePolicy'
import {
  createSimulationSummary,
  type SimulationPresentationSummary,
} from '../../simulation/types'
import { TIME_EPSILON_SECONDS as TIME_EPSILON } from '../../simulation/timeTolerance'
import {
  STORED_TIME_WORKER_PROTOCOL_VERSION,
  type StoredTimeJobProgress,
  type StoredTimeJobTerminalMessage,
} from './storedTimeProtocol'

export interface StoredTimeSimulationOptions {
  readonly jobId: string
  readonly state: CanonicalRuntimeState
  readonly requestedSeconds: number
  readonly infinityMinimumCycleSeconds: number
  readonly eventContext: Readonly<CanonicalEventTimeContext>
  readonly nowMilliseconds?: () => number
}

/** A detached AD-style coarse replay using the ordinary IDS game step. */
export class StoredTimeSimulation {
  private state: CanonicalRuntimeState
  private readonly jobId: string
  private readonly requestedSeconds: number
  private readonly infinityMinimumCycleSeconds: number
  private readonly context: Readonly<CanonicalEventTimeContext>
  private readonly now: () => number
  private readonly startedAt: number
  private readonly bankBefore: number
  private readonly initialTicks: number
  private remainingTicks: number
  private remainingSeconds: number
  private completedTicks = 0
  private maximumChunkMilliseconds = 0
  private terminal: StoredTimeJobTerminalMessage | null = null
  private readonly summary = createSimulationSummary()

  constructor(options: Readonly<StoredTimeSimulationOptions>) {
    this.state = structuredClone(options.state)
    this.jobId = options.jobId
    this.requestedSeconds = options.requestedSeconds
    this.infinityMinimumCycleSeconds = options.infinityMinimumCycleSeconds
    this.context = options.eventContext
    this.now = options.nowMilliseconds ?? (() => performance.now())
    this.startedAt = this.now()
    this.bankBefore = this.state.gameState.timeline.storedTimeAvailableSeconds
    const plan = planStoredTimePolicy({
      requestedSeconds: options.requestedSeconds,
      preset: this.state.gameState.timeline.processing.storedTimePreset,
    })
    this.initialTicks = plan.plannedTicks
    this.remainingTicks = plan.plannedTicks
    this.remainingSeconds = options.requestedSeconds
  }

  step(
    processingBudgetMilliseconds: number,
    cancelRequested: boolean,
  ): StoredTimeJobTerminalMessage | null {
    if (this.terminal !== null) return this.terminal
    if (cancelRequested) return this.finishCancelled()
    if (this.remainingTicks <= 0 || this.remainingSeconds <= TIME_EPSILON) {
      return this.finishCompleted()
    }
    const chunkStartedAt = this.now()
    do {
      const stepSeconds = this.remainingSeconds / this.remainingTicks
      const result = advanceGame(
        eventCarrier(this.state),
        {
          source: 'stored-time',
          baseSeconds: stepSeconds,
          automation: 'enabled',
        },
        this.context,
        this.infinityMinimumCycleSeconds,
      )
      this.state = { ...this.state, ...result.state }
      mergeSummary(this.summary, result.summary)
      if (result.botCapPersistenceRequired) {
        this.recordChunk(chunkStartedAt)
        return this.finishFailed(
          'CANONICAL-STORED-TIME-BOT-CAP-UNSETTLED',
          'Detached Stored Time replay could not settle its bot-cap transition.',
        )
      }
      if (result.issue !== undefined) {
        this.recordChunk(chunkStartedAt)
        return this.finishFailed(
          result.issue,
          `Stored Time game step failed as ${result.issue}.`,
        )
      }
      this.remainingSeconds = Math.max(0, this.remainingSeconds - stepSeconds)
      this.remainingTicks -= 1
      this.completedTicks += 1
      if (cancelRequested) {
        this.recordChunk(chunkStartedAt)
        return this.finishCancelled()
      }
    } while (
      this.remainingTicks > 0 &&
      this.remainingSeconds > TIME_EPSILON &&
      this.now() - chunkStartedAt < processingBudgetMilliseconds
    )
    this.recordChunk(chunkStartedAt)
    return this.remainingTicks <= 0 || this.remainingSeconds <= TIME_EPSILON
      ? this.finishCompleted()
      : null
  }

  speedUp(): boolean {
    if (this.terminal !== null || this.remainingTicks <= STORED_TIME_MINIMUM_REMAINING_TICKS) {
      return false
    }
    this.remainingTicks = speedUpStoredTimeTicks(this.remainingTicks)
    return true
  }

  progress(): StoredTimeJobProgress {
    const elapsedMilliseconds = Math.max(0, this.now() - this.startedAt)
    const computedSeconds = Math.max(0, this.requestedSeconds - this.remainingSeconds)
    const fraction = this.requestedSeconds <= 0
      ? 0
      : Math.min(1, computedSeconds / this.requestedSeconds)
    return Object.freeze({
      jobId: this.jobId,
      requestedSeconds: this.requestedSeconds,
      computedSeconds,
      fraction,
      elapsedMilliseconds,
      estimatedRemainingMilliseconds:
        fraction > 0 && fraction < 1
          ? elapsedMilliseconds * (1 - fraction) / fraction
          : fraction >= 1 ? 0 : null,
      maximumChunkMilliseconds: this.maximumChunkMilliseconds,
      completedTicks: this.completedTicks,
      remainingTicks: this.remainingTicks,
      plannedTicks: this.completedTicks + this.remainingTicks,
      currentStepSeconds:
        this.remainingTicks > 0 ? this.remainingSeconds / this.remainingTicks : 0,
      ticksPerSecond:
        elapsedMilliseconds > 0
          ? this.completedTicks / (elapsedMilliseconds / 1000)
          : 0,
      canSpeedUp: this.remainingTicks > STORED_TIME_MINIMUM_REMAINING_TICKS,
    })
  }

  diagnostics() {
    return Object.freeze({
      initialTicks: this.initialTicks,
      completedTicks: this.completedTicks,
      remainingTicks: this.remainingTicks,
      remainingSeconds: this.remainingSeconds,
      summary: Object.freeze(structuredClone(this.summary)),
    })
  }

  private finishCompleted(): StoredTimeJobTerminalMessage {
    this.state = {
      ...this.state,
      gameState: {
        ...this.state.gameState,
        timeline: {
          ...this.state.gameState.timeline,
          storedTimeAvailableSeconds: Math.max(0, this.bankBefore - this.requestedSeconds),
        },
      },
    }
    return this.setTerminal({
      type: 'completed',
      protocolVersion: STORED_TIME_WORKER_PROTOCOL_VERSION,
      jobId: this.jobId,
      candidate: this.state,
      consumedSeconds: this.requestedSeconds,
      remainingSeconds: 0,
      progress: this.progress(),
    })
  }

  private finishCancelled(): StoredTimeJobTerminalMessage {
    return this.setTerminal({
      type: 'cancelled',
      protocolVersion: STORED_TIME_WORKER_PROTOCOL_VERSION,
      jobId: this.jobId,
      progress: this.progress(),
    })
  }

  private finishFailed(code: string, reason: string): StoredTimeJobTerminalMessage {
    return this.setTerminal({
      type: 'failed',
      protocolVersion: STORED_TIME_WORKER_PROTOCOL_VERSION,
      jobId: this.jobId,
      code,
      reason,
      progress: this.progress(),
    })
  }

  private setTerminal(terminal: StoredTimeJobTerminalMessage): StoredTimeJobTerminalMessage {
    this.terminal = Object.freeze(terminal)
    return this.terminal
  }

  private recordChunk(startedAt: number): void {
    this.maximumChunkMilliseconds = Math.max(
      this.maximumChunkMilliseconds,
      Math.max(0, this.now() - startedAt),
    )
  }
}

function eventCarrier(state: Readonly<CanonicalRuntimeState>) {
  return {
    gameState: state.gameState,
    compatibilityTuning: state.compatibilityTuning,
    evaluationSnapshot: state.evaluationSnapshot,
    entitlements: state.entitlements,
    tinker: state.tinker,
  }
}

function mergeSummary(
  target: SimulationPresentationSummary,
  source: Readonly<SimulationPresentationSummary>,
): void {
  for (const key of Object.keys(target) as (keyof SimulationPresentationSummary)[]) {
    const value = source[key]
    if (typeof value === 'bigint') {
      ;(target[key] as bigint) += value
    } else {
      ;(target[key] as number) += value
    }
  }
}
