import { describe, expect, test } from 'vitest'
import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import type { SkillRuntimeState } from '../game-state/types'
import { DISCRETE_MAXIMUM } from './numeric'
import {
  resolveMoneyScienceSkillEffect,
  type MoneyScienceCanonicalInputs,
  type MoneyScienceDerivedInputs,
  type MoneyScienceSkillEffectResolution,
} from './moneyScienceSkillEffects'

const tuning: Readonly<DysonCompatibilityTuning> = Object.freeze({
  panelsPerSecMulti: 1.25,
  scienceBoostPercent: 0.07,
  moneyMultiUpgradePercent: 0.06,
  assemblyLineUpgradePercent: 0.08,
  aiManagerUpgradePercent: 0.09,
  serverUpgradePercent: 0.1,
  dataCenterUpgradePercent: 0.11,
  planetUpgradePercent: 0.12,
  matrioshkaUpgradePercent: 0.13,
  birchUpgradePercent: 0.14,
  galacticUpgradePercent: 0.15,
})

const baseDerived: MoneyScienceDerivedInputs = Object.freeze({
  panelsPerSecond: 400_000_000_000_000,
  panelLifetimeSeconds: 10,
  scienceMultiplier: 7,
})

const allSkillIds = [
  'regulatedAcademia',
  'economicRevolution',
  'higgsBoson',
  'workerBoost',
  'shouldersOfTheRevolution',
  'shouldersOfPrecursors',
  'dysonSubsidies',
  'purityOfMind',
  'monetaryPolicy',
  'tasteOfPower',
  'stellarObliteration',
  'stellarDominance',
  'purityOfSEssence',
  'superRadiantScattering',
  'producedAsScienceTree',
  'idleSpaceFlight',
  'scientificRevolution',
  'indulgingInPower',
  'addictionToPower',
  'supernova',
  'stellarImprovements',
] as const

interface StateOptions {
  readonly bots?: number
  readonly botDistribution?: number
  readonly botMultitasking?: boolean
  readonly points?: bigint
  readonly fragments?: bigint
  readonly researchLevels?: Readonly<Record<string, number>>
  readonly scatteringTimerSeconds?: number
  readonly omitSkills?: readonly string[]
}

interface ParityCase {
  readonly effectId: string
  readonly owned: readonly string[]
  readonly expected: number
  readonly state?: StateOptions
  readonly derived?: Partial<MoneyScienceDerivedInputs>
}

function makeState(
  owned: readonly string[] = [],
  options: StateOptions = {},
): MoneyScienceCanonicalInputs {
  const ownedIds = new Set(owned)
  const omittedIds = new Set(options.omitSkills)
  const byId: Record<string, SkillRuntimeState> = {}
  for (const skillId of allSkillIds) {
    if (omittedIds.has(skillId)) continue
    byId[skillId] = {
      owned: ownedIds.has(skillId),
      level: 0,
      timerSeconds:
        skillId === 'superRadiantScattering'
          ? (options.scatteringTimerSeconds ?? 50)
          : 0,
      secondaryTimerSeconds: 0,
    }
  }

  return {
    dyson: {
      bots: options.bots ?? 20_001,
      botDistribution: options.botDistribution ?? 0.4,
    },
    skills: {
      points: options.points ?? 4n,
      fragments: options.fragments ?? 3n,
      byId,
    },
    research: {
      levelsById: options.researchLevels ?? {
        'research.money_multiplier': 2,
        'research.science_boost': 4,
      },
    },
    quantum: {
      unlocks: {
        botMultitasking: options.botMultitasking ?? false,
      },
    },
  }
}

function resolveCase(testCase: ParityCase): MoneyScienceSkillEffectResolution {
  return resolveMoneyScienceSkillEffect(
    testCase.effectId,
    makeState(testCase.owned, testCase.state),
    tuning,
    { ...baseDerived, ...testCase.derived },
  )
}

