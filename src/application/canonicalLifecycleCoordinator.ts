import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import type { SimulationTransitionResult } from '../core/contracts'
import type { DysonEntitlements } from '../simulation/canonicalDysonDerivation'
import type { LifecycleAdapter, LifecyclePhase } from '../platform/contracts'
import {
  applyAwayTimeReplay,
  beginColdStartReplay,
  evaluateLifecycleEvent,
  type LifecycleClockSample,
  type LifecycleCoordinatorState,
  type LifecycleEvent,
  type LifecyclePolicy,
} from '../simulation/lifecycleAwayTime'
import {
  evaluateCanonicalBotCapCheckpoint,
  selectBotCapCheckpointToPersist,
  type BotCapCheckpointName,
} from '../simulation/canonicalBotCapCheckpoint'
import { parseUnityInvariantUtcTimestamp } from '../simulation/unityUtcTimestamp'
import { applyAwayTimeGrant, type ParsedUtcTimestamp } from '../simulation/timeResources'
import type {
  ApplicationCommandEnvelope,
  ApplicationSnapshot,
  CommitFirstResult,
  ImportSaveRequest,
  ImportSaveResult,
} from './contracts'
import type {
  CanonicalActiveAdvanceResult,
  CanonicalDevelopmentAction,
  CanonicalPlayerCommand,
  CanonicalPlayerDispatchResult,
  CanonicalStoredTimeCommitResult,
} from './canonicalGameApplication'
import {
  cloneCanonicalRuntimeState,
  type CanonicalRuntimeState,
} from './canonicalRuntimeSession'

const TIME_EPSILON = 1e-12
const MAXIMUM_BOT_CAP_CHECKPOINTS = 3

export interface CanonicalLifecycleClock {
  sample(): LifecycleClockSample
}

export interface CanonicalLifecycleApplicationPort {
  snapshot(): ApplicationSnapshot<CanonicalRuntimeState>
  start(): Promise<ApplicationSnapshot<CanonicalRuntimeState>>
  advanceActiveWithContinuation(
    milliseconds: number,
  ): CanonicalActiveAdvanceResult
  advanceActiveContinuousWithContinuation(
    milliseconds: number,
  ): CanonicalActiveAdvanceResult
  dispatchPlayer(
    envelope: ApplicationCommandEnvelope<CanonicalPlayerCommand>,
    cancelRequested?: () => boolean,
  ): Promise<CanonicalPlayerDispatchResult>
  commitAwayReplacement(
    envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    state: Readonly<CanonicalRuntimeState>,
  ): Promise<CommitFirstResult>
  commitBotCapCheckpoint(
    envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    checkpoint: BotCapCheckpointName,
  ): Promise<CommitFirstResult>
  commitDevelopmentDysonBots?(
    envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    bots: number,
  ): Promise<CommitFirstResult>
  commitDevelopmentRealityUnlock?(
    envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
  ): Promise<CommitFirstResult>
  commitDevelopmentAction?(
    envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    action: CanonicalDevelopmentAction,
  ): Promise<CommitFirstResult>
  commitHostEntitlements?(
    envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    entitlements: Readonly<DysonEntitlements>,
  ): Promise<CommitFirstResult>
  importSave(request: ImportSaveRequest): Promise<ImportSaveResult>
}

export interface CanonicalLifecycleCoordinatorOptions {
  readonly application: CanonicalLifecycleApplicationPort
  readonly lifecycle: LifecycleAdapter
  readonly clock: CanonicalLifecycleClock
  readonly policy: Readonly<LifecyclePolicy>
  readonly onLifecycleFailure?: CanonicalLifecycleFailureSink
  /**
   * Keeps the historical direct-subscription behavior by default. Browser
   * composition sets this to false so its authority router can fence every
   * phase before it enters the coordinator.
   */
  readonly subscribeToLifecycle?: boolean
  /**
   * Optional synchronous departure receipt used when a host can be torn down
   * before its normal asynchronous lifecycle save reaches durable storage.
   */
  readonly readPendingDepartureTimestamp?: () => ParsedUtcTimestamp
  readonly clearPendingDepartureTimestamp?: (
    expectedUtcMilliseconds?: number,
  ) => void
}

export interface CanonicalLifecycleFailure {
  readonly phase: LifecyclePhase
  readonly error: unknown
}

export type CanonicalLifecycleFailureSink = (
  failure: Readonly<CanonicalLifecycleFailure>,
) => void

