import { describe, expect, test } from 'vitest'

import firstRunIdb1 from '../application/firstRun/generated/first-run-schema-12.idb1.txt?raw'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import type { CanonicalFacilityId } from '../game-state/types'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import { validateCanonicalGameStateV2 } from '../game-state/validateV2'
import {
  gameDecimalFromCanonicalString,
  gameDecimalFromNumber,
  gameDecimalToCanonicalString,
  isIntegerGameDecimal,
  type GameDecimal,
} from '../math/gameDecimal'
import { prepareIdb1Save } from '../save/prepare'
import { deriveCanonicalBotAllocation } from './canonicalBotAllocation'
import {
  combineDysonProductionArrivalRates,
  type DysonProductionArrivalRates,
} from './dysonProductionArrivals'
import {
  createBasicDysonState,
  type BasicDysonState,
} from './dysonModel'
import {
  advanceActiveDysonV2Production,
  advanceOfflineDysonV2Production,
  applyCapturedDysonV2ProductionKernel,
  createNeutralDysonV2DerivationParameters,
  deriveDysonV2BotAllocation,
  deriveDysonV2FacilityContributionRows,
  deriveDysonV2Production,
  DYSON_V2_FACILITY_IDS,
  type DysonV2DerivationParameters,
} from './dysonV2Production'
import { deriveMegaStructureRates } from './megaStructureRates'
import { deriveDysonIntermediates } from './dysonDerivedIntermediates'
import { calculateStat } from './stat'

const baseState = migratePreparedSaveToV2(
  prepareIdb1Save(firstRunIdb1).prepared,
  { kind: 'trusted-same-device' },
).state

const facilityValues = Object.freeze({
  assembly_lines: [2.5, 3],
  ai_managers: [4.25, 1],
  servers: [2.5, 0],
  data_centers: [1.25, 0],
  planets: [1.5, 0],
  matrioshka_brains: [2.25, 3],
  birch_planets: [4.5, 1],
  galactic_brains: [1.25, 1],
} as const satisfies Readonly<Record<CanonicalFacilityId, readonly [number, number]>>)

const modifierValues = Object.freeze({
  assembly_lines: 2,
  ai_managers: 3,
  servers: 4,
  data_centers: 5,
  planets: 6,
  matrioshka_brains: 7,
  birch_planets: 8,
  galactic_brains: 9,
} as const satisfies Readonly<Record<CanonicalFacilityId, number>>)

function decimal(value: number | string): GameDecimal {
  return typeof value === 'number'
    ? gameDecimalFromNumber(value)
    : gameDecimalFromCanonicalString(value)
}

function stateWith(
  options: Readonly<{
    bots?: number | string
    distribution?: number
    facilities?: Readonly<
      Partial<Record<CanonicalFacilityId, readonly [number | string, number]>>
    >
    resources?: Readonly<{
      money?: number | string
      science?: number | string
      panels?: number | string
    }>
    multitasking?: boolean
    ownedSkills?: readonly string[]
    pocketAndroidTimer?: number
  }> = {},
): CanonicalGameStateV2 {
  const facilities = Object.fromEntries(
    DYSON_V2_FACILITY_IDS.map((id) => {
      const pair = options.facilities?.[id] ?? facilityValues[id]
      return [id, Object.freeze([decimal(pair[0]), decimal(pair[1])])]
    }),
  ) as CanonicalGameStateV2['dyson']['facilities']
  const ownedSkills = new Set(options.ownedSkills ?? [])
  return cloneCanonicalGameStateV2({
    ...baseState,
    dyson: {
      ...baseState.dyson,
      money: decimal(options.resources?.money ?? 10),
      science: decimal(options.resources?.science ?? 20),
      bots: decimal(options.bots ?? 100.75),
      workers: decimal(0),
      researchers: decimal(0),
      totalPanelsDecayed: decimal(options.resources?.panels ?? 30),
      botDistribution: options.distribution ?? 0.125,
      facilities,
    },
    quantum: {
      ...baseState.quantum,
      unlocks: {
        ...baseState.quantum.unlocks,
        botMultitasking: options.multitasking ?? false,
        matrioshkaBrains: true,
        birchPlanets: true,
        galacticBrains: true,
      },
    },
    skills: {
      ...baseState.skills,
      byId: Object.fromEntries(
        Object.entries(baseState.skills.byId).map(([id, skill]) => [
          id,
          {
            ...skill,
            owned: ownedSkills.has(id),
            timerSeconds: id === 'pocketAndroids'
              ? options.pocketAndroidTimer ?? skill.timerSeconds
              : skill.timerSeconds,
          },
        ]),
      ),
    },
  })
}

