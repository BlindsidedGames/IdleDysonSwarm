import { describe, expect, test } from 'vitest'
import type {
  CanonicalCoordinatedPlayerResult,
} from '../../application/canonicalLifecycleCoordinator'
import type { FrontendApplicationSnapshot } from '../../application/frontendSnapshot'
import type { DeepReadonly } from '../../core/contracts'
import { RevisionedPlayerCommandDispatcher } from './playerCommandDispatcher'

describe('revisioned player command dispatcher', () => {
  test('captures activation revisions once and never retries an overlapping stale command', async () => {
    const envelopes: Array<{
      readonly sessionRevision: number
      readonly expectedStateRevision: number
      readonly command: { readonly kind: string }
    }> = []
    const gates = [
      deferred<CanonicalCoordinatedPlayerResult>(),
      deferred<CanonicalCoordinatedPlayerResult>(),
    ]
    let publications = 0
    const dispatcher = new RevisionedPlayerCommandDispatcher({
      latestSnapshot: () => readySnapshot(4, 9),
      dispatch: (envelope) => {
        const index = envelopes.length
        envelopes.push(envelope)
        return gates[index]!.promise
      },
      serialize: (operation) => operation(),
      publishSnapshot: () => {
        publications += 1
      },
      isCurrent: () => true,
      cancelRequested: () => false,
    })

    const first = dispatcher.dispatch({
      kind: 'tinker.start',
      repeat: false,
    })
    const second = dispatcher.dispatch({
      kind: 'tinker.start',
      repeat: false,
    })
    expect(envelopes).toHaveLength(2)
    expect(envelopes.map((envelope) => ({
      session: envelope.sessionRevision,
      state: envelope.expectedStateRevision,
    }))).toEqual([
      { session: 4, state: 9 },
      { session: 4, state: 9 },
    ])
    expect(Object.isFrozen(envelopes[0])).toBe(true)
    expect(Object.isFrozen(envelopes[0]?.command)).toBe(true)

    gates[0]?.resolve(acceptedTransition(10))
    gates[1]?.resolve(rejectedTransition(
      'SIM-STALE-REVISION',
      'Expected revision 9 but current revision is 10.',
      10,
    ))

    await expect(first).resolves.toMatchObject({
      status: 'accepted',
      changed: true,
      stateRevision: 10,
      activationRevision: { session: 4, state: 9 },
    })
    await expect(second).resolves.toMatchObject({
      status: 'rejected',
      code: 'SIM-STALE-REVISION',
      stale: true,
      stateRevision: 10,
    })
    expect(publications).toBe(1)
  })

  test('captures safety reconciliation after previously admitted lifecycle work', async () => {
    let stateRevision = 9
    let lane = Promise.resolve()
    const blocker = deferred<void>()
    const envelopes: Array<{
      readonly expectedStateRevision: number
    }> = []
    const serialize = <T>(
      operation: () => Promise<T>,
    ): Promise<T> => {
      const result = lane.then(operation)
      lane = result.then(
        () => undefined,
        () => undefined,
      )
      return result
    }
    const admitted = serialize(async () => {
      await blocker.promise
      stateRevision = 10
    })
    const dispatcher = new RevisionedPlayerCommandDispatcher({
      latestSnapshot: () => readySnapshot(4, stateRevision),
      dispatch: async (envelope) => {
        envelopes.push(envelope)
        return acceptedTransition(11)
      },
      serialize,
      publishSnapshot: () => undefined,
      isCurrent: () => true,
      cancelRequested: () => false,
    })

    const reconciliation = dispatcher.dispatchLatest({
      kind: 'tinker.set-repeat',
      enabled: false,
    })
    expect(envelopes).toHaveLength(0)

    blocker.resolve()
    await admitted
    await expect(reconciliation).resolves.toMatchObject({
      status: 'accepted',
      activationRevision: { session: 4, state: 10 },
      stateRevision: 11,
    })
    expect(envelopes[0]?.expectedStateRevision).toBe(10)
  })

  test('contains invalid commands, thrown dispatches, and late-owner results without publication', async () => {
    let dispatches = 0
    let current = true
    let publications = 0
    const dispatcher = new RevisionedPlayerCommandDispatcher({
      latestSnapshot: () => readySnapshot(1, 0),
      dispatch: async () => {
        dispatches += 1
        if (dispatches === 1) throw new Error('scripted failure')
        current = false
        return acceptedTransition(1)
      },
      serialize: (operation) => operation(),
      publishSnapshot: () => {
        publications += 1
      },
      isCurrent: () => current,
      cancelRequested: () => !current,
    })

    await expect(
      dispatcher.dispatch({ kind: 'unknown-command' } as never),
    ).resolves.toMatchObject({
      status: 'failed',
      code: 'RUNTIME-PLAYER-COMMAND-INVALID',
      retryable: false,
    })
    expect(dispatches).toBe(0)

    await expect(
      dispatcher.dispatch({
        kind: 'tinker.start',
        repeat: false,
      }),
    ).resolves.toMatchObject({
      status: 'failed',
      code: 'RUNTIME-PLAYER-DISPATCH-FAILED',
      retryable: false,
    })
    await expect(
      dispatcher.dispatch({
        kind: 'tinker.start',
        repeat: false,
      }),
    ).resolves.toMatchObject({
      status: 'failed',
      code: 'RUNTIME-PLAYER-AUTHORITY-LOST',
      retryable: false,
    })
    expect(publications).toBe(0)
  })

  test('fails without dispatch when no ready frontend snapshot exists', async () => {
    let dispatches = 0
    const dispatcher = new RevisionedPlayerCommandDispatcher({
      latestSnapshot: () => ({
        version: 1,
        phase: 'starting',
      }),
      dispatch: async () => {
        dispatches += 1
        return acceptedTransition(1)
      },
      serialize: (operation) => operation(),
      publishSnapshot: () => undefined,
      isCurrent: () => true,
      cancelRequested: () => false,
    })

    await expect(
      dispatcher.dispatch({
        kind: 'tinker.start',
        repeat: false,
      }),
    ).resolves.toMatchObject({
      status: 'failed',
      code: 'RUNTIME-PLAYER-NOT-READY',
    })
    expect(dispatches).toBe(0)
  })
})

function readySnapshot(
  session: number,
  state: number,
): DeepReadonly<FrontendApplicationSnapshot> {
  return {
    version: 1,
    phase: 'ready',
    source: 'primary',
    revision: { session, state, durable: state },
    checkpoint: { kind: 'clean', durableRevision: state },
    operation: 'none',
    gameplay: {},
  } as unknown as DeepReadonly<FrontendApplicationSnapshot>
}

function acceptedTransition(
  revision: number,
): CanonicalCoordinatedPlayerResult {
  return {
    kind: 'transition',
    transition: {
      accepted: true,
      changed: true,
      revision,
    },
  }
}

function rejectedTransition(
  code: string,
  reason: string,
  revision: number,
): CanonicalCoordinatedPlayerResult {
  return {
    kind: 'transition',
    transition: {
      accepted: false,
      code,
      reason,
      revision,
    },
  }
}

function deferred<T>(): {
  readonly promise: Promise<T>
  resolve(value: T): void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}
