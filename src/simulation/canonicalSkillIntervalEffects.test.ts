import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  applyCanonicalSkillIntervalEffects,
  timeToNextInfinityEventAfterStellarSettlement,
  type CanonicalSkillIntervalInputs,
} from './canonicalSkillIntervalEffects'
import {
  createBasicDysonInfinityState,
  ordinaryInfinityBotThreshold,
  timeToNextInfinityEvent,
} from './infinityCycle'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function state(bots = 0): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixture).prepared,
  ).state
  return {
    ...source,
    dyson: {
      ...source.dyson,
      bots,
      facilities: {
        ...source.dyson.facilities,
        planets: [0, 0],
      },
    },
  }
}

function advance(
  source: CanonicalGameStateV1,
  overrides: Partial<CanonicalSkillIntervalInputs>,
): CanonicalGameStateV1 {
  const inputs: CanonicalSkillIntervalInputs = {
    seconds: 0.1,
    botProductionPerSecond: 0,
    stellarPlanetsPerSecond: 2,
    stellarBotsPerSecond: 10,
    scienceBoostPerSecond: 0,
    moneyUpgradePerSecond: 0,
    ...overrides,
  }
  const afterArrivals = {
    ...source,
    dyson: {
      ...source.dyson,
      bots:
        source.dyson.bots +
        inputs.botProductionPerSecond * inputs.seconds,
    },
  }
  return applyCanonicalSkillIntervalEffects(
    source,
    afterArrivals,
    inputs,
  )
}

describe('canonical skill interval effects', () => {
  test('advances each owned timer with its individual cap', () => {
    const source = state()
    const withSkills = {
      ...source,
      skills: {
        ...source.skills,
        byId: {
          ...source.skills.byId,
          androids: {
            ...source.skills.byId.androids!,
            owned: true,
            timerSeconds: 599.5,
          },
          pocketAndroids: {
            ...source.skills.byId.pocketAndroids!,
            owned: true,
            timerSeconds: 3_599.5,
          },
          superRadiantScattering: {
            ...source.skills.byId.superRadiantScattering!,
            owned: true,
            timerSeconds: 12,
          },
        },
      },
    }
    const result = advance(withSkills, {
      seconds: 1,
      stellarPlanetsPerSecond: 0,
      stellarBotsPerSecond: 0,
    })
    expect(result.skills.byId.androids?.timerSeconds).toBe(600)
    expect(result.skills.byId.pocketAndroids?.timerSeconds).toBe(3_600)
    expect(
      result.skills.byId.superRadiantScattering?.timerSeconds,
    ).toBe(13)
  })

  test('commits uncapped fractional Shoulders accrual', () => {
    const source = state()
    const prepared = {
      ...source,
      research: {
        ...source.research,
        levelsById: {
          ...source.research.levelsById,
          'research.science_boost': 4,
          'research.money_multiplier': 8,
        },
        progressById: {
          ...source.research.progressById,
          'research.science_boost': 0.25,
          'research.money_multiplier': 0.8,
        },
      },
    }
    const result = advance(prepared, {
      seconds: 2,
      stellarPlanetsPerSecond: 0,
      stellarBotsPerSecond: 0,
      scienceBoostPerSecond: 0.75,
      moneyUpgradePerSecond: 0.2,
    })
    expect(result.research.levelsById['research.science_boost']).toBe(5)
    expect(result.research.progressById['research.science_boost']).toBe(0.75)
    expect(result.research.levelsById['research.money_multiplier']).toBe(9)
    expect(result.research.progressById['research.money_multiplier'])
      .toBeCloseTo(0.2, 12)
  })

  test('allows exact-cost sacrifice and excludes same-step Bot production', () => {
    const exact = advance(state(1), {})
    expect(exact.dyson.bots).toBe(0)
    expect(exact.dyson.facilities.planets[0]).toBeCloseTo(0.2, 12)

    const first = advance(state(0), { botProductionPerSecond: 10 })
    expect(first.dyson.bots).toBe(1)
    expect(first.dyson.facilities.planets[0]).toBe(0)
    const second = advance(first, { botProductionPerSecond: 10 })
    expect(second.dyson.bots).toBe(1)
    expect(second.dyson.facilities.planets[0]).toBeCloseTo(0.2, 12)
  })

  test('treats a Stored Time group as one interval with start-only Bot funding', () => {
    const grouped = advance(state(1), {
      seconds: 10,
      botProductionPerSecond: 7,
      stellarBotsPerSecond: 10,
      stellarPlanetsPerSecond: 3,
    })
    expect(grouped.dyson.bots).toBeCloseTo(70, 10)
    expect(grouped.dyson.facilities.planets[0]).toBeCloseTo(0.3, 10)
  })

  test('clamps interval Bot arrivals at the ordinary cap until Break the Loop', () => {
    const threshold = ordinaryInfinityBotThreshold(0n)
    const ordinary = advance(state(threshold), {
      seconds: 1,
      botProductionPerSecond: 100,
      stellarPlanetsPerSecond: 0,
      stellarBotsPerSecond: 0,
    })
    expect(ordinary.dyson.bots).toBe(threshold)

    const source = state(threshold)
    const afterBreak = advance({
      ...source,
      quantum: {
        ...source.quantum,
        unlocks: {
          ...source.quantum.unlocks,
          breakTheLoop: true,
        },
      },
    }, {
      seconds: 1,
      botProductionPerSecond: 100,
      stellarPlanetsPerSecond: 0,
      stellarBotsPerSecond: 0,
    })
    expect(afterBreak.dyson.bots).toBe(threshold + 100)
  })

  test('does not predict a gross-production Infinity that Stellar settlement prevents', () => {
    const infinity = createBasicDysonInfinityState({
      divisionsPurchased: 19n,
    })
    const grossHorizon = timeToNextInfinityEvent(
      1,
      0.716,
      infinity,
      10,
      1 / 60,
    )
    const settledHorizon =
      timeToNextInfinityEventAfterStellarSettlement(
        1,
        0.716,
        5e12,
        2.886,
        infinity,
        10,
        1 / 60,
      )

    expect(grossHorizon).toBeCloseTo((4.2 - 1) / 0.716, 12)
    expect(settledHorizon).toBeCloseTo(4.2 / 0.716, 12)
    expect(settledHorizon).toBeGreaterThan(grossHorizon)
    expect(
      timeToNextInfinityEventAfterStellarSettlement(
        1,
        0.716,
        5e12,
        0,
        infinity,
        10,
        1 / 60,
      ),
    ).toBe(grossHorizon)

    const matureCycle = createBasicDysonInfinityState({
      divisionsPurchased: 19n,
      secondsInCurrentCycle: 1,
    })
    expect(
      timeToNextInfinityEventAfterStellarSettlement(
        4.2,
        0.7,
        5e12,
        2.886,
        matureCycle,
        10,
        1 / 60,
      ),
    ).toBe(0)
    expect(
      timeToNextInfinityEventAfterStellarSettlement(
        100,
        0.7,
        5e12,
        2.886,
        matureCycle,
        10,
        1 / 60,
      ),
    ).toBe(0)
    expect(
      timeToNextInfinityEventAfterStellarSettlement(
        100,
        0.7,
        5e12,
        2.886,
        createBasicDysonInfinityState({
          divisionsPurchased: 19n,
          secondsInCurrentCycle: 0,
        }),
        1,
        0.5,
      ),
    ).toBe(1)
  })
})
