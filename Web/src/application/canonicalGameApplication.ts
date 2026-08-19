import type {
  DeepReadonly,
  DomainTransition,
  SimulationEngineDefinition,
  SimulationTransitionResult,
} from '../core/contracts'
import {
  deriveBasicDysonState,
  type DysonEntitlements,
} from '../simulation/canonicalDysonDerivation'
import {
  evaluateCanonicalBotCapCheckpoint,
  type BotCapCheckpointName,
} from '../simulation/canonicalBotCapCheckpoint'
import {
  CANONICAL_QUANTUM_LEAP_INPUT,
  CanonicalEventTimeModel,
  deriveCanonicalArtifactSkillPoints,
  prepareCanonicalEventTimeContext,
  prepareCanonicalEventTimeContextVariants,
  type CanonicalEventTimeContext,
  type CanonicalEventTimeState,
} from '../simulation/canonicalEventTimeModel'
import { advanceEventTime } from '../simulation/eventTime'
import {
  completeStoredTimeInfinityAggregate,
} from '../simulation/storedTimeAccounting'
import { QUANTUM_CONSTANTS } from '../simulation/quantumUpgrades'
import {
  withCanonicalBotAllocation,
} from '../simulation/canonicalBotAllocation'
import {
  addDiscrete,
  DISCRETE_MAXIMUM,
} from '../simulation/numeric'
import { runCanonicalSkillAutoAssignment } from '../simulation/canonicalSkillTransactions'
import {
  createSimulationSummary,
  transferEventTimeModelOwnership,
  type SimulationAutomationPolicy,
} from '../simulation/types'
import {
  normalizeCanonicalTinkerRuntimeState,
} from '../simulation/canonicalTinker'
import { applyAwayTimeGrant } from '../simulation/timeResources'
import type { SaveRepository } from '../save/repository'
import type { StartupSaveResolver } from '../save/startupResolver'
import {
  routeCanonicalGameCommand,
  type CanonicalGameCommand,
  type CanonicalGameCommandOptions,
  type CanonicalGameRuntimeCarriers,
} from './canonicalGameCommands'
import type {
  ApplicationCommandEnvelope,
  ApplicationListener,
  ApplicationSnapshot,
  CheckpointResult,
  CommitFirstResult,
  GameStateSessionFactory,
  ImportSaveRequest,
  ImportSaveResult,
} from './contracts'
import { TransactionalGameApplication } from './gameApplication'
import {
  selectFrontendApplicationSnapshot,
  type FrontendApplicationSnapshot,
  type FrontendGameplayPreviewDemand,
  type FrontendQuantumLeapPreview,
} from './frontendSnapshot'
import type { CanonicalPlayerCommand } from './canonicalPlayerCommands'
import {
  cloneCanonicalRuntimeState,
  type CanonicalRuntimeState,
} from './canonicalRuntimeSession'
import {
  type StoredTimeJobProgress,
  type StoredTimeJobStatus,
} from '../workers/storedTime/storedTimeProtocol'
import type {
  StoredTimeJobRunner,
} from '../workers/storedTime/storedTimeJobRunner'

export const CANONICAL_GAME_APPLICATION_SCHEMA = 1 as const

export {
  CANONICAL_PLAYER_COMMAND_KINDS,
  CANONICAL_PLAYER_COMMAND_SUPPORT,
  type CanonicalPlayerCommand,
  type CanonicalPlayerCommandKind,
} from './canonicalPlayerCommands'

type CanonicalInternalCommand =
  | {
      readonly kind: 'internal.advance-stored-time'
      readonly seconds: number
      readonly cancelRequested?: () => boolean
    }
  | {
      readonly kind: 'internal.replace-away-state'
      readonly state: CanonicalRuntimeState
    }
  | {
      readonly kind: 'internal.replace-stored-time-state'
      readonly state: CanonicalRuntimeState
    }
  | {
      readonly kind: 'internal.bot-cap-checkpoint'
      readonly checkpoint: BotCapCheckpointName
    }
  | {
      readonly kind: 'internal.development-set-dyson-bots'
      readonly bots: number
    }
  | {
      readonly kind: 'internal.development-unlock-reality'
    }
  | {
      readonly kind: 'internal.development-apply-action'
      readonly action: CanonicalDevelopmentAction
    }
  | {
      readonly kind: 'internal.replace-host-entitlements'
      readonly entitlements: Readonly<DysonEntitlements>
    }

export type CanonicalDevelopmentAction =
  | { readonly kind: 'add-cash'; readonly amount: number }
  | { readonly kind: 'add-bots'; readonly amount: number }
  | { readonly kind: 'add-skill-points'; readonly amount: bigint }
  | { readonly kind: 'add-infinity-points'; readonly amount: bigint }
  | { readonly kind: 'add-quantum-shards'; readonly amount: bigint }
  | { readonly kind: 'add-influence'; readonly amount: bigint }
  | { readonly kind: 'add-strange-matter'; readonly amount: bigint }
  | { readonly kind: 'add-offline-time'; readonly seconds: number }
  | { readonly kind: 'set-tinker-interval'; readonly seconds: 0 | 1 }
  | { readonly kind: 'recalculate-skill-points' }
  | { readonly kind: 'reset-secret-progress' }
  | { readonly kind: 'purchase-debug-options' }
  | { readonly kind: 'enable-host-debug-options' }
  | { readonly kind: 'disable-debug-options' }

type CanonicalApplicationCommand =
  | CanonicalPlayerCommand
  | CanonicalInternalCommand

export interface CanonicalGameEngineOptions {
  readonly eventContext: Readonly<CanonicalEventTimeContext>
  readonly infinityMinimumCycleSeconds?: number
}

export interface CanonicalGameApplicationOptions {
  readonly startupResolver: StartupSaveResolver
  readonly repository: SaveRepository
  readonly sessionFactory: GameStateSessionFactory<CanonicalRuntimeState>
  readonly engine: Readonly<CanonicalGameEngineOptions>
  readonly storedTimeJobRunner?: StoredTimeJobRunner
}

export type StoredTimeJobListener = (
  status: Readonly<StoredTimeJobStatus>,
) => void

export type CanonicalPlayerDispatchResult =
  | {
      readonly kind: 'transition'
      readonly transition: SimulationTransitionResult
    }
  | {
      readonly kind: 'stored-time'
      readonly result: CanonicalStoredTimeCommitResult
    }

export type CanonicalStoredTimeCommitResult =
  | {
      readonly committed: true
      readonly transition: Extract<
        SimulationTransitionResult,
        { accepted: true }
      >
      readonly durableRevision: number
      readonly consumedSeconds: number
      readonly remainingSeconds: number
      readonly continuation:
        | { readonly kind: 'complete' }
        | {
            readonly kind: 'bot-cap-persistence-required'
            readonly checkpoint: BotCapCheckpointName
          }
    }
  | {
      readonly committed: false
      readonly transition: SimulationTransitionResult
      readonly consumedSeconds: 0
      readonly remainingSeconds: number
      readonly code?: string
      readonly reason?: string
    }

export interface CanonicalActiveAdvanceResult {
  readonly transition: SimulationTransitionResult
  readonly consumedMilliseconds: number
  readonly remainingMilliseconds: number
  readonly continuation:
    | { readonly kind: 'complete' }
    | {
        readonly kind: 'bot-cap-persistence-required'
        readonly checkpoint: BotCapCheckpointName
      }
}

/**
 * Concrete, presentation-free application boundary for canonical game state.
 *
 * All durable transitions flow through TransactionalGameApplication. The
 * private internal commands are intentionally not part of CanonicalPlayerCommand,
 * so a frontend cannot invoke away replacement or checkpoint candidates.
 */
