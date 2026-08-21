import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type {
  CanonicalGameStateV1,
  DreamUpgradeFlag,
  SimulationTotalsState,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  applyCanonicalBlackHoleReset,
  applyCanonicalDreamReset,
  canApplyCanonicalAutomaticDreamReset,
  type CanonicalDreamResetDefinitions,
} from './canonicalDreamReset'
import {
  SIMULATION_UPGRADE_DEFINITIONS,
  type SimulationUpgradeDefinition,
} from './dreamEducationUpgrades'
import { DISCRETE_MAXIMUM } from './numeric'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function baseState(): CanonicalGameStateV1 {
  return hydrateGameState(
    prepareIdb1Save(fixture).prepared,
  ).state
}

function withoutUpgrades(
  state: CanonicalGameStateV1,
): CanonicalGameStateV1 {
  return {
    ...state,
    dream: {
      ...state.dream,
      upgrades: Object.fromEntries(
        Object.keys(state.dream.upgrades).map((key) => [key, false]),
      ) as CanonicalGameStateV1['dream']['upgrades'],
    },
  }
}

function owned(
  state: CanonicalGameStateV1,
  ...keys: DreamUpgradeFlag[]
): CanonicalGameStateV1 {
  return {
    ...state,
    dream: {
      ...state.dream,
      upgrades: {
        ...state.dream.upgrades,
        ...Object.fromEntries(keys.map((key) => [key, true])),
      },
    },
  }
}

function requireApplied(
  result: ReturnType<typeof applyCanonicalDreamReset>,
): Extract<typeof result, { ok: true; applied: true }> {
  expect(result.ok).toBe(true)
  expect(result.applied).toBe(true)
  if (!result.ok || !result.applied) {
    throw new Error(JSON.stringify(result))
  }
  return result
}

