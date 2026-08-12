import {
  GAME_DECIMAL_ZERO,
  addGameDecimals,
  compareGameDecimals,
  divideGameDecimals,
  floorGameDecimal,
  gameDecimalFromBigInt,
  gameDecimalFromNumber,
  gameDecimalToBigIntChecked,
  multiplyGameDecimals,
  subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'
import { V2_EVENT_BOUNDARY_ORDER } from './eventTimeV2'
export { STORED_TIME_FAST_DISCLOSURE_V2 } from './storedTimePolicyDisclosureV2'

export const STORED_TIME_POLICY_SUPPORT_V2 = Object.freeze([
  Object.freeze({ id: 'stored-time-fast-v1', version: 1 as const }),
  Object.freeze({ id: 'stored-time-balanced-v1', version: 1 as const }),
  Object.freeze({ id: 'stored-time-exact-v1', version: 1 as const }),
] as const)

export type StoredTimePolicySupportV2 =
  (typeof STORED_TIME_POLICY_SUPPORT_V2)[number]
export type StoredTimePolicyIdV2 = StoredTimePolicySupportV2['id']

export const STORED_TIME_AUTOMATIC_EXACT_BOUNDARY_LIMIT_V2 = 4_096n
export const STORED_TIME_FAST_MAXIMUM_GROUPS_V2 = 4_096
export const STORED_TIME_BALANCED_BUDGET_MILLISECONDS_V2 = 60_000
export const STORED_TIME_MAXIMUM_DURATION_SECONDS_V2 = 42_000_000
export const STORED_TIME_MINIMUM_AUTOMATION_INTERVAL_SECONDS_V2 = 1e-12
export const STORED_TIME_MAXIMUM_HARD_EVENTS_V2 = 64

export type StoredTimeCanonicalBoundaryPhaseV2 =
  (typeof V2_EVENT_BOUNDARY_ORDER)[number]
export type StoredTimeNonAutomationBoundaryPhaseV2 = Exclude<
  StoredTimeCanonicalBoundaryPhaseV2,
  'automation'
>

const AUTOMATION_TARGET_COUNT_V2 = 8n
const AUTOMATION_BOUNDARY_ORDER_V2 = V2_EVENT_BOUNDARY_ORDER.indexOf('automation')
const issuedPlans = new WeakSet<object>()

export interface StoredTimeHardEventV2 {
  readonly id: string
  readonly horizonSeconds: number
  readonly boundaryPhase: StoredTimeNonAutomationBoundaryPhaseV2
}

export interface StoredTimePolicyPlanRequestV2 {
  readonly policyId: StoredTimePolicyIdV2
  readonly policyVersion: number
  readonly requestedDurationSeconds: number
  readonly initialAutomationHorizonSeconds: number
  readonly automationIntervalSeconds: number
  readonly initialAutomationTargetIndex: number
  readonly hardEvents: readonly Readonly<StoredTimeHardEventV2>[]
}

export type StoredTimePolicyExecutionKindV2 =
  | 'exact-raw-ticks'
  | 'fast-representative-groups'

export interface StoredTimeRepresentativeGroupV2 {
  readonly index: number
  readonly logicalRawTicks: bigint
  readonly omittedRawTicks: bigint
  readonly startsAt: GameDecimal
  readonly continuousDuration: GameDecimal
  readonly endsAt: GameDecimal
  readonly remainingRequestedDurationAfter: GameDecimal
  readonly capturesRatesAtStart: true
  readonly executesOneAutomationAtEnd: true
  readonly advancesTargetIndexOnce: true
}

export type StoredTimeHardEventPhaseV2 =
  | 'initial-due-boundary'
  | 'exact-replay'
  | 'representative-group'
  | 'final-remainder'

export interface StoredTimeHardEventSplitV2 {
  readonly id: string
  readonly boundaryPhase: StoredTimeNonAutomationBoundaryPhaseV2
  readonly boundaryOrder: number
  readonly horizon: GameDecimal
  readonly phase: StoredTimeHardEventPhaseV2
  readonly groupIndex: number | null
  readonly offsetWithinPhase: GameDecimal
  readonly coincidentWithRepresentativeBoundary: boolean
  readonly recaptureRatesAfterEvent: true
  readonly createsRepresentativeAutomation: false
}

export interface StoredTimePolicyPlanV2 {
  readonly policyId: StoredTimePolicyIdV2
  readonly policyVersion: 1
  readonly executionKind: StoredTimePolicyExecutionKindV2
  readonly automaticExact: boolean
  readonly balancedWallBudgetMilliseconds: number | null
  readonly requestedDurationSeconds: number
  readonly initialAutomationHorizonSeconds: number
  readonly automationIntervalSeconds: number
  readonly initialAutomationTargetIndex: number
  readonly initialDueBoundary: boolean
  readonly requestedDuration: GameDecimal
  readonly rawAutomationBoundaries: bigint
  readonly futureAutomationBoundaries: bigint
  readonly representativeAutomationBoundaries: bigint
  readonly omittedAutomationBoundaries: bigint
  readonly prefix: GameDecimal
  readonly finalRemainder: GameDecimal
  readonly finalRawAutomationTimeUntilNextEvent: GameDecimal
  readonly finalRawAutomationTargetIndex: number
  readonly finalPlannedAutomationTargetIndex: number
  readonly groups: readonly Readonly<StoredTimeRepresentativeGroupV2>[]
  readonly hardEventSplits: readonly Readonly<StoredTimeHardEventSplitV2>[]
  readonly hardEventsRecaptureRates: true
  readonly representativeGoalsApplyAfterAutomation: true
  readonly omittedTicksPurchaseNothing: true
  readonly omittedTicksDoNotRotateTarget: true
}

export interface StoredTimePolicyBudgetStateV2 {
  readonly policyId: StoredTimePolicyIdV2
  readonly startedAtMilliseconds: number
  readonly lastObservedAtMilliseconds: number
  readonly elapsedMilliseconds: number
  readonly limitMilliseconds: number | null
  readonly expired: boolean
}

export interface StoredTimeRepresentativeExecutionSegmentV2 {
  readonly startsAtWithinGroup: GameDecimal
  readonly endsAtWithinGroup: GameDecimal
  readonly duration: GameDecimal
  readonly preRepresentativeAutomationEvents: readonly Readonly<StoredTimeHardEventSplitV2>[]
  readonly executesRepresentativeAutomationAtTerminal: boolean
  readonly postRepresentativeAutomationEvents: readonly Readonly<StoredTimeHardEventSplitV2>[]
  readonly appliesGoalTransitionsAndSnapshotAtDerivedPhase: boolean
  readonly goalTransitionsAndSnapshotPhase: 'derived-timers-and-double-time'
  readonly recaptureRatesAfterTerminalEvents: boolean
}

export interface StoredTimeRepresentativeGroupExecutionV2 {
  readonly groupIndex: number
  readonly segments: readonly Readonly<StoredTimeRepresentativeExecutionSegmentV2>[]
  readonly boundaryOrder: typeof V2_EVENT_BOUNDARY_ORDER
  readonly logicalRawTicks: bigint
  readonly omittedRawTicks: bigint
  readonly executeOneRepresentativeAutomation: true
  readonly advanceTargetIndexOnce: true
  readonly applyGoalTransitionsAfterAutomation: true
  readonly recaptureRatesForNextGroup: true
}

export function planStoredTimePolicyV2(
  value: Readonly<StoredTimePolicyPlanRequestV2>,
): Readonly<StoredTimePolicyPlanV2> {
  const request = capturePlanRequest(value)
  const duration = gameDecimalFromNumber(request.requestedDurationSeconds)
  const interval = gameDecimalFromNumber(request.automationIntervalSeconds)
  const initialDueBoundary = request.initialAutomationHorizonSeconds === 0
  const positiveHorizon = initialDueBoundary
    ? interval
    : gameDecimalFromNumber(request.initialAutomationHorizonSeconds)
  const futureAutomationBoundaries = countFutureAutomationBoundaries(
    duration,
    positiveHorizon,
    interval,
  )
  const rawAutomationBoundaries = futureAutomationBoundaries +
    (initialDueBoundary ? 1n : 0n)
  const automaticExact = rawAutomationBoundaries <=
    STORED_TIME_AUTOMATIC_EXACT_BOUNDARY_LIMIT_V2
  const executionKind: StoredTimePolicyExecutionKindV2 =
    request.policyId === 'stored-time-fast-v1' && !automaticExact
      ? 'fast-representative-groups'
      : 'exact-raw-ticks'
  const lastFutureBoundary = lastFutureBoundaryV2(
    futureAutomationBoundaries,
    positiveHorizon,
    interval,
  )
  const finalRemainder = lastFutureBoundary === null
    ? initialDueBoundary ? duration : GAME_DECIMAL_ZERO
    : subtractNonNegativeV2(duration, lastFutureBoundary)
  const prefix = futureAutomationBoundaries === 0n
    ? initialDueBoundary ? GAME_DECIMAL_ZERO : duration
    : positiveHorizon
  const groups = executionKind === 'fast-representative-groups'
    ? createRepresentativeGroupsV2(
      futureAutomationBoundaries,
      positiveHorizon,
      interval,
      duration,
    )
    : Object.freeze([])
  const representativeAutomationBoundaries = executionKind ===
    'fast-representative-groups'
    ? BigInt(groups.length) + (initialDueBoundary ? 1n : 0n)
    : rawAutomationBoundaries
  const omittedAutomationBoundaries = rawAutomationBoundaries -
    representativeAutomationBoundaries
  const finalRawAutomationTimeUntilNextEvent = rawAutomationBoundaries === 0n
    ? subtractNonNegativeV2(positiveHorizon, duration)
    : compareGameDecimals(finalRemainder, GAME_DECIMAL_ZERO) === 0
      ? interval
      : subtractNonNegativeV2(interval, finalRemainder)
  const hardEventSplits = createHardEventSplitsV2(
    request.hardEvents,
    duration,
    initialDueBoundary,
    executionKind,
    groups,
    finalRemainder,
  )
  const finalRawAutomationTargetIndex = rotateTargetIndexV2(
    request.initialAutomationTargetIndex,
    rawAutomationBoundaries,
  )
  const finalPlannedAutomationTargetIndex = rotateTargetIndexV2(
    request.initialAutomationTargetIndex,
    representativeAutomationBoundaries,
  )
  const plan = Object.freeze({
    policyId: request.policyId,
    policyVersion: 1 as const,
    executionKind,
    automaticExact,
    balancedWallBudgetMilliseconds:
      request.policyId === 'stored-time-balanced-v1'
        ? STORED_TIME_BALANCED_BUDGET_MILLISECONDS_V2
        : null,
    requestedDurationSeconds: request.requestedDurationSeconds,
    initialAutomationHorizonSeconds:
      request.initialAutomationHorizonSeconds,
    automationIntervalSeconds: request.automationIntervalSeconds,
    initialAutomationTargetIndex: request.initialAutomationTargetIndex,
    initialDueBoundary,
    requestedDuration: duration,
    rawAutomationBoundaries,
    futureAutomationBoundaries,
    representativeAutomationBoundaries,
    omittedAutomationBoundaries,
    prefix,
    finalRemainder,
    finalRawAutomationTimeUntilNextEvent,
    finalRawAutomationTargetIndex,
    finalPlannedAutomationTargetIndex,
    groups,
    hardEventSplits,
    hardEventsRecaptureRates: true as const,
    representativeGoalsApplyAfterAutomation: true as const,
    omittedTicksPurchaseNothing: true as const,
    omittedTicksDoNotRotateTarget: true as const,
  })
  issuedPlans.add(plan)
  return plan
}

export function partitionStoredTimeRepresentativeGroupsV2(
  plan: Readonly<StoredTimePolicyPlanV2>,
  maximumGroupsPerPartition: number,
): readonly (readonly Readonly<StoredTimeRepresentativeGroupV2>[])[] {
  requireIssuedPlan(plan)
  if (
    !Number.isSafeInteger(maximumGroupsPerPartition) ||
    maximumGroupsPerPartition < 1 ||
    maximumGroupsPerPartition > STORED_TIME_FAST_MAXIMUM_GROUPS_V2
  ) {
    throw new RangeError('Stored-time group partition size is outside its closed bounds.')
  }
  const partitions: (readonly Readonly<StoredTimeRepresentativeGroupV2>[])[] = []
  for (let index = 0; index < plan.groups.length; index += maximumGroupsPerPartition) {
    partitions.push(Object.freeze(
      plan.groups.slice(index, index + maximumGroupsPerPartition),
    ))
  }
  return Object.freeze(partitions)
}

/**
 * Pure execution seam for one representative group. Hard events split only
 * its continuous material segment; none creates another automation decision.
 */
export function createStoredTimeRepresentativeGroupExecutionV2(
  plan: Readonly<StoredTimePolicyPlanV2>,
  groupIndex: number,
): Readonly<StoredTimeRepresentativeGroupExecutionV2> {
  requireIssuedPlan(plan)
  if (
    !Number.isSafeInteger(groupIndex) ||
    groupIndex < 0 ||
    groupIndex >= plan.groups.length
  ) {
    throw new RangeError('Stored-time representative group index is invalid.')
  }
  const group = plan.groups[groupIndex]
  const splits = plan.hardEventSplits.filter((split) =>
    split.phase === 'representative-group' && split.groupIndex === groupIndex
  )
  const segments: Readonly<StoredTimeRepresentativeExecutionSegmentV2>[] = []
  let cursor = GAME_DECIMAL_ZERO
  for (let index = 0; index < splits.length;) {
    const offset = splits[index].offsetWithinPhase
    const terminalEvents: Readonly<StoredTimeHardEventSplitV2>[] = []
    while (
      index < splits.length &&
      compareGameDecimals(splits[index].offsetWithinPhase, offset) === 0
    ) {
      terminalEvents.push(splits[index])
      index += 1
    }
    const representativeAutomationAtTerminal = compareGameDecimals(
      offset,
      group.continuousDuration,
    ) === 0
    segments.push(Object.freeze({
      startsAtWithinGroup: cursor,
      endsAtWithinGroup: offset,
      duration: subtractNonNegativeV2(offset, cursor),
      preRepresentativeAutomationEvents: Object.freeze(
        terminalEvents.filter((event) => event.boundaryOrder < AUTOMATION_BOUNDARY_ORDER_V2),
      ),
      executesRepresentativeAutomationAtTerminal: representativeAutomationAtTerminal,
      postRepresentativeAutomationEvents: Object.freeze(
        terminalEvents.filter((event) => event.boundaryOrder > AUTOMATION_BOUNDARY_ORDER_V2),
      ),
      appliesGoalTransitionsAndSnapshotAtDerivedPhase: true,
      goalTransitionsAndSnapshotPhase: 'derived-timers-and-double-time',
      recaptureRatesAfterTerminalEvents: true,
    }))
    cursor = offset
  }
  if (
    compareGameDecimals(cursor, group.continuousDuration) < 0 ||
    segments.length === 0
  ) {
    segments.push(Object.freeze({
      startsAtWithinGroup: cursor,
      endsAtWithinGroup: group.continuousDuration,
      duration: subtractNonNegativeV2(
        group.continuousDuration,
        cursor,
      ),
      preRepresentativeAutomationEvents: Object.freeze([]),
      executesRepresentativeAutomationAtTerminal: true,
      postRepresentativeAutomationEvents: Object.freeze([]),
      appliesGoalTransitionsAndSnapshotAtDerivedPhase: true,
      goalTransitionsAndSnapshotPhase: 'derived-timers-and-double-time',
      recaptureRatesAfterTerminalEvents: false,
    }))
  }
  return Object.freeze({
    groupIndex,
    segments: Object.freeze(segments),
    boundaryOrder: V2_EVENT_BOUNDARY_ORDER,
    logicalRawTicks: group.logicalRawTicks,
    omittedRawTicks: group.omittedRawTicks,
    executeOneRepresentativeAutomation: true,
    advanceTargetIndexOnce: true,
    applyGoalTransitionsAfterAutomation: true,
    recaptureRatesForNextGroup: true,
  })
}

export function createStoredTimePolicyBudgetStateV2(
  policyId: StoredTimePolicyIdV2,
  startedAtMilliseconds: number,
): Readonly<StoredTimePolicyBudgetStateV2> {
  requireSupportedPolicy(policyId, 1)
  requireMonotonicMilliseconds(startedAtMilliseconds, 'start')
  const limitMilliseconds = policyId === 'stored-time-balanced-v1'
    ? STORED_TIME_BALANCED_BUDGET_MILLISECONDS_V2
    : null
  return Object.freeze({
    policyId,
    startedAtMilliseconds,
    lastObservedAtMilliseconds: startedAtMilliseconds,
    elapsedMilliseconds: 0,
    limitMilliseconds,
    expired: false,
  })
}

export function observeStoredTimePolicyBudgetV2(
  state: Readonly<StoredTimePolicyBudgetStateV2>,
  observedAtMilliseconds: number,
): Readonly<StoredTimePolicyBudgetStateV2> {
  const captured = captureBudgetState(state)
  requireMonotonicMilliseconds(observedAtMilliseconds, 'observation')
  if (observedAtMilliseconds < captured.lastObservedAtMilliseconds) {
    throw new RangeError('Stored-time monotonic budget observation moved backwards.')
  }
  const elapsedMilliseconds = observedAtMilliseconds -
    captured.startedAtMilliseconds
  return Object.freeze({
    ...captured,
    lastObservedAtMilliseconds: observedAtMilliseconds,
    elapsedMilliseconds,
    expired: captured.limitMilliseconds !== null &&
      elapsedMilliseconds >= captured.limitMilliseconds,
  })
}

function createRepresentativeGroupsV2(
  futureTicks: bigint,
  firstHorizon: GameDecimal,
  interval: GameDecimal,
  requestedDuration: GameDecimal,
): readonly Readonly<StoredTimeRepresentativeGroupV2>[] {
  const groupCount = futureTicks > BigInt(STORED_TIME_FAST_MAXIMUM_GROUPS_V2)
    ? STORED_TIME_FAST_MAXIMUM_GROUPS_V2
    : Number(futureTicks)
  const groupCountBigInt = BigInt(groupCount)
  const quotient = futureTicks / groupCountBigInt
  const remainder = futureTicks % groupCountBigInt
  const groups: Readonly<StoredTimeRepresentativeGroupV2>[] = []
  let cursor = GAME_DECIMAL_ZERO
  let cumulativeTicks = 0n
  for (let index = 0; index < groupCount; index += 1) {
    const logicalRawTicks = quotient + (BigInt(index) < remainder ? 1n : 0n)
    cumulativeTicks += logicalRawTicks
    const end = addGameDecimals(
      firstHorizon,
      multiplyGameDecimals(
        gameDecimalFromBigInt(cumulativeTicks - 1n),
        interval,
      ),
    )
    const continuousDuration = subtractNonNegativeV2(end, cursor)
    groups.push(Object.freeze({
      index,
      logicalRawTicks,
      omittedRawTicks: logicalRawTicks - 1n,
      startsAt: cursor,
      continuousDuration,
      endsAt: end,
      remainingRequestedDurationAfter: subtractNonNegativeV2(
        requestedDuration,
        end,
      ),
      capturesRatesAtStart: true,
      executesOneAutomationAtEnd: true,
      advancesTargetIndexOnce: true,
    }))
    cursor = end
  }
  return Object.freeze(groups)
}

function createHardEventSplitsV2(
  hardEvents: readonly Readonly<StoredTimeHardEventV2>[],
  requestedDuration: GameDecimal,
  initialDueBoundary: boolean,
  executionKind: StoredTimePolicyExecutionKindV2,
  groups: readonly Readonly<StoredTimeRepresentativeGroupV2>[],
  finalRemainder: GameDecimal,
): readonly Readonly<StoredTimeHardEventSplitV2>[] {
  const splits = hardEvents.map((event) => {
    if (initialDueBoundary && event.horizonSeconds === 0) {
      return freezeHardEventSplitV2(
        event,
        'initial-due-boundary',
        null,
        GAME_DECIMAL_ZERO,
        false,
      )
    }
    if (executionKind === 'exact-raw-ticks') {
      return freezeHardEventSplitV2(
        event,
        'exact-replay',
        null,
        gameDecimalFromNumber(event.horizonSeconds),
        false,
      )
    }
    for (const group of groups) {
      const eventHorizon = gameDecimalFromNumber(event.horizonSeconds)
      if (compareGameDecimals(eventHorizon, group.endsAt) <= 0) {
        const offset = subtractNonNegativeV2(
          eventHorizon,
          group.startsAt,
        )
        return freezeHardEventSplitV2(
          event,
          'representative-group',
          group.index,
          offset,
          compareGameDecimals(eventHorizon, group.endsAt) === 0,
        )
      }
    }
    const finalRemainderStart = subtractNonNegativeV2(
      requestedDuration,
      finalRemainder,
    )
    return freezeHardEventSplitV2(
      event,
      'final-remainder',
      null,
      subtractNonNegativeV2(
        gameDecimalFromNumber(event.horizonSeconds),
        finalRemainderStart,
      ),
      false,
    )
  })
  return Object.freeze(splits)
}

function freezeHardEventSplitV2(
  event: Readonly<StoredTimeHardEventV2>,
  phase: StoredTimeHardEventPhaseV2,
  groupIndex: number | null,
  offsetWithinPhase: GameDecimal,
  coincidentWithRepresentativeBoundary: boolean,
): Readonly<StoredTimeHardEventSplitV2> {
  return Object.freeze({
    id: event.id,
    boundaryPhase: event.boundaryPhase,
    boundaryOrder: V2_EVENT_BOUNDARY_ORDER.indexOf(event.boundaryPhase),
    horizon: gameDecimalFromNumber(event.horizonSeconds),
    phase,
    groupIndex,
    offsetWithinPhase,
    coincidentWithRepresentativeBoundary,
    recaptureRatesAfterEvent: true,
    createsRepresentativeAutomation: false,
  })
}

function countFutureAutomationBoundaries(
  duration: GameDecimal,
  firstHorizon: GameDecimal,
  interval: GameDecimal,
): bigint {
  if (compareGameDecimals(duration, firstHorizon) < 0) return 0n
  const durationDivision = quotientAndRemainderV2(duration, interval)
  const horizonDivision = quotientAndRemainderV2(firstHorizon, interval)
  const quotientDifference = durationDivision.quotient -
    horizonDivision.quotient
  return quotientDifference + (
    compareGameDecimals(
      durationDivision.remainder,
      horizonDivision.remainder,
    ) >= 0
      ? 1n
      : 0n
  )
}

function quotientAndRemainderV2(
  value: GameDecimal,
  divisor: GameDecimal,
): Readonly<{ quotient: bigint; remainder: GameDecimal }> {
  const quotient = gameDecimalToBigIntChecked(
    floorGameDecimal(divideGameDecimals(value, divisor)),
    { maximumDigits: 64 },
  )
  const representedProduct = multiplyGameDecimals(
    gameDecimalFromBigInt(quotient),
    divisor,
  )
  return Object.freeze({
    quotient,
    remainder: subtractNonNegativeV2(value, representedProduct),
  })
}

function lastFutureBoundaryV2(
  futureTicks: bigint,
  firstHorizon: GameDecimal,
  interval: GameDecimal,
): GameDecimal | null {
  if (futureTicks === 0n) return null
  return addGameDecimals(
    firstHorizon,
    multiplyGameDecimals(
      gameDecimalFromBigInt(futureTicks - 1n),
      interval,
    ),
  )
}

function subtractNonNegativeV2(
  left: GameDecimal,
  right: GameDecimal,
): GameDecimal {
  return compareGameDecimals(left, right) <= 0
    ? GAME_DECIMAL_ZERO
    : subtractGameDecimals(left, right)
}

function rotateTargetIndexV2(initial: number, rotations: bigint): number {
  return (initial + Number(rotations % AUTOMATION_TARGET_COUNT_V2)) %
    Number(AUTOMATION_TARGET_COUNT_V2)
}

function capturePlanRequest(
  value: unknown,
): Readonly<StoredTimePolicyPlanRequestV2> {
  const properties = closedDataProperties(value, [
    'policyId',
    'policyVersion',
    'requestedDurationSeconds',
    'initialAutomationHorizonSeconds',
    'automationIntervalSeconds',
    'initialAutomationTargetIndex',
    'hardEvents',
  ], 'Stored-time policy request')
  const policyId = dataValue(properties, 'policyId', 'Stored-time policy request')
  const policyVersion = dataValue(
    properties,
    'policyVersion',
    'Stored-time policy request',
  )
  requireSupportedPolicy(policyId, policyVersion)
  const requestedDurationSeconds = requireFiniteNumberV2(
    dataValue(properties, 'requestedDurationSeconds', 'Stored-time policy request'),
    'Stored-time requested duration',
    STORED_TIME_MINIMUM_AUTOMATION_INTERVAL_SECONDS_V2,
    STORED_TIME_MAXIMUM_DURATION_SECONDS_V2,
  )
  const initialAutomationHorizonSeconds = requireFiniteNumberV2(
    dataValue(
      properties,
      'initialAutomationHorizonSeconds',
      'Stored-time policy request',
    ),
    'Stored-time initial automation horizon',
    0,
    STORED_TIME_MAXIMUM_DURATION_SECONDS_V2,
  )
  const automationIntervalSeconds = requireFiniteNumberV2(
    dataValue(properties, 'automationIntervalSeconds', 'Stored-time policy request'),
    'Stored-time automation interval',
    STORED_TIME_MINIMUM_AUTOMATION_INTERVAL_SECONDS_V2,
    STORED_TIME_MAXIMUM_DURATION_SECONDS_V2,
  )
  const initialAutomationTargetIndex = dataValue(
    properties,
    'initialAutomationTargetIndex',
    'Stored-time policy request',
  )
  if (
    typeof initialAutomationTargetIndex !== 'number' ||
    !Number.isSafeInteger(initialAutomationTargetIndex) ||
    initialAutomationTargetIndex < 0 ||
    initialAutomationTargetIndex >= Number(AUTOMATION_TARGET_COUNT_V2)
  ) {
    throw new RangeError('Stored-time automation target index must be from 0 through 7.')
  }
  const hardEvents = captureHardEventsV2(
    dataValue(properties, 'hardEvents', 'Stored-time policy request'),
    requestedDurationSeconds,
  )
  return Object.freeze({
    policyId: policyId as StoredTimePolicyIdV2,
    policyVersion: 1,
    requestedDurationSeconds,
    initialAutomationHorizonSeconds,
    automationIntervalSeconds,
    initialAutomationTargetIndex,
    hardEvents,
  })
}

function captureHardEventsV2(
  value: unknown,
  requestedDurationSeconds: number,
): readonly Readonly<StoredTimeHardEventV2>[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    !Object.isFrozen(value) ||
    value.length > STORED_TIME_MAXIMUM_HARD_EVENTS_V2
  ) {
    throw new TypeError('Stored-time hard events must be a bounded frozen array.')
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const lengthDescriptor = Reflect.getOwnPropertyDescriptor(value, 'length')
  if (
    Reflect.ownKeys(value).length !== value.length + 1 ||
    lengthDescriptor === undefined ||
    !('value' in lengthDescriptor) ||
    lengthDescriptor.value !== value.length
  ) {
    throw new TypeError('Stored-time hard events must be a dense data-only array.')
  }
  const ids = new Set<string>()
  const events: Readonly<StoredTimeHardEventV2>[] = []
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)]
    if (descriptor === undefined || !('value' in descriptor)) {
      throw new TypeError('Stored-time hard events must contain data properties.')
    }
    const properties = closedDataProperties(
      descriptor.value,
      ['id', 'horizonSeconds', 'boundaryPhase'],
      `Stored-time hard event ${index}`,
    )
    const id = dataValue(properties, 'id', `Stored-time hard event ${index}`)
    if (typeof id !== 'string' || id.trim() === '' || ids.has(id)) {
      throw new TypeError('Stored-time hard event IDs must be unique nonblank strings.')
    }
    const horizonSeconds = requireFiniteNumberV2(
      dataValue(properties, 'horizonSeconds', `Stored-time hard event ${index}`),
      'Stored-time hard-event horizon',
      0,
      requestedDurationSeconds,
    )
    const boundaryPhase = dataValue(
      properties,
      'boundaryPhase',
      `Stored-time hard event ${index}`,
    )
    if (
      typeof boundaryPhase !== 'string' ||
      boundaryPhase === 'automation' ||
      !V2_EVENT_BOUNDARY_ORDER.includes(
        boundaryPhase as StoredTimeCanonicalBoundaryPhaseV2,
      )
    ) {
      throw new TypeError(
        'Stored-time hard events require a canonical non-automation boundary phase.',
      )
    }
    ids.add(id)
    events.push(Object.freeze({
      id,
      horizonSeconds,
      boundaryPhase: boundaryPhase as StoredTimeNonAutomationBoundaryPhaseV2,
    }))
  }
  events.sort((left, right) =>
    left.horizonSeconds - right.horizonSeconds ||
    V2_EVENT_BOUNDARY_ORDER.indexOf(left.boundaryPhase) -
      V2_EVENT_BOUNDARY_ORDER.indexOf(right.boundaryPhase) ||
    compareCodeUnitsV2(left.id, right.id)
  )
  return Object.freeze(events)
}

