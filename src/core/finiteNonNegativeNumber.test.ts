import { describe, expect, test } from 'vitest'
import {
  isFiniteNonNegativeNumber,
  isFinitePositiveNumber,
  isSafeNonNegativeInteger,
  isSafePositiveInteger,
} from './finiteNonNegativeNumber'

describe('finite non-negative number guard', () => {
  test.each([
    [0, true],
    [0.5, true],
    [Number.MAX_VALUE, true],
    [-1, false],
    [Number.NaN, false],
    [Number.POSITIVE_INFINITY, false],
    [Number.NEGATIVE_INFINITY, false],
    [0n, false],
    ['0', false],
    [null, false],
  ])('classifies %o as %s', (source, expected) => {
    expect(isFiniteNonNegativeNumber(source)).toBe(expected)
  })
})

describe('finite positive number guard', () => {
  test.each([
    [Number.MIN_VALUE, true],
    [0.5, true],
    [Number.MAX_VALUE, true],
    [0, false],
    [-1, false],
    [Number.NaN, false],
    [Number.POSITIVE_INFINITY, false],
    [0n, false],
    ['1', false],
    [null, false],
  ])('classifies %o as %s', (source, expected) => {
    expect(isFinitePositiveNumber(source)).toBe(expected)
  })
})

describe('safe non-negative integer guard', () => {
  test.each([
    [0, true],
    [Number.MAX_SAFE_INTEGER, true],
    [0.5, false],
    [-1, false],
    [Number.MAX_SAFE_INTEGER + 1, false],
    [Number.NaN, false],
    [Number.POSITIVE_INFINITY, false],
    [0n, false],
    ['0', false],
    [null, false],
  ])('classifies %o as %s', (source, expected) => {
    expect(isSafeNonNegativeInteger(source)).toBe(expected)
  })
})

describe('safe positive integer guard', () => {
  test.each([
    [1, true],
    [Number.MAX_SAFE_INTEGER, true],
    [0, false],
    [0.5, false],
    [-1, false],
    [Number.MAX_SAFE_INTEGER + 1, false],
    [Number.NaN, false],
    [Number.POSITIVE_INFINITY, false],
    [1n, false],
    ['1', false],
    [null, false],
  ])('classifies %o as %s', (source, expected) => {
    expect(isSafePositiveInteger(source)).toBe(expected)
  })
})
