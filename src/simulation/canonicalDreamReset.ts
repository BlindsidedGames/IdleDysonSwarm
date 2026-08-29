import {
  isFiniteNonNegativeNumber as isFiniteNonNegative,
} from '../core/finiteNonNegativeNumber'
import type {
  CanonicalGameStateV1,
  DreamEducationId,
  DreamState,
  DreamUpgradeFlag,
  SimulationStatisticsState,
  SimulationTotalsState,
  StatisticsWindowState,
} from '../game-state/types'
import { updateStatisticsEventWindow } from './canonicalStatistics'
import {
  applyDreamMathematicsCompletionParity,
  applyDreamUpgradeEffect,
  findSimulationUpgradeCanonicalGaps,
  SIMULATION_UPGRADE_DEFINITIONS,
  type SimulationUpgradeDefinition,
} from './dreamEducationUpgrades'
import {
  addContinuous,
  addDiscrete,
  clampContinuous,
  CONTINUOUS_MAXIMUM,
  DISCRETE_MAXIMUM,
} from './numeric'

export type CanonicalDreamResetCause =
  | 'Meteor'
  | 'ArtificialIntelligence'
  | 'GlobalWarming'
  | 'BlackHole'

export type CanonicalDreamResetRequest =
  | { readonly kind: 'automatic' }
  | {
      readonly kind: 'explicit'
      readonly cause: CanonicalDreamResetCause
      readonly requestedReward: number
    }

export type CanonicalDreamResetNotAppliedReason =
  | 'not-ready'
  | 'reset-count-saturated'
  | 'reward-saturated'

export type CanonicalDreamResetIssueCode =
  | 'DREAM_RESET_REQUEST_INVALID'
  | 'DREAM_RESET_STATE_INVALID'
  | 'DREAM_RESET_DEFINITION_MISSING'
  | 'DREAM_RESET_DEFINITION_UNEXPECTED'
  | 'DREAM_RESET_DEFINITION_INVALID'
  | 'DREAM_RESET_EFFECT_UNSUPPORTED'

export interface CanonicalDreamResetIssue {
  readonly code: CanonicalDreamResetIssueCode
  readonly path: string
  readonly detail: string
}

export type CanonicalDreamResetResult =
  | {
      readonly ok: true
      readonly applied: true
      readonly state: CanonicalGameStateV1
      readonly cause: CanonicalDreamResetCause
      readonly requestedReward: number
      readonly rewardGranted: number
    }
  | {
      readonly ok: true
      readonly applied: false
      readonly state: CanonicalGameStateV1
      readonly reason: CanonicalDreamResetNotAppliedReason
    }
  | {
      readonly ok: false
      readonly applied: false
      readonly state: CanonicalGameStateV1
      readonly issues: readonly CanonicalDreamResetIssue[]
    }

export type CanonicalDreamResetDefinitions = ReadonlyMap<
  DreamUpgradeFlag,
  SimulationUpgradeDefinition
>

/**
 * Reports whether an automatic reset can make an observable state change.
 * Event-time scheduling uses this rather than readiness alone so a saturated
 * counter cannot remain an always-due zero-time event.
 */
export function canApplyCanonicalAutomaticDreamReset(
  state: Readonly<CanonicalGameStateV1>,
): boolean {
  const outcome = getOutcome(state, { kind: 'automatic' })
  if (outcome === null || state.dream.resetCount >= DISCRETE_MAXIMUM) {
    return false
  }
  if (outcome.requestedReward <= 0) return true
  return state.dream.strangeMatter < CONTINUOUS_MAXIMUM
}

interface DreamResetOutcome {
  readonly cause: CanonicalDreamResetCause
  readonly requestedReward: number
}

