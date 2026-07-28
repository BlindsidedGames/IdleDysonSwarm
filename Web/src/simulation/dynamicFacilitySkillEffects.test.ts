import { describe, expect, test } from 'vitest'
import {
  resolveDynamicFacilitySkillEffect,
  type DynamicFacilitySkillContext,
} from './dynamicFacilitySkillEffects'

const base: Readonly<DynamicFacilitySkillContext> = Object.freeze({
  panelLifetimeSeconds: 10,
  fragments: 0,
  assignedSkillPoints: 0,
  serversTotal: 0,
  manualDataCenters: 0,
  effectivePlanets: 0,
  starsSurrounded: 0,
  galaxiesEngulfed: 0,
  rudimentarySingularityProduction: 42,
  pocketDimensionsProduction: 69,
  superRadiantScatteringTimerSeconds: 0,
})

function resolve(
  effectId: string,
  overrides: Partial<DynamicFacilitySkillContext> = {},
): number | undefined {
  return resolveDynamicFacilitySkillEffect(effectId, {
    ...base,
    ...overrides,
  })
}

describe('dynamic facility skill effects', () => {
  test('matches the four dedicated facility-production branches', () => {
    expect(resolve('effect.staying_power.assembly_lines')).toBe(
      1 + Math.fround(0.01) * 10,
    )
    expect(
      resolve('effect.rudimentary_singularity.data_centers'),
    ).toBe(42)
    expect(
      resolve('effect.parallel_computation.data_centers', {
        serversTotal: 8,
      }),
    ).toBe(1 + Math.fround(0.1) * 3)
    expect(resolve('effect.pocket_dimensions.planets')).toBe(69)
  })

  test('preserves strict production thresholds', () => {
    expect(
      resolve('effect.parallel_computation.data_centers', {
        serversTotal: 1,
      }),
    ).toBe(1)
    expect(
      resolve('effect.versatileProductionTactics.planets_modifier', {
        effectivePlanets: 99,
      }),
    ).toBe(1)
    expect(
      resolve('effect.versatileProductionTactics.planets_modifier', {
        effectivePlanets: 100,
      }),
    ).toBe(1.5)
    expect(
      resolve('effect.oneMinutePlan.assembly_lines_modifier', {
        panelLifetimeSeconds: 60,
      }),
    ).toBe(1.5)
    expect(
      resolve('effect.oneMinutePlan.assembly_lines_modifier', {
        panelLifetimeSeconds: 60.01,
      }),
    ).toBe(5)
    expect(
      resolve('effect.dysonSubsidies.assembly_lines_modifier', {
        starsSurrounded: 1,
      }),
    ).toBe(1)
    expect(
      resolve('effect.dysonSubsidies.assembly_lines_modifier', {
        starsSurrounded: 1.01,
      }),
    ).toBe(2)
  })

  test('matches fragment and assigned-skill-point formulas', () => {
    expect(
      resolve('effect.fragmentAssembly.assembly_lines_modifier', {
        fragments: 4,
      }),
    ).toBe(1)
    expect(
      resolve('effect.fragmentAssembly.assembly_lines_modifier', {
        fragments: 5,
      }),
    ).toBe(3)
    expect(
      resolve('effect.progressiveAssembly.assembly_lines_modifier', {
        fragments: 7,
      }),
    ).toBe(4.5)
    expect(
      resolve('effect.purityOfBody.assembly_lines_modifier', {
        assignedSkillPoints: 8,
      }),
    ).toBe(10)
    expect(
      resolve('effect.purityOfSEssence.planets_modifier', {
        assignedSkillPoints: 50,
      }),
    ).toBe(71)
  })

  test('matches server and retained-facility formulas', () => {
    expect(
      resolve('effect.clusterNetworking.servers_modifier', {
        serversTotal: 100,
      }),
    ).toBe(1 + Math.fround(0.05) * 2)
    expect(
      resolve('effect.parallelProcessing.servers_modifier', {
        serversTotal: 8,
      }),
    ).toBe(1 + Math.fround(0.05) * 3)
    expect(
      resolve('effect.whatWillComeToPass.data_centers_modifier', {
        manualDataCenters: 12,
      }),
    ).toBe(1.12)
    expect(
      resolve('effect.hypercubeNetworks.data_centers_modifier', {
        serversTotal: 1000,
      }),
    ).toBe(1.3)
  })

  test('matches assembly, planet, galaxy and timer formulas', () => {
    expect(
      resolve(
        'effect.versatileProductionTactics.assembly_lines_modifier',
      ),
    ).toBe(1.5)
    expect(
      resolve('effect.galacticPradigmShift.planets_modifier', {
        galaxiesEngulfed: 1,
      }),
    ).toBe(1.5)
    expect(
      resolve('effect.galacticPradigmShift.planets_modifier', {
        galaxiesEngulfed: 2,
      }),
    ).toBe(3)
    expect(
      resolve('effect.superRadiantScattering.servers_modifier', {
        superRadiantScatteringTimerSeconds: 123,
      }),
    ).toBe(2.23)
  })

  test('returns undefined for authored and unknown effects', () => {
    expect(
      resolve('effect.assemblyLineTree.assembly_lines_modifier'),
    ).toBeUndefined()
    expect(resolve('effect.unknown.money_multiplier')).toBeUndefined()
  })
})
