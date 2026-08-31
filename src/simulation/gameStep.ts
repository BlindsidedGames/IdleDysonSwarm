import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import type { ProcessingSource } from '../game-state/types'
import type { CanonicalEventTimeContext } from './canonicalEventTimeModel'
import {
  CanonicalEventTimeModel,
  prepareCanonicalEventTimeContextVariants,
  withCanonicalEventTimeAutomationInterval,
  type CanonicalEventTimeState,
} from './canonicalEventTimeModel'
import { evaluateCanonicalBotCapCheckpoint } from './canonicalBotCapCheckpoint'
import { createSimulationSummary, type SimulationPresentationSummary } from './types'
import { addContinuous } from './numeric'

export type { ProcessingSource } from '../game-state/types'
export type ProcessingAutomation = 'enabled' | 'suppressed'

export interface GameStepInput {
  readonly source: ProcessingSource
  readonly baseSeconds: number
  readonly automation: ProcessingAutomation
}

export interface GameStepResult {
  readonly state: CanonicalEventTimeState
  readonly baseSecondsConsumed: number
  readonly gameSecondsAdvanced: number
  readonly gameSpeed: number
  readonly summary: Readonly<SimulationPresentationSummary>
  readonly issue?: string
  readonly botCapPersistenceRequired: boolean
}

export interface StoredTimeReplayCompletionResult {
  readonly state: CanonicalEventTimeState
  readonly summary: Readonly<SimulationPresentationSummary>
  readonly issue?: string
}

/**
 * Settles bookkeeping caused by the final Stored Time production interval.
 * This is deliberately not a gameplay update: it advances no clocks, offers
 * no automation or prestige opportunity, and consumes no Stored Time.
 */
export function settleStoredTimeReplayCompletion(
  state: CanonicalEventTimeState,
  context: Readonly<CanonicalEventTimeContext>,
): StoredTimeReplayCompletionResult {
  const summary = createSimulationSummary()
  if (
    evaluateCanonicalBotCapCheckpoint(state.gameState).action.kind !== 'persist'
  ) {
    return {
      state,
      summary: Object.freeze({ ...summary }),
    }
  }
  const automationTimeUntilNextEvent =
    state.gameState.timeline.automationTimeUntilNextEvent
  const storedTimeContext =
    prepareCanonicalEventTimeContextVariants(context).storedTime
  const model = CanonicalEventTimeModel.fromOwnedState(
    state,
    storedTimeContext,
  )
  model.settleDetachedBotCapAtReplayCompletion(summary)
  const issue = model.issue?.code
  const settledState = model.takeState()
  const phasePreservedState =
    settledState.gameState.timeline.automationTimeUntilNextEvent ===
      automationTimeUntilNextEvent
      ? settledState
      : {
          ...settledState,
          gameState: {
            ...settledState.gameState,
            timeline: {
              ...settledState.gameState.timeline,
              automationTimeUntilNextEvent,
            },
          },
        }
  return {
    state: phasePreservedState,
    summary: Object.freeze({ ...summary }),
    issue,
  }
}

/**
 * Advances one authoritative IDS gameplay update. The amount of elapsed game
 * time may be large, but automation and automatic prestige are each offered
 * exactly one boundary opportunity.
 */
export function advanceGame(
  state: CanonicalEventTimeState,
  input: Readonly<GameStepInput>,
  context: Readonly<CanonicalEventTimeContext>,
  infinityMinimumCycleSeconds: number,
): GameStepResult {
  if (!isFiniteNonNegativeNumber(input.baseSeconds)) {
    throw new RangeError('Game-step base seconds must be finite and non-negative.')
  }
  const gameSpeed = state.gameState.timeline.doubleTime.unlocked ? 2 : 1
  const gameSeconds = input.baseSeconds * gameSpeed
  if (!Number.isFinite(gameSeconds)) {
    throw new RangeError('Game-step elapsed game time must be finite.')
  }

  const variants = prepareCanonicalEventTimeContextVariants(context)
  const sourceContext = input.source === 'active'
    ? variants.active
    : variants.storedTime
  const stepContext = withCanonicalEventTimeAutomationInterval(
    sourceContext,
    Math.max(Number.EPSILON, gameSeconds || input.baseSeconds || 0.001),
    1 / gameSpeed,
  )
  const stepState = {
    ...state,
    gameState: {
      ...state.gameState,
      infinity: input.source === 'stored-time'
        ? {
            ...state.gameState.infinity,
            activeAutomaticThroughputCycleEligible: false,
          }
        : state.gameState.infinity,
      timeline: {
        ...state.gameState.timeline,
        automationTimeUntilNextEvent:
          stepContext.automationIntervalSeconds,
      },
    },
  }
  const model = CanonicalEventTimeModel.fromOwnedState(stepState, stepContext)
  const summary = createSimulationSummary()

  // Bot-cap bookkeeping is a mandatory state boundary, not an automated
  // action. It must settle even when a final active-time residue suppresses
  // optional automation for cadence preservation.
  if (input.source === 'stored-time') {
    model.applyDetachedBotCapTransition(summary)
  } else {
    model.applyBotCapTransition(summary)
  }
  if (model.issue?.code === 'CANONICAL_EVENT_BOT_CAP_PERSISTENCE_REQUIRED') {
    return finish(model, 0, 0, gameSpeed, summary, true)
  }

  if (input.automation === 'enabled') {
    model.applyAutomation('preserve-configured-mode', summary)
    model.applyDerivedTimersAndDoubleTime(0, summary)
    model.applyDreamReset(summary)
    if (input.source === 'active') model.sampleInfinityRatePeak()
    model.applyInfinityReset(
      infinityMinimumCycleSeconds,
      summary,
      false,
      false,
    )
  }

  if (gameSeconds > 0) {
    model.advanceContinuous(gameSeconds)
    model.applyProductionArrivals(summary)
    model.applyDerivedTimersAndDoubleTime(gameSeconds, summary)
  }
  model.finishStep()
  return finish(
    model,
    input.baseSeconds,
    gameSeconds,
    gameSpeed,
    summary,
    false,
    input.source === 'stored-time' ? input.baseSeconds : 0,
  )
}

function finish(
  model: CanonicalEventTimeModel,
  baseSecondsConsumed: number,
  gameSecondsAdvanced: number,
  gameSpeed: number,
  summary: SimulationPresentationSummary,
  botCapPersistenceRequired: boolean,
  storedTimeConsumedSeconds = 0,
): GameStepResult {
  const issue = model.issue?.code
  const state = model.takeState()
  const resultState = storedTimeConsumedSeconds > 0
    ? {
        ...state,
        gameState: {
          ...state.gameState,
          infinity: {
            ...state.gameState.infinity,
            storedTimeUsedThisCycleSeconds: addContinuous(
              state.gameState.infinity.storedTimeUsedThisCycleSeconds,
              storedTimeConsumedSeconds,
            ),
          },
        },
      }
    : state
  return {
    state: resultState,
    baseSecondsConsumed,
    gameSecondsAdvanced,
    gameSpeed,
    summary: Object.freeze({ ...summary }),
    issue,
    botCapPersistenceRequired,
  }
}