function parametersWith(
  overrides: Partial<DysonV2DerivationParameters> = {},
): Readonly<DysonV2DerivationParameters> {
  const neutral = createNeutralDysonV2DerivationParameters()
  return Object.freeze({
    ...neutral,
    panelRateMultiplier: decimal(2),
    panelLifetimeSeconds: decimal(8),
    moneyMultiplier: decimal(3),
    scienceMultiplier: decimal(4),
    planetGenerationPerSecond: decimal(5),
    facilityModifiers: Object.freeze(
      Object.fromEntries(
        DYSON_V2_FACILITY_IDS.map((id) => [id, decimal(modifierValues[id])]),
      ) as Record<CanonicalFacilityId, GameDecimal>,
    ),
    ...overrides,
  })
}

function asCanonicalNumbers(
  rates: Readonly<Record<string, number>>,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(rates).map(([id, value]) => [
      id,
      gameDecimalToCanonicalString(decimal(value)),
    ]),
  )
}

function asCanonicalDecimals(
  rates: Readonly<Record<string, GameDecimal>>,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(rates).map(([id, value]) => [
      id,
      gameDecimalToCanonicalString(value),
    ]),
  )
}

function normalizedDecimal(value: GameDecimal): string {
  // Test-only approximate compatibility normalization for legacy binary-double
  // authorities and differently partitioned Decimal operation sequences.
  if (value.mantissa === 0) return '0'
  return `${Number(value.mantissa.toPrecision(14))}e${value.exponent}`
}

function asNormalizedNumbers(
  rates: Readonly<Record<string, number>>,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(rates).map(([id, value]) => [id, normalizedDecimal(decimal(value))]),
  )
}

function asNormalizedDecimals(
  rates: Readonly<Record<string, GameDecimal>>,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(rates).map(([id, value]) => [id, normalizedDecimal(value)]),
  )
}

function normalizedDysonSnapshot(state: CanonicalGameStateV2): unknown {
  return {
    money: normalizedDecimal(state.dyson.money),
    science: normalizedDecimal(state.dyson.science),
    bots: normalizedDecimal(state.dyson.bots),
    workers: normalizedDecimal(state.dyson.workers),
    researchers: normalizedDecimal(state.dyson.researchers),
    panels: normalizedDecimal(state.dyson.totalPanelsDecayed),
    facilities: Object.fromEntries(
      DYSON_V2_FACILITY_IDS.map((id) => [
        id,
        state.dyson.facilities[id].map(normalizedDecimal),
      ]),
    ),
  }
}

