import { describe, expect, test } from 'vitest'
import { sameOrderedStrings } from './sameOrderedStrings'

describe('ordered string comparison', () => {
  test.each([
    [[], [], true],
    [['a', 'b'], ['a', 'b'], true],
    [['a'], ['a', 'b'], false],
    [['a', 'b'], ['b', 'a'], false],
    [['a', 'a'], ['a', 'b'], false],
  ] as const)('compares %o with %o as %s', (left, right, expected) => {
    expect(sameOrderedStrings(left, right)).toBe(expected)
  })
})
