import { infinityTimeBonusMultiplier, INFINITY_TIME_BONUS_MAX_LEVEL } from './infinityTimeBonus'
import { OVERFLOW_BOT_CAP } from './overflowBoundary'
import {
  isFiniteNonNegativeNumber,
  isFinitePositiveNumber,
} from '../core/finiteNonNegativeNumber'
import {
  BASIC_DYSON_FACILITY_IDS,
  createEmptyRetainedFacilities,
  type BasicDysonFacilityId,
  type OwnedPair,
} from './dysonFacilities'
import {
  applyInfinityResetTransition,
  type InfinityStatistics,
} from './infinityReset'
import {
  addDiscrete,
  bitIncrement,
  DISCRETE_MAXIMUM,
} from './numeric'
import {
  buyXCost,
  maxAffordable,
} from './transactions'
import type { CanonicalGameStateV1 } from '../game-state/types'

export const INFINITY_REWARD_FORMULA_VERSION = 3
// The profitable Bot range moves more slowly than production grows, so normal
// progression shortens runs while skill builds can retain different peaks.
const BREAK_REWARD_BASE_SLOPE = 0.0478
const BREAK_REWARD_MIDDLE_SLOPE = 0.112
const BREAK_REWARD_STRENGTH_SLOPE = 7.2
const BREAK_REWARD_REFERENCE_POINTS = 33_184_213
const BREAK_REWARD_REGION_START = 120
const BREAK_REWARD_REGION_END = 140.8

const ORDINARY_INFINITY_BOT_REQUIREMENT = 4.2e19
const DEFAULT_INFINITY_EXPONENT = 3.9
const MINIMUM_EVENT_PROGRESS_SECONDS = bitIncrement(1e-12)
export const INFINITY_RATE_MATERIAL_IMPROVEMENT = 0.02
/**
 * A manual run must be observed for this long before toggling automation may
 * persist its in-progress peak. This prevents a single post-reset update from
 * replacing the completed manual recommendation while keeping the intended
 * short manual-calibration workflow.
 */
export const MANUAL_INFINITY_CALIBRATION_MINIMUM_SECONDS = 1
export const BREAK_INFINITY_PRESENTATION_TARGET_MINIMUM = 1n
export const BREAK_INFINITY_PRESENTATION_TARGET_MAXIMUM = DISCRETE_MAXIMUM

const BREAK_INFINITY_PRESENTATION_POSITION_MINIMUM = Math.log10(
  Number(BREAK_INFINITY_PRESENTATION_TARGET_MINIMUM) + 1,
)
const BREAK_INFINITY_PRESENTATION_POSITION_MAXIMUM = Math.log10(
  Number(BREAK_INFINITY_PRESENTATION_TARGET_MAXIMUM) + 1,
)

export interface BasicDysonInfinityState {
  points: bigint
  startingPoints: bigint
  peakBots: number
  permanentSkillPoints: bigint
  retainedFacilities: Record<BasicDysonFacilityId, boolean>
  offlineTimeUsedThisInfinity: number
  offlineTimeUsedPreviousInfinity: number
  firstInfinityDone: boolean
  tutorial: boolean
  infinityInProgress: boolean
  botCapTransitionPending: boolean
  botCapRewardsGranted: boolean
  lastInfinityPointsGained: number
  skillPoints: bigint
  fragments: bigint
  statistics: InfinityStatistics
  breakTheLoop: boolean
  divisionsPurchased: bigint
  exponent: number
  breakTarget: bigint
  permanentDoubleIp: boolean
  quantumDoubleIp: boolean
  bankedSkillPoints: bigint
  artifactSkillPoints: bigint
  /** 1x elapsed time; falls back to the cycle clock in the legacy adapter. */
  rewardAgeSeconds?: number
  timeBonusLevel?: number
  secondsInCurrentCycle: number
  overflowMultiplier: number
  legacyOverflowMultiplier: number
}

export interface DysonInfinityRunState {
  money: number
  science: number
  bots: number
  panels: number
  workers: number
  researchers: number
  moneyMultiplier: number
  scienceMultiplier: number
  panelRateMultiplier: number
  panelLifetime: number
  ownedSkills: string[]
  facilities: Record<BasicDysonFacilityId, OwnedPair>
  modifiers: Record<BasicDysonFacilityId, number>
  infinity: BasicDysonInfinityState
}

