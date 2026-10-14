import { expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { PreparedSave } from '../save/prepare'
import { serializeWebSave, deserializeWebSave } from '../save/serialization'
import { EMPTY_INFINITY_CHALLENGES } from './infinityChallenges'
import { REWORK_CHALLENGES } from './reworkChallenges'
import { advanceCanonicalGoalProgression } from './canonicalGoalProgression'
import { applyDysonProductionArrivals, type DysonProductionArrivalRates } from './dysonProductionArrivals'
import { advanceCivilization, buyCivilizationHousing } from './civilization'
import { applyCanonicalOverflowReset } from './canonicalOverflowReset'
import { OVERFLOW_BOT_CAP } from './overflowBoundary'
const session = hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: '2026-10-14T00:00:00Z' }))
const fresh = () => ({ ...session.state, meta: { ...session.state.meta, reworkMigrationChoice: 'keep' as const } })
const rates: DysonProductionArrivalRates = { money: 0, science: 0, panels: 0, bots: 0, assembly_lines: 0, ai_managers: 0, servers: 0, data_centers: 0, planets: 0, matrioshka_brains: 0, birch_planets: 0 }
const reload = (state: ReturnType<typeof fresh>) => hydrateGameState(PreparedSave.fromDecoded(deserializeWebSave(serializeWebSave(dehydrateGameState(session, state).copyValidatedState())))).state

// Owns the goal reward -> saved unlock -> reset contract, rather than helper predicates.
test('the tenth Bots goal unlocks Simulations once and survives saving and Transcendence', () => {
  const initial = fresh()
  expect(advanceCivilization(initial, 1000)).toBe(initial)
  expect(buyCivilizationHousing(initial, 'tent')).toBeNull()
  const ninth = { ...initial, dyson: { ...initial.dyson, goalStage: 9n } }
  const incomplete = advanceCanonicalGoalProgression(ninth, () => ({ panelsPerSecond: 2e17, panelLifetimeSeconds: 1 }))
  expect(incomplete.ok && incomplete.state.challenges?.openingCompleted).not.toBe(true)
  const result = advanceCanonicalGoalProgression(ninth, () => ({ panelsPerSecond: 3e17, panelLifetimeSeconds: 1 }))
  if (!result.ok) throw Error(result.detail)
  expect(result.awardedSkillPoints).toBe(1n)
  expect(result.state.skills.points).toBe(initial.skills.points + 1n)
  const saved = reload(result.state)
  expect(saved.challenges?.openingCompleted).toBe(true)
  expect(advanceCivilization(saved, 1).civilization?.unlocked).toBe(true)
  const reset = applyCanonicalOverflowReset({ ...saved, dyson: { ...saved.dyson, bots: OVERFLOW_BOT_CAP } })
  if (!reset.ok) throw Error(reset.code)
  expect(reset.state.dyson.goalStage).toBe(0n)
  expect(reset.state.challenges?.openingCompleted).toBe(true)
  expect(advanceCivilization(reset.state, 1).civilization?.unlocked).toBe(true)
})

// Exact half-hour growth and split intervals catch periodic awards and linear tick growth.
test('all ten completions produce continuous seeded growth with no extra replay reward', () => {
  const initial = fresh()
  const state = { ...initial, challenges: { ...EMPTY_INFINITY_CHALLENGES, openingCompleted: true, replacement: {
    version: 1 as const, active: null, completedIds: REWORK_CHALLENGES.map(c => c.id), earnedIp: 0n, infinities: 0, paidPurchases: 0, paidFacilityIds: [], savedDiscovery: initial.discovery, savedAutoAssignment: [], savedBreakTarget: 1n, savedBotDistribution: 0,
  } }, dyson: { ...initial.dyson, facilities: { ...initial.dyson.facilities, galactic_brains: [0, 10] as const } } }
  const half = applyDysonProductionArrivals(state, rates, 900)
  expect(half.dyson.facilities.galactic_brains[0]).toBeCloseTo(4.1421356237, 8)
  const split = applyDysonProductionArrivals(reload(half), rates, 900)
  expect(split.dyson.facilities.galactic_brains[0]).toBeCloseTo(10, 10)
  expect(split.dyson.facilities.galactic_brains[1]).toBe(10)
  expect(applyDysonProductionArrivals(state, rates, 1800).dyson.facilities.galactic_brains[0]).toBeCloseTo(10, 10)
  const zero = { ...state, dyson: { ...state.dyson, facilities: { ...state.dyson.facilities, galactic_brains: [0, 0] as const } } }
  expect(applyDysonProductionArrivals(zero, rates, 3600).dyson.facilities.galactic_brains).toEqual([0, 0])
  const locked = { ...state, challenges: { ...state.challenges, openingCompleted: false } }
  expect(applyDysonProductionArrivals(locked, rates, 3600).dyson.facilities.galactic_brains).toEqual([0, 10])
  expect(applyDysonProductionArrivals(state, rates, 1e9).dyson.facilities.galactic_brains[0]).toBe(Number.MAX_VALUE)
})
