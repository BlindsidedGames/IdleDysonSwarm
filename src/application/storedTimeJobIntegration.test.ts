import { readFileSync } from 'node:fs'
import { describe, expect, test, vi } from 'vitest'
import { gameDataCatalog } from '../game-data/catalog'
import { prepareIdb1Save } from '../save/prepare'
import type {
  FirstLaunchMigrationResult,
  SaveRepository,
} from '../save/repository'
import {
  createCapturedInfinityAssetLookup,
  type CanonicalEventTimeContext,
} from '../simulation/canonicalEventTimeModel'
import { SIMULATION_UPGRADE_DEFINITIONS } from '../simulation/dreamEducationUpgrades'
import { REALITY_UPGRADE_DEFINITIONS } from '../simulation/realityUpgrades'
import {
  createCanonicalGameApplication,
} from './canonicalGameApplication'
import { createCanonicalRuntimeSessionFactory } from './canonicalRuntimeSession'
import type {
  StoredTimeJobRunner,
} from '../workers/storedTime/storedTimeJobRunner'
import { StoredTimeSimulation } from '../workers/storedTime/storedTimeSimulation'

const prepared = prepareIdb1Save(readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)).prepared

describe('Stored Time job application integration', () => {
  test('publishes progress but exposes the candidate only after persistence', async () => {
    const repository = new MemoryRepository()
    const runner = simulationRunner()
    const application = createApplication(repository, runner)
    await application.start()
    await installStoredBank(application, 10)
    const statuses: string[] = []
    application.subscribeStoredTimeJob((status) => statuses.push(status.kind))
    const beforeCommits = repository.commits

    const snapshot = application.snapshot()
    expect(snapshot.phase).toBe('ready')
    if (snapshot.phase !== 'ready') return
    const result = await application.commitStoredTime(
      {
        sessionRevision: snapshot.revision.session,
        expectedStateRevision: snapshot.revision.state,
      },
      2,
    )

    expect(result).toMatchObject({
      committed: true,
      consumedSeconds: 2,
      remainingSeconds: 0,
    })
    expect(repository.commits).toBe(beforeCommits + 1)
    const after = application.snapshot()
    expect(after.phase).toBe('ready')
    if (after.phase !== 'ready') return
    expect(after.state.gameState.timeline.storedTimeAvailableSeconds).toBe(8)
    expect(statuses).toContain('running')
    expect(statuses.at(-1)).toBe('idle')
  })

  test('persists unowned Quantum behavior through Stored Time and reload', async () => {
    const repository = new MemoryRepository()
    const application = createApplication(repository, simulationRunner())
    await application.start()
    const initial = application.snapshot()
    expect(initial.phase).toBe('ready')
    if (initial.phase !== 'ready') return
    const candidate = structuredClone(initial.state)
    candidate.gameState = {
      ...candidate.gameState,
      dyson: {
        ...candidate.gameState.dyson,
        bots: 4.2e20,
      },
      infinity: {
        ...candidate.gameState.infinity,
        points: 0n,
        spentPoints: 0n,
        breakTarget: 2n,
      },
      quantum: {
        ...candidate.gameState.quantum,
        divisionsPurchased: 0n,
        unlocks: {
          ...candidate.gameState.quantum.unlocks,
          breakTheLoop: false,
          quantumEntanglement: false,
        },
      },
      timeline: {
        ...candidate.gameState.timeline,
        eventClockInitialized: true,
        automationTimeUntilNextEvent: 1,
        infinityCycleSeconds: 1,
        storedTimeAvailableSeconds: 1,
      },
    }
    const quantumPointsBefore = candidate.gameState.quantum.pointsEarned
    await expect(application.commitAwayReplacement(
      {
        sessionRevision: initial.revision.session,
        expectedStateRevision: initial.revision.state,
      },
      candidate,
    )).resolves.toMatchObject({ committed: true })

    const ready = application.snapshot()
    expect(ready.phase).toBe('ready')
    if (ready.phase !== 'ready') return
    await expect(application.commitStoredTime(
      {
        sessionRevision: ready.revision.session,
        expectedStateRevision: ready.revision.state,
      },
      1,
    )).resolves.toMatchObject({
      committed: true,
      consumedSeconds: 1,
      remainingSeconds: 0,
    })

    const assertOrdinaryResult = (
      snapshot: ReturnType<typeof application.snapshot>,
    ) => {
      expect(snapshot.phase).toBe('ready')
      if (snapshot.phase !== 'ready') return
      expect(snapshot.state.gameState.infinity.points).toBe(1n)
      expect(snapshot.state.gameState.quantum.pointsEarned)
        .toBe(quantumPointsBefore)
      expect(snapshot.state.gameState.quantum.unlocks).toMatchObject({
        breakTheLoop: false,
        quantumEntanglement: false,
      })
    }
    assertOrdinaryResult(application.snapshot())
    application.disposeStoredTimeJobRunner()

    const reopened = createApplication(repository, simulationRunner())
    await reopened.start()
    assertOrdinaryResult(reopened.snapshot())
    reopened.disposeStoredTimeJobRunner()
  })

  test('contains a throwing status subscriber without changing the committed result', async () => {
    const repository = new MemoryRepository()
    const application = createApplication(repository, simulationRunner())
    await application.start()
    await installStoredBank(application, 10)
    application.subscribeStoredTimeJob(() => {
      throw new Error('presentation observer failed')
    })
    const snapshot = application.snapshot()
    expect(snapshot.phase).toBe('ready')
    if (snapshot.phase !== 'ready') return

    await expect(application.commitStoredTime({
      sessionRevision: snapshot.revision.session,
      expectedStateRevision: snapshot.revision.state,
    }, 2)).resolves.toMatchObject({
      committed: true,
      consumedSeconds: 2,
    })
    expect(application.storedTimeJobStatus()).toEqual({ kind: 'idle' })
  })

  test('does not persist or charge a cancelled detached candidate', async () => {
    const repository = new MemoryRepository()
    const runner: StoredTimeJobRunner = {
      run: vi.fn(async (request, options) => {
        const progress = {
          jobId: request.jobId,
          requestedSeconds: request.requestedSeconds,
          computedSeconds: 1,
          fraction: 0.5,
          elapsedMilliseconds: 10,
          estimatedRemainingMilliseconds: 10,
          maximumChunkMilliseconds: 5,
        }
        options?.onProgress?.(progress)
        return {
          type: 'cancelled',
          protocolVersion: 2,
          jobId: request.jobId,
          progress,
        }
      }),
      dispose: vi.fn(),
    }
    const application = createApplication(repository, runner)
    await application.start()
    await installStoredBank(application, 10)
    const beforeCommits = repository.commits
    const snapshot = application.snapshot()
    expect(snapshot.phase).toBe('ready')
    if (snapshot.phase !== 'ready') return

    const result = await application.commitStoredTime(
      {
        sessionRevision: snapshot.revision.session,
        expectedStateRevision: snapshot.revision.state,
      },
      2,
    )

    expect(result).toMatchObject({
      committed: false,
      consumedSeconds: 0,
      remainingSeconds: 2,
      code: 'CANONICAL-STORED-TIME-CANCELLED',
    })
    expect(repository.commits).toBe(beforeCommits)
    const after = application.snapshot()
    expect(after.phase).toBe('ready')
    if (after.phase !== 'ready') return
    expect(after.state.gameState.timeline.storedTimeAvailableSeconds).toBe(10)
  })

  test('discards a completed candidate when cancellation wins before worker settlement', async () => {
    const repository = new MemoryRepository()
    let finish: (() => void) | undefined
    const runner: StoredTimeJobRunner = {
      run: vi.fn((request) => new Promise((resolve) => {
        finish = () => {
          const simulation = new StoredTimeSimulation({
            jobId: request.jobId,
            state: request.state,
            requestedSeconds: request.requestedSeconds,
            infinityMinimumCycleSeconds: request.infinityMinimumCycleSeconds,
            eventContext: context(),
          })
          for (;;) {
            const terminal = simulation.step(0.01, false)
            if (terminal !== null) {
              resolve(terminal)
              return
            }
          }
        }
      })),
      dispose: vi.fn(),
    }
    const application = createApplication(repository, runner)
    await application.start()
    await installStoredBank(application, 10)
    const beforeCommits = repository.commits
    const before = application.snapshot()
    expect(before.phase).toBe('ready')
    if (before.phase !== 'ready') return

    const processing = application.commitStoredTime({
      sessionRevision: before.revision.session,
      expectedStateRevision: before.revision.state,
    }, 2)
    application.cancelStoredTimeJob()
    finish?.()

    await expect(processing).resolves.toMatchObject({
      committed: false,
      consumedSeconds: 0,
      remainingSeconds: 2,
      code: 'CANONICAL-STORED-TIME-CANCELLED',
    })
    expect(repository.commits).toBe(beforeCommits)
    const after = application.snapshot()
    expect(after.phase).toBe('ready')
    if (after.phase !== 'ready') return
    expect(after.state.gameState.timeline.storedTimeAvailableSeconds).toBe(10)
  })

  test('captures one immutable pre-job export and switches atomically to the committed result', async () => {
    const repository = new MemoryRepository()
    let finish: (() => void) | undefined
    const runner: StoredTimeJobRunner = {
      run: vi.fn((request, options) => new Promise((resolve) => {
        finish = () => {
          const simulation = new StoredTimeSimulation({
            jobId: request.jobId,
            state: request.state,
            requestedSeconds: request.requestedSeconds,
            infinityMinimumCycleSeconds: request.infinityMinimumCycleSeconds,
            eventContext: context(),
          })
          for (;;) {
            const terminal = simulation.step(0.01, false)
            options?.onProgress?.(simulation.progress())
            if (terminal !== null) {
              resolve(terminal)
              return
            }
          }
        }
      })),
      dispose: vi.fn(),
    }
    const application = createApplication(repository, runner)
    await application.start()
    await installStoredBank(application, 10)
    const before = application.snapshot()
    expect(before.phase).toBe('ready')
    if (before.phase !== 'ready') return

    const processing = application.commitStoredTime({
      sessionRevision: before.revision.session,
      expectedStateRevision: before.revision.state,
    }, 2)
    const captured = application.captureSaveTransferSnapshot()
    expect(captured?.basis).toBe('pre-stored-time')
    expect(captured?.prepared.copyValidatedState().offlineTime).toBe(10)

    finish?.()
    await expect(processing).resolves.toMatchObject({
      committed: true,
      consumedSeconds: 2,
    })
    const after = application.captureSaveTransferSnapshot()
    expect(after?.basis).toBe('current')
    expect(after?.prepared.copyValidatedState().offlineTime).toBe(8)
    expect(captured?.prepared.copyValidatedState().offlineTime).toBe(10)
  })

  test('rejects a concurrent request before replacing or cancelling the active job', async () => {
    const repository = new MemoryRepository()
    let finish: (() => void) | undefined
    const runner: StoredTimeJobRunner = {
      run: vi.fn((request, options) => {
        const progress = {
          jobId: request.jobId,
          requestedSeconds: request.requestedSeconds,
          computedSeconds: 1,
          fraction: 0.5,
          elapsedMilliseconds: 10,
          estimatedRemainingMilliseconds: 10,
          maximumChunkMilliseconds: 5,
        }
        options?.onProgress?.(progress)
        return new Promise((resolve) => {
          finish = () => resolve({
            type: 'cancelled',
            protocolVersion: 2,
            jobId: request.jobId,
            progress,
          })
        })
      }),
      dispose: vi.fn(),
    }
    const application = createApplication(repository, runner)
    await application.start()
    await installStoredBank(application, 10)
    const snapshot = application.snapshot()
    expect(snapshot.phase).toBe('ready')
    if (snapshot.phase !== 'ready') return
    const envelope = {
      sessionRevision: snapshot.revision.session,
      expectedStateRevision: snapshot.revision.state,
    }

    const originalPromise = application.commitStoredTime(envelope, 2)
    const originalStatus = application.storedTimeJobStatus()
    expect(originalStatus).toMatchObject({
      kind: 'running',
      computedSeconds: 1,
      fraction: 0.5,
    })

    await expect(application.commitStoredTime(envelope, 3)).resolves
      .toMatchObject({
        committed: false,
        code: 'CANONICAL-STORED-TIME-JOB-ACTIVE',
        consumedSeconds: 0,
        remainingSeconds: 3,
      })
    expect(runner.run).toHaveBeenCalledOnce()
    expect(application.storedTimeJobStatus()).toBe(originalStatus)

    application.cancelStoredTimeJob()
    expect(application.storedTimeJobStatus()).toMatchObject({
      kind: 'cancelling',
      jobId: originalStatus.kind === 'idle' ? undefined : originalStatus.jobId,
      computedSeconds: 1,
      fraction: 0.5,
    })
    finish?.()
    await expect(originalPromise).resolves.toMatchObject({
      committed: false,
      code: 'CANONICAL-STORED-TIME-CANCELLED',
    })
    expect(application.storedTimeJobStatus()).toEqual({ kind: 'idle' })
  })

  test('keeps the pre-job state when persistence rejects the candidate', async () => {
    const repository = new MemoryRepository()
    const application = createApplication(repository, simulationRunner())
    await application.start()
    await installStoredBank(application, 10)
    repository.failNextCommit = true
    const snapshot = application.snapshot()
    expect(snapshot.phase).toBe('ready')
    if (snapshot.phase !== 'ready') return

    const result = await application.commitStoredTime(
      {
        sessionRevision: snapshot.revision.session,
        expectedStateRevision: snapshot.revision.state,
      },
      2,
    )

    expect(result).toMatchObject({
      committed: false,
      consumedSeconds: 0,
      remainingSeconds: 2,
      code: 'APP-COMMIT-FIRST-FAILED',
    })
    const after = application.snapshot()
    expect(after.phase).toBe('ready')
    if (after.phase !== 'ready') return
    expect(after.state.gameState.timeline.storedTimeAvailableSeconds).toBe(10)
  })

  test('enters a non-cancellable committing phase before durable persistence', async () => {
    const repository = new MemoryRepository()
    const application = createApplication(repository, simulationRunner())
    await application.start()
    await installStoredBank(application, 10)
    let releaseCommit!: () => void
    repository.nextCommitGate = new Promise<void>((resolve) => {
      releaseCommit = resolve
    })
    const snapshot = application.snapshot()
    expect(snapshot.phase).toBe('ready')
    if (snapshot.phase !== 'ready') return

    const processing = application.commitStoredTime({
      sessionRevision: snapshot.revision.session,
      expectedStateRevision: snapshot.revision.state,
    }, 2)
    await vi.waitFor(() => {
      expect(application.storedTimeJobStatus().kind).toBe('committing')
    })

    application.cancelStoredTimeJob()
    expect(application.storedTimeJobStatus().kind).toBe('committing')
    releaseCommit()
    await expect(processing).resolves.toMatchObject({
      committed: true,
      consumedSeconds: 2,
      remainingSeconds: 0,
    })
    expect(application.storedTimeJobStatus()).toEqual({ kind: 'idle' })
  })

  test('rejects a partial worker completion before persistence', async () => {
    const repository = new MemoryRepository()
    const runner = transformingSimulationRunner((terminal) => ({
      ...terminal,
      consumedSeconds: 1,
      remainingSeconds: 1,
    }))
    const application = createApplication(repository, runner)
    await application.start()
    await installStoredBank(application, 10)
    const commitsBefore = repository.commits
    const snapshot = application.snapshot()
    expect(snapshot.phase).toBe('ready')
    if (snapshot.phase !== 'ready') return

    await expect(application.commitStoredTime({
      sessionRevision: snapshot.revision.session,
      expectedStateRevision: snapshot.revision.state,
    }, 2)).resolves.toMatchObject({
      committed: false,
      consumedSeconds: 0,
      code: 'STORED-TIME-WORKER-CANDIDATE-INVALID',
    })
    expect(repository.commits).toBe(commitsBefore)
    const after = application.snapshot()
    expect(after.phase).toBe('ready')
    if (after.phase === 'ready') {
      expect(after.state.gameState.timeline.storedTimeAvailableSeconds).toBe(10)
    }
  })

  test('rejects an unsettled bot-cap candidate before persistence', async () => {
    const repository = new MemoryRepository()
    const runner = transformingSimulationRunner((terminal) => ({
      ...terminal,
      candidate: {
        ...terminal.candidate,
        gameState: {
          ...terminal.candidate.gameState,
          dyson: {
            ...terminal.candidate.gameState.dyson,
            bots: Number.MAX_VALUE,
          },
          infinity: {
            ...terminal.candidate.gameState.infinity,
            botCapTransitionPending: false,
            botCapRewardsGranted: false,
            inProgress: false,
          },
        },
      },
    }))
    const application = createApplication(repository, runner)
    await application.start()
    await installStoredBank(application, 10)
    const commitsBefore = repository.commits
    const snapshot = application.snapshot()
    expect(snapshot.phase).toBe('ready')
    if (snapshot.phase !== 'ready') return

    await expect(application.commitStoredTime({
      sessionRevision: snapshot.revision.session,
      expectedStateRevision: snapshot.revision.state,
    }, 2)).resolves.toMatchObject({
      committed: false,
      consumedSeconds: 0,
      code: 'STORED-TIME-WORKER-CANDIDATE-INVALID',
      reason: 'The worker candidate contains an unsettled bot-cap checkpoint.',
    })
    expect(repository.commits).toBe(commitsBefore)
  })

  test('rejects a worker mutation of session-owned carriers before persistence', async () => {
    const repository = new MemoryRepository()
    const runner = transformingSimulationRunner((terminal) => ({
      ...terminal,
      candidate: {
        ...terminal.candidate,
        entitlements: {
          ...terminal.candidate.entitlements,
          permanentDoubleIp:
            !terminal.candidate.entitlements.permanentDoubleIp,
        },
      },
    }))
    const application = createApplication(repository, runner)
    await application.start()
    await installStoredBank(application, 10)
    const commitsBefore = repository.commits
    const snapshot = application.snapshot()
    expect(snapshot.phase).toBe('ready')
    if (snapshot.phase !== 'ready') return

    await expect(application.commitStoredTime({
      sessionRevision: snapshot.revision.session,
      expectedStateRevision: snapshot.revision.state,
    }, 2)).resolves.toMatchObject({
      committed: false,
      consumedSeconds: 0,
      code: 'STORED-TIME-WORKER-CANDIDATE-INVALID',
    })
    expect(repository.commits).toBe(commitsBefore)
  })
})

