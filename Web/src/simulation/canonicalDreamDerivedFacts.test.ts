import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import {
  DREAM_UPGRADE_FLAGS,
  type CanonicalGameStateV1,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  deriveCanonicalDreamDerivedFacts,
  type CanonicalDreamDerivedFactsInput,
} from './canonicalDreamDerivedFacts'
import {
  runDreamFoundationalInformationConversions,
  runDreamFoundationalInformationProduction,
} from './dreamFoundationalInformation'
import {
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

const DOUBLE_TIME: CanonicalDreamDerivedFactsInput = Object.freeze({
  effectiveDoubleTimeMultiplier: 2,
  doubleTimeActive: true,
  doubleTimeRate: 4,
})

function dreamState(): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixtureText).prepared,
  ).state
  return {
    ...source,
    dream: {
      ...source.dream,
      resources: {
        ...source.dream.resources,
        hunters: 1n,
        gatherers: 1n,
        community: 10,
        housing: 35,
        villages: 24,
        workers: 10,
        cities: 10,
        factories: 10,
        bots: 10,
        rockets: 200,
        energy: 30_000_000,
        spaceFactories: 10,
        dysonPanels: 100n,
        railgunCharge: 0,
        solarPanels: 2,
        fusion: 1,
        swarmPanels: 3n,
      },
      parameters: {
        ...source.dream.parameters,
        communityBoostClock: 5,
        factoriesBoostClock: 5,
        rocketsPerSpaceFactory: 10n,
        railgunMaxCharge: 25_000_000,
        solarPanelGeneration: 100n,
        fusionGeneration: 1_250_000n,
        swarmPanelGeneration: 3_212n,
      },
      education: {
        ...source.dream.education,
        engineering: {
          ...source.dream.education.engineering,
          complete: true,
        },
        shipping: {
          ...source.dream.education.shipping,
          complete: true,
        },
        worldTrade: {
          ...source.dream.education.worldTrade,
          complete: true,
        },
        worldPeace: {
          ...source.dream.education.worldPeace,
          complete: true,
        },
        mathematics: {
          ...source.dream.education.mathematics,
          complete: true,
        },
      },
      upgrades: {
        ...(Object.fromEntries(
          DREAM_UPGRADE_FLAGS.map((id) => [id, false]),
        ) as unknown as CanonicalGameStateV1['dream']['upgrades']),
        workerBoostAcivator: true,
        citiesBoostActivator: true,
        factoriesBoostActivator: true,
        botsBoost1Activator: true,
        botsBoost2Activator: true,
        sfActivator1: true,
        sfActivator2: true,
        sfActivator3: true,
      },
      timers: {
        ...source.dream.timers,
        hunterTimerProgress: 2.75,
        gathererTimerProgress: 2.75,
        communityTimerProgress: 2.5,
        housingTimerProgress: 19,
        villagesTimerProgress: 11,
        workersTimerProgress: 3,
        citiesTimerProgress: 2,
        factoriesTimerProgress: 29,
        botsTimerProgress: 19.8,
        spaceFactoriesTimerProgress: 0.25,
      },
      railgun: {
        firing: false,
        fireProgress: 0,
        shotsRemaining: 0,
      },
    },
  }
}

