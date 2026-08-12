import { describe, expect, test } from 'vitest'
import { createCanonicalRuntimePublicationV2 } from '../../application/canonicalRuntimeSessionV2'
import { issueInfinityRewardAuthorityV2ForApplication } from '../../application/infinityRewardAuthorityV2'
import { createDeterministicUnityFirstRunPreparedSave } from '../../application/firstRun/unityFirstRunSave'
import { cloneCanonicalGameStateV2 } from '../../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../../game-state/mappingV2'
import { gameDecimalFromNumber, gameDecimalToCanonicalString } from '../../math/gameDecimal'
import type { Schema13PlatformState } from '../../save/schema13'
import type { Stage7V2WorkerLauncherAccessResult } from './access'
import type { Stage7V2WorkerLauncher } from '../stage7V2Harness'
import {
  Stage7V2CertificationHost,
  Stage7V2HostReloadRequiredError,
} from './certificationHost'
import { createStage7V2CertificationUiBinding } from './certificationUiModel'
import type { Stage7V2CertificationStorage } from './contracts'
import { Stage7V2CertificationRepository } from './repository'
import { Stage7V2NativeWriterLeaseManager } from './writerLease'
import type { Stage7V2WriterLeaseManager } from './writerLease'
import { StoredTimeWorkerEngineV2 } from '../../workers/storedTimeV2/storedTimeWorkerEngineV2'
import {
  decodeStoredTimeWorkerMainFrameV2,
  postStoredTimeWorkerFrameMessageV2,
  type StoredTimeWorkerMainMessageV2,
  type StoredTimeWorkerMessageV2,
  type StoredTimeWorkerProgressDtoV2,
} from '../../workers/storedTimeV2/workerProtocolV2'

const SAVED_AT = '2026-08-10T00:00:00.000Z'
const migrated = migratePreparedSaveToV2(
  createDeterministicUnityFirstRunPreparedSave(),
  Object.freeze({ kind: 'trusted-same-device' }),
)
const state = cloneCanonicalGameStateV2(Object.freeze({
  ...migrated.state,
  timeline: Object.freeze({
    ...migrated.state.timeline,
    eventClockInitialized: true,
    automationTimeUntilNextEvent: 0.1,
    infinityBoundaryRemaining: 42_000_000,
    storedTimeCapacitySeconds: 1_000,
    storedTimeAvailableSeconds: 1_000,
  }),
}))

