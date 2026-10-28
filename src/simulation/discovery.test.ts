import { describe, expect, it } from 'vitest'
import { advanceDiscovery, discoveryBaseStrength, discoveryGrowingBonus, discoveryProductionMultiplier, discoveryPurchaseCost, EMPTY_DISCOVERY, EMPTY_DISCOVERY_TIER, discoveryCashBotsStrength, discoveryPanelLifetime, resetDiscoveryProgress, validateDiscovery } from './discovery'

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


describe('Discovery tiers', () => {
  const all = { ...EMPTY_DISCOVERY, unlocked: true, elevation: { ...EMPTY_DISCOVERY_TIER }, enlightenment: { ...EMPTY_DISCOVERY_TIER } }
  it('starts each unlocked benefit independently', () => {
    const first = { ...EMPTY_DISCOVERY, unlocked: true }
    expect(discoveryCashBotsStrength(first)).toBe(7)
    expect(discoveryPanelLifetime(first)).toBe(20)
    expect(discoveryCashBotsStrength(all)).toBe(10)
    expect(discoveryPanelLifetime(all)).toBe(30)
    expect(discoveryPurchaseCost(first, 'enlightenment')).toBeNull()
    expect(discoveryPurchaseCost(first, 'elevation-power')).toBeNull()
    expect(discoveryPurchaseCost(first, 'elevation')).toBe(3n)
    expect(discoveryPurchaseCost({ ...first, elevation: all.elevation }, 'enlightenment')).toBe(5n)
  })
  it.each([
    [0, 12n, 16n, 24n],
    [1, 35n, 27n, 30n],
    [10, 1232n, 216n, 84n],
  ])('preserves fixed time transfers with +%sx tree speed over four hours', (tree, discovery, elevation, enlightenment) => {
    const rates = { speed: 1 + tree, elevationSpeed: 1 + tree / 2, enlightenmentSpeed: 1 + tree / 4 }
    const whole = advanceDiscovery(all, 14400, rates)
    expect([whole.completions, whole.elevation?.completions, whole.enlightenment?.completions]).toEqual([discovery, elevation, enlightenment])
    let stepped = all
    for (let i = 0; i < 1440; i++) stepped = advanceDiscovery(stepped, 10, rates) as typeof all
    expect(stepped).toEqual(whole)
  })
  it('scales transferred time at the receiving speed and cascades receiving completions', () => {
    const before = { ...all, progress: 3500, elevation: { ...all.elevation, progress: 1700 }, enlightenment: { ...all.enlightenment, progress: 599 } }
    const after = advanceDiscovery(before, 1, { speed: 11, elevationSpeed: 6, enlightenmentSpeed: 3.5 })
    expect(after).toMatchObject({ completions: 11n, progress: 3511, elevation: { completions: 2n, progress: 1706 }, enlightenment: { completions: 1n, progress: 2.5 } })
    const reset = resetDiscoveryProgress({ ...after, startingPower: 2n, elevation: { ...after.elevation!, startingPower: 3n } })
    expect(reset).toEqual({ ...all, startingPower: 2n, elevation: { ...all.elevation, startingPower: 3n } })
  })
  it('keeps long spends finite and rejects malformed tier saves', () => {
    expect(validateDiscovery(advanceDiscovery(all, Number.MAX_VALUE, 100))).toBeNull()
    expect(validateDiscovery({ ...all, elevation: undefined })).not.toBeNull()
    expect(validateDiscovery({ ...all, enlightenment: { ...all.enlightenment, progress: 600 } })).not.toBeNull()
  })
})
