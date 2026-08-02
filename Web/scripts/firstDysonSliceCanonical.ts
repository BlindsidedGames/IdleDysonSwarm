/**
 * Purpose: Generates the frozen first-Dyson UI acceptance artifact through
 * the canonical application facade and lifecycle coordinator.
 * Runtime: Node tooling and Vitest; never shipped as browser gameplay code.
 * Primary entry point: generateFirstDysonSliceFixture.
 * Interacts with: CanonicalGameApplicationFacade,
 * CanonicalLifecycleCoordinator, the frontend snapshot projection, and the
 * checked-in schema-8 save/catalog sources.
 * Change notes: Snapshot fields, command sequence, seeded state, or checkpoint
 * flow changes require regenerating first-dyson-slice.fixture.json and updating
 * its consumer assertions together.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { gameDataCatalog } from '../src/game-data/catalog'
import type { PreparedSave } from '../src/save/prepare'
import { prepareIdb1Save } from '../src/save/prepare'
import type {
  FirstLaunchMigrationResult,
  SaveCommitTarget,
  SaveRepository,
} from '../src/save/repository'
import {
  deriveBasicDysonState,
  type DysonEntitlements,
} from '../src/simulation/canonicalDysonDerivation'
import {
  createCapturedInfinityAssetLookup,
  type CanonicalEventTimeContext,
} from '../src/simulation/canonicalEventTimeModel'
import { SIMULATION_UPGRADE_DEFINITIONS } from '../src/simulation/dreamEducationUpgrades'
import { MOBILE_LIFECYCLE_POLICY } from '../src/simulation/lifecycleAwayTime'
import { REALITY_UPGRADE_DEFINITIONS } from '../src/simulation/realityUpgrades'
import {
  createCanonicalGameApplication,
  type CanonicalGameApplicationFacade,
} from '../src/application/canonicalGameApplication'
import { CanonicalLifecycleCoordinator } from '../src/application/canonicalLifecycleCoordinator'
import { createFrontendCommandEnvelope } from '../src/application/frontendSnapshot'
import {
  CanonicalRuntimeSession,
  cloneCanonicalRuntimeState,
  createCanonicalRuntimeSessionFactory,
} from '../src/application/canonicalRuntimeSession'

const SOURCE_SAVE_URL = new URL(
  '../test/fixtures/schema-08-canonical-idb1-main-save.txt',
  import.meta.url,
)
const CATALOG_URL = new URL(
  '../src/game-data/generated/catalog.json',
  import.meta.url,
)
const ENTITLEMENTS: DysonEntitlements = Object.freeze({
  extraAnalysisPower: false,
  permanentDoubleIp: false,
})

export interface FirstDysonSliceFixtureArtifact {
  readonly schemaVersion: 1
  readonly preparedSave: {
    readonly sourcePath: string
    readonly sourceSha256: string
    readonly preparedStateSha256: string
    readonly catalogSha256: string
  }
  readonly initial: FirstDysonSliceSnapshotFacts
  readonly commands: {
    readonly tinker: FirstDysonSliceEnvelope
    readonly basicFacility: FirstDysonSliceEnvelope
  }
  readonly outcomes: {
    readonly tinkerAccepted: unknown
    readonly tinkerProgress: unknown
    readonly tinkerCompletion: unknown
    readonly basicFacilityAccepted: unknown
    readonly staleFacility: unknown
    readonly rejectedFacility: unknown
  }
  readonly tinker: {
    readonly inProgress: FirstDysonSliceTinkerFacts
    readonly completed: FirstDysonSliceTinkerFacts
  }
  readonly checkpointedReconstruction: FirstDysonSliceSnapshotFacts
}

export interface FirstDysonSliceTinkerFacts {
  readonly bots: number
  readonly tinker: Record<string, unknown>
}

export interface FirstDysonSliceEnvelope {
  readonly sessionRevision: number
  readonly expectedStateRevision: number
  readonly command: Record<string, unknown>
}

export interface FirstDysonSliceSnapshotFacts {
  readonly phase: 'ready'
  readonly source: string
  readonly revision: {
    readonly session: number
    readonly state: number
    readonly durable: number | null
  }
  readonly checkpoint: Record<string, unknown>
  readonly resources: Record<string, unknown>
  readonly facilities: Record<string, unknown>
  readonly visibility: Record<string, unknown>
  readonly tinker: Record<string, unknown>
  readonly commands: Record<string, unknown>
  readonly basicFacilityPreviews: readonly Record<string, unknown>[]
}

/**
 * Executes the early-Dyson fixture through the public facade and lifecycle
 * coordinator. Fixture facts are projected from the frontend boundary; this
 * helper intentionally contains setup only, never economy expectations.
 */
