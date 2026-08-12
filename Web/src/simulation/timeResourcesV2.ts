import type { TimelineStateV2 } from '../game-state/typesV2'
import {
  GAME_DECIMAL_ONE,
  GAME_DECIMAL_ZERO,
  compareGameDecimals,
  isGameDecimal,
  isIntegerGameDecimal,
  type GameDecimal,
} from '../math/gameDecimal'

export const V2_DEFAULT_STORED_TIME_CAPACITY_SECONDS = 86_400
export const V2_STORED_TIME_MAXIMUM_SECONDS = 42_000_000

export type V2ParsedUtcTimestamp =
  | Readonly<{ status: 'missing' }>
  | Readonly<{ status: 'invalid' }>
  | Readonly<{ status: 'valid'; utcMilliseconds: number }>

export type V2AwayTimeSource =
  | 'missing_quit_timestamp'
  | 'quit_timestamp'
  | 'started_timestamp_fallback'
  | 'runtime_utc_fallback'

export interface V2AwayTimeResolutionRequest {
  readonly nowUtcMilliseconds: number
  readonly quitTimestamp: V2ParsedUtcTimestamp
  readonly startedTimestamp: V2ParsedUtcTimestamp
}

export interface V2AwayTimeResolution {
  readonly source: V2AwayTimeSource
  readonly resolvedStartUtcMilliseconds: number
  readonly nowUtcMilliseconds: number
  readonly rawSeconds: number
  readonly grantedSeconds: number
  readonly shouldConsumeSuspensionMarker: boolean
  readonly clockMovedBackward: boolean
}

export interface V2ReturnedTimeResult {
  readonly timeline: Readonly<TimelineStateV2>
  readonly resolution: Readonly<V2AwayTimeResolution>
  readonly storedTimeCreditedSeconds: number
  readonly doubleTimeCreditedSeconds: number
}

export interface V2StoredTimeCapacityUpgradeResult {
  readonly timeline: Readonly<TimelineStateV2>
  readonly upgraded: boolean
  readonly maximumReached: boolean
}

export type V2TimeSliceMode = 'active' | 'stored-time'

export type V2TimeResourceSlice =
  | Readonly<{
      status: 'exhausted'
      mode: V2TimeSliceMode
      requestedSeconds: number
      timeline: Readonly<TimelineStateV2>
    }>
  | Readonly<{
      status: 'ready'
      mode: V2TimeSliceMode
      requestedSeconds: number
      baseSimulationSeconds: number
      dreamSimulationSeconds: number
      doubleTimeActive: boolean
      doubleTimeRate: number
      doubleTimeBankConsumedSeconds: number
      effectiveDreamMultiplier: number
      storedTimeConsumedSeconds: number
      timeline: Readonly<TimelineStateV2>
    }>

export interface V2StoredTimeInfinityUsage {
  readonly currentCycleSeconds: number
  readonly previousCycleSeconds: number
}

const issuedAwayTimeResolutions = new WeakSet<object>()

/**
 * Updates one scheduler-selected continuous active segment in V1 field order.
 * The event scheduler must split caller frames first; crossing a countdown here
 * would skip the boundary event and is rejected.
 */
export function advanceV2ActiveMaterialSegment(
  timeline: Readonly<TimelineStateV2>,
  seconds: number,
): Readonly<TimelineStateV2> {
  validateV2TimelineResources(timeline)
  requirePositiveSeconds(seconds, 'Active time')
  if (!timeline.eventClockInitialized) {
    throw new Error('V2 active clock must resolve initialization before advancing.')
  }
  if (
    timeline.automationTimeUntilNextEvent <= 0 ||
    timeline.infinityBoundaryRemaining <= 0
  ) {
    throw new Error('V2 active clock must resolve a due boundary before advancing.')
  }
  if (
    seconds > timeline.automationTimeUntilNextEvent ||
    seconds > timeline.infinityBoundaryRemaining ||
    seconds > doubleTimeExhaustionHorizon(timeline)
  ) {
    throw new RangeError('V2 active clock segment crosses an event boundary.')
  }
  const infinityCycleSeconds = addFiniteSeconds(
    timeline.infinityCycleSeconds,
    seconds,
    'Infinity cycle time',
  )
  return freezeTimeline({
    ...timeline,
    eventClockInitialized: true,
    automationTimeUntilNextEvent: Math.max(
      0,
      timeline.automationTimeUntilNextEvent - seconds,
    ),
    infinityBoundaryRemaining: Math.max(
      0,
      timeline.infinityBoundaryRemaining - seconds,
    ),
    infinityCycleSeconds,
  })
}

