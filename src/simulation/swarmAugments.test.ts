import { expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { EMPTY_INFINITY_CHALLENGES } from './infinityChallenges'
import { SWARM_AUGMENTS as A } from './skillSubskills'
import { initializeSwarmGrants, paidFacilityPurchases, botnetMultiplier, economyOfScaleMultiplier, purchaseScalingMultiplier, purchaseScalingThreshold, stellarSwarmMultiplier } from './swarmAugments'
import { deriveEffectivePurchaseCounts } from './effectivePurchaseCounts'
import { purchaseCanonicalSkill, refundCanonicalSkill, applyCanonicalSkillPresetLayout, previewCanonicalSkillCatalog } from './canonicalSkillTransactions'
import { previewCanonicalFacilityPurchase, tryPurchaseCanonicalFacility, runCanonicalDysonAutomation } from './canonicalDysonCommands'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import { applyCanonicalQuantumReset } from './quantumTransitions'

const session = () => hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: '2026-09-26T00:00:00Z' }))
function fixture(ids: readonly string[] = []): CanonicalGameStateV1 {
  const state = session().state
  const parents = ['superSwarm', 'megaSwarm', 'ultimateSwarm', 'productionScaling']
  return { ...state, meta: { ...state.meta, firstInfinityComplete: true },
    quantum: { ...state.quantum, unlocks: { ...state.quantum.unlocks, fragments: true } },
    challenges: { ...EMPTY_INFINITY_CHALLENGES, unlocked: true, blankSlateCompleted: true, galvanizedSkillIds: parents },
    skills: { ...state.skills, points: 100n, fragments: BigInt(1 + ids.filter(id => id === A.compoundFragments || id === A.reductiveScaling).length), byId: { ...state.skills.byId, ...Object.fromEntries([...parents, ...ids].map(id => [id, { owned: true, level: 0, timerSeconds: 0, secondaryTimerSeconds: 0 }])) } } }
}
function buy(state: CanonicalGameStateV1, id: string) {
  const result = purchaseCanonicalSkill(state, id)
  if (!result.accepted) throw Error(result.reason)
  return result.state
}
function refund(state: CanonicalGameStateV1, id: string) {
  const result = refundCanonicalSkill(state, id)
  if (!result.accepted) throw Error(result.reason)
  return result.state
}
function infinity(state: CanonicalGameStateV1, restartOnly = false) {
  const result = applyCanonicalInfinityReset(state, { requestedReward: 1n, breakInfinity: false, artifactSkillPoints: 100n, restartOnly })
  if (!result.ok) throw Error(JSON.stringify(result.issues))
  return result.state
}

test('Head Start grants each available facility, keeps prices and cannot repeat through refund/reload', () => {
  let state = fixture()
  state = { ...state, dyson: { ...state.dyson, money: 1e30 }, quantum: { ...state.quantum, unlocks: { ...state.quantum.unlocks, matrioshkaBrains: true } } }
  const before = previewCanonicalFacilityPurchase(state, 'assembly_lines')
  state = buy(state, A.headStart)
  expect(state.dyson.facilities.assembly_lines[1]).toBe(30)
  expect(state.dyson.facilities.matrioshka_brains[1]).toBe(30)
  expect(state.dyson.facilities.birch_planets[1]).toBe(0)
  expect(previewCanonicalFacilityPurchase(state, 'assembly_lines').cost).toBe(before.cost)
  state = buy(refund(state, A.headStart), A.headStart)
  state = hydrateGameState(dehydrateGameState(session(), state)).state
  state = buy(refund(state, A.headStart), A.headStart)
  expect(state.dyson.facilities.assembly_lines[1]).toBe(30)
  expect(paidFacilityPurchases(state, 'assembly_lines')).toBe(0)
})