export class CanonicalGameApplicationFacade {
  private readonly application: TransactionalGameApplication<
    CanonicalRuntimeState,
    CanonicalApplicationCommand
  >
  private readonly eventContext: Readonly<CanonicalEventTimeContext>
  private readonly infinityMinimumCycleSeconds: number
  private readonly storedTimeJobRunner: StoredTimeJobRunner | undefined
  private readonly storedTimeJobListeners = new Set<StoredTimeJobListener>()
  private storedTimeJobStatusValue: StoredTimeJobStatus = Object.freeze({
    kind: 'idle',
  })
  private storedTimeCancellationRequested = false
  private cachedFrontendSnapshot:
    | DeepReadonly<FrontendApplicationSnapshot>
    | undefined
  private cachedFrontendPreviewDemand:
    | FrontendGameplayPreviewDemand
    | undefined

  constructor(options: Readonly<CanonicalGameApplicationOptions>) {
    this.eventContext = prepareCanonicalEventTimeContext(
      options.engine.eventContext,
    )
    this.infinityMinimumCycleSeconds =
      options.engine.infinityMinimumCycleSeconds ?? 1 / 60
    this.storedTimeJobRunner = options.storedTimeJobRunner
    this.application = new TransactionalGameApplication({
      startupResolver: options.startupResolver,
      repository: options.repository,
      sessionFactory: options.sessionFactory,
      engineDefinition: createCanonicalGameEngineDefinition({
        ...options.engine,
        eventContext: this.eventContext,
      }),
    })
  }

  snapshot(): ApplicationSnapshot<CanonicalRuntimeState> {
    return this.application.snapshot()
  }

  previewQuantumLeap(): FrontendQuantumLeapPreview {
    const snapshot = this.snapshot()
    if (snapshot.phase !== 'ready') {
      return {
        eligible: false,
        code: 'APP-NOT-READY',
        branch: null,
        artifactSkillPoints: null,
        definitionGap: null,
      }
    }
    return previewCanonicalQuantumLeap(
      snapshot.state as CanonicalRuntimeState,
      this.eventContext,
    )
  }

  frontendSnapshot(
    previewDemand: FrontendGameplayPreviewDemand = 'all',
  ): DeepReadonly<FrontendApplicationSnapshot> {
    const application = this.snapshot()
    if (
      this.cachedFrontendSnapshot !== undefined &&
      this.cachedFrontendPreviewDemand === previewDemand &&
      sameFrontendApplicationEnvelope(
        this.cachedFrontendSnapshot,
        application,
      )
    ) {
      return this.cachedFrontendSnapshot
    }
    const mayReusePreviousGameplay =
      application.phase === 'ready' &&
      this.cachedFrontendSnapshot?.phase === 'ready' &&
      this.cachedFrontendSnapshot.revision.session ===
        application.revision.session
    const previousPreviews =
      mayReusePreviousGameplay &&
      this.cachedFrontendSnapshot?.phase === 'ready'
        ? this.cachedFrontendSnapshot.gameplay.previews
        : undefined
    const previousGameplay =
      mayReusePreviousGameplay &&
      this.cachedFrontendSnapshot?.phase === 'ready'
        ? this.cachedFrontendSnapshot.gameplay
        : undefined
    const quantumLeap =
      application.phase === 'ready'
        ? previousPreviews === undefined ||
          previewDemand === 'all' ||
          previewDemand === 'quantum'
          ? previewCanonicalQuantumLeap(
              application.state as CanonicalRuntimeState,
              this.eventContext,
            )
          : previousPreviews.quantum.leap
        : {
            eligible: false,
            code: 'APP-NOT-READY',
            branch: null,
            artifactSkillPoints: null,
            definitionGap: null,
          } satisfies FrontendQuantumLeapPreview
    this.cachedFrontendSnapshot = selectFrontendApplicationSnapshot(
      application,
      {
        runtimeRequirements: {
          'compatibility-tuning': true,
          'quantum-leap-port': true,
          'runtime-evaluation-port': true,
          'selected-skill-preset-carrier': true,
          'stored-time-commit-first-runner': true,
          'stored-time-cheater-carrier': true,
        },
        quantumLeap,
        realityWorkerTuning: this.eventContext.realityWorkerTuning,
        dysonPresentationTuning:
          this.eventContext.dysonPresentationTuning,
        previewDemand,
        previousPreviews,
        previousGameplay,
      },
      'detached-frozen',
    )
    this.cachedFrontendPreviewDemand = previewDemand
    return this.cachedFrontendSnapshot
  }

  start(): Promise<ApplicationSnapshot<CanonicalRuntimeState>> {
    return this.application.start()
  }

  advanceActive(milliseconds: number): SimulationTransitionResult {
    return this.application.advanceActive(milliseconds)
  }

  /**
   * Coordinator-facing active tick that preserves an exact resumable tail
   * when the event model reaches a commit-first bot-cap boundary.
   */
  advanceActiveWithContinuation(
    milliseconds: number,
  ): CanonicalActiveAdvanceResult {
    const before = this.snapshot()
    const beforeSeconds =
      before.phase === 'ready'
        ? before.state.gameState.statistics.trackedSimulatedSeconds
        : 0
    const transition = this.application.advanceActive(milliseconds)
    const after = this.snapshot()
    const afterSeconds =
      after.phase === 'ready'
        ? after.state.gameState.statistics.trackedSimulatedSeconds
        : beforeSeconds
    const consumedMilliseconds = Math.min(
      milliseconds,
      Math.max(0, afterSeconds - beforeSeconds) * 1000,
    )
    const remainingMilliseconds = Math.max(
      0,
      milliseconds - consumedMilliseconds,
    )
    const checkpoint =
      after.phase === 'ready'
        ? requiredBotCapCheckpoint(
            structuredClone(after.state.gameState) as CanonicalRuntimeState['gameState'],
          )
        : undefined
    return {
      transition,
      consumedMilliseconds,
      remainingMilliseconds,
      continuation:
        checkpoint === undefined
          ? { kind: 'complete' }
          : {
              kind: 'bot-cap-persistence-required',
              checkpoint,
            },
    }
  }

  checkpoint(): Promise<CheckpointResult> {
    return this.application.checkpoint()
  }

  importSave(request: ImportSaveRequest): Promise<ImportSaveResult> {
    return this.application.importSave(request)
  }

  subscribe(
    listener: ApplicationListener<CanonicalRuntimeState>,
  ): () => void {
    return this.application.subscribe(listener)
  }

  storedTimeJobStatus(): Readonly<StoredTimeJobStatus> {
    return this.storedTimeJobStatusValue
  }

  subscribeStoredTimeJob(listener: StoredTimeJobListener): () => void {
    this.storedTimeJobListeners.add(listener)
    return () => this.storedTimeJobListeners.delete(listener)
  }

  cancelStoredTimeJob(): void {
    if (this.storedTimeJobStatusValue.kind === 'idle') return
    this.storedTimeCancellationRequested = true
    this.publishStoredTimeJobStatus({
      ...this.storedTimeJobStatusValue,
      kind: 'cancelling',
    })
  }

  disposeStoredTimeJobRunner(): void {
    this.storedTimeCancellationRequested = true
    this.storedTimeJobRunner?.dispose()
    this.publishStoredTimeJobStatus({ kind: 'idle' })
  }

