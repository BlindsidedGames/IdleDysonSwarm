import { expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { DYSON_FACILITY_IDS } from '../game-state/facilityIds'
import { MANUAL_FACILITY_AUGMENTS as A, MANUAL_LABOUR_AUGMENTS as H } from './skillSubskills'
import { deriveAdditionalTinkerYields, manualFacilityYield } from './manualFacilityAugments'
import { advanceCanonicalTinker, createCanonicalTinkerRuntimeState, deriveCanonicalTinkerStats, startCanonicalTinker } from './canonicalTinker'
import { purchaseCanonicalSkill, refundCanonicalSkill, applyCanonicalSkillPresetLayout } from './canonicalSkillTransactions'
import { EMPTY_INFINITY_CHALLENGES } from './infinityChallenges'

function fixture(ids: string[] = A.map(a => a.id)) {
  const loaded = hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: '2026-09-27T00:00:00Z' }))
  const state = structuredClone(loaded.state)
  state.meta.firstInfinityComplete = true
  state.skills.points = 50n
  state.challenges = { ...EMPTY_INFINITY_CHALLENGES, blankSlateCompleted: true, galvanizedSkillIds: ['manualLabour'] }
  for (const id of ['manualLabour', ...ids]) state.skills.byId[id] = { owned: true, level: 0, timerSeconds: 0, secondaryTimerSeconds: 0 }
  for (const id of DYSON_FACILITY_IDS) state.dyson.facilities[id] = [99, 1]
  state.quantum.unlocks = { ...state.quantum.unlocks, matrioshkaBrains: true, birchPlanets: true, galacticBrains: true }
  state.dyson.manualCreationIntervalSeconds = .2
  return { loaded, state }
}
const rates = Object.fromEntries(DYSON_FACILITY_IDS.map(id => [id, 10]))

test('additional facility branch purchases sequential prerequisites without buying the Bot branch', () => {
  const { state } = fixture([])
  const result = purchaseCanonicalSkill(state, A[5].id)
  expect(result.accepted).toBe(true)
  expect(result.state.skills.points).toBe(44n)
  for (const { id } of A.slice(0, 6)) expect(result.state.skills.byId[id]?.owned).toBe(true)
  expect(result.state.skills.byId[H.handAssembly]?.owned).not.toBe(true)
  const refund = refundCanonicalSkill(result.state, A[2].id)
  expect(refund.accepted).toBe(true)
  for (const { id } of A.slice(2, 6)) expect(refund.state.skills.byId[id]?.owned).not.toBe(true)
})

test('facility rewards use 2% ownership capped by twenty seconds production, with Versatile scaling', () => {
  const { state } = fixture(A.slice(0, 6).map(a => a.id))
  expect(manualFacilityYield(100, .01)).toBe(.2)
  expect(manualFacilityYield(100, 10)).toBe(2)
  const yields = deriveAdditionalTinkerYields(state, { ...rates, ai_managers: .01 })
  expect(yields.ai_managers).toBe(.2)
  expect(yields.servers).toBe(2)
  expect(yields.matrioshka_brains).toBe(2)
  state.skills.byId.versatileProductionTactics = { owned: true, level: 0, timerSeconds: 0, secondaryTimerSeconds: 0 }
  expect(deriveAdditionalTinkerYields(state, rates).servers).toBe(3)
  expect(manualFacilityYield(Number.MAX_VALUE, Number.MAX_VALUE)).toBeLessThanOrEqual(Number.MAX_VALUE)
})

test('Hand Assembly, Assembly Lines and higher facility rewards all apply together without purchases', () => {
  const { state } = fixture([H.handAssembly, ...A.slice(0, 6).map(a => a.id)])
  const yields = deriveAdditionalTinkerYields(state, rates)
  const stats = deriveCanonicalTinkerStats(state, 4, yields)
  const started = startCanonicalTinker(state, createCanonicalTinkerRuntimeState(), stats, true)
  const result = advanceCanonicalTinker(started.state, started.runtime, stats, .4)
  expect(result.completions).toBe(2)
  expect(result.botsGranted).toBe(33)
  expect(result.assemblyLinesGranted).toBe(8)
  expect(result.state.dyson.facilities.assembly_lines).toEqual([107, 1])
  for (const { facilityId } of A.slice(0, 6)) expect(result.state.dyson.facilities[facilityId]).toEqual([103, 1])
  expect(state.dyson.facilities.servers).toEqual([99, 1])
})

