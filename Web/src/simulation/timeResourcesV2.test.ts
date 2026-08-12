import { describe, expect, test } from 'vitest'

import type { TimelineStateV2 } from '../game-state/typesV2'
import {
  gameDecimalFromCanonicalString,
  gameDecimalFromNumber,
} from '../math/gameDecimal'
import {
  applyAwayTimeGrant,
  prepareDreamDoubleTimeTick,
  resolveAwayTime,
} from './timeResources'
import {
  V2_STORED_TIME_MAXIMUM_SECONDS,
  advanceV2ActiveMaterialSegment,
  advanceV2TimeResourceSlice,
  applyV2ReturnedTime,
  completeV2StoredTimeInfinityUsage,
  resolveV2AwayTime,
  setV2DoubleTimeRate,
  upgradeV2StoredTimeCapacity,
  validateV2TimelineResources,
  withV2SuspensionMarker,
} from './timeResourcesV2'

const baseTimeline = Object.freeze({
  eventClockInitialized: true,
  automationTimeUntilNextEvent: 0.1,
  dysonAutomationTargetIndex: 0,
  researchAutomationTargetIndex: 0,
  infinityBoundaryRemaining: 1,
  infinityCycleSeconds: 0,
  infinityCycleStartingPoints: gameDecimalFromNumber(0),
  infinityHasPostResetStart: false,
  storedTimeAvailableSeconds: 80,
  storedTimeCapacitySeconds: 100,
  lastSuspendedAtLegacyText: null,
  doubleTime: Object.freeze({
    unlocked: true,
    enabled: true,
    bankSeconds: 10,
    rate: 2,
  }),
} satisfies TimelineStateV2)

function timelineWith(
  changes: Partial<TimelineStateV2> & {
    readonly doubleTime?: Partial<TimelineStateV2['doubleTime']>
  },
): Readonly<TimelineStateV2> {
  return Object.freeze({
    ...baseTimeline,
    ...changes,
    doubleTime: Object.freeze({
      ...baseTimeline.doubleTime,
      ...changes.doubleTime,
    }),
  })
}

