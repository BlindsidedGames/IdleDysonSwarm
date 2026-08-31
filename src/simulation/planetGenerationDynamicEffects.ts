import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import { extractDynamicSkillId } from './dynamicEffectId'
import { DISCRETE_MAXIMUM } from './numeric'
import {
  resolveStellarSacrificePlanetsPerSecond,
} from './stellarArithmetic'

export {
  resolveStellarSacrificesRequiredBots,
} from './stellarArithmetic'

const PLANETS_PER_SECOND_SUFFIX = '.planets_per_second'

export interface PlanetGenerationDynamicInputs {
  readonly ownedSkills: ReadonlySet<string>
  readonly researchers: number
  readonly fragments: bigint
  readonly assemblyLines: readonly [automatic: number, manual: number]
  readonly planets: readonly [automatic: number, manual: number]
  readonly panelsPerSecond: number
  readonly panelLifetimeSeconds: number
  readonly bots: number
  readonly scienceBoostLevel: number
}

export const PLANET_GENERATION_DYNAMIC_EFFECT_ORDERS = Object.freeze({
  scientificPlanets: 10,
  planetAssembly: 20,
  shellWorlds: 30,
  stellarSacrifices: 40,
  shouldersOfTheFallen: 45,
})

const SUPPORTED_SKILLS = new Set(
  Object.keys(PLANET_GENERATION_DYNAMIC_EFFECT_ORDERS),
)

export function tryResolvePlanetGenerationDynamicEffect(
  effectId: string,
  inputs: PlanetGenerationDynamicInputs,
): number | undefined {
  const skillId = extractDynamicSkillId(effectId, PLANETS_PER_SECOND_SUFFIX)
  if (skillId === undefined || !SUPPORTED_SKILLS.has(skillId)) {
    return undefined
  }
  validateInputs(inputs)

  switch (skillId) {
    case 'scientificPlanets':
      return scientificPlanetsProduction(inputs)
    case 'planetAssembly':
      return planetAssemblyProduction(inputs)
    case 'shellWorlds':
      return shellWorldsProduction(inputs)
    case 'stellarSacrifices':
      return stellarSacrificesProduction(inputs)
    case 'shouldersOfTheFallen':
      if (
        !inputs.ownedSkills.has('shouldersOfTheFallen') ||
        inputs.scienceBoostLevel <= 0 ||
        !inputs.ownedSkills.has('scientificPlanets')
      ) {
        return 0
      }
      return logarithm(inputs.scienceBoostLevel, 2)
  }
}

function scientificPlanetsProduction(
  inputs: PlanetGenerationDynamicInputs,
): number {
  let production =
    inputs.researchers > 1 &&
    inputs.ownedSkills.has('scientificPlanets')
      ? Math.log10(inputs.researchers)
      : 0
  if (inputs.ownedSkills.has('hubbleTelescope')) production *= 2
  if (inputs.ownedSkills.has('jamesWebbTelescope')) production *= 4
  if (inputs.ownedSkills.has('terraformingProtocols')) {
    production += Number(inputs.fragments)
  }
  return production
}

function planetAssemblyProduction(
  inputs: PlanetGenerationDynamicInputs,
): number {
  const totalAssemblyLines =
    inputs.assemblyLines[0] + inputs.assemblyLines[1]
  return (
    inputs.ownedSkills.has('planetAssembly') &&
    totalAssemblyLines >= 10
  )
    ? Math.log10(totalAssemblyLines)
    : 0
}

function shellWorldsProduction(
  inputs: PlanetGenerationDynamicInputs,
): number {
  const totalPlanets = inputs.planets[0] + inputs.planets[1]
  // Unity's legacy helper deliberately gates this on planetAssembly.
  return (
    inputs.ownedSkills.has('planetAssembly') &&
    totalPlanets >= 2
  )
    ? logarithm(totalPlanets, 2)
    : 0
}

function stellarSacrificesProduction(
  inputs: PlanetGenerationDynamicInputs,
): number {
  return resolveStellarSacrificePlanetsPerSecond(
    inputs.ownedSkills,
    inputs.panelsPerSecond,
    inputs.panelLifetimeSeconds,
  )
}

function logarithm(value: number, base: number): number {
  return Math.log(value) / Math.log(base)
}

function validateInputs(inputs: PlanetGenerationDynamicInputs): void {
  if (!(inputs.ownedSkills instanceof Set)) {
    throw new Error(
      'Planet generation effects require an owned-skill set.',
    )
  }
  if (
    typeof inputs.fragments !== 'bigint' ||
    inputs.fragments < 0n ||
    inputs.fragments > DISCRETE_MAXIMUM
  ) {
    throw new Error(
      'Planet generation effects require long-range non-negative fragments.',
    )
  }
  requirePair(inputs.assemblyLines, 'assembly-line')
  requirePair(inputs.planets, 'planet')
  requireNonNegative(inputs.researchers, 'researchers')
  requireNonNegative(inputs.panelsPerSecond, 'panels per second')
  requireNonNegative(inputs.panelLifetimeSeconds, 'panel lifetime')
  requireNonNegative(inputs.bots, 'bots')
  requireNonNegative(inputs.scienceBoostLevel, 'science boost level')
}

function requirePair(
  value: readonly number[],
  label: string,
): void {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error(
      `Planet generation effects require two ${label} counts.`,
    )
  }
  requireNonNegative(value[0]!, `automatic ${label} count`)
  requireNonNegative(value[1]!, `manual ${label} count`)
}

function requireNonNegative(value: number, label: string): void {
  if (!isFiniteNonNegativeNumber(value)) {
    throw new Error(
      `Planet generation effects require finite non-negative ${label}.`,
    )
  }
}