export type CanonicalAwayReplayResult =
  | {
      readonly replayed: true
      readonly committed: true
      readonly grantedSeconds: number
      readonly storedTimeCreditedSeconds: number
      readonly timestampConsumed: boolean
      readonly durableRevision: number
    }
  | {
      readonly replayed: false
      readonly committed: false
      readonly code:
        | 'not-ready'
        | 'no-quit-timestamp'
        | 'import-baseline-suppressed'
        | 'commit-failed'
      readonly reason?: string
    }

export type CanonicalLifecycleSaveResult =
  | {
      readonly requested: false
      readonly committed: false
      readonly code:
        | 'not-ready'
        | 'not-applicable'
        | 'cold-start-gate-debounced'
    }
  | {
      readonly requested: true
      readonly committed: true
      readonly durableRevision: number
    }
  | {
      readonly requested: true
      readonly committed: false
      readonly code: 'commit-failed'
      readonly reason?: string
    }

export type CanonicalBotCapSettlementResult =
  | {
      readonly settled: true
      readonly checkpoints: readonly BotCapCheckpointName[]
    }
  | {
      readonly settled: false
      readonly checkpoints: readonly BotCapCheckpointName[]
      readonly code: string
      readonly reason: string
    }

export interface CanonicalCoordinatedActiveResult {
  readonly transition: SimulationTransitionResult
  readonly requestedMilliseconds: number
  readonly consumedMilliseconds: number
  readonly remainingMilliseconds: number
  readonly checkpoints: readonly BotCapCheckpointName[]
}

export type CanonicalCoordinatedPlayerResult =
  | Extract<CanonicalPlayerDispatchResult, { readonly kind: 'transition' }>
  | {
      readonly kind: 'stored-time'
      readonly result: CanonicalCoordinatedStoredTimeResult
    }

interface CanonicalCoordinatedStoredTimeResultBase {
  /** Duration admitted after clamping the player request to the current bank. */
  readonly admittedSeconds: number
  /** The full admitted duration, or zero when the atomic commit fails. */
  readonly consumedSeconds: number
  readonly remainingSeconds: number
  readonly durableRevision: number | null
  readonly transition: SimulationTransitionResult
}

export type CanonicalCoordinatedStoredTimeResult =
  CanonicalCoordinatedStoredTimeResultBase & (
    | {
        readonly status: 'complete'
        readonly summary: Extract<
          CanonicalStoredTimeCommitResult,
          { committed: true }
        >['summary']
      }
    | {
        readonly status: 'failed'
        readonly code?: string
        readonly reason?: string
      }
  )

export type CanonicalCoordinatedImportResult =
  | {
      readonly imported: true
      readonly committed: true
      readonly sessionRevision: number
      readonly lifecycleReset: boolean
      readonly code?: 'not-ready'
      readonly reason?: string
    }
  | {
      readonly imported: false
      readonly committed: boolean
      readonly code: string
      readonly reason: string
    }

export class CanonicalLifecycleCoordinatorClosedError extends Error {
  constructor() {
    super('The lifecycle coordinator no longer accepts operations.')
    this.name = 'CanonicalLifecycleCoordinatorClosedError'
  }
}

/**
 * Owns host lifecycle routing and every persistence-sensitive continuation.
 *
 * A frontend dispatches player intent and active wall time through this
 * boundary. Away replacement and active bot-cap checkpoint commands remain
 * privileged application operations. Stored Time commits atomically.
 */
export class CanonicalLifecycleCoordinator {
  private readonly application: CanonicalLifecycleApplicationPort
  private readonly lifecycle: LifecycleAdapter
  private readonly clock: CanonicalLifecycleClock
  private readonly policy: Readonly<LifecyclePolicy>
  private readonly onLifecycleFailure:
    | CanonicalLifecycleFailureSink
    | undefined
  private readonly subscribeToRawLifecycle: boolean
  private readonly readPendingDepartureTimestamp:
    | (() => ParsedUtcTimestamp)
    | undefined
  private readonly clearPendingDepartureTimestamp:
    | ((expectedUtcMilliseconds?: number) => void)
    | undefined
  private lifecycleState: LifecycleCoordinatorState | undefined
  private unsubscribe: (() => void) | undefined
  private operationTail: Promise<void> = Promise.resolve()
  private shutdownPromise: Promise<void> | undefined
  private suppressImportedAwayReplay = false
  private disposed = false

