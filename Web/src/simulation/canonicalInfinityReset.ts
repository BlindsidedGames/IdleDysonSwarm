import { getGameAsset } from '../game-data/catalog'
import type { RuntimeGameAsset } from '../game-data/types'
import type {
  CanonicalGameStateV1,
  CanonicalFacilityId,
  SimulationStatisticsState,
  SimulationTotalsState,
  SkillRuntimeState,
  StatisticsWindowState,
} from '../game-state/types'
import {
  addDiscrete,
  clampContinuous,
  DISCRETE_MAXIMUM,
  floorToDiscrete,
} from './numeric'

const INT32_MAXIMUM = 2_147_483_647n
const SKILL_DATABASE_KIND = 'GameData.SkillDatabase'
const SKILL_DATABASE_ID = 'SkillDatabase'
const SKILL_DEFINITION_KIND = 'GameData.SkillDefinition'

export interface CanonicalInfinityResetRequest {
  readonly breakInfinity: boolean
  readonly requestedReward: bigint
  /** Platform/achievement contribution derived outside player state. */
  readonly artifactSkillPoints: bigint
}

export type CanonicalInfinityResetIssueCode =
  | 'INFINITY_RESET_REQUEST_INVALID'
  | 'INFINITY_RESET_STATE_INVALID'
  | 'INFINITY_RESET_AUTO_ASSIGNMENT_INVALID'
  | 'INFINITY_RESET_SKILL_DATABASE_MISSING'
  | 'INFINITY_RESET_SKILL_DATABASE_INVALID'
  | 'INFINITY_RESET_SKILL_DEFINITION_MISSING'
  | 'INFINITY_RESET_SKILL_DEFINITION_INVALID'

export interface CanonicalInfinityResetIssue {
  readonly code: CanonicalInfinityResetIssueCode
  readonly path: string
  readonly detail: string
}

export type CanonicalInfinityResetResult =
  | {
      readonly ok: true
      readonly state: CanonicalGameStateV1
      readonly rewardGranted: bigint
      readonly bankedSkillPoints: bigint
      readonly autoAssignedSkillIds: readonly string[]
    }
  | {
      readonly ok: false
      readonly state: CanonicalGameStateV1
      readonly issues: readonly CanonicalInfinityResetIssue[]
    }

export type CanonicalInfinityResetAssetLookup = (
  kind: string,
  id: string,
) => RuntimeGameAsset | undefined

interface SkillAutoAssignmentRule {
  readonly id: string
  readonly cost: bigint
  readonly refundable: boolean
  readonly isFragment: boolean
  readonly requiredSkillIds: readonly string[]
  readonly shadowRequirementIds: readonly string[]
  readonly exclusiveWithIds: readonly string[]
  readonly unlock:
    | 'always'
    | 'first-infinity'
    | 'fragments'
    | 'purity'
    | 'terra'
    | 'power'
    | 'paragade'
    | 'stellar'
  readonly valid: boolean
}

interface AutoAssignmentOutcome {
  readonly points: bigint
  readonly fragments: bigint
  readonly byId: Readonly<Record<string, SkillRuntimeState>>
  readonly assignedIds: readonly string[]
}

interface InfinityStatisticsEvent {
  readonly ordinaryCount: bigint
  readonly breakCount: bigint
  readonly ordinaryPoints: bigint
  readonly breakPoints: bigint
}

const EMPTY_FACILITIES: Readonly<
  Record<CanonicalFacilityId, readonly [number, number]>
> = Object.freeze({
  assembly_lines: Object.freeze([0, 0] as const),
  ai_managers: Object.freeze([0, 0] as const),
  servers: Object.freeze([0, 0] as const),
  data_centers: Object.freeze([0, 0] as const),
  planets: Object.freeze([0, 0] as const),
  matrioshka_brains: Object.freeze([0, 0] as const),
  birch_planets: Object.freeze([0, 0] as const),
  galactic_brains: Object.freeze([0, 0] as const),
})

