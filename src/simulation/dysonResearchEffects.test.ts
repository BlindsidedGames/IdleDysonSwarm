import { describe, expect, test } from 'vitest'
import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import { getGameAsset } from '../game-data/catalog'
import { calculateStat } from './stat'
import {
  materializeDysonResearchEffects,
  type MaterializedDysonResearchEffect,
} from './dysonResearchEffects'

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

function requireEffects(
  levelsById: Readonly<Record<string, number>>,
): readonly MaterializedDysonResearchEffect[] {
  const result = materializeDysonResearchEffects(levelsById, tuning)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.effects
}

describe('canonical Dyson research-effect materialization', () => {
  test.each([
    [
      'research.money_multiplier',
      'effect.research.money_multiplier',
      'Global.MoneyMultiplier',
      0.06,
    ],
    [
      'research.science_boost',
      'effect.research.science_multiplier',
      'Global.ScienceMultiplier',
      0.07,
    ],
    [
      'research.assembly_line_upgrade',
      'effect.research.assembly_line_modifier',
      'Facility.AssemblyLine.Modifier',
      0.08,
    ],
    [
      'research.ai_manager_upgrade',
      'effect.research.ai_manager_modifier',
      'Facility.Manager.Modifier',
      0.09,
    ],
    [
      'research.server_upgrade',
      'effect.research.server_modifier',
      'Facility.Server.Modifier',
      0.1,
    ],
    [
      'research.data_center_upgrade',
      'effect.research.data_center_modifier',
      'Facility.DataCenter.Modifier',
      0.11,
    ],
    [
      'research.planet_upgrade',
      'effect.research.planet_modifier',
      'Facility.Planet.Modifier',
      0.12,
    ],
    [
      'research.matrioshka_brains_upgrade',
      'effect.research.matrioshka_modifier',
      'Facility.Matrioshka.Modifier',
      0.13,
    ],
    [
      'research.birch_planets_upgrade',
      'effect.research.birch_modifier',
      'Facility.Birch.Modifier',
      0.14,
    ],
    [
      'research.galactic_brains_upgrade',
      'effect.research.galactic_modifier',
      'Facility.Galactic.Modifier',
      0.15,
    ],
  ])(
    'uses compatibility coefficient for %s',
    (researchId, effectId, targetStatId, coefficient) => {
      const [effect] = requireEffects({ [researchId]: 3 })

      expect(effect).toEqual({
        researchId,
        targetStatId,
        id: effectId,
        operation: 'add',
        value: coefficient * 3,
        order: 0,
      })
    },
  )

  test('uses exported panel-lifetime per-level values and max-level caps', () => {
    const effects = requireEffects({
      'research.panel_lifetime_1': 5,
      'research.panel_lifetime_2': 5,
      'research.panel_lifetime_3': 5,
      'research.panel_lifetime_4': 5,
    })

    expect(effects.map(({ id, operation, order, value }) => ({
      id,
      operation,
      order,
      value,
    }))).toEqual([
      {
        id: 'effect.research.panel_lifetime_1',
        operation: 'add',
        order: 0,
        value: 1,
      },
      {
        id: 'effect.research.panel_lifetime_2',
        operation: 'add',
        order: 0,
        value: 2,
      },
      {
        id: 'effect.research.panel_lifetime_3',
        operation: 'add',
        order: 0,
        value: 3,
      },
      {
        id: 'effect.research.panel_lifetime_4',
        operation: 'add',
        order: 0,
        value: 4,
      },
    ])
    expect(calculateStat(10, effects)).toBe(20)
  })

  test('omits Unity-neutral zero-valued research effects', () => {
    expect(
      materializeDysonResearchEffects(
        {
          'research.money_multiplier': 4,
          'research.panel_lifetime_1': 0,
        },
        {
          ...tuning,
          moneyMultiUpgradePercent: 0,
        },
      ),
    ).toEqual({ ok: true, effects: [] })
  })

  test('uses secret-derived research coefficient overrides', () => {
    const result = materializeDysonResearchEffects(
      {
        'research.assembly_line_upgrade': 2,
        'research.ai_manager_upgrade': 2,
        'research.server_upgrade': 2,
        'research.planet_upgrade': 2,
      },
      tuning,
      {
        'research.assembly_line_upgrade': Math.fround(0.12),
        'research.ai_manager_upgrade': Math.fround(0.09),
        'research.server_upgrade': Math.fround(0.09),
        'research.planet_upgrade': Math.fround(0.09),
      },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(
      Object.fromEntries(
        result.effects.map((effect) => [
          effect.researchId,
          effect.value,
        ]),
      ),
    ).toEqual({
      'research.assembly_line_upgrade': Math.fround(0.12) * 2,
      'research.ai_manager_upgrade': Math.fround(0.09) * 2,
      'research.server_upgrade': Math.fround(0.09) * 2,
      'research.planet_upgrade': Math.fround(0.09) * 2,
    })
  })

  test('fails closed when a referenced effect asset is missing', () => {
    const result = materializeDysonResearchEffects(
      { 'research.money_multiplier': 1 },
      tuning,
      {},
      (kind, id) =>
        kind === 'GameData.EffectDefinition' &&
        id === 'effect.research.money_multiplier'
          ? undefined
          : getGameAsset(kind, id),
    )

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: 'DYSON_RESEARCH_EFFECT_MISSING',
          path: 'gameData.effects.effect.research.money_multiplier',
          detail:
            "Research effect 'effect.research.money_multiplier' is missing.",
        },
      ],
    })
  })

  test('fails closed for fractional levels and unknown active research', () => {
    const result = materializeDysonResearchEffects(
      {
        'research.money_multiplier': 1.5,
        'research.future_dyson_upgrade': 1,
        'research.future_inactive_upgrade': 0,
      },
      tuning,
    )

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected materialization failure')
    expect(result.issues.map(({ code, path }) => ({ code, path }))).toEqual([
      {
        code: 'DYSON_RESEARCH_ID_UNSUPPORTED',
        path: 'research.levelsById.research.future_dyson_upgrade',
      },
      {
        code: 'DYSON_RESEARCH_LEVEL_INVALID',
        path: 'research.levelsById.research.money_multiplier',
      },
    ])
  })

  test('fails closed when exported metadata drifts from the exact contract', () => {
    const result = materializeDysonResearchEffects(
      { 'research.money_multiplier': 1 },
      tuning,
      {},
      (kind, id) => {
        const asset = getGameAsset(kind, id)
        if (
          asset === undefined ||
          kind !== 'GameData.EffectDefinition' ||
          id !== 'effect.research.money_multiplier'
        ) {
          return asset
        }
        return {
          ...asset,
          data: {
            ...asset.data,
            order: 1,
          },
        }
      },
    )

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: 'DYSON_RESEARCH_EFFECT_INVALID',
          path: 'gameData.effects.effect.research.money_multiplier',
          detail:
            "Research effect 'effect.research.money_multiplier' does not match its characterized Unity contract.",
        },
      ],
    })
  })

  test('fails closed for invalid canonical levels and compatibility values', () => {
    const result = materializeDysonResearchEffects(
      { 'research.science_boost': Number.NaN },
      {
        ...tuning,
        serverUpgradePercent: Number.POSITIVE_INFINITY,
      },
    )

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected materialization failure')
    expect(result.issues.map(({ code, path }) => ({ code, path }))).toEqual([
      {
        code: 'DYSON_RESEARCH_TUNING_INVALID',
        path: 'compatibilityTuning.serverUpgradePercent',
      },
      {
        code: 'DYSON_RESEARCH_LEVEL_INVALID',
        path: 'research.levelsById.research.science_boost',
      },
    ])
  })
})
