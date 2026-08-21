import { getGameAsset } from '../game-data/catalog'
import type { RuntimeGameAsset } from '../game-data/types'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { multiplyContinuous } from './numeric'

export const MEGA_STRUCTURE_FACILITY_IDS = [
  'matrioshka_brains',
  'birch_planets',
  'galactic_brains',
] as const

export type MegaStructureFacilityId =
  (typeof MEGA_STRUCTURE_FACILITY_IDS)[number]

export interface MegaStructureRates {
  readonly matrioshka_brains: number
  readonly birch_planets: number
  readonly galactic_brains: number
}

export interface MegaStructureProductionFact {
  readonly facilityId: MegaStructureFacilityId
  readonly outputFacilityId:
    | 'planets'
    | 'matrioshka_brains'
    | 'birch_planets'
  readonly ownership: {
    readonly automatic: number
    readonly manual: number
    readonly total: number
  }
  readonly baseProductionPerSecond: number
  readonly modifier: number
  readonly perSecond: number
}

export interface MegaStructureModifiers {
  readonly matrioshka_brains: number | undefined
  readonly birch_planets: number | undefined
  readonly galactic_brains: number | undefined
}

export interface MegaStructureCanonicalInputs {
  readonly dyson: {
    readonly facilities: Pick<
      CanonicalGameStateV1['dyson']['facilities'],
      MegaStructureFacilityId
    >
  }
  readonly quantum: {
    readonly unlocks: Pick<
      CanonicalGameStateV1['quantum']['unlocks'],
      'matrioshkaBrains' | 'birchPlanets' | 'galacticBrains'
    >
  }
}

export type MegaStructureRateIssueCode =
  | 'MEGA_STRUCTURE_DEFINITION_MISSING'
  | 'MEGA_STRUCTURE_DEFINITION_INVALID'
  | 'MEGA_STRUCTURE_UNLOCK_INVALID'
  | 'MEGA_STRUCTURE_COUNT_INVALID'
  | 'MEGA_STRUCTURE_EFFECTIVE_COUNT_NON_FINITE'
  | 'MEGA_STRUCTURE_MODIFIER_MISSING'
  | 'MEGA_STRUCTURE_MODIFIER_INVALID'
  | 'MEGA_STRUCTURE_RATE_NON_FINITE'

export interface MegaStructureRateIssue {
  readonly code: MegaStructureRateIssueCode
  readonly path: string
  readonly detail: string
}

export type MegaStructureRateResult =
  | {
      readonly ok: true
      readonly rates: Readonly<MegaStructureRates>
      readonly facts: Readonly<
        Record<MegaStructureFacilityId, MegaStructureProductionFact>
      >
    }
  | {
      readonly ok: false
      readonly issues: readonly MegaStructureRateIssue[]
    }

export type MegaStructureAssetLookup = (
  kind: string,
  id: string,
) => RuntimeGameAsset | undefined

type MegaStructureUnlockId =
  keyof MegaStructureCanonicalInputs['quantum']['unlocks']

interface MegaStructureSpec {
  readonly id: MegaStructureFacilityId
  readonly unlockId: MegaStructureUnlockId
  readonly baseProduction: number
  readonly productionStatId: string
  readonly outputFacilityId:
    | 'planets'
    | 'matrioshka_brains'
    | 'birch_planets'
}

const FACILITY_KIND = 'GameData.FacilityDefinition'
const UNITY_MULTIPLIER_EPSILON = 1e-12

const MEGA_STRUCTURE_SPECS: readonly MegaStructureSpec[] = [
  {
    id: 'matrioshka_brains',
    unlockId: 'matrioshkaBrains',
    baseProduction: 1,
    productionStatId: 'Facility.MatrioshkaBrain.Production',
    outputFacilityId: 'planets',
  },
  {
    id: 'birch_planets',
    unlockId: 'birchPlanets',
    baseProduction: 0.01,
    productionStatId: 'Facility.BirchPlanet.Production',
    outputFacilityId: 'matrioshka_brains',
  },
  {
    id: 'galactic_brains',
    unlockId: 'galacticBrains',
    baseProduction: 0.1,
    productionStatId: 'Facility.GalacticBrain.Production',
    outputFacilityId: 'birch_planets',
  },
]

