import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { DISCRETE_MAXIMUM } from './numeric'
import {
  applyCanonicalQuantumReset,
  applyQuantumEntanglementConversion,
} from './quantumTransitions'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function state(): CanonicalGameStateV1 {
  return hydrateGameState(
    prepareIdb1Save(fixture).prepared,
  ).state
}

describe('Quantum Entanglement transition', () => {
  test('converts only complete groups of 42 unspent Infinity Points', () => {
    const source = state()
    const input: CanonicalGameStateV1 = {
      ...source,
      meta: { ...source.meta, firstInfinityComplete: false },
      infinity: {
        ...source.infinity,
        points: 117n,
        spentPoints: 16n,
      },
      quantum: {
        ...source.quantum,
        pointsEarned: 5n,
      },
    }
    const before = structuredClone(input)

    const result = applyQuantumEntanglementConversion(input)

    expect(result).toMatchObject({
      availableInfinityPoints: 101n,
      infinityPointsConsumed: 84n,
      quantumPointsGranted: 2n,
    })
    expect(result.state.infinity.points).toBe(33n)
    expect(result.state.infinity.spentPoints).toBe(16n)
    expect(result.state.quantum.pointsEarned).toBe(7n)
    expect(result.state.meta.firstInfinityComplete).toBe(true)
    expect(input).toEqual(before)
  })

  test('marks first Infinity done but does not mutate balances below 42', () => {
    const source = state()
    const input = {
      ...source,
      meta: { ...source.meta, firstInfinityComplete: false },
      infinity: {
        ...source.infinity,
        points: 50n,
        spentPoints: 9n,
      },
    }
    const result = applyQuantumEntanglementConversion(input)
    expect(result.quantumPointsGranted).toBe(0n)
    expect(result.infinityPointsConsumed).toBe(0n)
    expect(result.state.infinity).toBe(input.infinity)
    expect(result.state.quantum).toBe(input.quantum)
    expect(result.state.meta.firstInfinityComplete).toBe(true)
  })

  test('rejects the conversion atomically when Quantum Points are saturated', () => {
    const source = state()
    const input = {
      ...source,
      infinity: {
        ...source.infinity,
        points: 84n,
        spentPoints: 0n,
      },
      quantum: {
        ...source.quantum,
        pointsEarned: DISCRETE_MAXIMUM,
      },
    }
    const result = applyQuantumEntanglementConversion(input)
    expect(result.infinityPointsConsumed).toBe(0n)
    expect(result.quantumPointsGranted).toBe(0n)
    expect(result.state.infinity).toBe(input.infinity)
    expect(result.state.quantum).toBe(input.quantum)
  })

  test('treats an overspent Infinity balance as zero available', () => {
    const source = state()
    const input = {
      ...source,
      infinity: {
        ...source.infinity,
        points: 1n,
        spentPoints: 2n,
      },
    }
    const result = applyQuantumEntanglementConversion(input)
    expect(result.availableInfinityPoints).toBe(0n)
    expect(result.infinityPointsConsumed).toBe(0n)
    expect(result.quantumPointsGranted).toBe(0n)
  })
})