  constructor(options: Readonly<CanonicalLifecycleCoordinatorOptions>) {
    this.application = options.application
    this.lifecycle = options.lifecycle
    this.clock = options.clock
    this.policy = Object.freeze({ ...options.policy })
    this.onLifecycleFailure = options.onLifecycleFailure
    this.subscribeToRawLifecycle =
      options.subscribeToLifecycle ?? true
    this.readPendingDepartureTimestamp =
      options.readPendingDepartureTimestamp
    this.clearPendingDepartureTimestamp =
      options.clearPendingDepartureTimestamp
  }

  async start(
    clockSample?: LifecycleClockSample,
    pendingDepartureTimestamp?: ParsedUtcTimestamp,
  ): Promise<CanonicalAwayReplayResult> {
    if (this.disposed) {
      return {
        replayed: false,
        committed: false,
        code: 'not-ready',
        reason: 'The lifecycle coordinator is disposed.',
      }
    }
    const admittedClockSample =
      snapshotLifecycleClockSample(
        clockSample ?? this.clock.sample(),
      )
    if (this.subscribeToRawLifecycle) {
      this.subscribeToLifecycle()
    }
    return this.enqueue(async () => {
      const snapshot = await this.application.start()
      if (snapshot.phase !== 'ready') {
        return {
          replayed: false,
          committed: false,
          code: 'not-ready',
        }
      }
      this.lifecycleState = beginColdStartReplay(
        createLifecycleState(snapshot, false),
        true,
      )
      return this.replayAwayTime(
        admittedClockSample,
        pendingDepartureTimestamp ??
          this.readPendingDepartureTimestamp?.(),
      )
    })
  }

  /**
   * Closes admission synchronously, detaches the raw lifecycle source, and
   * then drains every operation that was accepted before shutdown began.
   */
  shutdown(): Promise<void> {
    if (this.shutdownPromise !== undefined) {
      return this.shutdownPromise
    }
    this.disposed = true
    this.unsubscribe?.()
    this.unsubscribe = undefined
    const acceptedTail = this.operationTail
    this.shutdownPromise = acceptedTail.then(
      () => undefined,
      () => undefined,
    )
    return this.shutdownPromise
  }

  dispose(): void {
    void this.shutdown()
  }

  /**
   * Serializes platform callbacks so rapid focus/pause/terminate sequences
   * cannot race stale revisions through the persistence lane.
   */
  handlePlatformPhase(
    phase: LifecyclePhase,
    clockSample?: LifecycleClockSample,
    pendingDepartureTimestamp?: ParsedUtcTimestamp,
  ): Promise<CanonicalLifecycleSaveResult | CanonicalAwayReplayResult> {
    let admittedClockSample: LifecycleClockSample
    try {
      admittedClockSample =
        snapshotLifecycleClockSample(
          clockSample ?? this.clock.sample(),
        )
    } catch (error) {
      return Promise.reject(error)
    }
    return this.enqueue(async () => {
      if (phase === 'active') {
        return this.replayAwayTime(
          admittedClockSample,
          pendingDepartureTimestamp ??
            this.readPendingDepartureTimestamp?.(),
        )
      }
      return this.handleLifecycleEvent(
        lifecycleEventForPhase(phase),
        admittedClockSample,
      )
    })
  }

  async advanceActive(
    milliseconds: number,
  ): Promise<CanonicalCoordinatedActiveResult> {
    return this.enqueue(() =>
      this.advanceActiveUnqueued(milliseconds),
    )
  }

  async advanceActiveContinuous(
    milliseconds: number,
  ): Promise<CanonicalCoordinatedActiveResult> {
    return this.enqueue(() =>
      this.advanceActiveUnqueued(milliseconds, 'continuous'),
    )
  }