describe('dormant V2 lifecycle time resources', () => {
  test('advances positive active time in the established clock-field order', () => {
    const actual = advanceV2ActiveMaterialSegment(baseTimeline, 0.05)
    expect(actual).toMatchObject({
      eventClockInitialized: true,
      automationTimeUntilNextEvent: 0.05,
      infinityBoundaryRemaining: 0.95,
      infinityCycleSeconds: 0.05,
    })
    expect(() => advanceV2ActiveMaterialSegment(baseTimeline, 0.25)).toThrow(
      'crosses an event boundary',
    )
    expect(() => advanceV2ActiveMaterialSegment(timelineWith({
      automationTimeUntilNextEvent: 10,
      infinityBoundaryRemaining: 10,
      doubleTime: { bankSeconds: 0.1, rate: 2 },
    }), 0.1)).toThrow('crosses an event boundary')
    expect(() => advanceV2ActiveMaterialSegment(timelineWith({
      eventClockInitialized: false,
    }), 0.05)).toThrow('resolve initialization')
    expect(() => advanceV2ActiveMaterialSegment(timelineWith({
      automationTimeUntilNextEvent: 0,
    }), 0.05)).toThrow('resolve a due boundary')
    expect(() => advanceV2ActiveMaterialSegment(baseTimeline, 0)).toThrow('positive')
    expect(() => advanceV2ActiveMaterialSegment(baseTimeline, Number.POSITIVE_INFINITY)).toThrow('finite')
  })

  test('matches V1 return-resource number authority with test-only approximate comparisons', () => {
    const v1Resolution = resolveAwayTime({
      nowUtcMilliseconds: 30_100,
      quitTimestamp: { status: 'valid', utcMilliseconds: 0 },
      startedTimestamp: { status: 'missing' },
    })
    const v2Resolution = resolveV2AwayTime({
      nowUtcMilliseconds: 30_100,
      quitTimestamp: { status: 'valid', utcMilliseconds: 0 },
      startedTimestamp: { status: 'missing' },
    })
    const v1 = applyAwayTimeGrant({
      bankSeconds: 80,
      capacitySeconds: 100,
      cheater: false,
      awaySeconds: v1Resolution.grantedSeconds,
      dreamDoubleTimeBankSeconds: 10,
    })
    const v2 = applyV2ReturnedTime(baseTimeline, v2Resolution)

    expect(v2.resolution.grantedSeconds).toBeCloseTo(v1Resolution.grantedSeconds, 14)
    expect(v2.timeline.storedTimeAvailableSeconds).toBeCloseTo(v1.bankSeconds, 14)
    expect(v2.timeline.doubleTime.bankSeconds).toBeCloseTo(
      v1.dreamDoubleTimeBankSeconds,
      14,
    )
    expect(v2.storedTimeCreditedSeconds).toBeCloseTo(v1.storedTimeCreditedSeconds, 14)
  })

  test('credits returned time only to banks in the two-stage Unity order', () => {
    const suspended = withV2SuspensionMarker(baseTimeline, 'legacy-utc')
    const resolution = resolveV2AwayTime({
      nowUtcMilliseconds: 30_000,
      quitTimestamp: { status: 'valid', utcMilliseconds: 0 },
      startedTimestamp: { status: 'missing' },
    })
    const result = applyV2ReturnedTime(suspended, resolution)

    expect(result.storedTimeCreditedSeconds).toBe(20)
    expect(result.timeline.storedTimeAvailableSeconds).toBe(100)
    expect(result.timeline.doubleTime.bankSeconds).toBe(60)
    expect(result.doubleTimeCreditedSeconds).toBe(50)
    expect(result.timeline.lastSuspendedAtLegacyText).toBeNull()
    expect(result.timeline.infinityCycleSeconds).toBe(
      suspended.infinityCycleSeconds,
    )
  })

  test('requires runtime nonblank suspension markers', () => {
    expect(() => withV2SuspensionMarker(baseTimeline, '   ')).toThrow('non-empty')
    expect(() => withV2SuspensionMarker(baseTimeline, 42 as never)).toThrow('non-empty')
  })

  test('handles missing and backward suspension sources without granting economy time', () => {
    const suspended = withV2SuspensionMarker(baseTimeline, 'legacy-utc')
    const missing = applyV2ReturnedTime(suspended, resolveV2AwayTime({
      nowUtcMilliseconds: 1_000,
      quitTimestamp: { status: 'missing' },
      startedTimestamp: { status: 'missing' },
    }))
    expect(missing.timeline.lastSuspendedAtLegacyText).toBe('legacy-utc')
    expect(missing.storedTimeCreditedSeconds).toBe(0)

    const backward = applyV2ReturnedTime(suspended, resolveV2AwayTime({
      nowUtcMilliseconds: 1_000,
      quitTimestamp: { status: 'valid', utcMilliseconds: 2_000 },
      startedTimestamp: { status: 'missing' },
    }))
    expect(backward.resolution.clockMovedBackward).toBe(true)
    expect(backward.timeline.lastSuspendedAtLegacyText).toBeNull()
    expect(backward.storedTimeCreditedSeconds).toBe(0)
  })

  test('captures closed away-time requests and accepts only issued resolutions', () => {
    let getterCalls = 0
    const hostileRequest = Object.defineProperty({
      quitTimestamp: { status: 'missing' },
      startedTimestamp: { status: 'missing' },
    }, 'nowUtcMilliseconds', {
      enumerable: true,
      get: () => {
        getterCalls += 1
        return 1_000
      },
    })
    expect(() => resolveV2AwayTime(hostileRequest as never)).toThrow(
      'enumerable data property',
    )
    expect(getterCalls).toBe(0)
    expect(() => resolveV2AwayTime({
      nowUtcMilliseconds: 1_000,
      quitTimestamp: { status: 'missing', extra: true } as never,
      startedTimestamp: { status: 'missing' },
    })).toThrow('closed shape')
    expect(() => resolveV2AwayTime({
      nowUtcMilliseconds: Number.MAX_VALUE,
      quitTimestamp: { status: 'valid', utcMilliseconds: -Number.MAX_VALUE },
      startedTimestamp: { status: 'missing' },
    })).toThrow('overflowed finite seconds')

    const forgedResolution = Object.freeze(Object.defineProperty({
      source: 'quit_timestamp',
      resolvedStartUtcMilliseconds: 0,
      nowUtcMilliseconds: 1_000,
      rawSeconds: 1,
      shouldConsumeSuspensionMarker: true,
      clockMovedBackward: false,
    }, 'grantedSeconds', {
      enumerable: true,
      get: () => {
        getterCalls += 1
        return 1
      },
    }))
    expect(() => applyV2ReturnedTime(baseTimeline, forgedResolution as never)).toThrow(
      'issued away-time resolution',
    )
    expect(getterCalls).toBe(0)
  })

  test('upgrades only a full stored-time bank and preserves the 42m invariant', () => {
    expect(upgradeV2StoredTimeCapacity(baseTimeline)).toMatchObject({
      upgraded: false,
      maximumReached: false,
    })
    const full = timelineWith({ storedTimeAvailableSeconds: 100 })
    const doubled = upgradeV2StoredTimeCapacity(full)
    expect(doubled).toMatchObject({ upgraded: true, maximumReached: false })
    expect(doubled.timeline.storedTimeAvailableSeconds).toBe(0)
    expect(doubled.timeline.storedTimeCapacitySeconds).toBe(200)

    const maximum = timelineWith({
      storedTimeAvailableSeconds: V2_STORED_TIME_MAXIMUM_SECONDS,
      storedTimeCapacitySeconds: V2_STORED_TIME_MAXIMUM_SECONDS,
    })
    expect(upgradeV2StoredTimeCapacity(maximum)).toMatchObject({
      timeline: maximum,
      upgraded: false,
      maximumReached: true,
    })
  })

  test('sets only closed integer Double Time rates', () => {
    expect(setV2DoubleTimeRate(baseTimeline, 10).doubleTime.rate).toBe(10)
    expect(setV2DoubleTimeRate(baseTimeline, 2)).toBe(baseTimeline)
    for (const rate of [-1, 1.5, 11, Number.NaN]) {
      expect(() => setV2DoubleTimeRate(baseTimeline, rate)).toThrow(
        'integer from 0 to 10',
      )
    }
  })

  test('exhausts stored and accelerated resources without a zero-time slice', () => {
    const source = timelineWith({
      storedTimeAvailableSeconds: 3,
      doubleTime: { bankSeconds: 2, rate: 2 },
    })
    const result = advanceV2TimeResourceSlice(source, 'stored-time', 10)
    expect(result).toMatchObject({
      status: 'ready',
      baseSimulationSeconds: 3,
      dreamSimulationSeconds: 5,
      doubleTimeBankConsumedSeconds: 2,
      storedTimeConsumedSeconds: 3,
    })
    if (result.status !== 'ready') throw new Error('Expected a ready slice.')
    expect(result.effectiveDreamMultiplier).toBeCloseTo(5 / 3, 14)
    expect(result.timeline.storedTimeAvailableSeconds).toBe(0)
    expect(result.timeline.doubleTime).toMatchObject({
      bankSeconds: 0,
      enabled: false,
    })
    expect(advanceV2TimeResourceSlice(
      result.timeline,
      'stored-time',
      1,
    )).toMatchObject({ status: 'exhausted' })
  })

  test('matches V1 Double Time with a test-only approximate multiplier and preserves rate zero', () => {
    const result = advanceV2TimeResourceSlice(baseTimeline, 'active', 3)
    const v1 = prepareDreamDoubleTimeTick(true, 10, 2, 3)
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') throw new Error('Expected a ready slice.')
    expect(result.doubleTimeBankConsumedSeconds).toBe(v1.bankConsumedSeconds)
    expect(result.effectiveDreamMultiplier).toBeCloseTo(v1.effectiveMultiplier, 14)
    expect(result.timeline.doubleTime.bankSeconds).toBe(4)

    const zeroRate = advanceV2TimeResourceSlice(
      timelineWith({ doubleTime: { bankSeconds: 10, rate: 0 } }),
      'active',
      3,
    )
    expect(zeroRate).toMatchObject({
      status: 'ready',
      doubleTimeActive: true,
      doubleTimeBankConsumedSeconds: 0,
      effectiveDreamMultiplier: 1,
      dreamSimulationSeconds: 3,
    })
    expect(zeroRate.timeline.doubleTime.bankSeconds).toBe(10)
    expect(() => advanceV2TimeResourceSlice(
      baseTimeline,
      'future-mode' as never,
      1,
    )).toThrow('unsupported')
  })

  test('is exact across active and stored-time partitions with shared operation order', () => {
    const source = timelineWith({
      storedTimeAvailableSeconds: 20,
      doubleTime: { bankSeconds: 20, rate: 2 },
    })
    for (const mode of ['active', 'stored-time'] as const) {
      const whole = advanceV2TimeResourceSlice(source, mode, 10)
      const first = advanceV2TimeResourceSlice(source, mode, 4)
      if (first.status !== 'ready') throw new Error('Expected first partition.')
      const second = advanceV2TimeResourceSlice(first.timeline, mode, 6)
      if (whole.status !== 'ready' || second.status !== 'ready') {
        throw new Error('Expected completed partitions.')
      }
      expect(second.timeline).toEqual(whole.timeline)
      expect(first.dreamSimulationSeconds + second.dreamSimulationSeconds).toBe(
        whole.dreamSimulationSeconds,
      )
      expect(
        first.storedTimeConsumedSeconds + second.storedTimeConsumedSeconds,
      ).toBe(whole.storedTimeConsumedSeconds)
    }
  })

  test('aggregates huge completed-cycle stored-time accounting analytically', () => {
    expect(completeV2StoredTimeInfinityUsage(
      2,
      3,
      5,
      gameDecimalFromNumber(0),
      7,
    )).toEqual({ currentCycleSeconds: 7, previousCycleSeconds: 3 })
    expect(completeV2StoredTimeInfinityUsage(
      2,
      3,
      5,
      gameDecimalFromNumber(1),
      7,
    )).toEqual({ currentCycleSeconds: 0, previousCycleSeconds: 7 })
    expect(completeV2StoredTimeInfinityUsage(
      2,
      3,
      5,
      gameDecimalFromCanonicalString('1e500'),
      7,
    )).toEqual({ currentCycleSeconds: 0, previousCycleSeconds: 7 })
  })

  test('fails closed on malformed V2 resource invariants', () => {
    expect(() => validateV2TimelineResources(timelineWith({
      storedTimeAvailableSeconds: 101,
    }))).toThrow('exceeds its capacity')
    expect(() => validateV2TimelineResources(timelineWith({
      storedTimeCapacitySeconds: 0,
    }))).toThrow('closed bounds')
    expect(() => validateV2TimelineResources(timelineWith({
      doubleTime: { bankSeconds: V2_STORED_TIME_MAXIMUM_SECONDS + 1 },
    }))).toThrow('independent maximum')
    expect(() => validateV2TimelineResources(timelineWith({
      doubleTime: { rate: 11 },
    }))).toThrow('integer from 0 to 10')
  })
})
