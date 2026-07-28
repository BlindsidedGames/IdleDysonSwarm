import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { decodeIdb1Save, getSavePath } from './decodeIdb1'
import { migrateDecodedSave } from './migrate'
import { validatePreparedSave } from './validate'
import parityCases from '../../test/parity/save-migration-cases.json'
import { compareGraphs } from '../parity/compare'

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
      expect(migrated.save.saveVersion).toBe(12)
      expect(migrated.validation).toEqual({ valid: true, error: null })
      expect(
        compareGraphs(migrated.save, expected, { expectedSubset: true }),
      ).toEqual([])
    },
  )

  test('ports legacy identifiers, sparse facilities, avocado and parity repairs', () => {
    const migrated = migrateDecodedSave({
      saveVersion: 0,
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

    expect(migrated.save.offlineTime).toBe(42_000_000)
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

  test('validator rejects future schema and non-finite prepared state', () => {
    expect(() => migrateDecodedSave({ saveVersion: 13 })).toThrow(
      'newer than supported',
    )
    const migrated = migrateDecodedSave({ saveVersion: 12 })
    ;(
      (
        migrated.save.dysonVerseSaveData as Record<string, unknown>
      ).dysonVerseInfinityData as Record<string, unknown>
    ).money = Number.NaN
    expect(validatePreparedSave(migrated.save, 12)).toEqual({
      valid: false,
      error:
        'saveSettings.dysonVerseSaveData.dysonVerseInfinityData.money contains a non-finite number.',
    })
  })
})
