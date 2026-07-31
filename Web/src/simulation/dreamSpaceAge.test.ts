import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import {
  DREAM_UPGRADE_FLAGS,
  type CanonicalGameStateV1,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { DISCRETE_MAXIMUM } from './numeric'
import {
  DREAM_SPACE_AGE_CONSTANTS,
  purchaseDreamSpaceAge,
  runDreamRailgunAutomation,
  runDreamSpaceAgeProduction,
} from './dreamSpaceAge'

const fixtureText = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function state(): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixtureText).prepared,
  ).state
  return {
    ...source,
    reality: {
      ...source.reality,
      influence: 1_000_000n,
    },
    dream: {
      ...source.dream,
      resources: {
        ...source.dream.resources,
        energy: 0,
        spaceFactories: 0,
        dysonPanels: 0n,
        railgunCharge: 0,
        solarPanels: 0,
        fusion: 0,
        swarmPanels: 0n,
      },
      parameters: {
        ...source.dream.parameters,
        railgunMaxCharge: 25_000_000,
        solarCost: 50n,
        solarPanelGeneration: 100n,
        fusionCost: 100_000n,
        fusionGeneration: 1_250_000n,
        swarmPanelGeneration: 3_212n,
      },
      education: {
        ...source.dream.education,
        mathematics: {
          ...source.dream.education.mathematics,
          complete: false,
        },
      },
      timers: {
        ...source.dream.timers,
        spaceFactoriesTimerProgress: 0,
      },
      railgun: {
        firing: false,
        fireProgress: 0,
        shotsRemaining: 0,
      },
      upgrades: Object.fromEntries(
        DREAM_UPGRADE_FLAGS.map((key) => [key, false]),
      ) as unknown as CanonicalGameStateV1['dream']['upgrades'],
    },
  }
}

