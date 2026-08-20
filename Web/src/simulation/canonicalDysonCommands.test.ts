import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  previewCanonicalBasicFacilityPurchase,
  runCanonicalDysonAutomation,
  tryPurchaseCanonicalBasicFacility,
  tryPurchaseCanonicalMegaStructure,
} from './canonicalDysonCommands'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function state(): CanonicalGameStateV1 {
  return hydrateGameState(prepareIdb1Save(fixture).prepared).state
}

describe('canonical Dyson commands', () => {
  test('applies a manual basic-facility purchase through authored buy-mode math', () => {
    const before = state()
    const candidate: CanonicalGameStateV1 = {
      ...before,
      dyson: {
        ...before.dyson,
        money: 100,
        facilities: {
          ...before.dyson.facilities,
          assembly_lines: [0, 0],
        },
        automation: {
          ...before.dyson.automation,
          buyMode: 'buy-1',
        },
      },
    }
    const result = tryPurchaseCanonicalBasicFacility(
      candidate,
      'assembly_lines',
    )
    expect(result.attempt).toMatchObject({
      purchased: true,
      quantity: 1n,
      status: 'success',
    })
    expect(result.state.dyson.facilities.assembly_lines[1]).toBe(1)
    expect(result.state.timeline.dysonAutomationTargetIndex).toBe(
      candidate.timeline.dysonAutomationTargetIndex,
    )
    expect(candidate.dyson.facilities.assembly_lines[1]).toBe(0)
  })

  test('publishes the same retained-ten and Assembly Megalines quote used by purchase execution', () => {
    const before = state()
    const candidate: CanonicalGameStateV1 = {
      ...before,
      dyson: {
        ...before.dyson,
        money: 20,
        facilities: {
          ...before.dyson.facilities,
          assembly_lines: [0, 10],
          planets: [2, 3],
        },
        automation: {
          ...before.dyson.automation,
          buyMode: 'buy-1',
        },
      },
      infinity: {
        ...before.infinity,
        retainedFacilities: {
          ...before.infinity.retainedFacilities,
          assembly_lines: true,
        },
      },
      skills: {
        ...before.skills,
        byId: {
          ...before.skills.byId,
          assemblyMegaLines: {
            owned: true,
            level: 0,
            timerSeconds: 0,
            secondaryTimerSeconds: 0,
          },
        },
      },
    }

    const preview = previewCanonicalBasicFacilityPurchase(
      candidate,
      'assembly_lines',
    )
    const result = tryPurchaseCanonicalBasicFacility(
      candidate,
      'assembly_lines',
    )

    expect(preview).toMatchObject({
      eligible: true,
      selectedQuantity: 1n,
      cost: 20,
      status: 'success',
    })
    expect(result.attempt.cost).toBe(preview.cost)
    expect(result.attempt.quantity).toBe(preview.selectedQuantity)
    expect(result.state.dyson.facilities.assembly_lines[1]).toBe(11)
    expect(candidate.dyson.facilities.assembly_lines[1]).toBe(10)
  })

  test('applies a manual mega purchase without mutating canonical input', () => {
    const before = state()
    const candidate: CanonicalGameStateV1 = {
      ...before,
      dyson: {
        ...before.dyson,
        money: 1e20,
        facilities: {
          ...before.dyson.facilities,
          planets: [0, 1],
          matrioshka_brains: [0, 0],
        },
      },
      quantum: {
        ...before.quantum,
        unlocks: {
          ...before.quantum.unlocks,
          matrioshkaBrains: true,
        },
      },
    }

    const result = tryPurchaseCanonicalMegaStructure(
      candidate,
      'matrioshka_brains',
    )

    expect(result.purchased).toBe(true)
    expect(
      result.state.dyson.facilities.matrioshka_brains[1],
    ).toBeGreaterThan(0)
    expect(result.state.dyson.money).toBeLessThan(
      candidate.dyson.money,
    )
    expect(candidate.dyson.facilities.matrioshka_brains).toEqual([0, 0])
  })

  test('retains the canonical object when a manual command is locked', () => {
    const before = state()
    const result = tryPurchaseCanonicalMegaStructure(
      before,
      'galactic_brains',
    )
    expect(result.purchased).toBe(false)
    expect(result.state).toBe(before)
  })

  test('runs all eight automation slots and persists the next index', () => {
    const before = state()
    const enabled = Object.fromEntries(
      Object.keys(before.dyson.automation.enabledFacilities).map((id) => [
        id,
        true,
      ]),
    ) as CanonicalGameStateV1['dyson']['automation']['enabledFacilities']
    const candidate: CanonicalGameStateV1 = {
      ...before,
      dyson: {
        ...before.dyson,
        money: 1e100,
        facilities: {
          assembly_lines: [0, 5],
          ai_managers: [0, 1],
          servers: [0, 1],
          data_centers: [0, 1],
          planets: [0, 1],
          matrioshka_brains: [0, 0],
          birch_planets: [0, 0],
          galactic_brains: [0, 0],
        },
        automation: {
          ...before.dyson.automation,
          enabledFacilities: enabled,
          buyMode: 'buy-1',
        },
      },
      infinity: {
        ...before.infinity,
        automationUnlocked: {
          ...before.infinity.automationUnlocked,
          bots: true,
        },
      },
      quantum: {
        ...before.quantum,
        unlocks: {
          ...before.quantum.unlocks,
          matrioshkaBrains: true,
          birchPlanets: true,
          galacticBrains: true,
        },
      },
      timeline: {
        ...before.timeline,
        dysonAutomationTargetIndex: 0,
      },
    }

    const result = runCanonicalDysonAutomation(candidate)

    expect(result.attempts).toHaveLength(8)
    expect(result.attempts.every((attempt) => attempt.purchased)).toBe(
      true,
    )
    expect(result.state.timeline.dysonAutomationTargetIndex).toBe(1)
    expect(result.state.dyson.facilities.galactic_brains[1]).toBe(1)
    expect(candidate.dyson.facilities.galactic_brains[1]).toBe(0)
  })

  test('advances rotation even when global automation is disabled', () => {
    const before = state()
    const candidate: CanonicalGameStateV1 = {
      ...before,
      infinity: {
        ...before.infinity,
        automationUnlocked: {
          ...before.infinity.automationUnlocked,
          bots: false,
        },
      },
      timeline: {
        ...before.timeline,
        dysonAutomationTargetIndex: 7,
      },
    }
    const result = runCanonicalDysonAutomation(candidate)
    expect(
      result.attempts.every(
        (attempt) => attempt.status === 'global-disabled',
      ),
    ).toBe(true)
    expect(result.state.timeline.dysonAutomationTargetIndex).toBe(0)
  })

  test('guards the first Planet and shares stacked Terra pricing across every purchase path', () => {
    const before = state()
    const enabled = {
      ...before.dyson.automation.enabledFacilities,
      planets: true,
    }
    const base: CanonicalGameStateV1 = {
      ...before,
      dyson: {
        ...before.dyson,
        money: 1e15,
        facilities: {
          ...before.dyson.facilities,
          data_centers: [1, 0],
          planets: [0, 0],
        },
        automation: {
          ...before.dyson.automation,
          buyMode: 'buy-1',
          enabledFacilities: enabled,
        },
      },
      infinity: {
        ...before.infinity,
        automationUnlocked: {
          ...before.infinity.automationUnlocked,
          bots: true,
        },
      },
    }
    const terra = {
      ...base,
      skills: {
        ...base.skills,
        byId: {
          ...base.skills.byId,
          terraNova: { ...base.skills.byId.terraNova!, owned: true },
          terraGloriae: {
            ...base.skills.byId.terraGloriae!,
            owned: true,
          },
        },
      },
    }
    const quote = (
      source: CanonicalGameStateV1,
      planets: readonly [number, number],
    ) => previewCanonicalBasicFacilityPurchase(
      {
        ...source,
        dyson: {
          ...source.dyson,
          facilities: { ...source.dyson.facilities, planets },
        },
      },
      'planets',
      5,
    )
    const ordinaryZero = quote(base, [0, 0])
    const terraZero = quote(terra, [0, 0])
    expect(terraZero.cost).toBe(ordinaryZero.cost)
    expect(quote(base, [1, 0]).cost / quote(terra, [1, 0]).cost)
      .toBeCloseTo(5, 12)
    expect(quote(base, [1, 1]).cost / quote(terra, [1, 1]).cost)
      .toBeCloseTo(10, 12)

    const manual = tryPurchaseCanonicalBasicFacility(
      terra,
      'planets',
      5,
    )
    expect(manual.attempt.cost).toBe(terraZero.cost)
    const automated = runCanonicalDysonAutomation(
      terra,
      'preserve-configured-mode',
      5,
    )
    expect(
      automated.attempts.find(({ facilityId }) => facilityId === 'planets')
        ?.cost,
    ).toBe(terraZero.cost)
  })
})
