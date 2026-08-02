import { describe, expect, test } from 'vitest'
import {
  tryResolveShouldersAccrualDynamicEffect,
  tryResolveTinkerDynamicEffect,
  type ShouldersAccrualDynamicInputs,
  type TinkerDynamicInputs,
} from './shouldersTinkerDynamicEffects'

function shouldersInputs(
  ownedSkills: readonly string[],
  overrides: Partial<ShouldersAccrualDynamicInputs> = {},
): ShouldersAccrualDynamicInputs {
  return {
    ownedSkills: new Set(ownedSkills),
    scienceBoostLevel: 8,
    scientificPlanetsProduction: 3.25,
    pocketDimensionsProduction: 4,
    ...overrides,
  }
}

function tinkerInputs(
  ownedSkills: readonly string[],
  overrides: Partial<TinkerDynamicInputs> = {},
): TinkerDynamicInputs {
  return {
    ownedSkills: new Set(ownedSkills),
    assemblyLines: [60, 40],
    managerAssemblyLineProduction: 0.2,
    ...overrides,
  }
}

describe('Unity shoulders accrual dynamic effects', () => {
  test('adds the fallen bonus to scientific planets for both accruals', () => {
    const inputs = shouldersInputs([
      'scientificPlanets',
      'shouldersOfTheFallen',
      'shouldersOfGiants',
      'shouldersOfTheEnlightened',
    ])

    expect(
      tryResolveShouldersAccrualDynamicEffect(
        'effect.shouldersOfGiants.science_boost_per_second',
        inputs,
      ),
    ).toBe(6.25)
    expect(
      tryResolveShouldersAccrualDynamicEffect(
        'effect.shouldersOfTheEnlightened.money_multi_upgrade_per_second',
        inputs,
      ),
    ).toBe(6.25)
  })

  test('requires shoulder surgery before adding the fallen pocket bonus', () => {
    const baseSkills = [
      'scientificPlanets',
      'shouldersOfTheFallen',
      'shouldersOfGiants',
      'whatCouldHaveBeen',
    ]
    const effectId =
      'effect.whatCouldHaveBeen.science_boost_per_second'

    expect(
      tryResolveShouldersAccrualDynamicEffect(
        effectId,
        shouldersInputs(baseSkills),
      ),
    ).toBe(4)
    expect(
      tryResolveShouldersAccrualDynamicEffect(
        effectId,
        shouldersInputs([...baseSkills, 'shoulderSurgery']),
      ),
    ).toBe(7)
  })

  test('uses strict positive-level semantics for the fallen bonus', () => {
    const owned = [
      'scientificPlanets',
      'shouldersOfTheFallen',
      'shouldersOfGiants',
    ]
    const effectId =
      'effect.shouldersOfGiants.science_boost_per_second'

    expect(
      tryResolveShouldersAccrualDynamicEffect(
        effectId,
        shouldersInputs(owned, { scienceBoostLevel: 0 }),
      ),
    ).toBe(3.25)
    expect(
      tryResolveShouldersAccrualDynamicEffect(
        effectId,
        shouldersInputs(owned, { scienceBoostLevel: 1 }),
      ),
    ).toBe(3.25)
  })

  test('returns zero when a recognized effect lacks its skill chain', () => {
    expect(
      tryResolveShouldersAccrualDynamicEffect(
        'effect.shouldersOfGiants.science_boost_per_second',
        shouldersInputs([]),
      ),
    ).toBe(0)
    expect(
      tryResolveShouldersAccrualDynamicEffect(
        'effect.whatCouldHaveBeen.science_boost_per_second',
        shouldersInputs(['whatCouldHaveBeen']),
      ),
    ).toBe(0)
  })

  test('returns undefined for unsupported IDs and suffix combinations', () => {
    const inputs = shouldersInputs([])

    expect(
      tryResolveShouldersAccrualDynamicEffect(
        'effect.unknown.science_boost_per_second',
        inputs,
      ),
    ).toBeUndefined()
    expect(
      tryResolveShouldersAccrualDynamicEffect(
        'effect.shouldersOfGiants.money_multi_upgrade_per_second',
        inputs,
      ),
    ).toBeUndefined()
  })

  test('fails closed for invalid recognized dependencies', () => {
    expect(() =>
      tryResolveShouldersAccrualDynamicEffect(
        'effect.shouldersOfGiants.science_boost_per_second',
        shouldersInputs(['shouldersOfGiants'], {
          scienceBoostLevel: 1.5,
        }),
      ),
    ).toThrow(/non-negative safe-integer science boost level/)
    expect(() =>
      tryResolveShouldersAccrualDynamicEffect(
        'effect.shouldersOfGiants.science_boost_per_second',
        shouldersInputs(['shouldersOfGiants'], {
          scientificPlanetsProduction: Number.NaN,
        }),
      ),
    ).toThrow(/finite non-negative scientific planets production/)
  })
})

describe('Unity tinker dynamic effects', () => {
  test('caps manual labour by facility amount or manager production', () => {
    const effectId = 'effect.manualLabour.tinker_assembly_yield'

    expect(
      tryResolveTinkerDynamicEffect(
        effectId,
        tinkerInputs(['manualLabour']),
      ),
    ).toBe(2)
    expect(
      tryResolveTinkerDynamicEffect(
        effectId,
        tinkerInputs(['manualLabour'], {
          managerAssemblyLineProduction: 0.05,
        }),
      ),
    ).toBe(1)
  })

  test('returns Unity inactive and active values for tinker skills', () => {
    expect(
      tryResolveTinkerDynamicEffect(
        'effect.manualLabour.tinker_assembly_yield',
        tinkerInputs([]),
      ),
    ).toBe(0)
    expect(
      tryResolveTinkerDynamicEffect(
        'effect.versatileProductionTactics.tinker_assembly_yield',
        tinkerInputs([]),
      ),
    ).toBe(1)
    expect(
      tryResolveTinkerDynamicEffect(
        'effect.versatileProductionTactics.tinker_assembly_yield',
        tinkerInputs(['versatileProductionTactics']),
      ),
    ).toBe(1.5)
  })

  test('returns undefined for unsupported tinker IDs', () => {
    const inputs = tinkerInputs([])

    expect(
      tryResolveTinkerDynamicEffect(
        'effect.unknown.tinker_assembly_yield',
        inputs,
      ),
    ).toBeUndefined()
    expect(
      tryResolveTinkerDynamicEffect(
        'effect.manualLabour.tinker_bot_yield',
        inputs,
      ),
    ).toBeUndefined()
    expect(
      tryResolveTinkerDynamicEffect(
        'effect.manualLabour.tinker_cooldown',
        inputs,
      ),
    ).toBeUndefined()
  })

  test('fails closed for invalid recognized dependencies', () => {
    expect(() =>
      tryResolveTinkerDynamicEffect(
        'effect.manualLabour.tinker_assembly_yield',
        tinkerInputs(['manualLabour'], {
          assemblyLines: [1, Number.POSITIVE_INFINITY],
        }),
      ),
    ).toThrow(/finite non-negative manual assembly lines/)
    expect(() =>
      tryResolveTinkerDynamicEffect(
        'effect.manualLabour.tinker_assembly_yield',
        tinkerInputs(['manualLabour'], {
          managerAssemblyLineProduction: -1,
        }),
      ),
    ).toThrow(/finite non-negative manager assembly-line production/)
  })
})
