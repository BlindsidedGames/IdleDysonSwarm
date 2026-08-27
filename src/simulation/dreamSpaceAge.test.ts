import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import {
  DREAM_UPGRADE_FLAGS,
  type CanonicalGameStateV1,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  DISCRETE_MAXIMUM,
  SIMULATION_RESOURCE_MAXIMUM,
} from './numeric'
import {
  DREAM_SPACE_AGE_CONSTANTS,
  applyDreamOverdriveDiminishingReturn,
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
    reality: { ...source.reality, influence: 1_000_000n },
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
        activeRailguns: 0,
        reservedPanels: 0n,
        highestStoredPanels: 0n,
        lastRoundsFired: 0,
        lastPanelsLaunched: 0n,
      },
      upgrades: Object.fromEntries(
        DREAM_UPGRADE_FLAGS.map((key) => [key, false]),
      ) as unknown as CanonicalGameStateV1['dream']['upgrades'],
    },
  }
}

function withSpaceThroughput(
  source: CanonicalGameStateV1,
): CanonicalGameStateV1 {
  return {
    ...source,
    dream: {
      ...source.dream,
      resources: {
        ...source.dream.resources,
        energy: 1_000_000_000,
        fusion: 800,
        spaceFactories: 10,
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
}

describe('Dream Space Age', () => {
  test('characterizes the fixed tick and ten-round volley contract', () => {
    expect(DREAM_SPACE_AGE_CONSTANTS).toEqual({
      tickSeconds: 0.1,
      spaceFactoryDurationSeconds: 2,
      railgunVolleyDurationSeconds: 1,
      shotsPerVolley: 10,
      basePanelsRequiredToStart: 10n,
      railgunPayloadHeadroom: 1.1,
      maximumRailgunAutomationIntervalSeconds: 1,
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
    expect(result.state.dream.resources.energy).toBeCloseTo(252_007.2)
    expect(input).toEqual(before)
  })

  test('keeps factory storage unbounded and records its high-water mark', () => {
    const source = state()
    const input: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          spaceFactories: 10,
          dysonPanels: 9_999n,
        },
        timers: {
          ...source.dream.timers,
          spaceFactoriesTimerProgress: 0.25,
        },
        railgun: {
          ...source.dream.railgun,
          highestStoredPanels: 10_050n,
        },
        upgrades: {
          ...source.dream.upgrades,
          sfActivator1: true,
          sfActivator2: true,
          sfActivator3: true,
        },
      },
    }

    const first = runDreamSpaceAgeProduction(input, {
      tickSeconds: 0.25,
      doubleTimeMultiplier: 1,
    })
    expect(first.spaceFactoryCycles).toBe(2n)
    expect(first.dysonPanelsProduced).toBe(2n)
    expect(first.state.dream.resources.dysonPanels).toBe(10_001n)
    expect(first.state.dream.railgun.highestStoredPanels).toBe(10_050n)

    const second = runDreamSpaceAgeProduction(first.state, {
      tickSeconds: 10,
      doubleTimeMultiplier: 10,
    })
    expect(second.dysonPanelsProduced).toBeGreaterThan(0n)
    expect(second.state.dream.resources.dysonPanels).toBeGreaterThan(10_001n)
    expect(second.state.dream.railgun.highestStoredPanels)
      .toBe(second.state.dream.resources.dysonPanels)
  })

  test('resumes factory production from a save at the legacy Int64 ceiling', () => {
    const source = state()
    const input: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          spaceFactories: 1,
          dysonPanels: DISCRETE_MAXIMUM,
        },
        timers: {
          ...source.dream.timers,
          spaceFactoriesTimerProgress: 0,
        },
      },
    }

    const result = runDreamSpaceAgeProduction(input, {
      tickSeconds: 2,
      doubleTimeMultiplier: 1,
    })

    expect(result.dysonPanelsProduced).toBe(1n)
    expect(result.state.dream.resources.dysonPanels)
      .toBe(DISCRETE_MAXIMUM + 1n)
  })

  test('reserves a complete volley up front and depletes ten rounds at 100 ms', () => {
    const source = state()
    let current: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          railgunCharge: 25_000_000,
          dysonPanels: 13n,
        },
      },
    }

    const remaining: number[] = []
    let launched = 0n
    for (let tick = 0; tick < 10; tick += 1) {
      const result = runDreamRailgunAutomation(current, {
        tickSeconds: 0.1,
        doubleTimeActive: false,
        doubleTimeRate: 0,
      })
      if (tick === 0) {
        expect(result.volleyStarted).toBe(true)
        expect(result.state.dream.resources.dysonPanels).toBe(3n)
        expect(result.state.dream.railgun.reservedPanels).toBe(9n)
        expect(result.state.dream.railgun.activeRailguns).toBe(1)
      }
      expect(result.shotFired).toBe(true)
      expect(result.panelsLaunched).toBe(1n)
      launched += result.panelsLaunched
      current = result.state
      remaining.push(current.dream.railgun.shotsRemaining)
    }

    expect(remaining).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0])
    expect(launched).toBe(10n)
    expect(current.dream.resources.dysonPanels).toBe(3n)
    expect(current.dream.resources.swarmPanels).toBe(10n)
    expect(current.dream.railgun).toMatchObject({
      firing: false,
      fireProgress: 0,
      shotsRemaining: 0,
      activeRailguns: 0,
      reservedPanels: 0n,
      lastRoundsFired: 1,
      lastPanelsLaunched: 1n,
    })
  })

  test('settles a multi-billion-railgun final round despite charge rounding drift', () => {
    const source = state()
    const activeRailguns = 23_199_999_999
    const chargePerRound =
      source.dream.parameters.railgunMaxCharge * activeRailguns / 10
    let roundedCharge =
      source.dream.parameters.railgunMaxCharge * activeRailguns
    for (let round = 0; round < 9; round += 1) {
      roundedCharge -= chargePerRound
    }
    expect(roundedCharge).toBeLessThan(chargePerRound)
    expect(chargePerRound - roundedCharge).toBeLessThan(1_000)

    const input: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          railgunCharge: roundedCharge,
        },
        railgun: {
          ...source.dream.railgun,
          firing: true,
          fireProgress: 0,
          shotsRemaining: 1,
          activeRailguns,
          reservedPanels: BigInt(activeRailguns),
        },
      },
    }
    const automationInput = {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 0,
    } as const
    const readiness = deriveDreamRailgunReadinessFacts(
      input,
      automationInput,
    )
    expect(readiness.status).toBe('success')
    if (readiness.status === 'success') {
      expect(readiness.facts.hasChargeForNextShot).toBe(true)
      expect(readiness.facts.canFireNextShot).toBe(true)
    }

    const result = runDreamRailgunAutomation(input, automationInput)

    expect(result.status).toBe('success')
    expect(result.shotFired).toBe(true)
    expect(result.panelsLaunched).toBe(BigInt(activeRailguns))
    expect(result.state.dream.resources.railgunCharge).toBe(0)
    expect(result.state.dream.resources.swarmPanels)
      .toBe(BigInt(activeRailguns))
    expect(result.state.dream.railgun).toMatchObject({
      firing: false,
      fireProgress: 0,
      shotsRemaining: 0,
      activeRailguns: 0,
      reservedPanels: 0n,
      lastRoundsFired: 1,
    })

    const materiallyUndercharged = runDreamRailgunAutomation(
      {
        ...input,
        dream: {
          ...input.dream,
          resources: {
            ...input.dream.resources,
            railgunCharge: chargePerRound - 1_000_000,
          },
        },
      },
      automationInput,
    )
    expect(materiallyUndercharged.shotFired).toBe(false)
    expect(materiallyUndercharged.state.dream.railgun.shotsRemaining).toBe(1)
  })

  test('starts a dust-short charged volley without accepting a material shortfall', () => {
    const source = state()
    const maximumCharge = 580_000_000_000_000_000
    const automationInput = {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 0,
    } as const
    const charged: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          railgunCharge: maximumCharge - 1_024,
          dysonPanels: 10n,
        },
        parameters: {
          ...source.dream.parameters,
          railgunMaxCharge: maximumCharge,
        },
      },
    }
    const readiness = deriveDreamRailgunReadinessFacts(
      charged,
      automationInput,
    )
    expect(readiness.status).toBe('success')
    if (readiness.status === 'success') {
      expect(readiness.facts.mechanicalPayload).toBe(1)
      expect(readiness.facts.canStartVolley).toBe(true)
    }
    const started = runDreamRailgunAutomation(charged, automationInput)
    expect(started.volleyStarted).toBe(true)
    expect(started.shotFired).toBe(true)

    const materiallyUndercharged: CanonicalGameStateV1 = {
      ...charged,
      dream: {
        ...charged.dream,
        resources: {
          ...charged.dream.resources,
          railgunCharge: maximumCharge - 1_000_000,
        },
      },
    }
    const blockedReadiness = deriveDreamRailgunReadinessFacts(
      materiallyUndercharged,
      automationInput,
    )
    expect(blockedReadiness.status).toBe('success')
    if (blockedReadiness.status === 'success') {
      expect(blockedReadiness.facts.canStartVolley).toBe(false)
    }
    const blocked = runDreamRailgunAutomation(
      materiallyUndercharged,
      automationInput,
    )
    expect(blocked.volleyStarted).toBe(false)
    expect(blocked.shotFired).toBe(false)
  })

  test('uses every available complete ten-panel batch for a partial array', () => {
    const input = withSpaceThroughput(state())
    const prepared: CanonicalGameStateV1 = {
      ...input,
      dream: {
        ...input.dream,
        resources: {
          ...input.dream.resources,
          railgunCharge: 1_000_000_000,
          dysonPanels: 53n,
        },
      },
    }
    const result = runDreamRailgunAutomation(prepared, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 0,
    })

    expect(result.volleyStarted).toBe(true)
    expect(result.panelsLaunched).toBe(5n)
    expect(result.state.dream.resources.dysonPanels).toBe(3n)
    expect(result.state.dream.railgun.activeRailguns).toBe(5)
    expect(result.state.dream.railgun.reservedPanels).toBe(45n)
    expect(result.state.dream.railgun.shotsRemaining).toBe(9)
  })

  test('batches a 10x volley within one 100 ms gameplay update', () => {
    const source = state()
    const input: CanonicalGameStateV1 = {
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
    const result = runDreamRailgunAutomation(input, {
      tickSeconds: 0.1,
      doubleTimeActive: true,
      doubleTimeRate: 9,
    })

    expect(result.volleyStarted).toBe(true)
    expect(result.panelsLaunched).toBe(10n)
    expect(result.state.dream.resources.dysonPanels).toBe(0n)
    expect(result.state.dream.resources.swarmPanels).toBe(10n)
    expect(result.state.dream.railgun).toMatchObject({
      firing: false,
      shotsRemaining: 0,
      lastRoundsFired: 10,
      lastPanelsLaunched: 10n,
    })
  })

  test('carries 3x progress across consecutive volley boundaries', () => {
    const source = state()
    let current: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          energy: 25_000_000,
          railgunCharge: 25_000_000,
          dysonPanels: 20n,
        },
      },
    }

    let launched = 0n
    for (let tick = 0; tick < 4; tick += 1) {
      const result = runDreamRailgunAutomation(current, {
        tickSeconds: 0.1,
        effectiveDoubleTimeMultiplier: 3,
        doubleTimeActive: true,
        doubleTimeRate: 2,
      })
      launched += result.panelsLaunched
      current = result.state
    }

    expect(launched).toBe(12n)
    expect(current.dream.resources.dysonPanels).toBe(0n)
    expect(current.dream.resources.swarmPanels).toBe(12n)
    expect(current.dream.resources.energy).toBe(0)
    expect(current.dream.resources.railgunCharge).toBeCloseTo(20_000_000)
    expect(current.dream.railgun).toMatchObject({
      firing: true,
      shotsRemaining: 8,
      activeRailguns: 1,
      reservedPanels: 8n,
      lastRoundsFired: 3,
      lastPanelsLaunched: 3n,
    })
  })

  test('settles at most one volley per authoritative update', () => {
    const source = state()
    const input: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          energy: 25_000_000,
          railgunCharge: 25_000_000,
          dysonPanels: 20n,
        },
      },
    }

    const result = runDreamRailgunAutomation(input, {
      tickSeconds: 0.1,
      effectiveDoubleTimeMultiplier: 11,
      doubleTimeActive: true,
      doubleTimeRate: 10,
    })

    expect(result.panelsLaunched).toBe(10n)
    expect(result.state.dream.resources.dysonPanels).toBe(10n)
    expect(result.state.dream.resources.swarmPanels).toBe(10n)
    expect(result.state.dream.resources.energy).toBe(25_000_000)
    expect(result.state.dream.resources.railgunCharge).toBeCloseTo(0)
    expect(result.state.dream.railgun).toMatchObject({
      firing: false,
      shotsRemaining: 0,
      activeRailguns: 0,
      reservedPanels: 0n,
      lastRoundsFired: 10,
      lastPanelsLaunched: 10n,
    })
  })

  test('accelerates cadence without multiplying panels per round', () => {
    const input = withSpaceThroughput(state())
    const atOne = deriveDreamRailgunReadinessFacts(input, {
      doubleTimeActive: false,
      doubleTimeRate: 0,
    })
    const atTen = deriveDreamRailgunReadinessFacts(input, {
      doubleTimeActive: true,
      doubleTimeRate: 9,
    })
    expect(atOne.status).toBe('success')
    expect(atTen.status).toBe('success')
    if (atOne.status !== 'success' || atTen.status !== 'success') return

    expect(atTen.facts.timeMultiplier).toBe(10)
    expect(atTen.facts.mechanicalPayload).toBe(atOne.facts.mechanicalPayload)
    expect(atTen.facts.panelsPerShot).toBe(atOne.facts.panelsPerShot)
    expect(atTen.facts.panelsPerVolley).toBe(atOne.facts.panelsPerVolley)
    expect(atTen.facts.launchCapacityPerSecond)
      .toBeCloseTo(atOne.facts.launchCapacityPerSecond * 10)
  })

  test('clamps machine-scale multiplier drift but rejects meaningful overages', () => {
    const input = withSpaceThroughput(state())
    const rounded = deriveDreamRailgunReadinessFacts(input, {
      effectiveDoubleTimeMultiplier: 7.000000000000001,
      doubleTimeActive: true,
      doubleTimeRate: 6,
    })
    const inactiveRounded = deriveDreamRailgunReadinessFacts(input, {
      effectiveDoubleTimeMultiplier: 1.0000000000000002,
      doubleTimeActive: false,
      doubleTimeRate: 6,
    })
    const oversized = deriveDreamRailgunReadinessFacts(input, {
      effectiveDoubleTimeMultiplier: 7.000_001,
      doubleTimeActive: true,
      doubleTimeRate: 6,
    })

    expect(rounded.status).toBe('success')
    if (rounded.status === 'success') {
      expect(rounded.facts.timeMultiplier).toBe(7)
    }
    expect(inactiveRounded.status).toBe('success')
    if (inactiveRounded.status === 'success') {
      expect(inactiveRounded.facts.timeMultiplier).toBe(1)
    }
    expect(oversized.status).toBe('invalid-input')
  })

  test('funds uncapped factory overdrive and a matching dynamic array', () => {
    const input = withSpaceThroughput(state())
    const production = deriveDreamSpaceAgeProductionFacts(input, 1)
    expect(production.status).toBe('success')
    if (production.status !== 'success') return
    const factory = production.facts.spaceFactory

    expect(factory.baseProgressPerSecond).toBe(16)
    expect(factory.overdriveMultiplier).toBeGreaterThan(14)
    expect(factory.overdriveEnergyPerSecond).toBeGreaterThan(100_000_000)
    expect(factory.overdriveActive).toBe(true)
    expect(factory.railgunPayloadCapacity).toBeGreaterThan(1)
    expect(factory.railgunLaunchCapacityPerSecond).toBeGreaterThanOrEqual(
      factory.nominalPanelsPerSecond *
        DREAM_SPACE_AGE_CONSTANTS.railgunPayloadHeadroom,
    )
    expect(
      factory.overdriveEnergyPerSecond +
        factory.railgunPayloadTarget * 25_000_000,
    ).toBeLessThanOrEqual(production.facts.energy.totalPerSecond)

    const produced = runDreamSpaceAgeProduction(input, {
      tickSeconds: 0.1,
      doubleTimeMultiplier: 1,
    })
    expect(produced.overdriveEnergyConsumed).toBeGreaterThan(10_000_000)
    expect(produced.dysonPanelsProduced).toBe(produced.spaceFactoryCycles)
  })

  test('keeps overdrive linear through 10x before applying an unbounded shallow curve', () => {
    expect(applyDreamOverdriveDiminishingReturn(9.999)).toBe(9.999)
    expect(applyDreamOverdriveDiminishingReturn(10)).toBe(10)

    const justAbove = applyDreamOverdriveDiminishingReturn(10.001)
    const high = applyDreamOverdriveDiminishingReturn(1_000)
    const higher = applyDreamOverdriveDiminishingReturn(10_000)

    expect(justAbove).toBeGreaterThan(10)
    expect(justAbove).toBeLessThan(10.001)
    expect(applyDreamOverdriveDiminishingReturn(100)).toBeCloseTo(
      55.257_822_303_288,
      10,
    )
    expect(high).toBeGreaterThan(10)
    expect(high).toBeLessThan(1_000)
    expect(higher).toBeGreaterThan(high)
    expect(higher).toBeLessThan(10_000)
  })

  test('applies a shallow diminishing return to extreme overdrive headroom', () => {
    const source = withSpaceThroughput(state())
    const input: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resources: {
          ...source.dream.resources,
          energy: 1_000_000_000_000,
          fusion: 1_000_000,
        },
      },
    }
    const production = deriveDreamSpaceAgeProductionFacts(input, 1)
    expect(production.status).toBe('success')
    if (production.status !== 'success') return

    const rawEnergyHeadroom =
      1 + production.facts.energy.totalPerSecond / 25_000_000
    const curvedEnergyHeadroom =
      applyDreamOverdriveDiminishingReturn(rawEnergyHeadroom)
    const factory = production.facts.spaceFactory

    expect(rawEnergyHeadroom).toBeGreaterThan(10_000)
    expect(factory.overdriveMultiplier).toBeCloseTo(curvedEnergyHeadroom, 8)
    expect(factory.overdriveMultiplier).toBeLessThan(rawEnergyHeadroom / 2)
    expect(factory.railgunLaunchCapacityPerSecond).toBeGreaterThanOrEqual(
      factory.nominalPanelsPerSecond *
        DREAM_SPACE_AGE_CONSTANTS.railgunPayloadHeadroom,
    )
    expect(
      factory.overdriveEnergyPerSecond +
        factory.railgunPayloadTarget * 25_000_000,
    ).toBeLessThanOrEqual(production.facts.energy.totalPerSecond)

    const produced = runDreamSpaceAgeProduction(input, {
      tickSeconds: 0.1,
      doubleTimeMultiplier: 1,
    })
    expect(produced.status).toBe('success')
    expect(produced.overdriveEnergyConsumed).toBeCloseTo(
      factory.overdriveEnergyPerSecond * 0.1,
      5,
    )
    expect(produced.spaceFactoryCycles).toBeGreaterThan(0n)
    expect(produced.dysonPanelsProduced).toBe(produced.spaceFactoryCycles)
  })

  test('does not overdrive factories from stored energy without sustainable generation', () => {
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
    expect(production.facts.spaceFactory.overdriveMultiplier).toBe(1)
    expect(production.facts.spaceFactory.overdriveEnergyPerSecond).toBe(0)
  })

  test('migrates an active legacy volley into a reserved payload', () => {
    const source = state()
    const legacy: CanonicalGameStateV1 = {
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
    const result = runDreamRailgunAutomation(legacy, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 0,
    })

    expect(result.panelsLaunched).toBe(10n)
    expect(result.state.dream.resources.dysonPanels).toBe(0n)
    expect(result.state.dream.resources.swarmPanels).toBe(10n)
  })

  test('continues beyond the legacy Swarm boundary and stops at the double-precision maximum', () => {
    const source = state()
    const atLegacyBoundary: CanonicalGameStateV1 = {
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
          activeRailguns: 1,
          reservedPanels: 1n,
        },
      },
    }
    const continued = runDreamRailgunAutomation(atLegacyBoundary, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 0,
    })
    expect(continued.shotFired).toBe(true)
    expect(continued.state.dream.resources.swarmPanels)
      .toBe(DISCRETE_MAXIMUM + 1n)

    const saturated: CanonicalGameStateV1 = {
      ...atLegacyBoundary,
      dream: {
        ...atLegacyBoundary.dream,
        resources: {
          ...atLegacyBoundary.dream.resources,
          swarmPanels: SIMULATION_RESOURCE_MAXIMUM,
        },
      },
    }
    const stopped = runDreamRailgunAutomation(saturated, {
      tickSeconds: 0.1,
      doubleTimeActive: false,
      doubleTimeRate: 0,
    })
    expect(stopped.shotFired).toBe(false)
    expect(stopped.state.dream.resources.swarmPanels)
      .toBe(SIMULATION_RESOURCE_MAXIMUM)
    expect(stopped.state.dream.railgun.lastRoundsFired).toBe(0)
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
    expect(bulkSolar.state.reality.influence).toBe(999_500n)
    expect(bulkSolar.state.dream.resources.solarPanels).toBe(10)

    const fusion = purchaseDreamSpaceAge(solar.state, 'fusion')
    expect(fusion.purchased).toBe(true)
    expect(fusion.state.dream.resources.fusion).toBe(1)
    expect(source).toEqual(before)

    const invalid = runDreamRailgunAutomation(source, {
      tickSeconds: Number.NaN,
      doubleTimeActive: false,
      doubleTimeRate: 0,
    })
    expect(invalid.status).toBe('invalid-input')
    expect(invalid.state).toBe(source)
  })

  test('accepts coarse elapsed intervals but rejects invalid prepared multipliers', () => {
    const source = state()

    const oversizedInterval = runDreamRailgunAutomation(source, {
      tickSeconds: 1.01,
      effectiveDoubleTimeMultiplier: 1,
      doubleTimeActive: false,
      doubleTimeRate: 0,
    })
    const oversizedMultiplier = runDreamRailgunAutomation(source, {
      tickSeconds: 0.1,
      effectiveDoubleTimeMultiplier: 12,
      doubleTimeActive: true,
      doubleTimeRate: 10,
    })

    expect(oversizedInterval.status).toBe('success')
    expect(oversizedMultiplier.status).toBe('invalid-input')
    expect(oversizedMultiplier.state).toBe(source)
  })
})
