import type { DeepReadonly } from '../../core/contracts'
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

type LatestTransientTinkerCommand =
  | (Extract<
      CanonicalPlayerCommand,
      { readonly kind: 'tinker.start' }
    > & { readonly repeat: true })
  | (Extract<
      CanonicalPlayerCommand,
      { readonly kind: 'tinker.set-repeat' }
    > & { readonly enabled: false })

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

/**
 * Captures the latest published ready revision at player activation time for
 * ordinary intents. Idempotent safety reconciliation can instead capture its
 * revision inside the authority lane through `dispatchLatest`.
 */
export class RevisionedPlayerCommandDispatcher {
  private readonly options:
    Readonly<RevisionedPlayerCommandDispatcherOptions>

  constructor(
    options: Readonly<RevisionedPlayerCommandDispatcherOptions>,
  ) {
    this.options = options
  }

  async dispatch(
    command: Readonly<CanonicalPlayerCommand>,
  ): Promise<UiRuntimePlayerCommandResult> {
    const prepared = this.prepare(command)
    if ('status' in prepared) return prepared
    try {
      const result = await this.options.serialize(() =>
        this.options.dispatch(
          prepared.envelope,
          this.options.cancelRequested,
        ),
      )
      return this.finish(result, prepared.activationRevision)
    } catch (error) {
      return this.mapFailure(error)
    }
  }

  /**
   * Captures the latest revision only after previously admitted lifecycle work
   * has settled. This is reserved for idempotent safety reconciliation such as
   * reconciling an ongoing Tinker hold; it is not an ordinary intent retry.
   */
  async dispatchLatest(
    command: Readonly<LatestTransientTinkerCommand>,
  ): Promise<UiRuntimePlayerCommandResult> {
    try {
      const outcome = await this.options.serialize(async () => {
        const prepared = this.prepare(command)
        if ('status' in prepared) {
          return { kind: 'failure', failure: prepared } as const
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
  ):
    | {
        readonly envelope: ReturnType<
          typeof createFrontendCommandEnvelope
        >
        readonly activationRevision:
          UiRuntimeCommandActivationRevision
      }
    | UiRuntimePlayerCommandResult {
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
    status:
      stored.status === 'partial' ? 'partial' : 'accepted',
    kind: 'stored-time',
    admittedSeconds: stored.admittedSeconds,
    consumedSeconds: stored.consumedSeconds,
    remainingSeconds: stored.remainingSeconds,
    durableRevision: stored.durableRevision,
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

function isStaleCode(code: string): boolean {
  return code === 'APP-STALE-SESSION' || code === 'SIM-STALE-REVISION'
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
