import type { CanonicalGameStateV1 } from '../game-state/types'
import {
  applyAwayTimeGrant,
  resolveAwayTime,
  type AwayTimeResolution,
  type ParsedUtcTimestamp,
} from './timeResources'

export interface LifecyclePolicy {
  readonly saveOnPause: boolean
  readonly saveOnFocusLoss: boolean
  readonly replayOnFocusGain: boolean
}

export const MOBILE_LIFECYCLE_POLICY: LifecyclePolicy = Object.freeze({
  saveOnPause: true,
  saveOnFocusLoss: true,
  replayOnFocusGain: true,
})

export const DESKTOP_LIFECYCLE_POLICY: LifecyclePolicy = Object.freeze({
  saveOnPause: false,
  saveOnFocusLoss: false,
  replayOnFocusGain: true,
})

/**
 * Browser gameplay remains active while the document is visible, even when
 * its window loses focus. Hidden/minimized time still follows the canonical
 * pause-save and offline-credit replay path.
 */
export const WEB_LIFECYCLE_POLICY: LifecyclePolicy = Object.freeze({
  saveOnPause: true,
  saveOnFocusLoss: false,
  replayOnFocusGain: true,
})

export interface LifecycleClockSample {
  readonly utcMilliseconds: number
  readonly serializedUtcText: string
}

export interface LifecycleCoordinatorState {
  readonly canonical: CanonicalGameStateV1
  readonly loaded: boolean
  readonly saveReady: boolean
  readonly coldStartReplayPending: boolean
  readonly coldStartGateSaveUsed: boolean
  /**
   * True only after the first non-active departure timestamp in the current
   * away episode was committed. Later lifecycle saves preserve that baseline
   * until active replay consumes it.
   */
  readonly departureTimestampRecorded: boolean
}

export type LifecycleEvent =
  | { readonly kind: 'pause_changed'; readonly paused: boolean }
  | { readonly kind: 'focus_changed'; readonly focused: boolean }
  | { readonly kind: 'quit_requested' }

export type LifecycleSaveTrigger = 'pause' | 'focus_lost' | 'quit'

export interface LifecycleSaveIntent {
  readonly trigger: LifecycleSaveTrigger
  readonly force: boolean
  readonly stampQuitTimestamp: boolean
  readonly candidate: CanonicalGameStateV1
}

export type LifecycleBlockedReason =
  | 'cold_start_gate_debounced'
  | 'not_loaded'
  | 'not_ready'

export interface LifecycleEventResult {
  readonly state: LifecycleCoordinatorState
  readonly saveIntent: LifecycleSaveIntent | null
  readonly replayAwayTime: boolean
  readonly blockedReason: LifecycleBlockedReason | null
}

export interface AwayTimeReplayRequest {
  readonly state: LifecycleCoordinatorState
  readonly clock: LifecycleClockSample
  readonly parsedQuitTimestamp: ParsedUtcTimestamp
  readonly parsedStartedTimestamp: ParsedUtcTimestamp
}

export interface AwayTimeReplayResult {
  readonly state: LifecycleCoordinatorState
  readonly resolution: AwayTimeResolution
  readonly timestampConsumed: boolean
  readonly storedTimeCreditedSeconds: number
  readonly markComparisonIntegrityCompromised: boolean
}

/**
 * Starts Unity's cold-start replay gate. Save readiness remains withheld until
 * the one replay attempt finishes, including a no-op missing-timestamp replay.
 */
export function beginColdStartReplay(
  state: LifecycleCoordinatorState,
  coldStart: boolean,
): LifecycleCoordinatorState {
  return {
    ...state,
    saveReady: coldStart ? false : state.saveReady,
    coldStartReplayPending: coldStart,
    coldStartGateSaveUsed: false,
  }
}

/**
 * Converts a lifecycle notification into save/replay intentions and a detached
 * canonical candidate. It never performs persistence.
 */
