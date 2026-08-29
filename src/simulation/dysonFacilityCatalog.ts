import {
  type BasicDysonFacilityId,
  type CanonicalFacilityId,
  DYSON_FACILITY_IDS,
  type MegaStructureFacilityId,
} from '../game-state/facilityIds'

export {
  BASIC_DYSON_FACILITY_IDS,
  type BasicDysonFacilityId,
  DYSON_FACILITY_IDS,
  MEGA_STRUCTURE_FACILITY_IDS,
  type MegaStructureFacilityId,
} from '../game-state/facilityIds'

export function isDysonFacilityId(
  value: unknown,
): value is CanonicalFacilityId {
  return (
    typeof value === 'string' &&
    (DYSON_FACILITY_IDS as readonly string[]).includes(value)
  )
}

export type DysonFacilityGroup = 'facility' | 'megastructure'

export interface DysonFacilityDefinition {
  readonly id: CanonicalFacilityId
  readonly group: DysonFacilityGroup
  readonly prerequisite?: {
    readonly facilityId: CanonicalFacilityId
    readonly owned: number
    readonly manualOnly?: boolean
  }
  readonly quantumUnlock?:
    | 'matrioshkaBrains'
    | 'birchPlanets'
    | 'galacticBrains'
  readonly outputFacilityId?: CanonicalFacilityId | 'bots'
}

export const DYSON_FACILITY_DEFINITIONS: Readonly<
  Record<CanonicalFacilityId, DysonFacilityDefinition>
> = Object.freeze({
  assembly_lines: {
    id: 'assembly_lines',
    group: 'facility',
    outputFacilityId: 'bots',
  },
  ai_managers: {
    id: 'ai_managers',
    group: 'facility',
    prerequisite: {
      facilityId: 'assembly_lines',
      owned: 5,
      manualOnly: true,
    },
    outputFacilityId: 'assembly_lines',
  },
  servers: {
    id: 'servers',
    group: 'facility',
    prerequisite: {
      facilityId: 'ai_managers',
      owned: 1,
      manualOnly: true,
    },
    outputFacilityId: 'ai_managers',
  },
  data_centers: {
    id: 'data_centers',
    group: 'facility',
    prerequisite: { facilityId: 'servers', owned: 1 },
    outputFacilityId: 'servers',
  },
  planets: {
    id: 'planets',
    group: 'facility',
    prerequisite: { facilityId: 'data_centers', owned: 1 },
    outputFacilityId: 'data_centers',
  },
  matrioshka_brains: {
    id: 'matrioshka_brains',
    group: 'megastructure',
    quantumUnlock: 'matrioshkaBrains',
    outputFacilityId: 'planets',
  },
  birch_planets: {
    id: 'birch_planets',
    group: 'megastructure',
    quantumUnlock: 'birchPlanets',
    outputFacilityId: 'matrioshka_brains',
  },
  galactic_brains: {
    id: 'galactic_brains',
    group: 'megastructure',
    quantumUnlock: 'galacticBrains',
    outputFacilityId: 'birch_planets',
  },
})

export function isBasicFacility(
  facilityId: CanonicalFacilityId,
): facilityId is BasicDysonFacilityId {
  return DYSON_FACILITY_DEFINITIONS[facilityId].group === 'facility'
}

export function isMegaStructureFacility(
  facilityId: CanonicalFacilityId,
): facilityId is MegaStructureFacilityId {
  return DYSON_FACILITY_DEFINITIONS[facilityId].group === 'megastructure'
}
