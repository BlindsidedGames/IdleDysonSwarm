import { describe, expect, test } from 'vitest'
import type {
  SimulationStatisticsState,
  SimulationTotalsState,
  StatisticsWindowState,
} from '../game-state/types'
import { recordCanonicalStatisticsSegment } from './canonicalStatistics'
import {
  CONTINUOUS_MAXIMUM,
  DISCRETE_MAXIMUM,
} from './numeric'
import {
  createSimulationSummary,
  type SimulationPresentationSummary,
} from './types'

function totals(
  overrides: Partial<SimulationTotalsState> = {},
): SimulationTotalsState {
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
    ...overrides,
  }
}

function window(
  overrides: Partial<StatisticsWindowState> = {},
): StatisticsWindowState {
  return {
    sequence: 0n,
    simulatedSeconds: 0,
    infinityCount: 0n,
    infinityPoints: 0n,
    dreamResetCount: 0n,
    strangeMatter: 0n,
    realityWorkers: 0n,
    ...overrides,
  }
}

function windows(length: number): StatisticsWindowState[] {
  return Array.from({ length }, () => window())
}

function statistics(
  overrides: Partial<SimulationStatisticsState> = {},
): SimulationStatisticsState {
  return {
    trackedSinceUpdate: true,
    trackingStartedMarker: 'existing-marker',
    trackedSimulatedSeconds: 0,
    lifetime: totals(),
    currentQuantumRun: totals(),
    recentProcessedSegment: totals(),
    lastCompletedCycle: {
      valid: false,
      breakInfinity: false,
      durationSeconds: 0,
      reward: 0n,
      dreamCause: null,
    },
    minuteWindows: windows(60),
    halfHourWindows: windows(48),
    dailyWindows: windows(30),
    ...overrides,
  }
}

function summary(
  overrides: Partial<SimulationPresentationSummary> = {},
): SimulationPresentationSummary {
  return {
    ...createSimulationSummary(),
    ...overrides,
  }
}

