import { describe, expect, test } from 'vitest'
import { formatUnknownError } from './unknownError'

describe('unknown error formatting', () => {
  test('uses the message from Error instances', () => {
    expect(formatUnknownError(new Error('failure'))).toBe('failure')
  })

  test.each([
    ['failure', 'failure'],
    [42, '42'],
    [null, 'null'],
    [{ code: 'failure' }, '[object Object]'],
  ])('stringifies non-Error value %o', (source, expected) => {
    expect(formatUnknownError(source)).toBe(expected)
  })
})
