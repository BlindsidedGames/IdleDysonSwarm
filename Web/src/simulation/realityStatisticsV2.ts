import type {
  SimulationStatisticsStateV2,
  SimulationTotalsStateV2,
  StatisticsWindowStateV2,
} from '../game-state/typesV2'
import {
  GAME_DECIMAL_ZERO,
  addGameDecimals,
  cloneGameDecimal,
  compareGameDecimals,
  floorGameDecimal,
  gameDecimalFromNumber,
  isGameDecimal,
  multiplyGameDecimals,
  subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'

const TRACKING_STARTED_MARKER_V2 = 'tracked-since-update'

export interface RealityStatisticsDeltaV2 {
  readonly workersGenerated: GameDecimal
  readonly workerGenerationStartProgress: number
  readonly generationPerSecond: GameDecimal
  readonly automaticInfluence: GameDecimal
  readonly manualInfluence: GameDecimal
  readonly stalledSeconds: number
}

/**
 * Records one already-materialized Reality interval. The recent bucket remains
 * an additive publication accumulator; its presentation/reset owner may clear
 * it later. That makes caller partitioning observationally irrelevant.
 */
export function recordRealityStatisticsSegmentV2(
  statistics: Readonly<SimulationStatisticsStateV2>,
  seconds: number,
  delta: Readonly<RealityStatisticsDeltaV2>,
): Readonly<SimulationStatisticsStateV2> {
  const capturedDelta = captureDelta(delta)
  validateDelta(seconds, capturedDelta)
  const start = statistics.trackedSimulatedSeconds
  const end = finiteAdd(start, seconds, 'Reality tracked simulation time')
  return Object.freeze({
    ...statistics,
    trackedSinceUpdate: true,
    trackingStartedMarker: statistics.trackedSinceUpdate
      ? statistics.trackingStartedMarker
      : TRACKING_STARTED_MARKER_V2,
    trackedSimulatedSeconds: end,
    lifetime: addTotals(statistics.lifetime, seconds, capturedDelta),
    currentQuantumRun: addTotals(statistics.currentQuantumRun, seconds, capturedDelta),
    recentProcessedSegment: addTotals(
      statistics.recentProcessedSegment,
      seconds,
      capturedDelta,
    ),
    minuteWindows: recordWindow(
      statistics.minuteWindows,
      60,
      start,
      end,
      capturedDelta,
    ),
    halfHourWindows: recordWindow(
      statistics.halfHourWindows,
      1_800,
      start,
      end,
      capturedDelta,
    ),
    dailyWindows: recordWindow(
      statistics.dailyWindows,
      86_400,
      start,
      end,
      capturedDelta,
    ),
  })
}

function captureDelta(value: unknown): Readonly<RealityStatisticsDeltaV2> {
  if (
    typeof value !== 'object' ||
    value === null ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError('Reality statistics delta must be a closed plain object.')
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(descriptors)
  const expected = [
    'workersGenerated',
    'workerGenerationStartProgress',
    'generationPerSecond',
    'automaticInfluence',
    'manualInfluence',
    'stalledSeconds',
  ] as const
  if (
    keys.length !== expected.length ||
    expected.some((key) => {
      const descriptor = descriptors[key]
      return descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)
    }) ||
    keys.some((key) => typeof key !== 'string' || !expected.includes(key as typeof expected[number]))
  ) {
    throw new TypeError('Reality statistics delta must contain exactly its data fields.')
  }
  return Object.freeze({
    workersGenerated: descriptors.workersGenerated!.value as GameDecimal,
    workerGenerationStartProgress:
      descriptors.workerGenerationStartProgress!.value as number,
    generationPerSecond: descriptors.generationPerSecond!.value as GameDecimal,
    automaticInfluence: descriptors.automaticInfluence!.value as GameDecimal,
    manualInfluence: descriptors.manualInfluence!.value as GameDecimal,
    stalledSeconds: descriptors.stalledSeconds!.value as number,
  })
}

function validateDelta(
  seconds: number,
  delta: Readonly<RealityStatisticsDeltaV2>,
): void {
  if (!Number.isFinite(seconds) || seconds < 0 || Object.is(seconds, -0)) {
    throw new RangeError('Reality statistics seconds must be finite and non-negative.')
  }
  if (
    !isGameDecimal(delta.workersGenerated) ||
    !isGameDecimal(delta.generationPerSecond) ||
    !isGameDecimal(delta.automaticInfluence) ||
    !isGameDecimal(delta.manualInfluence)
  ) {
    throw new TypeError('Reality statistics resource deltas must be GameDecimals.')
  }
  if (
    !Number.isFinite(delta.workerGenerationStartProgress) ||
    delta.workerGenerationStartProgress < 0 ||
    delta.workerGenerationStartProgress >= 1 ||
    Object.is(delta.workerGenerationStartProgress, -0)
  ) {
    throw new RangeError('Reality statistics starting progress must be in [0, 1).')
  }
  if (
    !Number.isFinite(delta.stalledSeconds) ||
    delta.stalledSeconds < 0 ||
    delta.stalledSeconds > seconds ||
    Object.is(delta.stalledSeconds, -0)
  ) {
    throw new RangeError('Reality statistics stall time must be within the interval.')
  }
}

function addTotals(
  source: Readonly<SimulationTotalsStateV2>,
  seconds: number,
  delta: Readonly<RealityStatisticsDeltaV2>,
): Readonly<SimulationTotalsStateV2> {
  return Object.freeze({
    ...source,
    realityWorkers: addGameDecimals(source.realityWorkers, delta.workersGenerated),
    automaticInfluence: addGameDecimals(
      source.automaticInfluence,
      delta.automaticInfluence,
    ),
    manualInfluence: addGameDecimals(source.manualInfluence, delta.manualInfluence),
    realityCapacityStallSeconds: finiteAdd(
      source.realityCapacityStallSeconds,
      delta.stalledSeconds,
      'Reality capacity stall time',
    ),
    simulatedSeconds: finiteAdd(
      source.simulatedSeconds,
      seconds,
      'Reality simulated time',
    ),
  })
}

function recordWindow(
  source: readonly Readonly<StatisticsWindowStateV2>[],
  widthSeconds: number,
  segmentStartSeconds: number,
  segmentEndSeconds: number,
  delta: Readonly<RealityStatisticsDeltaV2>,
): readonly Readonly<StatisticsWindowStateV2>[] {
  const changed = new Map<number, Readonly<StatisticsWindowStateV2>>()
  const read = (index: number): Readonly<StatisticsWindowStateV2> =>
    changed.get(index) ?? source[index]!
  if (segmentEndSeconds > segmentStartSeconds) {
    const lastPoint = Math.max(
      segmentStartSeconds,
      segmentEndSeconds - Math.max(1e-9, Math.abs(segmentEndSeconds) * 1e-15),
    )
    const firstSequence = windowSequence(segmentStartSeconds, widthSeconds)
    const lastSequence = windowSequence(lastPoint, widthSeconds)
    const retainedFirst = maximumBigInt(
      firstSequence,
      lastSequence - BigInt(source.length) + 1n,
    )
    for (
      let sequence = retainedFirst;
      sequence <= lastSequence;
      sequence += 1n
    ) {
      const index = Number(sequence % BigInt(source.length))
      const bucket = prepareWindow(read(index), sequence)
      const windowStart = Number(sequence) * widthSeconds
      const windowEnd = windowStart + widthSeconds
      const overlap = Math.max(
        0,
        Math.min(segmentEndSeconds, windowEnd) -
          Math.max(segmentStartSeconds, windowStart),
      )
      changed.set(index, Object.freeze({
        ...bucket,
        simulatedSeconds: finiteAdd(
          bucket.simulatedSeconds,
          overlap,
          'Reality statistics window time',
        ),
        realityWorkers: addGameDecimals(
          bucket.realityWorkers,
          generatedBetween(
            delta,
            Math.max(0, Math.max(segmentStartSeconds, windowStart) - segmentStartSeconds),
            Math.max(0, Math.min(segmentEndSeconds, windowEnd) - segmentStartSeconds),
          ),
        ),
      }))
    }
  }
  if (changed.size === 0) return source
  const result = source.slice()
  for (const [index, bucket] of changed) result[index] = bucket
  return Object.freeze(result)
}

function generatedBetween(
  delta: Readonly<RealityStatisticsDeltaV2>,
  startSeconds: number,
  endSeconds: number,
): GameDecimal {
  const start = cumulativeGenerated(delta, startSeconds)
  const end = cumulativeGenerated(delta, endSeconds)
  return compareGameDecimals(end, start) <= 0
    ? cloneGameDecimal(GAME_DECIMAL_ZERO)
    : subtractGameDecimals(end, start)
}

function cumulativeGenerated(
  delta: Readonly<RealityStatisticsDeltaV2>,
  elapsedSeconds: number,
): GameDecimal {
  if (elapsedSeconds <= 0) return cloneGameDecimal(GAME_DECIMAL_ZERO)
  const generated = floorGameDecimal(addGameDecimals(
    gameDecimalFromNumber(delta.workerGenerationStartProgress),
    multiplyGameDecimals(
      delta.generationPerSecond,
      gameDecimalFromNumber(elapsedSeconds),
    ),
  ))
  return compareGameDecimals(generated, delta.workersGenerated) > 0
    ? cloneGameDecimal(delta.workersGenerated)
    : generated
}

function windowSequence(seconds: number, widthSeconds: number): bigint {
  return BigInt(Math.floor(Math.max(0, seconds) / widthSeconds))
}

function prepareWindow(
  window: Readonly<StatisticsWindowStateV2>,
  sequence: bigint,
): Readonly<StatisticsWindowStateV2> {
  if (window.sequence === sequence) return window
  return Object.freeze({
    ...window,
    sequence,
    simulatedSeconds: 0,
    infinityCount: 0n,
    infinityPoints: cloneGameDecimal(GAME_DECIMAL_ZERO),
    dreamResetCount: 0n,
    strangeMatter: cloneGameDecimal(GAME_DECIMAL_ZERO),
    realityWorkers: cloneGameDecimal(GAME_DECIMAL_ZERO),
  })
}

function maximumBigInt(left: bigint, right: bigint): bigint {
  return left > right ? left : right
}

function finiteAdd(left: number, right: number, label: string): number {
  const value = left + right
  if (!Number.isFinite(value)) throw new RangeError(`${label} overflowed.`)
  return value
}
