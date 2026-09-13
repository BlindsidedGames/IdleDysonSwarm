import { describe, expect, test } from 'vitest'
import {
  createDeterministicMatureDysonFixture,
  DETERMINISTIC_DYSON_TUNING,
  DETERMINISTIC_DYSON_SNAPSHOT,
} from '../../scripts/support/deterministicMatureDysonFixture'
import { readFileSync } from 'node:fs'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { prepareIdb1Save, PreparedSave } from '../save/prepare'
import { serializeWebSave, deserializeWebSave } from '../save/serialization'
import { applyCanonicalSkillPresetLayout } from './canonicalSkillTransactions'
import { deriveBasicDysonState, deriveManualPurchaseProductionLayer } from './canonicalDysonDerivation'
import { prepareDynamicSkillEffectResolver } from './dynamicSkillEffectResolver'

const effectId = 'effect.whatWillComeToPass.data_centers_modifier'

describe('Terra purchases in What Will Come to Pass', () => {
  test.each([
    { skills: [], count: 100 },
    { skills: ['terraIrradiant'], count: 100 },
    { skills: ['terraFirma'], count: 110 },
    { skills: ['terraFirma', 'terraIrradiant'], count: 220 },
  ])('counts $count bought Data Centers with $skills', ({ skills, count }) => {
    const state = createDeterministicMatureDysonFixture({
      ownedSkillIds: [...skills, 'whatWillComeToPass'],
    })
    state.dyson.facilities.data_centers = [1000, 100]
    state.dyson.facilities.planets = [2000, 10]
    const multiplier = 1 + 0.01 * count
    expect(prepareDynamicSkillEffectResolver(
      state, DETERMINISTIC_DYSON_TUNING, DETERMINISTIC_DYSON_SNAPSHOT,
    ).resolve(effectId)).toEqual({ handled: true, ok: true, value: multiplier })

    const derive = (candidate: typeof state) => {
      const result = deriveBasicDysonState(candidate, DETERMINISTIC_DYSON_TUNING,
        { permanentDoubleIp: false }, DETERMINISTIC_DYSON_SNAPSHOT)
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      return result.value.facilityFacts.data_centers
    }
    const withSkill = derive(state)
    const withoutSkill = structuredClone(state)
    withoutSkill.skills.byId.whatWillComeToPass.owned = false
    const baseline = derive(withoutSkill)
    expect(withSkill.production.perSecond).toBeCloseTo(baseline.production.perSecond * multiplier, 5)
    const row = withSkill.details.modifierContributions?.find((item) => item.sourceId === effectId)
    expect(row?.calculation).toMatchObject({ kind: 'dynamic-facility-effect', manualDataCenters: count })
  })
})

const terraFacilities = [
  ['assembly_lines', 'terraNullius'],
  ['ai_managers', 'terraInfirma'],
  ['servers', 'terraEculeo'],
  ['data_centers', 'terraFirma'],
  ['planets', 'terraIrradiant'],
] as const