/**
 * Applies Unity's durable Infinity transition without presentation,
 * persistence, derived-state rebuilding, or event-time phase changes.
 *
 * Reward calculation remains a caller responsibility. The explicit requested
 * reward is saturated into the canonical point balance, and statistics record
 * only the amount that was actually granted.
 */
export function applyCanonicalInfinityReset(
  state: Readonly<CanonicalGameStateV1>,
  request: Readonly<CanonicalInfinityResetRequest>,
  lookup: CanonicalInfinityResetAssetLookup = getGameAsset,
): CanonicalInfinityResetResult {
  const issues = validateResetInputs(state, request)
  if (issues.length > 0) return failed(state, issues)

  const rulesResult = captureAutoAssignmentRules(
    state.skills.activeAutoAssignment,
    lookup,
  )
  if (!rulesResult.ok) return failed(state, rulesResult.issues)

  const previousPoints = state.infinity.points
  const nextPoints = addDiscrete(
    previousPoints,
    request.requestedReward,
  )
  const rewardGranted = nextPoints - previousPoints
  const bankedSkillPoints =
    owned(state.skills.byId, 'banking') +
    owned(state.skills.byId, 'investmentPortfolio')
  const initialSkillPoints = addDiscrete(
    addDiscrete(
      state.infinity.permanentSkillPoints,
      bankedSkillPoints,
    ),
    request.artifactSkillPoints,
  )
  const assignment = applyAutoAssignment(
    initialSkillPoints,
    state.skills.autoAssignNonRefundable,
    rulesResult.rules,
    state,
  )
  const resetSkillStates = materializeResetSkillStates(
    state.skills.byId,
    assignment.byId,
  )
  const facilities = retainedFacilities(state)
  const statistics = recordInfinityCycle(
    state.statistics,
    request.breakInfinity,
    rewardGranted,
    state.infinity.lastCycleDurationSeconds,
  )

  return {
    ok: true,
    state: {
      ...state,
      meta: {
        ...state.meta,
        tutorialComplete: true,
        firstInfinityComplete: true,
      },
      dyson: {
        ...state.dyson,
        money: 0,
        science: 0,
        bots: state.infinity.retainedFacilities.assembly_lines
          ? 10
          : 1,
        workers: 0,
        researchers: 0,
        facilities,
        totalPanelsDecayed: 0,
        goalStage: 0n,
      },
      infinity: {
        ...state.infinity,
        points: nextPoints,
        inProgress: false,
        botCapTransitionPending: false,
        botCapRewardsGranted: false,
        lastPointsGained: Number(
          rewardGranted > INT32_MAXIMUM
            ? INT32_MAXIMUM
            : rewardGranted,
        ),
        storedTimeUsedThisCycleSeconds: 0,
        storedTimeUsedPreviousCycleSeconds: clampContinuous(
          state.infinity.storedTimeUsedThisCycleSeconds,
        ),
      },
      skills: {
        ...state.skills,
        points: assignment.points,
        fragments: assignment.fragments,
        byId: resetSkillStates,
      },
      research: {
        ...state.research,
        levelsById: {},
        progressById: {},
      },
      statistics,
    },
    rewardGranted,
    bankedSkillPoints,
    autoAssignedSkillIds: assignment.assignedIds,
  }
}

function materializeResetSkillStates(
  previous: Readonly<Record<string, SkillRuntimeState>>,
  assigned: Readonly<Record<string, SkillRuntimeState>>,
): Record<string, SkillRuntimeState> {
  const ids = new Set([
    ...Object.keys(previous),
    ...Object.keys(assigned),
  ])
  return Object.fromEntries(
    [...ids].map((id) => [
      id,
      assigned[id] ?? {
        owned: false,
        level: 0,
        timerSeconds: 0,
        secondaryTimerSeconds: 0,
      },
    ]),
  )
}

