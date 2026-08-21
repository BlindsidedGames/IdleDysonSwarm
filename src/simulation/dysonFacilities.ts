export const BASIC_DYSON_FACILITY_IDS = [
  'assembly_lines',
  'ai_managers',
  'servers',
  'data_centers',
  'planets',
] as const

export type BasicDysonFacilityId =
  (typeof BASIC_DYSON_FACILITY_IDS)[number]

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
