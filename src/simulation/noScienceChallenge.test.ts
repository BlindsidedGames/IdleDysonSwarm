import { enterReplacementChallenge } from '../../test/support/replacementChallengeFixture'
import { expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState } from '../game-state/mapping'
import { EMPTY_INFINITY_CHALLENGES } from './infinityChallenges'
import { restartInfinityChallenge } from './canonicalInfinityChallengeRestart'
import { createDeterministicMatureDysonFixture, DETERMINISTIC_DYSON_SNAPSHOT, DETERMINISTIC_DYSON_TUNING } from '../../scripts/support/deterministicMatureDysonFixture'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import { applyCanonicalSkillIntervalEffects } from './canonicalSkillIntervalEffects'
import { DYSON_FACILITY_IDS } from '../game-state/facilityIds'
import { highestOwnedFacility } from './stellarArithmetic'

function entered() {
  const source = hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: '2026-09-24T00:00:00Z' })).state
  const state = { ...source, meta: { ...source.meta, firstInfinityComplete: true, reworkMigrationChoice: 'keep' as const }, challenges: { ...EMPTY_INFINITY_CHALLENGES, unlocked: true }, infinity: { ...source.infinity, points: 99n } }
  const reset = restartInfinityChallenge(state, 'enter', 0n, 'no-science')
  if (!reset.ok) throw new Error(reset.code)
  return reset.state
}

test('No Science suppresses actual Science, old Research effects and generated levels', () => {
  const state = enterReplacementChallenge(createDeterministicMatureDysonFixture({ ownedSkillIds: ['shouldersOfGiants', 'whatCouldHaveBeen', 'powerUnderwhelming'] }), 'no-science')
  state.dyson = { ...state.dyson, bots: 100, botDistribution: 1, workers: 0, researchers: 100 }
  const result = deriveBasicDysonState(state, DETERMINISTIC_DYSON_TUNING, { permanentDoubleIp: false }, DETERMINISTIC_DYSON_SNAPSHOT)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  expect(result.value.productionArrivalRates.science).toBe(0)
  expect(result.value.auxiliary.scienceBoostPerSecond).toBe(0)
  const next = applyCanonicalSkillIntervalEffects(state, state, { seconds: 3600, botProductionPerSecond: 0, stellarFacilitiesPerSecond: 0, stellarBotsPerSecond: 0, scienceBoostPerSecond: 10, moneyUpgradePerSecond: 10 })
  expect(next.research).toEqual(state.research)
  const ordinary = { ...state, challenges: { ...state.challenges!, active: null, replacement: { ...state.challenges!.replacement!, active: null } } }
  const normal = deriveBasicDysonState(ordinary, DETERMINISTIC_DYSON_TUNING, { permanentDoubleIp: false }, DETERMINISTIC_DYSON_SNAPSHOT)
  expect(normal.ok && normal.value.productionArrivalRates.science).toBeGreaterThan(0)
  expect(applyCanonicalSkillIntervalEffects(ordinary, ordinary, { seconds: 1, botProductionPerSecond: 0, stellarFacilitiesPerSecond: 0, stellarBotsPerSecond: 0, scienceBoostPerSecond: 10, moneyUpgradePerSecond: 10 }).research.levelsById['research.science_boost']).toBe(10)
})

test.each(DYSON_FACILITY_IDS)('Stellar Sacrifices creates the highest owned facility: %s', target => {
  const base = entered()
  const state = { ...base, dyson: { ...base.dyson, bots: 100, facilities: { ...base.dyson.facilities, assembly_lines: [0, 1] as const, [target]: [0.5, 0] as const } } }
  expect(highestOwnedFacility(state.dyson.facilities)).toBe(target)
  const next = applyCanonicalSkillIntervalEffects(state, state, { seconds: 2, botProductionPerSecond: 0, stellarFacilitiesPerSecond: 5, stellarBotsPerSecond: 10, scienceBoostPerSecond: 0, moneyUpgradePerSecond: 0 })
  expect(next.dyson.bots).toBe(80)
  expect(next.dyson.facilities[target][0]).toBe(10.5)
  expect(next.dyson.facilities[target][1]).toBe(0)
  for (const id of DYSON_FACILITY_IDS) if (id !== target) expect(next.dyson.facilities[id]).toEqual(state.dyson.facilities[id])
})

test('Stellar Sacrifices with no owned facility neither spends Bots nor creates a facility', () => {
  const state = entered()
  const next = applyCanonicalSkillIntervalEffects(state, state, { seconds: 10, botProductionPerSecond: 0, stellarFacilitiesPerSecond: 5, stellarBotsPerSecond: 10, scienceBoostPerSecond: 0, moneyUpgradePerSecond: 0 })
  expect(next.dyson).toEqual(state.dyson)
})

test.each([...DYSON_FACILITY_IDS, null])('Stellar Sacrifices details follow the actual production target: %s', target => {
  const state = createDeterministicMatureDysonFixture({ ownedSkillIds: ['stellarSacrifices', 'scientificPlanets'] })
  state.discovery = { unlocked: true, completions: 0n, progress: 0, startingPower: 0n, speedUpgrades: 0n }
  for (const id of DYSON_FACILITY_IDS) state.dyson.facilities[id] = [0, 0]
  if (target) state.dyson.facilities[target] = [0.5, 0]
  const result = deriveBasicDysonState(state, DETERMINISTIC_DYSON_TUNING, { permanentDoubleIp: false }, { ...DETERMINISTIC_DYSON_SNAPSHOT, panelsPerSecond: 1e30 })
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  for (const id of DYSON_FACILITY_IDS) {
    const rows = result.value.facilityFacts[id].details?.generationContributions ?? []
    const stellar = rows.filter(row => row.sourceId === 'effect.stellarSacrifices.planets_per_second')
    expect(stellar).toHaveLength(id === target ? 1 : 0)
    if (id === target) {
      expect(stellar[0].value).toBeGreaterThan(0)
      expect(stellar[0].value).toBe(result.value.auxiliary.stellarSacrifice.facilitiesPerSecond)
      expect(stellar[0].source).toMatchObject({ kind: 'skill', id: 'stellarSacrifices' })
    }
  }
  expect(result.value.facilityFacts.planets.details?.generationContributions?.some(row => row.sourceId === 'effect.scientificPlanets.planets_per_second')).toBe(true)
})
