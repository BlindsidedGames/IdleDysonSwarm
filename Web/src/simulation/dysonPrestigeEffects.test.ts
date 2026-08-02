import { describe, expect, test } from 'vitest'
import type { AvocadoState, QuantumState } from '../game-state/types'
import {
  avocadoDysonMultiplier,
  DYSON_INFINITY_MULTIPLIER_CAP,
  infinityFacilityMultiplier,
  quantumCashMultiplier,
  quantumScienceMultiplier,
} from './dysonPrestigeEffects'

const neutralAvocado: AvocadoState = {
  unlocked: false,
  infinityPoints: 0,
  influence: 0,
  strangeMatter: 0,
  overflowMultiplier: 0,
}

describe('Dyson prestige effects', () => {
  test('uses the exported Avocado threshold and exact multiplier order', () => {
    expect(avocadoDysonMultiplier(neutralAvocado)).toBe(1)
    expect(avocadoDysonMultiplier({
      unlocked: true,
      infinityPoints: 100,
      influence: 1_000,
      strangeMatter: 10_000,
      overflowMultiplier: 4,
    })).toBe(2 * 3 * 4 * 5)
  })

  test('does not apply logarithms below the configured threshold', () => {
    expect(avocadoDysonMultiplier({
      unlocked: true,
      infinityPoints: 9,
      influence: 9,
      strangeMatter: 9,
      overflowMultiplier: 0.5,
    })).toBe(1)
  })

  test('matches Unity Infinity unlock thresholds and multiplier cap', () => {
    expect(infinityFacilityMultiplier(1n, 2n)).toBe(1)
    expect(infinityFacilityMultiplier(2n, 2n)).toBe(3)
    expect(
      infinityFacilityMultiplier(
        BigInt('999999999999999999999999999999999999999999999'),
        0n,
      ),
    ).toBe(1 + DYSON_INFINITY_MULTIPLIER_CAP)
  })

  test('matches the five-percent-per-level Quantum multipliers', () => {
    const quantum = {
      cashBonusLevels: 2n,
      scienceBonusLevels: 3n,
    } as Pick<QuantumState, 'cashBonusLevels' | 'scienceBonusLevels'>
    expect(quantumCashMultiplier(quantum)).toBe(1.1)
    expect(quantumScienceMultiplier(quantum)).toBe(1.15)
  })

  test('rejects Quantum levels outside the characterized number range', () => {
    expect(() =>
      quantumCashMultiplier({
        cashBonusLevels: BigInt(Number.MAX_SAFE_INTEGER) + 1n,
      }),
    ).toThrow('exceed the characterized numeric range')
  })
})
