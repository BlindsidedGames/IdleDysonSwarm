export {
  BASIC_DYSON_FACILITY_IDS,
  type BasicDysonFacilityId,
} from './dysonFacilityCatalog'

import type { BasicDysonFacilityId } from './dysonFacilityCatalog'

export type OwnedPair = [automatic: number, manual: number]

export function createEmptyFacilityPairs(): Record<
  BasicDysonFacilityId,
  OwnedPair
> {
  return {
    assembly_lines: [0, 0],
    ai_managers: [0, 0],
    servers: [0, 0],
    data_centers: [0, 0],
    planets: [0, 0],
  }
}

export function createEmptyRetainedFacilities(): Record<
  BasicDysonFacilityId,
  boolean
> {
  return {
    assembly_lines: false,
    ai_managers: false,
    servers: false,
    data_centers: false,
    planets: false,
  }
}
