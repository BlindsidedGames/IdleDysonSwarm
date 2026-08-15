import { describe, expect, test } from 'vitest'

import { getGameAsset, getGameAssetsByKind } from '../game-data/catalog'
import type { RuntimeGameAsset } from '../game-data/types'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import type { CanonicalGameStateV2, CanonicalResearchId } from '../game-state/typesV2'
import {
  GAME_DECIMAL_ONE,
  GAME_DECIMAL_ZERO,
  ceilGameDecimal,
  gameDecimalFromCanonicalString,
  gameDecimalFromNumber,
  gameDecimalToCanonicalString,
  isIntegerGameDecimal,
} from '../math/gameDecimal'
import { PreparedSave } from '../save/prepare'
import { deserializeWebSave } from '../save/serialization'
import schema12Web from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import {
  CAPPED_RESEARCH_V2_IDS,
  RESEARCH_V2_CATALOG_CONTRACT_VALID,
  RESEARCH_V2_DEFINITIONS,
  RESEARCH_V2_IDS,
  UNBOUNDED_RESEARCH_V2_IDS,
  commitV2ResearchPurchase,
  planV2ResearchAutomationTargets,
  quoteV2ResearchPurchase,
  resetV2ResearchForInfinity,
  runV2ResearchAutomationTick,
  validateResearchV2CatalogIngress,
} from './researchV2'
import {
  exponentialCostV2,
  geometricSeriesCostV2,
} from './transactionsV2'

const migrated = migratePreparedSaveToV2(
  PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
  Object.freeze({ kind: 'trusted-same-device' as const }),
)
const baseState = migrated.state
const runtime = migrated.runtime

type StateOptions = Readonly<{
  science?: string
  levels?: Readonly<Partial<Record<CanonicalResearchId, string | bigint>>>
  progress?: Readonly<Partial<Record<CanonicalResearchId, string>>>
  automationUnlocked?: boolean
  enabledIds?: readonly CanonicalResearchId[]
  targetIndex?: number
  buyMode?: CanonicalGameStateV2['research']['automation']['buyMode']
  rounded?: boolean
  repeatableResearch?: boolean
  megaFacility?: 'matrioshka_brains' | 'birch_planets' | 'galactic_brains'
}>

function stateWith(options: StateOptions = {}): CanonicalGameStateV2 {
  const levelsById = { ...baseState.research.levelsById }
  for (const [id, value] of Object.entries(options.levels ?? {})) {
    levelsById[id as CanonicalResearchId] = typeof value === 'bigint'
      ? value
      : decimal(value!)
  }
  const enabledById = Object.fromEntries(
    RESEARCH_V2_IDS.map((id) => [id, options.enabledIds?.includes(id) ?? false]),
  ) as Record<CanonicalResearchId, boolean>
  const progressById = { ...baseState.research.progressById }
  for (const [id, value] of Object.entries(options.progress ?? {})) {
    progressById[id as CanonicalResearchId] = decimal(value!)
  }
  const facilities = { ...baseState.dyson.facilities }
  if (options.megaFacility !== undefined) {
    facilities[options.megaFacility] = Object.freeze([
      GAME_DECIMAL_ZERO,
      GAME_DECIMAL_ONE,
    ])
  }
  const repeatable = baseState.skills.byId.repeatableResearch!
  return cloneCanonicalGameStateV2({
    ...baseState,
    dyson: {
      ...baseState.dyson,
      science: decimal(options.science ?? '0'),
      facilities,
    },
    infinity: {
      ...baseState.infinity,
      automationUnlocked: {
        ...baseState.infinity.automationUnlocked,
        research: options.automationUnlocked ?? false,
      },
    },
    skills: {
      ...baseState.skills,
      byId: {
        ...baseState.skills.byId,
        repeatableResearch: {
          ...repeatable,
          owned: options.repeatableResearch ?? false,
        },
      },
    },
    research: {
      ...baseState.research,
      levelsById,
      progressById,
      automation: {
        buyMode: options.buyMode ?? 'buy-1',
        roundedBulkBuy: options.rounded ?? false,
        enabledById,
      },
    },
    timeline: {
      ...baseState.timeline,
      researchAutomationTargetIndex: options.targetIndex ?? 0,
    },
  })
}

function decimal(value: string) {
  return value === '0' || value.includes('e')
    ? gameDecimalFromCanonicalString(value)
    : gameDecimalFromNumber(Number(value))
}

