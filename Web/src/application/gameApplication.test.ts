import { describe, expect, test, vi } from 'vitest'
import type {
  DomainTransition,
  SimulationCommand,
  SimulationEngineDefinition,
} from '../core/contracts'
import { PreparedSave } from '../save/prepare'
import { serializeWebSave } from '../save/serialization'
import type {
  FirstLaunchMigrationResult,
  SaveCommitTarget,
  SaveRepository,
} from '../save/repository'
import { createDeferred, type Deferred } from './deferred.test-helper'
import { TransactionalGameApplication } from './gameApplication'

interface ProbeState {
  value: number
  preference?: boolean
  debugUnlocked?: boolean
  debugEnabled?: boolean
}

type ProbeCommand = SimulationCommand<'add'> & {
  readonly amount: number
  readonly preference?: boolean
  readonly debugUnlocked?: boolean
  readonly debugEnabled?: boolean
}

function prepared(value: number): PreparedSave {
  return PreparedSave.fromDecoded({
    saveVersion: 12,
    applicationProbeValue: value,
  })
}

function importedText(value: number): string {
  return serializeWebSave(prepared(value).copyValidatedState())
}

function engineDefinition(): SimulationEngineDefinition<
  ProbeState,
  ProbeCommand
> {
  return {
    schema: 1,
    cloneState: (state) => ({ ...state }),
    validateState: (state) =>
      Number.isFinite(state.value) ? undefined : 'PROBE-NON-FINITE',
    applyCommand: (candidate, command): DomainTransition => {
      candidate.value += command.amount
      if (command.preference !== undefined) {
        candidate.preference = command.preference
      }
      if (command.debugUnlocked !== undefined) {
        candidate.debugUnlocked = command.debugUnlocked
      }
      if (command.debugEnabled !== undefined) {
        candidate.debugEnabled = command.debugEnabled
      }
      return {
        accepted: true,
        changed:
          command.amount !== 0 ||
          command.preference !== undefined ||
          command.debugUnlocked !== undefined ||
          command.debugEnabled !== undefined,
      }
    },
    advance: (candidate, milliseconds) => {
      candidate.value += milliseconds
      return { accepted: true, changed: milliseconds !== 0 }
    },
  }
}

class RecordingRepository implements SaveRepository {
  readonly commits: PreparedSave[] = []
  readonly targets: SaveCommitTarget[] = []
  readonly commitDeferreds: Deferred<PreparedSave>[] = []
  current: PreparedSave | null = null

  async hasCurrent(): Promise<boolean> {
    return this.current !== null
  }

  async loadCurrent(): Promise<PreparedSave | null> {
    return this.current
  }

  async migrateLegacyOnFirstLaunch(): Promise<FirstLaunchMigrationResult> {
    return this.current
      ? { status: 'already-migrated', save: this.current }
      : { status: 'no-legacy-save' }
  }

  async commit(
    save: PreparedSave,
    target: SaveCommitTarget = 'development',
  ): Promise<PreparedSave> {
    this.commits.push(save)
    this.targets.push(target)
    const deferred = this.commitDeferreds[this.commits.length - 1]
    if (deferred) return deferred.promise
    this.current = save
    return save
  }
}

function sessionFactory(save: PreparedSave) {
  const source = save.copyValidatedState()
  return {
    initialState: {
      value: Number(source.applicationProbeValue ?? 0),
      ...(typeof source.skillsBuyOnTap === 'boolean'
        ? { preference: source.skillsBuyOnTap }
        : {}),
      ...(typeof source.debugEverEnabled === 'boolean'
        ? { debugUnlocked: source.debugEverEnabled }
        : {}),
      ...(typeof source.debugOptions === 'boolean'
        ? { debugEnabled: source.debugOptions }
        : {}),
    },
    prepare: (candidate: ProbeState) => {
      const replacement = save.copyValidatedState()
      replacement.applicationProbeValue = candidate.value
      if (candidate.preference !== undefined) {
        replacement.skillsBuyOnTap = candidate.preference
      }
      if (candidate.debugUnlocked !== undefined) {
        replacement.debugEverEnabled = candidate.debugUnlocked
      }
      if (candidate.debugEnabled !== undefined) {
        replacement.debugOptions = candidate.debugEnabled
      }
      return save.withValidatedState(replacement)
    },
  }
}