describe('Stage 7 V2 dormant certification host', () => {
  test('constructs inertly, requires durable Returned Time readback, and creates a fresh launcher per retry', async () => {
    const fixture = await hostFixture()
    let loads = 0
    const host = fixture.host(async () => {
      loads += 1
      return accessFailure('launcher-load-failed')
    })
    expect(fixture.storage.operations).toEqual(fixture.initialOperations)
    expect(loads).toBe(0)
    await expect(host.startStoredTime({
      expectedRevision: 7,
      requestedDurationSeconds: 1,
    })).resolves.toMatchObject({ status: 'returned-time-required', storedTimeUntouched: true })
    expect(loads).toBe(0)

    await expect(host.confirmDurableReadmission()).resolves.toMatchObject({ status: 'ready' })
    await expect(host.startStoredTime({
      expectedRevision: 7,
      requestedDurationSeconds: 1,
    })).resolves.toMatchObject({ status: 'resumable-failure', storedTimeUntouched: true })
    expect(host.diagnosticsSnapshot().retryAvailable).toBe(false)
    const binding = createStage7V2CertificationUiBinding(host, () => undefined)
    expect(binding.snapshot().diagnostics.retryAvailable).toBe(false)
    await expect(host.startStoredTime({
      expectedRevision: 7,
      requestedDurationSeconds: 1,
    })).resolves.toMatchObject({ status: 'resumable-failure', storedTimeUntouched: true })
    expect(loads).toBe(2)
    expect(host.hasActiveJob()).toBe(false)
  })

  test('credits Returned Time, confirms durable readback, then permits Stored Time admission', async () => {
    const suspended = cloneCanonicalGameStateV2(Object.freeze({
      ...state,
      timeline: Object.freeze({
        ...state.timeline,
        storedTimeAvailableSeconds: 0,
        lastSuspendedAtLegacyText: SAVED_AT,
      }),
    }))
    const fixture = await hostFixture(undefined, suspended)
    let restarted = 0
    let loads = 0
    const host = fixture.host(async () => {
      loads += 1
      return accessFailure('launcher-load-failed')
    })
    await expect(host.returnFromSuspension(Object.freeze({
      expectedRevision: 7,
      nowUtcMilliseconds: Date.parse(SAVED_AT) + 5_000,
      savedAtUtc: '2026-08-10T00:00:05.000Z',
      restartMonotonicSampling: () => { restarted += 1 },
    }))).resolves.toMatchObject({ status: 'ready' })
    expect(restarted).toBe(1)
    expect(host.snapshot().revision).toBe(8)
    expect(host.snapshot().state.timeline.storedTimeAvailableSeconds).toBe(5)
    expect((await fixture.repository.loadCurrent())?.revision).toBe(8)
    await expect(host.startStoredTime({
      expectedRevision: 8,
      requestedDurationSeconds: 0.2,
    })).resolves.toMatchObject({ status: 'resumable-failure' })
    expect(loads).toBe(1)
  })

  test('suspends with no active worker, credits the marker once, then permits readmission', async () => {
    const foreground = cloneCanonicalGameStateV2(Object.freeze({
      ...state,
      timeline: Object.freeze({
        ...state.timeline,
        storedTimeAvailableSeconds: 0,
        lastSuspendedAtLegacyText: null,
      }),
    }))
    const fixture = await hostFixture(undefined, foreground)
    let loads = 0
    const host = fixture.host(async () => { loads += 1; return accessFailure('launcher-load-failed') })
    await host.confirmDurableReadmission()
    await expect(host.pauseForLifecycle('browser-hidden', 0.25)).resolves.toMatchObject({
      status: 'paused', storedTimeUntouched: false,
    })
    expect(host.snapshot().revision).toBe(8)
    expect(host.snapshot().state.timeline.lastSuspendedAtLegacyText).toBe(SAVED_AT)
    await expect(host.startStoredTime({
      expectedRevision: 8, requestedDurationSeconds: 0.2,
    })).resolves.toMatchObject({ status: 'returned-time-required' })
    expect(loads).toBe(0)
    await expect(host.returnFromSuspension(Object.freeze({
      expectedRevision: 8,
      nowUtcMilliseconds: Date.parse(SAVED_AT) + 5_000,
      savedAtUtc: '2026-08-10T00:00:05.000Z',
      restartMonotonicSampling: () => undefined,
    }))).resolves.toMatchObject({ status: 'ready' })
    expect(host.snapshot().revision).toBe(9)
    expect(host.snapshot().state.timeline.storedTimeAvailableSeconds).toBe(5)
    await expect(host.returnFromSuspension(Object.freeze({
      expectedRevision: 9,
      nowUtcMilliseconds: Date.parse(SAVED_AT) + 10_000,
      savedAtUtc: '2026-08-10T00:00:10.000Z',
      restartMonotonicSampling: () => undefined,
    }))).resolves.toMatchObject({ status: 'resumable-failure' })
    expect(host.snapshot().state.timeline.storedTimeAvailableSeconds).toBe(5)
    await expect(host.startStoredTime({
      expectedRevision: 9, requestedDurationSeconds: 0.2,
    })).resolves.toMatchObject({ status: 'resumable-failure' })
    expect(loads).toBe(1)
  }, 10_000)

  test('free-enables a receiver-local purchased entitlement under the shared writer lease', async () => {
    const fixture = await hostFixture({
      debugOptions: false,
      debugEverEnabled: true,
      cheater: false,
      unlockAllTabs: false,
    })
    const host = fixture.host(async () => accessFailure('identity-load-failed'))
    await expect(host.confirmDurableReadmission()).resolves.toMatchObject({ status: 'ready' })
    const before = host.snapshot()
    const result = await host.purchaseOrEnableDeveloperOptions()
    expect(result).toMatchObject({ accepted: true, changed: true, code: 'committed' })
    expect(result.publication.revision).toBe(before.revision + 1)
    expect(result.publication.state).toEqual(before.state)
    const durable = await fixture.repository.loadCurrent()
    expect(durable?.revision).toBe(before.revision + 1)
    expect(durable?.platform).toMatchObject({ debugOptions: true, debugEverEnabled: true })
    expect(host.snapshot()).toMatchObject({ revision: before.revision + 1 })
  })

  test('runs a real worker engine to a readback-confirmed final publication under one lease', async () => {
    const fixture = await hostFixture()
    const worker = new EngineWorker()
    let launcherCreations = 0
    const host = fixture.host(async () => {
      launcherCreations += 1
      return Object.freeze({
        status: 'launcher-ready' as const,
        launcher: Object.freeze({
          start: async () => Object.freeze({
            status: 'ready' as const,
            worker: worker as unknown as Worker,
            ready: Object.freeze({
              protocolVersion: 1 as const,
              workerInstanceNonce: 'stage7c-worker-0001',
              buildId: 'stage7c-build',
              catalogHash: 'a'.repeat(64),
              tuningHash: 'b'.repeat(64),
            }),
          }),
          terminate: () => worker.terminate(),
        }) as unknown as Stage7V2WorkerLauncher,
      })
    })
    const diagnostics: string[] = []
    const unsubscribe = host.subscribeDiagnostics((value) => diagnostics.push(value.status))
    await host.confirmDurableReadmission()
    await expect(host.startStoredTime({
      expectedRevision: 7,
      requestedDurationSeconds: 0.2,
    })).resolves.toMatchObject({ status: 'started' })
    await waitUntil(() => !host.hasActiveJob(), 10_000)
    expect(launcherCreations).toBe(1)
    expect(worker.terminated).toBe(true)
    expect(host.snapshot().revision).toBe(8)
    expect(host.snapshot().state.timeline.storedTimeAvailableSeconds).toBeLessThan(1_000)
    const durable = await fixture.repository.loadCurrent()
    expect(durable?.revision).toBe(8)
    expect(durable?.save.state).toEqual(host.snapshot().state)
    expect(durable?.save.runtime).toEqual(host.snapshot().runtime)
    expect(await fixture.repository.readStoredTimeJobRecord()).toBeNull()
    expect(host.diagnosticsSnapshot()).toMatchObject({
      status: 'completed',
      requestedSeconds: 0.2,
      processedSeconds: 0.2,
      durableSeconds: 0.2,
      remainingSeconds: 0,
      unconsumedFromDurableCheckpointSeconds: 0,
      retryAvailable: false,
      reloadRequired: false,
    })
    expect(diagnostics).toContain('started')
    expect(diagnostics.at(-1)).toBe('completed')
    unsubscribe()
  }, 20_000)

  test('pauses at an authentic background boundary and discards unacknowledged work', async () => {
    const fixture = await hostFixture()
    const worker = new EngineWorker(false)
    const host = fixture.host(async () => launcherReady(worker))
    await host.confirmDurableReadmission()
    await host.startStoredTime({ expectedRevision: 7, requestedDurationSeconds: 410 })
    const paused = host.pauseForLifecycle('native-background')
    worker.resume()
    const pausedResult = await paused
    expect(pausedResult.error).toBeUndefined()
    expect(worker.mainTypes).toContain('lifecycle-pause')
    expect(pausedResult).toMatchObject({ status: 'paused', storedTimeUntouched: false })
    await waitUntil(() => !host.hasActiveJob(), 10_000)
    expect(host.snapshot().revision).toBe(9)
    expect(host.snapshot().state.timeline.storedTimeAvailableSeconds).toBeLessThan(1_000)
    expect(host.snapshot().state.timeline.lastSuspendedAtLegacyText).toBe(SAVED_AT)
    const durable = await fixture.repository.loadCurrent()
    expect(durable?.revision).toBe(9)
    expect(durable?.save.state).toEqual(host.snapshot().state)
    expect(durable?.save.runtime).toEqual(host.snapshot().runtime)
    expect(await fixture.repository.readStoredTimeJobRecord()).toBeNull()
    await expect(host.confirmDurableReadmission()).resolves.toMatchObject({
      status: 'returned-time-required',
    })
    await expect(host.returnFromSuspension(Object.freeze({
      expectedRevision: 9,
      nowUtcMilliseconds: Date.parse(SAVED_AT) + 1_000,
      savedAtUtc: '2026-08-10T00:00:01.000Z',
      restartMonotonicSampling: () => undefined,
    }))).resolves.toMatchObject({ status: 'ready' })
    expect(host.snapshot().revision).toBe(10)
    const readmission = await host.startStoredTime({
      expectedRevision: 10,
      requestedDurationSeconds: 0.2,
    })
    expect(readmission.status).not.toBe('returned-time-required')
  }, 20_000)

  test('pauses by explicit user request without fabricating an away-time marker', async () => {
    const fixture = await hostFixture()
    const worker = new EngineWorker(false)
    const host = fixture.host(async () => launcherReady(worker))
    await host.confirmDurableReadmission()
    await host.startStoredTime({ expectedRevision: 7, requestedDurationSeconds: 410 })
    const paused = host.pauseStoredTime()
    worker.resume()
    await expect(paused).resolves.toMatchObject({ status: 'paused' })
    await waitUntil(() => !host.hasActiveJob(), 10_000)
    expect(host.snapshot().state.timeline.lastSuspendedAtLegacyText).toBeNull()
    await expect(host.confirmDurableReadmission()).resolves.toMatchObject({ status: 'ready' })
  }, 20_000)

  test('uses a fresh launcher after a worker crash and resumes only from durable state', async () => {
    const fixture = await hostFixture()
    const workers = [new EngineWorker(false), new EngineWorker(true)]
    let loads = 0
    const host = fixture.host(async () => launcherReady(workers[loads++]!))
    await host.confirmDurableReadmission()
    await host.startStoredTime({ expectedRevision: 7, requestedDurationSeconds: 0.2 })
    workers[0]!.crash()
    await waitUntil(() => !host.hasActiveJob(), 10_000)
    expect(host.diagnosticsSnapshot()).toMatchObject({
      status: 'resumable-failure', retryAvailable: true,
    })
    expect(host.snapshot().revision).toBe(7)
    expect((await fixture.repository.loadCurrent())?.revision).toBe(7)
    expect(await fixture.repository.readStoredTimeJobRecord()).not.toBeNull()
    const binding = createStage7V2CertificationUiBinding(host, () => undefined)
    expect(binding.snapshot().diagnostics.retryAvailable).toBe(true)
    await binding.retry()
    expect(binding.snapshot().announcement).toBe(
      'Stored Time retry started from the last durable checkpoint.',
    )
    await waitUntil(() => !host.hasActiveJob(), 10_000)
    expect(loads).toBe(2)
    expect(host.snapshot().revision).toBe(8)
    expect((await fixture.repository.loadCurrent())?.revision).toBe(8)
    expect(await fixture.repository.readStoredTimeJobRecord()).toBeNull()
  }, 20_000)

  test('projects only identity-bound monotonic progress and reveals cancellation at five elapsed seconds', async () => {
    const fixture = await hostFixture()
    const worker = new EngineWorker(false)
    const host = fixture.host(async () => launcherReady(worker))
    await host.confirmDurableReadmission()
    await host.startStoredTime({ expectedRevision: 7, requestedDurationSeconds: 410 })

    worker.progress({ elapsedWallMilliseconds: 0, etaMilliseconds: 60_000 })
    await waitUntil(() => host.diagnosticsSnapshot().etaMilliseconds === 60_000, 1_000)
    expect(host.diagnosticsSnapshot()).toMatchObject({
      cancelRemainingAvailable: false, durableSeconds: 0,
    })
    worker.progress({
      computedSeconds: 1, durableSeconds: 1, computedRawTicks: '10',
      durableRawTicks: '10', representativeGroups: 1,
      elapsedWallMilliseconds: 4_999, etaMilliseconds: 60_000,
    })
    await waitUntil(() => host.diagnosticsSnapshot().processedSeconds === 1, 1_000)
    expect(host.diagnosticsSnapshot()).toMatchObject({
      processedSeconds: 1, durableSeconds: 0, cancelRemainingAvailable: false,
    })
    worker.progress({
      computedSeconds: 2, durableSeconds: 2, computedRawTicks: '20',
      durableRawTicks: '20', representativeGroups: 2,
      elapsedWallMilliseconds: 5_000, etaMilliseconds: 60_000,
    })
    await waitUntil(() => host.diagnosticsSnapshot().processedSeconds === 2, 1_000)
    expect(host.diagnosticsSnapshot()).toMatchObject({
      processedSeconds: 2, durableSeconds: 0, cancelRemainingAvailable: true,
    })
    worker.progress({
      computedSeconds: 3, durableSeconds: 3, computedRawTicks: '30',
      durableRawTicks: '30', representativeGroups: 3,
      elapsedWallMilliseconds: 6_000,
    }, 'forged-job-id')
    worker.progress({
      computedSeconds: 1, durableSeconds: 1, computedRawTicks: '10',
      durableRawTicks: '10', representativeGroups: 1,
      elapsedWallMilliseconds: 6_000,
    })
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(host.diagnosticsSnapshot().processedSeconds).toBe(2)

    worker.crash()
    await waitUntil(() => !host.hasActiveJob(), 1_000)
    expect(host.diagnosticsSnapshot()).toMatchObject({
      status: 'resumable-failure', cancelRemainingAvailable: false,
    })
  }, 20_000)

  test('clears a visible cancellation action when completion wins the terminal race', async () => {
    const fixture = await hostFixture()
    const worker = new EngineWorker(false)
    const host = fixture.host(async () => launcherReady(worker))
    await host.confirmDurableReadmission()
    await host.startStoredTime({ expectedRevision: 7, requestedDurationSeconds: 0.2 })
    worker.progress({ elapsedWallMilliseconds: 5_000, etaMilliseconds: 1_000 })
    await waitUntil(() => host.diagnosticsSnapshot().cancelRemainingAvailable, 1_000)
    worker.resume()
    await waitUntil(() => !host.hasActiveJob(), 10_000)
    expect(host.diagnosticsSnapshot()).toMatchObject({
      status: 'completed', processedSeconds: 0.2, durableSeconds: 0.2,
      unconsumedFromDurableCheckpointSeconds: 0, cancelRemainingAvailable: false,
    })
  }, 20_000)

  test('retains the origin descriptor after a malformed worker frame and recovers fresh', async () => {
    const fixture = await hostFixture()
    const workers = [new EngineWorker(false), new EngineWorker()]
    let loads = 0
    const host = fixture.host(async () => launcherReady(workers[loads++]!))
    await host.confirmDurableReadmission()
    await host.startStoredTime({ expectedRevision: 7, requestedDurationSeconds: 0.2 })
    const terminal = host.awaitStoredTimeTerminal()
    workers[0]!.malformed()
    await expect(terminal).resolves.toMatchObject({
      status: 'resumable-failure', storedTimeUntouched: true,
    })
    await waitUntil(() => !host.hasActiveJob(), 1_000)
    expect(await fixture.repository.readStoredTimeJobRecord()).not.toBeNull()
    await host.startStoredTime({ expectedRevision: 7, requestedDurationSeconds: 0.2 })
    await expect(host.awaitStoredTimeTerminal()).resolves.toMatchObject({ status: 'completed' })
    expect(host.snapshot().revision).toBe(8)
    expect(await fixture.repository.readStoredTimeJobRecord()).toBeNull()
  }, 20_000)

  test('retains a committed candidate when schema readback throws and a fresh host reconciles it', async () => {
    const timerState = cloneCanonicalGameStateV2(Object.freeze({
      ...state,
      skills: Object.freeze({
        ...state.skills,
        byId: Object.freeze({
          ...state.skills.byId,
          androids: Object.freeze({ ...state.skills.byId.androids!, owned: true, timerSeconds: 12 }),
          pocketAndroids: Object.freeze({
            ...state.skills.byId.pocketAndroids!, owned: true, timerSeconds: 12,
          }),
          superRadiantScattering: Object.freeze({
            ...state.skills.byId.superRadiantScattering!, owned: true, timerSeconds: 12,
          }),
        }),
      }),
    }))
    const fixture = await hostFixture(undefined, timerState)
    const sharedWriter = new Stage7V2NativeWriterLeaseManager('readback-recovery')
    const firstWorker = new EngineWorker(false, 6_000)
    const first = fixture.host(async () => launcherReady(firstWorker), 5_000, sharedWriter)
    await first.confirmDurableReadmission()
    await first.startStoredTime({ expectedRevision: 7, requestedDurationSeconds: 410 })
    fixture.storage.failNextReadPath = fixture.repository.paths().current
    fixture.storage.failReadRemaining = 2
    const failed = first.awaitStoredTimeTerminal()
    firstWorker.resume()
    const failedResult = await failed
    expect(failedResult.error).toContain('injected readback failure')
    expect(failedResult).toMatchObject({
      status: 'resumable-failure', storedTimeUntouched: false,
    })
    await waitUntil(() => !first.hasActiveJob(), 1_000)
    expect(await fixture.repository.readStoredTimeJobRecord()).not.toBeNull()
    const durable = await fixture.repository.loadCurrent()
    expect(durable?.revision).toBe(8)

    const recoveredWorker = new EngineWorker()
    const fresh = new Stage7V2CertificationHost(Object.freeze({
      initialPublication: createCanonicalRuntimePublicationV2(Object.freeze({
        revision: durable!.revision,
        state: durable!.save.state,
        runtime: durable!.save.runtime,
      })),
      platform: durable!.platform,
      repository: fixture.repository,
      writerLeases: sharedWriter,
      infinityRewardAuthority: issueInfinityRewardAuthorityV2ForApplication(
        Object.freeze({ doubleInfinityPoints: true }),
      ),
      nowUtc: () => SAVED_AT,
      loadLauncher: async () => launcherReady(recoveredWorker),
      terminalTimeoutMilliseconds: 5_000,
    }))
    await fresh.confirmDurableReadmission()
    await fresh.startStoredTime({ expectedRevision: 8, requestedDurationSeconds: 410 })
    await expect(fresh.awaitStoredTimeTerminal()).resolves.toMatchObject({ status: 'completed' })
    expect(fresh.snapshot().revision).toBe(9)
    expect(await fixture.repository.readStoredTimeJobRecord()).toBeNull()
  }, 30_000)

  test('terminates a nonresponsive background worker and releases the writer for retryable work', async () => {
    const fixture = await hostFixture()
    const worker = new EngineWorker(false)
    const host = fixture.host(async () => launcherReady(worker), 20)
    await host.confirmDurableReadmission()
    await host.startStoredTime({ expectedRevision: 7, requestedDurationSeconds: 410 })
    await expect(host.pauseForLifecycle('browser-hidden')).resolves.toMatchObject({
      status: 'resumable-failure',
      storedTimeUntouched: true,
    })
    await waitUntil(() => !host.hasActiveJob(), 1_000)
    expect(worker.terminated).toBe(true)
    await expect(host.runDeveloperTransaction(async () => 42)).resolves.toBe(42)
    expect(host.snapshot().revision).toBe(7)
    expect((await fixture.repository.loadCurrent())?.revision).toBe(7)
  })

  test('cancels at an authentic boundary without creating a suspension marker', async () => {
    const fixture = await hostFixture()
    const worker = new EngineWorker(false)
    const host = fixture.host(async () => launcherReady(worker))
    await host.confirmDurableReadmission()
    await host.startStoredTime({ expectedRevision: 7, requestedDurationSeconds: 410 })
    const cancelled = host.cancelStoredTime()
    worker.resume()
    await expect(cancelled).resolves.toMatchObject({ status: 'cancelled' })
    await waitUntil(() => !host.hasActiveJob(), 10_000)
    expect(host.snapshot().state.timeline.lastSuspendedAtLegacyText).toBeNull()
    const durable = await fixture.repository.loadCurrent()
    expect(durable?.revision).toBe(host.snapshot().revision)
    expect(durable?.save.state).toEqual(host.snapshot().state)
    expect(await fixture.repository.readStoredTimeJobRecord()).toBeNull()
    await expect(host.confirmDurableReadmission()).resolves.toMatchObject({ status: 'ready' })
  }, 20_000)

  test('quiesces active jobs for policy and Developer mutations without fabricating suspension', async () => {
    const policyFixture = await hostFixture()
    const policyWorker = new EngineWorker(false)
    const policyHost = policyFixture.host(async () => launcherReady(policyWorker))
    await policyHost.confirmDurableReadmission()
    await policyHost.startStoredTime({ expectedRevision: 7, requestedDurationSeconds: 410 })
    const policyWrite = policyHost.writeStoredTimePolicy('stored-time-exact-v1')
    policyWorker.resume()
    await policyWrite
    expect(policyHost.snapshot().state.timeline.lastSuspendedAtLegacyText).toBeNull()
    expect(await policyFixture.repository.readStoredTimePolicy()).toBe('stored-time-exact-v1')
    await expect(policyHost.confirmDurableReadmission()).resolves.toMatchObject({ status: 'ready' })

    const developerFixture = await hostFixture(Object.freeze({
      debugOptions: false,
      debugEverEnabled: true,
      cheater: false,
      unlockAllTabs: false,
    }))
    const developerWorker = new EngineWorker(false)
    const developerHost = developerFixture.host(async () => launcherReady(developerWorker))
    await developerHost.confirmDurableReadmission()
    await developerHost.startStoredTime({ expectedRevision: 7, requestedDurationSeconds: 410 })
    const developer = developerHost.purchaseOrEnableDeveloperOptions()
    developerWorker.resume()
    await expect(developer).resolves.toMatchObject({ accepted: true, changed: true })
    expect(developerHost.snapshot().state.timeline.lastSuspendedAtLegacyText).toBeNull()
    await expect(developerHost.confirmDurableReadmission()).resolves.toMatchObject({ status: 'ready' })
  }, 30_000)

  test('round-trips transient Infinity PRE and POST authority before final persistence', async () => {
    const infinityReady = cloneCanonicalGameStateV2(Object.freeze({
      ...state,
      dyson: Object.freeze({ ...state.dyson, bots: gameDecimalFromNumber(4.2e19) }),
      timeline: Object.freeze({
        ...state.timeline,
        infinityCycleSeconds: 1,
        infinityBoundaryRemaining: 0.1,
      }),
    }))
    const fixture = await hostFixture(undefined, infinityReady)
    const worker = new EngineWorker()
    const host = fixture.host(async () => launcherReady(worker))
    await host.confirmDurableReadmission()
    await host.startStoredTime({ expectedRevision: 7, requestedDurationSeconds: 0.2 })
    await waitUntil(() => !host.hasActiveJob(), 10_000)
    expect(worker.mainTypes.filter((type) => type === 'authority-granted').length)
      .toBeGreaterThanOrEqual(2)
    expect(gameDecimalToCanonicalString(host.snapshot().state.infinity.availablePoints)).toBe('2e0')
    expect(host.snapshot().revision).toBe(8)
    expect((await fixture.repository.loadCurrent())?.revision).toBe(8)
    expect(await fixture.repository.readStoredTimeJobRecord()).toBeNull()
  }, 20_000)

  test('recovers exactly when a checkpoint readback succeeds but its acknowledgement is lost', async () => {
    const timerState = cloneCanonicalGameStateV2(Object.freeze({
      ...state,
      skills: Object.freeze({
        ...state.skills,
        byId: Object.freeze({
          ...state.skills.byId,
          androids: Object.freeze({ ...state.skills.byId.androids!, owned: true, timerSeconds: 12 }),
          pocketAndroids: Object.freeze({
            ...state.skills.byId.pocketAndroids!, owned: true, timerSeconds: 12,
          }),
          superRadiantScattering: Object.freeze({
            ...state.skills.byId.superRadiantScattering!, owned: true, timerSeconds: 12,
          }),
        }),
      }),
    }))
    const fixture = await hostFixture(undefined, timerState)
    const workers = [
      new EngineWorker(true, 6_000, 'checkpoint-committed'),
      new EngineWorker(),
    ]
    let loads = 0
    const host = fixture.host(async () => launcherReady(workers[loads++]!))
    await host.confirmDurableReadmission()
    await host.startStoredTime({ expectedRevision: 7, requestedDurationSeconds: 410 })
    await waitUntil(() => !host.hasActiveJob(), 10_000)
    expect(workers[0]!.mainTypes).toContain('checkpoint-committed')
    expect(host.snapshot().revision).toBe(8)
    expect((await fixture.repository.loadCurrent())?.revision).toBe(8)
    expect(await fixture.repository.readStoredTimeJobRecord()).not.toBeNull()

    const recovered = await host.startStoredTime({ expectedRevision: 8, requestedDurationSeconds: 410 })
    expect(recovered.error).toBeUndefined()
    expect(recovered.status).toBe('started')
    const terminal = await host.awaitStoredTimeTerminal()
    expect(terminal.error).toBeUndefined()
    expect(terminal.status).toBe('completed')
    await waitUntil(() => !host.hasActiveJob(), 10_000)
    expect(loads).toBe(2)
    expect(host.snapshot().revision).toBe(9)
    expect((await fixture.repository.loadCurrent())?.revision).toBe(9)
    expect(await fixture.repository.readStoredTimeJobRecord()).toBeNull()
  }, 20_000)

  test('rejects hostile option accessors without invoking them', async () => {
    let getters = 0
    const hostile = Object.defineProperty({}, 'initialPublication', {
      enumerable: true,
      get: () => { getters += 1; return publication() },
    })
    expect(() => new Stage7V2CertificationHost(hostile as never)).toThrow()
    expect(getters).toBe(0)
  })

  test('rejects a stale second host under the lease for Stored Time, Returned Time, and Developer', async () => {
    const sharedWriter = new Stage7V2NativeWriterLeaseManager('shared-host')

    const storedFixture = await hostFixture()
    const storedA = storedFixture.host(async () => launcherReady(new EngineWorker()), 5_000, sharedWriter)
    let staleLoads = 0
    const storedB = storedFixture.host(async () => { staleLoads += 1; return accessFailure('launcher-load-failed') }, 5_000, sharedWriter)
    await storedA.confirmDurableReadmission()
    await storedB.confirmDurableReadmission()
    await storedA.startStoredTime({ expectedRevision: 7, requestedDurationSeconds: 0.2 })
    await storedA.awaitStoredTimeTerminal()
    await waitUntil(() => !storedA.hasActiveJob(), 1_000)
    await new Promise((resolve) => setTimeout(resolve, 0))
    await expect(storedB.startStoredTime({
      expectedRevision: 7,
      requestedDurationSeconds: 0.2,
    })).resolves.toMatchObject({ status: 'reload-required', storedTimeUntouched: true })
    expect(staleLoads).toBe(0)

    const suspended = cloneCanonicalGameStateV2(Object.freeze({
      ...state,
      timeline: Object.freeze({
        ...state.timeline,
        storedTimeAvailableSeconds: 0,
        lastSuspendedAtLegacyText: SAVED_AT,
      }),
    }))
    const returnFixture = await hostFixture(undefined, suspended)
    const returnA = returnFixture.host(async () => accessFailure('launcher-load-failed'), 5_000, sharedWriter)
    const returnB = returnFixture.host(async () => accessFailure('launcher-load-failed'), 5_000, sharedWriter)
    const request = Object.freeze({
      expectedRevision: 7,
      nowUtcMilliseconds: Date.parse(SAVED_AT) + 5_000,
      savedAtUtc: '2026-08-10T00:00:05.000Z',
      restartMonotonicSampling: () => undefined,
    })
    await expect(returnA.returnFromSuspension(request)).resolves.toMatchObject({ status: 'ready' })
    await expect(returnB.returnFromSuspension(request)).resolves.toMatchObject({
      status: 'reload-required', storedTimeUntouched: true,
    })

    const developerPlatform = Object.freeze({
      debugOptions: false,
      debugEverEnabled: true,
      cheater: false,
      unlockAllTabs: false,
    })
    const developerFixture = await hostFixture(developerPlatform)
    const developerA = developerFixture.host(async () => accessFailure('launcher-load-failed'), 5_000, sharedWriter)
    const developerB = developerFixture.host(async () => accessFailure('launcher-load-failed'), 5_000, sharedWriter)
    await developerA.purchaseOrEnableDeveloperOptions()
    await expect(developerB.purchaseOrEnableDeveloperOptions()).rejects.toBeInstanceOf(
      Stage7V2HostReloadRequiredError,
    )
    expect(developerB.snapshot().revision).toBe(7)
  }, 30_000)
})