describe('canonical Dream derived facts', () => {
  test('selects exact production, conversion, and readiness facts immutably', () => {
    const state = dreamState()
    const before = structuredClone(state)

    const result = deriveCanonicalDreamDerivedFacts(
      state,
      DOUBLE_TIME,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected Dream facts')
    const facts = result.value
    expect(
      facts.foundationalInformation.production.timers
        .hunterTimerProgress.progressPerSecond,
    ).toBe(2)
    expect(
      facts.foundationalInformation.production.timers
        .hunterTimerProgress,
    ).toMatchObject({
      sourceCount: 1,
      baseMultiplier: 1,
      globalMultiplier: 2,
      multiplierFormula: 'logarithmic-source',
    })
    expect(
      facts.foundationalInformation.production.timers
        .communityTimerProgress.progressPerSecond,
    ).toBe(8)
    expect(
      facts.foundationalInformation.production.timers
        .workersTimerProgress.progressPerSecond,
    ).toBe(8)
    expect(
      facts.foundationalInformation.production.timers
        .factoriesTimerProgress,
    ).toMatchObject({
      progressPerSecond: 32,
      cyclesPerSecond: 32 / 30,
      outputPerCycle: { bots: 90 },
      outputPerSecond: { bots: 96 },
    })
    expect(
      facts.foundationalInformation.production.timers
        .botsTimerProgress,
    ).toMatchObject({
      progressPerSecond: 1.6,
      cyclesPerSecond: 0.08,
      outputPerCycle: { rockets: 2 },
      outputPerSecond: { rockets: 0.16 },
    })
    expect(facts.foundationalInformation.conversions).toEqual({
      housingToVillages: {
        eligible: true,
        conversions: 1,
        inputCostPerConversion: 10,
        inputSpent: 10,
        outputCreated: 1,
      },
      villagesToCities: {
        eligible: true,
        conversions: 1,
        inputCostPerConversion: 25,
        inputSpent: 25,
        outputCreated: 1,
      },
      rocketsToSpaceFactories: {
        eligible: true,
        conversions: 10,
        rocketsPerSpaceFactory: 10n,
        rocketsSpent: 100,
        factoriesSpent: 10,
        spaceFactoriesCreated: 10,
      },
    })
    expect(facts.spaceAge.production.energy).toEqual({
      solarPerSecond: 400,
      fusionPerSecond: 1_250_000,
      swarmPerSecond: 9_636,
      beforeDoubleTimePerSecond: 1_260_036,
      totalPerSecond: 2_520_072,
    })
    expect(facts.spaceAge.production.spaceFactory).toMatchObject({
      active: true,
      progressPerSecond: 32,
      cyclesPerSecond: 16,
      remainingPanelCapacity: 900n,
      nominalPanelsPerSecond: 16,
    })
    expect(facts.spaceAge.railgun).toMatchObject({
      chargeTransferred: 25_000_000,
      energyAfterChargeTransfer: 5_000_000,
      chargeAfterChargeTransfer: 25_000_000,
      selectedRate: 4,
      activeRate: 4,
      panelsPerShot: 4n,
      panelsRequiredToStart: 40n,
      canStartVolley: true,
      canFireNextShot: true,
      secondsUntilNextShotAttempt: 0.25,
    })
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(facts)).toBe(true)
    expect(
      Object.isFrozen(
        facts.foundationalInformation.production.timers
          .factoriesTimerProgress.outputPerCycle,
      ),
    ).toBe(true)
    expect(state).toEqual(before)
  })

  test('shared facts predict the existing time transitions exactly', () => {
    const state = dreamState()
    const selected = deriveCanonicalDreamDerivedFacts(
      state,
      DOUBLE_TIME,
    )
    if (!selected.ok) throw new Error('expected Dream facts')

    const foundational =
      runDreamFoundationalInformationProduction(state, {
        tickSeconds: 0.25,
        doubleTimeMultiplier:
          DOUBLE_TIME.effectiveDoubleTimeMultiplier,
      })
    expect(foundational.completedCycles).toMatchObject({
      communityTimerProgress: 1,
      factoriesTimerProgress: 1,
      botsTimerProgress: 1,
    })
    expect(foundational.produced.bots).toBe(90)
    expect(foundational.produced.rockets).toBe(2)
    expect(
      foundational.state.dream.timers.communityTimerProgress,
    ).toBeCloseTo(1.5)
    expect(
      foundational.state.dream.timers.factoriesTimerProgress,
    ).toBeCloseTo(7)
    expect(
      foundational.state.dream.timers.botsTimerProgress,
    ).toBeCloseTo(0.2)

    const space = runDreamSpaceAgeProduction(state, {
      tickSeconds: 0.25,
      doubleTimeMultiplier:
        DOUBLE_TIME.effectiveDoubleTimeMultiplier,
    })
    expect(space.energyGenerated).toBe(630_018)
    expect(space.spaceFactoryCycles).toBe(4n)
    expect(space.dysonPanelsProduced).toBe(4n)
    expect(
      space.state.dream.timers.spaceFactoriesTimerProgress,
    ).toBeCloseTo(0.25)

    const railgun = runDreamRailgunAutomation(state, {
      tickSeconds:
        selected.value.spaceAge.railgun
          .secondsUntilNextShotAttempt ?? 0,
      doubleTimeActive: DOUBLE_TIME.doubleTimeActive,
      doubleTimeRate: DOUBLE_TIME.doubleTimeRate,
    })
    expect(railgun.volleyStarted).toBe(true)
    expect(railgun.shotFired).toBe(true)
    expect(railgun.panelsLaunched).toBe(4n)
    expect(railgun.state.dream.resources.energy).toBe(5_000_000)
    expect(railgun.state.dream.resources.railgunCharge)
      .toBe(22_500_000)

    const conversions =
      runDreamFoundationalInformationConversions(state)
    expect(
      selected.value.foundationalInformation.conversions
        .rocketsToSpaceFactories.conversions,
    ).toBe(conversions.rocketsToSpaceFactories)
  })

  test('fails closed with typed issues for invalid prepared inputs', () => {
    const source = dreamState()
    const state = {
      ...source,
      dream: {
        ...source.dream,
        parameters: {
          ...source.dream.parameters,
          railgunMaxCharge: 0,
        },
      },
    }
    const result = deriveCanonicalDreamDerivedFacts(state, {
      effectiveDoubleTimeMultiplier: Number.NaN,
      doubleTimeActive: false,
      doubleTimeRate: Number.POSITIVE_INFINITY,
    })

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: 'DREAM_DOUBLE_TIME_MULTIPLIER_INVALID',
          path: 'input.effectiveDoubleTimeMultiplier',
          detail:
            'Effective Double Time multiplier must be finite and non-negative.',
        },
        {
          code: 'DREAM_DOUBLE_TIME_RATE_INVALID',
          path: 'input.doubleTimeRate',
          detail: 'Double Time rate must be finite.',
        },
        {
          code: 'DREAM_RAILGUN_MAX_CHARGE_INVALID',
          path: 'state.dream.parameters.railgunMaxCharge',
          detail:
            'Railgun maximum charge must be finite and positive.',
        },
      ],
    })
    expect(Object.isFrozen(result)).toBe(true)
    if (!result.ok) expect(Object.isFrozen(result.issues)).toBe(true)
  })
})
