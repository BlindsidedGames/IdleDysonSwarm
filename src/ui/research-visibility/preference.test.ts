import { describe, expect, test, vi } from 'vitest'
import {
  RESEARCH_VISIBILITY_STORAGE_KEY,
  ResearchVisibilityPreferenceService,
} from './preference'

function storage(initial?: string) {
  let value = initial ?? null
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, next: string) => { value = next }),
  }
}

describe('ResearchVisibilityPreferenceService', () => {
  test('defaults existing Web devices to showing completed Research', () => {
    const preference = new ResearchVisibilityPreferenceService({
      storage: storage(),
    })
    expect(preference.getSnapshot()).toBe(false)
  })

  test('reads once and persists explicit device-local changes', () => {
    const local = storage(JSON.stringify({
      version: 1,
      hideCompleted: true,
    }))
    const preference = new ResearchVisibilityPreferenceService({ storage: local })
    expect(preference.getSnapshot()).toBe(true)
    expect(local.getItem).toHaveBeenCalledOnce()
    expect(local.getItem).toHaveBeenCalledWith(
      RESEARCH_VISIBILITY_STORAGE_KEY,
    )

    preference.setHideCompleted(false)
    expect(JSON.parse(local.setItem.mock.calls[0]![1])).toEqual({
      version: 1,
      hideCompleted: false,
    })
    expect(new ResearchVisibilityPreferenceService({ storage: local }).getSnapshot())
      .toBe(false)
  })

  test.each([
    '{',
    JSON.stringify({ version: 2, hideCompleted: true }),
    JSON.stringify({ version: 1, hideCompleted: 'yes' }),
  ])('falls back safely for corrupt, future or invalid state', (value) => {
    expect(new ResearchVisibilityPreferenceService({
      storage: storage(value),
    }).getSnapshot()).toBe(false)
  })

  test('adopts a legacy Unity setting only once on an unconfigured device', () => {
    const local = storage()
    const preference = new ResearchVisibilityPreferenceService({ storage: local })
    expect(preference.adoptLegacyUnityHidePurchased(true)).toBe(true)
    expect(preference.getSnapshot()).toBe(true)
    expect(preference.adoptLegacyUnityHidePurchased(false)).toBe(false)

    const established = new ResearchVisibilityPreferenceService({ storage: local })
    expect(established.adoptLegacyUnityHidePurchased(false)).toBe(false)
    expect(established.getSnapshot()).toBe(true)
  })

  test('ignores invalid legacy values without writing', () => {
    const local = storage()
    const preference = new ResearchVisibilityPreferenceService({ storage: local })
    expect(preference.adoptLegacyUnityHidePurchased(1)).toBe(false)
    expect(local.setItem).not.toHaveBeenCalled()
  })
})
