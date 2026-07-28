import { describe, expect, test, vi } from 'vitest'
import type {
  DomainTransition,
  SimulationCommand,
  SimulationEngineDefinition,
} from './contracts'
import { TransactionalSimulationEngine } from './simulationEngine'

interface ProbeState {
  value: number
  nested: { values: number[] }
}

type ProbeCommand =
  | (SimulationCommand<'add'> & { readonly amount: number })
  | SimulationCommand<'reject'>
  | SimulationCommand<'invalidate'>
  | SimulationCommand<'throw'>

function definition(
  onListenerError?: (error: unknown) => void,
): SimulationEngineDefinition<ProbeState, ProbeCommand> {
  return {
    schema: 1,
    cloneState: (state) => structuredClone(state),
    validateState: (state) =>
      Number.isFinite(state.value) ? undefined : 'PROBE-NON-FINITE',
    applyCommand: (candidate, command): DomainTransition => {
      switch (command.kind) {
        case 'add':
          candidate.value += command.amount
          candidate.nested.values.push(candidate.value)
          return { accepted: true, changed: command.amount !== 0 }
        case 'reject':
          candidate.value = 999
          return {
            accepted: false,
            code: 'PROBE-REJECTED',
            reason: 'Rejected by the domain.',
          }
        case 'invalidate':
          candidate.value = Number.NaN
          return { accepted: true, changed: true }
        case 'throw':
          candidate.value = 999
          throw new Error('probe failure')
      }
    },
    advance: (candidate, milliseconds) => {
      candidate.value += milliseconds
      return { accepted: true, changed: true }
    },
    onListenerError,
  }
}