  async dispatchPlayer(
    envelope: ApplicationCommandEnvelope<CanonicalPlayerCommand>,
    cancelRequested?: () => boolean,
  ): Promise<CanonicalPlayerDispatchResult> {
    if (envelope.command.kind !== 'time.request-stored-time-spend') {
      return {
        kind: 'transition',
        transition: this.application.dispatch(envelope),
      }
    }

    const ready = this.snapshot()
    if (ready.phase !== 'ready') {
      return {
        kind: 'transition',
        transition: this.application.dispatch(envelope),
      }
    }
    const routed = routeCanonicalGameCommand(
      cloneCanonicalRuntimeState(ready.state as CanonicalRuntimeState).gameState,
      envelope.command,
      commandOptions(
        ready.state as CanonicalRuntimeState,
        this.eventContext,
      ),
    )
    const intent = routed.intents[0]
    if (!routed.accepted || intent?.kind !== 'advance-stored-time') {
      return {
        kind: 'transition',
        transition: this.application.dispatch(envelope),
      }
    }
    return {
      kind: 'stored-time',
      result: await this.commitStoredTime(
        envelope,
        intent.seconds,
        cancelRequested,
      ),
    }
  }

  async commitStoredTime(
    envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    seconds: number,
    cancelRequested?: () => boolean,
  ): Promise<CanonicalStoredTimeCommitResult> {
    if (this.storedTimeJobRunner !== undefined) {
      return this.commitStoredTimeInJob(
        envelope,
        seconds,
        cancelRequested,
      )
    }
    return this.commitStoredTimeSynchronously(
      envelope,
      seconds,
      cancelRequested,
    )
  }

  private async commitStoredTimeInJob(
    envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    seconds: number,
    cancelRequested?: () => boolean,
  ): Promise<CanonicalStoredTimeCommitResult> {
    const before = this.snapshot()
    if (before.phase !== 'ready') {
      return rejectedStoredTimeCommit(
        before,
        seconds,
        'APP-NOT-READY',
        'Stored Time requires a ready application.',
      )
    }
    const bank = before.state.gameState.timeline.storedTimeAvailableSeconds
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > bank) {
      return rejectedStoredTimeCommit(
        before,
        seconds,
        'CANONICAL-STORED-TIME-INVALID',
        'Stored-time spend must be positive, finite, and no greater than the bank.',
      )
    }

    const jobId = createStoredTimeJobId()
    this.storedTimeCancellationRequested = false
    this.publishStoredTimeProgress({
      jobId,
      requestedSeconds: seconds,
      computedSeconds: 0,
      fraction: 0,
      elapsedMilliseconds: 0,
      estimatedRemainingMilliseconds: null,
      maximumChunkMilliseconds: 0,
    })
    try {
      const terminal = await this.storedTimeJobRunner!.run({
        jobId,
        state: cloneCanonicalRuntimeState(
          before.state as CanonicalRuntimeState,
        ),
        requestedSeconds: seconds,
        infinityMinimumCycleSeconds: this.infinityMinimumCycleSeconds,
        dysonPresentationTuning:
          this.eventContext.dysonPresentationTuning!,
      }, {
        cancelRequested: () =>
          this.storedTimeCancellationRequested ||
          cancelRequested?.() === true,
        onProgress: (progress) => this.publishStoredTimeProgress(progress),
      })
      if (terminal.type === 'cancelled') {
        return rejectedStoredTimeCommit(
          this.snapshot(),
          seconds,
          'CANONICAL-STORED-TIME-CANCELLED',
          'Cancelled Stored Time work was discarded without charging the bank.',
        )
      }
      if (terminal.type === 'failed') {
        return rejectedStoredTimeCommit(
          this.snapshot(),
          seconds,
          terminal.code,
          terminal.reason,
        )
      }
      const candidateIssue = validateStoredTimeJobCandidate(
        before.state as CanonicalRuntimeState,
        terminal.candidate,
        seconds,
        terminal.consumedSeconds,
        terminal.remainingSeconds,
      )
      if (candidateIssue !== undefined) {
        return rejectedStoredTimeCommit(
          this.snapshot(),
          seconds,
          'STORED-TIME-WORKER-CANDIDATE-INVALID',
          candidateIssue,
        )
      }
      const checkpoint = requiredBotCapCheckpoint(
        structuredClone(terminal.candidate.gameState),
      )
      if (
        terminal.continuation.kind ===
          'bot-cap-persistence-required' &&
        checkpoint === undefined
      ) {
        return rejectedStoredTimeCommit(
          this.snapshot(),
          seconds,
          'STORED-TIME-WORKER-CONTINUATION-INVALID',
          'The worker requested a bot-cap checkpoint that the candidate does not require.',
        )
      }
      const result = await this.application.dispatchCommitFirst(
        {
          ...envelope,
          command: {
            kind: 'internal.replace-stored-time-state',
            state: terminal.candidate,
          },
        },
        'stored-time',
      )
      if (!result.committed) {
        return {
          ...result,
          consumedSeconds: 0,
          remainingSeconds: seconds,
        }
      }
      return {
        ...result,
        consumedSeconds: terminal.consumedSeconds,
        remainingSeconds: terminal.remainingSeconds,
        continuation:
          terminal.continuation.kind ===
            'bot-cap-persistence-required' || checkpoint !== undefined
            ? {
                kind: 'bot-cap-persistence-required',
                checkpoint: checkpoint as BotCapCheckpointName,
              }
            : { kind: 'complete' },
      }
    } catch (error) {
      return rejectedStoredTimeCommit(
        this.snapshot(),
        seconds,
        'STORED-TIME-WORKER-UNAVAILABLE',
        error instanceof Error ? error.message : String(error),
      )
    } finally {
      this.storedTimeCancellationRequested = false
      this.publishStoredTimeJobStatus({ kind: 'idle' })
    }
  }

  private async commitStoredTimeSynchronously(
    envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    seconds: number,
    cancelRequested?: () => boolean,
  ): Promise<CanonicalStoredTimeCommitResult> {
    const before = this.snapshot()
    const beforeBank =
      before.phase === 'ready'
        ? before.state.gameState.timeline.storedTimeAvailableSeconds
        : 0
    const result = await this.application.dispatchCommitFirst(
      {
        ...envelope,
        command: {
          kind: 'internal.advance-stored-time',
          seconds,
          cancelRequested,
        },
      },
      'stored-time',
    )
    if (!result.committed) {
      return {
        ...result,
        consumedSeconds: 0,
        remainingSeconds: seconds,
      }
    }

    const after = this.snapshot()
    const afterBank =
      after.phase === 'ready'
        ? after.state.gameState.timeline.storedTimeAvailableSeconds
        : beforeBank
    const consumedSeconds = Math.max(0, beforeBank - afterBank)
    const remainingSeconds = Math.max(0, seconds - consumedSeconds)
    const checkpoint =
      after.phase === 'ready'
        ? requiredBotCapCheckpoint(
            structuredClone(after.state.gameState) as CanonicalRuntimeState['gameState'],
          )
        : undefined
    return {
      ...result,
      consumedSeconds,
      remainingSeconds,
      continuation:
        checkpoint === undefined
          ? { kind: 'complete' }
          : {
              kind: 'bot-cap-persistence-required',
              checkpoint,
            },
    }
  }

  private publishStoredTimeProgress(progress: StoredTimeJobProgress): void {
    const current = this.storedTimeJobStatusValue
    const monotonicProgress =
      current.kind !== 'idle' &&
      current.jobId === progress.jobId &&
      current.computedSeconds > progress.computedSeconds
        ? {
            ...progress,
            computedSeconds: current.computedSeconds,
            fraction: current.fraction,
          }
        : progress
    this.publishStoredTimeJobStatus({
      ...monotonicProgress,
      kind: this.storedTimeCancellationRequested
        ? 'cancelling'
        : 'running',
    })
  }

  private publishStoredTimeJobStatus(status: StoredTimeJobStatus): void {
    this.storedTimeJobStatusValue = Object.freeze(status)
    for (const listener of this.storedTimeJobListeners) {
      try {
        listener(status)
      } catch {
        // A presentation observer cannot alter persistence or bank accounting.
      }
    }
  }

  commitAwayReplacement(
    envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    state: Readonly<CanonicalRuntimeState>,
  ): Promise<CommitFirstResult> {
    return this.application.dispatchCommitFirst(
      {
        ...envelope,
        command: {
          kind: 'internal.replace-away-state',
          state: cloneCanonicalRuntimeState(state),
        },
      },
      'away-time',
    )
  }

  commitBotCapCheckpoint(
    envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    checkpoint: BotCapCheckpointName,
  ): Promise<CommitFirstResult> {
    return this.application.dispatchCommitFirst(
      {
        ...envelope,
        command: {
          kind: 'internal.bot-cap-checkpoint',
          checkpoint,
        },
      },
      'bot-cap',
    )
  }

  commitDevelopmentDysonBots(
    envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    bots: number,
  ): Promise<CommitFirstResult> {
    return this.application.dispatchCommitFirst(
      {
        ...envelope,
        command: {
          kind: 'internal.development-set-dyson-bots',
          bots,
        },
      },
      'development',
    )
  }

  commitDevelopmentRealityUnlock(
    envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
  ): Promise<CommitFirstResult> {
    return this.application.dispatchCommitFirst(
      {
        ...envelope,
        command: {
          kind: 'internal.development-unlock-reality',
        },
      },
      'development',
    )
  }

  commitDevelopmentAction(
    envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    action: CanonicalDevelopmentAction,
  ): Promise<CommitFirstResult> {
    return this.application.dispatchCommitFirst(
      {
        ...envelope,
        command: {
          kind: 'internal.development-apply-action',
          action,
        },
      },
      'development',
    )
  }

  commitHostEntitlements(
    envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    entitlements: Readonly<DysonEntitlements>,
  ): Promise<CommitFirstResult> {
    return this.application.dispatchCommitFirst(
      {
        ...envelope,
        command: {
          kind: 'internal.replace-host-entitlements',
          entitlements,
        },
      },
      'development',
    )
  }
}