describe('canonical combined statistics segment', () => {
  test('repairs Unity statistics shape and starts tracking deterministically', () => {
    const halfHour = windows(48) as (
      | StatisticsWindowState
      | null
    )[]
    halfHour[7] = null
    const malformed = {
      ...statistics(),
      trackedSinceUpdate: false,
      trackingStartedMarker: 'discarded-marker',
      lifetime: null,
      recentProcessedSegment: null,
      lastCompletedCycle: null,
      minuteWindows: [window({ infinityCount: 99n })],
      halfHourWindows: halfHour,
      dailyWindows: null,
    } as unknown as SimulationStatisticsState

    const result = recordCanonicalStatisticsSegment(
      malformed,
      0,
      summary(),
    )

    expect(result.trackedSinceUpdate).toBe(true)
    expect(result.trackingStartedMarker).toBe(
      'tracked-since-update',
    )
    expect(result.lifetime).toEqual(totals())
    expect(result.recentProcessedSegment).toEqual(totals())
    expect(result.lastCompletedCycle).toEqual(
      statistics().lastCompletedCycle,
    )
    expect(result.minuteWindows).toHaveLength(60)
    expect(result.minuteWindows[0].infinityCount).toBe(0n)
    expect(result.halfHourWindows).toHaveLength(48)
    expect(result.halfHourWindows[7]).toEqual(window())
    expect(result.dailyWindows).toHaveLength(30)
    expect(malformed.trackedSinceUpdate).toBe(false)
    expect(malformed.minuteWindows).toHaveLength(1)
  })

  test('records every combined summary field and places window metrics at the endpoint', () => {
    const source = statistics({
      trackedSimulatedSeconds: 59,
      recentProcessedSegment: totals({
        ordinaryInfinityCount: 99n,
        simulatedSeconds: 2,
      }),
    })
    const combined = summary({
      ordinaryInfinityCount: 1n,
      breakInfinityCount: 2n,
      ordinaryInfinityPoints: 3n,
      breakInfinityPoints: 5n,
      botCapInfinityPoints: 7n,
      botCapOverflowRewards: 11n,
      meteorDreamResets: 13n,
      aiDreamResets: 17n,
      globalWarmingDreamResets: 19n,
      blackHoleDreamResets: 23n,
      strangeMatter: 29n,
      realityWorkers: 31n,
      automaticInfluence: 37n,
      manualInfluence: 41n,
      realityCapacityStallSeconds: 0.5,
    })

    const result = recordCanonicalStatisticsSegment(
      source,
      2,
      combined,
    )

    expect(result.trackedSimulatedSeconds).toBe(61)
    expect(result.lifetime).toEqual({
      ...combined,
      simulatedSeconds: 2,
    })
    expect(result.currentQuantumRun).toEqual({
      ...combined,
      simulatedSeconds: 2,
    })
    expect(result.recentProcessedSegment).toEqual({
      ...combined,
      simulatedSeconds: 2,
    })
    expect(result.minuteWindows[0].simulatedSeconds).toBe(1)
    expect(result.minuteWindows[0].infinityCount).toBe(0n)
    expect(result.minuteWindows[1]).toEqual(
      window({
        sequence: 1n,
        simulatedSeconds: 1,
        infinityCount: 3n,
        infinityPoints: 15n,
        dreamResetCount: 72n,
        strangeMatter: 29n,
        realityWorkers: 31n,
      }),
    )
    expect(result.halfHourWindows[0]).toEqual(
      window({
        simulatedSeconds: 2,
        infinityCount: 3n,
        infinityPoints: 15n,
        dreamResetCount: 72n,
        strangeMatter: 29n,
        realityWorkers: 31n,
      }),
    )
    expect(source.trackedSimulatedSeconds).toBe(59)
    expect(source.minuteWindows[0]).toEqual(window())
    expect(result.minuteWindows).not.toBe(source.minuteWindows)
    expect(result.minuteWindows[2]).toBe(source.minuteWindows[2])
    expect(result.halfHourWindows[2]).toBe(
      source.halfHourWindows[2],
    )
    expect(result.dailyWindows[2]).toBe(source.dailyWindows[2])
  })

  test('reuses every historical bucket on an ordinary same-window segment', () => {
    const source = statistics({ trackedSimulatedSeconds: 10 })
    const result = recordCanonicalStatisticsSegment(
      source,
      0.1,
      summary(),
    )

    expect(result.minuteWindows[0]).not.toBe(source.minuteWindows[0])
    expect(result.halfHourWindows[0]).not.toBe(
      source.halfHourWindows[0],
    )
    expect(result.dailyWindows[0]).not.toBe(source.dailyWindows[0])
    for (let index = 1; index < source.minuteWindows.length; index += 1) {
      expect(result.minuteWindows[index]).toBe(source.minuteWindows[index])
    }
    for (let index = 1; index < source.halfHourWindows.length; index += 1) {
      expect(result.halfHourWindows[index]).toBe(
        source.halfHourWindows[index],
      )
    }
    for (let index = 1; index < source.dailyWindows.length; index += 1) {
      expect(result.dailyWindows[index]).toBe(source.dailyWindows[index])
    }
  })

  test('preserves boundary events until a completed recent segment is replaced', () => {
    const zeroDuration = recordCanonicalStatisticsSegment(
      statistics({
        recentProcessedSegment: totals({
          simulatedSeconds: 5,
          realityWorkers: 99n,
        }),
      }),
      0,
      summary({ manualInfluence: 128n }),
    )
    const accumulatedEvent = recordCanonicalStatisticsSegment(
      zeroDuration,
      0,
      summary({
        meteorDreamResets: 1n,
        strangeMatter: 4n,
      }),
    )
    const completed = recordCanonicalStatisticsSegment(
      accumulatedEvent,
      2,
      summary({
        realityWorkers: 8n,
        automaticInfluence: 8n,
      }),
    )
    const replacement = recordCanonicalStatisticsSegment(
      completed,
      1,
      summary({ realityWorkers: 4n }),
    )

    expect(zeroDuration.recentProcessedSegment).toEqual(
      totals({ manualInfluence: 128n }),
    )
    expect(accumulatedEvent.recentProcessedSegment).toEqual(
      totals({
        manualInfluence: 128n,
        meteorDreamResets: 1n,
        strangeMatter: 4n,
      }),
    )
    expect(completed.recentProcessedSegment).toEqual(
      totals({
        manualInfluence: 128n,
        meteorDreamResets: 1n,
        strangeMatter: 4n,
        realityWorkers: 8n,
        automaticInfluence: 8n,
        simulatedSeconds: 2,
      }),
    )
    expect(replacement.recentProcessedSegment).toEqual(
      totals({
        realityWorkers: 4n,
        simulatedSeconds: 1,
      }),
    )
  })

  test('clamps invalid duration into a zero-duration event', () => {
    const result = recordCanonicalStatisticsSegment(
      statistics({
        trackedSimulatedSeconds: 12,
      }),
      Number.NaN,
      summary({
        breakInfinityCount: 1n,
        breakInfinityPoints: 10n,
      }),
    )

    expect(result.trackedSimulatedSeconds).toBe(12)
    expect(result.lifetime.simulatedSeconds).toBe(0)
    expect(result.lifetime.breakInfinityCount).toBe(1n)
    expect(result.minuteWindows[0].simulatedSeconds).toBe(0)
    expect(result.minuteWindows[0].infinityCount).toBe(1n)
    expect(result.minuteWindows[0].infinityPoints).toBe(10n)
  })

  test('saturates totals and combined endpoint metrics', () => {
    const almostMaximum = DISCRETE_MAXIMUM - 1n
    const maximumTotals = totals({
      ordinaryInfinityCount: almostMaximum,
      breakInfinityCount: almostMaximum,
      ordinaryInfinityPoints: almostMaximum,
      breakInfinityPoints: almostMaximum,
      botCapInfinityPoints: almostMaximum,
      botCapOverflowRewards: almostMaximum,
      meteorDreamResets: almostMaximum,
      aiDreamResets: almostMaximum,
      globalWarmingDreamResets: almostMaximum,
      blackHoleDreamResets: almostMaximum,
      strangeMatter: almostMaximum,
      realityWorkers: almostMaximum,
      automaticInfluence: almostMaximum,
      manualInfluence: almostMaximum,
      realityCapacityStallSeconds: CONTINUOUS_MAXIMUM,
      simulatedSeconds: CONTINUOUS_MAXIMUM,
    })
    const maximumWindow = window({
      sequence: DISCRETE_MAXIMUM,
      infinityCount: almostMaximum,
      infinityPoints: almostMaximum,
      dreamResetCount: almostMaximum,
      strangeMatter: almostMaximum,
      realityWorkers: almostMaximum,
    })
    const maximumMinuteWindows = windows(60)
    const expectedIndex = Number(
      DISCRETE_MAXIMUM % BigInt(maximumMinuteWindows.length),
    )
    maximumMinuteWindows[expectedIndex] = maximumWindow
    const source = statistics({
      trackedSimulatedSeconds: CONTINUOUS_MAXIMUM,
      lifetime: maximumTotals,
      currentQuantumRun: maximumTotals,
      recentProcessedSegment: totals(),
      minuteWindows: maximumMinuteWindows,
    })
    const increments = summary({
      ordinaryInfinityCount: 2n,
      breakInfinityCount: 2n,
      ordinaryInfinityPoints: 2n,
      breakInfinityPoints: 2n,
      botCapInfinityPoints: 2n,
      botCapOverflowRewards: 2n,
      meteorDreamResets: 2n,
      aiDreamResets: 2n,
      globalWarmingDreamResets: 2n,
      blackHoleDreamResets: 2n,
      strangeMatter: 2n,
      realityWorkers: 2n,
      automaticInfluence: 2n,
      manualInfluence: 2n,
      realityCapacityStallSeconds: CONTINUOUS_MAXIMUM,
    })

    const result = recordCanonicalStatisticsSegment(
      source,
      CONTINUOUS_MAXIMUM,
      increments,
    )

    expect(result.trackedSimulatedSeconds).toBe(
      CONTINUOUS_MAXIMUM,
    )
    expect(result.lifetime).toEqual(
      totals({
        ordinaryInfinityCount: DISCRETE_MAXIMUM,
        breakInfinityCount: DISCRETE_MAXIMUM,
        ordinaryInfinityPoints: DISCRETE_MAXIMUM,
        breakInfinityPoints: DISCRETE_MAXIMUM,
        botCapInfinityPoints: DISCRETE_MAXIMUM,
        botCapOverflowRewards: DISCRETE_MAXIMUM,
        meteorDreamResets: DISCRETE_MAXIMUM,
        aiDreamResets: DISCRETE_MAXIMUM,
        globalWarmingDreamResets: DISCRETE_MAXIMUM,
        blackHoleDreamResets: DISCRETE_MAXIMUM,
        strangeMatter: DISCRETE_MAXIMUM + 1n,
        realityWorkers: DISCRETE_MAXIMUM,
        automaticInfluence: DISCRETE_MAXIMUM,
        manualInfluence: DISCRETE_MAXIMUM,
        realityCapacityStallSeconds: CONTINUOUS_MAXIMUM,
        simulatedSeconds: CONTINUOUS_MAXIMUM,
      }),
    )
    expect(result.minuteWindows[expectedIndex].sequence).toBe(
      DISCRETE_MAXIMUM,
    )
    expect(
      result.minuteWindows[expectedIndex].infinityCount,
    ).toBe(DISCRETE_MAXIMUM)
    expect(
      result.minuteWindows[expectedIndex].infinityPoints,
    ).toBe(DISCRETE_MAXIMUM)
    expect(
      result.minuteWindows[expectedIndex].dreamResetCount,
    ).toBe(DISCRETE_MAXIMUM)
    expect(
      result.minuteWindows[expectedIndex].strangeMatter,
    ).toBe(DISCRETE_MAXIMUM + 1n)
    expect(
      result.minuteWindows[expectedIndex].realityWorkers,
    ).toBe(DISCRETE_MAXIMUM)
  })

  test('retains Unity rolling-window time at an exact long-interval boundary', () => {
    const result = recordCanonicalStatisticsSegment(
      statistics(),
      90 * 60,
      summary({ ordinaryInfinityCount: 2n }),
    )
    const retainedMinuteSeconds = result.minuteWindows.reduce(
      (total, bucket) => total + bucket.simulatedSeconds,
      0,
    )

    expect(retainedMinuteSeconds).toBe(59 * 60)
    expect(result.minuteWindows[30].sequence).toBe(90n)
    expect(result.minuteWindows[30].simulatedSeconds).toBe(0)
    expect(result.minuteWindows[30].infinityCount).toBe(2n)
    expect(result.lifetime.simulatedSeconds).toBe(90 * 60)
  })
})
