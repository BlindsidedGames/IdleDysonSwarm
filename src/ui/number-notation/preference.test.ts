import { afterEach, describe, expect, test, vi } from 'vitest'
import { setActiveNumberNotation } from './contracts'
import {
  NUMBER_NOTATION_STORAGE_KEY,
  NumberNotationPreferenceService,
} from './preference'

function storage(initial?: string) {
  let value = initial ?? null
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, next: string) => { value = next }),
  }
}

describe('NumberNotationPreferenceService', () => {
  afterEach(() => setActiveNumberNotation('standard'))
  test('reads versioned device state once and persists only explicit changes', () => {
    const local = storage(JSON.stringify({ version: 1, mode: 'scientific' }))
    const preference = new NumberNotationPreferenceService({ storage: local })
    expect(preference.getSnapshot()).toBe('scientific')
    expect(local.getItem).toHaveBeenCalledOnce()
    expect(local.getItem).toHaveBeenCalledWith(NUMBER_NOTATION_STORAGE_KEY)
    expect(local.setItem).not.toHaveBeenCalled()

    preference.setMode('engineering')
    expect(local.getItem).toHaveBeenCalledOnce()
    expect(local.setItem).toHaveBeenCalledOnce()
    expect(JSON.parse(local.setItem.mock.calls[0]![1])).toEqual({
      version: 1,
      mode: 'engineering',
    })
  })

  test.each([
    undefined,
    '{',
    JSON.stringify({ version: 2, mode: 'scientific' }),
    JSON.stringify({ version: 1, mode: 'unknown' }),
  ])('falls back safely for missing, corrupt, future or unknown state', (value) => {
    const preference = new NumberNotationPreferenceService({ storage: storage(value) })
    expect(preference.getSnapshot()).toBe('standard')
  })

  test('reloads the explicitly persisted selection', () => {
    const local = storage()
    new NumberNotationPreferenceService({ storage: local }).setMode('engineering')
    expect(new NumberNotationPreferenceService({ storage: local }).getSnapshot())
      .toBe('engineering')
  })

  test('adopts valid legacy Unity state once only when no device state exists', () => {
    const local = storage()
    const preference = new NumberNotationPreferenceService({ storage: local })
    expect(preference.adoptLegacyUnityNumberFormatting(1)).toBe(true)
    expect(preference.getSnapshot()).toBe('scientific')
    expect(preference.adoptLegacyUnityNumberFormatting(2)).toBe(false)
    expect(preference.getSnapshot()).toBe('scientific')

    const established = new NumberNotationPreferenceService({ storage: local })
    expect(established.adoptLegacyUnityNumberFormatting(0)).toBe(false)
    expect(established.getSnapshot()).toBe('scientific')
  })

  test('ignores unknown legacy values without writing', () => {
    const local = storage()
    const preference = new NumberNotationPreferenceService({ storage: local })
    expect(preference.adoptLegacyUnityNumberFormatting(3)).toBe(false)
    expect(local.setItem).not.toHaveBeenCalled()
  })
})
