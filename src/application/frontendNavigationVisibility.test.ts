import { describe, expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from './firstRun/unityFirstRunSave'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { applyCanonicalOverflowReset } from '../simulation/canonicalOverflowReset'
import { selectGameplayVisibility } from './frontendSnapshot'

function firstRunState(): CanonicalGameStateV1 {
  return hydrateGameState(
    createUnityFirstRunPreparedSave({
      startedAtUtc: '2026-08-29T00:00:00.000Z',
    }),
  ).state
}

describe('progression-aware navigation visibility', () => {
  test('Simulations remain available through Transcendence without retired Influence prerequisites', () => {
    const initial = firstRunState()
    expect(selectGameplayVisibility(initial).simulations).toMatchObject({ routeVisible: true, routeUnlocked: true })
    const before = { ...initial, dyson: { ...initial.dyson, bots: 4e242 },
      statistics: { ...initial.statistics, lifetime: { ...initial.statistics.lifetime, manualInfluence: 128 } } }
    const reset = applyCanonicalOverflowReset(before)
    if (!reset.ok) throw new Error(reset.code)
    expect(reset.state.statistics.lifetime.manualInfluence).toBe(128)
    expect(selectGameplayVisibility(reset.state).simulations).toMatchObject({ routeVisible: true, routeUnlocked: true })
  })

  test('teases the first facility before it is visible', () => {
    const initial = firstRunState()

    expect(selectGameplayVisibility(initial).dyson).toMatchObject({
      visibleFacilityIds: [],
      showNextFacilityTeaser: true,
    })
  })

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

  test.each([
    { name: 'first Infinity', firstInfinity: true, secrets: 0n, quantumPoints: 0n, manualInfluence: 0, automaticInfluence: 0 },
    { name: 'Secrets', firstInfinity: true, secrets: 27n, quantumPoints: 0n, manualInfluence: 0, automaticInfluence: 0 },
    { name: 'legacy Quantum', firstInfinity: true, secrets: 27n, quantumPoints: 1n, manualInfluence: 0, automaticInfluence: 0 },
    { name: 'manual Influence', firstInfinity: false, secrets: 0n, quantumPoints: 0n, manualInfluence: 128, automaticInfluence: 0 },
    { name: 'automatic Influence', firstInfinity: false, secrets: 0n, quantumPoints: 0n, manualInfluence: 0, automaticInfluence: 128 },
  ])('keeps retired routes hidden and Simulations available with $name history', row => {
    const initial = firstRunState()
    const state = { ...initial, meta: { ...initial.meta, firstInfinityComplete: row.firstInfinity },
      infinity: { ...initial.infinity, secretsOfTheUniverse: row.secrets },
      quantum: { ...initial.quantum, pointsEarned: row.quantumPoints },
      statistics: { ...initial.statistics, lifetime: { ...initial.statistics.lifetime,
        manualInfluence: row.manualInfluence, automaticInfluence: row.automaticInfluence } } }
    const visibility = selectGameplayVisibility(state)
    expect(visibility.quantum).toMatchObject({ routeVisible: false, routeUnlocked: false })
    expect(visibility.reality).toMatchObject({ routeVisible: false, routeUnlocked: false })
    expect(visibility.simulations).toMatchObject({ routeVisible: true, routeUnlocked: true })
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
