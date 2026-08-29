import { describe, expect, test } from 'vitest'
import {
  DISCRETE_MAXIMUM,
  exactRoundedNonNegativeBigInt,
  isDiscreteResource,
  isSimulationResource,
  SIMULATION_RESOURCE_MAXIMUM,
} from './numeric'

describe('canonical resource bounds', () => {
  test.each([0n, DISCRETE_MAXIMUM])(
    'accepts discrete boundary %s',
    (value) => {
      expect(isDiscreteResource(value)).toBe(true)
    },
  )

  test.each([-1n, DISCRETE_MAXIMUM + 1n, 0])(
    'rejects invalid discrete value %s',
    (value) => {
      expect(isDiscreteResource(value)).toBe(false)
    },
  )

  test.each([0n, SIMULATION_RESOURCE_MAXIMUM])(
    'accepts simulation-resource boundary %s',
    (value) => {
      expect(isSimulationResource(value)).toBe(true)
    },
  )

  test.each([-1n, SIMULATION_RESOURCE_MAXIMUM + 1n, 0])(
    'rejects invalid simulation-resource value %s',
    (value) => {
      expect(isSimulationResource(value)).toBe(false)
    },
  )
})

describe('exact rounded non-negative discrete conversion', () => {
  test.each([
    [0, 0n],
    [0.49, 0n],
    [0.5, 0n],
    [1.5, 2n],
    [2.5, 2n],
    [3.5, 4n],
    [Number.MAX_SAFE_INTEGER, BigInt(Number.MAX_SAFE_INTEGER)],
  ] as const)('converts %s to %s', (value, expected) => {
    expect(exactRoundedNonNegativeBigInt(value)).toBe(expected)
  })

  test.each([
    Number.NaN,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    -0.1,
    Number(DISCRETE_MAXIMUM),
    Number.MAX_VALUE,
  ])('rejects %s', (value) => {
    expect(exactRoundedNonNegativeBigInt(value)).toBeNull()
  })
})
