import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { DISCRETE_MAXIMUM } from './numeric'
import {
  advanceCanonicalGoalProgression,
  type CanonicalGoalDysonFacts,
} from './canonicalGoalProgression'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)
const hydrated = hydrateGameState(
  prepareIdb1Save(fixture).prepared,
)

const noPanels: CanonicalGoalDysonFacts = {
  panelsPerSecond: 0,
  panelLifetimeSeconds: 10,
}

function baseState(): CanonicalGameStateV1 {
  const source = hydrated.state
  return {
    ...source,
    dyson: {
      ...source.dyson,
      bots: 0,
      facilities: {
        ...source.dyson.facilities,
        assembly_lines: [0, 0],
        planets: [0, 0],
      },
      totalPanelsDecayed: 0,
      goalStage: 0n,
    },
    skills: {
      ...source.skills,
      points: 0n,
      fragments: 0n,
      activeAutoAssignment: [],
      byId: Object.fromEntries(
        Object.entries(source.skills.byId).map(([id, skill]) => [
          id,
          { ...skill, owned: false },
        ]),
      ),
    },
  }
}

describe('canonical Unity goal progression', () => {
  test('catches up every satisfied stage once and remains idempotent', () => {
    const source = baseState()
    const qualified: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        bots: 10,
        facilities: {
          ...source.dyson.facilities,
          assembly_lines: [0, 5],
          planets: [20, 0],
        },
        totalPanelsDecayed: 1_000_000_000_000,
      },
    }
    const lateGameFacts: CanonicalGoalDysonFacts = {
      panelsPerSecond: 20_200_000_000_000_000,
      panelLifetimeSeconds: 10,
    }

    const first = advanceCanonicalGoalProgression(
      qualified,
      () => lateGameFacts,
    )

    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.state.dyson.goalStage).toBe(10n)
    expect(first.state.skills.points).toBe(10n)
    expect(first.completedStages).toEqual([
      0n,
      1n,
      2n,
      3n,
      4n,
      5n,
      6n,
      7n,
      8n,
      9n,
    ])

    const second = advanceCanonicalGoalProgression(
      first.state,
      () => lateGameFacts,
    )
    expect(second).toMatchObject({
      ok: true,
      completedStages: [],
      awardedSkillPoints: 0n,
    })
    if (second.ok) {
      expect(second.state.dyson.goalStage).toBe(10n)
      expect(second.state.skills.points).toBe(10n)
    }
  })

  test('matches Unity pair semantics and Terra Irradiant weighting', () => {
    const source = baseState()
    const automaticOnly = advanceCanonicalGoalProgression(
      {
        ...source,
        dyson: {
          ...source.dyson,
          goalStage: 1n,
          facilities: {
            ...source.dyson.facilities,
            assembly_lines: [5, 0],
          },
        },
      },
      () => noPanels,
    )
    expect(automaticOnly).toMatchObject({
      ok: true,
      completedStages: [],
    })

    const twoManualPlanets: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        goalStage: 3n,
        facilities: {
          ...source.dyson.facilities,
          planets: [0, 2],
        },
      },
    }
    const withoutTerra = advanceCanonicalGoalProgression(
      twoManualPlanets,
      () => noPanels,
    )
    expect(withoutTerra).toMatchObject({
      ok: true,
      completedStages: [],
    })

    const withTerra = advanceCanonicalGoalProgression(
      {
        ...twoManualPlanets,
        skills: {
          ...twoManualPlanets.skills,
          byId: {
            ...twoManualPlanets.skills.byId,
            terraIrradiant: {
              ...twoManualPlanets.skills.byId.terraIrradiant!,
              owned: true,
            },
          },
        },
      },
      () => noPanels,
    )
    expect(withTerra).toMatchObject({
      ok: true,
      completedStages: [3n],
      awardedSkillPoints: 1n,
    })
  })

  test('preserves Unity strict galaxy comparisons', () => {
    const source = {
      ...baseState(),
      dyson: {
        ...baseState().dyson,
        goalStage: 7n,
      },
    }
    const exactlyOneGalaxy = advanceCanonicalGoalProgression(
      source,
      () => ({
        panelsPerSecond:
          (20_000 * 100_000_000_000) / 10,
        panelLifetimeSeconds: 10,
      }),
    )
    expect(exactlyOneGalaxy).toMatchObject({
      ok: true,
      completedStages: [],
    })

    const overOneGalaxy = advanceCanonicalGoalProgression(
      source,
      () => ({
        panelsPerSecond:
          (20_000 * 100_000_000_001) / 10,
        panelLifetimeSeconds: 10,
      }),
    )
    expect(overOneGalaxy).toMatchObject({
      ok: true,
      completedStages: [7n],
    })
  })

  test('runs Unity auto-assignment immediately after an award', () => {
    const source = baseState()
    const result = advanceCanonicalGoalProgression(
      {
        ...source,
        dyson: {
          ...source.dyson,
          bots: 10,
        },
        skills: {
          ...source.skills,
          activeAutoAssignment: ['startHereTree'],
        },
      },
      () => noPanels,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.completedStages).toEqual([0n])
    expect(result.state.skills.points).toBe(0n)
    expect(result.state.skills.byId.startHereTree?.owned).toBe(true)
  })

  test('saturates Skill Points and rejects invalid derived facts', () => {
    const source = baseState()
    const saturated = advanceCanonicalGoalProgression(
      {
        ...source,
        dyson: { ...source.dyson, bots: 10 },
        skills: {
          ...source.skills,
          points: DISCRETE_MAXIMUM,
        },
      },
      () => noPanels,
    )
    expect(saturated.ok).toBe(true)
    if (saturated.ok) {
      expect(saturated.state.skills.points).toBe(DISCRETE_MAXIMUM)
      expect(saturated.state.dyson.goalStage).toBe(1n)
    }

    expect(
      advanceCanonicalGoalProgression(
        {
          ...source,
          dyson: { ...source.dyson, goalStage: 2n },
        },
        () => ({
          panelsPerSecond: Number.NaN,
          panelLifetimeSeconds: 10,
        }),
      ),
    ).toMatchObject({
      ok: false,
      code: 'CANONICAL_GOAL_PROGRESSION_REJECTED',
      state: {
        dyson: { goalStage: 2n },
      },
    })
  })
})
