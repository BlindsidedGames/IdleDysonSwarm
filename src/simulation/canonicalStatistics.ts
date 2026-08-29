import type {
  SimulationStatisticsState,
  SimulationTotalsState,
  StatisticsWindowState,
} from '../game-state/types'
import {
  addContinuous,
  addDiscrete,
  clampContinuous,
  floorToDiscrete,
} from './numeric'
import type { SimulationPresentationSummary } from './types'

const TRACKING_STARTED_MARKER = 'tracked-since-update'

/**
 * Immutably records the scheduler's single combined interval summary using the
 * same accounting and rolling-window boundary rules as Unity RecordSegment.
 */
export function recordCanonicalStatisticsSegment(
  statistics: Readonly<SimulationStatisticsState>,
  seconds: number,
  summary: Readonly<SimulationPresentationSummary>,
): SimulationStatisticsState {
  const shaped = ensureShape(statistics)
  const safeSeconds = clampContinuous(seconds)
  const segmentStart = shaped.trackedSimulatedSeconds
  const segmentEnd = addContinuous(segmentStart, safeSeconds)
  const recentBase =
    shaped.recentProcessedSegment.simulatedSeconds > 0
      ? createEmptySimulationTotals()
      : shaped.recentProcessedSegment

  return {
    ...shaped,
    trackedSimulatedSeconds: segmentEnd,
    lifetime: addTotals(shaped.lifetime, summary, safeSeconds),
    currentQuantumRun: addTotals(
      shaped.currentQuantumRun,
      summary,
      safeSeconds,
    ),
    recentProcessedSegment: addTotals(
      recentBase,
      summary,
      safeSeconds,
    ),
    minuteWindows: recordWindow(
      shaped.minuteWindows,
      60,
      segmentStart,
      segmentEnd,
      summary,
    ),
    halfHourWindows: recordWindow(
      shaped.halfHourWindows,
      1_800,
      segmentStart,
      segmentEnd,
      summary,
    ),
    dailyWindows: recordWindow(
      shaped.dailyWindows,
      86_400,
      segmentStart,
      segmentEnd,
      summary,
    ),
  }
}

function ensureShape(
  statistics: Readonly<SimulationStatisticsState>,
): SimulationStatisticsState {
  return {
    ...statistics,
    trackedSinceUpdate: true,
    trackingStartedMarker: statistics.trackedSinceUpdate
      ? statistics.trackingStartedMarker
      : TRACKING_STARTED_MARKER,
    lifetime: statistics.lifetime ?? createEmptySimulationTotals(),
    currentQuantumRun:
      statistics.currentQuantumRun ?? createEmptySimulationTotals(),
    recentProcessedSegment:
      statistics.recentProcessedSegment ?? createEmptySimulationTotals(),
    lastCompletedCycle:
      statistics.lastCompletedCycle ?? emptyCycle(),
    minuteWindows: ensureWindows(statistics.minuteWindows, 60),
    halfHourWindows: ensureWindows(
      statistics.halfHourWindows,
      48,
    ),
    dailyWindows: ensureWindows(statistics.dailyWindows, 30),
  }
}

