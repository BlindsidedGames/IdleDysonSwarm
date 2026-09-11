import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { prepareIdb1Save, prepareImportedSave, PreparedSave } from '../save/prepare'
import type { FirstLaunchMigrationResult, SaveRepository } from '../save/repository'
import { deserializeWebSave, serializeWebSave } from '../save/serialization'
import { MOBILE_LIFECYCLE_POLICY } from '../simulation/lifecycleAwayTime'
import { createProductionEventContext } from '../simulation/productionEventContext'
import { createCanonicalGameApplication } from './canonicalGameApplication'
import { CanonicalLifecycleCoordinator } from './canonicalLifecycleCoordinator'
import { createCanonicalRuntimeSessionFactory } from './canonicalRuntimeSession'

const fixture = prepareIdb1Save(readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')).prepared
const start = Date.parse('2026-09-11T00:00:00Z')
const day = 86_400_000

class Repository implements SaveRepository {
  fail = false
  constructor(public current: PreparedSave) {}
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
  Object.assign(source, { processingRewriteMigrated: true, offlineTime: 0, maxOfflineTime: 172800, dateQuitString: null, idsLastActiveAtUtc: null }, extra)
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
  test('an abrupt stop after an autosave recovers a day exactly once, including upgraded capacity', async () => {
    const harness = setup()
    const first = harness.open()
    await first.coordinator.start()
    expect(await first.app.checkpoint()).toMatchObject({ committed: true })
    expect(harness.repository.current.copyValidatedState()).toMatchObject({ dateQuitString: null, idsLastActiveAtUtc: new Date(start).toISOString() })
    harness.setNow(start + day)
    const returned = harness.open()
    expect(await returned.coordinator.start()).toMatchObject({ committed: true, storedTimeCreditedSeconds: 86400 })
    expect(savedBank(harness.repository)).toBe(86400)
    expect(harness.repository.current.copyValidatedState().idsLastActiveAtUtc).toBe(new Date(start + day).toISOString())
    expect(await returned.coordinator.handlePlatformPhase('active')).toMatchObject({ replayed: false })
    expect(await harness.open().coordinator.start()).toMatchObject({ storedTimeCreditedSeconds: 0 })
    expect(savedBank(harness.repository)).toBe(86400)
    harness.setNow(start + day + 60000)
    expect(await harness.open().coordinator.start()).toMatchObject({ storedTimeCreditedSeconds: 60 })
    expect(savedBank(harness.repository)).toBe(86460)
  })

  test('focus callbacks during active play do not replay an active checkpoint', async () => {
    const harness = setup()
    const session = harness.open()
    await session.coordinator.start()
    await session.app.checkpoint()
    harness.setNow(start + day)
    expect(await session.coordinator.handlePlatformPhase('active')).toMatchObject({ replayed: false })
    expect(savedBank(harness.repository)).toBe(0)
  })

  test('the actual departure timestamp wins over an older active checkpoint', async () => {
    const harness = setup()
    const session = harness.open()
    await session.coordinator.start()
    await session.app.checkpoint()
    harness.setNow(start + 60000)
    await session.coordinator.handlePlatformPhase('background')
    harness.setNow(start + 90000)
    expect(await harness.open().coordinator.start()).toMatchObject({ storedTimeCreditedSeconds: 30 })
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

  test('imports clear the sender fallback while retaining their bank', async () => {
    const harness = setup({ offlineTime: 42, idsLastActiveAtUtc: '2020-01-01T00:00:00Z' })
    harness.repository.current = prepareImportedSave(harness.repository.current, new Date(start).toISOString())
    expect(await harness.open().coordinator.start()).toMatchObject({ code: 'no-quit-timestamp' })
    expect(savedBank(harness.repository)).toBe(42)
  })

  test.each([null, 'not a timestamp'])('legacy/invalid baseline %s never creates invented away time', async (idsLastActiveAtUtc) => {
    const harness = setup({ idsLastActiveAtUtc })
    expect(await harness.open().coordinator.start()).toMatchObject({ code: 'no-quit-timestamp' })
    expect(savedBank(harness.repository)).toBe(0)
  })

  test('clock reversal grants zero and consumes the future baseline', async () => {
    const harness = setup({ idsLastActiveAtUtc: new Date(start + day).toISOString() })
    expect(await harness.open().coordinator.start()).toMatchObject({ committed: true, storedTimeCreditedSeconds: 0 })
    expect(harness.repository.current.copyValidatedState().idsLastActiveAtUtc).toBe(new Date(start).toISOString())
  })
})
