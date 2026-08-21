import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import { hydrateGameState } from '../game-state/mapping'
import type {
  CanonicalGameStateV1,
  SkillRuntimeState,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  deriveBasicDysonState,
  deriveManualPurchaseProductionLayer,
} from './canonicalDysonDerivation'
import { previewCanonicalBasicFacilityPurchase } from './canonicalDysonCommands'

const fixtureText = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

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

const noEntitlements = Object.freeze({
  permanentDoubleIp: false,
})

const neutralEvaluationSnapshot = Object.freeze({
  panelsPerSecond: 1,
  panelLifetimeSeconds: 10,
  scienceMultiplier: 1,
  rudimentarySingularityProduction: 0,
  pocketDimensionsProduction: 0,
  scientificPlanetsProduction: 0,
  managerAssemblyLineProduction: 0,
})

interface GoldenRates {
  readonly money: number
  readonly science: number
  readonly panels: number
  readonly bots: number
  readonly assembly_lines: number
  readonly ai_managers: number
  readonly servers: number
  readonly data_centers: number
  readonly planets: number
}

const expectedNeutralRates = (
  JSON.parse(
    readFileSync(
      new URL(
        '../../test/parity/dyson-no-skills-two-ticks.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as { readonly initialState: { readonly rates: GoldenRates } }
).initialState.rates

const characterizedStaticSkillRates = (
  JSON.parse(
    readFileSync(
      new URL(
        '../../test/parity/dyson-static-skills-one-tick.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as { readonly initialRates: GoldenRates }
).initialRates

function expectRates(
  actual: Readonly<GoldenRates>,
  expected: Readonly<GoldenRates>,
): void {
  for (const key of Object.keys(expected) as Array<keyof GoldenRates>) {
    expect(actual[key]).toBeCloseTo(expected[key], 14)
  }
}

function characterizedState(
  ownedSkillIds: readonly string[] = [],
): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixtureText).prepared,
  ).state
  const owned = new Set(ownedSkillIds)
  const byId = Object.fromEntries(
    Object.entries(source.skills.byId).map(([id, skill]) => [
      id,
      {
        ...skill,
        owned: owned.has(id),
      } satisfies SkillRuntimeState,
    ]),
  )

  return {
    ...source,
    dyson: {
      ...source.dyson,
      money: 10,
      science: 20,
      bots: 30,
      workers: 40,
      researchers: 50,
      totalPanelsDecayed: 0,
      facilities: {
        assembly_lines: [2, 3],
        ai_managers: [4, 1],
        servers: [2, 0],
        data_centers: [1, 0],
        planets: [1, 0],
        matrioshka_brains: [0, 0],
        birch_planets: [0, 0],
        galactic_brains: [0, 0],
      },
      automation: {
        ...source.dyson.automation,
        enabledFacilities: {
          assembly_lines: false,
          ai_managers: false,
          servers: false,
          data_centers: false,
          planets: false,
          matrioshka_brains: false,
          birch_planets: false,
          galactic_brains: false,
        },
      },
    },
    infinity: {
      ...source.infinity,
      points: 0n,
      secretsOfTheUniverse: 0n,
    },
    skills: {
      ...source.skills,
      byId,
      activeAutoAssignment: [],
    },
    research: {
      ...source.research,
      levelsById: Object.fromEntries(
        Object.keys(source.research.levelsById).map((id) => [id, 0]),
      ),
    },
    quantum: {
      ...source.quantum,
      cashBonusLevels: 0n,
      scienceBonusLevels: 0n,
    },
    avocado: {
      unlocked: false,
      infinityPoints: 0,
      influence: 0,
      strangeMatter: 0,
      overflowMultiplier: 0,
    },
  }
}

function requireDerived(
  state: CanonicalGameStateV1,
  tuning: Readonly<DysonCompatibilityTuning> = neutralTuning,
) {
  const result = deriveBasicDysonState(
    state,
    tuning,
    noEntitlements,
    neutralEvaluationSnapshot,
  )
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error(JSON.stringify(result.issues))
  }
  return result.value
}

describe('canonical Basic Dyson derivation', () => {
  test('reconstructs the exact neutral Unity-derived rates', () => {
    expectRates(
      requireDerived(characterizedState()).rates,
      expectedNeutralRates,
    )
  })

  test('combines characterized facility rates with Unity global skill effects', () => {
    const state = characterizedState([
      'assemblyLineTree',
      'workerEfficiencyTree',
      'superchargedPower',
    ])

    const expected = {
      ...characterizedStaticSkillRates,
      // The narrow production probe supplied cached global multipliers as 1.
      // Canonical reconstruction also runs GlobalStatPipeline, where
      // Supercharged Power multiplies both Cash and Science by 1.5.
      money: characterizedStaticSkillRates.money * 1.5,
      science: characterizedStaticSkillRates.science * 1.5,
    }
    expectRates(requireDerived(state).rates, expected)
  })

  test('folds automatic and manual facility counts into the same rate', () => {
    const split = characterizedState()
    const automaticOnly = {
      ...split,
      dyson: {
        ...split.dyson,
        facilities: {
          ...split.dyson.facilities,
          assembly_lines: [5, 0] as const,
        },
      },
    }

    expect(requireDerived(automaticOnly).rates).toEqual(
      requireDerived(split).rates,
    )
  })

  test('orders research, Quantum, secrets, Infinity and Avocado effects like Unity', () => {
    const base = characterizedState()
    const state: CanonicalGameStateV1 = {
      ...base,
      research: {
        ...base.research,
        levelsById: {
          ...base.research.levelsById,
          'research.money_multiplier': 2,
          'research.science_boost': 1,
          'research.assembly_line_upgrade': 2,
          'research.panel_lifetime_1': 1,
        },
      },
      infinity: {
        ...base.infinity,
        points: 2n,
        secretsOfTheUniverse: 2n,
      },
      quantum: {
        ...base.quantum,
        cashBonusLevels: 2n,
        scienceBonusLevels: 3n,
      },
      avocado: {
        unlocked: true,
        infinityPoints: 100,
        influence: 0,
        strangeMatter: 0,
        overflowMultiplier: 0,
      },
    }
    const tuning = {
      ...neutralTuning,
      moneyMultiUpgradePercent: 0.05,
      scienceBoostPercent: 0.05,
      assemblyLineUpgradePercent: 0.03,
    }

    const derived = requireDerived(state, tuning)

    // Money: (1 + 2*0.05) * 1.10 Quantum * 2 Secrets * log10(100).
    expect(derived.globals.moneyMultiplier).toBeCloseTo(4.84, 14)
    // Science: (1 + 0.05) * 1.15 Quantum * log10(100).
    expect(derived.globals.scienceMultiplier).toBeCloseTo(2.415, 14)
    expect(derived.globals.panelLifetimeSeconds).toBe(11)
    // Assembly: (1 + 2*Math.fround(0.06)) * (1 + 2 IP) * 2 Avocado.
    expect(derived.facilityModifiers.assembly_lines).toBeCloseTo(
      (1 + 2 * Math.fround(0.06)) * 3 * 2,
      14,
    )
    // Managers unlock their Infinity multiplier at 2 IP.
    expect(derived.facilityModifiers.ai_managers).toBeCloseTo(3 * 2, 14)
    // Servers require 3 IP, but still receive Avocado.
    expect(derived.facilityModifiers.servers).toBeCloseTo(2, 14)
  })

  test('derives all eight facility modifiers before mega production is enabled', () => {
    const base = characterizedState()
    const state: CanonicalGameStateV1 = {
      ...base,
      research: {
        ...base.research,
        levelsById: {
          ...base.research.levelsById,
          'research.matrioshka_brains_upgrade': 2,
          'research.birch_planets_upgrade': 3,
          'research.galactic_brains_upgrade': 4,
        },
      },
      infinity: {
        ...base.infinity,
        points: 20n,
      },
    }
    const tuning = {
      ...neutralTuning,
      matrioshkaUpgradePercent: 0.03,
      birchUpgradePercent: 0.03,
      galacticUpgradePercent: 0.03,
    }

    const modifiers = requireDerived(state, tuning).facilityModifiers

    expect(modifiers.matrioshka_brains).toBeCloseTo(1.06 * 21, 14)
    expect(modifiers.birch_planets).toBeCloseTo(1.09 * 21, 14)
    expect(modifiers.galactic_brains).toBeCloseTo(1.12 * 21, 14)
  })

  test('derives unlocked mega rates and maps them to tick-start arrivals', () => {
    const source = characterizedState()
    const state: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        facilities: {
          ...source.dyson.facilities,
          matrioshka_brains: [2, 3],
          birch_planets: [4, 1],
          galactic_brains: [1, 1],
        },
      },
      quantum: {
        ...source.quantum,
        unlocks: {
          ...source.quantum.unlocks,
          matrioshkaBrains: true,
          birchPlanets: true,
          galacticBrains: true,
        },
      },
    }

    const derived = requireDerived(state)
    expect(derived.megaRates.matrioshka_brains).toBe(5)
    expect(derived.megaRates.birch_planets).toBe(
      Math.fround(0.01) * 5,
    )
    expect(derived.megaRates.galactic_brains).toBe(
      Math.fround(0.1) * 2,
    )
    expect(derived.productionArrivalRates.planets).toBe(
      derived.rates.planets + derived.megaRates.matrioshka_brains,
    )
    expect(derived.productionArrivalRates.matrioshka_brains).toBe(
      derived.megaRates.birch_planets,
    )
    expect(derived.productionArrivalRates.birch_planets).toBe(
      derived.megaRates.galactic_brains,
    )
  })

  test('derives skill effects only from skills.byId ownership', () => {
    const state = characterizedState()
    const withNonOwnershipReferences = {
      ...state,
      skills: {
        ...state.skills,
        activeAutoAssignment: [
          'assemblyLineTree',
          'workerEfficiencyTree',
          'superchargedPower',
        ],
        presets: state.skills.presets.map((preset) => ({
          ...preset,
          skillIds: [
            'assemblyLineTree',
            'workerEfficiencyTree',
            'superchargedPower',
          ],
        })) as CanonicalGameStateV1['skills']['presets'],
      },
    }

    expectRates(
      requireDerived(withNonOwnershipReferences).rates,
      expectedNeutralRates,
    )
  })

  test('does not mutate canonical state, tuning, or entitlements', () => {
    const state = characterizedState([
      'assemblyLineTree',
      'workerEfficiencyTree',
      'superchargedPower',
    ])
    const stateBefore = structuredClone(state)
    const tuningBefore = structuredClone(neutralTuning)
    const entitlementsBefore = structuredClone(noEntitlements)

    const first = deriveBasicDysonState(
      state,
      neutralTuning,
      noEntitlements,
      neutralEvaluationSnapshot,
    )
    const second = deriveBasicDysonState(
      state,
      neutralTuning,
      noEntitlements,
      neutralEvaluationSnapshot,
    )

    expect(first).toEqual(second)
    expect(state).toEqual(stateBefore)
    expect(neutralTuning).toEqual(tuningBefore)
    expect(noEntitlements).toEqual(entitlementsBefore)
  })

  test('materializes characterized dynamic skills through the old snapshot', () => {
    const state = characterizedState(['androids'])

    const result = deriveBasicDysonState(
      state,
      neutralTuning,
      noEntitlements,
      {
        ...neutralEvaluationSnapshot,
        panelLifetimeSeconds: 20,
      },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(result.value.globals.panelLifetimeSeconds).toBe(10)
    expect(result.value.nextEvaluationSnapshot).toMatchObject({
      panelsPerSecond: result.value.rates.panels,
      panelLifetimeSeconds: 10,
      scienceMultiplier: result.value.globals.scienceMultiplier,
      managerAssemblyLineProduction:
        result.value.rates.assembly_lines,
    })
  })

  test('applies dynamic panel, planet and per-second effects in one recalculation', () => {
    const source = characterizedState([
      'panelMaintenance',
      'planetAssembly',
      'powerOverwhelming',
    ])
    const state: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        botDistribution: 0.25,
        facilities: {
          ...source.dyson.facilities,
          assembly_lines: [5, 5],
        },
      },
    }
    const result = deriveBasicDysonState(
      state,
      neutralTuning,
      noEntitlements,
      neutralEvaluationSnapshot,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))

    expect(result.value.globals.panelLifetimeSeconds).toBe(85)
    expect(result.value.auxiliary.planetGenerationPerSecond).toBe(1)
    const unpoweredMoney =
      result.value.rates.panels *
      result.value.globals.panelLifetimeSeconds *
      result.value.globals.moneyMultiplier
    expect(result.value.rates.money).toBeCloseTo(
      Math.pow(unpoweredMoney, 1.03),
      14,
    )
  })

  test('recomputes bot allocation and publishes canonical facility progress facts', () => {
    const source = characterizedState([])
    const state: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        bots: 10,
        workers: 5,
        researchers: 5,
        botDistribution: 0.5,
        facilities: {
          ...source.dyson.facilities,
          assembly_lines: [0, 1],
        },
      },
    }
    const result = deriveBasicDysonState(
      state,
      neutralTuning,
      noEntitlements,
      neutralEvaluationSnapshot,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))

    expect(result.value.allocation).toEqual({
      workers: 5,
      researchers: 5,
    })
    expect(result.value.rates.panels).toBeGreaterThan(0)
    expect(result.value.rates.science).toBeGreaterThan(0)
    expect(result.value.facilityFacts.assembly_lines).toMatchObject({
      ownership: {
        automatic: 0,
        manual: 1,
        total: 1,
      },
      production: {
        outputFacilityId: 'bots',
        perSecond: result.value.rates.bots,
      },
      productionProgress: {
        visible: true,
        normalized: 0,
      },
      details: {
        baseProductionPerSecond: Math.fround(0.1),
        effectiveProducerCount: 1,
        modifier: result.value.facilityModifiers.assembly_lines,
        contributions: [
          {
            sourceId: 'base',
            displayRole: 'base',
            operation: 'override',
            value: Math.fround(0.1),
            delta: Math.fround(0.1),
            runningTotal: Math.fround(0.1),
          },
          {
            sourceId: 'assembly_lines.count',
            displayRole: 'producer-count',
            operation: 'multiply',
            value: 1,
            delta: 0,
            runningTotal: Math.fround(0.1),
            automaticManualTuple: [0, 1],
          },
        ],
        upstreamSources: [
          {
            sourceFacilityId: 'ai_managers',
            contributionPerSecond:
              result.value.rates.assembly_lines,
          },
        ],
      },
    })
  })

  test('publishes the exact ordered modifier and production-effect rows', () => {
    const source = characterizedState(['superchargedPower'])
    const result = requireDerived({
      ...source,
      infinity: {
        ...source.infinity,
        points: 1n,
      },
    })
    const rows =
      result.facilityFacts.assembly_lines.details.contributions
    expect(rows?.map((row) => row.displayRole)).toEqual([
      'base',
      'producer-count',
      'modifier',
      'output-adjustments',
    ])
    expect(rows?.at(-1)).toMatchObject({
      sourceId: 'effect.supercharged_power.assembly_lines',
      operation: 'multiply',
      value: 1.5,
      runningTotal: result.rates.bots,
    })
    expect(rows?.[1]?.automaticManualTuple).toEqual([2, 3])
    for (let index = 1; index < (rows?.length ?? 0); index += 1) {
      const previous = rows?.[index - 1]
      const current = rows?.[index]
      expect(current!.delta).toBe(
        current!.runningTotal - previous!.runningTotal,
      )
    }
  })

  test('uses the produced downstream fraction and solid-fill threshold for facility bars', () => {
    const source = characterizedState([])
    const fractional: CanonicalGameStateV1 = {
      ...source,
      dyson: {
        ...source.dyson,
        facilities: {
          ...source.dyson.facilities,
          assembly_lines: [2.375, 0],
          ai_managers: [1, 0],
        },
      },
    }
    const result = deriveBasicDysonState(
      fractional,
      neutralTuning,
      noEntitlements,
      neutralEvaluationSnapshot,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(
      result.value.facilityFacts.ai_managers.productionProgress,
    ).toEqual({
      visible: true,
      normalized: 0.375,
    })

    const fast: CanonicalGameStateV1 = {
      ...fractional,
      dyson: {
        ...fractional.dyson,
        facilities: {
          ...fractional.dyson.facilities,
          assembly_lines: [0.25, 0],
          ai_managers: [240, 0],
        },
      },
    }
    const fastResult = deriveBasicDysonState(
      fast,
      neutralTuning,
      noEntitlements,
      neutralEvaluationSnapshot,
    )
    expect(fastResult.ok).toBe(true)
    if (!fastResult.ok) {
      throw new Error(JSON.stringify(fastResult.issues))
    }
    expect(
      fastResult.value.facilityFacts.ai_managers.productionProgress,
    ).toEqual({
      visible: true,
      normalized: 1,
    })

    const customThreshold = deriveBasicDysonState(
      fast,
      neutralTuning,
      noEntitlements,
      neutralEvaluationSnapshot,
      { solidProgressThresholdPerSecond: 10 },
    )
    expect(customThreshold.ok).toBe(true)
    if (!customThreshold.ok) {
      throw new Error(JSON.stringify(customThreshold.issues))
    }
    expect(
      customThreshold.value.facilityFacts.ai_managers
        .productionProgress,
    ).toEqual({
      visible: true,
      normalized: 0.25,
    })
  })

  test('publishes Unity-mapped upstream summaries and gates the Matrioshka source', () => {
    const source = characterizedState([])
    const locked = requireDerived(source)
    expect(
      locked.facilityFacts.data_centers.details.upstreamSources,
    ).toEqual([
      {
        sourceFacilityId: 'planets',
        contributionPerSecond: locked.rates.data_centers,
      },
    ])
    expect(
      locked.facilityFacts.planets.details.upstreamSources,
    ).toEqual([])

    const unlocked = requireDerived({
      ...source,
      dyson: {
        ...source.dyson,
        facilities: {
          ...source.dyson.facilities,
          matrioshka_brains: [2, 0],
        },
      },
      quantum: {
        ...source.quantum,
        unlocks: {
          ...source.quantum.unlocks,
          matrioshkaBrains: true,
        },
      },
    })
    expect(
      unlocked.facilityFacts.planets.details.upstreamSources,
    ).toEqual([
      {
        sourceFacilityId: 'matrioshka_brains',
        contributionPerSecond:
          unlocked.megaRates.matrioshka_brains,
      },
    ])
  })

  test('enforces linked Avocado manual-count conditions from canonical facilities', () => {
    const below = characterizedState(['avocados'])
    const atThreshold: CanonicalGameStateV1 = {
      ...below,
      dyson: {
        ...below.dyson,
        facilities: {
          ...below.dyson.facilities,
          assembly_lines: [0, 69],
        },
      },
    }
    const belowResult = requireDerived(below)
    const thresholdResult = requireDerived(atThreshold)
    expect(thresholdResult.rates.bots).toBe(
      belowResult.rates.bots * (69 / 5) * 4,
    )
  })

  test('restores exact manual-purchase milestones and scaling boundaries', () => {
    const normalized = (
      manual: number,
      skills: readonly string[] = [],
      fragments = 0n,
    ) => {
      const source = characterizedState(skills)
      const result = requireDerived({
        ...source,
        dyson: {
          ...source.dyson,
          facilities: {
            ...source.dyson.facilities,
            assembly_lines: [0, manual],
          },
        },
        skills: { ...source.skills, fragments },
      })
      return result.rates.bots / manual
    }

    expect(normalized(50) / normalized(49)).toBeCloseTo(2, 12)
    expect(normalized(51) / normalized(49)).toBeCloseTo(2, 12)
    expect(normalized(100) / normalized(99)).toBeCloseTo(2, 12)
    expect(normalized(101) / normalized(100)).toBeCloseTo(1.01, 12)

    const threshold90 = normalized(90, ['productionScaling'], 1n)
    expect(normalized(91, ['productionScaling'], 1n) / threshold90)
      .toBeCloseTo(1.01, 12)
    const threshold85 = normalized(85, ['productionScaling'], 2n)
    expect(normalized(86, ['productionScaling'], 2n) / threshold85)
      .toBeCloseTo(1.01, 12)
  })

  test('uses exact Swarm rates and lets Supernova suppress the whole layer', () => {
    const normalized = (skills: readonly string[]) => {
      const source = characterizedState(skills)
      const result = requireDerived({
        ...source,
        dyson: {
          ...source.dyson,
          facilities: {
            ...source.dyson.facilities,
            assembly_lines: [0, 101],
          },
        },
        skills: { ...source.skills, fragments: 1n },
      })
      return result.rates.bots / 101
    }
    const baseBeforeScaling = normalized([]) / 1.01
    expect(normalized(['superSwarm']) / baseBeforeScaling)
      .toBeCloseTo(1.02, 12)
    expect(normalized(['megaSwarm']) / baseBeforeScaling)
      .toBeCloseTo(1.03, 12)
    expect(normalized(['ultimateSwarm']) / baseBeforeScaling)
      .toBeCloseTo(1.05, 12)

    const full = normalized([
      'avocados',
      'productionScaling',
      'ultimateSwarm',
    ])
    const suppressed = normalized([
      'avocados',
      'productionScaling',
      'ultimateSwarm',
      'supernova',
    ])
    expect(full / suppressed).toBeCloseTo(2 * 2 * 2 * 1.55, 12)
  })

  test('applies Terra substitutions and twelve-times bought-Planet counts', () => {
    const normalizedDataCenterRate = (
      skills: readonly string[],
      manualPlanets: number,
    ) => {
      const source = characterizedState(skills)
      const result = requireDerived({
        ...source,
        dyson: {
          ...source.dyson,
          facilities: {
            ...source.dyson.facilities,
            data_centers: [1, 0],
            planets: [0, manualPlanets],
          },
        },
      })
      return result.rates.servers
    }
    const neutral = normalizedDataCenterRate([], 50)
    expect(normalizedDataCenterRate(['terraFirma'], 50) / neutral)
      .toBeCloseTo(2, 12)
    expect(
      normalizedDataCenterRate(['terraFirma', 'terraIrradiant'], 5) /
        normalizedDataCenterRate([], 5),
    ).toBeCloseTo(2, 12)
  })

  test('keeps Avocados eligibility on each facility raw manual count', () => {
    const layer = (
      facilityId: 'assembly_lines' | 'data_centers' | 'planets',
      skills: readonly string[],
      manual: Partial<Record<
        'assembly_lines' | 'data_centers' | 'planets',
        number
      >>,
    ) => {
      const source = characterizedState(skills)
      return deriveManualPurchaseProductionLayer({
        ...source,
        dyson: {
          ...source.dyson,
          facilities: {
            ...source.dyson.facilities,
            assembly_lines: [0, manual.assembly_lines ?? 0],
            data_centers: [0, manual.data_centers ?? 0],
            planets: [0, manual.planets ?? 0],
          },
        },
      }, facilityId)
    }

    const crossFacility = layer(
      'assembly_lines',
      ['avocados', 'terraNullius'],
      { assembly_lines: 0, planets: 69 },
    )
    expect(crossFacility.effectiveManualCount).toBe(69)
    expect(crossFacility.avocadosMultiplier).toBe(1)
    expect(crossFacility.milestone50Multiplier).toBe(2)

    const substitutedSameFacility = layer(
      'data_centers',
      ['avocados', 'terraFirma'],
      { data_centers: 68, planets: 1 },
    )
    expect(substitutedSameFacility.effectiveManualCount).toBe(69)
    expect(substitutedSameFacility.avocadosMultiplier).toBe(1)

    const irradiantPlanets = layer(
      'planets',
      ['avocados', 'terraIrradiant'],
      { planets: 6 },
    )
    expect(irradiantPlanets.effectiveManualCount).toBe(72)
    expect(irradiantPlanets.avocadosMultiplier).toBe(1)

    const legitimate = layer(
      'data_centers',
      ['avocados', 'terraFirma'],
      { data_centers: 69, planets: 1 },
    )
    expect(legitimate.rawManualCount).toBe(69)
    expect(legitimate.avocadosMultiplier).toBe(2)
    expect(
      layer(
        'data_centers',
        ['avocados', 'terraFirma', 'supernova'],
        { data_centers: 69, planets: 1 },
      ).avocadosMultiplier,
    ).toBe(1)
  })

  test('publishes the historical Terra Nova Planet Boost without Avocados', () => {
    const derive = (manualPlanets: number, skills: readonly string[]) => {
      const source = characterizedState(skills)
      const state: CanonicalGameStateV1 = {
        ...source,
        dyson: {
          ...source.dyson,
          facilities: {
            ...source.dyson.facilities,
            planets: [1, manualPlanets],
          },
        },
      }
      return {
        state,
        derived: requireDerived(state),
        manual: deriveManualPurchaseProductionLayer(state, 'planets'),
      }
    }

    expect(derive(49, ['terraNova']).derived.planetPricingModifier)
      .toBe(1)
    expect(derive(50, ['terraNova']).derived.planetPricingModifier)
      .toBe(2)
    expect(derive(100, ['terraNova']).derived.planetPricingModifier)
      .toBe(4)
    expect(derive(101, ['terraNova']).derived.planetPricingModifier)
      .toBeCloseTo(4.04, 12)

    const avocado = derive(69, ['terraNova', 'avocados'])
    expect(avocado.manual.totalMultiplier).toBe(4)
    expect(avocado.derived.planetPricingModifier).toBe(2)
    expect(
      derive(101, ['terraNova', 'supernova']).derived
        .planetPricingModifier,
    ).toBe(1)

    for (const [manualPlanets, expectedRatio] of [
      [50, 2],
      [100, 4],
      [101, 4.04],
    ] as const) {
      const ordinary = derive(manualPlanets, [])
      const terra = derive(manualPlanets, ['terraNova'])
      const ordinaryQuote = previewCanonicalBasicFacilityPurchase(
        ordinary.state,
        'planets',
        ordinary.derived.planetPricingModifier,
      )
      const terraQuote = previewCanonicalBasicFacilityPurchase(
        terra.state,
        'planets',
        terra.derived.planetPricingModifier,
      )
      expect(ordinaryQuote.cost / terraQuote.cost)
        .toBeCloseTo(expectedRatio, 12)
    }
  })
})
