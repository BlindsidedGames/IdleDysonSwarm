import { describe, expect, it } from 'vitest'
import {
  parseGameNumberInput,
  toDiscreteGameNumber,
} from './gameNumberInput'

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
})
