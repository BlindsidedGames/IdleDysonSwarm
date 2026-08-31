import {
  isFiniteNonNegativeNumber,
  isSafeNonNegativeInteger,
  isSafePositiveInteger,
} from '../core/finiteNonNegativeNumber'
import { getGameAsset } from '../game-data/catalog'
import {
  REALITY_SYSTEM_TUNING_ASSET_ID,
  REALITY_SYSTEM_TUNING_ASSET_KIND,
} from '../game-data/runtimeAssetKinds'
import type {
  CanonicalGameStateV1,
  SimulationStatisticsState,
  SimulationTotalsState,
  StatisticsWindowState,
} from '../game-state/types'
import { hasVisitedNavigationRoute } from '../game-state/navigationPreferences'
import {
  createEmptySimulationTotals,
  createEmptyStatisticsWindow,
} from './canonicalStatistics'
import {
  addContinuous,
  addDiscrete,
  CONTINUOUS_MAXIMUM,
  DISCRETE_MAXIMUM,
  floorToDiscrete,
  multiplyContinuous,
} from './numeric'
import { settleDiscreteToContinuousTransfer } from './conservativeSettlement'
import { QUANTUM_CONSTANTS } from './quantumUpgrades'

const FLOAT32_MAXIMUM = 3.4028234663852886e38

export interface RealityWorkerTuning {
  readonly workerBatchSize: bigint
  readonly baseWorkerGenerationSpeed: number
}

export type RealityWorkerAdvanceStatus =
  | 'success'
  | 'invalid-input'
  | 'invalid-state'
  | 'invalid-tuning'

export interface RealityWorkerAdvanceResult {
  readonly status: RealityWorkerAdvanceStatus
  readonly state: CanonicalGameStateV1
  readonly generationPerSecond: number
  readonly workersGenerated: bigint
  readonly automaticInfluence: number
  readonly stalledSeconds: number
}

export type RealityInfluenceGatherStatus =
  | 'success'
  | 'not-ready'
  | 'output-maxed'
  | 'invalid-state'
  | 'invalid-tuning'

export interface RealityInfluenceGatherResult {
  readonly status: RealityInfluenceGatherStatus
  readonly gathered: boolean
  readonly amount: number
  readonly state: CanonicalGameStateV1
}

interface RealitySegmentSummary {
  readonly workersGenerated: bigint
  readonly automaticInfluence: number
  readonly manualInfluence: number
  readonly stalledSeconds: number
}

/**
 * Advances Unity's Reality worker clock. Double Time is intentionally absent:
 * GameManager passes raw elapsed seconds to WorkerService.
 */
