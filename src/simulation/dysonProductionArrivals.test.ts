import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import { prepareIdb1Save } from '../save/prepare'
import {
  applyDysonProductionArrivals,
  combineDysonProductionArrivalRates,
  type DysonProductionArrivalRates,
} from './dysonProductionArrivals'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

const rates: Readonly<DysonProductionArrivalRates> = Object.freeze({
  money: 1,
  science: 2,
  panels: 3,
  bots: 4,
  assembly_lines: 5,
  ai_managers: 6,
  servers: 7,
  data_centers: 8,
  planets: 9,
  matrioshka_brains: 10,
  birch_planets: 11,
})

function state() {
  return hydrateGameState(prepareIdb1Save(fixture).prepared).state
}

describe('Dyson production arrivals', () => {
  test('maps producer-keyed mega rates onto their produced tiers', () => {
    expect(
      combineDysonProductionArrivalRates(
        {
          money: 1,
          science: 2,
          panels: 3,
          bots: 4,
          assembly_lines: 5,
          ai_managers: 6,
          servers: 7,
          data_centers: 8,
          planets: 9,
        },
        {
          matrioshka_brains: 10,
          birch_planets: 11,
          galactic_brains: 12,
        },
      ),
    ).toEqual({
      money: 1,
      science: 2,
      panels: 3,
      bots: 4,
      assembly_lines: 5,
      ai_managers: 6,
      servers: 7,
      data_centers: 8,
      planets: 19,
      matrioshka_brains: 11,
      birch_planets: 12,
    })
  })

  test('commits the complete captured chain atomically', () => {
    const before = state()
    const after = applyDysonProductionArrivals(before, rates, 2)

    expect(after.dyson.money).toBe(before.dyson.money + 2)
    expect(after.dyson.science).toBe(before.dyson.science + 4)
    expect(after.dyson.totalPanelsDecayed).toBe(
      before.dyson.totalPanelsDecayed + 6,
    )
    expect(after.dyson.bots).toBe(before.dyson.bots + 8)
    expect(after.dyson.facilities.assembly_lines[0]).toBe(
      before.dyson.facilities.assembly_lines[0] + 10,
    )
    expect(after.dyson.facilities.ai_managers[0]).toBe(
      before.dyson.facilities.ai_managers[0] + 12,
    )
    expect(after.dyson.facilities.servers[0]).toBe(
      before.dyson.facilities.servers[0] + 14,
    )
    expect(after.dyson.facilities.data_centers[0]).toBe(
      before.dyson.facilities.data_centers[0] + 16,
    )
    expect(after.dyson.facilities.planets[0]).toBe(
      before.dyson.facilities.planets[0] + 18,
    )
    expect(after.dyson.facilities.matrioshka_brains[0]).toBe(
      before.dyson.facilities.matrioshka_brains[0] + 20,
    )
    expect(after.dyson.facilities.birch_planets[0]).toBe(
      before.dyson.facilities.birch_planets[0] + 22,
    )
    expect(after.dyson.facilities.galactic_brains).toEqual(
      before.dyson.facilities.galactic_brains,
    )
  })

  test('does not mutate the input or invent a same-tick cascade', () => {
    const before = state()
    const snapshot = structuredClone(before)
    const noCapturedMatrioshkaProduction = {
      ...rates,
      matrioshka_brains: 0,
      birch_planets: 100,
    }

    const after = applyDysonProductionArrivals(
      before,
      noCapturedMatrioshkaProduction,
      1,
    )

    expect(before).toEqual(snapshot)
    expect(after.dyson.facilities.birch_planets[0]).toBe(
      before.dyson.facilities.birch_planets[0] + 100,
    )
    expect(after.dyson.facilities.matrioshka_brains[0]).toBe(
      before.dyson.facilities.matrioshka_brains[0],
    )
  })

  test('returns the identical snapshot for zero time', () => {
    const before = state()
    expect(applyDysonProductionArrivals(before, rates, 0)).toBe(before)
  })

  test('fails closed for invalid time and captured rates', () => {
    expect(() =>
      applyDysonProductionArrivals(state(), rates, -1),
    ).toThrow('finite non-negative seconds')
    expect(() =>
      applyDysonProductionArrivals(
        state(),
        { ...rates, birch_planets: Number.NaN },
        1,
      ),
    ).toThrow(
      "Dyson production rate 'birch_planets' must be finite and non-negative.",
    )
  })
})
