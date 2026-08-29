import {
  isFiniteNonNegativeNumber,
  isSafeNonNegativeInteger,
} from '../core/finiteNonNegativeNumber'
import { extractDynamicSkillId } from './dynamicEffectId'

const SCIENCE_BOOST_PER_SECOND_SUFFIX =
  '.science_boost_per_second'
const MONEY_UPGRADE_PER_SECOND_SUFFIX =
  '.money_multi_upgrade_per_second'
const TINKER_ASSEMBLY_YIELD_SUFFIX = '.tinker_assembly_yield'

export interface ShouldersAccrualDynamicInputs {
  readonly ownedSkills: ReadonlySet<string>
  readonly scienceBoostLevel: number
  readonly scientificPlanetsProduction: number
  readonly pocketDimensionsProduction: number
}

export interface TinkerDynamicInputs {
  readonly ownedSkills: ReadonlySet<string>
  readonly assemblyLines: readonly [
    automatic: number,
    manual: number,
  ]
  readonly managerAssemblyLineProduction: number
}

/**
 * Resolves Unity's shoulders-accrual dynamic values. Undefined means the
 * effect does not belong to this resolver.
 */
export function tryResolveShouldersAccrualDynamicEffect(
  effectId: string,
  inputs: Readonly<ShouldersAccrualDynamicInputs>,
): number | undefined {
  const skillId =
    extractDynamicSkillId(effectId, SCIENCE_BOOST_PER_SECOND_SUFFIX) ??
    extractDynamicSkillId(effectId, MONEY_UPGRADE_PER_SECOND_SUFFIX)
  if (
    skillId === undefined ||
    !SHOULDERS_ACCRUAL_SKILLS.has(skillId)
  ) {
    return undefined
  }
  if (!isMatchingShouldersEffect(effectId, skillId)) {
    return undefined
  }
  validateShouldersInputs(inputs)

  switch (skillId) {
    case 'shouldersOfGiants':
      if (
        !inputs.ownedSkills.has(skillId) ||
        !inputs.ownedSkills.has('scientificPlanets')
      ) {
        return 0
      }
      return scientificPlanetsWithShouldersBonus(inputs)
    case 'whatCouldHaveBeen':
      if (
        !inputs.ownedSkills.has(skillId) ||
        !inputs.ownedSkills.has('shouldersOfGiants') ||
        !inputs.ownedSkills.has('scientificPlanets')
      ) {
        return 0
      }
      return pocketDimensionsWithShoulderSurgery(inputs)
    case 'shouldersOfTheEnlightened':
      if (
        !inputs.ownedSkills.has(skillId) ||
        !inputs.ownedSkills.has('scientificPlanets')
      ) {
        return 0
      }
      return scientificPlanetsWithShouldersBonus(inputs)
  }
}

/**
 * Resolves Unity's characterized tinker dynamic values. Undefined means the
 * effect does not belong to this resolver.
 */
export function tryResolveTinkerDynamicEffect(
  effectId: string,
  inputs: Readonly<TinkerDynamicInputs>,
): number | undefined {
  const skillId = extractDynamicSkillId(
    effectId,
    TINKER_ASSEMBLY_YIELD_SUFFIX,
  )
  if (skillId === undefined || !TINKER_SKILLS.has(skillId)) {
    return undefined
  }
  validateTinkerInputs(inputs)

  switch (skillId) {
    case 'manualLabour': {
      if (!inputs.ownedSkills.has(skillId)) return 0
      const manualLabourAmount =
        (inputs.assemblyLines[0] + inputs.assemblyLines[1]) / 50
      const managerProduction =
        inputs.managerAssemblyLineProduction * 20
      return Math.min(manualLabourAmount, managerProduction)
    }
    case 'versatileProductionTactics':
      return inputs.ownedSkills.has(skillId) ? 1.5 : 1
  }
}

const SHOULDERS_ACCRUAL_SKILLS = new Set([
  'shouldersOfGiants',
  'whatCouldHaveBeen',
  'shouldersOfTheEnlightened',
])

const TINKER_SKILLS = new Set([
  'manualLabour',
  'versatileProductionTactics',
])

function isMatchingShouldersEffect(
  effectId: string,
  skillId: string,
): boolean {
  return skillId === 'shouldersOfTheEnlightened'
    ? effectId.endsWith(MONEY_UPGRADE_PER_SECOND_SUFFIX)
    : effectId.endsWith(SCIENCE_BOOST_PER_SECOND_SUFFIX)
}

function scientificPlanetsWithShouldersBonus(
  inputs: Readonly<ShouldersAccrualDynamicInputs>,
): number {
  return (
    inputs.scientificPlanetsProduction +
    shouldersOfTheFallenBonus(inputs)
  )
}

function pocketDimensionsWithShoulderSurgery(
  inputs: Readonly<ShouldersAccrualDynamicInputs>,
): number {
  const bonus = inputs.ownedSkills.has('shoulderSurgery')
    ? shouldersOfTheFallenBonus(inputs)
    : 0
  return inputs.pocketDimensionsProduction + bonus
}

function shouldersOfTheFallenBonus(
  inputs: Readonly<ShouldersAccrualDynamicInputs>,
): number {
  return inputs.ownedSkills.has('shouldersOfTheFallen') &&
    inputs.scienceBoostLevel > 0
    ? Math.log2(inputs.scienceBoostLevel)
    : 0
}

function validateShouldersInputs(
  inputs: Readonly<ShouldersAccrualDynamicInputs>,
): void {
  requireOwnedSkillSet(inputs.ownedSkills, 'Shoulders accrual')
  if (
    !isSafeNonNegativeInteger(inputs.scienceBoostLevel)
  ) {
    throw new Error(
      'Shoulders accrual effects require a non-negative safe-integer science boost level.',
    )
  }
  requireFiniteNonNegative(
    inputs.scientificPlanetsProduction,
    'Shoulders accrual',
    'scientific planets production',
  )
  requireFiniteNonNegative(
    inputs.pocketDimensionsProduction,
    'Shoulders accrual',
    'pocket dimensions production',
  )
}

function validateTinkerInputs(
  inputs: Readonly<TinkerDynamicInputs>,
): void {
  requireOwnedSkillSet(inputs.ownedSkills, 'Tinker')
  if (
    !Array.isArray(inputs.assemblyLines) ||
    inputs.assemblyLines.length !== 2
  ) {
    throw new Error('Tinker effects require two assembly-line counts.')
  }
  requireFiniteNonNegative(
    inputs.assemblyLines[0],
    'Tinker',
    'automatic assembly lines',
  )
  requireFiniteNonNegative(
    inputs.assemblyLines[1],
    'Tinker',
    'manual assembly lines',
  )
  requireFiniteNonNegative(
    inputs.managerAssemblyLineProduction,
    'Tinker',
    'manager assembly-line production',
  )
}

function requireOwnedSkillSet(
  value: ReadonlySet<string>,
  family: string,
): void {
  if (!(value instanceof Set)) {
    throw new Error(`${family} effects require an owned-skill set.`)
  }
}

function requireFiniteNonNegative(
  value: number,
  family: string,
  label: string,
): void {
  if (!isFiniteNonNegativeNumber(value)) {
    throw new Error(
      `${family} effects require finite non-negative ${label}.`,
    )
  }
}