describe('dormant V2 Research commands', () => {
  test('independently quotes and commits every Research catalog entry', () => {
    for (const definition of RESEARCH_V2_DEFINITIONS) {
      const levelsById = Object.fromEntries(RESEARCH_V2_IDS.map((id) => {
        const current = baseState.research.levelsById[id]
        const owned = id === definition.id ? false : true
        return [id, typeof current === 'bigint'
          ? (owned ? 1n : 0n)
          : (owned ? GAME_DECIMAL_ONE : GAME_DECIMAL_ZERO)]
      })) as unknown as CanonicalGameStateV2['research']['levelsById']
      const facilities = Object.fromEntries(Object.keys(baseState.dyson.facilities).map((id) => [
        id,
        Object.freeze([GAME_DECIMAL_ONE, GAME_DECIMAL_ONE]),
      ])) as unknown as CanonicalGameStateV2['dyson']['facilities']
      const source = cloneCanonicalGameStateV2({
        ...baseState,
        dyson: { ...baseState.dyson, science: decimal('1e1000'), facilities },
        research: { ...baseState.research, levelsById },
      })
      const quote = quoteV2ResearchPurchase(
        source,
        runtime,
        5,
        definition.id,
        'buy-1',
        false,
        false,
      )
      expect(quote.eligible, `${definition.id}: ${quote.status}`).toBe(true)
      const result = commitV2ResearchPurchase(quote, source, runtime, 5)
      expect(result.accepted, `${definition.id}: ${result.status}`).toBe(true)
      expect(result.changed, definition.id).toBe(true)
    }
  })
  test('closes the generated catalog to 14 exact definitions and numeric policies', () => {
    expect(RESEARCH_V2_CATALOG_CONTRACT_VALID).toBe(true)
    expect(RESEARCH_V2_IDS).toHaveLength(14)
    expect(new Set(RESEARCH_V2_IDS).size).toBe(14)
    expect(RESEARCH_V2_DEFINITIONS.map((definition) => definition.id)).toEqual(
      RESEARCH_V2_IDS,
    )
    expect(UNBOUNDED_RESEARCH_V2_IDS).toHaveLength(10)
    expect(CAPPED_RESEARCH_V2_IDS).toHaveLength(4)
    expect(RESEARCH_V2_DEFINITIONS.filter(
      (definition) => definition.maximumLevel === 1n,
    ).map((definition) => definition.id)).toEqual(CAPPED_RESEARCH_V2_IDS)
    expect(RESEARCH_V2_DEFINITIONS.filter(
      (definition) => definition.maximumLevel === null,
    ).every((definition) => definition.exponent > 1)).toBe(true)
    expect(Object.isFrozen(RESEARCH_V2_DEFINITIONS)).toBe(true)
    expect(RESEARCH_V2_DEFINITIONS.every(Object.isFrozen)).toBe(true)
  })

  test('descriptor-closes Research and linked Effect generated ingress', () => {
    const researchAssets = structuredClone(
      getGameAssetsByKind('GameData.ResearchDefinition'),
    ) as RuntimeGameAsset[]
    const effectAssets = new Map(RESEARCH_V2_DEFINITIONS.map((definition) => {
      const source = getGameAsset(
        'GameData.ResearchDefinition',
        definition.id,
      )!
      const effectId = (source.data.effects as { id: string }[])[0]!.id
      return [effectId, structuredClone(getGameAsset(
        'GameData.EffectDefinition',
        effectId,
      )!)]
    }))
    const lookup = (_kind: string, id: string) => effectAssets.get(id)
    expect(validateResearchV2CatalogIngress(researchAssets, lookup)).toBe(true)

    const extraData = structuredClone(researchAssets)
    ;(extraData[0]!.data as Record<string, unknown>).unexpected = 1
    expect(validateResearchV2CatalogIngress(extraData, lookup)).toBe(false)

    let getterCalls = 0
    const accessorData = structuredClone(researchAssets)
    Object.defineProperty(accessorData[0]!.data, 'baseCost', {
      enumerable: true,
      get: () => {
        getterCalls += 1
        return 1_000_000
      },
    })
    expect(validateResearchV2CatalogIngress(accessorData, lookup)).toBe(false)
    expect(getterCalls).toBe(0)

    const alteredArray = structuredClone(researchAssets)
    Object.setPrototypeOf(alteredArray[0]!.data.effects, null)
    expect(validateResearchV2CatalogIngress(alteredArray, lookup)).toBe(false)

    const firstEffectId = (researchAssets[0]!.data.effects as { id: string }[])[0]!.id
    const malformedEffect = structuredClone(effectAssets.get(firstEffectId)!)
    ;(malformedEffect.data as Record<string, unknown>).unexpected = true
    expect(validateResearchV2CatalogIngress(
      researchAssets,
      (kind, id) => id === firstEffectId ? malformedEffect : lookup(kind, id),
    )).toBe(false)

    const wrongTarget = structuredClone(effectAssets.get(firstEffectId)!)
    wrongTarget.data.targetStatId = 'Global.MoneyMultiplier'
    expect(validateResearchV2CatalogIngress(
      researchAssets,
      (kind, id) => id === firstEffectId ? wrongTarget : lookup(kind, id),
    )).toBe(false)
  })

  test('quotes and commits integer-ceiled Research without mutating source or progress', () => {
    const state = stateWith({
      science: '1e9',
      levels: { 'research.money_multiplier': '2' },
      progress: { 'research.money_multiplier': '3.75e-1' },
      repeatableResearch: true,
    })
    const before = structuredClone(state)
    const expectedFirst = exponentialCostV2(
      gameDecimalFromNumber(5_000 / 1.1),
      1.77,
      gameDecimalFromNumber(2),
    )
    const expectedCost = ceilGameDecimal(geometricSeriesCostV2(
      expectedFirst,
      1.77,
      GAME_DECIMAL_ONE,
    ))

    const quote = quoteV2ResearchPurchase(
      state,
      runtime,
      7,
      'research.money_multiplier',
    )
    expect(quote.status).toBe('ready')
    expect(quote.quotedCost).toEqual(expectedCost)
    expect(isIntegerGameDecimal(quote.quotedCost)).toBe(true)

    const committed = commitV2ResearchPurchase(quote, state, runtime, 7)
    expect(committed).toMatchObject({
      accepted: true,
      purchased: true,
      changed: true,
      revision: 8,
    })
    expect(gameDecimalToCanonicalString(
      committed.state.research.levelsById['research.money_multiplier'],
    )).toBe('3e0')
    expect(committed.state.research.progressById).toBe(
      state.research.progressById,
    )
    expect(committed.state.research.progressById['research.money_multiplier'])
      .toEqual(gameDecimalFromCanonicalString('3.75e-1'))
    expect(state).toEqual(before)
    expect(Object.isFrozen(committed.state)).toBe(true)
    expect(Object.isFrozen(committed.state.research.levelsById)).toBe(true)
  })

  test('holds Repeatable Research discount fixed at the starting level for a bulk quote', () => {
    const state = stateWith({
      science: '1e12',
      levels: { 'research.money_multiplier': '2' },
      repeatableResearch: true,
      buyMode: 'buy-10',
    })
    const quote = quoteV2ResearchPurchase(
      state,
      runtime,
      0,
      'research.money_multiplier',
    )
    const first = exponentialCostV2(
      gameDecimalFromNumber(5_000 / (1 + 2 * 0.05)),
      1.77,
      gameDecimalFromNumber(2),
    )
    expect(quote.batches).toEqual(gameDecimalFromNumber(10))
    expect(quote.quotedCost).toEqual(ceilGameDecimal(
      geometricSeriesCostV2(first, 1.77, gameDecimalFromNumber(10)),
    ))
  })

  test('floors rounded quantities to the next group and applies capped levels exactly once', () => {
    const rounded = stateWith({
      science: '1e12',
      levels: { 'research.money_multiplier': '3' },
      buyMode: 'buy-10',
      rounded: true,
    })
    expect(quoteV2ResearchPurchase(
      rounded,
      runtime,
      0,
      'research.money_multiplier',
    ).batches).toEqual(gameDecimalFromNumber(7))

    const capped = stateWith({ science: '1e10' })
    const quote = quoteV2ResearchPurchase(
      capped,
      runtime,
      2,
      'research.panel_lifetime_1',
      'buy-100',
    )
    expect(quote.batches).toEqual(GAME_DECIMAL_ONE)
    const committed = commitV2ResearchPurchase(quote, capped, runtime, 2)
    expect(committed.state.research.levelsById['research.panel_lifetime_1']).toBe(1n)
    expect(quoteV2ResearchPurchase(
      committed.state,
      runtime,
      3,
      'research.panel_lifetime_1',
    ).status).toBe('already-maxed')
  })

  test('re-evaluates capped prerequisites sequentially and advances rotation once', () => {
    const startIndex = RESEARCH_V2_IDS.indexOf('research.panel_lifetime_1')
    const state = stateWith({
      science: '2e18',
      automationUnlocked: true,
      targetIndex: startIndex,
    })
    const result = runV2ResearchAutomationTick(state, runtime, 20)

    expect(result.attempts.map((attempt) => attempt.researchId)).toEqual(
      planV2ResearchAutomationTargets(startIndex),
    )
    for (const id of CAPPED_RESEARCH_V2_IDS) {
      expect(result.state.research.levelsById[id]).toBe(1n)
    }
    expect(result.nextTargetIndex).toBe((startIndex + 1) % 14)
    expect(result.revision).toBe(21)
    expect(result.accounting).toMatchObject({
      kind: 'research-v2-phase-accounting',
      sourceRevision: 20,
      visitedResearchCount: 14,
      successfulPurchaseCount: 4,
      progressPolicy: 'preserve-until-infinity-reset',
    })
    expect(result.accounting.purchasedBatches).toEqual(gameDecimalFromNumber(4))
    expect(result.state.research.progressById).toBe(state.research.progressById)
  })

  test('honors global/per-research gates, mega prerequisites, and disabled no-op rotation', () => {
    const disabled = stateWith({ targetIndex: 4 })
    const noOp = runV2ResearchAutomationTick(disabled, runtime, 12)
    expect(noOp.state).toBe(disabled)
    expect(noOp).toMatchObject({ changed: false, revision: 12, startIndex: 4, nextTargetIndex: 4 })
    expect(noOp.attempts).toEqual([])

    const locked = stateWith({
      science: '1e20',
      automationUnlocked: true,
      enabledIds: ['research.matrioshka_brains_upgrade'],
      targetIndex: RESEARCH_V2_IDS.indexOf('research.matrioshka_brains_upgrade'),
    })
    expect(runV2ResearchAutomationTick(locked, runtime, 1).attempts[0]?.quote.status)
      .toBe('prerequisites-not-met')

    const unlocked = stateWith({
      science: '1e20',
      automationUnlocked: true,
      enabledIds: ['research.matrioshka_brains_upgrade'],
      targetIndex: RESEARCH_V2_IDS.indexOf('research.matrioshka_brains_upgrade'),
      megaFacility: 'matrioshka_brains',
    })
    expect(runV2ResearchAutomationTick(unlocked, runtime, 1).attempts[0]?.result.purchased)
      .toBe(true)
  })

  test('forces stored-time Buy Max while configured automation preserves fixed mode', () => {
    const state = stateWith({
      science: '1e9',
      automationUnlocked: true,
      enabledIds: ['research.money_multiplier'],
      targetIndex: RESEARCH_V2_IDS.indexOf('research.money_multiplier'),
      buyMode: 'buy-1',
    })
    const configured = runV2ResearchAutomationTick(
      state,
      runtime,
      2,
      'preserve-configured-mode',
    )
    const forced = runV2ResearchAutomationTick(
      state,
      runtime,
      2,
      'force-buy-max',
    )
    expect(configured.attempts[0]?.result.batches).toEqual(GAME_DECIMAL_ONE)
    expect(forced.attempts[0]?.result.batches).not.toEqual(GAME_DECIMAL_ONE)
    expect(forced.attempts[0]?.quote.requestedMode).toBe('buy-max')
  })

  test('quotes and commits beyond 1e308 without Decimal-to-number narrowing', () => {
    const state = stateWith({ science: '1e500' })
    const quote = quoteV2ResearchPurchase(
      state,
      runtime,
      44,
      'research.money_multiplier',
      'buy-max',
    )
    expect(quote.status).toBe('ready')
    expect(quote.affordableBatches.exponent).toBeGreaterThan(2)
    expect(quote.quotedCost.exponent).toBeGreaterThan(308)
    const result = commitV2ResearchPurchase(quote, state, runtime, 44)
    expect(result.accepted).toBe(true)
    expect(result.state.research.levelsById['research.money_multiplier'].exponent)
      .toBeGreaterThan(2)
  })

  test('reports represented level delta rather than trusting requested batches', () => {
    const state = stateWith({
      science: '1e2000000000000000',
      levels: {
        'research.science_boost': '1e16',
        'research.panel_lifetime_1': 1n,
        'research.panel_lifetime_2': 1n,
        'research.panel_lifetime_3': 1n,
        'research.panel_lifetime_4': 1n,
      },
      automationUnlocked: true,
      enabledIds: ['research.science_boost'],
      targetIndex: RESEARCH_V2_IDS.indexOf('research.science_boost'),
    })
    const quote = quoteV2ResearchPurchase(
      state,
      runtime,
      9,
      'research.science_boost',
    )
    const committed = commitV2ResearchPurchase(quote, state, runtime, 9)
    expect(quote.batches).toEqual(GAME_DECIMAL_ONE)
    expect(committed.batches).toEqual(GAME_DECIMAL_ZERO)
    expect(committed.purchased).toBe(false)
    expect(committed.changed).toBe(false)

    const automated = runV2ResearchAutomationTick(state, runtime, 9)
    expect(automated.accounting.purchasedBatches).toEqual(
      automated.attempts[0]!.result.batches,
    )
    expect(automated.accounting.purchasedBatches).toEqual(GAME_DECIMAL_ZERO)
    expect(automated.accounting.successfulPurchaseCount).toBe(0)
    expect(automated.accounting.scienceDebited).toEqual(GAME_DECIMAL_ZERO)
  })

  test('rejects stale, forged, null, and accessor-backed quotes before attacker reads', () => {
    const state = stateWith({ science: '1e9' })
    const issued = quoteV2ResearchPurchase(
      state,
      runtime,
      6,
      'research.money_multiplier',
    )
    expect(commitV2ResearchPurchase(issued, state, runtime, 7).status)
      .toBe('stale-revision')

    let getterCalls = 0
    const hostile = Object.defineProperty({}, 'sourceRevision', {
      enumerable: true,
      get: () => {
        getterCalls += 1
        throw new Error('must not run')
      },
    })
    expect(() => commitV2ResearchPurchase(
      hostile as never,
      state,
      runtime,
      6,
    )).not.toThrow()
    expect(commitV2ResearchPurchase(hostile as never, state, runtime, 6).status)
      .toBe('quote-rejected')
    expect(commitV2ResearchPurchase(null as never, state, runtime, 6).status)
      .toBe('quote-rejected')
    expect(getterCalls).toBe(0)
  })

  test('descriptor-validates hostile state and runtime before defaults or nested reads', () => {
    let getterCalls = 0
    const hostileState = Object.defineProperty({}, 'research', {
      enumerable: true,
      get: () => {
        getterCalls += 1
        throw new Error('must not run')
      },
    }) as CanonicalGameStateV2
    const hostileRuntime = Object.defineProperty({}, 'dysonTuningProfile', {
      enumerable: true,
      get: () => {
        getterCalls += 1
        throw new Error('must not run')
      },
    }) as typeof runtime

    expect(() => quoteV2ResearchPurchase(
      hostileState,
      runtime,
      0,
      'research.money_multiplier',
    )).not.toThrow()
    expect(quoteV2ResearchPurchase(
      hostileState,
      runtime,
      0,
      'research.money_multiplier',
    ).status).toBe('invalid-state')
    expect(quoteV2ResearchPurchase(
      stateWith(),
      hostileRuntime,
      0,
      'research.money_multiplier',
    ).status).toBe('invalid-state')

    const state = stateWith({ science: '1e9' })
    const issued = quoteV2ResearchPurchase(
      state,
      runtime,
      0,
      'research.money_multiplier',
    )
    expect(() => commitV2ResearchPurchase(
      issued,
      hostileState,
      runtime,
      0,
    )).not.toThrow()
    expect(getterCalls).toBe(0)
  })

  test('resets every closed level and progress leaf while preserving automation', () => {
    const state = stateWith({
      science: '1e9',
      levels: {
        'research.money_multiplier': '123',
        'research.panel_lifetime_1': 1n,
      },
      progress: { 'research.money_multiplier': '5e-1' },
      enabledIds: ['research.money_multiplier'],
      buyMode: 'buy-50',
      rounded: true,
    })
    const reset = resetV2ResearchForInfinity(state)
    expect(Object.keys(reset.research.levelsById)).toEqual(RESEARCH_V2_IDS)
    expect(Object.keys(reset.research.progressById)).toEqual(RESEARCH_V2_IDS)
    for (const id of CAPPED_RESEARCH_V2_IDS) {
      expect(reset.research.levelsById[id]).toBe(0n)
    }
    for (const id of UNBOUNDED_RESEARCH_V2_IDS) {
      expect(reset.research.levelsById[id]).toEqual(GAME_DECIMAL_ZERO)
    }
    expect(Object.values(reset.research.progressById)).toEqual(
      RESEARCH_V2_IDS.map(() => GAME_DECIMAL_ZERO),
    )
    expect(reset.research.automation).toBe(state.research.automation)
    expect(state.research.levelsById['research.panel_lifetime_1']).toBe(1n)
    expect(Object.isFrozen(reset.research.progressById)).toBe(true)
  })
})
