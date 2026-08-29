import { describe, expect, test } from 'vitest'
import { isNonArrayRecord } from './nonArrayRecord'

describe('non-array record guard', () => {
  test.each([
    [{}, true],
    [{ value: 1 }, true],
    [new Date(0), true],
    [[], false],
    [null, false],
    ['value', false],
    [42, false],
  ])('classifies %o as %s', (source, expected) => {
    expect(isNonArrayRecord(source)).toBe(expected)
  })
})
