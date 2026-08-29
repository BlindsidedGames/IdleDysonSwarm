import type { DeepReadonly } from '../../core/contracts'
import { formatUnknownError as errorMessage } from '../../core/unknownError'
import type {
  CanonicalCoordinatedPlayerResult,
} from '../../application/canonicalLifecycleCoordinator'
import type { CanonicalPlayerCommand } from '../../application/canonicalPlayerCommands'
import {
  createFrontendCommandEnvelope,
  type FrontendApplicationSnapshot,
} from '../../application/frontendSnapshot'
import type {
  UiRuntimeCommandActivationRevision,
  UiRuntimePlayerCommandResult,
} from './contracts'

type LatestIdempotentCommand =
  | Extract<
      CanonicalPlayerCommand,
      { readonly kind: 'tinker.start' | 'tinker.set-repeat' }
    >
  | Extract<
      CanonicalPlayerCommand,
      {
        readonly kind:
          | 'dyson.set-bot-distribution'
          | 'dyson.set-buy-mode'
          | 'dyson.set-rounded-bulk-buy'
          | 'dyson.set-facility-automation'
      }
    >
  | Extract<
      CanonicalPlayerCommand,
      {
        readonly kind:
          | 'research.set-buy-mode'
          | 'research.set-rounded-bulk-buy'
          | 'research.set-automation'
      }
    >

export interface RevisionedPlayerCommandDispatcherOptions {
  readonly latestSnapshot: () =>
    DeepReadonly<FrontendApplicationSnapshot>
  readonly dispatch: (
    envelope: ReturnType<typeof createFrontendCommandEnvelope>,
    cancelRequested: () => boolean,
  ) => Promise<CanonicalCoordinatedPlayerResult>
  readonly serialize: <T>(
    operation: () => Promise<T>,
  ) => Promise<T>
  readonly publishSnapshot: () => void
  readonly isCurrent: () => boolean
  readonly cancelRequested: () => boolean
}

interface PreparedPlayerCommand {
  readonly envelope: ReturnType<
    typeof createFrontendCommandEnvelope
  >
  readonly activationRevision:
    UiRuntimeCommandActivationRevision
}

/**
 * Detaches ordinary player intent and its session at activation time, then
 * captures the latest state revision inside the authority lane. This lets
 * local commands follow admitted ticks and earlier commands without retrying
 * them, while a session replacement still invalidates intent from the old
 * save. Idempotent safety reconciliation keeps the admitted session but
 * captures the latest state revision inside the lane through `dispatchLatest`.
 */
export class RevisionedPlayerCommandDispatcher {
  private readonly options:
    Readonly<RevisionedPlayerCommandDispatcherOptions>
  private storedTimeAdmission: symbol | null = null

  constructor(
    options: Readonly<RevisionedPlayerCommandDispatcherOptions>,
  ) {
    this.options = options
  }

  async dispatch(
    command: Readonly<CanonicalPlayerCommand>,
    prepareForDispatch?: () => Promise<
      UiRuntimePlayerCommandResult | undefined
    >,
  ): Promise<UiRuntimePlayerCommandResult> {
    const captured = this.prepare(command)
    if ('status' in captured) return captured
    const storedTimeAdmission =
      command.kind === 'time.request-stored-time-spend'
        ? Symbol('stored-time-admission')
        : null
    if (storedTimeAdmission !== null) {
      if (this.storedTimeAdmission !== null) {
        return rejectedStoredTimeAdmission(
          captured.activationRevision,
          this.options.latestSnapshot(),
        )
      }
      this.storedTimeAdmission = storedTimeAdmission
    }
    try {
      const outcome = await this.options.serialize(async () => {
        const preparationFailure = prepareForDispatch === undefined
          ? undefined
          : await prepareForDispatch()
        if (preparationFailure !== undefined) {
          return {
            kind: 'failure',
            failure: preparationFailure,
          } as const
        }
        const prepared = this.prepareForExecution(captured)
        if ('status' in prepared) {
          return { kind: 'failure', failure: prepared } as const
        }
        const result = await this.options.dispatch(
          prepared.envelope,
          this.options.cancelRequested,
        )
        return { kind: 'result', result } as const
      })
      if (outcome.kind === 'failure') return outcome.failure
      return this.finish(
        outcome.result,
        captured.activationRevision,
      )
    } catch (error) {
      return this.mapFailure(error)
    } finally {
      if (this.storedTimeAdmission === storedTimeAdmission) {
        this.storedTimeAdmission = null
      }
    }
  }

