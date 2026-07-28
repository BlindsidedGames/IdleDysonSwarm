import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type {
  CanonicalGameStateV1,
  SimulationTotalsState,
  StatisticsWindowState,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { DISCRETE_MAXIMUM } from './numeric'
import {
  advanceRealityWorkers,
  gatherRealityInfluence,
  readRealityWorkerTuning,
} from './realityWorkers'

const fixtureText = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function neutralState(): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixtureText).prepared,
  ).state
  return {
    ...source,
    reality: {
      ...source.reality,
      universeDesignationCount: 0n,
      workersReady: 0n,
      workerGenerationProgress: 0,
      influence: 0n,
      autoGather: false,
    },
    quantum: {
      ...source.quantum,
      influenceSpeedBonus: 0n,
    },
    statistics: {
      ...source.statistics,
      trackedSinceUpdate: true,
      trackingStartedMarker: 'tracked-since-update',
      trackedSimulatedSeconds: 0,
      lifetime: emptyTotals(),
      currentQuantumRun: emptyTotals(),
      recentProcessedSegment: emptyTotals(),
      minuteWindows: emptyWindows(source.statistics.minuteWindows),
      halfHourWindows: emptyWindows(
        source.statistics.halfHourWindows,
      ),
      dailyWindows: emptyWindows(source.statistics.dailyWindows),
    },
  }
}

describe('Reality worker generation', () => {
  test('reads the authored worker tuning export', () => {
    expect(readRealityWorkerTuning()).toEqual({
      workerBatchSize: 128n,
      baseWorkerGenerationSpeed: 4,
    })
  })

  test('adds the Quantum speed bonus using Unity float precision', () => {
    const state = neutralState()
    const result = advanceRealityWorkers(
      {
        ...state,
        reality: {
          ...state.reality,
          autoGather: true,
          workerGenerationProgress: 0.25,
        },
        quantum: {
          ...state.quantum,
          influenceSpeedBonus: 3n,
        },
      },
      0.25,
    )

    expect(result.status).toBe('success')
    expect(result.generationPerSecond).toBe(7)
    expect(result.workersGenerated).toBe(2n)
    expect(result.automaticInfluence).toBe(2n)
    expect(result.state.reality.influence).toBe(2n)
    expect(result.state.reality.workerGenerationProgress).toBe(0)
    expect(result.state.reality.universeDesignationCount).toBe(2n)
  })

  test('does not apply Dream Double Time to Reality workers', () => {
    const state = neutralState()
    const boosted = {
      ...state,
      reality: { ...state.reality, autoGather: true },
      timeline: {
        ...state.timeline,
        doubleTime: {
          unlocked: true,
          enabled: true,
          bankSeconds: 10_000,
          rate: 10,
        },
      },
    }

    const normal = advanceRealityWorkers(
      {
        ...state,
        reality: { ...state.reality, autoGather: true },
      },
      1,
    )
    const withDoubleTime = advanceRealityWorkers(boosted, 1)

    expect(withDoubleTime.state.reality).toEqual(normal.state.reality)
    expect(withDoubleTime.workersGenerated).toBe(4n)
  })

  test('preserves fractional generation across partitioned advances', () => {
    const state = {
      ...neutralState(),
      reality: {
        ...neutralState().reality,
        autoGather: true,
        workerGenerationProgress: 0.25,
      },
      quantum: {
        ...neutralState().quantum,
        influenceSpeedBonus: 3n,
      },
    }
    const whole = advanceRealityWorkers(state, 1.2)
    const first = advanceRealityWorkers(state, 0.5)
    const second = advanceRealityWorkers(first.state, 0.7)

    expect(second.state.reality.influence).toBe(
      whole.state.reality.influence,
    )
    expect(second.state.reality.universeDesignationCount).toBe(
      whole.state.reality.universeDesignationCount,
    )
    expect(
      second.state.reality.workerGenerationProgress,
    ).toBeCloseTo(
      whole.state.reality.workerGenerationProgress,
      12,
    )
    expect(second.state.reality.influence).toBe(8n)
    expect(second.state.reality.workerGenerationProgress).toBeCloseTo(
      0.65,
      12,
    )
  })

  test('caps manual workers and reports the unused interval as stall', () => {
    const state = neutralState()
    const result = advanceRealityWorkers(
      {
        ...state,
        reality: {
          ...state.reality,
          workersReady: 127n,
          workerGenerationProgress: 0.5,
        },
        quantum: {
          ...state.quantum,
          influenceSpeedBonus: 6n,
        },
      },
      10,
    )

    expect(result.state.reality.workersReady).toBe(128n)
    expect(result.workersGenerated).toBe(1n)
    expect(result.stalledSeconds).toBeCloseTo(9.9, 12)
    expect(result.state.reality.workerGenerationProgress).toBe(0)
    expect(result.state.statistics).toBe(state.statistics)
  })

  test('counts generated workers but only credits remaining Influence capacity', () => {
    const state = neutralState()
    const result = advanceRealityWorkers(
      {
        ...state,
        reality: {
          ...state.reality,
          autoGather: true,
          influence: DISCRETE_MAXIMUM - 2n,
        },
        quantum: {
          ...state.quantum,
          influenceSpeedBonus: 6n,
        },
      },
      1,
    )

    expect(result.workersGenerated).toBe(10n)
    expect(result.automaticInfluence).toBe(2n)
    expect(result.state.reality.influence).toBe(DISCRETE_MAXIMUM)
    expect(result.state.reality.universeDesignationCount).toBe(10n)
    expect(result.state.statistics).toBe(state.statistics)
  })
})

