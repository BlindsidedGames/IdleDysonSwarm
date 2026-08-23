import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { createBasicDysonState } from './dysonModel'
import { advanceEventTime } from './eventTime'
import {
  buyXCost,
  tryDebitContinuous,
  tryPurchaseBasicFacility,
  type BuyMode,
} from './transactions'
import { BasicDysonSimulationModel } from './dysonModel'

interface AutomationCase {
  readonly name: string
  readonly configuredMode: BuyMode
  readonly rounded: boolean
  readonly forceBuyMax: boolean
  readonly startingMoney: number
  readonly startingOwned: number
  readonly purchased: boolean
  readonly quantity: string
  readonly finalMoney: number
  readonly finalOwned: number
}

const fixture = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        '../../test/parity/assembly-line-automation-modes.json',
        import.meta.url,
      ),
    ),
    'utf8',
  ),
) as { readonly cases: readonly AutomationCase[] }

function stateFor(entry: AutomationCase) {
  return createBasicDysonState({
    money: entry.startingMoney,
    science: 0,
    bots: 0,
    panels: 0,
    workers: 0,
    researchers: 0,
    moneyMultiplier: 1,
    scienceMultiplier: 1,
    panelRateMultiplier: 1,
    panelLifetime: 10,
    ownedSkills: [],
    facilities: {
      assembly_lines: [0, entry.startingOwned],
      ai_managers: [0, 0],
      servers: [0, 0],
      data_centers: [0, 0],
      planets: [0, 0],
    },
    modifiers: {
      assembly_lines: 1,
      ai_managers: 1,
      servers: 1,
      data_centers: 1,
      planets: 1,
    },
    automation: {
      enabledFacilities: ['assembly_lines'],
      buyMode: entry.configuredMode,
      roundedBulkBuy: entry.rounded,
    },
  })
}

describe('facility transaction Unity parity', () => {
  test.each(fixture.cases)('$name', (entry) => {
    const state = stateFor(entry)
    const result = tryPurchaseBasicFacility(
      state,
      'assembly_lines',
      entry.forceBuyMax ? 'force-buy-max' : 'preserve-configured-mode',
    )

    expect(result.purchased).toBe(entry.purchased)
    expect(result.quantity).toBe(BigInt(entry.quantity))
    expect(state.money).toBeCloseTo(entry.finalMoney, 12)
    expect(state.facilities.assembly_lines[1]).toBe(entry.finalOwned)
    expect(state.automation.buyMode).toBe(entry.configuredMode)
  })

  test('charges a representable step when an affordable debit rounds away', () => {
    const result = tryDebitContinuous(Number.MAX_VALUE / 2, 1)
    expect(result.status).toBe('success')
    expect(result.balance).toBeLessThan(Number.MAX_VALUE / 2)
    expect(result.charged).toBeGreaterThan(0)
  })

  test('charges exactly one representable step for a finite cost at MAX', () => {
    const result = tryDebitContinuous(Number.MAX_VALUE, 1)

    expect(result).toEqual({
      balance: 1.7976931348623155e308,
      charged: 1.99584030953472e292,
      status: 'success',
    })
  })

  test('keeps a discounted geometric price growing after the level factor overflows', () => {
    const baseCost = 100 / 1e300
    const costAt4000 = buyXCost(100n, baseCost, 1.22, 4_000)
    const costAt4100 = buyXCost(100n, baseCost, 1.22, 4_100)

    expect(costAt4000).toBeGreaterThan(0)
    expect(costAt4100 / costAt4000 / (1.22 ** 100))
      .toBeCloseTo(1, 10)
  })

  test('runs automation after production at the scheduler boundary', () => {
    const entry = fixture.cases[0]!
    const state = stateFor(entry)
    const result = advanceEventTime({
      startingState: new BasicDysonSimulationModel(state),
      durationSeconds: 0.1,
      automationIntervalSeconds: 0.1,
      automationTimeUntilNextEvent: 0.1,
      processingBudgetMilliseconds: 0,
    })

    expect(result.completed).toBe(true)
    expect(result.candidateState.state.money).toBe(entry.finalMoney)
    expect(result.candidateState.state.facilities.assembly_lines[1]).toBe(1)
    expect(result.candidateState.state.rates.bots).toBeCloseTo(
      Math.fround(0.1),
      15,
    )
  })
})
