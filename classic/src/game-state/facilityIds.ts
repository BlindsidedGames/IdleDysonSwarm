export const BASIC_DYSON_FACILITY_IDS = [
  'assembly_lines',
  'ai_managers',
  'servers',
  'data_centers',
  'planets',
] as const

export const MEGA_STRUCTURE_FACILITY_IDS = [
  'matrioshka_brains',
  'birch_planets',
  'galactic_brains',
] as const

export const DYSON_FACILITY_IDS = [
  ...BASIC_DYSON_FACILITY_IDS,
  ...MEGA_STRUCTURE_FACILITY_IDS,
] as const

export type BasicDysonFacilityId =
  (typeof BASIC_DYSON_FACILITY_IDS)[number]

export type MegaStructureFacilityId =
  (typeof MEGA_STRUCTURE_FACILITY_IDS)[number]

export type CanonicalFacilityId =
  (typeof DYSON_FACILITY_IDS)[number]
