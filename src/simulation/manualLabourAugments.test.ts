import { expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { EMPTY_INFINITY_CHALLENGES } from './infinityChallenges'
import { MANUAL_LABOUR_AUGMENTS as A } from './skillSubskills'
import { manualBotYield, advanceManualLabourIdle, completeManualLabour, MANUAL_LABOUR_TUNING as T } from './manualLabourAugments'
import { advanceCanonicalTinker, startCanonicalTinker, createCanonicalTinkerRuntimeState, deriveCanonicalTinkerStats, selectCanonicalTinkerUiFacts } from './canonicalTinker'
import { applyCanonicalQuantumReset } from './quantumTransitions'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import { purchaseCanonicalSkill, refundCanonicalSkill } from './canonicalSkillTransactions'
import { advanceCanonicalGoalProgression } from './canonicalGoalProgression'

const session = () => hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: '2026-09-26T00:00:00Z' }))
function fixture(ids: readonly string[] = Object.values(A)) {
  const state = session().state
  return { ...state, meta: { ...state.meta, firstInfinityComplete: true }, challenges: { ...EMPTY_INFINITY_CHALLENGES, unlocked: true, blankSlateCompleted: true, galvanizedSkillIds: ['manualLabour'] }, dyson: { ...state.dyson, bots: 100, manualCreationIntervalSeconds: 0.2 }, skills: { ...state.skills, byId: { ...state.skills.byId, ...Object.fromEntries(['manualLabour', ...ids].map(id => [id, { owned: true, level: 0, timerSeconds: 0, secondaryTimerSeconds: 0 }])) } } }
}
function click(state: ReturnType<typeof fixture>, repeat = false, seconds = .2, multiplier: 1 | 2 = 1) {
  const stats = deriveCanonicalTinkerStats(state, 500)
  const start = startCanonicalTinker(state, createCanonicalTinkerRuntimeState(), stats, repeat)
  return advanceCanonicalTinker(start.state, start.runtime, stats, seconds, multiplier)
}

test('Hand Assembly grows with completed work, not Bot balance, and cannot accelerate through repeated starts', () => {
  const state = fixture([A.handAssembly]); state.dyson.facilities.ai_managers = [0, 10]
  expect(selectCanonicalTinkerUiFacts(state, createCanonicalTinkerRuntimeState(), 500).presentationMode).toBe('hand-assembly')
  expect(manualBotYield({ ...state, dyson: { ...state.dyson, bots: 1e200 } })).toBe(1)
  expect(click(state, false, .1).completions).toBe(0)
  const result = click(state)
  expect(result.botsGranted).toBe(1)
  expect(result.assemblyLinesGranted).toBe(0)
  expect(manualBotYield(result.state)).toBe(32)
  expect(result.state.dyson.facilities.assembly_lines).toEqual(state.dyson.facilities.assembly_lines)
})

test('work and practice survive refund/reload and reset on Infinity', () => {
  const first = click(fixture([A.handAssembly, A.practice]))
  expect(first.state.skills.byId[A.practice].level).toBe(1)
  expect(manualBotYield(first.state)).toBeCloseTo(32 * (1 + 2 / 501))
  const refunded = refundCanonicalSkill(first.state, A.handAssembly)
  if (!refunded.accepted) throw Error(refunded.reason)
  const assigned = purchaseCanonicalSkill(refunded.state, A.handAssembly)
  if (!assigned.accepted) throw Error(assigned.reason)
  const loaded = hydrateGameState(dehydrateGameState(session(), assigned.state)).state
  expect(loaded.skills.byId[A.handAssembly].level).toBe(1)
  expect(loaded.skills.byId[A.practice].level).toBe(1)
  const reset = applyCanonicalInfinityReset(loaded, { requestedReward: 1n, breakInfinity: false, artifactSkillPoints: 0n })
  expect(reset.ok && reset.state.skills.byId[A.handAssembly].level).toBe(0)
  expect(reset.ok && reset.state.skills.byId[A.practice].level).toBe(0)
  const quantum = applyCanonicalQuantumReset(loaded, 0n)
  expect(quantum.ok && (quantum.state.skills.byId[A.handAssembly]?.level ?? 0)).toBe(0)
  expect(quantum.ok && (quantum.state.skills.byId[A.practice]?.level ?? 0)).toBe(0)
})

