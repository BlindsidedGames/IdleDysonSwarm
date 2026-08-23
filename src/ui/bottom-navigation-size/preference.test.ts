import { describe, expect, test, vi } from 'vitest'
import {
  BOTTOM_NAVIGATION_SIZE_STORAGE_KEY,
  BottomNavigationSizePreferenceService,
} from './preference'

function storage(initial?: string) {
  let value = initial ?? null
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, next: string) => { value = next }),
  }
}

describe('BottomNavigationSizePreferenceService', () => {
  test('defaults safely to Compact without writing', () => {
    const local = storage()
    const preference = new BottomNavigationSizePreferenceService({ storage: local })

    expect(preference.getSnapshot()).toBe('compact')
    expect(local.getItem).toHaveBeenCalledOnce()
    expect(local.getItem).toHaveBeenCalledWith(
      BOTTOM_NAVIGATION_SIZE_STORAGE_KEY,
    )
    expect(local.setItem).not.toHaveBeenCalled()
  })

  test.each([
    '{',
    JSON.stringify({ version: 2, size: 'large' }),
    JSON.stringify({ version: 1, size: 'unknown' }),
  ])('ignores corrupt, future or unknown stored state', (value) => {
    expect(new BottomNavigationSizePreferenceService({
      storage: storage(value),
    }).getSnapshot()).toBe('compact')
  })

  test('persists explicit changes and restores them after reload', () => {
    const local = storage()
    const preference = new BottomNavigationSizePreferenceService({ storage: local })
    const listener = vi.fn()
    preference.subscribe(listener)

    preference.setSize('large')
    expect(listener).toHaveBeenCalledOnce()
    expect(JSON.parse(local.setItem.mock.calls[0]![1])).toEqual({
      version: 1,
      size: 'large',
    })
    expect(new BottomNavigationSizePreferenceService({ storage: local })
      .getSnapshot()).toBe('large')
  })

  test('contains unavailable storage failures', () => {
    const preference = new BottomNavigationSizePreferenceService({
      storage: {
        getItem: () => { throw new Error('blocked') },
        setItem: () => { throw new Error('blocked') },
      },
    })
    expect(preference.getSnapshot()).toBe('compact')
    expect(() => preference.setSize('standard')).not.toThrow()
    expect(preference.getSnapshot()).toBe('standard')
  })
})