describe('effective purchases at every production milestone', () => {
  test.each(terraFacilities)('%s counts manual and Terra purchases consistently', (facility, terra) => {
    for (const count of [0, 49, 50, 51, 68, 69, 70, 99, 100, 101]) {
      for (const contribution of ['manual', 'terra', 'mixed'] as const) {
        // Planets have no transfer source; Irradiant's integer crossings are below.
        if (facility === 'planets' && contribution !== 'manual') continue
        const state = createDeterministicMatureDysonFixture({
          ownedSkillIds: ['avocados', ...(facility === 'planets' ? [] : [terra])],
        })
        const manual = contribution === 'manual' ? count : contribution === 'terra' ? 0 : Math.floor(count / 2)
        state.dyson.facilities.planets = [1e6, count - manual]
        state.dyson.facilities[facility] = [1e6, manual]
        const layer = deriveManualPurchaseProductionLayer(state, facility)
        expect(layer.effectiveManualCount).toBe(count)
        expect(layer.milestone50Multiplier).toBe(count >= 50 ? 2 : 1)
        expect(layer.avocadosMultiplier).toBe(count >= 69 ? 2 : 1)
        expect(layer.milestone100Multiplier).toBe(count >= 100 ? 2 : 1)
        expect(layer.scalingMultiplier).toBeCloseTo(1 + Math.max(0, count - 100) * 0.01)
        const withAvocados = deriveBasicDysonState(state, DETERMINISTIC_DYSON_TUNING,
          { permanentDoubleIp: false }, DETERMINISTIC_DYSON_SNAPSHOT)
        const without = structuredClone(state)
        without.skills.byId.avocados.owned = false
        const withoutAvocados = deriveBasicDysonState(without, DETERMINISTIC_DYSON_TUNING,
          { permanentDoubleIp: false }, DETERMINISTIC_DYSON_SNAPSHOT)
        expect(withAvocados.ok && withoutAvocados.ok).toBe(true)
        if (!withAvocados.ok || !withoutAvocados.ok) throw new Error('Derivation failed')
        expect(withAvocados.value.facilityFacts[facility].production.perSecond).toBeCloseTo(
          withoutAvocados.value.facilityFacts[facility].production.perSecond * (count >= 69 ? 2 : 1), 5)
      }
    }
  })

  test.each(terraFacilities)('%s uses twelvefold purchased Planets with Irradiant', (facility, terra) => {
    for (const [planets, m50, m69, m100] of [[4,1,1,1], [5,2,1,1], [6,2,2,1], [8,2,2,1], [9,2,2,2]]) {
      const state = createDeterministicMatureDysonFixture({ownedSkillIds: ['avocados', terra, 'terraIrradiant']})
      state.dyson.facilities[facility] = [1e6, 0]
      state.dyson.facilities.planets = [1e6, planets]
      expect(deriveManualPurchaseProductionLayer(state, facility)).toMatchObject({
        effectiveManualCount: planets * 12, milestone50Multiplier: m50,
        avocadosMultiplier: m69, milestone100Multiplier: m100,
      })
    }
  })

  test('Terra crosses fragment-adjusted scaling thresholds at every scaling rate', () => {
    for (const fragments of [0, 1, 2, 18, 19, 20]) {
      const threshold = Math.max(0, 90 - 5 * Math.max(0, fragments - 1))
      for (const [skill, rate] of [['', 0.01], ['superSwarm', 0.02], ['megaSwarm', 0.03], ['ultimateSwarm', 0.05]] as const) {
        for (const count of [Math.max(0, threshold - 1), threshold, threshold + 1]) {
          const state = createDeterministicMatureDysonFixture({ownedSkillIds: ['terraFirma', 'productionScaling', ...(skill ? [skill] : [])]})
          state.skills.fragments = BigInt(fragments)
          state.dyson.facilities.data_centers = [0, 0]
          state.dyson.facilities.planets = [0, count]
          expect(deriveManualPurchaseProductionLayer(state, 'data_centers')).toMatchObject({
            scalingThreshold: threshold, scalingRate: rate,
            scalingMultiplier: 1 + Math.max(0, count - threshold) * rate,
          })
        }
      }
    }
  })

  test('ordinary Supernova suppresses all bonuses; permanent Supernova retains them', () => {
    const state = createDeterministicMatureDysonFixture({ownedSkillIds: ['terraFirma', 'avocados', 'supernova']})
    state.dyson.facilities.data_centers = [0, 0]
    state.dyson.facilities.planets = [0, 101]
    expect(deriveManualPurchaseProductionLayer(state, 'data_centers').totalMultiplier).toBe(1)
    state.challenges = {...state.challenges!, galvanizedSkillIds: ['supernova']}
    expect(deriveManualPurchaseProductionLayer(state, 'data_centers').totalMultiplier).toBe(8.08)
  })

  test('preset changes remove and restore Terra bonuses without changing purchases or saved presets', () => {
    const state = createDeterministicMatureDysonFixture({ownedSkillIds: []})
    state.dyson.facilities.data_centers = [1000, 0]
    state.dyson.facilities.planets = [2000, 6]
    const presets = structuredClone(state.skills.presets)
    const apply = (source: typeof state, ids: string[]) => {
      const result = applyCanonicalSkillPresetLayout(source, ids)
      expect(result.accepted).toBe(true)
      if (!result.accepted) throw new Error(result.reason)
      return result.state
    }
    const enabled = apply(state, ['terraFirma', 'terraIrradiant', 'avocados'])
    expect(deriveManualPurchaseProductionLayer(enabled, 'data_centers').avocadosMultiplier).toBe(2)
    const disabled = apply(enabled, ['avocados'])
    expect(deriveManualPurchaseProductionLayer(disabled, 'data_centers').avocadosMultiplier).toBe(1)
    const restored = apply(disabled, ['terraFirma', 'terraIrradiant', 'avocados'])
    const base = hydrateGameState(prepareIdb1Save(readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')).prepared)
    const reloaded = hydrateGameState(PreparedSave.fromDecoded(deserializeWebSave(
      serializeWebSave(dehydrateGameState(base, restored).copyValidatedState()),
    ))).state
    expect(deriveManualPurchaseProductionLayer(reloaded, 'data_centers').avocadosMultiplier).toBe(2)
    expect(reloaded.dyson.facilities).toEqual(state.dyson.facilities)
    expect(reloaded.skills.presets).toEqual(presets)
  })
})
