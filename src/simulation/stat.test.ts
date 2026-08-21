import { describe, expect, test } from 'vitest'
import { calculateStat, operationFromUnity } from './stat'

describe('Unity stat calculation parity', () => {
  test('preserves stable effect ordering', () => {
    expect(
      calculateStat(2, [
        { id: 'late', operation: 'multiply', value: 3, order: 20 },
        { id: 'first', operation: 'add', value: 2, order: 10 },
        { id: 'same-order', operation: 'add', value: 1, order: 10 },
      ]),
    ).toBe(15)
  })

  test('ports every Unity operation identifier', () => {
    expect([0, 1, 2, 3, 4, 5].map(operationFromUnity)).toEqual([
      'add',
      'multiply',
      'power',
      'override',
      'clamp-min',
      'clamp-max',
    ])
  })

  test('applies power, override and clamps in authored order', () => {
    expect(
      calculateStat(3, [
        { id: 'power', operation: 'power', value: 2, order: 1 },
        { id: 'max', operation: 'clamp-max', value: 8, order: 2 },
        { id: 'override', operation: 'override', value: 4, order: 3 },
        { id: 'min', operation: 'clamp-min', value: 5, order: 4 },
      ]),
    ).toBe(5)
  })
})
