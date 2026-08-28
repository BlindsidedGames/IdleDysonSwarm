import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { decodeIdb1Save, getSavePath } from './decodeIdb1'
import { migrateDecodedSave } from './migrate'
import { validatePreparedSave } from './validate'
import parityCases from '../../test/parity/save-migration-cases.json'
import { compareGraphs } from '../parity/compare'
import { requireRecord } from './graph'

const fixtureDirectory = new URL('../../test/fixtures/', import.meta.url)

function loadFixture(name: string): string {
  return readFileSync(new URL(name, fixtureDirectory), 'utf8')
}

describe('Unity save migration pipeline', () => {
  test.each(parityCases)(
    'migrates $name to the publishable schema',
    ({ fixture, sourceSchema, expected }) => {
      const decoded = decodeIdb1Save(loadFixture(fixture))
      const before = getSavePath(decoded.root, 'saveVersion')
      const migrated = migrateDecodedSave(decoded.root)

      expect(before).toBe(sourceSchema)
      expect(getSavePath(decoded.root, 'saveVersion')).toBe(sourceSchema)
      expect(migrated.sourceSchema).toBe(sourceSchema)
      expect(migrated.save.saveVersion).toBe(13)
      expect(migrated.save.infinityAutomaticReset).toBe(true)
      expect(migrated.validation).toEqual({ valid: true, error: null })
      expect(
        compareGraphs(migrated.save, expected, { expectedSubset: true }),
      ).toEqual([])
    },
  )

  test('ports legacy identifiers, sparse facilities, avocado and parity repairs', () => {
    const migrated = migrateDecodedSave({
      saveVersion: 0,
      infinityAutomaticReset: false,
      avotationProgressStep: 99,
      sdPrestige: { mathematics3: true },
      sdSimulation: { solarPanelGeneration: 1 },
      prestigePlus: {
        avocatoPurchased: true,
        avocatoIP: 12,
        avocatoInfluence: 2,
        avocatoStrangeMatter: 3,
        avocatoOverflow: 4,
      },
      dysonVerseSaveData: {
        skillAutoAssignmentList1: [2, 1],
        dysonVerseInfinityData: {
          SkillTreeSaveData: { 1: true },
          moneyMultiUpgradeOwned: 4,
          assemblyLines: null,
          assemblyLinesSparseIndices: [1],
          assemblyLinesSparseValues: [42],
        },
        dysonVersePrestigeData: {},
        dysonVerseSkillTreeData: {},
      },
    })

    const dyson = migrated.save.dysonVerseSaveData as Record<string, unknown>
    const infinity = dyson.dysonVerseInfinityData as Record<string, unknown>
    const avocado = migrated.save.avocadoData as Record<string, unknown>
    const simulation = migrated.save.sdSimulation as Record<string, unknown>

    expect(migrated.save.avotation).toBe(true)
    expect(migrated.save.infinityAutomaticReset).toBe(false)
    expect(migrated.save.avotationProgressStep).toBe(7)
    expect((infinity.skillOwnedById as Record<string, boolean>).startHereTree).toBe(true)
    expect(
      (infinity.researchLevelsById as Record<string, number>)[
        'research.money_multiplier'
      ],
    ).toBe(4)
    expect(infinity.assemblyLines).toEqual([0, 42])
    expect(dyson.skillAutoAssignmentIds1).toEqual([
      'startHereTree',
      'assemblyLineTree',
    ])
    expect(avocado).toMatchObject({
      unlocked: true,
      infinityPoints: 12,
      influence: 2,
      strangeMatter: 3,
      overflowMultiplier: 4,
    })
    expect(simulation.mathematicsComplete).toBe(true)
    expect(simulation.solarPanelGeneration).toBe(200)
  })

  test('repairs invalid numeric state before validation', () => {
    const migrated = migrateDecodedSave({
      saveVersion: 12,
      offlineTime: Number.POSITIVE_INFINITY,
      maxOfflineTime: Number.NaN,
      saveData: { workerGenerationProgress: 4.25 },
      dysonVerseSaveData: {
        botDistPreset1: 2,
        dysonVerseInfinityData: {
          bots: Number.NaN,
          money: Number.POSITIVE_INFINITY,
          researchLevelsById: { test: 4.9 },
        },
        dysonVersePrestigeData: { botDistribution: -1 },
        dysonVerseSkillTreeData: {},
      },
    })
    const dyson = migrated.save.dysonVerseSaveData as Record<string, unknown>
    const infinity = dyson.dysonVerseInfinityData as Record<string, unknown>

    expect(migrated.save.offlineTime).toBe(Number.MAX_VALUE)
    expect(migrated.save.maxOfflineTime).toBe(86_400)
    expect(migrated.save.cheater).toBe(true)
    expect((migrated.save.saveData as Record<string, unknown>).workerGenerationProgress).toBe(0.25)
    expect(infinity.bots).toBe(0)
    expect(infinity.money).toBe(Number.MAX_VALUE)
    expect((infinity.researchLevelsById as Record<string, number>).test).toBe(4)
    expect(dyson.botDistPreset1).toBe(1)
    expect(
      (dyson.dysonVersePrestigeData as Record<string, unknown>).botDistribution,
    ).toBe(0)
    expect(migrated.numericRepair.repairCount).toBeGreaterThan(0)
    expect(migrated.validation.valid).toBe(true)
  })

  test('preserves finite stored-time capacity without a gameplay cap', () => {
    const migrated = migrateDecodedSave({
      saveVersion: 12,
      offlineTime: 11_059_200,
      maxOfflineTime: 11_059_200,
    })

    expect(migrated.save.maxOfflineTime).toBe(11_059_200)
    expect(migrated.save.offlineTime).toBe(11_059_200)
    expect(migrated.save.cheater).not.toBe(true)
    expect(migrated.numericRepair.entries).not.toContainEqual(
      expect.objectContaining({ path: 'saveSettings.maxOfflineTime' }),
    )
  })

  test('repairs positive-infinite stored-time capacity to the finite numeric ceiling', () => {
    const migrated = migrateDecodedSave({
      saveVersion: 12,
      offlineTime: Number.POSITIVE_INFINITY,
      maxOfflineTime: Number.POSITIVE_INFINITY,
    })

    expect(migrated.save.maxOfflineTime).toBe(Number.MAX_VALUE)
    expect(migrated.save.offlineTime).toBe(Number.MAX_VALUE)
    expect(migrated.save.cheater).toBe(true)
  })

  test('migrates schema-12 Influence and Strange Matter carriers to finite doubles', () => {
    const aboveDoubleMaximum = BigInt(Number.MAX_VALUE) * 2n
    const source = {
      saveVersion: 12,
      saveData: { influence: 42n },
      sdPrestige: { strangeMatter: aboveDoubleMaximum },
      avocadoData: { influence: '125.5', strangeMatter: 9n },
      simulationStatistics: {
        lifetime: {
          strangeMatter: 10n,
          automaticInfluence: 11n,
          manualInfluence: '12.5',
        },
        currentQuantumRun: { strangeMatter: 13n },
        recentProcessedSegment: { automaticInfluence: 14n },
        lastCompletedCycle: {
          dreamCause: 'meteor',
          reward: 15n,
        },
        minuteWindows: [{ strangeMatter: 16n }],
        halfHourWindows: [{ strangeMatter: '17.5' }],
        dailyWindows: [{ strangeMatter: 18n }],
      },
    }

    const migrated = migrateDecodedSave(source)
    const statistics = requireRecord(migrated.save.simulationStatistics)
    const lifetime = requireRecord(statistics.lifetime)
    const currentQuantumRun = requireRecord(statistics.currentQuantumRun)
    const recentProcessedSegment = requireRecord(
      statistics.recentProcessedSegment,
    )
    const lastCompletedCycle = requireRecord(statistics.lastCompletedCycle)
    const minuteWindows = statistics.minuteWindows as Record<string, unknown>[]
    const halfHourWindows = statistics.halfHourWindows as Record<string, unknown>[]
    const dailyWindows = statistics.dailyWindows as Record<string, unknown>[]

    expect(migrated.sourceSchema).toBe(12)
    expect(migrated.targetSchema).toBe(13)
    expect(migrated.appliedSteps).toContain(
      'continuous-influence-and-strange-matter',
    )
    expect((migrated.save.saveData as Record<string, unknown>).influence)
      .toBe(42)
    expect((migrated.save.sdPrestige as Record<string, unknown>).strangeMatter)
      .toBe(Number.MAX_VALUE)
    expect(migrated.save.saveData).toMatchObject({
      hunterPurchaseBatches: 0n,
      gathererPurchaseBatches: 0n,
    })
    expect(migrated.save.sdSimulation).toMatchObject({
      solarPurchaseBatches: 0n,
      fusionPurchaseBatches: 0n,
    })
    expect(migrated.save.avocadoData).toMatchObject({
      influence: 125.5,
      strangeMatter: 9,
    })
    expect(lifetime).toMatchObject({
      strangeMatter: 10,
      automaticInfluence: 11,
      manualInfluence: 12.5,
    })
    expect(currentQuantumRun.strangeMatter).toBe(13)
    expect(recentProcessedSegment.automaticInfluence).toBe(14)
    expect(lastCompletedCycle.reward).toBe(15)
    expect(minuteWindows[0]?.strangeMatter).toBe(16)
    expect(halfHourWindows[0]?.strangeMatter).toBe(17.5)
    expect(dailyWindows[0]?.strangeMatter).toBe(18)
    expect(source.saveData.influence).toBe(42n)
  })

  test('accepts schema 13 without rerunning its versioned resource migration', () => {
    const migrated = migrateDecodedSave({
      saveVersion: 13,
      saveData: { influence: Number.MAX_VALUE },
      sdPrestige: { strangeMatter: Number.MAX_VALUE },
    })

    expect(migrated.sourceSchema).toBe(13)
    expect(migrated.targetSchema).toBe(13)
    expect(migrated.appliedSteps).not.toContain(
      'continuous-influence-and-strange-matter',
    )
    expect((migrated.save.saveData as Record<string, unknown>).influence)
      .toBe(Number.MAX_VALUE)
    expect((migrated.save.sdPrestige as Record<string, unknown>).strangeMatter)
      .toBe(Number.MAX_VALUE)
  })

  test('preserves schema-12 skill preset order during the schema-13 resource migration', () => {
    const migrated = migrateDecodedSave({
      saveVersion: 12,
      dysonVerseSaveData: {
        skillAutoAssignmentIds1: [
          'assemblyLineTree',
          'startHereTree',
        ],
      },
    })
    const dyson = requireRecord(migrated.save.dysonVerseSaveData)

    expect(dyson.skillAutoAssignmentIds1).toEqual([
      'assemblyLineTree',
      'startHereTree',
    ])
  })

  test('validator rejects future schema and non-finite prepared state', () => {
    expect(() => migrateDecodedSave({ saveVersion: 14 })).toThrow(
      'newer than supported',
    )
    const migrated = migrateDecodedSave({ saveVersion: 12 })
    ;(
      (
        migrated.save.dysonVerseSaveData as Record<string, unknown>
      ).dysonVerseInfinityData as Record<string, unknown>
    ).money = Number.NaN
    expect(validatePreparedSave(migrated.save, 13)).toEqual({
      valid: false,
      error:
        'saveSettings.dysonVerseSaveData.dysonVerseInfinityData.money contains a non-finite number.',
    })
  })
})
