import type {
  SimulationEngineDefinition,
  SimulationTransitionResult,
} from '../core/contracts'
import { TransactionalSimulationEngine } from '../core/simulationEngine'
import { formatUnknownError as errorMessage } from '../core/unknownError'
import type { PreparedSave } from '../save/prepare'
import { prepareImportedSaveText } from '../save/import'
import type {
  ApplicationCommandEnvelope,
  ApplicationListener,
  ApplicationSnapshot,
  CheckpointResult,
  CommitFirstPurpose,
  CommitFirstResult,
  GameApplication,
  GameApplicationOptions,
  GameStateSession,
  ImportSaveRequest,
  ImportSaveResult,
  ReadySource,
} from './contracts'
import { APPLICATION_SNAPSHOT_VERSION } from './contracts'

/**
 * Owns the authoritative simulation engine and the single persistence lane.
 *
 * UI and platform adapters observe this boundary rather than publishing state
 * directly. Ordinary checkpoints allow active play to continue, while
 * save-backed transitions remain invisible until their write is verified.
 */
export class TransactionalGameApplication<TState, TCommand>
  implements GameApplication<TState, TCommand>
{
  private readonly options: GameApplicationOptions<TState, TCommand>
  private readonly listeners = new Set<ApplicationListener<TState>>()
  private current: ApplicationSnapshot<TState> = {
    version: APPLICATION_SNAPSHOT_VERSION,
    phase: 'idle',
  }
  private engine:
    | TransactionalSimulationEngine<TState, TCommand>
    | undefined
  private session: GameStateSession<TState> | undefined
  private startPromise: Promise<ApplicationSnapshot<TState>> | undefined
  private persistenceTail: Promise<void> = Promise.resolve()

  constructor(options: GameApplicationOptions<TState, TCommand>) {
    this.options = options
  }

  snapshot(): ApplicationSnapshot<TState> {
    return this.current
  }

  start(): Promise<ApplicationSnapshot<TState>> {
    this.startPromise ??= this.startOnce()
    return this.startPromise
  }

  dispatch(
    envelope: ApplicationCommandEnvelope<TCommand>,
  ): SimulationTransitionResult {
    const unavailable = this.validateActiveEnvelope(envelope)
    if (unavailable) return unavailable

    const result = this.requireEngine().dispatch({
      expectedRevision: envelope.expectedStateRevision,
      command: envelope.command,
    })
    if (result.accepted && result.changed) {
      this.publishEngineState('state-changed')
    }
    return result
  }

  advanceActive(milliseconds: number): SimulationTransitionResult {
    const ready = this.readySnapshot()
    if (!ready || ready.operation !== 'none') {
      return this.rejected(
        'APP-NOT-READY',
        'Active time cannot advance while the application is unavailable.',
      )
    }
    const result = this.requireEngine().advanceBy(milliseconds)
    if (result.accepted && result.changed) {
      this.publishEngineState('state-changed')
    }
    return result
  }

  checkpoint(): Promise<CheckpointResult> {
    return this.inPersistenceLane(async () => {
      const ready = this.readySnapshot()
      if (!ready || ready.operation !== 'none') {
        return {
          committed: false,
          code: 'APP-NOT-READY',
          reason: 'A checkpoint requires a ready application.',
        }
      }

      const target = this.requireEngine().snapshot()
      const durableBefore = ready.revision.durable
      this.setReady({
        ...ready,
        checkpoint: {
          kind: 'checkpointing',
          durableRevision: durableBefore,
          targetStateRevision: target.revision,
        },
      })

      let committed: PreparedSave
      try {
        const prepared = this.requireSession().prepare(target.state)
        committed = await this.options.repository.commit(prepared)
      } catch (error) {
        const message = errorMessage(error)
        const latest = this.readySnapshot()
        if (latest) {
          this.setReady({
            ...latest,
            checkpoint: {
              kind: 'dirty',
              durableRevision: latest.revision.durable,
              reason:
                latest.source === 'first-run' &&
                latest.revision.durable === null
                  ? 'initial-save-failed'
                  : 'checkpoint-failed',
              error: message,
            },
          })
        }
        return {
          committed: false,
          code: 'APP-CHECKPOINT-FAILED',
          reason: message,
        }
      }

      try {
        this.session = this.options.sessionFactory.open(committed)
      } catch (error) {
        this.blockAfterCommittedWrite(error)
        return {
          committed: false,
          code: 'APP-POST-COMMIT-RELOAD',
          reason:
            'The durable save committed, but its application session could not be opened.',
        }
      }

      const latest = this.requireReadySnapshot()
      const isClean = latest.revision.state === target.revision
      this.setReady({
        ...latest,
        revision: {
          ...latest.revision,
          durable: target.revision,
        },
        checkpoint: isClean
          ? { kind: 'clean', durableRevision: target.revision }
          : {
              kind: 'dirty',
              durableRevision: target.revision,
              reason: 'state-changed',
            },
      })
      return {
        committed: true,
        targetStateRevision: target.revision,
        durableRevision: target.revision,
      }
    })
  }

  /**
   * Captures one validated, immutable save candidate without entering the
   * persistence lane. This is intentionally read-only: save transfer can use
   * it while a detached Stored Time worker owns the serialized commit lane.
   */
  capturePreparedSave(): PreparedSave | null {
    const ready = this.readySnapshot()
    if (ready === undefined) return null
    return this.requireSession().prepare(
      this.requireEngine().snapshot().state,
    )
  }

  dispatchCommitFirst(
    envelope: ApplicationCommandEnvelope<TCommand>,
    purpose: CommitFirstPurpose,
  ): Promise<CommitFirstResult> {
    return this.inPersistenceLane(async () => {
      const unavailable = this.validateActiveEnvelope(envelope)
      if (unavailable) {
        return { committed: false, transition: unavailable }
      }
      const before = this.requireReadySnapshot()
      this.setReady({ ...before, operation: purpose })

      const staged = this.requireEngine().stageDispatch({
        expectedRevision: envelope.expectedStateRevision,
        command: envelope.command,
      })
      if (!(staged.accepted && staged.changed && 'staged' in staged)) {
        this.setReady({ ...this.requireReadySnapshot(), operation: 'none' })
        return { committed: false, transition: staged }
      }

      const prepared = staged.staged.readCandidate((candidate) =>
        this.requireSession().prepare(candidate),
      )
      let committed: PreparedSave
      try {
        committed = await this.options.repository.commit(prepared)
      } catch (error) {
        const latest = this.readySnapshot()
        if (latest) this.setReady({ ...latest, operation: 'none' })
        return {
          committed: false,
          transition: this.rejected(
            'APP-COMMIT-FIRST-FAILED',
            errorMessage(error),
          ),
          code: 'APP-COMMIT-FIRST-FAILED',
          reason: errorMessage(error),
        }
      }

      let committedSession: GameStateSession<TState>
      try {
        committedSession = this.options.sessionFactory.open(committed)
      } catch (error) {
        return this.blockAfterCommittedWrite(error)
      }

      const published = this.requireEngine().publish(staged.staged)
      if (!(published.accepted && published.changed)) {
        return this.reloadAfterCommittedWrite(committed, published)
      }
      this.session = committedSession
      const state = this.requireEngine().snapshot()
      this.setReady({
        ...this.requireReadySnapshot(),
        operation: 'none',
        revision: {
          ...before.revision,
          state: state.revision,
          durable: state.revision,
        },
        checkpoint: {
          kind: 'clean',
          durableRevision: state.revision,
        },
        state: state.state,
      })
      return {
        committed: true,
        transition: published,
        durableRevision: state.revision,
      }
    })
  }

  importSave(request: ImportSaveRequest): Promise<ImportSaveResult> {
    return this.inPersistenceLane(async () => {
      const previous = this.current
      if (previous.phase === 'idle' || previous.phase === 'starting') {
        return {
          imported: false,
          committed: false,
          code: 'APP-NOT-READY',
          reason: 'Import requires startup to resolve first.',
        }
      }
      if (previous.phase === 'ready') {
        if (previous.operation !== 'none') {
          return {
            imported: false,
            committed: false,
            code: 'APP-EXCLUSIVE-OPERATION-BUSY',
            reason: 'Another exclusive operation is already active.',
          }
        }
        this.setReady({ ...previous, operation: 'import' })
      }

      let prepared: PreparedSave
      let displaced: PreparedSave | undefined
      try {
        const hasCurrent = await this.options.repository.hasCurrent()
        if (
          (previous.phase === 'ready' || hasCurrent) &&
          !request.overwriteApproved
        ) {
          this.setSnapshot(previous)
          return {
            imported: false,
            committed: false,
            code: 'APP-IMPORT-OVERWRITE-REQUIRED',
            reason: 'Import requires explicit approval to replace the current save.',
          }
        }
        let recoveryBase: PreparedSave | undefined
        const createRecoveryBase = () => {
          recoveryBase ??=
            this.options.createTransitionalRecoveryBase?.()
          if (recoveryBase === undefined) {
            throw new Error(
              'Historical schema-13 import requires a compatibility base.',
            )
          }
          return recoveryBase
        }
        let receiving: PreparedSave | undefined
        if (previous.phase === 'ready') {
          receiving = displaced = this.requireSession().prepare(
            this.requireEngine().snapshot().state,
          )
        } else if (
          previous.phase === 'blocked' &&
          previous.outcome !== 'all-candidates-invalid' &&
          previous.outcome !== 'unsupported-future-version'
        ) {
          try {
            receiving = await this.options.repository.loadCurrent() ??
              undefined
          } catch {
            // A blocked rescue import must still fall back to configured local
            // defaults when the current slot cannot be decoded now.
          }
        }
        prepared = prepareImportedSaveText(
          request.text,
          request.importedAtUtc,
          undefined,
          request.context,
          receiving?.copyValidatedState(),
          this.options.createTransitionalRecoveryBase === undefined
            ? undefined
            : createRecoveryBase,
        )
      } catch (error) {
        this.setSnapshot(previous)
        return {
          imported: false,
          committed: false,
          code: 'APP-IMPORT-INVALID',
          reason: errorMessage(error),
        }
      }

      // Decode/schema validation is not sufficient for a canonical import:
      // production engine invariants can be stricter than the persisted graph
      // (for example, an automation phase must fit the production interval).
      // Prove the complete application session and engine before the first
      // displacement or replacement write so an invalid import can never
      // overwrite the current durable save.
      try {
        const candidateSession = this.options.sessionFactory.open(prepared)
        new TransactionalSimulationEngine(
          candidateSession.initialState,
          this.options.engineDefinition,
        )
      } catch (error) {
        this.setSnapshot(previous)
        return {
          imported: false,
          committed: false,
          code: 'APP-IMPORT-INVALID',
          reason: errorMessage(error),
        }
      }

      if (
        previous.phase === 'ready' &&
        previous.checkpoint.kind !== 'clean'
      ) {
        try {
          await this.options.repository.commit(
            displaced ??
              this.requireSession().prepare(
                this.requireEngine().snapshot().state,
              ),
            request.target,
          )
        } catch (error) {
          this.setSnapshot(previous)
          return {
            imported: false,
            committed: false,
            code: 'APP-IMPORT-CHECKPOINT-FAILED',
            reason: errorMessage(error),
          }
        }
      }

      try {
        await this.options.repository.commit(prepared, request.target)
      } catch (error) {
        this.setSnapshot(previous)
        return {
          imported: false,
          committed: false,
          code: 'APP-IMPORT-COMMIT-FAILED',
          reason: errorMessage(error),
        }
      }

      try {
        const reloaded = await this.options.repository.loadCurrent()
        if (!reloaded) {
          throw new Error('Committed import was not available for reload.')
        }
        this.installSession(reloaded, 'import', 0)
        return {
          imported: true,
          sessionRevision: this.requireReadySnapshot().revision.session,
        }
      } catch (error) {
        this.engine = undefined
        this.session = undefined
        this.setSnapshot({
          version: APPLICATION_SNAPSHOT_VERSION,
          phase: 'blocked',
          outcome: 'post-commit-reload-failed',
          error: errorMessage(error),
        })
        return {
          imported: false,
          committed: true,
          code: 'APP-POST-COMMIT-RELOAD',
          reason: errorMessage(error),
        }
      }
    })
  }

  subscribe(listener: ApplicationListener<TState>): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private async startOnce(): Promise<ApplicationSnapshot<TState>> {
    this.setSnapshot({
      version: APPLICATION_SNAPSHOT_VERSION,
      phase: 'starting',
    })
    try {
      const resolution = await this.options.startupResolver.resolve()
      if (resolution.kind === 'blocked') {
        this.setSnapshot({
          version: APPLICATION_SNAPSHOT_VERSION,
          phase: 'blocked',
          outcome: resolution.reason,
          error: resolution.error,
        })
        return this.current
      }
      this.installSession(
        resolution.save,
        resolution.kind === 'first-run' ? 'first-run' : resolution.source,
        resolution.kind === 'first-run' ? null : 0,
      )
      if (resolution.kind === 'first-run') await this.checkpoint()
    } catch (error) {
      this.setSnapshot({
        version: APPLICATION_SNAPSHOT_VERSION,
        phase: 'blocked',
        outcome: 'storage-failed',
        error: errorMessage(error),
      })
    }
    return this.current
  }

  private installSession(
    prepared: PreparedSave,
    source: ReadySource,
    durableRevision: number | null,
  ): void {
    const session = this.options.sessionFactory.open(prepared)
    this.session = session
    this.engine = new TransactionalSimulationEngine(
      session.initialState,
      this.options.engineDefinition,
    )
    const engineSnapshot = this.engine.snapshot()
    const previousSession =
      this.current.phase === 'ready' ? this.current.revision.session : 0
    this.setSnapshot({
      version: APPLICATION_SNAPSHOT_VERSION,
      phase: 'ready',
      source,
      revision: {
        session: previousSession + 1,
        state: engineSnapshot.revision,
        durable: durableRevision,
      },
      checkpoint:
        durableRevision === null
          ? {
              kind: 'dirty',
              durableRevision: null,
              reason: 'state-changed',
            }
          : { kind: 'clean', durableRevision },
      operation: 'none',
      state: engineSnapshot.state,
    })
  }

  private publishEngineState(
    reason: 'state-changed' | 'checkpoint-failed',
  ): void {
    const ready = this.requireReadySnapshot()
    const engineSnapshot = this.requireEngine().snapshot()
    this.setReady({
      ...ready,
      revision: { ...ready.revision, state: engineSnapshot.revision },
      checkpoint: {
        kind: 'dirty',
        durableRevision: ready.revision.durable,
        reason,
      },
      state: engineSnapshot.state,
    })
  }

  private validateActiveEnvelope(
    envelope: ApplicationCommandEnvelope<TCommand>,
  ): SimulationTransitionResult | undefined {
    const ready = this.readySnapshot()
    if (!ready) {
      return this.rejected(
        'APP-NOT-READY',
        'Commands require a ready application.',
      )
    }
    if (ready.operation !== 'none') {
      return this.rejected(
        'APP-COMMIT-FIRST-BUSY',
        'A commit-first operation currently owns publication.',
      )
    }
    if (envelope.sessionRevision !== ready.revision.session) {
      return this.rejected(
        'APP-STALE-SESSION',
        `Session ${envelope.sessionRevision} is not current.`,
      )
    }
    return undefined
  }

  private rejected(code: string, reason: string): SimulationTransitionResult {
    return {
      accepted: false,
      code,
      reason,
      revision: this.engine?.snapshot().revision ?? 0,
    }
  }

  private reloadAfterCommittedWrite(
    committed: PreparedSave,
    failedPublication: SimulationTransitionResult,
  ): CommitFirstResult {
    const ready = this.requireReadySnapshot()
    this.setReady({ ...ready, operation: 'reload-after-commit' })
    try {
      this.installSession(committed, ready.source, 0)
    } catch (error) {
      this.engine = undefined
      this.session = undefined
      this.setSnapshot({
        version: APPLICATION_SNAPSHOT_VERSION,
        phase: 'blocked',
        outcome: 'post-commit-reload-failed',
        error: errorMessage(error),
      })
    }
    return {
      committed: false,
      transition: failedPublication,
      code: 'APP-POST-COMMIT-RELOAD',
      reason: 'The durable save committed, but staged publication failed.',
    }
  }

  private blockAfterCommittedWrite(error: unknown): CommitFirstResult {
    this.engine = undefined
    this.session = undefined
    this.setSnapshot({
      version: APPLICATION_SNAPSHOT_VERSION,
      phase: 'blocked',
      outcome: 'post-commit-reload-failed',
      error: errorMessage(error),
    })
    return {
      committed: false,
      transition: this.rejected(
        'APP-POST-COMMIT-RELOAD',
        'The durable save committed, but its application session could not be opened.',
      ),
      code: 'APP-POST-COMMIT-RELOAD',
      reason:
        'The durable save committed, but its application session could not be opened.',
    }
  }

  private inPersistenceLane<TResult>(
    task: () => Promise<TResult>,
  ): Promise<TResult> {
    const result = this.persistenceTail.then(task, task)
    this.persistenceTail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  private readySnapshot():
    | Extract<ApplicationSnapshot<TState>, { phase: 'ready' }>
    | undefined {
    return this.current.phase === 'ready' ? this.current : undefined
  }

  private requireReadySnapshot(): Extract<
    ApplicationSnapshot<TState>,
    { phase: 'ready' }
  > {
    const ready = this.readySnapshot()
    if (!ready) throw new Error('Application is not ready.')
    return ready
  }

  private requireEngine(): TransactionalSimulationEngine<TState, TCommand> {
    if (!this.engine) throw new Error('Application engine is unavailable.')
    return this.engine
  }

  private requireSession(): GameStateSession<TState> {
    if (!this.session) throw new Error('Application save session is unavailable.')
    return this.session
  }

  private setReady(
    snapshot: Extract<ApplicationSnapshot<TState>, { phase: 'ready' }>,
  ): void {
    this.setSnapshot(snapshot)
  }

  private setSnapshot(snapshot: ApplicationSnapshot<TState>): void {
    this.current = snapshot
    for (const listener of [...this.listeners]) {
      try {
        listener(snapshot)
      } catch (error) {
        this.listenerErrorHandler()?.(error)
      }
    }
  }

  private listenerErrorHandler():
    | SimulationEngineDefinition<TState, TCommand>['onListenerError']
    | undefined {
    return this.options.engineDefinition.onListenerError
  }
}
