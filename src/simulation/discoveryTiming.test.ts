import { describe, expect, it } from 'vitest'
import { advanceDiscovery, discoveryCompletionTimes, EMPTY_DISCOVERY, EMPTY_DISCOVERY_TIER } from './discovery'

describe('Discovery completion boundaries across Stored Time step sizes', () => {
  it.each([500, 5_000, 100_000])('awards exactly one day of completions using %i fractional steps', (ticks) => {
    let discovery = { ...EMPTY_DISCOVERY, unlocked: true }
    let remaining = 86_400
    for (let count = ticks; count > 0; count -= 1) {
      // Matches StoredTimeSimulation's remainder-preserving step allocation.
      const seconds = remaining / count
      discovery = advanceDiscovery(discovery, seconds, 1)
      remaining = Math.max(0, remaining - seconds)
    }
    expect(discovery.completions).toBe(24n)
    expect(discovery.progress).toBeCloseTo(0, 5)
  })

  it('does not grant a completion for a genuinely unfinished bar', () => {
    const discovery = advanceDiscovery({ ...EMPTY_DISCOVERY, unlocked: true }, 3599.999, 1)
    expect(discovery.completions).toBe(0n)
    expect(discovery.progress).toBe(3599.999)
  })
})


it('shows independent full-cycle timers, regardless of unlocked supporting bars', () => {
  const rates = { speed: 1, elevationSpeed: 1, enlightenmentSpeed: 1 }
  const one = { ...EMPTY_DISCOVERY, unlocked: true }
  const two = { ...one, elevation: { ...EMPTY_DISCOVERY_TIER } }
  const three = { ...two, enlightenment: { ...EMPTY_DISCOVERY_TIER } }
  expect(discoveryCompletionTimes(one, rates)).toEqual([3600, 0, 0])
  expect(discoveryCompletionTimes(two, rates)).toEqual([3600, 1800, 0])
  expect(discoveryCompletionTimes(three, rates)).toEqual([3600, 1800, 600])
})

it('thirty transferred minutes yield six full five-minute cycles, retaining ordinary progress', () => {
  const state = { ...EMPTY_DISCOVERY, unlocked: true, progress: 90,
    elevation: { ...EMPTY_DISCOVERY_TIER, progress: 1799 } }
  const rates = { speed: 12, elevationSpeed: 1, enlightenmentSpeed: 1 }
  const after = advanceDiscovery(state, 1, rates)
  expect(after.completions).toBe(6n)
  expect(after.progress).toBe(102)
  expect(discoveryCompletionTimes(state, rates)[0]).toBe(292.5)
  expect(discoveryCompletionTimes(after, rates)[0]).toBe(291.5)
})

it('uses only each bar’s partial progress and speed, even when a transfer is imminent', () => {
  const state = { ...EMPTY_DISCOVERY, unlocked: true, progress: 70,
    elevation: { ...EMPTY_DISCOVERY_TIER, progress: 150 }, enlightenment: { ...EMPTY_DISCOVERY_TIER, progress: 599 } }
  expect(discoveryCompletionTimes(state, { speed: 2, elevationSpeed: 5, enlightenmentSpeed: 10 }))
    .toEqual([1765, 330, 0.1])
})
