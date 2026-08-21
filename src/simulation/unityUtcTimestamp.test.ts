import { describe, expect, test } from 'vitest'
import { parseUnityInvariantUtcTimestamp } from './unityUtcTimestamp'

describe('Unity invariant UTC timestamp parsing', () => {
  test.each([null, undefined, '', '   '])(
    'classifies %s as missing',
    (value) => {
      expect(parseUnityInvariantUtcTimestamp(value)).toEqual({
        status: 'missing',
      })
    },
  )

  test('parses Unity invariant 24-hour and 12-hour values as UTC', () => {
    const expected = Date.UTC(2026, 6, 29, 18, 5, 4, 125)
    expect(
      parseUnityInvariantUtcTimestamp('07/29/2026 18:05:04.125'),
    ).toEqual({ status: 'valid', utcMilliseconds: expected })
    expect(
      parseUnityInvariantUtcTimestamp('7/29/2026 6:05:04.1250000 PM'),
    ).toEqual({ status: 'valid', utcMilliseconds: expected })
  })

  test('parses ISO values with or without an explicit zone', () => {
    const expected = Date.UTC(2026, 6, 29, 18, 5, 4, 125)
    expect(
      parseUnityInvariantUtcTimestamp('2026-07-29T18:05:04.1250000'),
    ).toEqual({ status: 'valid', utcMilliseconds: expected })
    expect(
      parseUnityInvariantUtcTimestamp('2026-07-29T20:05:04.125+02:00'),
    ).toEqual({ status: 'valid', utcMilliseconds: expected })
  })

  test('preserves Unity years below 100 without JavaScript applying a 1900 offset', () => {
    expect(
      parseUnityInvariantUtcTimestamp('01/01/0001 00:00:00'),
    ).toEqual({
      status: 'valid',
      utcMilliseconds: -62_135_596_800_000,
    })
  })

  test.each([
    'not a date',
    '02/29/2025 10:00:00',
    '13/01/2026 10:00:00',
    '2026-07-29T25:00:00',
  ])('rejects invalid timestamp %s', (value) => {
    expect(parseUnityInvariantUtcTimestamp(value)).toEqual({
      status: 'invalid',
    })
  })
})
