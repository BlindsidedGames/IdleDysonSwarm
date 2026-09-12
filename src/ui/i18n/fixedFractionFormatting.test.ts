import { afterEach, expect, test } from 'vitest'
import {
  clearFormatterCachesForTests,
  formatGameEnergyParts,
  formatGameNumberParts,
  getNumberFormatter,
} from './formatters'
import { ENABLED_LOCALES } from './localeRegistry'

afterEach(clearFormatterCachesForTests)

test('fixed-fraction caching preserves localized decimal precision and notation mantissas', () => {
  for (const locale of ENABLED_LOCALES) {
    for (const [input, rounded, digits] of [
      [0, 0, 2], [1.234, 1.23, 2], [12.34, 12.3, 1], [123.4, 123, 0],
      [-1.234, -1.23, 2], [1234n, 1.23, 2], [1001n, 1, 2],
    ] as const) {
      const expected = new Intl.NumberFormat(locale, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
        useGrouping: false,
      }).format(rounded)
      for (const notation of ['standard', 'scientific', 'engineering', 'mixed'] as const) {
        expect(formatGameNumberParts(locale, input, { notation }).value).toBe(expected)
        if (typeof input === 'number' && input > 0) {
          expect(formatGameEnergyParts(locale, input, 'watts', notation).value).toBe(expected)
        }
      }
    }
  }
})

test('arbitrary option objects retain value-based caching when callers mutate or reorder them', () => {
  const options: Intl.NumberFormatOptions = { maximumFractionDigits: 1, useGrouping: false }
  const initial = getNumberFormatter('en', options)
  expect(initial.format(1.234)).toBe('1.2')
  options.maximumFractionDigits = 2
  const updated = getNumberFormatter('en', options)
  expect(updated.format(1.234)).toBe('1.23')
  expect(updated).not.toBe(initial)
  expect(getNumberFormatter('en', { useGrouping: false, maximumFractionDigits: 2 })).toBe(updated)
})
