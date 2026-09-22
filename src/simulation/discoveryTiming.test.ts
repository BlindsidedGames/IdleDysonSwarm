import { describe, expect, it } from 'vitest'
import { advanceDiscovery, EMPTY_DISCOVERY } from './discovery'

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