export function createCanonicalGameApplication(
  options: Readonly<CanonicalGameApplicationOptions>,
): CanonicalGameApplicationFacade {
  return new CanonicalGameApplicationFacade(options)
}

export function createCanonicalGameEngineDefinition(
  options: Readonly<CanonicalGameEngineOptions>,
): SimulationEngineDefinition<
  CanonicalRuntimeState,
  CanonicalApplicationCommand
> {
  const minimumCycleSeconds =
    options.infinityMinimumCycleSeconds ?? 1 / 60
  const eventContexts = prepareCanonicalEventTimeContextVariants(
    options.eventContext,
  )
  const eventContext = eventContexts.active
  return {
    schema: CANONICAL_GAME_APPLICATION_SCHEMA,
    cloneState: cloneCanonicalRuntimeState,
    forkState: (state) => ({ ...state }),
    publishImmutableState: true,
    validateState: (state) =>
      validateRuntimeState(state, eventContext),
    validateTransitionState: (state) =>
      validateRuntimeTransitionState(state, eventContext),
    applyCommand: (candidate, command) => {
      if (command.kind === 'tinker.start') {
        return applyTinker(candidate, eventContext, (model) =>
          model.startTinker(command.repeat))
      }
      if (command.kind === 'tinker.set-repeat') {
        return applyTinker(candidate, eventContext, (model) =>
          model.setTinkerRepeat(command.enabled))
      }
      if (command.kind === 'internal.replace-away-state') {
        replaceRuntimeState(candidate, command.state)
        return { accepted: true, changed: true }
      }
      if (command.kind === 'internal.replace-stored-time-state') {
        replaceRuntimeState(candidate, command.state)
        return { accepted: true, changed: true }
      }
      if (command.kind === 'internal.bot-cap-checkpoint') {
        return applyBotCapCheckpoint(
          candidate,
          command.checkpoint,
          eventContext,
        )
      }
      if (
        command.kind ===
        'internal.development-set-dyson-bots'
      ) {
        return applyDevelopmentDysonBots(
          candidate,
          command.bots,
        )
      }
      if (
        command.kind ===
        'internal.development-unlock-reality'
      ) {
        return applyDevelopmentRealityUnlock(candidate)
      }
      if (
        command.kind ===
        'internal.development-apply-action'
      ) {
        return applyDevelopmentAction(
          candidate,
          command.action,
          eventContext,
        )
      }
      if (command.kind === 'internal.replace-host-entitlements') {
        const entitlements = Object.freeze({
          permanentDoubleIp:
            command.entitlements.permanentDoubleIp === true,
        })
        const changed =
          candidate.entitlements.permanentDoubleIp !==
          entitlements.permanentDoubleIp
        if (changed) Object.assign(candidate, { entitlements })
        return { accepted: true, changed }
      }
      if (command.kind === 'internal.advance-stored-time') {
        return advanceStoredTime(
          candidate,
          command.seconds,
          eventContexts.storedTime,
          minimumCycleSeconds,
          command.cancelRequested,
        )
      }
      return applyPlayerCommand(candidate, command, eventContext)
    },
    advance: (candidate, milliseconds) =>
      advanceActive(
        candidate,
        milliseconds,
        eventContexts.active,
        minimumCycleSeconds,
      ),
  }
}

function applyDevelopmentDysonBots(
  candidate: CanonicalRuntimeState,
  bots: number,
): DomainTransition {
  if (!Number.isFinite(bots) || bots < 0) {
    return {
      accepted: false,
      code: 'CANONICAL-DEVELOPMENT-BOTS-INVALID',
      reason:
        'Development bot count must be finite and non-negative.',
    }
  }
  const synchronized = withCanonicalBotAllocation({
    ...candidate.gameState,
    dyson: {
      ...candidate.gameState.dyson,
      bots,
    },
  })
  const changed =
    synchronized.dyson.bots !==
      candidate.gameState.dyson.bots ||
    synchronized.dyson.workers !==
      candidate.gameState.dyson.workers ||
    synchronized.dyson.researchers !==
      candidate.gameState.dyson.researchers
  if (changed) {
    Object.assign(candidate, { gameState: synchronized })
  }
  return { accepted: true, changed }
}

function applyDevelopmentRealityUnlock(
  candidate: CanonicalRuntimeState,
): DomainTransition {
  const requiredSecrets = QUANTUM_CONSTANTS.maximumSecrets
  const currentInfinity = candidate.gameState.infinity
  const nextSpentPoints =
    currentInfinity.spentPoints > requiredSecrets
      ? currentInfinity.spentPoints
      : requiredSecrets
  const nextPoints =
    currentInfinity.points > nextSpentPoints
      ? currentInfinity.points
      : nextSpentPoints
  const changed =
    currentInfinity.points !== nextPoints ||
    currentInfinity.spentPoints !== nextSpentPoints ||
    currentInfinity.secretsOfTheUniverse !== requiredSecrets
  if (changed) {
    Object.assign(candidate, {
      gameState: {
        ...candidate.gameState,
        infinity: {
          ...currentInfinity,
          points: nextPoints,
          spentPoints: nextSpentPoints,
          secretsOfTheUniverse: requiredSecrets,
        },
      },
    })
  }
  return { accepted: true, changed }
}