function v1Authority(): Readonly<{
  state: BasicDysonState
  arrivals: Readonly<DysonProductionArrivalRates>
}> {
  const allocationState = {
    ...baseState,
    dyson: {
      ...baseState.dyson,
      bots: 100.75,
      botDistribution: 0.125,
    },
  } as unknown as Parameters<typeof deriveCanonicalBotAllocation>[0]
  const allocation = deriveCanonicalBotAllocation(allocationState)
  const state = createBasicDysonState({
    money: 10,
    science: 20,
    bots: 100.75,
    panels: 30,
    workers: allocation.workers,
    researchers: allocation.researchers,
    moneyMultiplier: 3,
    scienceMultiplier: 4,
    panelRateMultiplier: 2,
    panelLifetime: 8,
    planetGenerationPerSecond: 5,
    ownedSkills: [],
    facilities: {
      assembly_lines: [...facilityValues.assembly_lines],
      ai_managers: [...facilityValues.ai_managers],
      servers: [...facilityValues.servers],
      data_centers: [...facilityValues.data_centers],
      planets: [...facilityValues.planets],
    },
    modifiers: {
      assembly_lines: modifierValues.assembly_lines,
      ai_managers: modifierValues.ai_managers,
      servers: modifierValues.servers,
      data_centers: modifierValues.data_centers,
      planets: modifierValues.planets,
    },
    modifierEffectsApplied: true,
    automation: {
      enabledFacilities: [],
      buyMode: 'buy-1',
      roundedBulkBuy: false,
    },
  })
  const mega = deriveMegaStructureRates(
    {
      dyson: {
        facilities: {
          matrioshka_brains: [...facilityValues.matrioshka_brains],
          birch_planets: [...facilityValues.birch_planets],
          galactic_brains: [...facilityValues.galactic_brains],
        },
      },
      quantum: {
        unlocks: {
          matrioshkaBrains: true,
          birchPlanets: true,
          galacticBrains: true,
        },
      },
    },
    {
      matrioshka_brains: modifierValues.matrioshka_brains,
      birch_planets: modifierValues.birch_planets,
      galactic_brains: modifierValues.galactic_brains,
    },
  )
  if (!mega.ok) throw new Error(JSON.stringify(mega.issues))
  return {
    state,
    arrivals: combineDysonProductionArrivalRates(state.rates, mega.rates),
  }
}

