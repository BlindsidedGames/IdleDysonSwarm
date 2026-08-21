import { describe, expect, test } from 'vitest'
import { deriveSecretBuffs } from './secretBuffs'

describe('Unity secret-buff derivation', () => {
  test('returns neutral multipliers and no coefficient overrides at zero', () => {
    const result = deriveSecretBuffs(0n)

    expect(result).toEqual({
      multipliers: {
        cash: 1,
        science: 1,
        assemblyLines: 1,
        aiManagers: 1,
        servers: 1,
        planets: 1,
      },
      researchCoefficientOverrides: {},
    })
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.multipliers)).toBe(true)
    expect(Object.isFrozen(result.researchCoefficientOverrides)).toBe(true)
  })

  test.each([
    [1n, 'research.assembly_line_upgrade', Math.fround(0.06)],
    [3n, 'research.server_upgrade', Math.fround(0.06)],
    [4n, 'research.assembly_line_upgrade', Math.fround(0.09)],
    [5n, 'research.ai_manager_upgrade', Math.fround(0.06)],
    [7n, 'research.planet_upgrade', Math.fround(0.06)],
    [9n, 'research.server_upgrade', Math.fround(0.09)],
    [12n, 'research.assembly_line_upgrade', Math.fround(0.12)],
    [13n, 'research.ai_manager_upgrade', Math.fround(0.09)],
    [14n, 'research.planet_upgrade', Math.fround(0.09)],
  ] as const)(
    'applies the level-%s research coefficient overwrite',
    (level, researchId, expected) => {
      expect(
        deriveSecretBuffs(level).researchCoefficientOverrides[researchId],
      ).toBe(expected)
    },
  )

  test.each([
    [2n, 'cash', 2],
    [6n, 'science', 2],
    [8n, 'cash', 4],
    [10n, 'science', 4],
    [11n, 'science', 6],
    [15n, 'science', 8],
    [16n, 'assemblyLines', 2],
    [17n, 'planets', 2],
    [18n, 'planets', 5],
    [19n, 'cash', 6],
    [20n, 'servers', 2],
    [21n, 'servers', 3],
    [22n, 'science', 10],
    [23n, 'assemblyLines', 7],
    [24n, 'aiManagers', 2.5],
    [25n, 'cash', 8],
    [26n, 'aiManagers', 3],
    [27n, 'aiManagers', 42],
  ] as const)(
    'applies the level-%s multiplier overwrite',
    (level, key, expected) => {
      expect(deriveSecretBuffs(level).multipliers[key]).toBe(expected)
    },
  )

  test('retains all final table values above the last authored level', () => {
    expect(deriveSecretBuffs(42n)).toEqual({
      multipliers: {
        cash: 8,
        science: 10,
        assemblyLines: 7,
        aiManagers: 42,
        servers: 3,
        planets: 5,
      },
      researchCoefficientOverrides: {
        'research.assembly_line_upgrade': Math.fround(0.12),
        'research.server_upgrade': Math.fround(0.09),
        'research.ai_manager_upgrade': Math.fround(0.09),
        'research.planet_upgrade': Math.fround(0.09),
      },
    })
  })

  test('rejects a negative canonical secret count', () => {
    expect(() => deriveSecretBuffs(-1n)).toThrow(
      'Secrets of the Universe must be non-negative.',
    )
  })
})
