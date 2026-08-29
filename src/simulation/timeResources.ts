import { isFinitePositiveNumber } from '../core/finiteNonNegativeNumber'

export const DEFAULT_STORED_TIME_CAPACITY_SECONDS = 86_400
export const STORED_TIME_MAXIMUM_SECONDS = Number.MAX_VALUE

export type ParsedUtcTimestamp =
  | { readonly status: 'missing' }
  | { readonly status: 'invalid' }
  | {
      readonly status: 'valid'
      readonly utcMilliseconds: number
    }

export type AwayTimeSource =
  | 'missing_quit_timestamp'
  | 'quit_timestamp'
  | 'started_timestamp_fallback'
  | 'runtime_utc_fallback'

export interface AwayTimeResolutionRequest {
  readonly nowUtcMilliseconds: number
  readonly quitTimestamp: ParsedUtcTimestamp
  readonly startedTimestamp: ParsedUtcTimestamp
}

export interface AwayTimeResolution {
  readonly source: AwayTimeSource
  readonly resolvedStartUtcMilliseconds: number
  readonly nowUtcMilliseconds: number
  readonly rawSeconds: number
  readonly grantedSeconds: number
  readonly hasQuitTimestampInput: boolean
  readonly shouldConsumeQuitTimestamp: boolean
  readonly cheater: boolean
}

export interface StoredTimeState {
  readonly bankSeconds: number
  readonly capacitySeconds: number
  readonly cheater: boolean
}

export interface StoredTimeRepairResult extends StoredTimeState {
  readonly capacityRepaired: boolean
  readonly bankRepaired: boolean
}

export interface AwayTimeGrantRequest extends StoredTimeState {
  readonly awaySeconds: number
  readonly dreamDoubleTimeBankSeconds: number
}

export interface AwayTimeGrantResult extends StoredTimeRepairResult {
  readonly storedTimeCreditedSeconds: number
  readonly dreamDoubleTimeBankSeconds: number
}

export interface StoredTimeCapacityUpgradeResult extends StoredTimeRepairResult {
  readonly upgraded: boolean
  readonly maximumReached: boolean
}

/**
 * Resolves Unity's away-time source selection without relying on host-specific
 * Date parsing. Callers parse persisted strings and pass the outcome explicitly.
 */
export function resolveAwayTime(
  request: AwayTimeResolutionRequest,
): AwayTimeResolution {
  assertFiniteTimestamp(request.nowUtcMilliseconds, 'nowUtcMilliseconds')

  if (request.quitTimestamp.status === 'missing') {
    return {
      source: 'missing_quit_timestamp',
      resolvedStartUtcMilliseconds: request.nowUtcMilliseconds,
      nowUtcMilliseconds: request.nowUtcMilliseconds,
      rawSeconds: 0,
      grantedSeconds: 0,
      hasQuitTimestampInput: false,
      shouldConsumeQuitTimestamp: false,
      cheater: false,
    }
  }

  let source: AwayTimeSource
  let resolvedStartUtcMilliseconds: number
  if (request.quitTimestamp.status === 'valid') {
    source = 'quit_timestamp'
    resolvedStartUtcMilliseconds = request.quitTimestamp.utcMilliseconds
  } else if (request.startedTimestamp.status === 'valid') {
    source = 'started_timestamp_fallback'
    resolvedStartUtcMilliseconds = request.startedTimestamp.utcMilliseconds
  } else {
    source = 'runtime_utc_fallback'
    resolvedStartUtcMilliseconds = request.nowUtcMilliseconds
  }
  assertFiniteTimestamp(
    resolvedStartUtcMilliseconds,
    'resolvedStartUtcMilliseconds',
  )

  const rawSeconds =
    (request.nowUtcMilliseconds - resolvedStartUtcMilliseconds) / 1_000
  return {
    source,
    resolvedStartUtcMilliseconds,
    nowUtcMilliseconds: request.nowUtcMilliseconds,
    rawSeconds,
    grantedSeconds: Math.max(0, rawSeconds),
    hasQuitTimestampInput: true,
    shouldConsumeQuitTimestamp: true,
    cheater: rawSeconds < 0,
  }
}

/**
 * Applies the structural repairs performed before Unity grants returned time.
 */
