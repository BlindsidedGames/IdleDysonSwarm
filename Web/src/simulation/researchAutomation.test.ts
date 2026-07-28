import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { getGameAssetsByKind } from '../game-data/catalog'
import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { runResearchAutomationTick } from './researchAutomation'
import { buyXCost, maxAffordable } from './transactions'

const fixtureText = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

const researchIds = getGameAssetsByKind('GameData.ResearchDefinition')
  .map((asset) => asset.id)
  .sort()

const neutralTuning: Readonly<DysonCompatibilityTuning> = Object.freeze({
  panelsPerSecMulti: 1,
  scienceBoostPercent: 0,
  moneyMultiUpgradePercent: 0,
  assemblyLineUpgradePercent: 0,
  aiManagerUpgradePercent: 0,
  serverUpgradePercent: 0,
  dataCenterUpgradePercent: 0,
  planetUpgradePercent: 0,
  matrioshkaUpgradePercent: 0,
  birchUpgradePercent: 0,
  galacticUpgradePercent: 0,
})

function stateWith(
  science: number,
  index = 0,
): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixtureText).prepared,
  ).state
  return {
    ...source,
    dyson: {
      ...source.dyson,
      science,
      facilities: {
        assembly_lines: [0, 0],
        ai_managers: [0, 0],
        servers: [0, 0],
        data_centers: [0, 0],
        planets: [0, 0],
        matrioshka_brains: [0, 0],
        birch_planets: [0, 0],
        galactic_brains: [0, 0],
      },
    },
    infinity: {
      ...source.infinity,
      automationUnlocked: {
        ...source.infinity.automationUnlocked,
        research: true,
      },
    },
    skills: {
      ...source.skills,
      byId: Object.fromEntries(
        Object.entries(source.skills.byId).map(([id, skill]) => [
          id,
          { ...skill, owned: false },
        ]),
      ),
    },
    research: {
      ...source.research,
      levelsById: Object.fromEntries(researchIds.map((id) => [id, 0])),
      progressById: {
        'research.money_multiplier': 0.375,
      },
      automation: {
        buyMode: 'buy-1',
        roundedBulkBuy: false,
        enabledById: Object.fromEntries(
          researchIds.map((id) => [id, false]),
        ),
      },
    },
    timeline: {
      ...source.timeline,
      researchAutomationTargetIndex: index,
    },
  }
}

function enable(
  state: CanonicalGameStateV1,
  ...ids: readonly string[]
): CanonicalGameStateV1 {
  return {
    ...state,
    research: {
      ...state.research,
      automation: {
        ...state.research.automation,
        enabledById: {
          ...state.research.automation.enabledById,
          ...Object.fromEntries(ids.map((id) => [id, true])),
        },
      },
    },
  }
}

function withLevels(
  state: CanonicalGameStateV1,
  levels: Readonly<Record<string, number>>,
): CanonicalGameStateV1 {
  return {
    ...state,
    research: {
      ...state.research,
      levelsById: {
        ...state.research.levelsById,
        ...levels,
      },
    },
  }
}

function indexOf(id: string): number {
  const index = researchIds.indexOf(id)
  if (index < 0) throw new Error(`Missing research fixture '${id}'.`)
  return index
}

