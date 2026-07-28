import type {
  DomainTransition,
  SimulationEngineDefinition,
} from '../core/contracts'
import { TransactionalSimulationEngine } from '../core/simulationEngine'
import {
  BasicDysonSimulationModel,
  type BasicDysonState,
} from './dysonModel'
import { advanceEventTime } from './eventTime'
import {
  type SimulationPresentationSummary,
} from './types'

export const BASIC_DYSON_SLICE_SCHEMA = 1 as const

export interface BasicDysonSliceState {
  model: BasicDysonState
  automationTimeUntilNextEvent: number
  lastAdvanceSummary: SimulationPresentationSummary
}

export type BasicDysonSliceCommand = never

export interface BasicDysonSliceDefinitionOptions {
  readonly automationIntervalSeconds?: number
  readonly infinityMinimumCycleSeconds?: number
}

export function createBasicDysonSliceDefinition(
  options: BasicDysonSliceDefinitionOptions = {},
): SimulationEngineDefinition<
  BasicDysonSliceState,
  BasicDysonSliceCommand
> {
  const automationIntervalSeconds =
    options.automationIntervalSeconds ?? 0.1
  const infinityMinimumCycleSeconds =
    options.infinityMinimumCycleSeconds ?? 1 / 60

  return {
    schema: BASIC_DYSON_SLICE_SCHEMA,
    cloneState: (state) => structuredClone(state),
    validateState: (state) => {
      const modelError = new BasicDysonSimulationModel(
        state.model,
      ).validate()
      if (modelError) return modelError
      const phase = state.automationTimeUntilNextEvent
      if (
        !Number.isFinite(phase) ||
        phase <= 0 ||
        phase > automationIntervalSeconds
      ) {
        return 'SIM-DYSON-AUTOMATION-PHASE-INVALID'
      }
      return undefined
    },
    applyCommand: (_candidate, _command) => ({
      accepted: false,
      code: 'SIM-DYSON-SLICE-NO-COMMANDS',
      reason:
        'No command behavior is claimed by the Basic Dyson parity slice.',
    }),
    advance: (candidate, milliseconds): DomainTransition => {
      const result = advanceEventTime({
        startingState: new BasicDysonSimulationModel(candidate.model),
        durationSeconds: milliseconds / 1000,
        automationIntervalSeconds,
        automationTimeUntilNextEvent:
          candidate.automationTimeUntilNextEvent,
        infinityMinimumCycleSeconds,
        processingBudgetMilliseconds: 0,
      })
      if (!result.completed) {
        return {
          accepted: false,
          code:
            result.diagnosticCode ?? 'SIM-DYSON-ADVANCE-INCOMPLETE',
          reason: `Basic Dyson parity advance ended as ${result.validationStatus}.`,
        }
      }
      candidate.model = result.candidateState.state
      candidate.automationTimeUntilNextEvent =
        result.automationTimeUntilNextEvent
      candidate.lastAdvanceSummary = structuredClone(result.summary)
      return { accepted: true, changed: true }
    },
  }
}

export function createBasicDysonSliceEngine(
  initialState: BasicDysonSliceState,
  options: BasicDysonSliceDefinitionOptions = {},
): TransactionalSimulationEngine<
  BasicDysonSliceState,
  BasicDysonSliceCommand
> {
  return new TransactionalSimulationEngine(
    initialState,
    createBasicDysonSliceDefinition(options),
  )
}