async function hostFixture(
  platform: Readonly<Schema13PlatformState> | undefined = Object.freeze({
    debugOptions: false,
    debugEverEnabled: false,
    cheater: false,
    unlockAllTabs: false,
  }),
  sourceState = state,
): Promise<Readonly<{
  storage: MemoryStorage
  repository: Stage7V2CertificationRepository
  initialOperations: readonly string[]
  host: (
    loader: () => Promise<Stage7V2WorkerLauncherAccessResult>,
    terminalTimeoutMilliseconds?: number,
    writerLeases?: Readonly<Stage7V2WriterLeaseManager>,
  ) => Stage7V2CertificationHost
}>> {
  const storage = new MemoryStorage()
  const repository = new Stage7V2CertificationRepository({ buildScope: 'stage7c-test', storage })
  const receiverPlatform = platform ?? Object.freeze({
    debugOptions: false,
    debugEverEnabled: false,
    cheater: false,
    unlockAllTabs: false,
  })
  await repository.checkpoint(Object.freeze({
    savedAtUtc: SAVED_AT,
    state: sourceState,
    runtime: migrated.runtime,
  }), receiverPlatform, 7)
  const initialOperations = Object.freeze([...storage.operations])
  return Object.freeze({
    storage,
    repository,
    initialOperations,
    host: (
      loadLauncher,
      terminalTimeoutMilliseconds = 5_000,
      writerLeases = new Stage7V2NativeWriterLeaseManager('host-test'),
    ) =>
      new Stage7V2CertificationHost(Object.freeze({
      initialPublication: publication(sourceState),
      platform: receiverPlatform,
      repository,
      writerLeases,
      infinityRewardAuthority: issueInfinityRewardAuthorityV2ForApplication(
        Object.freeze({ doubleInfinityPoints: true }),
      ),
      nowUtc: () => SAVED_AT,
      loadLauncher,
      terminalTimeoutMilliseconds,
    })),
  })
}