function addTotals(
  totals: Readonly<SimulationTotalsState>,
  summary: Readonly<SimulationPresentationSummary>,
  seconds: number,
): SimulationTotalsState {
  return {
    ordinaryInfinityCount: addDiscrete(
      totals.ordinaryInfinityCount,
      summary.ordinaryInfinityCount,
    ),
    breakInfinityCount: addDiscrete(
      totals.breakInfinityCount,
      summary.breakInfinityCount,
    ),
    ordinaryInfinityPoints: addDiscrete(
      totals.ordinaryInfinityPoints,
      summary.ordinaryInfinityPoints,
    ),
    breakInfinityPoints: addDiscrete(
      totals.breakInfinityPoints,
      summary.breakInfinityPoints,
    ),
    botCapInfinityPoints: addDiscrete(
      totals.botCapInfinityPoints,
      summary.botCapInfinityPoints,
    ),
    botCapOverflowRewards: addDiscrete(
      totals.botCapOverflowRewards,
      summary.botCapOverflowRewards,
    ),
    meteorDreamResets: addDiscrete(
      totals.meteorDreamResets,
      summary.meteorDreamResets,
    ),
    aiDreamResets: addDiscrete(
      totals.aiDreamResets,
      summary.aiDreamResets,
    ),
    globalWarmingDreamResets: addDiscrete(
      totals.globalWarmingDreamResets,
      summary.globalWarmingDreamResets,
    ),
    blackHoleDreamResets: addDiscrete(
      totals.blackHoleDreamResets,
      summary.blackHoleDreamResets,
    ),
    strangeMatter: addContinuous(
      totals.strangeMatter,
      summary.strangeMatter,
    ),
    realityWorkers: addDiscrete(
      totals.realityWorkers,
      summary.realityWorkers,
    ),
    automaticInfluence: addContinuous(
      totals.automaticInfluence,
      summary.automaticInfluence,
    ),
    manualInfluence: addContinuous(
      totals.manualInfluence,
      summary.manualInfluence,
    ),
    realityCapacityStallSeconds: addContinuous(
      totals.realityCapacityStallSeconds,
      summary.realityCapacityStallSeconds,
    ),
    simulatedSeconds: addContinuous(
      totals.simulatedSeconds,
      seconds,
    ),
  }
}

function recordWindow(
  source: readonly StatisticsWindowState[],
  widthSeconds: number,
  segmentStartSeconds: number,
  segmentEndSeconds: number,
  summary: Readonly<SimulationPresentationSummary>,
): readonly StatisticsWindowState[] {
  const changed = new Map<number, StatisticsWindowState>()
  const readWindow = (index: number): StatisticsWindowState =>
    changed.get(index) ?? source[index]!
  const writeWindow = (
    index: number,
    bucket: StatisticsWindowState,
  ): void => {
    changed.set(index, bucket)
  }
  const start = clampContinuous(segmentStartSeconds)
  const end = Math.max(
    start,
    clampContinuous(segmentEndSeconds),
  )

  if (end > start) {
    const lastPoint = Math.max(
      start,
      end - Math.max(1e-9, Math.abs(end) * 1e-15),
    )
    const firstSequence = windowSequence(start, widthSeconds)
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
      const bucket = prepareWindow(readWindow(index), sequence)
      const windowStart = Number(sequence) * widthSeconds
      const windowEnd = addContinuous(windowStart, widthSeconds)
      const overlap = Math.max(
        0,
        Math.min(end, windowEnd) -
          Math.max(start, windowStart),
      )
      writeWindow(index, {
        ...bucket,
        simulatedSeconds: addContinuous(
          bucket.simulatedSeconds,
          overlap,
        ),
      })
    }
  }

  const eventSequence = windowSequence(end, widthSeconds)
  const eventIndex = Number(
    eventSequence % BigInt(source.length),
  )
  const eventBucket = prepareWindow(
    readWindow(eventIndex),
    eventSequence,
  )
  writeWindow(eventIndex, {
    ...eventBucket,
    infinityCount: addDiscrete(
      eventBucket.infinityCount,
      combinedInfinityCount(summary),
    ),
    infinityPoints: addDiscrete(
      eventBucket.infinityPoints,
      combinedInfinityPoints(summary),
    ),
    dreamResetCount: addDiscrete(
      eventBucket.dreamResetCount,
      combinedDreamResets(summary),
    ),
    strangeMatter: addContinuous(
      eventBucket.strangeMatter,
      summary.strangeMatter,
    ),
    realityWorkers: addDiscrete(
      eventBucket.realityWorkers,
      summary.realityWorkers,
    ),
  })
  if (changed.size === 0) return source
  const windows = source.slice()
  for (const [index, bucket] of changed) windows[index] = bucket
  return windows
}