export function evaluateLifecycleEvent(
  state: LifecycleCoordinatorState,
  event: LifecycleEvent,
  policy: LifecyclePolicy,
  clock: LifecycleClockSample,
): LifecycleEventResult {
  const replayAwayTime =
    event.kind === 'focus_changed' &&
    event.focused &&
    policy.replayOnFocusGain
  const trigger = resolveSaveTrigger(event, policy)
  if (trigger === null) {
    return unchangedLifecycleResult(state, replayAwayTime)
  }

  const allowColdStartGateSave =
    state.coldStartReplayPending && !state.coldStartGateSaveUsed
  if (state.coldStartReplayPending && state.coldStartGateSaveUsed) {
    return {
      ...unchangedLifecycleResult(state, replayAwayTime),
      blockedReason: 'cold_start_gate_debounced',
    }
  }
  if (!state.loaded) {
    return {
      ...unchangedLifecycleResult(state, replayAwayTime),
      blockedReason: 'not_loaded',
    }
  }
  if (!state.saveReady && !allowColdStartGateSave) {
    return {
      ...unchangedLifecycleResult(state, replayAwayTime),
      blockedReason: 'not_ready',
    }
  }

  const stampQuitTimestamp =
    !allowColdStartGateSave &&
    !state.departureTimestampRecorded
  const candidate = stampQuitTimestamp
    ? withQuitTimestamp(state.canonical, clock.serializedUtcText)
    : state.canonical
  const nextState: LifecycleCoordinatorState = {
    ...state,
    canonical: candidate,
    coldStartGateSaveUsed:
      state.coldStartGateSaveUsed || allowColdStartGateSave,
    departureTimestampRecorded:
      state.departureTimestampRecorded || stampQuitTimestamp,
  }
  return {
    state: nextState,
    saveIntent: {
      trigger,
      force: allowColdStartGateSave,
      stampQuitTimestamp,
      candidate,
    },
    replayAwayTime,
    blockedReason: null,
  }
}

/**
 * Applies one requested replay to a canonical candidate, consumes a supplied
 * quit timestamp after any non-missing replay, and releases the cold-start gate.
 */
export function applyAwayTimeReplay(
  request: AwayTimeReplayRequest,
): AwayTimeReplayResult {
  const resolution = resolveAwayTime({
    nowUtcMilliseconds: request.clock.utcMilliseconds,
    quitTimestamp: request.parsedQuitTimestamp,
    startedTimestamp: request.parsedStartedTimestamp,
  })
  let canonical = request.state.canonical
  let timestampConsumed = false
  let storedTimeCreditedSeconds = 0
  let markComparisonIntegrityCompromised = resolution.cheater

  if (resolution.hasQuitTimestampInput) {
    const idleElectricSheepMultiplier =
      canonical.skills.byId.idleElectricSheep?.owned === true ? 2 : 1
    const grant = applyAwayTimeGrant({
      awaySeconds:
        resolution.grantedSeconds * idleElectricSheepMultiplier,
      bankSeconds: canonical.timeline.storedTimeAvailableSeconds,
      capacitySeconds: canonical.timeline.storedTimeCapacitySeconds,
      dreamDoubleTimeBankSeconds: canonical.timeline.doubleTime.bankSeconds,
      cheater: resolution.cheater,
    })
    storedTimeCreditedSeconds = grant.storedTimeCreditedSeconds
    markComparisonIntegrityCompromised =
      markComparisonIntegrityCompromised || grant.cheater
    timestampConsumed = resolution.shouldConsumeQuitTimestamp
    canonical = {
      ...canonical,
      timeline: {
        ...canonical.timeline,
        storedTimeAvailableSeconds: grant.bankSeconds,
        storedTimeCapacitySeconds: grant.capacitySeconds,
        lastSuspendedAtLegacyText: timestampConsumed
          ? null
          : canonical.timeline.lastSuspendedAtLegacyText,
        doubleTime: {
          ...canonical.timeline.doubleTime,
          bankSeconds: grant.dreamDoubleTimeBankSeconds,
        },
      },
    }
  }

  const releasedColdStartGate = request.state.coldStartReplayPending
  return {
    state: {
      ...request.state,
      canonical,
      saveReady: releasedColdStartGate
        ? true
        : request.state.saveReady,
      coldStartReplayPending: false,
      coldStartGateSaveUsed: false,
      departureTimestampRecorded: false,
    },
    resolution,
    timestampConsumed,
    storedTimeCreditedSeconds,
    markComparisonIntegrityCompromised,
  }
}

function resolveSaveTrigger(
  event: LifecycleEvent,
  policy: LifecyclePolicy,
): LifecycleSaveTrigger | null {
  if (event.kind === 'quit_requested') return 'quit'
  if (event.kind === 'pause_changed') {
    return event.paused && policy.saveOnPause ? 'pause' : null
  }
  return !event.focused && policy.saveOnFocusLoss ? 'focus_lost' : null
}

function unchangedLifecycleResult(
  state: LifecycleCoordinatorState,
  replayAwayTime: boolean,
): LifecycleEventResult {
  return {
    state,
    saveIntent: null,
    replayAwayTime,
    blockedReason: null,
  }
}

function withQuitTimestamp(
  canonical: CanonicalGameStateV1,
  serializedUtcText: string,
): CanonicalGameStateV1 {
  if (serializedUtcText.trim().length === 0) {
    throw new RangeError('serializedUtcText must not be blank.')
  }
  return {
    ...canonical,
    timeline: {
      ...canonical.timeline,
      lastSuspendedAtLegacyText: serializedUtcText,
    },
  }
}