describe('Dream Space Age', () => {
  test('characterizes the authored Space Age timing and cap constants', () => {
    expect(DREAM_SPACE_AGE_CONSTANTS).toEqual({
      tickSeconds: 0.1,
      spaceFactoryDurationSeconds: 2,
      railgunBaseFireTimeSeconds: 5,
      railgunUpgrade1FireTimeSeconds: 2.5,
      railgunUpgrade2FireTimeSeconds: 1,
      shotsPerVolley: 10,
      basePanelsRequiredToStart: 10n,
      dysonPanelCap: 1_000n,
    })
  })

  test('adds solar, fusion, and swarm energy with Mathematics affecting only solar', () => {
    const source = state()
    const input: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          solarPanels: 2,
          fusion: 1,
          swarmPanels: 3n,
        },
        education: {
          ...source.dream.education,
          mathematics: {
            ...source.dream.education.mathematics,
            complete: true,
          },
        },
      },
    }
    const before = structuredClone(input)

    const result = runDreamSpaceAgeProduction(input, {
      tickSeconds: 0.1,
      doubleTimeMultiplier: 2,
    })

    expect(result.energyGenerated).toBeCloseTo(252_007.2)
    expect(result.state.dream.resources.energy).toBeCloseTo(
      252_007.2,
    )
    expect(input).toEqual(before)
  })

  test('advances the two-second factory timer with all boosts and clamps panels at 1000', () => {
    const source = state()
    const input: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          spaceFactories: 10,
          dysonPanels: 999n,
        },
        timers: {
          ...source.dream.timers,
          spaceFactoriesTimerProgress: 0.25,
        },
        upgrades: {
          ...source.dream.upgrades,
          sfActivator1: true,
          sfActivator2: true,
          sfActivator3: true,
        },
      },
    }

    const produced = runDreamSpaceAgeProduction(input, {
      tickSeconds: 0.25,
      doubleTimeMultiplier: 1,
    })
    expect(produced.spaceFactoryCycles).toBe(2n)
    expect(produced.dysonPanelsProduced).toBe(1n)
    expect(produced.state.dream.resources.dysonPanels).toBe(1_000n)
    expect(
      produced.state.dream.timers.spaceFactoriesTimerProgress,
    ).toBeCloseTo(0.25)

    const capped = runDreamSpaceAgeProduction(produced.state, {
      tickSeconds: 10,
      doubleTimeMultiplier: 10,
    })
    expect(capped.spaceFactoryCycles).toBe(0n)
    expect(capped.dysonPanelsProduced).toBe(0n)
    expect(capped.state.dream.timers.spaceFactoriesTimerProgress)
      .toBeCloseTo(0.25)
  })

  test('persists a base railgun volley and fires on the third 0.1 second tick', () => {
    const source = state()
    let current: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          railgunCharge: 25_000_000,
          dysonPanels: 10n,
        },
      },
    }

    const first = runDreamRailgunAutomation(current, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 1,
    })
    expect(first.volleyStarted).toBe(true)
    expect(first.shotFired).toBe(false)
    expect(first.state.dream.railgun).toEqual({
      firing: true,
      fireProgress: 0.2,
      shotsRemaining: 10,
    })
    current = first.state

    const second = runDreamRailgunAutomation(current, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 1,
    })
    expect(second.shotFired).toBe(false)
    expect(second.state.dream.railgun.fireProgress).toBeCloseTo(0.4)

    const third = runDreamRailgunAutomation(second.state, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 1,
    })
    expect(third.shotFired).toBe(true)
    expect(third.panelsLaunched).toBe(1n)
    expect(third.state.dream.resources.railgunCharge)
      .toBe(22_500_000)
    expect(third.state.dream.resources.dysonPanels).toBe(9n)
    expect(third.state.dream.resources.swarmPanels).toBe(1n)
    expect(third.state.dream.railgun).toEqual({
      firing: true,
      fireProgress: 0,
      shotsRemaining: 9,
    })
  })

  test('uses the prepared Double Time rate for a railgun-II shot', () => {
    const source = state()
    const input: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          railgunCharge: 25_000_000,
          dysonPanels: 100n,
        },
        upgrades: {
          ...source.dream.upgrades,
          railgunActivator2: true,
        },
      },
    }

    const result = runDreamRailgunAutomation(input, {
      tickSeconds: 0.1,
      doubleTimeActive: true,
      doubleTimeRate: 99,
    })

    expect(result.volleyStarted).toBe(true)
    expect(result.shotFired).toBe(true)
    expect(result.panelsLaunched).toBe(10n)
    expect(result.state.dream.resources.dysonPanels).toBe(90n)
    expect(result.state.dream.resources.swarmPanels).toBe(10n)
    expect(result.state.dream.railgun.shotsRemaining).toBe(9)
  })

  test('charges atomically and stops a saturated firing volley without debits', () => {
    const source = state()
    const charging: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          energy: 30_000_000,
        },
      },
    }
    const charged = runDreamRailgunAutomation(charging, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 1,
    })
    expect(charged.chargeTransferred).toBe(25_000_000)
    expect(charged.state.dream.resources.energy).toBe(5_000_000)
    expect(charged.state.dream.resources.railgunCharge)
      .toBe(25_000_000)

    const saturated: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          railgunCharge: 25_000_000,
          dysonPanels: 1n,
          swarmPanels: DISCRETE_MAXIMUM,
        },
        railgun: {
          firing: true,
          fireProgress: 0.4,
          shotsRemaining: 1,
        },
      },
    }
    const stopped = runDreamRailgunAutomation(saturated, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 1,
    })
    expect(stopped.shotFired).toBe(false)
    expect(stopped.state.dream.resources.railgunCharge)
      .toBe(25_000_000)
    expect(stopped.state.dream.resources.dysonPanels).toBe(1n)
    expect(stopped.state.dream.resources.swarmPanels)
      .toBe(DISCRETE_MAXIMUM)
    expect(stopped.state.dream.railgun).toEqual({
      firing: false,
      fireProgress: 0,
      shotsRemaining: 0,
    })
  })

  test('purchases Solar and Fusion atomically and rejects invalid inputs immutably', () => {
    const source = state()
    const before = structuredClone(source)
    const solar = purchaseDreamSpaceAge(source, 'solar')
    expect(solar).toMatchObject({
      purchased: true,
      cost: 50n,
      status: 'success',
    })
    expect(solar.state.reality.influence).toBe(999_950n)
    expect(solar.state.dream.resources.solarPanels).toBe(1)

    const bulkSolar = purchaseDreamSpaceAge(source, 'solar', 10)
    expect(bulkSolar).toMatchObject({
      purchased: true,
      cost: 500n,
      status: 'success',
    })
    expect(bulkSolar.state.reality.influence).toBe(999_500n)
    expect(bulkSolar.state.dream.resources.solarPanels).toBe(10)

    const fusion = purchaseDreamSpaceAge(solar.state, 'fusion')
    expect(fusion.purchased).toBe(true)
    expect(fusion.state.reality.influence).toBe(899_950n)
    expect(fusion.state.dream.resources.fusion).toBe(1)
    expect(source).toEqual(before)

    const invalid = runDreamRailgunAutomation(source, {
      tickSeconds: Number.NaN,
      doubleTimeActive: false,
      doubleTimeRate: 1,
    })
    expect(invalid.status).toBe('invalid-input')
    expect(invalid.state).toBe(source)

    const poor = {
      ...source,
      reality: { ...source.reality, influence: 49n },
    }
    expect(purchaseDreamSpaceAge(poor, 'solar')).toMatchObject({
      purchased: false,
      status: 'insufficient-influence',
      state: poor,
    })
  })
})
