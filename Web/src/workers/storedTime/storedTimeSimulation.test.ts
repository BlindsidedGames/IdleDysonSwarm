import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { TransactionalSimulationEngine } from '../../core/simulationEngine'
import { prepareIdb1Save } from '../../save/prepare'
import {
  createCapturedInfinityAssetLookup,
  type CanonicalEventTimeContext,
} from '../../simulation/canonicalEventTimeModel'
import { SIMULATION_UPGRADE_DEFINITIONS } from '../../simulation/dreamEducationUpgrades'
import { REALITY_UPGRADE_DEFINITIONS } from '../../simulation/realityUpgrades'
import { createCanonicalGameEngineDefinition } from '../../application/canonicalGameApplication'
import {
  CanonicalRuntimeSession,
  type CanonicalRuntimeState,
} from '../../application/canonicalRuntimeSession'
import { StoredTimeSimulation } from './storedTimeSimulation'

const fixture = readFileSync(
  new URL(
    '../../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

describe('StoredTimeSimulation', () => {
  test('matches the canonical synchronous result across bounded chunks', () => {
    const source = runtimeWithStoredTime(10)
    const expectedEngine = new TransactionalSimulationEngine(
      structuredClone(source),
      createCanonicalGameEngineDefinition({ eventContext: context() }),
    )
    expect(expectedEngine.dispatch({
      expectedRevision: 0,
      command: {
        kind: 'internal.advance-stored-time',
        seconds: 2,
      },
    })).toMatchObject({ accepted: true, changed: true })

    const simulation = new StoredTimeSimulation({
      jobId: 'parity',
      state: source,
      requestedSeconds: 2,
      infinityMinimumCycleSeconds: 1 / 60,
      eventContext: context(),
    })
    let terminal = simulation.step(0.01, false)
    let turns = 1
    while (terminal === null && turns < 10_000) {
      terminal = simulation.step(0.01, false)
      turns += 1
    }

    expect(terminal).toMatchObject({ type: 'completed' })
    if (terminal?.type !== 'completed') return
    expect(turns).toBeGreaterThan(1)
    expect(terminal.candidate).toEqual(expectedEngine.snapshot().state)
    expect(terminal.consumedSeconds).toBe(2)
    expect(terminal.remainingSeconds).toBe(0)
    expect(terminal.progress.fraction).toBe(1)
  })

  test('discards a progressed candidate when cancellation is requested', () => {
    const source = runtimeWithStoredTime(100)
    Object.assign(source, {
      gameState: {
        ...source.gameState,
        timeline: {
          ...source.gameState.timeline,
          automationTimeUntilNextEvent: 0.01,
        },
      },
    })
    const before = structuredClone(source)
    const simulation = new StoredTimeSimulation({
      jobId: 'cancel',
      state: source,
      requestedSeconds: 100,
      infinityMinimumCycleSeconds: 1 / 60,
      eventContext: context(0.01),
    })

    expect(simulation.step(0.01, false)).toBeNull()
    expect(simulation.progress().computedSeconds).toBeGreaterThan(0)
    const terminal = simulation.step(0.01, true)

    expect(terminal).toMatchObject({
      type: 'cancelled',
      jobId: 'cancel',
    })
    expect(source).toEqual(before)
  })

  test('finishes a one-day bank through bounded representative groups', () => {
    const source = runtimeWithStoredTime(86_400)
    const eventContext = context(0.1)
    const simulation = new StoredTimeSimulation({
      jobId: 'large-bank',
      state: source,
      requestedSeconds: 86_400,
      infinityMinimumCycleSeconds: 1 / 60,
      eventContext,
    })

    let terminal = simulation.step(5, false)
    let turns = 1
    while (terminal === null && turns < 10_000) {
      terminal = simulation.step(5, false)
      turns += 1
    }

    expect(terminal).toMatchObject({ type: 'completed' })
    if (terminal?.type !== 'completed') return
    expect(turns).toBeLessThanOrEqual(4_097)
    expect(terminal.candidate.gameState.timeline.storedTimeAvailableSeconds)
      .toBe(0)
    expect(
      createCanonicalGameEngineDefinition({ eventContext })
        .validateState(terminal.candidate),
    ).toBeUndefined()
  }, 30_000)
})

function context(
  automationIntervalSeconds = 1,
): CanonicalEventTimeContext {
  return {
    automationIntervalSeconds,
    realityWorkerTuning: {
      workerBatchSize: 128n,
      baseWorkerGenerationSpeed: 4,
    },
    dreamResetDefinitions: SIMULATION_UPGRADE_DEFINITIONS,
    realityUpgradeDefinitions: REALITY_UPGRADE_DEFINITIONS,
    infinityResetAssetLookup: createCapturedInfinityAssetLookup([]),
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
        automationTimeUntilNextEvent: 1,
        storedTimeAvailableSeconds: seconds,
      },
    },
  }
}