const EXPECTED_SIMULATION_DEFINITION_KEYS = [
  'counterMeteor',
  'counterAi',
  'counterGw',
  'engineering1',
  'engineering2',
  'engineering3',
  'shipping1',
  'shipping2',
  'worldTrade1',
  'worldTrade2',
  'worldTrade3',
  'worldPeace1',
  'worldPeace2',
  'worldPeace3',
  'worldPeace4',
  'mathematics1',
  'mathematics2',
  'mathematics3',
  'advancedPhysics1',
  'advancedPhysics2',
  'advancedPhysics3',
  'advancedPhysics4',
  'hunter1',
  'hunter2',
  'hunter3',
  'hunter4',
  'gatherer1',
  'gatherer2',
  'gatherer3',
  'gatherer4',
  'workerBoost',
  'citiesBoost',
  'factoriesBoost',
  'bots1',
  'bots2',
  'rockets1',
  'rockets2',
  'rockets3',
  'sfacs1',
  'sfacs2',
  'sfacs3',
  'railguns1',
  'railguns2',
] as const satisfies readonly DreamUpgradeFlag[]

const EXPECTED_SIMULATION_DEFINITION_SET = new Set<string>(
  EXPECTED_SIMULATION_DEFINITION_KEYS,
)

/**
 * Applies one atomic Unity-parity Dream reset. Presentation, persistence,
 * runtime timer rebuilding, and event-time phase movement remain caller-owned.
 */
export function applyCanonicalDreamReset(
  state: Readonly<CanonicalGameStateV1>,
  request: Readonly<CanonicalDreamResetRequest>,
  definitions: CanonicalDreamResetDefinitions =
    SIMULATION_UPGRADE_DEFINITIONS,
): CanonicalDreamResetResult {
  const inputIssues = validateInputs(state, request)
  if (inputIssues.length > 0) return failed(state, inputIssues)

  const outcome = getOutcome(state, request)
  if (outcome === null) return notApplied(state, 'not-ready')

  const nextCount = addDiscrete(state.dream.resetCount, 1n)
  if (nextCount <= state.dream.resetCount) {
    return notApplied(state, 'reset-count-saturated')
  }
  const nextStrangeMatter = addContinuous(
    state.dream.strangeMatter,
    outcome.requestedReward,
  )
  if (
    request.kind === 'automatic' &&
    outcome.requestedReward > 0 &&
    nextStrangeMatter <= state.dream.strangeMatter
  ) {
    return notApplied(state, 'reward-saturated')
  }
  const rewardGranted = nextStrangeMatter - state.dream.strangeMatter

  const definitionIssues = validateDefinitions(definitions)
  if (definitionIssues.length > 0) {
    return failed(state, definitionIssues)
  }

  let candidate: CanonicalGameStateV1 = {
    ...state,
    dream: createResetDream(
      state.dream,
      nextCount,
      nextStrangeMatter,
    ),
    statistics: recordDreamReset(
      state.statistics,
      outcome.cause,
      rewardGranted,
    ),
  }
  for (const definition of definitions.values()) {
    if (!candidate.dream.upgrades[definition.key]) continue
    for (const effect of definition.purchaseEffects) {
      candidate = applyDreamUpgradeEffect(candidate, effect, roundedDiscrete)
    }
  }
  if (candidate.dream.upgrades.mathematics3) {
    candidate = applyDreamMathematicsCompletionParity(candidate)
  }
  candidate = {
    ...candidate,
    dream: {
      ...candidate.dream,
      disasterStage: disasterStageFor(candidate.dream.upgrades),
    },
  }

  return {
    ok: true,
    applied: true,
    state: candidate,
    cause: outcome.cause,
    requestedReward: outcome.requestedReward,
    rewardGranted,
  }
}

/**
 * Captures the current launched-panel balance exactly once and routes the
 * canonical Black Hole action through the same atomic reset transition.
 */
export function applyCanonicalBlackHoleReset(
  state: Readonly<CanonicalGameStateV1>,
  definitions: CanonicalDreamResetDefinitions =
    SIMULATION_UPGRADE_DEFINITIONS,
): CanonicalDreamResetResult {
  return applyCanonicalDreamReset(
    state,
    {
      kind: 'explicit',
      cause: 'BlackHole',
      requestedReward: clampContinuous(Number(state.dream.resources.swarmPanels)),
    },
    definitions,
  )
}

