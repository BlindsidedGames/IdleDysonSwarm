import { describe, expect, test } from 'vitest'
import {
  RESEARCH_VISIBILITY_STORAGE_KEY,
  ResearchVisibilityPreferenceService,
} from './preference'

class MemoryStorage {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

describe('device-local Research visibility preference', () => {
  test('restores a V2 preference over stale device-local state', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      RESEARCH_VISIBILITY_STORAGE_KEY,
      JSON.stringify({ version: 1, hideCompleted: false }),
    )
    const preference = new ResearchVisibilityPreferenceService({ storage })

    expect(preference.restoreTransitionalV2HidePurchased(true)).toBe(true)

    expect(preference.getSnapshot()).toBe(true)
    expect(
      JSON.parse(storage.getItem(RESEARCH_VISIBILITY_STORAGE_KEY)!),
    ).toEqual({ version: 1, hideCompleted: true })
  })
})
