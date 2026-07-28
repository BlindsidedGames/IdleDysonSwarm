import { describe, expect, test } from 'vitest'
import { formatGameNumber, formatRate } from './formatNumber'

describe('game number formatting', () => {
  test.each([
    [0, '0'],
    [0.125, '0.125'],
    [12.345, '12.3'],
    [1_250, '1.25K'],
    [2_500_000, '2.5M'],
    [Number.MAX_VALUE, 'MAX'],
    [Number.POSITIVE_INFINITY, '—'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatGameNumber(value)).toBe(expected)
  })

  test('formats rates with a per-second suffix', () => {
    expect(formatRate(1_250)).toBe('1.25K/s')
  })
})