function publication(sourceState = state) {
  return createCanonicalRuntimePublicationV2(Object.freeze({
    revision: 7,
    state: sourceState,
    runtime: migrated.runtime,
  }))
}

async function waitUntil(predicate: () => boolean, timeoutMilliseconds: number): Promise<void> {
  const deadline = performance.now() + timeoutMilliseconds
  while (!predicate()) {
    if (performance.now() >= deadline) throw new Error('Timed out waiting for the host to settle.')
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
}

class EngineWorker {
  static #nextId = 0
  readonly id = ++EngineWorker.#nextId
  readonly #listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()
  readonly #tasks: (() => void)[] = []
  readonly #engine: StoredTimeWorkerEngineV2
  readonly mainTypes: string[] = []
  #pumping = false
  #now = 0
  #automatic: boolean
  readonly #taskMilliseconds: number
  #dropMainType: string | null
  #start: Extract<StoredTimeWorkerMainMessageV2, { readonly type: 'start' }> | null = null
  terminated = false

  constructor(automatic = true, taskMilliseconds = 1, dropMainType: string | null = null) {
    this.#automatic = automatic
    this.#taskMilliseconds = taskMilliseconds
    this.#dropMainType = dropMainType
    this.#engine = new StoredTimeWorkerEngineV2(Object.freeze({
      nowMilliseconds: () => this.#now,
      schedule: (task: () => void) => {
        this.#tasks.push(task)
        if (this.#automatic) this.#queuePump()
      },
      postMessage: (message: Readonly<StoredTimeWorkerMessageV2>) => {
        postStoredTimeWorkerFrameMessageV2(Object.freeze({
          postMessage: (frame: unknown) => this.#dispatch('message', { data: frame }),
        }), message)
      },
    }))
  }

  postMessage(frame: unknown): void {
    if (this.terminated) throw new Error('worker terminated')
    const message = decodeStoredTimeWorkerMainFrameV2(frame)
    if (message.type === 'start') this.#start = message
    this.mainTypes.push(message.type)
    if (message.type === this.#dropMainType) {
      this.#dropMainType = null
      this.#dispatch('error', Object.freeze({ type: 'error' }))
      return
    }
    this.#engine.accept(message)
  }
  terminate(): void {
    this.terminated = true
    this.#tasks.length = 0
  }
  resume(): void {
    this.#automatic = true
    this.#queuePump()
  }
  crash(): void {
    if (!this.terminated) this.#dispatch('error', Object.freeze({ type: 'error' }))
  }
  malformed(): void {
    if (!this.terminated) {
      this.#dispatch('message', Object.freeze({
        data: new TextEncoder().encode('{}').buffer,
      }))
    }
  }
  progress(
    overrides: Partial<StoredTimeWorkerProgressDtoV2>,
    jobId?: string,
  ): void {
    const start = this.#start
    if (start === null) throw new Error('worker has not received start')
    this.#now = Math.max(this.#now, overrides.elapsedWallMilliseconds ?? 0)
    const progress = Object.freeze({
      computedSeconds: 0,
      durableSeconds: 0,
      computedRawTicks: '0',
      durableRawTicks: '0',
      representativeGroups: 0,
      elapsedWallMilliseconds: 0,
      maximumChunkMilliseconds: 0,
      maximumAtomicEventMilliseconds: 0,
      throughputTicksPerSecond: 0,
      etaMilliseconds: null,
      warmingUp: false,
      ...overrides,
    })
    const message = Object.freeze({
      type: 'progress' as const,
      protocolVersion: start.protocolVersion,
      jobId: jobId ?? start.jobId,
      workerInstanceNonce: start.workerInstanceNonce,
      originRevision: start.originRevision,
      acknowledgedBaseRevision: start.acknowledgedBaseRevision,
      policyId: start.policyId,
      policyVersion: start.policyVersion,
      checkpointSequence: start.checkpointSequence,
      progress,
    })
    postStoredTimeWorkerFrameMessageV2(Object.freeze({
      postMessage: (frame: unknown) => this.#dispatch('message', { data: frame }),
    }), message)
  }
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const values = this.#listeners.get(type) ?? new Set()
    values.add(listener)
    this.#listeners.set(type, values)
  }
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.#listeners.get(type)?.delete(listener)
  }
  #queuePump(): void {
    if (this.#pumping || this.terminated) return
    this.#pumping = true
    queueMicrotask(() => {
      this.#pumping = false
      if (this.terminated) return
      const task = this.#tasks.shift()
      if (task !== undefined) {
        this.#now += this.#taskMilliseconds
        task()
      }
      if (this.#tasks.length > 0) this.#queuePump()
    })
  }
  #dispatch(type: string, value: unknown): void {
    queueMicrotask(() => {
      for (const listener of this.#listeners.get(type) ?? []) {
        if (typeof listener === 'function') listener(value as Event)
        else listener.handleEvent(value as Event)
      }
    })
  }
}

