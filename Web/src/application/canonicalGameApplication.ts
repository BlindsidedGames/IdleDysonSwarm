import type {
  DeepReadonly,
  DomainTransition,
  SimulationEngineDefinition,
  SimulationTransitionResult,
} from '../core/contracts'
import {
  deriveBasicDysonState,
} from '../simulation/canonicalDysonDerivation'
import {
  evaluateCanonicalBotCapCheckpoint,
  type BotCapCheckpointName,
} from '../simulation/canonicalBotCapCheckpoint'
import {
  CANONICAL_QUANTUM_LEAP_INPUT,
  CanonicalEventTimeModel,
  deriveCanonicalArtifactSkillPoints,
  type CanonicalEventTimeContext,
  type CanonicalEventTimeState,
} from '../simulation/canonicalEventTimeModel'
import { advanceEventTime } from '../simulation/eventTime'
import {
  completeStoredTimeInfinityAggregate,
} from '../simulation/storedTimeAccounting'
import {
  createSimulationSummary,
  type SimulationAutomationPolicy,
} from '../simulation/types'
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
  type FrontendQuantumLeapPreview,
} from './frontendSnapshot'
import type { CanonicalPlayerCommand } from './canonicalPlayerCommands'
import {
  cloneCanonicalRuntimeState,
  type CanonicalRuntimeState,
} from './canonicalRuntimeSession'

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
      readonly kind: 'internal.bot-cap-checkpoint'
      readonly checkpoint: BotCapCheckpointName
    }

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
}

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

  constructor(options: Readonly<CanonicalGameApplicationOptions>) {
    this.eventContext = options.engine.eventContext
    this.application = new TransactionalGameApplication({
      startupResolver: options.startupResolver,
      repository: options.repository,
      sessionFactory: options.sessionFactory,
      engineDefinition: createCanonicalGameEngineDefinition(options.engine),
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
    const state = cloneCanonicalRuntimeState(
      snapshot.state as CanonicalRuntimeState,
    )
    return previewCanonicalQuantumLeap(
      state,
      this.eventContext,
    )
  }

  frontendSnapshot(): DeepReadonly<FrontendApplicationSnapshot> {
    return selectFrontendApplicationSnapshot(this.snapshot(), {
      runtimeRequirements: {
        'compatibility-tuning': true,
        'quantum-leap-port': true,
        'runtime-evaluation-port': true,
        'selected-skill-preset-carrier': true,
        'stored-time-commit-first-runner': true,
        'stored-time-cheater-carrier': true,
      },
      quantumLeap: this.previewQuantumLeap(),
      realityWorkerTuning: this.eventContext.realityWorkerTuning,
    })
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
      commandOptions(ready.state as CanonicalRuntimeState),
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
  const eventContext = options.eventContext
  return {
    schema: CANONICAL_GAME_APPLICATION_SCHEMA,
    cloneState: cloneCanonicalRuntimeState,
    validateState: (state) =>
      validateRuntimeState(state, eventContext),
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
      if (command.kind === 'internal.bot-cap-checkpoint') {
        return applyBotCapCheckpoint(candidate, command.checkpoint)
      }
      if (command.kind === 'internal.advance-stored-time') {
        return advanceStoredTime(
          candidate,
          command.seconds,
          eventContext,
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
        eventContext,
        minimumCycleSeconds,
      ),
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
      ...commandOptions(candidate),
      quantumLeap: {
        requestLeap: (state) => {
          const model = new CanonicalEventTimeModel(
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
          return outcome?.accepted
            ? {
                accepted: true,
                changed: outcome.changed,
                code: outcome.code,
                state: model.state.gameState,
              }
            : {
                accepted: false,
                code: outcome?.code ?? model.validate() ?? 'quantum-rejected',
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
  replaceEventCarrier(candidate, result.candidateState.state)
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
    false,
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
    ...result.candidateState.state,
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
  const model = new CanonicalEventTimeModel(eventCarrier(candidate), context)
  const changed = apply(model)
  const issue = model.validate()
  if (issue) return reject(issue, model.issue?.detail ?? issue)
  if (changed) replaceEventCarrier(candidate, model.state)
  return { accepted: true, changed }
}

function runEventAdvance(
  candidate: Readonly<CanonicalRuntimeState>,
  seconds: number,
  context: Readonly<CanonicalEventTimeContext>,
  minimumCycleSeconds: number,
  cancelRequested?: () => boolean,
  advanceTinker = true,
  automationPolicy: SimulationAutomationPolicy =
    'preserve-configured-mode',
) {
  return advanceEventTime({
    startingState: new CanonicalEventTimeModel(
      eventCarrier(candidate),
      { ...context, advanceTinker },
    ),
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
    tinker: state.tinker,
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
  return new CanonicalEventTimeModel(eventCarrier(state), context).validate()
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

  const model = new CanonicalEventTimeModel(
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
