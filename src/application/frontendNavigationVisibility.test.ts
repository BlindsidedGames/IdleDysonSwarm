import { describe, expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from './firstRun/unityFirstRunSave'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import {
  advanceRealityWorkers,
  gatherRealityInfluence,
} from '../simulation/realityWorkers'
import { selectGameplayVisibility } from './frontendSnapshot'

const realityTuning = {
  workerBatchSize: 128n,
  baseWorkerGenerationSpeed: 4,
} as const

function firstRunState(): CanonicalGameStateV1 {
  return hydrateGameState(
    createUnityFirstRunPreparedSave({
      startedAtUtc: '2026-08-29T00:00:00.000Z',
    }),
  ).state
}

describe('progression-aware navigation visibility', () => {
  test('keeps Skills hidden until a Skill Point has actually been earned', () => {
    const initial = firstRunState()
    const tenBots = {
      ...initial,
      dyson: { ...initial.dyson, bots: 10 },
    }
    const earnedPoint = {
      ...tenBots,
      skills: { ...tenBots.skills, points: 1n },
    }

    expect(selectGameplayVisibility(initial).skills).toEqual({
      routeVisible: false,
      routeUnlocked: false,
    })
    expect(selectGameplayVisibility(tenBots).skills.routeVisible).toBe(false)
    expect(selectGameplayVisibility(earnedPoint).skills).toEqual({
      routeVisible: true,
      routeUnlocked: true,
    })
  })

  test('reveals locked Infinity when Planets become available', () => {
    const initial = firstRunState()
    const planetsAvailable = {
      ...initial,
      dyson: {
        ...initial.dyson,
        facilities: {
          ...initial.dyson.facilities,
          data_centers: [0, 1] as const,
        },
      },
    }

    expect(selectGameplayVisibility(initial).infinity.routeVisible).toBe(false)
    expect(selectGameplayVisibility(planetsAvailable).infinity).toMatchObject({
      routeVisible: true,
      routeUnlocked: false,
      unlockProgress: {
        currentBots: initial.dyson.bots,
        requiredBots: 4.2e19,
      },
    })
  })

  test('reveals locked Quantum after the first Infinity', () => {
    const initial = firstRunState()
    const afterInfinity = {
      ...initial,
      meta: { ...initial.meta, firstInfinityComplete: true },
    }

    expect(selectGameplayVisibility(initial).quantum.routeVisible).toBe(false)
    expect(selectGameplayVisibility(afterInfinity).quantum).toEqual({
      routeVisible: true,
      routeUnlocked: false,
      unlockProgress: {
        currentInfinityPoints: 0n,
        requiredInfinityPoints: 42n,
        fraction: 0,
      },
    })
  })

  test('reveals Reality after the first Secret with Secrets-only progress', () => {
    const initial = firstRunState()
    const infinityPointsWithoutSecrets = {
      ...initial,
      infinity: {
        ...initial.infinity,
        points: 42n,
      },
    }
    const nearSecretsPath = {
      ...initial,
      infinity: {
        ...initial.infinity,
        secretsOfTheUniverse: 1n,
      },
    }

    expect(selectGameplayVisibility(initial).reality.routeVisible).toBe(false)
    expect(selectGameplayVisibility(infinityPointsWithoutSecrets).reality).toEqual({
      routeVisible: false,
      routeUnlocked: false,
      unlockProgress: {
        currentSecrets: 0n,
        requiredSecrets: 27n,
        fraction: 0,
      },
    })
    expect(selectGameplayVisibility(nearSecretsPath).reality).toMatchObject({
      routeVisible: true,
      routeUnlocked: false,
      unlockProgress: {
        currentSecrets: 1n,
        requiredSecrets: 27n,
        fraction: 1 / 27,
      },
    })
    expect(selectGameplayVisibility(nearSecretsPath).simulations).toEqual({
      routeVisible: false,
      routeUnlocked: false,
      unlockProgress: {
        currentInfluence: 0,
        requiredInfluence: 128,
        fraction: 0,
      },
    })
  })

  test('previews Simulations after Reality is visited and unlocks it at 128 manual Influence', () => {
    const initial = firstRunState()
    const afterQuantumLeap = {
      ...initial,
      quantum: { ...initial.quantum, pointsEarned: 1n },
    }
    const afterRealityVisit = {
      ...afterQuantumLeap,
      meta: {
        ...afterQuantumLeap.meta,
        navigationRouteDiscovery: {
          knownRoutes: ['reality'] as const,
          unvisitedRoutes: [],
        },
      },
    }
    const generationInProgress = advanceRealityWorkers(
      afterRealityVisit,
      31.875,
      realityTuning,
    )
    const readyToGather = advanceRealityWorkers(
      afterRealityVisit,
      32,
      realityTuning,
    )
    const afterFirstGather = gatherRealityInfluence(
      readyToGather.state,
      realityTuning,
    )

    expect(selectGameplayVisibility(afterQuantumLeap).reality).toMatchObject({
      routeVisible: true,
      routeUnlocked: true,
    })
    expect(selectGameplayVisibility(afterQuantumLeap).simulations).toEqual({
      routeVisible: false,
      routeUnlocked: false,
      unlockProgress: {
        currentInfluence: 0,
        requiredInfluence: 128,
        fraction: 0,
      },
    })
    expect(selectGameplayVisibility(afterRealityVisit).simulations).toEqual({
      routeVisible: true,
      routeUnlocked: false,
      unlockProgress: {
        currentInfluence: 0,
        requiredInfluence: 128,
        fraction: 0,
      },
    })
    expect(generationInProgress.state.reality).toMatchObject({
      workersReady: 127n,
      workerGenerationProgress: 0.5,
    })
    expect(
      selectGameplayVisibility(generationInProgress.state).simulations,
    ).toEqual({
      routeVisible: true,
      routeUnlocked: false,
      unlockProgress: {
        currentInfluence: 127,
        requiredInfluence: 128,
        fraction: 127.5 / 128,
      },
    })
    expect(selectGameplayVisibility(readyToGather.state).simulations).toEqual({
      routeVisible: true,
      routeUnlocked: false,
      unlockProgress: {
        currentInfluence: 128,
        requiredInfluence: 128,
        fraction: 1,
      },
    })
    expect(afterFirstGather).toMatchObject({
      status: 'success',
      gathered: true,
      amount: 128,
    })
    expect(
      selectGameplayVisibility(afterFirstGather.state).simulations,
    ).toEqual({
      routeVisible: true,
      routeUnlocked: true,
      unlockProgress: {
        currentInfluence: 128,
        requiredInfluence: 128,
        fraction: 1,
      },
    })
  })

  test('does not unlock Simulations from automatic Influence', () => {
    const initial = firstRunState()
    const automaticInfluenceOnly = {
      ...initial,
      statistics: {
        ...initial.statistics,
        lifetime: {
          ...initial.statistics.lifetime,
          automaticInfluence: 128,
        },
      },
    }

    expect(selectGameplayVisibility(automaticInfluenceOnly).simulations).toEqual({
      routeVisible: false,
      routeUnlocked: false,
      unlockProgress: {
        currentInfluence: 0,
        requiredInfluence: 128,
        fraction: 0,
      },
    })
  })

  test('keeps Simulations unlocked for an existing save with Simulation progress', () => {
    const initial = firstRunState()
    const existingSimulationSave = {
      ...initial,
      dream: {
        ...initial.dream,
        resources: {
          ...initial.dream.resources,
          hunters: 1n,
        },
      },
    }

    expect(selectGameplayVisibility(existingSimulationSave).simulations).toEqual({
      routeVisible: true,
      routeUnlocked: true,
      unlockProgress: {
        currentInfluence: 128,
        requiredInfluence: 128,
        fraction: 1,
      },
    })
  })
})
