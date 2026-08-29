import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  readBooleanPresentationPreference,
  writeBooleanPresentationPreference,
} from './presentationPreferences'

describe('boolean presentation preferences', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['true', true],
    ['false', false],
    [null, false],
  ] as const)('reads %s as %s', (stored, expected) => {
    vi.stubGlobal('localStorage', {
      getItem: () => stored,
    })
    expect(readBooleanPresentationPreference('preference')).toBe(expected)
  })

  it('writes the string representation', () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { setItem })
    writeBooleanPresentationPreference('preference', true)
    expect(setItem).toHaveBeenCalledWith('preference', 'true')
  })

  it('fails closed when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('unavailable') },
      setItem: () => { throw new Error('unavailable') },
    })
    expect(readBooleanPresentationPreference('preference')).toBe(false)
    expect(() =>
      writeBooleanPresentationPreference('preference', true),
    ).not.toThrow()
  })
})
