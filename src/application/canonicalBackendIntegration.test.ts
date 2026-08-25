import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { gameDataCatalog } from '../game-data/catalog'
import type { PreparedSave } from '../save/prepare'
import { prepareIdb1Save } from '../save/prepare'
import type {
  FirstLaunchMigrationResult,
  SaveCommitTarget,
  SaveRepository,
} from '../save/repository'
import {
  deriveBasicDysonState,
  type DysonEntitlements,
} from '../simulation/canonicalDysonDerivation'
import {
  createCapturedInfinityAssetLookup,
  type CanonicalEventTimeContext,
} from '../simulation/canonicalEventTimeModel'
import { SIMULATION_UPGRADE_DEFINITIONS } from '../simulation/dreamEducationUpgrades'
import { MOBILE_LIFECYCLE_POLICY } from '../simulation/lifecycleAwayTime'
import { REALITY_UPGRADE_DEFINITIONS } from '../simulation/realityUpgrades'
import {
  createCanonicalGameApplication,
  type CanonicalGameApplicationFacade,
  type CanonicalPlayerCommand,
} from './canonicalGameApplication'
import {
  CanonicalLifecycleCoordinator,
  type CanonicalLifecycleClock,
} from './canonicalLifecycleCoordinator'
import {
  CanonicalRuntimeSession,
  cloneCanonicalRuntimeState,
  createCanonicalRuntimeSessionFactory,
  type CanonicalRuntimeState,
} from './canonicalRuntimeSession'

const fixtureUrl = new URL(
  '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
  import.meta.url,
)

const ENTITLEMENTS: DysonEntitlements = Object.freeze({
  extraAnalysisPower: false,
  permanentDoubleIp: false,
})

