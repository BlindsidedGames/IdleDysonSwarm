import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import {
  cloneCanonicalRuntimeSidecarV2,
  type CanonicalRuntimeSidecarV2,
} from '../game-state/runtimeV2'
import type {
  CanonicalGameStateV2,
  SimulationStatisticsStateV2,
  SimulationTotalsStateV2,
  StatisticsWindowStateV2,
} from '../game-state/typesV2'
import {
  GAME_DECIMAL_ZERO,
  addGameDecimals,
  cloneGameDecimal,
  gameDecimalFromNumber,
  gameDecimalToSchedulerSeconds,
  subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'
import { deriveDysonV2FromCauses } from './dysonV2Derivation'
import { DYSON_V2_FACILITY_IDS } from './dysonV2Production'
import {
  consumeInfinityBoundaryEvaluationV2ForReset,
  INFINITY_TUNING_V2,
  infinityProductionHorizonV2,
  prepareInfinityBoundaryEvaluationV2ForReset,
  preparePreparedInfinityBoundaryEvaluationV2ForReset,
  quoteNextPreparedInfinityBoundaryV2ForReset,
  quotePreparedInfinityResetBoundaryV2,
  registerPreparedInfinityBoundaryAuthorityV2ForStoredTime,
  quoteNextInfinityBoundaryV2ForReset,
  type InfinityBoundaryEvaluationV2,
  type InfinityRewardAuthorityV2,
} from './infinityEconomyV2'
import { realityArtifactSkillPointsV2 } from './realityV2'
import { resetV2ResearchForInfinity } from './researchV2'
import { canonicalSkillCatalogV2 } from './skillCatalogV2'
import {
  clearedCanonicalSkillRuntimeV2,
  runCanonicalSkillAutoAssignmentV2,
} from './skillTransactionsV2'

export interface CanonicalInfinityResetResultV2 {
  readonly accepted: true
  readonly revision: number
  readonly state: Readonly<CanonicalGameStateV2>
  readonly runtime: Readonly<CanonicalRuntimeSidecarV2>
  readonly quotedReward: GameDecimal
  readonly rewardGranted: GameDecimal
  readonly resetSkillPoints: bigint
  readonly autoAssignedSkillIds: readonly string[]
}

export interface CanonicalPreparedInfinityResetAuthorityV2 {
  readonly policy: 'stored-time-transient-infinity-authority-v1'
}

const preparedInfinityResetAuthorities = new WeakSet<object>()
const preparedInfinityBoundaryAuthority =
  registerPreparedInfinityBoundaryAuthorityV2ForStoredTime()

export function registerCanonicalPreparedInfinityResetAuthorityV2ForStoredTime():
Readonly<CanonicalPreparedInfinityResetAuthorityV2> {
  const authority = Object.freeze({
    policy: 'stored-time-transient-infinity-authority-v1' as const,
  })
  preparedInfinityResetAuthorities.add(authority)
  return authority
}

export function registerCanonicalPreparedInfinityResetAuthorityV2ForEventModel():
Readonly<CanonicalPreparedInfinityResetAuthorityV2> {
  return registerCanonicalPreparedInfinityResetAuthorityV2ForStoredTime()
}

export function quotePreparedCanonicalInfinityResetV2(
  authority: Readonly<CanonicalPreparedInfinityResetAuthorityV2>,
  state: Readonly<CanonicalGameStateV2>,
  runtime: Readonly<CanonicalRuntimeSidecarV2>,
  revision: number,
  rewardAuthority: Readonly<InfinityRewardAuthorityV2>,
): Readonly<InfinityBoundaryEvaluationV2> {
  if (!preparedInfinityResetAuthorities.has(authority as object)) {
    throw new TypeError('Prepared Infinity reset authority is not authentic.')
  }
  return quotePreparedInfinityResetBoundaryV2(
    preparedInfinityBoundaryAuthority,
    state,
    runtime,
    revision,
    rewardAuthority,
  )
}

const TEN = gameDecimalFromNumber(10)
const ONE = gameDecimalFromNumber(1)

export function commitCanonicalInfinityResetV2(
  evaluation: unknown,
  state: Readonly<CanonicalGameStateV2>,
  runtime: Readonly<CanonicalRuntimeSidecarV2>,
  currentRevision: number,
): Readonly<CanonicalInfinityResetResultV2> {
  requireCommittableRevision(currentRevision)
  const boundary = prepareInfinityBoundaryEvaluationV2ForReset(
    evaluation,
    state,
    runtime,
    currentRevision,
  )
  const safeRuntime = cloneCanonicalRuntimeSidecarV2(runtime)
  const source = cloneCanonicalGameStateV2(state)
  const nextAvailable = addGameDecimals(
    source.infinity.availablePoints,
    boundary.reward,
  )
  const rewardGranted = subtractGameDecimals(
    nextAvailable,
    source.infinity.availablePoints,
  )
  const resetSkillPoints = deriveResetSkillPoints(source)
  const clearedSkills = Object.freeze(Object.fromEntries(
    canonicalSkillCatalogV2.skillIds.map((id) => [
      id,
      clearedCanonicalSkillRuntimeV2(),
    ]),
  ))
  const resetFacilities = Object.freeze(Object.fromEntries(
    DYSON_V2_FACILITY_IDS.map((id) => [
      id,
      Object.freeze([
        cloneGameDecimal(GAME_DECIMAL_ZERO),
        source.infinity.retainedFacilities[
          id as keyof CanonicalGameStateV2['infinity']['retainedFacilities']
        ] === true
          ? cloneGameDecimal(TEN)
          : cloneGameDecimal(GAME_DECIMAL_ZERO),
      ]),
    ]),
  )) as CanonicalGameStateV2['dyson']['facilities']
  const cycleDurationSeconds = source.timeline.infinityCycleSeconds
  let candidate = cloneCanonicalGameStateV2({
    ...source,
    meta: {
      ...source.meta,
      tutorialComplete: true,
      firstInfinityComplete: true,
    },
    dyson: {
      ...source.dyson,
      money: cloneGameDecimal(GAME_DECIMAL_ZERO),
      science: cloneGameDecimal(GAME_DECIMAL_ZERO),
      bots: source.infinity.retainedFacilities.assembly_lines
        ? cloneGameDecimal(TEN)
        : cloneGameDecimal(ONE),
      workers: cloneGameDecimal(GAME_DECIMAL_ZERO),
      researchers: cloneGameDecimal(GAME_DECIMAL_ZERO),
      facilities: resetFacilities,
      totalPanelsDecayed: cloneGameDecimal(GAME_DECIMAL_ZERO),
      goalStage: 0n,
    },
    infinity: {
      ...source.infinity,
      availablePoints: nextAvailable,
      inProgress: false,
      botCapTransitionPending: false,
      botCapRewardsGranted: false,
      lastCycleDurationSeconds: cycleDurationSeconds,
      lastPointsGained: rewardGranted,
      storedTimeUsedPreviousCycleSeconds:
        source.infinity.storedTimeUsedThisCycleSeconds,
      storedTimeUsedThisCycleSeconds: 0,
    },
    skills: {
      ...source.skills,
      points: resetSkillPoints,
      fragments: 0n,
      byId: clearedSkills,
    },
    statistics: recordInfinityStatistics(
      source.statistics,
      boundary.mode === 'break',
      rewardGranted,
      cycleDurationSeconds,
    ),
    timeline: {
      ...source.timeline,
      infinityBoundaryRemaining: Number.MAX_VALUE,
      infinityCycleSeconds: 0,
      infinityCycleStartingPoints: nextAvailable,
      infinityHasPostResetStart: true,
    },
  })
  candidate = resetV2ResearchForInfinity(candidate)
  candidate = cloneCanonicalGameStateV2(candidate)
  const assignment = runCanonicalSkillAutoAssignmentV2(candidate)
  if (!assignment.accepted) {
    throw new TypeError(`Infinity reset Skill assignment failed: ${assignment.reason}`)
  }
  candidate = cloneCanonicalGameStateV2(assignment.state)

  const derived = deriveDysonV2FromCauses(candidate, safeRuntime)
  const nextRuntime = cloneCanonicalRuntimeSidecarV2(Object.freeze({
    dysonEvaluationSnapshot: derived.nextEvaluationSnapshot,
    dysonTuningProfile: safeRuntime.dysonTuningProfile,
  }))
  const nextBoundary = quoteNextInfinityBoundaryV2ForReset(
    evaluation,
    candidate,
    currentRevision + 1,
  )
  const horizon = infinityProductionHorizonV2(
    candidate.dyson.bots,
    derived.production.rates.bots,
    nextBoundary.requiredBots,
  )
  const infinityBoundaryRemaining = infinityBoundaryCountdownSecondsV2(horizon)
  candidate = cloneCanonicalGameStateV2({
    ...candidate,
    timeline: {
      ...candidate.timeline,
      infinityBoundaryRemaining,
    },
  })
  consumeInfinityBoundaryEvaluationV2ForReset(evaluation)
  return Object.freeze({
    accepted: true as const,
    revision: currentRevision + 1,
    state: candidate,
    runtime: nextRuntime,
    quotedReward: cloneGameDecimal(boundary.reward),
    rewardGranted: cloneGameDecimal(rewardGranted),
    resetSkillPoints,
    autoAssignedSkillIds: Object.freeze([...assignment.affectedSkillIds]),
  })
}

export function commitPreparedCanonicalInfinityResetV2(
  authority: Readonly<CanonicalPreparedInfinityResetAuthorityV2>,
  evaluation: unknown,
  state: Readonly<CanonicalGameStateV2>,
  runtime: Readonly<CanonicalRuntimeSidecarV2>,
  currentRevision: number,
): Readonly<CanonicalInfinityResetResultV2> {
  if (!preparedInfinityResetAuthorities.has(authority as object)) {
    throw new TypeError('Prepared Infinity reset authority is not authentic.')
  }
  requireCommittableRevision(currentRevision)
  const boundary = preparePreparedInfinityBoundaryEvaluationV2ForReset(
    preparedInfinityBoundaryAuthority,
    evaluation, state, runtime, currentRevision,
  )
  const nextAvailable = addGameDecimals(state.infinity.availablePoints, boundary.reward)
  const rewardGranted = subtractGameDecimals(
    nextAvailable, state.infinity.availablePoints,
  )
  const resetSkillPoints = deriveResetSkillPoints(state)
  const clearedSkills = Object.freeze(Object.fromEntries(
    canonicalSkillCatalogV2.skillIds.map((id) => [
      id, clearedCanonicalSkillRuntimeV2(),
    ]),
  ))
  const resetFacilities = Object.freeze(Object.fromEntries(
    DYSON_V2_FACILITY_IDS.map((id) => [
      id,
      Object.freeze([
        GAME_DECIMAL_ZERO,
        state.infinity.retainedFacilities[
          id as keyof CanonicalGameStateV2['infinity']['retainedFacilities']
        ] === true ? TEN : GAME_DECIMAL_ZERO,
      ]),
    ]),
  )) as CanonicalGameStateV2['dyson']['facilities']
  const cycleDurationSeconds = state.timeline.infinityCycleSeconds
  let candidate = Object.freeze({
    ...state,
    meta: Object.freeze({
      ...state.meta,
      tutorialComplete: true,
      firstInfinityComplete: true,
    }),
    dyson: Object.freeze({
      ...state.dyson,
      money: GAME_DECIMAL_ZERO,
      science: GAME_DECIMAL_ZERO,
      bots: state.infinity.retainedFacilities.assembly_lines ? TEN : ONE,
      workers: GAME_DECIMAL_ZERO,
      researchers: GAME_DECIMAL_ZERO,
      facilities: resetFacilities,
      totalPanelsDecayed: GAME_DECIMAL_ZERO,
      goalStage: 0n,
    }),
    infinity: Object.freeze({
      ...state.infinity,
      availablePoints: nextAvailable,
      inProgress: false,
      botCapTransitionPending: false,
      botCapRewardsGranted: false,
      lastCycleDurationSeconds: cycleDurationSeconds,
      lastPointsGained: rewardGranted,
      storedTimeUsedPreviousCycleSeconds:
        state.infinity.storedTimeUsedThisCycleSeconds,
      storedTimeUsedThisCycleSeconds: 0,
    }),
    skills: Object.freeze({
      ...state.skills,
      points: resetSkillPoints,
      fragments: 0n,
      byId: clearedSkills,
    }),
    statistics: recordInfinityStatistics(
      state.statistics,
      boundary.mode === 'break',
      rewardGranted,
      cycleDurationSeconds,
    ),
    timeline: Object.freeze({
      ...state.timeline,
      infinityBoundaryRemaining: Number.MAX_VALUE,
      infinityCycleSeconds: 0,
      infinityCycleStartingPoints: nextAvailable,
      infinityHasPostResetStart: true,
    }),
  }) as Readonly<CanonicalGameStateV2>
  candidate = resetV2ResearchForInfinity(candidate)
  let affectedSkillIds: readonly string[] = Object.freeze([])
  if (candidate.skills.activeAutoAssignment.length > 0 && candidate.skills.points > 0n) {
    const assignment = runCanonicalSkillAutoAssignmentV2(candidate)
    if (!assignment.accepted) {
      throw new TypeError(`Infinity reset Skill assignment failed: ${assignment.reason}`)
    }
    candidate = assignment.state
    affectedSkillIds = assignment.affectedSkillIds
  }
  const derived = deriveDysonV2FromCauses(candidate, runtime)
  const nextRuntime = Object.freeze({
    dysonEvaluationSnapshot: derived.nextEvaluationSnapshot,
    dysonTuningProfile: runtime.dysonTuningProfile,
  })
  const nextBoundary = quoteNextPreparedInfinityBoundaryV2ForReset(
    preparedInfinityBoundaryAuthority,
    evaluation, candidate, nextRuntime, currentRevision + 1,
  )
  const horizon = infinityProductionHorizonV2(
    candidate.dyson.bots,
    derived.production.rates.bots,
    nextBoundary.requiredBots,
  )
  candidate = Object.freeze({
    ...candidate,
    timeline: Object.freeze({
      ...candidate.timeline,
      infinityBoundaryRemaining: infinityBoundaryCountdownSecondsV2(horizon),
    }),
  })
  consumeInfinityBoundaryEvaluationV2ForReset(evaluation)
  return Object.freeze({
    accepted: true as const,
    revision: currentRevision + 1,
    state: candidate,
    runtime: nextRuntime,
    quotedReward: boundary.reward,
    rewardGranted,
    resetSkillPoints,
    autoAssignedSkillIds: Object.freeze([...affectedSkillIds]),
  })
}

export function infinityBoundaryCountdownSecondsV2(
  horizon: GameDecimal | null,
): number {
  if (horizon === null) return Number.MAX_VALUE
  return Math.max(
    INFINITY_TUNING_V2.minimumCycleSeconds,
    gameDecimalToSchedulerSeconds(horizon, Number.MAX_VALUE).seconds,
  )
}

function deriveResetSkillPoints(state: Readonly<CanonicalGameStateV2>): bigint {
  const banking = state.skills.byId.banking?.owned ? 1n : 0n
  const investment = state.skills.byId.investmentPortfolio?.owned ? 1n : 0n
  const secret = state.secretProgress.completed ? 4n : 0n
  return state.infinity.permanentSkillPoints +
    banking +
    investment +
    realityArtifactSkillPointsV2(state) +
    secret
}

function recordInfinityStatistics(
  statistics: Readonly<SimulationStatisticsStateV2>,
  breakInfinity: boolean,
  reward: GameDecimal,
  durationSeconds: number,
): Readonly<SimulationStatisticsStateV2> {
  const ordinaryCount = breakInfinity ? 0n : 1n
  const breakCount = breakInfinity ? 1n : 0n
  const ordinaryPoints = breakInfinity ? GAME_DECIMAL_ZERO : reward
  const breakPoints = breakInfinity ? reward : GAME_DECIMAL_ZERO
  const infinityCount = ordinaryCount + breakCount
  return Object.freeze({
    ...statistics,
    trackedSinceUpdate: true,
    trackingStartedMarker: statistics.trackedSinceUpdate
      ? statistics.trackingStartedMarker
      : 'tracked-since-update',
    lifetime: addStatisticsEvent(
      statistics.lifetime,
      ordinaryCount,
      breakCount,
      ordinaryPoints,
      breakPoints,
    ),
    currentQuantumRun: addStatisticsEvent(
      statistics.currentQuantumRun,
      ordinaryCount,
      breakCount,
      ordinaryPoints,
      breakPoints,
    ),
    recentProcessedSegment: addStatisticsEvent(
      statistics.recentProcessedSegment,
      ordinaryCount,
      breakCount,
      ordinaryPoints,
      breakPoints,
    ),
    lastCompletedCycle: Object.freeze({
      valid: true,
      breakInfinity,
      durationSeconds,
      reward: cloneGameDecimal(reward),
      dreamCause: null,
    }),
    minuteWindows: recordWindowEvent(
      statistics.minuteWindows,
      60,
      statistics.trackedSimulatedSeconds,
      infinityCount,
      reward,
    ),
    halfHourWindows: recordWindowEvent(
      statistics.halfHourWindows,
      1_800,
      statistics.trackedSimulatedSeconds,
      infinityCount,
      reward,
    ),
    dailyWindows: recordWindowEvent(
      statistics.dailyWindows,
      86_400,
      statistics.trackedSimulatedSeconds,
      infinityCount,
      reward,
    ),
  })
}

function addStatisticsEvent(
  source: Readonly<SimulationTotalsStateV2>,
  ordinaryCount: bigint,
  breakCount: bigint,
  ordinaryPoints: GameDecimal,
  breakPoints: GameDecimal,
): Readonly<SimulationTotalsStateV2> {
  return Object.freeze({
    ...source,
    ordinaryInfinityCount: source.ordinaryInfinityCount + ordinaryCount,
    breakInfinityCount: source.breakInfinityCount + breakCount,
    ordinaryInfinityPoints: addGameDecimals(source.ordinaryInfinityPoints, ordinaryPoints),
    breakInfinityPoints: addGameDecimals(source.breakInfinityPoints, breakPoints),
  })
}

function recordWindowEvent(
  source: readonly StatisticsWindowStateV2[],
  widthSeconds: number,
  trackedSeconds: number,
  infinityCount: bigint,
  infinityPoints: GameDecimal,
): readonly StatisticsWindowStateV2[] {
  const windows = [...source]
  const sequence = BigInt(Math.floor(trackedSeconds / widthSeconds))
  const index = Number(sequence % BigInt(windows.length))
  const previous = windows[index]!
  const bucket = previous.sequence === sequence
    ? previous
    : Object.freeze({
        sequence,
        simulatedSeconds: 0,
        infinityCount: 0n,
        infinityPoints: cloneGameDecimal(GAME_DECIMAL_ZERO),
        dreamResetCount: 0n,
        strangeMatter: cloneGameDecimal(GAME_DECIMAL_ZERO),
        realityWorkers: cloneGameDecimal(GAME_DECIMAL_ZERO),
      })
  windows[index] = Object.freeze({
    ...bucket,
    infinityCount: bucket.infinityCount + infinityCount,
    infinityPoints: addGameDecimals(bucket.infinityPoints, infinityPoints),
  })
  return Object.freeze(windows)
}

function requireCommittableRevision(value: number): void {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    Object.is(value, -0) ||
    value === Number.MAX_SAFE_INTEGER
  ) {
    throw new RangeError('Infinity reset revision is invalid or exhausted.')
  }
}