test('ordinary held Tinker includes every additional reward in its batched path', () => {
  const { state } = fixture(A.slice(0, 6).map(a => a.id))
  const stats = deriveCanonicalTinkerStats(state, 4, deriveAdditionalTinkerYields(state, rates))
  const started = startCanonicalTinker(state, createCanonicalTinkerRuntimeState(), stats, true)
  const result = advanceCanonicalTinker(started.state, started.runtime, stats, .9)
  expect(result.completions).toBe(5)
  expect(result.botsGranted).toBe(0)
  expect(result.assemblyLinesGranted).toBe(20)
  expect(result.state.dyson.facilities.servers).toEqual([109, 1])
})

test('challenge restrictions suppress rewards in both facts and execution', () => {
  for (const active of ['built-by-hand', 'grounded'] as const) {
    const { state } = fixture([H.handAssembly, ...A.map(a => a.id)])
    const original = structuredClone(state.dyson.facilities)
    state.challenges.active = active
    const yields = deriveAdditionalTinkerYields(state, rates)
    const stats = deriveCanonicalTinkerStats(state, 4, yields)
    const started = startCanonicalTinker(state, createCanonicalTinkerRuntimeState(), stats, false)
    const result = advanceCanonicalTinker(started.state, started.runtime, stats, .2)
    for (const id of active === 'built-by-hand' ? DYSON_FACILITY_IDS : DYSON_FACILITY_IDS.slice(4)) {
      expect(result.state.dyson.facilities[id]).toEqual(original[id])
      expect(yields[id]).toBeUndefined()
    }
    expect(result.botsGranted).toBe(1)
  }
})

test('preset selection and save reload retain the chain and its rewards', () => {
  const { loaded, state } = fixture([])
  const selected = applyCanonicalSkillPresetLayout(state, A.slice(0, 6).map(a => a.id))
  expect(selected.accepted).toBe(true)
  const restored = hydrateGameState(dehydrateGameState(loaded, selected.state)).state
  expect(deriveAdditionalTinkerYields(restored, rates)).toEqual(deriveAdditionalTinkerYields(selected.state, rates))
  expect(deriveAdditionalTinkerYields(restored, rates).birch_planets).toBe(2)
})

test('Galactic Brain cap scales with funded Stellar Sacrifices, retaining the one-Brain floor', () => {
  const { state } = fixture()
  state.dyson.facilities.galactic_brains = [1_000_000, 0]
  state.dyson.bots = 100
  const source = { facilitiesPerSecond: 1000, botsPerSecond: 100 }
  expect(deriveAdditionalTinkerYields(state, rates).galactic_brains).toBe(1)
  expect(deriveAdditionalTinkerYields(state, rates, source).galactic_brains).toBe(20_000)
  state.dyson.facilities.galactic_brains = [10_000, 0]
  expect(deriveAdditionalTinkerYields(state, rates, source).galactic_brains).toBe(200)
  state.dyson.bots = .1
  expect(deriveAdditionalTinkerYields(state, rates, source).galactic_brains).toBeCloseTo(20)
  state.dyson.bots = 0
  expect(deriveAdditionalTinkerYields(state, rates, source).galactic_brains).toBe(1)
  expect(deriveAdditionalTinkerYields(state, rates, { ...source, botsPerSecond: 0 }).galactic_brains).toBe(200)
  state.dyson.facilities.galactic_brains = [0, 1]
  expect(deriveAdditionalTinkerYields(state, rates, source).galactic_brains).toBe(.02)
  state.dyson.facilities.galactic_brains = [0, 0]
  expect(deriveAdditionalTinkerYields(state, rates, source).galactic_brains).toBe(0)
})

test('Patient Hands stored Bot work does not multiply simultaneous facility rewards', () => {
  const { state } = fixture([...Object.values(H), ...A.map(a => a.id)])
  state.skills.byId[H.patientHands].timerSeconds = 42
  const stats = deriveCanonicalTinkerStats(state, 4, deriveAdditionalTinkerYields(state, rates))
  const started = startCanonicalTinker(state, createCanonicalTinkerRuntimeState(), stats, false)
  const result = advanceCanonicalTinker(started.state, started.runtime, stats, .2)
  expect(result.state.skills.byId[H.handAssembly].level).toBe(211)
  expect(result.assemblyLinesGranted).toBe(4)
  expect(result.state.dyson.facilities.ai_managers).toEqual([101, 1])
  expect(result.state.dyson.facilities.galactic_brains).toEqual([100, 1])
})
