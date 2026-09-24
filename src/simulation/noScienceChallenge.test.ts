import { expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { EMPTY_INFINITY_CHALLENGES, isBreakInfinityEnabled, validateInfinityChallenges } from './infinityChallenges'
import { restartInfinityChallenge } from './canonicalInfinityChallengeRestart'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import { applyCanonicalQuantumReset } from './quantumTransitions'
import { createDeterministicMatureDysonFixture, DETERMINISTIC_DYSON_SNAPSHOT, DETERMINISTIC_DYSON_TUNING } from '../../scripts/support/deterministicMatureDysonFixture'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import { applyCanonicalSkillIntervalEffects } from './canonicalSkillIntervalEffects'
import { DYSON_FACILITY_IDS } from '../game-state/facilityIds'
import { highestOwnedFacility } from './stellarArithmetic'
import { DISCRETE_MAXIMUM } from './numeric'

function entered() {
  const source = hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: '2026-09-24T00:00:00Z' })).state
  const state = { ...source, challenges: { ...EMPTY_INFINITY_CHALLENGES, unlocked: true }, infinity: { ...source.infinity, points: 99n } }
  const reset = restartInfinityChallenge(state, 'enter', 0n, 'no-science')
  if (!reset.ok) throw new Error(reset.code)
  return reset.state
}

test('No Science starts a fresh Quantum without a reward, survives Infinity and saves, and rewards only once', () => {
  const state = entered()
  expect(state.infinity.points).toBe(0n)
  expect(state.quantum.pointsEarned).toBe(0n)
  expect(state.challenges?.active).toBe('no-science')
  const infinity = applyCanonicalInfinityReset(state, { breakInfinity: false, requestedReward: 42n, artifactSkillPoints: 0n })
  if (!infinity.ok) throw new Error('Infinity failed')
  expect(infinity.state.challenges?.active).toBe('no-science')
  const save = hydrateGameState(dehydrateGameState(hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: '2026-09-24T00:00:00Z' })), infinity.state)).state
  expect(save.challenges?.active).toBe('no-science')
  const finish = applyCanonicalQuantumReset({ ...save, statistics: { ...save.statistics, currentQuantumRun: { ...save.statistics.currentQuantumRun, simulatedSeconds: 123 } } }, 0n)
  if (!finish.ok) throw new Error('Quantum failed')
  expect(finish.state.challenges).toMatchObject({ active: null, noScienceCompleted: true, galvanizers: 2n, completionSeconds: { 'no-science': 123 } })
  expect(validateInfinityChallenges(finish.state.challenges)).toBeNull()
  const replay = restartInfinityChallenge(finish.state, 'enter', 0n, 'no-science')
  if (!replay.ok) throw new Error(replay.code)
  const second = applyCanonicalQuantumReset(replay.state, 0n)
  expect(second.ok && second.state.challenges?.galvanizers).toBe(2n)
  const abandoned = restartInfinityChallenge(state, 'abandon', 0n)
  expect(abandoned.ok && abandoned.state.challenges).toMatchObject({ active: null, galvanizers: 0n })
  expect(abandoned.ok && abandoned.state.quantum.pointsEarned).toBe(0n)
  expect(isBreakInfinityEnabled({ ...state, quantum: { ...state.quantum, unlocks: { ...state.quantum.unlocks, breakTheLoop: true } } })).toBe(true)
})

test('No Science suppresses actual Science, old Research effects and generated levels', () => {
  const state = createDeterministicMatureDysonFixture({ ownedSkillIds: ['shouldersOfGiants', 'whatCouldHaveBeen', 'powerUnderwhelming'] })
  state.challenges = { ...EMPTY_INFINITY_CHALLENGES, unlocked: true, active: 'no-science' }
  const result = deriveBasicDysonState(state, DETERMINISTIC_DYSON_TUNING, { permanentDoubleIp: false }, DETERMINISTIC_DYSON_SNAPSHOT)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  expect(result.value.productionArrivalRates.science).toBe(0)
  expect(result.value.auxiliary.scienceBoostPerSecond).toBe(0)
  const next = applyCanonicalSkillIntervalEffects(state, state, { seconds: 3600, botProductionPerSecond: 0, stellarFacilitiesPerSecond: 0, stellarBotsPerSecond: 0, scienceBoostPerSecond: 10, moneyUpgradePerSecond: 10 })
  expect(next.research).toEqual(state.research)
})

test('No Science completion still awards Catalysts when the Quantum wallet is full', () => {
  const state = entered()
  const result = applyCanonicalQuantumReset({ ...state, quantum: { ...state.quantum, pointsEarned: DISCRETE_MAXIMUM } }, 0n)
  expect(result.ok && result.quantumPointGranted).toBe(0n)
  expect(result.ok && result.state.challenges).toMatchObject({ active: null, noScienceCompleted: true, galvanizers: 2n })
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