export async function generateFirstDysonSliceFixture(): Promise<FirstDysonSliceFixtureArtifact> {
  const prepared = createSeededPreparedSave()
  const repository = new FixtureRepository(prepared)
  const first = createFixtureApplication(repository)
  const firstCoordinator = new CanonicalLifecycleCoordinator({
    application: first,
    lifecycle: new FixtureLifecycleAdapter(),
    clock: fixtureClock(),
    policy: MOBILE_LIFECYCLE_POLICY,
  })

  await firstCoordinator.start()
  const initial = readFirstSliceFacts(first)
  const tinker = createFrontendCommandEnvelope(initial.revision, {
    kind: 'tinker.start',
    repeat: false,
  })
  const tinkerAccepted = await firstCoordinator.dispatchPlayer(tinker)
  const tinkerProgress = await firstCoordinator.advanceActive(100)
  const inProgress = readTinkerFacts(first)
  const tinkerCompletion = await firstCoordinator.advanceActive(200)
  const completed = readTinkerFacts(first)

  const basicFacility = createFrontendCommandEnvelope(
    readFirstSliceFacts(first).revision,
    {
      kind: 'dyson.purchase-basic-facility',
      facilityId: 'assembly_lines',
    },
  )
  const basicFacilityAccepted = await firstCoordinator.dispatchPlayer(
    basicFacility,
  )
  const staleFacility = await firstCoordinator.dispatchPlayer(basicFacility)
  const rejectedFacility = await firstCoordinator.dispatchPlayer(
    createFrontendCommandEnvelope(readFirstSliceFacts(first).revision, {
      kind: 'dyson.purchase-basic-facility',
      facilityId: 'servers',
    }),
  )

  const checkpoint = await first.checkpoint()
  if (!checkpoint.committed) {
    throw new Error(`Fixture checkpoint failed: ${checkpoint.reason}`)
  }
  const reconstructed = createFixtureApplication(repository)
  const reconstructedCoordinator = new CanonicalLifecycleCoordinator({
    application: reconstructed,
    lifecycle: new FixtureLifecycleAdapter(),
    clock: fixtureClock(),
    policy: MOBILE_LIFECYCLE_POLICY,
  })
  await reconstructedCoordinator.start()

  return {
    schemaVersion: 1,
    preparedSave: {
      sourcePath: 'test/fixtures/schema-08-canonical-idb1-main-save.txt',
      sourceSha256: sha256(readFileSync(SOURCE_SAVE_URL)),
      preparedStateSha256: sha256(stableJson(prepared.copyValidatedState())),
      catalogSha256: sha256(readFileSync(CATALOG_URL)),
    },
    initial,
    commands: {
      tinker: serialize(tinker) as FirstDysonSliceEnvelope,
      basicFacility: serialize(basicFacility) as FirstDysonSliceEnvelope,
    },
    outcomes: {
      tinkerAccepted: serialize(tinkerAccepted),
      tinkerProgress: serialize(tinkerProgress),
      tinkerCompletion: serialize(tinkerCompletion),
      basicFacilityAccepted: serialize(basicFacilityAccepted),
      staleFacility: serialize(staleFacility),
      rejectedFacility: serialize(rejectedFacility),
    },
    tinker: { inProgress, completed },
    checkpointedReconstruction: readFirstSliceFacts(reconstructed),
  }
}

function createFixtureApplication(
  repository: FixtureRepository,
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
    sessionFactory: createCanonicalRuntimeSessionFactory({ entitlements: ENTITLEMENTS }),
    engine: { eventContext: eventContext() },
  })
}