function compareCodeUnitsV2(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function captureBudgetState(value: unknown): Readonly<StoredTimePolicyBudgetStateV2> {
  const properties = closedDataProperties(value, [
    'policyId',
    'startedAtMilliseconds',
    'lastObservedAtMilliseconds',
    'elapsedMilliseconds',
    'limitMilliseconds',
    'expired',
  ], 'Stored-time monotonic budget state')
  const policyId = dataValue(properties, 'policyId', 'Stored-time monotonic budget state')
  requireSupportedPolicy(policyId, 1)
  const startedAtMilliseconds = requireMonotonicMilliseconds(
    dataValue(properties, 'startedAtMilliseconds', 'Stored-time monotonic budget state'),
    'start',
  )
  const lastObservedAtMilliseconds = requireMonotonicMilliseconds(
    dataValue(properties, 'lastObservedAtMilliseconds', 'Stored-time monotonic budget state'),
    'last observation',
  )
  const elapsedMilliseconds = requireMonotonicMilliseconds(
    dataValue(properties, 'elapsedMilliseconds', 'Stored-time monotonic budget state'),
    'elapsed time',
  )
  const expectedLimit = policyId === 'stored-time-balanced-v1'
    ? STORED_TIME_BALANCED_BUDGET_MILLISECONDS_V2
    : null
  const limitMilliseconds = dataValue(
    properties,
    'limitMilliseconds',
    'Stored-time monotonic budget state',
  )
  const expired = dataValue(properties, 'expired', 'Stored-time monotonic budget state')
  if (
    lastObservedAtMilliseconds < startedAtMilliseconds ||
    elapsedMilliseconds !== lastObservedAtMilliseconds - startedAtMilliseconds ||
    limitMilliseconds !== expectedLimit ||
    typeof expired !== 'boolean' ||
    expired !== (expectedLimit !== null && elapsedMilliseconds >= expectedLimit)
  ) {
    throw new TypeError('Stored-time monotonic budget state is inconsistent.')
  }
  return value as Readonly<StoredTimePolicyBudgetStateV2>
}

function requireSupportedPolicy(policyId: unknown, version: unknown): void {
  if (
    typeof policyId !== 'string' ||
    version !== 1 ||
    !STORED_TIME_POLICY_SUPPORT_V2.some((entry) => entry.id === policyId)
  ) {
    throw new TypeError('Stored-time policy ID/version is unsupported.')
  }
}

function requireFiniteNumberV2(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum ||
    Object.is(value, -0)
  ) {
    throw new RangeError(`${label} is outside its closed bounds.`)
  }
  return value
}

