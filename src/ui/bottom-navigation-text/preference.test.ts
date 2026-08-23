import { describe, expect, test, vi } from 'vitest'
import {
  BOTTOM_NAVIGATION_TEXT_STORAGE_KEY,
  BottomNavigationTextPreferenceService,
  LEGACY_BOTTOM_NAVIGATION_SIZE_STORAGE_KEY,
} from './preference'

function storage(initial: Readonly<Record<string, string>> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value) }),
  }
}

describe('BottomNavigationTextPreferenceService', () => {
  test('defaults safely to icon-only without writing', () => {
    const local = storage()
    const preference = new BottomNavigationTextPreferenceService({ storage: local })

    expect(preference.getSnapshot()).toBe(false)
    expect(local.setItem).not.toHaveBeenCalled()
  })

  test.each([
    ['large', true],
    ['compact', false],
    ['standard', false],
  ] as const)('migrates legacy %s sizing once', (size, includeText) => {
    const local = storage({
      [LEGACY_BOTTOM_NAVIGATION_SIZE_STORAGE_KEY]: JSON.stringify({
        version: 1,
        size,
      }),
    })
    const preference = new BottomNavigationTextPreferenceService({ storage: local })

    expect(preference.getSnapshot()).toBe(includeText)
    expect(JSON.parse(local.setItem.mock.calls[0]![1])).toEqual({
      version: 1,
      includeText,
    })
  })

  test('prefers an established current value over legacy sizing', () => {
    const local = storage({
      [BOTTOM_NAVIGATION_TEXT_STORAGE_KEY]: JSON.stringify({
        version: 1,
        includeText: false,
      }),
      [LEGACY_BOTTOM_NAVIGATION_SIZE_STORAGE_KEY]: JSON.stringify({
        version: 1,
        size: 'large',
      }),
    })
    expect(new BottomNavigationTextPreferenceService({ storage: local })
      .getSnapshot()).toBe(false)
    expect(local.setItem).not.toHaveBeenCalled()
  })

  test.each([
    '{',
    JSON.stringify({ version: 2, includeText: true }),
    JSON.stringify({ version: 1, includeText: 'yes' }),
  ])('ignores corrupt, future or invalid current state', (value) => {
    expect(new BottomNavigationTextPreferenceService({
      storage: storage({ [BOTTOM_NAVIGATION_TEXT_STORAGE_KEY]: value }),
    }).getSnapshot()).toBe(false)
  })

  test('persists explicit changes and restores them after reload', () => {
    const local = storage()
    const preference = new BottomNavigationTextPreferenceService({ storage: local })
    const listener = vi.fn()
    preference.subscribe(listener)

    preference.setIncludeText(true)
    expect(listener).toHaveBeenCalledOnce()
    expect(new BottomNavigationTextPreferenceService({ storage: local })
      .getSnapshot()).toBe(true)
  })

  test('contains unavailable storage failures', () => {
    const preference = new BottomNavigationTextPreferenceService({
      storage: {
        getItem: () => { throw new Error('blocked') },
        setItem: () => { throw new Error('blocked') },
      },
    })
    expect(preference.getSnapshot()).toBe(false)
    expect(() => preference.setIncludeText(true)).not.toThrow()
    expect(preference.getSnapshot()).toBe(true)
  })
})