describe('frontend-ready canonical backend integration', () => {
  test('loads, executes every gameplay family, crosses prestige boundaries, persists, reconstructs, and continues equivalently', async () => {
    const repository = new IntegrationRepository(
      createSeededPreparedSave(),
    )
    const firstApplication = createApplication(repository)
    const lifecycle = new TestLifecycleAdapter()
    const clock = mutableClock('2026-07-29T00:00:00Z')
    const firstCoordinator = new CanonicalLifecycleCoordinator({
      application: firstApplication,
      lifecycle,
      clock,
      policy: MOBILE_LIFECYCLE_POLICY,
    })

    const startup = await firstCoordinator.start()
    if ('code' in startup && startup.code === 'not-ready') {
      throw new Error(
        `Canonical startup failed: ${JSON.stringify(firstApplication.snapshot())}`,
      )
    }
    expect(startup).toMatchObject({
      replayed: false,
      code: 'no-quit-timestamp',
    })

    await expectChanged(firstCoordinator, firstApplication, {
      kind: 'dyson.set-buy-mode',
      buyMode: 'buy-10',
    })
    await expectChanged(firstCoordinator, firstApplication, {
      kind: 'research.set-buy-mode',
      buyMode: 'buy-50',
    })
    await expectChanged(firstCoordinator, firstApplication, {
      kind: 'skill.rename-preset',
      slot: 1,
      name: 'Frontend contract',
    })
    await expectChanged(firstCoordinator, firstApplication, {
      kind: 'skill.set-preset-color',
      slot: 1,
      colorId: 'pink',
    })
    await expectChanged(firstCoordinator, firstApplication, {
      kind: 'dream.request-reset',
    })
    await expectChanged(firstCoordinator, firstApplication, {
      kind: 'reality.gather-influence',
    })
    await expectChanged(firstCoordinator, firstApplication, {
      kind: 'quantum.request-leap',
    })
    await expectChanged(firstCoordinator, firstApplication, {
      kind: 'infinity.set-break-target',
      target: 99n,
    })
    await expectChanged(firstCoordinator, firstApplication, {
      kind: 'avocado.feed',
      source: 'strange-matter',
    })
    await expectChanged(firstCoordinator, firstApplication, {
      kind: 'tinker.start',
      repeat: false,
    })

    const active = await firstCoordinator.advanceActive(1_000)
    expect(active.transition.accepted, JSON.stringify(active)).toBe(true)
    expect(active.remainingMilliseconds).toBe(0)
    expect(active.checkpoints).toEqual(['pending', 'rewards'])
    expect(
      readyRuntime(firstApplication).gameState.infinity
        .botCapTransitionPending,
    ).toBe(false)

    for (let pass = 0; pass < 5; pass += 1) {
      const runtime = readyRuntime(firstApplication)
      if (!runtime.tinker.running) break
      const remaining = Math.max(
        0.001,
        runtime.tinker.cooldownSeconds -
          runtime.tinker.elapsedSeconds +
          0.001,
      )
      const completion =
        await firstCoordinator.advanceActive(remaining * 1_000)
      expect(completion.transition.accepted).toBe(true)
    }
    expect(readyRuntime(firstApplication).tinker.running).toBe(false)

    expect(
      await firstCoordinator.handlePlatformPhase('background'),
    ).toMatchObject({ requested: true, committed: true })
    clock.set('2026-07-29T00:00:05Z')
    expect(
      await firstCoordinator.handlePlatformPhase('active'),
    ).toMatchObject({
      replayed: true,
      committed: true,
      grantedSeconds: 5,
    })

    const storedSnapshot = readyApplicationSnapshot(firstApplication)
    const stored = await firstCoordinator.dispatchPlayer({
      sessionRevision: storedSnapshot.revision.session,
      expectedStateRevision: storedSnapshot.revision.state,
      command: {
        kind: 'time.request-stored-time-spend',
        requestedSeconds: 1,
      },
    })
    expect(stored).toMatchObject({
      kind: 'stored-time',
      result: {
        status: 'complete',
        admittedSeconds: 1,
        consumedSeconds: 1,
        remainingSeconds: 0,
      },
    })

    const checkpoint = await firstApplication.checkpoint()
    expect(checkpoint.committed).toBe(true)
    const firstFrontend = firstApplication.frontendSnapshot()
    expect(firstApplication.frontendSnapshot()).toBe(firstFrontend)
    expect(firstFrontend.phase).toBe('ready')
    if (firstFrontend.phase !== 'ready') return
    expect(firstFrontend.gameplay.commands.byKind['tinker.start'])
      .toMatchObject({ routeAvailable: true })

    const reconstructedApplication = createApplication(repository)
    const reconstructedCoordinator =
      new CanonicalLifecycleCoordinator({
        application: reconstructedApplication,
        lifecycle: new TestLifecycleAdapter(),
        clock,
        policy: MOBILE_LIFECYCLE_POLICY,
      })
    await reconstructedCoordinator.start()

    const beforeFirst = readyRuntime(firstApplication)
    const beforeReconstructed =
      readyRuntime(reconstructedApplication)
    expect(beforeReconstructed.gameState).toEqual(beforeFirst.gameState)
    expect(beforeReconstructed.compatibilityTuning)
      .toEqual(beforeFirst.compatibilityTuning)
    expect(beforeReconstructed.evaluationSnapshot)
      .toEqual(beforeFirst.evaluationSnapshot)
    expect(beforeReconstructed.storedTimeCheater)
      .toBe(beforeFirst.storedTimeCheater)
    expect(beforeReconstructed.selectedSkillPresetSlot)
      .toBe(beforeFirst.selectedSkillPresetSlot)
    expect(beforeReconstructed.tinker.running).toBe(false)

    const firstContinuation =
      await firstCoordinator.advanceActive(250)
    const reconstructedContinuation =
      await reconstructedCoordinator.advanceActive(250)
    expect(firstContinuation.transition.accepted).toBe(true)
    expect(reconstructedContinuation.transition.accepted).toBe(true)

    const continuedFirst = readyRuntime(firstApplication)
    const continuedReconstructed =
      readyRuntime(reconstructedApplication)
    expect(continuedReconstructed.gameState)
      .toEqual(continuedFirst.gameState)
    expect(continuedReconstructed.evaluationSnapshot)
      .toEqual(continuedFirst.evaluationSnapshot)
    expect(
      reconstructedApplication.frontendSnapshot().gameplay,
    ).toEqual(firstApplication.frontendSnapshot().gameplay)
    expect(
      reconstructedApplication.frontendSnapshot().phase === 'ready' &&
        firstApplication.frontendSnapshot().phase === 'ready'
        ? reconstructedApplication.frontendSnapshot().gameplay
            .definitionCoverage
        : undefined,
    ).toBe(
      firstApplication.frontendSnapshot().phase === 'ready'
        ? firstApplication.frontendSnapshot().gameplay.definitionCoverage
        : undefined,
    )
    expect(repository.commits.length).toBeGreaterThanOrEqual(6)
  })
})

class IntegrationRepository implements SaveRepository {
  current: PreparedSave
  readonly commits: PreparedSave[] = []

  constructor(current: PreparedSave) {
    this.current = current
  }

  async hasCurrent(): Promise<boolean> {
    return true
  }

  async loadCurrent(): Promise<PreparedSave> {
    return this.current
  }

  async migrateLegacyOnFirstLaunch(): Promise<FirstLaunchMigrationResult> {
    return { status: 'already-migrated', save: this.current }
  }

  async commit(
    save: PreparedSave,
    _target: SaveCommitTarget = 'development',
  ): Promise<PreparedSave> {
    const committed = save.withValidatedState(
      save.copyValidatedState(),
    )
    this.current = committed
    this.commits.push(committed)
    return committed
  }
}

class TestLifecycleAdapter {
  private readonly listeners = new Set<
    (phase: 'active' | 'background' | 'focus-lost' | 'terminating') => void
  >()