test('Head Start respects forbidden facilities and grants newly unlocked megastructures once', () => {
  for (const challenge of ['built-by-hand', 'hands-off', 'grounded'] as const) {
    const source = fixture([A.headStart])
    const state = initializeSwarmGrants({ ...source, challenges: { ...source.challenges!, active: challenge } })
    expect(state.dyson.facilities.planets[1]).toBe(0)
    if (challenge !== 'grounded') expect(state.dyson.facilities.assembly_lines[1]).toBe(0)
  }
  const first = initializeSwarmGrants(fixture([A.headStart]))
  const unlocked = { ...first, quantum: { ...first.quantum, unlocks: { ...first.quantum.unlocks, galacticBrains: true } } }
  const next = initializeSwarmGrants(unlocked)
  expect(next.dyson.facilities.galactic_brains[1]).toBe(30)
  expect(next.dyson.facilities.assembly_lines[1]).toBe(30)
  expect(initializeSwarmGrants(next)).toBe(next)
})

test('Steady Supply retains paid purchases, not free starters, with identical prices across repeated Infinities', () => {
  let state = fixture([A.headStart, A.steadySupply])
  state = { ...state, infinity: { ...state.infinity, retainedFacilities: { ...state.infinity.retainedFacilities, assembly_lines: true } },
    dyson: { ...state.dyson, money: 1e100, facilities: { ...state.dyson.facilities, assembly_lines: [0, 60] } },
    skills: { ...state.skills, activeAutoAssignment: [A.headStart, A.steadySupply] } }
  state = initializeSwarmGrants(state)
  const cost = previewCanonicalFacilityPurchase(state, 'assembly_lines').cost
  for (let i = 0; i < 3; i++) {
    state = infinity(state)
    expect(state.dyson.facilities.assembly_lines[1]).toBe(90)
    expect(paidFacilityPurchases(state, 'assembly_lines')).toBe(50)
    expect(previewCanonicalFacilityPurchase(state, 'assembly_lines').cost).toBe(cost)
    state = buy(refund(state, A.steadySupply), A.steadySupply)
    expect(state.dyson.facilities.assembly_lines[1]).toBe(90)
  }
})

test('Steady Supply requires ownership at both ends and Quantum/restarts clear the bank', () => {
  let state = fixture([A.steadySupply])
  state = { ...state, dyson: { ...state.dyson, facilities: { ...state.dyson.facilities, assembly_lines: [0, 25] } } }
  const reset = infinity(state)
  expect(reset.dyson.facilities.assembly_lines[1]).toBe(0)
  expect(buy(reset, A.steadySupply).dyson.facilities.assembly_lines[1]).toBe(25)
  expect(buy(infinity(refund(state, A.steadySupply)), A.steadySupply).dyson.facilities.assembly_lines[1]).toBe(0)
  expect(buy(infinity(state, true), A.steadySupply).dyson.facilities.assembly_lines[1]).toBe(0)
  const quantum = applyCanonicalQuantumReset(state, 100n)
  expect(quantum.ok && quantum.state.skills.swarmGrants).toBeUndefined()
})

test('pooled bonuses use original counts once and apply Terra afterwards', () => {
  let state = fixture([A.pooledPurchases, 'terraIrradiant', 'terraNullius'])
  state = { ...state, dyson: { ...state.dyson, facilities: { ...state.dyson.facilities, assembly_lines: [1e100, 10], planets: [0, 20] } } }
  expect(deriveEffectivePurchaseCounts(state, 'planets').effectiveManualCount).toBe(360)
  expect(deriveEffectivePurchaseCounts(state, 'assembly_lines').effectiveManualCount).toBe(390)
  expect(deriveEffectivePurchaseCounts(state, 'galactic_brains').effectiveManualCount).toBe(30)
  expect(state.dyson.facilities.assembly_lines[1]).toBe(10)
})

