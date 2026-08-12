import { describe, expect, test } from 'vitest'

import firstRunIdb1 from '../application/firstRun/generated/first-run-schema-12.idb1.txt?raw'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import { gameDecimalFromNumber } from '../math/gameDecimal'
import { prepareIdb1Save } from '../save/prepare'
import { recordRealityStatisticsSegmentV2 } from './realityStatisticsV2'

const baseStatistics = migratePreparedSaveToV2(
  prepareIdb1Save(firstRunIdb1).prepared,
  { kind: 'trusted-same-device' },
).state.statistics

function delta(workers: number, startProgress = 0, rate = 7) {
  return Object.freeze({
    workersGenerated: gameDecimalFromNumber(workers),
    workerGenerationStartProgress: startProgress,
    generationPerSecond: gameDecimalFromNumber(rate),
    automaticInfluence: gameDecimalFromNumber(0),
    manualInfluence: gameDecimalFromNumber(0),
    stalledSeconds: 0,
  })
}

describe('Reality V2 statistics recorder', () => {
  test('is exact across binary material partitions and freezes changed windows', () => {
    const whole = recordRealityStatisticsSegmentV2(baseStatistics, 1, delta(7))
    const first = recordRealityStatisticsSegmentV2(baseStatistics, 0.5, delta(3))
    const second = recordRealityStatisticsSegmentV2(first, 0.5, delta(4, 0.5))
    expect(second).toEqual(whole)
    expect(Object.isFrozen(whole)).toBe(true)
    expect(Object.isFrozen(whole.minuteWindows)).toBe(true)
    expect(Object.isFrozen(whole.minuteWindows[0])).toBe(true)
  })

  test.each([
    ['minuteWindows', 59.5],
    ['halfHourWindows', 1_799.5],
    ['dailyWindows', 86_399.5],
  ] as const)(
    'attributes generated workers exactly across a %s boundary and restart',
    (_window, trackedSimulatedSeconds) => {
      const source = Object.freeze({ ...baseStatistics, trackedSimulatedSeconds })
      const whole = recordRealityStatisticsSegmentV2(source, 1, delta(7))
      const first = recordRealityStatisticsSegmentV2(source, 0.5, delta(3))
      const restarted = recordRealityStatisticsSegmentV2(
        first,
        0.5,
        delta(4, 0.5),
      )
      expect(restarted).toEqual(whole)
    },
  )

  test('rejects accessor and signed-zero deltas without invoking getters', () => {
    let getterCalls = 0
    const hostile = Object.create(Object.prototype)
    for (const key of [
      'workersGenerated',
      'workerGenerationStartProgress',
      'generationPerSecond',
      'automaticInfluence',
      'manualInfluence',
      'stalledSeconds',
    ]) {
      Object.defineProperty(hostile, key, {
        enumerable: true,
        get() {
          getterCalls += 1
          return key === 'stalledSeconds' ? 0 : gameDecimalFromNumber(0)
        },
      })
    }
    expect(() => recordRealityStatisticsSegmentV2(baseStatistics, 1, hostile))
      .toThrow('exactly its data fields')
    expect(() => recordRealityStatisticsSegmentV2(baseStatistics, -0, delta(0)))
      .toThrow('finite and non-negative')
    expect(getterCalls).toBe(0)
  })
})
