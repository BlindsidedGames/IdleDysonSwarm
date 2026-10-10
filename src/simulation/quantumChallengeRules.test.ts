import { enterReplacementChallenge } from '../../test/support/replacementChallengeFixture'
import { replacementSkillPoints } from './reworkChallenges'
import { routeCanonicalGameCommand } from '../application/canonicalGameCommands'
import { deriveCanonicalArtifactSkillPoints } from './canonicalEventTimeModel'
import { REALITY_UPGRADE_DEFINITIONS } from './realityUpgrades'
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
  return { ...state, meta: { ...state.meta, firstQuantumComplete: true, firstInfinityComplete: true, reworkMigrationChoice: 'keep' as const }, infinity: { ...state.infinity, points: 64n }, challenges: { ...EMPTY_INFINITY_CHALLENGES, unlocked: true, blankSlateCompleted: true, galvanizedSkillIds: ['manualLabour'] }, skills: { ...state.skills, byId: { ...state.skills.byId, manualLabour: { owned: true, level: 1, timerSeconds: 0, secondaryTimerSeconds: 0 } } }, quantum: { ...state.quantum, divisionsPurchased: 19n, unlocks: { ...state.quantum.unlocks, doubleInfinityPoints: true, quantumEntanglement: true } } }
}

test.each(QUANTUM_CHALLENGE_IDS)('%s legacy receipt/time/currency survives import without completing the replacement', id => {
  const source = seed()
  const legacy = { ...source, challenges: { ...source.challenges!, active: id,
    completedQuantumChallenges: [id], galvanizers: 2n, hasEarnedGalvanizer: true,
    completionSeconds: { [id]: 123 } } }
  const restored = hydrateGameState(dehydrateGameState(session(), legacy)).state
  expect(restored.challenges?.active).toBeNull()
  expect(challengeCompleted(restored.challenges!, id)).toBe(true)
  expect(restored.challenges?.completionSeconds?.[id]).toBe(123)
  expect(restored.challenges?.galvanizers).toBe(2n)
  expect(replacementSkillPoints(restored.challenges)).toBe(0n)
  const entered = enterReplacementChallenge(restored, id)
  expect(entered.challenges?.replacement?.completedIds).toEqual([])
  expect(entered.challenges?.galvanizers).toBe(2n)
  expect(validateInfinityChallenges(entered.challenges)).toBeNull()
})

test('paid Double IP remains effective while the Quantum bonus is suppressed', () => {
  const state = enterReplacementChallenge(seed(), 'no-science')
  const infinity = createBasicDysonInfinityState({ divisionsPurchased: effectiveDivisions(state), quantumDoubleIp: quantumDoubleIpEnabled(state), permanentDoubleIp: true })
  expect(infinityPointsForBots(4.2e19, infinity)).toBe(2n)
})

test.each(['built-by-hand', 'grounded'] as const)('%s suppresses purchased, retained, generated and production paths', id => {
  const state = createDeterministicMatureDysonFixture({ ownedSkillIds: ['scientificPlanets', 'pocketDimensions', 'stellarSacrifices', 'androids', 'manualLabour'] })
  state.challenges = enterReplacementChallenge(state, id).challenges
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
  state.challenges = enterReplacementChallenge(state, 'short-circuit').challenges
  state.discovery = { unlocked: true, completions: 1000n, progress: 0, startingPower: 20n, speedUpgrades: 0n }
  const result = deriveBasicDysonState(state, DETERMINISTIC_DYSON_TUNING, { permanentDoubleIp: false }, DETERMINISTIC_DYSON_SNAPSHOT)
  expect(result.ok && result.value.globals.panelLifetimeSeconds).toBe(2)
})

test('Hands Off prevents manual/automatic purchases and starts with one Assembly Line even with retention', () => {
  const state = enterReplacementChallenge(seed(), 'hands-off'); state.dyson.money = 1e100
  for (const f of DYSON_FACILITY_IDS) expect(previewCanonicalFacilityPurchase(state, f).eligible).toBe(false)
  expect(runCanonicalDysonAutomation(state).attempts.every(a => !a.purchased)).toBe(true)
  state.infinity.retainedFacilities = { assembly_lines: true, ai_managers: true, servers: true, data_centers: true, planets: true }
  const result = applyCanonicalInfinityReset(state, { breakInfinity: false, requestedReward: 1n, artifactSkillPoints: 0n })
  if (!result.ok) throw Error('reset failed')
  expect(result.state.dyson.facilities.assembly_lines).toEqual([1, 0])
  for (const f of DYSON_FACILITY_IDS.slice(1)) expect(result.state.dyson.facilities[f]).toEqual([0, 0])
})

