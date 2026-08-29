import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import {
  createSimulationSummary,
  type EventTimeSimulationModel,
  type SimulationAdvanceRequest,
  type SimulationAdvanceResult,
  type SimulationWorkMetrics,
} from './types'

const TIME_EPSILON = 1e-12
const MAXIMUM_ZERO_TIME_PASSES = 32
export const DEFAULT_AUTOMATION_INTERVAL_SECONDS = 0.1
const DEFAULT_INFINITY_MINIMUM_CYCLE_SECONDS = 1 / 60
const DEFAULT_PROCESSING_BUDGET_MILLISECONDS = 4

function createWorkMetrics(): SimulationWorkMetrics {
  return {
    schedulerPasses: 0n,
    continuousSegments: 0n,
    materialEvents: 0n,
    automationEvents: 0n,
    exactSeconds: 0,
    processingMilliseconds: 0,
  }
}

function normalizeAutomationRemaining(
  value: number | undefined,
  interval: number,
): number {
  if (
    value === undefined ||
    !Number.isFinite(value) ||
    value <= TIME_EPSILON ||
    value > interval
  ) {
    return interval
  }
  return value
}

function normalizeHorizon(horizon: number, maximum: number): number {
  if (!isFiniteNonNegativeNumber(horizon)) return maximum
  return Math.min(maximum, horizon)
}

function timeToQueuedInput(
  inputs: readonly { readonly timeSeconds: number }[],
  index: number,
  consumedSeconds: number,
): number {
  const input = inputs[index]
  if (input === undefined || !Number.isFinite(input.timeSeconds)) {
    return Number.MAX_VALUE
  }
  return Math.max(0, input.timeSeconds - consumedSeconds)
}

export function advanceEventTime<
  TModel extends EventTimeSimulationModel<TModel>,
