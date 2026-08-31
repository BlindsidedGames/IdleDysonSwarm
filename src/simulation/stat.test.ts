import { describe, expect, test } from 'vitest'
import { calculateStat } from './stat'

describe('canonical stat arithmetic', () => {
  test('saturates composed positive multipliers at the continuous maximum', () => {
    expect(
      calculateStat(1, [
        {
          id: 'first',
          operation: 'multiply',
          value: Number.MAX_VALUE,
          order: 1,
        },
        {
          id: 'second',
          operation: 'multiply',
          value: 2,
          order: 2,
        },
      ]),
    ).toBe(Number.MAX_VALUE)
  })

  test('preserves finite signed authored additions', () => {
    expect(
      calculateStat(10, [
        {
          id: 'signed-addition',
          operation: 'add',
          value: -5,
          order: 1,
        },
      ]),
    ).toBe(5)
  })
})