  async creditVisibleHibernation(
    milliseconds: number,
  ): Promise<CanonicalAwayReplayResult> {
    return this.enqueue(async () => {
      const snapshot = this.application.snapshot()
      if (
        snapshot.phase !== 'ready' ||
        !Number.isFinite(milliseconds) ||
        milliseconds <= 0
      ) {
        return {
          replayed: false,
          committed: false,
          code: 'not-ready',
        }
      }
      const runtime = cloneCanonicalRuntimeState(
        snapshot.state as CanonicalRuntimeState,
      )
      const grant = applyAwayTimeGrant({
        awaySeconds:
          (milliseconds / 1000) *
          (runtime.gameState.skills.byId.idleElectricSheep?.owned === true
            ? 2
            : 1),
        bankSeconds:
          runtime.gameState.timeline.storedTimeAvailableSeconds,
        capacitySeconds:
          runtime.gameState.timeline.storedTimeCapacitySeconds,
        cheater: runtime.storedTimeCheater,
        dreamDoubleTimeBankSeconds: 0,
      })
      const candidate = {
        ...runtime,
        storedTimeCheater: grant.cheater,
        gameState: {
          ...runtime.gameState,
          timeline: {
            ...runtime.gameState.timeline,
            storedTimeAvailableSeconds: grant.bankSeconds,
            storedTimeCapacitySeconds: grant.capacitySeconds,
            doubleTime: {
              ...runtime.gameState.timeline.doubleTime,
              enabled: false,
              bankSeconds: 0,
              rate: 0,
            },
          },
        },
      }
      const committed = await this.application.commitAwayReplacement(
        revisionEnvelope(snapshot),
        candidate,
      )
      return committed.committed
        ? {
            replayed: true,
            committed: true,
            grantedSeconds: milliseconds / 1000,
            storedTimeCreditedSeconds: grant.storedTimeCreditedSeconds,
            timestampConsumed: false,
            durableRevision: committed.durableRevision,
          }
        : {
            replayed: false,
            committed: false,
            code: 'commit-failed',
            reason: committed.reason,
          }
    })
  }

  private async advanceActiveUnqueued(
    milliseconds: number,
    mode: 'ordinary' | 'continuous' = 'ordinary',
  ): Promise<CanonicalCoordinatedActiveResult> {
    if (!isFiniteNonNegativeNumber(milliseconds)) {
      const transition = rejectedTransition(
        this.application.snapshot(),
        'CANONICAL-ACTIVE-TIME-INVALID',
        'Active time must be finite and non-negative.',
      )
      return {
        transition,
        requestedMilliseconds: milliseconds,
        consumedMilliseconds: 0,
        remainingMilliseconds: milliseconds,
        checkpoints: [],
      }
    }

    let remainingMilliseconds = milliseconds
    let consumedMilliseconds = 0
    const checkpoints: BotCapCheckpointName[] = []
    let transition: SimulationTransitionResult =
      unchangedTransition(this.application.snapshot())

    while (remainingMilliseconds > TIME_EPSILON) {
      const advance = mode === 'continuous'
        ? this.application.advanceActiveContinuousWithContinuation(
            remainingMilliseconds,
          )
        : this.application.advanceActiveWithContinuation(
            remainingMilliseconds,
          )
      transition = advance.transition
      consumedMilliseconds += advance.consumedMilliseconds
      remainingMilliseconds = advance.remainingMilliseconds
      if (!transition.accepted) break
      if (advance.continuation.kind === 'complete') break

      const settlement = await this.settleBotCap(
        advance.continuation.checkpoint,
      )
      checkpoints.push(...settlement.checkpoints)
      if (!settlement.settled) {
        transition = rejectedTransition(
          this.application.snapshot(),
          settlement.code,
          settlement.reason,
        )
        break
      }
    }

    const normalizedRemaining =
      remainingMilliseconds <= TIME_EPSILON
        ? 0
        : remainingMilliseconds
    const normalizedConsumed =
      normalizedRemaining === 0
        ? milliseconds
        : consumedMilliseconds
    return {
      transition,
      requestedMilliseconds: milliseconds,
      consumedMilliseconds: normalizedConsumed,
      remainingMilliseconds: normalizedRemaining,
      checkpoints: Object.freeze([...checkpoints]),
    }
  }

  async dispatchPlayer(
    envelope: ApplicationCommandEnvelope<CanonicalPlayerCommand>,
    cancelRequested?: () => boolean,
  ): Promise<CanonicalCoordinatedPlayerResult> {
    return this.enqueue(() =>
      this.dispatchPlayerUnqueued(envelope, cancelRequested),
    )
  }

