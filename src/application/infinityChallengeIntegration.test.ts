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
  test.each(['blank-slate', 'trial-and-error'] as const)('%s entry is invisible until saved and a failed abandonment preserves the active run', async (challengeId) => {
    const { app, repository } = await setup()
    const before = readyState(app).gameState
    let release!: () => void
    let entered!: () => void
    const enteredPromise = new Promise<void>(resolve => { entered = resolve })
    const releasePromise = new Promise<void>(resolve => { release = resolve })
    repository.beforeCommit = async () => { entered(); await releasePromise }
    const pending = app.dispatchPlayer({ ...revisionEnvelope(app), command: { kind: challengeId === 'blank-slate' ? 'challenge.enter-blank-slate' : 'challenge.enter-trial-and-error' } })
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
    expect(readyState(reopened).gameState.challenges?.active).toBe(challengeId)
    expect(await reopened.dispatchPlayer({ ...revisionEnvelope(reopened), command: { kind: 'challenge.abandon' } })).toMatchObject({ transition: { accepted: true } })
    expect(readyState(reopened).gameState.challenges?.galvanizers).toBe(0n)
  })
  test('galvanization publishes only after currency and ownership are durably saved', async () => {
    const { app, repository } = await setup()
    const candidate = structuredClone(readyState(app))
    candidate.gameState = { ...candidate.gameState, challenges: {
      ...EMPTY_INFINITY_CHALLENGES, unlocked: true, blankSlateCompleted: true,
      hasEarnedGalvanizer: true, galvanizers: 1n,
    } }
    expect(await app.commitAwayReplacement(revisionEnvelope(app), candidate)).toMatchObject({ committed: true })
    const before = readyState(app).gameState
    repository.beforeCommit = async () => { throw new Error('deliberate galvanization save failure') }
    expect(await app.dispatchPlayer({ ...revisionEnvelope(app), command: { kind: 'skill.galvanize', skillId: 'startHereTree' } })).toMatchObject({ transition: { accepted: false } })
    expect(readyState(app).gameState).toEqual(before)
    let release!: () => void
    let entered!: () => void
    const enteredPromise = new Promise<void>(resolve => { entered = resolve })
    const releasePromise = new Promise<void>(resolve => { release = resolve })
    repository.beforeCommit = async () => { entered(); await releasePromise }
    const pending = app.dispatchPlayer({ ...revisionEnvelope(app), command: { kind: 'skill.galvanize', skillId: 'startHereTree' } })
    await enteredPromise
    expect(readyState(app).gameState).toEqual(before)
    release()
    expect(await pending).toMatchObject({ transition: { accepted: true } })
    repository.beforeCommit = undefined
    const reopened = createApplication(repository)
    await reopened.start()
    expect(readyState(reopened).gameState.challenges).toMatchObject({ galvanizers: 0n, galvanizedSkillIds: ['startHereTree'] })
    expect(readyState(reopened).gameState.skills.byId.startHereTree.owned).toBe(true)
  })
  test.each(['active', 'saved'] as const)('saves %s preset priority before publishing it and preserves it on immediate reopen', async mode => {
    const { app, repository } = await setup()
    const before = readyState(app).gameState
    const skillIds = ['banking', 'startHereTree']
    const command = mode === 'active'
      ? { kind: 'skill.set-auto-assignment' as const, skillIds }
      : { kind: 'skill.set-preset-assignment' as const, slot: 5 as const, skillIds }
    repository.beforeCommit = async () => { throw new Error('deliberate priority save failure') }
    expect(await app.dispatchPlayer({ ...revisionEnvelope(app), command })).toMatchObject({ transition: { accepted: false } })
    expect(readyState(app).gameState).toEqual(before)
    let entered!: () => void
    let release!: () => void
    const enteredPromise = new Promise<void>(resolve => { entered = resolve })
    const releasePromise = new Promise<void>(resolve => { release = resolve })
    repository.beforeCommit = async () => { entered(); await releasePromise }
    const pending = app.dispatchPlayer({ ...revisionEnvelope(app), command })
    await enteredPromise
    expect(readyState(app).gameState).toEqual(before)
    release()
    expect(await pending).toMatchObject({ transition: { accepted: true } })
    repository.beforeCommit = undefined
    const reopened = createApplication(repository)
    await reopened.start()
    const skills = readyState(reopened).gameState.skills
    expect(mode === 'active' ? skills.activeAutoAssignment : skills.presets[4].skillIds).toEqual(skillIds)
  })
  test('Stored Time and manual commands cannot buy research during Trial and Error', async () => {
    const { app } = await setup()
    expect(await app.dispatchPlayer({ ...revisionEnvelope(app), command: { kind: 'challenge.enter-trial-and-error' } })).toMatchObject({ transition: { accepted: true } })
    const candidate = structuredClone(readyState(app))
    const state = candidate.gameState
    candidate.gameState = { ...state,
      dyson: { ...state.dyson, science: 1e30 },
      infinity: { ...state.infinity, automaticResetEnabled: false, automationUnlocked: { ...state.infinity.automationUnlocked, research: true } },
      timeline: { ...state.timeline, storedTimeAvailableSeconds: 10 },
    }
    expect(await app.commitAwayReplacement(revisionEnvelope(app), candidate)).toMatchObject({ committed: true })
    expect(await app.dispatchPlayer({ ...revisionEnvelope(app), command: { kind: 'research.purchase', researchId: 'research.panel_lifetime_1' } })).toMatchObject({ transition: { accepted: false } })
    const before = readyState(app).gameState.research
    expect(await app.commitStoredTime(revisionEnvelope(app), 1)).toMatchObject({ committed: true })
    expect(readyState(app).gameState.research.levelsById).toEqual(before.levelsById)
    expect(readyState(app).gameState.challenges?.active).toBe('trial-and-error')
  })
  test.each((['blank-slate', 'trial-and-error'] as const).flatMap(challengeId => ['manual', 'automatic', 'stored-time'].map(mode => ({ challengeId, mode }))))('completes $challengeId at the ordinary boundary with Break unlocked, mode=$mode', async ({ challengeId, mode }) => {
    const automatic = mode !== 'manual'
    const { app, repository } = await setup()
    expect(await app.dispatchPlayer({ ...revisionEnvelope(app), command: { kind: challengeId === 'blank-slate' ? 'challenge.enter-blank-slate' : 'challenge.enter-trial-and-error' } })).toMatchObject({ transition: { accepted: true } })
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
    expect(complete.gameState.challenges).toMatchObject({ active: null, [challengeId === 'blank-slate' ? 'blankSlateCompleted' : 'trialAndErrorCompleted']: true, galvanizers: 1n, hasEarnedGalvanizer: true })
    expect(complete.gameState.quantum.unlocks.breakTheLoop).toBe(true)
    expect(await app.commitAwayReplacement(revisionEnvelope(app), complete)).toMatchObject({ committed: true })
    const reopened = createApplication(repository)
    await reopened.start()
    expect(readyState(reopened).gameState.challenges?.galvanizers).toBe(1n)
  })
