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
  deriveDreamRailgunReadinessFacts,
  deriveDreamSpaceAgeProductionFacts,
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
  test('characterizes the canonical Space Age timing and cap constants', () => {
    expect(DREAM_SPACE_AGE_CONSTANTS).toEqual({
      tickSeconds: 0.1,
      spaceFactoryDurationSeconds: 2,
      railgunVolleyDurationSeconds: 1,
      shotsPerVolley: 10,
      basePanelsRequiredToStart: 1n,
      dysonPanelCap: 1_000n,
      railgunPayloadHeadroom: 1.1,
      railgunBasePayloadCapacity: 1,
      railgunUpgrade1PayloadCapacity: 10,
      railgunUpgrade2PayloadCapacity: 100,
      overdriveBufferSeconds: 1,
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

  test('shows ten shots before firing a fixed 100 ms railgun cadence', () => {
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
      fireProgress: 0,
      shotsRemaining: 10,
    })
    current = first.state

    const second = runDreamRailgunAutomation(current, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 1,
    })
    expect(second.shotFired).toBe(true)
    expect(second.panelsLaunched).toBe(1n)
    expect(second.state.dream.resources.railgunCharge)
      .toBe(22_500_000)
    expect(second.state.dream.resources.dysonPanels).toBe(9n)
    expect(second.state.dream.resources.swarmPanels).toBe(1n)
    expect(second.state.dream.railgun).toEqual({
      firing: true,
      fireProgress: 0,
      shotsRemaining: 9,
    })
  })

  test('spends surplus energy on bounded factory overdrive and matching railgun payload', () => {
    const source = state()
    const input: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          energy: 1_000_000_000,
          spaceFactories: 10,
          dysonPanels: 100n,
        },
        upgrades: {
          ...source.dream.upgrades,
          sfActivator1: true,
          sfActivator2: true,
          sfActivator3: true,
          railgunActivator1: true,
          railgunActivator2: true,
        },
      },
    }

    const production = deriveDreamSpaceAgeProductionFacts(input, 1)
    expect(production.status).toBe('success')
    if (production.status !== 'success') return
    expect(production.facts.spaceFactory).toMatchObject({
      baseProgressPerSecond: 16,
      progressPerSecond: 80,
      nominalPanelsPerSecond: 40,
      overdriveMultiplier: 5,
      overdriveEnergyPerSecond: 100_000_000,
      overdriveActive: true,
      railgunPayloadTarget: 5,
      railgunLaunchCapacityPerSecond: 50,
      railgunPayloadCapacity: 100,
    })

    const produced = runDreamSpaceAgeProduction(input, {
      tickSeconds: 0.1,
      doubleTimeMultiplier: 1,
    })
    expect(produced.overdriveEnergyConsumed).toBe(10_000_000)
    expect(produced.spaceFactoryCycles).toBe(4n)
    expect(produced.dysonPanelsProduced).toBe(4n)
    expect(produced.state.dream.resources.energy).toBe(990_000_000)

    const railgun = deriveDreamRailgunReadinessFacts(input, {
      doubleTimeActive: false,
      doubleTimeRate: 1,
    })
    expect(railgun.status).toBe('success')
    if (railgun.status !== 'success') return
    expect(railgun.facts).toMatchObject({
      baseMaximumCharge: 25_000_000,
      maximumCharge: 125_000_000,
      mechanicalPayload: 5,
      panelsPerShot: 5n,
      panelsPerVolley: 50n,
      launchCapacityPerSecond: 50,
      panelsRequiredToStart: 5n,
      chargePerShot: 12_500_000,
    })
  })

  test('keeps a maximum Double Time payload within panel storage', () => {
    const source = state()
    const highThroughput: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          energy: 1e300,
          railgunCharge: 2_500_000_000,
          spaceFactories: 1e300,
          dysonPanels: 1_000n,
        },
        upgrades: {
          ...source.dream.upgrades,
          sfActivator1: true,
          sfActivator2: true,
          sfActivator3: true,
          railgunActivator1: true,
          railgunActivator2: true,
        },
      },
    }

    const result = deriveDreamRailgunReadinessFacts(highThroughput, {
      doubleTimeActive: true,
      doubleTimeRate: 10,
    })

    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.facts.mechanicalPayload).toBe(100)
    expect(result.facts.panelsPerShot).toBe(1_000n)
    expect(result.facts.panelsRequiredToStart).toBe(1_000n)
    expect(result.facts.panelsRequiredToStart)
      .toBeLessThanOrEqual(DREAM_SPACE_AGE_CONSTANTS.dysonPanelCap)
    expect(result.facts.canStartVolley).toBe(true)
  })

  test('keeps an adaptive payload stable for every shot in a volley', () => {
    const source = state()
    let current: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          energy: 1_000_000_000,
          railgunCharge: 125_000_000,
          spaceFactories: 10,
          dysonPanels: 50n,
        },
        upgrades: {
          ...source.dream.upgrades,
          sfActivator1: true,
          sfActivator2: true,
          sfActivator3: true,
          railgunActivator1: true,
          railgunActivator2: true,
        },
      },
    }

    const started = runDreamRailgunAutomation(current, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 1,
    })
    expect(started.volleyStarted).toBe(true)
    expect(started.chargeTransferred).toBe(0)
    expect(started.state.dream.railgun.shotsRemaining).toBe(10)
    current = started.state

    const remaining = [10]
    let launched = 0n
    for (let shot = 0; shot < 10; shot += 1) {
      const result = runDreamRailgunAutomation(current, {
        tickSeconds: 0.1,
        doubleTimeActive: false,
        doubleTimeRate: 1,
      })
      expect(result.shotFired).toBe(true)
      expect(result.chargeTransferred).toBe(0)
      expect(result.panelsLaunched).toBe(5n)
      launched += result.panelsLaunched
      current = result.state
      remaining.push(current.dream.railgun.shotsRemaining)
    }

    expect(remaining).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0])
    expect(launched).toBe(50n)
    expect(current.dream.resources.energy).toBe(1_000_000_000)
    expect(current.dream.resources.railgunCharge).toBe(0)
    expect(current.dream.resources.dysonPanels).toBe(0n)
    expect(current.dream.resources.swarmPanels).toBe(50n)
    expect(current.dream.railgun.firing).toBe(false)
  })

  test('waits for factory panels without abandoning the active volley', () => {
    const source = state()
    const started = runDreamRailgunAutomation({
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          railgunCharge: 25_000_000,
          dysonPanels: 1n,
        },
      },
    }, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 1,
    })
    const firstShot = runDreamRailgunAutomation(started.state, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 1,
    })
    const waiting = runDreamRailgunAutomation(firstShot.state, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 1,
    })

    expect(firstShot.panelsLaunched).toBe(1n)
    expect(waiting.shotFired).toBe(false)
    expect(waiting.state.dream.resources.railgunCharge).toBe(22_500_000)
    expect(waiting.state.dream.railgun).toEqual({
      firing: true,
      fireProgress: 0,
      shotsRemaining: 9,
    })

    const resumed = runDreamRailgunAutomation({
      ...waiting.state,
      dream: {
        ...waiting.state.dream,
        resources: {
          ...waiting.state.dream.resources,
          dysonPanels: 1n,
        },
      },
    }, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 1,
    })
    expect(resumed.shotFired).toBe(true)
    expect(resumed.state.dream.railgun.shotsRemaining).toBe(8)
  })

  test('does not overdrive factories without a one-second energy buffer', () => {
    const source = state()
    const input: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          energy: 74_999_999,
          spaceFactories: 10,
          dysonPanels: 100n,
          railgunCharge: 100_000_000,
        },
        upgrades: {
          ...source.dream.upgrades,
          sfActivator1: true,
          sfActivator2: true,
          sfActivator3: true,
          railgunActivator1: true,
          railgunActivator2: true,
        },
      },
    }

    const production = deriveDreamSpaceAgeProductionFacts(input, 1)
    expect(production.status).toBe('success')
    if (production.status !== 'success') return
    expect(production.facts.spaceFactory.overdriveMultiplier).toBe(3)
    expect(production.facts.spaceFactory.overdriveEnergyPerSecond)
      .toBe(50_000_000)
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

    const started = runDreamRailgunAutomation(input, {
      tickSeconds: 0.1,
      doubleTimeActive: true,
      doubleTimeRate: 99,
    })
    const result = runDreamRailgunAutomation(started.state, {
      tickSeconds: 0.1,
      doubleTimeActive: true,
      doubleTimeRate: 99,
    })

    expect(started.volleyStarted).toBe(true)
    expect(result.volleyStarted).toBe(false)
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

  test('refunds idle legacy charge above the adaptive payload cap', () => {
    const source = state()
    const overcharged: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          energy: 5_000_000,
          railgunCharge: 125_000_000,
        },
      },
    }

    const result = runDreamRailgunAutomation(overcharged, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 1,
    })

    expect(result.chargeTransferred).toBe(0)
    expect(result.state.dream.resources.energy).toBe(105_000_000)
    expect(result.state.dream.resources.railgunCharge).toBe(25_000_000)
  })

  test('clamps a legacy mid-volley payload to owned railgun capacity', () => {
    const source = state()
    const legacyVolley: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          railgunCharge: 25_000_000,
          dysonPanels: 10n,
        },
        railgun: {
          firing: true,
          fireProgress: 0,
          shotsRemaining: 1,
        },
      },
    }

    const readiness = deriveDreamRailgunReadinessFacts(legacyVolley, {
      doubleTimeActive: false,
      doubleTimeRate: 1,
    })
    expect(readiness.status).toBe('success')
    if (readiness.status !== 'success') return
    expect(readiness.facts.payloadCapacity).toBe(1)
    expect(readiness.facts.mechanicalPayload).toBe(1)
    expect(readiness.facts.panelsPerShot).toBe(1n)

    const result = runDreamRailgunAutomation(legacyVolley, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 1,
    })
    expect(result.shotFired).toBe(true)
    expect(result.panelsLaunched).toBe(1n)
    expect(result.state.dream.resources.dysonPanels).toBe(9n)
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