function combinedInfinityCount(
  summary: Readonly<SimulationPresentationSummary>,
): bigint {
  return addDiscrete(
    summary.ordinaryInfinityCount,
    summary.breakInfinityCount,
  )
}

function combinedInfinityPoints(
  summary: Readonly<SimulationPresentationSummary>,
): bigint {
  return addDiscrete(
    addDiscrete(
      summary.ordinaryInfinityPoints,
      summary.breakInfinityPoints,
    ),
    summary.botCapInfinityPoints,
  )
}

function combinedDreamResets(
  summary: Readonly<SimulationPresentationSummary>,
): bigint {
  return addDiscrete(
    addDiscrete(
      summary.meteorDreamResets,
      summary.aiDreamResets,
    ),
    addDiscrete(
      summary.globalWarmingDreamResets,
      summary.blackHoleDreamResets,
    ),
  )
}

function ensureWindows(
  source: readonly StatisticsWindowState[] | null | undefined,
  expectedLength: number,
): readonly StatisticsWindowState[] {
  if (!Array.isArray(source) || source.length !== expectedLength) {
    return Array.from(
      { length: expectedLength },
      () => createEmptyStatisticsWindow(0n),
    )
  }
  let repaired: StatisticsWindowState[] | undefined
  for (let index = 0; index < expectedLength; index += 1) {
    if (source[index] !== null && source[index] !== undefined) continue
    repaired ??= source.slice()
    repaired[index] = createEmptyStatisticsWindow(0n)
  }
  return repaired ?? source
}

function windowSequence(
  seconds: number,
  widthSeconds: number,
): bigint {
  return floorToDiscrete(
    Math.floor(Math.max(0, seconds) / widthSeconds),
  )
}

function prepareWindow(
  window: Readonly<StatisticsWindowState>,
  sequence: bigint,
): StatisticsWindowState {
  return window.sequence === sequence
    ? window
    : createEmptyStatisticsWindow(sequence)
}

function maximumBigInt(left: bigint, right: bigint): bigint {
  return left > right ? left : right
}

export function createEmptySimulationTotals(): SimulationTotalsState {
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
    strangeMatter: 0,
    realityWorkers: 0n,
    automaticInfluence: 0,
    manualInfluence: 0,
    realityCapacityStallSeconds: 0,
    simulatedSeconds: 0,
  }
}

export function createEmptyStatisticsWindow(
  sequence: bigint,
): StatisticsWindowState {
  return {
    sequence,
    simulatedSeconds: 0,
    infinityCount: 0n,
    infinityPoints: 0n,
    dreamResetCount: 0n,
    strangeMatter: 0,
    realityWorkers: 0n,
  }
}

/** Updates the current rolling-window bucket for one instantaneous event. */
export function updateStatisticsEventWindow(
  source: readonly StatisticsWindowState[],
  expectedLength: number,
  widthSeconds: number,
  trackedSimulatedSeconds: number,
  update: (
    bucket: Readonly<StatisticsWindowState>,
  ) => StatisticsWindowState,
): readonly StatisticsWindowState[] {
  const windows =
    source.length === expectedLength
      ? [...source]
      : Array.from(
          { length: expectedLength },
          () => createEmptyStatisticsWindow(0n),
        )
  const sequence = floorToDiscrete(
    clampContinuous(trackedSimulatedSeconds) / widthSeconds,
  )
  const index = Number(sequence % BigInt(expectedLength))
  const current = windows[index]
  const bucket =
    current.sequence === sequence
      ? current
      : createEmptyStatisticsWindow(sequence)
  windows[index] = update(bucket)
  return windows
}

function emptyCycle(): SimulationStatisticsState['lastCompletedCycle'] {
  return {
    valid: false,
    breakInfinity: false,
    durationSeconds: 0,
    reward: 0n,
    dreamCause: null,
  }
}
