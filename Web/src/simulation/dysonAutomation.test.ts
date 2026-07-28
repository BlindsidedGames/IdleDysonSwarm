import { describe, expect, test } from 'vitest'
import type { CanonicalFacilityId } from '../game-state/types'
import {
  DYSON_AUTOMATION_TARGETS,
  planDysonAutomationTargets,
  runDysonAutomationTick,
  type DysonAutomationState,
  type MutableOwnedPair,
} from './dysonAutomation'

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
})