function createApplication(
  repository: RecordingRepository,
  startupResolver: () => Promise<PreparedSave>,
) {
  return new TransactionalGameApplication({
    startupResolver: {
      resolve: async () => ({
        kind: 'ready' as const,
        source: 'primary' as const,
        save: await startupResolver(),
      }),
    },
    sessionFactory: { open: sessionFactory },
    engineDefinition: engineDefinition(),
    repository,
  })
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let pass = 0; pass < 20; pass += 1) {
    if (predicate()) return
    await Promise.resolve()
  }
  throw new Error('Timed out waiting for test operation.')
}

describe('transactional game application', () => {
  test('publishes startup exactly once across concurrent start calls', async () => {
    const repository = new RecordingRepository()
    const startup = createDeferred<PreparedSave>()
    const startupResolver = vi.fn(() => startup.promise)
    const application = createApplication(repository, startupResolver)
    const listener = vi.fn()
    application.subscribe(listener)

    const first = application.start()
    const second = application.start()
    expect(startupResolver).toHaveBeenCalledOnce()
    expect(
      listener.mock.calls.filter(([snapshot]) => snapshot.phase === 'ready'),
    ).toHaveLength(0)

    startup.resolve(prepared(7))
    await Promise.all([first, second])

    expect(
      listener.mock.calls.filter(([snapshot]) => snapshot.phase === 'ready'),
    ).toHaveLength(1)
    expect(application.snapshot()).toMatchObject({
      phase: 'ready',
      revision: { session: 1, state: 0, durable: 0 },
      checkpoint: { kind: 'clean', durableRevision: 0 },
      state: { value: 7 },
    })
  })

  test('active commands advance only the state revision', async () => {
    const repository = new RecordingRepository()
    const application = createApplication(repository, async () => prepared(1))
    await application.start()

    expect(application.dispatch({
      sessionRevision: 1,
      expectedStateRevision: 0,
      command: { kind: 'add', amount: 2 },
    })).toMatchObject({ accepted: true, changed: true })

    expect(application.snapshot()).toMatchObject({
      revision: { session: 1, state: 1, durable: 0 },
      checkpoint: { kind: 'dirty', durableRevision: 0 },
      state: { value: 3 },
    })
    expect(repository.commits).toEqual([])
  })

  test('records the committed revision when state changes during checkpoint', async () => {
    const repository = new RecordingRepository()
    const application = createApplication(repository, async () => prepared(0))
    await application.start()
    application.dispatch({
      sessionRevision: 1,
      expectedStateRevision: 0,
      command: { kind: 'add', amount: 1 },
    })

    const checkpoint = createDeferred<PreparedSave>()
    repository.commitDeferreds.push(checkpoint)
    const saving = application.checkpoint()
    await waitUntil(() => repository.commits.length === 1)
    application.dispatch({
      sessionRevision: 1,
      expectedStateRevision: 1,
      command: { kind: 'add', amount: 1 },
    })
    checkpoint.resolve(repository.commits[0]!)
    await saving

    expect(application.snapshot()).toMatchObject({
      revision: { session: 1, state: 2, durable: 1 },
      checkpoint: { kind: 'dirty', durableRevision: 1 },
      state: { value: 2 },
    })
  })

  test('serializes overlapping checkpoints so older state cannot win last', async () => {
    const repository = new RecordingRepository()
    const application = createApplication(repository, async () => prepared(0))
    await application.start()
    application.dispatch({
      sessionRevision: 1,
      expectedStateRevision: 0,
      command: { kind: 'add', amount: 1 },
    })

    const firstCommit = createDeferred<PreparedSave>()
    const secondCommit = createDeferred<PreparedSave>()
    repository.commitDeferreds.push(firstCommit, secondCommit)
    const first = application.checkpoint()
    await waitUntil(() => repository.commits.length === 1)
    application.dispatch({
      sessionRevision: 1,
      expectedStateRevision: 1,
      command: { kind: 'add', amount: 1 },
    })
    const second = application.checkpoint()
    expect(repository.commits).toHaveLength(1)

    firstCommit.resolve(repository.commits[0]!)
    await first
    await waitUntil(() => repository.commits.length === 2)
    expect(
      repository.commits.map((save) =>
        Number(save.copyValidatedState().applicationProbeValue),
      ),
    ).toEqual([1, 2])
    secondCommit.resolve(repository.commits[1]!)
    await second

    expect(repository.commits).toHaveLength(2)
    expect(application.snapshot()).toMatchObject({
      revision: { session: 1, state: 2, durable: 2 },
      checkpoint: { kind: 'clean', durableRevision: 2 },
    })
  })

  test('publishes commit-first work only after persistence succeeds', async () => {
    const repository = new RecordingRepository()
    const application = createApplication(repository, async () => prepared(2))
    await application.start()
    const listener = vi.fn()
    application.subscribe(listener)
    const commit = createDeferred<PreparedSave>()
    repository.commitDeferreds.push(commit)

    const operation = application.dispatchCommitFirst(
      {
        sessionRevision: 1,
        expectedStateRevision: 0,
        command: { kind: 'add', amount: 5 },
      },
      'stored-time',
    )
    await waitUntil(() => repository.commits.length === 1)
    expect(application.snapshot()).toMatchObject({
      revision: { session: 1, state: 0, durable: 0 },
      state: { value: 2 },
    })
    expect(
      listener.mock.calls.filter(
        ([snapshot]) =>
          snapshot.phase === 'ready' && snapshot.state.value !== 2,
      ),
    ).toHaveLength(0)

    commit.resolve(repository.commits[0]!)
    await expect(operation).resolves.toMatchObject({
      committed: true,
      transition: { accepted: true, changed: true },
    })
    expect(application.snapshot()).toMatchObject({
      revision: { session: 1, state: 1, durable: 1 },
      checkpoint: { kind: 'clean', durableRevision: 1 },
      state: { value: 7 },
    })
    expect(
      listener.mock.calls.filter(
        ([snapshot]) =>
          snapshot.phase === 'ready' && snapshot.state.value === 7,
      ),
    ).toHaveLength(1)
  })

  test('discards commit-first work when persistence fails', async () => {
    const repository = new RecordingRepository()
    const application = createApplication(repository, async () => prepared(2))
    await application.start()
    const listener = vi.fn()
    application.subscribe(listener)
    const commit = createDeferred<PreparedSave>()
    repository.commitDeferreds.push(commit)

    const operation = application.dispatchCommitFirst(
      {
        sessionRevision: 1,
        expectedStateRevision: 0,
        command: { kind: 'add', amount: 5 },
      },
      'stored-time',
    )
    await waitUntil(() => repository.commits.length === 1)
    commit.reject(new Error('disk full'))
    await expect(operation).resolves.toMatchObject({
      committed: false,
      code: 'APP-COMMIT-FIRST-FAILED',
      reason: 'disk full',
    })
    expect(application.snapshot()).toMatchObject({
      revision: { session: 1, state: 0, durable: 0 },
      checkpoint: { kind: 'clean', durableRevision: 0 },
      state: { value: 2 },
    })
    expect(
      listener.mock.calls.filter(
        ([snapshot]) =>
          snapshot.phase === 'ready' && snapshot.state.value !== 2,
      ),
    ).toHaveLength(0)
  })

  test('blocks rather than resuming stale state after a committed save cannot reopen', async () => {
    const repository = new RecordingRepository()
    let openCount = 0
    const application = new TransactionalGameApplication({
      startupResolver: {
        resolve: async () => ({
          kind: 'ready',
          source: 'primary',
          save: prepared(2),
        }),
      },
      sessionFactory: {
        open: (save) => {
          openCount += 1
          if (openCount > 1) throw new Error('reload failed')
          return sessionFactory(save)
        },
      },
      engineDefinition: engineDefinition(),
      repository,
    })
    await application.start()

    await expect(application.dispatchCommitFirst(
      {
        sessionRevision: 1,
        expectedStateRevision: 0,
        command: { kind: 'add', amount: 5 },
      },
      'stored-time',
    )).resolves.toMatchObject({
      committed: false,
      code: 'APP-POST-COMMIT-RELOAD',
    })
    expect(repository.commits).toHaveLength(1)
    expect(application.snapshot()).toMatchObject({
      phase: 'blocked',
      outcome: 'post-commit-reload-failed',
      error: 'reload failed',
    })
  })

  test('denies import overwrite without changing the current application', async () => {
    const repository = new RecordingRepository()
    repository.current = prepared(2)
    const application = createApplication(
      repository,
      async () => repository.current!,
    )
    await application.start()
    const before = application.snapshot()

    await expect(application.importSave({
      text: importedText(9),
      importedAtUtc: '2026-07-29T03:00:00.000Z',
      overwriteApproved: false,
    })).resolves.toEqual({
      imported: false,
      committed: false,
      code: 'APP-IMPORT-OVERWRITE-REQUIRED',
      reason: 'Import requires explicit approval to replace the current save.',
    })
    expect(application.snapshot()).toBe(before)
    expect(repository.commits).toEqual([])
  })

  test('preserves the exact current state when import validation fails', async () => {
    const repository = new RecordingRepository()
    repository.current = prepared(2)
    const application = createApplication(
      repository,
      async () => repository.current!,
    )
    await application.start()
    application.dispatch({
      sessionRevision: 1,
      expectedStateRevision: 0,
      command: { kind: 'add', amount: 3 },
    })
    const before = application.snapshot()

    await expect(application.importSave({
      text: '{',
      importedAtUtc: '2026-07-29T03:00:00.000Z',
      overwriteApproved: true,
    })).resolves.toMatchObject({
      imported: false,
      committed: false,
      code: 'APP-IMPORT-INVALID',
    })
    expect(application.snapshot()).toBe(before)
    expect(repository.commits).toEqual([])
  })

  test('preserves the exact current state when import commit fails', async () => {
    const repository = new RecordingRepository()
    repository.current = prepared(2)
    const application = createApplication(
      repository,
      async () => repository.current!,
    )
    await application.start()
    application.dispatch({
      sessionRevision: 1,
      expectedStateRevision: 0,
      command: { kind: 'add', amount: 3 },
    })
    const before = application.snapshot()
    const checkpointCommit = createDeferred<PreparedSave>()
    const importCommit = createDeferred<PreparedSave>()
    repository.commitDeferreds.push(checkpointCommit, importCommit)

    const importing = application.importSave({
      text: importedText(9),
      importedAtUtc: '2026-07-29T03:00:00.000Z',
      overwriteApproved: true,
    })
    await waitUntil(() => repository.commits.length === 1)
    checkpointCommit.resolve(repository.commits[0]!)
    await waitUntil(() => repository.commits.length === 2)
    importCommit.reject(new Error('import disk full'))

    await expect(importing).resolves.toEqual({
      imported: false,
      committed: false,
      code: 'APP-IMPORT-COMMIT-FAILED',
      reason: 'import disk full',
    })
    expect(application.snapshot()).toBe(before)
  })

  test('uses dirty live receiver preferences for both displacement and manual import', async () => {
    const repository = new RecordingRepository()
    repository.current = PreparedSave.fromDecoded({
      saveVersion: 12,
      applicationProbeValue: 2,
      skillsBuyOnTap: false,
      debugEverEnabled: false,
      debugOptions: false,
    })
    const application = createApplication(
      repository,
      async () => repository.current!,
    )
    await application.start()
    application.dispatch({
      sessionRevision: 1,
      expectedStateRevision: 0,
      command: {
        kind: 'add',
        amount: 0,
        preference: true,
        debugUnlocked: true,
        debugEnabled: true,
      },
    })
    const sender = serializeWebSave(
      PreparedSave.fromDecoded({
        saveVersion: 12,
        applicationProbeValue: 9,
        skillsBuyOnTap: false,
        debugEverEnabled: false,
        debugOptions: false,
      }).copyValidatedState(),
    )

    await expect(application.importSave({
      text: sender,
      importedAtUtc: '2026-07-29T03:00:00.000Z',
      overwriteApproved: true,
      context: {
        kind: 'manual-shared-import',
        importedAtUtc: '2026-07-29T03:00:00.000Z',
      },
    })).resolves.toMatchObject({ imported: true })

    expect(repository.commits).toHaveLength(2)
    expect(repository.commits[0]?.copyValidatedState()).toMatchObject({
      skillsBuyOnTap: true,
      debugEverEnabled: true,
      debugOptions: true,
    })
    expect(repository.commits[1]?.copyValidatedState()).toMatchObject({
      applicationProbeValue: 9,
      skillsBuyOnTap: true,
      debugEverEnabled: true,
      debugOptions: true,
    })
  })

  test('installs a successful import as a new clean session', async () => {
    const repository = new RecordingRepository()
    repository.current = prepared(2)
    const application = createApplication(
      repository,
      async () => repository.current!,
    )
    await application.start()

    await expect(application.importSave({
      text: importedText(9),
      importedAtUtc: '2026-07-29T03:00:00.000Z',
      overwriteApproved: true,
    })).resolves.toEqual({
      imported: true,
      sessionRevision: 2,
    })
    expect(application.snapshot()).toMatchObject({
      phase: 'ready',
      source: 'import',
      revision: { session: 2, state: 0, durable: 0 },
      checkpoint: { kind: 'clean', durableRevision: 0 },
      operation: 'none',
      state: { value: 9 },
    })
    expect(repository.commits).toHaveLength(1)
    expect(repository.targets).toEqual(['development'])
  })

  test('recovers a blocked startup by importing a valid save', async () => {
    const repository = new RecordingRepository()
    const application = new TransactionalGameApplication({
      startupResolver: {
        resolve: async () => ({
          kind: 'blocked',
          reason: 'all-candidates-invalid',
          error: 'current and recovery saves are corrupt',
        }),
      },
      sessionFactory: { open: sessionFactory },
      engineDefinition: engineDefinition(),
      repository,
    })
    await application.start()
    expect(application.snapshot()).toMatchObject({
      phase: 'blocked',
      outcome: 'all-candidates-invalid',
    })

    await expect(application.importSave({
      text: importedText(9),
      importedAtUtc: '2026-07-29T03:00:00.000Z',
      overwriteApproved: true,
    })).resolves.toEqual({
      imported: true,
      sessionRevision: 1,
    })
    expect(application.snapshot()).toMatchObject({
      phase: 'ready',
      source: 'import',
      revision: { session: 1, state: 0, durable: 0 },
      checkpoint: { kind: 'clean', durableRevision: 0 },
      state: { value: 9 },
    })
  })

  test('queues import behind an in-flight checkpoint without reordering writes', async () => {
    const repository = new RecordingRepository()
    repository.current = prepared(0)
    const application = createApplication(
      repository,
      async () => repository.current!,
    )
    await application.start()
    application.dispatch({
      sessionRevision: 1,
      expectedStateRevision: 0,
      command: { kind: 'add', amount: 1 },
    })
    const checkpointCommit = createDeferred<PreparedSave>()
    repository.commitDeferreds.push(checkpointCommit)

    const checkpoint = application.checkpoint()
    await waitUntil(() => repository.commits.length === 1)
    const importing = application.importSave({
      text: importedText(9),
      importedAtUtc: '2026-07-29T03:00:00.000Z',
      overwriteApproved: true,
    })
    expect(repository.commits).toHaveLength(1)
    expect(
      repository.commits[0]!.copyValidatedState().applicationProbeValue,
    ).toBe(1)

    checkpointCommit.resolve(repository.commits[0]!)
    await checkpoint
    await waitUntil(() => repository.commits.length === 2)
    expect(
      repository.commits[1]!.copyValidatedState().applicationProbeValue,
    ).toBe(9)
    await importing

    expect(application.snapshot()).toMatchObject({
      phase: 'ready',
      source: 'import',
      revision: { session: 2, state: 0, durable: 0 },
      checkpoint: { kind: 'clean', durableRevision: 0 },
      state: { value: 9 },
    })
  })
})
