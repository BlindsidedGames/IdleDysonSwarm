import { describe, expect, test } from 'vitest'
import {
  NUMBER_NOTATION_STORAGE_KEY,
  NumberNotationPreferenceService,
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

describe('device-local number notation preference', () => {
  test('defaults an installation without a preference to Mixed', () => {
    const storage = new MemoryStorage()
    const preference = new NumberNotationPreferenceService({ storage })

    expect(preference.getSnapshot()).toBe('mixed')
    expect(storage.getItem(NUMBER_NOTATION_STORAGE_KEY)).toBeNull()
  })

  test('preserves an existing explicit Standard preference', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      NUMBER_NOTATION_STORAGE_KEY,
      JSON.stringify({ version: 1, mode: 'standard' }),
    )

    const preference = new NumberNotationPreferenceService({ storage })

    expect(preference.getSnapshot()).toBe('standard')
  })

  test('writes Mixed as a validated version-one preference', () => {
    const storage = new MemoryStorage()
    const preference = new NumberNotationPreferenceService({ storage })

    preference.setMode('standard')
    preference.setMode('mixed')

    expect(JSON.parse(storage.getItem(NUMBER_NOTATION_STORAGE_KEY)!)).toEqual({
      version: 1,
      mode: 'mixed',
    })
  })

  test('retains trusted legacy Unity notation adoption', () => {
    const preference = new NumberNotationPreferenceService({
      storage: new MemoryStorage(),
    })

    expect(preference.adoptLegacyUnityNumberFormatting(0)).toBe(true)
    expect(preference.getSnapshot()).toBe('standard')
  })

  test('restores a V2 preference over stale device-local state', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      NUMBER_NOTATION_STORAGE_KEY,
      JSON.stringify({ version: 1, mode: 'standard' }),
    )
    const preference = new NumberNotationPreferenceService({ storage })

    expect(preference.restoreTransitionalV2NumberFormatting(2)).toBe(true)

    expect(preference.getSnapshot()).toBe('engineering')
    expect(JSON.parse(storage.getItem(NUMBER_NOTATION_STORAGE_KEY)!)).toEqual({
      version: 1,
      mode: 'engineering',
    })
  })
})
