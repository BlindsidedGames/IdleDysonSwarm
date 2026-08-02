import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { gameDataCatalog } from '../game-data/catalog'
import { prepareIdb1Save } from '../save/prepare'
import type {
  FirstLaunchMigrationResult,
  SaveCommitTarget,
  SaveRepository,
} from '../save/repository'
import {
  SIMULATION_UPGRADE_DEFINITIONS,
} from '../simulation/dreamEducationUpgrades'
import { DEFAULT_AUTOMATION_INTERVAL_SECONDS } from '../simulation/eventTime'
import {
  REALITY_UPGRADE_DEFINITIONS,
} from '../simulation/realityUpgrades'
import {
  readRealityWorkerTuning,
} from '../simulation/realityWorkers'
import {
  createProductionCanonicalApplicationFactory,
  createProductionEventContext,
} from './productionApplicationFactory'

const fixtureUrl = new URL(
  '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
  import.meta.url,
)

describe('production canonical application factory', () => {
  test('captures existing generated authorities without frontend defaults', () => {
    const context = createProductionEventContext()
    const asset = gameDataCatalog.assets[0]

    expect(context.automationIntervalSeconds).toBe(
      DEFAULT_AUTOMATION_INTERVAL_SECONDS,
    )
    expect(context.dysonPresentationTuning).toEqual({
      solidProgressThresholdPerSecond: 4,
    })
    expect(context.realityWorkerTuning).toEqual(
      readRealityWorkerTuning(),
    )
    expect(context.dreamResetDefinitions).toBe(
      SIMULATION_UPGRADE_DEFINITIONS,
    )
    expect(context.realityUpgradeDefinitions).toBe(
      REALITY_UPGRADE_DEFINITIONS,
    )
    expect(asset).toBeDefined()
    if (asset === undefined) return
    const captured = context.infinityResetAssetLookup(
      asset.kind,
      asset.id,
    )
    expect(captured).toEqual(asset)
    expect(captured).not.toBe(asset)
    expect(Object.isFrozen(context)).toBe(true)
    expect(Object.isFrozen(context.realityWorkerTuning)).toBe(true)
  })

  test('captures retained host progress tuning in the production event context', () => {
    const context = createProductionEventContext({
      solidProgressThresholdPerSecond: 9,
    })

    expect(context.dysonPresentationTuning).toEqual({
      solidProgressThresholdPerSecond: 9,
    })
    expect(Object.isFrozen(context.dysonPresentationTuning)).toBe(true)
  })

  test('invokes the authentic first-run seam only after repository discovery and checkpoints it', async () => {
    const prepared = prepareIdb1Save(
      readFileSync(fixtureUrl, 'utf8'),
    ).prepared
    const repository = new FirstRunRepository()
    let firstRunCalls = 0
    let entitlementReads = 0
    const createApplication =
      createProductionCanonicalApplicationFactory({
        createFirstRunSave: () => {
          firstRunCalls += 1
          return prepared
        },
        readHostEntitlements: () => {
          entitlementReads += 1
          return { permanentDoubleIp: true }
        },
      })

    expect(firstRunCalls).toBe(0)
    const application = createApplication(repository)
    expect(entitlementReads).toBe(1)
    expect(firstRunCalls).toBe(0)

    await expect(application.start()).resolves.toMatchObject({
      phase: 'ready',
      source: 'first-run',
      revision: {
        session: 1,
        state: 0,
        durable: 0,
      },
    })
    expect(firstRunCalls).toBe(1)
    expect(repository.commitTargets).toEqual(['development'])
    const snapshot = application.snapshot()
    expect(snapshot.phase).toBe('ready')
    if (snapshot.phase !== 'ready') return
    expect(snapshot.state.entitlements).toEqual({
      permanentDoubleIp: true,
    })
    expect(Object.isFrozen(snapshot.state.entitlements)).toBe(true)
  })

  test('fails closed when the host entitlement authority is malformed', () => {
    const createApplication =
      createProductionCanonicalApplicationFactory({
        createFirstRunSave: () => {
          throw new Error('must not run')
        },
        readHostEntitlements: () =>
          ({ permanentDoubleIp: 'yes' }) as never,
      })

    expect(() => createApplication(new FirstRunRepository())).toThrow(
      'explicit permanentDoubleIp boolean',
    )
  })
})

class FirstRunRepository implements SaveRepository {
  readonly commitTargets: SaveCommitTarget[] = []

  async hasCurrent(): Promise<boolean> {
    return false
  }

  async loadCurrent(): Promise<null> {
    return null
  }

  async migrateLegacyOnFirstLaunch():
    Promise<FirstLaunchMigrationResult> {
    return { status: 'no-legacy-save' }
  }

  async commit(
    save: ReturnType<typeof prepareIdb1Save>['prepared'],
    target: SaveCommitTarget = 'development',
  ) {
    this.commitTargets.push(target)
    return save
  }
}