export function withV2SuspensionMarker(
  timeline: Readonly<TimelineStateV2>,
  legacyUtcText: string,
): Readonly<TimelineStateV2> {
  validateV2TimelineResources(timeline)
  if (typeof legacyUtcText !== 'string' || legacyUtcText.trim().length === 0) {
    throw new TypeError('V2 suspension marker must be non-empty.')
  }
  return freezeTimeline({ ...timeline, lastSuspendedAtLegacyText: legacyUtcText })
}

/** Host-independent source selection; timestamp parsing remains adapter-owned. */
export function resolveV2AwayTime(
  request: Readonly<V2AwayTimeResolutionRequest>,
): Readonly<V2AwayTimeResolution> {
  const captured = captureAwayTimeRequest(request)
  requireFiniteNumber(captured.nowUtcMilliseconds, 'nowUtcMilliseconds')
  if (captured.quitTimestamp.status === 'missing') {
    return issueAwayTimeResolution(Object.freeze({
      source: 'missing_quit_timestamp',
      resolvedStartUtcMilliseconds: captured.nowUtcMilliseconds,
      nowUtcMilliseconds: captured.nowUtcMilliseconds,
      rawSeconds: 0,
      grantedSeconds: 0,
      shouldConsumeSuspensionMarker: false,
      clockMovedBackward: false,
    }))
  }

  let source: V2AwayTimeSource
  let resolvedStartUtcMilliseconds: number
  if (captured.quitTimestamp.status === 'valid') {
    source = 'quit_timestamp'
    resolvedStartUtcMilliseconds = captured.quitTimestamp.utcMilliseconds
  } else if (captured.startedTimestamp.status === 'valid') {
    source = 'started_timestamp_fallback'
    resolvedStartUtcMilliseconds = captured.startedTimestamp.utcMilliseconds
  } else {
    source = 'runtime_utc_fallback'
    resolvedStartUtcMilliseconds = captured.nowUtcMilliseconds
  }
  requireFiniteNumber(resolvedStartUtcMilliseconds, 'resolvedStartUtcMilliseconds')
  const rawSeconds =
    (captured.nowUtcMilliseconds - resolvedStartUtcMilliseconds) / 1_000
  if (!Number.isFinite(rawSeconds)) {
    throw new RangeError('Resolved V2 away time overflowed finite seconds.')
  }
  return issueAwayTimeResolution(Object.freeze({
    source,
    resolvedStartUtcMilliseconds,
    nowUtcMilliseconds: captured.nowUtcMilliseconds,
    rawSeconds,
    grantedSeconds: Math.max(0, rawSeconds),
    shouldConsumeSuspensionMarker: true,
    clockMovedBackward: rawSeconds < 0,
  }))
}

/**
 * Applies Unity's two-stage return credit: full away time to Double Time,
 * admitted stored time to storage, then the admitted portion to Double Time.
 */
export function applyV2ReturnedTime(
  timeline: Readonly<TimelineStateV2>,
  resolution: Readonly<V2AwayTimeResolution>,
): Readonly<V2ReturnedTimeResult> {
  validateV2TimelineResources(timeline)
  if (
    typeof resolution !== 'object' ||
    resolution === null ||
    !issuedAwayTimeResolutions.has(resolution)
  ) {
    throw new TypeError('V2 returned time requires an issued away-time resolution.')
  }
  requireFiniteNonNegativeSeconds(resolution.grantedSeconds, 'Returned time')
  const awaySeconds = resolution.grantedSeconds
  const startingDoubleTime = timeline.doubleTime.bankSeconds
  const afterPersistenceCredit = Math.min(
    V2_STORED_TIME_MAXIMUM_SECONDS,
    startingDoubleTime + awaySeconds,
  )
  const capacityRemaining =
    timeline.storedTimeCapacitySeconds - timeline.storedTimeAvailableSeconds
  const storedTimeCreditedSeconds = Math.min(awaySeconds, capacityRemaining)
  const storedTimeAvailableSeconds =
    storedTimeCreditedSeconds === capacityRemaining
      ? timeline.storedTimeCapacitySeconds
      : timeline.storedTimeAvailableSeconds + storedTimeCreditedSeconds
  const doubleTimeBankSeconds = Math.min(
    V2_STORED_TIME_MAXIMUM_SECONDS,
    afterPersistenceCredit + storedTimeCreditedSeconds,
  )
  const nextTimeline = freezeTimeline({
    ...timeline,
    storedTimeAvailableSeconds,
    lastSuspendedAtLegacyText: resolution.shouldConsumeSuspensionMarker
      ? null
      : timeline.lastSuspendedAtLegacyText,
    doubleTime: {
      ...timeline.doubleTime,
      bankSeconds: doubleTimeBankSeconds,
    },
  })
  return Object.freeze({
    timeline: nextTimeline,
    resolution,
    storedTimeCreditedSeconds,
    doubleTimeCreditedSeconds: doubleTimeBankSeconds - startingDoubleTime,
  })
}