function applyDevelopmentAction(
  candidate: CanonicalRuntimeState,
  action: CanonicalDevelopmentAction,
  context: Readonly<CanonicalEventTimeContext>,
): DomainTransition {
  const state = candidate.gameState
  switch (action.kind) {
    case 'add-cash': {
      if (!Number.isFinite(action.amount) || action.amount < 0) {
        return invalidDevelopmentAction('Cash amount')
      }
      return replaceDevelopmentState(candidate, {
        ...state,
        dyson: {
          ...state.dyson,
          money: Math.min(
            Number.MAX_VALUE,
            state.dyson.money + action.amount,
          ),
        },
      })
    }
    case 'add-bots': {
      if (!Number.isFinite(action.amount) || action.amount < 0) {
        return invalidDevelopmentAction('Bot amount')
      }
      const bots = Math.min(Number.MAX_VALUE, state.dyson.bots + action.amount)
      return applyDevelopmentDysonBots(candidate, bots)
    }
    case 'add-skill-points':
      if (!isDevelopmentDiscreteAmount(action.amount)) {
        return invalidDevelopmentAction('Skill point amount')
      }
      const awardedSkillState = {
        ...state,
        skills: {
          ...state.skills,
          points: addDevelopmentDiscrete(
            state.skills.points,
            action.amount,
          ),
        },
      }
      const assignment = runCanonicalSkillAutoAssignment(
        awardedSkillState,
      )
      if (!assignment.accepted) {
        return {
          accepted: false,
          code: `CANONICAL-DEVELOPMENT-${assignment.code}`,
          reason: assignment.reason,
        }
      }
      return replaceDevelopmentState(
        candidate,
        assignment.state,
      )
    case 'add-infinity-points':
      if (!isDevelopmentDiscreteAmount(action.amount)) {
        return invalidDevelopmentAction('Infinity point amount')
      }
      return replaceDevelopmentState(candidate, {
        ...state,
        infinity: {
          ...state.infinity,
          points: addDevelopmentDiscrete(
            state.infinity.points,
            action.amount,
          ),
        },
      })
    case 'add-quantum-shards':
      if (!isDevelopmentDiscreteAmount(action.amount)) {
        return invalidDevelopmentAction('Quantum shard amount')
      }
      return replaceDevelopmentState(candidate, {
        ...state,
        quantum: {
          ...state.quantum,
          pointsEarned: addDevelopmentDiscrete(
            state.quantum.pointsEarned,
            action.amount,
          ),
        },
      })
    case 'add-influence':
      if (!isDevelopmentDiscreteAmount(action.amount)) {
        return invalidDevelopmentAction('Influence amount')
      }
      return replaceDevelopmentState(candidate, {
        ...state,
        reality: {
          ...state.reality,
          influence: addDevelopmentDiscrete(
            state.reality.influence,
            action.amount,
          ),
        },
      })
    case 'add-strange-matter':
      if (!isDevelopmentDiscreteAmount(action.amount)) {
        return invalidDevelopmentAction('Strange Matter amount')
      }
      return replaceDevelopmentState(candidate, {
        ...state,
        dream: {
          ...state.dream,
          strangeMatter: addDevelopmentDiscrete(
            state.dream.strangeMatter,
            action.amount,
          ),
        },
      })
    case 'add-offline-time': {
      if (!Number.isFinite(action.seconds) || action.seconds < 0) {
        return invalidDevelopmentAction('Offline-time amount')
      }
      const grant = applyAwayTimeGrant({
        awaySeconds: action.seconds,
        bankSeconds: state.timeline.storedTimeAvailableSeconds,
        capacitySeconds: state.timeline.storedTimeCapacitySeconds,
        cheater: candidate.storedTimeCheater,
        dreamDoubleTimeBankSeconds:
          state.timeline.doubleTime.bankSeconds,
      })
      const next = {
        ...state,
        timeline: {
          ...state.timeline,
          storedTimeAvailableSeconds: grant.bankSeconds,
          storedTimeCapacitySeconds: grant.capacitySeconds,
          doubleTime: {
            ...state.timeline.doubleTime,
            bankSeconds: grant.dreamDoubleTimeBankSeconds,
          },
        },
      }
      const changed =
        grant.cheater !== candidate.storedTimeCheater ||
        grant.bankRepaired ||
        grant.capacityRepaired ||
        grant.storedTimeCreditedSeconds > 0 ||
        grant.dreamDoubleTimeBankSeconds !==
          state.timeline.doubleTime.bankSeconds
      if (changed) {
        Object.assign(candidate, {
          gameState: next,
          storedTimeCheater: grant.cheater,
        })
      }
      return { accepted: true, changed }
    }
    case 'set-tinker-interval':
      return replaceDevelopmentState(candidate, {
        ...state,
        dyson: {
          ...state.dyson,
          manualCreationIntervalSeconds: action.seconds,
        },
      })
    case 'recalculate-skill-points': {
      const artifact = deriveCanonicalArtifactSkillPoints(
        state,
        context.realityUpgradeDefinitions,
      )
      if (!artifact.ok) {
        return {
          accepted: false,
          code:
            artifact.issue?.code ??
            'CANONICAL-EVENT-REALITY-DEFINITION-MISSING',
          reason:
            artifact.issue?.detail ??
            'Reality artifact definitions are incomplete.',
        }
      }
      const earned = addDiscrete(
        addDiscrete(
          state.infinity.permanentSkillPoints,
          artifact.value,
        ),
        state.dyson.goalStage,
      )
      let spent = 0n
      for (const [id, skill] of Object.entries(state.skills.byId)) {
        if (!skill.owned) continue
        const definition = context.infinityResetAssetLookup(
          'GameData.SkillDefinition',
          id,
        )
        const cost = definition?.data.cost
        if (
          typeof cost !== 'number' ||
          !Number.isSafeInteger(cost) ||
          cost < 0
        ) {
          return {
            accepted: false,
            code: 'CANONICAL-DEVELOPMENT-SKILL-DEFINITION-GAP',
            reason: `Skill '${id}' does not expose a valid cost.`,
          }
        }
        spent = addDiscrete(spent, BigInt(cost))
      }
      const points = earned > spent ? earned - spent : 0n
      return replaceDevelopmentState(candidate, {
        ...state,
        skills: { ...state.skills, points },
      })
    }
    case 'reset-secret-progress':
      return replaceDevelopmentState(candidate, {
        ...state,
        secretProgress: {
          completed: false,
          step: 0,
        },
      })
    case 'purchase-debug-options': {
      if (candidate.debugEntitlementPurchased) {
        return replaceDevelopmentRuntime(candidate, {
          debugOptionsEnabled: true,
        })
      }
      const quantumCost = 100_000n
      const strangeMatterCost = 500_000n
      const availableQuantum =
        state.quantum.pointsEarned > state.quantum.pointsSpent
          ? state.quantum.pointsEarned - state.quantum.pointsSpent
          : 0n
      if (
        availableQuantum < quantumCost ||
        state.dream.strangeMatter < strangeMatterCost
      ) {
        return {
          accepted: false,
          code: 'CANONICAL-DEVELOPMENT-PURCHASE-UNAFFORDABLE',
          reason:
            'Developer Options require 100K Quantum Shards and 500K Strange Matter.',
        }
      }
      Object.assign(candidate, {
        gameState: {
          ...state,
          quantum: {
            ...state.quantum,
            pointsEarned: state.quantum.pointsEarned - quantumCost,
          },
          dream: {
            ...state.dream,
            strangeMatter:
              state.dream.strangeMatter - strangeMatterCost,
          },
        },
        debugOptionsEnabled: true,
        debugEntitlementPurchased: true,
      })
      return { accepted: true, changed: true }
    }
    case 'enable-host-debug-options':
      return replaceDevelopmentRuntime(candidate, {
        debugOptionsEnabled: true,
      })
    case 'disable-debug-options':
      return replaceDevelopmentRuntime(candidate, {
        debugOptionsEnabled: false,
      })
  }
}