test.each(['active', 'stored-time'] as const)('No Science Quantum run blocks research across %s, persists, and completes despite Entanglement', async mode => {
  const { app, repository } = await setup()
  expect(await app.dispatchPlayer({ ...revisionEnvelope(app), command: { kind: 'challenge.enter-no-science' } })).toMatchObject({ transition: { accepted: true } })
  expect(await app.dispatchPlayer({ ...revisionEnvelope(app), command: { kind: 'research.purchase', researchId: 'research.panel_lifetime_1' } })).toMatchObject({ transition: { accepted: false } })
  const candidate = structuredClone(readyState(app))
  candidate.gameState = { ...candidate.gameState,
    dyson: { ...candidate.gameState.dyson, bots: 100, botDistribution: 1, researchers: 100, workers: 0 },
    infinity: { ...candidate.gameState.infinity, points: 42n },
    quantum: { ...candidate.gameState.quantum, unlocks: { ...candidate.gameState.quantum.unlocks, quantumEntanglement: true } },
    timeline: { ...candidate.gameState.timeline, storedTimeAvailableSeconds: 10 },
  }
  expect(await app.commitAwayReplacement(revisionEnvelope(app), candidate)).toMatchObject({ committed: true })
  if (mode === 'stored-time') expect(await app.commitStoredTime(revisionEnvelope(app), 1)).toMatchObject({ committed: true })
  else expect((await createCoordinator(app).advanceActive(100)).transition.accepted).toBe(true)
  expect(readyState(app).gameState.dyson.science).toBe(0)
  expect(await app.dispatchPlayer({ ...revisionEnvelope(app), command: { kind: 'quantum.request-leap' } })).toMatchObject({ transition: { accepted: true } })
  expect(readyState(app).gameState.challenges).toMatchObject({ active: null, noScienceCompleted: true, galvanizers: 2n })
  expect(readyState(app).gameState.infinity.points).toBe(0n)
  expect(await app.commitAwayReplacement(revisionEnvelope(app), readyState(app))).toMatchObject({ committed: true })
  const reopened = createApplication(repository)
  await reopened.start()
  expect(readyState(reopened).gameState.challenges).toMatchObject({ noScienceCompleted: true, galvanizers: 2n })
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
