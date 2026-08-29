import { describe, expect, test } from 'vitest'
import { clampUnitInterval } from './clampUnitInterval'

describe('raw unit interval clamping', () => {
  test.each([
    [-1, 0],
    [0, 0],
    [0.42, 0.42],
    [1, 1],
    [2, 1],
    [Number.NEGATIVE_INFINITY, 0],
    [Number.POSITIVE_INFINITY, 1],
  ])('clamps %s to %s', (source, expected) => {
    expect(clampUnitInterval(source)).toBe(expected)
  })

  test('preserves NaN', () => {
    expect(clampUnitInterval(Number.NaN)).toBeNaN()
  })
})