export function advanceRealityWorkers(
  state: Readonly<CanonicalGameStateV1>,
  seconds: number,
  tuning: Readonly<RealityWorkerTuning> | null | undefined =
    readRealityWorkerTuning(),
): RealityWorkerAdvanceResult {
  if (!isFiniteNonNegativeNumber(seconds)) {
    return emptyAdvance('invalid-input', state)
  }
  if (!isValidTuning(tuning)) {
    return emptyAdvance('invalid-tuning', state)
  }
  if (!isValidRealityState(state)) {
    return emptyAdvance('invalid-state', state)
  }
  if (!realityInfluenceGenerationStarted(state)) {
    return pausedAdvance(state)
  }

  const generationPerSecond = workerGenerationPerSecond(
    tuning.baseWorkerGenerationSpeed,
    state.quantum.influenceSpeedBonus,
  )
  let progress = normalizeProgress(
    state.reality.workerGenerationProgress,
  )
  let workersReady =
    !state.reality.autoGather &&
    state.reality.workersReady > tuning.workerBatchSize
      ? tuning.workerBatchSize
      : state.reality.workersReady
  let influence = state.reality.influence
  let workersGenerated = 0n
  let automaticInfluence = 0
  let stalledSeconds = 0

  if (
    generationPerSecond > 0 &&
    seconds > 0 &&
    (state.reality.autoGather ||
      workersReady < tuning.workerBatchSize)
  ) {
    const generatedExact = addContinuous(
      progress,
      multiplyContinuous(generationPerSecond, seconds),
    )
    const completed = floorToDiscrete(Math.floor(generatedExact))
    const remainder =
      completed === DISCRETE_MAXIMUM
        ? 0
        : Math.max(0, generatedExact - Number(completed))

    if (state.reality.autoGather) {
      const pendingWorkers = addDiscrete(workersReady, completed)
      workersGenerated = pendingWorkers - workersReady
      const overflow = completed - workersGenerated
      const gathered = creditGeneratedWorkers(
        influence,
        pendingWorkers,
      )
      influence = gathered.influence
      automaticInfluence = Number(gathered.consumedWorkers)
      workersReady = pendingWorkers - gathered.consumedWorkers
      progress = overflow > 0n ? 0 : remainder
      if (overflow > 0n) {
        stalledSeconds = Math.max(
          0,
          seconds -
            Number(workersGenerated) /
              Math.max(Number.MIN_VALUE, generationPerSecond),
        )
      }
    } else {
      const space = tuning.workerBatchSize - workersReady
      const accepted = completed < space ? completed : space
      workersReady = addDiscrete(workersReady, accepted)
      workersGenerated = accepted
      progress =
        workersReady >= tuning.workerBatchSize ? 0 : remainder
      if (completed > accepted) {
        stalledSeconds = Math.max(
          0,
          seconds -
            Number(accepted) /
              Math.max(Number.MIN_VALUE, generationPerSecond),
        )
      }
    }
  } else if (
    !state.reality.autoGather &&
    workersReady >= tuning.workerBatchSize &&
    seconds > 0
  ) {
    stalledSeconds = seconds
  }

  const candidate: CanonicalGameStateV1 = {
    ...state,
    reality: {
      ...state.reality,
      universeDesignationCount: advanceUniverseDesignation(
        state.reality.universeDesignationCount,
        workersGenerated,
      ),
      workersReady,
      workerGenerationProgress: progress,
      influence,
    },
  }

  return {
    status: 'success',
    state: candidate,
    generationPerSecond,
    workersGenerated,
    automaticInfluence,
    stalledSeconds,
  }
}

/**
 * Fresh saves start Reality generation only after the destination is visited.
 * Saves from before portable route discovery retain their established Reality
 * behavior once the canonical Reality unlock had already been reached.
 */
export function realityInfluenceGenerationStarted(
  state: Readonly<CanonicalGameStateV1>,
): boolean {
  const discovery = state.meta.navigationRouteDiscovery
  if (discovery !== undefined) {
    return hasVisitedNavigationRoute(discovery, 'reality')
  }
  return state.quantum.pointsEarned > 0n ||
    state.infinity.secretsOfTheUniverse >= QUANTUM_CONSTANTS.maximumSecrets
}

/**
 * Universe designations are ordinal identity labels, not bounded resources.
 * Each generated worker advances the label exactly, including beyond the
 * signed 64-bit ceiling used by discrete currencies and counters.
 */
export function advanceUniverseDesignation(
  current: bigint,
  generatedWorkers: bigint,
): bigint {
  return current + generatedWorkers
}

/**
 * Converts one full manual worker batch into Influence. Unity consumes the
 * entire ready-worker balance and credits exactly one configured batch.
 */
export function gatherRealityInfluence(
  state: Readonly<CanonicalGameStateV1>,
  tuning: Readonly<RealityWorkerTuning> | null | undefined =
    readRealityWorkerTuning(),
): RealityInfluenceGatherResult {
  if (!isValidTuning(tuning)) {
    return emptyGather('invalid-tuning', state)
  }
  if (!isValidRealityState(state)) {
    return emptyGather('invalid-state', state)
  }
  if (state.reality.workersReady < tuning.workerBatchSize) {
    return emptyGather('not-ready', state)
  }
  const gathered = creditGeneratedWorkers(
    state.reality.influence,
    tuning.workerBatchSize,
  )
  if (gathered.consumedWorkers !== tuning.workerBatchSize) {
    return emptyGather('output-maxed', state)
  }

  const summary: RealitySegmentSummary = {
    workersGenerated: 0n,
    automaticInfluence: 0,
    manualInfluence: Number(tuning.workerBatchSize),
    stalledSeconds: 0,
  }
  return {
    status: 'success',
    gathered: true,
    amount: Number(tuning.workerBatchSize),
    state: {
      ...state,
      reality: {
        ...state.reality,
        workersReady: 0n,
        influence: gathered.influence,
      },
      statistics: recordRealitySegment(
        state.statistics,
        0,
        summary,
      ),
    },
  }
}