function expectValue(
  result: MoneyScienceSkillEffectResolution,
  expected: number,
): void {
  expect(result).toMatchObject({ handled: true, ok: true })
  if (!result.handled || !result.ok) {
    throw new Error(`Expected a resolved value: ${JSON.stringify(result)}`)
  }
  expect(result.value).toBeCloseTo(expected, 12)
}

function expectIssue(
  result: MoneyScienceSkillEffectResolution,
  code: string,
  path: string,
): void {
  expect(result).toMatchObject({
    handled: true,
    ok: false,
    issue: { code, path },
  })
}

const moneyCases: readonly ParityCase[] = [
  {
    effectId: 'effect.regulatedAcademia.money_multiplier',
    owned: ['regulatedAcademia'],
    expected: 0.048,
  },
  {
    effectId: 'effect.economicRevolution.money_multiplier',
    owned: ['economicRevolution'],
    expected: 5,
  },
  {
    effectId: 'effect.higgsBoson.money_multiplier',
    owned: ['higgsBoson'],
    expected: 1.2,
  },
  {
    effectId: 'effect.workerBoost.money_multiplier',
    owned: ['workerBoost'],
    expected: 61,
  },
  {
    effectId: 'effect.shouldersOfTheRevolution.money_multiplier',
    owned: ['shouldersOfTheRevolution'],
    expected: 1.04,
  },
  {
    effectId: 'effect.shouldersOfPrecursors.money_multiplier',
    owned: ['shouldersOfPrecursors'],
    expected: 7,
  },
  {
    effectId: 'effect.dysonSubsidies.money_multiplier',
    owned: ['dysonSubsidies'],
    expected: 3,
    derived: { panelsPerSecond: 100, panelLifetimeSeconds: 10 },
  },
  {
    effectId: 'effect.purityOfMind.money_multiplier',
    owned: ['purityOfMind'],
    expected: 5.0625,
  },
  {
    effectId: 'effect.monetaryPolicy.money_multiplier',
    owned: ['monetaryPolicy'],
    expected: 3.25,
  },
  {
    effectId: 'effect.tasteOfPower.money_multiplier',
    owned: ['tasteOfPower'],
    expected: 0.75,
  },
  {
    effectId: 'effect.stellarObliteration.money_multiplier',
    owned: ['stellarObliteration'],
    expected: 0.0005,
  },
  {
    effectId: 'effect.stellarDominance.money_multiplier',
    owned: ['stellarDominance'],
    expected: 0.01,
    derived: { panelsPerSecond: 100, panelLifetimeSeconds: 10 },
  },
  {
    effectId: 'effect.purityOfSEssence.money_multiplier',
    owned: ['purityOfSEssence'],
    expected: 4.06586896,
  },
  {
    effectId: 'effect.superRadiantScattering.money_multiplier',
    owned: ['superRadiantScattering'],
    expected: 1.5,
  },
]

const scienceCases: readonly ParityCase[] = [
  {
    effectId: 'effect.regulatedAcademia.science_multiplier',
    owned: ['regulatedAcademia'],
    expected: 0.112,
  },
  {
    effectId: 'effect.producedAsScienceTree.science_multiplier',
    owned: ['producedAsScienceTree'],
    expected: 41,
  },
  {
    effectId: 'effect.idleSpaceFlight.science_multiplier',
    owned: ['idleSpaceFlight'],
    expected: 400_000,
  },
  {
    effectId: 'effect.scientificRevolution.science_multiplier',
    owned: ['scientificRevolution'],
    expected: 1,
  },
  {
    effectId: 'effect.purityOfMind.science_multiplier',
    owned: ['purityOfMind'],
    expected: 5.0625,
  },
  {
    effectId: 'effect.tasteOfPower.science_multiplier',
    owned: ['tasteOfPower'],
    expected: 0.75,
  },
  {
    effectId: 'effect.stellarObliteration.science_multiplier',
    owned: ['stellarObliteration'],
    expected: 0.0005,
  },
  {
    effectId: 'effect.purityOfSEssence.science_multiplier',
    owned: ['purityOfSEssence'],
    expected: 4.06586896,
  },
  {
    effectId: 'effect.superRadiantScattering.science_multiplier',
    owned: ['superRadiantScattering'],
    expected: 1.5,
  },
]

