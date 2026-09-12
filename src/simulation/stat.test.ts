import { describe, expect, test } from 'vitest'
import { calculateStat, orderStatEffects, type StatEffect } from './stat'

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


test('effect ordering preserves source ties and never mutates the input', () => {
  const orders = [3, 1, 1, -2, 0, Number.POSITIVE_INFINITY, Number.NaN]
  for (let offset = 0; offset < orders.length; offset += 1) {
    const effects: readonly StatEffect[] = Object.freeze(
      [...orders.slice(offset), ...orders.slice(0, offset)].map((order, index) =>
        Object.freeze({ id: String(index), operation: 'add' as const, value: index, order }),
      ),
    )
    const reference = effects
      .map((effect, index) => ({ effect, index }))
      .sort((left, right) => left.effect.order - right.effect.order || left.index - right.index)
      .map(({ effect }) => effect)
    const sorted = orderStatEffects(effects)
    expect(sorted).toEqual(reference)
    expect(sorted).not.toBe(effects)
  }
  expect(orderStatEffects([])).toEqual([])
})
