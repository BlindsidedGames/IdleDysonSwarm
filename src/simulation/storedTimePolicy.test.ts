import { describe, expect, test } from 'vitest'
import {
  planStoredTimePolicy,
  speedUpStoredTimeTicks,
} from './storedTimePolicy'

describe('Stored Time coarse replay policy', () => {
  test('uses nominal 50 ms updates while below the selected cap', () => {
    expect(planStoredTimePolicy({
      requestedSeconds: 10,
      preset: 'fast',
    })).toMatchObject({
      nominalTicks: 200,
      plannedTicks: 200,
      initialStepSeconds: 0.05,
    })
  })

  test.each([
    ['fast', 5_000],
    ['balanced', 100_000],
    ['accurate', 1_000_000],
  ] as const)('caps %s replay at %i updates', (preset, maximum) => {
    const plan = planStoredTimePolicy({
      requestedSeconds: 365 * 86_400,
      preset,
    })
    expect(plan.plannedTicks).toBe(maximum)
    expect(plan.initialStepSeconds).toBe(
      plan.requestedSeconds / maximum,
    )
  })

  test('halves remaining updates without going below 500', () => {
    expect(speedUpStoredTimeTicks(100_000)).toBe(50_000)
    expect(speedUpStoredTimeTicks(501)).toBe(500)
    expect(speedUpStoredTimeTicks(500)).toBe(500)
  })
})