function getOutcome(
  state: Readonly<CanonicalGameStateV1>,
  request: Readonly<CanonicalDreamResetRequest>,
): DreamResetOutcome | null {
  if (request.kind === 'explicit') {
    return {
      cause: request.cause,
      requestedReward:
        request.requestedReward < 0 ? 0 : request.requestedReward,
    }
  }

  switch (state.dream.disasterStage) {
    case 0n:
    case 1n:
      return state.dream.resources.cities >= 1
        ? { cause: 'Meteor', requestedReward: 1 }
        : null
    case 2n:
      return state.dream.resources.bots >= 100
        ? {
            cause: 'ArtificialIntelligence',
            requestedReward: 10,
          }
        : null
    case 3n:
      return state.dream.resources.spaceFactories >= 5
        ? { cause: 'GlobalWarming', requestedReward: 20 }
        : null
    default:
      return null
  }
}

function validateInputs(
  state: Readonly<CanonicalGameStateV1>,
  request: Readonly<CanonicalDreamResetRequest>,
): CanonicalDreamResetIssue[] {
  const issues: CanonicalDreamResetIssue[] = []
  if (
    request === null ||
    typeof request !== 'object' ||
    (request.kind !== 'automatic' && request.kind !== 'explicit')
  ) {
    issues.push({
      code: 'DREAM_RESET_REQUEST_INVALID',
      path: 'request',
      detail: 'Dream reset request kind must be automatic or explicit.',
    })
    return issues
  }
  if (
    request.kind === 'explicit' &&
    (!isCause(request.cause) ||
      typeof request.requestedReward !== 'number' ||
      !Number.isFinite(request.requestedReward) ||
      request.requestedReward < 0)
  ) {
    issues.push({
      code: 'DREAM_RESET_REQUEST_INVALID',
      path: 'request',
      detail:
        'Explicit Dream reset cause and requested Simulation-resource reward are invalid.',
    })
  }
  if (
    !isDiscrete(state.dream.resetCount) ||
    !isContinuousResource(state.dream.strangeMatter) ||
    !isDiscrete(state.dream.disasterStage) ||
    !isSimulationResource(state.dream.resources.swarmPanels) ||
    !isFiniteNonNegative(state.dream.resources.cities) ||
    !isFiniteNonNegative(state.dream.resources.bots) ||
    !isFiniteNonNegative(state.dream.resources.spaceFactories)
  ) {
    issues.push({
      code: 'DREAM_RESET_STATE_INVALID',
      path: 'dream',
      detail:
        'Dream counters, stage, and automatic-reset resources must be valid non-negative values.',
    })
  }
  return issues
}

function validateDefinitions(
  definitions: CanonicalDreamResetDefinitions,
): CanonicalDreamResetIssue[] {
  const issues: CanonicalDreamResetIssue[] = []
  for (const key of EXPECTED_SIMULATION_DEFINITION_KEYS) {
    const definition = definitions.get(key)
    if (definition === undefined) {
      issues.push({
        code: 'DREAM_RESET_DEFINITION_MISSING',
        path: `gameData.simulationUpgrades.${key}`,
        detail: `Simulation-layer definition '${key}' is missing.`,
      })
      continue
    }
    if (
      definition.key !== key ||
      !Array.isArray(definition.purchaseEffects) ||
      definition.purchaseEffects.length === 0
    ) {
      issues.push({
        code: 'DREAM_RESET_DEFINITION_INVALID',
        path: `gameData.simulationUpgrades.${key}`,
        detail: `Simulation-layer definition '${key}' is malformed.`,
      })
    }
  }
  for (const key of definitions.keys()) {
    if (!EXPECTED_SIMULATION_DEFINITION_SET.has(key)) {
      issues.push({
        code: 'DREAM_RESET_DEFINITION_UNEXPECTED',
        path: `gameData.simulationUpgrades.${key}`,
        detail: `Unexpected Simulation-layer definition '${key}'.`,
      })
    }
  }
  for (const gap of findSimulationUpgradeCanonicalGaps(definitions)) {
    issues.push({
      code: 'DREAM_RESET_EFFECT_UNSUPPORTED',
      path: `gameData.simulationUpgrades.${gap}`,
      detail: `Simulation-layer effect '${gap}' has no canonical target.`,
    })
  }
  return issues
}