export interface AppliedInfinityReset {
  readonly breakInfinity: boolean
  readonly rewardGranted: bigint
}

export interface AppliedBotCapReward {
  readonly specialRewardGranted: boolean
  readonly infinityPointsGranted: bigint
}

export interface InfinityProgressProjectionInput {
  readonly bots: number
  readonly totalInfinityPoints: bigint
  readonly startingInfinityPoints?: bigint
  readonly rewardAgeSeconds?: number
  readonly timeBonusLevel?: number
  readonly peakBots?: number
  readonly divisionsPurchased: bigint
  readonly breakTheLoop: boolean
  readonly breakTarget: bigint
  readonly permanentDoubleIp: boolean
  readonly quantumDoubleIp: boolean
}

export type InfinityProgressFacts =
  | {
      readonly mode: 'ordinary'
      readonly currentReward: bigint
      readonly navigationReward: null
      readonly progressFraction: number
      readonly resetThresholdBots: number
      readonly botsRemainingToReset: number
      readonly currentRewardThresholdBots: null
      readonly nextRewardThresholdBots: null
      readonly botsRemainingToNextReward: null
      readonly breakTargetProgress: null
      readonly showRealityWarning: boolean
    }
  | {
      readonly mode: 'break'
      readonly currentReward: bigint
      readonly navigationReward: bigint
      readonly progressFraction: number
      readonly resetThresholdBots: number
      readonly botsRemainingToReset: number
      readonly currentRewardThresholdBots: number
      readonly nextRewardThresholdBots: number
      readonly botsRemainingToNextReward: number
      readonly breakTargetProgress: {
        readonly targetReward: bigint
        readonly currentReward: bigint
        readonly fraction: number
      }
      readonly showRealityWarning: false
    }

export interface BreakInfinityPresentationControl {
  readonly minimum: bigint
  readonly maximum: bigint
  readonly minimumPosition: number
  readonly maximumPosition: number
  readonly currentPosition: number
}

function emptyInfinityStatistics(): InfinityStatistics {
  return {
    ordinaryCount: 0n,
    ordinaryPoints: 0n,
    breakCount: 0n,
    breakPoints: 0n,
    botCapRewards: 0n,
  }
}

export function createBasicDysonInfinityState(
  provided: Partial<BasicDysonInfinityState> | undefined,
): BasicDysonInfinityState {
  return {
    points: provided?.points ?? 0n,
    rewardAgeSeconds: provided?.rewardAgeSeconds,
    timeBonusLevel: provided?.timeBonusLevel ?? 0,
    startingPoints: provided?.startingPoints ?? provided?.points ?? 0n,
    peakBots: provided?.peakBots ?? 0,
    permanentSkillPoints: provided?.permanentSkillPoints ?? 0n,
    retainedFacilities: {
      ...createEmptyRetainedFacilities(),
      ...provided?.retainedFacilities,
    },
    offlineTimeUsedThisInfinity:
      provided?.offlineTimeUsedThisInfinity ?? 0,
    offlineTimeUsedPreviousInfinity:
      provided?.offlineTimeUsedPreviousInfinity ?? 0,
    firstInfinityDone: provided?.firstInfinityDone ?? false,
    tutorial: provided?.tutorial ?? false,
    infinityInProgress: provided?.infinityInProgress ?? false,
    botCapTransitionPending:
      provided?.botCapTransitionPending ?? false,
    botCapRewardsGranted: provided?.botCapRewardsGranted ?? false,
    lastInfinityPointsGained:
      provided?.lastInfinityPointsGained ?? 0,
    skillPoints: provided?.skillPoints ?? 0n,
    fragments: provided?.fragments ?? 0n,
    statistics: {
      ...emptyInfinityStatistics(),
      ...provided?.statistics,
    },
    breakTheLoop: provided?.breakTheLoop ?? false,
    divisionsPurchased: provided?.divisionsPurchased ?? 0n,
    exponent: provided?.exponent ?? DEFAULT_INFINITY_EXPONENT,
    breakTarget: provided?.breakTarget ?? 1n,
    permanentDoubleIp: provided?.permanentDoubleIp ?? false,
    quantumDoubleIp: provided?.quantumDoubleIp ?? false,
    bankedSkillPoints: provided?.bankedSkillPoints ?? 0n,
    artifactSkillPoints: provided?.artifactSkillPoints ?? 0n,
    secondsInCurrentCycle: provided?.secondsInCurrentCycle ?? 0,
    overflowMultiplier: provided?.overflowMultiplier ?? 0,
    legacyOverflowMultiplier:
      provided?.legacyOverflowMultiplier ?? 0,
  }
}

