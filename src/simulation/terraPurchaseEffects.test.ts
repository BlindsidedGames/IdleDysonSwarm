import { describe, expect, test } from 'vitest'
import {
  createDeterministicMatureDysonFixture,
  DETERMINISTIC_DYSON_TUNING,
  DETERMINISTIC_DYSON_SNAPSHOT,
} from '../../scripts/support/deterministicMatureDysonFixture'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
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
