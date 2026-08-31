import { describe, expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { addDiscrete, DISCRETE_MAXIMUM } from './numeric'
import {
  advanceRealityWorkers,
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
