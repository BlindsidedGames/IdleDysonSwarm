import { describe, expect, test } from 'vitest'
import type { CanonicalFacilityId } from '../game-state/types'
import {
  DYSON_AUTOMATION_TARGETS,
  planDysonAutomationTargets,
  previewDysonFacilityPurchase,
  runDysonAutomationTick,
  tryPurchaseDysonFacility,
  type DysonAutomationState,
  type MutableOwnedPair,
} from './dysonAutomation'
import { buyXCost, maxAffordable, tryDebitContinuous } from './transactions'

function booleanRecord(
  value: boolean,
): Record<CanonicalFacilityId, boolean> {
  return Object.fromEntries(
    DYSON_AUTOMATION_TARGETS.map((id) => [id, value]),
  ) as Record<CanonicalFacilityId, boolean>
}

function facilityRecord(): Record<
  CanonicalFacilityId,
  MutableOwnedPair
> {
  return Object.fromEntries(
    DYSON_AUTOMATION_TARGETS.map((id) => [id, [0, 0]]),
  ) as Record<CanonicalFacilityId, MutableOwnedPair>
}

function createState(
  overrides: Partial<DysonAutomationState> = {},
): DysonAutomationState {
  return {
    money: 0,
    facilities: facilityRecord(),
    targetIndex: 0,
    globalEnabled: true,
    enabledFacilities: booleanRecord(false),
    unlockedFacilities: booleanRecord(true),
    buyMode: 'buy-1',
    roundedBulkBuy: false,
    retainedFacilities: {
      assembly_lines: false,
      ai_managers: false,
      servers: false,
      data_centers: false,
      planets: false,
    },
    assemblyMegaLinesOwned: false,
    ...overrides,
  }
}

