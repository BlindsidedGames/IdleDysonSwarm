import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import type { LifecycleAdapter, LifecyclePhase } from '../platform/contracts'
import { prepareIdb1Save } from '../save/prepare'
import {
  evaluateCanonicalBotCapCheckpoint,
  FINITE_BOT_CAP,
  type BotCapCheckpointName,
} from '../simulation/canonicalBotCapCheckpoint'
import {
  DESKTOP_LIFECYCLE_POLICY,
  MOBILE_LIFECYCLE_POLICY,
} from '../simulation/lifecycleAwayTime'
import type {
  ApplicationCommandEnvelope,
  ApplicationSnapshot,
  CommitFirstResult,
  ImportSaveRequest,
  ImportSaveResult,
} from './contracts'
import type {
  CanonicalActiveAdvanceResult,
  CanonicalPlayerCommand,
  CanonicalPlayerDispatchResult,
  CanonicalStoredTimeCommitResult,
} from './canonicalGameApplication'
import {
  CanonicalLifecycleCoordinator,
  CanonicalLifecycleCoordinatorClosedError,
  type CanonicalLifecycleApplicationPort,
  type CanonicalLifecycleClock,
} from './canonicalLifecycleCoordinator'
import {
  CanonicalRuntimeSession,
  cloneCanonicalRuntimeState,
  type CanonicalRuntimeState,
} from './canonicalRuntimeSession'

const fixtureUrl = new URL(
  '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
  import.meta.url,
)