test('Supply Shortage doubles marginal prices while generated counts do not affect quotes', () => {
  const state = enterReplacementChallenge(seed(), 'supply-shortage'); state.dyson.money = 1e100
  state.dyson.automation.buyMode = 'buy-1'
  const first = previewCanonicalFacilityPurchase(state, 'assembly_lines').cost
  state.dyson.facilities.assembly_lines = [1e9, 1]
  expect(previewCanonicalFacilityPurchase(state, 'assembly_lines').cost).toBe(first * 2)
  state.dyson.facilities.assembly_lines = [1e9, 2]
  expect(previewCanonicalFacilityPurchase(state, 'assembly_lines').cost).toBe(first * 4)
})

test('Commitment Issues blocks refunds, clear and preset replacement without preventing additional assignments', () => {
  const state = enterReplacementChallenge(seed(), 'commitment-issues'); state.skills.points = 10n
  const purchase = purchaseCanonicalSkill(state, 'startHereTree')
  if (!purchase.accepted) throw Error(purchase.reason)
  expect(refundCanonicalSkill(purchase.state, 'startHereTree').accepted).toBe(false)
  expect(resetCanonicalSkills(purchase.state).accepted).toBe(false)
  expect(applyCanonicalSkillPresetLayout(purchase.state, []).accepted).toBe(false)
  const reset = applyCanonicalInfinityReset(purchase.state, { breakInfinity: false, requestedReward: 1n, artifactSkillPoints: 0n })
  expect(reset.ok && reset.state.skills.byId.startHereTree?.owned).toBe(true)
})


test('challenge entry refreshes cached refund controls with unchanged skills and points', () => {
  const purchase = purchaseCanonicalSkill({ ...seed(), skills: { ...seed().skills, points: 10n } }, 'startHereTree')
  const normal = selectStableFrontendSkillPreview(purchase.state, undefined)
  expect(normal.reset.refundableSkillIds).toContain('startHereTree')
  const challenge = selectStableFrontendSkillPreview({ ...purchase.state, challenges: enterReplacementChallenge(purchase.state, 'commitment-issues').challenges }, normal)
  expect(challenge.reset.refundableSkillIds).toEqual([])
  expect(challenge.reset.retainedSkillIds).toContain('startHereTree')
})


test.each(['built-by-hand', 'grounded'] as const)('%s cannot feed Discovery through disabled Planet generation', active => {
  const state = createDeterministicMatureDysonFixture({ ownedSkillIds: ['scientificPlanets', 'shouldersOfGiants', 'whatCouldHaveBeen', 'pocketDimensions'] })
  state.challenges = enterReplacementChallenge(state, active).challenges
  state.discovery = { unlocked: true, completions: 10n, progress: 0, startingPower: 0n, speedUpgrades: 0n }
  const effects = deriveDiscoveryEffects(state, { ...DETERMINISTIC_DYSON_SNAPSHOT, pocketDimensionsProduction: 1e10, scientificPlanetsProduction: 1e10 })
  expect(effects.sources.some(source => ['shouldersOfGiants', 'whatCouldHaveBeen'].includes(source.id))).toBe(false)
  expect(effects.multiplier).toBeGreaterThan(1)
})


test.each(['built-by-hand', 'hands-off', 'grounded'] as const)('%s blocks Infinity retention purchases that would grant forbidden facilities', active => {
  const state = seed()
  state.challenges = enterReplacementChallenge(state, active).challenges
  state.infinity.points = 10n
  const id = active === 'grounded' ? 'retain-planets' : 'retain-assembly-lines'
  const result = purchaseCanonicalInfinityShopItem(state, id)
  expect(result.code).toBe('challenge-disabled')
  expect(result.changed).toBe(false)
  expect(result.state).toBe(state)
  const ordinary = purchaseCanonicalInfinityShopItem(seed(), 'retain-assembly-lines')
  expect(ordinary.accepted).toBe(true)
  expect(ordinary.state.dyson.facilities.assembly_lines[1]).toBe(10)
})


