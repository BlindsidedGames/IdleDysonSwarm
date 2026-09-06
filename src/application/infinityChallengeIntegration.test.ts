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
import { DESKTOP_LIFECYCLE_POLICY } from '../simulation/lifecycleAwayTime'
import { REALITY_UPGRADE_DEFINITIONS } from '../simulation/realityUpgrades'
import { EMPTY_INFINITY_CHALLENGES } from '../simulation/infinityChallenges'
import { ordinaryInfinityBotThreshold } from '../simulation/infinityCycle'
import {
  createCanonicalGameApplication,
  type CanonicalGameApplicationFacade,
} from './canonicalGameApplication'
import { CanonicalLifecycleCoordinator } from './canonicalLifecycleCoordinator'
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

describe('Blank Slate application integration', () => {
  async function setup() {
    const repository = new MemoryRepository()
    const app = createApplication(repository)
    await app.start()
    const candidate = structuredClone(readyState(app))
    candidate.gameState = { ...candidate.gameState,
      challenges: { ...EMPTY_INFINITY_CHALLENGES, unlocked: true },
      infinity: { ...candidate.gameState.infinity, botCapTransitionPending: false, botCapRewardsGranted: false },
    }
    expect(await app.commitAwayReplacement(revisionEnvelope(app), candidate)).toMatchObject({ committed: true })
    return { app, repository }
  }
  test('entry is invisible until saved and a failed abandonment preserves the active run', async () => {
    const { app, repository } = await setup()
    const before = readyState(app).gameState
    let release!: () => void
    let entered!: () => void
    const enteredPromise = new Promise<void>(resolve => { entered = resolve })
    const releasePromise = new Promise<void>(resolve => { release = resolve })
    repository.beforeCommit = async () => { entered(); await releasePromise }
    const pending = app.dispatchPlayer({ ...revisionEnvelope(app), command: { kind: 'challenge.enter-blank-slate' } })
    await enteredPromise
    expect(readyState(app).gameState).toEqual(before)
    release()
    expect(await pending).toMatchObject({ transition: { accepted: true } })
    repository.beforeCommit = async () => { throw new Error('deliberate save failure') }
    const active = readyState(app).gameState
    expect(await app.dispatchPlayer({ ...revisionEnvelope(app), command: { kind: 'challenge.abandon' } })).toMatchObject({ transition: { accepted: false } })
    expect(readyState(app).gameState).toEqual(active)
    repository.beforeCommit = undefined
    const reopened = createApplication(repository)
    await reopened.start()
    if (reopened.snapshot().phase !== 'ready') throw new Error(JSON.stringify(reopened.snapshot()))
    expect(readyState(reopened).gameState.challenges?.active).toBe('blank-slate')
    expect(await reopened.dispatchPlayer({ ...revisionEnvelope(reopened), command: { kind: 'challenge.abandon' } })).toMatchObject({ transition: { accepted: true } })
    expect(readyState(reopened).gameState.challenges?.galvanizers).toBe(0n)
  })
  test.each(['manual', 'automatic', 'stored-time'])('completes at the ordinary boundary with Break unlocked, mode=%s', async mode => {
    const automatic = mode !== 'manual'
    const { app, repository } = await setup()
    expect(await app.dispatchPlayer({ ...revisionEnvelope(app), command: { kind: 'challenge.enter-blank-slate' } })).toMatchObject({ transition: { accepted: true } })
    const candidate = structuredClone(readyState(app))
    const state = candidate.gameState
    candidate.gameState = { ...state,
      quantum: { ...state.quantum, unlocks: { ...state.quantum.unlocks, breakTheLoop: true } },
      infinity: { ...state.infinity, automaticResetEnabled: automatic, breakTarget: 1000n },
      dyson: { ...state.dyson, bots: ordinaryInfinityBotThreshold(state.quantum.divisionsPurchased),
        facilities: Object.fromEntries(Object.keys(state.dyson.facilities).map(id => [id, [0,0]])) as typeof state.dyson.facilities },
      timeline: { ...state.timeline, infinityCycleSeconds: 10, storedTimeAvailableSeconds: 10, eventClockInitialized: false },
    }
    expect(await app.commitAwayReplacement(revisionEnvelope(app), candidate)).toMatchObject({ committed: true })
    if (mode === 'stored-time') expect(await app.commitStoredTime(revisionEnvelope(app), 1)).toMatchObject({ committed: true })
    else if (automatic) expect((await createCoordinator(app).advanceActive(100)).transition.accepted).toBe(true)
    else expect(await app.dispatchPlayer({ ...revisionEnvelope(app), command: { kind: 'infinity.request-reset' } })).toMatchObject({ transition: { accepted: true } })
    const complete = readyState(app)
    expect(complete.gameState.challenges).toMatchObject({ active: null, blankSlateCompleted: true, galvanizers: 1n, hasEarnedGalvanizer: true })
    expect(complete.gameState.quantum.unlocks.breakTheLoop).toBe(true)
    expect(await app.commitAwayReplacement(revisionEnvelope(app), complete)).toMatchObject({ committed: true })
    const reopened = createApplication(repository)
    await reopened.start()
    expect(readyState(reopened).gameState.challenges?.galvanizers).toBe(1n)
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

function createCoordinator(application: CanonicalGameApplicationFacade) {
  return new CanonicalLifecycleCoordinator({
    application,
    lifecycle: {
      currentPhase: () => 'active',
      subscribe: () => () => undefined,
    },
    clock: {
      sample: () => ({
        utcMilliseconds: 0,
        serializedUtcText: '1970-01-01T00:00:00.000Z',
      }),
    },
    policy: DESKTOP_LIFECYCLE_POLICY,
    subscribeToLifecycle: false,
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
