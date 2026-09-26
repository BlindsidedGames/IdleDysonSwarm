import { purchaseCanonicalInfinityShopItem } from './canonicalInfinityShop'
import { deriveDiscoveryEffects } from './discoveryEffects'
import { selectStableFrontendSkillPreview } from '../application/frontendSnapshot'
import { expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { EMPTY_INFINITY_CHALLENGES, QUANTUM_CHALLENGE_IDS, effectiveDivisions, quantumDoubleIpEnabled, challengeCompleted, validateInfinityChallenges } from './infinityChallenges'
import { restartInfinityChallenge } from './canonicalInfinityChallengeRestart'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import { applyCanonicalQuantumReset } from './quantumTransitions'
import { previewCanonicalFacilityPurchase, runCanonicalDysonAutomation } from './canonicalDysonCommands'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import { DETERMINISTIC_DYSON_SNAPSHOT, DETERMINISTIC_DYSON_TUNING, createDeterministicMatureDysonFixture } from '../../scripts/support/deterministicMatureDysonFixture'
import { applyDysonProductionArrivals } from './dysonProductionArrivals'
import { applyCanonicalSkillIntervalEffects } from './canonicalSkillIntervalEffects'
import { applyCanonicalSkillPresetLayout, refundCanonicalSkill, purchaseCanonicalSkill, resetCanonicalSkills } from './canonicalSkillTransactions'
import { createBasicDysonInfinityState, infinityPointsForBots } from './infinityCycle'
import { DYSON_FACILITY_IDS } from '../game-state/facilityIds'

const session = () => hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: '2026-09-26T00:00:00Z' }))
function seed(): CanonicalGameStateV1 {
  const state = session().state
  return { ...state, meta: { ...state.meta, firstQuantumComplete: true, firstInfinityComplete: true }, challenges: { ...EMPTY_INFINITY_CHALLENGES, unlocked: true, blankSlateCompleted: true, galvanizedSkillIds: ['manualLabour'] }, skills: { ...state.skills, byId: { ...state.skills.byId, manualLabour: { owned: true, level: 1, timerSeconds: 0, secondaryTimerSeconds: 0 } } }, quantum: { ...state.quantum, divisionsPurchased: 19n, unlocks: { ...state.quantum.unlocks, doubleInfinityPoints: true, quantumEntanglement: true } } }
}

test.each(QUANTUM_CHALLENGE_IDS)('%s restarts, persists through Infinity/reload, awards two Catalysts once, and restores Quantum effects', id => {
  const enter = restartInfinityChallenge(seed(), 'enter', 0n, id)
  if (!enter.ok) throw Error(enter.code)
  expect(effectiveDivisions(enter.state)).toBe(0n)
  expect(quantumDoubleIpEnabled(enter.state)).toBe(false)
  expect(enter.state.quantum.divisionsPurchased).toBe(19n)
  expect(enter.state.quantum.unlocks.doubleInfinityPoints).toBe(true)
  const infinity = applyCanonicalInfinityReset(enter.state, { breakInfinity: false, requestedReward: 1n, artifactSkillPoints: 0n })
  if (!infinity.ok) throw Error(JSON.stringify(infinity.issues))
  const loaded = hydrateGameState(dehydrateGameState(session(), infinity.state)).state
  expect(loaded.challenges?.active).toBe(id)
  expect(loaded.dyson.facilities.assembly_lines[0]).toBe(id === 'built-by-hand' ? 0 : 1)
  const finish = applyCanonicalQuantumReset(loaded, 0n)
  if (!finish.ok) throw Error('reset failed')
  expect(finish.state.challenges?.galvanizers).toBe(2n)
  expect(challengeCompleted(finish.state.challenges!, id)).toBe(true)
  expect(validateInfinityChallenges(finish.state.challenges)).toBeNull()
  const roundTrip = hydrateGameState(dehydrateGameState(session(), finish.state)).state
  expect(challengeCompleted(roundTrip.challenges!, id)).toBe(true)
  expect(effectiveDivisions(roundTrip)).toBe(19n)
  expect(quantumDoubleIpEnabled(roundTrip)).toBe(true)
  expect(roundTrip.dyson.facilities.assembly_lines[0]).toBe(1)
  const replay = restartInfinityChallenge(roundTrip, 'enter', 0n, id)
  if (!replay.ok) throw Error(replay.code)
  const second = applyCanonicalQuantumReset(replay.state, 0n)
  expect(second.ok && second.state.challenges?.galvanizers).toBe(2n)
  const abandon = restartInfinityChallenge(replay.state, 'abandon', 0n)
  expect(abandon.ok && abandon.state.challenges?.active).toBeNull()
})

