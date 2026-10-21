import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { prepareIdb1Save, PreparedSave } from '../save/prepare'
import type { FirstLaunchMigrationResult, SaveRepository } from '../save/repository'
import { deserializeWebSave, serializeWebSave } from '../save/serialization'
import { MOBILE_LIFECYCLE_POLICY } from '../simulation/lifecycleAwayTime'
import { createProductionEventContext } from '../simulation/productionEventContext'
import { createCanonicalGameApplication } from './canonicalGameApplication'
import { CanonicalLifecycleCoordinator } from './canonicalLifecycleCoordinator'
import { createCanonicalRuntimeSessionFactory } from './canonicalRuntimeSession'

const fixture = prepareIdb1Save(readFileSync(new URL('../../qa/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')).prepared
const start = Date.parse('2026-09-11T00:00:00Z')
const day = 86_400_000

class Repository implements SaveRepository {
  fail = false
  current: PreparedSave
  constructor(current: PreparedSave) { this.current = current }
  async hasCurrent() { return true }
  async loadCurrent() { return this.current }
  async migrateLegacyOnFirstLaunch(): Promise<FirstLaunchMigrationResult> { return { status: 'already-migrated', save: this.current } }
  async commit(save: PreparedSave) {
    if (this.fail) throw new Error('Simulated storage failure')
    this.current = PreparedSave.fromDecoded(deserializeWebSave(serializeWebSave(save.copyValidatedState())))
    return this.current
  }
}

function setup(extra: Record<string, unknown> = {}) {
  const source = fixture.copyValidatedState()
  Object.assign(source, { idsReworkMigrationChoice: 'keep', processingRewriteMigrated: true, offlineTime: 0, maxOfflineTime: 172800, dateQuitString: null, idsLastActiveAtUtc: null }, extra)
  const repository = new Repository(PreparedSave.fromDecoded(source))
  let now = start
  const open = () => {
    const app = createCanonicalGameApplication({
      repository,
      startupResolver: { resolve: async () => ({ kind: 'ready', source: 'primary', save: await repository.loadCurrent() }) },
      sessionFactory: createCanonicalRuntimeSessionFactory({ entitlements: { permanentDoubleIp: false }, nowUtcMilliseconds: () => now }),
      engine: { eventContext: createProductionEventContext() },
    })
    const coordinator = new CanonicalLifecycleCoordinator({
      application: app,
      lifecycle: { currentPhase: () => 'active', subscribe: () => () => undefined },
      clock: { sample: () => ({ utcMilliseconds: now, serializedUtcText: new Date(now).toISOString() }) },
      policy: MOBILE_LIFECYCLE_POLICY,
      subscribeToLifecycle: false,
    })
    return { app, coordinator }
  }
  return { repository, open, setNow: (value: number) => { now = value } }
}

function savedBank(repository: Repository) { return repository.current.copyValidatedState().offlineTime }

describe('cold-start recovery from active checkpoints', () => {
  test.each([['off', 1], ['last', 5], ['max', 8]] as const)('an abrupt stop with %s resume recovers a day exactly once, including upgraded capacity', async (mode, multiplier) => {
    const harness = setup({ offlineBoostAutoResume: mode, offlineBoostResumeMultiplier: 5 })
    const first = harness.open()
    await first.coordinator.start()
    expect(await first.app.checkpoint()).toMatchObject({ committed: true })
    expect(harness.repository.current.copyValidatedState()).toMatchObject({ dateQuitString: null, idsLastActiveAtUtc: new Date(start).toISOString() })
    harness.setNow(start + day)
    const returned = harness.open()
    expect(await returned.coordinator.start()).toMatchObject({ committed: true, storedTimeCreditedSeconds: 86400 })
    expect(savedBank(harness.repository)).toBe(86400)
    expect(returned.app.snapshot()).toMatchObject({ state: { gameState: { timeline: { ...(mode === 'off' ? {} : { offlineBoost: { multiplier } }), offlineBoostAutoResume: mode, offlineBoostResumeMultiplier: 5 } } } })
    expect(harness.repository.current.copyValidatedState()).toMatchObject({ offlineBoostAutoResume: mode, offlineBoostResumeMultiplier: 5 })
    expect(harness.repository.current.copyValidatedState().idsLastActiveAtUtc).toBe(new Date(start + day).toISOString())
    expect(await returned.coordinator.handlePlatformPhase('active')).toMatchObject({ replayed: false })
    expect(await harness.open().coordinator.start()).toMatchObject({ storedTimeCreditedSeconds: 0 })
    expect(savedBank(harness.repository)).toBe(86400)
    harness.setNow(start + day + 60000)
    expect(await harness.open().coordinator.start()).toMatchObject({ storedTimeCreditedSeconds: 60 })
    expect(savedBank(harness.repository)).toBe(86460)
  })

  test('failed replay retains the baseline through another checkpoint and can retry', async () => {
    const harness = setup({ idsLastActiveAtUtc: new Date(start).toISOString() })
    harness.setNow(start + day)
    harness.repository.fail = true
    const session = harness.open()
    expect(await session.coordinator.start()).toMatchObject({ code: 'commit-failed' })
    expect(savedBank(harness.repository)).toBe(0)
    harness.repository.fail = false
    await session.app.checkpoint()
    expect(harness.repository.current.copyValidatedState().idsLastActiveAtUtc).toBe(new Date(start).toISOString())
    expect(await session.coordinator.handlePlatformPhase('active', undefined, {
      status: 'valid', utcMilliseconds: start + day - 1000,
    })).toMatchObject({ storedTimeCreditedSeconds: 86400 })
    expect(savedBank(harness.repository)).toBe(86400)
  })
})
