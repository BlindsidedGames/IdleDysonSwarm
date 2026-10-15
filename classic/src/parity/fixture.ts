export interface ParityFixture<TState, TCommand = never> {
  readonly name: string
  readonly source: 'unity-golden-master' | 'save-characterization'
  readonly initialState: TState
  readonly commands: readonly TCommand[]
  readonly elapsedMilliseconds: number
  readonly expectedState: TState
}

export interface ParityExecutor<TState, TCommand> {
  run(
    initialState: TState,
    commands: readonly TCommand[],
    elapsedMilliseconds: number,
  ): TState
}

/**
 * The executor is intentionally injected. Unity can emit fixtures now; the
 * finalized TypeScript simulation will later be plugged in without changing
 * fixture format or comparison semantics.
 */
export function executeParityFixture<TState, TCommand>(
  fixture: ParityFixture<TState, TCommand>,
  executor: ParityExecutor<TState, TCommand>,
): TState {
  return executor.run(
    fixture.initialState,
    fixture.commands,
    fixture.elapsedMilliseconds,
  )
}
