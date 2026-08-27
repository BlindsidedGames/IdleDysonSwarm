import { describe, expect, test } from 'vitest'
import {
  addDiscreteAtMost,
  CONTINUOUS_MAXIMUM,
  DISCRETE_MAXIMUM,
  floorToDiscreteAtMost,
  SIMULATION_RESOURCE_MAXIMUM,
} from './numeric'

describe('Simulation resource numeric ceiling', () => {
  test('uses the exact integer represented by the maximum finite double', () => {
    expect(SIMULATION_RESOURCE_MAXIMUM).toBe(BigInt(Number.MAX_VALUE))
    expect(Number(SIMULATION_RESOURCE_MAXIMUM)).toBe(CONTINUOUS_MAXIMUM)
    expect(SIMULATION_RESOURCE_MAXIMUM).toBeGreaterThan(DISCRETE_MAXIMUM)
  })

  test('crosses the legacy Int64 ceiling and saturates only at the double ceiling', () => {
    expect(addDiscreteAtMost(
      DISCRETE_MAXIMUM,
      1n,
      SIMULATION_RESOURCE_MAXIMUM,
    )).toBe(DISCRETE_MAXIMUM + 1n)
    expect(addDiscreteAtMost(
      SIMULATION_RESOURCE_MAXIMUM - 1n,
      2n,
      SIMULATION_RESOURCE_MAXIMUM,
    )).toBe(SIMULATION_RESOURCE_MAXIMUM)
    expect(floorToDiscreteAtMost(
      Number.MAX_VALUE,
      SIMULATION_RESOURCE_MAXIMUM,
    )).toBe(SIMULATION_RESOURCE_MAXIMUM)
  })
})
