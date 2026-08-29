import { describe, expect, test } from 'vitest'
import { isFiniteNonNegativeNumber } from './finiteNonNegativeNumber'

describe('finite non-negative number guard', () => {
  test.each([
    [0, true],
    [0.5, true],
    [Number.MAX_VALUE, true],
    [-1, false],
    [Number.NaN, false],
    [Number.POSITIVE_INFINITY, false],
    [Number.NEGATIVE_INFINITY, false],
    [0n, false],
    ['0', false],
    [null, false],
  ])('classifies %o as %s', (source, expected) => {
    expect(isFiniteNonNegativeNumber(source)).toBe(expected)
  })
})
