import { describe, expect, test } from 'vitest'
import {
  readStringArray,
  readUnityBoolean,
} from './runtimeValueGuards'

describe('runtime game-data value guards', () => {
  test.each([
    [true, true],
    [1, true],
    [false, false],
    [0, false],
    [2, undefined],
    ['true', undefined],
    [null, undefined],
  ])('reads Unity boolean %o as %s', (source, expected) => {
    expect(readUnityBoolean(source)).toBe(expected)
  })

  test('returns valid string arrays by reference', () => {
    const source = Object.freeze(['alpha', 'beta'])
    expect(readStringArray(source)).toBe(source)
    expect(readStringArray([])).toEqual([])
  })

  test.each([
    [null],
    [{}],
    ['alpha'],
    [['alpha', 1]],
  ])('rejects non-string-array value %o', (source) => {
    expect(readStringArray(source)).toBeUndefined()
  })
})
