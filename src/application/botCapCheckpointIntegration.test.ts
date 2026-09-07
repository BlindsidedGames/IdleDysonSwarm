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
import { OVERFLOW_BOT_CAP } from '../simulation/overflowBoundary'
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

describe('voluntary Overflow coordination', () => {
  test.each([
    { automatic: false, continuous: false },
    { automatic: true, continuous: false },
    { automatic: false, continuous: true },
    { automatic: true, continuous: true },
  ])('holds at Overflow without rewards or a reset (auto=$automatic, continuous=$continuous)', async ({ automatic, continuous }) => {
    const repository = new MemoryRepository()
    const application = createApplication(repository)
    await application.start()
    await installBotCap(application, automatic)
    const before = readyState(application)
    const coordinator = createCoordinator(application)
    const result = await (continuous ? coordinator.advanceActiveContinuous(100) : coordinator.advanceActive(100))
    expect(result).toMatchObject({
      consumedMilliseconds: 100, remainingMilliseconds: 0,
      checkpoints: ['pending'], transition: { accepted: true },
    })
    const held = readyState(application).gameState
    expect(held.infinity).toMatchObject({
      points: before.gameState.infinity.points,
      automaticResetEnabled: automatic,
      botCapTransitionPending: true, botCapRewardsGranted: false, inProgress: false,
    })
    expect(held.dyson.bots).toBe(OVERFLOW_BOT_CAP)
    expect(held.avocado.overflowPoints).toBe(before.gameState.avocado.overflowPoints)
    expect(held.avocado.overflowMultiplier).toBe(before.gameState.avocado.overflowMultiplier)
    expect(held.statistics.lifetime.botCapInfinityPoints).toBe(before.gameState.statistics.lifetime.botCapInfinityPoints)
    expect(held.statistics.lifetime.ordinaryInfinityCount).toBe(before.gameState.statistics.lifetime.ordinaryInfinityCount)
    expect((await coordinator.advanceActive(100)).checkpoints).toEqual([])

    const reopened = createApplication(repository)
    await reopened.start()
    const resumed = await createCoordinator(reopened).advanceActive(100)
    expect(resumed.checkpoints).toEqual([])
    expect(readyState(reopened).gameState.infinity.botCapTransitionPending).toBe(true)
    expect(readyState(reopened).gameState.avocado.overflowPoints).toBe(0n)
    for (const kind of ['infinity.request-reset', 'quantum.request-leap'] as const) {
      const rejected = await reopened.dispatchPlayer({ ...revisionEnvelope(reopened), command: { kind } })
      expect(rejected).toMatchObject({ kind: 'transition', transition: { accepted: false } })
    }
  })

  test('retries an eligibility checkpoint failure without granting anything', async () => {
    const repository = new MemoryRepository(2)
    const application = createApplication(repository)
    await application.start()
    await installBotCap(application, false)
    const before = readyState(application).gameState
    const coordinator = createCoordinator(application)
    const failed = await coordinator.advanceActive(100)
    expect(failed.transition).toMatchObject({ accepted: false, code: 'APP-COMMIT-FIRST-FAILED' })
    expect(failed.checkpoints).toEqual([])
    expect(readyState(application).gameState.avocado).toEqual(before.avocado)
    repository.failureAttempt = undefined
    const retried = await coordinator.advanceActive(100)
    expect(retried.checkpoints).toEqual(['pending'])
    expect(readyState(application).gameState.infinity.points).toBe(before.infinity.points)
    expect(readyState(application).gameState.avocado.overflowPoints).toBe(0n)
  })

  test('publishes a single full reset only after its save succeeds, and reopens the point balance', async () => {
    const repository = new MemoryRepository()
    const application = createApplication(repository)
    await application.start()
    await installBotCap(application, false)
    await createCoordinator(application).advanceActive(100)
    const before = readyState(application)
    let release!: () => void
    let entered!: () => void
    const enteredPromise = new Promise<void>((resolve) => { entered = resolve })
    const releasePromise = new Promise<void>((resolve) => { release = resolve })
    repository.beforeCommit = async () => { entered(); await releasePromise }
    const envelope = { ...revisionEnvelope(application), command: { kind: 'avocado.request-overflow-reset' as const } }
    const pending = application.dispatchPlayer(envelope)
    await enteredPromise
    expect(readyState(application).gameState).toEqual(before.gameState)
    release()
    expect(await pending).toMatchObject({ kind: 'transition', transition: { accepted: true, changed: true } })
    repository.beforeCommit = undefined
    const reset = readyState(application)
    expect(reset.gameState.dyson.bots).toBe(0)
    expect(reset.gameState.infinity.points).toBe(0n)
    expect(reset.gameState.quantum.pointsEarned).toBe(0n)
    expect(Object.values(reset.gameState.quantum.unlocks).every((value) => !value)).toBe(true)
    expect(reset.gameState.reality.influence).toBe(0)
    expect(reset.gameState.dream.strangeMatter).toBe(0)
    expect(reset.gameState.avocado).toEqual({
      unlocked: true, infinityPoints: 0, influence: 0, strangeMatter: 0,
      overflowMultiplier: 0, overflowPoints: 1n,
    })
    expect(reset.gameState.statistics.lifetime.botCapInfinityPoints).toBe(before.gameState.statistics.lifetime.botCapInfinityPoints)
    expect(reset.gameState.statistics.lifetime.botCapOverflowRewards).toBe(before.gameState.statistics.lifetime.botCapOverflowRewards + 1n)
    expect(reset.gameState.skills.presets).toEqual(before.gameState.skills.presets)
    expect(reset.gameState.secretProgress).toEqual(before.gameState.secretProgress)
    expect(reset.entitlements).toEqual(before.entitlements)
    expect(reset.tinker.running).toBe(false)
    expect(await application.dispatchPlayer(envelope)).toMatchObject({ transition: { accepted: false } })
    expect(await requestOverflow(application)).toMatchObject({ transition: { accepted: false } })
    expect(readyState(application).gameState.avocado.overflowPoints).toBe(1n)

    const reopened = createApplication(repository)
    await reopened.start()
    expect(readyState(reopened).gameState.avocado.overflowPoints).toBe(1n)
    expect(readyState(reopened).gameState.infinity.botCapTransitionPending).toBe(false)
    const start = await reopened.dispatchPlayer({ ...revisionEnvelope(reopened), command: { kind: 'tinker.start', repeat: false } })
    expect(start).toMatchObject({ transition: { accepted: true } })
    expect((await createCoordinator(reopened).advanceActive(10_000)).transition.accepted).toBe(true)
    expect(readyState(reopened).gameState.dyson.bots).toBeGreaterThan(0)
  })

  test('failed reset persistence preserves the run and retries for exactly one point', async () => {
    const repository = new MemoryRepository()
    const application = createApplication(repository)
    await application.start()
    await installBotCap(application, false)
    await createCoordinator(application).advanceActive(100)
    const before = readyState(application)
    repository.failureAttempt = 3
    expect(await requestOverflow(application)).toMatchObject({ transition: { accepted: false } })
    expect(readyState(application)).toEqual(before)
    const reopened = createApplication(repository)
    await reopened.start()
    expect(readyState(reopened).gameState.infinity.botCapTransitionPending).toBe(true)
    expect(readyState(reopened).gameState.avocado.overflowPoints).toBe(0n)
    repository.failureAttempt = undefined
    expect(await requestOverflow(reopened)).toMatchObject({ transition: { accepted: true } })
    expect(readyState(reopened).gameState.avocado.overflowPoints).toBe(1n)
    expect(await requestOverflow(reopened)).toMatchObject({ transition: { accepted: false } })
  })

  test('a premature reset does not write or change progression', async () => {
    const repository = new MemoryRepository()
    const application = createApplication(repository)
    await application.start()
    const before = readyState(application)
    expect(await requestOverflow(application)).toMatchObject({ transition: { accepted: false } })
    expect(readyState(application)).toEqual(before)
    expect(repository.commits).toHaveLength(0)
  })

  test('eligibility survives Stellar spending and reload without another reward', async () => {
    const repository = new MemoryRepository()
    const application = createApplication(repository)
    await application.start()
    await installBotCap(application, false)
    await createCoordinator(application).advanceActive(100)
    const reduced = structuredClone(readyState(application))
    reduced.gameState = { ...reduced.gameState, dyson: { ...reduced.gameState.dyson, bots: 1e200 } }
    expect(await application.commitAwayReplacement(revisionEnvelope(application), reduced)).toMatchObject({ committed: true })
    const reopened = createApplication(repository)
    await reopened.start()
    expect(readyState(reopened).gameState.infinity.botCapTransitionPending).toBe(true)
    expect(await requestOverflow(reopened)).toMatchObject({ transition: { accepted: true } })
    expect(readyState(reopened).gameState.avocado.overflowPoints).toBe(1n)
  })
})