function createSeededPreparedSave(): PreparedSave {
  const prepared = prepareIdb1Save(readFileSync(SOURCE_SAVE_URL, 'utf8')).prepared
  const session = new CanonicalRuntimeSession(prepared, { entitlements: ENTITLEMENTS })
  const runtime = cloneCanonicalRuntimeState(session.initialState)
  Object.assign(runtime, {
    gameState: {
      ...runtime.gameState,
      dyson: {
        ...runtime.gameState.dyson,
        money: 1_000_000,
        science: 0,
        bots: 0,
        facilities: {
          ...runtime.gameState.dyson.facilities,
          assembly_lines: [0, 0],
          ai_managers: [0, 0],
          servers: [0, 0],
          data_centers: [0, 0],
          planets: [0, 0],
        },
      },
      timeline: {
        ...runtime.gameState.timeline,
        eventClockInitialized: true,
        automationTimeUntilNextEvent: 1,
        lastSuspendedAtLegacyText: null,
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
    throw new Error(derived.issues[0]?.detail ?? 'Fixture seed derivation failed.')
  }
  Object.assign(runtime, {
    evaluationSnapshot: derived.value.nextEvaluationSnapshot,
  })
  return session.prepare(runtime)
}

function eventContext(): CanonicalEventTimeContext {
  return {
    automationIntervalSeconds: 1,
    realityWorkerTuning: {
      workerBatchSize: 128n,
      baseWorkerGenerationSpeed: 4,
    },
    dreamResetDefinitions: SIMULATION_UPGRADE_DEFINITIONS,
    realityUpgradeDefinitions: REALITY_UPGRADE_DEFINITIONS,
    infinityResetAssetLookup: createCapturedInfinityAssetLookup(gameDataCatalog.assets),
  }
}

function readFirstSliceFacts(
  application: CanonicalGameApplicationFacade,
): FirstDysonSliceSnapshotFacts {
  const snapshot = application.frontendSnapshot()
  if (snapshot.phase !== 'ready') {
    throw new Error(`Fixture application was not ready: ${snapshot.phase}`)
  }
  return serialize({
    phase: snapshot.phase,
    source: snapshot.source,
    revision: snapshot.revision,
    checkpoint: snapshot.checkpoint,
    resources: snapshot.gameplay.resources.dyson,
    facilities: snapshot.gameplay.progression.dyson.facilities,
    visibility: snapshot.gameplay.visibility.dyson,
    tinker: snapshot.gameplay.runtime.tinker,
    commands: {
      tinkerStart: snapshot.gameplay.commands.byKind['tinker.start'],
      basicFacility: snapshot.gameplay.commands.byKind['dyson.purchase-basic-facility'],
    },
    basicFacilityPreviews: snapshot.gameplay.previews.dyson.basicFacilities,
  }) as FirstDysonSliceSnapshotFacts
}

function readTinkerFacts(
  application: CanonicalGameApplicationFacade,
): FirstDysonSliceTinkerFacts {
  const snapshot = application.frontendSnapshot()
  if (snapshot.phase !== 'ready') {
    throw new Error(`Fixture application was not ready: ${snapshot.phase}`)
  }
  return serialize({
    bots: snapshot.gameplay.resources.dyson.bots,
    tinker: snapshot.gameplay.runtime.tinker,
  }) as FirstDysonSliceTinkerFacts
}

class FixtureRepository implements SaveRepository {
  current: PreparedSave

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
    this.current = save.withValidatedState(save.copyValidatedState())
    return this.current
  }
}

class FixtureLifecycleAdapter {
  subscribe(): () => void {
    return () => undefined
  }
}

function fixtureClock() {
  return {
    sample: () => ({
      utcMilliseconds: Date.parse('2026-07-29T00:00:00Z'),
      serializedUtcText: '2026-07-29T00:00:00Z',
    }),
  }
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

function stableJson(value: unknown): string {
  if (typeof value === 'bigint') return `bigint:${value}`
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function serialize(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) return value.map(serialize)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, serialize(entry)]),
    )
  }
  return value
}