  async setDevelopmentDysonBots(
    bots: number,
  ): Promise<CommitFirstResult> {
    return this.enqueue(async () => {
      const snapshot = this.application.snapshot()
      if (!isFiniteNonNegativeNumber(bots)) {
        return {
          committed: false,
          transition: rejectedTransition(
            snapshot,
            'CANONICAL-DEVELOPMENT-BOTS-INVALID',
            'Development bot count must be finite and non-negative.',
          ),
          code: 'CANONICAL-DEVELOPMENT-BOTS-INVALID',
          reason:
            'Development bot count must be finite and non-negative.',
        }
      }
      if (snapshot.phase !== 'ready') {
        return {
          committed: false,
          transition: rejectedTransition(
            snapshot,
            'APP-NOT-READY',
            'The canonical application is not ready.',
          ),
          code: 'APP-NOT-READY',
          reason: 'The canonical application is not ready.',
        }
      }
      if (
        this.application.commitDevelopmentDysonBots ===
        undefined
      ) {
        return {
          committed: false,
          transition: rejectedTransition(
            snapshot,
            'CANONICAL-DEVELOPMENT-CONTROL-UNAVAILABLE',
            'Development progression controls are unavailable.',
          ),
          code: 'CANONICAL-DEVELOPMENT-CONTROL-UNAVAILABLE',
          reason:
            'Development progression controls are unavailable.',
        }
      }
      return this.application.commitDevelopmentDysonBots(
        revisionEnvelope(snapshot),
        bots,
      )
    })
  }

  async unlockDevelopmentReality(): Promise<CommitFirstResult> {
    return this.enqueue(async () => {
      const snapshot = this.application.snapshot()
      if (snapshot.phase !== 'ready') {
        return {
          committed: false,
          transition: rejectedTransition(
            snapshot,
            'APP-NOT-READY',
            'The canonical application is not ready.',
          ),
          code: 'APP-NOT-READY',
          reason: 'The canonical application is not ready.',
        }
      }
      if (
        this.application.commitDevelopmentRealityUnlock ===
        undefined
      ) {
        return {
          committed: false,
          transition: rejectedTransition(
            snapshot,
            'CANONICAL-DEVELOPMENT-CONTROL-UNAVAILABLE',
            'Development progression controls are unavailable.',
          ),
          code: 'CANONICAL-DEVELOPMENT-CONTROL-UNAVAILABLE',
          reason:
            'Development progression controls are unavailable.',
        }
      }
      return this.application.commitDevelopmentRealityUnlock(
        revisionEnvelope(snapshot),
      )
    })
  }

  async applyDevelopmentAction(
    action: CanonicalDevelopmentAction,
  ): Promise<CommitFirstResult> {
    return this.enqueue(async () => {
      const snapshot = this.application.snapshot()
      if (snapshot.phase !== 'ready') {
        return {
          committed: false,
          transition: rejectedTransition(
            snapshot,
            'APP-NOT-READY',
            'The canonical application is not ready.',
          ),
          code: 'APP-NOT-READY',
          reason: 'The canonical application is not ready.',
        }
      }
      if (this.application.commitDevelopmentAction === undefined) {
        return {
          committed: false,
          transition: rejectedTransition(
            snapshot,
            'CANONICAL-DEVELOPMENT-CONTROL-UNAVAILABLE',
            'Development progression controls are unavailable.',
          ),
          code: 'CANONICAL-DEVELOPMENT-CONTROL-UNAVAILABLE',
          reason: 'Development progression controls are unavailable.',
        }
      }
      return this.application.commitDevelopmentAction(
        revisionEnvelope(snapshot),
        action,
      )
    })
  }

  replaceHostEntitlements(
    entitlements: Readonly<DysonEntitlements>,
  ): Promise<CommitFirstResult> {
    return this.enqueue(async () => {
      const snapshot = this.application.snapshot()
      if (snapshot.phase !== 'ready') {
        return {
          committed: false,
          transition: rejectedTransition(
            snapshot,
            'APP-NOT-READY',
            'The canonical application is not ready.',
          ),
          code: 'APP-NOT-READY',
          reason: 'The canonical application is not ready.',
        }
      }
      if (this.application.commitHostEntitlements === undefined) {
        return {
          committed: false,
          transition: rejectedTransition(
            snapshot,
            'CANONICAL-HOST-ENTITLEMENTS-UNAVAILABLE',
            'Host entitlement replacement is unavailable.',
          ),
          code: 'CANONICAL-HOST-ENTITLEMENTS-UNAVAILABLE',
          reason: 'Host entitlement replacement is unavailable.',
        }
      }
      return this.application.commitHostEntitlements(
        revisionEnvelope(snapshot),
        entitlements,
      )
    })
  }