/**
 * Converts as many already-generated workers as the current floating-point
 * Influence balance can represent without losing or inventing workers. Any
 * uncredited workers stay in workersReady and are retried after more workers
 * accumulate, allowing automatic gathering to run continuously without a
 * separate save-field remainder.
 */
function creditGeneratedWorkers(
  influence: number,
  availableWorkers: bigint,
): {
  readonly influence: number
  readonly consumedWorkers: bigint
} {
  if (availableWorkers <= 0n || influence >= CONTINUOUS_MAXIMUM) {
    return { influence, consumedWorkers: 0n }
  }
  const transfer = settleDiscreteToContinuousTransfer(
    availableWorkers,
    influence,
  )
  return {
    influence: transfer.destinationBalance,
    consumedWorkers: transfer.settled,
  }
}

export function readRealityWorkerTuning():
  | RealityWorkerTuning
  | undefined {
  const asset = getGameAsset(
    REALITY_SYSTEM_TUNING_ASSET_KIND,
    REALITY_SYSTEM_TUNING_ASSET_ID,
  )
  const workerBatchSize = asset?.data.workerBatchSize
  const baseWorkerGenerationSpeed =
    asset?.data.baseWorkerGenerationSpeed
  if (
    !isSafePositiveInteger(workerBatchSize) ||
    !isSafeNonNegativeInteger(baseWorkerGenerationSpeed)
  ) {
    return undefined
  }
  return {
    workerBatchSize: BigInt(workerBatchSize),
    baseWorkerGenerationSpeed,
  }
}

function workerGenerationPerSecond(
  base: number,
  bonus: bigint,
): number {
  return Math.fround(
    Math.min(FLOAT32_MAXIMUM, base + Number(bonus)),
  )
}

function normalizeProgress(value: number): number {
  return isFiniteNonNegativeNumber(value) ? value % 1 : 0
}

function isValidTuning(
  tuning: Readonly<RealityWorkerTuning> | null | undefined,
): tuning is RealityWorkerTuning {
  return (
    tuning != null &&
    tuning.workerBatchSize > 0n &&
    tuning.workerBatchSize <= DISCRETE_MAXIMUM &&
    isSafeNonNegativeInteger(tuning.baseWorkerGenerationSpeed)
  )
}

function isValidRealityState(
  state: Readonly<CanonicalGameStateV1>,
): boolean {
  const reality = state.reality
  return (
    reality.universeDesignationCount >= 0n &&
    reality.workersReady >= 0n &&
    reality.workersReady <= DISCRETE_MAXIMUM &&
    Number.isFinite(reality.influence) &&
    reality.influence >= 0 &&
    state.quantum.influenceSpeedBonus >= 0n &&
    state.quantum.influenceSpeedBonus <= DISCRETE_MAXIMUM
  )
}

function emptyAdvance(
  status: Exclude<RealityWorkerAdvanceStatus, 'success'>,
  state: Readonly<CanonicalGameStateV1>,
): RealityWorkerAdvanceResult {
  return {
    status,
    state,
    generationPerSecond: 0,
    workersGenerated: 0n,
    automaticInfluence: 0,
    stalledSeconds: 0,
  }
}

function pausedAdvance(
  state: Readonly<CanonicalGameStateV1>,
): RealityWorkerAdvanceResult {
  return {
    status: 'success',
    state,
    generationPerSecond: 0,
    workersGenerated: 0n,
    automaticInfluence: 0,
    stalledSeconds: 0,
  }
}

function emptyGather(
  status: Exclude<RealityInfluenceGatherStatus, 'success'>,
  state: Readonly<CanonicalGameStateV1>,
): RealityInfluenceGatherResult {
  return {
    status,
    gathered: false,
    amount: 0,
    state,
  }
}

