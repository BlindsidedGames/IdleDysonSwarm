import { expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../../application/firstRun/unityFirstRunSave'
import { CanonicalRuntimeSession } from '../../application/canonicalRuntimeSession'
import { createCanonicalGameEngineDefinition } from '../../application/canonicalGameApplication'
import { TransactionalSimulationEngine } from '../../core/simulationEngine'
import { createProductionEventContext } from '../../simulation/productionEventContext'
import { activeGameSpeed, realTimeDuration, realTimeRate } from './effectiveSpeed'

const initial = new CanonicalRuntimeSession(
  createUnityFirstRunPreparedSave({ startedAtUtc: '2026-10-05T00:00:00Z' }),
  { entitlements: { permanentDoubleIp: false } },
).initialState

// Protect the presentation/engine time contract, including conservative debit rounding.
// Existing engine tests cover rewards; this boundary covers what the player is shown.
test.each([
  { multiplier: 1, doubleTime: false, bank: 100, speed: 1 },
  { multiplier: 10, doubleTime: false, bank: 100, speed: 10 },
  { multiplier: 42, doubleTime: false, bank: 100, speed: 42 },
  { multiplier: 1, doubleTime: true, bank: 100, speed: 2 },
  { multiplier: 42, doubleTime: true, bank: 100, speed: 84 },
  { multiplier: 42, doubleTime: false, bank: 0, speed: 1 },
  { multiplier: 42, doubleTime: true, bank: 0.5, speed: 12 },
  { multiplier: 42, doubleTime: false, bank: 1e20, speed: 1 },
])('shows funded speed $speed at selected $multiplier with Double Time=$doubleTime and bank=$bank', scenario => {
  const runtime = structuredClone(initial)
  const timeline = runtime.gameState.timeline
  Object.assign(timeline, {
    storedTimeAvailableSeconds: scenario.bank,
    offlineBoost: { multiplier: scenario.multiplier },
    doubleTime: { ...timeline.doubleTime, unlocked: scenario.doubleTime },
    processing: { ...timeline.processing, activeIntervalMilliseconds: 100 },
  })
  const time = { storedTimeAvailableSeconds: scenario.bank, storedTimeCapacitySeconds: 1000, offlineBoost: timeline.offlineBoost }
  const speed = activeGameSpeed(time, timeline)
  expect(speed).toBeCloseTo(scenario.speed, 10)
  const engine = new TransactionalSimulationEngine(runtime, createCanonicalGameEngineDefinition({ eventContext: createProductionEventContext() }))
  const before = engine.snapshot().state.gameState.statistics.trackedSimulatedSeconds
  expect(engine.advanceBy(100).accepted).toBe(true)
  const after = engine.snapshot().state.gameState
  expect(after.statistics.trackedSimulatedSeconds - before).toBeCloseTo(scenario.speed * 0.1, 10)
  expect(realTimeRate(100_000, speed)).toBeCloseTo(scenario.speed * 100_000, 5)
  expect(realTimeDuration(10, speed)).toBeCloseTo(10 / scenario.speed, 10)
  if (after.timeline.storedTimeAvailableSeconds === 0) {
    expect(activeGameSpeed({ ...time, storedTimeAvailableSeconds: 0, offlineBoost: after.timeline.offlineBoost }, after.timeline)).toBe(scenario.doubleTime ? 2 : 1)
  }
})


test.each([2, 84])('keeps finite capped production and zero output readable at %ix', speed => {
  expect(realTimeRate(1e308, speed)).toBe(Number.MAX_VALUE)
  expect(realTimeRate(-1e308, speed)).toBe(-Number.MAX_VALUE)
  expect(realTimeRate(0, speed)).toBe(0)
})


test('preserves net production losses in skill previews at regular and accelerated speed', () => {
  expect(realTimeRate(-5, 1)).toBe(-5)
  expect(realTimeRate(-5, 42)).toBe(-210)
})
