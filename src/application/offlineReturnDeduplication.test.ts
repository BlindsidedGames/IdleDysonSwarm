import { test, expect } from 'vitest'
import { createUnityFirstRunPreparedSave } from './firstRun/unityFirstRunSave'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { mkdir, mkdtemp, rm, readFile, writeFile, rename, copyFile, access } from 'node:fs/promises'
import { resolve, dirname, sep } from 'node:path'
import { runInNewContext } from 'node:vm'
import { prepareIdb1Save, PreparedSave } from '../save/prepare'
import { serializeWebSave, deserializeWebSave } from '../save/serialization'
import { CanonicalRuntimeSession, createCanonicalRuntimeSessionFactory } from './canonicalRuntimeSession'
import { createCanonicalGameApplication } from './canonicalGameApplication'
import { createProductionEventContext } from '../simulation/productionEventContext'
import { createBrowserRuntimeFoundation } from '../ui/runtime/browserRuntimeFoundation'
import { NativeLifecycleAdapter } from '../platform/nativeSystemPorts'
import { SingleHostSessionWriterAuthority } from '../platform/singleHostSessionWriterAuthority'
import { ElectronPlatformSaveStorageAdapter, NATIVE_WEB_SAVE_PATHS } from '../platform/platformSaveStorage'
import { BrowserDepartureMarker } from '../platform/browserDepartureMarker'
import { WEB_LIFECYCLE_POLICY } from '../simulation/lifecycleAwayTime'
import { galvanizeCanonicalSkill } from '../simulation/canonicalSkillTransactions'

// Exercise native callback delivery and receipt capture through the real runtime.
// Files stay under a disposable root; account IPC is unavailable.
const t0 = Date.parse('2026-10-04T09:00:00Z')
const H = 3600000
const idle = { requestFrame: () => 0, cancelFrame: () => {} }

