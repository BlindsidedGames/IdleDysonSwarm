import { describe, expect, test } from 'vitest'
import { compareGraphs } from './compare'

describe('golden-master graph comparison', () => {
  test('reports exact paths and supports expected-subset fixtures', () => {
    expect(
      compareGraphs(
        { money: 42, nested: { points: 2n, extra: true } },
        { money: 42, nested: { points: 3n } },
        { expectedSubset: true },
      ),
    ).toEqual([
      {
        path: '$.nested.points',
        expected: 3n,
        actual: 2n,
        reason: 'value',
      },
    ])
  })
})
