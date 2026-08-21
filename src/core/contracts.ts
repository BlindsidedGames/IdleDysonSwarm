export type Unsubscribe = () => void

export interface Clock {
  nowMilliseconds(): number
}

export interface ReadonlyBytes {
  readonly length: number
  readonly byteLength: number
  readonly byteOffset: number
  readonly [index: number]: number
  at(index: number): number | undefined
  slice(start?: number, end?: number): Uint8Array
  [Symbol.iterator](): ArrayIterator<number>
}

export type DeepReadonly<T> =
  T extends (...args: never[]) => unknown
    ? T
    : T extends Uint8Array
      ? ReadonlyBytes
      : T extends readonly (infer TItem)[]
        ? readonly DeepReadonly<TItem>[]
        : T extends object
          ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
          : T

export interface SimulationSnapshot<TState> {
  readonly schema: number
  readonly revision: number
  readonly state: DeepReadonly<TState>
}

export interface SimulationCommand<TKind extends string = string> {
  readonly kind: TKind
}

export interface CommandEnvelope<TCommand> {
  readonly expectedRevision: number
  readonly command: TCommand
}

export type SimulationTransitionResult =
  | {
      readonly accepted: true
      readonly changed: boolean
      readonly revision: number
    }
  | {
      readonly accepted: false
      readonly code: string
      readonly reason: string
      readonly revision: number
    }

export interface StagedSimulationTransition<TState> {
  readonly baseRevision: number
  readCandidate<TResult>(
    read: (candidate: DeepReadonly<TState>) => TResult,
  ): TResult
}

export type SimulationStageResult<TState> =
  | SimulationTransitionResult
  | {
      readonly accepted: true
      readonly changed: true
      readonly revision: number
      readonly staged: StagedSimulationTransition<TState>
    }

export type SimulationListener<TState> = (
  snapshot: SimulationSnapshot<TState>,
) => void

export type DomainTransition =
  | { readonly accepted: true; readonly changed: boolean }
  | { readonly accepted: false; readonly code: string; readonly reason: string }

export interface SimulationEngineDefinition<TState, TCommand> {
  readonly schema: number
  cloneState(state: TState): TState
  forkState?(state: TState): TState
  /**
   * Opts structurally shared state into incremental publication freezing.
   * Snapshots can then reuse the authoritative graph as a read-only value.
   */
  readonly publishImmutableState?: boolean
  validateState(state: TState): string | undefined
  /**
   * Optional bounded validator for already-hydrated transition candidates.
   * When omitted, the engine uses the full state validator.
   */
  validateTransitionState?(state: TState): string | undefined
  applyCommand(candidate: TState, command: TCommand): DomainTransition
  advance(candidate: TState, milliseconds: number): DomainTransition
  onListenerError?(error: unknown): void
}

export interface UnknownSimulationCommand {
  readonly kind: string
  readonly [key: string]: unknown
}

/**
 * React, persistence and platform adapters depend only on this boundary.
 * The pure event-time scheduler and each migrated gameplay model live behind it,
 * so neither rendering nor wall-clock behavior can become authoritative.
 */
export interface SimulationEngine<TState, TCommand> {
  snapshot(): SimulationSnapshot<TState>
  dispatch(command: CommandEnvelope<TCommand>): SimulationTransitionResult
  advanceBy(milliseconds: number): SimulationTransitionResult
  stageDispatch(
    command: CommandEnvelope<TCommand>,
  ): SimulationStageResult<TState>
  stageAdvance(milliseconds: number): SimulationStageResult<TState>
  publish(
    staged: StagedSimulationTransition<TState>,
  ): SimulationTransitionResult
  subscribe(listener: SimulationListener<TState>): Unsubscribe
}
