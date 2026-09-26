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


it('projects remaining time including receiving-bar completions', () => {
  const rates = { speed: 1, elevationSpeed: 1, enlightenmentSpeed: 1 }
  const two = { ...EMPTY_DISCOVERY, unlocked: true, elevation: { ...EMPTY_DISCOVERY_TIER } }
  expect(discoveryCompletionTimes(two, rates)[0]).toBeCloseTo(1800, 5)
  const three = { ...two, enlightenment: { ...EMPTY_DISCOVERY_TIER } }
  const times = discoveryCompletionTimes(three, rates)
  expect(times[0]).toBeCloseTo(1800, 5)
  expect(times[1]).toBeCloseTo(1200, 5)
  expect(times[2]).toBeCloseTo(600, 5)
  for (let index = 0; index < 3; index++) {
    const at = advanceDiscovery(three, times[index] + 0.00001, rates)
    const before = advanceDiscovery(three, times[index] - 0.001, rates)
    const counts = (s: typeof at) => [s.completions, s.elevation!.completions, s.enlightenment!.completions]
    expect(counts(at)[index]).toBeGreaterThan(0n)
    expect(counts(before)[index]).toBe(0n)
  }
})