function createApplication(
  repository: SaveRepository,
  runner: StoredTimeJobRunner,
) {
  return createCanonicalGameApplication({
    repository,
    startupResolver: {
      resolve: async () => ({
        kind: 'ready',
        source: 'primary',
        save: (await repository.loadCurrent()) ?? prepared,
      }),
    },
    sessionFactory: createCanonicalRuntimeSessionFactory({
      entitlements: { permanentDoubleIp: false },
    }),
    engine: { eventContext: context() },
    storedTimeJobRunner: runner,
  })
}

async function installStoredBank(
  application: ReturnType<typeof createApplication>,
  seconds: number,
): Promise<void> {
  const snapshot = application.snapshot()
  expect(snapshot.phase).toBe('ready')
  if (snapshot.phase !== 'ready') return
  const candidate = structuredClone(snapshot.state)
  Object.assign(candidate, {
    gameState: {
      ...candidate.gameState,
      timeline: {
        ...candidate.gameState.timeline,
        eventClockInitialized: true,
        automationTimeUntilNextEvent: 1,
        storedTimeAvailableSeconds: seconds,
      },
    },
  })
  await expect(application.commitAwayReplacement(
    {
      sessionRevision: snapshot.revision.session,
      expectedStateRevision: snapshot.revision.state,
    },
    candidate,
  )).resolves.toMatchObject({ committed: true })
}

