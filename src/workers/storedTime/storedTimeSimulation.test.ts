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
import type {
  SimulationStatisticsState,
  SimulationTotalsState,
  StatisticsWindowState,
} from '../../game-state/types'
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

  test('commits its own bank while preserving Dream, Reality, and Dream Double Time state', () => {
    const source = runtimeWithStoredTime(10)
    source.gameState = {
      ...source.gameState,
      dream: {
        ...source.gameState.dream,
        education: {
          ...source.gameState.dream.education,
          engineering: {
            ...source.gameState.dream.education.engineering,
            active: true,
            complete: false,
            progress: 0,
            researchTime: 100,
          },
        },
      },
      reality: {
        ...source.gameState.reality,
        workerGenerationProgress: 0.25,
      },
      timeline: {
        ...source.gameState.timeline,
        doubleTime: {
          unlocked: true,
          enabled: true,
          bankSeconds: 10,
          rate: 2,
        },
      },
    }
    const before = {
      dream: structuredClone(source.gameState.dream),
      reality: structuredClone(source.gameState.reality),
      doubleTime: structuredClone(source.gameState.timeline.doubleTime),
      dyson: structuredClone(source.gameState.dyson),
    }
    const simulation = new StoredTimeSimulation({
      jobId: 'domain-policy',
      state: source,
      requestedSeconds: 2,
      infinityMinimumCycleSeconds: 1 / 60,
      eventContext: context(),
    })
    let terminal = simulation.step(0.01, false)
    while (terminal === null) terminal = simulation.step(0.01, false)

    expect(terminal.type).toBe('completed')
    if (terminal.type !== 'completed') return
    expect({
      dream: terminal.candidate.gameState.dream,
      reality: terminal.candidate.gameState.reality,
      doubleTime: terminal.candidate.gameState.timeline.doubleTime,
    }).toEqual({
      dream: before.dream,
      reality: before.reality,
      doubleTime: before.doubleTime,
    })
    expect(
      terminal.candidate.gameState.timeline.storedTimeAvailableSeconds,
    ).toBe(8)
    expect(terminal.candidate.gameState.dyson).not.toEqual(before.dyson)
  })

  test('preserves cumulative Dream and Reality statistics while recording a zero-event Stored Time segment', () => {
    const source = runtimeWithStoredTime(10)
    const seeded = seedExcludedDomainStatistics(
      source.gameState.statistics,
    )
    source.gameState = {
      ...source.gameState,
      statistics: seeded,
    }
    const simulation = new StoredTimeSimulation({
      jobId: 'statistics-policy',
      state: source,
      requestedSeconds: 2,
      infinityMinimumCycleSeconds: 1 / 60,
      eventContext: context(),
    })
    let terminal = simulation.step(0.01, false)
    while (terminal === null) terminal = simulation.step(0.01, false)

    expect(terminal.type).toBe('completed')
    if (terminal.type !== 'completed') return
    const statistics = terminal.candidate.gameState.statistics
    expect(excludedDomainTotals(statistics.lifetime)).toEqual(
      excludedDomainTotals(seeded.lifetime),
    )
    expect(excludedDomainTotals(statistics.currentQuantumRun)).toEqual(
      excludedDomainTotals(seeded.currentQuantumRun),
    )
    expect(excludedDomainTotals(statistics.recentProcessedSegment)).toEqual(
      excludedDomainTotals(emptyDomainTotals()),
    )
    expect(statistics.recentProcessedSegment.simulatedSeconds).toBeGreaterThan(
      0,
    )
    expect(statistics.trackedSimulatedSeconds).toBe(61)
    expect(excludedWindowTotals(statistics.minuteWindows[0]!)).toEqual({
      dreamResetCount: 5n,
      strangeMatter: 6n,
      realityWorkers: 7n,
    })
    expect(excludedWindowTotals(statistics.minuteWindows[1]!)).toEqual({
      dreamResetCount: 0n,
      strangeMatter: 0n,
      realityWorkers: 0n,
    })
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
    expect(simulation.diagnostics()).toMatchObject({
      executionKind: 'representative-groups',
      representativeGroupsPlanned: 4_096,
      representativeGroupsCompleted: 4_096,
      finalRemainderConsumedSeconds: 0,
      summary: {
        meteorDreamResets: 0n,
        realityWorkers: 0n,
      },
    })
  }, 30_000)

  test('keeps changed interval handling deterministic and bounded for one representative day', () => {
    const createSource = () => {
      const source = runtimeWithStoredTime(86_400)
      const owned = new Set([
        'androids',
        'pocketAndroids',
        'superRadiantScattering',
        'stellarSacrifices',
      ])
      return {
        ...source,
        gameState: {
          ...source.gameState,
          dyson: {
            ...source.gameState.dyson,
            money: 0,
            science: 0,
            bots: 0,
            workers: 0,
            researchers: 0,
            totalPanelsDecayed: 0,
            facilities: Object.fromEntries(
              Object.keys(source.gameState.dyson.facilities).map((id) => [
                id,
                [0, 0],
              ]),
            ) as CanonicalRuntimeState['gameState']['dyson']['facilities'],
            automation: {
              ...source.gameState.dyson.automation,
              enabledFacilities: Object.fromEntries(
                Object.keys(
                  source.gameState.dyson.automation.enabledFacilities,
                ).map((id) => [id, false]),
              ) as CanonicalRuntimeState['gameState']['dyson']['automation']['enabledFacilities'],
            },
          },
          skills: {
            ...source.gameState.skills,
            byId: Object.fromEntries(
              Object.entries(source.gameState.skills.byId).map(
                ([id, skill]) => [
                  id,
                  {
                    ...skill,
                    owned: owned.has(id),
                    timerSeconds: 0,
                  },
                ],
              ),
            ),
          },
        },
      } satisfies CanonicalRuntimeState
    }
    const run = () => {
      const simulation = new StoredTimeSimulation({
        jobId: 'representative-skills',
        state: createSource(),
        requestedSeconds: 86_400,
        infinityMinimumCycleSeconds: 1 / 60,
        eventContext: context(0.1),
      })
      let terminal = simulation.step(5, false)
      let turns = 1
      while (terminal === null && turns < 10_000) {
        terminal = simulation.step(5, false)
        turns += 1
      }
      if (terminal?.type !== 'completed') {
        throw new Error(
          `Stored Time ended after ${turns} turns: ${JSON.stringify(terminal)}`,
        )
      }
      expect(terminal.type).toBe('completed')
      expect(turns).toBeLessThanOrEqual(4_097)
      expect(simulation.diagnostics()).toMatchObject({
        executionKind: 'representative-groups',
        representativeGroupsPlanned: 4_096,
        representativeGroupsCompleted: 4_096,
      })
      return terminal.candidate
    }

    const first = run()
    const second = run()
    expect(first).toEqual(second)
    expect(first.gameState.skills.byId.androids?.timerSeconds).toBe(600)
    expect(first.gameState.skills.byId.pocketAndroids?.timerSeconds)
      .toBe(3_600)
    expect(
      first.gameState.skills.byId.superRadiantScattering?.timerSeconds,
    ).toBe(86_400)
  }, 30_000)
})

