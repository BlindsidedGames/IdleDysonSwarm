import { describe, expect, test } from 'vitest'
import { parseInfinityTargetInput } from './parseInfinityTarget'

describe('parseInfinityTargetInput', () => {
  test.each([
    ['42', 42n],
    ['2,147,483,647', 2_147_483_647n],
    ['2_147_483_647', 2_147_483_647n],
    ['2 147 483 647', 2_147_483_647n],
    ['1.5K', 1_500n],
    ['1,234.5K', 1_234_500n],
    ['2.1e3', 2_100n],
    ['42 IP', 42n],
  ])('parses %s as an exact target', (input, expected) => {
    expect(parseInfinityTargetInput(input)).toEqual({ ok: true, value: expected })
  })

  test.each([
    ['', 'empty'],
    ['wat', 'malformed'],
    ['-1', 'non-positive'],
    ['0', 'non-positive'],
    ['1.25', 'non-integer'],
    ['1,5K', 'malformed'],
    ['1,2,3', 'malformed'],
    ['1,234_567', 'malformed'],
    ['12 34', 'malformed'],
    ['3B', 'too-large'],
    ['Infinity', 'malformed'],
  ] as const)('rejects %s as %s', (input, reason) => {
    expect(parseInfinityTargetInput(input)).toEqual({ ok: false, reason })
  })
})
