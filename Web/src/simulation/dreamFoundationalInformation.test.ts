import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import {
  DREAM_UPGRADE_FLAGS,
  type CanonicalGameStateV1,
  type DreamEducationState,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { CONTINUOUS_MAXIMUM, DISCRETE_MAXIMUM } from './numeric'
import {
  DREAM_FOUNDATIONAL_INFORMATION_DURATIONS,
  purchaseDreamFoundationalInformation,
  runDreamFoundationalInformationConversions,
  runDreamFoundationalInformationProduction,
} from './dreamFoundationalInformation'

const fixtureText = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function neutralState(): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixtureText).prepared,
  ).state
  const education = Object.fromEntries(
    Object.entries(source.dream.education).map(([id, value]) => [
      id,
      {
        ...value,
        active: false,
        complete: false,
        progress: 0,
      } satisfies DreamEducationState,
    ]),
  ) as unknown as CanonicalGameStateV1['dream']['education']

  return {
    ...source,
    reality: {
      ...source.reality,
      influence: 20_000n,
    },
    dream: {
      ...source.dream,
      resources: {
        ...source.dream.resources,
        hunters: 0n,
        gatherers: 0n,
        community: 0,
        housing: 0,
        villages: 0,
        workers: 0,
        cities: 0,
        factories: 0,
        bots: 0,
        rockets: 0,
        spaceFactories: 0,
      },
      parameters: {
        ...source.dream.parameters,
        hunterCost: 100n,
        gathererCost: 100n,
        communityBoostCost: 0,
        communityBoostIsFree: true,
        communityBoostClock: 0,
        communityBoostDuration: 1_200,
        factoriesBoostCost: 5_000,
        factoriesBoostClock: 0,
        factoriesBoostDuration: 1_200,
        rocketsPerSpaceFactory: 10n,
      },
      education,
      timers: Object.fromEntries(
        Object.keys(DREAM_FOUNDATIONAL_INFORMATION_DURATIONS).map(
          (id) => [id, 0],
        ),
      ),
      upgrades: Object.fromEntries(
        DREAM_UPGRADE_FLAGS.map((id) => [id, false]),
      ) as unknown as CanonicalGameStateV1['dream']['upgrades'],
      huntersPerPurchase: 1n,
      gatherersPerPurchase: 1n,
    },
  }
}

function withDream(
  state: CanonicalGameStateV1,
  dream: Partial<CanonicalGameStateV1['dream']>,
): CanonicalGameStateV1 {
  return {
    ...state,
    dream: {
      ...state.dream,
      ...dream,
    },
  }
}

