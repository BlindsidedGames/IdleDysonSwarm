import type {
  CommandEnvelope,
  DeepReadonly,
  DomainTransition,
  SimulationEngine,
  SimulationEngineDefinition,
  SimulationListener,
  SimulationSnapshot,
  SimulationStageResult,
  SimulationTransitionResult,
  StagedSimulationTransition,
  Unsubscribe,
} from './contracts'

/**
 * Transactional in-memory publication boundary for the headless game.
 *
 * Domain handlers mutate an isolated candidate. Only accepted, changed, valid
 * candidates replace authoritative state and advance the published revision.
 * Save-backed/offline work must durably commit its candidate before calling
 * this boundary; that coordinator is intentionally a separate layer.
 */
export class TransactionalSimulationEngine<TState, TCommand>
  implements SimulationEngine<TState, TCommand>
{
  private readonly definition: SimulationEngineDefinition<TState, TCommand>
  private readonly listeners = new Set<SimulationListener<TState>>()
  private readonly validStages = new WeakSet<object>()
  private state: TState
  private revision = 0

  constructor(
    initialState: TState,
    definition: SimulationEngineDefinition<TState, TCommand>,
  ) {
    const initialCandidate = definition.cloneState(initialState)
    const invalidCode = definition.validateState(initialCandidate)
    if (invalidCode) {
      throw new Error(`Initial simulation state is invalid: ${invalidCode}`)
    }
    this.definition = definition
    this.state = initialCandidate
  }

  snapshot(): SimulationSnapshot<TState> {
    const detached = this.definition.cloneState(this.state)
    return Object.freeze({
      schema: this.definition.schema,
      revision: this.revision,
      state: freezeGraph(detached),
    })
  }

  dispatch(envelope: CommandEnvelope<TCommand>): SimulationTransitionResult {
    const staged = this.stageDispatch(envelope)
    return staged.accepted && staged.changed && 'staged' in staged
      ? this.publish(staged.staged)
      : staged
  }

  stageDispatch(
    envelope: CommandEnvelope<TCommand>,
  ): SimulationStageResult<TState> {
    if (
      !Number.isSafeInteger(envelope.expectedRevision) ||
      envelope.expectedRevision < 0
    ) {
      return this.rejected(
        'SIM-INVALID-REVISION',
        'Expected revision must be a non-negative safe integer.',
      )
    }
    if (envelope.expectedRevision !== this.revision) {
      return this.rejected(
        'SIM-STALE-REVISION',
        `Expected revision ${envelope.expectedRevision} does not match current revision ${this.revision}.`,
      )
    }
    return this.transition((candidate) =>
      this.definition.applyCommand(candidate, envelope.command),
    )
  }

  advanceBy(milliseconds: number): SimulationTransitionResult {
    const staged = this.stageAdvance(milliseconds)
    return staged.accepted && staged.changed && 'staged' in staged
      ? this.publish(staged.staged)
      : staged
  }

  stageAdvance(milliseconds: number): SimulationStageResult<TState> {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
      return this.rejected(
        'SIM-INVALID-DURATION',
        'Advance duration must be finite and non-negative.',
      )
    }
    if (milliseconds === 0) {
      return { accepted: true, changed: false, revision: this.revision }
    }
    return this.transition((candidate) =>
      this.definition.advance(candidate, milliseconds),
    )
  }

  publish(
    staged: StagedSimulationTransition<TState>,
  ): SimulationTransitionResult {
    if (!this.validStages.has(staged)) {
      return this.rejected(
        'SIM-INVALID-STAGE',
        'Staged transition was not created by this engine or was already consumed.',
      )
    }
    this.validStages.delete(staged)
    if (staged.baseRevision !== this.revision) {
      return this.rejected(
        'SIM-STALE-REVISION',
        `Staged revision ${staged.baseRevision} does not match current revision ${this.revision}.`,
      )
    }
    const candidate = staged.copyCandidate()
    const invalidCode = this.definition.validateState(candidate)
    if (invalidCode) {
      return this.rejected(
        'SIM-INVALID-CANDIDATE',
        `Staged transition produced invalid state: ${invalidCode}`,
      )
    }
    this.state = this.definition.cloneState(candidate)
    this.revision += 1
    this.notifyListeners()
    return { accepted: true, changed: true, revision: this.revision }
  }

  subscribe(listener: SimulationListener<TState>): Unsubscribe {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private transition(
    apply: (candidate: TState) => DomainTransition,
  ): SimulationStageResult<TState> {
    const candidate = this.definition.cloneState(this.state)
    let decision: DomainTransition
    try {
      decision = apply(candidate)
    } catch (error) {
      return this.rejected(
        'SIM-TRANSITION-THREW',
        error instanceof Error ? error.message : String(error),
      )
    }
    if (!decision.accepted) {
      return this.rejected(decision.code, decision.reason)
    }
    if (!decision.changed) {
      return { accepted: true, changed: false, revision: this.revision }
    }
    const invalidCode = this.definition.validateState(candidate)
    if (invalidCode) {
      return this.rejected(
        'SIM-INVALID-CANDIDATE',
        `Transition produced invalid state: ${invalidCode}`,
      )
    }

    const staged = Object.freeze({
      baseRevision: this.revision,
      copyCandidate: () => this.definition.cloneState(candidate),
    })
    this.validStages.add(staged)
    return {
      accepted: true,
      changed: true,
      revision: this.revision,
      staged,
    }
  }

  private rejected(code: string, reason: string): SimulationTransitionResult {
    return {
      accepted: false,
      code,
      reason,
      revision: this.revision,
    }
  }

  private notifyListeners(): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(this.snapshot())
      } catch (error) {
        this.definition.onListenerError?.(error)
      }
    }
  }
}

function freezeGraph<T>(value: T): DeepReadonly<T> {
  if (value === null || typeof value !== 'object') {
    return value as DeepReadonly<T>
  }
  if (value instanceof Uint8Array) {
    return value as DeepReadonly<T>
  }
  if (Array.isArray(value)) {
    for (const entry of value) freezeGraph(entry)
  } else {
    for (const entry of Object.values(value)) freezeGraph(entry)
  }
  return Object.freeze(value) as DeepReadonly<T>
}