describe('eight-slot Dyson automation', () => {
  test('plans Unity target order from the durable rotating start slot', () => {
    expect(planDysonAutomationTargets(5)).toEqual([
      'matrioshka_brains',
      'birch_planets',
      'galactic_brains',
      'assembly_lines',
      'ai_managers',
      'servers',
      'data_centers',
      'planets',
    ])

    const result = runDysonAutomationTick(
      createState({ targetIndex: 5 }),
    )
    expect(result.nextTargetIndex).toBe(6)
    expect(result.state.targetIndex).toBe(6)
  })

  test('spends shared money sequentially in rotation order', () => {
    const enabled = booleanRecord(false)
    enabled.assembly_lines = true
    enabled.ai_managers = true

    const assemblyFirst = runDysonAutomationTick(
      createState({
        money: 5_000,
        enabledFacilities: enabled,
        targetIndex: 0,
      }),
    )
    expect(assemblyFirst.state.facilities.assembly_lines[1]).toBe(1)
    expect(assemblyFirst.state.facilities.ai_managers[1]).toBe(0)
    expect(assemblyFirst.state.money).toBe(4_900)

    const managerFirst = runDysonAutomationTick(
      createState({
        money: 5_000,
        enabledFacilities: enabled,
        targetIndex: 1,
      }),
    )
    expect(managerFirst.state.facilities.ai_managers[1]).toBe(1)
    expect(managerFirst.state.facilities.assembly_lines[1]).toBe(0)
    expect(managerFirst.state.money).toBe(0)
  })

  test('enforces global, per-facility, and unlock gates and still advances rotation', () => {
    const enabled = booleanRecord(false)
    enabled.assembly_lines = true
    enabled.ai_managers = true
    const unlocked = booleanRecord(true)
    unlocked.ai_managers = false

    const globallyDisabled = runDysonAutomationTick(
      createState({
        money: 10_000,
        globalEnabled: false,
        enabledFacilities: enabled,
        targetIndex: 7,
      }),
    )
    expect(
      globallyDisabled.attempts.every(
        ({ status }) => status === 'global-disabled',
      ),
    ).toBe(true)
    expect(globallyDisabled.nextTargetIndex).toBe(0)

    const gated = runDysonAutomationTick(
      createState({
        money: 10_000,
        enabledFacilities: enabled,
        unlockedFacilities: unlocked,
      }),
    )
    expect(gated.attempts[0]?.status).toBe('success')
    expect(gated.attempts[1]?.status).toBe('locked')
    expect(gated.attempts[2]?.status).toBe('facility-disabled')
  })

  test('honours configured rounded mode and forced Buy Max without mutating input', () => {
    const enabled = booleanRecord(false)
    enabled.assembly_lines = true
    const facilities = facilityRecord()
    facilities.assembly_lines[1] = 7
    const input = createState({
      money: 100_000,
      facilities,
      enabledFacilities: enabled,
      buyMode: 'buy-10',
      roundedBulkBuy: true,
    })

    const configured = runDysonAutomationTick(input)
    expect(configured.attempts[0]?.quantity).toBe(3n)
    expect(configured.state.facilities.assembly_lines[1]).toBe(10)
    expect(input.facilities.assembly_lines[1]).toBe(7)
    expect(input.targetIndex).toBe(0)

    const forced = runDysonAutomationTick(input, 'force-buy-max')
    expect(forced.attempts[0]?.quantity).toBeGreaterThan(3n)
    expect(forced.state.buyMode).toBe('buy-10')
  })

  test('evaluates unlocks against the sequentially updated state', () => {
    const enabled = booleanRecord(false)
    enabled.planets = true
    enabled.matrioshka_brains = true
    const input = createState({
      money: 2_000_000_000,
      enabledFacilities: enabled,
      targetIndex: 4,
    })

    const result = runDysonAutomationTick(
      input,
      'preserve-configured-mode',
      (facilityId, current) =>
        facilityId !== 'matrioshka_brains' ||
        current.facilities.planets[1] >= 1,
    )

    expect(result.state.facilities.planets[1]).toBe(1)
    expect(result.state.facilities.matrioshka_brains[1]).toBe(1)
  })

  test('quotes and purchases retained facilities from the price level after the starter ten', () => {
    const enabled = booleanRecord(false)
    enabled.ai_managers = true
    const facilities = facilityRecord()
    facilities.ai_managers[1] = 10
    const input = createState({
      money: 5_000,
      facilities,
      enabledFacilities: enabled,
      retainedFacilities: {
        assembly_lines: false,
        ai_managers: true,
        servers: false,
        data_centers: false,
        planets: false,
      },
    })

    const preview = previewDysonFacilityPurchase(
      input,
      'ai_managers',
    )
    expect(preview).toMatchObject({
      eligible: true,
      selectedQuantity: 1n,
      affordableQuantity: 1n,
      cost: 5_000,
      status: 'success',
    })

    const result = runDysonAutomationTick(input)
    expect(result.attempts[1]).toMatchObject({
      purchased: true,
      quantity: 1n,
      cost: 5_000,
      status: 'success',
    })
    expect(result.state.facilities.ai_managers[1]).toBe(11)
    expect(input.facilities.ai_managers[1]).toBe(10)
  })

  test('applies the Assembly Megalines planet divisor in the shared quote and purchase path', () => {
    const enabled = booleanRecord(false)
    enabled.assembly_lines = true
    const facilities = facilityRecord()
    facilities.assembly_lines[1] = 10
    facilities.planets = [2, 3]
    const input = createState({
      money: 20,
      facilities,
      enabledFacilities: enabled,
      retainedFacilities: {
        assembly_lines: true,
        ai_managers: false,
        servers: false,
        data_centers: false,
        planets: false,
      },
      assemblyMegaLinesOwned: true,
    })

    const preview = previewDysonFacilityPurchase(
      input,
      'assembly_lines',
    )
    expect(preview).toMatchObject({
      eligible: true,
      selectedQuantity: 1n,
      cost: 20,
      status: 'success',
    })

    const result = runDysonAutomationTick(input)
    expect(result.attempts[0]).toMatchObject({
      purchased: true,
      quantity: 1n,
      cost: 20,
      status: 'success',
    })
    expect(result.state.facilities.assembly_lines[1]).toBe(11)
    expect(result.state.money).toBe(0)
  })

  test('fails a quote closed when the authored facility definition is unavailable', () => {
    const enabled = booleanRecord(false)
    enabled.assembly_lines = true
    const preview = previewDysonFacilityPurchase(
      createState({
        money: 100,
        enabledFacilities: enabled,
      }),
      'assembly_lines',
      'preserve-configured-mode',
      () => true,
      () => undefined,
    )

    expect(preview).toEqual({
      facilityId: 'assembly_lines',
      eligible: false,
      selectedQuantity: 0n,
      affordableQuantity: 0n,
      cost: 0,
      status: 'definition-gap',
    })
  })

  test('keeps finite buy-1 quotes purchasable at MAX for manual and automation paths', () => {
    const enabled = booleanRecord(false)
    enabled.assembly_lines = true
    const input = createState({
      money: Number.MAX_VALUE,
      enabledFacilities: enabled,
    })
    const expectedDebit = tryDebitContinuous(Number.MAX_VALUE, 100)

    const preview = previewDysonFacilityPurchase(
      input,
      'assembly_lines',
    )
    const manual = tryPurchaseDysonFacility(input, 'assembly_lines')
    const automatic = runDysonAutomationTick(input)

    expect(preview).toMatchObject({
      eligible: true,
      selectedQuantity: 1n,
      affordableQuantity: maxAffordable(
        Number.MAX_VALUE,
        100,
        1.22,
        0,
      ),
      cost: 100,
      status: 'success',
    })
    expect(manual.attempt).toMatchObject({
      purchased: true,
      quantity: preview.selectedQuantity,
      cost: preview.cost,
      status: 'success',
    })
    expect(automatic.attempts[0]).toEqual(manual.attempt)
    expect(manual.state.money).toBe(expectedDebit.balance)
    expect(automatic.state.money).toBe(expectedDebit.balance)
    expect(manual.state.money).toBeLessThan(Number.MAX_VALUE)
    expect(expectedDebit.charged).toBeGreaterThan(preview.cost)
    expect(input.money).toBe(Number.MAX_VALUE)
  })

  test('buy-max selects the greatest finite facility quote at MAX across preview and execution', () => {
    const enabled = booleanRecord(false)
    enabled.assembly_lines = true
    const input = createState({
      money: Number.MAX_VALUE,
      enabledFacilities: enabled,
      buyMode: 'buy-max',
    })
    const quantity = maxAffordable(Number.MAX_VALUE, 100, 1.22, 0)
    const cost = buyXCost(quantity, 100, 1.22, 0)
    const expectedDebit = tryDebitContinuous(
      Number.MAX_VALUE,
      cost,
      quantity,
    )

    expect(quantity).toBe(3_538n)
    expect(cost).toBe(1.5800042183011432e308)
    expect(buyXCost(quantity + 1n, 100, 1.22, 0))
      .toBe(Number.MAX_VALUE)

    const preview = previewDysonFacilityPurchase(
      input,
      'assembly_lines',
    )
    const manual = tryPurchaseDysonFacility(input, 'assembly_lines')
    const automatic = runDysonAutomationTick(input)

    expect(preview).toMatchObject({
      eligible: true,
      selectedQuantity: quantity,
      affordableQuantity: quantity,
      cost,
      status: 'success',
    })
    expect(manual.attempt).toMatchObject({
      purchased: true,
      quantity: preview.selectedQuantity,
      cost: preview.cost,
      status: preview.status,
    })
    expect(automatic.attempts[0]).toEqual(manual.attempt)
    expect(manual.state.money).toBe(expectedDebit.balance)
    expect(automatic.state.money).toBe(expectedDebit.balance)
  })

  test('treats a saturated facility price as terminal without mutation', () => {
    const enabled = booleanRecord(false)
    enabled.assembly_lines = true
    const facilities = facilityRecord()
    facilities.assembly_lines[1] = 3_547
    const input = createState({
      money: Number.MAX_VALUE,
      facilities,
      enabledFacilities: enabled,
    })

    const preview = previewDysonFacilityPurchase(
      input,
      'assembly_lines',
    )
    const manual = tryPurchaseDysonFacility(input, 'assembly_lines')
    const automatic = runDysonAutomationTick(input)

    expect(preview).toMatchObject({
      eligible: false,
      selectedQuantity: 1n,
      affordableQuantity: 0n,
      cost: Number.MAX_VALUE,
      status: 'maxed',
    })
    expect(manual.attempt).toMatchObject({
      purchased: false,
      quantity: 0n,
      cost: Number.MAX_VALUE,
      status: 'maxed',
    })
    expect(manual.state).toEqual(input)
    expect(automatic.attempts[0]).toEqual(manual.attempt)
    expect(automatic.state.money).toBe(Number.MAX_VALUE)
    expect(automatic.state.facilities.assembly_lines[1]).toBe(3_547)
  })
})