  /**
   * Keeps session replacement in the coordinator's serialized lane. Manual
   * sharing installs an already-consumed lifecycle baseline, while trusted
   * same-device migration and in-place Web upgrades preserve their local quit
   * timestamp for one normal, capped cold-start replay.
   */
  importSave(
    request: ImportSaveRequest,
  ): Promise<CanonicalCoordinatedImportResult> {
    const pendingDepartureAtAdmission =
      this.readPendingDepartureTimestamp?.()
    return this.enqueue(async () => {
      const imported = await this.application.importSave(request)
      if (!imported.imported) return imported

      if (pendingDepartureAtAdmission?.status === 'valid') {
        this.clearPendingDepartureTimestamp?.(
          pendingDepartureAtAdmission.utcMilliseconds,
        )
      }

      const suppressAwayReplay =
        request.context?.kind === undefined ||
        request.context.kind === 'manual-shared-import'
      this.suppressImportedAwayReplay = suppressAwayReplay
      const snapshot = this.application.snapshot()
      if (snapshot.phase === 'ready') {
        const importedBaseline = createLifecycleState(
          snapshot,
          suppressAwayReplay,
        )
        this.lifecycleState = suppressAwayReplay
          ? importedBaseline
          : beginColdStartReplay(importedBaseline, true)
        return {
          imported: true,
          committed: true,
          sessionRevision: imported.sessionRevision,
          lifecycleReset: true,
        }
      }
      this.lifecycleState = undefined
      return {
        imported: true,
        committed: true,
        sessionRevision: imported.sessionRevision,
        lifecycleReset: false,
        code: 'not-ready',
        reason:
          'The imported session was installed without a ready lifecycle baseline.',
      }
    })
  }

  private async dispatchPlayerUnqueued(
    envelope: ApplicationCommandEnvelope<CanonicalPlayerCommand>,
    cancelRequested?: () => boolean,
  ): Promise<CanonicalCoordinatedPlayerResult> {
    const dispatched = await this.application.dispatchPlayer(
      envelope,
      cancelRequested,
    )
    if (dispatched.kind === 'transition') return dispatched

    const result = dispatched.result
    const admittedSeconds =
      result.consumedSeconds + result.remainingSeconds
    const consumedSeconds =
      result.committed ? result.consumedSeconds : 0
    const remainingSeconds = Math.max(
      0,
      admittedSeconds - consumedSeconds,
    )
    const finalSnapshot = this.application.snapshot()
    const durableRevision =
      finalSnapshot.phase === 'ready'
        ? finalSnapshot.revision.durable
        : null
    const common = {
      admittedSeconds,
      consumedSeconds,
      remainingSeconds,
      durableRevision,
      transition: result.transition,
    }
    if (result.committed && remainingSeconds <= TIME_EPSILON) {
      return {
        kind: 'stored-time',
        result: {
          ...common,
          status: 'complete',
          summary: result.summary,
        },
      }
    }
    return {
      kind: 'stored-time',
      result: {
        ...common,
        status: 'failed',
        ...(result.committed
          ? {}
          : {
              code: result.code,
              reason: result.reason,
            }),
      },
    }
  }