function createResetDream(
  source: Readonly<DreamState>,
  resetCount: bigint,
  strangeMatter: number,
): DreamState {
  return {
    resources: {
      hunters: 0n,
      gatherers: 0n,
      community: 0,
      housing: 0,
      villages: 0,
      workers: 0,
      cities: 0,
      factories: 0,
      bots: 0,
      rockets: 0,
      energy: 0,
      spaceFactories: 0,
      dysonPanels: 0n,
      railgunCharge: 0,
      solarPanels: 0,
      fusion: 0,
      swarmPanels: 0n,
    },
    parameters: {
      hunterCost: 100n,
      gathererCost: 100n,
      communityBoostCost: 0,
      communityBoostIsFree: true,
      communityBoostClock: 0,
      communityBoostDuration: 1_200,
      factoriesBoostCost: 5_000,
      factoriesBoostClock: 0,
      factoriesBoostDuration: 1_200,
      rocketsPerSpaceFactory: 10n,
      railgunMaxCharge: 25_000_000,
      solarCost: 50n,
      solarPanelGeneration: 100n,
      fusionCost: 100_000n,
      fusionGeneration: 1_250_000n,
      swarmPanelGeneration: 3_212n,
    },
    education: {
      engineering: education(600, 1_000),
      shipping: education(1_800, 5_000),
      worldTrade: education(3_600, 7_000),
      worldPeace: education(7_200, 8_000),
      mathematics: education(3_600, 10_000),
      advancedPhysics: education(7_200, 11_000),
    },
    timers: {
      hunterTimerProgress: 0,
      gathererTimerProgress: 0,
      communityTimerProgress: 0,
      housingTimerProgress: 0,
      villagesTimerProgress: 0,
      workersTimerProgress: 0,
      citiesTimerProgress: 0,
      factoriesTimerProgress: 0,
      botsTimerProgress: 0,
      spaceFactoriesTimerProgress: 0,
    },
    railgun: {
      firing: false,
      fireProgress: 0,
      shotsRemaining: 0,
      activeRailguns: 0,
      reservedPanels: 0n,
      highestStoredPanels: 0n,
      lastRoundsFired: 0,
      lastPanelsLaunched: 0n,
    },
    resetCount,
    strangeMatter,
    disasterStage: 0n,
    upgrades: source.upgrades,
    huntersPerPurchase: source.huntersPerPurchase,
    gatherersPerPurchase: source.gatherersPerPurchase,
    purchaseBatches: {
      hunters: 0n,
      gatherers: 0n,
      solar: 0n,
      fusion: 0n,
    },
  }
}

function education(
  researchTime: number,
  cost: number,
): DreamState['education'][DreamEducationId] {
  return {
    active: false,
    complete: false,
    progress: 0,
    researchTime,
    cost,
  }
}

function disasterStageFor(
  upgrades: Readonly<Record<DreamUpgradeFlag, boolean>>,
): bigint {
  if (!upgrades.counterMeteor) return 1n
  if (!upgrades.counterAi) return 2n
  if (!upgrades.counterGw) return 3n
  return 42n
}

