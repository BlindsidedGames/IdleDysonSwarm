import { describe, expect, test } from 'vitest'
import { advanceEventTime } from './eventTime'
import type {
  EventTimeSimulationModel,
  SimulationAutomationPolicy,
  SimulationPresentationSummary,
  SimulationQueuedInput,
} from './types'

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

  test('is deterministic across caller frame partitions', () => {
    const whole = advanceEventTime({
      startingState: new CharacterizationModel(),
      durationSeconds: 0.35,
      automationIntervalSeconds: 0.1,
      automationTimeUntilNextEvent: 0.1,
      processingBudgetMilliseconds: 0,
    })

    const splitModel = new CharacterizationModel()
    let phase = 0.1
    for (const durationSeconds of [0.07, 0.11, 0.17]) {
      const part = advanceEventTime({
        startingState: splitModel,
        durationSeconds,
        automationIntervalSeconds: 0.1,
        automationTimeUntilNextEvent: phase,
        processingBudgetMilliseconds: 0,
        cloneStartingState: false,
      })
      phase = part.automationTimeUntilNextEvent
    }

    expect(splitModel.advancedSeconds).toBeCloseTo(
      whole.candidateState.advancedSeconds,
      12,
    )
    expect(phase).toBeCloseTo(whole.automationTimeUntilNextEvent, 12)
    expect(splitModel.calls.filter((call) => call === 'automation')).toHaveLength(
      whole.candidateState.calls.filter((call) => call === 'automation').length,
    )
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
