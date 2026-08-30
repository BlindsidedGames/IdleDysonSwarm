import { describe, expect, test } from 'vitest'
import { bitDecrement, bitIncrement, CONTINUOUS_MAXIMUM } from './numeric'
import {
  settleContinuousCredit,
  settleContinuousDebit,
  settleContinuousTransfer,
  settleDiscreteToContinuousTransfer,
} from './conservativeSettlement'

const COARSE_BALANCE = 2 ** 56
const COARSE_ULP = bitIncrement(COARSE_BALANCE) - COARSE_BALANCE

describe('conservative continuous settlement', () => {
  test.each([
    ['ordinary', 100, 20, 30, 1_000, 30],
    ['partial destination capacity', 100, 95, 20, 100, 5],
    ['coarse source', COARSE_BALANCE, 0, 10, CONTINUOUS_MAXIMUM, 8],
    ['coarse destination', 20, COARSE_BALANCE, 20, COARSE_BALANCE + 96, 16],
    ['sub-ULP request', 1e300, 0, 1, CONTINUOUS_MAXIMUM, 0],
    [
      'maximum saturation',
      1e300,
      bitDecrement(CONTINUOUS_MAXIMUM),
      1e300,
      CONTINUOUS_MAXIMUM,
      CONTINUOUS_MAXIMUM - bitDecrement(CONTINUOUS_MAXIMUM),
    ],
  ] as const)(
    '%s transfers one identical represented delta',
    (_label, source, destination, requested, maximum, expected) => {
      const result = settleContinuousTransfer(
        source,
        destination,
        requested,
        maximum,
      )

      expect(result.settled).toBe(expected)
      expect(source - result.sourceBalance).toBe(result.settled)
      expect(result.destinationBalance - destination).toBe(result.settled)
      expect(result.settled).toBeLessThanOrEqual(requested)
      expect(result.settled).toBeLessThanOrEqual(source)
      expect(result.destinationBalance).toBeLessThanOrEqual(maximum)
    },
  )

  test('separates conservative settlement from minimum-one-ULP purchase charging', () => {
    expect(settleContinuousDebit(COARSE_BALANCE, 1)).toEqual({
      balance: COARSE_BALANCE,
      settled: 0,
    })
    expect(settleContinuousCredit(COARSE_BALANCE, 10)).toEqual({
      balance: COARSE_BALANCE,
      settled: 0,
    })
    expect(COARSE_ULP).toBe(16)
  })

  test.each([
    1,
    8,
    10,
    16,
    20,
    100,
    Number.MAX_SAFE_INTEGER,
  ])('never creates or destroys source units for request %s', (requested) => {
    const source = COARSE_BALANCE + 1_024
    const destination = COARSE_BALANCE
    const result = settleContinuousTransfer(
      source,
      destination,
      requested,
    )

    expect(source - result.sourceBalance).toBe(result.settled)
    expect(result.destinationBalance - destination).toBe(result.settled)
    expect(result.settled).toBeGreaterThanOrEqual(0)
    expect(result.settled).toBeLessThanOrEqual(requested)
  })
})

describe('conservative discrete-to-continuous settlement', () => {
  test.each([
    ['ordinary', 128n, 0, 128n, CONTINUOUS_MAXIMUM, 128n],
    [
      'rounded bigint request',
      9_007_199_254_740_993n,
      0,
      9_007_199_254_740_993n,
      CONTINUOUS_MAXIMUM,
      9_007_199_254_740_992n,
    ],
    [
      'discrete maximum',
      9_223_372_036_854_775_807n,
      0,
      9_223_372_036_854_775_807n,
      CONTINUOUS_MAXIMUM,
      9_223_372_036_854_774_784n,
    ],
    ['coarse partial credit', 20n, COARSE_BALANCE, 20n, COARSE_BALANCE + 96, 16n],
    ['coarse rejected credit', 10n, COARSE_BALANCE, 10n, COARSE_BALANCE + 96, 0n],
    ['sub-ULP credit', 128n, 1e300, 128n, CONTINUOUS_MAXIMUM, 0n],
    ['partial capacity', 20n, 95, 20n, 100, 5n],
  ] as const)(
    '%s preserves every uncredited discrete unit',
    (_label, source, destination, requested, maximum, expected) => {
      const result = settleDiscreteToContinuousTransfer(
        source,
        destination,
        requested,
        maximum,
      )

      expect(result.settled).toBe(expected)
      expect(source - result.sourceBalance).toBe(result.settled)
      expect(
        result.destinationBalance - destination,
      ).toBe(Number(result.settled))
      expect(result.settled).toBeLessThanOrEqual(requested)
      expect(result.settled).toBeLessThanOrEqual(source)
    },
  )
})