async function fixture(name: string, sheep: boolean, capacityHours: number, bankHours = 0, selectedSlot = 1) {
  const root = await mkdtemp(resolve(tmpdir(), 'ids-offline-return-'))
  let failedReplacements = 0
  let cleanupFails = false
  let heldReplacement: { entered: () => void; release: Promise<void> } | undefined
  function rooted(path: string) {
    const target = resolve(root, path)
    if (!target.startsWith(root + sep) || path.startsWith('/') || path.split('/').includes('..')) throw new Error('Isolation guard rejected save path')
    return target
  }
  const files = {
    async exists(path: string) { try { await access(rooted(path)); return true } catch { return false } },
    async readText(path: string) { return readFile(rooted(path), 'utf8') },
    async writeText(path: string, text: string) { const target = rooted(path); await mkdir(dirname(target), { recursive: true }); await writeFile(target, text) },
    async replaceAtomically(from: string, to: string) {
      if (failedReplacements > 0) { failedReplacements -= 1; throw new Error('Fixture commit failed') }
      if (heldReplacement) { const held = heldReplacement; heldReplacement = undefined; held.entered(); await held.release }
      await rename(rooted(from), rooted(to))
    },
    async copy(from: string, to: string) { await mkdir(dirname(rooted(to)), { recursive: true }); await copyFile(rooted(from), rooted(to)) },
  }
  const source = (name.includes('first-run')
    ? createUnityFirstRunPreparedSave({ startedAtUtc: new Date(t0).toISOString() })
    : prepareIdb1Save(readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')).prepared).copyValidatedState()
  const dyson = source.dysonVerseSaveData as Record<string, unknown>
  dyson.selectedPreset = selectedSlot
  Object.assign(source, { offlineTime: bankHours*3600, maxOfflineTime: capacityHours*3600, processingRewriteMigrated: true, dateQuitString: null, idsLastActiveAtUtc: null })
  source.sdPrestige.doubleTime = 0
  const session = new CanonicalRuntimeSession(PreparedSave.fromDecoded(source), { entitlements: { permanentDoubleIp: false } })
  const state = structuredClone(session.initialState)
  state.gameState.skills.byId.idleElectricSheep.owned = sheep
  state.gameState.challenges.galvanizedSkillIds = []
  if (name.includes('fractured')) {
    Object.assign(state.gameState.challenges, { unlocked: true, blankSlateCompleted: true, hasEarnedGalvanizer: true, galvanizers: 1n })
    const result = galvanizeCanonicalSkill(state.gameState, 'idleElectricSheep')
    expect(result.accepted).toBe(true)
    if (result.accepted) state.gameState = result.state
  }
  await files.writeText(NATIVE_WEB_SAVE_PATHS.current, serializeWebSave(session.prepare(state).copyValidatedState()))

  let bridge: any
  const ipcHandlers = new Map<string, Function>()
  runInNewContext(readFileSync(new URL('../../hosts/electron/preload.cjs', import.meta.url), 'utf8'), {
    require: (name: string) => {
      if (name !== 'electron') throw new Error('Unexpected module')
      return {
        contextBridge: { exposeInMainWorld: (_name: string, value: unknown) => { bridge = value } },
        ipcRenderer: { on: (name: string, handler: Function) => ipcHandlers.set(name, handler), invoke: () => { throw new Error('Account/IPC writes prohibited by fixture') } },
      }
    }, process: { argv: [] }, document: { addEventListener: () => {}, hasFocus: () => true }, console,
  })
  const lifecycle = new NativeLifecycleAdapter({ currentPhase: () => bridge.currentLifecyclePhase(), subscribe: (listener) => bridge.subscribeLifecycle(listener) })
  const emit = (phase: string) => ipcHandlers.get('ids:native:lifecycle')!({}, phase)
  let now = t0
  const clock = { sample: () => ({ utcMilliseconds: now, serializedUtcText: new Date(now).toISOString() }) }
  const values = new Map<string,string>()
  const marker = new BrowserDepartureMarker(name, { getItem: key => values.get(key) ?? null, setItem: (key,value) => { values.set(key,value) }, removeItem: key => { if (cleanupFails) throw new Error('Fixture marker cleanup denied'); values.delete(key) } })
  const open = () => createBrowserRuntimeFoundation({
    createApplication: repository => createCanonicalGameApplication({ repository,
      startupResolver: { resolve: async () => ({ kind: 'ready', source: 'primary', save: (await repository.loadCurrent())! }) },
      sessionFactory: createCanonicalRuntimeSessionFactory({ entitlements: { permanentDoubleIp: false }, nowUtcMilliseconds: () => now }),
      engine: { eventContext: createProductionEventContext() },
    }),
    lifecyclePolicy: WEB_LIFECYCLE_POLICY, lifecycle, lifecycleClock: clock,
    allowedExternalOrigins: [], writerAuthority: new SingleHostSessionWriterAuthority({ sessionId: name }),
    saveStorage: new ElectronPlatformSaveStorageAdapter(files, { discoverCandidates: async () => [] }),
    saveRepositoryPaths: NATIVE_WEB_SAVE_PATHS, allowCanonicalPlayerWrites: true,
    departureMarker: marker, activeTimeClock: { nowMilliseconds: () => 0 }, activeTimeScheduler: idle,
    frontendSnapshotScheduler: { requestFrame: callback => { queueMicrotask(callback); return 0 }, cancelFrame: () => {} },
    checkpointScheduler: { setInterval: () => 0, clearInterval: () => {} },
    storageManager: { persisted: async () => true, persist: async () => true },
    developmentControlsAvailable: false,
  })
  let runtime = open()
  expect(await runtime.start()).toMatchObject({ phase: 'ready' })
  async function bank() { return Number(deserializeWebSave(await files.readText(NATIVE_WEB_SAVE_PATHS.current)).offlineTime)/3600 }
  return { get runtime() { return runtime }, emit, bank, marker, root,
    saved: async () => deserializeWebSave(await files.readText(NATIVE_WEB_SAVE_PATHS.current)),
    restart: async () => { await runtime.shutdown(); runtime = open(); expect(await runtime.start()).toMatchObject({ phase: 'ready' }) },
    setNow: (value: number) => { now = value },
    failNextCommits: (count: number) => { failedReplacements = count },
    denyMarkerCleanup: () => { cleanupFails = true },
    allowMarkerCleanup: () => { cleanupFails = false },
    holdNextCommit: () => {
      let entered!: () => void
      let release!: () => void
      const enteredPromise = new Promise<void>(resolve => { entered = resolve })
      const releasePromise = new Promise<void>(resolve => { release = resolve })
      heldReplacement = { entered, release: releasePromise }
      return { entered: enteredPromise, release }
    },
    close: async () => { await runtime.shutdown(); await rm(root, { recursive: true, force: true }) },
  }
}

test.each([
  ['single return, sheep, 24h cap', true, 24, 1, 14],
  ['two return callbacks, sheep, 24h cap', true, 24, 2, 14],
  ['two return callbacks, sheep, 48h cap', true, 48, 2, 14],
  ['four return callbacks, no sheep, 24h cap', false, 24, 4, 7],
  ['two return callbacks, no sheep, 48h cap', false, 48, 2, 7],
  ['two sequential return callbacks, sheep, 24h cap', true, 24, -2, 14],
  ['single return, fractured sheep, 24h cap', true, 24, 1, 14],
  ['two return callbacks, fractured sheep, 24h cap', true, 24, 2, 14],
] as const)('%s must credit the absence once', async (name, sheep, capacity, callbacks, expected) => {
  const f = await fixture(name.replaceAll(/[^a-z0-9]/gi, '-'), sheep, capacity)
  try {
    expect(await f.bank()).toBe(0)
    f.emit('background')
    await f.runtime.requestCheckpoint()
    f.setNow(t0 + 7*H)
    for (let i = 0; i < Math.abs(callbacks); i++) {
      f.emit('active')
      if (callbacks < 0) await f.runtime.requestCheckpoint()
    }
    // This fenced operation drains the actual production router before reading disk.
    await f.runtime.requestCheckpoint()
    const actual = await f.bank()
    expect(actual).toBe(expected)
  } finally { await f.close() }
})

test.each([
  ['no sheep', false, 5, 24, 12],
  ['sheep', true, 5, 48, 19],
  ['fractured sheep', true, 20, 24, 24],
] as const)('overlapping returns preserve the existing bank and cap: %s', async (name, sheep, bank, capacity, expected) => {
  const f = await fixture(name, sheep, capacity, bank)
  try {
    f.emit('background')
    await f.runtime.requestCheckpoint()
    f.setNow(t0 + 7*H)
    f.emit('active')
    f.emit('active')
    await f.runtime.requestCheckpoint()
    expect(await f.bank()).toBe(expected)
  } finally { await f.close() }
})

test('a newer departure queued during a return keeps its own marker and earns its distinct absence', async () => {
  const f = await fixture('fractured sheep', true, 48)
  try {
    f.emit('background')
    await f.runtime.requestCheckpoint()
    f.setNow(t0 + H)
    const held = f.holdNextCommit()
    f.emit('active')
    f.emit('active')
    await held.entered
    f.setNow(t0 + 2*H)
    f.emit('background')
    f.setNow(t0 + 3*H)
    f.emit('active')
    f.emit('active')
    held.release()
    await f.runtime.requestCheckpoint()
    expect(await f.bank()).toBe(4)
    expect(f.marker.read()).toBeNull()

    f.setNow(t0 + 4*H)
    f.emit('background')
    await f.runtime.requestCheckpoint()
    f.setNow(t0 + 5*H)
    f.emit('active')
    await f.runtime.requestCheckpoint()
    expect(await f.bank()).toBe(6)
  } finally { await f.close() }
})

test.each([1, 2])('failed credit commits remain retryable without duplicate credit (%s failures)', async failures => {
  const f = await fixture('fractured sheep', true, 48)
  try {
    f.emit('background')
    await f.runtime.requestCheckpoint()
    f.setNow(t0 + 7*H)
    f.failNextCommits(failures)
    f.emit('active')
    f.emit('active')
    await f.runtime.requestCheckpoint()
    expect(await f.bank()).toBe(failures === 1 ? 14 : 0)
    expect(f.marker.read() === null).toBe(failures === 1)

    f.emit('active')
    f.emit('active')
    await f.runtime.requestCheckpoint()
    expect(await f.bank()).toBe(14)
    expect(f.marker.read()).toBeNull()
  } finally { await f.close() }
})

test('best-effort marker cleanup failure does not let a later callback repeat a committed credit', async () => {
  const f = await fixture('sheep', true, 48)
  try {
    f.emit('background')
    await f.runtime.requestCheckpoint()
    f.setNow(t0 + 7*H)
    f.denyMarkerCleanup()
    f.emit('active')
    await f.runtime.requestCheckpoint()
    expect(await f.bank()).toBe(14)
    expect(f.marker.read()).not.toBeNull()
    f.emit('active')
    await f.runtime.requestCheckpoint()
    expect(await f.bank()).toBe(14)

    f.setNow(t0 + 8*H)
    f.emit('background')
    await f.runtime.requestCheckpoint()
    f.setNow(t0 + 9*H)
    f.emit('active')
    await f.runtime.requestCheckpoint()
    expect(await f.bank()).toBe(16)
  } finally { await f.close() }
})

// A fresh runtime must recover the bank and exact marker acknowledgement from
// the same durable save, even when marker cleanup was interrupted.
test.each([
  ['first-run cleanup', false, 24, 10],
  ['legacy cleanup', false, 48, 1],
  ['Sheep cleanup', true, 48, 10],
] as const)('a committed return survives failed marker cleanup and restart (%s)', async (name, sheep, capacity, slot) => {
  const f = await fixture(name, sheep, capacity, 0, slot)
  const credit = sheep ? 14 : 7
  try {
    f.emit('background')
    await f.runtime.requestCheckpoint()
    f.setNow(t0 + 7*H)
    f.denyMarkerCleanup()
    f.emit('active')
    await f.runtime.requestCheckpoint()
    expect(await f.bank()).toBe(credit)
    expect(f.marker.read()).not.toBeNull()
    await f.restart()
    expect(await f.bank()).toBe(credit)
    expect((await f.saved()).dysonVerseSaveData).toMatchObject({ selectedPreset: slot })
    // Ignoring the consumed marker must still recover a later genuine gap
    // from the credited checkpoint, without throwing away that new hour.
    f.setNow(t0 + 8*H)
    await f.restart()
    const afterGap = credit + (sheep ? 2 : 1)
    expect(await f.bank()).toBe(afterGap)
    // A transient failure may clear on the following restart.
    f.allowMarkerCleanup()
    await f.restart()
    expect(await f.bank()).toBe(afterGap)
    expect(f.marker.read()).toBeNull()
    // The receipt rejects only its exact departure, never a new absence.
    f.setNow(t0 + 8*H)
    f.emit('background')
    await f.runtime.requestCheckpoint()
    f.setNow(t0 + 9*H)
    f.emit('active')
    await f.runtime.requestCheckpoint()
    expect(await f.bank()).toBe(afterGap + (sheep ? 2 : 1))
    await f.restart()
    expect(await f.bank()).toBe(afterGap + (sheep ? 2 : 1))
  } finally { await f.close() }
})

test('an uncredited old marker survives a later active checkpoint and restart', async () => {
  const f = await fixture('restart-failed-credit', false, 24)
  try {
    f.failNextCommits(2) // departure promotion and away-credit promotion
    f.emit('background')
    f.setNow(t0 + 7*H)
    f.emit('active')
    await f.runtime.requestCheckpoint()
    expect(await f.bank()).toBe(0)
    expect(f.marker.read()).not.toBeNull()
    expect(await f.runtime.dispatchPlayer({ kind: 'settings.set-processing-interval', milliseconds: 200 })).toMatchObject({ status: 'accepted' })
    await f.runtime.requestCheckpoint()
    const saved = deserializeWebSave(await readFile(resolve(f.root, NATIVE_WEB_SAVE_PATHS.current), 'utf8'))
    expect(saved.dateQuitString).toBeNull()
    expect(saved.idsLastActiveAtUtc).toBe(new Date(t0 + 7*H).toISOString())
    await f.restart()
    expect(await f.bank()).toBe(7)
    expect(f.marker.read()).toBeNull()
  } finally { await f.close() }
})
