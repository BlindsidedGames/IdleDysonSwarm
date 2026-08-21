import { describe, expect, test, vi } from 'vitest'
import { getGameAsset } from '../game-data/catalog'
import type {
  RuntimeAssetValue,
  RuntimeGameAsset,
} from '../game-data/types'
import { compileSkillEffectCatalog } from './compiledSkillEffectCatalog'

describe('compiled skill effect catalog', () => {
  test('compiles the generated catalog once in SkillDatabase source order', () => {
    const lookup = vi.fn(getGameAsset)
    const catalog = compileSkillEffectCatalog(lookup)
    const lookupCountAfterCompilation = lookup.mock.calls.length

    const selectedMoneyEffects = catalog
      .candidatesForStat('Global.MoneyMultiplier')
      .filter(({ skillId }) =>
        new Set([
          'startHereTree',
          'superchargedPower',
          'economicDominance',
        ]).has(skillId),
      )

    expect(selectedMoneyEffects.map(({ effect }) => effect.id)).toEqual([
      'effect.superchargedPower.money_multiplier',
      'effect.startHereTree.money_multiplier',
      'effect.economicDominance.money_multiplier',
    ])
    expect(lookupCountAfterCompilation).toBeGreaterThan(100)

    for (let index = 0; index < 100; index += 1) {
      catalog.candidatesForStat('Global.MoneyMultiplier')
      catalog.candidatesForStat('Facility.Planet.Production')
      catalog.candidatesForStat('missing-stat')
    }
    expect(lookup).toHaveBeenCalledTimes(lookupCountAfterCompilation)
  })

  test('freezes compiled definitions and converts their static contract', () => {
    const catalog = compileSkillEffectCatalog(getGameAsset)
    const candidate = catalog
      .candidatesForStat('Facility.Planet.Production')
      .find(({ effect }) => effect.id === 'effect.avocados.planets')

    expect(candidate).toEqual({
      skillId: 'avocados',
      effect: {
        id: 'effect.avocados.planets',
        operation: 'multiply',
        authoredValue: 2,
        perLevel: 0,
        order: 20,
        conditionId: 'planets_69',
        conditionAssetId: 'condition.planets_69',
        targetFacilityIds: ['planets'],
        targetFacilityTags: [],
      },
    })
    expect(Object.isFrozen(candidate)).toBe(true)
    expect(Object.isFrozen(candidate?.effect)).toBe(true)
    expect(Object.isFrozen(candidate?.effect.targetFacilityIds)).toBe(
      true,
    )
    expect(
      Object.isFrozen(
        catalog.candidatesForStat('Facility.Planet.Production'),
      ),
    ).toBe(true)
  })

  test('preserves legacy IDs while retargeting VPT and the approved authored values', () => {
    const catalog = compileSkillEffectCatalog(getGameAsset)
    const vpt = catalog
      .candidatesForStat('Facility.Server.Production')
      .find(({ effect }) =>
        effect.id ===
        'effect.versatileProductionTactics.assembly_lines_modifier')
    expect(vpt).toMatchObject({
      skillId: 'versatileProductionTactics',
      effect: {
        id: 'effect.versatileProductionTactics.assembly_lines_modifier',
        targetFacilityIds: ['servers'],
      },
    })
    expect(
      catalog.candidatesForStat('Facility.Manager.Production')
        .some(({ effect }) =>
          effect.id ===
          'effect.versatileProductionTactics.assembly_lines_modifier'),
    ).toBe(false)
    expect(
      getGameAsset(
        'GameData.EffectDefinition',
        'effect.worthySacrifice.assembly_lines_modifier',
      )?.data.value,
    ).toBe(5)
    expect(
      getGameAsset('GameData.SkillDefinition', 'purityOfSEssence'),
    ).toBeDefined()
    expect(
      getGameAsset('GameData.SkillDefinition', 'galacticPradigmShift'),
    ).toBeDefined()
  })

  test('retains the existing missing-reference and effect-validation errors', () => {
    expect(() => compileSkillEffectCatalog(() => undefined)).toThrow(
      'Exported game data is missing SkillDatabase.',
    )

    const database = asset(
      'GameData.SkillDatabase',
      'SkillDatabase',
      { skills: [{ id: 'test-skill' }] },
    )
    expect(() =>
      compileSkillEffectCatalog((kind, id) =>
        kind === database.kind && id === database.id
          ? database
          : undefined,
      ),
    ).toThrow(
      "Exported SkillDatabase references missing skill 'test-skill'.",
    )

    const skill = asset(
      'GameData.SkillDefinition',
      'test-skill',
      { effects: [{ id: 'test-effect' }] },
    )
    expect(() =>
      compileSkillEffectCatalog(
        lookupFrom(database, skill),
      ),
    ).toThrow(
      "Skill 'test-skill' references missing effect 'test-effect'.",
    )

    const mismatchedEffect = asset(
      'GameData.EffectDefinition',
      'test-effect',
      effectData({ id: 'different-effect' }),
    )
    expect(() =>
      compileSkillEffectCatalog(
        lookupFrom(database, skill, mismatchedEffect),
      ),
    ).toThrow(
      "Effect asset 'test-effect' declares mismatched id 'different-effect'.",
    )

    const unsupportedOperation = asset(
      'GameData.EffectDefinition',
      'test-effect',
      effectData({ operation: 42 }),
    )
    expect(() =>
      compileSkillEffectCatalog(
        lookupFrom(database, skill, unsupportedOperation),
      ),
    ).toThrow("Unsupported Unity StatOperation '42'")
  })
})

function asset(
  kind: string,
  id: string,
  data: Readonly<Record<string, RuntimeAssetValue>>,
): RuntimeGameAsset {
  return { kind, id, data }
}

function lookupFrom(
  ...assets: readonly RuntimeGameAsset[]
): (kind: string, id: string) => RuntimeGameAsset | undefined {
  return (kind, id) =>
    assets.find(
      (candidate) => candidate.kind === kind && candidate.id === id,
    )
}

function effectData(
  overrides: Readonly<Record<string, RuntimeAssetValue>> = {},
): Readonly<Record<string, RuntimeAssetValue>> {
  return {
    id: 'test-effect',
    targetStatId: 'Global.Test',
    operation: 1,
    value: 1,
    perLevel: 0,
    order: 0,
    conditionId: null,
    _condition: null,
    targetFacilityIds: [],
    targetFacilityTags: [],
    ...overrides,
  }
}