describe('canonical lifecycle coordinator', () => {
  test('cold-start replay atomically consumes the timestamp and credits both returned-time banks', async () => {
    const runtime = fixtureRuntime()
    runtime.gameState = {
      ...runtime.gameState,
      timeline: {
        ...runtime.gameState.timeline,
        lastSuspendedAtLegacyText: '2026-07-29T00:00:00Z',
        storedTimeAvailableSeconds: 0,
        storedTimeCapacitySeconds: 100,
        doubleTime: {
          ...runtime.gameState.timeline.doubleTime,
          bankSeconds: 0,
        },
      },
    }
    const application = new FakeCanonicalApplication(runtime)
    const lifecycle = new FakeLifecycleAdapter()
    const coordinator = new CanonicalLifecycleCoordinator({
      application,
      lifecycle,
      clock: fixedClock('2026-07-29T00:00:10Z'),
      policy: MOBILE_LIFECYCLE_POLICY,
    })

    const result = await coordinator.start()

    expect(result).toMatchObject({
      replayed: true,
      committed: true,
      grantedSeconds: 10,
      storedTimeCreditedSeconds: 10,
      timestampConsumed: true,
    })
    const state = readyState(application.snapshot())
    expect(state.gameState.timeline.lastSuspendedAtLegacyText).toBeNull()
    expect(state.gameState.timeline.storedTimeAvailableSeconds).toBe(10)
    expect(state.gameState.timeline.doubleTime.bankSeconds).toBe(20)
    expect(application.awayCommits).toBe(1)
    expect(lifecycle.listenerCount).toBe(1)
  })

  test('serializes mobile background saves and focus-gain replay while desktop focus loss stays inert', async () => {
    const mobileApplication = new FakeCanonicalApplication(
      fixtureRuntimeWithoutQuitTimestamp(),
    )
    const mobileLifecycle = new FakeLifecycleAdapter()
    const clock = mutableClock('2026-07-29T00:00:00Z')
    const mobile = new CanonicalLifecycleCoordinator({
      application: mobileApplication,
      lifecycle: mobileLifecycle,
      clock,
      policy: MOBILE_LIFECYCLE_POLICY,
    })
    await mobile.start()

    const background = await mobile.handlePlatformPhase('background')
    expect(background).toMatchObject({
      requested: true,
      committed: true,
    })
    expect(
      readyState(mobileApplication.snapshot()).gameState.timeline
        .lastSuspendedAtLegacyText,
    ).toBe('2026-07-29T00:00:00Z')

    clock.set('2026-07-29T00:00:05Z')
    const focused = await mobile.handlePlatformPhase('active')
    expect(focused).toMatchObject({
      replayed: true,
      grantedSeconds: 5,
    })
    expect(
      readyState(mobileApplication.snapshot()).gameState.timeline
        .lastSuspendedAtLegacyText,
    ).toBeNull()

    const desktopApplication = new FakeCanonicalApplication(
      fixtureRuntimeWithoutQuitTimestamp(),
    )
    const desktop = new CanonicalLifecycleCoordinator({
      application: desktopApplication,
      lifecycle: new FakeLifecycleAdapter(),
      clock: fixedClock('2026-07-29T00:00:00Z'),
      policy: DESKTOP_LIFECYCLE_POLICY,
    })
    await desktop.start()
    const focusLost = await desktop.handlePlatformPhase('focus-lost')
    expect(focusLost).toEqual({
      requested: false,
      committed: false,
      code: 'not-applicable',
    })
    expect(desktopApplication.awayCommits).toBe(0)
  })

  test('settles pending and reward bot-cap commits before resuming one stored-time intent', async () => {
    const runtime = cappedRuntime()
    const application = new FakeCanonicalApplication(runtime)
    application.playerResult = {
      kind: 'stored-time',
      result: committedStoredTimeResult(
        3,
        2,
        'pending',
        application.revision,
      ),
    }
    application.storedResults.push(
      committedStoredTimeResult(
        2,
        0,
        undefined,
        application.revision + 3,
      ),
    )
    const coordinator = new CanonicalLifecycleCoordinator({
      application,
      lifecycle: new FakeLifecycleAdapter(),
      clock: fixedClock('2026-07-29T00:00:00Z'),
      policy: DESKTOP_LIFECYCLE_POLICY,
    })
    await coordinator.start()
    const snapshot = application.snapshot()
    if (snapshot.phase !== 'ready') throw new Error('Expected ready fake.')

    const result = await coordinator.dispatchPlayer({
      sessionRevision: snapshot.revision.session,
      expectedStateRevision: snapshot.revision.state,
      command: {
        kind: 'time.request-stored-time-spend',
        requestedSeconds: 5,
      },
    })

    expect(result.kind).toBe('stored-time')
    if (result.kind !== 'stored-time') return
    expect(result.checkpoints).toEqual(['pending', 'rewards'])
    expect(result.result).toMatchObject({
      status: 'complete',
      admittedSeconds: 5,
      consumedSeconds: 5,
      remainingSeconds: 0,
    })
    expect(application.storedRequests).toEqual([2])
    const settled = readyState(application.snapshot())
    expect(settled.gameState.infinity.botCapRewardsGranted).toBe(true)
  })

  test('settles bot-cap checkpoints and resumes the exact active-time tail', async () => {
    const application = new FakeCanonicalApplication(cappedRuntime())
    application.activeResults.push(
      activeResult(60, 40, 'pending', application.revision),
      activeResult(40, 0, undefined, application.revision + 3),
    )
    const coordinator = new CanonicalLifecycleCoordinator({
      application,
      lifecycle: new FakeLifecycleAdapter(),
      clock: fixedClock('2026-07-29T00:00:00Z'),
      policy: DESKTOP_LIFECYCLE_POLICY,
    })
    await coordinator.start()

    const result = await coordinator.advanceActive(100)

    expect(result).toMatchObject({
      requestedMilliseconds: 100,
      consumedMilliseconds: 100,
      remainingMilliseconds: 0,
      checkpoints: ['pending', 'rewards'],
      transition: { accepted: true },
    })
    expect(application.activeRequests).toEqual([100, 40])
  })

  test('reports already committed stored time as partial when a later checkpoint fails', async () => {
    const application = new FakeCanonicalApplication(cappedRuntime())
    application.failCheckpoint = 'pending'
    application.playerResult = {
      kind: 'stored-time',
      result: committedStoredTimeResult(
        3,
        2,
        'pending',
        application.revision,
      ),
    }
    const coordinator = new CanonicalLifecycleCoordinator({
      application,
      lifecycle: new FakeLifecycleAdapter(),
      clock: fixedClock('2026-07-29T00:00:00Z'),
      policy: DESKTOP_LIFECYCLE_POLICY,
    })
    await coordinator.start()
    const snapshot = application.snapshot()
    if (snapshot.phase !== 'ready') throw new Error('Expected ready fake.')

    const result = await coordinator.dispatchPlayer({
      sessionRevision: snapshot.revision.session,
      expectedStateRevision: snapshot.revision.state,
      command: {
        kind: 'time.request-stored-time-spend',
        requestedSeconds: 5,
      },
    })

    expect(result).toMatchObject({
      kind: 'stored-time',
      checkpoints: [],
      result: {
        status: 'partial',
        admittedSeconds: 5,
        consumedSeconds: 3,
        remainingSeconds: 2,
        code: 'SCRIPTED-CHECKPOINT-FAILURE',
      },
    })
  })

  test('disposal unsubscribes the platform lifecycle source idempotently', async () => {
    const lifecycle = new FakeLifecycleAdapter()
    const coordinator = new CanonicalLifecycleCoordinator({
      application: new FakeCanonicalApplication(
        fixtureRuntimeWithoutQuitTimestamp(),
      ),
      lifecycle,
      clock: fixedClock('2026-07-29T00:00:00Z'),
      policy: DESKTOP_LIFECYCLE_POLICY,
    })
    await coordinator.start()

    coordinator.dispose()
    coordinator.dispose()

    expect(lifecycle.listenerCount).toBe(0)
  })

  test('reports subscription failures without poisoning the serialized queue', async () => {
    const lifecycle = new FakeLifecycleAdapter()
    const application = new FakeCanonicalApplication(
      fixtureRuntimeWithoutQuitTimestamp(),
    )
    let failClock = false
    const failure = new Error('scripted lifecycle clock failure')
    const failures: {
      readonly phase: LifecyclePhase
      readonly error: unknown
    }[] = []
    const coordinator = new CanonicalLifecycleCoordinator({
      application,
      lifecycle,
      clock: {
        sample: () => {
          if (failClock) throw failure
          return fixedClock('2026-07-29T00:00:00Z').sample()
        },
      },
      policy: MOBILE_LIFECYCLE_POLICY,
      onLifecycleFailure: (reported) => {
        failures.push(reported)
      },
    })
    await coordinator.start()

    failClock = true
    lifecycle.emit('background')
    await waitUntil(() => failures.length === 1)

    expect(failures).toEqual([
      { phase: 'background', error: failure },
    ])

    failClock = false
    const recovered =
      await coordinator.handlePlatformPhase('background')
    expect(recovered).toMatchObject({
      requested: true,
      committed: true,
    })
  })

  test('supports externally fenced lifecycle routing without subscribing to the raw source', async () => {
    const lifecycle = new FakeLifecycleAdapter()
    const application = new FakeCanonicalApplication(
      fixtureRuntimeWithoutQuitTimestamp(),
    )
    const coordinator = new CanonicalLifecycleCoordinator({
      application,
      lifecycle,
      clock: fixedClock('2026-07-29T00:00:00Z'),
      policy: MOBILE_LIFECYCLE_POLICY,
      subscribeToLifecycle: false,
    })

    await coordinator.start()
    expect(lifecycle.listenerCount).toBe(0)
    await expect(
      coordinator.handlePlatformPhase('background'),
    ).resolves.toMatchObject({
      requested: true,
      committed: true,
    })
  })

  test('shutdown synchronously closes admission and drains an accepted lifecycle commit', async () => {
    const lifecycle = new FakeLifecycleAdapter()
    const application = new FakeCanonicalApplication(
      fixtureRuntimeWithoutQuitTimestamp(),
    )
    const commit = deferred<void>()
    application.awayCommitGate = commit.promise
    const coordinator = new CanonicalLifecycleCoordinator({
      application,
      lifecycle,
      clock: fixedClock('2026-07-29T00:00:00Z'),
      policy: MOBILE_LIFECYCLE_POLICY,
    })
    await coordinator.start()

    const accepted =
      coordinator.handlePlatformPhase('background')
    const shutdown = coordinator.shutdown()

    expect(lifecycle.listenerCount).toBe(0)
    await expect(
      coordinator.handlePlatformPhase('active'),
    ).rejects.toBeInstanceOf(
      CanonicalLifecycleCoordinatorClosedError,
    )
    let shutdownSettled = false
    void shutdown.then(() => {
      shutdownSettled = true
    })
    await Promise.resolve()
    expect(shutdownSettled).toBe(false)

    commit.resolve()
    await expect(accepted).resolves.toMatchObject({
      requested: true,
      committed: true,
    })
    await shutdown
    expect(application.awayCommits).toBe(1)
  })

  test('suppresses imported baselines until a successful local timestamp commit', async () => {
    const application = new FakeCanonicalApplication(
      fixtureRuntimeWithoutQuitTimestamp(),
    )
    const imported = fixtureRuntimeWithoutQuitTimestamp()
    imported.gameState.timeline.lastSuspendedAtLegacyText =
      '2026-07-29T00:00:00Z'
    application.importedState = imported
    const clock = mutableClock('2026-07-29T00:00:10Z')
    const coordinator = new CanonicalLifecycleCoordinator({
      application,
      lifecycle: new FakeLifecycleAdapter(),
      clock,
      policy: DESKTOP_LIFECYCLE_POLICY,
    })
    await coordinator.start()

    const first = await coordinator.importSave({
      text: 'validated-by-application-port',
      importedAtUtc: '2026-07-29T00:00:10Z',
      overwriteApproved: true,
    })
    const firstActive =
      await coordinator.handlePlatformPhase('active')
    const second = await coordinator.importSave({
      text: 'same-validated-import',
      importedAtUtc: '2026-07-29T00:00:10Z',
      overwriteApproved: true,
    })
    const secondActive =
      await coordinator.handlePlatformPhase('active')

    expect(first).toEqual({
      imported: true,
      committed: true,
      sessionRevision: 2,
      lifecycleReset: true,
    })
    expect(second).toEqual({
      imported: true,
      committed: true,
      sessionRevision: 3,
      lifecycleReset: true,
    })
    expect(firstActive).toEqual({
      replayed: false,
      committed: false,
      code: 'import-baseline-suppressed',
    })
    expect(secondActive).toEqual(firstActive)
    expect(application.importRequests).toHaveLength(2)
    expect(application.awayCommits).toBe(0)
    expect(clock.samples).toBe(1)
    expect(
      readyState(application.snapshot()).gameState.timeline
        .lastSuspendedAtLegacyText,
    ).toBe('2026-07-29T00:00:00Z')

    await expect(
      coordinator.handlePlatformPhase('background'),
    ).resolves.toEqual({
      requested: false,
      committed: false,
      code: 'not-applicable',
    })
    await expect(
      coordinator.handlePlatformPhase('active'),
    ).resolves.toEqual(firstActive)
    expect(clock.samples).toBe(2)

    application.failAwayCommit = true
    clock.set('2026-07-29T00:00:20Z')
    await expect(
      coordinator.handlePlatformPhase('terminating'),
    ).resolves.toMatchObject({
      requested: true,
      committed: false,
      code: 'commit-failed',
    })
    clock.set('2026-07-29T00:00:25Z')
    await expect(
      coordinator.handlePlatformPhase('active'),
    ).resolves.toEqual(firstActive)
    expect(clock.samples).toBe(3)

    application.failAwayCommit = false
    clock.set('2026-07-29T00:00:30Z')
    await expect(
      coordinator.handlePlatformPhase('terminating'),
    ).resolves.toMatchObject({
      requested: true,
      committed: true,
    })
    expect(
      readyState(application.snapshot()).gameState.timeline
        .lastSuspendedAtLegacyText,
    ).toBe('2026-07-29T00:00:30Z')

    clock.set('2026-07-29T00:00:35Z')
    await expect(
      coordinator.handlePlatformPhase('active'),
    ).resolves.toMatchObject({
      replayed: true,
      committed: true,
      grantedSeconds: 5,
      timestampConsumed: true,
    })
    expect(application.awayCommitAttempts).toBe(3)
    expect(application.awayCommits).toBe(2)
    expect(
      readyState(application.snapshot()).gameState.timeline
        .lastSuspendedAtLegacyText,
    ).toBeNull()
  })

  test('returns an application import rejection without replaying or replacing lifecycle state', async () => {
    const application = new FakeCanonicalApplication(
      fixtureRuntimeWithoutQuitTimestamp(),
    )
    application.importResult = {
      imported: false,
      committed: false,
      code: 'APP-IMPORT-INVALID',
      reason: 'scripted invalid import',
    }
    const coordinator = new CanonicalLifecycleCoordinator({
      application,
      lifecycle: new FakeLifecycleAdapter(),
      clock: fixedClock('2026-07-29T00:00:10Z'),
      policy: MOBILE_LIFECYCLE_POLICY,
    })
    await coordinator.start()

    await expect(
      coordinator.importSave({
        text: 'invalid',
        importedAtUtc: '2026-07-29T00:00:10Z',
        overwriteApproved: true,
      }),
    ).resolves.toEqual(application.importResult)
    expect(application.awayCommits).toBe(0)
  })
})