describe('Unity money/science dynamic skill parity', () => {
  for (const testCase of moneyCases) {
    test(`resolves ${testCase.effectId}`, () => {
      expectValue(resolveCase(testCase), testCase.expected)
    })
  }

  for (const testCase of scienceCases) {
    test(`resolves ${testCase.effectId}`, () => {
      expectValue(resolveCase(testCase), testCase.expected)
    })
  }

  test('uses the shared Regulated Academia 20 plus 10-point progression', () => {
    for (const [fragments, percentage] of [[1, 20], [2, 30], [3, 40], [7, 80]] as const) {
      const moneyBoost = 2 * tuning.moneyMultiUpgradePercent
      const scienceBoost = 4 * tuning.scienceBoostPercent
      expectValue(
        resolveCase({
          effectId: 'effect.regulatedAcademia.money_multiplier',
          owned: ['regulatedAcademia'],
          expected: moneyBoost * percentage / 100,
          state: { fragments: BigInt(fragments) },
        }),
        moneyBoost * percentage / 100,
      )
      expectValue(
        resolveCase({
          effectId: 'effect.regulatedAcademia.science_multiplier',
          owned: ['regulatedAcademia'],
          expected: scienceBoost * percentage / 100,
          state: { fragments: BigInt(fragments) },
        }),
        scienceBoost * percentage / 100,
      )
    }
  })

  test('compounds Purity at zero, one, two and 34 unspent points', () => {
    for (const points of [0, 1, 2, 34] as const) {
      for (const [effectId, coefficient] of [
        ['effect.purityOfMind.money_multiplier', 1.5],
        ['effect.purityOfSEssence.money_multiplier', 1.42],
      ] as const) {
        expectValue(
          resolveCase({
            effectId,
            owned: [effectId.includes('Mind') ? 'purityOfMind' : 'purityOfSEssence'],
            expected: Math.pow(coefficient, points),
            state: { points: BigInt(points) },
          }),
          Math.pow(coefficient, points),
        )
      }
    }
  })

  test('adds the neutral one to allocation percentage-point multipliers', () => {
    for (const [distribution, money, science] of [
      [1, 1, 101],
      [0.99, 2, 100],
      [0, 101, 1],
    ] as const) {
      expectValue(
        resolveCase({
          effectId: 'effect.workerBoost.money_multiplier',
          owned: ['workerBoost'],
          expected: money,
          state: { botDistribution: distribution },
        }),
        money,
      )
      expectValue(
        resolveCase({
          effectId: 'effect.producedAsScienceTree.science_multiplier',
          owned: ['producedAsScienceTree'],
          expected: science,
          state: { botDistribution: distribution },
        }),
        science,
      )
    }
  })

  test('hands Dyson Subsidies from Cash to Bots at exactly one star', () => {
    expectValue(
      resolveCase({
        effectId: 'effect.dysonSubsidies.money_multiplier',
        owned: ['dysonSubsidies'],
        expected: 1,
        derived: { panelsPerSecond: 2_000, panelLifetimeSeconds: 10 },
      }),
      1,
    )
  })

  test('preserves the exact half-allocation comparisons and multitasking branches', () => {
    expectValue(
      resolveCase({
        effectId: 'effect.economicRevolution.money_multiplier',
        owned: ['economicRevolution'],
        expected: 5,
        state: { botDistribution: 0.5 },
      }),
      5,
    )
    expectValue(
      resolveCase({
        effectId: 'effect.economicRevolution.money_multiplier',
        owned: ['economicRevolution'],
        expected: 1,
        state: { botDistribution: 0.500_000_001 },
      }),
      1,
    )
    expectValue(
      resolveCase({
        effectId: 'effect.scientificRevolution.science_multiplier',
        owned: ['scientificRevolution'],
        expected: 5,
        state: { botDistribution: 0.5 },
      }),
      5,
    )
    expectValue(
      resolveCase({
        effectId: 'effect.scientificRevolution.science_multiplier',
        owned: ['scientificRevolution'],
        expected: 1,
        state: { botDistribution: 0.499_999_999 },
      }),
      1,
    )
    expectValue(
      resolveCase({
        effectId: 'effect.workerBoost.money_multiplier',
        owned: ['workerBoost'],
        expected: 101,
        state: { botDistribution: 0.9, botMultitasking: true },
      }),
      101,
    )
    expectValue(
      resolveCase({
        effectId: 'effect.producedAsScienceTree.science_multiplier',
        owned: ['producedAsScienceTree'],
        expected: 101,
        state: { botDistribution: 0.1, botMultitasking: true },
      }),
      101,
    )
  })

  test('preserves Taste of Power nested-skill precedence', () => {
    expectValue(
      resolveCase({
        effectId: 'effect.tasteOfPower.money_multiplier',
        owned: ['tasteOfPower', 'indulgingInPower'],
        expected: 0.6,
      }),
      0.6,
    )
    expectValue(
      resolveCase({
        effectId: 'effect.tasteOfPower.science_multiplier',
        owned: ['tasteOfPower', 'indulgingInPower', 'addictionToPower'],
        expected: 0.5,
      }),
      0.5,
    )
  })

  test('uses adjusted Stellar Galaxies for the Obliteration division', () => {
    const halfGalaxy = {
      panelsPerSecond: 100_000_000_000_000,
      panelLifetimeSeconds: 10,
    }
    expectValue(
      resolveCase({
        effectId: 'effect.stellarObliteration.money_multiplier',
        owned: ['stellarObliteration'],
        expected: 0.002,
        derived: halfGalaxy,
      }),
      0.002,
    )
  })

  test('preserves stellar-sacrifice precedence, modifiers, and inclusive bot comparison', () => {
    const twoStars = {
      panelsPerSecond: 4_000,
      panelLifetimeSeconds: 10,
    }
    const cases = [
      { nested: [] as readonly string[], required: 200 },
      { nested: ['stellarObliteration'], required: 200_000 },
      { nested: ['supernova'], required: 200_000_000 },
      {
        nested: ['supernova', 'stellarImprovements'],
        required: 200_000,
      },
    ]

    for (const { nested, required } of cases) {
      expectValue(
        resolveCase({
          effectId: 'effect.stellarDominance.money_multiplier',
          owned: ['stellarDominance', ...nested],
          expected: 0.01,
          state: { bots: required },
          derived: twoStars,
        }),
        0.01,
      )
      expectValue(
        resolveCase({
          effectId: 'effect.stellarDominance.money_multiplier',
          owned: ['stellarDominance', ...nested],
          expected: 0.01,
          state: { bots: required + 1 },
          derived: twoStars,
        }),
        0.01,
      )
    }
  })

  test('returns Unity neutral values for unowned skills without reading dependencies', () => {
    for (const testCase of [...moneyCases, ...scienceCases]) {
      const additive =
        testCase.effectId ===
          'effect.regulatedAcademia.money_multiplier' ||
        testCase.effectId ===
          'effect.regulatedAcademia.science_multiplier' ||
        testCase.effectId ===
          'effect.idleSpaceFlight.science_multiplier'
      const result = resolveMoneyScienceSkillEffect(
        testCase.effectId,
        makeState([], { researchLevels: {} }),
        {
          ...tuning,
          moneyMultiUpgradePercent: Number.NaN,
          scienceBoostPercent: Number.NaN,
        },
        {
          panelsPerSecond: undefined,
          panelLifetimeSeconds: undefined,
          scienceMultiplier: undefined,
        },
      )
      expectValue(result, additive ? 0 : 1)
    }
  })
})