function launcherReady(worker: EngineWorker): Stage7V2WorkerLauncherAccessResult {
  return Object.freeze({
    status: 'launcher-ready',
    launcher: Object.freeze({
      start: async () => Object.freeze({
        status: 'ready' as const,
        worker: worker as unknown as Worker,
        ready: Object.freeze({
          protocolVersion: 1 as const,
          workerInstanceNonce: `stage7c-worker-${String(worker.id).padStart(4, '0')}`,
          buildId: 'stage7c-build',
          catalogHash: 'a'.repeat(64),
          tuningHash: 'b'.repeat(64),
        }),
      }),
      terminate: () => worker.terminate(),
    }) as unknown as Stage7V2WorkerLauncher,
  })
}

function accessFailure(
  reason: 'identity-load-failed' | 'launcher-load-failed',
): Stage7V2WorkerLauncherAccessResult {
  return Object.freeze({
    status: 'resumable-failure',
    reason,
    reloadRequired: true,
    storedTimeUntouched: true,
  })
}

class MemoryStorage implements Stage7V2CertificationStorage {
  readonly files = new Map<string, string>()
  readonly operations: string[] = []
  #tail: Promise<void> = Promise.resolve()
  failNextReadPath: string | null = null
  failReadRemaining = 0

  async exists(path: string): Promise<boolean> {
    this.operations.push(`exists:${path}`)
    return this.files.has(path)
  }
  async readText(path: string): Promise<string> {
    this.operations.push(`read:${path}`)
    if (path === this.failNextReadPath && this.failReadRemaining > 0) {
      this.failReadRemaining -= 1
      if (this.failReadRemaining === 0) this.failNextReadPath = null
      throw new Error('injected readback failure')
    }
    const value = this.files.get(path)
    if (value === undefined) throw new Error('missing')
    return value
  }
  async writeText(path: string, text: string): Promise<void> {
    this.operations.push(`write:${path}`)
    this.files.set(path, text)
  }
  async replaceAtomically(temporaryPath: string, destinationPath: string): Promise<void> {
    this.operations.push(`replace:${temporaryPath}->${destinationPath}`)
    const value = this.files.get(temporaryPath)
    if (value === undefined) throw new Error('missing temporary')
    this.files.set(destinationPath, value)
    this.files.delete(temporaryPath)
  }
  async copy(sourcePath: string, destinationPath: string): Promise<void> {
    this.operations.push(`copy:${sourcePath}->${destinationPath}`)
    const value = this.files.get(sourcePath)
    if (value === undefined) throw new Error('missing source')
    this.files.set(destinationPath, value)
  }
  async removeExactly(paths: readonly string[]): Promise<void> {
    for (const path of paths) this.files.delete(path)
  }
  async withExclusiveMutation<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.#tail
    let release!: () => void
    this.#tail = new Promise((resolve) => { release = resolve })
    await previous
    try { return await operation() } finally { release() }
  }
}
