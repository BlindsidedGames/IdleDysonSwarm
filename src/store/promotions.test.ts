import { afterEach, expect, test, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

test.each(['working', 'read-failure', 'write-failure'] as const)('promotion history rotates with %s storage', async mode => {
  vi.resetModules()
  const entries = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => {
      if (mode === 'read-failure') throw new Error('Unavailable')
      return entries.get(key) ?? null
    },
    setItem: (key: string, value: string) => {
      if (mode !== 'working') throw new Error('Unavailable')
      entries.set(key, value)
    },
  })
  const { nextPromotion, eligiblePromotions } = await import('./promotions')
  const count = eligiblePromotions('android').length
  expect(count).toBeGreaterThan(1)
  const cycle = Array.from({ length: count }, () => nextPromotion('android')!.id)
  expect(new Set(cycle).size).toBe(count)
  expect(nextPromotion('android')!.id).toBe(cycle[0])
})