test('retired Reality and Avotation history cannot inject new artifact SP or mutate through player commands', () => {
  const state = seed()
  state.dream.upgrades.translation1 = true
  state.dream.upgrades.speed1 = true
  state.dream.strangeMatter = 1e30
  state.secretProgress = { ...state.secretProgress, completed: true, step: 7 }
  expect(deriveCanonicalArtifactSkillPoints(state, REALITY_UPGRADE_DEFINITIONS)).toEqual({ ok: true, value: 0n })
  const entered = enterReplacementChallenge(state, 'no-science')
  const purchase = routeCanonicalGameCommand(entered, { kind: 'reality.purchase-upgrade', upgradeId: 'translation2' })
  expect(purchase).toMatchObject({ accepted: false, changed: false, code: 'rework:retired-system' })
  expect(purchase.state).toBe(entered)
  const restored = hydrateGameState(dehydrateGameState(session(), entered)).state
  expect(restored.dream).toEqual(state.dream)
  expect(restored.secretProgress).toEqual(state.secretProgress)
  expect(deriveCanonicalArtifactSkillPoints(restored, new Map())).toEqual({ ok: true, value: 0n })
})

// Challenge rules apply to commands and stale held actions, not just hidden UI.
test('Hands Off cancels Tinker while preserving passive production and generated-Line goals', async () => {
  const { createCanonicalTinkerRuntimeState, deriveCanonicalTinkerStats, startCanonicalTinker, advanceCanonicalTinker, selectCanonicalTinkerUiFacts } = await import('./canonicalTinker')
  const { advanceCanonicalGoalProgression } = await import('./canonicalGoalProgression')
  const { grantTinkerFacilities } = await import('./manualFacilityAugments')
  const state = createDeterministicMatureDysonFixture({ ownedSkillIds: ['manualLabour', 'scientificPlanets'] })
  const stats = deriveCanonicalTinkerStats(state, 100, { galactic_brains: 10 })
  const held = startCanonicalTinker(state, createCanonicalTinkerRuntimeState(), stats, true)
  const challenge = { ...held.state, challenges: enterReplacementChallenge(held.state, 'hands-off').challenges }
  for (const result of [startCanonicalTinker(challenge, held.runtime, stats, true), advanceCanonicalTinker(challenge, held.runtime, stats, 3600)]) {
    expect(result.runtime.running).toBe(false)
    expect(result.runtime.repeat).toBe(false)
    expect(result.state).toBe(challenge)
    expect(result.botsGranted).toBe(0)
    expect(result.completions).toBe(0)
  }
  const facts = selectCanonicalTinkerUiFacts(challenge, held.runtime, 100, 1, { galactic_brains: 10 })
  expect(facts.eligibility).toBe('challenge-disabled')
  expect(facts.canStart).toBe(false)
  expect(facts.stats.facilityYields).toEqual({})
  expect(facts.stats.botYield).toBe(0)
  expect(facts.stats.assemblyYield).toBe(0)
  expect(grantTinkerFacilities(challenge, { galactic_brains: 10 }, 100)).toBe(challenge)
  const derived = deriveBasicDysonState(challenge, DETERMINISTIC_DYSON_TUNING, { permanentDoubleIp: false }, DETERMINISTIC_DYSON_SNAPSHOT)
  if (!derived.ok) throw Error('Derivation failed')
  expect(derived.value.rates.bots).toBeGreaterThan(0)
  expect(derived.value.productionArrivalRates.planets).toBeGreaterThan(0)
  const generated = { ...challenge, dyson: { ...challenge.dyson, goalStage: 1n, facilities: { ...challenge.dyson.facilities, assembly_lines: [5, 0] as const } } }
  const goal = advanceCanonicalGoalProgression(generated, () => ({ panelsPerSecond: 0, panelLifetimeSeconds: 10 }))
  expect(goal.ok && goal.completedStages).toEqual([1n])
  const normalGoal = advanceCanonicalGoalProgression({ ...generated, challenges: { ...generated.challenges, active: null, replacement: { ...generated.challenges.replacement!, active: null } } }, () => ({ panelsPerSecond: 0, panelLifetimeSeconds: 10 }))
  expect(normalGoal.ok && normalGoal.completedStages).toEqual([])
})
