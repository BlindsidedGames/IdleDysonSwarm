import { describe, expect, test } from 'vitest'
import { getGameAsset } from '../game-data/catalog'
import type { ExportedAssetValue } from '../game-data/types'
import {
  deriveMegaStructureRates,
  type MegaStructureAssetLookup,
  type MegaStructureCanonicalInputs,
  type MegaStructureFacilityId,
  type MegaStructureModifiers,
  type MegaStructureRateResult,
} from './megaStructureRates'

interface StateOptions {
  readonly facilities?: Partial<
    Record<MegaStructureFacilityId, readonly [number, number]>
  >
  readonly unlocks?: Partial<
    MegaStructureCanonicalInputs['quantum']['unlocks']
  >
}

const baseModifiers: MegaStructureModifiers = Object.freeze({
  matrioshka_brains: 1,
  birch_planets: 1,
  galactic_brains: 1,
})

function makeState(
  options: StateOptions = {},
): MegaStructureCanonicalInputs {
  return {
    dyson: {
      facilities: {
        matrioshka_brains:
          options.facilities?.matrioshka_brains ?? [0, 0],
        birch_planets: options.facilities?.birch_planets ?? [0, 0],
        galactic_brains:
          options.facilities?.galactic_brains ?? [0, 0],
      },
    },
    quantum: {
      unlocks: {
        matrioshkaBrains:
          options.unlocks?.matrioshkaBrains ?? true,
        birchPlanets: options.unlocks?.birchPlanets ?? true,
        galacticBrains: options.unlocks?.galacticBrains ?? true,
      },
    },
  }
}

function requireRates(result: MegaStructureRateResult) {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.rates
}

function lookupWithDataPatch(
  facilityId: MegaStructureFacilityId,
  patch: Readonly<Record<string, ExportedAssetValue>>,
): MegaStructureAssetLookup {
  return (kind, id) => {
    const asset = getGameAsset(kind, id)
    if (asset === undefined || id !== facilityId) return asset
    return {
      ...asset,
      data: {
        ...asset.data,
        ...patch,
      },
    }
  }
}

describe('mega-structure production rates', () => {
  test('returns all three producer rates using effective automatic plus manual counts', () => {
    const rates = requireRates(
      deriveMegaStructureRates(
        makeState({
          facilities: {
            matrioshka_brains: [2, 3],
            birch_planets: [4, 1],
            galactic_brains: [1.5, 0.5],
          },
        }),
        {
          matrioshka_brains: 2,
          birch_planets: 3,
          galactic_brains: 4,
        },
      ),
    )

    expect(rates).toEqual({
      matrioshka_brains: Math.fround(1) * 5 * 2,
      birch_planets: Math.fround(0.01) * 5 * 3,
      galactic_brains: Math.fround(0.1) * 2 * 4,
    })
  })

  test('gates each producer independently on its canonical quantum unlock', () => {
    const rates = requireRates(
      deriveMegaStructureRates(
        makeState({
          facilities: {
            matrioshka_brains: [2, 3],
            birch_planets: [4, 1],
            galactic_brains: [1, 1],
          },
          unlocks: {
            matrioshkaBrains: false,
            birchPlanets: true,
            galacticBrains: false,
          },
        }),
        {
          matrioshka_brains: 2,
          birch_planets: 3,
          galactic_brains: 4,
        },
      ),
    )

    expect(rates).toEqual({
      matrioshka_brains: 0,
      birch_planets: Math.fround(0.01) * 5 * 3,
      galactic_brains: 0,
    })
  })

  test('preserves Unity double-to-float base-production casts', () => {
    const rates = requireRates(
      deriveMegaStructureRates(
        makeState({
          facilities: {
            matrioshka_brains: [1, 0],
            birch_planets: [1, 0],
            galactic_brains: [1, 0],
          },
        }),
        baseModifiers,
      ),
    )

    expect(rates.matrioshka_brains).toBe(Math.fround(1))
    expect(rates.birch_planets).toBe(Math.fround(0.01))
    expect(rates.birch_planets).not.toBe(0.01)
    expect(rates.galactic_brains).toBe(Math.fround(0.1))
    expect(rates.galactic_brains).not.toBe(0.1)
  })

  test('uses Unity modifier epsilon behavior', () => {
    const rates = requireRates(
      deriveMegaStructureRates(
        makeState({
          facilities: {
            matrioshka_brains: [0, 0],
            birch_planets: [0, 0],
            galactic_brains: [1, 0],
          },
        }),
        {
          ...baseModifiers,
          galactic_brains: 1 + Number.EPSILON,
        },
      ),
    )

    expect(rates.galactic_brains).toBe(Math.fround(0.1))
  })

  test('returns a frozen rate shape suitable for a whole-chain tick', () => {
    const rates = requireRates(
      deriveMegaStructureRates(makeState(), baseModifiers),
    )

    expect(Object.isFrozen(rates)).toBe(true)
    expect(Object.keys(rates)).toEqual([
      'matrioshka_brains',
      'birch_planets',
      'galactic_brains',
    ])
  })
})