function validateResetInputs(
  state: Readonly<CanonicalGameStateV1>,
  request: Readonly<CanonicalInfinityResetRequest>,
): CanonicalInfinityResetIssue[] {
  const issues: CanonicalInfinityResetIssue[] = []
  if (
    typeof request.breakInfinity !== 'boolean' ||
    typeof request.requestedReward !== 'bigint' ||
    request.requestedReward < 0n ||
    request.requestedReward > DISCRETE_MAXIMUM ||
    typeof request.artifactSkillPoints !== 'bigint' ||
    request.artifactSkillPoints < 0n ||
    request.artifactSkillPoints > DISCRETE_MAXIMUM
  ) {
    issues.push({
      code: 'INFINITY_RESET_REQUEST_INVALID',
      path: 'request',
      detail:
        'Infinity reset mode, reward, and artifact skill points must be valid non-negative Int64 values.',
    })
  }
  if (
    typeof state.infinity.points !== 'bigint' ||
    state.infinity.points < 0n ||
    state.infinity.points > DISCRETE_MAXIMUM
  ) {
    issues.push({
      code: 'INFINITY_RESET_STATE_INVALID',
      path: 'infinity.points',
      detail: 'Infinity points must be a non-negative Int64 value.',
    })
  }
  if (
    typeof state.infinity.permanentSkillPoints !== 'bigint' ||
    state.infinity.permanentSkillPoints < 0n ||
    state.infinity.permanentSkillPoints > DISCRETE_MAXIMUM
  ) {
    issues.push({
      code: 'INFINITY_RESET_STATE_INVALID',
      path: 'infinity.permanentSkillPoints',
      detail: 'Permanent skill points must be a non-negative Int64 value.',
    })
  }
  if (
    !Array.isArray(state.skills.activeAutoAssignment) ||
    state.skills.activeAutoAssignment.some(
      (id) => typeof id !== 'string',
    )
  ) {
    issues.push({
      code: 'INFINITY_RESET_AUTO_ASSIGNMENT_INVALID',
      path: 'skills.activeAutoAssignment',
      detail: 'Active skill auto-assignment must be a string ID list.',
    })
  }
  return issues
}

function retainedFacilities(
  state: Readonly<CanonicalGameStateV1>,
): CanonicalGameStateV1['dyson']['facilities'] {
  return {
    ...EMPTY_FACILITIES,
    assembly_lines: [
      0,
      state.infinity.retainedFacilities.assembly_lines ? 10 : 0,
    ],
    ai_managers: [
      0,
      state.infinity.retainedFacilities.ai_managers ? 10 : 0,
    ],
    servers: [
      0,
      state.infinity.retainedFacilities.servers ? 10 : 0,
    ],
    data_centers: [
      0,
      state.infinity.retainedFacilities.data_centers ? 10 : 0,
    ],
    planets: [
      0,
      state.infinity.retainedFacilities.planets ? 10 : 0,
    ],
  }
}

function owned(
  byId: Readonly<Record<string, SkillRuntimeState>>,
  id: string,
): bigint {
  return byId[id]?.owned === true ? 1n : 0n
}

function captureAutoAssignmentRules(
  ids: readonly string[],
  lookup: CanonicalInfinityResetAssetLookup,
):
  | {
      readonly ok: true
      readonly rules: readonly SkillAutoAssignmentRule[]
    }
  | {
      readonly ok: false
      readonly issues: readonly CanonicalInfinityResetIssue[]
    } {
  if (ids.length === 0) return { ok: true, rules: Object.freeze([]) }

  const database = lookup(SKILL_DATABASE_KIND, SKILL_DATABASE_ID)
  if (database === undefined) {
    return {
      ok: false,
      issues: Object.freeze([
        {
          code: 'INFINITY_RESET_SKILL_DATABASE_MISSING',
          path: 'gameData.SkillDatabase',
          detail:
            'Skill auto-assignment cannot be proven without the exported SkillDatabase.',
        },
      ]),
    }
  }
  const databaseIds = readSkillDatabaseIds(database)
  if (!databaseIds.ok) return databaseIds

  const rules: SkillAutoAssignmentRule[] = []
  const issues: CanonicalInfinityResetIssue[] = []
  for (const id of ids) {
    if (id.length === 0 || !databaseIds.ids.has(id)) {
      rules.push(invalidRule(id))
      continue
    }
    const asset = lookup(SKILL_DEFINITION_KIND, id)
    if (asset === undefined) {
      issues.push({
        code: 'INFINITY_RESET_SKILL_DEFINITION_MISSING',
        path: `gameData.skills.${id}`,
        detail: `SkillDatabase references missing skill '${id}'.`,
      })
      continue
    }
    const parsed = readSkillRule(asset, id)
    if (!parsed.ok) {
      issues.push(parsed.issue)
      continue
    }
    rules.push(parsed.rule)
  }
  return issues.length > 0
    ? { ok: false, issues: Object.freeze(issues) }
    : { ok: true, rules: Object.freeze(rules) }
}

