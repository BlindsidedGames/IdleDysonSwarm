import { describe, expect, test } from 'vitest'
import type {
  CanonicalFacilityId,
  CanonicalOwnedPair,
} from '../game-state/types'
import {
  isMegaStructureVisible,
  megaStructureCashCost,
  tryPurchaseMegaStructure,
  type MegaStructurePurchaseState,
} from './megaStructurePurchases'
import { CONTINUOUS_MAXIMUM } from './numeric'
import { buyXCost, maxAffordable, type BuyMode } from './transactions'

function facilities(
  overrides: Partial<
    Record<CanonicalFacilityId, CanonicalOwnedPair>
  > = {},
): Record<CanonicalFacilityId, CanonicalOwnedPair> {
  return {
    assembly_lines: [0, 0],
    ai_managers: [0, 0],
    servers: [0, 0],
    data_centers: [0, 0],
    planets: [0, 1],
    matrioshka_brains: [0, 1],
    birch_planets: [0, 1],
    galactic_brains: [0, 0],
    ...overrides,
  }
}

function purchaseState(
  overrides: Partial<MegaStructurePurchaseState> = {},
): MegaStructurePurchaseState {
  return {
    money: 1e30,
    facilities: facilities(),
    quantumUnlocks: {
      matrioshkaBrains: true,
      birchPlanets: true,
      galacticBrains: true,
    },
    buyMode: 'buy-1',
    roundedBulkBuy: false,
    ...overrides,
  }
}

describe('mega-structure authored cash costs', () => {
  test.each([
    ['matrioshka_brains', 1_000_000_000, 1.1],
    ['birch_planets', 100_000_000_000, 1.2],
    ['galactic_brains', 10_000_000_000, 1.15],
  ] as const)(
    'uses %s base cash cost and geometric exponent',
    (facilityId, baseCost, exponent) => {
      expect(megaStructureCashCost(facilityId, 1n, 0)).toBe(baseCost)
      expect(megaStructureCashCost(facilityId, 3n, 2)).toBe(
        buyXCost(3n, baseCost, exponent, 2),
      )
    },
  )
})

