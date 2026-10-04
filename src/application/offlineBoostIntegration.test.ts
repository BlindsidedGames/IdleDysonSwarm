import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { TransactionalSimulationEngine } from '../core/simulationEngine'
import { prepareIdb1Save } from '../save/prepare'
import { prepareImportedSaveText } from '../save/import'
import { serializeWebSave } from '../save/serialization'
import { createSpeedrunStatistics } from '../simulation/speedrunStatistics'
import { createProductionEventContext } from '../simulation/productionEventContext'
import { OVERFLOW_BOT_CAP } from '../simulation/overflowBoundary'
import { createCanonicalGameEngineDefinition } from './canonicalGameApplication'
import { CanonicalRuntimeSession } from './canonicalRuntimeSession'

const prepared = prepareIdb1Save(readFileSync(new URL('./firstRun/generated/first-run-schema-12.idb1.txt', import.meta.url), 'utf8')).prepared
const now = Date.UTC(2026, 9, 4)
function setup(bank = 10, multiplier = 42, doubleTime = false) {
  const session = new CanonicalRuntimeSession(prepared, { entitlements: { permanentDoubleIp: false }, nowUtcMilliseconds: () => now })
  const state = structuredClone(session.initialState)
  state.gameState = { ...state.gameState,
    infinity: { ...state.gameState.infinity, automaticResetEnabled: false },
    timeline: { ...state.gameState.timeline, storedTimeAvailableSeconds: bank,
      offlineBoost: { multiplier }, doubleTime: { ...state.gameState.timeline.doubleTime, unlocked: doubleTime } },
    statistics: { ...state.gameState.statistics, speedruns: createSpeedrunStatistics(new Date(now).toISOString(), true, now) },
  }
  const create = () => new TransactionalSimulationEngine(state, createCanonicalGameEngineDefinition({ eventContext: createProductionEventContext() }))
  return { state, session, create }
}

