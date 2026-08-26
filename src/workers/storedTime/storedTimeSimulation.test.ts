import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { CanonicalRuntimeSession, type CanonicalRuntimeState } from '../../application/canonicalRuntimeSession'
import { gameDataCatalog } from '../../game-data/catalog'
import { prepareIdb1Save } from '../../save/prepare'
import { createCapturedInfinityAssetLookup, type CanonicalEventTimeContext } from '../../simulation/canonicalEventTimeModel'
import { SIMULATION_UPGRADE_DEFINITIONS } from '../../simulation/dreamEducationUpgrades'
import { REALITY_UPGRADE_DEFINITIONS } from '../../simulation/realityUpgrades'
import { StoredTimeSimulation } from './storedTimeSimulation'

const fixture = readFileSync(
  new URL('../../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url),
  'utf8',
)

describe('StoredTimeSimulation shared game-step replay', () => {
  test('is deterministic across worker chunking and conserves the requested bank', () => {
    const run = (budget: number) => finish(new StoredTimeSimulation({
      jobId: `chunk-${budget}`,
      state: runtimeWithStoredTime(10),
      requestedSeconds: 2,
      infinityMinimumCycleSeconds: 1 / 60,
      eventContext: context(),
    }), budget)
    const small = run(0.01)
    const large = run(1_000)
    expect(small.type).toBe('completed')
    expect(large.type).toBe('completed')
    if (small.type !== 'completed' || large.type !== 'completed') return
    expect({ ...small.candidate, tinker: undefined }).toEqual({
      ...large.candidate,
      tinker: undefined,
    })
    expect(small.consumedSeconds).toBe(2)
    expect(small.candidate.gameState.timeline.storedTimeAvailableSeconds).toBe(8)
    expect(small.progress.completedTicks).toBe(40)
  })

  test('uses permanent Double Time ownership as 2x whole-game speed', () => {
    const source = runtimeWithStoredTime(10)
    source.gameState = {
      ...source.gameState,
      timeline: {
        ...source.gameState.timeline,
        doubleTime: {
          unlocked: true,
          enabled: false,
          bankSeconds: 0,
          rate: 0,
        },
      },
    }
    const before = source.gameState.statistics.trackedSimulatedSeconds
    const terminal = finish(new StoredTimeSimulation({
      jobId: 'double-speed',
      state: source,
      requestedSeconds: 2,
      infinityMinimumCycleSeconds: 1 / 60,
      eventContext: context(),
    }), 1_000)
    expect(terminal.type).toBe('completed')
    if (terminal.type !== 'completed') return
    expect(
      terminal.candidate.gameState.statistics.trackedSimulatedSeconds - before,
    ).toBeCloseTo(4, 8)
    expect(terminal.consumedSeconds).toBe(2)
  })

  test('freezes Tinker while ordinary game-time domains advance', () => {
    const source = runtimeWithStoredTime(10)
    source.tinker = {
      running: true,
      repeat: true,
      cycleId: 7,
      elapsedSeconds: 0.1,
      effectiveManualLabour: false,
      cooldownSeconds: 0.5,
    }
    const beforeTinker = structuredClone(source.tinker)
    const beforeSeconds = source.gameState.statistics.trackedSimulatedSeconds
    const terminal = finish(new StoredTimeSimulation({
      jobId: 'domains',
      state: source,
      requestedSeconds: 1,
      infinityMinimumCycleSeconds: 1 / 60,
      eventContext: context(),
    }), 1_000)
    expect(terminal.type).toBe('completed')
    if (terminal.type !== 'completed') return
    expect(terminal.candidate.tinker).toEqual(beforeTinker)
    expect(terminal.candidate.gameState.statistics.trackedSimulatedSeconds)
      .toBeGreaterThan(beforeSeconds)
  })

  test('repeated Speed Ups halve only the remaining accuracy budget', () => {
    const source = runtimeWithStoredTime(86_400)
    source.gameState = {
      ...source.gameState,
      timeline: {
        ...source.gameState.timeline,
        processing: {
          ...source.gameState.timeline.processing,
          storedTimePreset: 'balanced',
        },
      },
    }
    const simulation = new StoredTimeSimulation({
      jobId: 'speed-up',
      state: source,
      requestedSeconds: 86_400,
      infinityMinimumCycleSeconds: 1 / 60,
      eventContext: context(),
    })
    expect(simulation.progress().remainingTicks).toBe(100_000)
    expect(simulation.speedUp()).toBe(true)
    expect(simulation.progress().remainingTicks).toBe(50_000)
    expect(simulation.progress().currentStepSeconds).toBeCloseTo(1.728)
    expect(simulation.speedUp()).toBe(true)
    expect(simulation.progress().remainingTicks).toBe(25_000)
    expect(simulation.progress().currentStepSeconds).toBeCloseTo(3.456)
  })

  test('cancellation returns no candidate for the application to commit', () => {
    const simulation = new StoredTimeSimulation({
      jobId: 'cancel',
      state: runtimeWithStoredTime(10),
      requestedSeconds: 2,
      infinityMinimumCycleSeconds: 1 / 60,
      eventContext: context(),
    })
    const terminal = simulation.step(1, true)
    expect(terminal).toMatchObject({ type: 'cancelled', jobId: 'cancel' })
    expect(terminal).not.toHaveProperty('candidate')
  })
})

function finish(simulation: StoredTimeSimulation, budget: number) {
  let terminal = simulation.step(budget, false)
  while (terminal === null) terminal = simulation.step(budget, false)
  return terminal
}

function context(): CanonicalEventTimeContext {
  return {
    mode: 'active',
    automationIntervalSeconds: 0.033,
    realityWorkerTuning: {
      workerBatchSize: 128n,
      baseWorkerGenerationSpeed: 4,
    },
    dreamResetDefinitions: SIMULATION_UPGRADE_DEFINITIONS,
    realityUpgradeDefinitions: REALITY_UPGRADE_DEFINITIONS,
    infinityResetAssetLookup: createCapturedInfinityAssetLookup(
      gameDataCatalog.assets,
    ),
  }
}

function runtimeWithStoredTime(seconds: number): CanonicalRuntimeState {
  const state = structuredClone(
    new CanonicalRuntimeSession(
      prepareIdb1Save(fixture).prepared,
      { entitlements: { permanentDoubleIp: false } },
    ).initialState,
  )
  return {
    ...state,
    gameState: {
      ...state.gameState,
      timeline: {
        ...state.gameState.timeline,
        eventClockInitialized: true,
        automationTimeUntilNextEvent: 0.033,
        storedTimeAvailableSeconds: seconds,
        storedTimeCapacitySeconds: Math.max(seconds, 86_400),
      },
    },
  }
}