test('Patient Hands completes up to 42 seconds of real work and practice, rewarding stored Bots once', () => {
  const source = fixture()
  let ordinary = source
  let earned = 0
  for (let i = 0; i < 210; i++) {
    earned += manualBotYield(ordinary, 0)
    ordinary = completeManualLabour(ordinary) as typeof source
  }
  const expected = earned * 1.25 + manualBotYield(ordinary, 0)
  const state = advanceManualLabourIdle(source, 10000)
  expect(state.skills.byId[A.patientHands].timerSeconds).toBe(42)
  expect(manualBotYield(state)).toBeCloseTo(expected, -1)
  const stats = deriveCanonicalTinkerStats(state, 0)
  const start = startCanonicalTinker(state, createCanonicalTinkerRuntimeState(), stats, true)
  const again = startCanonicalTinker(start.state, start.runtime, stats, true)
  expect(again.state.skills.byId[A.patientHands].secondaryTimerSeconds).toBe(42)
  const first = advanceCanonicalTinker(again.state, again.runtime, stats, .2)
  expect(first.botsGranted).toBeCloseTo(expected, -1)
  expect(first.state.skills.byId[A.handAssembly].level).toBe(211)
  expect(first.state.skills.byId[A.practice].level).toBe(211)
  const second = advanceCanonicalTinker(first.state, first.runtime, stats, .2)
  expect(second.state.skills.byId[A.handAssembly].level).toBe(212)
  expect(second.botsGranted).toBeCloseTo(manualBotYield(first.state, 0), -1)
  expect(second.state.skills.byId[A.patientHands].secondaryTimerSeconds).toBe(0)
  const loaded = hydrateGameState(dehydrateGameState(session(), second.state)).state
  expect(manualBotYield(loaded)).toBe(manualBotYield(second.state))
})

test('Working Smarter is logarithmic, bounded and ignores disabled or retired research', () => {
  const state = fixture([A.handAssembly, A.workingSmarter]); state.research.levelsById = { 'research.assembly_line_upgrade': 99 }
  expect(manualBotYield(state)).toBe(1.5)
  expect(manualBotYield({ ...state, challenges: { ...state.challenges, active: 'no-science' } })).toBe(1)
  expect(manualBotYield({ ...state, discovery: { unlocked: true, completions: 9n, progress: 0, startingPower: 0n, speedUpgrades: 0n } })).toBe(1.25)
  state.research.levelsById['research.assembly_line_upgrade'] = 1e100
  expect(manualBotYield(state)).toBe(3)
})

test('Built by Hand bootstraps from its first point and reaches Infinity without facilities', () => {
  const state = fixture([]); state.dyson.bots = 10; state.challenges = { ...state.challenges, active: 'built-by-hand' } as typeof state.challenges
  const goal = advanceCanonicalGoalProgression(state, () => ({ panelsPerSecond: 0, panelLifetimeSeconds: 10 }))
  if (!goal.ok) throw Error(goal.detail)
  expect(goal.state.skills.points).toBe(1n)
  const purchase = purchaseCanonicalSkill(goal.state, A.handAssembly)
  if (!purchase.accepted) throw Error(purchase.reason)
  const result = click(purchase.state as ReturnType<typeof fixture>, true, 600)
  expect(result.state.dyson.bots).toBe(4.2e19)
  expect(Object.values(result.state.dyson.facilities).every(pair => pair[0] + pair[1] === 0)).toBe(true)
})

test('the full build is bounded even with extreme legacy practice/research and paid boosts', () => {
  const state = fixture()
  state.dyson.bots = 1e230
  state.quantum.unlocks.breakTheLoop = true
  state.skills.byId[A.handAssembly].level = Number.MAX_SAFE_INTEGER
  state.skills.byId[A.practice].level = Number.MAX_SAFE_INTEGER
  state.research.levelsById = { 'research.assembly_line_upgrade': 1e100 }
  expect(manualBotYield(state)).toBeLessThanOrEqual(T.maximumBaseYield * 5)
  const charged = advanceManualLabourIdle(state, 10000)
  expect(manualBotYield(charged)).toBeLessThanOrEqual(T.maximumBaseYield * 5 * (210 * 1.25 + 1))
  const ordinary = fixture([A.handAssembly])
  expect(click(ordinary, false, .2, 2).botsGranted).toBe(2)
})