test('Deferred Billing preserves affordability, geometric prices and shared automation rules', () => {
  let state = fixture([A.deferredBilling])
  state = { ...state, dyson: { ...state.dyson, money: 1e6, automation: { ...state.dyson.automation, buyMode: 'buy-1', enabledFacilities: { ...state.dyson.automation.enabledFacilities, assembly_lines: true } } }, infinity: { ...state.infinity, automationUnlocked: { ...state.infinity.automationUnlocked, bots: true } } }
  const result = tryPurchaseCanonicalFacility(state, 'assembly_lines')
  expect(result.attempt.purchased).toBe(true)
  expect(result.state.dyson.money).toBe(state.dyson.money)
  expect(previewCanonicalFacilityPurchase(result.state, 'assembly_lines').cost).toBeGreaterThan(result.attempt.cost)
  expect(tryPurchaseCanonicalFacility({ ...state, dyson: { ...state.dyson, money: 0 } }, 'assembly_lines').attempt.purchased).toBe(false)
  expect(runCanonicalDysonAutomation(state).state.dyson.money).toBe(state.dyson.money)
})

test('Fragment augments count for shared Fragment effects through assignment, refunds, presets and resets', () => {
  const initial = fixture()
  const first = buy(initial, A.reductiveScaling)
  const both = buy(first, A.compoundFragments)
  expect(first.skills.fragments).toBe(2n)
  expect(both.skills.fragments).toBe(3n)
  expect(purchaseScalingThreshold(both)).toBe(80)
  expect(previewCanonicalSkillCatalog(both).skills.find(skill => skill.skillId === A.compoundFragments)?.refund.fragmentsRemoved).toBe(1n)
  expect(refund(both, A.compoundFragments).skills.fragments).toBe(2n)
  expect(buy(both, A.headStart).skills.fragments).toBe(3n)
  const preset = applyCanonicalSkillPresetLayout(initial, [A.compoundFragments, A.reductiveScaling])
  expect(preset.accepted).toBe(true)
  expect(preset.state.skills.fragments).toBe(3n)
  const loaded = hydrateGameState(dehydrateGameState(session(), preset.state)).state
  expect(loaded.skills.fragments).toBe(3n)
  expect(infinity(loaded).skills.fragments).toBe(3n)
  const unfractured = { ...initial, challenges: { ...initial.challenges!, galvanizedSkillIds: [] } }
  expect(purchaseCanonicalSkill(unfractured, A.reductiveScaling).accepted).toBe(false)
})

test('Reductive Scaling includes itself and other Fragment augments in quoted price growth', () => {
  let state = fixture([A.reductiveScaling, A.botnet])
  state = { ...state, dyson: { ...state.dyson, money: 1e10, automation: { ...state.dyson.automation, buyMode: 'buy-1' }, facilities: { ...state.dyson.facilities, assembly_lines: [0, 10] } } }
  const before = previewCanonicalFacilityPurchase(state, 'assembly_lines').cost
  const next = tryPurchaseCanonicalFacility(state, 'assembly_lines').state
  expect(previewCanonicalFacilityPurchase(next, 'assembly_lines').cost / before).toBeCloseTo(1.2)
  const assigned = buy(state, A.headStart)
  expect(assigned.skills.fragments).toBe(2n)
  const compound = buy(state, A.compoundFragments)
  const cost = previewCanonicalFacilityPurchase(compound, 'assembly_lines').cost
  expect(previewCanonicalFacilityPurchase(tryPurchaseCanonicalFacility(compound, 'assembly_lines').state, 'assembly_lines').cost / cost).toBeCloseTo(1.195)
})

test('growing bonuses are finite and neutral at zero, with authored logarithm bases', () => {
  let state = fixture([A.botnet, A.economyOfScale, A.compoundFragments, A.stellarSwarm])
  expect(economyOfScaleMultiplier(state)).toBe(1)
  expect(purchaseScalingMultiplier(state, 0)).toBe(1)
  state = { ...state, dyson: { ...state.dyson, bots: 400, facilities: { ...state.dyson.facilities, assembly_lines: [125, 0] } } }
  expect(botnetMultiplier(state)).toBe(3)
  expect(economyOfScaleMultiplier(state)).toBeCloseTo(3)
  expect(stellarSwarmMultiplier({ ...state, dyson: { ...state.dyson, bots: 12.5 } }, 4)).toBeCloseTo(4)
  expect(Number.isFinite(purchaseScalingMultiplier(state, Number.MAX_VALUE))).toBe(true)
})