function requestOverflow(application: CanonicalGameApplicationFacade) {
  return application.dispatchPlayer({ ...revisionEnvelope(application), command: { kind: 'avocado.request-overflow-reset' } })
}

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

async function installBotCap(
  application: CanonicalGameApplicationFacade,
  automaticResetEnabled: boolean,
): Promise<void> {
  const snapshot = application.snapshot()
  expect(snapshot.phase).toBe('ready')
  if (snapshot.phase !== 'ready') return
  const candidate = structuredClone(snapshot.state)
  candidate.gameState = {
    ...candidate.gameState,
    dyson: {
      ...candidate.gameState.dyson,
      bots: OVERFLOW_BOT_CAP,
    },
    infinity: {
      ...candidate.gameState.infinity,
      automaticResetEnabled,
      botCapTransitionPending: false,
      botCapRewardsGranted: false,
      inProgress: false,
    },
    quantum: { ...candidate.gameState.quantum, unlocks: { ...candidate.gameState.quantum.unlocks, breakTheLoop: true } },
    timeline: {
      ...candidate.gameState.timeline,
      eventClockInitialized: true,
      automationTimeUntilNextEvent: 1,
      infinityCycleSeconds: 1,
    },
  }
  await expect(application.commitAwayReplacement(
    {
      sessionRevision: snapshot.revision.session,
      expectedStateRevision: snapshot.revision.state,
    },
    candidate,
  )).resolves.toMatchObject({ committed: true })
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
        `Deliberate bot-cap commit failure ${this.commitAttempts}.`,
      )
    }
    this.commits.push(save)
    this.current = save
    return save
  }
}