class FakeCanonicalApplication
  implements CanonicalLifecycleApplicationPort
{
  private state: CanonicalRuntimeState
  revision = 0
  durableRevision: number | null = 0
  sessionRevision = 1
  readonly activeResults: CanonicalActiveAdvanceResult[] = []
  readonly storedResults: CanonicalStoredTimeCommitResult[] = []
  readonly activeRequests: number[] = []
  readonly storedRequests: number[] = []
  awayCommitAttempts = 0
  awayCommits = 0
  awayCommitGate: Promise<void> | undefined
  failAwayCommit = false
  importedState: CanonicalRuntimeState | undefined
  importResult: ImportSaveResult | undefined
  readonly importRequests: ImportSaveRequest[] = []
  failCheckpoint: BotCapCheckpointName | undefined
  playerResult: CanonicalPlayerDispatchResult = {
    kind: 'transition',
    transition: {
      accepted: true,
      changed: false,
      revision: 0,
    },
  }

  constructor(state: CanonicalRuntimeState) {
    this.state = cloneCanonicalRuntimeState(state)
  }

  snapshot(): ApplicationSnapshot<CanonicalRuntimeState> {
    return {
      version: 1,
      phase: 'ready',
      source: 'primary',
      revision: {
        session: this.sessionRevision,
        state: this.revision,
        durable: this.durableRevision,
      },
      checkpoint:
        this.durableRevision === this.revision
          ? { kind: 'clean', durableRevision: this.revision }
          : {
              kind: 'dirty',
              durableRevision: this.durableRevision,
              reason: 'state-changed',
            },
      operation: 'none',
      state: cloneCanonicalRuntimeState(this.state),
    }
  }

  async start(): Promise<ApplicationSnapshot<CanonicalRuntimeState>> {
    return this.snapshot()
  }

  advanceActiveWithContinuation(
    milliseconds: number,
  ): CanonicalActiveAdvanceResult {
    this.activeRequests.push(milliseconds)
    const result = this.activeResults.shift()
    if (result === undefined) return activeResult(milliseconds, 0, undefined, this.revision)
    this.revision += 1
    return {
      ...result,
      transition: {
        ...result.transition,
        revision: this.revision,
      },
    }
  }

  async dispatchPlayer(
    _envelope: ApplicationCommandEnvelope<CanonicalPlayerCommand>,
  ): Promise<CanonicalPlayerDispatchResult> {
    return this.playerResult
  }

  async commitStoredTime(
    _envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    seconds: number,
  ): Promise<CanonicalStoredTimeCommitResult> {
    this.storedRequests.push(seconds)
    const result = this.storedResults.shift()
    if (result === undefined) {
      throw new Error('No stored-time result was scripted.')
    }
    if (result.committed) {
      this.revision += 1
      this.durableRevision = this.revision
    }
    return result
  }

  async commitAwayReplacement(
    _envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    state: Readonly<CanonicalRuntimeState>,
  ): Promise<CommitFirstResult> {
    this.awayCommitAttempts += 1
    await this.awayCommitGate
    if (this.failAwayCommit) {
      return {
        committed: false,
        transition: {
          accepted: false,
          code: 'SCRIPTED-AWAY-COMMIT-FAILURE',
          reason: 'Scripted away replacement failure.',
          revision: this.revision,
        },
        code: 'SCRIPTED-AWAY-COMMIT-FAILURE',
        reason: 'Scripted away replacement failure.',
      }
    }
    this.state = cloneCanonicalRuntimeState(state)
    this.awayCommits += 1
    this.revision += 1
    this.durableRevision = this.revision
    return committedTransition(this.revision)
  }

  async importSave(
    request: ImportSaveRequest,
  ): Promise<ImportSaveResult> {
    this.importRequests.push(request)
    if (this.importResult !== undefined) return this.importResult
    if (this.importedState === undefined) {
      return {
        imported: false,
        committed: false,
        code: 'APP-IMPORT-INVALID',
        reason: 'No scripted imported state.',
      }
    }
    this.state = cloneCanonicalRuntimeState(this.importedState)
    this.sessionRevision += 1
    this.revision = 0
    this.durableRevision = 0
    return {
      imported: true,
      sessionRevision: this.sessionRevision,
    }
  }

  async commitBotCapCheckpoint(
    _envelope: Pick<
      ApplicationCommandEnvelope<unknown>,
      'sessionRevision' | 'expectedStateRevision'
    >,
    checkpoint: BotCapCheckpointName,
  ): Promise<CommitFirstResult> {
    if (checkpoint === this.failCheckpoint) {
      return {
        committed: false,
        transition: {
          accepted: false,
          code: 'SCRIPTED-CHECKPOINT-FAILURE',
          reason: 'The scripted checkpoint commit failed.',
          revision: this.revision,
        },
        code: 'SCRIPTED-CHECKPOINT-FAILURE',
        reason: 'The scripted checkpoint commit failed.',
      }
    }
    const evaluated = evaluateCanonicalBotCapCheckpoint(
      this.state.gameState,
    )
    if (
      evaluated.action.kind !== 'persist' ||
      evaluated.action.checkpoint !== checkpoint
    ) {
      return {
        committed: false,
        transition: {
          accepted: false,
          code: 'CHECKPOINT-MISMATCH',
          reason: 'The scripted checkpoint was not required.',
          revision: this.revision,
        },
      }
    }
    this.state.gameState = evaluated.candidateState
    this.revision += 1
    this.durableRevision = this.revision
    return committedTransition(this.revision)
  }
}