export function cloneBasicDysonInfinityState(
  state: BasicDysonInfinityState,
): BasicDysonInfinityState {
  return {
    ...state,
    retainedFacilities: { ...state.retainedFacilities },
    statistics: { ...state.statistics },
  }
}

export function ordinaryInfinityBotThreshold(
  divisionsPurchased: bigint,
): number {
  if (divisionsPurchased <= 0n) return ORDINARY_INFINITY_BOT_REQUIREMENT
  const divisions = Number(divisionsPurchased)
  if (!Number.isFinite(divisions) || divisions > 19) return 0
  return ORDINARY_INFINITY_BOT_REQUIREMENT / Math.pow(10, divisions)
}

/**
 * Ordinary Infinity is a hard Bot ceiling until Break the Loop is owned.
 * Division upgrades move the ceiling together with the reset threshold.
 */
export function clampPreBreakInfinityBots(
  bots: number,
  breakTheLoop: boolean,
  divisionsPurchased: bigint,
): number {
  if (breakTheLoop) return Math.min(bots, OVERFLOW_BOT_CAP)
  return Math.min(
    bots,
    ordinaryInfinityBotThreshold(divisionsPurchased),
  )
}

function infinityRewardMultiplier(
  state: BasicDysonInfinityState,
): bigint {
  let multiplier = 1n
  if (state.permanentDoubleIp) multiplier *= 2n
  if (state.quantumDoubleIp) multiplier *= 2n
  return multiplier
}

export function breakInfinityBotThreshold(
  state: BasicDysonInfinityState,
): number {
  return infinityBotThresholdForReward(state.breakTarget, state)
}

export function infinityPointsForBots(
  bots: number,
  state: BasicDysonInfinityState,
): bigint {
  if (state.breakTheLoop) {
    const peak = Math.min(OVERFLOW_BOT_CAP, Math.max(bots, state.peakBots))
    if (!isFinitePositiveNumber(peak) || peak < ordinaryInfinityBotThreshold(state.divisionsPurchased)) return 0n
    const x = Math.log10(peak) + Number(state.divisionsPurchased)
    const [start, end] = breakRewardRegion(state.startingPoints)
    const region = Math.max(0, Math.min(x, end) - start)
    const logReward = BREAK_REWARD_BASE_SLOPE * x +
      (BREAK_REWARD_MIDDLE_SLOPE - BREAK_REWARD_BASE_SLOPE) * region - 0.75
    const amount = Math.pow(10, logReward) * Number(infinityRewardMultiplier(state)) * infinityTimeBonusMultiplier(state.timeBonusLevel ?? 0, state.rewardAgeSeconds ?? state.secondsInCurrentCycle)
    return amount >= Number(DISCRETE_MAXIMUM)
      ? DISCRETE_MAXIMUM
      : addDiscrete(0n, BigInt(Math.floor(amount)))
  }
  const base = maxAffordable(
    bots,
    ordinaryInfinityBotThreshold(state.divisionsPurchased),
    state.exponent,
    0,
  )
  const multiplier = infinityRewardMultiplier(state)
  return base > 0n ? addDiscrete(0n, base * multiplier) : 0n
}

function breakRewardRegion(startingPoints: bigint): readonly [number, number] {
  const shift = BREAK_REWARD_STRENGTH_SLOPE *
    Math.log10((1 + Number(startingPoints)) / (1 + BREAK_REWARD_REFERENCE_POINTS))
  return [BREAK_REWARD_REGION_START + shift, BREAK_REWARD_REGION_END + shift]
}

/** Record production before later purchases or skills can consume Bots. */
export function trackInfinityPeakBots(state: CanonicalGameStateV1): CanonicalGameStateV1 {
  const peakBots = Math.max(state.infinity.peakBots ?? 0, state.dyson.bots)
  return peakBots === state.infinity.peakBots ? state : {
    ...state,
    infinity: { ...state.infinity, peakBots },
  }
}