function readSkillDatabaseIds(
  database: RuntimeGameAsset,
):
  | {
      readonly ok: true
      readonly ids: ReadonlySet<string>
    }
  | {
      readonly ok: false
      readonly issues: readonly CanonicalInfinityResetIssue[]
    } {
  const references = database.data.skills
  if (
    database.kind !== SKILL_DATABASE_KIND ||
    database.id !== SKILL_DATABASE_ID ||
    !Array.isArray(references)
  ) {
    return invalidSkillDatabase()
  }
  const ids = new Set<string>()
  for (const reference of references) {
    if (!isRecord(reference)) return invalidSkillDatabase()
    if (reference.id === null) continue
    if (
      typeof reference.id !== 'string' ||
      reference.id.length === 0
    ) {
      return invalidSkillDatabase()
    }
    ids.add(reference.id)
  }
  return { ok: true, ids }
}

function invalidSkillDatabase(): {
  readonly ok: false
  readonly issues: readonly CanonicalInfinityResetIssue[]
} {
  return {
    ok: false,
    issues: Object.freeze([
      {
        code: 'INFINITY_RESET_SKILL_DATABASE_INVALID',
        path: 'gameData.SkillDatabase.skills',
        detail:
          'The exported SkillDatabase must contain valid skill references.',
      },
    ]),
  }
}

function readSkillRule(
  asset: RuntimeGameAsset,
  id: string,
):
  | { readonly ok: true; readonly rule: SkillAutoAssignmentRule }
  | { readonly ok: false; readonly issue: CanonicalInfinityResetIssue } {
  const data = asset.data
  const cost = data.cost
  const refundable = readBooleanFlag(data.refundable)
  const isFragment = readBooleanFlag(data.isFragment)
  const requiredSkillIds = readStringArray(data.requiredSkillIds)
  const shadowRequirementIds = readStringArray(
    data.shadowRequirementIds,
  )
  const exclusiveWithIds = readStringArray(data.exclusiveWithIds)
  const unlock = readSkillUnlock(data)
  if (
    asset.kind !== SKILL_DEFINITION_KIND ||
    asset.id !== id ||
    typeof cost !== 'number' ||
    !Number.isSafeInteger(cost) ||
    cost < 0 ||
    cost > 2_147_483_647 ||
    refundable === undefined ||
    isFragment === undefined ||
    requiredSkillIds === undefined ||
    shadowRequirementIds === undefined ||
    exclusiveWithIds === undefined ||
    unlock === undefined
  ) {
    return {
      ok: false,
      issue: {
        code: 'INFINITY_RESET_SKILL_DEFINITION_INVALID',
        path: `gameData.skills.${id}`,
        detail: `Skill '${id}' does not match the exported auto-assignment contract.`,
      },
    }
  }
  return {
    ok: true,
    rule: {
      id,
      cost: BigInt(cost),
      refundable,
      isFragment,
      requiredSkillIds,
      shadowRequirementIds,
      exclusiveWithIds,
      unlock,
      valid: true,
    },
  }
}

function invalidRule(id: string): SkillAutoAssignmentRule {
  return {
    id,
    cost: 0n,
    refundable: true,
    isFragment: false,
    requiredSkillIds: Object.freeze([]),
    shadowRequirementIds: Object.freeze([]),
    exclusiveWithIds: Object.freeze([]),
    unlock: 'always',
    valid: false,
  }
}

