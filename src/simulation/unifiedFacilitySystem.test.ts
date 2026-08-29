import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type {
  CanonicalFacilityId,
  CanonicalGameStateV1,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  previewCanonicalFacilityPurchase,
  runCanonicalDysonAutomation,
  tryPurchaseCanonicalFacility,
} from './canonicalDysonCommands'
import {
  deriveBasicDysonState,
} from './canonicalDysonDerivation'
import {
  DYSON_FACILITY_DEFINITIONS,
  DYSON_FACILITY_IDS,
  MEGA_STRUCTURE_FACILITY_IDS,
} from './dysonFacilityCatalog'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

const expectedOutputs = {
  assembly_lines: 'bots',
  ai_managers: 'assembly_lines',
  servers: 'ai_managers',
  data_centers: 'servers',
  planets: 'data_centers',
  matrioshka_brains: 'planets',
  birch_planets: 'matrioshka_brains',
  galactic_brains: 'birch_planets',
} as const satisfies Readonly<
  Record<CanonicalFacilityId, CanonicalFacilityId | 'bots'>
>

function state(): CanonicalGameStateV1 {
  const source = hydrateGameState(prepareIdb1Save(fixture).prepared).state
  return {
    ...source,
    dyson: {
      ...source.dyson,
      money: 1e200,
      facilities: Object.fromEntries(
        DYSON_FACILITY_IDS.map((id) => [
          id,
          id === 'assembly_lines'
            ? [4, 1] as const
            : [1, 1] as const,
        ]),
      ) as CanonicalGameStateV1['dyson']['facilities'],
      automation: {
        ...source.dyson.automation,
        buyMode: 'buy-1',
        enabledFacilities: Object.fromEntries(
          DYSON_FACILITY_IDS.map((id) => [id, true]),
        ) as CanonicalGameStateV1['dyson']['automation']['enabledFacilities'],
      },
    },
    infinity: {
      ...source.infinity,
      automationUnlocked: {
        ...source.infinity.automationUnlocked,
        bots: true,
      },
    },
    quantum: {
      ...source.quantum,
      unlocks: {
        ...source.quantum.unlocks,
        matrioshkaBrains: true,
        birchPlanets: true,
        galacticBrains: true,
      },
    },
    timeline: {
      ...source.timeline,
      dysonAutomationTargetIndex: 0,
    },
  }
}

describe('unified Dyson facility system', () => {
  test('defines all eight facilities once in canonical presentation order', () => {
    expect(DYSON_FACILITY_IDS).toEqual([
      'assembly_lines',
      'ai_managers',
      'servers',
      'data_centers',
      'planets',
      'matrioshka_brains',
      'birch_planets',
      'galactic_brains',
    ])
    expect(
      Object.fromEntries(
        DYSON_FACILITY_IDS.map((id) => [
          id,
          DYSON_FACILITY_DEFINITIONS[id].outputFacilityId,
        ]),
      ),
    ).toEqual(expectedOutputs)
    expect(
      DYSON_FACILITY_IDS.map((id) =>
        DYSON_FACILITY_DEFINITIONS[id].group,
      ),
    ).toEqual([
      'facility',
      'facility',
      'facility',
      'facility',
      'facility',
      'megastructure',
      'megastructure',
      'megastructure',
    ])
  })

  test.each(DYSON_FACILITY_IDS)(
    '%s uses the same immutable quote and manual purchase path',
    (facilityId) => {
      const before = state()
      const quote = previewCanonicalFacilityPurchase(before, facilityId)
      const result = tryPurchaseCanonicalFacility(before, facilityId)

      expect(quote).toMatchObject({
        facilityId,
        eligible: true,
        selectedQuantity: 1n,
        status: 'success',
      })
      expect(result.attempt).toMatchObject({
        facilityId,
        purchased: true,
        quantity: quote.selectedQuantity,
        cost: quote.cost,
        status: quote.status,
      })
      expect(result.state.dyson.facilities[facilityId][1]).toBe(2)
      expect(before.dyson.facilities[facilityId][1]).toBe(1)
    },
  )

  test.each(DYSON_FACILITY_IDS)(
    '%s has manual and automated purchase parity',
    (facilityId) => {
      const before = state()
      const manual = tryPurchaseCanonicalFacility(before, facilityId)
      const automated = runCanonicalDysonAutomation(before)
      const attempt = automated.attempts.find(
        (candidate) => candidate.facilityId === facilityId,
      )

      expect(attempt).toMatchObject({
        purchased: true,
        quantity: manual.attempt.quantity,
        cost: manual.attempt.cost,
        status: manual.attempt.status,
      })
    },
  )

  test.each(MEGA_STRUCTURE_FACILITY_IDS)(
    '%s enforces both its Quantum gate and facility prerequisite',
    (facilityId) => {
      const definition = DYSON_FACILITY_DEFINITIONS[facilityId]
      const prerequisite = definition.prerequisite!
      const locked = state()
      const quantumUnlock = definition.quantumUnlock!
      const withoutQuantum = {
        ...locked,
        quantum: {
          ...locked.quantum,
          unlocks: {
            ...locked.quantum.unlocks,
            [quantumUnlock]: false,
          },
        },
      }
      expect(
        previewCanonicalFacilityPurchase(withoutQuantum, facilityId).status,
      ).toBe('locked')

      const withoutPrerequisite = {
        ...locked,
        dyson: {
          ...locked.dyson,
          facilities: {
            ...locked.dyson.facilities,
            [prerequisite.facilityId]: [0, 0] as const,
          },
        },
      }
      expect(
        previewCanonicalFacilityPurchase(
          withoutPrerequisite,
          facilityId,
        ).status,
      ).toBe('prerequisite-not-met')
    },
  )

  test('publishes one production-fact record with all eight output links', () => {
    const result = deriveBasicDysonState(
      state(),
      {
        panelsPerSecMulti: 1,
        scienceBoostPercent: 0,
        moneyMultiUpgradePercent: 0,
        assemblyLineUpgradePercent: 0,
        aiManagerUpgradePercent: 0,
        serverUpgradePercent: 0,
        dataCenterUpgradePercent: 0,
        planetUpgradePercent: 0,
        matrioshkaUpgradePercent: 0,
        birchUpgradePercent: 0,
        galacticUpgradePercent: 0,
      },
      { permanentDoubleIp: false },
      {
        panelsPerSecond: 1,
        panelLifetimeSeconds: 10,
        scienceMultiplier: 1,
        rudimentarySingularityProduction: 0,
        pocketDimensionsProduction: 0,
        scientificPlanetsProduction: 0,
        managerAssemblyLineProduction: 0,
      },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Object.keys(result.value.facilityFacts)).toEqual(
      DYSON_FACILITY_IDS,
    )
    for (const facilityId of DYSON_FACILITY_IDS) {
      expect(
        result.value.facilityFacts[facilityId].production.outputFacilityId,
      ).toBe(expectedOutputs[facilityId])
    }
    expect(
      result.value.facilityFacts.matrioshka_brains.details.upstreamSources,
    ).toEqual([{
      sourceFacilityId: 'birch_planets',
      producedCount: 1,
    }])
    expect(
      result.value.facilityFacts.birch_planets.details.upstreamSources,
    ).toEqual([{
      sourceFacilityId: 'galactic_brains',
      producedCount: 1,
    }])
  })
})