/**
 * Derives the three mega-structure producer rates consumed by a full-chain
 * tick. Each key is the producing facility: Matrioshka Brains produce
 * planets, Birch Planets produce Matrioshka Brains, and Galactic Brains
 * produce Birch Planets.
 */
export function deriveMegaStructureRates(
  state: MegaStructureCanonicalInputs,
  modifiers: Readonly<MegaStructureModifiers>,
  lookup: MegaStructureAssetLookup = getGameAsset,
): MegaStructureRateResult {
  const issues: MegaStructureRateIssue[] = []
  const bases = new Map<MegaStructureFacilityId, number>()
  const counts = new Map<MegaStructureFacilityId, number>()
  const validatedModifiers = new Map<MegaStructureFacilityId, number>()
  const unlocks = new Map<MegaStructureFacilityId, boolean>()

  for (const spec of MEGA_STRUCTURE_SPECS) {
    const base = readLegacyBaseProduction(spec, lookup, issues)
    if (base !== undefined) bases.set(spec.id, base)

    const unlock = state.quantum.unlocks[spec.unlockId]
    if (typeof unlock !== 'boolean') {
      issues.push({
        code: 'MEGA_STRUCTURE_UNLOCK_INVALID',
        path: `quantum.unlocks.${spec.unlockId}`,
        detail: `Mega-structure unlock '${spec.unlockId}' must be boolean.`,
      })
    } else {
      unlocks.set(spec.id, unlock)
    }

    const count = readEffectiveCount(state, spec.id, issues)
    if (count !== undefined) counts.set(spec.id, count)

    const modifier = modifiers[spec.id]
    if (modifier === undefined) {
      issues.push({
        code: 'MEGA_STRUCTURE_MODIFIER_MISSING',
        path: `facilityModifiers.${spec.id}`,
        detail: `Mega-structure '${spec.id}' requires its already-derived modifier.`,
      })
    } else if (
      typeof modifier !== 'number' ||
      !Number.isFinite(modifier) ||
      modifier < 0
    ) {
      issues.push({
        code: 'MEGA_STRUCTURE_MODIFIER_INVALID',
        path: `facilityModifiers.${spec.id}`,
        detail: `Mega-structure modifier '${spec.id}' must be finite and non-negative.`,
      })
    } else {
      validatedModifiers.set(spec.id, modifier)
    }
  }

  if (issues.length > 0) return failed(issues)

  const mutableRates: Record<MegaStructureFacilityId, number> = {
    matrioshka_brains: 0,
    birch_planets: 0,
    galactic_brains: 0,
  }
  const mutableFacts = {} as Record<
    MegaStructureFacilityId,
    MegaStructureProductionFact
  >
  for (const spec of MEGA_STRUCTURE_SPECS) {
    const base = bases.get(spec.id)
    const count = counts.get(spec.id)
    const modifier = validatedModifiers.get(spec.id)
    if (base === undefined || count === undefined || modifier === undefined) {
      return failed([
        {
          code: 'MEGA_STRUCTURE_RATE_NON_FINITE',
          path: `rates.${spec.id}`,
          detail: `Mega-structure '${spec.id}' has incomplete validated rate inputs.`,
        },
      ])
    }

    let rate = 0
    if (unlocks.get(spec.id)) {
      rate = multiplyContinuous(base, count)
      if (Math.abs(modifier - 1) > UNITY_MULTIPLIER_EPSILON) {
        rate = multiplyContinuous(rate, modifier)
      }
    }
    if (!Number.isFinite(rate) || rate < 0) {
      issues.push({
        code: 'MEGA_STRUCTURE_RATE_NON_FINITE',
        path: `rates.${spec.id}`,
        detail: `Mega-structure '${spec.id}' produced an invalid rate.`,
      })
      continue
    }
    mutableRates[spec.id] = rate
    const owned = state.dyson.facilities[spec.id]
    mutableFacts[spec.id] = Object.freeze({
      facilityId: spec.id,
      outputFacilityId: spec.outputFacilityId,
      ownership: Object.freeze({
        automatic: owned[0],
        manual: owned[1],
        total: count,
      }),
      baseProductionPerSecond: base,
      modifier,
      perSecond: rate,
    })
  }

  if (issues.length > 0) return failed(issues)
  return {
    ok: true,
    rates: Object.freeze({ ...mutableRates }),
    facts: Object.freeze({ ...mutableFacts }),
  }
}