function applyAutoAssignment(
  initialPoints: bigint,
  assignNonRefundable: boolean,
  rules: readonly SkillAutoAssignmentRule[],
  state: Readonly<CanonicalGameStateV1>,
): AutoAssignmentOutcome {
  let points = initialPoints
  let fragments = 0n
  const byId: Record<string, SkillRuntimeState> = {}
  const assignedIds: string[] = []
  let passesRemaining = rules.length
  let assignedAny: boolean
  do {
    assignedAny = false
    for (const rule of rules) {
      if (
        !rule.valid ||
        !isRuleUnlocked(rule, state) ||
        rule.id.length === 0 ||
        isOwned(byId, rule.id) ||
        points < rule.cost ||
        !allOwned(byId, rule.requiredSkillIds) ||
        !allOwned(byId, rule.shadowRequirementIds) ||
        anyOwned(byId, rule.exclusiveWithIds) ||
        (!assignNonRefundable && !rule.refundable)
      ) {
        continue
      }

      points -= rule.cost
      byId[rule.id] = {
        owned: true,
        level: 1,
        timerSeconds: 0,
        secondaryTimerSeconds: 0,
      }
      if (rule.isFragment) {
        fragments = addDiscrete(fragments, 1n)
      }
      assignedIds.push(rule.id)
      assignedAny = true
      if (points <= 0n) break
    }
    passesRemaining -= 1
  } while (assignedAny && points > 0n && passesRemaining > 0)

  return {
    points,
    fragments,
    byId,
    assignedIds: Object.freeze(assignedIds),
  }
}

function readSkillUnlock(
  data: Readonly<Record<string, unknown>>,
): SkillAutoAssignmentRule['unlock'] | undefined {
  const candidates = [
    ['firstRunBlocked', 'first-infinity'],
    ['isFragment', 'fragments'],
    ['purityLine', 'purity'],
    ['terraLine', 'terra'],
    ['powerLine', 'power'],
    ['paragadeLine', 'paragade'],
    ['stellarLine', 'stellar'],
  ] as const
  for (const [field, unlock] of candidates) {
    const value = readBooleanFlag(data[field])
    if (value === undefined) return undefined
    if (value) return unlock
  }
  return 'always'
}

function isRuleUnlocked(
  rule: Readonly<SkillAutoAssignmentRule>,
  state: Readonly<CanonicalGameStateV1>,
): boolean {
  switch (rule.unlock) {
    case 'always':
    case 'first-infinity':
      return true
    case 'fragments':
      return state.quantum.unlocks.fragments
    case 'purity':
      return state.quantum.unlocks.purity
    case 'terra':
      return state.quantum.unlocks.terra
    case 'power':
      return state.quantum.unlocks.power
    case 'paragade':
      return state.quantum.unlocks.paragade
    case 'stellar':
      return state.quantum.unlocks.stellar
  }
}

function allOwned(
  byId: Readonly<Record<string, SkillRuntimeState>>,
  ids: readonly string[],
): boolean {
  return ids.every((id) => isOwned(byId, id))
}

function anyOwned(
  byId: Readonly<Record<string, SkillRuntimeState>>,
  ids: readonly string[],
): boolean {
  return ids.some((id) => isOwned(byId, id))
}

function isOwned(
  byId: Readonly<Record<string, SkillRuntimeState>>,
  id: string,
): boolean {
  return byId[id]?.owned === true
}

