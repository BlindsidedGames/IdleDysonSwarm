import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearFormatterCachesForTests,
  formatDateTime,
  formatNumber,
  formatRelativeTime,
  getDateTimeFormatter,
  getNumberFormatter,
  getPluralRules,
  getRelativeTimeFormatter,
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
