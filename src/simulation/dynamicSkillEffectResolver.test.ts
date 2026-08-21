import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import type { DysonSkillEffectEvaluationSnapshot } from '../game-state/skillEffectEvaluationSnapshot'
import { hydrateGameState } from '../game-state/mapping'
import type {
  CanonicalGameStateV1,
  SkillRuntimeState,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  prepareDynamicSkillEffectResolver,
  resolveDynamicSkillEffect,
} from './dynamicSkillEffectResolver'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)
const tuning: Readonly<DysonCompatibilityTuning> = Object.freeze({
  panelsPerSecMulti: 1,
  scienceBoostPercent: 0.05,
  moneyMultiUpgradePercent: 0.05,
  assemblyLineUpgradePercent: 0.03,
  aiManagerUpgradePercent: 0.03,
  serverUpgradePercent: 0.03,
  dataCenterUpgradePercent: 0.03,
  planetUpgradePercent: 0.03,
  matrioshkaUpgradePercent: 0.03,
  birchUpgradePercent: 0.03,
  galacticUpgradePercent: 0.03,
})
const snapshot: Readonly<DysonSkillEffectEvaluationSnapshot> =
  Object.freeze({
    panelsPerSecond: 100,
    panelLifetimeSeconds: 200,
    scienceMultiplier: 7,
    rudimentarySingularityProduction: 11,
    pocketDimensionsProduction: 13,
    scientificPlanetsProduction: 17,
    managerAssemblyLineProduction: 19,
  })

function state(ownedIds: readonly string[]): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixture).prepared,
  ).state
  const owned = new Set(ownedIds)
  return {
    ...source,
    dyson: {
      ...source.dyson,
      workers: 100,
      researchers: 100,
      botDistribution: 0.25,
      facilities: {
        ...source.dyson.facilities,
        assembly_lines: [5, 5],
        ai_managers: [4, 1],
        servers: [4, 4],
        data_centers: [2, 3],
        planets: [50, 50],
      },
    },
    skills: {
      ...source.skills,
      points: 10n,
      fragments: 5n,
      byId: Object.fromEntries(
        Object.entries(source.skills.byId).map(([id, skill]) => [
          id,
          {
            ...skill,
            owned: owned.has(id),
            timerSeconds:
              id === 'superRadiantScattering' ? 100 : 0,
          } satisfies SkillRuntimeState,
        ]),
      ),
    },
  }
}

function value(effectId: string, ownedIds: readonly string[]): number {
  const result = resolveDynamicSkillEffect(
    effectId,
    state(ownedIds),
    tuning,
    snapshot,
  )
  expect(result.handled).toBe(true)
  if (!result.handled || !result.ok) {
    throw new Error(JSON.stringify(result))
  }
  return result.value
}

describe('dynamic skill effect resolver', () => {
  test('prepared authority resolves multiple effect families with wrapper parity', () => {
    const source = state([
      'shouldersOfPrecursors',
      'stayingPower',
      'androids',
      'planetAssembly',
      'shouldersOfGiants',
      'scientificPlanets',
      'manualLabour',
    ])
    const prepared = prepareDynamicSkillEffectResolver(
      source,
      tuning,
      snapshot,
    )
    const effectIds = [
      'effect.shouldersOfPrecursors.money_multiplier',
      'effect.staying_power.assembly_lines',
      'effect.androids.panel_lifetime',
      'effect.planetAssembly.planets_per_second',
      'effect.shouldersOfGiants.science_boost_per_second',
      'effect.manualLabour.tinker_assembly_yield',
      'effect.startHereTree.money_multiplier',
    ]

    for (const effectId of effectIds) {
      expect(prepared.resolve(effectId)).toEqual(
        resolveDynamicSkillEffect(effectId, source, tuning, snapshot),
      )
    }
  })

  test('prepared authority captures ownership once for the derivation', () => {
    const source = state(['panelMaintenance'])
    const prepared = prepareDynamicSkillEffectResolver(
      source,
      tuning,
      snapshot,
    )

    ;(
      source.skills.byId.panelMaintenance as { owned: boolean }
    ).owned = false

    expect(
      prepared.resolve('effect.panelMaintenance.panel_lifetime'),
    ).toEqual({
      handled: true,
      ok: true,
      value: 75,
    })
    expect(
      resolveDynamicSkillEffect(
        'effect.panelMaintenance.panel_lifetime',
        source,
        tuning,
        snapshot,
      ),
    ).toEqual({ handled: true, ok: true, value: 0 })
  })

  test('prepared authority preserves typed dynamic failures', () => {
    const source = state(['higgsBoson'])
    const invalid = {
      ...snapshot,
      panelsPerSecond: Number.NaN,
    }
    const prepared = prepareDynamicSkillEffectResolver(
      source,
      tuning,
      invalid,
    )

    expect(
      prepared.resolve('effect.higgsBoson.money_multiplier'),
    ).toMatchObject({
      handled: true,
      ok: false,
      issue: {
        code: 'DYSON_MONEY_SCIENCE_DERIVED_INPUT_INVALID',
      },
    })
    expect(
      prepared.resolve('effect.rocketMania.panels_per_second'),
    ).toMatchObject({
      handled: true,
      ok: false,
      issue: {
        code: 'DYSON_DYNAMIC_SKILL_EFFECT_INVALID',
      },
    })
  })

  test('composes money/science and facility branches', () => {
    expect(
      value('effect.shouldersOfPrecursors.money_multiplier', [
        'shouldersOfPrecursors',
      ]),
    ).toBe(7)
    expect(
      value('effect.staying_power.assembly_lines', ['stayingPower']),
    ).toBe(1 + Math.fround(0.01) * 200)
  })

  test('composes panel and planet-generation branches', () => {
    expect(
      value('effect.androids.panel_lifetime', ['androids']),
    ).toBe(0)
    expect(
      value('effect.planetAssembly.planets_per_second', [
        'planetAssembly',
      ]),
    ).toBe(1)
  })

  test('composes shoulders and tinker branches', () => {
    expect(
      value('effect.shouldersOfGiants.science_boost_per_second', [
        'shouldersOfGiants',
        'scientificPlanets',
      ]),
    ).toBe(17)
    expect(
      value('effect.manualLabour.tinker_assembly_yield', [
        'manualLabour',
      ]),
    ).toBe(0.2)
  })

  test('leaves authored static effects unhandled', () => {
    expect(
      resolveDynamicSkillEffect(
        'effect.startHereTree.money_multiplier',
        state(['startHereTree']),
        tuning,
        snapshot,
      ),
    ).toEqual({ handled: false })
  })

  test('returns typed failures for invalid recognized dependencies', () => {
    const invalid = {
      ...snapshot,
      panelsPerSecond: Number.NaN,
    }
    const result = resolveDynamicSkillEffect(
      'effect.higgsBoson.money_multiplier',
      state(['higgsBoson']),
      tuning,
      invalid,
    )
    expect(result).toMatchObject({
      handled: true,
      ok: false,
      issue: {
        code: 'DYSON_MONEY_SCIENCE_DERIVED_INPUT_INVALID',
      },
    })
  })
})