describe('Dream foundational and information eras', () => {
  test('characterizes the current Game scene production durations', () => {
    expect(DREAM_FOUNDATIONAL_INFORMATION_DURATIONS).toEqual({
      hunterTimerProgress: 3,
      gathererTimerProgress: 3,
      communityTimerProgress: 3,
      housingTimerProgress: 20,
      villagesTimerProgress: 12,
      workersTimerProgress: 4,
      citiesTimerProgress: 3,
      factoriesTimerProgress: 30,
      botsTimerProgress: 20,
    })
  })

  test('advances exact timers from tick-start counts and applies all base yields', () => {
    const source = neutralState()
    const state = withDream(source, {
      resources: {
        ...source.dream.resources,
        hunters: 1n,
        gatherers: 1n,
        community: 1,
        housing: 1,
        villages: 1,
        workers: 1,
        cities: 1,
        factories: 1,
        bots: 1,
      },
      education: {
        ...source.dream.education,
        engineering: {
          ...source.dream.education.engineering,
          complete: true,
        },
      },
      timers: {
        hunterTimerProgress: 2,
        gathererTimerProgress: 2,
        communityTimerProgress: 2,
        housingTimerProgress: 19,
        villagesTimerProgress: 11,
        workersTimerProgress: 3,
        citiesTimerProgress: 2,
        factoriesTimerProgress: 29,
        botsTimerProgress: 19.99,
      },
    })
    const before = structuredClone(state)

    const result = runDreamFoundationalInformationProduction(state, {
      tickSeconds: 1,
      doubleTimeMultiplier: 1,
    })

    expect(result.status).toBe('success')
    expect(result.completedCycles).toEqual({
      hunterTimerProgress: 1,
      gathererTimerProgress: 1,
      communityTimerProgress: 1,
      housingTimerProgress: 1,
      villagesTimerProgress: 1,
      workersTimerProgress: 1,
      citiesTimerProgress: 1,
      factoriesTimerProgress: 1,
      botsTimerProgress: 1,
    })
    expect(result.produced).toEqual({
      community: 2,
      housing: 2,
      workers: 8,
      factories: 1,
      bots: 1,
      rockets: 1,
    })
    expect(result.state.dream.resources.community).toBe(3)
    expect(result.state.dream.resources.housing).toBe(3)
    expect(result.state.dream.resources.workers).toBe(9)
    expect(result.state.dream.resources.factories).toBe(2)
    expect(result.state.dream.resources.bots).toBe(2)
    expect(result.state.dream.resources.rockets).toBe(1)
    expect(result.state.dream.timers.botsTimerProgress).toBeCloseTo(0)
    expect(state).toEqual(before)
  })

  test('prevents newly produced factories and bots from producing in the same tick', () => {
    const source = neutralState()
    const state = withDream(source, {
      resources: {
        ...source.dream.resources,
        cities: 1,
      },
      education: {
        ...source.dream.education,
        engineering: {
          ...source.dream.education.engineering,
          complete: true,
        },
      },
      timers: {
        ...source.dream.timers,
        citiesTimerProgress: 2,
        factoriesTimerProgress: 29,
        botsTimerProgress: 19,
      },
    })

    const result = runDreamFoundationalInformationProduction(state, {
      tickSeconds: 1,
      doubleTimeMultiplier: 1,
    })

    expect(result.produced.factories).toBe(1)
    expect(result.produced.bots).toBe(0)
    expect(result.produced.rockets).toBe(0)
    expect(result.state.dream.timers.factoriesTimerProgress).toBe(29)
    expect(result.state.dream.timers.botsTimerProgress).toBe(19)
  })

  test('combines Double Time, temporary boosts, education and upgrade multipliers', () => {
    const source = neutralState()
    const state = withDream(source, {
      resources: {
        ...source.dream.resources,
        community: 10,
        workers: 10,
        factories: 10,
        bots: 10,
      },
      parameters: {
        ...source.dream.parameters,
        communityBoostClock: 5,
        factoriesBoostClock: 5,
      },
      education: {
        ...source.dream.education,
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
      },
      upgrades: {
        ...source.dream.upgrades,
        workerBoostAcivator: true,
        factoriesBoostActivator: true,
        botsBoost1Activator: true,
        botsBoost2Activator: true,
      },
      timers: {
        ...source.dream.timers,
        botsTimerProgress: 18.4,
      },
    })

    const result = runDreamFoundationalInformationProduction(state, {
      tickSeconds: 1,
      doubleTimeMultiplier: 2,
    })

    expect(result.completedCycles.communityTimerProgress).toBe(2)
    expect(result.completedCycles.workersTimerProgress).toBe(2)
    expect(result.completedCycles.factoriesTimerProgress).toBe(1)
    expect(result.completedCycles.botsTimerProgress).toBe(1)
    expect(result.produced.housing).toBe(4)
    expect(result.produced.bots).toBe(90)
    expect(result.produced.rockets).toBe(2)
    expect(result.state.dream.parameters.communityBoostClock).toBe(4)
    expect(result.state.dream.parameters.factoriesBoostClock).toBe(4)
  })

  test('purchases hunters and gatherers with durable quantities and exact costs', () => {
    const source = neutralState()
    const state = withDream(source, {
      huntersPerPurchase: 1_000n,
      gatherersPerPurchase: 50n,
    })

    const hunters = purchaseDreamFoundationalInformation(
      state,
      'hunters',
    )
    expect(hunters).toMatchObject({
      purchased: true,
      cost: 100n,
      status: 'success',
    })
    expect(hunters.state.reality.influence).toBe(19_900n)
    expect(hunters.state.dream.resources.hunters).toBe(1_000n)

    const gatherers = purchaseDreamFoundationalInformation(
      hunters.state,
      'gatherers',
    )
    expect(gatherers.state.reality.influence).toBe(19_800n)
    expect(gatherers.state.dream.resources.gatherers).toBe(50n)

    const maxed = withDream(state, {
      resources: {
        ...state.dream.resources,
        hunters: DISCRETE_MAXIMUM,
      },
    })
    expect(
      purchaseDreamFoundationalInformation(maxed, 'hunters').status,
    ).toBe('output-maxed')
  })

  test('enforces boost visibility gates, exact influence costs, and authored-free community boosts', () => {
    const source = neutralState()
    expect(
      purchaseDreamFoundationalInformation(
        source,
        'community-boost',
      ).status,
    ).toBe('locked')

    const communityUnlocked = withDream(source, {
      resources: {
        ...source.dream.resources,
        hunters: 1n,
      },
    })
    const community = purchaseDreamFoundationalInformation(
      communityUnlocked,
      'community-boost',
    )
    expect(community.purchased).toBe(true)
    expect(community.cost).toBe(0n)
    expect(community.state.reality.influence).toBe(20_000n)
    expect(community.state.dream.parameters.communityBoostClock)
      .toBe(1_200)
    expect(
      purchaseDreamFoundationalInformation(
        community.state,
        'community-boost',
      ).status,
    ).toBe('already-active')

    const factoriesUnlocked = withDream(source, {
      resources: {
        ...source.dream.resources,
        cities: 1,
      },
      education: {
        ...source.dream.education,
        engineering: {
          ...source.dream.education.engineering,
          complete: true,
        },
      },
    })
    const factories = purchaseDreamFoundationalInformation(
      factoriesUnlocked,
      'factories-boost',
    )
    expect(factories.purchased).toBe(true)
    expect(factories.cost).toBe(5_000n)
    expect(factories.state.reality.influence).toBe(15_000n)
    expect(factories.state.dream.parameters.factoriesBoostClock)
      .toBe(1_200)
  })

  test('runs sequential foundational conversions and bulk rocket conversion atomically', () => {
    const source = neutralState()
    const state = withDream(source, {
      resources: {
        ...source.dream.resources,
        housing: 10,
        villages: 24,
        cities: 2,
        rockets: 35,
        factories: 5,
        spaceFactories: 1,
      },
    })

    const result = runDreamFoundationalInformationConversions(state)

    expect(result.housingToVillages).toBe(1)
    expect(result.villagesToCities).toBe(1)
    expect(result.rocketsToSpaceFactories).toBe(3)
    expect(result.state.dream.resources).toMatchObject({
      housing: 0,
      villages: 0,
      cities: 3,
      rockets: 5,
      factories: 2,
      spaceFactories: 4,
    })
  })

  test('fails invalid tick inputs closed and saturates production outputs', () => {
    const source = neutralState()
    const invalid = runDreamFoundationalInformationProduction(source, {
      tickSeconds: Number.NaN,
      doubleTimeMultiplier: 1,
    })
    expect(invalid.status).toBe('invalid-input')
    expect(invalid.state).toBe(source)

    const saturatedSource = withDream(source, {
      resources: {
        ...source.dream.resources,
        factories: CONTINUOUS_MAXIMUM,
      },
      timers: {
        ...source.dream.timers,
        factoriesTimerProgress: 29,
      },
      upgrades: {
        ...source.dream.upgrades,
        factoriesBoostActivator: true,
      },
    })
    const saturated = runDreamFoundationalInformationProduction(
      saturatedSource,
      {
        tickSeconds: 1,
        doubleTimeMultiplier: CONTINUOUS_MAXIMUM,
      },
    )
    expect(saturated.state.dream.resources.bots)
      .toBe(CONTINUOUS_MAXIMUM)
  })
})
