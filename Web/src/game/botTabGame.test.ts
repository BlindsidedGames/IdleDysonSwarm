import { describe, expect, test } from 'vitest'
import {
  advanceBotTabGame,
  applyBotDistribution,
  createBotTabGameState,
  purchaseBotFacility,
  setBotBuyMode,
  setBotDistribution,
  startTinkering,
} from './botTabGame'

describe('Bot tab game adapter', () => {
  test('matches Unity whole-bot allocation rounding', () => {
    const state = createBotTabGameState({
      dyson: {
        money: 0,
        science: 0,
        bots: 3.7,
        panels: 0,
        workers: 0,
        researchers: 0,
        moneyMultiplier: 1,
        scienceMultiplier: 1,
        panelRateMultiplier: 1,
        panelLifetime: 10,
        ownedSkills: [],
        facilities: {
          assembly_lines: [0, 0],
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
          enabledFacilities: [],
          buyMode: 'buy-1',
          roundedBulkBuy: false,
        },
      },
    })

    applyBotDistribution(state.dyson, 0.5, false)
    expect(state.dyson.workers).toBe(2)
    expect(state.dyson.researchers).toBe(1)
    expect(state.dyson.rates.panels).toBeCloseTo(0.02, 15)
    expect(state.dyson.rates.science).toBe(1)
  })

  test('rounds the allocation slider to whole percentages', () => {
    const state = createBotTabGameState()
    expect(setBotDistribution(state, 0.337).botDistribution).toBe(0.34)
  })

  test('completes the initial Unity tinker cooldown deterministically', () => {
    const started = startTinkering(createBotTabGameState())
    const almost = advanceBotTabGame(started, 9.8)
    expect(almost.dyson.bots).toBe(0)
    expect(almost.tinkerRemainingSeconds).toBeCloseTo(0.1, 12)

    const completed = advanceBotTabGame(almost, 0.1)
    expect(completed.dyson.bots).toBe(1)
    expect(completed.dyson.workers).toBe(1)
    expect(completed.dyson.researchers).toBe(0)
    expect(completed.tinkerCooldownSeconds).toBe(9)
    expect(completed.tinkerRemainingSeconds).toBeNull()
  })

  test('uses the configured buy mode for a manual facility purchase', () => {
    const initial = createBotTabGameState({
      dyson: {
        money: 10_000,
        science: 0,
        bots: 10,
        panels: 0,
        workers: 5,
        researchers: 5,
        moneyMultiplier: 1,
        scienceMultiplier: 1,
        panelRateMultiplier: 1,
        panelLifetime: 10,
        ownedSkills: [],
        facilities: {
          assembly_lines: [0, 0],
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
          enabledFacilities: [],
          buyMode: 'buy-1',
          roundedBulkBuy: false,
        },
      },
    })
    const buyTen = setBotBuyMode(initial, 'buy-10')
    const purchased = purchaseBotFacility(buyTen, 'assembly_lines')

    expect(purchased.result.purchased).toBe(true)
    expect(purchased.result.quantity).toBe(10n)
    expect(purchased.state.dyson.facilities.assembly_lines[1]).toBe(10)
    expect(purchased.state.dyson.rates.bots).toBeGreaterThan(0)
  })
})