describe('canonical Dream reset', () => {
  test.each([
    [0n, 'cities', 1, 'Meteor', 1n],
    [1n, 'cities', 1, 'Meteor', 1n],
    [2n, 'bots', 100, 'ArtificialIntelligence', 10n],
    [3n, 'spaceFactories', 5, 'GlobalWarming', 20n],
  ] as const)(
    'applies automatic stage %s at its exact threshold',
    (stage, resource, value, cause, reward) => {
      const source = withoutUpgrades(baseState())
      const state: CanonicalGameStateV1 = {
        ...source,
        dream: {
          ...source.dream,
          disasterStage: stage,
          resources: {
            ...source.dream.resources,
            [resource]: value,
          },
        },
      }

      const result = requireApplied(
        applyCanonicalDreamReset(state, { kind: 'automatic' }),
      )

      expect(result.cause).toBe(cause)
      expect(result.requestedReward).toBe(reward)
      expect(result.rewardGranted).toBe(reward)
      expect(result.state.dream.resetCount).toBe(
        state.dream.resetCount + 1n,
      )
      expect(result.state.dream.strangeMatter).toBe(
        state.dream.strangeMatter + reward,
      )
      expect(result.state.dream.disasterStage).toBe(1n)
      const countField =
        cause === 'Meteor'
          ? 'meteorDreamResets'
          : cause === 'ArtificialIntelligence'
            ? 'aiDreamResets'
            : 'globalWarmingDreamResets'
      expect(result.state.statistics.lifetime[countField]).toBe(
        state.statistics.lifetime[countField] + 1n,
      )
    },
  )

  test('returns the original state below thresholds and at stage 42', () => {
    const source = withoutUpgrades(baseState())
    for (const dream of [
      {
        ...source.dream,
        disasterStage: 1n,
        resources: { ...source.dream.resources, cities: 0.999 },
      },
      {
        ...source.dream,
        disasterStage: 2n,
        resources: { ...source.dream.resources, bots: 99.999 },
      },
      {
        ...source.dream,
        disasterStage: 3n,
        resources: {
          ...source.dream.resources,
          spaceFactories: 4.999,
        },
      },
      { ...source.dream, disasterStage: 42n },
    ]) {
      const state = { ...source, dream }
      const result = applyCanonicalDreamReset(state, {
        kind: 'automatic',
      })
      expect(result).toEqual({
        ok: true,
        applied: false,
        state,
        reason: 'not-ready',
      })
      expect(result.state).toBe(state)
    }
  })

  test('wipes every run field, preserves external domains, and reapplies owned upgrades', () => {
    const source = owned(
      withoutUpgrades(baseState()),
      'counterMeteor',
      'counterAi',
      'engineering1',
      'engineering3',
      'hunter2',
      'hunter4',
      'mathematics3',
      'rockets1',
    )
    const state: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resetCount: 8n,
        strangeMatter: 50n,
        disasterStage: 2n,
        resources: {
          hunters: 999n,
          gatherers: 888n,
          community: 777,
          housing: 666,
          villages: 555,
          workers: 444,
          cities: 333,
          factories: 222,
          bots: 100,
          rockets: 111,
          energy: 99,
          spaceFactories: 88,
          dysonPanels: 77n,
          railgunCharge: 66,
          solarPanels: 55,
          fusion: 44,
          swarmPanels: 33n,
        },
        parameters: {
          ...source.dream.parameters,
          hunterCost: 999n,
          communityBoostClock: 10,
          factoriesBoostClock: 20,
        },
        timers: { staleTimer: 12 },
        railgun: {
          firing: true,
          fireProgress: 5,
          shotsRemaining: 4,
        },
        huntersPerPurchase: 3n,
        gatherersPerPurchase: 7n,
      },
    }
    const before = structuredClone(state)

    const result = requireApplied(
      applyCanonicalDreamReset(state, { kind: 'automatic' }),
    )
    const dream = result.state.dream

    expect(dream.resources).toMatchObject({
      hunters: 10n,
      gatherers: 0n,
      community: 0,
      housing: 0,
      villages: 0,
      workers: 0,
      cities: 0,
      factories: 0,
      bots: 0,
      rockets: 0,
      energy: 0,
      spaceFactories: 0,
      dysonPanels: 0n,
      railgunCharge: 0,
      solarPanels: 0,
      fusion: 0,
      swarmPanels: 0n,
    })
    expect(dream.parameters.hunterCost).toBe(100n)
    expect(dream.parameters.rocketsPerSpaceFactory).toBe(5n)
    expect(dream.parameters.solarPanelGeneration).toBe(200n)
    expect(dream.education.engineering.researchTime).toBe(300)
    expect(dream.education.engineering.complete).toBe(true)
    expect(dream.education.mathematics.complete).toBe(true)
    expect(dream.timers).not.toHaveProperty('staleTimer')
    expect(Object.values(dream.timers).every((value) => value === 0))
      .toBe(true)
    expect(dream.railgun).toEqual({
      firing: false,
      fireProgress: 0,
      shotsRemaining: 0,
      activeRailguns: 0,
      reservedPanels: 0n,
      highestStoredPanels: 0n,
      lastRoundsFired: 0,
      lastPanelsLaunched: 0n,
    })
    expect(dream.huntersPerPurchase).toBe(1_000n)
    expect(dream.gatherersPerPurchase).toBe(7n)
    expect(dream.disasterStage).toBe(3n)
    expect(dream.upgrades.translation1)
      .toBe(state.dream.upgrades.translation1)

    expect(result.state.meta).toBe(state.meta)
    expect(result.state.dyson).toBe(state.dyson)
    expect(result.state.infinity).toBe(state.infinity)
    expect(result.state.skills).toBe(state.skills)
    expect(result.state.research).toBe(state.research)
    expect(result.state.reality).toBe(state.reality)
    expect(result.state.quantum).toBe(state.quantum)
    expect(result.state.avocado).toBe(state.avocado)
    expect(result.state.timeline).toBe(state.timeline)
    expect(result.state.secretProgress).toBe(state.secretProgress)
    expect(state).toEqual(before)
  })

  test('allows an explicit zero-reward Black Hole and records it', () => {
    const state = withoutUpgrades(baseState())
    const result = requireApplied(
      applyCanonicalDreamReset(state, {
        kind: 'explicit',
        cause: 'BlackHole',
        requestedReward: 0n,
      }),
    )

    expect(result.rewardGranted).toBe(0n)
    expect(result.state.dream.resetCount).toBe(
      state.dream.resetCount + 1n,
    )
    expect(result.state.dream.strangeMatter)
      .toBe(state.dream.strangeMatter)
    for (const totals of [
      result.state.statistics.lifetime,
      result.state.statistics.currentQuantumRun,
      result.state.statistics.recentProcessedSegment,
    ]) {
      expect(totals.blackHoleDreamResets).toBe(
        state.statistics.lifetime.blackHoleDreamResets + 1n,
      )
    }
    expect(result.state.statistics.lastCompletedCycle).toEqual({
      valid: true,
      breakInfinity: false,
      durationSeconds: 0,
      reward: 0n,
      dreamCause: 'BlackHole',
    })
  })

  test('captures current swarm panels as the canonical Black Hole reward', () => {
    const source = withoutUpgrades(baseState())
    const state: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        strangeMatter: 9n,
        resources: {
          ...source.dream.resources,
          swarmPanels: 42n,
        },
      },
    }

    const result = requireApplied(
      applyCanonicalBlackHoleReset(state),
    )

    expect(result.cause).toBe('BlackHole')
    expect(result.requestedReward).toBe(42n)
    expect(result.rewardGranted).toBe(42n)
    expect(result.state.dream.strangeMatter).toBe(51n)
    expect(result.state.dream.resources.swarmPanels).toBe(0n)
    expect(result.state.statistics.lifetime.blackHoleDreamResets)
      .toBe(state.statistics.lifetime.blackHoleDreamResets + 1n)
    expect(result.state.statistics.lifetime.strangeMatter)
      .toBe(state.statistics.lifetime.strangeMatter + 42n)
  })

  test('records requested rather than partially granted reward at saturation', () => {
    const source = withoutUpgrades(baseState())
    const totals: SimulationTotalsState = {
      ...source.statistics.lifetime,
      globalWarmingDreamResets: DISCRETE_MAXIMUM,
      strangeMatter: DISCRETE_MAXIMUM - 5n,
    }
    const state: CanonicalGameStateV1 = {
      ...source,
      dream: {
        ...source.dream,
        resetCount: 1n,
        strangeMatter: DISCRETE_MAXIMUM - 2n,
      },
      statistics: {
        ...source.statistics,
        trackedSinceUpdate: false,
        trackingStartedMarker: 'old',
        trackedSimulatedSeconds: 125,
        lifetime: totals,
        currentQuantumRun: totals,
        recentProcessedSegment: totals,
      },
    }

    const result = requireApplied(
      applyCanonicalDreamReset(state, {
        kind: 'explicit',
        cause: 'GlobalWarming',
        requestedReward: 20n,
      }),
    )

    expect(result.rewardGranted).toBe(2n)
    expect(result.state.dream.strangeMatter).toBe(DISCRETE_MAXIMUM)
    expect(result.state.statistics.lifetime.strangeMatter)
      .toBe(DISCRETE_MAXIMUM)
    expect(result.state.statistics.lastCompletedCycle.reward).toBe(20n)
    expect(result.state.statistics.minuteWindows[2]).toMatchObject({
      sequence: 2n,
      dreamResetCount: 1n,
      strangeMatter: 20n,
    })
    expect(result.state.statistics.trackingStartedMarker)
      .toBe('tracked-since-update')
  })

  test('rejects saturated counters and rewards atomically', () => {
    const source = withoutUpgrades(baseState())
    const countMaxed = {
      ...source,
      dream: {
        ...source.dream,
        resetCount: DISCRETE_MAXIMUM,
      },
    }
    const rewardMaxed = {
      ...source,
      dream: {
        ...source.dream,
        strangeMatter: DISCRETE_MAXIMUM,
      },
    }

    expect(
      applyCanonicalDreamReset(countMaxed, {
        kind: 'explicit',
        cause: 'BlackHole',
        requestedReward: 0n,
      }),
    ).toMatchObject({
      ok: true,
      applied: false,
      reason: 'reset-count-saturated',
      state: countMaxed,
    })
    expect(
      applyCanonicalDreamReset(rewardMaxed, {
        kind: 'explicit',
        cause: 'BlackHole',
        requestedReward: 1n,
      }),
    ).toMatchObject({
      ok: true,
      applied: false,
      reason: 'reward-saturated',
      state: rewardMaxed,
    })
    const automaticCountMaxed = {
      ...countMaxed,
      dream: {
        ...countMaxed.dream,
        disasterStage: 0n,
        resources: {
          ...countMaxed.dream.resources,
          cities: 1,
        },
      },
    }
    const automaticRewardMaxed = {
      ...rewardMaxed,
      dream: {
        ...rewardMaxed.dream,
        disasterStage: 0n,
        resources: {
          ...rewardMaxed.dream.resources,
          cities: 1,
        },
      },
    }
    expect(
      canApplyCanonicalAutomaticDreamReset(automaticCountMaxed),
    ).toBe(false)
    expect(
      canApplyCanonicalAutomaticDreamReset(automaticRewardMaxed),
    ).toBe(false)
  })

  test('fails closed on missing and unsupported Simulation definitions', () => {
    const state = withoutUpgrades(baseState())
    const missing = new Map(SIMULATION_UPGRADE_DEFINITIONS)
    missing.delete('counterMeteor')
    const missingResult = applyCanonicalDreamReset(
      state,
      {
        kind: 'explicit',
        cause: 'BlackHole',
        requestedReward: 0n,
      },
      missing,
    )
    expect(missingResult).toMatchObject({
      ok: false,
      applied: false,
      state,
      issues: [
        {
          code: 'DREAM_RESET_DEFINITION_MISSING',
          path: 'gameData.simulationUpgrades.counterMeteor',
        },
      ],
    })

    const unsupported = new Map(SIMULATION_UPGRADE_DEFINITIONS)
    const definition = unsupported.get('counterMeteor')!
    unsupported.set('counterMeteor', {
      ...definition,
      purchaseEffects: [
        {
          effectType: 999,
          targetKey: 'impossible',
          boolValue: false,
          numericValue: 0,
        },
      ],
    } satisfies SimulationUpgradeDefinition)
    const unsupportedResult = applyCanonicalDreamReset(
      state,
      {
        kind: 'explicit',
        cause: 'BlackHole',
        requestedReward: 0n,
      },
      unsupported as CanonicalDreamResetDefinitions,
    )
    expect(unsupportedResult).toMatchObject({
      ok: false,
      applied: false,
      state,
      issues: [
        {
          code: 'DREAM_RESET_EFFECT_UNSUPPORTED',
        },
      ],
    })
  })
})
