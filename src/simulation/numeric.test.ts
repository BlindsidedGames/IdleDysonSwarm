import { describe, expect, test } from 'vitest'
import {
  DISCRETE_MAXIMUM,
  exactRoundedNonNegativeBigInt,
} from './numeric'

describe('exact rounded non-negative discrete conversion', () => {
  test.each([
    [0, 0n],
    [0.49, 0n],
    [0.5, 0n],
    [1.5, 2n],
    [2.5, 2n],
    [3.5, 4n],
    [Number.MAX_SAFE_INTEGER, BigInt(Number.MAX_SAFE_INTEGER)],
  ] as const)('converts %s to %s', (value, expected) => {
    expect(exactRoundedNonNegativeBigInt(value)).toBe(expected)
  })

  test.each([
    Number.NaN,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    -0.1,
    Number(DISCRETE_MAXIMUM),
    Number.MAX_VALUE,
  ])('rejects %s', (value) => {
    expect(exactRoundedNonNegativeBigInt(value)).toBeNull()
  })
})
