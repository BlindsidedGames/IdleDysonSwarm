import { describe, expect, test, vi } from 'vitest'
import {
  DOUBLE_INFINITY_POINTS_EFFECT_STORAGE_KEY,
  DoubleInfinityPointsEffectPreferenceService,
} from './doubleInfinityPointsEffect'

describe('DoubleInfinityPointsEffectPreferenceService', () => {
  test.each([null, 'invalid', '{"version":1,"enabled":"yes"}'])(
    'defaults enabled for existing owners when storage is %s',
    (stored) => {
      const storage = { getItem: vi.fn(() => stored), setItem: vi.fn() }
      expect(new DoubleInfinityPointsEffectPreferenceService({ storage })
        .getSnapshot()).toBe(true)
    },
  )

  test('persists an explicit disabled choice across host recreation', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const preference = new DoubleInfinityPointsEffectPreferenceService({ storage })

    preference.setEnabled(false)

    expect(values.get(DOUBLE_INFINITY_POINTS_EFFECT_STORAGE_KEY)).toBe(
      '{"version":1,"enabled":false}',
    )
    expect(new DoubleInfinityPointsEffectPreferenceService({ storage })
      .getSnapshot()).toBe(false)
  })

  test('keeps the active selection when persistence is unavailable', () => {
    const preference = new DoubleInfinityPointsEffectPreferenceService({
      storage: {
        getItem: () => null,
        setItem: () => { throw new Error('unavailable') },
      },
    })

    preference.setEnabled(false)

    expect(preference.getSnapshot()).toBe(false)
  })
})
