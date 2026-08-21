import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { publishDysonSkillEffectEvaluationSnapshot } from './dysonSnapshotPublication'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function state(): CanonicalGameStateV1 {
  return hydrateGameState(prepareIdb1Save(fixture).prepared).state
}

describe('Dyson skill-effect snapshot publication', () => {
  test('publishes one frozen complete snapshot', () => {
    const result = publishDysonSkillEffectEvaluationSnapshot(state(), {
      panelsPerSecond: 1,
      panelLifetimeSeconds: 2,
      scienceMultiplier: 3,
      managerAssemblyLineProduction: 4,
      scientificPlanetsProduction: 5,
    })
    expect(result).toEqual({
      panelsPerSecond: 1,
      panelLifetimeSeconds: 2,
      scienceMultiplier: 3,
      rudimentarySingularityProduction: 0,
      pocketDimensionsProduction: 0,
      scientificPlanetsProduction: 5,
      managerAssemblyLineProduction: 4,
    })
    expect(Object.isFrozen(result)).toBe(true)
  })

  test('fails before publishing any partial invalid snapshot', () => {
    expect(() =>
      publishDysonSkillEffectEvaluationSnapshot(state(), {
        panelsPerSecond: 1,
        panelLifetimeSeconds: 2,
        scienceMultiplier: Number.NaN,
        managerAssemblyLineProduction: 4,
        scientificPlanetsProduction: 5,
      }),
    ).toThrow("snapshot publication 'scienceMultiplier'")
  })
})
