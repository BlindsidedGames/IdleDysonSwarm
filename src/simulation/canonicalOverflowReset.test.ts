import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { applyCanonicalOverflowReset } from './canonicalOverflowReset'
import { evaluateCanonicalBotCapCheckpoint } from './canonicalBotCapCheckpoint'
import { hasReachedOverflow, OVERFLOW_BOT_CAP } from './overflowBoundary'
import { deriveAvocadoMultiplier } from './avocadoDomain'
import { applyDysonProductionArrivals, type DysonProductionArrivalRates } from './dysonProductionArrivals'
import { applyCanonicalSkillIntervalEffects, timeToNextInfinityEventAfterStellarSettlement } from './canonicalSkillIntervalEffects'
import { createBasicDysonInfinityState, ordinaryInfinityBotThreshold } from './infinityCycle'
import { advanceCanonicalTinker, createCanonicalTinkerRuntimeState, startCanonicalTinker } from './canonicalTinker'
import { DISCRETE_MAXIMUM } from './numeric'

const baseline = hydrateGameState(prepareIdb1Save(readFileSync(
  new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8',
)).prepared).state

function lateGame(bots = OVERFLOW_BOT_CAP): CanonicalGameStateV1 {
  return {
    ...baseline,
    dyson: { ...baseline.dyson, bots },
    infinity: { ...baseline.infinity, points: 987n, spentPoints: 123n, permanentSkillPoints: 80n,
      botCapTransitionPending: false, botCapRewardsGranted: false },
    quantum: { ...baseline.quantum, pointsEarned: 999n, pointsSpent: 100n, cashBonusLevels: 99n,
      scienceBonusLevels: 99n, permanentSecrets: 27n, divisionsPurchased: 19n,
      influenceSpeedBonus: 70n,
      unlocks: Object.fromEntries(Object.keys(baseline.quantum.unlocks).map((id) => [id, true])) as CanonicalGameStateV1['quantum']['unlocks'],
    },
    avocado: { unlocked: true, infinityPoints: 1e80, influence: 1e90, strangeMatter: 1e70,
      overflowMultiplier: 9, overflowPoints: 3n },
    reality: { universeDesignationCount: 100n, workersReady: 999n, workerGenerationProgress: 0.9,
      influence: 1e60, autoGather: true },
    dream: { ...baseline.dream, strangeMatter: 1e70, resetCount: 999n,
      huntersPerPurchase: 99n, gatherersPerPurchase: 99n,
      upgrades: Object.fromEntries(Object.keys(baseline.dream.upgrades).map((id) => [id, true])) as CanonicalGameStateV1['dream']['upgrades'] },
    secretProgress: { completed: true, step: 7 },
    timeline: { ...baseline.timeline, storedTimeAvailableSeconds: 100,
      doubleTime: { unlocked: true, enabled: true, bankSeconds: 999, rate: 2 } },
  }
}

