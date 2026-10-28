import { describe, expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { dehydrateGameState, hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { PreparedSave } from '../save/prepare'
import { deserializeWebSave, serializeWebSave } from '../save/serialization'
import { addDiscrete, DISCRETE_MAXIMUM } from './numeric'
import {
  advanceRealityWorkers,
  gatherRealityInfluence,
  realityInfluenceGenerationStarted,
} from './realityWorkers'

const tuning = {
  workerBatchSize: 128n,
  baseWorkerGenerationSpeed: 4,
} as const

function realityUnlockedState(): CanonicalGameStateV1 {
  const initial = hydrateGameState(
    createUnityFirstRunPreparedSave({
      startedAtUtc: '2026-08-29T00:00:00.000Z',
    }),
  ).state
  return {
    ...initial,
    quantum: {
      ...initial.quantum,
      pointsEarned: 1n,
    },
  }
}

describe('Reality Influence generation activation', () => {
  test('does not advance before a fresh save visits Reality', () => {
    const state = realityUnlockedState()

    expect(realityInfluenceGenerationStarted(state)).toBe(false)
    expect(advanceRealityWorkers(state, 60, tuning)).toEqual({
      status: 'success',
      state,
      generationPerSecond: 0,
      workersGenerated: 0n,
      automaticInfluence: 0,
      stalledSeconds: 0,
    })
  })

  test('starts once Reality is visited and remains active in canonical state', () => {
    const state = realityUnlockedState()
    const visited = {
      ...state,
      meta: {
        ...state.meta,
        navigationRouteDiscovery: {
          knownRoutes: ['reality'] as const,
          unvisitedRoutes: [],
        },
      },
    }

    expect(realityInfluenceGenerationStarted(visited)).toBe(true)
    const advanced = advanceRealityWorkers(visited, 1, tuning)
    expect(advanced.status).toBe('success')
    expect(advanced.generationPerSecond).toBe(4)
    expect(advanced.workersGenerated).toBe(4n)
    expect(advanced.state.reality.workersReady).toBe(4n)
  })

  test('preserves generation for unlocked legacy saves without discovery state', () => {
    const state = realityUnlockedState()
    const legacy = {
      ...state,
      meta: {
        ...state.meta,
        navigationRouteDiscovery: undefined,
      },
    }

    expect(realityInfluenceGenerationStarted(legacy)).toBe(true)
    expect(advanceRealityWorkers(legacy, 1, tuning).workersGenerated).toBe(4n)
  })

  test('continues ordinal universe designations beyond the bounded resource ceiling', () => {
    const state = realityUnlockedState()
    const atLegacyCeiling = {
      ...state,
      meta: {
        ...state.meta,
        navigationRouteDiscovery: {
          knownRoutes: ['reality'] as const,
          unvisitedRoutes: [],
        },
      },
      reality: {
        ...state.reality,
        universeDesignationCount: DISCRETE_MAXIMUM,
      },
    }

    const first = advanceRealityWorkers(atLegacyCeiling, 1, tuning)
    expect(first.status).toBe('success')
    expect(first.workersGenerated).toBe(4n)
    expect(first.state.reality.universeDesignationCount)
      .toBe(DISCRETE_MAXIMUM + 4n)

    const second = advanceRealityWorkers(first.state, 1, tuning)
    expect(second.status).toBe('success')
    expect(second.state.reality.universeDesignationCount)
      .toBe(DISCRETE_MAXIMUM + 8n)

    expect(addDiscrete(DISCRETE_MAXIMUM, 1n))
      .toBe(DISCRETE_MAXIMUM)
  })
})

describe('fractional Influence gathering', () => {
  const reportedBalance = 44.08023375117979
  function readyState(): CanonicalGameStateV1 {
    const state = realityUnlockedState()
    return {
      ...state,
      meta: { ...state.meta, navigationRouteDiscovery: undefined },
      reality: { ...state.reality, influence: reportedBalance, workersReady: 128n },
    }
  }

  test('gathers full batches repeatedly from the reported fractional balance', () => {
    let state = readyState()
    let expected = reportedBalance
    for (let i = 0; i < 100; i += 1) {
      const result = gatherRealityInfluence(state, tuning)
      expected += 128
      expect(result.status).toBe('success')
      expect(result.amount).toBe(128)
      expect(result.state.reality.influence).toBe(expected)
      expect(result.state.reality.workersReady).toBe(0n)
      state = advanceRealityWorkers(result.state, 32, tuning).state
      expect(state.reality.workersReady).toBe(128n)
    }
  })

  test('gathers automatic production without retaining credited workers', () => {
    const initial = readyState()
    let state = {
      ...initial,
      reality: { ...initial.reality, autoGather: true, workersReady: 0n },
    }
    let expected = reportedBalance
    for (let i = 0; i < 100; i += 1) {
      const result = advanceRealityWorkers(state, 1, tuning)
      expected += 4
      expect(result.automaticInfluence).toBe(4)
      expect(result.state.reality.workersReady).toBe(0n)
      expect(result.state.reality.influence).toBe(expected)
      state = result.state
    }
  })

  test('preserves readiness and fractional balance through export and reload', () => {
    const base = hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: '2026-08-29T00:00:00.000Z' }))
    const save = dehydrateGameState(base, readyState())
    const reloaded = hydrateGameState(PreparedSave.fromDecoded(
      deserializeWebSave(serializeWebSave(save.copyValidatedState())),
    ))
    expect(reloaded.state.reality.influence).toBe(reportedBalance)
    const gathered = gatherRealityInfluence(reloaded.state, tuning)
    expect(gathered.status).toBe('success')
    const nextSave = dehydrateGameState(reloaded, gathered.state)
    const next = hydrateGameState(PreparedSave.fromDecoded(
      deserializeWebSave(serializeWebSave(nextSave.copyValidatedState())),
    )).state
    expect(next.reality.workersReady).toBe(0n)
    expect(next.reality.influence).toBe(reportedBalance + 128)
  })

  test('retains a manual batch when the Influence balance cannot represent it', () => {
    const state = readyState()
    const huge = { ...state, reality: { ...state.reality, influence: 1e300 } }
    const result = gatherRealityInfluence(huge, tuning)
    expect(result.status).toBe('output-maxed')
    expect(result.state).toBe(huge)
    const automatic = advanceRealityWorkers({
      ...huge, reality: { ...huge.reality, autoGather: true },
    }, 1, tuning)
    expect(automatic.automaticInfluence).toBe(0)
    expect(automatic.state.reality.workersReady).toBe(132n)
  })
})