/**
 * Projects the current run's reward efficiency without changing rewards or
 * automation. The opening instant intentionally reports zero rather than an
 * infinite or unstable rate.
 */
export function infinityPointsPerMinute(
  projectedReward: bigint,
  elapsedSeconds: number,
): number {
  if (
    projectedReward <= 0n ||
    !isFinitePositiveNumber(elapsedSeconds)
  ) {
    return 0
  }
  const rate = Number(projectedReward) * 60 / elapsedSeconds
  return isFinitePositiveNumber(rate) ? rate : Number.MAX_VALUE
}

export interface InfinityRatePeak {
  readonly rate: number
  readonly reward: bigint
}

/**
 * Selects a materially better observed rate from an active Infinity run.
 * Rates within two percent are treated as the same throughput plateau and
 * prefer the lower reward, keeping the recommended reset target stable.
 */
export function preferredInfinityRatePeak(
  previous: Readonly<InfinityRatePeak>,
  candidate: Readonly<InfinityRatePeak>,
): InfinityRatePeak {
  if (previous.rate <= 0 || previous.reward <= 0n) return { ...candidate }
  if (candidate.rate <= 0 || candidate.reward <= 0n) return { ...previous }
  const candidateMateriallyBetter = candidate.rate >
    previous.rate * (1 + INFINITY_RATE_MATERIAL_IMPROVEMENT)
  const previousMateriallyBetter = previous.rate >
    candidate.rate * (1 + INFINITY_RATE_MATERIAL_IMPROVEMENT)
  if (!candidateMateriallyBetter && !previousMateriallyBetter) {
    return candidate.reward < previous.reward
      ? { ...candidate }
      : { ...previous }
  }
  return candidateMateriallyBetter ? { ...candidate } : { ...previous }
}

export function validateBasicDysonInfinityState(
  infinity: BasicDysonInfinityState,
): string | undefined {
  const continuous = [
    infinity.offlineTimeUsedThisInfinity,
    infinity.offlineTimeUsedPreviousInfinity,
    infinity.lastInfinityPointsGained,
    infinity.exponent,
    infinity.secondsInCurrentCycle,
    infinity.overflowMultiplier,
    infinity.legacyOverflowMultiplier,
    infinity.peakBots,
  ]
  if (
    !continuous.every(isFiniteNonNegativeNumber) ||
    (infinity.rewardAgeSeconds !== undefined && !isFiniteNonNegativeNumber(infinity.rewardAgeSeconds))
  ) {
    return 'SIM-DYSON-NON-FINITE'
  }
  if (infinity.timeBonusLevel !== undefined && (!Number.isInteger(infinity.timeBonusLevel) || infinity.timeBonusLevel < 0 || infinity.timeBonusLevel > INFINITY_TIME_BONUS_MAX_LEVEL)) return 'SIM-INFINITY-INVALID'
  const discrete = [
    infinity.points,
    infinity.startingPoints,
    infinity.permanentSkillPoints,
    infinity.skillPoints,
    infinity.fragments,
    infinity.divisionsPurchased,
    infinity.breakTarget,
    infinity.bankedSkillPoints,
    infinity.artifactSkillPoints,
    infinity.statistics.ordinaryCount,
    infinity.statistics.ordinaryPoints,
    infinity.statistics.breakCount,
    infinity.statistics.breakPoints,
    infinity.statistics.botCapRewards,
  ]
  if (
    discrete.some((value) => value < 0n) ||
    infinity.breakTarget < 1n ||
    infinity.breakTarget > DISCRETE_MAXIMUM ||
    infinity.divisionsPurchased > 19n ||
    infinity.exponent < 1
  ) {
    return 'SIM-INFINITY-INVALID'
  }
  return undefined
}

export function timeToNextInfinityEvent(
  bots: number,
  botRate: number,
  infinity: BasicDysonInfinityState,
  maximumSeconds: number,
  minimumCycleSeconds: number,
  targetBots?: number,
): number {
  const threshold = targetBots ?? (infinity.breakTheLoop
    ? breakInfinityBotThreshold(infinity)
    : ordinaryInfinityBotThreshold(infinity.divisionsPurchased))
  const minimumRemaining = Math.max(
    0,
    minimumCycleSeconds - infinity.secondsInCurrentCycle,
  )
  if (bots >= threshold) {
    return Math.min(
      maximumSeconds,
      Math.max(MINIMUM_EVENT_PROGRESS_SECONDS, minimumRemaining),
    )
  }
  if (botRate <= 0) return maximumSeconds

  let productionRemaining = (threshold - bots) / botRate
  if (productionRemaining > 0) {
    productionRemaining = bitIncrement(productionRemaining)
  }
  const eventSeconds = Math.max(minimumRemaining, productionRemaining)
  return Number.isFinite(eventSeconds)
    ? Math.min(
        maximumSeconds,
        Math.max(MINIMUM_EVENT_PROGRESS_SECONDS, eventSeconds),
      )
    : maximumSeconds
}