export function upgradeV2StoredTimeCapacity(
  timeline: Readonly<TimelineStateV2>,
): Readonly<V2StoredTimeCapacityUpgradeResult> {
  validateV2TimelineResources(timeline)
  if (timeline.storedTimeCapacitySeconds >= V2_STORED_TIME_MAXIMUM_SECONDS) {
    return Object.freeze({ timeline, upgraded: false, maximumReached: true })
  }
  if (timeline.storedTimeAvailableSeconds < timeline.storedTimeCapacitySeconds) {
    return Object.freeze({ timeline, upgraded: false, maximumReached: false })
  }
  const storedTimeCapacitySeconds = Math.min(
    V2_STORED_TIME_MAXIMUM_SECONDS,
    timeline.storedTimeCapacitySeconds * 2,
  )
  return Object.freeze({
    timeline: freezeTimeline({
      ...timeline,
      storedTimeAvailableSeconds: 0,
      storedTimeCapacitySeconds,
    }),
    upgraded: true,
    maximumReached:
      storedTimeCapacitySeconds >= V2_STORED_TIME_MAXIMUM_SECONDS,
  })
}

export function setV2DoubleTimeRate(
  timeline: Readonly<TimelineStateV2>,
  rate: number,
): Readonly<TimelineStateV2> {
  validateV2TimelineResources(timeline)
  if (!Number.isSafeInteger(rate) || rate < 0 || rate > 10) {
    throw new RangeError('V2 Double Time rate must be an integer from 0 to 10.')
  }
  if (rate === timeline.doubleTime.rate) return timeline
  return freezeTimeline({
    ...timeline,
    doubleTime: { ...timeline.doubleTime, rate },
  })
}

/**
 * Prepares active or stored-time work and completes the deferred Double Time
 * debit in one immutable accounting result. The lifecycle writer simulates the
 * returned base/Dream durations from its pre-result state, then publishes the
 * returned timeline with that same candidate.
 */
export function advanceV2TimeResourceSlice(
  timeline: Readonly<TimelineStateV2>,
  mode: V2TimeSliceMode,
  requestedSeconds: number,
): V2TimeResourceSlice {
  validateV2TimelineResources(timeline)
  requirePositiveSeconds(requestedSeconds, 'Simulation slice')
  if (mode !== 'active' && mode !== 'stored-time') {
    throw new TypeError('V2 time-resource slice mode is unsupported.')
  }
  const baseSimulationSeconds = mode === 'stored-time'
    ? Math.min(requestedSeconds, timeline.storedTimeAvailableSeconds)
    : requestedSeconds
  if (baseSimulationSeconds === 0) {
    return Object.freeze({
      status: 'exhausted',
      mode,
      requestedSeconds,
      timeline,
    })
  }

  const rate = timeline.doubleTime.rate
  const doubleTimeActive =
    timeline.doubleTime.unlocked && timeline.doubleTime.bankSeconds > 0
  const requestedBankSeconds = doubleTimeActive && rate > 0
    ? rate * baseSimulationSeconds
    : 0
  const doubleTimeBankConsumedSeconds = Math.min(
    timeline.doubleTime.bankSeconds,
    requestedBankSeconds,
  )
  const effectiveDreamMultiplier = doubleTimeActive
    ? 1 + doubleTimeBankConsumedSeconds / baseSimulationSeconds
    : 1
  const dreamSimulationSeconds =
    baseSimulationSeconds + doubleTimeBankConsumedSeconds
  if (!Number.isFinite(dreamSimulationSeconds)) {
    throw new RangeError('Accelerated V2 simulation slice overflowed finite seconds.')
  }

  const remainingDoubleTime = Math.max(
    0,
    timeline.doubleTime.bankSeconds - doubleTimeBankConsumedSeconds,
  )
  const storedTimeConsumedSeconds = mode === 'stored-time'
    ? baseSimulationSeconds
    : 0
  const storedTimeAvailableSeconds = mode === 'stored-time'
    ? Math.max(0, timeline.storedTimeAvailableSeconds - baseSimulationSeconds)
    : timeline.storedTimeAvailableSeconds
  const nextTimeline = freezeTimeline({
    ...timeline,
    storedTimeAvailableSeconds,
    doubleTime: {
      ...timeline.doubleTime,
      enabled: timeline.doubleTime.unlocked && remainingDoubleTime > 0,
      bankSeconds: remainingDoubleTime,
    },
  })
  return Object.freeze({
    status: 'ready',
    mode,
    requestedSeconds,
    baseSimulationSeconds,
    dreamSimulationSeconds,
    doubleTimeActive,
    doubleTimeRate: rate,
    doubleTimeBankConsumedSeconds,
    effectiveDreamMultiplier,
    storedTimeConsumedSeconds,
    timeline: nextTimeline,
  })
}