function addDevelopmentDiscrete(current: bigint, amount: bigint): bigint {
  return addDiscrete(current, amount)
}

function isDevelopmentDiscreteAmount(amount: bigint): boolean {
  return amount >= 0n && amount <= DISCRETE_MAXIMUM
}

function replaceDevelopmentRuntime(
  candidate: CanonicalRuntimeState,
  replacement: Partial<
    Pick<
      CanonicalRuntimeState,
      'debugOptionsEnabled' | 'debugEntitlementPurchased'
    >
  >,
): DomainTransition {
  const changed = Object.entries(replacement).some(
    ([key, value]) =>
      candidate[key as keyof CanonicalRuntimeState] !== value,
  )
  if (changed) Object.assign(candidate, replacement)
  return { accepted: true, changed }
}

function replaceDevelopmentState(
  candidate: CanonicalRuntimeState,
  next: CanonicalRuntimeState['gameState'],
): DomainTransition {
  const changed = !Object.is(next, candidate.gameState)
  if (changed) Object.assign(candidate, { gameState: next })
  return { accepted: true, changed }
}

function invalidDevelopmentAction(label: string): DomainTransition {
  return {
    accepted: false,
    code: 'CANONICAL-DEVELOPMENT-ACTION-INVALID',
    reason: `${label} must be finite and non-negative.`,
  }
}

function applyPlayerCommand(
  candidate: CanonicalRuntimeState,
  command: CanonicalGameCommand,
  context: Readonly<CanonicalEventTimeContext>,
): DomainTransition {
  const result = routeCanonicalGameCommand(
    candidate.gameState,
    command,
    {
      ...commandOptions(candidate, context),
      quantumLeap: {
        requestLeap: (state) => {
          const model = CanonicalEventTimeModel.fromOwnedState(
            { ...eventCarrier(candidate), gameState: state },
            context,
          )
          model.applyQueuedInput(
            {
              kind: CANONICAL_QUANTUM_LEAP_INPUT,
              timeSeconds: 0,
            },
            createSimulationSummary(),
          )
          const outcome = model.lastQueuedInputOutcome
          if (outcome?.accepted) {
            return {
              accepted: true,
              changed: outcome.changed,
              code: outcome.code,
              state: model.takeState().gameState,
            }
          }
          return {
            accepted: false,
            code:
              outcome?.code ??
              model.validateIncremental() ??
              'quantum-rejected',
          }
        },
      },
    },
  )
  if (!result.accepted) {
    return {
      accepted: false,
      code: result.code,
      reason: result.issues[0]?.detail ?? result.code,
    }
  }
  if (result.intents.length > 0) {
    return {
      accepted: false,
      code: 'CANONICAL-STORED-TIME-INTENT-REQUIRES-FACADE',
      reason: 'Stored-time intent must be dispatched through dispatchPlayer.',
    }
  }
  if (!result.changed) return { accepted: true, changed: false }
  Object.assign(candidate, {
    gameState: result.state,
    compatibilityTuning:
      result.runtimeCarriers.compatibilityTuning!,
    evaluationSnapshot:
      result.runtimeCarriers.skillEffectEvaluationSnapshot!,
    storedTimeCheater:
      result.runtimeCarriers.storedTimeCheater!,
    selectedSkillPresetSlot:
      result.runtimeCarriers.selectedSkillPresetSlot!,
  })
  return { accepted: true, changed: true }
}

function commandOptions(
  state: Readonly<CanonicalRuntimeState>,
  context: Readonly<CanonicalEventTimeContext>,
): CanonicalGameCommandOptions {
  const carriers: CanonicalGameRuntimeCarriers = {
    compatibilityTuning: state.compatibilityTuning,
    skillEffectEvaluationSnapshot: state.evaluationSnapshot,
    storedTimeCheater: state.storedTimeCheater,
    selectedSkillPresetSlot: state.selectedSkillPresetSlot,
  }
  return {
    runtimeCarriers: carriers,
    runtimeEvaluation: {
      evaluate: (candidate, previous) => {
        const derived = deriveBasicDysonState(
          candidate,
          state.compatibilityTuning,
          state.entitlements,
          previous ?? state.evaluationSnapshot,
          context.dysonPresentationTuning,
        )
        return derived.ok
          ? {
              accepted: true,
              snapshot: derived.value.nextEvaluationSnapshot,
            }
          : {
              accepted: false,
              code: derived.issues[0]?.code ?? 'DYSON-DERIVATION-REJECTED',
              issues: derived.issues,
            }
      },
    },
  }
}

function advanceActive(
  candidate: CanonicalRuntimeState,
  milliseconds: number,
  context: Readonly<CanonicalEventTimeContext>,
  minimumCycleSeconds: number,
): DomainTransition {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return reject('CANONICAL-ACTIVE-TIME-INVALID', 'Active time must be finite and non-negative.')
  }
  if (milliseconds === 0) return { accepted: true, changed: false }
  const result = runEventAdvance(
    candidate,
    milliseconds / 1000,
    context,
    minimumCycleSeconds,
  )
  const botCapRequired =
    result.diagnosticCode ===
    'CANONICAL_EVENT_BOT_CAP_PERSISTENCE_REQUIRED'
  if (!result.completed && !botCapRequired) {
    return reject(
      result.diagnosticCode ?? 'CANONICAL-ACTIVE-ADVANCE-INCOMPLETE',
      `Active advance ended as ${result.validationStatus}.`,
    )
  }
  replaceEventCarrier(candidate, result.candidateState.takeState())
  return { accepted: true, changed: true }
}

function advanceStoredTime(
  candidate: CanonicalRuntimeState,
  requestedSeconds: number,
  context: Readonly<CanonicalEventTimeContext>,
  minimumCycleSeconds: number,
  cancelRequested?: () => boolean,
): DomainTransition {
  const bank = candidate.gameState.timeline.storedTimeAvailableSeconds
  if (
    !Number.isFinite(requestedSeconds) ||
    requestedSeconds <= 0 ||
    requestedSeconds > bank
  ) {
    return reject(
      'CANONICAL-STORED-TIME-INVALID',
      'Stored-time spend must be positive, finite, and no greater than the bank.',
    )
  }
  const preservedTinker = structuredClone(candidate.tinker)
  const currentUsageBefore =
    candidate.gameState.infinity.storedTimeUsedThisCycleSeconds
  const previousUsageBefore =
    candidate.gameState.infinity.storedTimeUsedPreviousCycleSeconds
  const result = runEventAdvance(
    candidate,
    requestedSeconds,
    context,
    minimumCycleSeconds,
    cancelRequested,
    'force-buy-max',
  )
  const botCapRequired =
    result.diagnosticCode ===
    'CANONICAL_EVENT_BOT_CAP_PERSISTENCE_REQUIRED'
  if (result.validationStatus === 'cancelled') {
    return reject(
      'CANONICAL-STORED-TIME-CANCELLED',
      'Cancelled stored-time candidates are discarded without charging the bank.',
    )
  }
  if (!result.completed && !botCapRequired) {
    return reject(
      result.diagnosticCode ?? 'CANONICAL-STORED-TIME-ADVANCE-INCOMPLETE',
      `Stored-time advance ended as ${result.validationStatus}.`,
    )
  }
  if (result.consumedSeconds <= 0) {
    return reject(
      result.diagnosticCode ?? 'CANONICAL-STORED-TIME-NO-PROGRESS',
      'Stored-time continuation made no durable progress.',
    )
  }

  replaceEventCarrier(candidate, {
    ...result.candidateState.takeState(),
    // Unity's Tinker coroutine advances on wall Time.deltaTime only.
    tinker: preservedTinker,
  })
  const completedCycles =
    result.summary.ordinaryInfinityCount +
    result.summary.breakInfinityCount
  const usage = completeStoredTimeInfinityAggregate(
    currentUsageBefore,
    previousUsageBefore,
    result.consumedSeconds,
    completedCycles,
    candidate.gameState.infinity.lastCycleDurationSeconds,
  )
  Object.assign(candidate, { gameState: {
    ...candidate.gameState,
    infinity: {
      ...candidate.gameState.infinity,
      storedTimeUsedThisCycleSeconds:
        usage.currentCycleSeconds,
      storedTimeUsedPreviousCycleSeconds:
        usage.previousCycleSeconds,
    },
    timeline: {
      ...candidate.gameState.timeline,
      storedTimeAvailableSeconds: Math.max(
        0,
        bank - result.consumedSeconds,
      ),
    },
  } })
  return { accepted: true, changed: true }
}