function recordInfinityCycle(
  statistics: Readonly<SimulationStatisticsState>,
  breakInfinity: boolean,
  reward: bigint,
  durationSeconds: number,
): SimulationStatisticsState {
  const event: InfinityStatisticsEvent = {
    ordinaryCount: breakInfinity ? 0n : 1n,
    breakCount: breakInfinity ? 1n : 0n,
    ordinaryPoints: breakInfinity ? 0n : reward,
    breakPoints: breakInfinity ? reward : 0n,
  }
  const combinedPoints = addDiscrete(
    event.ordinaryPoints,
    event.breakPoints,
  )
  const combinedCount = addDiscrete(
    event.ordinaryCount,
    event.breakCount,
  )
  return {
    ...statistics,
    trackedSinceUpdate: true,
    trackingStartedMarker: statistics.trackedSinceUpdate
      ? statistics.trackingStartedMarker
      : 'tracked-since-update',
    lifetime: addStatisticsEvent(statistics.lifetime, event),
    currentQuantumRun: addStatisticsEvent(
      statistics.currentQuantumRun,
      event,
    ),
    recentProcessedSegment: addStatisticsEvent(
      statistics.recentProcessedSegment,
      event,
    ),
    lastCompletedCycle: {
      valid: true,
      breakInfinity,
      durationSeconds: clampContinuous(durationSeconds),
      reward,
      dreamCause: null,
    },
    minuteWindows: recordWindowEvent(
      statistics.minuteWindows,
      60,
      60,
      statistics.trackedSimulatedSeconds,
      combinedCount,
      combinedPoints,
    ),
    halfHourWindows: recordWindowEvent(
      statistics.halfHourWindows,
      48,
      1_800,
      statistics.trackedSimulatedSeconds,
      combinedCount,
      combinedPoints,
    ),
    dailyWindows: recordWindowEvent(
      statistics.dailyWindows,
      30,
      86_400,
      statistics.trackedSimulatedSeconds,
      combinedCount,
      combinedPoints,
    ),
  }
}

function addStatisticsEvent(
  totals: Readonly<SimulationTotalsState>,
  event: Readonly<InfinityStatisticsEvent>,
): SimulationTotalsState {
  return {
    ...totals,
    ordinaryInfinityCount: addDiscrete(
      totals.ordinaryInfinityCount,
      event.ordinaryCount,
    ),
    breakInfinityCount: addDiscrete(
      totals.breakInfinityCount,
      event.breakCount,
    ),
    ordinaryInfinityPoints: addDiscrete(
      totals.ordinaryInfinityPoints,
      event.ordinaryPoints,
    ),
    breakInfinityPoints: addDiscrete(
      totals.breakInfinityPoints,
      event.breakPoints,
    ),
  }
}

function recordWindowEvent(
  source: readonly StatisticsWindowState[],
  expectedLength: number,
  widthSeconds: number,
  trackedSimulatedSeconds: number,
  infinityCount: bigint,
  infinityPoints: bigint,
): readonly StatisticsWindowState[] {
  const windows =
    source.length === expectedLength
      ? [...source]
      : Array.from(
          { length: expectedLength },
          () => emptyWindow(0n),
        )
  const sequence = floorToDiscrete(
    clampContinuous(trackedSimulatedSeconds) / widthSeconds,
  )
  const index = Number(sequence % BigInt(expectedLength))
  const sourceBucket = windows[index]
  const bucket =
    sourceBucket.sequence === sequence
      ? sourceBucket
      : emptyWindow(sequence)
  windows[index] = {
    ...bucket,
    infinityCount: addDiscrete(
      bucket.infinityCount,
      infinityCount,
    ),
    infinityPoints: addDiscrete(
      bucket.infinityPoints,
      infinityPoints,
    ),
  }
  return windows
}

function emptyWindow(sequence: bigint): StatisticsWindowState {
  return {
    sequence,
    simulatedSeconds: 0,
    infinityCount: 0n,
    infinityPoints: 0n,
    dreamResetCount: 0n,
    strangeMatter: 0n,
    realityWorkers: 0n,
  }
}

function readBooleanFlag(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (value === 0) return false
  if (value === 1) return true
  return undefined
}

function readStringArray(
  value: unknown,
): readonly string[] | undefined {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== 'string')
  ) {
    return undefined
  }
  return value as readonly string[]
}

function isRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object'
}

function failed(
  state: Readonly<CanonicalGameStateV1>,
  issues: readonly CanonicalInfinityResetIssue[],
): CanonicalInfinityResetResult {
  return {
    ok: false,
    state,
    issues: Object.freeze([...issues]),
  }
}
