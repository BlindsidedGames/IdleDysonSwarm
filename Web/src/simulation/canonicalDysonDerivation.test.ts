import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import { hydrateGameState } from '../game-state/mapping'
import type {
  CanonicalGameStateV1,
  SkillRuntimeState,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { deriveBasicDysonState } from './canonicalDysonDerivation'

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
      belowResult.rates.bots * (69 / 5) * 2,
    )
  })
})
