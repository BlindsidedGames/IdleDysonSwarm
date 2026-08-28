import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { getGameAsset } from '../game-data/catalog'
import type { ExportedGameAsset } from '../game-data/types'
import { hydrateGameState } from '../game-state/mapping'
import type {
  CanonicalGameStateV1,
  SimulationTotalsState,
  SkillRuntimeState,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  applyCanonicalInfinityReset,
  type CanonicalInfinityResetAssetLookup,
} from './canonicalInfinityReset'
import { DISCRETE_MAXIMUM } from './numeric'

const fixtureText = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function baseState(): CanonicalGameStateV1 {
  return hydrateGameState(
    prepareIdb1Save(fixtureText).prepared,
  ).state
}

function ownedSkill(): SkillRuntimeState {
  return {
    owned: true,
    level: 9,
    timerSeconds: 12,
    secondaryTimerSeconds: 34,
  }
}

function clearedSkillState(): SkillRuntimeState {
  return {
    owned: false,
    level: 0,
    timerSeconds: 0,
    secondaryTimerSeconds: 0,
  }
}

function requireSuccess(
  result: ReturnType<typeof applyCanonicalInfinityReset>,
): Extract<typeof result, { ok: true }> {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result
}

describe('canonical Infinity reset', () => {
  test('wipes the full Dyson run while preserving retained starts and every external domain', () => {
    const source = baseState()
    const state: CanonicalGameStateV1 = {
      ...source,
      meta: {
        ...source.meta,
        tutorialComplete: false,
        firstInfinityComplete: false,
      },
      dyson: {
        ...source.dyson,
        money: 123,
        science: 456,
        bots: 789,
        workers: 11,
        researchers: 12,
        facilities: {
          assembly_lines: [1, 2],
          ai_managers: [3, 4],
          servers: [5, 6],
          data_centers: [7, 8],
          planets: [9, 10],
          matrioshka_brains: [11, 12],
          birch_planets: [13, 14],
          galactic_brains: [15, 16],
        },
        totalPanelsDecayed: 999,
        goalStage: 17n,
      },
      infinity: {
        ...source.infinity,
        points: 41n,
        permanentSkillPoints: 3n,
        storedTimeUsedThisCycleSeconds: 12.5,
        storedTimeUsedPreviousCycleSeconds: 2,
        inProgress: true,
        botCapTransitionPending: true,
        botCapRewardsGranted: true,
        currentCyclePeakIpPerMinute: 74_208.1448,
        currentCyclePeakReward: 82n,
        manualPeakIpPerMinute: 70_000,
        manualPeakReward: 80n,
        retainedFacilities: {
          assembly_lines: true,
          ai_managers: false,
          servers: true,
          data_centers: false,
          planets: true,
        },
      },
      skills: {
        ...source.skills,
        points: 99n,
        fragments: 8n,
        byId: {
          banking: ownedSkill(),
          investmentPortfolio: ownedSkill(),
          startHereTree: ownedSkill(),
        },
        activeAutoAssignment: [],
      },
      research: {
        ...source.research,
        levelsById: {
          'research.money_multiplier': 42,
        },
        progressById: {
          'research.money_multiplier': 0.75,
        },
      },
    }
    const before = structuredClone(state)

    const result = requireSuccess(
      applyCanonicalInfinityReset(state, {
        breakInfinity: false,
        requestedReward: 2n,
        artifactSkillPoints: 4n,
        automatic: true,
        processingSource: 'stored-time',
        activeIntervalMilliseconds: 200,
      }),
    )

    expect(result.rewardGranted).toBe(2n)
    expect(result.bankedSkillPoints).toBe(2n)
    expect(result.state.infinity.points).toBe(43n)
    expect(result.state.infinity.storedTimeUsedPreviousCycleSeconds)
      .toBe(12.5)
    expect(result.state.infinity.storedTimeUsedThisCycleSeconds).toBe(0)
    expect(result.state.infinity.currentCyclePeakIpPerMinute).toBe(0)
    expect(result.state.infinity.currentCyclePeakReward).toBe(0n)
    expect(result.state.infinity.manualPeakIpPerMinute).toBe(70_000)
    expect(result.state.infinity.manualPeakReward).toBe(80n)
    expect(result.state.infinity.manualCalibrationObservedActiveSeconds).toBe(0)
    expect(result.state.infinity.activeAutomaticThroughputCycleEligible).toBe(false)
    expect(result.state.infinity.inProgress).toBe(false)
    expect(result.state.infinity.botCapTransitionPending).toBe(false)
    expect(result.state.infinity.botCapRewardsGranted).toBe(false)
    expect(result.state.meta.tutorialComplete).toBe(true)
    expect(result.state.meta.firstInfinityComplete).toBe(true)
    expect(result.state.statistics.recentInfinityCycles?.[0]).toEqual({
      breakInfinity: false,
      automatic: true,
      configuredTarget: 2n,
      reward: 2n,
      durationSeconds: state.infinity.lastCycleDurationSeconds,
      processingSource: 'stored-time',
      activeIntervalMilliseconds: 200,
    })

    expect(result.state.dyson).toMatchObject({
      money: 0,
      science: 0,
      bots: 10,
      workers: 0,
      researchers: 0,
      totalPanelsDecayed: 0,
      goalStage: 0n,
      facilities: {
        assembly_lines: [0, 10],
        ai_managers: [0, 0],
        servers: [0, 10],
        data_centers: [0, 0],
        planets: [0, 10],
        matrioshka_brains: [0, 0],
        birch_planets: [0, 0],
        galactic_brains: [0, 0],
      },
    })
    expect(result.state.dyson.manualCreationIntervalSeconds)
      .toBe(state.dyson.manualCreationIntervalSeconds)
    expect(result.state.dyson.botDistribution)
      .toBe(state.dyson.botDistribution)
    expect(result.state.dyson.automation).toBe(state.dyson.automation)

    expect(result.state.skills.points).toBe(9n)
    expect(result.state.skills.fragments).toBe(0n)
    expect(result.state.skills.byId).toEqual({
      banking: clearedSkillState(),
      investmentPortfolio: clearedSkillState(),
      startHereTree: clearedSkillState(),
    })
    expect(result.state.skills.activeAutoAssignment)
      .toBe(state.skills.activeAutoAssignment)
    expect(result.state.skills.presets).toBe(state.skills.presets)
    expect(result.state.research.levelsById).toEqual({})
    expect(result.state.research.progressById).toEqual({})
    expect(result.state.research.automation)
      .toBe(state.research.automation)

    expect(result.state.reality).toBe(state.reality)
    expect(result.state.quantum).toBe(state.quantum)
    expect(result.state.avocado).toBe(state.avocado)
    expect(result.state.timeline).toBe(state.timeline)
    expect(result.state.secretProgress).toBe(state.secretProgress)
    expect(result.state.dream).toBe(state.dream)
    expect(state).toEqual(before)
  })

  test('starts with one bot when Assembly retention is absent', () => {
    const source = baseState()
    const state: CanonicalGameStateV1 = {
      ...source,
      infinity: {
        ...source.infinity,
        retainedFacilities: {
          ...source.infinity.retainedFacilities,
          assembly_lines: false,
        },
      },
      skills: {
        ...source.skills,
        activeAutoAssignment: [],
      },
    }

    const result = requireSuccess(
      applyCanonicalInfinityReset(state, {
        breakInfinity: false,
        requestedReward: 1n,
        artifactSkillPoints: 0n,
      }),
    )

    expect(result.state.dyson.bots).toBe(1)
    expect(result.state.dyson.facilities.assembly_lines).toEqual([
      0, 0,
    ])
  })

  test('records only the saturated Break reward across totals and current windows', () => {
    const source = baseState()
    const saturatedTotals: SimulationTotalsState = {
      ...source.statistics.lifetime,
      breakInfinityCount: DISCRETE_MAXIMUM,
      breakInfinityPoints: DISCRETE_MAXIMUM - 1n,
      botCapInfinityPoints: DISCRETE_MAXIMUM - 500n,
      botCapOverflowRewards: DISCRETE_MAXIMUM,
    }
    const minuteWindows = [...source.statistics.minuteWindows]
    minuteWindows[2] = {
      sequence: 99n,
      simulatedSeconds: 50,
      infinityCount: 80n,
      infinityPoints: 90n,
      dreamResetCount: 70n,
      strangeMatter: 60,
      realityWorkers: 50n,
    }
    const state: CanonicalGameStateV1 = {
      ...source,
      infinity: {
        ...source.infinity,
        points: DISCRETE_MAXIMUM - 2n,
        lastCycleDurationSeconds: 4.5,
        currentCyclePeakIpPerMinute: 74_208.1448,
        currentCyclePeakReward: 82n,
      },
      skills: {
        ...source.skills,
        activeAutoAssignment: [],
      },
      statistics: {
        ...source.statistics,
        trackedSinceUpdate: false,
        trackingStartedMarker: 'old-marker',
        trackedSimulatedSeconds: 125,
        lifetime: saturatedTotals,
        currentQuantumRun: saturatedTotals,
        recentProcessedSegment: saturatedTotals,
        recentInfinityCycles: Array.from({ length: 10 }, (_, index) => ({
          breakInfinity: true,
          automatic: true,
          configuredTarget: BigInt(index + 1),
          reward: BigInt(index + 1),
          durationSeconds: index + 1,
        })),
        minuteWindows,
      },
    }

    const result = requireSuccess(
      applyCanonicalInfinityReset(state, {
        breakInfinity: true,
        requestedReward: 10n,
        artifactSkillPoints: 0n,
      }),
    )
    const statistics = result.state.statistics

    expect(result.rewardGranted).toBe(2n)
    expect(result.state.infinity.points).toBe(DISCRETE_MAXIMUM)
    expect(result.state.infinity.lastPointsGained).toBe(2)
    expect(result.state.infinity.manualPeakIpPerMinute).toBe(74_208.1448)
    expect(result.state.infinity.manualPeakReward).toBe(82n)
    expect(result.state.infinity.manualCalibrationObservedActiveSeconds).toBe(0)
    for (const totals of [
      statistics.lifetime,
      statistics.currentQuantumRun,
      statistics.recentProcessedSegment,
    ]) {
      expect(totals.breakInfinityCount).toBe(DISCRETE_MAXIMUM)
      expect(totals.breakInfinityPoints).toBe(DISCRETE_MAXIMUM)
      expect(totals.botCapInfinityPoints).toBe(
        saturatedTotals.botCapInfinityPoints,
      )
      expect(totals.botCapOverflowRewards).toBe(
        saturatedTotals.botCapOverflowRewards,
      )
    }
    expect(statistics.trackedSinceUpdate).toBe(true)
    expect(statistics.trackingStartedMarker).toBe(
      'tracked-since-update',
    )
    expect(statistics.lastCompletedCycle).toEqual({
      valid: true,
      breakInfinity: true,
      durationSeconds: 4.5,
      reward: 2n,
      dreamCause: null,
    })
    expect(statistics.recentInfinityCycles).toHaveLength(10)
    expect(statistics.recentInfinityCycles?.[0]).toEqual({
      breakInfinity: true,
      automatic: false,
      configuredTarget: source.infinity.breakTarget,
      reward: 2n,
      durationSeconds: 4.5,
    })
    expect(statistics.recentInfinityCycles?.at(-1)?.configuredTarget)
      .toBe(9n)
    expect(statistics.minuteWindows[2]).toEqual({
      sequence: 2n,
      simulatedSeconds: 0,
      infinityCount: 1n,
      infinityPoints: 2n,
      dreamResetCount: 0n,
      strangeMatter: 0,
      realityWorkers: 0n,
    })
  })

  test('records throughput only after a wholly active automatic Break cycle', () => {
    const source = baseState()
    const mixed = requireSuccess(applyCanonicalInfinityReset({
      ...source,
      infinity: {
        ...source.infinity,
        lastCycleDurationSeconds: 5,
        activeAutomaticThroughputCycleEligible: false,
      },
    }, {
      breakInfinity: true,
      requestedReward: 83n,
      artifactSkillPoints: 0n,
      automatic: true,
      processingSource: 'active',
      activeIntervalMilliseconds: 33,
    }))

    expect(mixed.state.statistics.recentActiveAutomaticInfinityCycles)
      .toEqual([])
    expect(mixed.state.infinity.activeAutomaticThroughputCycleEligible)
      .toBe(true)

    const clean = requireSuccess(applyCanonicalInfinityReset({
      ...mixed.state,
      infinity: {
        ...mixed.state.infinity,
        lastCycleDurationSeconds: 0.1,
      },
    }, {
      breakInfinity: true,
      requestedReward: 83n,
      artifactSkillPoints: 0n,
      automatic: true,
      processingSource: 'active',
      activeIntervalMilliseconds: 33,
    }))

    expect(clean.state.statistics.recentActiveAutomaticInfinityCycles)
      .toEqual([{
        breakInfinity: true,
        automatic: true,
        configuredTarget: source.infinity.breakTarget,
        reward: 83n,
        durationSeconds: 0.1,
        processingSource: 'active',
        activeIntervalMilliseconds: 33,
      }])
  })

  test('Stored Time history cannot evict active automatic throughput samples', () => {
    const source = baseState()
    const activeHistory = Array.from({ length: 10 }, (_, index) => ({
      breakInfinity: true,
      automatic: true,
      configuredTarget: 83n,
      reward: 83n,
      durationSeconds: 0.1 + index / 100,
      processingSource: 'active' as const,
      activeIntervalMilliseconds: 33,
    }))
    const result = requireSuccess(applyCanonicalInfinityReset({
      ...source,
      infinity: {
        ...source.infinity,
        activeAutomaticThroughputCycleEligible: true,
      },
      statistics: {
        ...source.statistics,
        recentActiveAutomaticInfinityCycles: activeHistory,
      },
    }, {
      breakInfinity: true,
      requestedReward: 500n,
      artifactSkillPoints: 0n,
      automatic: true,
      processingSource: 'stored-time',
      activeIntervalMilliseconds: 33,
    }))

    expect(result.state.statistics.recentActiveAutomaticInfinityCycles)
      .toEqual(activeHistory)
    expect(result.state.infinity.activeAutomaticThroughputCycleEligible)
      .toBe(false)
  })

  test('uses exported requirements in deterministic multi-pass order and rebuilds fragment state', () => {
    const source = baseState()
    const state: CanonicalGameStateV1 = {
      ...source,
      infinity: {
        ...source.infinity,
        permanentSkillPoints: 3n,
      },
      skills: {
        ...source.skills,
        byId: {
          discardedOldSkill: ownedSkill(),
        },
        points: 100n,
        fragments: 50n,
        activeAutoAssignment: [
          'monetaryPolicy',
          'workerEfficiencyTree',
          'startHereTree',
        ],
      },
    }

    const result = requireSuccess(
      applyCanonicalInfinityReset(state, {
        breakInfinity: false,
        requestedReward: 1n,
        artifactSkillPoints: 0n,
      }),
    )

    expect(result.autoAssignedSkillIds).toEqual([
      'startHereTree',
      'workerEfficiencyTree',
    ])
    expect(result.state.skills.points).toBe(1n)
    expect(result.state.skills.fragments).toBe(0n)
    expect(Object.keys(result.state.skills.byId)).toEqual([
      'discardedOldSkill',
      'startHereTree',
      'workerEfficiencyTree',
    ])
    expect(result.state.skills.activeAutoAssignment).toContain(
      'monetaryPolicy',
    )
    expect(result.state.skills.byId.discardedOldSkill)
      .toEqual(clearedSkillState())
    for (const skillId of result.autoAssignedSkillIds) {
      const skill = result.state.skills.byId[skillId]
      expect(skill).toEqual({
        owned: true,
        level: 1,
        timerSeconds: 0,
        secondaryTimerSeconds: 0,
      })
    }
  })

  test('honours the non-refundable auto-assignment preference', () => {
    const source = baseState()
    const makeState = (
      autoAssignNonRefundable: boolean,
    ): CanonicalGameStateV1 => ({
      ...source,
      infinity: {
        ...source.infinity,
        permanentSkillPoints: 1n,
      },
      skills: {
        ...source.skills,
        byId: {},
        activeAutoAssignment: ['banking'],
        autoAssignNonRefundable,
      },
    })

    const blocked = requireSuccess(
      applyCanonicalInfinityReset(makeState(false), {
        breakInfinity: false,
        requestedReward: 1n,
        artifactSkillPoints: 0n,
      }),
    )
    expect(blocked.autoAssignedSkillIds).toEqual([])
    expect(blocked.state.skills.points).toBe(1n)

    const allowed = requireSuccess(
      applyCanonicalInfinityReset(makeState(true), {
        breakInfinity: false,
        requestedReward: 1n,
        artifactSkillPoints: 0n,
      }),
    )
    expect(allowed.autoAssignedSkillIds).toEqual(['banking'])
    expect(allowed.state.skills.points).toBe(0n)
  })

  test('honours exported exclusivity after prerequisites resolve over multiple passes', () => {
    const source = baseState()
    const state: CanonicalGameStateV1 = {
      ...source,
      infinity: {
        ...source.infinity,
        permanentSkillPoints: 7n,
      },
      skills: {
        ...source.skills,
        byId: {},
        activeAutoAssignment: [
          'scientificDominance',
          'economicDominance',
          'scientificRevolution',
          'doubleScienceTree',
          'economicRevolution',
          'workerEfficiencyTree',
          'startHereTree',
        ],
      },
    }

    const result = requireSuccess(
      applyCanonicalInfinityReset(state, {
        breakInfinity: true,
        requestedReward: 1n,
        artifactSkillPoints: 0n,
      }),
    )

    expect(result.state.skills.byId.scientificDominance?.owned)
      .toBe(true)
    expect(result.state.skills.byId.economicDominance).toBeUndefined()
    expect(result.state.skills.points).toBe(1n)
  })

  test('skips stale assignment IDs but fails closed when referenced exported data is missing', () => {
    const source = baseState()
    const staleState: CanonicalGameStateV1 = {
      ...source,
      infinity: {
        ...source.infinity,
        permanentSkillPoints: 1n,
      },
      skills: {
        ...source.skills,
        byId: {},
        activeAutoAssignment: ['removed-skill', 'startHereTree'],
      },
    }
    const staleResult = requireSuccess(
      applyCanonicalInfinityReset(staleState, {
        breakInfinity: false,
        requestedReward: 1n,
        artifactSkillPoints: 0n,
      }),
    )
    expect(staleResult.autoAssignedSkillIds).toEqual([
      'startHereTree',
    ])

    const missingDefinition: CanonicalInfinityResetAssetLookup = (
      kind,
      id,
    ) =>
      kind === 'GameData.SkillDefinition' && id === 'startHereTree'
        ? undefined
        : getGameAsset(kind, id)
    const before = structuredClone(staleState)
    const failed = applyCanonicalInfinityReset(
      staleState,
      {
        breakInfinity: false,
        requestedReward: 1n,
        artifactSkillPoints: 0n,
      },
      missingDefinition,
    )
    expect(failed).toEqual({
      ok: false,
      state: staleState,
      issues: [
        {
          code: 'INFINITY_RESET_SKILL_DEFINITION_MISSING',
          path: 'gameData.skills.startHereTree',
          detail:
            "SkillDatabase references missing skill 'startHereTree'.",
        },
      ],
    })
    expect(failed.state).toBe(staleState)
    expect(staleState).toEqual(before)
  })

  test('does not consult the skill catalog when no assignment is active', () => {
    const source = baseState()
    const state: CanonicalGameStateV1 = {
      ...source,
      skills: {
        ...source.skills,
        activeAutoAssignment: [],
      },
    }
    const rejectingLookup = (): ExportedGameAsset | undefined => {
      throw new Error('Catalog must not be read for an empty assignment.')
    }

    const result = applyCanonicalInfinityReset(
      state,
      {
        breakInfinity: false,
        requestedReward: 1n,
        artifactSkillPoints: 0n,
      },
      rejectingLookup,
    )

    expect(result.ok).toBe(true)
  })

  test('rejects invalid reward inputs without changing the source state', () => {
    const source = baseState()
    const before = structuredClone(source)

    const result = applyCanonicalInfinityReset(source, {
      breakInfinity: false,
      requestedReward: -1n,
      artifactSkillPoints: 0n,
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected reset rejection.')
    expect(result.issues[0]?.code).toBe(
      'INFINITY_RESET_REQUEST_INVALID',
    )
    expect(result.state).toBe(source)
    expect(source).toEqual(before)
  })
})
