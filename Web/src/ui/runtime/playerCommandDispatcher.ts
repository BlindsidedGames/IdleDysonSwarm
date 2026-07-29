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

export interface RevisionedPlayerCommandDispatcherOptions {
  readonly latestSnapshot: () =>
    DeepReadonly<FrontendApplicationSnapshot>
  readonly dispatch: (
    envelope: ReturnType<typeof createFrontendCommandEnvelope>,
    cancelRequested: () => boolean,
  ) => Promise<CanonicalCoordinatedPlayerResult>
  readonly publishSnapshot: () => void
  readonly isCurrent: () => boolean
  readonly cancelRequested: () => boolean
}

/**
 * Captures the latest published ready revision at player activation time,
 * creates one detached command envelope, and never retries a stale or failed
 * intent. The supplied dispatch function is the authority-fenced coordinator
 * route; this adapter contains no gameplay rule or optimistic mutation.
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
    let envelope: ReturnType<typeof createFrontendCommandEnvelope>
    try {
      envelope = createFrontendCommandEnvelope(
        snapshot.revision,
        command,
      )
    } catch (error) {
      return failed(
        'RUNTIME-PLAYER-COMMAND-INVALID',
        errorMessage(error),
      )
    }

    try {
      const result = await this.options.dispatch(
        envelope,
        this.options.cancelRequested,
      )
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
    } catch (error) {
      return failed(
        this.options.cancelRequested()
          ? 'RUNTIME-PLAYER-AUTHORITY-LOST'
          : 'RUNTIME-PLAYER-DISPATCH-FAILED',
        errorMessage(error),
      )
    }
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
