import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { getGameAssetsByKind } from '../game-data/catalog'
import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  previewCanonicalResearchPurchase,
  purchaseCanonicalResearch,
  runResearchAutomationTick,
  selectCanonicalResearchPresentationFacts,
} from './researchAutomation'
import {
  buyXCost,
  maxAffordable,
  tryDebitContinuous,
} from './transactions'

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
  test('uses Secret research coefficients for presentation and Repeatable Research pricing', () => {
    const level = 2
    const base = withLevels(stateWith(Number.MAX_VALUE), {
      'research.assembly_line_upgrade': level,
    })
    const state: CanonicalGameStateV1 = {
      ...base,
      infinity: { ...base.infinity, secretsOfTheUniverse: 1n },
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
    const coefficient = Math.fround(0.06)
    const expectedCost = buyXCost(
      1n,
      50_000 / (1 + level * coefficient),
      1.4,
      level,
    )

    expect(selectCanonicalResearchPresentationFacts(
      state,
      { ...neutralTuning, assemblyLineUpgradePercent: 0.03 },
      'research.assembly_line_upgrade',
      1n,
    )).toMatchObject({
      perLevelEffect: coefficient * 100,
      currentEffect: coefficient * 200,
      projectedEffect: coefficient * 300,
    })
    expect(previewCanonicalResearchPurchase(
      state,
      { ...neutralTuning, assemblyLineUpgradePercent: 0.03 },
      'research.assembly_line_upgrade',
    ).cost).toBe(expectedCost)
  })

  test('keeps canonical unlock visibility independent from maxed presentation', () => {
    const state = withLevels(stateWith(0), {
      'research.panel_lifetime_1': 1,
    })
    expect(selectCanonicalResearchPresentationFacts(
      state,
      neutralTuning,
      'research.panel_lifetime_1',
      0n,
    )).toMatchObject({
      prerequisitesMet: true,
      visible: true,
      maxed: true,
    })
  })

  test('previews the exact manual purchase consumed by execution', () => {
    const state = stateWith(5_000)
    const before = structuredClone(state)
    const preview = previewCanonicalResearchPurchase(
      state,
      neutralTuning,
      'research.money_multiplier',
    )
    const result = purchaseCanonicalResearch(
      state,
      neutralTuning,
      'research.money_multiplier',
    )

    expect(preview).toEqual({
      researchId: 'research.money_multiplier',
      eligible: true,
      code: 'purchasable',
      currentLevel: 0,
      maximumLevel: null,
      selectedQuantity: 1n,
      affordableQuantity: 1n,
      cost: 5_000,
      issue: null,
    })
    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      purchase: {
        researchId: preview.researchId,
        quantity: preview.selectedQuantity,
        cost: preview.cost,
      },
    })
    expect(Object.isFrozen(preview)).toBe(true)
    expect(state).toEqual(before)
  })

  test('previews unaffordable, prerequisite, and unknown research without optimistic eligibility', () => {
    const poor = stateWith(1)
    expect(
      previewCanonicalResearchPurchase(
        poor,
        neutralTuning,
        'research.money_multiplier',
      ),
    ).toMatchObject({
      eligible: false,
      code: 'insufficient-science',
      selectedQuantity: 1n,
      affordableQuantity: 0n,
      cost: 5_000,
    })
    expect(
      previewCanonicalResearchPurchase(
        stateWith(1_000_000_000),
        neutralTuning,
        'research.panel_lifetime_2',
      ),
    ).toMatchObject({
      eligible: false,
      code: 'prerequisites-not-met',
    })
    expect(
      previewCanonicalResearchPurchase(
        poor,
        neutralTuning,
        'research.missing',
      ),
    ).toMatchObject({
      eligible: false,
      code: 'unknown-research',
    })
  })

  test('manual purchases use authored buy-mode math without requiring automation', () => {
    const state = stateWith(5_000)
    const result = purchaseCanonicalResearch(
      state,
      neutralTuning,
      'research.money_multiplier',
    )

    expect(result.accepted).toBe(true)
    if (!result.accepted) return
    expect(result.purchase).toEqual({
      researchId: 'research.money_multiplier',
      quantity: 1n,
      cost: 5_000,
    })
    expect(result.state.dyson.science).toBe(0)
    expect(
      result.state.research.levelsById['research.money_multiplier'],
    ).toBe(1)
    expect(state.research.automation.enabledById[
      'research.money_multiplier'
    ]).toBe(false)
  })

  test('manual purchases fail closed for unknown and unmet-prerequisite research', () => {
    const state = stateWith(1_000_000_000)
    expect(
      purchaseCanonicalResearch(state, neutralTuning, 'research.missing'),
    ).toMatchObject({
      accepted: false,
      code: 'RESEARCH-UNKNOWN',
      state,
    })
    expect(
      purchaseCanonicalResearch(
        state,
        neutralTuning,
        'research.panel_lifetime_2',
      ),
    ).toMatchObject({
      accepted: false,
      code: 'RESEARCH-PREREQUISITE',
      state,
    })
  })

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

  test('forces Buy Max for stored-time policy without changing the configured research mode', () => {
    const science = 50_000
    const affordable = maxAffordable(science, 5_000, 1.77, 0)
    const state = enable(
      stateWith(science, indexOf('research.money_multiplier')),
      'research.money_multiplier',
    )

    const configured = runResearchAutomationTick(
      state,
      neutralTuning,
    )
    const forced = runResearchAutomationTick(
      state,
      neutralTuning,
      'force-buy-max',
    )

    expect(configured.purchases[0]?.quantity).toBe(1n)
    expect(forced.purchases[0]?.quantity).toBe(affordable)
    expect(forced.state.research.automation.buyMode).toBe('buy-1')
    expect(state.research.automation.buyMode).toBe('buy-1')
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

  test('keeps a finite buy-1 research quote purchasable at MAX for manual and automation paths', () => {
    const input = withLevels(
      enable(
        stateWith(
          Number.MAX_VALUE,
          indexOf('research.money_multiplier'),
        ),
        'research.money_multiplier',
      ),
      {
        'research.panel_lifetime_1': 1,
        'research.panel_lifetime_2': 1,
        'research.panel_lifetime_3': 1,
        'research.panel_lifetime_4': 1,
      },
    )
    const expectedDebit = tryDebitContinuous(Number.MAX_VALUE, 5_000)

    const preview = previewCanonicalResearchPurchase(
      input,
      neutralTuning,
      'research.money_multiplier',
    )
    const manual = purchaseCanonicalResearch(
      input,
      neutralTuning,
      'research.money_multiplier',
    )
    const automatic = runResearchAutomationTick(input, neutralTuning)

    expect(preview).toMatchObject({
      eligible: true,
      code: 'purchasable',
      selectedQuantity: 1n,
      cost: 5_000,
    })
    expect(manual).toMatchObject({
      accepted: true,
      changed: true,
      purchase: {
        researchId: preview.researchId,
        quantity: preview.selectedQuantity,
        cost: preview.cost,
      },
    })
    expect(automatic.purchases).toEqual([manual.purchase])
    expect(manual.state.dyson.science).toBe(expectedDebit.balance)
    expect(automatic.state.dyson.science).toBe(expectedDebit.balance)
    expect(expectedDebit.charged).toBeGreaterThan(preview.cost)
    expect(input.dyson.science).toBe(Number.MAX_VALUE)
  })

  test('buy-max selects the greatest finite research quote at MAX across preview and execution', () => {
    const base = withLevels(
      enable(
        stateWith(
          Number.MAX_VALUE,
          indexOf('research.money_multiplier'),
        ),
        'research.money_multiplier',
      ),
      {
        'research.panel_lifetime_1': 1,
        'research.panel_lifetime_2': 1,
        'research.panel_lifetime_3': 1,
        'research.panel_lifetime_4': 1,
      },
    )
    const input = {
      ...base,
      research: {
        ...base.research,
        automation: {
          ...base.research.automation,
          buyMode: 'buy-max' as const,
        },
      },
    }
    const quantity = maxAffordable(
      Number.MAX_VALUE,
      5_000,
      1.77,
      0,
    )
    const cost = buyXCost(quantity, 5_000, 1.77, 0)
    const expectedDebit = tryDebitContinuous(
      Number.MAX_VALUE,
      cost,
      quantity,
    )

    expect(quantity).toBe(1_227n)
    expect(cost).toBe(1.1903566571205716e308)
    expect(buyXCost(quantity + 1n, 5_000, 1.77, 0))
      .toBe(Number.MAX_VALUE)

    const preview = previewCanonicalResearchPurchase(
      input,
      neutralTuning,
      'research.money_multiplier',
    )
    const manual = purchaseCanonicalResearch(
      input,
      neutralTuning,
      'research.money_multiplier',
    )
    const automatic = runResearchAutomationTick(input, neutralTuning)

    expect(preview).toMatchObject({
      eligible: true,
      code: 'purchasable',
      selectedQuantity: quantity,
      affordableQuantity: quantity,
      cost,
    })
    expect(manual).toMatchObject({
      accepted: true,
      changed: true,
      purchase: {
        quantity: preview.selectedQuantity,
        cost: preview.cost,
      },
    })
    expect(automatic.purchases).toEqual([manual.purchase])
    expect(manual.state.dyson.science).toBe(expectedDebit.balance)
    expect(automatic.state.dyson.science).toBe(expectedDebit.balance)
  })

  test('treats a saturated research price as terminal without mutating balances or levels', () => {
    const input = withLevels(
      enable(
        stateWith(
          Number.MAX_VALUE,
          indexOf('research.money_multiplier'),
        ),
        'research.money_multiplier',
      ),
      {
        'research.money_multiplier': 1_229,
        'research.panel_lifetime_1': 1,
        'research.panel_lifetime_2': 1,
        'research.panel_lifetime_3': 1,
        'research.panel_lifetime_4': 1,
      },
    )

    const preview = previewCanonicalResearchPurchase(
      input,
      neutralTuning,
      'research.money_multiplier',
    )
    const manual = purchaseCanonicalResearch(
      input,
      neutralTuning,
      'research.money_multiplier',
    )
    const automatic = runResearchAutomationTick(input, neutralTuning)

    expect(preview).toMatchObject({
      eligible: false,
      code: 'output-maxed',
      selectedQuantity: 1n,
      affordableQuantity: 0n,
      cost: Number.MAX_VALUE,
    })
    expect(manual).toMatchObject({
      accepted: false,
      code: 'RESEARCH-UNAFFORDABLE',
      state: input,
    })
    expect(automatic.purchases).toEqual([])
    expect(automatic.state.dyson.science).toBe(Number.MAX_VALUE)
    expect(
      automatic.state.research.levelsById['research.money_multiplier'],
    ).toBe(1_229)
  })
})
