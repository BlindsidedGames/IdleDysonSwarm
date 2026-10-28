import { describe, expect, test } from 'vitest'
import {
  CAPPED_GAME_DURATION_LABEL,
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
