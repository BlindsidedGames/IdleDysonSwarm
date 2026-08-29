import type { CanonicalFacilityId } from '../game-state/types'

export function createDysonFacilityModifierStatIds(): Record<
  CanonicalFacilityId,
  string
> {
  return {
    assembly_lines: 'Facility.AssemblyLine.Modifier',
    ai_managers: 'Facility.Manager.Modifier',
    servers: 'Facility.Server.Modifier',
    data_centers: 'Facility.DataCenter.Modifier',
    planets: 'Facility.Planet.Modifier',
    matrioshka_brains: 'Facility.Matrioshka.Modifier',
    birch_planets: 'Facility.Birch.Modifier',
    galactic_brains: 'Facility.Galactic.Modifier',
  }
}
