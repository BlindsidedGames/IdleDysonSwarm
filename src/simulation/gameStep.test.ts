import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { CanonicalRuntimeSession } from '../application/canonicalRuntimeSession'
import { gameDataCatalog } from '../game-data/catalog'
import { prepareIdb1Save } from '../save/prepare'
import { createCapturedInfinityAssetLookup, type CanonicalEventTimeContext } from './canonicalEventTimeModel'
import { SIMULATION_UPGRADE_DEFINITIONS } from './dreamEducationUpgrades'
import { advanceGame } from './gameStep'
import { REALITY_UPGRADE_DEFINITIONS } from './realityUpgrades'
import { DISCRETE_MAXIMUM } from './numeric'

const fixture = readFileSync(
  new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url),
  'utf8',
)

describe('advanceGame', () => {
  test.each(['active', 'stored-time'] as const)(
    'allows at most one automatic Infinity in one %s update',
    (source) => {
      const state = runtime()
      state.gameState = {
        ...state.gameState,
        dyson: { ...state.gameState.dyson, bots: 1e100 },
        infinity: {
          ...state.gameState.infinity,
          automaticResetEnabled: true,
          botCapRewardsGranted: true,
        },
        timeline: {
          ...state.gameState.timeline,
          infinityCycleSeconds: 10,
        },
        dream: {
          ...state.gameState.dream,
          resetCount: DISCRETE_MAXIMUM,
        },
      }
      const result = advanceGame(
        carrier(state),
        { source, baseSeconds: 86_400, automation: 'enabled' },
        context(),
        1 / 60,
      )
      expect(result.issue).toBeUndefined()
      expect(
        result.summary.ordinaryInfinityCount +
          result.summary.breakInfinityCount,
      ).toBe(1n)
    },
  )

  test('Auto Infinity off never fabricates a reset or IP', () => {
    const state = runtime()
    state.gameState = {
      ...state.gameState,
      dyson: { ...state.gameState.dyson, bots: 1e100 },
      infinity: {
        ...state.gameState.infinity,
        automaticResetEnabled: false,
        botCapRewardsGranted: true,
      },
      timeline: { ...state.gameState.timeline, infinityCycleSeconds: 10 },
    }
    const points = state.gameState.infinity.points
    const result = advanceGame(
      carrier(state),
      { source: 'stored-time', baseSeconds: 3_600, automation: 'enabled' },
      context(),
      1 / 60,
    )
    expect(result.summary.ordinaryInfinityCount).toBe(0n)
    expect(result.summary.breakInfinityCount).toBe(0n)
    expect(result.state.gameState.infinity.points).toBe(points)
  })

  test('suppressed automation advances continuous systems without automatic prestige', () => {
    const state = runtime()
    state.gameState = {
      ...state.gameState,
      dyson: { ...state.gameState.dyson, bots: 1e100 },
      infinity: {
        ...state.gameState.infinity,
        automaticResetEnabled: true,
        botCapRewardsGranted: true,
      },
      timeline: { ...state.gameState.timeline, infinityCycleSeconds: 10 },
    }
    const result = advanceGame(
      carrier(state),
      { source: 'active', baseSeconds: 0.05, automation: 'suppressed' },
      context(),
      1 / 60,
    )
    expect(result.summary.ordinaryInfinityCount).toBe(0n)
    expect(result.state.gameState.timeline.infinityCycleSeconds).toBeCloseTo(10.05)
  })

  test('Double Time ownership doubles game time without multiplying automation opportunities', () => {
    const state = runtime()
    state.gameState = {
      ...state.gameState,
      timeline: {
        ...state.gameState.timeline,
        doubleTime: {
          unlocked: true,
          enabled: false,
          bankSeconds: 0,
          rate: 0,
        },
      },
    }
    const before = state.gameState.statistics.trackedSimulatedSeconds
    const cycleBefore = state.gameState.timeline.infinityCycleSeconds
    const result = advanceGame(
      carrier(state),
      { source: 'active', baseSeconds: 0.2, automation: 'enabled' },
      context(),
      1 / 60,
    )
    expect(result.gameSpeed).toBe(2)
    expect(result.gameSecondsAdvanced).toBe(0.4)
    expect(
      result.state.gameState.statistics.trackedSimulatedSeconds - before,
    ).toBeCloseTo(0.4)
    expect(
      result.state.gameState.timeline.infinityCycleSeconds - cycleBefore,
    ).toBeCloseTo(0.2)
  })

  test('Stored Time does not alter active Infinity peak guidance', () => {
    const state = runtime()
    state.gameState = {
      ...state.gameState,
      dyson: { ...state.gameState.dyson, bots: 1e100 },
      infinity: {
        ...state.gameState.infinity,
        automaticResetEnabled: false,
        currentCyclePeakReward: 0n,
        currentCyclePeakIpPerMinute: 0,
      },
      timeline: { ...state.gameState.timeline, infinityCycleSeconds: 10 },
    }
    const stored = advanceGame(
      carrier(structuredClone(state)),
      { source: 'stored-time', baseSeconds: 0.05, automation: 'enabled' },
      context(),
      1 / 60,
    )
    const active = advanceGame(
      carrier(structuredClone(state)),
      { source: 'active', baseSeconds: 0.05, automation: 'enabled' },
      context(),
      1 / 60,
    )
    expect(stored.state.gameState.infinity.currentCyclePeakReward).toBe(0n)
    expect(stored.state.gameState.infinity.currentCyclePeakIpPerMinute).toBe(0)
    expect(active.state.gameState.infinity.currentCyclePeakReward).toBeGreaterThan(0n)
    expect(active.state.gameState.infinity.currentCyclePeakIpPerMinute).toBeGreaterThan(0)
  })

  test('records automatic Infinity statistics and sequential Stored Time usage', () => {
    const state = runtime()
    state.gameState = {
      ...state.gameState,
      dyson: { ...state.gameState.dyson, bots: 1e100 },
      infinity: {
        ...state.gameState.infinity,
        automaticResetEnabled: true,
        botCapRewardsGranted: true,
        storedTimeUsedThisCycleSeconds: 7,
        storedTimeUsedPreviousCycleSeconds: 3,
      },
      timeline: { ...state.gameState.timeline, infinityCycleSeconds: 10 },
      dream: { ...state.gameState.dream, resetCount: DISCRETE_MAXIMUM },
    }
    const beforeCount =
      state.gameState.statistics.lifetime.ordinaryInfinityCount
    const result = advanceGame(
      carrier(state),
      { source: 'stored-time', baseSeconds: 1, automation: 'enabled' },
      context(),
      1 / 60,
    )
    expect(result.summary.ordinaryInfinityCount).toBe(1n)
    expect(
      result.state.gameState.statistics.lifetime.ordinaryInfinityCount,
    ).toBe(beforeCount + 1n)
    expect(
      result.state.gameState.infinity.storedTimeUsedPreviousCycleSeconds,
    ).toBe(7)
    expect(
      result.state.gameState.infinity.storedTimeUsedThisCycleSeconds,
    ).toBe(1)
  })

  test('settles bot-cap checkpoints atomically inside a Stored Time candidate', () => {
    const state = runtime()
    state.gameState = {
      ...state.gameState,
      dyson: { ...state.gameState.dyson, bots: Number.MAX_VALUE },
      infinity: {
        ...state.gameState.infinity,
        botCapTransitionPending: false,
        botCapRewardsGranted: false,
      },
    }
    const result = advanceGame(
      carrier(state),
      { source: 'stored-time', baseSeconds: 0.05, automation: 'enabled' },
      context(),
      1 / 60,
    )
    expect(result.issue).toBeUndefined()
    expect(result.botCapPersistenceRequired).toBe(false)
    expect(result.summary.botCapInfinityPoints).toBe(1_000n)
  })

  test('recalculates from committed state at each explicit coarse update and survives save reconstruction', () => {
    const createState = () => {
      const state = runtime()
      state.gameState = {
        ...state.gameState,
        dyson: {
          ...state.gameState.dyson,
          workers: 100,
          researchers: 100,
          facilities: {
            ...state.gameState.dyson.facilities,
            servers: [0, 1],
          },
        },
        research: {
          ...state.gameState.research,
          levelsById: {
            ...state.gameState.research.levelsById,
            'research.science_boost': 2,
          },
        },
        skills: {
          ...state.gameState.skills,
          byId: {
            ...state.gameState.skills.byId,
            androids: {
              ...state.gameState.skills.byId.androids!,
              owned: true,
            },
            pocketAndroids: {
              ...state.gameState.skills.byId.pocketAndroids!,
              owned: true,
            },
            superRadiantScattering: {
              ...state.gameState.skills.byId.superRadiantScattering!,
              owned: true,
            },
            scientificPlanets: {
              ...state.gameState.skills.byId.scientificPlanets!,
              owned: true,
            },
            shouldersOfGiants: {
              ...state.gameState.skills.byId.shouldersOfGiants!,
              owned: true,
            },
            shouldersOfTheFallen: {
              ...state.gameState.skills.byId.shouldersOfTheFallen!,
              owned: true,
            },
          },
        },
      }
      return carrier(state)
    }
    const run = (reconstructBetweenUpdates: boolean) => {
      const first = advanceGame(
        createState(),
        { source: 'stored-time', baseSeconds: 10, automation: 'enabled' },
        context(),
        1 / 60,
      )
      const second = advanceGame(
        reconstructBetweenUpdates
          ? structuredClone(first.state)
          : first.state,
        { source: 'stored-time', baseSeconds: 10, automation: 'enabled' },
        context(),
        1 / 60,
      )
      return { first, second }
    }

    const direct = run(false)
    const reconstructed = run(true)
    expect(direct.first.state.gameState.skills.byId.androids?.timerSeconds)
      .toBe(10)
    expect(
      direct.first.state.gameState.skills.byId.superRadiantScattering
        ?.timerSeconds,
    ).toBe(10)
    expect(
      direct.second.state.gameState.skills.byId.superRadiantScattering
        ?.timerSeconds,
    ).toBe(20)
    expect(direct.second.state).toEqual(reconstructed.second.state)
  })
})

function runtime() {
  return structuredClone(new CanonicalRuntimeSession(
    prepareIdb1Save(fixture).prepared,
    { entitlements: { permanentDoubleIp: false } },
  ).initialState)
}

function carrier(state: ReturnType<typeof runtime>) {
  return {
    gameState: state.gameState,
    compatibilityTuning: state.compatibilityTuning,
    evaluationSnapshot: state.evaluationSnapshot,
    entitlements: state.entitlements,
    tinker: state.tinker,
  }
}

function context(): CanonicalEventTimeContext {
  return {
    mode: 'active',
    automationIntervalSeconds: 0.033,
    realityWorkerTuning: {
      workerBatchSize: 128n,
      baseWorkerGenerationSpeed: 4,
    },
    dreamResetDefinitions: SIMULATION_UPGRADE_DEFINITIONS,
    realityUpgradeDefinitions: REALITY_UPGRADE_DEFINITIONS,
    infinityResetAssetLookup: createCapturedInfinityAssetLookup(
      gameDataCatalog.assets,
    ),
  }
}