  /**
   * Captures the latest revision only after previously admitted lifecycle work
   * has settled. This is reserved for idempotent absolute settings and safety
   * reconciliation, such as bot distribution and an ongoing Tinker hold; it
   * is not an ordinary intent retry. The session is still captured at
   * activation so an import/reset can never retarget old intent at its new
   * session.
   */
  async dispatchLatest(
    command: Readonly<LatestIdempotentCommand>,
    prepareForDispatch?: () => Promise<
      UiRuntimePlayerCommandResult | undefined
    >,
  ): Promise<UiRuntimePlayerCommandResult> {
    const admitted = this.prepare(command)
    if ('status' in admitted) return admitted
    try {
      const outcome = await this.options.serialize(async () => {
        const preparationFailure = prepareForDispatch === undefined
          ? undefined
          : await prepareForDispatch()
        if (preparationFailure !== undefined) {
          return {
            kind: 'failure',
            failure: preparationFailure,
          } as const
        }
        const prepared = this.prepare(command)
        if ('status' in prepared) {
          return { kind: 'failure', failure: prepared } as const
        }
        if (
          prepared.activationRevision.session !==
          admitted.activationRevision.session
        ) {
          return {
            kind: 'failure',
            failure: staleSession(
              admitted.activationRevision,
              prepared.activationRevision.state,
            ),
          } as const
        }
        const result = await this.options.dispatch(
          prepared.envelope,
          this.options.cancelRequested,
        )
        return {
          kind: 'result',
          result,
          activationRevision: prepared.activationRevision,
        } as const
      })
      if (outcome.kind === 'failure') return outcome.failure
      return this.finish(
        outcome.result,
        outcome.activationRevision,
      )
    } catch (error) {
      return this.mapFailure(error)
    }
  }

  private prepare(
    command: Readonly<CanonicalPlayerCommand>,
  ): PreparedPlayerCommand | UiRuntimePlayerCommandResult {
    const snapshot = this.options.latestSnapshot()
    if (snapshot.phase !== 'ready') {
      return failed(
        'RUNTIME-PLAYER-NOT-READY',
        'Player commands require a ready frontend snapshot.',
      )
    }
    const activationRevision = Object.freeze({
      session: snapshot.revision.session,
      state: snapshot.revision.state,
    })
    try {
      return {
        envelope: createFrontendCommandEnvelope(
          snapshot.revision,
          command,
        ),
        activationRevision,
      }
    } catch (error) {
      return failed(
        'RUNTIME-PLAYER-COMMAND-INVALID',
        errorMessage(error),
      )
    }
  }

  private prepareForExecution(
    captured: Readonly<PreparedPlayerCommand>,
  ): PreparedPlayerCommand | UiRuntimePlayerCommandResult {
    const snapshot = this.options.latestSnapshot()
    if (snapshot.phase !== 'ready') {
      return failed(
        'RUNTIME-PLAYER-NOT-READY',
        'Player commands require a ready frontend snapshot.',
      )
    }
    if (
      snapshot.revision.session !==
      captured.activationRevision.session
    ) {
      return staleSession(
        captured.activationRevision,
        snapshot.revision.state,
      )
    }
    try {
      return {
        envelope: createFrontendCommandEnvelope(
          snapshot.revision,
          captured.envelope.command,
        ),
        activationRevision: captured.activationRevision,
      }
    } catch (error) {
      return failed(
        'RUNTIME-PLAYER-COMMAND-INVALID',
        errorMessage(error),
      )
    }
  }

