import { describe, expect, it } from 'vitest'
import { advanceDiscovery, discoveryBaseStrength, discoveryGrowingBonus, discoveryProductionMultiplier, discoveryPurchaseCost, EMPTY_DISCOVERY, validateDiscovery } from './discovery'

describe('Discovery progression', () => {
  const unlocked = { ...EMPTY_DISCOVERY, unlocked: true }
  it('starts at ten, adds a tenth per completion and five per power purchase', () => {
    expect(discoveryBaseStrength(unlocked)).toBe(10)
    const completed = advanceDiscovery(unlocked, 3600, 1)
    expect(completed.completions).toBe(1n)
    expect(discoveryBaseStrength(completed)).toBe(10.1)
    expect(discoveryBaseStrength({ ...unlocked, startingPower: 1n })).toBe(15)
  })
  it('does not progress while locked and preserves multi-completion remainders', () => {
    expect(advanceDiscovery(EMPTY_DISCOVERY, 7200, 1)).toBe(EMPTY_DISCOVERY)
    expect(advanceDiscovery({ ...unlocked, progress: 30 }, 3600, 2.5)).toEqual({ ...unlocked, completions: 2n, progress: 1830 })
  })
  it('enhances production above one without changing lifetime strength', () => {
    expect(discoveryProductionMultiplier(unlocked, 0.2)).toBeCloseTo(11.8)
    expect(discoveryBaseStrength(unlocked)).toBe(10)
  })
  it('prices permanent upgrades independently and rejects duplicate unlocks', () => {
    expect(discoveryPurchaseCost(EMPTY_DISCOVERY, 'unlock')).toBe(1n)
    expect(discoveryPurchaseCost(EMPTY_DISCOVERY, 'speed')).toBeNull()
    expect(discoveryPurchaseCost(unlocked, 'unlock')).toBeNull()
    expect(discoveryPurchaseCost({ ...unlocked, startingPower: 4n }, 'power')).toBe(5n)
    expect(discoveryPurchaseCost({ ...unlocked, startingPower: 4n }, 'speed')).toBe(1n)
  })
  it('bounds growing contributions and long processing intervals', () => {
    expect(discoveryGrowingBonus(-1)).toBe(0)
    expect(discoveryGrowingBonus(999)).toBeCloseTo(0.3)
    expect(discoveryGrowingBonus(Number.MAX_VALUE)).toBe(2)
    expect(validateDiscovery(advanceDiscovery(unlocked, Number.MAX_VALUE, 10))).toBeNull()
    expect(validateDiscovery({ ...unlocked, progress: 3600 })).not.toBeNull()
    expect(validateDiscovery({ ...EMPTY_DISCOVERY, completions: 1n })).not.toBeNull()
  })
})
