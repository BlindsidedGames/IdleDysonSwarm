import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearFormatterCachesForTests,
  formatDateTime,
  formatGameDuration,
  formatGameNumber,
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
  })

  it('matches the Unity short-form gameplay duration format', () => {
    expect(formatGameDuration('en', 0)).toBe('0s')
    expect(formatGameDuration('en', 24.9)).toBe('24s')
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
