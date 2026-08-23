import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearFormatterCachesForTests,
  formatDateTime,
  formatGameDuration,
  formatGameEnergy,
  formatGameEnergyParts,
  formatGameNumber,
  formatGameNumberParts,
  formatNumber,
  formatRelativeTime,
  getDateTimeFormatter,
  getNumberFormatter,
  getPluralRules,
  getRelativeTimeFormatter,
  NON_FINITE_NUMBER_FALLBACK,
  selectPlural,
} from './formatters'

describe('cached locale formatters', () => {
  beforeEach(() => clearFormatterCachesForTests())

  it('reuses equivalent number formatter requests independent of option order', () => {
    const first = getNumberFormatter('en', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })
    const second = getNumberFormatter('en', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
    expect(second).toBe(first)
    expect(
      getNumberFormatter('en-XA', { maximumFractionDigits: 2 }),
    ).not.toBe(first)
  })

  it('formats bigint without coercing it through an unsafe number', () => {
    const value = 9_007_199_254_740_993n
    const formatted = formatNumber('en', value, {
      useGrouping: false,
    })
    expect(formatted).toBe(value.toString())
  })

  it('uses a stable fallback for non-finite numeric presentation values', () => {
    const fallback = formatNumber('en', Number.NaN)
    expect(fallback).toBe('—')
    expect(fallback.codePointAt(0)).toBe(0x2014)
    expect(formatNumber('en', Number.POSITIVE_INFINITY)).toBe('—')
    expect(formatRelativeTime('en', Number.NEGATIVE_INFINITY, 'second'))
      .toBe('—')
  })

  it('matches the Unity three-digit truncated display format', () => {
    expect(formatGameNumber('en', 0)).toBe('0.00')
    expect(formatGameNumber('en', 0.8)).toBe('0.80')
    expect(formatGameNumber('en', 10)).toBe('10.0')
    expect(formatGameNumber('en', 14)).toBe('14.0')
    expect(formatGameNumber('en', 60.79)).toBe('60.7')
    expect(formatGameNumber('en', 999.9)).toBe('999')
    expect(formatGameNumber('en', 1234)).toBe('1.23K')
    expect(formatGameNumber('en', -12.39)).toBe('-12.3')
    expect(formatGameNumber('en', 12_039_871_001_422_293n)).toBe('12.0Qa')
    expect(formatGameNumber('en', -12_102_296_928_535_773n)).toBe('-12.1Qa')
  })

  it.each([
    ['standard', 999, '999'],
    ['standard', 1000, '1.00K'],
    ['standard', 999_999, '999K'],
    ['standard', 1_000_000, '1.00M'],
    ['scientific', 999, '999'],
    ['scientific', 1000, '1.00K'],
    ['scientific', 1001, '1.00e3'],
    ['scientific', -12_345, '-1.23e4'],
    ['engineering', 999, '999'],
    ['engineering', 1000, '1.00K'],
    ['engineering', 12_345, '12.3e3'],
    ['engineering', -1_234_567, '-1.23e6'],
  ] as const)('formats %s threshold value %s as %s', (mode, value, expected) => {
    expect(formatGameNumber('en', value, mode)).toBe(expected)
  })

  it('formats arbitrarily large bigint values without Number coercion', () => {
    const huge = BigInt(`123${'0'.repeat(399)}`)
    expect(formatGameNumber('en', huge, 'scientific')).toBe('1.23e401')
    expect(formatGameNumber('en', huge, 'engineering')).toBe('123e399')
    expect(formatGameNumber('en', -huge, 'scientific')).toBe('-1.23e401')
    expect(formatGameNumber('en', huge, 'standard')).toBe('123e399')
  })

  it.each(['standard', 'scientific', 'engineering'] as const)(
    'uses stable zero and non-finite fallbacks in %s mode',
    (mode) => {
      expect(formatGameNumber('en', 0, mode)).toBe('0.00')
      expect(formatGameNumber('en', Number.NaN, mode)).toBe('—')
      expect(formatGameNumber('en', Number.POSITIVE_INFINITY, mode)).toBe('—')
    },
  )

  it('applies notation to energy magnitude while preserving W and J units', () => {
    expect(formatGameEnergy('en', 1000, 'watts', 'scientific')).toBe('1.00 KW')
    expect(formatGameEnergy('en', 1001, 'watts', 'scientific')).toBe('1.00e3 W')
    expect(formatGameEnergy('en', 12_345, 'joules', 'engineering')).toBe('12.3e3 J')
  })

  it('matches the Unity watt and joule energy format', () => {
    expect(formatGameEnergy('en', 0, 'watts')).toBe('0.00 W')
    expect(formatGameEnergy('en', 0.8, 'watts')).toBe('0.80 W')
    expect(formatGameEnergy('en', 109_000, 'watts')).toBe('109 KW')
    expect(formatGameEnergy('en', 51_290_000, 'watts')).toBe('51.2 MW')
    expect(formatGameEnergy('en', 124_000_000_000, 'joules'))
      .toBe('124 GJ')
    expect(formatGameEnergy('en', Number.MAX_VALUE, 'joules')).toBe('MAX')
    expect(formatGameEnergy('en', -1, 'joules')).toBe('ERR')
    expect(formatGameEnergy('en', Number.POSITIVE_INFINITY, 'watts'))
      .toBe('ERR')
  })

  it('exposes Unity mantissas separately from suffixes and units', () => {
    expect(formatGameNumberParts('en', 1_234)).toEqual({
      value: '1.23',
      suffix: 'K',
    })
    expect(formatGameEnergyParts('en', 109_000, 'watts')).toEqual({
      value: '109',
      unit: 'KW',
    })
  })

  it('matches the Unity short-form gameplay duration format', () => {
    expect(formatGameDuration('en', 0)).toBe('0s')
    expect(formatGameDuration('en', 24.9)).toBe('24s')
    expect(
      formatGameDuration('en', 0.375, { maximumFractionDigits: 2 }),
    ).toBe('0.38s')
    expect(
      formatGameDuration('en', 61.25, { maximumFractionDigits: 2 }),
    ).toBe('1m 1.25s')
    expect(
      formatGameDuration('en', 0.3754, { maximumSignificantDigits: 3 }),
    ).toBe('0.375s')
    expect(
      formatGameDuration('en', 61.256, { maximumSignificantDigits: 3 }),
    ).toBe('1m 1.26s')
    expect(
      formatGameDuration('en', 0.4, {
        minimumSignificantDigits: 3,
        maximumSignificantDigits: 3,
      }),
    ).toBe('0.400s')
    expect(formatGameDuration('en', 300)).toBe('5m 0s')
    expect(formatGameDuration('en', 3_661)).toBe('1h 1m 1s')
    expect(formatGameDuration('en', 90_061)).toBe('1d 1h 1m 1s')
    expect(formatGameDuration('en', Number.POSITIVE_INFINITY)).toBe(
      NON_FINITE_NUMBER_FALLBACK,
    )
  })

  it('caches date, relative-time, and plural formatters', () => {
    expect(
      getDateTimeFormatter('en', { timeZone: 'UTC' }),
    ).toBe(getDateTimeFormatter('en', { timeZone: 'UTC' }))
    expect(
      getRelativeTimeFormatter('en', { numeric: 'always' }),
    ).toBe(getRelativeTimeFormatter('en', { numeric: 'always' }))
    expect(getPluralRules('en')).toBe(getPluralRules('en'))
  })

  it('formats deterministic date, relative-time, and plural values', () => {
    expect(
      formatDateTime('en', Date.UTC(2026, 6, 29), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      }),
    ).toBe('07/29/2026')
    expect(
      formatRelativeTime('en', -2, 'day', { numeric: 'always' }),
    ).toContain('2 days ago')
    expect(selectPlural('en', 1)).toBe('one')
    expect(selectPlural('en', 2)).toBe('other')
  })
})