function applyBotCapCheckpoint(
  candidate: CanonicalRuntimeState,
  checkpoint: BotCapCheckpointName,
  context: Readonly<CanonicalEventTimeContext>,
): DomainTransition {
  const result = evaluateCanonicalBotCapCheckpoint(candidate.gameState)
  if (
    result.action.kind !== 'persist' ||
    result.action.checkpoint !== checkpoint
  ) {
    return reject(
      'CANONICAL-BOT-CAP-CHECKPOINT-MISMATCH',
      `Bot-cap checkpoint '${checkpoint}' is not currently required.`,
    )
  }
  Object.assign(candidate, { gameState: result.candidateState })
  const derived = deriveBasicDysonState(
    candidate.gameState,
    candidate.compatibilityTuning,
    candidate.entitlements,
    candidate.evaluationSnapshot,
    context.dysonPresentationTuning,
  )
  if (!derived.ok) {
    return reject(
      derived.issues[0]?.code ?? 'CANONICAL-BOT-CAP-DERIVATION-REJECTED',
      derived.issues[0]?.detail ?? 'Bot-cap checkpoint derivation rejected.',
    )
  }
  Object.assign(candidate, {
    evaluationSnapshot: derived.value.nextEvaluationSnapshot,
  })
  return { accepted: true, changed: true }
}

function applyTinker(
  candidate: CanonicalRuntimeState,
  context: Readonly<CanonicalEventTimeContext>,
  apply: (model: CanonicalEventTimeModel) => boolean,
): DomainTransition {
  const model = CanonicalEventTimeModel.fromOwnedState(
    eventCarrier(candidate),
    context,
  )
  const changed = apply(model)
  const issue = model.validateIncremental()
  if (issue) return reject(issue, model.issue?.detail ?? issue)
  if (changed) replaceEventCarrier(candidate, model.takeState())
  return { accepted: true, changed }
}

function runEventAdvance(
  candidate: Readonly<CanonicalRuntimeState>,
  seconds: number,
  context: Readonly<CanonicalEventTimeContext>,
  minimumCycleSeconds: number,
  cancelRequested?: () => boolean,
  automationPolicy: SimulationAutomationPolicy =
    'preserve-configured-mode',
) {
  return advanceEventTime({
    startingState: transferEventTimeModelOwnership(
      CanonicalEventTimeModel.fromOwnedState(
        eventCarrier(candidate),
        context,
      ),
    ),
    cloneStartingState: false,
    durationSeconds: seconds,
    automationIntervalSeconds: context.automationIntervalSeconds,
    automationTimeUntilNextEvent:
      candidate.gameState.timeline.automationTimeUntilNextEvent,
    automationPolicy,
    infinityMinimumCycleSeconds: minimumCycleSeconds,
    processingBudgetMilliseconds: 0,
    cancelRequested,
  })
}

function eventCarrier(state: Readonly<CanonicalRuntimeState>) {
  return {
    gameState: state.gameState,
    compatibilityTuning: state.compatibilityTuning,
    evaluationSnapshot: state.evaluationSnapshot,
    entitlements: state.entitlements,
    tinker: normalizeCanonicalTinkerRuntimeState(state.tinker),
  }
}

function replaceEventCarrier(
  target: CanonicalRuntimeState,
  carrier: Readonly<CanonicalEventTimeState>,
): void {
  Object.assign(target, {
    gameState: carrier.gameState,
    compatibilityTuning: carrier.compatibilityTuning,
    evaluationSnapshot: carrier.evaluationSnapshot,
    entitlements: carrier.entitlements,
    tinker: carrier.tinker,
  })
}

function replaceRuntimeState(
  target: CanonicalRuntimeState,
  source: Readonly<CanonicalRuntimeState>,
): void {
  Object.assign(target, cloneCanonicalRuntimeState(source))
}

function createStoredTimeJobId(): string {
  const randomUuid = globalThis.crypto?.randomUUID
  return randomUuid === undefined
    ? `stored-time-${Date.now()}-${Math.random().toString(36).slice(2)}`
    : randomUuid.call(globalThis.crypto)
}

function rejectedStoredTimeCommit(
  snapshot: ApplicationSnapshot<CanonicalRuntimeState>,
  requestedSeconds: number,
  code: string,
  reason: string,
): CanonicalStoredTimeCommitResult {
  return {
    committed: false,
    transition: {
      accepted: false,
      code,
      reason,
      revision:
        snapshot.phase === 'ready' ? snapshot.revision.state : 0,
    },
    consumedSeconds: 0,
    remainingSeconds: Number.isFinite(requestedSeconds)
      ? Math.max(0, requestedSeconds)
      : 0,
    code,
    reason,
  }
}

function validateStoredTimeJobCandidate(
  before: Readonly<CanonicalRuntimeState>,
  candidate: Readonly<CanonicalRuntimeState>,
  requestedSeconds: number,
  consumedSeconds: number,
  remainingSeconds: number,
): string | undefined {
  if (
    !Number.isFinite(consumedSeconds) ||
    consumedSeconds <= 0 ||
    consumedSeconds > requestedSeconds
  ) {
    return 'The worker reported an invalid consumed duration.'
  }
  if (
    !Number.isFinite(remainingSeconds) ||
    Math.abs(requestedSeconds - consumedSeconds - remainingSeconds) > 1e-8
  ) {
    return 'The worker reported inconsistent remaining duration.'
  }
  const expectedBank = Math.max(
    0,
    before.gameState.timeline.storedTimeAvailableSeconds - consumedSeconds,
  )
  if (
    Math.abs(
      candidate.gameState.timeline.storedTimeAvailableSeconds - expectedBank,
    ) > 1e-8
  ) {
    return 'The worker candidate does not charge exactly its consumed duration.'
  }
  if (
    candidate.storedTimeCheater !== before.storedTimeCheater ||
    candidate.selectedSkillPresetSlot !== before.selectedSkillPresetSlot ||
    candidate.debugOptionsEnabled !== before.debugOptionsEnabled ||
    candidate.debugEntitlementPurchased !== before.debugEntitlementPurchased
  ) {
    return 'The worker candidate changed a host-owned runtime carrier.'
  }
  if (
    !sameCapturedValue(candidate.tinker, before.tinker) ||
    !sameCapturedValue(candidate.entitlements, before.entitlements) ||
    !sameCapturedValue(
      candidate.compatibilityTuning,
      before.compatibilityTuning,
    )
  ) {
    return 'The worker candidate changed a session-owned simulation carrier.'
  }
  if (
    candidate.gameState.modelVersion !== before.gameState.modelVersion ||
    candidate.gameState.meta.createdAtLegacyText !==
      before.gameState.meta.createdAtLegacyText ||
    !sameCapturedValue(
      candidate.gameState.meta.navigationVisibility,
      before.gameState.meta.navigationVisibility,
    ) ||
    candidate.gameState.timeline.storedTimeCapacitySeconds !==
      before.gameState.timeline.storedTimeCapacitySeconds ||
    candidate.gameState.timeline.lastSuspendedAtLegacyText !==
      before.gameState.timeline.lastSuspendedAtLegacyText
  ) {
    return 'The worker candidate changed persistent identity or Stored Time capacity.'
  }
  return undefined
}

function sameCapturedValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (
    left === null ||
    right === null ||
    typeof left !== 'object' ||
    typeof right !== 'object'
  ) {
    return false
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) =>
        sameCapturedValue(value, right[index]))
  }
  const leftRecord = left as Record<string, unknown>
  const rightRecord = right as Record<string, unknown>
  const leftKeys = Object.keys(leftRecord).sort()
  const rightKeys = Object.keys(rightRecord).sort()
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) =>
      key === rightKeys[index] &&
      sameCapturedValue(leftRecord[key], rightRecord[key]))
}

function validateRuntimeState(
  state: CanonicalRuntimeState,
  context: Readonly<CanonicalEventTimeContext>,
): string | undefined {
  if (typeof state.storedTimeCheater !== 'boolean') {
    return 'CANONICAL-STORED-TIME-CHEATER-INVALID'
  }
  if (
    !Number.isInteger(state.selectedSkillPresetSlot) ||
    state.selectedSkillPresetSlot < 1 ||
    state.selectedSkillPresetSlot > 5
  ) {
    return 'CANONICAL-SKILL-PRESET-SLOT-INVALID'
  }
  return CanonicalEventTimeModel.fromOwnedState(
    eventCarrier(state),
    context,
  ).validate()
}

function sameFrontendApplicationEnvelope(
  frontend: DeepReadonly<FrontendApplicationSnapshot>,
  application: ApplicationSnapshot<CanonicalRuntimeState>,
): boolean {
  if (frontend.phase !== application.phase) return false
  if (frontend.phase === 'idle' || frontend.phase === 'starting') {
    return true
  }
  if (frontend.phase === 'blocked') {
    return (
      application.phase === 'blocked' &&
      frontend.outcome === application.outcome &&
      frontend.error === application.error
    )
  }
  if (frontend.phase !== 'ready' || application.phase !== 'ready') {
    return false
  }
  return (
    frontend.source === application.source &&
    frontend.revision.session === application.revision.session &&
    frontend.revision.state === application.revision.state &&
    frontend.revision.durable === application.revision.durable &&
    sameApplicationCheckpoint(
      frontend.checkpoint,
      application.checkpoint,
    ) &&
    frontend.operation === application.operation
  )
}

function sameApplicationCheckpoint(
  left: Readonly<
    Extract<FrontendApplicationSnapshot, { phase: 'ready' }>['checkpoint']
  >,
  right: Readonly<
    Extract<
      ApplicationSnapshot<CanonicalRuntimeState>,
      { phase: 'ready' }
    >['checkpoint']
  >,
): boolean {
  if (
    left.kind !== right.kind ||
    left.durableRevision !== right.durableRevision
  ) {
    return false
  }
  if (left.kind === 'clean' || right.kind === 'clean') {
    return left.kind === 'clean' && right.kind === 'clean'
  }
  if (left.kind === 'checkpointing' || right.kind === 'checkpointing') {
    return (
      left.kind === 'checkpointing' &&
      right.kind === 'checkpointing' &&
      left.targetStateRevision === right.targetStateRevision
    )
  }
  return (
    left.kind === 'dirty' &&
    right.kind === 'dirty' &&
    left.reason === right.reason &&
    left.error === right.error
  )
}

function validateRuntimeTransitionState(
  state: CanonicalRuntimeState,
  context: Readonly<CanonicalEventTimeContext>,
): string | undefined {
  if (typeof state.storedTimeCheater !== 'boolean') {
    return 'CANONICAL-STORED-TIME-CHEATER-INVALID'
  }
  if (
    !Number.isInteger(state.selectedSkillPresetSlot) ||
    state.selectedSkillPresetSlot < 1 ||
    state.selectedSkillPresetSlot > 5
  ) {
    return 'CANONICAL-SKILL-PRESET-SLOT-INVALID'
  }
  const model = CanonicalEventTimeModel.fromOwnedState(
    eventCarrier(state),
    context,
  )
  const incrementalIssue = model.validateIncremental()
  if (incrementalIssue !== undefined) return incrementalIssue
  return import.meta.env?.DEV === false ? undefined : model.validate()
}

function requiredBotCapCheckpoint(
  state: CanonicalRuntimeState['gameState'],
): BotCapCheckpointName | undefined {
  const evaluated = evaluateCanonicalBotCapCheckpoint(state)
  return evaluated.action.kind === 'persist'
    ? evaluated.action.checkpoint
    : undefined
}

export function previewCanonicalQuantumLeap(
  runtime: Readonly<CanonicalRuntimeState>,
  context: Readonly<CanonicalEventTimeContext>,
): FrontendQuantumLeapPreview {
  if (runtime.gameState.infinity.points < 42n) {
    return {
      eligible: false,
      code: 'QUANTUM_LEAP_REQUIRES_42_TOTAL_INFINITY_POINTS',
      branch: null,
      artifactSkillPoints: null,
      definitionGap: null,
    }
  }

  const branch = runtime.gameState.quantum.unlocks.quantumEntanglement
    ? 'entanglement'
    : 'reset'
  let artifactSkillPoints: bigint | null = null
  if (branch === 'reset') {
    const artifact = deriveCanonicalArtifactSkillPoints(
      runtime.gameState,
      context.realityUpgradeDefinitions,
    )
    if (!artifact.ok) {
      return {
        eligible: false,
        code:
          artifact.issue?.code ??
          'CANONICAL_EVENT_REALITY_DEFINITION_MISSING',
        branch,
        artifactSkillPoints: null,
        definitionGap:
          artifact.issue?.detail ??
          'Reality artifact definitions are incomplete.',
      }
    }
    artifactSkillPoints = artifact.value
  }

  const model = CanonicalEventTimeModel.fromOwnedState(
    eventCarrier(runtime),
    context,
  )
  model.applyQueuedInput(
    {
      kind: CANONICAL_QUANTUM_LEAP_INPUT,
      timeSeconds: 0,
    },
    createSimulationSummary(),
  )
  const outcome = model.lastQueuedInputOutcome
  const issue = model.issue
  return {
    eligible: outcome?.accepted === true,
    code:
      outcome?.code ??
      issue?.code ??
      'CANONICAL_EVENT_QUANTUM_RESET_REJECTED',
    branch,
    artifactSkillPoints,
    definitionGap:
      issue?.path.startsWith('gameData.') === true
        ? issue.detail
        : null,
  }
}

function reject(code: string, reason: string): DomainTransition {
  return { accepted: false, code, reason }
}
