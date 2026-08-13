// @vitest-environment jsdom
import { describe, expect, test, vi } from 'vitest'
import { createDeterministicUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { createCanonicalRuntimePublicationV2, type CanonicalRuntimePublicationV2 } from '../application/canonicalRuntimeSessionV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { gameDecimalFromNumber } from '../math/gameDecimal'
import type { LifecycleAdapter, LifecyclePhase } from '../platform/contracts'
import { decodeSchema13WebSave, encodeSchema13WebSave } from '../save/schema13'
import type { Schema13PlatformState } from '../save/schema13'
import { serializeWebSave } from '../save/serialization'
import {
  createV2GameRuntimeController,
  type V2GameRuntimeRepository,
  type V2StoredTimeHostPort,
} from './v2GameRuntime'

const PLATFORM = Object.freeze({
  debugOptions: false,
  debugEverEnabled: false,
  cheater: false,
  unlockAllTabs: false,
})

describe('V2 game runtime production seams', () => {
  test('projects receiver-local Developer Options ownership without using portable state', async () => {
    const migrated = migratePreparedSaveToV2(
      createDeterministicUnityFirstRunPreparedSave(),
      { kind: 'trusted-same-device' },
    )
    const repository = new FakeRuntimeRepository(
      createCanonicalRuntimePublicationV2({
        revision: 1,
        state: migrated.state,
        runtime: migrated.runtime,
      }),
    )
    repository.latestPlatform = Object.freeze({
      ...PLATFORM,
      debugEverEnabled: true,
    })
    const controller = createV2GameRuntimeController({ repository })

    await controller.runtime.start()

    expect(controller.runtime.receiverLocalEntitlements()).toEqual({
      developerOptionsPurchased: true,
    })
    expect('debugEverEnabled' in repository.latestState).toBe(false)
    await controller.runtime.shutdown()
  })

  test('uses unit bot fractions, synchronizes the selected preset, and enforces the Multitasking lock', async () => {
    const migrated = migratePreparedSaveToV2(createDeterministicUnityFirstRunPreparedSave(), { kind: 'trusted-same-device' })
    const unlocked = cloneCanonicalGameStateV2({
      ...migrated.state,
      dyson: { ...migrated.state.dyson, bots: gameDecimalFromNumber(100) },
      skills: { ...migrated.state.skills, selectedPreset: 3 },
    })
    const repository = new FakeRuntimeRepository(createCanonicalRuntimePublicationV2({ revision: 1, state: unlocked, runtime: migrated.runtime }))
    const controller = createV2GameRuntimeController({ repository })
    await controller.runtime.start()

    await expect(controller.runtime.dispatchPlayer({ kind: 'dyson.set-bot-distribution', distribution: 0.5 }))
      .resolves.toMatchObject({ status: 'accepted', changed: true })
    await controller.runtime.requestCheckpoint()
    expect(repository.latestState.dyson.workers).toEqual(gameDecimalFromNumber(50))
    expect(repository.latestState.dyson.researchers).toEqual(gameDecimalFromNumber(50))
    expect(repository.latestState.skills.presets[2].botDistribution).toBe(0.5)

    const lockedState = cloneCanonicalGameStateV2({
      ...repository.latestState,
      quantum: { ...repository.latestState.quantum, unlocks: { ...repository.latestState.quantum.unlocks, botMultitasking: true } },
    })
    const lockedRepository = new FakeRuntimeRepository(createCanonicalRuntimePublicationV2({
      revision: 10, state: lockedState, runtime: migrated.runtime,
    }))
    const locked = createV2GameRuntimeController({ repository: lockedRepository })
    await locked.runtime.start()
    await expect(locked.runtime.dispatchPlayer({ kind: 'dyson.set-bot-distribution', distribution: 0.2 }))
      .resolves.toMatchObject({ status: 'rejected', code: 'V2-COMMAND-REJECTED' })
    await controller.runtime.shutdown()
    await locked.runtime.shutdown()
  })

  test('persists and routes the complete advertised Skill preset command surface', async () => {
    const migrated = migratePreparedSaveToV2(createDeterministicUnityFirstRunPreparedSave(), { kind: 'trusted-same-device' })
    const repository = new FakeRuntimeRepository(createCanonicalRuntimePublicationV2({ revision: 2, state: migrated.state, runtime: migrated.runtime }))
    const controller = createV2GameRuntimeController({ repository })
    await controller.runtime.start()
    const commands = [
      { kind: 'skill.rename-preset', slot: 2, name: 'Exact build' },
      { kind: 'skill.set-preset-color', slot: 2, colorId: 'cyan' },
      { kind: 'skill.set-preset-assignment', slot: 2, skillIds: [] },
      { kind: 'skill.set-preset-bot-distribution', slot: 2, distribution: 0.73 },
      { kind: 'skill.select-preset', slot: 2 },
      { kind: 'skill.set-auto-assignment', skillIds: [] },
      { kind: 'skill.set-tab-preset-automation', tab: 'bots', slot: 3 },
      { kind: 'skill.set-auto-assign-non-refundable', enabled: false },
      { kind: 'skill.import-preset', slot: 4, serialized: JSON.stringify({ version: 1, presetName: 'Imported', botDistribution: 0.25, skillIds: [], colorId: 'pink' }) },
    ] as const
    for (const command of commands) {
      const result = await controller.runtime.dispatchPlayer(command)
      if (result.status === 'rejected') throw new Error(`${command.kind}: ${result.reason}`)
      expect(result, command.kind).toMatchObject({ status: 'accepted' })
    }
    await expect(controller.runtime.dispatchPlayer({ kind: 'skill.apply-tab-preset-automation', tab: 'bots' }))
      .resolves.toMatchObject({ status: 'accepted', changed: false })
    await expect(controller.runtime.dispatchPlayer({
      kind: 'skill.import-preset',
      slot: 3,
      serialized: JSON.stringify({ version: 1, presetName: 'Selected import', botDistribution: 0.4, skillIds: [], colorId: 'gold' }),
    })).resolves.toMatchObject({ status: 'accepted', changed: true })
    await controller.runtime.requestCheckpoint()
    expect(repository.latestState.skills.selectedPreset).toBe(3)
    expect(repository.latestState.skills.presets[1]).toMatchObject({ name: 'Exact build', colorId: 'cyan', botDistribution: 0.73 })
    expect(repository.latestState.skills.presets[3]).toMatchObject({ name: 'Imported', colorId: 'pink', botDistribution: 0.25 })
    expect(repository.latestState.skills.presets[2]).toMatchObject({ name: 'Selected import', colorId: 'gold', botDistribution: 0.4 })
    expect(repository.latestState.dyson.botDistribution).toBe(0.4)
    expect(repository.latestState.skills.tabPresetAutomation.bots).toBe(3)
    expect(repository.latestState.skills.autoAssignNonRefundable).toBe(false)
    await controller.runtime.shutdown()
  })

  test('serializes player commands behind Stored Time so terminal adoption cannot erase them', async () => {
    const migrated = migratePreparedSaveToV2(createDeterministicUnityFirstRunPreparedSave(), { kind: 'trusted-same-device' })
    const initial = createCanonicalRuntimePublicationV2({
      revision: 4,
      state: cloneCanonicalGameStateV2({ ...migrated.state, timeline: { ...migrated.state.timeline, storedTimeAvailableSeconds: 10 } }),
      runtime: migrated.runtime,
    })
    const terminal = deferred<void>()
    const host = new FakeStoredTimeHost(initial, terminal.promise)
    const repository = new FakeRuntimeRepository(initial)
    const controller = createV2GameRuntimeController({ repository, createStoredTimeHost: () => host })
    await controller.runtime.start()
    const spend = controller.runtime.dispatchPlayer({ kind: 'time.request-stored-time-spend', requestedSeconds: 5 })
    await host.terminalStarted.promise
    const command = controller.runtime.dispatchPlayer({ kind: 'settings.set-navigation-item-visible', item: 'story', visible: true })
    terminal.resolve()
    await expect(spend).resolves.toMatchObject({ status: 'accepted' })
    await expect(command).resolves.toMatchObject({ status: 'accepted', changed: true })
    await controller.runtime.requestCheckpoint()
    expect(repository.latestState.timeline.storedTimeAvailableSeconds).toBe(5)
    expect(repository.latestState.meta.navigationVisibility.story).toBe(true)
    await controller.runtime.shutdown()
  })

  test('serializes player commands behind save import so replacement adoption cannot erase them', async () => {
    const migrated = migratePreparedSaveToV2(createDeterministicUnityFirstRunPreparedSave(), { kind: 'trusted-same-device' })
    const repository = new FakeRuntimeRepository(createCanonicalRuntimePublicationV2({ revision: 3, state: migrated.state, runtime: migrated.runtime }))
    const gate = deferred<void>()
    repository.blockImport(gate.promise)
    const controller = createV2GameRuntimeController({ repository })
    await controller.runtime.start()
    const portable = encodeSchema13WebSave({ savedAtUtc: '2026-08-12T02:00:00.000Z', state: migrated.state, runtime: migrated.runtime })
    const importing = controller.runtime.importSave({
      source: 'paste', text: portable, importedAtUtc: '2026-08-12T02:00:00.000Z', overwriteApproved: true,
    })
    await repository.importStarted.promise
    const command = controller.runtime.dispatchPlayer({
      kind: 'settings.set-navigation-item-visible', item: 'story', visible: true,
    })
    gate.resolve()
    await expect(importing).resolves.toMatchObject({ imported: true })
    await expect(command).resolves.toMatchObject({ status: 'accepted', changed: true })
    await controller.runtime.requestCheckpoint()
    expect(repository.latestState.meta.navigationVisibility.story).toBe(true)
    await controller.runtime.shutdown()
  })
  test('exposes a development-only unlock that persists platform ownership without changing gameplay currency', async () => {
    const migrated = migratePreparedSaveToV2(
      createDeterministicUnityFirstRunPreparedSave(),
      Object.freeze({ kind: 'trusted-same-device' }),
    )
    const initial = createCanonicalRuntimePublicationV2(Object.freeze({
      revision: 7,
      state: migrated.state,
      runtime: migrated.runtime,
    }))
    const repository = new FakeRuntimeRepository(initial)
    const controller = createV2GameRuntimeController({ repository })
    await controller.runtime.start()

    const development = controller.runtime.development
    expect(development).toBeDefined()
    const before = repository.latestState
    await expect(development!.apply({ kind: 'unlock-debug-options' })).resolves.toEqual({
      applied: true,
      stateRevision: 7,
      durableRevision: 7,
    })
    expect(development!.status()).toMatchObject({ enabled: true, entitled: true })
    expect(repository.latestState.dyson.money).toEqual(before.dyson.money)
    expect(repository.latestState.quantum.availableShards).toEqual(before.quantum.availableShards)
    expect(repository.latestState.dream.strangeMatter).toEqual(before.dream.strangeMatter)
    expect(repository.latestPlatform).toMatchObject({ debugOptions: true, debugEverEnabled: true })

    await controller.runtime.shutdown()
    const reloaded = createV2GameRuntimeController({ repository })
    await reloaded.runtime.start()
    expect(reloaded.runtime.development?.status()).toMatchObject({ enabled: true, entitled: true })
    await reloaded.runtime.shutdown()
  })

  test('checkpoints a dirty live revision before importing a replacement save', async () => {
    const migrated = migratePreparedSaveToV2(
      createDeterministicUnityFirstRunPreparedSave(),
      Object.freeze({ kind: 'trusted-same-device' }),
    )
    const initial = createCanonicalRuntimePublicationV2(Object.freeze({
      revision: 7,
      state: migrated.state,
      runtime: migrated.runtime,
    }))
    const repository = new FakeRuntimeRepository(initial)
    const host = new FakeStoredTimeHost(initial)
    const controller = createV2GameRuntimeController({
      repository,
      beforeStart: async () => undefined,
      afterShutdown: async () => undefined,
      createStoredTimeHost: () => host,
    })
    await controller.runtime.start()
    await controller.runtime.dispatchPlayer({
      kind: 'settings.set-navigation-item-visible',
      item: 'wiki',
      visible: false,
    })
    await controller.runtime.dispatchPlayer({
      kind: 'settings.set-navigation-item-visible',
      item: 'story',
      visible: true,
    })

    const replacement = encodeSchema13WebSave(Object.freeze({
      savedAtUtc: '2026-08-12T01:00:00.000Z',
      state: migrated.state,
      runtime: migrated.runtime,
    }))
    const imported = await controller.runtime.importSave({
      source: 'paste',
      text: replacement,
      importedAtUtc: '2026-08-12T01:00:00.000Z',
      overwriteApproved: true,
    })

    expect(imported).toMatchObject({ imported: true })
    expect(repository.checkpoints).toContain(9)
    expect(host.snapshot().revision).toBe(10)
    await controller.runtime.shutdown()
  })

  test('opens, checkpoints, previews old imports, routes settings and Stored Time, and lifecycle-pauses', async () => {
    const migrated = migratePreparedSaveToV2(
      createDeterministicUnityFirstRunPreparedSave(),
      Object.freeze({ kind: 'trusted-same-device' }),
    )
    const initial = createCanonicalRuntimePublicationV2(Object.freeze({
      revision: 7,
      state: Object.freeze({
        ...migrated.state,
        timeline: Object.freeze({
          ...migrated.state.timeline,
          storedTimeAvailableSeconds: 10,
        }),
      }),
      runtime: migrated.runtime,
    }))
    const repository = new FakeRuntimeRepository(initial)
    const lifecycle = new FakeLifecycle()
    let host: FakeStoredTimeHost | null = null
    const afterShutdown = vi.fn(async () => undefined)
    const controller = createV2GameRuntimeController({
      repository,
      lifecycle,
      beforeStart: async () => undefined,
      afterShutdown,
      createStoredTimeHost: (publication) => {
        host = new FakeStoredTimeHost(publication)
        return host
      },
    })

    await expect(controller.runtime.start()).resolves.toMatchObject({ phase: 'ready' })
    expect(controller.runtime.snapshot()).toMatchObject({ phase: 'ready' })

    const preview = await controller.runtime.previewImport({
      source: 'paste',
      text: serializeWebSave(
        createDeterministicUnityFirstRunPreparedSave().copyValidatedState(),
      ),
      importedAtUtc: '2026-08-12T01:00:00.000Z',
      overwriteApproved: false,
    })
    expect(preview.accepted).toBe(true)

    const setting = await controller.runtime.dispatchPlayer({
      kind: 'settings.set-navigation-item-visible',
      item: 'wiki',
      visible: false,
    })
    expect(setting).toMatchObject({ status: 'accepted', changed: true })

    const stored = await controller.runtime.dispatchPlayer({
      kind: 'time.request-stored-time-spend',
      requestedSeconds: 5,
    })
    expect(stored).toMatchObject({
      status: 'accepted',
      kind: 'stored-time',
      consumedSeconds: 5,
      remainingSeconds: 0,
    })
    expect(host!.startRequests).toEqual([5])

    lifecycle.emit('background')
    await vi.waitFor(() => expect(host!.pauseReasons).toContain('background'))
    expect(await controller.runtime.requestCheckpoint()).toBe(true)
    expect(repository.checkpoints.length).toBeGreaterThan(0)

    await controller.runtime.shutdown()
    expect(afterShutdown).toHaveBeenCalledTimes(1)
  })
})

class FakeRuntimeRepository implements V2GameRuntimeRepository {
  readonly checkpoints: number[] = []
  #publication: Readonly<CanonicalRuntimePublicationV2>
  latestPlatform: Readonly<Schema13PlatformState> = PLATFORM
  readonly importStarted = deferred<void>()
  #importGate: Promise<void> = Promise.resolve()

  constructor(publication: Readonly<CanonicalRuntimePublicationV2>) {
    this.#publication = publication
  }

  get latestState() { return this.#publication.state }
  blockImport(gate: Promise<void>) { this.#importGate = gate }

  async recoverNewestValid() {
    const save = decodeSchema13WebSave(encodeSchema13WebSave({
      savedAtUtc: '2026-08-12T00:00:00.000Z',
      state: this.#publication.state,
      runtime: this.#publication.runtime,
    }))
    return Object.freeze({ save, platform: this.latestPlatform, revision: this.#publication.revision })
  }

  async checkpointPrepared(source: Parameters<V2GameRuntimeRepository['checkpointPrepared']>[0], platform: Readonly<Schema13PlatformState>, revision: number) {
    this.checkpoints.push(revision)
    this.latestPlatform = platform
    this.#publication = createCanonicalRuntimePublicationV2({
      revision,
      state: source.state,
      runtime: source.runtime,
    })
  }

  async importPortable(portableSave: string) {
    this.importStarted.resolve()
    await this.#importGate
    const decoded = decodeSchema13WebSave(portableSave)
    const revision = this.#publication.revision + 1
    this.#publication = createCanonicalRuntimePublicationV2({
      revision,
      state: decoded.state,
      runtime: decoded.runtime,
    })
    return Object.freeze({ revision, portableSave, platform: PLATFORM, decoded })
  }

  async exportPortable() { return null }
  async exportRetainedImport() { return null }
  async cleanup() { /* isolated test no-op */ }
}

class FakeStoredTimeHost implements V2StoredTimeHostPort {
  readonly startRequests: number[] = []
  readonly pauseReasons: string[] = []
  #publication: Readonly<CanonicalRuntimePublicationV2>
  #requested = 0
  readonly terminalStarted = deferred<void>()

  constructor(publication: Readonly<CanonicalRuntimePublicationV2>, readonly terminalGate: Promise<void> = Promise.resolve()) {
    this.#publication = publication
  }

  snapshot() { return this.#publication }
  adoptExternalPublication(publication: Readonly<CanonicalRuntimePublicationV2>) {
    if (publication.revision < this.#publication.revision) {
      throw new Error('Cannot adopt an older foreground publication.')
    }
    this.#publication = publication
  }
  async confirmDurableReadmission() { return this.#result('ready') }
  async returnFromSuspension() { return this.#result('ready') }
  async startStoredTime(request: { requestedDurationSeconds: number }) {
    this.#requested = request.requestedDurationSeconds
    this.startRequests.push(this.#requested)
    return this.#result('started')
  }
  async awaitStoredTimeTerminal() {
    this.terminalStarted.resolve()
    await this.terminalGate
    this.#publication = createCanonicalRuntimePublicationV2({
      revision: this.#publication.revision + 1,
      state: Object.freeze({
        ...this.#publication.state,
        timeline: Object.freeze({
          ...this.#publication.state.timeline,
          storedTimeAvailableSeconds:
            this.#publication.state.timeline.storedTimeAvailableSeconds - this.#requested,
        }),
      }),
      runtime: this.#publication.runtime,
    })
    return this.#result('completed')
  }
  async pauseForLifecycle(reason = 'host-suspending') {
    this.pauseReasons.push(reason)
    return this.#result('paused')
  }
  #result(status: 'ready' | 'started' | 'completed' | 'paused') {
    return Object.freeze({ status, publication: this.#publication, storedTimeUntouched: false })
  }
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

class FakeLifecycle implements LifecycleAdapter {
  #listener: ((phase: LifecyclePhase) => void) | null = null
  currentPhase(): LifecyclePhase { return 'active' }
  subscribe(listener: (phase: LifecyclePhase) => void) {
    this.#listener = listener
    return () => { this.#listener = null }
  }
  emit(phase: LifecyclePhase) { this.#listener?.(phase) }
}
