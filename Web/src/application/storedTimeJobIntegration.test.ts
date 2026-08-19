import { readFileSync } from 'node:fs'
import { describe, expect, test, vi } from 'vitest'
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
      continuation: { kind: 'complete' },
    })
    expect(repository.commits).toBe(beforeCommits + 1)
    const after = application.snapshot()
    expect(after.phase).toBe('ready')
    if (after.phase !== 'ready') return
    expect(after.state.gameState.timeline.storedTimeAvailableSeconds).toBe(8)
    expect(statuses).toContain('running')
    expect(statuses.at(-1)).toBe('idle')
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
          protocolVersion: 1,
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

  test('rejects an inconsistent worker continuation before persistence', async () => {
    const repository = new MemoryRepository()
    const runner = transformingSimulationRunner((terminal) => ({
      ...terminal,
      continuation: { kind: 'bot-cap-persistence-required' },
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
      code: 'STORED-TIME-WORKER-CONTINUATION-INVALID',
    })
    expect(repository.commits).toBe(commitsBefore)
    const after = application.snapshot()
    expect(after.phase).toBe('ready')
    if (after.phase === 'ready') {
      expect(after.state.gameState.timeline.storedTimeAvailableSeconds).toBe(10)
    }
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
      resolve: async () => ({ kind: 'ready', source: 'primary', save: prepared }),
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
    automationIntervalSeconds: 1,
    realityWorkerTuning: {
      workerBatchSize: 128n,
      baseWorkerGenerationSpeed: 4,
    },
    dreamResetDefinitions: SIMULATION_UPGRADE_DEFINITIONS,
    realityUpgradeDefinitions: REALITY_UPGRADE_DEFINITIONS,
    infinityResetAssetLookup: createCapturedInfinityAssetLookup([]),
  }
}

class MemoryRepository implements SaveRepository {
  commits = 0
  failNextCommit = false

  async hasCurrent(): Promise<boolean> {
    return true
  }

  async loadCurrent() {
    return prepared
  }

  async migrateLegacyOnFirstLaunch(): Promise<FirstLaunchMigrationResult> {
    return { status: 'already-migrated', save: prepared }
  }

  async commit(save: typeof prepared) {
    if (this.failNextCommit) {
      this.failNextCommit = false
      throw new Error('simulated storage failure')
    }
    this.commits += 1
    return save
  }
}
