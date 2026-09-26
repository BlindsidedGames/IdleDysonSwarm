import { expect, test } from 'vitest'
import { createDeterministicMatureDysonFixture, DETERMINISTIC_DYSON_SNAPSHOT, DETERMINISTIC_DYSON_TUNING } from '../../scripts/support/deterministicMatureDysonFixture'
import { withCanonicalBotAllocation } from './canonicalBotAllocation'
import { MANUAL_LABOUR_AUGMENTS as A } from './skillSubskills'
import { manualBotYield } from './manualLabourAugments'
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

test.each(['data_centers', 'galactic_brains'] as const)('Stellar refund compares funded %s production and the Bot debit', (target) => {
  const state = runtime(['stellarSacrifices'])
  for (const id of Object.keys(state.gameState.dyson.facilities) as Array<keyof typeof state.gameState.dyson.facilities>) {
    state.gameState.dyson.facilities[id] = [0, id === target ? 1 : 0]
  }
  // A representable Bot debit, with enough production for a positive sacrifice formula.
  state.gameState.dyson.bots = 1e30
  state.gameState = withCanonicalBotAllocation(state.gameState)
  const before = structuredClone(state)
  const preview = previewSkillProduction(state, 'stellarSacrifices', 'refund')
  const facility = preview.rows.find(row => row.id === target)!
  expect(facility.before).toBeGreaterThan(0)
  expect(facility.after).toBe(0)
  expect(facility.changed).toBe(true)
  const bots = preview.rows.find(row => row.id === 'bots')!
  expect(bots.after).toBeGreaterThan(bots.before)
  expect(preview.rows.find(row => row.id === 'planets')?.changed).toBe(false)
  expect(state).toEqual(before)
})


test('Patient Hands previews 42 seconds of stored work without changing the live counters', () => {
  const state = runtime(['manualLabour', A.handAssembly, A.practice])
  state.gameState.challenges.galvanizedSkillIds = ['manualLabour']
  for (const id of Object.values(A)) state.gameState.skills.byId[id] = {
    owned: id !== A.patientHands, level: 0, timerSeconds: 0, secondaryTimerSeconds: 0,
  }
  const before = structuredClone(state)
  const preview = previewSkillProduction(state, A.patientHands, 'purchase')
  const expected = structuredClone(state.gameState)
  expected.skills.byId[A.patientHands] = { ...expected.skills.byId[A.patientHands], owned: true, timerSeconds: 42 }
  expect(preview.projectedSeconds).toBe(42)
  expect(preview.rows.find(row => row.id === 'manualBots')?.after).toBe(manualBotYield(expected))
  expect(state).toEqual(before)
})