function context(
  automationIntervalSeconds = 1,
): CanonicalEventTimeContext {
  return {
    mode: 'active',
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

function seedExcludedDomainStatistics(
  source: Readonly<SimulationStatisticsState>,
): SimulationStatisticsState {
  const seedTotals = (
    totals: Readonly<SimulationTotalsState>,
    offset: bigint,
  ): SimulationTotalsState => ({
    ...totals,
    meteorDreamResets: offset + 1n,
    aiDreamResets: offset + 2n,
    globalWarmingDreamResets: offset + 3n,
    blackHoleDreamResets: offset + 4n,
    strangeMatter: offset + 5n,
    realityWorkers: offset + 6n,
    automaticInfluence: offset + 7n,
    manualInfluence: offset + 8n,
    realityCapacityStallSeconds: Number(offset) + 9,
  })
  const windows = source.minuteWindows.map((window, index) => ({
    ...window,
    sequence: BigInt(index),
    simulatedSeconds: 0,
    infinityCount: 0n,
    infinityPoints: 0n,
    dreamResetCount: index === 0 ? 5n : 0n,
    strangeMatter: index === 0 ? 6n : 0n,
    realityWorkers: index === 0 ? 7n : 0n,
  }))
  return {
    ...source,
    trackedSinceUpdate: true,
    trackingStartedMarker: 'tracked-since-update',
    trackedSimulatedSeconds: 59,
    lifetime: seedTotals(source.lifetime, 10n),
    currentQuantumRun: seedTotals(source.currentQuantumRun, 20n),
    recentProcessedSegment: {
      ...seedTotals(source.recentProcessedSegment, 30n),
      simulatedSeconds: 1,
    },
    minuteWindows: windows,
  }
}

function excludedDomainTotals(
  totals: Readonly<SimulationTotalsState>,
) {
  return {
    meteorDreamResets: totals.meteorDreamResets,
    aiDreamResets: totals.aiDreamResets,
    globalWarmingDreamResets: totals.globalWarmingDreamResets,
    blackHoleDreamResets: totals.blackHoleDreamResets,
    strangeMatter: totals.strangeMatter,
    realityWorkers: totals.realityWorkers,
    automaticInfluence: totals.automaticInfluence,
    manualInfluence: totals.manualInfluence,
    realityCapacityStallSeconds: totals.realityCapacityStallSeconds,
  }
}

function excludedWindowTotals(
  window: Readonly<StatisticsWindowState>,
) {
  return {
    dreamResetCount: window.dreamResetCount,
    strangeMatter: window.strangeMatter,
    realityWorkers: window.realityWorkers,
  }
}

function emptyDomainTotals(): SimulationTotalsState {
  return {
    ordinaryInfinityCount: 0n,
    breakInfinityCount: 0n,
    ordinaryInfinityPoints: 0n,
    breakInfinityPoints: 0n,
    botCapInfinityPoints: 0n,
    botCapOverflowRewards: 0n,
    meteorDreamResets: 0n,
    aiDreamResets: 0n,
    globalWarmingDreamResets: 0n,
    blackHoleDreamResets: 0n,
    strangeMatter: 0n,
    realityWorkers: 0n,
    automaticInfluence: 0n,
    manualInfluence: 0n,
    realityCapacityStallSeconds: 0,
    simulatedSeconds: 0,
  }
}
