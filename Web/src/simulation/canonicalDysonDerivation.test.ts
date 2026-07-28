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

const expectedStaticSkillRates = (
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
) {
  const result = deriveBasicDysonState(
    state,
    neutralTuning,
    noEntitlements,
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

  test('reconstructs the exact three-static-skill Unity-derived rates', () => {
    const state = characterizedState([
      'assemblyLineTree',
      'workerEfficiencyTree',
      'superchargedPower',
    ])

    expectRates(
      requireDerived(state).rates,
      expectedStaticSkillRates,
    )
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
    )
    const second = deriveBasicDysonState(
      state,
      neutralTuning,
      noEntitlements,
    )

    expect(first).toEqual(second)
    expect(state).toEqual(stateBefore)
    expect(neutralTuning).toEqual(tuningBefore)
    expect(noEntitlements).toEqual(entitlementsBefore)
  })

  test('fails closed for an unsupported owned skill', () => {
    const state = characterizedState(['androids'])

    expect(
      deriveBasicDysonState(state, neutralTuning, noEntitlements),
    ).toEqual({
      ok: false,
      issues: [
        {
          code: 'DYSON_OWNED_SKILL_UNSUPPORTED',
          path: 'skills.byId.androids',
          detail:
            "Owned skill 'androids' is not characterized by the Basic Dyson stat pipeline.",
        },
      ],
    })
  })
})
