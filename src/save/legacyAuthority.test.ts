import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { CanonicalRuntimeSession } from '../application/canonicalRuntimeSession'
import { requireRecord } from './graph'
import { PreparedSave, prepareIdb1Save } from './prepare'
import { CURRENT_SAVE_SCHEMA } from './migrate'
import { skillIdsToBitset, skillIdsToLegacyKeys } from './legacyIds'

const fixture = readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')
const options = { entitlements: { extraAnalysisPower: false, permanentDoubleIp: false } }

function poisonedMirrors(schema: number) {
  const source = prepareIdb1Save(fixture).prepared.copyValidatedState()
  source.saveVersion = schema
  source.avotation = false
  source.avotationProgressStep = 7
  // Keep packed settings consistent with the deliberate current flag.
  source.hasPackedSettingsFlags = false
  requireRecord(source.sdPrestige).mathematics3 = true
  requireRecord(source.sdSimulation).mathematicsComplete = false
  requireRecord(source.sdSimulation).solarPanelGeneration = 100n
  const dyson = requireRecord(source.dysonVerseSaveData)
  const infinity = requireRecord(dyson.dysonVerseInfinityData)
  infinity.researchLevelsById = { 'research.science_boost': 0 }
  infinity.moneyMultiUpgradeOwned = 56
  infinity.scienceBoostOwned = 70
  infinity.skillStateById = {}
  infinity.skillOwnedBits = skillIdsToBitset(['startHereTree'])
  infinity.skillOwnedById = { startHereTree: true }
  infinity.SkillTreeSaveData = { 1: true }
  for (let slot = 0; slot <= 5; slot++) {
    const suffix = slot || ''
    dyson[`skillAutoAssignmentIds${suffix}`] = []
    dyson[`skillAutoAssignmentList${suffix}`] = skillIdsToLegacyKeys(['startHereTree'])
  }
  requireRecord(dyson.dysonVerseSkillTreeData).superRadiantScatteringTimer = 1000
  infinity.planets = [0, 0]
  infinity.planetsSparseIndices = [1]
  infinity.planetsSparseValues = [99]
  source.avocadoData = { unlocked: false, infinityPoints: 0, influence: 0, strangeMatter: 0, overflowMultiplier: 0, overflowPoints: 0n }
  Object.assign(requireRecord(source.prestigePlus), { avocatoPurchased: true, avocatoIP: 55 })
  return source
}

describe('canonical saves never recover gameplay from legacy mirrors', () => {
  test.each([12, 18, CURRENT_SAVE_SCHEMA])('schema %i trusts empty and zero canonical values', (schema) => {
    const first = PreparedSave.fromDecoded(poisonedMirrors(schema))
    const second = PreparedSave.fromDecoded(first.copyValidatedState())
    for (const prepared of [first, second]) {
      const graph = prepared.copyValidatedState()
      expect(graph.avotation).toBe(false)
      expect(requireRecord(graph.sdSimulation).mathematicsComplete).toBe(false)
      expect(requireRecord(graph.sdSimulation).solarPanelGeneration).toBe(100n)
      const runtime = new CanonicalRuntimeSession(prepared, options).initialState.gameState
      expect(runtime.research.levelsById['research.money_multiplier']).toBe(0)
      expect(runtime.research.levelsById['research.science_boost']).toBe(0)
      expect(Object.values(runtime.skills.byId).some((skill) => skill.owned)).toBe(false)
      expect(runtime.skills.byId.superRadiantScattering.timerSeconds).toBe(0)
      expect(runtime.skills.activeAutoAssignment).toEqual([])
      expect(runtime.skills.presets.every((preset) => preset.skillIds.length === 0)).toBe(true)
      expect(runtime.avocado).toMatchObject({ unlocked: false, infinityPoints: 0 })
      const infinity = requireRecord(requireRecord(prepared.copyValidatedState().dysonVerseSaveData).dysonVerseInfinityData)
      expect(infinity.planets).toEqual([0, 0])
    }
  })

  test('legacy Unity data still converts once', () => {
    const prepared = PreparedSave.fromDecoded(poisonedMirrors(11))
    const source = prepared.copyValidatedState()
    const infinity = requireRecord(requireRecord(source.dysonVerseSaveData).dysonVerseInfinityData)
    expect(requireRecord(infinity.researchLevelsById)['research.money_multiplier']).toBe(56)
    expect(requireRecord(infinity.researchLevelsById)['research.science_boost']).toBe(0)
    expect(infinity.planets).toEqual([0, 99])
    const first = new CanonicalRuntimeSession(prepared, options).initialState.gameState
    const second = new CanonicalRuntimeSession(PreparedSave.fromDecoded(source), options).initialState.gameState
    expect(first.skills.byId.startHereTree.owned).toBe(true)
    expect(first.skills.byId.superRadiantScattering.timerSeconds).toBe(1000)
    expect(first.avocado.infinityPoints).toBe(55)
    expect(second.avocado).toEqual(first.avocado)
  })

  test('canonical writes preserve cleared research and every preset through reopen', () => {
    const session = new CanonicalRuntimeSession(prepareIdb1Save(fixture).prepared, options)
    const runtime = structuredClone(session.initialState)
    runtime.gameState.research.levelsById = {}
    runtime.gameState.skills.activeAutoAssignment = []
    for (const preset of runtime.gameState.skills.presets) preset.skillIds = []
    const prepared = session.prepare(runtime)
    const reloaded = new CanonicalRuntimeSession(PreparedSave.fromDecoded(prepared.copyValidatedState()), options).initialState.gameState
    expect(Object.values(reloaded.research.levelsById).every((level) => level === 0)).toBe(true)
    expect(reloaded.skills.activeAutoAssignment).toEqual([])
    expect(reloaded.skills.presets.every((preset) => preset.skillIds.length === 0)).toBe(true)
  })
})
