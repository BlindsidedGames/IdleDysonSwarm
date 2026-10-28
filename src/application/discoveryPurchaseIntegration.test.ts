import { StoredTimeSimulation } from '../workers/storedTime/storedTimeSimulation'
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { gameDataCatalog } from '../game-data/catalog'
import { prepareIdb1Save, type PreparedSave } from '../save/prepare'
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
  type CanonicalGameApplicationFacade,
} from './canonicalGameApplication'
import {
  createCanonicalRuntimeSessionFactory,
  type CanonicalRuntimeState,
} from './canonicalRuntimeSession'

const prepared = prepareIdb1Save(readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)).prepared

describe('Discovery commit-first purchases', () => {
  async function setup() {
    const repository = new MemoryRepository()
    const app = createApplication(repository)
    await app.start()
    const candidate = structuredClone(readyState(app))
    candidate.gameState = { ...candidate.gameState,
      avocado: { ...candidate.gameState.avocado, overflowPoints: 100n },
      timeline: { ...candidate.gameState.timeline, storedTimeAvailableSeconds: 10 },
    }
    expect(await app.commitAwayReplacement(revisionEnvelope(app), candidate)).toMatchObject({ committed: true })
    return { app, repository }
  }

  test.each(['unlock', 'power', 'speed', 'elevation', 'enlightenment', 'elevation-power', 'enlightenment-power'] as const)('%s is atomic on failure, retries once and survives immediate reopen', async purchase => {
    const { app, repository } = await setup()
    if (purchase !== 'unlock') expect(await app.dispatchPlayer({ ...revisionEnvelope(app),
      command: { kind: 'discovery.purchase', purchase: 'unlock' },
    })).toMatchObject({ transition: { accepted: true } })
    for (const prerequisite of (purchase === 'enlightenment-power' ? ['elevation', 'enlightenment'] : ['enlightenment', 'elevation-power'].includes(purchase) ? ['elevation'] : []) as ('elevation' | 'enlightenment')[]) {
      expect(await app.dispatchPlayer({ ...revisionEnvelope(app), command: { kind: 'discovery.purchase', purchase: prerequisite } })).toMatchObject({ transition: { accepted: true } })
    }
    const before = structuredClone(readyState(app).gameState)
    const savedBefore = await repository.loadCurrent()
    const command = { kind: 'discovery.purchase' as const, purchase }
    repository.beforeCommit = async () => { throw new Error('Deliberate Discovery save failure') }
    expect(await app.dispatchPlayer({ ...revisionEnvelope(app), command })).toMatchObject({ transition: { accepted: false } })
    expect(readyState(app).gameState).toEqual(before)
    expect(await repository.loadCurrent()).toBe(savedBefore)
    repository.beforeCommit = undefined
    const commitsBefore = repository.commits.length
    expect(await app.dispatchPlayer({ ...revisionEnvelope(app), command })).toMatchObject({ transition: { accepted: true } })
    expect(repository.commits.length).toBe(commitsBefore + 1)
    const after = readyState(app).gameState
    expect(after.avocado.overflowPoints).toBe(before.avocado.overflowPoints! - (purchase === 'elevation' ? 3n : purchase === 'enlightenment' ? 5n : 1n))
    expect(after.discovery).toMatchObject({ unlocked: true,
      startingPower: purchase === 'power' ? 1n : 0n,
      speedUpgrades: purchase === 'speed' ? 1n : 0n,
    })
    const reopened = createApplication(repository)
    await reopened.start()
    expect(readyState(reopened).gameState.discovery).toEqual(after.discovery)
    expect(readyState(reopened).gameState.avocado.overflowPoints).toBe(after.avocado.overflowPoints)
    if (purchase === 'unlock') {
      expect(await reopened.dispatchPlayer({ ...revisionEnvelope(reopened), command })).toMatchObject({ transition: { accepted: false } })
      expect(readyState(reopened).gameState.avocado.overflowPoints).toBe(after.avocado.overflowPoints)
      expect(repository.commits.length).toBe(commitsBefore + 1)
    }
  })

  test('pending save hides the purchase and blocks simultaneous retry and Stored Time', async () => {
    const { app, repository } = await setup()
    const before = structuredClone(readyState(app).gameState)
    let entered!: () => void
    let release!: () => void
    const enteredPromise = new Promise<void>(resolve => { entered = resolve })
    const releasePromise = new Promise<void>(resolve => { release = resolve })
    repository.beforeCommit = async () => { entered(); await releasePromise }
    const command = { kind: 'discovery.purchase' as const, purchase: 'unlock' as const }
    const envelope = revisionEnvelope(app)
    const pending = app.dispatchPlayer({ ...envelope, command })
    await enteredPromise
    const retry = app.dispatchPlayer({ ...envelope, command })
    const stored = app.commitStoredTime(envelope, 1)
    try {
      await Promise.resolve()
      expect(readyState(app).gameState).toEqual(before)
    } finally { release() }
    expect(await pending).toMatchObject({ transition: { accepted: true } })
    expect(await retry).toMatchObject({ transition: { accepted: false } })
    expect(await stored).toMatchObject({ committed: false })
    expect(readyState(app).gameState.avocado.overflowPoints).toBe(99n)
    expect(readyState(app).gameState.timeline.storedTimeAvailableSeconds).toBe(10)
  })
})

function createApplication(repository: SaveRepository) {
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
    storedTimeJobRunner: {
      async run(request, options) {
        const simulation = new StoredTimeSimulation({
          jobId: request.jobId, state: request.state,
          requestedSeconds: request.requestedSeconds,
          infinityMinimumCycleSeconds: request.infinityMinimumCycleSeconds,
          eventContext: context(),
        })
        for (;;) {
          const terminal = simulation.step(1, false)
          options?.onProgress?.(simulation.progress())
          if (terminal !== null) return terminal
        }
      },
      dispose() {},
    },
  })
}

function readyState(
  application: CanonicalGameApplicationFacade,
): Readonly<CanonicalRuntimeState> {
  const snapshot = application.snapshot()
  expect(snapshot.phase).toBe('ready')
  if (snapshot.phase !== 'ready') {
    throw new Error('Expected a ready canonical application.')
  }
  return snapshot.state as Readonly<CanonicalRuntimeState>
}

function revisionEnvelope(application: CanonicalGameApplicationFacade) {
  const snapshot = application.snapshot()
  expect(snapshot.phase).toBe('ready')
  if (snapshot.phase !== 'ready') {
    throw new Error('Expected a ready canonical application.')
  }
  return {
    sessionRevision: snapshot.revision.session,
    expectedStateRevision: snapshot.revision.state,
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
  readonly commits: PreparedSave[] = []
  beforeCommit?: () => Promise<void>
  private current = prepared
  private commitAttempts = 0

  constructor(public failureAttempt?: number) {}

  async hasCurrent(): Promise<boolean> {
    return true
  }

  async loadCurrent(): Promise<PreparedSave> {
    return this.current
  }

  async migrateLegacyOnFirstLaunch(): Promise<FirstLaunchMigrationResult> {
    return { status: 'already-migrated', save: this.current }
  }

  async commit(save: PreparedSave): Promise<PreparedSave> {
    await this.beforeCommit?.()
    this.commitAttempts += 1
    if (this.commitAttempts === this.failureAttempt) {
      throw new Error(
        `Deliberate challenge commit failure ${this.commitAttempts}.`,
      )
    }
    this.commits.push(save)
    this.current = save
    return save
  }
}
