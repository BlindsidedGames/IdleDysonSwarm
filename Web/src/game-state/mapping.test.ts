import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import parityCases from '../../test/parity/save-migration-cases.json'
import { compareGraphs } from '../parity/compare'
import { getSavePath } from '../save/decodeIdb1'
import { deepCloneSave } from '../save/graph'
import { prepareIdb1Save, PreparedSave } from '../save/prepare'
import { serializeWebSave } from '../save/serialization'
import {
  dehydrateGameState,
  hydrateGameState,
} from './mapping'

const fixtureDirectory = new URL('../../test/fixtures/', import.meta.url)

function loadFixture(name: string): string {
  return readFileSync(new URL(name, fixtureDirectory), 'utf8')
}

describe('canonical game-state mapping', () => {
  test.each(parityCases)(
    'round-trips the owned $name slice and preserves unowned state',
    ({ fixture, sourceSchema }) => {
      const preparedLegacy = prepareIdb1Save(loadFixture(fixture))
      const baseline = preparedLegacy.prepared.copyValidatedState()
      const baselineClone = deepCloneSave(baseline)
      const unownedLegacyAvocado = deepCloneSave(
        getSavePath(baseline, 'prestigePlus.avocatoIP'),
      )

      const hydrated = hydrateGameState(preparedLegacy.prepared)
      const dehydrated = dehydrateGameState(hydrated)
      const rehydrated = hydrateGameState(dehydrated)
      const secondDehydration = dehydrateGameState(rehydrated)

      expect(preparedLegacy.migration.sourceSchema).toBe(sourceSchema)
      expect(compareGraphs(hydrated.state, rehydrated.state)).toEqual([])
      expect(
        getSavePath(
          dehydrated.copyValidatedState(),
          'prestigePlus.avocatoIP',
        ),
      ).toEqual(unownedLegacyAvocado)
      expect(serializeWebSave(secondDehydration.copyValidatedState())).toBe(
        serializeWebSave(dehydrated.copyValidatedState()),
      )
      expect(compareGraphs(baseline, baselineClone)).toEqual([])
    },
  )

  test('maps continuous and discrete sentinels without narrowing', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const hydrated = hydrateGameState(prepared)

    expect(hydrated.state.meta.createdAtLegacyText).toBe(
      '02/01/2026 01:56:16',
    )
    expect(hydrated.state.dyson.money).toBe(1461885056445.4221)
    expect(hydrated.state.infinity.points).toBe(1n)
    expect(hydrated.state.dyson.facilities.assembly_lines).toHaveLength(2)
    expect(Object.keys(hydrated.state.skills.byId)).toHaveLength(104)
    expect(Object.keys(hydrated.state.research.levelsById)).toHaveLength(14)
    expect(hydrated.state.dream.parameters.railgunMaxCharge).toBe(25_000_000)
    expect(hydrated.state.reality.workersReady).toBeTypeOf('bigint')
    expect(hydrated.state.quantum.pointsEarned).toBeTypeOf('bigint')
    expect(hydrated.state.statistics.minuteWindows).toHaveLength(60)
  })

  test('accepts a generated schema-12 entry without rerunning migration', () => {
    const historical = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const current = historical.withValidatedState(
      historical.copyValidatedState(),
    )
    const hydrated = hydrateGameState(current)
    const dehydrated = dehydrateGameState(hydrated)

    expect(current.sourceSchema).toBe(12)
    expect(current.appliedSteps).toEqual([])
    expect(current.numericRepair.repairCount).toBe(0)
    expect(hydrateGameState(dehydrated).state).toEqual(hydrated.state)
  })

  test('keeps packed flags and authoritative skill bitsets synchronized', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const hydrated = hydrateGameState(prepared)
    const mutable = hydrated.state as unknown as {
      meta: { tutorialComplete: boolean }
      skills: { byId: Record<string, { owned: boolean }> }
    }
    mutable.meta.tutorialComplete = !mutable.meta.tutorialComplete
    const skillId = Object.keys(mutable.skills.byId)[0]!
    mutable.skills.byId[skillId]!.owned =
      !mutable.skills.byId[skillId]!.owned

    const dehydrated = dehydrateGameState(hydrated)
    const reloaded = PreparedSave.fromDecoded(
      dehydrated.copyValidatedState(),
    )
    const rehydrated = hydrateGameState(reloaded)

    expect(rehydrated.state.meta.tutorialComplete).toBe(
      mutable.meta.tutorialComplete,
    )
    expect(rehydrated.state.skills.byId[skillId]?.owned).toBe(
      mutable.skills.byId[skillId]?.owned,
    )
  })

  test('preserves future fields inside owned nested containers', () => {
    const original = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const source = original.copyValidatedState()
    const infinity = getSavePath(
      source,
      'dysonVerseSaveData.dysonVerseInfinityData',
    ) as Record<string, unknown>
    const skillStates = infinity.skillStateById as Record<
      string,
      Record<string, unknown>
    >
    const skillId = Object.keys(skillStates)[0]!
    skillStates[skillId]!.futureSkillField = 42n
    const statistics = source.simulationStatistics as Record<string, unknown>
    ;(statistics.lifetime as Record<string, unknown>).futureTotal = 9n
    ;(
      statistics.minuteWindows as Array<Record<string, unknown>>
    )[0]!.futureBucket = 'preserve-me'

    const hydrated = hydrateGameState(original.withValidatedState(source))
    const roundTripped = dehydrateGameState(hydrated).copyValidatedState()

    expect(
      (
        getSavePath(
          roundTripped,
          `dysonVerseSaveData.dysonVerseInfinityData.skillStateById.${skillId}`,
        ) as Record<string, unknown>
      ).futureSkillField,
    ).toBe(42n)
    expect(
      getSavePath(
        roundTripped,
        'simulationStatistics.lifetime.futureTotal',
      ),
    ).toBe(9n)
    expect(
      getSavePath(
        roundTripped,
        'simulationStatistics.minuteWindows.0.futureBucket',
      ),
    ).toBe('preserve-me')
  })

  test('rejects invalid canonical ranges before dehydration', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const hydrated = hydrateGameState(prepared)
    ;(
      hydrated.state.timeline.doubleTime as { rate: number }
    ).rate = 11

    expect(() => dehydrateGameState(hydrated)).toThrow(
      'Double Time rate must be an integer from 0 to 10.',
    )
  })
})
