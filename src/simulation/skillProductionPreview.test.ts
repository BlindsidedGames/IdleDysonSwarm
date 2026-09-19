import { expect, test } from 'vitest'
import { createDeterministicMatureDysonFixture, DETERMINISTIC_DYSON_SNAPSHOT, DETERMINISTIC_DYSON_TUNING } from '../../scripts/support/deterministicMatureDysonFixture'
import { previewSkillProduction } from './skillProductionPreview'

function runtime(ownedSkillIds: string[] = []) {
  return {
    gameState: createDeterministicMatureDysonFixture({ ownedSkillIds }),
    compatibilityTuning: DETERMINISTIC_DYSON_TUNING,
    evaluationSnapshot: DETERMINISTIC_DYSON_SNAPSHOT,
    entitlements: { permanentDoubleIp: false },
  }
}

test('Cash & Science previews actual output without modifying the save', () => {
  const state = runtime()
  const before = structuredClone(state)
  const result = previewSkillProduction(state, 'startHereTree', 'purchase')
  expect(result.projected).toBe(false)
  expect(result.rows.filter((row) => row.changed).map((row) => row.id)).toEqual(['money', 'science'])
  expect(result.rows.find((row) => row.id === 'money')!.after).toBeGreaterThan(result.rows.find((row) => row.id === 'money')!.before)
  expect(state).toEqual(before)
})

test('uncharged SRS projects ten minutes; retained charge and refunds use the actual timer', () => {
  const state = runtime(['superRadiantScattering'])
  const skill = state.gameState.skills.byId.superRadiantScattering
  skill.timerSeconds = 300
  const refund = previewSkillProduction(state, 'superRadiantScattering', 'refund')
  const money = refund.rows.find((row) => row.id === 'money')!
  expect(refund.projected).toBe(false)
  expect(money.before / money.after).toBeCloseTo(4)
  skill.owned = false
  expect(previewSkillProduction(state, 'superRadiantScattering', 'purchase').projected).toBe(false)
  skill.timerSeconds = 0
  const before = structuredClone(state)
  const projected = previewSkillProduction(state, 'superRadiantScattering', 'purchase')
  expect(projected.projected).toBe(true)
  const mega = projected.rows.find((row) => row.id === 'birch_planets')!
  expect(mega.after / mega.before).toBeCloseTo(7)
  expect(state).toEqual(before)
})

test('spending a point includes the loss of Purity production in the same preview', () => {
  const state = runtime(['purityOfBody', 'purityOfMind', 'purityOfSEssence'])
  state.gameState.skills.points = 42n
  const result = previewSkillProduction(state, 'startHereTree', 'purchase')
  expect(result.rows.find((row) => row.id === 'bots')!.after).toBeLessThan(result.rows.find((row) => row.id === 'bots')!.before)
  expect(result.rows.find((row) => row.id === 'money')!.after).toBeGreaterThan(result.rows.find((row) => row.id === 'money')!.before)
})
