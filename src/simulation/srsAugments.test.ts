import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { PreparedSave, prepareIdb1Save } from '../save/prepare'
import { serializeWebSave, deserializeWebSave } from '../save/serialization'
import { validateCanonicalGameState } from '../game-state/validate'
import { purchaseCanonicalSkill, refundCanonicalSkill, runCanonicalSkillAutoAssignment, applyCanonicalSkillPresetLayout } from './canonicalSkillTransactions'
import { previewAddSkillToPreset } from './canonicalSkillPresetTransactions'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import { applyCanonicalQuantumReset } from './quantumTransitions'
import { applyCanonicalSkillIntervalEffects } from './canonicalSkillIntervalEffects'
import { purchaseCanonicalResearch, runResearchAutomationTick } from './researchAutomation'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import { DETERMINISTIC_DYSON_TUNING, DETERMINISTIC_DYSON_SNAPSHOT } from '../../scripts/support/deterministicMatureDysonFixture'
import { SRS_AUGMENTS as A } from './skillSubskills'
import { advanceSrsAugments, refreshSrsResearchActivity, stellarMemoryMultiplier, srsAfterglowRetention } from './srsAugments'

const hydrated = hydrateGameState(prepareIdb1Save(readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')).prepared)
function state() {
  const s = hydrated.state
  return { ...s,
    challenges: { ...s.challenges, unlocked: true, active: null, blankSlateCompleted: true, galvanizers: 0n, hasEarnedGalvanizer: true, galvanizedSkillIds: ['superRadiantScattering'] },
    infinity: { ...s.infinity, permanentSkillPoints: 5n },
    skills: { ...s.skills, points: 20n, byId: { superRadiantScattering: { owned: true, level: 1, timerSeconds: 0, secondaryTimerSeconds: 0 } }, activeAutoAssignment: [] },
  }
}
type State = ReturnType<typeof state> | typeof hydrated.state
function buy(s: State, id: string) {
  const r = purchaseCanonicalSkill(s, id)
  if (!r.accepted) throw new Error(r.reason)
  return r.state
}
function advance(s: State, seconds: number) {
  return { ...s, skills: advanceSrsAugments(s, seconds) }
}

test('both Activity prerequisites, parent unlock, and dependent refunds use existing transactions', () => {
  const s = state()
  expect(purchaseCanonicalSkill({ ...s, challenges: { ...s.challenges, galvanizedSkillIds: [] } }, A.hotStart).accepted).toBe(false)
  const next = buy(s, A.researchActivity)
  expect(next.skills.points).toBe(14n)
  for (const id of [A.deepExposure, A.focusedBeam, A.researchActivity]) expect(next.skills.byId[id].owned).toBe(true)
  const refund = refundCanonicalSkill(next, A.deepExposure)
  expect(refund.accepted).toBe(true)
  if (!refund.accepted) return
  expect(refund.state.skills.byId[A.researchActivity].owned).toBe(false)
  expect(refund.state.skills.byId[A.focusedBeam].owned).toBe(true)
  expect(refund.state.skills.points).toBe(19n)
  const preset = previewAddSkillToPreset(s, 1, A.researchActivity)
  expect(preset.accepted).toBe(true)
  expect(preset.nextSkillIds).toEqual(expect.arrayContaining([A.deepExposure, A.focusedBeam, A.researchActivity]))
})

test('Hot Start is non-refundable, Infinity reassigns, Quantum clears carryover', () => {
  let s = buy(state(), A.afterglow)
  expect(s.skills.points).toBe(16n)
  expect(s.skills.byId.superRadiantScattering.timerSeconds).toBe(1800)
  const refund = refundCanonicalSkill(s, A.hotStart)
  expect(refund.accepted).toBe(false)
  expect(s.skills.byId.superRadiantScattering.timerSeconds).toBe(1800)
  s = advance(s, 100_000)
  const reset = applyCanonicalInfinityReset(s, { breakInfinity: false, requestedReward: 0n, artifactSkillPoints: 0n })
  if (!reset.ok) throw new Error(JSON.stringify(reset.issues))
  expect(reset.state.skills.byId.superRadiantScattering.timerSeconds).toBe(11_980)
  const quantum = applyCanonicalQuantumReset(s, 20n)
  if (!quantum.ok) throw new Error(JSON.stringify(quantum.issues))
  expect(quantum.state.skills.byId.superRadiantScattering.timerSeconds).toBe(1800)
})

test('charging integrates the ramp, activity expiry and additive bonuses across interval boundaries', () => {
  let s = buy(buy(state(), A.researchActivity), A.researchConversion)
  s = { ...s, skills: refreshSrsResearchActivity(s) }
  const whole = advance(s, 1200)
  let split = s
  for (let i = 0; i < 1200; i++) split = advance(split, 1)
  expect(whole.skills.byId.superRadiantScattering.timerSeconds).toBeCloseTo(split.skills.byId.superRadiantScattering.timerSeconds)
  expect(whole.skills.byId.superRadiantScattering.timerSeconds).toBeCloseTo(3645)
  const active = { ...whole, skills: refreshSrsResearchActivity(whole) }
  expect(advance(active, 10).skills.byId.superRadiantScattering.timerSeconds - 3645).toBeCloseTo(55)
  expect(advance(active, 40).skills.byId[A.researchActivity].timerSeconds).toBe(0)
})

test('generated levels refresh once, fractional generation does not; paid research also activates', () => {
  const s = buy(state(), A.researchActivity)
  const inputs = { seconds: 1, botProductionPerSecond: 0, stellarPlanetsPerSecond: 0, stellarBotsPerSecond: 0, scienceBoostPerSecond: 1_000_000, moneyUpgradePerSecond: 0 }
  const next = applyCanonicalSkillIntervalEffects(s, s, inputs)
  expect(next.skills.byId[A.researchActivity].timerSeconds).toBe(30)
  expect(next.skills.byId.superRadiantScattering.timerSeconds).toBeCloseTo(1 + 1 / 1200 + 1.5 * (1 - 1 / 1_000_000))
  const empty = { ...s, research: { ...s.research, levelsById: {}, progressById: {} } }
  expect(applyCanonicalSkillIntervalEffects(empty, empty, { ...inputs, scienceBoostPerSecond: 0.1 }).skills.byId[A.researchActivity].timerSeconds).toBe(0)
  const funded = { ...empty, dyson: { ...empty.dyson, science: 1e100 }, infinity: { ...empty.infinity, automationUnlocked: { ...empty.infinity.automationUnlocked, research: true } } }
  const purchase = purchaseCanonicalResearch(funded, DETERMINISTIC_DYSON_TUNING, 'research.science_boost')
  expect(purchase.accepted && purchase.state.skills.byId[A.researchActivity].timerSeconds).toBe(30)
  const automatic = runResearchAutomationTick(funded, DETERMINISTIC_DYSON_TUNING)
  expect(automatic.purchases.length).toBeGreaterThan(0)
  expect(automatic.state.skills.byId[A.researchActivity].timerSeconds).toBe(30)
})

test('Focused Beam adjusts only the SRS bonus and Conversion halves final Science; equal allocation is neutral', () => {
  const base = state()
  let s = buy(base, A.researchConversion)
  s = { ...s, dyson: { ...s.dyson, workers: 100, researchers: 50 }, skills: { ...s.skills, byId: { ...s.skills.byId, superRadiantScattering: { ...s.skills.byId.superRadiantScattering, timerSeconds: 500 } } } }
  const derive = (source: State) => {
    const r = deriveBasicDysonState(source, DETERMINISTIC_DYSON_TUNING, { permanentDoubleIp: false }, DETERMINISTIC_DYSON_SNAPSHOT)
    if (!r.ok) throw new Error(JSON.stringify(r.issues))
    return r.value.productionArrivalRates
  }
  const plain = { ...s, skills: { ...s.skills, byId: { superRadiantScattering: s.skills.byId.superRadiantScattering } } }
  const normal = derive(plain), boosted = derive(s)
  expect(boosted.money / normal.money).toBeCloseTo(8.5 / 6)
  expect(boosted.science / normal.science).toBeCloseTo(3.5 / 6 * 0.5)
  const memory = buy(withBank(s, 100_000), A.stellarMemory)
  expect(derive(memory).money / normal.money).toBeCloseTo((1 + 5 * 2.125) / 6)
  expect(derive(memory).science / normal.science).toBeCloseTo(3.5 / 6 * 0.5)
  const equal = { ...s, dyson: { ...s.dyson, researchers: 100 } }
  const equalPlain = { ...plain, dyson: equal.dyson }
  expect(derive(equal).money / derive(equalPlain).money).toBeCloseTo(1)
  expect(derive(equal).science / derive(equalPlain).science).toBeCloseTo(0.5)
})

test('augment ownership, charge and timers survive save/reload', () => {
  let s = buy(buy(state(), A.afterglow), A.researchActivity)
  s = advance({ ...s, skills: refreshSrsResearchActivity(s) }, 12)
  const loaded = hydrateGameState(PreparedSave.fromDecoded(deserializeWebSave(
    serializeWebSave(dehydrateGameState(hydrated, s).copyValidatedState()),
  ))).state
  for (const id of ['superRadiantScattering', ...Object.values(A)]) expect(loaded.skills.byId[id]).toEqual(s.skills.byId[id])
  expect(validateCanonicalGameState(loaded)).toEqual({ valid: true, errors: [] })
})

function withBank(s: State, bank: number): State {
  return { ...s, skills: { ...s.skills, byId: { ...s.skills.byId,
    superRadiantScattering: { ...s.skills.byId.superRadiantScattering, secondaryTimerSeconds: bank },
  } } }
}

test.each([[0, 1], [100_000, 2.25], [1e6, 2.5], [1e7, 2.75], [1e9, 3.25]])(
  'Stellar Memory scales all charge bonuses from bank %s', (bank, multiplier) => {
    let s = buy(withBank(state(), bank), A.stellarMemory)
    expect(s.skills.points).toBe(8n)
    expect(stellarMemoryMultiplier(s)).toBe(multiplier)
    s = advance(s, 1200)
    s = { ...s, skills: refreshSrsResearchActivity(s) }
    const next = advance(s, 10)
    expect(next.skills.byId.superRadiantScattering.timerSeconds - s.skills.byId.superRadiantScattering.timerSeconds)
      .toBeCloseTo(10 * (1 + 4.5 * multiplier))
    expect(next.skills.byId.superRadiantScattering.secondaryTimerSeconds).toBe(bank)
  },
)

test('existing lifetime bank is preserved; resets bank full charge once, restarts do not', () => {
  let s = buy(withBank(state(), 100_000), A.stellarMemory)
  s = advance(buy(s, A.afterglow), 100)
  const charge = s.skills.byId.superRadiantScattering.timerSeconds
  const request = { breakInfinity: false, requestedReward: 0n, artifactSkillPoints: 30n }
  const infinity = applyCanonicalInfinityReset(s, request)
  const quantum = applyCanonicalQuantumReset(s, 30n)
  const restart = applyCanonicalInfinityReset(s, { ...request, restartOnly: true })
  for (const result of [infinity, quantum, restart]) expect(result.ok).toBe(true)
  expect(infinity.state.skills.byId.superRadiantScattering.secondaryTimerSeconds).toBe(100_000 + charge)
  expect(quantum.state.skills.byId.superRadiantScattering.secondaryTimerSeconds).toBe(100_000 + charge)
  expect(restart.state.skills.byId.superRadiantScattering.secondaryTimerSeconds).toBe(100_000)
  const hotGrant = 1800 * stellarMemoryMultiplier(infinity.state)
  expect(infinity.state.skills.byId.superRadiantScattering.timerSeconds).toBeCloseTo(charge * 0.225 + hotGrant)
  expect(quantum.state.skills.byId.superRadiantScattering.timerSeconds).toBeCloseTo(1800 * stellarMemoryMultiplier(quantum.state))
  const unassigned = refundCanonicalSkill(s, A.stellarMemory)
  expect(unassigned.accepted).toBe(true)
  expect(stellarMemoryMultiplier(unassigned.state)).toBe(1)
  expect(applyCanonicalInfinityReset(unassigned.state, request).state.skills.byId.superRadiantScattering.secondaryTimerSeconds).toBe(100_000)
})

test('Hot Start tops up regardless of assignment order without repeat grants, including legacy markers', () => {
  const base = withBank(state(), 100_000)
  const hotFirst = buy(buy(base, A.hotStart), A.stellarMemory)
  const memoryFirst = buy(buy(base, A.stellarMemory), A.hotStart)
  for (const s of [hotFirst, memoryFirst]) {
    expect(s.skills.byId.superRadiantScattering.timerSeconds).toBe(4050)
    const refund = refundCanonicalSkill(s, A.stellarMemory)
    expect(refund.accepted).toBe(true)
    expect(buy(refund.state, A.stellarMemory).skills.byId.superRadiantScattering.timerSeconds).toBe(4050)
  }
  const legacy = buy(base, A.hotStart)
  const loaded = hydrateGameState(PreparedSave.fromDecoded(deserializeWebSave(
    serializeWebSave(dehydrateGameState(hydrated, legacy).copyValidatedState()),
  ))).state
  expect(buy(loaded, A.stellarMemory).skills.byId.superRadiantScattering.timerSeconds).toBe(4050)
})

test('Afterglow caps retention at 50 percent and Banking can be refunded', () => {
  const s = buy(buy(withBank(state(), 1e30), A.stellarMemory), A.afterglow)
  expect(srsAfterglowRetention(s)).toBe(0.5)
  expect(refundCanonicalSkill(buy(state(), 'banking'), 'banking').accepted).toBe(true)
})

test('Banking reassigns after Infinity with non-refundable auto-assignment disabled', () => {
  const assigned = buy(state(), 'banking')
  const before = { ...assigned, skills: { ...assigned.skills, autoAssignNonRefundable: false } }
  const reset = applyCanonicalInfinityReset(before, {
    breakInfinity: false, requestedReward: 0n, artifactSkillPoints: 30n,
  })
  expect(reset.ok).toBe(true)
  expect(reset.state.skills.byId.banking?.owned).toBe(true)
  expect(refundCanonicalSkill(reset.state, 'banking').accepted).toBe(true)
})

test('auto-assignment and presets grant Hot Start once per Infinity', () => {
  const initial = state()
  for (const assign of [
    (s: State) => runCanonicalSkillAutoAssignment({ ...s, skills: { ...s.skills, activeAutoAssignment: [A.hotStart] } }),
    (s: State) => applyCanonicalSkillPresetLayout(s, [A.hotStart]),
  ]) {
    const first = assign(initial)
    expect(first.accepted).toBe(true)
    expect(first.state.skills.byId.superRadiantScattering.timerSeconds).toBe(1800)
    const refund = refundCanonicalSkill(first.state, A.hotStart)
    expect(refund.accepted).toBe(false)
    const again = assign(first.state)
    expect(again.state.skills.byId.superRadiantScattering.timerSeconds).toBe(1800)
    const reset = applyCanonicalInfinityReset(again.state, { breakInfinity: false, requestedReward: 0n, artifactSkillPoints: 20n })
    expect(reset.ok).toBe(true)
    expect(reset.state.skills.byId.superRadiantScattering.timerSeconds).toBe(1800)
  }
})

test.each([
  [1, 0, 0, 0, 0],
  [1 / 60, 0, 0.25, 0, 10],
  [1 / 60, 1 / 80, 0.25, 0.5, 20],
  [1, 1 / 80, 0.25, 0.5, 0],
  [0, 0, 0, 0, 20],
])('generated research coverage matches split steps (%s, %s)', (science, money, scienceProgress, moneyProgress, timer) => {
  let initial = buy(state(), A.researchActivity)
  initial = { ...initial, research: { ...initial.research, levelsById: {}, progressById: {
    'research.science_boost': scienceProgress, 'research.money_multiplier': moneyProgress,
  } }, skills: { ...initial.skills, byId: { ...initial.skills.byId,
    [A.researchActivity]: { ...initial.skills.byId[A.researchActivity], timerSeconds: timer },
  } } }
  const step = (s: State, seconds: number) => applyCanonicalSkillIntervalEffects(s, s, {
    seconds, botProductionPerSecond: 0, stellarPlanetsPerSecond: 0, stellarBotsPerSecond: 0,
    scienceBoostPerSecond: science, moneyUpgradePerSecond: money,
  })
  const whole = step(initial, 361)
  let split: State = initial
  for (let i = 0; i < 361; i++) split = step(split, 1)
  expect(whole.skills.byId.superRadiantScattering.timerSeconds).toBeCloseTo(split.skills.byId.superRadiantScattering.timerSeconds, 7)
  expect(whole.skills.byId[A.researchActivity].timerSeconds).toBeCloseTo(split.skills.byId[A.researchActivity].timerSeconds, 7)
})

test('generated levels stop refreshing Activity at the research cap', () => {
  let s = buy(state(), A.researchActivity)
  s = { ...s, research: { ...s.research, levelsById: { 'research.science_boost': Number.MAX_SAFE_INTEGER - 1 }, progressById: {} } }
  const next = applyCanonicalSkillIntervalEffects(s, s, { seconds: 100, botProductionPerSecond: 0,
    stellarPlanetsPerSecond: 0, stellarBotsPerSecond: 0, scienceBoostPerSecond: 1, moneyUpgradePerSecond: 0 })
  expect(next.skills.byId[A.researchActivity].timerSeconds).toBe(0)
  expect(next.skills.byId.superRadiantScattering.timerSeconds).toBeCloseTo(100 + 100 * 100 / 1200 + 45)
})


test('boosted charging integrates identically for Stored Time-sized and split intervals', () => {
  let s = buy(withBank(state(), 100_000), A.stellarMemory)
  s = { ...s, skills: refreshSrsResearchActivity(s) }
  const whole = advance(s, 3600)
  let split = s
  for (let i = 0; i < 3600; i++) split = advance(split, 1)
  expect(whole.skills.byId.superRadiantScattering.timerSeconds).toBeCloseTo(split.skills.byId.superRadiantScattering.timerSeconds, 6)
  expect(whole.skills.byId.superRadiantScattering.secondaryTimerSeconds).toBe(100_000)
})
