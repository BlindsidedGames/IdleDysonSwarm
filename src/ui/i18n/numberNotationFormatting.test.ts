import { describe, expect, test } from 'vitest'
import {
  formatGameEnergy,
  formatGameNumber,
  MIXED_NOTATION_SCIENTIFIC_THRESHOLD,
} from './formatters'

describe('Mixed number notation', () => {
  test('uses Standard suffixes throughout the Quintillion range', () => {
    expect(formatGameNumber('en', 1e18, { notation: 'mixed' }))
      .toBe('1.00Qi')
    expect(formatGameNumber('en', 999e18, { notation: 'mixed' }))
      .toBe('999Qi')
    expect(formatGameNumber('en', -999e18, { notation: 'mixed' }))
      .toBe('-999Qi')
  })

  test('switches to normalized Scientific notation at Sextillion', () => {
    expect(MIXED_NOTATION_SCIENTIFIC_THRESHOLD).toBe(1e21)
    expect(formatGameNumber('en', 1e21, { notation: 'mixed' }))
      .toBe('1.00e21')
    expect(formatGameNumber('en', 4.2e24, { notation: 'mixed' }))
      .toBe('4.20e24')
  })

  test('uses the same exact boundary for bigint values', () => {
    expect(formatGameNumber('en', 999_000_000_000_000_000_000n, {
      notation: 'mixed',
    })).toBe('999Qi')
    expect(formatGameNumber('en', 1_000_000_000_000_000_000_000n, {
      notation: 'mixed',
    })).toBe('1.00e21')
  })

  test('applies Mixed notation to energy without changing its unit', () => {
    expect(formatGameEnergy('en', 999e18, 'joules', 'mixed'))
      .toBe('999 EJ')
    expect(formatGameEnergy('en', 1e21, 'joules', 'mixed'))
      .toBe('1.00e21 J')
  })

  test('leaves the explicit Standard, Scientific, and Engineering modes intact', () => {
    expect(formatGameNumber('en', 1e21, { notation: 'standard' }))
      .toBe('1.00Sx')
    expect(formatGameNumber('en', 1e21, { notation: 'scientific' }))
      .toBe('1.00e21')
    expect(formatGameNumber('en', 1.23e22, { notation: 'engineering' }))
      .toBe('12.3e21')
  })
})