function readLegacyBaseProduction(
  spec: MegaStructureSpec,
  lookup: MegaStructureAssetLookup,
  issues: MegaStructureRateIssue[],
): number | undefined {
  const asset = lookup(FACILITY_KIND, spec.id)
  const path = `gameData.facilities.${spec.id}`
  if (asset === undefined) {
    issues.push({
      code: 'MEGA_STRUCTURE_DEFINITION_MISSING',
      path,
      detail: `Facility definition '${spec.id}' is missing.`,
    })
    return undefined
  }

  const internalId = isRecord(asset.data._id)
    ? asset.data._id.id
    : undefined
  if (
    asset.kind !== FACILITY_KIND ||
    asset.id !== spec.id ||
    internalId !== spec.id ||
    asset.data.baseProduction !== spec.baseProduction ||
    asset.data.productionStatId !== spec.productionStatId
  ) {
    issues.push({
      code: 'MEGA_STRUCTURE_DEFINITION_INVALID',
      path,
      detail: `Facility definition '${spec.id}' does not match its characterized Unity production contract.`,
    })
    return undefined
  }

  const legacyBase = Math.fround(spec.baseProduction)
  if (!Number.isFinite(legacyBase) || legacyBase < 0) {
    issues.push({
      code: 'MEGA_STRUCTURE_DEFINITION_INVALID',
      path: `${path}.baseProduction`,
      detail: `Facility definition '${spec.id}' has an invalid float-cast base production.`,
    })
    return undefined
  }
  return legacyBase
}

function readEffectiveCount(
  state: MegaStructureCanonicalInputs,
  id: MegaStructureFacilityId,
  issues: MegaStructureRateIssue[],
): number | undefined {
  const pair = state.dyson.facilities[id]
  const path = `dyson.facilities.${id}`
  if (!Array.isArray(pair) || pair.length !== 2) {
    issues.push({
      code: 'MEGA_STRUCTURE_COUNT_INVALID',
      path,
      detail: `Mega-structure '${id}' requires automatic and manual counts.`,
    })
    return undefined
  }

  const labels = ['automatic', 'manual'] as const
  let valid = true
  for (let index = 0; index < 2; index += 1) {
    const value = pair[index]
    if (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0
    ) {
      continue
    }
    valid = false
    issues.push({
      code: 'MEGA_STRUCTURE_COUNT_INVALID',
      path: `${path}.${index}`,
      detail: `Mega-structure '${id}' ${labels[index]} count must be finite and non-negative.`,
    })
  }
  if (!valid) return undefined

  const effective = pair[0] + pair[1]
  if (!Number.isFinite(effective) || effective < 0) {
    issues.push({
      code: 'MEGA_STRUCTURE_EFFECTIVE_COUNT_NON_FINITE',
      path,
      detail: `Mega-structure '${id}' automatic and manual counts overflowed.`,
    })
    return undefined
  }
  return effective
}

function failed(
  issues: readonly MegaStructureRateIssue[],
): MegaStructureRateResult {
  return {
    ok: false,
    issues: Object.freeze(
      issues.map((issue) => Object.freeze({ ...issue })),
    ),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