export function repairStoredTimeState(
  state: StoredTimeState,
): StoredTimeRepairResult {
  const capacityIsPositiveInfinity =
    state.capacitySeconds === Number.POSITIVE_INFINITY
  const capacityIsValid = isFinitePositiveNumber(state.capacitySeconds)
  const capacitySeconds = capacityIsPositiveInfinity
    ? STORED_TIME_MAXIMUM_SECONDS
    : capacityIsValid
      ? state.capacitySeconds
      : DEFAULT_STORED_TIME_CAPACITY_SECONDS
  const capacityRepaired =
    capacityIsPositiveInfinity ||
    !capacityIsValid ||
    capacitySeconds !== state.capacitySeconds

  let bankSeconds = state.bankSeconds
  let bankRepaired = false
  let cheater = state.cheater || capacityIsPositiveInfinity
  if (bankSeconds === Number.POSITIVE_INFINITY) {
    bankSeconds = capacitySeconds
    bankRepaired = true
    cheater = true
  } else if (!Number.isFinite(bankSeconds) || bankSeconds < 0) {
    bankSeconds = 0
    bankRepaired = true
  } else if (bankSeconds > capacitySeconds) {
    if (bankSeconds > STORED_TIME_MAXIMUM_SECONDS) cheater = true
    bankSeconds = capacitySeconds
    bankRepaired = true
  }

  return {
    bankSeconds,
    capacitySeconds,
    cheater,
    capacityRepaired,
    bankRepaired,
  }
}

/**
 * Credits returned time to the single Stored Time bank. The retired Dream
 * Double Time bank is always cleared by the processing rewrite.
 */
export function applyAwayTimeGrant(
  request: AwayTimeGrantRequest,
): AwayTimeGrantResult {
  const repaired = repairStoredTimeState(request)
  const awaySeconds =
    Number.isFinite(request.awaySeconds) && request.awaySeconds >= 0
      ? request.awaySeconds
      : 0
  const cheater = repaired.cheater || request.awaySeconds < 0

  const availableCapacity = Math.max(
    0,
    repaired.capacitySeconds - repaired.bankSeconds,
  )
  const storedTimeCreditedSeconds = Math.min(
    awaySeconds,
    availableCapacity,
  )
  const bankSeconds =
    storedTimeCreditedSeconds >= availableCapacity
      ? repaired.capacitySeconds
      : addContinuous(repaired.bankSeconds, storedTimeCreditedSeconds)

  return {
    ...repaired,
    bankSeconds,
    cheater,
    storedTimeCreditedSeconds,
    dreamDoubleTimeBankSeconds: 0,
  }
}

/**
 * Models the capacity-upgrade button after applying the same structural repair.
 */
export function upgradeStoredTimeCapacity(
  state: StoredTimeState,
): StoredTimeCapacityUpgradeResult {
  const repaired = repairStoredTimeState(state)
  if (repaired.capacitySeconds >= STORED_TIME_MAXIMUM_SECONDS) {
    return {
      ...repaired,
      maximumReached: true,
      upgraded: false,
    }
  }
  if (repaired.bankSeconds < repaired.capacitySeconds) {
    return {
      ...repaired,
      maximumReached: false,
      upgraded: false,
    }
  }

  const capacitySeconds = Math.min(
    STORED_TIME_MAXIMUM_SECONDS,
    repaired.capacitySeconds * 2,
  )
  return {
    ...repaired,
    bankSeconds: 0,
    capacitySeconds,
    maximumReached: capacitySeconds >= STORED_TIME_MAXIMUM_SECONDS,
    upgraded: true,
  }
}

export function clampDoubleTimeRate(rate: number): number {
  if (!Number.isFinite(rate)) return 0
  return Math.max(0, Math.min(10, Math.trunc(rate)))
}

function assertFiniteTimestamp(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${field} must be finite.`)
  }
}

function addContinuous(left: number, right: number): number {
  if (
    !Number.isFinite(left) ||
    !Number.isFinite(right) ||
    left < 0 ||
    right < 0
  ) {
    return 0
  }
  const result = left + right
  return result === Number.POSITIVE_INFINITY ? Number.MAX_VALUE : result
}