>(
  request: SimulationAdvanceRequest<TModel>,
): SimulationAdvanceResult<TModel> {
  const automationInterval =
    request.automationIntervalSeconds ?? DEFAULT_AUTOMATION_INTERVAL_SECONDS
  const infinityMinimumCycle =
    request.infinityMinimumCycleSeconds ??
    DEFAULT_INFINITY_MINIMUM_CYCLE_SECONDS
  const processingBudget =
    request.processingBudgetMilliseconds ??
    DEFAULT_PROCESSING_BUDGET_MILLISECONDS
  const candidateState =
    request.cloneStartingState === false
      ? request.startingState
      : request.startingState.clone()
  const summary = createSimulationSummary()
  const events: SimulationAdvanceResult<TModel>['events'] = []
  const work = createWorkMetrics()
  const collectEvents = request.collectEvents !== false
  const collectWorkMetrics = request.collectWorkMetrics !== false
  const inputs = request.queuedInputs ?? []
  let consumedSeconds = 0
  let remainingSeconds = request.durationSeconds
  let automationRemaining = normalizeAutomationRemaining(
    request.automationTimeUntilNextEvent,
    automationInterval,
  )
  let validationStatus: SimulationAdvanceResult<TModel>['validationStatus'] =
    'invalid-request'
  let diagnosticCode: string | undefined
  let queuedIndex = 0
  let zeroTimePasses = 0
  const startedAt = performance.now()

  const validRequest =
    candidateState !== undefined &&
    isFiniteNonNegativeNumber(request.durationSeconds) &&
    Number.isFinite(automationInterval) &&
    automationInterval > 0 &&
    Number.isFinite(infinityMinimumCycle) &&
    infinityMinimumCycle > 0 &&
    isFiniteNonNegativeNumber(processingBudget)

  if (validRequest) {
    diagnosticCode = validateSchedulerState(candidateState)
    validationStatus = diagnosticCode === undefined ? 'valid' : 'invalid-state'
  }

  while (
    validationStatus === 'valid' &&
    remainingSeconds > TIME_EPSILON
  ) {
    if (collectWorkMetrics) work.schedulerPasses += 1n

    if (request.cancelRequested?.() === true) {
      validationStatus = 'cancelled'
      break
    }
    if (
      processingBudget > 0 &&
      performance.now() - startedAt >= processingBudget &&
      consumedSeconds > TIME_EPSILON
    ) {
      validationStatus = 'yielded'
      break
    }

    const inputHorizon = timeToQueuedInput(
      inputs,
      queuedIndex,
      consumedSeconds,
    )
    const rawModelHorizon = candidateState.timeToNextMaterialEvent(
      remainingSeconds,
      infinityMinimumCycle,
    )
    const modelEventWithinRequest =
      Number.isFinite(rawModelHorizon) &&
      rawModelHorizon >= 0 &&
      rawModelHorizon <= remainingSeconds + TIME_EPSILON
    const automationWithinRequest =
      automationRemaining <= remainingSeconds + TIME_EPSILON
    const inputWithinRequest =
      inputHorizon <= remainingSeconds + TIME_EPSILON

    if (
      request.processPartialEndpoint === false &&
      !modelEventWithinRequest &&
      !automationWithinRequest &&
      !inputWithinRequest
    ) {
      validationStatus = 'yielded'
      break
    }

    const modelHorizon = normalizeHorizon(
      rawModelHorizon,
      remainingSeconds,
    )
    const horizon = Math.min(
      remainingSeconds,
      automationRemaining,
      modelHorizon,
      inputHorizon,
    )

    if (horizon > TIME_EPSILON) {
      candidateState.advanceContinuous(horizon)
      consumedSeconds += horizon
      remainingSeconds = Math.max(0, remainingSeconds - horizon)
      automationRemaining = Math.max(0, automationRemaining - horizon)
      if (collectWorkMetrics) {
        work.continuousSegments += 1n
        work.exactSeconds += horizon
      }
      zeroTimePasses = 0
    } else {
      zeroTimePasses += 1
      if (zeroTimePasses > MAXIMUM_ZERO_TIME_PASSES) {
        validationStatus = 'zero-time-loop'
        diagnosticCode = 'SIM-ZERO-TIME-LOOP'
        break
      }
    }

    let atInput =
      queuedIndex < inputs.length &&
      inputs[queuedIndex]!.timeSeconds <= consumedSeconds + TIME_EPSILON
    const atAutomation = automationRemaining <= TIME_EPSILON
    const atModelEvent =
      modelEventWithinRequest &&
      modelHorizon <= horizon + TIME_EPSILON
    const atEndpoint = remainingSeconds <= TIME_EPSILON
    const atBoundary = atModelEvent || atAutomation || atInput || atEndpoint

    if (atBoundary) {
      if (collectWorkMetrics) work.materialEvents += 1n
      candidateState.applyProductionArrivals(summary)
      if (collectEvents) {
        events.push({
          timeSeconds: consumedSeconds,
          kind: 'production-arrival',
        })
      }
    }

    while (atInput) {
      const input = inputs[queuedIndex]!
      queuedIndex += 1
      candidateState.applyQueuedInput(input, summary)
      if (collectEvents) {
        events.push({
          timeSeconds: consumedSeconds,
          kind: 'queued-input',
          stableOrder: queuedIndex,
          id: input.id,
        })
      }
      atInput =
        queuedIndex < inputs.length &&
        inputs[queuedIndex]!.timeSeconds <= consumedSeconds + TIME_EPSILON
    }

    if (atAutomation) {
      if (collectWorkMetrics) work.automationEvents += 1n
      candidateState.applyAutomation(
        request.automationPolicy ?? 'preserve-configured-mode',
        summary,
      )
      if (collectEvents) {
        events.push({
          timeSeconds: consumedSeconds,
          kind: 'automation',
        })
      }
      automationRemaining = automationInterval
    }

    if (atBoundary) {
      candidateState.applyDerivedTimersAndDoubleTime(horizon, summary)
      candidateState.applyDreamReset(summary)
      candidateState.applyBotCapTransition(summary)
      candidateState.applyInfinityReset(infinityMinimumCycle, summary)
    }

    diagnosticCode = validateSchedulerState(candidateState)
    if (diagnosticCode !== undefined) validationStatus = 'invalid-state'
  }

  remainingSeconds =
    remainingSeconds <= TIME_EPSILON ? 0 : Math.max(0, remainingSeconds)
  if (collectWorkMetrics) {
    work.processingMilliseconds = performance.now() - startedAt
  }

  return {
    candidateState,
    consumedSeconds,
    remainingSeconds,
    automationTimeUntilNextEvent: automationRemaining,
    validationStatus,
    summary,
    events,
    work,
    diagnosticCode,
    completed: validationStatus === 'valid' && remainingSeconds <= 0,
  }
}

function validateSchedulerState<TModel extends EventTimeSimulationModel<TModel>>(
  candidateState: TModel,
): string | undefined {
  return candidateState.validateIncremental === undefined
    ? candidateState.validate()
    : candidateState.validateIncremental()
}
