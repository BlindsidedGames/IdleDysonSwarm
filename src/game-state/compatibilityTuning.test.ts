import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { getSavePath } from '../save/decodeIdb1'
import { prepareIdb1Save } from '../save/prepare'
import { extractDysonCompatibilityTuning } from './compatibilityTuning'
import { hydrateGameState } from './mapping'

const fixture = new URL(
  '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
  import.meta.url,
)

function preparedFixture() {
  return prepareIdb1Save(readFileSync(fixture, 'utf8')).prepared
}

describe('Dyson compatibility tuning', () => {
  test('extracts authentic prepared-save tuning onto the mapping session', () => {
    const prepared = preparedFixture()
    const before = prepared.copyValidatedState()
    const session = hydrateGameState(prepared)

    expect(session.compatibilityTuning).toEqual({
      panelsPerSecMulti: 1,
      scienceBoostPercent: 0.05,
      moneyMultiUpgradePercent: 0.05,
      assemblyLineUpgradePercent: 0.05999999865889549,
      aiManagerUpgradePercent: 0.03,
      serverUpgradePercent: 0.03,
      dataCenterUpgradePercent: 0.03,
      planetUpgradePercent: 0.03,
      matrioshkaUpgradePercent: 0.03,
      birchUpgradePercent: 0.03,
      galacticUpgradePercent: 0.03,
    })
    expect(Object.isFrozen(session.compatibilityTuning)).toBe(true)
    expect(prepared.copyValidatedState()).toEqual(before)
  })

  test('extracts independently from a prepared save', () => {
    const prepared = preparedFixture()

    expect(extractDysonCompatibilityTuning(prepared)).toEqual(
      hydrateGameState(prepared).compatibilityTuning,
    )
  })

  test('rejects invalid compatibility tuning without supplying defaults', () => {
    const prepared = preparedFixture()
    const source = prepared.copyValidatedState()
    const infinity = getSavePath(
      source,
      'dysonVerseSaveData.dysonVerseInfinityData',
    ) as Record<string, unknown>
    infinity.panelsPerSecMulti = -1
    const invalid = prepared.withValidatedState(source)

    expect(() => extractDysonCompatibilityTuning(invalid)).toThrow(
      "Dyson compatibility tuning 'panelsPerSecMulti' must be a finite non-negative number.",
    )
    expect(() => hydrateGameState(invalid)).toThrow(
      "Dyson compatibility tuning 'panelsPerSecMulti' must be a finite non-negative number.",
    )
  })
})