describe('bank-funded foreground speed through the authoritative engine', () => {
  test.each([false, true])('charges only excess base seconds, while Double Time=%s stacks separately', doubleTime => {
    const engine = setup(10, 42, doubleTime).create()
    const before = engine.snapshot().state.gameState
    expect(engine.advanceBy(200).accepted).toBe(true)
    const after = engine.snapshot().state.gameState
    expect(after.timeline.storedTimeAvailableSeconds).toBeCloseTo(1.8, 10)
    expect(after.statistics.trackedSimulatedSeconds - before.statistics.trackedSimulatedSeconds).toBeCloseTo(doubleTime ? 16.8 : 8.4, 10)
    expect(after.timeline.infinityCycleSeconds - before.timeline.infinityCycleSeconds).toBeCloseTo(0.2, 10)
    expect(after.statistics.speedruns?.activeSeconds).toBeCloseTo(0.2, 10)
    expect(after.statistics.speedruns?.storedTimeSeconds).toBeCloseTo(8.2, 10)
    expect(after.statistics.speedruns?.storedTime).toBe('yes')
    expect(after.infinity.storedTimeUsedThisCycleSeconds).toBeCloseTo(8.2, 10)
    expect(after.infinity.manualCalibrationObservedActiveSeconds).toBe(0)
  })

  test('bank-funded time advances an active player Tinker rather than freezing it as replay', () => {
    const engine = setup().create()
    expect(engine.dispatch({ expectedRevision: 0, command: { kind: 'tinker.start', repeat: false } }).accepted).toBe(true)
    const before = engine.snapshot().state
    expect(before.tinker.running).toBe(true)
    engine.advanceBy(33)
    const after = engine.snapshot().state
    expect(after.gameState.timeline.storedTimeAvailableSeconds).toBeCloseTo(8.647, 10)
    expect(after.tinker.elapsedSeconds).toBeGreaterThan(before.tinker.elapsedSeconds)
  })

  test('partial exhaustion consumes the last fraction in one tick, then advances normally', () => {
    const engine = setup(0.5).create()
    const before = engine.snapshot().state.gameState.statistics.trackedSimulatedSeconds
    engine.advanceBy(33)
    let state = engine.snapshot().state.gameState
    expect(state.timeline.storedTimeAvailableSeconds).toBe(0)
    expect(state.timeline.offlineBoost).toEqual({ multiplier: 1 })
    expect(state.statistics.trackedSimulatedSeconds - before).toBeCloseTo(0.533, 10)
    engine.advanceBy(33)
    state = engine.snapshot().state.gameState
    expect(state.statistics.trackedSimulatedSeconds - before).toBeCloseTo(0.566, 10)
    expect(state.statistics.speedruns?.storedTimeSeconds).toBe(0.5)
  })

  test.each([0, 1e20])('a bank of %s never creates unfunded progress when a debit cannot be represented', bank => {
    const engine = setup(bank).create()
    const before = engine.snapshot().state.gameState.statistics.trackedSimulatedSeconds
    engine.advanceBy(33)
    const after = engine.snapshot().state.gameState
    expect(after.timeline.storedTimeAvailableSeconds).toBe(bank)
    expect(after.timeline.offlineBoost?.multiplier).toBe(1)
    expect(after.statistics.trackedSimulatedSeconds - before).toBeCloseTo(0.033, 10)
    expect(after.statistics.speedruns?.storedTime).toBe('no')
  })

  test('a required durable bot-cap boundary consumes neither wall nor bank time', () => {
    const h = setup()
    h.state.gameState = { ...h.state.gameState,
      dyson: { ...h.state.gameState.dyson, bots: OVERFLOW_BOT_CAP },
      quantum: { ...h.state.gameState.quantum, unlocks: { ...h.state.gameState.quantum.unlocks, breakTheLoop: true } },
      infinity: { ...h.state.gameState.infinity, botCapTransitionPending: false, botCapRewardsGranted: false, inProgress: false },
    }
    const engine = h.create()
    const before = engine.snapshot().state.gameState.statistics.trackedSimulatedSeconds
    engine.advanceBy(33)
    const after = engine.snapshot().state.gameState
    expect(after.timeline.storedTimeAvailableSeconds).toBe(10)
    expect(after.timeline.offlineBoost?.multiplier).toBe(42)
    expect(after.statistics.trackedSimulatedSeconds).toBe(before)
    expect(after.statistics.speedruns?.storedTime).toBe('no')
  })

  test('reload resets the visible rate to 1× and regular speed never touches the bank', () => {
    const h = setup(10, 8)
    const engine = h.create()
    engine.advanceBy(33)
    const exported = serializeWebSave(h.session.prepare(engine.snapshot().state).copyValidatedState())
    const loaded = new CanonicalRuntimeSession(prepareImportedSaveText(exported, new Date(now).toISOString()), { entitlements: { permanentDoubleIp: false } }).initialState
    expect(loaded.gameState.timeline.offlineBoost).toEqual({ multiplier: 1 })
    expect(loaded.gameState.timeline.storedTimeAvailableSeconds).toBeCloseTo(9.769, 10)
    const reloadedEngine = new TransactionalSimulationEngine(loaded, createCanonicalGameEngineDefinition({ eventContext: createProductionEventContext() }))
    reloadedEngine.advanceBy(33)
    expect(reloadedEngine.snapshot().state.gameState.timeline.storedTimeAvailableSeconds).toBeCloseTo(9.769, 10)
    const changed = engine.dispatch({ expectedRevision: engine.snapshot().revision, command: { kind: 'time.set-offline-boost-multiplier', multiplier: 1 } })
    expect(changed.accepted).toBe(true)
    engine.advanceBy(33)
    expect(engine.snapshot().state.gameState.timeline.storedTimeAvailableSeconds).toBeCloseTo(9.769, 10)
  })

  test('selecting a funded rate immediately starts spending and selecting 1× stops it', () => {
    const engine = setup(10, 1).create()
    const choose = (multiplier: number) => engine.dispatch({ expectedRevision: engine.snapshot().revision, command: { kind: 'time.set-offline-boost-multiplier', multiplier } })
    expect(choose(8).accepted).toBe(true)
    engine.advanceBy(33)
    expect(engine.snapshot().state.gameState.timeline.storedTimeAvailableSeconds).toBeCloseTo(9.769, 10)
    expect(choose(1).accepted).toBe(true)
    engine.advanceBy(33)
    expect(engine.snapshot().state.gameState.timeline.storedTimeAvailableSeconds).toBeCloseTo(9.769, 10)
  })

  test.each([false, true])('empty or disabled storage rejects acceleration without publication (disabled=%s)', cheater => {
    const h = setup(cheater ? 10 : 0, 1)
    h.state.storedTimeCheater = cheater
    const engine = h.create()
    const before = engine.snapshot()
    expect(engine.dispatch({ expectedRevision: before.revision, command: { kind: 'time.set-offline-boost-multiplier', multiplier: 42 } }).accepted).toBe(false)
    expect(engine.snapshot()).toEqual(before)
  })

  test.each([0, 43, 1.5])('rejects invalid multiplier %s without changing bank or gameplay', multiplier => {
    const engine = setup().create()
    const before = engine.snapshot()
    expect(engine.dispatch({ expectedRevision: before.revision, command: { kind: 'time.set-offline-boost-multiplier', multiplier } }).accepted).toBe(false)
    expect(engine.snapshot()).toEqual(before)
  })

  test.each([false, true])('manual Infinity pauses; automatic Infinity continues (automatic=%s)', automatic => {
    const h = setup()
    h.state.gameState = { ...h.state.gameState,
      dyson: { ...h.state.gameState.dyson, bots: 42e18 },
      infinity: { ...h.state.gameState.infinity, automaticResetEnabled: automatic },
      timeline: { ...h.state.gameState.timeline, infinityCycleSeconds: 1 },
    }
    const engine = h.create()
    const result = automatic ? engine.advanceBy(33) : engine.dispatch({ expectedRevision: 0, command: { kind: 'infinity.request-reset' } })
    expect(result.accepted).toBe(true)
    const after = engine.snapshot().state.gameState
    expect(after.infinity.points).toBeGreaterThan(0n)
    expect(after.dyson.bots).toBeLessThan(42e18)
    if (automatic) expect(after.statistics.lifetime.ordinaryInfinityCount).toBe(1n)
    expect(after.timeline.offlineBoost?.multiplier).toBe(automatic ? 42 : 1)
    expect(after.statistics.recentActiveAutomaticInfinityCycles).toEqual([])
    expect(after.timeline.storedTimeAvailableSeconds).toBeCloseTo(automatic ? 8.647 : 10, 10)
  })
})
