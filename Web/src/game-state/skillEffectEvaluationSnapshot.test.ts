import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { getSavePath } from '../save/decodeIdb1'
import {
  prepareIdb1Save,
  type PreparedSave,
} from '../save/prepare'
import { hydrateGameState } from './mapping'
import {
  extractDysonSkillEffectEvaluationSnapshot,
  withDysonSkillEffectEvaluationSnapshot,
} from './skillEffectEvaluationSnapshot'

const fixture = new URL(
  '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
  import.meta.url,
)

function preparedFixture() {
  return prepareIdb1Save(readFileSync(fixture, 'utf8')).prepared
}

describe('Dyson skill-effect evaluation snapshot', () => {
  test('extracts and freezes the previous Unity recalculation values', () => {
    const prepared = preparedFixture()
    const source = prepared.copyValidatedState()
    const infinity = getSavePath(
      source,
      'dysonVerseSaveData.dysonVerseInfinityData',
    ) as Record<string, number>
    const session = hydrateGameState(prepared)

    expect(session.skillEffectEvaluationSnapshot).toEqual({
      panelsPerSecond: infinity.panelsPerSec,
      panelLifetimeSeconds: infinity.panelLifetime,
      scienceMultiplier: infinity.scienceMulti,
      rudimentarySingularityProduction:
        infinity.rudimentrySingularityProduction,
      pocketDimensionsProduction:
        infinity.pocketDimensionsProduction,
      scientificPlanetsProduction:
        infinity.scientificPlanetsProduction,
      managerAssemblyLineProduction:
        infinity.managerAssemblyLineProduction,
    })
    expect(
      Object.isFrozen(session.skillEffectEvaluationSnapshot),
    ).toBe(true)
  })

  test('extracts independently from the prepared source', () => {
    const prepared = preparedFixture()
    expect(
      extractDysonSkillEffectEvaluationSnapshot(prepared),
    ).toEqual(hydrateGameState(prepared).skillEffectEvaluationSnapshot)
  })

  test('fails closed instead of inventing a prior-derived value', () => {
    const prepared = preparedFixture()
    const source = prepared.copyValidatedState()
    const infinity = getSavePath(
      source,
      'dysonVerseSaveData.dysonVerseInfinityData',
    ) as Record<string, unknown>
    infinity.scienceMulti = Number.NaN
    const invalid = {
      copyValidatedState: () => source,
    } as PreparedSave

    expect(() =>
      extractDysonSkillEffectEvaluationSnapshot(invalid),
    ).toThrow(
      "Dyson skill-effect snapshot 'scienceMulti' must be a finite non-negative number.",
    )
  })

  test('composes game state and the next snapshot into one reloadable candidate', () => {
    const session = hydrateGameState(preparedFixture())
    const nextState = {
      ...session.state,
      dyson: {
        ...session.state.dyson,
        money: session.state.dyson.money + 42,
      },
    }
    const nextSnapshot = {
      panelsPerSecond: 11,
      panelLifetimeSeconds: 12,
      scienceMultiplier: 13,
      rudimentarySingularityProduction: 14,
      pocketDimensionsProduction: 15,
      scientificPlanetsProduction: 16,
      managerAssemblyLineProduction: 17,
    }

    const mapped = session.prepare(nextState)
    const reloadable = withDysonSkillEffectEvaluationSnapshot(
      mapped,
      nextSnapshot,
    )
    const reloaded = hydrateGameState(reloadable)

    expect(reloaded.state.dyson.money).toBe(nextState.dyson.money)
    expect(reloaded.skillEffectEvaluationSnapshot).toEqual(
      nextSnapshot,
    )
    expect(
      extractDysonSkillEffectEvaluationSnapshot(mapped),
    ).toEqual(session.skillEffectEvaluationSnapshot)
  })

  test('rejects an invalid next snapshot without changing the prepared candidate', () => {
    const prepared = preparedFixture()
    const before = prepared.copyValidatedState()

    expect(() =>
      withDysonSkillEffectEvaluationSnapshot(prepared, {
        ...extractDysonSkillEffectEvaluationSnapshot(prepared),
        panelsPerSecond: Number.NaN,
      }),
    ).toThrow(
      "Dyson skill-effect snapshot 'panelsPerSec' must be a finite non-negative number.",
    )
    expect(prepared.copyValidatedState()).toEqual(before)
  })
})
