import { describe, expect, test } from 'vitest'
import type { CanonicalFacilityId } from '../game-state/types'
import {
  DYSON_AUTOMATION_TARGETS,
  previewDysonFacilityPurchase,
  tryPurchaseDysonFacility,
  type DysonAutomationState,
} from './dysonAutomation'
import { bitDecrement, CONTINUOUS_MAXIMUM } from './numeric'
import {
  buyXCost,
  maxAffordable,
  tryDebitContinuous,
} from './transactions'

const FALLBACK_EXPONENT = 2
const FALLBACK_LEVEL = 1024
const LOG_EQUAL_BASE_COST = 1
const RECONSTRUCTED_NEAR_MAXIMUM = Math.exp(
  Math.log(CONTINUOUS_MAXIMUM),
)

describe('extreme geometric purchase pricing', () => {
  test('fails closed when an overflowing exact price rounds to the maximum log', () => {
    const roundedLogCost =
      Math.log(LOG_EQUAL_BASE_COST) +
      FALLBACK_LEVEL * Math.log(FALLBACK_EXPONENT)

    expect(roundedLogCost).toBe(Math.log(CONTINUOUS_MAXIMUM))

    const cost = buyXCost(
      1n,
      LOG_EQUAL_BASE_COST,
      FALLBACK_EXPONENT,
      FALLBACK_LEVEL,
    )

    expect(cost).toBe(CONTINUOUS_MAXIMUM)
  })

  test('keeps the reserved boundary distinct from the adjacent finite price and overflow', () => {
    const immediatelyBelow = bitDecrement(CONTINUOUS_MAXIMUM)

    expect(buyXCost(1n, immediatelyBelow, 1, 0)).toBe(immediatelyBelow)
    expect(buyXCost(1n, CONTINUOUS_MAXIMUM, 1, 0)).toBe(
      CONTINUOUS_MAXIMUM,
    )
    expect(buyXCost(2n, LOG_EQUAL_BASE_COST, 2, 1024)).toBe(
      CONTINUOUS_MAXIMUM,
    )
    expect(buyXCost(1n, Number.POSITIVE_INFINITY, 2, 0)).toBe(0)
  })

  test('debits a covered near-maximum price without violating conservation', () => {
    const result = tryDebitContinuous(
      CONTINUOUS_MAXIMUM,
      RECONSTRUCTED_NEAR_MAXIMUM,
    )

    expect(result).toEqual({
      balance: CONTINUOUS_MAXIMUM - RECONSTRUCTED_NEAR_MAXIMUM,
      charged: RECONSTRUCTED_NEAR_MAXIMUM,
      status: 'success',
    })
    expect(result.balance + result.charged).toBe(CONTINUOUS_MAXIMUM)
  })

  test('keeps sentinel, overflow, and malformed prices fail closed', () => {
    expect(
      tryDebitContinuous(CONTINUOUS_MAXIMUM, CONTINUOUS_MAXIMUM),
    ).toMatchObject({ status: 'maxed', charged: 0 })
    expect(
      tryDebitContinuous(CONTINUOUS_MAXIMUM, Number.POSITIVE_INFINITY),
    ).toMatchObject({ status: 'invalid-cost', charged: 0 })
    expect(
      tryDebitContinuous(Number.NaN, RECONSTRUCTED_NEAR_MAXIMUM),
    ).toMatchObject({ status: 'invalid-balance', charged: 0 })
  })

  test('corrects buy-max to zero purchases at the rounded overflow boundary', () => {
    expect(
      maxAffordable(
        RECONSTRUCTED_NEAR_MAXIMUM,
        LOG_EQUAL_BASE_COST,
        FALLBACK_EXPONENT,
        FALLBACK_LEVEL,
      ),
    ).toBe(0n)
    expect(
      buyXCost(
        2n,
        LOG_EQUAL_BASE_COST,
        FALLBACK_EXPONENT,
        FALLBACK_LEVEL,
      ),
    ).toBe(CONTINUOUS_MAXIMUM)
  })
})

describe('Assembly Megalines extreme pricing', () => {
  test.each(['buy-1', 'buy-max'] as const)(
    '%s fails closed when the exact price exceeds finite authority',
    (buyMode) => {
      const before = assemblyMegalinesBoundaryState(buyMode)
      const quote = previewDysonFacilityPurchase(before, 'assembly_lines')
      const result = tryPurchaseDysonFacility(before, 'assembly_lines')

      expect(quote).toMatchObject({
        eligible: false,
        selectedQuantity: 1n,
        affordableQuantity: 0n,
        status: 'maxed',
      })
      expect(quote.cost).toBe(CONTINUOUS_MAXIMUM)
      expect(result.attempt).toEqual({
        facilityId: 'assembly_lines',
        purchased: false,
        quantity: 0n,
        cost: CONTINUOUS_MAXIMUM,
        status: 'maxed',
      })
      expect(result.state.facilities.assembly_lines[1]).toBe(3570)
      expect(result.state.money).toBe(RECONSTRUCTED_NEAR_MAXIMUM)
      expect(before.facilities.assembly_lines[1]).toBe(3570)
      expect(before.money).toBe(RECONSTRUCTED_NEAR_MAXIMUM)
    },
  )
})

function assemblyMegalinesBoundaryState(
  buyMode: 'buy-1' | 'buy-max',
): DysonAutomationState {
  const assemblyLevel = 3570
  const assemblyExponent = 1.22
  const effectiveBaseCost = Math.exp(
    Math.log(CONTINUOUS_MAXIMUM) -
    assemblyLevel * Math.log(assemblyExponent),
  )
  const planetTotal = 100 / effectiveBaseCost
  const facilities = Object.fromEntries(
    DYSON_AUTOMATION_TARGETS.map((facilityId) => [
      facilityId,
      [0, 0],
    ]),
  ) as Record<CanonicalFacilityId, [number, number]>
  facilities.assembly_lines = [0, assemblyLevel]
  facilities.planets = [planetTotal, 0]

  return {
    money: RECONSTRUCTED_NEAR_MAXIMUM,
    facilities,
    targetIndex: 0,
    globalEnabled: true,
    enabledFacilities: booleanFacilityRecord(true),
    unlockedFacilities: booleanFacilityRecord(true),
    buyMode,
    roundedBulkBuy: false,
    retainedFacilities: {
      assembly_lines: false,
      ai_managers: false,
      servers: false,
      data_centers: false,
      planets: false,
    },
    assemblyMegaLinesOwned: true,
  }
}

function booleanFacilityRecord(
  value: boolean,
): Record<CanonicalFacilityId, boolean> {
  return Object.fromEntries(
    DYSON_AUTOMATION_TARGETS.map((facilityId) => [facilityId, value]),
  ) as Record<CanonicalFacilityId, boolean>
}