class FakeLifecycleAdapter implements LifecycleAdapter {
  private readonly listeners = new Set<(phase: LifecyclePhase) => void>()

  get listenerCount(): number {
    return this.listeners.size
  }

  emit(phase: LifecyclePhase): void {
    for (const listener of [...this.listeners]) listener(phase)
  }

  subscribe(listener: (phase: LifecyclePhase) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

function deferred<T>(): {
  readonly promise: Promise<T>
  resolve(value: T | PromiseLike<T>): void
} {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let pass = 0; pass < 20; pass += 1) {
    if (predicate()) return
    await Promise.resolve()
  }
  throw new Error('Timed out waiting for lifecycle failure.')
}

function fixtureRuntime(): CanonicalRuntimeState {
  const prepared = prepareIdb1Save(
    readFileSync(fixtureUrl, 'utf8'),
  ).prepared
  return cloneCanonicalRuntimeState(
    new CanonicalRuntimeSession(prepared, {
      entitlements: { permanentDoubleIp: false },
    }).initialState,
  )
}

function fixtureRuntimeWithoutQuitTimestamp(): CanonicalRuntimeState {
  const runtime = fixtureRuntime()
  runtime.gameState = {
    ...runtime.gameState,
    timeline: {
      ...runtime.gameState.timeline,
      lastSuspendedAtLegacyText: null,
    },
  }
  return runtime
}

function cappedRuntime(): CanonicalRuntimeState {
  const runtime = fixtureRuntimeWithoutQuitTimestamp()
  runtime.gameState = {
    ...runtime.gameState,
    dyson: {
      ...runtime.gameState.dyson,
      bots: FINITE_BOT_CAP,
    },
    infinity: {
      ...runtime.gameState.infinity,
      botCapTransitionPending: false,
      botCapRewardsGranted: false,
      inProgress: false,
    },
  }
  return runtime
}

function readyState(
  snapshot: ApplicationSnapshot<CanonicalRuntimeState>,
): CanonicalRuntimeState {
  if (snapshot.phase !== 'ready') throw new Error('Expected ready snapshot.')
  return cloneCanonicalRuntimeState(
    snapshot.state as CanonicalRuntimeState,
  )
}

function fixedClock(iso: string): CanonicalLifecycleClock {
  const milliseconds = Date.parse(iso)
  return {
    sample: () => ({
      utcMilliseconds: milliseconds,
      serializedUtcText: iso,
    }),
  }
}

function mutableClock(initialIso: string): CanonicalLifecycleClock & {
  readonly samples: number
  set(iso: string): void
} {
  let iso = initialIso
  let samples = 0
  return {
    get samples() {
      return samples
    },
    sample: () => {
      samples += 1
      return {
        utcMilliseconds: Date.parse(iso),
        serializedUtcText: iso,
      }
    },
    set: (next) => {
      iso = next
    },
  }
}

function committedTransition(revision: number): CommitFirstResult {
  return {
    committed: true,
    transition: {
      accepted: true,
      changed: true,
      revision,
    },
    durableRevision: revision,
  }
}

function committedStoredTimeResult(
  consumedSeconds: number,
  remainingSeconds: number,
  checkpoint: BotCapCheckpointName | undefined,
  revision: number,
): CanonicalStoredTimeCommitResult {
  return {
    committed: true,
    transition: {
      accepted: true,
      changed: true,
      revision,
    },
    durableRevision: revision,
    consumedSeconds,
    remainingSeconds,
    continuation:
      checkpoint === undefined
        ? { kind: 'complete' }
        : {
            kind: 'bot-cap-persistence-required',
            checkpoint,
          },
  }
}

function activeResult(
  consumedMilliseconds: number,
  remainingMilliseconds: number,
  checkpoint: BotCapCheckpointName | undefined,
  revision: number,
): CanonicalActiveAdvanceResult {
  return {
    transition: {
      accepted: true,
      changed: consumedMilliseconds > 0,
      revision,
    },
    consumedMilliseconds,
    remainingMilliseconds,
    continuation:
      checkpoint === undefined
        ? { kind: 'complete' }
        : {
            kind: 'bot-cap-persistence-required',
            checkpoint,
          },
  }
}