/** Analytic stored-time/Infinity accounting; no completed-cycle replay. */
export function completeV2StoredTimeInfinityUsage(
  currentCycleSeconds: number,
  previousCycleSeconds: number,
  consumedSeconds: number,
  completedCycles: GameDecimal,
  lastCycleSeconds: number,
): Readonly<V2StoredTimeInfinityUsage> {
  requireFiniteNonNegativeSeconds(currentCycleSeconds, 'Current-cycle stored time')
  requireFiniteNonNegativeSeconds(previousCycleSeconds, 'Previous-cycle stored time')
  requireFiniteNonNegativeSeconds(consumedSeconds, 'Consumed stored time')
  requireFiniteNonNegativeSeconds(lastCycleSeconds, 'Last-cycle stored time')
  if (!isGameDecimal(completedCycles) || !isIntegerGameDecimal(completedCycles)) {
    throw new TypeError('Completed V2 cycle count must be an integer GameDecimal.')
  }
  if (compareGameDecimals(completedCycles, GAME_DECIMAL_ZERO) === 0) {
    return Object.freeze({
      currentCycleSeconds: addFiniteSeconds(
        currentCycleSeconds,
        consumedSeconds,
        'Current-cycle stored time',
      ),
      previousCycleSeconds,
    })
  }
  return Object.freeze({
    currentCycleSeconds: 0,
    previousCycleSeconds:
      compareGameDecimals(completedCycles, GAME_DECIMAL_ONE) === 0
        ? addFiniteSeconds(
          currentCycleSeconds,
          consumedSeconds,
          'Previous-cycle stored time',
        )
        : lastCycleSeconds,
  })
}

export function validateV2TimelineResources(
  timeline: Readonly<TimelineStateV2>,
): void {
  for (const [path, value] of [
    ['automationTimeUntilNextEvent', timeline.automationTimeUntilNextEvent],
    ['infinityBoundaryRemaining', timeline.infinityBoundaryRemaining],
    ['infinityCycleSeconds', timeline.infinityCycleSeconds],
    ['storedTimeAvailableSeconds', timeline.storedTimeAvailableSeconds],
    ['storedTimeCapacitySeconds', timeline.storedTimeCapacitySeconds],
    ['doubleTime.bankSeconds', timeline.doubleTime.bankSeconds],
  ] as const) {
    requireFiniteNonNegativeSeconds(value, `Timeline ${path}`)
  }
  if (
    timeline.storedTimeCapacitySeconds <= 0 ||
    timeline.storedTimeCapacitySeconds > V2_STORED_TIME_MAXIMUM_SECONDS
  ) {
    throw new RangeError('V2 stored-time capacity is outside its closed bounds.')
  }
  if (timeline.storedTimeAvailableSeconds > timeline.storedTimeCapacitySeconds) {
    throw new RangeError('V2 stored time exceeds its capacity.')
  }
  if (timeline.doubleTime.bankSeconds > V2_STORED_TIME_MAXIMUM_SECONDS) {
    throw new RangeError('V2 Double Time exceeds its independent maximum.')
  }
  if (
    !Number.isSafeInteger(timeline.doubleTime.rate) ||
    timeline.doubleTime.rate < 0 ||
    timeline.doubleTime.rate > 10
  ) {
    throw new RangeError('V2 Double Time rate must be an integer from 0 to 10.')
  }
  if (
    typeof timeline.doubleTime.unlocked !== 'boolean' ||
    typeof timeline.doubleTime.enabled !== 'boolean'
  ) {
    throw new TypeError('V2 Double Time flags must be boolean.')
  }
}