function simulationRunner(): StoredTimeJobRunner {
  return {
    async run(request, options) {
      const simulation = new StoredTimeSimulation({
        jobId: request.jobId,
        state: request.state,
        requestedSeconds: request.requestedSeconds,
        infinityMinimumCycleSeconds: request.infinityMinimumCycleSeconds,
        eventContext: context(),
      })
      for (;;) {
        const terminal = simulation.step(0.01, false)
        options?.onProgress?.(simulation.progress())
        if (terminal !== null) return terminal
      }
    },
    dispose() {},
  }
}

function transformingSimulationRunner(
  transform: (
    terminal: Extract<
      Awaited<ReturnType<StoredTimeJobRunner['run']>>,
      { readonly type: 'completed' }
    >,
  ) => Awaited<ReturnType<StoredTimeJobRunner['run']>>,
): StoredTimeJobRunner {
  const delegate = simulationRunner()
  return {
    async run(request, options) {
      const terminal = await delegate.run(request, options)
      if (terminal.type !== 'completed') return terminal
      return transform(terminal)
    },
    dispose() {
      delegate.dispose()
    },
  }
}

function context(): CanonicalEventTimeContext {
  return {
    mode: 'active',
    automationIntervalSeconds: 1,
    realityWorkerTuning: {
      workerBatchSize: 128n,
      baseWorkerGenerationSpeed: 4,
    },
    dreamResetDefinitions: SIMULATION_UPGRADE_DEFINITIONS,
    realityUpgradeDefinitions: REALITY_UPGRADE_DEFINITIONS,
    infinityResetAssetLookup: createCapturedInfinityAssetLookup(
      gameDataCatalog.assets,
    ),
  }
}

class MemoryRepository implements SaveRepository {
  commits = 0
  failNextCommit = false
  nextCommitGate: Promise<void> | undefined
  private current = prepared

  async hasCurrent(): Promise<boolean> {
    return true
  }

  async loadCurrent() {
    return this.current
  }

  async migrateLegacyOnFirstLaunch(): Promise<FirstLaunchMigrationResult> {
    return { status: 'already-migrated', save: prepared }
  }

  async commit(save: typeof prepared) {
    if (this.failNextCommit) {
      this.failNextCommit = false
      throw new Error('simulated storage failure')
    }
    if (this.nextCommitGate !== undefined) {
      const gate = this.nextCommitGate
      this.nextCommitGate = undefined
      await gate
    }
    this.commits += 1
    this.current = save
    return this.current
  }
}