  private async replayAwayTime(
    clockSample: LifecycleClockSample,
    pendingQuitTimestamp?: ParsedUtcTimestamp,
  ): Promise<CanonicalAwayReplayResult> {
    const snapshot = this.application.snapshot()
    if (snapshot.phase !== 'ready') {
      return {
        replayed: false,
        committed: false,
        code: 'not-ready',
      }
    }
    const runtime = cloneCanonicalRuntimeState(
      snapshot.state as CanonicalRuntimeState,
    )
    if (this.suppressImportedAwayReplay) {
      this.lifecycleState =
        this.lifecycleState === undefined
          ? createLifecycleState(snapshot, true)
          : {
            ...this.lifecycleState,
            canonical: runtime.gameState,
            loaded: true,
            saveReady: true,
            coldStartReplayPending: false,
            coldStartGateSaveUsed: false,
            departureTimestampRecorded: false,
          }
      return {
        replayed: false,
        committed: false,
        code: 'import-baseline-suppressed',
      }
    }
    const current =
      this.lifecycleState === undefined
        ? createLifecycleState(snapshot, true)
        : {
            ...this.lifecycleState,
            canonical: runtime.gameState,
            loaded: true,
          }
    const persistedQuitTimestamp = parseUnityInvariantUtcTimestamp(
      runtime.gameState.timeline.lastSuspendedAtLegacyText,
    )
    const replay = applyAwayTimeReplay({
      state: current,
      clock: clockSample,
      parsedQuitTimestamp: earliestValidDepartureTimestamp(
        persistedQuitTimestamp,
        pendingQuitTimestamp,
      ),
      parsedStartedTimestamp: parseUnityInvariantUtcTimestamp(
        runtime.gameState.meta.createdAtLegacyText,
      ),
    })

    if (!replay.resolution.hasQuitTimestampInput) {
      this.lifecycleState = replay.state
      return {
        replayed: false,
        committed: false,
        code: 'no-quit-timestamp',
      }
    }

    const candidate = cloneCanonicalRuntimeState(runtime)
    Object.assign(candidate, {
      gameState: replay.state.canonical,
      storedTimeCheater:
        candidate.storedTimeCheater ||
        replay.markComparisonIntegrityCompromised,
    })
    const committed = await this.application.commitAwayReplacement(
      revisionEnvelope(snapshot),
      candidate,
    )
    if (!committed.committed) {
      this.lifecycleState = {
        ...current,
        saveReady: true,
        coldStartReplayPending: false,
        coldStartGateSaveUsed: false,
        departureTimestampRecorded:
          runtime.gameState.timeline
            .lastSuspendedAtLegacyText !== null,
      }
      return {
        replayed: false,
        committed: false,
        code: 'commit-failed',
        reason: committed.reason,
      }
    }
    this.lifecycleState = replay.state
    if (pendingQuitTimestamp?.status === 'valid') {
      this.clearPendingDepartureTimestamp?.(
        pendingQuitTimestamp.utcMilliseconds,
      )
    }
    return {
      replayed: true,
      committed: true,
      grantedSeconds: replay.resolution.grantedSeconds,
      storedTimeCreditedSeconds:
        replay.storedTimeCreditedSeconds,
      timestampConsumed: replay.timestampConsumed,
      durableRevision: committed.durableRevision,
    }
  }

  private async handleLifecycleEvent(
    event: LifecycleEvent,
    clockSample: LifecycleClockSample,
  ): Promise<CanonicalLifecycleSaveResult> {
    const snapshot = this.application.snapshot()
    if (snapshot.phase !== 'ready') {
      return {
        requested: false,
        committed: false,
        code: 'not-ready',
      }
    }
    const runtime = cloneCanonicalRuntimeState(
      snapshot.state as CanonicalRuntimeState,
    )
    const current =
      this.lifecycleState === undefined
        ? createLifecycleState(snapshot, true)
        : { ...this.lifecycleState, canonical: runtime.gameState }
    const evaluated = evaluateLifecycleEvent(
      current,
      event,
      this.policy,
      clockSample,
    )
    if (evaluated.saveIntent === null) {
      this.lifecycleState = evaluated.state
      return {
        requested: false,
        committed: false,
        code:
          evaluated.blockedReason ===
          'cold_start_gate_debounced'
            ? 'cold-start-gate-debounced'
            : 'not-applicable',
      }
    }

    const candidate = cloneCanonicalRuntimeState(runtime)
    Object.assign(candidate, {
      gameState: evaluated.saveIntent.candidate,
    })
    const committed = await this.application.commitAwayReplacement(
      revisionEnvelope(snapshot),
      candidate,
    )
    if (!committed.committed) {
      return {
        requested: true,
        committed: false,
        code: 'commit-failed',
        reason: committed.reason,
      }
    }
    if (evaluated.saveIntent.stampQuitTimestamp) {
      this.suppressImportedAwayReplay = false
    }
    this.lifecycleState = evaluated.state
    return {
      requested: true,
      committed: true,
      durableRevision: committed.durableRevision,
    }
  }

  private async settleBotCap(
    initialCheckpoint: BotCapCheckpointName,
  ): Promise<CanonicalBotCapSettlementResult> {
    const checkpoints: BotCapCheckpointName[] = []
    let checkpoint: BotCapCheckpointName | undefined =
      initialCheckpoint

    for (
      let index = 0;
      checkpoint !== undefined &&
      index < MAXIMUM_BOT_CAP_CHECKPOINTS;
      index += 1
    ) {
      const snapshot = this.application.snapshot()
      if (snapshot.phase !== 'ready') {
        return {
          settled: false,
          checkpoints: Object.freeze([...checkpoints]),
          code: 'APP-NOT-READY',
          reason: 'The application became unavailable during bot-cap settlement.',
        }
      }
      const committed =
        await this.application.commitBotCapCheckpoint(
          revisionEnvelope(snapshot),
          checkpoint,
        )
      if (!committed.committed) {
        return {
          settled: false,
          checkpoints: Object.freeze([...checkpoints]),
          code:
            committed.code ??
            'CANONICAL-BOT-CAP-COMMIT-FAILED',
          reason:
            committed.reason ??
            'A bot-cap checkpoint could not be committed.',
        }
      }
      checkpoints.push(checkpoint)
      checkpoint = requiredBotCapCheckpoint(
        this.application.snapshot(),
      )
    }

    if (checkpoint !== undefined) {
      return {
        settled: false,
        checkpoints: Object.freeze([...checkpoints]),
        code: 'CANONICAL-BOT-CAP-CHECKPOINT-LOOP',
        reason: 'Bot-cap settlement exceeded its finite checkpoint sequence.',
      }
    }
    return {
      settled: true,
      checkpoints: Object.freeze([...checkpoints]),
    }
  }