  currentPhase() {
    return 'active' as const
  }

  subscribe(
    listener: (
      phase: 'active' | 'background' | 'focus-lost' | 'terminating'
    ) => void,
  ): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

function createApplication(
  repository: IntegrationRepository,
): CanonicalGameApplicationFacade {
  return createCanonicalGameApplication({
    repository,
    startupResolver: {
      resolve: async () => ({
        kind: 'ready',
        source: 'primary',
        save: repository.current,
      }),
    },
    sessionFactory: createCanonicalRuntimeSessionFactory({
      entitlements: ENTITLEMENTS,
    }),
    engine: {
      eventContext: eventContext(),
    },
  })
}

function createSeededPreparedSave(): PreparedSave {
  const prepared = prepareIdb1Save(
    readFileSync(fixtureUrl, 'utf8'),
  ).prepared
  const session = new CanonicalRuntimeSession(prepared, {
    entitlements: ENTITLEMENTS,
  })
  const runtime = cloneCanonicalRuntimeState(session.initialState)
  Object.assign(runtime, {
    gameState: {
      ...runtime.gameState,
      dyson: {
        ...runtime.gameState.dyson,
        bots: Number.MAX_VALUE,
        money: 1e100,
        science: 1e100,
      },
      infinity: {
        ...runtime.gameState.infinity,
        points: 42n,
        spentPoints: 0n,
        botCapTransitionPending: false,
        botCapRewardsGranted: false,
        inProgress: false,
      },
      reality: {
        ...runtime.gameState.reality,
        influence: 1_000_000n,
        workersReady: 128n,
      },
      quantum: {
        ...runtime.gameState.quantum,
        unlocks: {
          ...runtime.gameState.quantum.unlocks,
          quantumEntanglement: true,
          breakTheLoop: true,
        },
      },
      avocado: {
        ...runtime.gameState.avocado,
        unlocked: true,
      },
      dream: {
        ...runtime.gameState.dream,
        strangeMatter: 0n,
        disasterStage: 0n,
        resources: {
          ...runtime.gameState.dream.resources,
          cities: 1,
        },
      },
      timeline: {
        ...runtime.gameState.timeline,
        eventClockInitialized: true,
        automationTimeUntilNextEvent: 0.1,
        infinityBoundaryRemaining: 0,
        storedTimeAvailableSeconds: 2,
        storedTimeCapacitySeconds: 100,
        lastSuspendedAtLegacyText: null,
        doubleTime: {
          ...runtime.gameState.timeline.doubleTime,
          unlocked: true,
          enabled: false,
          bankSeconds: 0,
          rate: 1,
        },
      },
    },
  })
  const derived = deriveBasicDysonState(
    runtime.gameState,
    runtime.compatibilityTuning,
    runtime.entitlements,
    runtime.evaluationSnapshot,
  )
  if (!derived.ok) {
    throw new Error(
      derived.issues[0]?.detail ?? 'Seed derivation failed.',
    )
  }
  Object.assign(runtime, {
    evaluationSnapshot: derived.value.nextEvaluationSnapshot,
  })
  return session.prepare(runtime)
}

function eventContext(): CanonicalEventTimeContext {
  return {
    mode: 'active',
    automationIntervalSeconds: 0.1,
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

async function expectChanged(
  coordinator: CanonicalLifecycleCoordinator,
  application: CanonicalGameApplicationFacade,
  command: CanonicalPlayerCommand,
): Promise<void> {
  const snapshot = readyApplicationSnapshot(application)
  const result = await coordinator.dispatchPlayer({
    sessionRevision: snapshot.revision.session,
    expectedStateRevision: snapshot.revision.state,
    command,
  })
  expect(result.kind).toBe('transition')
  if (result.kind !== 'transition') return
  if (!result.transition.accepted) {
    throw new Error(
      `${command.kind} rejected: ${result.transition.code} - ${result.transition.reason}`,
    )
  }
  expect(result.transition).toMatchObject({
    accepted: true,
    changed: true,
  })
}

function readyApplicationSnapshot(
  application: CanonicalGameApplicationFacade,
) {
  const snapshot = application.snapshot()
  if (snapshot.phase !== 'ready') {
    throw new Error('Expected a ready canonical application.')
  }
  return snapshot
}

function readyRuntime(
  application: CanonicalGameApplicationFacade,
): CanonicalRuntimeState {
  return cloneCanonicalRuntimeState(
    readyApplicationSnapshot(application)
      .state as CanonicalRuntimeState,
  )
}

function mutableClock(initialIso: string): CanonicalLifecycleClock & {
  set(iso: string): void
} {
  let current = initialIso
  return {
    sample: () => ({
      utcMilliseconds: Date.parse(current),
      serializedUtcText: current,
    }),
    set: (next) => {
      current = next
    },
  }
}