describe('transactional simulation engine', () => {
  test('publishes detached immutable snapshots with monotonic revisions', () => {
    const initial: ProbeState = { value: 1, nested: { values: [1] } }
    const engine = new TransactionalSimulationEngine(initial, definition())

    const initialSnapshot = engine.snapshot()
    expect(initialSnapshot.revision).toBe(0)
    expect(Object.isFrozen(initialSnapshot)).toBe(true)
    expect(Object.isFrozen(initialSnapshot.state.nested.values)).toBe(true)
    expect(() => {
      ;(initialSnapshot.state.nested.values as number[]).push(2)
    }).toThrow()

    initial.value = 500
    expect(engine.snapshot().state.value).toBe(1)
    expect(engine.dispatch({
      expectedRevision: 0,
      command: { kind: 'add', amount: 2 },
    })).toEqual({
      accepted: true,
      changed: true,
      revision: 1,
    })
    expect(engine.snapshot()).toMatchObject({
      revision: 1,
      state: { value: 3, nested: { values: [1, 3] } },
    })
  })

  test('rejects failed transitions without publishing their candidate', () => {
    const engine = new TransactionalSimulationEngine(
      { value: 1, nested: { values: [] } },
      definition(),
    )
    const listener = vi.fn()
    engine.subscribe(listener)

    expect(engine.dispatch({
      expectedRevision: 0,
      command: { kind: 'reject' },
    })).toMatchObject({
      accepted: false,
      code: 'PROBE-REJECTED',
      revision: 0,
    })
    expect(engine.dispatch({
      expectedRevision: 0,
      command: { kind: 'invalidate' },
    })).toMatchObject({
      accepted: false,
      code: 'SIM-INVALID-CANDIDATE',
      revision: 0,
    })
    expect(engine.dispatch({
      expectedRevision: 0,
      command: { kind: 'throw' },
    })).toMatchObject({
      accepted: false,
      code: 'SIM-TRANSITION-THREW',
      revision: 0,
    })
    expect(engine.snapshot().state.value).toBe(1)
    expect(listener).not.toHaveBeenCalled()
  })

  test('isolates listeners and makes unsubscribe idempotent', () => {
    const listenerError = vi.fn()
    const engine = new TransactionalSimulationEngine(
      { value: 1, nested: { values: [] } },
      definition(listenerError),
    )
    const laterListener = vi.fn()
    const unsubscribe = engine.subscribe(() => {
      throw new Error('listener failure')
    })
    engine.subscribe(laterListener)

    engine.advanceBy(10)
    expect(listenerError).toHaveBeenCalledOnce()
    expect(laterListener).toHaveBeenCalledOnce()
    expect(laterListener.mock.calls[0]?.[0].revision).toBe(1)

    unsubscribe()
    unsubscribe()
    engine.advanceBy(5)
    expect(laterListener).toHaveBeenCalledTimes(2)
  })

  test('rejects invalid durations and treats zero as a no-op', () => {
    const engine = new TransactionalSimulationEngine(
      { value: 1, nested: { values: [] } },
      definition(),
    )
    expect(engine.advanceBy(Number.POSITIVE_INFINITY)).toMatchObject({
      accepted: false,
      code: 'SIM-INVALID-DURATION',
      revision: 0,
    })
    expect(engine.advanceBy(0)).toEqual({
      accepted: true,
      changed: false,
      revision: 0,
    })
  })

  test('rejects stale command revisions without mutation', () => {
    const engine = new TransactionalSimulationEngine(
      { value: 1, nested: { values: [] } },
      definition(),
    )
    expect(engine.dispatch({
      expectedRevision: 1,
      command: { kind: 'add', amount: 100 },
    })).toMatchObject({
      accepted: false,
      code: 'SIM-STALE-REVISION',
      revision: 0,
    })
    expect(engine.snapshot().state.value).toBe(1)
  })

  test('supports commit-first staging without early publication', () => {
    const engine = new TransactionalSimulationEngine(
      { value: 1, nested: { values: [] } },
      definition(),
    )
    const listener = vi.fn()
    engine.subscribe(listener)
    const result = engine.stageDispatch({
      expectedRevision: 0,
      command: { kind: 'add', amount: 4 },
    })

    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      revision: 0,
    })
    expect(engine.snapshot().state.value).toBe(1)
    expect(listener).not.toHaveBeenCalled()
    if (!(result.accepted && result.changed && 'staged' in result)) {
      throw new Error('Expected a staged transition.')
    }
    expect(result.staged.copyCandidate().value).toBe(5)
    expect(engine.publish(result.staged)).toEqual({
      accepted: true,
      changed: true,
      revision: 1,
    })
    expect(engine.snapshot().state.value).toBe(5)
    expect(listener).toHaveBeenCalledOnce()
    expect(engine.publish(result.staged)).toMatchObject({
      accepted: false,
      code: 'SIM-INVALID-STAGE',
      revision: 1,
    })
  })

  test('rejects a staged transition created by another engine', () => {
    const first = new TransactionalSimulationEngine(
      { value: 1, nested: { values: [] } },
      definition(),
    )
    const second = new TransactionalSimulationEngine(
      { value: 10, nested: { values: [] } },
      definition(),
    )
    const staged = first.stageDispatch({
      expectedRevision: 0,
      command: { kind: 'add', amount: 4 },
    })
    if (!(staged.accepted && staged.changed && 'staged' in staged)) {
      throw new Error('Expected a staged transition.')
    }

    expect(second.publish(staged.staged)).toMatchObject({
      accepted: false,
      code: 'SIM-INVALID-STAGE',
      revision: 0,
    })
    expect(second.snapshot().state.value).toBe(10)
    expect(first.publish(staged.staged)).toMatchObject({
      accepted: true,
      changed: true,
      revision: 1,
    })
    expect(first.snapshot().state.value).toBe(5)
  })

  test('keeps staged candidates isolated from caller-owned copies', () => {
    const engine = new TransactionalSimulationEngine(
      { value: 1, nested: { values: [] } },
      definition(),
    )
    const staged = engine.stageDispatch({
      expectedRevision: 0,
      command: { kind: 'add', amount: 4 },
    })
    if (!(staged.accepted && staged.changed && 'staged' in staged)) {
      throw new Error('Expected a staged transition.')
    }

    const callerCopy = staged.staged.copyCandidate()
    callerCopy.value = 999
    callerCopy.nested.values.push(999)

    expect(staged.staged.copyCandidate()).toEqual({
      value: 5,
      nested: { values: [5] },
    })
    expect(engine.publish(staged.staged)).toMatchObject({
      accepted: true,
      changed: true,
      revision: 1,
    })
    expect(engine.snapshot().state).toEqual({
      value: 5,
      nested: { values: [5] },
    })
  })

  test('rejects a staged transition made stale by another publication', () => {
    const engine = new TransactionalSimulationEngine(
      { value: 1, nested: { values: [] } },
      definition(),
    )
    const listener = vi.fn()
    engine.subscribe(listener)
    const staged = engine.stageDispatch({
      expectedRevision: 0,
      command: { kind: 'add', amount: 4 },
    })
    if (!(staged.accepted && staged.changed && 'staged' in staged)) {
      throw new Error('Expected a staged transition.')
    }

    expect(engine.dispatch({
      expectedRevision: 0,
      command: { kind: 'add', amount: 1 },
    })).toMatchObject({
      accepted: true,
      changed: true,
      revision: 1,
    })
    expect(engine.publish(staged.staged)).toMatchObject({
      accepted: false,
      code: 'SIM-STALE-REVISION',
      revision: 1,
    })
    expect(engine.snapshot().state).toEqual({
      value: 2,
      nested: { values: [2] },
    })
    expect(listener).toHaveBeenCalledOnce()
  })

  test('discards a mutated candidate reported as a no-op', () => {
    const engine = new TransactionalSimulationEngine(
      { value: 1, nested: { values: [] } },
      definition(),
    )
    expect(engine.dispatch({
      expectedRevision: 0,
      command: { kind: 'add', amount: 0 },
    })).toEqual({
      accepted: true,
      changed: false,
      revision: 0,
    })
    expect(engine.snapshot().state).toEqual({
      value: 1,
      nested: { values: [] },
    })
  })
})
