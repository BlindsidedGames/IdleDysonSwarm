import { describe, expect, it } from 'vitest'
import { gameDecimalFromCanonicalString } from '../math/gameDecimal'
import {
  boundedPresentationFraction,
  boundedPresentationWholeQuotient,
  comparePresentationNumeric,
} from './presentationNumeric'

describe('presentation numeric helpers', () => {
  it('compares values beyond the JavaScript number range without narrowing', () => {
    expect(comparePresentationNumeric(
      gameDecimalFromCanonicalString('1e1000'),
      gameDecimalFromCanonicalString('9e999'),
    )).toBeGreaterThan(0)
  })

  it('returns only a bounded display fraction', () => {
    expect(boundedPresentationFraction(
      gameDecimalFromCanonicalString('5e999'),
      gameDecimalFromCanonicalString('1e1000'),
    )).toBe(0.5)
    expect(boundedPresentationFraction(
      gameDecimalFromCanonicalString('1e1001'),
      gameDecimalFromCanonicalString('1e1000'),
    )).toBe(1)
  })

  it('caps display-only whole quotients before bigint conversion', () => {
    expect(boundedPresentationWholeQuotient(
      gameDecimalFromCanonicalString('1e1000'),
      2n,
      1_000n,
    )).toBe(1_000n)
  })
})