test('real production uses Botnet for all facilities and Economy once for Cash, Science and Bots', async () => {
  const { deriveBasicDysonState } = await import('./canonicalDysonDerivation')
  const { createDeterministicMatureDysonFixture, DETERMINISTIC_DYSON_TUNING: tuning, DETERMINISTIC_DYSON_SNAPSHOT: snapshot } = await import('../../scripts/support/deterministicMatureDysonFixture')
  const source = createDeterministicMatureDysonFixture({ ownedSkillIds: [] })
  const state = { ...source, skills: fixture().skills, challenges: fixture().challenges }
  const derive = (s: CanonicalGameStateV1) => {
    const result = deriveBasicDysonState(s, tuning, { permanentDoubleIp: false }, snapshot)
    if (!result.ok) throw Error(JSON.stringify(result.issues))
    return result.value
  }
  const original = derive(state)
  const botnet = buy(state, A.botnet)
  const enhanced = derive(botnet)
  for (const id of Object.keys(state.dyson.facilities) as (keyof typeof state.dyson.facilities)[]) {
    expect(enhanced.facilityFacts[id].production.perSecond / original.facilityFacts[id].production.perSecond).toBeCloseTo(botnetMultiplier(botnet))
  }
  const economy = buy(state, A.economyOfScale)
  const next = derive(economy)
  const m = economyOfScaleMultiplier(economy)
  expect(next.rates.bots / original.rates.bots).toBeCloseTo(m)
  expect(next.globals.moneyMultiplier / original.globals.moneyMultiplier).toBeCloseTo(m)
  expect(next.globals.scienceMultiplier / original.globals.scienceMultiplier).toBeCloseTo(m)
  expect(next.facilityFacts.assembly_lines.details?.contributions.some(row => row.source?.id === A.economyOfScale)).toBe(true)
})

test('Discovery replaces Economy science with one bounded source and the existing tier weights', async () => {
  const { deriveDiscoveryEffects } = await import('./discoveryEffects')
  const { DETERMINISTIC_DYSON_SNAPSHOT: snapshot } = await import('../../scripts/support/deterministicMatureDysonFixture')
  const source = fixture([A.economyOfScale])
  const state = { ...source, discovery: { unlocked: true, completions: 0n, progress: 0, startingPower: 0n, speedUpgrades: 0n }, dyson: { ...source.dyson, facilities: { ...source.dyson.facilities, assembly_lines: [125, 0] as const } } }
  const effects = deriveDiscoveryEffects(state, snapshot)
  expect(effects.sources.filter(x => x.id === A.economyOfScale)).toHaveLength(1)
  expect(effects.sources.find(x => x.id === A.economyOfScale)!.bonus).toBeCloseTo(.1 * Math.log10(3))
  expect(effects.speed).toBeCloseTo(1 + .1 * Math.log10(3))
  expect(effects.elevationSpeed).toBeLessThan(effects.speed)
})