describe('manual Reality Influence gather', () => {
  test('consumes the full ready balance and credits one authored batch', () => {
    const state = neutralState()
    const result = gatherRealityInfluence({
      ...state,
      reality: {
        ...state.reality,
        universeDesignationCount: 300n,
        workersReady: 140n,
        influence: 12n,
      },
    })

    expect(result.status).toBe('success')
    expect(result.gathered).toBe(true)
    expect(result.amount).toBe(128n)
    expect(result.state.reality.workersReady).toBe(0n)
    expect(result.state.reality.influence).toBe(140n)
    expect(result.state.reality.universeDesignationCount).toBe(300n)
    expect(result.state.statistics.lifetime.manualInfluence).toBe(
      128n,
    )
    expect(result.state.statistics.trackedSimulatedSeconds).toBe(0)
  })

  test('fails atomically for a partial batch or saturated output', () => {
    const state = neutralState()
    const partialState: CanonicalGameStateV1 = {
      ...state,
      reality: { ...state.reality, workersReady: 127n },
    }
    const partial = gatherRealityInfluence(partialState)
    expect(partial.status).toBe('not-ready')
    expect(partial.state).toBe(partialState)

    const saturatedState: CanonicalGameStateV1 = {
      ...state,
      reality: {
        ...state.reality,
        workersReady: 128n,
        influence: DISCRETE_MAXIMUM - 127n,
      },
    }
    const saturated = gatherRealityInfluence(saturatedState)
    expect(saturated.status).toBe('output-maxed')
    expect(saturated.state).toBe(saturatedState)
  })

  test('fails closed when authored tuning is unavailable', () => {
    const state = neutralState()
    expect(advanceRealityWorkers(state, 1, null).status).toBe(
      'invalid-tuning',
    )
    expect(gatherRealityInfluence(state, null).status).toBe(
      'invalid-tuning',
    )
  })
})

function emptyTotals(): SimulationTotalsState {
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

function emptyWindows(
  source: readonly StatisticsWindowState[],
): readonly StatisticsWindowState[] {
  return source.map(() => ({
    sequence: 0n,
    simulatedSeconds: 0,
    infinityCount: 0n,
    infinityPoints: 0n,
    dreamResetCount: 0n,
    strangeMatter: 0n,
    realityWorkers: 0n,
  }))
}
