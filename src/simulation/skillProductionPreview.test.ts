import { deriveBasicDysonState } from './canonicalDysonDerivation'
import { expect, test } from 'vitest'
import { createDeterministicMatureDysonFixture, DETERMINISTIC_DYSON_SNAPSHOT, DETERMINISTIC_DYSON_TUNING } from '../../scripts/support/deterministicMatureDysonFixture'
import { withCanonicalBotAllocation } from './canonicalBotAllocation'
import { MANUAL_LABOUR_AUGMENTS as A, SWARM_AUGMENTS } from './skillSubskills'
import { manualBotYield } from './manualLabourAugments'
import { previewSkillProduction } from './skillProductionPreview'
import { purchaseCanonicalSkill } from './canonicalSkillTransactions'
import { deriveDreamFoundationalInformationProductionFacts } from './dreamFoundationalInformation'
import { deriveDreamSpaceAgeProductionFacts } from './dreamSpaceAge'

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

test('Self-Replicating Workers previews shared Simulation worker and launched-panel production for purchase and refund', () => {
  const state = runtime(['ultimateSwarm'])
  state.gameState.challenges.galvanizedSkillIds = ['ultimateSwarm']
  state.gameState.dream.resources.hunters = 100n
  state.gameState.dream.resources.gatherers = 200n
  state.gameState.dream.resources.swarmPanels = 10_000n
  state.gameState.dream.parameters.swarmPanelGeneration = 1n
  const before = structuredClone(state)
  const purchased = purchaseCanonicalSkill(state.gameState, SWARM_AUGMENTS.selfReplicatingWorkers)
  if (!purchased.accepted) throw Error(purchased.reason)
  const facts = (gameState: typeof state.gameState) => {
    const workers = deriveDreamFoundationalInformationProductionFacts(gameState, 1)
    const energy = deriveDreamSpaceAgeProductionFacts(gameState, 1)
    if (workers.status !== 'success' || energy.status !== 'success') throw Error('Simulation facts unavailable')
    return {
      hunterCommunity: workers.facts.timers.hunterTimerProgress.outputPerSecond.community,
      gathererCommunity: workers.facts.timers.gathererTimerProgress.outputPerSecond.community,
      launchedPanelEnergy: energy.facts.energy.swarmPerSecond,
    }
  }
  const base = facts(state.gameState)
  const boosted = facts(purchased.state)
  const preview = previewSkillProduction(state, SWARM_AUGMENTS.selfReplicatingWorkers, 'purchase')
  expect(preview.rows.filter(row => row.changed).map(row => row.id)).toEqual(Object.keys(base))
  for (const id of Object.keys(base) as Array<keyof typeof base>) {
    const row = preview.rows.find(row => row.id === id)!
    expect(row.before).toBe(base[id])
    expect(row.after).toBe(boosted[id])
    expect(row.after).toBeGreaterThan(row.before)
  }
  expect(boosted.launchedPanelEnergy / base.launchedPanelEnergy).toBeCloseTo(Math.sqrt(6))
  const refund = previewSkillProduction({ ...state, gameState: purchased.state }, SWARM_AUGMENTS.selfReplicatingWorkers, 'refund')
  for (const id of Object.keys(base) as Array<keyof typeof base>) {
    const row = refund.rows.find(row => row.id === id)!
    expect(row.before).toBe(boosted[id])
    expect(row.after).toBe(base[id])
  }
  expect(state).toEqual(before)
})

test('facility Tinker assignment comparisons match the same rewards used by facility details', () => {
  const source = runtime(['manualLabour'])
  source.gameState.challenges.galvanizedSkillIds = ['manualLabour']
  source.gameState.skills.points = 50n
  for (const id of ['assembly_lines', 'ai_managers', 'servers', 'data_centers', 'planets', 'matrioshka_brains', 'birch_planets', 'galactic_brains'] as const) source.gameState.dyson.facilities[id] = [99, 1]
  source.gameState.quantum.unlocks = { ...source.gameState.quantum.unlocks, matrioshkaBrains: true, birchPlanets: true, galacticBrains: true }
  const id = 'subskill.manualLabour.birch'
  const preview = previewSkillProduction(source, id, 'purchase')
  const purchase = purchaseCanonicalSkill(source.gameState, id)
  if (!purchase.accepted) throw Error(purchase.reason)
  const initial = deriveBasicDysonState(purchase.state, source.compatibilityTuning, source.entitlements, source.evaluationSnapshot)
  if (!initial.ok) throw Error('Derivation failed')
  const derived = deriveBasicDysonState(purchase.state, source.compatibilityTuning, source.entitlements, initial.value.nextEvaluationSnapshot)
  if (!derived.ok) throw Error('Derivation failed')
  for (const [row, facility] of [['manualManagers', 'ai_managers'], ['manualPlanets', 'planets'], ['manualMatrioshka', 'matrioshka_brains'], ['manualBirch', 'birch_planets']] as const) {
    expect(preview.rows.find(r => r.id === row)?.after).toBe(derived.value.facilityFacts[facility].details.tinkerPerActivation)
    expect(derived.value.facilityFacts[facility].details.tinkerPerActivation).toBeGreaterThan(0)
  }
})