test('paid Double IP remains effective while the Quantum bonus is suppressed', () => {
  const state = seed(); state.challenges = { ...state.challenges!, active: 'no-science' }
  const infinity = createBasicDysonInfinityState({ divisionsPurchased: effectiveDivisions(state), quantumDoubleIp: quantumDoubleIpEnabled(state), permanentDoubleIp: true })
  expect(infinityPointsForBots(4.2e19, infinity)).toBe(2n)
})

test.each(['built-by-hand', 'grounded'] as const)('%s suppresses purchased, retained, generated and production paths', id => {
  const state = createDeterministicMatureDysonFixture({ ownedSkillIds: ['scientificPlanets', 'pocketDimensions', 'stellarSacrifices', 'androids', 'manualLabour'] })
  state.challenges = { ...EMPTY_INFINITY_CHALLENGES, unlocked: true, active: id }
  state.dyson.money = 1e100
  const forbidden = DYSON_FACILITY_IDS.filter(f => id === 'built-by-hand' || !['assembly_lines', 'ai_managers', 'servers', 'data_centers'].includes(f))
  for (const f of forbidden) expect(previewCanonicalFacilityPurchase(state, f).eligible).toBe(false)
  const automatic = runCanonicalDysonAutomation(state)
  for (const f of forbidden) expect(automatic.state.dyson.facilities[f]).toEqual(state.dyson.facilities[f])
  const derived = deriveBasicDysonState(state, DETERMINISTIC_DYSON_TUNING, { permanentDoubleIp: false }, DETERMINISTIC_DYSON_SNAPSHOT)
  if (!derived.ok) throw Error(JSON.stringify(derived.issues))
  for (const f of forbidden) expect(derived.value.facilityFacts[f].production.perSecond).toBe(0)
  const arrivals = applyDysonProductionArrivals(state, derived.value.productionArrivalRates, 60)
  const next = applyCanonicalSkillIntervalEffects(state, arrivals, { seconds: 60, botProductionPerSecond: derived.value.rates.bots, stellarFacilitiesPerSecond: derived.value.auxiliary.stellarSacrifice.facilitiesPerSecond, stellarBotsPerSecond: derived.value.auxiliary.stellarSacrifice.botsPerSecond, scienceBoostPerSecond: 0, moneyUpgradePerSecond: 0 })
  for (const f of forbidden) expect(next.dyson.facilities[f]).toEqual(state.dyson.facilities[f])
})

test('Short Circuit fixes lifetime even with Discovery, lifetime research and skills', () => {
  const state = createDeterministicMatureDysonFixture({ ownedSkillIds: ['stayingPower', 'panelMaintenance', 'panelWarranty'] })
  state.challenges = { ...EMPTY_INFINITY_CHALLENGES, active: 'short-circuit', unlocked: true }
  state.discovery = { unlocked: true, completions: 1000n, progress: 0, startingPower: 20n, speedUpgrades: 0n }
  const result = deriveBasicDysonState(state, DETERMINISTIC_DYSON_TUNING, { permanentDoubleIp: false }, DETERMINISTIC_DYSON_SNAPSHOT)
  expect(result.ok && result.value.globals.panelLifetimeSeconds).toBe(2)
})

test('Hands Off prevents manual/automatic purchases and starts with one Assembly Line even with retention', () => {
  const state = seed(); state.challenges = { ...state.challenges!, active: 'hands-off' }; state.dyson.money = 1e100
  for (const f of DYSON_FACILITY_IDS) expect(previewCanonicalFacilityPurchase(state, f).eligible).toBe(false)
  expect(runCanonicalDysonAutomation(state).attempts.every(a => !a.purchased)).toBe(true)
  state.infinity.retainedFacilities = { assembly_lines: true, ai_managers: true, servers: true, data_centers: true, planets: true }
  const result = applyCanonicalInfinityReset(state, { breakInfinity: false, requestedReward: 1n, artifactSkillPoints: 0n })
  if (!result.ok) throw Error('reset failed')
  expect(result.state.dyson.facilities.assembly_lines).toEqual([1, 0])
  for (const f of DYSON_FACILITY_IDS.slice(1)) expect(result.state.dyson.facilities[f]).toEqual([0, 0])
})