  private finish(
    result: Readonly<CanonicalCoordinatedPlayerResult>,
    activationRevision: UiRuntimeCommandActivationRevision,
  ): UiRuntimePlayerCommandResult {
    if (!this.options.isCurrent()) {
      return failed(
        'RUNTIME-PLAYER-AUTHORITY-LOST',
        'The writable application changed before the command result could publish.',
      )
    }
    const mapped = mapResult(result, activationRevision)
    if (
      mapped.status === 'accepted' ||
      mapped.status === 'partial'
    ) {
      this.options.publishSnapshot()
    }
    return mapped
  }

  private mapFailure(error: unknown): UiRuntimePlayerCommandResult {
    return failed(
      this.options.cancelRequested()
        ? 'RUNTIME-PLAYER-AUTHORITY-LOST'
        : 'RUNTIME-PLAYER-DISPATCH-FAILED',
      errorMessage(error),
    )
  }
}

function mapResult(
  result: Readonly<CanonicalCoordinatedPlayerResult>,
  activationRevision: UiRuntimeCommandActivationRevision,
): UiRuntimePlayerCommandResult {
  if (result.kind === 'transition') {
    const transition = result.transition
    if (!transition.accepted) {
      return Object.freeze({
        status: 'rejected',
        kind: 'transition',
        code: transition.code,
        reason: transition.reason,
        stale: isStaleCode(transition.code),
        stateRevision: transition.revision,
        activationRevision,
      })
    }
    return Object.freeze({
      status: 'accepted',
      kind: 'transition',
      changed: transition.changed,
      stateRevision: transition.revision,
      activationRevision,
    })
  }

  const stored = result.result
  if (stored.status === 'failed') {
    const transition = stored.transition
    return Object.freeze({
      status: 'rejected',
      kind: 'stored-time',
      code:
        stored.code ??
        (transition.accepted
          ? 'RUNTIME-STORED-TIME-FAILED'
          : transition.code),
      reason:
        stored.reason ??
        (transition.accepted
          ? 'Stored-time execution did not commit.'
          : transition.reason),
      stale:
        !transition.accepted &&
        isStaleCode(transition.code),
      stateRevision: transition.revision,
      activationRevision,
    })
  }
  return Object.freeze({
    status: 'accepted',
    kind: 'stored-time',
    admittedSeconds: stored.admittedSeconds,
    consumedSeconds: stored.consumedSeconds,
    remainingSeconds: stored.remainingSeconds,
    durableRevision: stored.durableRevision,
    summary: stored.summary,
    stateRevision: stored.transition.revision,
    activationRevision,
  })
}

function failed(
  code: string,
  reason: string,
): UiRuntimePlayerCommandResult {
  return Object.freeze({
    status: 'failed',
    kind: 'runtime',
    code,
    reason,
    retryable: false,
  })
}

function rejectedStoredTimeAdmission(
  activationRevision: UiRuntimeCommandActivationRevision,
  snapshot: DeepReadonly<FrontendApplicationSnapshot>,
): UiRuntimePlayerCommandResult {
  return Object.freeze({
    status: 'rejected',
    kind: 'stored-time',
    code: 'CANONICAL-STORED-TIME-JOB-ACTIVE',
    reason: 'A Stored Time job is already active.',
    stale: false,
    stateRevision:
      snapshot.phase === 'ready'
        ? snapshot.revision.state
        : activationRevision.state,
    activationRevision,
  })
}

function staleSession(
  activationRevision: UiRuntimeCommandActivationRevision,
  stateRevision: number,
): UiRuntimePlayerCommandResult {
  return Object.freeze({
    status: 'rejected',
    kind: 'transition',
    code: 'APP-STALE-SESSION',
    reason: `Session ${activationRevision.session} is not current.`,
    stale: true,
    stateRevision,
    activationRevision,
  })
}

function isStaleCode(code: string): boolean {
  return code === 'APP-STALE-SESSION' || code === 'SIM-STALE-REVISION'
}
