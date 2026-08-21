import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import parityCases from '../../test/parity/save-migration-cases.json'
import { compareGraphs } from '../parity/compare'
import { getSavePath } from '../save/decodeIdb1'
import { deepCloneSave } from '../save/graph'
import { prepareIdb1Save, PreparedSave } from '../save/prepare'
import {
  deserializeWebSave,
  serializeWebSave,
} from '../save/serialization'
import {
  previewCanonicalBasicFacilityPurchase,
  tryPurchaseCanonicalBasicFacility,
} from '../simulation/canonicalDysonCommands'
import {
  previewCanonicalResearchPurchase,
  purchaseCanonicalResearch,
} from '../simulation/researchAutomation'
import {
  dehydrateGameState,
  GameStateSessionV1,
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

  test('round-trips MAX cash and science as finite purchase-capable balances', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const session = hydrateGameState(prepared)
    const candidate = {
      ...session.state,
      dyson: {
        ...session.state.dyson,
        money: Number.MAX_VALUE,
        science: Number.MAX_VALUE,
        facilities: {
          ...session.state.dyson.facilities,
          assembly_lines: [0, 0] as const,
        },
        automation: {
          ...session.state.dyson.automation,
          buyMode: 'buy-1' as const,
          roundedBulkBuy: false,
        },
      },
      research: {
        ...session.state.research,
        levelsById: {
          ...session.state.research.levelsById,
          'research.money_multiplier': 0,
        },
        automation: {
          ...session.state.research.automation,
          buyMode: 'buy-1' as const,
          roundedBulkBuy: false,
        },
      },
    }
    const serialized = serializeWebSave(
      session.prepare(candidate).copyValidatedState(),
    )
    const reloaded = hydrateGameState(
      PreparedSave.fromDecoded(deserializeWebSave(serialized)),
    )

    expect(Number.isFinite(reloaded.state.dyson.money)).toBe(true)
    expect(Number.isFinite(reloaded.state.dyson.science)).toBe(true)
    expect(reloaded.state.dyson.money).toBe(Number.MAX_VALUE)
    expect(reloaded.state.dyson.science).toBe(Number.MAX_VALUE)

    const facilityPreview = previewCanonicalBasicFacilityPurchase(
      reloaded.state,
      'assembly_lines',
    )
    const facilityPurchase = tryPurchaseCanonicalBasicFacility(
      reloaded.state,
      'assembly_lines',
    )
    const researchPreview = previewCanonicalResearchPurchase(
      reloaded.state,
      reloaded.compatibilityTuning,
      'research.money_multiplier',
    )
    const researchPurchase = purchaseCanonicalResearch(
      reloaded.state,
      reloaded.compatibilityTuning,
      'research.money_multiplier',
    )

    expect(facilityPreview).toMatchObject({
      eligible: true,
      cost: 100,
      status: 'success',
    })
    expect(facilityPurchase.attempt).toMatchObject({
      purchased: true,
      cost: facilityPreview.cost,
      status: 'success',
    })
    expect(facilityPurchase.state.dyson.money)
      .toBeLessThan(Number.MAX_VALUE)
    expect(researchPreview).toMatchObject({
      eligible: true,
      cost: 5_000,
      code: 'purchasable',
    })
    expect(researchPurchase).toMatchObject({
      accepted: true,
      changed: true,
      purchase: { cost: researchPreview.cost },
    })
    expect(researchPurchase.state.dyson.science)
      .toBeLessThan(Number.MAX_VALUE)
  })

  test('round-trips reserved Railgun volleys and the panel high-water mark', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const hydrated = hydrateGameState(prepared)
    const state = {
      ...hydrated.state,
      dream: {
        ...hydrated.state.dream,
        railgun: {
          ...hydrated.state.dream.railgun,
          firing: true,
          fireProgress: 0.05,
          shotsRemaining: 7,
          activeRailguns: 1_234,
          reservedPanels: 8_638n,
          highestStoredPanels: 98_765n,
          lastRoundsFired: 3,
          lastPanelsLaunched: 3_702n,
        },
      },
    }

    const roundTrip = hydrateGameState(
      dehydrateGameState(hydrated, state),
    ).state

    expect(roundTrip.dream.railgun).toMatchObject({
      firing: true,
      fireProgress: 0.05,
      shotsRemaining: 7,
      activeRailguns: 1_234,
      reservedPanels: 8_638n,
      highestStoredPanels: 98_765n,
    })
    expect(roundTrip.dream.railgun.lastRoundsFired).toBe(0)
    expect(roundTrip.dream.railgun.lastPanelsLaunched).toBe(0n)
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
      meta: {
        tutorialComplete: boolean
        navigationVisibility: {
          story: boolean
          wiki: boolean
          statistics: boolean
        }
      }
      skills: { byId: Record<string, { owned: boolean }> }
    }
    mutable.meta.tutorialComplete = !mutable.meta.tutorialComplete
    mutable.meta.navigationVisibility.story =
      !mutable.meta.navigationVisibility.story
    mutable.meta.navigationVisibility.wiki =
      !mutable.meta.navigationVisibility.wiki
    mutable.meta.navigationVisibility.statistics =
      !mutable.meta.navigationVisibility.statistics
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
    expect(rehydrated.state.meta.navigationVisibility).toEqual(
      mutable.meta.navigationVisibility,
    )
    expect(rehydrated.state.skills.byId[skillId]?.owned).toBe(
      mutable.skills.byId[skillId]?.owned,
    )
  })

  test('round-trips durable research automation selections', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const session = hydrateGameState(prepared)
    const candidate = {
      ...session.state,
      research: {
        ...session.state.research,
        automation: {
          ...session.state.research.automation,
          enabledById: {
            ...session.state.research.automation.enabledById,
            'research.ai_manager_upgrade': false,
            'research.galactic_brains_upgrade': true,
          },
        },
      },
    }

    const dehydrated = session.prepare(candidate)
    const source = dehydrated.copyValidatedState()
    const rehydrated = hydrateGameState(dehydrated)

    expect(source.infinityAutoResearchToggleAi).toBe(false)
    expect(source.infinityAutoResearchToggleGalacticBrains).toBe(true)
    expect(
      rehydrated.state.research.automation.enabledById,
    ).toMatchObject({
      'research.ai_manager_upgrade': false,
      'research.galactic_brains_upgrade': true,
    })
  })

  test('round-trips Bots and Research preset automation overrides', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const session = hydrateGameState(prepared)
    const candidate = {
      ...session.state,
      skills: {
        ...session.state.skills,
        tabPresetAutomation: {
          bots: 2 as const,
          research: 4 as const,
        },
      },
    }

    const dehydrated = session.prepare(candidate)
    const source = dehydrated.copyValidatedState()
    const rehydrated = hydrateGameState(dehydrated)

    expect(source.botsTabPresetOverride).toBe(2)
    expect(source.researchTabPresetOverride).toBe(4)
    expect(rehydrated.state.skills.tabPresetAutomation).toEqual({
      bots: 2,
      research: 4,
    })
  })

  test('defaults and round-trips the five authored preset colors', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const session = hydrateGameState(prepared)

    expect(session.state.skills.presets.map((preset) => preset.colorId)).toEqual(
      ['cyan', 'orange', 'gold', 'rose', 'pink'],
    )
    const defaultSource = session.prepare(session.state).copyValidatedState()
    expect(
      (defaultSource.dysonVerseSaveData as Record<string, unknown>)
        .preset1ColorId,
    ).toBeUndefined()

    const presets = [...session.state.skills.presets]
    presets[0] = { ...presets[0]!, colorId: 'pink' }
    const dehydrated = session.prepare({
      ...session.state,
      skills: {
        ...session.state.skills,
        presets:
          presets as unknown as CanonicalGameStateV1['skills']['presets'],
      },
    })
    const source = dehydrated.copyValidatedState()
    const rehydrated = hydrateGameState(dehydrated)

    expect(
      (source.dysonVerseSaveData as Record<string, unknown>)
        .preset1ColorId,
    ).toBe('pink')
    expect(rehydrated.state.skills.presets[0].colorId).toBe('pink')
  })

  test('synchronizes the legacy Avocado unlock mirror on dehydration', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const session = hydrateGameState(prepared)
    const candidate = {
      ...session.state,
      avocado: {
        ...session.state.avocado,
        unlocked: true,
      },
    }

    const dehydrated = session.prepare(candidate)
    const source = dehydrated.copyValidatedState()

    expect(
      (source.avocadoData as Record<string, unknown>).unlocked,
    ).toBe(true)
    expect(
      (source.prestigePlus as Record<string, unknown>)
        .avocatoPurchased,
    ).toBe(true)
    expect(hydrateGameState(dehydrated).state.avocado.unlocked)
      .toBe(true)
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

  test('prepares an arbitrary canonical candidate against preserved source data', () => {
    const original = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const source = original.copyValidatedState()
    ;(source.prestigePlus as Record<string, unknown>).futureUnownedField =
      'preserve-me'
    const session = hydrateGameState(original.withValidatedState(source))
    const candidate = {
      ...session.state,
      dyson: {
        ...session.state.dyson,
        money: session.state.dyson.money + 123,
      },
    }

    const prepared = session.prepare(candidate)
    const roundTripped = hydrateGameState(prepared)

    expect(session).toBeInstanceOf(GameStateSessionV1)
    expect(roundTripped.state.dyson.money).toBe(candidate.dyson.money)
    expect(session.state.dyson.money).not.toBe(candidate.dyson.money)
    expect(
      getSavePath(
        prepared.copyValidatedState(),
        'prestigePlus.futureUnownedField',
      ),
    ).toBe('preserve-me')
  })

  test('keeps the legacy dehydration helper bound to the session state', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const session = hydrateGameState(prepared)

    expect(
      dehydrateGameState(session).copyValidatedState(),
    ).toEqual(session.prepare(session.state).copyValidatedState())
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
