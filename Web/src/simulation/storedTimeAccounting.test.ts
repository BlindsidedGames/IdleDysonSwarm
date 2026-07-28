import { describe, expect, test } from 'vitest'
import {
  completeStoredTimeInfinityAggregate,
  recordStoredTimeWithoutInfinityReset,
} from './storedTimeAccounting'

describe('stored-time Infinity accounting', () => {
  test('adds a no-reset interval to the current cycle only', () => {
    expect(
      recordStoredTimeWithoutInfinityReset(12, 7, 30),
    ).toEqual({
      currentCycleSeconds: 42,
      previousCycleSeconds: 7,
    })
  })

  test('one completed cycle reports current plus the whole consumed request', () => {
    expect(
      completeStoredTimeInfinityAggregate(12, 7, 30, 1n, 3),
    ).toEqual({
      currentCycleSeconds: 0,
      previousCycleSeconds: 42,
    })
  })

  test('multiple completed cycles report only the last cycle duration', () => {
    expect(
      completeStoredTimeInfinityAggregate(12, 7, 30, 4n, 3.5),
    ).toEqual({
      currentCycleSeconds: 0,
      previousCycleSeconds: 3.5,
    })
  })

  test('repairs invalid numeric inputs through canonical clamps', () => {
    expect(
      completeStoredTimeInfinityAggregate(
        Number.NaN,
        -1,
        Number.POSITIVE_INFINITY,
        0n,
        Number.NaN,
      ),
    ).toEqual({
      currentCycleSeconds: Number.MAX_VALUE,
      previousCycleSeconds: 0,
    })
  })
})