describe('money/science resolver fail-closed contract', () => {
  test('does not claim unknown or malformed effects', () => {
    expect(
      resolveMoneyScienceSkillEffect(
        'effect.futureSkill.money_multiplier',
        makeState(),
        tuning,
        baseDerived,
      ),
    ).toEqual({ handled: false })
    expect(
      resolveMoneyScienceSkillEffect(
        'regulatedAcademia.money_multiplier',
        makeState(),
        tuning,
        baseDerived,
      ),
    ).toEqual({ handled: false })
  })

  test('reports missing primary and nested canonical skill state', () => {
    expectIssue(
      resolveMoneyScienceSkillEffect(
        'effect.workerBoost.money_multiplier',
        makeState([], { omitSkills: ['workerBoost'] }),
        tuning,
        baseDerived,
      ),
      'DYSON_MONEY_SCIENCE_SKILL_STATE_MISSING',
      'skills.byId.workerBoost',
    )
    expectIssue(
      resolveMoneyScienceSkillEffect(
        'effect.tasteOfPower.science_multiplier',
        makeState(['tasteOfPower'], {
          omitSkills: ['indulgingInPower'],
        }),
        tuning,
        baseDerived,
      ),
      'DYSON_MONEY_SCIENCE_SKILL_STATE_MISSING',
      'skills.byId.indulgingInPower',
    )
  })

  test('distinguishes missing and invalid derived dependencies', () => {
    expectIssue(
      resolveMoneyScienceSkillEffect(
        'effect.shouldersOfPrecursors.money_multiplier',
        makeState(['shouldersOfPrecursors']),
        tuning,
        { ...baseDerived, scienceMultiplier: undefined },
      ),
      'DYSON_MONEY_SCIENCE_DERIVED_INPUT_MISSING',
      'derived.scienceMultiplier',
    )
    expectIssue(
      resolveMoneyScienceSkillEffect(
        'effect.idleSpaceFlight.science_multiplier',
        makeState(['idleSpaceFlight']),
        tuning,
        { ...baseDerived, panelsPerSecond: Number.NaN },
      ),
      'DYSON_MONEY_SCIENCE_DERIVED_INPUT_INVALID',
      'derived.panelsPerSecond',
    )
  })

  test('rejects invalid canonical and compatibility values', () => {
    expectIssue(
      resolveMoneyScienceSkillEffect(
        'effect.scientificRevolution.science_multiplier',
        makeState(['scientificRevolution'], {
          botDistribution: 1.01,
        }),
        tuning,
        baseDerived,
      ),
      'DYSON_MONEY_SCIENCE_CANONICAL_INPUT_INVALID',
      'dyson.botDistribution',
    )
    expectIssue(
      resolveMoneyScienceSkillEffect(
        'effect.regulatedAcademia.money_multiplier',
        makeState(['regulatedAcademia'], {
          researchLevels: {
            'research.money_multiplier': 1.5,
            'research.science_boost': 4,
          },
        }),
        tuning,
        baseDerived,
      ),
      'DYSON_MONEY_SCIENCE_CANONICAL_INPUT_INVALID',
      'research.levelsById.research.money_multiplier',
    )
    expectIssue(
      resolveMoneyScienceSkillEffect(
        'effect.regulatedAcademia.science_multiplier',
        makeState(['regulatedAcademia']),
        { ...tuning, scienceBoostPercent: Number.POSITIVE_INFINITY },
        baseDerived,
      ),
      'DYSON_MONEY_SCIENCE_TUNING_INVALID',
      'compatibilityTuning.scienceBoostPercent',
    )
    expectIssue(
      resolveMoneyScienceSkillEffect(
        'effect.purityOfMind.money_multiplier',
        makeState(['purityOfMind'], {
          points: DISCRETE_MAXIMUM + 1n,
        }),
        tuning,
        baseDerived,
      ),
      'DYSON_MONEY_SCIENCE_CANONICAL_INPUT_INVALID',
      'skills.points',
    )
  })

  test('blocks finite inputs whose calculation overflows', () => {
    expectIssue(
      resolveMoneyScienceSkillEffect(
        'effect.idleSpaceFlight.science_multiplier',
        makeState(['idleSpaceFlight']),
        tuning,
        {
          ...baseDerived,
          panelsPerSecond: Number.MAX_VALUE,
          panelLifetimeSeconds: 2,
        },
      ),
      'DYSON_MONEY_SCIENCE_RESULT_NON_FINITE',
      'effects.effect.idleSpaceFlight.science_multiplier',
    )
  })
})