export function clampBreakTarget(target: bigint): bigint {
  if (target < 1n) return 1n
  return target > DISCRETE_MAXIMUM
    ? DISCRETE_MAXIMUM
    : target
}

/**
 * Projects canonical Infinity state into presentation-neutral progress facts.
 * Renderers consume these values directly rather than recreating reward,
 * threshold, or logarithmic progress rules.
 */
export function projectInfinityProgress(
  input: Readonly<InfinityProgressProjectionInput>,
): InfinityProgressFacts {
  const infinity = createBasicDysonInfinityState({
    points: input.totalInfinityPoints,
    startingPoints: input.startingInfinityPoints ?? input.totalInfinityPoints,
    peakBots: input.peakBots ?? 0,
    rewardAgeSeconds: input.rewardAgeSeconds ?? 0,
    timeBonusLevel: input.timeBonusLevel ?? 0,
    breakTheLoop: input.breakTheLoop,
    divisionsPurchased: input.divisionsPurchased,
    breakTarget: clampBreakTarget(input.breakTarget),
    permanentDoubleIp: input.permanentDoubleIp,
    quantumDoubleIp: input.quantumDoubleIp,
  })
  const currentBots =
    isFinitePositiveNumber(input.bots)
      ? input.bots
      : 0
  const bots = input.breakTheLoop
    ? Math.min(OVERFLOW_BOT_CAP, Math.max(currentBots, input.peakBots ?? 0))
    : currentBots
  const currentReward = infinityPointsForBots(bots, infinity)

  if (!input.breakTheLoop) {
    const resetThresholdBots = ordinaryInfinityBotThreshold(
      input.divisionsPurchased,
    )
    const logarithmicProgress =
      bots < 1 || resetThresholdBots <= 1
        ? bots >= resetThresholdBots
          ? 1
          : 0
        : Math.log10(bots) / Math.log10(resetThresholdBots)
    return {
      mode: 'ordinary',
      currentReward,
      navigationReward: null,
      progressFraction: clampUnitInterval(logarithmicProgress),
      resetThresholdBots,
      botsRemainingToReset: finiteRemaining(
        resetThresholdBots,
        bots,
      ),
      currentRewardThresholdBots: null,
      nextRewardThresholdBots: null,
      botsRemainingToNextReward: null,
      breakTargetProgress: null,
      showRealityWarning:
        logarithmicProgress > 0.95 &&
        input.totalInfinityPoints < 42n,
    }
  }

  const resetThresholdBots = infinityBotThresholdForReward(
    infinity.breakTarget,
    infinity,
  )
  const currentRewardThresholdBots =
    currentReward <= 0n
      ? 0
      : infinityBotThresholdForReward(currentReward, infinity)
  const nextReward = currentReward + 1n
  const nextRewardThresholdBots = infinityBotThresholdForReward(
    nextReward,
    infinity,
  )
  const progressSpan =
    nextRewardThresholdBots - currentRewardThresholdBots
  const pointProgress =
    progressSpan > 0 && Number.isFinite(progressSpan)
      ? (bots - currentRewardThresholdBots) / progressSpan
      : bots >= nextRewardThresholdBots
        ? 1
        : 0
  const targetReward = infinity.breakTarget

  return {
    mode: 'break',
    currentReward,
    navigationReward: currentReward,
    progressFraction: clampUnitInterval(pointProgress),
    resetThresholdBots,
    botsRemainingToReset: finiteRemaining(
      resetThresholdBots,
      bots,
    ),
    currentRewardThresholdBots,
    nextRewardThresholdBots,
    botsRemainingToNextReward: finiteRemaining(
      nextRewardThresholdBots,
      bots,
    ),
    breakTargetProgress: {
      targetReward,
      currentReward,
      fraction: clampUnitInterval(
        Number(currentReward) / Number(targetReward),
      ),
    },
    showRealityWarning: false,
  }
}

