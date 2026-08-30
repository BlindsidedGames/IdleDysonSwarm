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

describe('bot-cap checkpoint coordination', () => {
  test('settles exactly once with automatic Infinity disabled', async () => {
    const repository = new MemoryRepository()
    const application = createApplication(repository)
    await application.start()
    await installBotCap(application, false)
    const coordinator = createCoordinator(application)
    const before = readyState(application)
    const commitsBefore = repository.commits.length
    const pointsBefore = before.gameState.infinity.points
    const ordinaryBefore =
      before.gameState.statistics.lifetime.ordinaryInfinityCount
    const botCapBefore =
      before.gameState.statistics.lifetime.botCapInfinityPoints

    const result = await coordinator.advanceActive(100)

    expect(result).toMatchObject({
      requestedMilliseconds: 100,
      consumedMilliseconds: 100,
      remainingMilliseconds: 0,
      checkpoints: ['pending', 'rewards'],
      transition: { accepted: true },
    })
    expect(repository.commits).toHaveLength(commitsBefore + 2)
    const settled = readyState(application)
    expect(settled.gameState.infinity).toMatchObject({
      points: pointsBefore + 1_000n,
      automaticResetEnabled: false,
      botCapTransitionPending: false,
      botCapRewardsGranted: true,
    })
    expect(settled.gameState.dyson.bots).toBe(
      ordinaryInfinityBotThreshold(
        settled.gameState.quantum.divisionsPurchased,
      ),
    )
    expect(
      settled.gameState.statistics.lifetime.ordinaryInfinityCount,
    ).toBe(ordinaryBefore)
    expect(
      settled.gameState.statistics.lifetime.botCapInfinityPoints,
    ).toBe(botCapBefore + 1_000n)

    const repeated = await coordinator.advanceActive(100)
    expect(repeated.checkpoints).toEqual([])
    expect(
      readyState(application).gameState.statistics.lifetime
        .botCapInfinityPoints,
    ).toBe(botCapBefore + 1_000n)
  })

  test('settles during suppressed active processing and defers the enabled automatic action across reload', async () => {
    const repository = new MemoryRepository()
    const application = createApplication(repository)
    await application.start()
    await installBotCap(application, true)
    const coordinator = createCoordinator(application)
    const before = readyState(application)
    const commitsBefore = repository.commits.length
    const pointsBefore = before.gameState.infinity.points
    const ordinaryBefore =
      before.gameState.statistics.lifetime.ordinaryInfinityCount
    const botCapBefore =
      before.gameState.statistics.lifetime.botCapInfinityPoints

    const suppressed = await coordinator.advanceActiveContinuous(50)

    expect(suppressed).toMatchObject({
      requestedMilliseconds: 50,
      consumedMilliseconds: 50,
      remainingMilliseconds: 0,
      checkpoints: ['pending', 'rewards'],
      transition: { accepted: true },
    })
    expect(repository.commits).toHaveLength(commitsBefore + 2)
    const settled = readyState(application)
    expect(settled.gameState.infinity).toMatchObject({
      points: pointsBefore + 1_000n,
      automaticResetEnabled: true,
      botCapRewardsGranted: true,
    })
    expect(settled.gameState.dyson.bots).toBe(
      ordinaryInfinityBotThreshold(
        settled.gameState.quantum.divisionsPurchased,
      ),
    )
    expect(
      settled.gameState.statistics.lifetime.ordinaryInfinityCount,
    ).toBe(ordinaryBefore)

    const reopened = createApplication(repository)
    await reopened.start()
    const durable = readyState(reopened)
    expect(durable.gameState.infinity).toMatchObject({
      points: pointsBefore + 1_000n,
      automaticResetEnabled: true,
      botCapTransitionPending: false,
      botCapRewardsGranted: true,
    })
    expect(durable.gameState.dyson.bots).toBe(Number.MAX_VALUE)
    expect(
      durable.gameState.statistics.lifetime.botCapInfinityPoints,
    ).toBe(botCapBefore + 1_000n)

    const resumed = await createCoordinator(reopened).advanceActive(100)
    expect(resumed.checkpoints).toEqual([])
    const afterResume = readyState(reopened)
    expect(afterResume.gameState.dyson.bots).toBeLessThan(Number.MAX_VALUE)
    expect(afterResume.gameState.infinity.botCapRewardsGranted).toBe(false)
    expect(
      afterResume.gameState.statistics.lifetime.ordinaryInfinityCount,
    ).toBe(ordinaryBefore + 1n)
    expect(
      afterResume.gameState.statistics.lifetime.botCapInfinityPoints,
    ).toBe(botCapBefore + 1_000n)
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
      bots: Number.MAX_VALUE,
    },
    infinity: {
      ...candidate.gameState.infinity,
      automaticResetEnabled,
      botCapTransitionPending: false,
      botCapRewardsGranted: false,
      inProgress: false,
    },
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
  private current = prepared

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
    this.commits.push(save)
    this.current = save
    return save
  }
}
