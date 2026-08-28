import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type {
  CanonicalGameStateV1,
  DreamEducationId,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { bitDecrement } from './numeric'
import {
  advanceDreamEducation,
  findSimulationUpgradeCanonicalGaps,
  purchaseSimulationUpgrade,
  SIMULATION_UPGRADE_DEFINITIONS,
  startDreamEducation,
} from './dreamEducationUpgrades'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function state(): CanonicalGameStateV1 {
  const initial = hydrateGameState(prepareIdb1Save(fixture).prepared).state
  return {
    ...initial,
    reality: {
      ...initial.reality,
      influence: 10_000,
    },
    dream: {
      ...initial.dream,
      strangeMatter: 1_000_000,
      resources: {
        ...initial.dream.resources,
        hunters: 0n,
        gatherers: 0n,
      },
      parameters: {
        ...initial.dream.parameters,
        solarPanelGeneration: 1n,
      },
      education: Object.fromEntries(
        Object.entries(initial.dream.education).map(([id, education]) => [
          id,
          {
            ...education,
            active: false,
            complete: false,
            progress: 0,
            researchTime: 100,
            cost: 25,
          },
        ]),
      ) as CanonicalGameStateV1['dream']['education'],
      upgrades: Object.fromEntries(
        Object.keys(initial.dream.upgrades).map((key) => [key, false]),
      ) as CanonicalGameStateV1['dream']['upgrades'],
    },
  }
}

function withOwned(
  source: CanonicalGameStateV1,
  ...keys: (keyof CanonicalGameStateV1['dream']['upgrades'])[]
): CanonicalGameStateV1 {
  return {
    ...source,
    dream: {
      ...source.dream,
      upgrades: {
        ...source.dream.upgrades,
        ...Object.fromEntries(keys.map((key) => [key, true])),
      },
    },
  }
}

describe('exported Simulation upgrade definitions', () => {
  test('loads every authored Simulation-layer definition without canonical gaps', () => {
    expect(SIMULATION_UPGRADE_DEFINITIONS.size).toBe(43)
    expect(findSimulationUpgradeCanonicalGaps()).toEqual([])
  })

  test('rejects unknown, owned, unmet, and unaffordable upgrades immutably', () => {
    const initial = state()
    expect(purchaseSimulationUpgrade(initial, 'not-real').code).toBe(
      'unknown_upgrade',
    )

    const owned = withOwned(initial, 'counterMeteor')
    expect(
      purchaseSimulationUpgrade(owned, 'counterMeteor').code,
    ).toBe('already_owned')
    expect(purchaseSimulationUpgrade(initial, 'counterAi').code).toBe(
      'prerequisites_not_met',
    )

    const poor = {
      ...initial,
      dream: { ...initial.dream, strangeMatter: 3 },
    }
    const result = purchaseSimulationUpgrade(poor, 'counterMeteor')
    expect(result.code).toBe('insufficient_strange_matter')
    expect(result.candidate).toBe(poor)
    expect(initial.dream.upgrades.counterMeteor).toBe(false)
  })

  test('debits strange matter and applies ownership and prestige effects', () => {
    const initial = state()
    const result = purchaseSimulationUpgrade(initial, 'counterMeteor')

    expect(result.code).toBe('purchased')
    expect(result.candidate).not.toBe(initial)
    expect(result.candidate.dream.strangeMatter).toBe(999_996)
    expect(result.candidate.dream.upgrades.counterMeteor).toBe(true)
    expect(result.candidate.dream.disasterStage).toBe(2n)
    expect(initial.dream.strangeMatter).toBe(1_000_000)
    expect(initial.dream.upgrades.counterMeteor).toBe(false)
  })

  test('charges representable resource steps at the double cap', () => {
    const initial = state()
    const capped = {
      ...initial,
      reality: { ...initial.reality, influence: Number.MAX_VALUE },
      dream: { ...initial.dream, strangeMatter: Number.MAX_VALUE },
    }

    expect(
      purchaseSimulationUpgrade(capped, 'counterMeteor').candidate.dream
        .strangeMatter,
    ).toBe(bitDecrement(Number.MAX_VALUE))
    expect(startDreamEducation(capped, 'engineering').candidate.reality.influence)
      .toBe(bitDecrement(Number.MAX_VALUE))
  })

  test('applies authored education times and completion flags', () => {
    const engineering1 = purchaseSimulationUpgrade(
      withOwned(state(), 'counterMeteor'),
      'engineering1',
    ).candidate
    expect(engineering1.dream.upgrades.engineering1).toBe(true)
    expect(engineering1.dream.education.engineering.researchTime).toBe(
      300,
    )

    const engineering3 = purchaseSimulationUpgrade(
      withOwned(engineering1, 'engineering2'),
      'engineering3',
    ).candidate
    expect(engineering3.dream.education.engineering.complete).toBe(true)
  })

  test('applies exact max and set effects to canonical Dream fields', () => {
    const hunter1 = purchaseSimulationUpgrade(state(), 'hunter1').candidate
    expect(hunter1.dream.resources.hunters).toBe(1n)

    const hunter2 = purchaseSimulationUpgrade(
      withOwned(hunter1, 'hunter1'),
      'hunter2',
    ).candidate
    expect(hunter2.dream.resources.hunters).toBe(10n)

    const hunter4 = purchaseSimulationUpgrade(
      withOwned(hunter2, 'hunter2'),
      'hunter4',
    ).candidate
    expect(hunter4.dream.huntersPerPurchase).toBe(1_000n)

    const rockets1 = purchaseSimulationUpgrade(
      withOwned(state(), 'counterGw'),
      'rockets1',
    ).candidate
    expect(rockets1.dream.parameters.rocketsPerSpaceFactory).toBe(5n)
  })

  test('mathematics III completes research and preserves a higher solar value', () => {
    const eligible = withOwned(state(), 'mathematics2')
    const first = purchaseSimulationUpgrade(
      eligible,
      'mathematics3',
    ).candidate
    expect(first.dream.education.mathematics.complete).toBe(true)
    expect(first.dream.parameters.solarPanelGeneration).toBe(200n)

    const higher = {
      ...eligible,
      dream: {
        ...eligible.dream,
        parameters: {
          ...eligible.dream.parameters,
          solarPanelGeneration: 500n,
        },
      },
    }
    expect(
      purchaseSimulationUpgrade(higher, 'mathematics3').candidate.dream
        .parameters.solarPanelGeneration,
    ).toBe(500n)
  })
})

describe('Dream education transitions', () => {
  test('starts inactive education by debiting its exact influence cost', () => {
    const initial = state()
    const result = startDreamEducation(initial, 'engineering')

    expect(result.code).toBe('started')
    expect(result.candidate.reality.influence).toBe(9_975)
    expect(result.candidate.dream.education.engineering.active).toBe(true)
    expect(initial.reality.influence).toBe(10_000)
    expect(initial.dream.education.engineering.active).toBe(false)
  })

  test('rejects active, fractional-cost, and unaffordable starts', () => {
    const initial = state()
    const active = setEducation(initial, 'engineering', {
      active: true,
    })
    expect(startDreamEducation(active, 'engineering').code).toBe(
      'already_active',
    )

    const fractional = setEducation(initial, 'engineering', {
      cost: 1.5,
    })
    expect(startDreamEducation(fractional, 'engineering').code).toBe(
      'invalid_cost',
    )

    const poor = {
      ...initial,
      reality: { ...initial.reality, influence: 24 },
    }
    expect(startDreamEducation(poor, 'engineering').code).toBe(
      'insufficient_influence',
    )
  })

  test('advances every active subject and preserves completion overshoot', () => {
    let initial = setEducation(state(), 'engineering', {
      active: true,
      progress: 95,
      researchTime: 100,
    })
    initial = setEducation(initial, 'shipping', {
      active: true,
      progress: 10,
      researchTime: 100,
    })
    const result = advanceDreamEducation(initial, 2, 3)

    expect(result.completed).toEqual(['engineering'])
    expect(result.candidate.dream.education.engineering.progress).toBe(
      101,
    )
    expect(result.candidate.dream.education.engineering.complete).toBe(
      true,
    )
    expect(result.candidate.dream.education.shipping.progress).toBe(16)
    expect(result.candidate.dream.education.shipping.complete).toBe(false)
  })

  test('completed and inactive subjects do not advance', () => {
    const initial = setEducation(state(), 'engineering', {
      active: true,
      complete: true,
      progress: 80,
    })
    const result = advanceDreamEducation(initial, 10, 2)

    expect(result.changed).toBe(false)
    expect(result.candidate).toBe(initial)
  })

  test('Mathematics completion enforces legacy solar generation parity', () => {
    const initial = setEducation(state(), 'mathematics', {
      active: true,
      progress: 99,
      researchTime: 100,
    })
    const result = advanceDreamEducation(initial, 1, 1)

    expect(result.completed).toEqual(['mathematics'])
    expect(result.candidate.dream.education.mathematics.complete).toBe(
      true,
    )
    expect(result.candidate.dream.parameters.solarPanelGeneration).toBe(
      200n,
    )
  })

  test('rejects invalid interval inputs without a candidate mutation', () => {
    const initial = state()
    const result = advanceDreamEducation(initial, Number.NaN, 1)

    expect(result.accepted).toBe(false)
    expect(result.changed).toBe(false)
    expect(result.candidate).toBe(initial)
  })
})

function setEducation(
  source: CanonicalGameStateV1,
  id: DreamEducationId,
  values: Partial<
    CanonicalGameStateV1['dream']['education'][DreamEducationId]
  >,
): CanonicalGameStateV1 {
  return {
    ...source,
    dream: {
      ...source.dream,
      education: {
        ...source.dream.education,
        [id]: {
          ...source.dream.education[id],
          ...values,
        },
      },
    },
  }
}