/**
 * Returns logarithmic control metadata for the supported Break Infinity range.
 */
export function projectBreakInfinityPresentationControl(
  target: bigint,
): BreakInfinityPresentationControl {
  const clamped = clampBreakInfinityPresentationTarget(target)
  return {
    minimum: BREAK_INFINITY_PRESENTATION_TARGET_MINIMUM,
    maximum: BREAK_INFINITY_PRESENTATION_TARGET_MAXIMUM,
    minimumPosition: BREAK_INFINITY_PRESENTATION_POSITION_MINIMUM,
    maximumPosition: BREAK_INFINITY_PRESENTATION_POSITION_MAXIMUM,
    currentPosition: Math.log10(Number(clamped) + 1),
  }
}

/**
 * Maps a logarithmic control position back to the practical Unity target.
 */
export function breakInfinityTargetFromPresentationPosition(
  position: number,
): bigint {
  const finitePosition = Number.isFinite(position)
    ? position
    : BREAK_INFINITY_PRESENTATION_POSITION_MINIMUM
  const clampedPosition = Math.min(
    BREAK_INFINITY_PRESENTATION_POSITION_MAXIMUM,
    Math.max(
      BREAK_INFINITY_PRESENTATION_POSITION_MINIMUM,
      finitePosition,
    ),
  )
  return clampBreakInfinityPresentationTarget(
    BigInt(Math.floor(Math.pow(10, clampedPosition)) - 1),
  )
}

function infinityBotThresholdForReward(
  reward: bigint,
  state: Readonly<BasicDysonInfinityState>,
): number {
  if (reward <= 0n) return 0
  const multiplier = infinityRewardMultiplier(state)
  if (state.breakTheLoop) {
    const [start, end] = breakRewardRegion(state.startingPoints)
    const bonus = infinityTimeBonusMultiplier(state.timeBonusLevel ?? 0, state.rewardAgeSeconds ?? state.secondsInCurrentCycle)
    const target = Math.log10(Number(reward) / (Number(multiplier) * bonus)) + 0.75
    const startReward = BREAK_REWARD_BASE_SLOPE * start
    const endReward = startReward + BREAK_REWARD_MIDDLE_SLOPE * (end - start)
    const x = target <= startReward
      ? target / BREAK_REWARD_BASE_SLOPE
      : target <= endReward
        ? start + (target - startReward) / BREAK_REWARD_MIDDLE_SLOPE
        : end + (target - endReward) / BREAK_REWARD_BASE_SLOPE
    const threshold = Math.max(
      ordinaryInfinityBotThreshold(state.divisionsPurchased),
      Math.pow(10, x - Number(state.divisionsPurchased)),
    )
    return Number.isFinite(threshold) ? threshold : Number.MAX_VALUE
  }
  const requiredBaseReward =
    reward / multiplier + (reward % multiplier === 0n ? 0n : 1n)
  const threshold = buyXCost(
    requiredBaseReward,
    ordinaryInfinityBotThreshold(state.divisionsPurchased),
    state.exponent,
    0,
  )
  return threshold > 0 && Number.isFinite(threshold)
    ? threshold
    : Number.MAX_VALUE
}

function clampBreakInfinityPresentationTarget(
  target: bigint,
): bigint {
  if (target < BREAK_INFINITY_PRESENTATION_TARGET_MINIMUM) {
    return BREAK_INFINITY_PRESENTATION_TARGET_MINIMUM
  }
  return target > BREAK_INFINITY_PRESENTATION_TARGET_MAXIMUM
    ? BREAK_INFINITY_PRESENTATION_TARGET_MAXIMUM
    : target
}

function finiteRemaining(threshold: number, current: number): number {
  if (threshold <= current) return 0
  const remaining = threshold - current
  return Number.isFinite(remaining) ? remaining : Number.MAX_VALUE
}

function clampUnitInterval(value: number): number {
  if (!Number.isFinite(value)) return value > 0 ? 1 : 0
  return Math.min(1, Math.max(0, value))
}