describe('canonical Quantum reset', () => {
  test('replaces both Dyson containers, grants one point, and restores permanent session effects', () => {
    const source = state()
    const input: CanonicalGameStateV1 = {
      ...source,
      meta: { ...source.meta, firstInfinityComplete: false },
      dyson: {
        ...source.dyson,
        money: 1_000,
        science: 2_000,
        bots: 3_000,
        workers: 4_000,
        researchers: 5_000,
        facilities: Object.fromEntries(
          Object.keys(source.dyson.facilities).map((id) => [
            id,
            [10, 20],
          ]),
        ) as unknown as CanonicalGameStateV1['dyson']['facilities'],
        totalPanelsDecayed: 6_000,
        goalStage: 7n,
        botDistribution: 0.9,
      },
      infinity: {
        ...source.infinity,
        points: 100n,
        spentPoints: 20n,
        inProgress: true,
        botCapTransitionPending: true,
        botCapRewardsGranted: true,
        lastCycleDurationSeconds: 42,
        lastPointsGained: 8,
        storedTimeUsedThisCycleSeconds: 9,
        storedTimeUsedPreviousCycleSeconds: 10,
        secretsOfTheUniverse: 11n,
        permanentSkillPoints: 12n,
        retainedFacilities: {
          assembly_lines: true,
          ai_managers: true,
          servers: true,
          data_centers: true,
          planets: true,
        },
      },
      skills: {
        ...source.skills,
        points: 99n,
        fragments: 9n,
        byId: {
          banking: {
            owned: true,
            level: 1,
            timerSeconds: 1,
            secondaryTimerSeconds: 2,
          },
        },
        activeAutoAssignment: [],
      },
      research: {
        ...source.research,
        levelsById: { test: 9 },
        progressById: { test: 0.5 },
      },
      quantum: {
        ...source.quantum,
        pointsEarned: 5n,
        permanentSecrets: 27n,
        unlocks: {
          ...source.quantum.unlocks,
          automation: true,
          matrioshkaBrains: true,
          birchPlanets: true,
          galacticBrains: true,
        },
      },
      timeline: {
        ...source.timeline,
        infinityBoundaryRemaining: 4,
        infinityCycleSeconds: 5,
        infinityCycleStartingPoints: 6n,
        infinityHasPostResetStart: true,
      },
      statistics: {
        ...source.statistics,
        trackedSinceUpdate: false,
        trackingStartedMarker: 'old',
      },
    }
    const before = structuredClone(input)
    const result = applyCanonicalQuantumReset(input, 4n)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))

    expect(result.quantumPointGranted).toBe(1n)
    expect(result.state.quantum.pointsEarned).toBe(6n)
    expect(result.state.quantum.unlocks)
      .toEqual(input.quantum.unlocks)
    expect(result.state.meta.firstInfinityComplete).toBe(true)
    expect(result.state.dyson).toMatchObject({
      money: 0,
      science: 0,
      bots: 0,
      workers: 0,
      researchers: 0,
      totalPanelsDecayed: 0,
      goalStage: 0n,
      botDistribution: 0.5,
    })
    expect(
      Object.values(result.state.dyson.facilities),
    ).toEqual(Array.from({ length: 8 }, () => [0, 0]))
    expect(result.state.infinity).toMatchObject({
      points: 0n,
      spentPoints: 0n,
      inProgress: true,
      botCapTransitionPending: true,
      botCapRewardsGranted: true,
      lastCycleDurationSeconds: 0,
      lastPointsGained: 0,
      storedTimeUsedThisCycleSeconds: 0,
      storedTimeUsedPreviousCycleSeconds: 0,
      secretsOfTheUniverse: 27n,
      permanentSkillPoints: 0n,
      automationUnlocked: { research: true, bots: true },
    })
    expect(result.state.skills.points).toBe(4n)
    expect(result.state.skills.fragments).toBe(0n)
    expect(result.state.skills.byId).toEqual({
      androids: {
        owned: false,
        level: 0,
        timerSeconds: 0,
        secondaryTimerSeconds: 0,
      },
      pocketAndroids: {
        owned: false,
        level: 0,
        timerSeconds: 0,
        secondaryTimerSeconds: 0,
      },
    })
    expect(result.state.research.levelsById).toEqual({})
    expect(result.state.research.progressById).toEqual({})
    expect(result.state.statistics.currentQuantumRun)
      .toMatchObject({ simulatedSeconds: 0, realityWorkers: 0n })
    expect(result.state.statistics.recentProcessedSegment)
      .toMatchObject({ simulatedSeconds: 0, realityWorkers: 0n })
    expect(result.state.statistics.lifetime)
      .toBe(input.statistics.lifetime)
    expect(result.state.statistics.trackedSinceUpdate).toBe(true)
    expect(result.state.statistics.trackingStartedMarker)
      .toBe('tracked-since-update')
    expect(result.state.timeline).toBe(input.timeline)
    expect(result.state.reality).toBe(input.reality)
    expect(result.state.avocado).toBe(input.avocado)
    expect(result.state.dream).toBe(input.dream)
    expect(input).toEqual(before)
  })

  test('uses Unity greater-than-one session-secret parity and still resets at point saturation', () => {
    const source = state()
    const input: CanonicalGameStateV1 = {
      ...source,
      skills: { ...source.skills, activeAutoAssignment: [] },
      quantum: {
        ...source.quantum,
        pointsEarned: DISCRETE_MAXIMUM,
        permanentSecrets: 1n,
      },
      infinity: {
        ...source.infinity,
        secretsOfTheUniverse: 20n,
      },
    }
    const result = applyCanonicalQuantumReset(input, 0n)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(result.quantumPointGranted).toBe(0n)
    expect(result.state.quantum.pointsEarned)
      .toBe(DISCRETE_MAXIMUM)
    expect(result.state.infinity.secretsOfTheUniverse).toBe(0n)
  })
})