  private subscribeToLifecycle(): void {
    if (this.unsubscribe !== undefined) return
    this.unsubscribe = this.lifecycle.subscribe((phase) => {
      void this.handlePlatformPhase(phase).catch((error: unknown) => {
        try {
          this.onLifecycleFailure?.(
            Object.freeze({ phase, error }),
          )
        } catch {
          // A reporting sink cannot reopen the discarded callback rejection.
        }
      })
    })
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    if (this.disposed) {
      return Promise.reject(
        new CanonicalLifecycleCoordinatorClosedError(),
      )
    }
    const result = this.operationTail.then(operation, operation)
    this.operationTail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }
}

function createLifecycleState(
  snapshot: Extract<
    ApplicationSnapshot<CanonicalRuntimeState>,
    { readonly phase: 'ready' }
  >,
  saveReady: boolean,
): LifecycleCoordinatorState {
  return {
    canonical: cloneCanonicalRuntimeState(
      snapshot.state as CanonicalRuntimeState,
    ).gameState,
    loaded: true,
    saveReady,
    coldStartReplayPending: false,
    coldStartGateSaveUsed: false,
    departureTimestampRecorded: false,
  }
}

function snapshotLifecycleClockSample(
  sample: LifecycleClockSample,
): LifecycleClockSample {
  return Object.freeze({
    utcMilliseconds: sample.utcMilliseconds,
    serializedUtcText: sample.serializedUtcText,
  })
}

function earliestValidDepartureTimestamp(
  persisted: ParsedUtcTimestamp,
  pending: ParsedUtcTimestamp | undefined,
): ParsedUtcTimestamp {
  if (pending?.status !== 'valid') return persisted
  if (persisted.status !== 'valid') return pending
  return pending.utcMilliseconds < persisted.utcMilliseconds
    ? pending
    : persisted
}

function lifecycleEventForPhase(
  phase: Exclude<LifecyclePhase, 'active'>,
): LifecycleEvent {
  switch (phase) {
    case 'background':
      return { kind: 'pause_changed', paused: true }
    case 'focus-lost':
      return { kind: 'focus_changed', focused: false }
    case 'terminating':
      return { kind: 'quit_requested' }
  }
}

function revisionEnvelope(
  snapshot: Extract<
    ApplicationSnapshot<CanonicalRuntimeState>,
    { readonly phase: 'ready' }
  >,
): Pick<
  ApplicationCommandEnvelope<unknown>,
  'sessionRevision' | 'expectedStateRevision'
> {
  return {
    sessionRevision: snapshot.revision.session,
    expectedStateRevision: snapshot.revision.state,
  }
}

function requiredBotCapCheckpoint(
  snapshot: ApplicationSnapshot<CanonicalRuntimeState>,
): BotCapCheckpointName | undefined {
  if (snapshot.phase !== 'ready') return undefined
  const state = cloneCanonicalRuntimeState(
    snapshot.state as CanonicalRuntimeState,
  ).gameState
  const evaluated = evaluateCanonicalBotCapCheckpoint(state)
  return selectBotCapCheckpointToPersist(evaluated.action)
}

function unchangedTransition(
  snapshot: ApplicationSnapshot<CanonicalRuntimeState>,
): SimulationTransitionResult {
  return {
    accepted: true,
    changed: false,
    revision:
      snapshot.phase === 'ready' ? snapshot.revision.state : 0,
  }
}

function rejectedTransition(
  snapshot: ApplicationSnapshot<CanonicalRuntimeState>,
  code: string,
  reason: string,
): SimulationTransitionResult {
  return {
    accepted: false,
    code,
    reason,
    revision:
      snapshot.phase === 'ready' ? snapshot.revision.state : 0,
  }
}