function freezeTimeline(timeline: TimelineStateV2): Readonly<TimelineStateV2> {
  return Object.freeze({
    ...timeline,
    doubleTime: Object.freeze({ ...timeline.doubleTime }),
  })
}

function doubleTimeExhaustionHorizon(
  timeline: Readonly<TimelineStateV2>,
): number {
  return timeline.doubleTime.unlocked &&
    timeline.doubleTime.bankSeconds > 0 &&
    timeline.doubleTime.rate > 0
    ? timeline.doubleTime.bankSeconds / timeline.doubleTime.rate
    : Number.POSITIVE_INFINITY
}

function captureAwayTimeRequest(
  request: Readonly<V2AwayTimeResolutionRequest>,
): Readonly<V2AwayTimeResolutionRequest> {
  const record = captureClosedDataObject(
    request,
    ['nowUtcMilliseconds', 'quitTimestamp', 'startedTimestamp'],
    'V2 away-time request',
  )
  return Object.freeze({
    nowUtcMilliseconds: record.nowUtcMilliseconds as number,
    quitTimestamp: captureParsedTimestamp(
      record.quitTimestamp,
      'V2 away-time request.quitTimestamp',
    ),
    startedTimestamp: captureParsedTimestamp(
      record.startedTimestamp,
      'V2 away-time request.startedTimestamp',
    ),
  })
}

function captureParsedTimestamp(
  value: unknown,
  path: string,
): V2ParsedUtcTimestamp {
  const base = captureClosedDataObject(value, ['status'], path, true)
  const status = base.status
  if (status === 'missing' || status === 'invalid') {
    const exact = captureClosedDataObject(value, ['status'], path)
    return Object.freeze({ status: exact.status as 'missing' | 'invalid' })
  }
  if (status === 'valid') {
    const exact = captureClosedDataObject(
      value,
      ['status', 'utcMilliseconds'],
      path,
    )
    requireFiniteNumber(exact.utcMilliseconds as number, `${path}.utcMilliseconds`)
    return Object.freeze({
      status: 'valid',
      utcMilliseconds: exact.utcMilliseconds as number,
    })
  }
  throw new TypeError(`${path}.status is unsupported.`)
}

function captureClosedDataObject(
  value: unknown,
  expectedKeys: readonly string[],
  path: string,
  allowAdditionalKeys = false,
): Readonly<Record<string, unknown>> {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError(`${path} must be a data-only object.`)
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Object.keys(descriptors).sort()
  const closedKeys = [...expectedKeys].sort()
  if (
    (!allowAdditionalKeys && (
      keys.length !== closedKeys.length ||
      keys.some((key, index) => key !== closedKeys[index])
    )) ||
    expectedKeys.some((key) => descriptors[key] === undefined)
  ) {
    throw new TypeError(`${path} has an invalid closed shape.`)
  }
  const captured: Record<string, unknown> = {}
  for (const key of expectedKeys) {
    const descriptor = descriptors[key]!
    if (!('value' in descriptor) || descriptor.enumerable !== true) {
      throw new TypeError(`${path}.${key} must be an enumerable data property.`)
    }
    captured[key] = descriptor.value
  }
  return Object.freeze(captured)
}

function issueAwayTimeResolution(
  resolution: Readonly<V2AwayTimeResolution>,
): Readonly<V2AwayTimeResolution> {
  issuedAwayTimeResolutions.add(resolution)
  return resolution
}

function addFiniteSeconds(left: number, right: number, path: string): number {
  const result = left + right
  if (!Number.isFinite(result)) {
    throw new RangeError(`${path} overflowed finite seconds.`)
  }
  return result
}

function requirePositiveSeconds(value: number, path: string): void {
  requireFiniteNonNegativeSeconds(value, path)
  if (value <= 0) throw new RangeError(`${path} must be positive.`)
}

function requireFiniteNonNegativeSeconds(value: number, path: string): void {
  if (!Number.isFinite(value) || value < 0 || Object.is(value, -0)) {
    throw new RangeError(`${path} must be finite, non-negative, and normalized.`)
  }
}

function requireFiniteNumber(value: number, path: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${path} must be finite.`)
}