describe('dormant Dyson V2 production', () => {
  test('preserves an exact negative presentation delta beyond Number range', () => {
    const source = stateWith()
    const parameters = parametersWith()
    const withEffects = Object.freeze({ ...parameters, effects: Object.freeze({
      assembly_lines: Object.freeze([
        Object.freeze({ id: 'huge', operation: 'override' as const, value: decimal('1e1000'), order: 1 }),
        Object.freeze({ id: 'zero', operation: 'override' as const, value: decimal(0), order: 2 }),
      ]),
    }) })
    const production = deriveDysonV2Production(source, withEffects)
    const rows = deriveDysonV2FacilityContributionRows(source, withEffects, production).assembly_lines
    const negative = rows.find(({ sourceId }) => sourceId === 'zero')!.delta
    expect(negative).toMatchObject({ sign: -1 })
    if (!('magnitude' in negative)) throw new Error('Expected signed magnitude.')
    expect(gameDecimalToCanonicalString(negative.magnitude)).toBe('1e1000')
  })
  test('matches representable V1 rates within test-only approximate parity', () => {
    const source = stateWith()
    const v1 = v1Authority()
    const actual = deriveDysonV2Production(source, parametersWith())

    expect(asNormalizedDecimals(actual.rates)).toEqual(
      asNormalizedNumbers(v1.arrivals),
    )
    expect(asCanonicalDecimals(actual.allocation)).toEqual(
      asCanonicalNumbers({
        workers: v1.state.workers,
        researchers: v1.state.researchers,
      }),
    )
    expect(asCanonicalDecimals(actual.effectiveFacilityCounts)).toEqual(
      asCanonicalNumbers(
        Object.fromEntries(
          DYSON_V2_FACILITY_IDS.map((id) => [
            id,
            facilityValues[id][0] + facilityValues[id][1],
          ]),
        ),
      ),
    )
    expect(asNormalizedDecimals(actual.facilityProducerRates)).toEqual(
      asNormalizedNumbers({
        assembly_lines: v1.state.rates.bots,
        ai_managers: v1.state.rates.assembly_lines,
        servers: v1.state.rates.ai_managers,
        data_centers: v1.state.rates.servers,
        planets: v1.state.rates.data_centers,
        matrioshka_brains: v1.arrivals.planets - 5,
        birch_planets: v1.arrivals.matrioshka_brains,
        galactic_brains: v1.arrivals.birch_planets,
      }),
    )
  })

  test.each([0.1, 0.33333334, 0.875])(
    'preserves the V1 float allocation operation order at %s',
    (distribution) => {
      const source = stateWith({ distribution })
      const v1Source = {
        ...baseState,
        dyson: {
          ...baseState.dyson,
          bots: 12_345.75,
          botDistribution: distribution,
        },
      } as unknown as Parameters<typeof deriveCanonicalBotAllocation>[0]
      const v1 = deriveCanonicalBotAllocation(v1Source)
      const v2 = deriveDysonV2BotAllocation(
        stateWith({ bots: 12_345.75, distribution }),
      )
      expect(asCanonicalDecimals(v2)).toEqual(asCanonicalNumbers(v1))
      expect(source.dyson.botDistribution).toBe(distribution)
    },
  )

  test('preserves effect order and legacy epsilon modifier omission', () => {
    const source = stateWith({
      facilities: { assembly_lines: [5, 0] },
    })
    const effects = Object.freeze({
      assembly_lines: Object.freeze([
        {
          id: 'late-multiply',
          operation: 'multiply' as const,
          value: decimal(3),
          order: 30,
        },
        {
          id: 'early-add',
          operation: 'add' as const,
          value: decimal(2),
          order: 20,
        },
      ]),
    })
    const modifiers = Object.freeze({
      ...parametersWith().facilityModifiers,
      assembly_lines: decimal('1.0000000000005e0'),
    })
    const actual = deriveDysonV2Production(
      source,
      parametersWith({ facilityModifiers: modifiers, effects }),
    )
    const legacyBase = Math.fround(0.1)
    const expected = (legacyBase * 5 + 2) * 3
    expect(normalizedDecimal(actual.rates.bots)).toBe(
      normalizedDecimal(decimal(expected)),
    )
  })

  test('translates the generated Burn Out lifetime penalty without signed Decimal state', () => {
    const legacyLifetime = calculateStat(10, [
      {
        id: 'effect.burnOut.panel_lifetime',
        operation: 'add',
        value: -5,
        order: 10,
      },
    ])
    const effects = Object.freeze({
      panelLifetimeSeconds: Object.freeze([
        {
          id: 'effect.burnOut.panel_lifetime',
          operation: 'subtract' as const,
          value: decimal(5),
          order: 10,
        },
      ]),
    })
    const actual = deriveDysonV2Production(
      stateWith(),
      parametersWith({ panelLifetimeSeconds: decimal(10), effects }),
    )

    expect(gameDecimalToCanonicalString(actual.panelLifetimeSeconds)).toBe(
      gameDecimalToCanonicalString(decimal(legacyLifetime)),
    )
    expect(() =>
      deriveDysonV2Production(
        stateWith(),
        parametersWith({
          panelLifetimeSeconds: decimal(4),
          effects,
        }),
      ),
    ).toThrow('would make its target negative')
  })

  test('matches V1 dynamic intermediates within test-only approximate parity', () => {
    const ownedSkills = [
      'rudimentarySingularity',
      'unsuspiciousAlgorithms',
      'clusterNetworking',
      'pocketDimensions',
      'pocketMultiverse',
      'dimensionalCatCables',
      'solarBubbles',
      'pocketAndroids',
      'quantumComputing',
    ] as const
    const source = stateWith({
      bots: 1_000,
      distribution: 0.5,
      ownedSkills,
      pocketAndroidTimer: 72,
    })
    const actual = deriveDysonV2Production(source, parametersWith())
    const legacy = deriveDysonIntermediates(
      {
        dyson: {
          facilities: {
            servers: facilityValues.servers,
          },
          workers: 500,
          researchers: 500,
        },
        skills: {
          byId: Object.fromEntries(
            ownedSkills.map((id) => [
              id,
              { owned: true, timerSeconds: id === 'pocketAndroids' ? 72 : 0 },
            ]),
          ),
        },
      } as unknown as Parameters<typeof deriveDysonIntermediates>[0],
      {
        managerAssemblyLineProduction: Number(
          actual.rates.assembly_lines.mantissa *
            10 ** actual.rates.assembly_lines.exponent,
        ),
        panelLifetimeSeconds: 8,
      },
    )

    expect(asNormalizedDecimals(actual.intermediates)).toEqual(
      asNormalizedNumbers(legacy),
    )
  })

  test('uses test-only approximate parity across scheduler partitions', () => {
    const source = stateWith()
    const parameters = parametersWith()
    const derived = deriveDysonV2Production(source, parameters)
    const whole = applyCapturedDysonV2ProductionKernel(source, derived, 10)
    const first = applyCapturedDysonV2ProductionKernel(source, derived, 4)
    const second = applyCapturedDysonV2ProductionKernel(first.state, derived, 6)

    expect(normalizedDysonSnapshot(second.state)).toEqual(
      normalizedDysonSnapshot(whole.state),
    )
    expect(whole.summary.changed).toBe(true)
    expect(Object.keys(whole.summary.generated)).toEqual(
      Object.keys(whole.summary.effective),
    )
  })

  test('uses strictly identical active and offline operation order', () => {
    const source = stateWith()
    const parameters = parametersWith()

    expect(
      advanceActiveDysonV2Production(source, parameters, 10),
    ).toEqual(advanceOfflineDysonV2Production(source, parameters, 10))
  })

  test('reallocates from newly arrived bots and reports negligible effective credit', () => {
    const source = stateWith({
      bots: 100,
      distribution: 0.5,
      resources: { money: '1e1000' },
    })
    const result = advanceActiveDysonV2Production(
      source,
      parametersWith(),
      1,
    )
    const allocation = deriveDysonV2BotAllocation(result.state)

    expect(result.state.dyson.workers).toEqual(allocation.workers)
    expect(result.state.dyson.researchers).toEqual(allocation.researchers)
    expect(gameDecimalToCanonicalString(result.summary.generated.money)).not.toBe('0')
    expect(gameDecimalToCanonicalString(result.summary.effective.money)).toBe('0')
    expect(result.summary.changed).toBe(true)
  })

  test('keeps stale allocation fields exactly unchanged for a zero-duration slice', () => {
    const source = stateWith({ bots: 100, distribution: 0.5 })
    expect(gameDecimalToCanonicalString(source.dyson.workers)).toBe('0')
    expect(gameDecimalToCanonicalString(source.dyson.researchers)).toBe('0')

    const result = advanceActiveDysonV2Production(
      source,
      parametersWith(),
      0,
    )

    expect(result.state).toEqual(source)
    expect(result.summary.changed).toBe(false)
    expect(
      Object.values(result.summary.generated).every(
        (value) => gameDecimalToCanonicalString(value) === '0',
      ),
    ).toBe(true)
    expect(result.summary.effective).toBe(result.summary.generated)
  })

  test('keeps fractional automatic arrivals while manual slots stay integer', () => {
    const source = stateWith({
      facilities: {
        assembly_lines: [0.5, 2],
        ai_managers: [0.5, 1],
      },
    })
    const beforeAutomatic = source.dyson.facilities.assembly_lines[0]
    const beforeManual = source.dyson.facilities.assembly_lines[1]
    const result = advanceActiveDysonV2Production(
      source,
      parametersWith(),
      0.5,
    )
    const after = result.state.dyson.facilities.assembly_lines

    expect(gameDecimalToCanonicalString(after[0])).not.toBe(
      gameDecimalToCanonicalString(beforeAutomatic),
    )
    expect(after[1]).toEqual(beforeManual)
    expect(isIntegerGameDecimal(after[1])).toBe(true)
    expect(result.state.dyson.facilities.galactic_brains).toEqual(
      source.dyson.facilities.galactic_brains,
    )
  })

  test('advances extreme Decimal state without Number saturation', () => {
    const hugeFacilities = Object.fromEntries(
      DYSON_V2_FACILITY_IDS.map((id) => [id, ['1e1000', 1] as const]),
    ) as Readonly<Record<CanonicalFacilityId, readonly [string, number]>>
    const source = stateWith({ bots: '1e1000', facilities: hugeFacilities })
    const hugeModifiers = Object.freeze(
      Object.fromEntries(
        DYSON_V2_FACILITY_IDS.map((id) => [id, decimal('1e1000')]),
      ) as Record<CanonicalFacilityId, GameDecimal>,
    )
    const result = advanceOfflineDysonV2Production(
      source,
      parametersWith({
        panelRateMultiplier: decimal('1e1000'),
        panelLifetimeSeconds: decimal('1e1000'),
        moneyMultiplier: decimal('1e1000'),
        scienceMultiplier: decimal('1e1000'),
        facilityModifiers: hugeModifiers,
      }),
      1e100,
    )

    expect(result.state.dyson.money.exponent).toBeGreaterThan(308)
    expect(result.state.dyson.facilities.assembly_lines[0].exponent).toBeGreaterThan(308)
    expect(Object.getPrototypeOf(result.state.dyson.money)).toBe(Object.prototype)
  })

  test('freezes changed paths and structurally shares every unchanged branch', () => {
    const source = stateWith()
    const before = gameDecimalToCanonicalString(source.dyson.money)
    const derived = deriveDysonV2Production(source, parametersWith())
    const result = advanceActiveDysonV2Production(source, parametersWith(), 1)

    expect(gameDecimalToCanonicalString(source.dyson.money)).toBe(before)
    expect(result.state).not.toBe(source)
    expect(result.state.dyson).not.toBe(source.dyson)
    expect(result.state.skills).toBe(source.skills)
    expect(result.state.statistics).toBe(source.statistics)
    expect(result.state.quantum).toBe(source.quantum)
    expect(result.state.dyson.automation).toBe(source.dyson.automation)
    expect(result.state.dyson.facilities.galactic_brains).toBe(
      source.dyson.facilities.galactic_brains,
    )
    const sourceRecord = source as unknown as Readonly<Record<string, unknown>>
    const resultRecord = result.state as unknown as Readonly<
      Record<string, unknown>
    >
    expect(
      Object.keys(sourceRecord).filter(
        (key) => resultRecord[key] === sourceRecord[key],
      ),
    ).toEqual(Object.keys(sourceRecord).filter((key) => key !== 'dyson'))
    expect(Object.isFrozen(source)).toBe(true)
    expect(Object.isFrozen(derived)).toBe(true)
    expect(derived).not.toHaveProperty('facilityContributionRows')
    expect(Object.isFrozen(derived.rates)).toBe(true)
    expect(Object.isFrozen(result.state)).toBe(true)
    expect(Object.isFrozen(result.state.dyson.facilities.assembly_lines)).toBe(true)
    expect(Object.isFrozen(result.summary)).toBe(true)
    expect(Object.isFrozen(result.summary.generated)).toBe(true)
    expect(validateCanonicalGameStateV2(result.state)).toEqual({
      valid: true,
      errors: [],
    })
  })

  test('characterizes ordinary derivation and advance below 100 milliseconds', () => {
    const source = stateWith()
    const parameters = parametersWith()
    deriveDysonV2Production(source, parameters)
    advanceActiveDysonV2Production(source, parameters, 1)

    const derivationSamples = Array.from({ length: 5 }, () => {
      const started = performance.now()
      deriveDysonV2Production(source, parameters)
      return performance.now() - started
    })
    const advanceSamples = Array.from({ length: 5 }, () => {
      const started = performance.now()
      advanceActiveDysonV2Production(source, parameters, 1)
      return performance.now() - started
    })

    expect(Math.max(...derivationSamples)).toBeLessThan(100)
    expect(Math.max(...advanceSamples)).toBeLessThan(100)
  })

  test.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid public slice seconds %s',
    (seconds) => {
      expect(() =>
        advanceActiveDysonV2Production(
          stateWith(),
          parametersWith(),
          seconds,
        ),
      ).toThrow('finite and non-negative')
    },
  )
})