describe('mega-structure purchase command', () => {
  test.each([
    ['matrioshka_brains', 'matrioshkaBrains', 'planets'],
    ['birch_planets', 'birchPlanets', 'matrioshka_brains'],
    ['galactic_brains', 'galacticBrains', 'birch_planets'],
  ] as const)(
    'reveals %s only after its unlock and preceding-tier ownership, while retaining owned imports',
    (facilityId, unlockKey, prerequisiteId) => {
      const locked = purchaseState({
        facilities: facilities({
          [facilityId]: [0, 0],
        }),
        quantumUnlocks: {
          ...purchaseState().quantumUnlocks,
          [unlockKey]: false,
        },
      })
      expect(isMegaStructureVisible(locked, facilityId)).toBe(false)

      const missingPrerequisite = purchaseState({
        facilities: facilities({
          [facilityId]: [0, 0],
          [prerequisiteId]: [0, 0],
        }),
      })
      expect(isMegaStructureVisible(missingPrerequisite, facilityId))
        .toBe(false)

      const unlocked = purchaseState({
        facilities: facilities({
          [facilityId]: [0, 0],
          [prerequisiteId]: [1, 0],
        }),
      })
      expect(isMegaStructureVisible(unlocked, facilityId)).toBe(true)

      const importedOwned = purchaseState({
        facilities: facilities({
          [facilityId]: [0, 1],
          [prerequisiteId]: [0, 0],
        }),
        quantumUnlocks: {
          ...purchaseState().quantumUnlocks,
          [unlockKey]: false,
        },
      })
      expect(isMegaStructureVisible(importedOwned, facilityId)).toBe(true)
    },
  )

  test.each([
    ['buy-1', false, 8, 1n],
    ['buy-10', false, 8, 10n],
    ['buy-10', true, 8, 2n],
    ['buy-50', true, 48, 2n],
    ['buy-100', false, 8, 100n],
  ] as const)(
    'applies %s with rounded=%s',
    (buyMode, roundedBulkBuy, manualOwned, expectedQuantity) => {
      const state = purchaseState({
        buyMode,
        roundedBulkBuy,
        facilities: facilities({
          matrioshka_brains: [3, manualOwned],
        }),
      })
      const result = tryPurchaseMegaStructure(
        state,
        'matrioshka_brains',
      )

      expect(result.status).toBe('success')
      expect(result.quantity).toBe(expectedQuantity)
      expect(
        result.state.facilities.matrioshka_brains,
      ).toEqual([3, manualOwned + Number(expectedQuantity)])
    },
  )

  test('reuses exact buy-max affordability', () => {
    const money = 100_000_000_000
    const manualOwned = 2
    const expected = maxAffordable(
      money,
      1_000_000_000,
      1.1,
      manualOwned,
    )
    const state = purchaseState({
      money,
      buyMode: 'buy-max',
      facilities: facilities({
        matrioshka_brains: [0, manualOwned],
      }),
    })

    const result = tryPurchaseMegaStructure(
      state,
      'matrioshka_brains',
    )

    expect(result.status).toBe('success')
    expect(result.quantity).toBe(expected)
  })

  test.each([
    [
      'matrioshka_brains',
      'matrioshkaBrains',
      'planets',
    ],
    ['birch_planets', 'birchPlanets', 'matrioshka_brains'],
    ['galactic_brains', 'galacticBrains', 'birch_planets'],
  ] as const)(
    'enforces %s quantum unlock and prerequisite at the command boundary',
    (facilityId, unlockKey, prerequisiteId) => {
      const locked = purchaseState({
        quantumUnlocks: {
          ...purchaseState().quantumUnlocks,
          [unlockKey]: false,
        },
      })
      const lockedResult = tryPurchaseMegaStructure(
        locked,
        facilityId,
      )
      expect(lockedResult.status).toBe('locked')
      expect(lockedResult.state).toBe(locked)

      const withoutPrerequisite = purchaseState({
        facilities: facilities({
          [prerequisiteId]: [0, 0],
        }),
      })
      const prerequisiteResult = tryPurchaseMegaStructure(
        withoutPrerequisite,
        facilityId,
      )
      expect(prerequisiteResult.status).toBe(
        'prerequisite-not-met',
      )
      expect(prerequisiteResult.state).toBe(withoutPrerequisite)
    },
  )

  test('atomically debits cash and increments only manual ownership', () => {
    const state = purchaseState({
      money: 2_000_000_000,
      facilities: facilities({
        planets: [4, 7],
        matrioshka_brains: [3, 0],
      }),
    })
    const before = structuredClone(state)

    const result = tryPurchaseMegaStructure(
      state,
      'matrioshka_brains',
    )

    expect(result).toMatchObject({
      purchased: true,
      quantity: 1n,
      cost: 1_000_000_000,
      status: 'success',
    })
    expect(result.state.money).toBe(1_000_000_000)
    expect(result.state.facilities.matrioshka_brains).toEqual([3, 1])
    expect(result.state.facilities.planets).toEqual([4, 7])
    expect(state).toEqual(before)
  })

  test('does not debit dormant facility-cost metadata resources', () => {
    const state = purchaseState({
      money: 20_000_000_000,
      facilities: facilities({
        matrioshka_brains: [123, 456],
        birch_planets: [7, 8],
        galactic_brains: [0, 0],
      }),
    })

    const result = tryPurchaseMegaStructure(
      state,
      'galactic_brains',
    )

    expect(result.status).toBe('success')
    expect(result.cost).toBe(10_000_000_000)
    expect(result.state.facilities.matrioshka_brains).toEqual(
      [123, 456],
    )
    expect(result.state.facilities.birch_planets).toEqual([7, 8])
    expect(result.state.facilities.galactic_brains).toEqual([0, 1])
  })

  test('preserves the exact state when cash is insufficient', () => {
    const state = purchaseState({ money: 999_999_999 })

    const result = tryPurchaseMegaStructure(
      state,
      'matrioshka_brains',
    )

    expect(result.status).toBe('insufficient-funds')
    expect(result.state).toBe(state)
    expect(result.quantity).toBe(0n)
  })

  test('purchases a finite mega-structure price at MAX with the quoted cost', () => {
    const state = purchaseState({ money: Number.MAX_VALUE })

    const result = tryPurchaseMegaStructure(
      state,
      'matrioshka_brains',
    )

    expect(result).toMatchObject({
      purchased: true,
      quantity: 1n,
      cost: 1_100_000_000,
      status: 'success',
    })
    expect(result.state.money).toBe(1.7976931348623155e308)
    expect(result.state.facilities.matrioshka_brains[1]).toBe(2)
    expect(state.money).toBe(Number.MAX_VALUE)
  })

  test('fails closed when geometric cost saturates', () => {
    const state = purchaseState({
      money: Number.MAX_VALUE,
      facilities: facilities({
        matrioshka_brains: [0, 10_000],
      }),
    })

    const result = tryPurchaseMegaStructure(
      state,
      'matrioshka_brains',
    )

    expect(result.status).toBe('maxed')
    expect(result.cost).toBe(CONTINUOUS_MAXIMUM)
    expect(result.state).toBe(state)
  })

  test.each([
    ['buy-1', Number.NaN],
    ['buy-max', -1],
  ] as readonly [BuyMode, number][])(
    'rejects invalid state without partial mutation',
    (buyMode, money) => {
      const state = purchaseState({ buyMode, money })

      const result = tryPurchaseMegaStructure(
        state,
        'matrioshka_brains',
      )

      expect(result.status).toBe('invalid-state')
      expect(result.state).toBe(state)
    },
  )
})