describe('mega-structure definition and numeric safety', () => {
  test('fails closed when an exported facility definition is missing', () => {
    const lookup: MegaStructureAssetLookup = (kind, id) =>
      id === 'birch_planets' ? undefined : getGameAsset(kind, id)
    const result = deriveMegaStructureRates(
      makeState({
        unlocks: {
          matrioshkaBrains: false,
          birchPlanets: false,
          galacticBrains: false,
        },
      }),
      baseModifiers,
      lookup,
    )

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: 'MEGA_STRUCTURE_DEFINITION_MISSING',
          path: 'gameData.facilities.birch_planets',
          detail: "Facility definition 'birch_planets' is missing.",
        },
      ],
    })
  })

  test.each([
    [
      'birch_planets',
      { baseProduction: 0.02 },
    ],
    [
      'galactic_brains',
      { productionStatId: 'Facility.Future.Production' },
    ],
    [
      'matrioshka_brains',
      {
        _id: {
          fileId: 0,
          guid: '',
          id: 'wrong_id',
          path: null,
        },
      },
    ],
  ] as const)(
    'fails closed when %s production metadata drifts',
    (facilityId, patch) => {
      const result = deriveMegaStructureRates(
        makeState(),
        baseModifiers,
        lookupWithDataPatch(facilityId, patch),
      )

      expect(result).toEqual({
        ok: false,
        issues: [
          {
            code: 'MEGA_STRUCTURE_DEFINITION_INVALID',
            path: `gameData.facilities.${facilityId}`,
            detail: `Facility definition '${facilityId}' does not match its characterized Unity production contract.`,
          },
        ],
      })
    },
  )

  test('reports invalid canonical counts, unlocks, and derived modifiers', () => {
    const state = makeState({
      facilities: {
        matrioshka_brains: [Number.NaN, 0],
      },
    })
    const invalidState: MegaStructureCanonicalInputs = {
      ...state,
      quantum: {
        unlocks: {
          ...state.quantum.unlocks,
          birchPlanets: 'unlocked' as unknown as boolean,
        },
      },
    }
    const result = deriveMegaStructureRates(invalidState, {
      matrioshka_brains: 1,
      birch_planets: undefined,
      galactic_brains: Number.POSITIVE_INFINITY,
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected invalid inputs to fail')
    expect(
      result.issues.map(({ code, path }) => ({ code, path })),
    ).toEqual([
      {
        code: 'MEGA_STRUCTURE_COUNT_INVALID',
        path: 'dyson.facilities.matrioshka_brains.0',
      },
      {
        code: 'MEGA_STRUCTURE_UNLOCK_INVALID',
        path: 'quantum.unlocks.birchPlanets',
      },
      {
        code: 'MEGA_STRUCTURE_MODIFIER_MISSING',
        path: 'facilityModifiers.birch_planets',
      },
      {
        code: 'MEGA_STRUCTURE_MODIFIER_INVALID',
        path: 'facilityModifiers.galactic_brains',
      },
    ])
  })

  test('rejects an overflowing automatic-plus-manual effective count', () => {
    const result = deriveMegaStructureRates(
      makeState({
        facilities: {
          matrioshka_brains: [Number.MAX_VALUE, Number.MAX_VALUE],
        },
      }),
      baseModifiers,
    )

    expect(result).toMatchObject({
      ok: false,
      issues: [
        {
          code: 'MEGA_STRUCTURE_EFFECTIVE_COUNT_NON_FINITE',
          path: 'dyson.facilities.matrioshka_brains',
        },
      ],
    })
  })

  test('saturates finite inputs whose unlocked rate multiplication overflows', () => {
    const result = deriveMegaStructureRates(
      makeState({
        facilities: {
          matrioshka_brains: [Number.MAX_VALUE, 0],
        },
        unlocks: {
          matrioshkaBrains: true,
          birchPlanets: false,
          galacticBrains: false,
        },
      }),
      {
        ...baseModifiers,
        matrioshka_brains: Number.MAX_VALUE,
      },
    )

    expect(requireRates(result).matrioshka_brains).toBe(
      Number.MAX_VALUE,
    )
  })

  test('asset lookup receives the exact FacilityDefinition kind and IDs', () => {
    const calls: Array<readonly [string, string]> = []
    const lookup: MegaStructureAssetLookup = (kind, id) => {
      calls.push([kind, id])
      return getGameAsset(kind, id)
    }

    requireRates(
      deriveMegaStructureRates(makeState(), baseModifiers, lookup),
    )
    expect(calls).toEqual([
      ['GameData.FacilityDefinition', 'matrioshka_brains'],
      ['GameData.FacilityDefinition', 'birch_planets'],
      ['GameData.FacilityDefinition', 'galactic_brains'],
    ])
  })
})
