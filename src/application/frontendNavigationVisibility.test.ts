import { describe, expect, test } from 'vitest'
import { createDeterministicUnityFirstRunPreparedSave } from './firstRun/unityFirstRunSave'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { selectGameplayVisibility } from './frontendSnapshot'

function firstRunState(): CanonicalGameStateV1 {
  return hydrateGameState(
    createDeterministicUnityFirstRunPreparedSave(),
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

  test('reveals Reality and Simulations at the approved late-game thresholds', () => {
    const initial = firstRunState()
    const nearInfinityPointPath = {
      ...initial,
      infinity: {
        ...initial.infinity,
        points: 20n,
        spentPoints: 12n,
      },
    }
    const nearSecretsPath = {
      ...initial,
      infinity: {
        ...initial.infinity,
        secretsOfTheUniverse: 21n,
      },
    }

    expect(selectGameplayVisibility(initial).reality.routeVisible).toBe(false)
    expect(
      selectGameplayVisibility(nearInfinityPointPath).reality,
    ).toMatchObject({
      routeVisible: true,
      routeUnlocked: false,
      unlockProgress: { leadingPath: 'infinity-points' },
    })
    expect(selectGameplayVisibility(nearSecretsPath).reality).toMatchObject({
      routeVisible: true,
      routeUnlocked: false,
      unlockProgress: { leadingPath: 'secrets' },
    })
    expect(
      selectGameplayVisibility(nearSecretsPath).simulations,
    ).toMatchObject({
      routeVisible: true,
      routeUnlocked: false,
      unlockProgress: { leadingPath: 'secrets' },
    })
  })

  test('unlocks Reality and Simulations together after a Quantum Leap', () => {
    const initial = firstRunState()
    const afterQuantumLeap = {
      ...initial,
      quantum: { ...initial.quantum, pointsEarned: 1n },
    }
    const visibility = selectGameplayVisibility(afterQuantumLeap)

    expect(visibility.reality).toMatchObject({
      routeVisible: true,
      routeUnlocked: true,
    })
    expect(visibility.simulations).toMatchObject({
      routeVisible: true,
      routeUnlocked: true,
    })
  })
})