function requireMonotonicMilliseconds(value: unknown, label: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    Object.is(value, -0)
  ) {
    throw new RangeError(`Stored-time monotonic ${label} must be finite and non-negative.`)
  }
  return value
}

function requireIssuedPlan(value: unknown): asserts value is StoredTimePolicyPlanV2 {
  if (value === null || typeof value !== 'object' || !issuedPlans.has(value)) {
    throw new TypeError('Stored-time policy plan is not module-issued.')
  }
}

function closedDataProperties(
  value: unknown,
  expectedKeys: readonly string[],
  path: string,
): Readonly<Record<string, PropertyDescriptor>> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    !Object.isFrozen(value)
  ) {
    throw new TypeError(`${path} must be a frozen closed plain object.`)
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(value)
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key) => typeof key !== 'string' || !expectedKeys.includes(key))
  ) {
    throw new TypeError(`${path} must contain exactly its declared data fields.`)
  }
  for (const key of expectedKeys) {
    const descriptor = descriptors[key]
    if (descriptor === undefined || !('value' in descriptor)) {
      throw new TypeError(`${path}.${key} must be a data property.`)
    }
  }
  return descriptors
}

function dataValue(
  properties: Readonly<Record<string, PropertyDescriptor>>,
  key: string,
  path: string,
): unknown {
  const descriptor = properties[key]
  if (descriptor === undefined || !('value' in descriptor)) {
    throw new TypeError(`${path}.${key} must be a data property.`)
  }
  return descriptor.value
}
