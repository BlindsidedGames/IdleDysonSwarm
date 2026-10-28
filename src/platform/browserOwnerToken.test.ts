import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  createBrowserOwnerToken,
  createBrowserRandomToken,
} from './browserOwnerToken'

describe('browser owner token', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('uses the browser UUID capability when available', () => {
    const getRandomValues = vi.fn()
    vi.stubGlobal('crypto', {
      randomUUID: () => '11111111-2222-4333-8444-555555555555',
      getRandomValues,
    })

    expect(createBrowserOwnerToken()).toBe(
      '11111111-2222-4333-8444-555555555555',
    )
    expect(getRandomValues).not.toHaveBeenCalled()
  })

  test('falls back to a 16-byte lowercase hexadecimal token', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (values: Uint8Array) => {
        values.forEach((_, index) => {
          values[index] = index
        })
        return values
      },
    })

    expect(createBrowserOwnerToken()).toBe(
      '000102030405060708090a0b0c0d0e0f',
    )
  })

  test('preserves the 12-byte legacy identifier fallback width', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (values: Uint8Array) => {
        values.fill(0xab)
        return values
      },
    })

    expect(createBrowserRandomToken(12)).toBe(
      'abababababababababababab',
    )
  })
})
