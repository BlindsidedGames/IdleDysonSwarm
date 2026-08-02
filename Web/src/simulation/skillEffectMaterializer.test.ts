import { describe, expect, test, vi } from 'vitest'
import { materializeSkillEffects } from './skillEffectMaterializer'

describe('skill effect materializer', () => {
  test('uses SkillDatabase order and authored values for global effects', () => {
    const effects = materializeSkillEffects({
      ownedSkillIds: new Set([
        'startHereTree',
        'superchargedPower',
        'economicDominance',
      ]),
      targetStatId: 'Global.MoneyMultiplier',
    })

    expect(effects.map((effect) => effect.id)).toEqual([
      'effect.superchargedPower.money_multiplier',
      'effect.startHereTree.money_multiplier',
      'effect.economicDominance.money_multiplier',
    ])
    expect(effects.map((effect) => effect.value)).toEqual([1.5, 1.2, 20])
  })

  test('applies facility IDs before resolving dynamic values', () => {
    const resolveDynamicValue = vi.fn(() => 123)
    const effects = materializeSkillEffects({
      ownedSkillIds: new Set(['superchargedPower']),
      targetStatId: 'Facility.AssemblyLine.Production',
      facility: { id: 'servers', tags: [] },
      resolveDynamicValue,
    })

    expect(effects).toEqual([])
    expect(resolveDynamicValue).not.toHaveBeenCalled()
  })

  test('dynamic values replace authored values and neutral values skip', () => {
    const effects = materializeSkillEffects({
      ownedSkillIds: new Set([
        'parallelComputation',
        'superchargedPower',
      ]),
      targetStatId: 'Facility.DataCenter.Production',
      facility: { id: 'data_centers', tags: [] },
      resolveDynamicValue: (id) =>
        id === 'effect.parallel_computation.data_centers' ? 1 : undefined,
    })

    expect(effects).toEqual([
      {
        id: 'effect.supercharged_power.data_centers',
        operation: 'multiply',
        value: 1.5,
        order: 30,
      },
    ])
  })

  test('evaluates conditions after ownership and facility filters', () => {
    const isConditionMet = vi.fn(() => true)
    const effects = materializeSkillEffects({
      ownedSkillIds: new Set(['avocados']),
      targetStatId: 'Facility.Planet.Production',
      facility: { id: 'planets', tags: [] },
      isConditionMet,
    })

    expect(isConditionMet).toHaveBeenCalledExactlyOnceWith(
      'effect.avocados.planets',
      {
        assetId: 'condition.planets_69',
        legacyId: 'planets_69',
      },
    )
    expect(effects).toEqual([
      {
        id: 'effect.avocados.planets',
        operation: 'multiply',
        value: 2,
        order: 20,
        conditionIdentifier: 'condition.planets_69',
      },
    ])
  })

  test('fails closed when a matched conditional effect has no evaluator', () => {
    expect(() =>
      materializeSkillEffects({
        ownedSkillIds: new Set(['avocados']),
        targetStatId: 'Facility.Server.Production',
        facility: { id: 'servers', tags: [] },
      }),
    ).toThrow(
      "Conditional effect 'effect.avocados.servers' requires a condition evaluator.",
    )
  })
})
