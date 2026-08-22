import { describe, expect, test } from 'vitest'
import type {
  CanonicalCoordinatedPlayerResult,
} from '../../application/canonicalLifecycleCoordinator'
import type { FrontendApplicationSnapshot } from '../../application/frontendSnapshot'
import type { DeepReadonly } from '../../core/contracts'
import { RevisionedPlayerCommandDispatcher } from './playerCommandDispatcher'

describe('revisioned player command dispatcher', () => {
  test('admits overlapping ordinary commands once each against execution-time state', async () => {
    const envelopes: Array<{
      readonly sessionRevision: number
      readonly expectedStateRevision: number
      readonly command: { readonly kind: string }
    }> = []
    const firstGate = deferred<void>()
    let stateRevision = 9
    const serialize = createSerializer()
    let publications = 0
    const dispatcher = new RevisionedPlayerCommandDispatcher({
      latestSnapshot: () => readySnapshot(4, stateRevision),
      dispatch: async (envelope) => {
        envelopes.push(envelope)
        if (envelopes.length === 1) await firstGate.promise
        stateRevision += 1
        return acceptedTransition(stateRevision)
      },
      serialize,
      publishSnapshot: () => {
        publications += 1
      },
      isCurrent: () => true,
      cancelRequested: () => false,
    })

    const first = dispatcher.dispatch({
      kind: 'dyson.purchase-basic-facility',
      facilityId: 'assembly_lines',
    })
    const second = dispatcher.dispatch({
      kind: 'dyson.purchase-basic-facility',
      facilityId: 'assembly_lines',
    })
    await Promise.resolve()
    expect(envelopes).toHaveLength(1)
    firstGate.resolve()

    await expect(first).resolves.toMatchObject({
      status: 'accepted',
      changed: true,
      stateRevision: 10,
      activationRevision: { session: 4, state: 9 },
    })
    await expect(second).resolves.toMatchObject({
      status: 'accepted',
      changed: true,
      stateRevision: 11,
      activationRevision: { session: 4, state: 9 },
    })
    expect(envelopes.map((envelope) => ({
      session: envelope.sessionRevision,
      state: envelope.expectedStateRevision,
    }))).toEqual([
      { session: 4, state: 9 },
      { session: 4, state: 10 },
    ])
    expect(Object.isFrozen(envelopes[0])).toBe(true)
    expect(Object.isFrozen(envelopes[0]?.command)).toBe(true)
    expect(publications).toBe(2)
  })

  test('captures ordinary command state after previously admitted lifecycle work', async () => {
    let stateRevision = 9
    const blocker = deferred<void>()
    const envelopes: Array<{
      readonly expectedStateRevision: number
    }> = []
    const serialize = createSerializer()
    const admitted = serialize(async () => {
      await blocker.promise
      stateRevision = 10
    })
    const dispatcher = new RevisionedPlayerCommandDispatcher({
      latestSnapshot: () => readySnapshot(4, stateRevision),
      dispatch: async (envelope) => {
        envelopes.push(envelope)
        stateRevision = 11
        return acceptedTransition(11)
      },
      serialize,
      publishSnapshot: () => undefined,
      isCurrent: () => true,
      cancelRequested: () => false,
    })

    const command = dispatcher.dispatch({
      kind: 'research.purchase',
      researchId: 'startHereTree',
    })
    expect(envelopes).toHaveLength(0)

    blocker.resolve()
    await admitted
    await expect(command).resolves.toMatchObject({
      status: 'accepted',
      activationRevision: { session: 4, state: 9 },
      stateRevision: 11,
    })
    expect(envelopes[0]?.expectedStateRevision).toBe(10)
  })

  test('rejects a second stored-time request before the authority queue and releases admission after settlement', async () => {
    const firstGate = deferred<void>()
    let dispatches = 0
    const dispatcher = new RevisionedPlayerCommandDispatcher({
      latestSnapshot: () => readySnapshot(4, 9),
      dispatch: async () => {
        dispatches += 1
        if (dispatches === 1) await firstGate.promise
        return acceptedStoredTime(9)
      },
      serialize: createSerializer(),
      publishSnapshot: () => undefined,
      isCurrent: () => true,
      cancelRequested: () => false,
    })
    const request = {
      kind: 'time.request-stored-time-spend',
      requestedSeconds: 2,
    } as const

    const first = dispatcher.dispatch(request)
    await Promise.resolve()
    expect(dispatches).toBe(1)

    // A remounted surface reaches this same runtime admission boundary. Its
    // fresh component state must not allow it to queue another spend.
    await expect(dispatcher.dispatch(request)).resolves.toMatchObject({
      status: 'rejected',
      kind: 'stored-time',
      code: 'CANONICAL-STORED-TIME-JOB-ACTIVE',
      stateRevision: 9,
      activationRevision: { session: 4, state: 9 },
    })
    expect(dispatches).toBe(1)

    firstGate.resolve()
    await expect(first).resolves.toMatchObject({
      status: 'accepted',
      kind: 'stored-time',
    })
    await expect(dispatcher.dispatch(request)).resolves.toMatchObject({
      status: 'accepted',
      kind: 'stored-time',
    })
    expect(dispatches).toBe(2)
  })

  test('releases stored-time admission when authority dispatch throws', async () => {
    let dispatches = 0
    const dispatcher = new RevisionedPlayerCommandDispatcher({
      latestSnapshot: () => readySnapshot(4, 9),
      dispatch: async () => {
        dispatches += 1
        if (dispatches === 1) throw new Error('scripted stored-time failure')
        return acceptedStoredTime(9)
      },
      serialize: createSerializer(),
      publishSnapshot: () => undefined,
      isCurrent: () => true,
      cancelRequested: () => false,
    })
    const request = {
      kind: 'time.request-stored-time-spend',
      requestedSeconds: 2,
    } as const

    await expect(dispatcher.dispatch(request)).resolves.toMatchObject({
      status: 'failed',
      code: 'RUNTIME-PLAYER-DISPATCH-FAILED',
    })
    await expect(dispatcher.dispatch(request)).resolves.toMatchObject({
      status: 'accepted',
      kind: 'stored-time',
    })
    expect(dispatches).toBe(2)
  })

  test('rejects old-session intent locally when a queued replacement wins first', async () => {
    let sessionRevision = 4
    let stateRevision = 9
    const blocker = deferred<void>()
    let dispatches = 0
    const serialize = createSerializer()
    const replacement = serialize(async () => {
      await blocker.promise
      sessionRevision = 5
      stateRevision = 0
    })
    const dispatcher = new RevisionedPlayerCommandDispatcher({
      latestSnapshot: () =>
        readySnapshot(sessionRevision, stateRevision),
      dispatch: async () => {
        dispatches += 1
        return acceptedTransition(1)
      },
      serialize,
      publishSnapshot: () => undefined,
      isCurrent: () => true,
      cancelRequested: () => false,
    })

    const command = dispatcher.dispatch({
      kind: 'dyson.purchase-basic-facility',
      facilityId: 'assembly_lines',
    })
    blocker.resolve()
    await replacement

    await expect(command).resolves.toMatchObject({
      status: 'rejected',
      code: 'APP-STALE-SESSION',
      stale: true,
      stateRevision: 0,
      activationRevision: { session: 4, state: 9 },
    })
    expect(dispatches).toBe(0)
  })

  test('captures safety reconciliation after previously admitted lifecycle work', async () => {
    let stateRevision = 9
    const blocker = deferred<void>()
    const envelopes: Array<{
      readonly expectedStateRevision: number
    }> = []
    const serialize = createSerializer()
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

function acceptedStoredTime(
  revision: number,
): CanonicalCoordinatedPlayerResult {
  return {
    kind: 'stored-time',
    result: {
      status: 'completed',
      admittedSeconds: 2,
      consumedSeconds: 2,
      remainingSeconds: 0,
      durableRevision: revision,
      transition: {
        accepted: true,
        changed: true,
        revision,
      },
    },
  }
}

function createSerializer(): <T>(
  operation: () => Promise<T>,
) => Promise<T> {
  let lane = Promise.resolve()
  return <T>(operation: () => Promise<T>): Promise<T> => {
    const result = lane.then(operation)
    lane = result.then(
      () => undefined,
      () => undefined,
    )
    return result
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
