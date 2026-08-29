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
  previewCanonicalFacilityPurchase,
  tryPurchaseCanonicalFacility,
} from '../simulation/canonicalDysonCommands'
import {
  previewCanonicalResearchPurchase,
  purchaseCanonicalResearch,
} from '../simulation/researchAutomation'
import {
  DISCRETE_MAXIMUM,
  SIMULATION_RESOURCE_MAXIMUM,
} from '../simulation/numeric'
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

  test('round-trips Simulation producer batch counts independently of owned quantities', () => {
    const hydrated = hydrateGameState(prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared)
    const candidate = {
      ...hydrated.state,
      dream: {
        ...hydrated.state.dream,
        purchaseBatches: {
          hunters: 12n,
          gatherers: 34n,
          solar: 56n,
          fusion: 78n,
        },
      },
    }

    const dehydrated = dehydrateGameState(hydrated, candidate)
    const raw = dehydrated.copyValidatedState()
    expect(getSavePath(raw, 'saveData.hunterPurchaseBatches')).toBe(12n)
    expect(getSavePath(raw, 'saveData.gathererPurchaseBatches')).toBe(34n)
    expect(getSavePath(raw, 'sdSimulation.solarPurchaseBatches')).toBe(56n)
    expect(getSavePath(raw, 'sdSimulation.fusionPurchaseBatches')).toBe(78n)
    expect(hydrateGameState(dehydrated).state.dream.purchaseBatches)
      .toEqual(candidate.dream.purchaseBatches)
  })

  test('ignores legacy portable size while round-tripping visibility', () => {
    const original = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const legacyPortable = original.copyValidatedState()
    legacyPortable.bottomNavigationPreferences = {
      version: 1,
      size: 'large',
      visibility: {
        settings: false,
        'future-destination': true,
      },
    }
    const hydrated = hydrateGameState(PreparedSave.fromDecoded(
      deserializeWebSave(serializeWebSave(legacyPortable)),
    ))

    expect('bottomNavigationSize' in hydrated.state.meta).toBe(false)
    expect(hydrated.state.meta.navigationVisibility?.settings).toBe(false)
    expect(
      hydrated.state.meta.navigationVisibility?.['future-destination'],
    ).toBe(true)

    const dehydrated = dehydrateGameState(hydrated, hydrated.state)
    expect(dehydrated.copyValidatedState().bottomNavigationPreferences)
      .not.toHaveProperty('size')

    const rehydrated = hydrateGameState(
      PreparedSave.fromDecoded(deserializeWebSave(
        serializeWebSave(dehydrated.copyValidatedState()),
      )),
    )
    expect(rehydrated.state.meta.navigationVisibility?.settings).toBe(false)
    expect(
      rehydrated.state.meta.navigationVisibility?.['future-destination'],
    ).toBe(true)
  })

  test('round-trips per-save navigation discovery while legacy saves remain unset', () => {
    const original = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const legacy = hydrateGameState(original)
    expect(legacy.state.meta.navigationRouteDiscovery).toBeUndefined()

    const candidate = {
      ...legacy.state,
      meta: {
        ...legacy.state.meta,
        navigationRouteDiscovery: {
          knownRoutes: ['research', 'skills', 'infinity'] as const,
          unvisitedRoutes: ['infinity'] as const,
        },
      },
    }
    const rehydrated = hydrateGameState(
      dehydrateGameState(legacy, candidate),
    )
    expect(rehydrated.state.meta.navigationRouteDiscovery).toEqual(
      candidate.meta.navigationRouteDiscovery,
    )
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

    const facilityPreview = previewCanonicalFacilityPurchase(
      reloaded.state,
      'assembly_lines',
    )
    const facilityPurchase = tryPurchaseCanonicalFacility(
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

  test('accepts a prepared schema-13 entry without rerunning migration', () => {
    const historical = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const current = historical.withValidatedState(
      historical.copyValidatedState(),
    )
    const hydrated = hydrateGameState(current)
    const dehydrated = dehydrateGameState(hydrated)

    expect(current.sourceSchema).toBe(13)
    expect(current.appliedSteps).toEqual([])
    expect(current.numericRepair.repairCount).toBe(0)
    expect(hydrateGameState(dehydrated).state).toEqual(hydrated.state)
  })

  test('defaults automatic Infinity on and round-trips an explicit off setting', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const hydrated = hydrateGameState(prepared)

    expect(hydrated.state.infinity.automaticResetEnabled).toBe(true)

    const disabled = dehydrateGameState(hydrated, {
      ...hydrated.state,
      infinity: {
        ...hydrated.state.infinity,
        automaticResetEnabled: false,
      },
    })

    expect(
      disabled.copyValidatedState().infinityAutomaticReset,
    ).toBe(false)
    expect(
      hydrateGameState(disabled).state.infinity.automaticResetEnabled,
    ).toBe(false)
  })

  test('round-trips the current Infinity run peak without changing legacy fields', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const hydrated = hydrateGameState(prepared)
    const withPeak = dehydrateGameState(hydrated, {
      ...hydrated.state,
      infinity: {
        ...hydrated.state.infinity,
        currentCyclePeakIpPerMinute: 2_040.5,
        currentCyclePeakReward: 72n,
        manualPeakIpPerMinute: 1_980.25,
        manualPeakReward: 68n,
        manualCalibrationObservedActiveSeconds: 12.5,
        activeAutomaticThroughputCycleEligible: true,
      },
    })

    expect(withPeak.copyValidatedState()).toMatchObject({
      simulationInfinityPeakIpPerMinute: 2_040.5,
      simulationInfinityPeakReward: 72n,
      simulationInfinityManualPeakIpPerMinute: 1_980.25,
      simulationInfinityManualPeakReward: 68n,
      simulationInfinityManualObservedActiveSeconds: 12.5,
      simulationInfinityActiveAutomaticThroughputCycleEligible: true,
    })
    expect(hydrateGameState(withPeak).state.infinity).toMatchObject({
      currentCyclePeakIpPerMinute: 2_040.5,
      currentCyclePeakReward: 72n,
      manualPeakIpPerMinute: 1_980.25,
      manualPeakReward: 68n,
      manualCalibrationObservedActiveSeconds: 12.5,
      activeAutomaticThroughputCycleEligible: true,
    })

    const legacyPeakOnly = withPeak.copyValidatedState()
    delete legacyPeakOnly.simulationInfinityManualPeakIpPerMinute
    delete legacyPeakOnly.simulationInfinityManualPeakReward
    delete legacyPeakOnly.simulationInfinityManualObservedActiveSeconds
    delete legacyPeakOnly.simulationInfinityActiveAutomaticThroughputCycleEligible
    expect(
      hydrateGameState(withPeak.withValidatedState(legacyPeakOnly)).state.infinity,
    ).toMatchObject({
      manualPeakIpPerMinute: 0,
      manualPeakReward: 0n,
    })

    legacyPeakOnly.infinityAutomaticReset = false
    expect(
      hydrateGameState(withPeak.withValidatedState(legacyPeakOnly)).state.infinity,
    ).toMatchObject({
      manualPeakIpPerMinute: 2_040.5,
      manualPeakReward: 72n,
    })
  })

  test('round-trips the bounded recent Infinity cycle history without changing old saves', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const hydrated = hydrateGameState(prepared)

    expect(hydrated.state.statistics.recentInfinityCycles).toBeUndefined()
    expect(
      (dehydrateGameState(hydrated).copyValidatedState()
        .simulationStatistics as Record<string, unknown>)
        .recentInfinityCycles,
    ).toBeUndefined()

    const withHistory = dehydrateGameState(hydrated, {
      ...hydrated.state,
      statistics: {
        ...hydrated.state.statistics,
        recentInfinityCycles: [
          {
            breakInfinity: true,
            automatic: true,
            configuredTarget: 30n,
            reward: 32n,
            durationSeconds: 28.5,
            processingSource: 'active',
            activeIntervalMilliseconds: 33,
          },
          {
            breakInfinity: true,
            automatic: false,
            configuredTarget: 28n,
            reward: 28n,
            durationSeconds: 27,
            processingSource: 'stored-time',
            activeIntervalMilliseconds: 200,
          },
        ],
        recentActiveAutomaticInfinityCycles: [
          {
            breakInfinity: true,
            automatic: true,
            configuredTarget: 30n,
            reward: 32n,
            durationSeconds: 28.5,
            processingSource: 'active',
            activeIntervalMilliseconds: 33,
          },
        ],
      },
    })

    expect(hydrateGameState(withHistory).state.statistics.recentInfinityCycles)
      .toEqual([
        {
          breakInfinity: true,
          automatic: true,
          configuredTarget: 30n,
          reward: 32n,
          durationSeconds: 28.5,
          processingSource: 'active',
          activeIntervalMilliseconds: 33,
        },
        {
          breakInfinity: true,
          automatic: false,
          configuredTarget: 28n,
          reward: 28n,
          durationSeconds: 27,
          processingSource: 'stored-time',
          activeIntervalMilliseconds: 200,
        },
      ])
    expect(
      hydrateGameState(withHistory).state.statistics
        .recentActiveAutomaticInfinityCycles,
    ).toEqual([
      {
        breakInfinity: true,
        automatic: true,
        configuredTarget: 30n,
        reward: 32n,
        durationSeconds: 28.5,
        processingSource: 'active',
        activeIntervalMilliseconds: 33,
      },
    ])
  })

  test('repairs a missing or zero legacy Break target to one IP', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const invalid = prepared.copyValidatedState()
    invalid.infinityPointsToBreakFor = 0

    const hydrated = hydrateGameState(PreparedSave.fromDecoded(invalid))

    expect(hydrated.state.infinity.breakTarget).toBe(1n)
    expect(
      dehydrateGameState(hydrated).copyValidatedState()
        .infinityPointsToBreakFor,
    ).toBe(1)
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

  test('round-trips Simulation resources above the legacy Int64 ceiling', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const session = hydrateGameState(prepared)
    const aboveLegacyMaximum = DISCRETE_MAXIMUM + 42n
    const candidate = {
      ...session.state,
      dream: {
        ...session.state.dream,
        resources: {
          ...session.state.dream.resources,
          dysonPanels: aboveLegacyMaximum,
          swarmPanels: aboveLegacyMaximum + 1n,
        },
        railgun: {
          ...session.state.dream.railgun,
          reservedPanels: aboveLegacyMaximum + 2n,
          highestStoredPanels: aboveLegacyMaximum + 3n,
        },
        strangeMatter: Number(aboveLegacyMaximum + 4n),
      },
      statistics: {
        ...session.state.statistics,
        lifetime: {
          ...session.state.statistics.lifetime,
          strangeMatter: Number(aboveLegacyMaximum + 5n),
        },
        currentQuantumRun: {
          ...session.state.statistics.currentQuantumRun,
          strangeMatter: Number(aboveLegacyMaximum + 6n),
        },
        recentProcessedSegment: {
          ...session.state.statistics.recentProcessedSegment,
          strangeMatter: Number(aboveLegacyMaximum + 7n),
        },
        lastCompletedCycle: {
          ...session.state.statistics.lastCompletedCycle,
          valid: true,
          reward: Number(aboveLegacyMaximum + 8n),
          dreamCause: 'BlackHole',
        },
        minuteWindows: session.state.statistics.minuteWindows.map(
          (window, index) => index === 0
            ? { ...window, strangeMatter: Number(aboveLegacyMaximum + 9n) }
            : window,
        ),
        halfHourWindows: session.state.statistics.halfHourWindows.map(
          (window, index) => index === 0
            ? { ...window, strangeMatter: Number(aboveLegacyMaximum + 10n) }
            : window,
        ),
        dailyWindows: session.state.statistics.dailyWindows.map(
          (window, index) => index === 0
            ? { ...window, strangeMatter: Number(aboveLegacyMaximum + 11n) }
            : window,
        ),
      },
    }

    const encoded = serializeWebSave(
      dehydrateGameState(session, candidate).copyValidatedState(),
    )
    const reloaded = hydrateGameState(
      PreparedSave.fromDecoded(deserializeWebSave(encoded)),
    ).state

    expect(reloaded.dream.resources.dysonPanels).toBe(aboveLegacyMaximum)
    expect(reloaded.dream.resources.swarmPanels)
      .toBe(aboveLegacyMaximum + 1n)
    expect(reloaded.dream.railgun.reservedPanels)
      .toBe(aboveLegacyMaximum + 2n)
    expect(reloaded.dream.railgun.highestStoredPanels)
      .toBe(aboveLegacyMaximum + 3n)
    expect(reloaded.dream.strangeMatter).toBe(Number(aboveLegacyMaximum + 4n))
    expect(reloaded.dream.strangeMatter)
      .toBeLessThan(Number.MAX_VALUE)
    expect(reloaded.statistics.lifetime.strangeMatter)
      .toBe(Number(aboveLegacyMaximum + 5n))
    expect(reloaded.statistics.currentQuantumRun.strangeMatter)
      .toBe(Number(aboveLegacyMaximum + 6n))
    expect(reloaded.statistics.recentProcessedSegment.strangeMatter)
      .toBe(Number(aboveLegacyMaximum + 7n))
    expect(reloaded.statistics.lastCompletedCycle.reward)
      .toBe(Number(aboveLegacyMaximum + 8n))
    expect(reloaded.statistics.minuteWindows[0]?.strangeMatter)
      .toBe(Number(aboveLegacyMaximum + 9n))
    expect(reloaded.statistics.halfHourWindows[0]?.strangeMatter)
      .toBe(Number(aboveLegacyMaximum + 10n))
    expect(reloaded.statistics.dailyWindows[0]?.strangeMatter)
      .toBe(Number(aboveLegacyMaximum + 11n))

    const oversized = {
      ...candidate,
      dream: {
        ...candidate.dream,
        resources: {
          ...candidate.dream.resources,
          dysonPanels: SIMULATION_RESOURCE_MAXIMUM + 1n,
          swarmPanels: SIMULATION_RESOURCE_MAXIMUM + 2n,
        },
        railgun: {
          ...candidate.dream.railgun,
          reservedPanels: SIMULATION_RESOURCE_MAXIMUM + 3n,
          highestStoredPanels: SIMULATION_RESOURCE_MAXIMUM + 4n,
        },
        strangeMatter: Number.MAX_VALUE,
      },
    }
    const repaired = hydrateGameState(
      dehydrateGameState(session, oversized),
    ).state
    expect(repaired.dream.resources.dysonPanels)
      .toBe(SIMULATION_RESOURCE_MAXIMUM)
    expect(repaired.dream.resources.swarmPanels)
      .toBe(SIMULATION_RESOURCE_MAXIMUM)
    expect(repaired.dream.railgun.reservedPanels)
      .toBe(SIMULATION_RESOURCE_MAXIMUM)
    expect(repaired.dream.railgun.highestStoredPanels)
      .toBe(SIMULATION_RESOURCE_MAXIMUM)
    expect(repaired.dream.strangeMatter)
      .toBe(Number.MAX_VALUE)
  })

  test('migrates the retired Double Time bank into Stored Time exactly once', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const legacy = prepared.copyValidatedState() as Record<string, unknown>
    legacy.offlineTime = 80
    legacy.maxOfflineTime = 100
    delete legacy.processingRewriteMigrated
    const dreamProgression = legacy.sdPrestige as Record<string, unknown>
    dreamProgression.doubleTimeOwned = true
    dreamProgression.doDoubleTime = true
    dreamProgression.doubleTime = 50
    dreamProgression.doubleTimeRate = 10

    const migrated = hydrateGameState(PreparedSave.fromDecoded(legacy))
    expect(migrated.state.timeline).toMatchObject({
      storedTimeAvailableSeconds: 100,
      storedTimeCapacitySeconds: 100,
      processing: {
        rewriteMigrated: true,
        activeIntervalMilliseconds: 33,
        storedTimePreset: 'balanced',
      },
      doubleTime: {
        unlocked: true,
        enabled: false,
        bankSeconds: 0,
        rate: 0,
      },
    })

    const persisted = dehydrateGameState(migrated).copyValidatedState() as Record<string, unknown>
    expect(persisted.processingRewriteMigrated).toBe(true)
    expect((persisted.sdPrestige as Record<string, unknown>).doubleTime).toBe(0)

    persisted.offlineTime = 40
    ;(persisted.sdPrestige as Record<string, unknown>).doubleTime = 99
    const reloaded = hydrateGameState(PreparedSave.fromDecoded(persisted))
    expect(reloaded.state.timeline.storedTimeAvailableSeconds).toBe(40)
    expect(reloaded.state.timeline.doubleTime.unlocked).toBe(true)
  })

  test('round-trips the active cadence and Stored Time accuracy preset', () => {
    const prepared = prepareIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    ).prepared
    const session = hydrateGameState(prepared)
    const candidate = {
      ...session.state,
      timeline: {
        ...session.state.timeline,
        processing: {
          rewriteMigrated: true,
          activeIntervalMilliseconds: 200,
          storedTimePreset: 'accurate' as const,
        },
      },
    }
    const reloaded = hydrateGameState(dehydrateGameState(session, candidate))
    expect(reloaded.state.timeline.processing).toEqual(
      candidate.timeline.processing,
    )
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
