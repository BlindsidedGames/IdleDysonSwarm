import { describe, expect, test } from 'vitest'

import schema12Web from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { hydrateGameState } from '../game-state/mapping'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import type { CanonicalFacilityId } from '../game-state/types'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import {
  GAME_DECIMAL_ONE,
  compareGameDecimals,
  gameDecimalFromBigInt,
  gameDecimalFromCanonicalString,
  gameDecimalToBigIntChecked,
  gameDecimalToCanonicalString,
  gameDecimalToNumberChecked,
  integerGameDecimalFromCanonicalString,
  integerGameDecimalFromBigInt,
  subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'
import { PreparedSave } from '../save/prepare'
import { deserializeWebSave } from '../save/serialization'
import { previewCanonicalBasicFacilityPurchase } from './canonicalDysonCommands'
import commandsSource from './dysonV2Commands.ts?raw'
import {
  DYSON_V2_CATALOG_CONTRACT_VALID,
  DYSON_V2_COMMAND_TARGETS,
  commitV2DysonFacilityPurchase,
  planV2DysonAutomationTargets,
  quoteV2DysonFacilityPurchase,
  runV2DysonAutomationTick,
} from './dysonV2Commands'

const encoded = gameDecimalToCanonicalString
const TRUSTED_AUTHORITY = Object.freeze({
  kind: 'trusted-same-device' as const,
})

function preparedFixture(): PreparedSave {
  return PreparedSave.fromDecoded(deserializeWebSave(schema12Web))
}

const MIGRATED_FIXTURE_STATE = migratePreparedSaveToV2(
  preparedFixture(),
  TRUSTED_AUTHORITY,
).state

function fixtureState(): CanonicalGameStateV2 {
  return MIGRATED_FIXTURE_STATE
}

type StateOptions = Readonly<{
  money?: string
  facilities?: Partial<Record<
    CanonicalFacilityId,
    readonly [automatic: string, manual: string]
  >>
  buyMode?: CanonicalGameStateV2['dyson']['automation']['buyMode']
  rounded?: boolean
  globalAutomation?: boolean
  enabled?: Partial<Record<CanonicalFacilityId, boolean>>
  retained?: Partial<CanonicalGameStateV2['infinity']['retainedFacilities']>
  assemblyMegaLines?: boolean
  megaUnlocks?: Partial<Pick<
    CanonicalGameStateV2['quantum']['unlocks'],
    'matrioshkaBrains' | 'birchPlanets' | 'galacticBrains'
  >>
  targetIndex?: number
}>

function stateWith(options: StateOptions = {}): CanonicalGameStateV2 {
  const source = fixtureState()
  const facilities = { ...source.dyson.facilities }
  for (const [facilityId, values] of Object.entries(
    options.facilities ?? {},
  )) {
    if (values === undefined) continue
    facilities[facilityId as CanonicalFacilityId] = Object.freeze([
      parseDecimal(values[0]),
      parseIntegerDecimal(values[1]),
    ])
  }
  const assemblyMegaLines = source.skills.byId.assemblyMegaLines
  return cloneCanonicalGameStateV2({
    ...source,
    dyson: {
      ...source.dyson,
      money: options.money === undefined
        ? source.dyson.money
        : parseDecimal(options.money),
      facilities,
      automation: {
        ...source.dyson.automation,
        buyMode: options.buyMode ?? source.dyson.automation.buyMode,
        roundedBulkBuy:
          options.rounded ?? source.dyson.automation.roundedBulkBuy,
        enabledFacilities: {
          ...source.dyson.automation.enabledFacilities,
          ...options.enabled,
        },
      },
    },
    infinity: {
      ...source.infinity,
      retainedFacilities: {
        ...source.infinity.retainedFacilities,
        ...options.retained,
      },
      automationUnlocked: {
        ...source.infinity.automationUnlocked,
        bots: options.globalAutomation ?? source.infinity.automationUnlocked.bots,
      },
    },
    skills: options.assemblyMegaLines === undefined || assemblyMegaLines === undefined
      ? source.skills
      : {
          ...source.skills,
          byId: {
            ...source.skills.byId,
            assemblyMegaLines: {
              ...assemblyMegaLines,
              owned: options.assemblyMegaLines,
            },
          },
        },
    quantum: {
      ...source.quantum,
      unlocks: {
        ...source.quantum.unlocks,
        ...options.megaUnlocks,
      },
    },
    timeline: {
      ...source.timeline,
      dysonAutomationTargetIndex:
        options.targetIndex ?? source.timeline.dysonAutomationTargetIndex,
    },
  })
}

function parseDecimal(value: string): GameDecimal {
  return value.includes('e')
    ? gameDecimalFromCanonicalString(value)
    : gameDecimalFromBigInt(BigInt(value))
}

function parseIntegerDecimal(value: string): GameDecimal {
  return value.includes('e')
    ? integerGameDecimalFromCanonicalString(value)
    : integerGameDecimalFromBigInt(BigInt(value))
}

function allFacilities(
  automatic = '0',
  manual = '0',
): Record<CanonicalFacilityId, readonly [string, string]> {
  return Object.fromEntries(DYSON_V2_COMMAND_TARGETS.map((facilityId) => [
    facilityId,
    [automatic, manual] as const,
  ])) as Record<CanonicalFacilityId, readonly [string, string]>
}

function allEnabled(value: boolean): Record<CanonicalFacilityId, boolean> {
  return Object.fromEntries(DYSON_V2_COMMAND_TARGETS.map((facilityId) => [
    facilityId,
    value,
  ])) as Record<CanonicalFacilityId, boolean>
}

describe('dormant Dyson V2 commands', () => {
  test('independently quotes and commits every Dyson facility target', () => {
    const state = stateWith({
      money: '1e1000',
      facilities: allFacilities('0', '100'),
      assemblyMegaLines: true,
      megaUnlocks: {
        matrioshkaBrains: true,
        birchPlanets: true,
        galacticBrains: true,
      },
    })
    for (const facilityId of DYSON_V2_COMMAND_TARGETS) {
      const quote = quoteV2DysonFacilityPurchase(state, 6, facilityId, 'buy-1', false)
      expect(quote.eligible, `${facilityId}: ${quote.status}`).toBe(true)
      const result = commitV2DysonFacilityPurchase(quote, state, 6)
      expect(result.accepted, `${facilityId}: ${result.status}`).toBe(true)
      expect(result.changed, facilityId).toBe(true)
    }
  })
  test('uses the schema-12 to V2 fixture and the closed generated catalog', () => {
    const state = fixtureState()

    expect(state.modelVersion).toBe(2)
    expect(Object.isFrozen(state)).toBe(true)
    expect(DYSON_V2_CATALOG_CONTRACT_VALID).toBe(true)
    expect(DYSON_V2_COMMAND_TARGETS).toEqual([
      'assembly_lines',
      'ai_managers',
      'servers',
      'data_centers',
      'planets',
      'matrioshka_brains',
      'birch_planets',
      'galactic_brains',
    ])
  })

  test.each([
    ['buy-1', false, '1e0'],
    ['buy-10', false, '1e1'],
    ['buy-10', true, '2e0'],
    ['buy-50', true, '4.2e1'],
    ['buy-100', false, '1e2'],
  ] as const)(
    'quotes and commits %s with rounded=%s all-or-nothing',
    (mode, rounded, expectedBatches) => {
      const state = stateWith({
        money: '1e100',
        facilities: { assembly_lines: ['0', '8'] },
      })
      const quote = quoteV2DysonFacilityPurchase(
        state,
        41,
        'assembly_lines',
        mode,
        rounded,
      )
      const result = commitV2DysonFacilityPurchase(quote, state, 41)

      expect(quote).toMatchObject({
        eligible: true,
        status: 'ready',
        requestedMode: mode,
      })
      expect(encoded(quote.batches)).toBe(expectedBatches)
      expect(result).toMatchObject({
        accepted: true,
        purchased: true,
        changed: true,
        revision: 42,
      })
      expect(encoded(result.state.dyson.facilities.assembly_lines[1]))
        .toBe(encoded(quote.transactionQuote!.expectedOutput))
      expect(state.dyson.facilities.assembly_lines[1]).not.toBe(
        result.state.dyson.facilities.assembly_lines[1],
      )
      expect(encoded(state.dyson.facilities.assembly_lines[1])).toBe('8e0')
      expect(Object.isFrozen(quote)).toBe(true)
      expect(Object.isFrozen(quote.transactionQuote)).toBe(true)
      expect(Object.isFrozen(result.state)).toBe(true)
    },
  )

  test('matches the ordinary-number V1 quote approximately', () => {
    const prepared = preparedFixture()
    const v1Source = hydrateGameState(prepared).state
    const v1 = {
      ...v1Source,
      dyson: {
        ...v1Source.dyson,
        money: 1e12,
        facilities: {
          ...v1Source.dyson.facilities,
          assembly_lines: [0, 8] as const,
        },
        automation: {
          ...v1Source.dyson.automation,
          buyMode: 'buy-10' as const,
          roundedBulkBuy: false,
        },
      },
      infinity: {
        ...v1Source.infinity,
        retainedFacilities: {
          ...v1Source.infinity.retainedFacilities,
          assembly_lines: false,
        },
      },
    }
    const v1Quote = previewCanonicalBasicFacilityPurchase(
      v1,
      'assembly_lines',
    )
    const v2Quote = quoteV2DysonFacilityPurchase(
      stateWith({
        money: '1e12',
        facilities: { assembly_lines: ['0', '8'] },
        retained: { assembly_lines: false },
      }),
      1,
      'assembly_lines',
      'buy-10',
      false,
    )

    expect(gameDecimalToNumberChecked(v2Quote.quotedCost))
      .toBeCloseTo(v1Quote.cost, 9)
    expect(gameDecimalToBigIntChecked(v2Quote.batches))
      .toBe(v1Quote.selectedQuantity)
  })

  test('preserves retained starter-ten pricing and Assembly Megalines planet pricing', () => {
    const retained = quoteV2DysonFacilityPurchase(
      stateWith({
        money: '1e3',
        facilities: {
          assembly_lines: ['0', '10'],
          planets: ['2', '3'],
        },
        retained: { assembly_lines: true },
        assemblyMegaLines: false,
      }),
      1,
      'assembly_lines',
      'buy-1',
    )
    const discounted = quoteV2DysonFacilityPurchase(
      stateWith({
        money: '1e3',
        facilities: {
          assembly_lines: ['0', '10'],
          planets: ['2', '3'],
        },
        retained: { assembly_lines: true },
        assemblyMegaLines: true,
      }),
      1,
      'assembly_lines',
      'buy-1',
    )

    expect(encoded(retained.quotedCost)).toBe('1e2')
    expect(encoded(discounted.quotedCost)).toBe('2e1')
  })

  test('uses strict exact affordability and rejects fixed bulk atomically', () => {
    const ample = stateWith({ money: '1e6' })
    const priced = quoteV2DysonFacilityPurchase(
      ample,
      1,
      'assembly_lines',
      'buy-10',
    )
    const exact = stateWith({ money: encoded(priced.quotedCost) })
    const exactQuote = quoteV2DysonFacilityPurchase(
      exact,
      1,
      'assembly_lines',
      'buy-10',
    )
    const short = stateWith({
      money: encoded(subtractGameDecimals(priced.quotedCost, GAME_DECIMAL_ONE)),
    })
    const shortQuote = quoteV2DysonFacilityPurchase(
      short,
      1,
      'assembly_lines',
      'buy-10',
    )
    const rejected = commitV2DysonFacilityPurchase(shortQuote, short, 1)

    expect(exactQuote.eligible).toBe(true)
    expect(shortQuote.status).toBe('insufficient-funds')
    expect(rejected.state).toBe(short)
    expect(encoded(rejected.debitedAmount)).toBe('0')
    expect(encoded(short.dyson.facilities.assembly_lines[1])).toBe('0')
  })

  test('leaves geometric basic and mega Buy Max bounded only by affordability', () => {
    const basic = quoteV2DysonFacilityPurchase(
      stateWith({ money: '1e100' }),
      1,
      'assembly_lines',
      'buy-max',
    )
    const mega = quoteV2DysonFacilityPurchase(
      stateWith({
        money: '1e100000000',
        facilities: { planets: ['0', '1'] },
        megaUnlocks: { matrioshkaBrains: true },
      }),
      1,
      'matrioshka_brains',
      'buy-max',
    )

    expect(compareGameDecimals(
      basic.batches,
      gameDecimalFromCanonicalString('1e3'),
    )).toBeGreaterThan(0)
    expect(gameDecimalToBigIntChecked(mega.batches))
      .toBeGreaterThan(2_147_483_647n)
    const committed = commitV2DysonFacilityPurchase(
      mega,
      stateWith({
        money: '1e100000000',
        facilities: { planets: ['0', '1'] },
        megaUnlocks: { matrioshkaBrains: true },
      }),
      1,
    )
    expect(committed.accepted).toBe(true)
    expect(gameDecimalToBigIntChecked(committed.unitsGranted))
      .toBeGreaterThan(2_147_483_647n)
  })

  test('enforces generated mega unlocks and prerequisites', () => {
    const locked = quoteV2DysonFacilityPurchase(
      stateWith({
        money: '1e20',
        facilities: { planets: ['0', '1'] },
        megaUnlocks: { matrioshkaBrains: false },
      }),
      1,
      'matrioshka_brains',
    )
    const missingPrerequisite = quoteV2DysonFacilityPurchase(
      stateWith({
        money: '1e20',
        facilities: { planets: ['0', '0'] },
        megaUnlocks: { matrioshkaBrains: true },
      }),
      1,
      'matrioshka_brains',
    )
    const ready = quoteV2DysonFacilityPurchase(
      stateWith({
        money: '1e20',
        facilities: { planets: ['0', '1'] },
        megaUnlocks: { matrioshkaBrains: true },
      }),
      1,
      'matrioshka_brains',
    )

    expect(locked.status).toBe('locked')
    expect(missingPrerequisite.status).toBe('prerequisite-not-met')
    expect(ready.status).toBe('ready')
  })

  test('purchases and retains balances above 1e308 without narrowing', () => {
    const state = stateWith({
      money: '1e400',
      facilities: { assembly_lines: ['0', '4000'] },
    })
    const quote = quoteV2DysonFacilityPurchase(
      state,
      2,
      'assembly_lines',
      'buy-1',
    )
    const result = commitV2DysonFacilityPurchase(quote, state, 2)

    expect(quote.eligible).toBe(true)
    expect(quote.quotedCost.exponent).toBeGreaterThan(308)
    expect(result.accepted).toBe(true)
    expect(result.state.dyson.money.exponent).toBeGreaterThan(308)
    expect(encoded(result.state.dyson.facilities.assembly_lines[1]))
      .toBe('4.001e3')
  })

  test('allows an explicit negligible purchase debit', () => {
    const state = stateWith({ money: '1e400' })
    const quote = quoteV2DysonFacilityPurchase(
      state,
      2,
      'assembly_lines',
      'buy-1',
    )
    const result = commitV2DysonFacilityPurchase(quote, state, 2)

    expect(encoded(quote.debitedAmount)).toBe('0')
    expect(quote.changed).toBe(true)
    expect(result.accepted).toBe(true)
    expect(encoded(result.state.dyson.money)).toBe('1e400')
    expect(encoded(result.state.dyson.facilities.assembly_lines[1]))
      .toBe('1e0')
  })

  test('reports accepted unchanged when debit and output are both negligible', () => {
    const state = stateWith({
      money: '1e400',
      facilities: {
        assembly_lines: ['0', '1e17'],
        planets: ['1e8635983067474500', '0'],
      },
      assemblyMegaLines: true,
    })
    const quote = quoteV2DysonFacilityPurchase(
      state,
      2,
      'assembly_lines',
      'buy-1',
    )
    const result = commitV2DysonFacilityPurchase(quote, state, 2)

    expect(quote.eligible).toBe(true)
    expect(encoded(quote.unitsGranted)).toBe('1e0')
    expect(encoded(quote.debitedAmount)).toBe('0')
    expect(quote.changed).toBe(false)
    expect(result).toMatchObject({
      accepted: true,
      purchased: true,
      changed: false,
      revision: 2,
    })
    expect(result.state).toBe(state)
  })

  test('rejects stale and forged command quotes without trusting caller fields', () => {
    const state = stateWith({ money: '1e6' })
    const issued = quoteV2DysonFacilityPurchase(
      state,
      7,
      'assembly_lines',
    )
    const forged = Object.freeze({
      ...issued,
      facilityId: 'ai_managers' as const,
    })
    let getterCalls = 0
    const accessor = Object.defineProperty({}, 'transactionQuote', {
      get: () => { getterCalls += 1; return issued.transactionQuote },
    })
    const hostileCommit = commitV2DysonFacilityPurchase as unknown as (
      quote: unknown,
      current: CanonicalGameStateV2,
      revision: number,
    ) => ReturnType<typeof commitV2DysonFacilityPurchase>

    expect(commitV2DysonFacilityPurchase(issued, state, 8).status)
      .toBe('stale-revision')
    expect(commitV2DysonFacilityPurchase(forged, state, 7).status)
      .toBe('quote-rejected')
    expect(hostileCommit(accessor, state, 7).status).toBe('quote-rejected')
    expect(hostileCommit(null, state, 7).status).toBe('quote-rejected')
    expect(getterCalls).toBe(0)
  })

  test('rederives command-only price inputs and rejects invalid revisions', () => {
    const quotedState = stateWith({
      money: '1e6',
      facilities: { planets: ['0', '5'] },
      assemblyMegaLines: true,
    })
    const changedPlanets = stateWith({
      money: '1e6',
      facilities: { planets: ['0', '10'] },
      assemblyMegaLines: true,
    })
    const issued = quoteV2DysonFacilityPurchase(
      quotedState,
      7,
      'assembly_lines',
    )

    expect(commitV2DysonFacilityPurchase(issued, changedPlanets, 7).status)
      .toBe('state-mismatch')
    expect(quoteV2DysonFacilityPurchase(
      quotedState,
      Number.MAX_SAFE_INTEGER + 1,
      'assembly_lines',
    ).status).toBe('invalid-state')
    expect(() => runV2DysonAutomationTick(
      quotedState,
      Number.MAX_SAFE_INTEGER,
    )).toThrow(/incrementable application revision/u)
  })
})

describe('dormant Dyson V2 automation harness', () => {
  test('uses the rotated fixed target order and advances one when all skip', () => {
    const state = stateWith({
      targetIndex: 3,
      globalAutomation: false,
      enabled: allEnabled(true),
    })
    const result = runV2DysonAutomationTick(state, 10)

    expect(planV2DysonAutomationTargets(3)).toEqual([
      'data_centers',
      'planets',
      'matrioshka_brains',
      'birch_planets',
      'galactic_brains',
      'assembly_lines',
      'ai_managers',
      'servers',
    ])
    expect(result.attempts).toHaveLength(8)
    expect(result.attempts.every(
      (attempt) => attempt.result.status === 'global-disabled',
    )).toBe(true)
    expect(result.nextTargetIndex).toBe(4)
    expect(result.state.timeline.dysonAutomationTargetIndex).toBe(4)
    expect(result.revision).toBe(11)
    expect(state.timeline.dysonAutomationTargetIndex).toBe(3)
  })

  test('re-evaluates sequential unlocks after every debit and output', () => {
    const state = stateWith({
      money: '1e100',
      facilities: allFacilities(),
      buyMode: 'buy-10',
      globalAutomation: true,
      enabled: allEnabled(true),
      megaUnlocks: {
        matrioshkaBrains: true,
        birchPlanets: true,
        galacticBrains: true,
      },
      targetIndex: 0,
    })
    const result = runV2DysonAutomationTick(state, 20)

    expect(result.attempts.map((attempt) => attempt.facilityId))
      .toEqual(DYSON_V2_COMMAND_TARGETS)
    expect(result.attempts.every((attempt) => attempt.result.purchased))
      .toBe(true)
    expect(DYSON_V2_COMMAND_TARGETS.map((facilityId) =>
      encoded(result.state.dyson.facilities[facilityId][1]),
    )).toEqual(Array.from({ length: 8 }, () => '1e1'))
    expect(encoded(state.dyson.money)).toBe('1e100')
    expect(Object.isFrozen(result.attempts)).toBe(true)
    expect(Object.isFrozen(result.state.dyson.facilities)).toBe(true)
  })

  test('honors per-facility gates and force-buy-max without changing settings', () => {
    const state = stateWith({
      money: '1e100',
      buyMode: 'buy-1',
      globalAutomation: true,
      enabled: {
        ...allEnabled(false),
        assembly_lines: true,
      },
      targetIndex: 0,
    })
    const configured = runV2DysonAutomationTick(
      state,
      30,
      'preserve-configured-mode',
    )
    const forced = runV2DysonAutomationTick(
      state,
      30,
      'force-buy-max',
    )

    expect(encoded(configured.attempts[0]!.quote.batches)).toBe('1e0')
    expect(compareGameDecimals(
      forced.attempts[0]!.quote.batches,
      configured.attempts[0]!.quote.batches,
    )).toBeGreaterThan(0)
    expect(forced.attempts.slice(1).every(
      (attempt) => attempt.result.status === 'facility-disabled',
    )).toBe(true)
    expect(forced.state.dyson.automation.buyMode).toBe('buy-1')
    expect(state.dyson.automation.buyMode).toBe('buy-1')
  })

  test('contains no Decimal-to-number economy narrowing or live imports', () => {
    expect(commandsSource).not.toMatch(/gameDecimalToNumber/u)
    expect(commandsSource).not.toMatch(/\bNumber\s*\(/u)
    expect(commandsSource).not.toContain('Number.MAX_VALUE')
    expect(commandsSource).not.toMatch(/\bInfinity\b/u)
    expect(commandsSource).not.toContain('../application/')
  })
})