export function applyFiniteBotCapSpecialReward(
  state: DysonInfinityRunState,
): AppliedBotCapReward {
  // The legacy parity adapter may observe the boundary, but cannot grant the
  // retired automatic reward or perform the canonical voluntary reset.
  if (Number.isFinite(state.bots) && state.bots >= OVERFLOW_BOT_CAP) {
    state.bots = OVERFLOW_BOT_CAP
    state.infinity.botCapTransitionPending = true
    state.infinity.botCapRewardsGranted = false
    state.infinity.infinityInProgress = false
  }
  return { specialRewardGranted: false, infinityPointsGranted: 0n }
}

export function tryApplyBasicDysonInfinityReset(
  state: DysonInfinityRunState,
  minimumCycleSeconds: number,
): AppliedInfinityReset | undefined {
  const infinity = state.infinity
  if (infinity.botCapTransitionPending || state.bots >= OVERFLOW_BOT_CAP) return
  const botCapTransition = false
  if (infinity.secondsInCurrentCycle < minimumCycleSeconds) {
    return
  }

  const ordinaryThreshold = ordinaryInfinityBotThreshold(
    infinity.divisionsPurchased,
  )
  const breakReward = infinityPointsForBots(state.bots, infinity)
  if (
    (infinity.breakTheLoop
      ? breakReward < infinity.breakTarget
      : state.bots < ordinaryThreshold)
  ) {
    return
  }

  const requestedReward = infinity.breakTheLoop
    ? breakReward
    : infinityRewardMultiplier(infinity)
  infinity.infinityInProgress = true
  const resetState = {
    points: infinity.points,
    permanentSkillPoints: infinity.permanentSkillPoints,
    retainedFacilities: infinity.retainedFacilities,
    offlineTimeUsedThisInfinity:
      infinity.offlineTimeUsedThisInfinity,
    offlineTimeUsedPreviousInfinity:
      infinity.offlineTimeUsedPreviousInfinity,
    firstInfinityDone: infinity.firstInfinityDone,
    tutorial: infinity.tutorial,
    infinityInProgress: infinity.infinityInProgress,
    botCapTransitionPending: infinity.botCapTransitionPending,
    botCapRewardsGranted: infinity.botCapRewardsGranted,
    lastInfinityPointsGained: infinity.lastInfinityPointsGained,
    bots: state.bots,
    facilities: state.facilities,
    skillPoints: infinity.skillPoints,
    fragments: infinity.fragments,
    statistics: infinity.statistics,
  }
  const outcome = applyInfinityResetTransition(resetState, {
    breakInfinity: infinity.breakTheLoop,
    requestedReward,
    bankedSkillPoints: infinity.bankedSkillPoints,
    artifactSkillPoints: infinity.artifactSkillPoints,
    botCapTransition,
  })
  if (!outcome.applied) {
    infinity.infinityInProgress = false
    return
  }

  infinity.points = resetState.points
  infinity.startingPoints = resetState.points
  infinity.peakBots = resetState.bots
  infinity.offlineTimeUsedPreviousInfinity =
    resetState.offlineTimeUsedPreviousInfinity
  infinity.offlineTimeUsedThisInfinity =
    resetState.offlineTimeUsedThisInfinity
  infinity.firstInfinityDone = resetState.firstInfinityDone
  infinity.tutorial = resetState.tutorial
  infinity.infinityInProgress = resetState.infinityInProgress
  infinity.botCapTransitionPending =
    resetState.botCapTransitionPending
  infinity.botCapRewardsGranted = resetState.botCapRewardsGranted
  infinity.lastInfinityPointsGained =
    resetState.lastInfinityPointsGained
  infinity.skillPoints = resetState.skillPoints
  infinity.fragments = resetState.fragments
  infinity.statistics = resetState.statistics
  infinity.bankedSkillPoints = 0n
  infinity.secondsInCurrentCycle = 0
  state.bots = resetState.bots
  state.facilities = resetState.facilities
  state.money = 0
  state.science = 0
  state.panels = 0
  state.workers = 0
  state.researchers = 0
  state.moneyMultiplier = 1
  state.scienceMultiplier = 1
  state.panelRateMultiplier = 1
  state.panelLifetime = 10
  state.ownedSkills = []
  for (const id of BASIC_DYSON_FACILITY_IDS) {
    state.modifiers[id] = 1
  }

  return {
    breakInfinity: infinity.breakTheLoop,
    rewardGranted: outcome.rewardGranted,
  }
}