describe('Overflow reset ownership', () => {
  test('clears all three progression stages and bonuses while retaining the promised durable state', () => {
    const source = lateGame()
    const original = structuredClone(source)
    const result = applyCanonicalOverflowReset(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const next = result.state
    expect(source).toEqual(original)
    expect(next.infinity.points).toBe(0n)
    expect(next.infinity.spentPoints).toBe(0n)
    expect(next.infinity.permanentSkillPoints).toBe(0n)
    expect(next.infinity.secretsOfTheUniverse).toBe(0n)
    expect(Object.values(next.infinity.retainedFacilities).every((v) => !v)).toBe(true)
    expect(next.infinity.automationUnlocked).toEqual({ bots: false, research: false })
    expect(Object.values(next.quantum).filter((v) => typeof v === 'bigint').every((v) => v === 0n)).toBe(true)
    expect(Object.values(next.quantum.unlocks).every((v) => !v)).toBe(true)
    expect(next.reality).toEqual({ universeDesignationCount: 0n, workersReady: 0n,
      workerGenerationProgress: 0, influence: 0, autoGather: false })
    expect(Object.values(next.dream.resources).every((v) => v === 0 || v === 0n)).toBe(true)
    expect(Object.values(next.dream.upgrades).every((v) => !v)).toBe(true)
    expect(next.dream.strangeMatter).toBe(0)
    expect(next.dream.resetCount).toBe(0n)
    expect(next.dream.huntersPerPurchase).toBe(1n)
    expect(next.dream.gatherersPerPurchase).toBe(1n)
    expect(next.timeline.doubleTime.unlocked).toBe(false)
    expect(next.timeline.storedTimeAvailableSeconds).toBe(100)
    expect(next.timeline.storedTimeCapacitySeconds).toBe(source.timeline.storedTimeCapacitySeconds)
    expect(next.research.levelsById).toEqual({})
    expect(next.research.progressById).toEqual({})
    expect(next.skills.byId).toEqual({})
    expect(next.skills.fragments).toBe(0n)
    expect(next.skills.points).toBe(4n)
    expect(next.skills.presets).toEqual(source.skills.presets)
    expect(next.skills.activeAutoAssignment).toEqual(source.skills.activeAutoAssignment)
    expect(next.dyson.automation).toEqual(source.dyson.automation)
    expect(next.research.automation).toEqual(source.research.automation)
    expect(next.secretProgress).toEqual(source.secretProgress)
    expect(next.meta.createdAtLegacyText).toBe(source.meta.createdAtLegacyText)
    expect(next.meta.firstInfinityComplete).toBe(false)
    expect(next.statistics.lifetime.botCapInfinityPoints).toBe(source.statistics.lifetime.botCapInfinityPoints)
    expect(next.statistics.lifetime.botCapOverflowRewards).toBe(source.statistics.lifetime.botCapOverflowRewards + 1n)
    expect(next.avocado.overflowPoints).toBe(4n)
    expect(deriveAvocadoMultiplier(next).total).toBe(1)
    expect(hasReachedOverflow(next)).toBe(false)
    expect(applyCanonicalOverflowReset(next).ok).toBe(false)
  })

  test.each([0, OVERFLOW_BOT_CAP * (1 - Number.EPSILON), NaN, Infinity, -1])('rejects non-qualifying bot balance %s without a reward', (bots) => {
    expect(applyCanonicalOverflowReset(lateGame(bots)).ok).toBe(false)
  })

  test('honours saved eligibility after spending bots, but never rewards invalid numerical state', () => {
    const source = lateGame(1)
    const pending = { ...source, infinity: { ...source.infinity, botCapTransitionPending: true } }
    expect(applyCanonicalOverflowReset(pending).ok).toBe(true)
    expect(applyCanonicalOverflowReset({ ...pending, dyson: { ...pending.dyson, bots: Infinity } }).ok).toBe(false)
  })

  test('requires room for a whole point before resetting', () => {
    const source = lateGame()
    expect(applyCanonicalOverflowReset({ ...source, avocado: { ...source.avocado, overflowPoints: DISCRETE_MAXIMUM } }))
      .toEqual({ ok: false, code: 'OVERFLOW_POINTS_MAXED' })
  })

  test('an overshooting legacy balance records eligibility without awarding points', () => {
    const source = lateGame(Number.MAX_VALUE)
    const pending = evaluateCanonicalBotCapCheckpoint(source)
    expect(pending.action).toMatchObject({ kind: 'persist', checkpoint: 'pending' })
    expect(pending.candidateState.dyson.bots).toBe(OVERFLOW_BOT_CAP)
    expect(pending.candidateState.infinity.points).toBe(source.infinity.points)
    expect(pending.candidateState.avocado.overflowPoints).toBe(3n)
    expect(evaluateCanonicalBotCapCheckpoint(pending.candidateState).action.kind).toBe('continue')
  })
})

const rates: DysonProductionArrivalRates = {
  money: 1e290, science: 1e280, panels: 0, bots: 2e242,
  assembly_lines: 0, ai_managers: 0, servers: 0, data_centers: 0, planets: 0,
  matrioshka_brains: 0, birch_planets: 0,
}

describe('shared gameplay bot boundary', () => {
  test('caps passive and Stellar settlement independently without capping other resources', () => {
    const source = lateGame(3e242)
    const arrivals = applyDysonProductionArrivals(source, rates, 1)
    expect(arrivals.dyson.bots).toBe(OVERFLOW_BOT_CAP)
    expect(arrivals.dyson.money).toBeGreaterThan(OVERFLOW_BOT_CAP)
    const settled = applyCanonicalSkillIntervalEffects(source, arrivals, {
      seconds: 1, botProductionPerSecond: rates.bots, stellarBotsPerSecond: 0.5e242,
      stellarPlanetsPerSecond: 1, scienceBoostPerSecond: 0, moneyUpgradePerSecond: 0,
    })
    expect(settled.dyson.bots).toBe(OVERFLOW_BOT_CAP)
    expect(settled.dyson.facilities.planets[0]).toBeCloseTo(source.dyson.facilities.planets[0] + 1, 12)
  })

  test.each([false, true])('caps manual Tinker completion including repeat=%s', (repeat) => {
    const source = lateGame(repeat ? OVERFLOW_BOT_CAP * 2 : 3e242)
    const stats = { botYield: 2e242, assemblyYield: 0, cooldownSeconds: 1 }
    const started = startCanonicalTinker(source, createCanonicalTinkerRuntimeState(), stats, repeat)
    const completed = advanceCanonicalTinker(source, started.runtime, stats, 20)
    expect(completed.state.dyson.bots).toBe(OVERFLOW_BOT_CAP)
    expect(completed.botsGranted).toBe(Math.max(0, OVERFLOW_BOT_CAP - source.dyson.bots))
  })

  test('keeps the ordinary Infinity ceiling below Overflow before Break the Loop', () => {
    const source = lateGame(1)
    const state = { ...source, quantum: { ...source.quantum, unlocks: { ...source.quantum.unlocks, breakTheLoop: false } } }
    expect(applyDysonProductionArrivals(state, rates, 1).dyson.bots).toBe(ordinaryInfinityBotThreshold(state.quantum.divisionsPurchased))
  })

  test('predicts Overflow from net Stellar funding rather than gross bot production', () => {
    const infinity = createBasicDysonInfinityState({ breakTheLoop: true, breakTarget: 1_100n })
    const horizon = timeToNextInfinityEventAfterStellarSettlement(3e242, 2e242, 1e242, 1, infinity, 10, 0, OVERFLOW_BOT_CAP)
    expect(horizon).toBeCloseTo(1, 12)
    expect(horizon).toBeGreaterThanOrEqual(1)
  })
})
