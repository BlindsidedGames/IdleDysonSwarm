import { describe, expect, it } from 'vitest'
import { createDysonFacilityModifierStatIds } from './dysonFacilityStatIds'

describe('createDysonFacilityModifierStatIds', () => {
  it('defines every canonical facility modifier target', () => {
    expect(createDysonFacilityModifierStatIds()).toEqual({
      assembly_lines: 'Facility.AssemblyLine.Modifier',
      ai_managers: 'Facility.Manager.Modifier',
      servers: 'Facility.Server.Modifier',
      data_centers: 'Facility.DataCenter.Modifier',
      planets: 'Facility.Planet.Modifier',
      matrioshka_brains: 'Facility.Matrioshka.Modifier',
      birch_planets: 'Facility.Birch.Modifier',
      galactic_brains: 'Facility.Galactic.Modifier',
    })
  })

  it('preserves independent map identity for each consumer', () => {
    expect(createDysonFacilityModifierStatIds()).not.toBe(
      createDysonFacilityModifierStatIds(),
    )
  })
})
