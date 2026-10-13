import { describe, expect, test } from 'vitest'
import {
  CAPPED_GAME_DURATION_LABEL,
  formatGameCountdown,
  formatGameDuration,
  NON_FINITE_NUMBER_FALLBACK,
} from './formatters'

describe('game duration formatting', () => {
  test('uses a deliberate label for the finite Stored Time ceiling', () => {
    expect(formatGameDuration('en', Number.MAX_VALUE)).toBe(
      CAPPED_GAME_DURATION_LABEL,
    )
    expect(formatGameDuration('en', -Number.MAX_VALUE)).toBe(
      CAPPED_GAME_DURATION_LABEL,
    )
  })

  test('keeps non-finite values distinct from the deliberate cap', () => {
    expect(formatGameDuration('en', Number.POSITIVE_INFINITY)).toBe(
      NON_FINITE_NUMBER_FALLBACK,
    )
  })

  test('retains ordinary duration decomposition', () => {
    expect(formatGameDuration('en', 90_061)).toBe('1d 1h 1m 1s')
  })
})

// Countdown precision is a player-visible contract, separate from elapsed stats.
describe('live countdown formatting', () => {
  test.each([
    [0, '0.00s'], [0.004, '0.00s'], [0.04, '0.04s'], [0.4, '0.40s'],
    [1, '1.00s'], [12, '12.0s'], [9.995, '9.99s'], [59.95, '1m 0s'],
    [59.999, '1m 0s'], [60, '1m 0s'], [60.001, '1m 0s'],
    [119.999, '1m 59s'], [120, '2m 0s'],
  ] as const)('formats %s seconds as %s', (seconds, expected) => {
    expect(formatGameCountdown('en', seconds)).toBe(expected)
  })

  test('localizes the decimal and retains existing invalid/capped duration labels', () => {
    expect(formatGameCountdown('de', 0.4)).toBe('0,40s')
    expect(formatGameCountdown('en', Infinity)).toBe(NON_FINITE_NUMBER_FALLBACK)
    expect(formatGameCountdown('en', Number.MAX_VALUE)).toBe(CAPPED_GAME_DURATION_LABEL)
  })

  test('keeps historical duration precision independent from countdown precision', () => {
    expect(formatGameDuration('en', 61.25, { minimumSignificantDigits: 3, maximumSignificantDigits: 3 })).toBe('1m 1.25s')
    expect(formatGameDuration('en', 0.004, { maximumFractionDigits: 2 })).toBe('0s')
  })
})