function recordRealitySegment(
  statistics: Readonly<SimulationStatisticsState>,
  seconds: number,
  summary: Readonly<RealitySegmentSummary>,
): SimulationStatisticsState {
  const safeSeconds = isFiniteNonNegativeNumber(seconds) ? seconds : 0
  const start = statistics.trackedSimulatedSeconds
  const end = addContinuous(start, safeSeconds)
  const recentBase =
    statistics.recentProcessedSegment.simulatedSeconds > 0
      ? createEmptySimulationTotals()
      : statistics.recentProcessedSegment

  return {
    ...statistics,
    trackedSinceUpdate: true,
    trackingStartedMarker: statistics.trackedSinceUpdate
      ? statistics.trackingStartedMarker
      : 'tracked-since-update',
    trackedSimulatedSeconds: end,
    lifetime: addRealityTotals(
      statistics.lifetime,
      summary,
      safeSeconds,
    ),
    currentQuantumRun: addRealityTotals(
      statistics.currentQuantumRun,
      summary,
      safeSeconds,
    ),
    recentProcessedSegment: addRealityTotals(
      recentBase,
      summary,
      safeSeconds,
    ),
    minuteWindows: recordRealityWindows(
      statistics.minuteWindows,
      60,
      start,
      end,
      summary.workersGenerated,
    ),
    halfHourWindows: recordRealityWindows(
      statistics.halfHourWindows,
      1_800,
      start,
      end,
      summary.workersGenerated,
    ),
    dailyWindows: recordRealityWindows(
      statistics.dailyWindows,
      86_400,
      start,
      end,
      summary.workersGenerated,
    ),
  }
}

function addRealityTotals(
  totals: Readonly<SimulationTotalsState>,
  summary: Readonly<RealitySegmentSummary>,
  seconds: number,
): SimulationTotalsState {
  return {
    ...totals,
    realityWorkers: addDiscrete(
      totals.realityWorkers,
      summary.workersGenerated,
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
      summary.stalledSeconds,
    ),
    simulatedSeconds: addContinuous(
      totals.simulatedSeconds,
      seconds,
    ),
  }
}

function recordRealityWindows(
  source: readonly StatisticsWindowState[],
  widthSeconds: number,
  start: number,
  end: number,
  workersGenerated: bigint,
): readonly StatisticsWindowState[] {
  if (source.length === 0) return source
  const changed = new Map<number, StatisticsWindowState>()
  const readWindow = (index: number): StatisticsWindowState =>
    changed.get(index) ?? source[index]!
  if (end > start) {
    const lastPoint = Math.max(
      start,
      end - Math.max(1e-9, Math.abs(end) * 1e-15),
    )
    const firstSequence = windowSequence(start, widthSeconds)
    const lastSequence = windowSequence(lastPoint, widthSeconds)
    const retainedFirst =
      firstSequence > lastSequence - BigInt(source.length) + 1n
        ? firstSequence
        : lastSequence - BigInt(source.length) + 1n
    for (
      let sequence = retainedFirst;
      sequence <= lastSequence;
      sequence += 1n
    ) {
      const index = Number(sequence % BigInt(source.length))
      let window = prepareWindow(readWindow(index), sequence)
      const windowStart = Number(sequence) * widthSeconds
      const overlap = Math.max(
        0,
        Math.min(end, windowStart + widthSeconds) -
          Math.max(start, windowStart),
      )
      window = {
        ...window,
        simulatedSeconds: addContinuous(
          window.simulatedSeconds,
          overlap,
        ),
      }
      changed.set(index, window)
    }
  }

  const eventSequence = windowSequence(end, widthSeconds)
  const eventIndex = Number(
    eventSequence % BigInt(source.length),
  )
  const eventWindow = prepareWindow(
    readWindow(eventIndex),
    eventSequence,
  )
  changed.set(eventIndex, {
    ...eventWindow,
    realityWorkers: addDiscrete(
      eventWindow.realityWorkers,
      workersGenerated,
    ),
  })
  const windows = source.slice()
  for (const [index, window] of changed) windows[index] = window
  return windows
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
  if (window.sequence === sequence) return window
  return createEmptyStatisticsWindow(sequence)
}
