import { describe, expect, test, vi } from 'vitest'
import { advanceEventTime } from './eventTime'
import type {
  EventTimeSimulationModel,
  SimulationAutomationPolicy,
  SimulationPresentationSummary,
  SimulationQueuedInput,
} from './types'
import { transferEventTimeModelOwnership } from './types'

class CharacterizationModel
  implements EventTimeSimulationModel<CharacterizationModel>
{
  calls: string[] = []
  advanceSegments: number[] = []
  advancedSeconds = 0
  eventHorizon = 10
  configuredMode = 10
  breakTarget = 0n
  lastAutomationPolicy?: SimulationAutomationPolicy
  invalidCode?: string

  clone(): CharacterizationModel {
    const copy = new CharacterizationModel()
    Object.assign(copy, this)
    copy.calls = [...this.calls]
    copy.advanceSegments = [...this.advanceSegments]
    return copy
  }

  validate(): string | undefined {
    return this.invalidCode
  }

  timeToNextMaterialEvent(maximumSeconds: number): number {
    return Math.min(maximumSeconds, this.eventHorizon)
  }

  advanceContinuous(seconds: number): void {
    this.calls.push('advance')
    this.advanceSegments.push(seconds)
    this.advancedSeconds += seconds
  }

  applyProductionArrivals(): void {
    this.calls.push('production')
  }

  applyAutomation(policy: SimulationAutomationPolicy): void {
    this.calls.push('automation')
    this.lastAutomationPolicy = policy
  }

  applyDerivedTimersAndDoubleTime(): void {
    this.calls.push('derived')
  }

  applyDreamReset(): void {
    this.calls.push('dream')
  }

  applyBotCapTransition(): void {
    this.calls.push('bot-cap')
  }

  applyInfinityReset(): void {
    this.calls.push('infinity')
  }

  applyQueuedInput(input: SimulationQueuedInput): void {
    this.calls.push('input')
    if (input.kind === 'break-target') {
      this.breakTarget = input.discreteValue ?? 0n
    }
  }
}

describe('event-time scheduler characterization', () => {
  test('preserves the approved coincident boundary order', () => {
    const result = advanceEventTime({
      startingState: Object.assign(new CharacterizationModel(), {
        eventHorizon: 0.1,
      }),
      durationSeconds: 0.1,
      automationIntervalSeconds: 0.1,
      automationTimeUntilNextEvent: 0.1,
      processingBudgetMilliseconds: 0,
      queuedInputs: [
        {
          timeSeconds: 0.1,
          kind: 'break-target',
          discreteValue: 42n,
        },
      ],
    })

    expect(result.completed).toBe(true)
    expect(result.candidateState.calls).toEqual([
      'advance',
      'production',
      'input',
      'automation',
      'derived',
      'dream',
      'bot-cap',
      'infinity',
    ])
  })

  test('forces stored-time Buy Max without changing the configured mode', () => {
    const model = new CharacterizationModel()
    model.configuredMode = 10
    const result = advanceEventTime({
      startingState: model,
      durationSeconds: 0.1,
      automationPolicy: 'force-buy-max',
      automationIntervalSeconds: 0.1,
      automationTimeUntilNextEvent: 0.1,
      processingBudgetMilliseconds: 0,
    })

    expect(result.candidateState.configuredMode).toBe(10)
    expect(result.candidateState.lastAutomationPolicy).toBe('force-buy-max')
  })

  test('applies a queued slider change only to unprocessed time', () => {
    const result = advanceEventTime({
      startingState: new CharacterizationModel(),
      durationSeconds: 0.25,
      automationIntervalSeconds: 1,
      automationTimeUntilNextEvent: 1,
      processingBudgetMilliseconds: 0,
      queuedInputs: [
        {
          timeSeconds: 0.15,
          kind: 'break-target',
          discreteValue: 99n,
        },
      ],
    })

    expect(result.completed).toBe(true)
    expect(result.candidateState.advancedSeconds).toBeCloseTo(0.25, 12)
    expect(result.candidateState.breakTarget).toBe(99n)
    expect(result.candidateState.advanceSegments).toEqual([0.15, 0.1])
  })

  test('uses bounded model validation when the model provides it', () => {
    const model = new CharacterizationModel()
    const fullValidation = vi.spyOn(model, 'validate')
    const incrementalValidation = vi.fn(() => undefined)
    model.validateIncremental = incrementalValidation

    const result = advanceEventTime({
      startingState: transferEventTimeModelOwnership(model),
      cloneStartingState: false,
      durationSeconds: 0.1,
      automationIntervalSeconds: 1,
      automationTimeUntilNextEvent: 1,
      processingBudgetMilliseconds: 0,
    })

    expect(result.completed).toBe(true)
    expect(incrementalValidation).toHaveBeenCalled()
    expect(fullValidation).not.toHaveBeenCalled()
  })

  test('mutates an explicitly transferred model without cloning it', () => {
    const model = new CharacterizationModel()
    let cloneCalls = 0
    model.clone = () => {
      cloneCalls += 1
      return new CharacterizationModel()
    }

    const result = advanceEventTime({
      startingState: transferEventTimeModelOwnership(model),
      cloneStartingState: false,
      durationSeconds: 0.1,
      processingBudgetMilliseconds: 0,
    })

    expect(cloneCalls).toBe(0)
    expect(result.candidateState).toBe(model)
    expect(model.advancedSeconds).toBeCloseTo(0.1, 12)
  })

  test('rejects non-finite state after a boundary', () => {
    class InvalidatingModel extends CharacterizationModel {
      override clone(): InvalidatingModel {
        const copy = new InvalidatingModel()
        Object.assign(copy, this)
        copy.calls = [...this.calls]
        copy.advanceSegments = [...this.advanceSegments]
        return copy
      }

      override applyProductionArrivals(
        _summary?: SimulationPresentationSummary,
      ): void {
        super.applyProductionArrivals()
        this.invalidCode = 'SIM-NON-FINITE'
      }
    }

    const result = advanceEventTime({
      startingState: new InvalidatingModel(),
      durationSeconds: 0.1,
      automationIntervalSeconds: 0.1,
      processingBudgetMilliseconds: 0,
    })

    expect(result.validationStatus).toBe('invalid-state')
    expect(result.diagnosticCode).toBe('SIM-NON-FINITE')
  })
})
