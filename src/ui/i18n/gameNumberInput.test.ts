import { describe, expect, test } from 'vitest'
import { DISCRETE_MAXIMUM } from '../../simulation/numeric'
import { GAME_NUMBER_PREFIXES } from './gameNumberMagnitudes'
import {
  parseGameNumberInput,
  toContinuousGameNumber,
  toDiscreteGameNumber,
} from './gameNumberInput'

describe('game number input', () => {
  test.each([
    ['100 Qi', 100_000_000_000_000_000_000n],
    ['100xqi', 100_000_000_000_000_000_000n],
    ['100 x qi', 100_000_000_000_000_000_000n],
    ['1.5 Sp', 1_500_000_000_000_000_000_000_000n],
    ['1,000', 1_000n],
    ['1e6', 1_000_000n],
  ])('parses %s exactly', (input, expected) => {
    const parsed = parseGameNumberInput(input)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(toDiscreteGameNumber(parsed.value, expected)).toEqual({
      ok: true,
      value: expected,
    })
  })

  test('round-trips every authored Standard suffix case-insensitively', () => {
    GAME_NUMBER_PREFIXES.forEach((suffix, index) => {
      if (suffix.length === 0) return
      const parsed = parseGameNumberInput(`1 x ${suffix.toUpperCase()}`)
      expect(parsed, suffix).toEqual({
        ok: true,
        value: { coefficient: 1n, exponent: index * 3 },
      })
    })
  })

  test('preserves the exact discrete maximum and rejects one step above', () => {
    const exact = parseGameNumberInput(DISCRETE_MAXIMUM.toString())
    const above = parseGameNumberInput((DISCRETE_MAXIMUM + 1n).toString())
    expect(exact.ok).toBe(true)
    expect(above.ok).toBe(true)
    if (!exact.ok || !above.ok) return
    expect(toDiscreteGameNumber(exact.value, DISCRETE_MAXIMUM)).toEqual({
      ok: true,
      value: DISCRETE_MAXIMUM,
    })
    expect(toDiscreteGameNumber(above.value, DISCRETE_MAXIMUM)).toEqual({
      ok: false,
      reason: 'above-maximum',
    })
  })

  test('distinguishes discrete fractions from continuous values', () => {
    const parsed = parseGameNumberInput('1.25')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(toContinuousGameNumber(parsed.value)).toEqual({
      ok: true,
      value: 1.25,
    })
    expect(toDiscreteGameNumber(parsed.value, DISCRETE_MAXIMUM)).toEqual({
      ok: false,
      reason: 'non-integer',
    })
  })

  test.each(['-1', '1e309', 'not a number'])('rejects %s safely', (input) => {
    const parsed = parseGameNumberInput(input)
    if (input === '1e309') {
      expect(parsed.ok).toBe(true)
      if (parsed.ok) {
        expect(toContinuousGameNumber(parsed.value)).toEqual({
          ok: false,
          reason: 'above-maximum',
        })
      }
      return
    }
    expect(parsed.ok).toBe(false)
  })
})
