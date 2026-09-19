import { describe, expect, test } from 'vitest'
import { createDeterministicMatureDysonFixture, DETERMINISTIC_DYSON_SNAPSHOT, DETERMINISTIC_DYSON_TUNING } from '../../scripts/support/deterministicMatureDysonFixture'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import { purityBodyMultiplier, purityMindMultiplier, purityEssenceMultiplier } from './purityMultipliers'
import { previewCanonicalSkillCatalog } from './canonicalSkillTransactions'
import { MEGA_STRUCTURE_FACILITY_IDS } from './dysonFacilityCatalog'

const puritySkills = ['purityOfBody', 'purityOfMind', 'purityOfSEssence']
const fixture = (ownedSkillIds: string[]) => {
  const state = createDeterministicMatureDysonFixture({ ownedSkillIds })
  state.skills.points = 42n
  state.skills.byId.superRadiantScattering.timerSeconds = 86_400
  return state
}
const derive = (state: ReturnType<typeof fixture>) => {
  const result = deriveBasicDysonState(state, DETERMINISTIC_DYSON_TUNING,
    { permanentDoubleIp: false }, DETERMINISTIC_DYSON_SNAPSHOT)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.value
}

describe('Purity balance and megastructure production', () => {
  test.each([[0, 1, 1, 1], [1, 1.25, 1.5, 1.42], [2, 1.5, 2, 2.115679442508711], [42, 11.5, 22, 256]])(
    '%s spare points use the agreed multipliers', (points, body, mind, essence) => {
      expect(purityBodyMultiplier(points)).toBe(body)
      expect(purityMindMultiplier(points)).toBe(mind)
      expect(purityEssenceMultiplier(points)).toBeCloseTo(essence, 10)
    },
  )

  test.each([
    { skills: puritySkills, cash: 5632, bots: 2944, facilities: 256 },
    { skills: ['superRadiantScattering'], cash: 865, bots: 865, facilities: 865 },
    { skills: [...puritySkills, 'superRadiantScattering'], cash: 5632 * 865, bots: 2944 * 865, facilities: 256 * 865 },
  ])('production and visible breakdowns agree for $skills', ({ skills, cash, bots, facilities }) => {
    const baseline = derive(fixture([]))
    const result = derive(fixture(skills))
    expect(result.globals.moneyMultiplier / baseline.globals.moneyMultiplier).toBeCloseTo(cash, 6)
    expect(result.globals.scienceMultiplier / baseline.globals.scienceMultiplier).toBeCloseTo(cash, 6)
    expect(result.rates.bots / baseline.rates.bots).toBeCloseTo(bots, 6)
    for (const id of ['ai_managers', 'servers', 'data_centers', 'planets', ...MEGA_STRUCTURE_FACILITY_IDS] as const) {
      expect(result.facilityFacts[id].production.perSecond / baseline.facilityFacts[id].production.perSecond).toBeCloseTo(facilities, 6)
    }
    for (const id of MEGA_STRUCTURE_FACILITY_IDS) {
      const rows = result.facilityFacts[id].details.modifierContributions!
      for (const skill of skills.filter((id) => id !== 'purityOfBody' && id !== 'purityOfMind')) {
        expect(rows.find((row) => row.source?.id === skill)).toMatchObject({
          value: skill === 'purityOfSEssence' ? 256 : 865,
          source: { kind: 'skill', id: skill },
          calculation: { kind: 'dynamic-facility-effect' },
        })
      }
    }
  })

  test('spending points shows the same production change in purchase previews', () => {
    const state = fixture(puritySkills)
    const preview = previewCanonicalSkillCatalog(state).skills
      .find((skill) => skill.purchase.eligible && skill.purchase.productionImpact?.purity)
    expect(preview).toBeDefined()
    const impact = preview!.purchase.productionImpact!
    expect(impact.purity).toMatchObject({ cashScienceBefore: 5632, botsBefore: 2944, everythingBefore: 256 })
    const after = structuredClone(state)
    after.skills.points = impact.pointsAfter
    const beforeProduction = derive(state)
    const afterProduction = derive(after)
    expect(impact.purity!.cashScienceAfter / impact.purity!.cashScienceBefore).toBeCloseTo(
      afterProduction.globals.moneyMultiplier / beforeProduction.globals.moneyMultiplier, 10)
    expect(impact.purity!.botsAfter / impact.purity!.botsBefore).toBeCloseTo(
      afterProduction.rates.bots / beforeProduction.rates.bots, 10)
  })
})
