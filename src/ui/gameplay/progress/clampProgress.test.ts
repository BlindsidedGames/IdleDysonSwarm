import { describe, expect, test } from 'vitest'
import { clampProgress } from './clampProgress'

describe('visual progress clamping', () => {
  test.each([
    [-1, 0],
    [0, 0],
    [0.42, 0.42],
    [1, 1],
    [2, 1],
  ])('clamps %s to %s', (source, expected) => {
    expect(clampProgress(source)).toBe(expected)
  })

  test.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'maps non-finite value %s to zero',
    (source) => {
      expect(clampProgress(source)).toBe(0)
    },
  )
})
