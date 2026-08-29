import { describe, expect, test } from 'vitest'
import { normalizeCanonicalBotDistribution } from './botDistribution'

describe('canonical bot distribution normalization', () => {
  test.each([
    [-1, 0],
    [0, 0],
    [0.424, 0.42],
    [0.425, 0.43],
    [1, 1],
    [2, 1],
  ])('normalizes %s to %s', (source, expected) => {
    expect(normalizeCanonicalBotDistribution(source)).toBe(expected)
  })

  test.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite value %s',
    (source) => {
      expect(normalizeCanonicalBotDistribution(source)).toBeNull()
    },
  )
})
