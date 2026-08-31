import { describe, expect, it } from 'vitest'
import {
  parseGameNumberInput,
  parseSignedGameNumberInput,
  toContinuousGameNumber,
  toDiscreteGameNumber,
} from './gameNumberInput'
import { GAME_NUMBER_PREFIXES } from './gameNumberMagnitudes'

describe('localized game-number input', () => {
  it.each([
    ['en', '1.23M'],
    ['fr', '1,23M'],
    ['de', '1,23M'],
    ['es-419', '1.23M'],
    ['pt-BR', '1,23M'],
    ['ru', '1,23M'],
    ['zh-CN', '1.23M'],
    ['ja', '1.23M'],
  ] as const)('parses %s decimal culture', (locale, input) => {
    const parsed = parseGameNumberInput(input, locale)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(toDiscreteGameNumber(parsed.value, 2_147_483_647n)).toEqual({
      ok: true,
      value: 1_230_000n,
    })
  })

  it('parses localized grouping and decimal separators together', () => {
    const parsed = parseGameNumberInput('1.234,5K', 'de')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(toDiscreteGameNumber(parsed.value, 2_147_483_647n)).toEqual({
      ok: true,
      value: 1_234_500n,
    })
  })

  it('retains shorthand fractional coefficients', () => {
    const parsed = parseGameNumberInput(',5M', 'de')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(toDiscreteGameNumber(parsed.value, 2_147_483_647n)).toEqual({
      ok: true,
      value: 500_000n,
    })
  })

  it.each([
    ['e14', 100_000_000_000_000n],
    ['E+14', 100_000_000_000_000n],
    ['100Qi', 100_000_000_000_000_000_000n],
    ['100 x qi', 100_000_000_000_000_000_000n],
    ['100×QI', 100_000_000_000_000_000_000n],
  ])('parses %s using the complete game-number grammar', (input, value) => {
    const parsed = parseGameNumberInput(input)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(
      toDiscreteGameNumber(parsed.value, 1_000_000_000_000_000_000_000n),
    ).toEqual({ ok: true, value })
  })

  it('parses every formatter suffix in joined, spaced, mixed-case and multiplied forms', () => {
    for (const [index, suffix] of GAME_NUMBER_PREFIXES.entries()) {
      if (suffix.length === 0) continue
      for (const input of [
        `1${suffix}`,
        `1 ${suffix.toLowerCase()}`,
        `1x${suffix.toUpperCase()}`,
        `1 × ${suffix}`,
      ]) {
        expect(parseGameNumberInput(input)).toEqual({
          ok: true,
          value: {
            coefficient: 1n,
            exponent: index * 3,
          },
        })
      }
    }
  })

  it('supports exponent-only fractions but still rejects a missing exponent', () => {
    const parsed = parseGameNumberInput('e-2')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(toContinuousGameNumber(parsed.value)).toEqual({
      ok: true,
      value: 0.01,
    })
    expect(parseGameNumberInput('e')).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })

  it('keeps ordinary player inputs non-negative', () => {
    expect(parseGameNumberInput('-e14')).toEqual({
      ok: false,
      reason: 'negative',
    })
  })

  it.each([
    ['-e14', -100_000_000_000_000n],
    ['-100 Qi', -100_000_000_000_000_000_000n],
  ])('parses signed resource adjustment %s exactly', (input, value) => {
    const parsed = parseSignedGameNumberInput(input)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(
      toDiscreteGameNumber(parsed.value, 1_000_000_000_000_000_000_000n),
    ).toEqual({ ok: true, value })
  })

  it('converts signed continuous adjustments without losing their sign', () => {
    const parsed = parseSignedGameNumberInput('-1.5M')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(toContinuousGameNumber(parsed.value)).toEqual({
      ok: true,
      value: -1_500_000,
    })
  })

  it('retains integer validation for signed discrete adjustments', () => {
    const parsed = parseSignedGameNumberInput('-0.5')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(toDiscreteGameNumber(parsed.value, 100n)).toEqual({
      ok: false,
      reason: 'non-integer',
    })
  })
})
