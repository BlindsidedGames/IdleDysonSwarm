import { expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { EMPTY_INFINITY_CHALLENGES } from './infinityChallenges'
import { MANUAL_LABOUR_AUGMENTS as A } from './skillSubskills'
import { manualBotYield, advanceManualLabourIdle } from './manualLabourAugments'
import { advanceCanonicalTinker, startCanonicalTinker, createCanonicalTinkerRuntimeState, deriveCanonicalTinkerStats, selectCanonicalTinkerUiFacts } from './canonicalTinker'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import { purchaseCanonicalSkill, refundCanonicalSkill } from './canonicalSkillTransactions'
import { advanceCanonicalGoalProgression } from './canonicalGoalProgression'

const session = () => hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: '2026-09-26T00:00:00Z' }))
function fixture(ids: readonly string[] = Object.values(A)) {
  const state = session().state
  return { ...state, meta: { ...state.meta, firstInfinityComplete: true }, challenges: { ...EMPTY_INFINITY_CHALLENGES, unlocked: true, blankSlateCompleted: true, galvanizedSkillIds: ['manualLabour'] }, dyson: { ...state.dyson, bots: 100, manualCreationIntervalSeconds: 0.2 }, skills: { ...state.skills, byId: { ...state.skills.byId, ...Object.fromEntries(['manualLabour', ...ids].map(id => [id, { owned: true, level: 0, timerSeconds: 0, secondaryTimerSeconds: 0 }])) } } }
}
function click(state: ReturnType<typeof fixture>, repeat = false, seconds = .1) {
  const stats = deriveCanonicalTinkerStats(state, 500)
  const start = startCanonicalTinker(state, createCanonicalTinkerRuntimeState(), stats, repeat)
  return advanceCanonicalTinker(start.state, start.runtime, stats, seconds)
}

test('Hand Assembly replaces Assembly Line creation and is independent of managers', () => {
  const state = fixture([A.handAssembly]); state.dyson.facilities.ai_managers = [0, 10]
  expect(selectCanonicalTinkerUiFacts(state, createCanonicalTinkerRuntimeState(), 500).presentationMode).toBe('hand-assembly')
  const result = click(state)
  expect(result.botsGranted).toBe(5)
  expect(result.assemblyLinesGranted).toBe(0)
  expect(result.state.dyson.facilities.assembly_lines).toEqual(state.dyson.facilities.assembly_lines)
})

test('practice increases per completion, survives refund/reload, and resets on Infinity', () => {
  const first = click(fixture([A.handAssembly, A.practice]))
  expect(first.state.skills.byId[A.practice].level).toBe(1)
  expect(manualBotYield(first.state)).toBeCloseTo(105 * .05 * 1.01)
  const refunded = refundCanonicalSkill(first.state, A.practice)
  if (!refunded.accepted) throw Error(refunded.reason)
  const assigned = purchaseCanonicalSkill(refunded.state, A.practice)
  if (!assigned.accepted) throw Error(assigned.reason)
  const loaded = hydrateGameState(dehydrateGameState(session(), assigned.state)).state
  expect(loaded.skills.byId[A.practice].level).toBe(1)
  const reset = applyCanonicalInfinityReset(loaded, { requestedReward: 1n, breakInfinity: false, artifactSkillPoints: 0n })
  expect(reset.ok && reset.state.skills.byId[A.practice].level).toBe(0)
})

test('Patient Hands caps at eleven times, is consumed once, and duplicate starts do not replace the captured bonus', () => {
  const state = advanceManualLabourIdle(fixture([A.handAssembly, A.patientHands]), 10000)
  expect(manualBotYield(state)).toBe(55)
  const stats = deriveCanonicalTinkerStats(state, 0)
  const start = startCanonicalTinker(state, createCanonicalTinkerRuntimeState(), stats, true)
  expect(start.state.skills.byId[A.patientHands].timerSeconds).toBe(0)
  expect(start.state.skills.byId[A.patientHands].secondaryTimerSeconds).toBe(600)
  const again = startCanonicalTinker(start.state, start.runtime, stats, true)
  expect(again.state.skills.byId[A.patientHands].secondaryTimerSeconds).toBe(600)
  const result = advanceCanonicalTinker(again.state, again.runtime, stats, .3)
  expect(result.completions).toBe(2)
  expect(result.state.dyson.bots).toBeCloseTo(155 * 1.05)
  expect(result.state.skills.byId[A.patientHands].secondaryTimerSeconds).toBe(0)
  const loaded = hydrateGameState(dehydrateGameState(session(), result.state)).state
  expect(manualBotYield(loaded)).toBeCloseTo(loaded.dyson.bots * .05)
})

test('Working Smarter uses live Assembly Line research, suppresses retired/disabled research, and uses Discovery completions after unlock', () => {
  const state = fixture([A.handAssembly, A.workingSmarter]); state.research.levelsById = { 'research.assembly_line_upgrade': 10 }
  expect(manualBotYield(state)).toBe(10)
  expect(manualBotYield({ ...state, challenges: { ...state.challenges, active: 'no-science' } })).toBe(5)
  expect(manualBotYield({ ...state, discovery: { unlocked: true, completions: 5n, progress: 0, startingPower: 0n, speedUpgrades: 0n } })).toBe(7.5)
})

test('Built by Hand bootstraps from the first goal point and can reach ordinary Infinity without facilities, research or Division', () => {
  const state = fixture([]); state.dyson.bots = 10; state.challenges = { ...state.challenges, active: 'built-by-hand' } as typeof state.challenges
  const goal = advanceCanonicalGoalProgression(state, () => ({ panelsPerSecond: 0, panelLifetimeSeconds: 10 }))
  if (!goal.ok) throw Error(goal.detail)
  expect(goal.state.skills.points).toBe(1n)
  const purchase = purchaseCanonicalSkill(goal.state, A.handAssembly)
  if (!purchase.accepted) throw Error(purchase.reason)
  const result = click(purchase.state as ReturnType<typeof fixture>, true, 200)
  expect(result.state.dyson.bots).toBe(4.2e19)
  expect(Object.values(result.state.dyson.facilities).every(pair => pair[0] + pair[1] === 0)).toBe(true)
})

test('high counts stay finite and paid Bot boost doubles manual output', () => {
  const state = fixture(); state.dyson.bots = 1e300; state.skills.byId[A.practice].level = Number.MAX_SAFE_INTEGER
  expect(Number.isFinite(manualBotYield(state))).toBe(true)
  state.quantum.unlocks.breakTheLoop = true
  const saturatedStats = deriveCanonicalTinkerStats(state, 0)
  const saturatedStart = startCanonicalTinker(state, createCanonicalTinkerRuntimeState(), saturatedStats, false)
  const saturated = advanceCanonicalTinker(saturatedStart.state, saturatedStart.runtime, saturatedStats, .1, 2)
  expect(Number.isFinite(saturated.botsGranted)).toBe(true)
  expect(saturated.botsGranted).toBe(0)
  expect(saturated.state.dyson.bots).toBe(4e242)
  const ordinary = fixture([A.handAssembly]); const stats = deriveCanonicalTinkerStats(ordinary, 0)
  const start = startCanonicalTinker(ordinary, createCanonicalTinkerRuntimeState(), stats, false)
  expect(advanceCanonicalTinker(start.state, start.runtime, stats, .1, 2).botsGranted).toBe(10)
})