test('Stellar Swarm enhances the actual target and its breakdown without increasing Bot costs', async () => {
  const { deriveBasicDysonState } = await import('./canonicalDysonDerivation')
  const { DETERMINISTIC_DYSON_TUNING: tuning, DETERMINISTIC_DYSON_SNAPSHOT: snapshot } = await import('../../scripts/support/deterministicMatureDysonFixture')
  let state = fixture(['stellarSacrifices'])
  state = { ...state, dyson: { ...state.dyson, bots: 1000, facilities: { ...state.dyson.facilities, planets: [0, 200] } } }
  const before = deriveBasicDysonState(state, tuning, { permanentDoubleIp: false }, { ...snapshot, panelsPerSecond: 1e50 })
  const after = deriveBasicDysonState(buy(state, A.stellarSwarm), tuning, { permanentDoubleIp: false }, { ...snapshot, panelsPerSecond: 1e50 })
  if (!before.ok || !after.ok) throw Error('Derivation failed')
  expect(after.value.auxiliary.stellarSacrifice.facilitiesPerSecond).toBeGreaterThan(before.value.auxiliary.stellarSacrifice.facilitiesPerSecond)
  expect(after.value.auxiliary.stellarSacrifice.botsPerSecond).toBe(before.value.auxiliary.stellarSacrifice.botsPerSecond)
  const rows = after.value.facilityFacts.planets.details!.generationContributions
  expect(rows.at(-1)?.runningTotal).toBe(after.value.auxiliary.stellarSacrifice.facilitiesPerSecond)
  expect(rows.some(row => row.source?.id === A.stellarSwarm)).toBe(true)
})

test('Self-Replicating Workers boosts Hunters, Gatherers and launched-panel Energy in the shared simulation facts and ticks', async () => {
  const { deriveDreamFoundationalInformationProductionFacts: facts, runDreamFoundationalInformationProduction: tick } = await import('./dreamFoundationalInformation')
  const { deriveDreamSpaceAgeProductionFacts: spaceFacts, runDreamSpaceAgeProduction: spaceTick } = await import('./dreamSpaceAge')
  const initial = fixture()
  const state = { ...initial, dream: { ...initial.dream, resources: { ...initial.dream.resources, hunters: 100n, gatherers: 200n, swarmPanels: 10000n, solarPanels: 10, fusion: 1 }, parameters: { ...initial.dream.parameters, swarmPanelGeneration: 1n } } }
  const boosted = buy(state, A.selfReplicatingWorkers)
  const before = facts(state, 2), after = facts(boosted, 2)
  if (before.status !== 'success' || after.status !== 'success') throw Error('Production facts unavailable')
  expect(after.facts.timers.hunterTimerProgress.progressPerSecond / before.facts.timers.hunterTimerProgress.progressPerSecond).toBeCloseTo(1.5 ** 0.75)
  expect(after.facts.timers.gathererTimerProgress.progressPerSecond / before.facts.timers.gathererTimerProgress.progressPerSecond).toBeCloseTo(2 ** 0.75)
  expect(after.facts.timers.communityTimerProgress).toEqual(before.facts.timers.communityTimerProgress)
  const short = tick(boosted, { tickSeconds: 1, doubleTimeMultiplier: 2 })
  const long = tick(boosted, { tickSeconds: 60, doubleTimeMultiplier: 2 })
  expect(short.completedCycles.hunterTimerProgress).toBe(Math.floor(after.facts.timers.hunterTimerProgress.progressPerSecond / 3))
  expect(long.completedCycles.hunterTimerProgress).toBe(Math.floor(after.facts.timers.hunterTimerProgress.progressPerSecond * 60 / 3))
  const energyBefore = spaceFacts(state, 2), energyAfter = spaceFacts(boosted, 2)
  if (energyBefore.status !== 'success' || energyAfter.status !== 'success') throw Error('Energy facts unavailable')
  expect(energyAfter.facts.energy.swarmPerSecond / energyBefore.facts.energy.swarmPerSecond).toBeCloseTo(Math.sqrt(6))
  expect(energyAfter.facts.energy.solarPerSecond).toBe(energyBefore.facts.energy.solarPerSecond)
  expect(energyAfter.facts.energy.fusionPerSecond).toBe(energyBefore.facts.energy.fusionPerSecond)
  expect(spaceTick(boosted, { tickSeconds: 60, doubleTimeMultiplier: 2 }).energyGenerated).toBeCloseTo(energyAfter.facts.energy.totalPerSecond * 60)
  expect(facts(refund(boosted, A.selfReplicatingWorkers), 2)).toEqual(before)
})