describe('research automation', () => {
  test('does nothing while the global research automation gate is locked', () => {
    const enabled = stateWith(10_000, 4)
    const state = {
      ...enabled,
      infinity: {
        ...enabled.infinity,
        automationUnlocked: {
          ...enabled.infinity.automationUnlocked,
          research: false,
        },
      },
    }

    const result = runResearchAutomationTick(state, neutralTuning)

    expect(result.state).toBe(state)
    expect(result.visitedResearchIds).toEqual([])
    expect(result.purchases).toEqual([])
    expect(result.state.timeline.researchAutomationTargetIndex).toBe(4)
  })

  test('visits every exported definition in rotated ordinal order and advances even without a purchase', () => {
    const first = runResearchAutomationTick(stateWith(0, -1), neutralTuning)
    const expectedFirst = researchIds.length - 1

    expect(first.visitedResearchIds).toEqual([
      researchIds[expectedFirst],
      ...researchIds.slice(0, expectedFirst),
    ])
    expect(first.purchases).toEqual([])
    expect(first.state.timeline.researchAutomationTargetIndex).toBe(0)

    const second = runResearchAutomationTick(first.state, neutralTuning)
    expect(second.visitedResearchIds).toEqual(researchIds)
    expect(second.state.timeline.researchAutomationTargetIndex).toBe(1)
  })

  test('honors per-research gates while None-group panel research remains eligible', () => {
    const moneyDisabled = runResearchAutomationTick(
      stateWith(5_000, indexOf('research.money_multiplier')),
      neutralTuning,
    )
    expect(moneyDisabled.purchases).toEqual([])

    const panel = runResearchAutomationTick(
      stateWith(1_000_000_000, indexOf('research.panel_lifetime_1')),
      neutralTuning,
    )
    expect(panel.purchases).toEqual([
      {
        researchId: 'research.panel_lifetime_1',
        quantity: 1n,
        cost: 1_000_000_000,
      },
    ])
  })

  test('spends shared science sequentially according to the rotated order', () => {
    const moneyFirst = runResearchAutomationTick(
      enable(
        stateWith(10_000, indexOf('research.money_multiplier')),
        'research.money_multiplier',
        'research.science_boost',
      ),
      neutralTuning,
    )
    expect(moneyFirst.purchases.map((purchase) => purchase.researchId)).toEqual(
      ['research.money_multiplier'],
    )
    expect(moneyFirst.state.dyson.science).toBe(5_000)

    const scienceFirst = runResearchAutomationTick(
      enable(
        stateWith(10_000, indexOf('research.science_boost')),
        'research.money_multiplier',
        'research.science_boost',
      ),
      neutralTuning,
    )
    expect(scienceFirst.purchases.map((purchase) => purchase.researchId)).toEqual(
      ['research.science_boost'],
    )
    expect(scienceFirst.state.dyson.science).toBe(0)
  })

  test('applies buy amount and rounded-bulk behavior to level and cost', () => {
    const currentLevel = 8
    const unroundedCost = buyXCost(10n, 5_000, 1.77, currentLevel)
    const roundedCost = buyXCost(2n, 5_000, 1.77, currentLevel)
    const base = withLevels(
      enable(
        stateWith(unroundedCost, indexOf('research.money_multiplier')),
        'research.money_multiplier',
      ),
      { 'research.money_multiplier': currentLevel },
    )
    const unrounded = runResearchAutomationTick(
      {
        ...base,
        research: {
          ...base.research,
          automation: {
            ...base.research.automation,
            buyMode: 'buy-10',
            roundedBulkBuy: false,
          },
        },
      },
      neutralTuning,
    )
    expect(unrounded.purchases[0]?.quantity).toBe(10n)
    expect(unrounded.state.research.levelsById['research.money_multiplier'])
      .toBe(18)

    const roundedBase = {
      ...base,
      dyson: { ...base.dyson, science: roundedCost },
      research: {
        ...base.research,
        automation: {
          ...base.research.automation,
          buyMode: 'buy-10' as const,
          roundedBulkBuy: true,
        },
      },
    }
    const rounded = runResearchAutomationTick(roundedBase, neutralTuning)
    expect(rounded.purchases[0]?.quantity).toBe(2n)
    expect(rounded.purchases[0]?.cost).toBe(roundedCost)
    expect(rounded.state.research.levelsById['research.money_multiplier'])
      .toBe(10)

    const maxScience = 50_000
    const affordable = maxAffordable(maxScience, 5_000, 1.77, 0)
    const maxBase = enable(
      stateWith(maxScience, indexOf('research.money_multiplier')),
      'research.money_multiplier',
    )
    const max = runResearchAutomationTick(
      {
        ...maxBase,
        research: {
          ...maxBase.research,
          automation: {
            ...maxBase.research.automation,
            buyMode: 'buy-max',
          },
        },
      },
      neutralTuning,
    )
    expect(max.purchases[0]?.quantity).toBe(affordable)
    expect(max.state.research.levelsById['research.money_multiplier'])
      .toBe(Number(affordable))
  })

  test('uses updated levels for prerequisite research later in the same pass', () => {
    const science = 1_001_000_000_000
    const panelOneFirst = runResearchAutomationTick(
      stateWith(science, indexOf('research.panel_lifetime_1')),
      neutralTuning,
    )
    expect(panelOneFirst.purchases.map((purchase) => purchase.researchId))
      .toEqual([
        'research.panel_lifetime_1',
        'research.panel_lifetime_2',
      ])

    const panelTwoFirst = runResearchAutomationTick(
      stateWith(science, indexOf('research.panel_lifetime_2')),
      neutralTuning,
    )
    expect(panelTwoFirst.purchases.map((purchase) => purchase.researchId))
      .toEqual(['research.panel_lifetime_1'])
  })

  test('requires automatic plus manual facility ownership for mega research', () => {
    const panelLevels = {
      'research.panel_lifetime_1': 1,
      'research.panel_lifetime_2': 1,
      'research.panel_lifetime_3': 1,
      'research.panel_lifetime_4': 1,
    }
    const locked = withLevels(
      enable(
        stateWith(
          10_000_000_000,
          indexOf('research.matrioshka_brains_upgrade'),
        ),
        'research.matrioshka_brains_upgrade',
      ),
      panelLevels,
    )
    expect(runResearchAutomationTick(locked, neutralTuning).purchases)
      .toEqual([])

    const unlocked = {
      ...locked,
      dyson: {
        ...locked.dyson,
        facilities: {
          ...locked.dyson.facilities,
          matrioshka_brains: [0, 1] as const,
        },
      },
    }
    expect(
      runResearchAutomationTick(unlocked, neutralTuning).purchases[0]
        ?.researchId,
    ).toBe('research.matrioshka_brains_upgrade')
  })

  test('applies Repeatable Research cost reduction and preserves progress without mutating input', () => {
    const level = 2
    const tuning = {
      ...neutralTuning,
      moneyMultiUpgradePercent: 0.5,
    }
    const discountedCost = buyXCost(
      1n,
      5_000 / (1 + level * tuning.moneyMultiUpgradePercent),
      1.77,
      level,
    )
    const base = withLevels(
      enable(
        stateWith(discountedCost, indexOf('research.money_multiplier')),
        'research.money_multiplier',
      ),
      { 'research.money_multiplier': level },
    )
    const state = {
      ...base,
      skills: {
        ...base.skills,
        byId: {
          ...base.skills.byId,
          repeatableResearch: {
            ...base.skills.byId.repeatableResearch,
            owned: true,
          },
        },
      },
    }
    const before = structuredClone(state)

    const result = runResearchAutomationTick(state, tuning)

    expect(result.purchases[0]?.cost).toBe(discountedCost)
    expect(result.state.research.levelsById['research.money_multiplier'])
      .toBe(3)
    expect(result.state.research.progressById).toBe(
      state.research.progressById,
    )
    expect(result.state.research.progressById['research.money_multiplier'])
      .toBe(0.375)
    expect(state).toEqual(before)

    const withoutSkill = {
      ...state,
      skills: {
        ...state.skills,
        byId: {
          ...state.skills.byId,
          repeatableResearch: {
            ...state.skills.byId.repeatableResearch,
            owned: false,
          },
        },
      },
    }
    expect(
      runResearchAutomationTick(withoutSkill, tuning).purchases,
    ).toEqual([])
  })
})