function recordDreamReset(
  statistics: Readonly<SimulationStatisticsState>,
  cause: CanonicalDreamResetCause,
  requestedReward: number,
): SimulationStatisticsState {
  return {
    ...statistics,
    trackedSinceUpdate: true,
    trackingStartedMarker: statistics.trackedSinceUpdate
      ? statistics.trackingStartedMarker
      : 'tracked-since-update',
    lifetime: addDreamTotals(
      statistics.lifetime,
      cause,
      requestedReward,
    ),
    currentQuantumRun: addDreamTotals(
      statistics.currentQuantumRun,
      cause,
      requestedReward,
    ),
    recentProcessedSegment: addDreamTotals(
      statistics.recentProcessedSegment,
      cause,
      requestedReward,
    ),
    lastCompletedCycle: {
      valid: true,
      breakInfinity: false,
      durationSeconds: 0,
      reward: requestedReward,
      dreamCause: cause,
    },
    minuteWindows: addDreamWindow(
      statistics.minuteWindows,
      60,
      60,
      statistics.trackedSimulatedSeconds,
      requestedReward,
    ),
    halfHourWindows: addDreamWindow(
      statistics.halfHourWindows,
      48,
      1_800,
      statistics.trackedSimulatedSeconds,
      requestedReward,
    ),
    dailyWindows: addDreamWindow(
      statistics.dailyWindows,
      30,
      86_400,
      statistics.trackedSimulatedSeconds,
      requestedReward,
    ),
  }
}

function addDreamTotals(
  totals: Readonly<SimulationTotalsState>,
  cause: CanonicalDreamResetCause,
  requestedReward: number,
): SimulationTotalsState {
  return {
    ...totals,
    meteorDreamResets: addDiscrete(
      totals.meteorDreamResets,
      cause === 'Meteor' ? 1n : 0n,
    ),
    aiDreamResets: addDiscrete(
      totals.aiDreamResets,
      cause === 'ArtificialIntelligence' ? 1n : 0n,
    ),
    globalWarmingDreamResets: addDiscrete(
      totals.globalWarmingDreamResets,
      cause === 'GlobalWarming' ? 1n : 0n,
    ),
    blackHoleDreamResets: addDiscrete(
      totals.blackHoleDreamResets,
      cause === 'BlackHole' ? 1n : 0n,
    ),
    strangeMatter: addContinuous(
      totals.strangeMatter,
      requestedReward,
    ),
  }
}

function addDreamWindow(
  source: readonly StatisticsWindowState[],
  expectedLength: number,
  widthSeconds: number,
  trackedSimulatedSeconds: number,
  requestedReward: number,
): readonly StatisticsWindowState[] {
  return updateStatisticsEventWindow(
    source,
    expectedLength,
    widthSeconds,
    trackedSimulatedSeconds,
    (bucket) => ({
      ...bucket,
      dreamResetCount: addDiscrete(bucket.dreamResetCount, 1n),
      strangeMatter: addContinuous(
        bucket.strangeMatter,
        requestedReward,
      ),
    }),
  )
}

function roundedDiscrete(value: number): bigint {
  const floor = Math.floor(value)
  const fraction = value - floor
  const rounded =
    fraction < 0.5
      ? floor
      : fraction > 0.5
        ? floor + 1
        : floor % 2 === 0
          ? floor
          : floor + 1
  return BigInt(rounded)
}

function isCause(value: unknown): value is CanonicalDreamResetCause {
  return (
    value === 'Meteor' ||
    value === 'ArtificialIntelligence' ||
    value === 'GlobalWarming' ||
    value === 'BlackHole'
  )
}

function isDiscrete(value: unknown): value is bigint {
  return (
    typeof value === 'bigint' &&
    value >= 0n &&
    value <= DISCRETE_MAXIMUM
  )
}

function isContinuousResource(value: unknown): value is number {
  return isFiniteNonNegative(value)
}

function isSimulationResource(value: unknown): value is bigint {
  return (
    typeof value === 'bigint' &&
    value >= 0n &&
    value <= BigInt(CONTINUOUS_MAXIMUM)
  )
}

function notApplied(
  state: Readonly<CanonicalGameStateV1>,
  reason: CanonicalDreamResetNotAppliedReason,
): CanonicalDreamResetResult {
  return {
    ok: true,
    applied: false,
    state,
    reason,
  }
}

function failed(
  state: Readonly<CanonicalGameStateV1>,
  issues: readonly CanonicalDreamResetIssue[],
): CanonicalDreamResetResult {
  return {
    ok: false,
    applied: false,
    state,
    issues: Object.freeze([...issues]),
  }
}