test('Supply Shortage doubles marginal prices while generated counts do not affect quotes', () => {
  const state = seed(); state.challenges = { ...state.challenges!, active: 'supply-shortage' }; state.dyson.money = 1e100
  state.dyson.automation.buyMode = 'buy-1'
  const first = previewCanonicalFacilityPurchase(state, 'assembly_lines').cost
  state.dyson.facilities.assembly_lines = [1e9, 1]
  expect(previewCanonicalFacilityPurchase(state, 'assembly_lines').cost).toBe(first * 2)
  state.dyson.facilities.assembly_lines = [1e9, 2]
  expect(previewCanonicalFacilityPurchase(state, 'assembly_lines').cost).toBe(first * 4)
})

test('Commitment Issues blocks refunds, clear and preset replacement without preventing additional assignments', () => {
  const state = seed(); state.challenges = { ...state.challenges!, active: 'commitment-issues' }; state.skills.points = 10n
  const purchase = purchaseCanonicalSkill(state, 'startHereTree')
  if (!purchase.accepted) throw Error(purchase.reason)
  expect(refundCanonicalSkill(purchase.state, 'startHereTree').accepted).toBe(false)
  expect(resetCanonicalSkills(purchase.state).accepted).toBe(false)
  expect(applyCanonicalSkillPresetLayout(purchase.state, []).accepted).toBe(false)
  const reset = applyCanonicalInfinityReset(purchase.state, { breakInfinity: false, requestedReward: 1n, artifactSkillPoints: 0n })
  expect(reset.ok && reset.state.skills.byId.startHereTree?.owned).toBe(false)
})


test('challenge entry refreshes cached refund controls with unchanged skills and points', () => {
  const purchase = purchaseCanonicalSkill({ ...seed(), skills: { ...seed().skills, points: 10n } }, 'startHereTree')
  const normal = selectStableFrontendSkillPreview(purchase.state, undefined)
  expect(normal.reset.refundableSkillIds).toContain('startHereTree')
  const challenge = selectStableFrontendSkillPreview({ ...purchase.state, challenges: { ...purchase.state.challenges!, active: 'commitment-issues' } }, normal)
  expect(challenge.reset.refundableSkillIds).toEqual([])
  expect(challenge.reset.retainedSkillIds).toContain('startHereTree')
})


test.each(['built-by-hand', 'grounded'] as const)('%s cannot feed Discovery through disabled Planet generation', active => {
  const state = createDeterministicMatureDysonFixture({ ownedSkillIds: ['scientificPlanets', 'shouldersOfGiants', 'whatCouldHaveBeen', 'pocketDimensions'] })
  state.challenges = { ...EMPTY_INFINITY_CHALLENGES, active, unlocked: true }
  state.discovery = { unlocked: true, completions: 10n, progress: 0, startingPower: 0n, speedUpgrades: 0n }
  const effects = deriveDiscoveryEffects(state, { ...DETERMINISTIC_DYSON_SNAPSHOT, pocketDimensionsProduction: 1e10, scientificPlanetsProduction: 1e10 })
  expect(effects.sources.some(source => ['shouldersOfGiants', 'whatCouldHaveBeen'].includes(source.id))).toBe(false)
  expect(effects.multiplier).toBeGreaterThan(1)
})


test.each(['built-by-hand', 'hands-off', 'grounded'] as const)('%s blocks Infinity retention purchases that would grant forbidden facilities', active => {
  const state = seed()
  state.challenges = { ...state.challenges!, active }
  state.infinity.points = 10n
  const id = active === 'grounded' ? 'retain-planets' : 'retain-assembly-lines'
  const result = purchaseCanonicalInfinityShopItem(state, id)
  expect(result.code).toBe('challenge-disabled')
  expect(result.changed).toBe(false)
  expect(result.state).toBe(state)
  const ordinary = purchaseCanonicalInfinityShopItem({ ...state, challenges: { ...state.challenges!, active: null } }, 'retain-assembly-lines')
  expect(ordinary.accepted).toBe(true)
  expect(ordinary.state.dyson.facilities.assembly_lines[1]).toBe(10)
})
