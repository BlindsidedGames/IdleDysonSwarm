import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gzipSync, strToU8 } from 'fflate'
import { expect, test } from 'vitest'
import { PortableSaveRepository, type SaveStorageAdapter, type LegacySaveCandidate } from '../save/repository'
import { deserializeWebSave, serializeWebSave } from '../save/serialization'
import { PreparedSave } from '../save/prepare'
import { decodeIdb1SaveRoot } from '../save/decodeIdb1'
import { createProductionCanonicalApplicationFactory } from './productionApplicationFactory'
import { createUnityFirstRunPreparedSave } from './firstRun/unityFirstRunSave'
import { CanonicalLifecycleCoordinator } from './canonicalLifecycleCoordinator'
import { WEB_LIFECYCLE_POLICY } from '../simulation/lifecycleAwayTime'
import { createBrowserRuntimeFoundation } from '../ui/runtime/browserRuntimeFoundation'
import { SingleHostSessionWriterAuthority } from '../platform/singleHostSessionWriterAuthority'
import type { CanonicalGameApplicationFacade } from './canonicalGameApplication'
import type { CanonicalPlayerCommand } from './canonicalPlayerCommands'

// Real save/application owners; only filesystem primitives and the host clock
// are replaced. No provider, worker execution or actual player data is used.
const paths = { current: '/current', temporary: '/temporary', legacyRecovery: '/legacy', backups: ['/backup1', '/backup2', '/backup3'] as const }
const firstRun = () => createUnityFirstRunPreparedSave({ startedAtUtc: '2026-10-05T00:00:00.000Z' })
const factory = createProductionCanonicalApplicationFactory({ createFirstRunSave: firstRun, readHostEntitlements: () => ({ permanentDoubleIp: true }) })
type Fault = 'archive-write' | 'archive-read' | 'receipt-write' | 'receipt-read' | 'temporary-write' | 'temporary-read' | 'backup-copy' | 'replace'
class Memory implements SaveStorageAdapter {
  files = new Map<string, string>()
  publications: string[] = []
  candidates: readonly LegacySaveCandidate[] = []
  fault: Fault | undefined
  async exists(path: string) { return this.files.has(path) }
  async readText(path: string) {
    if (this.fault === 'temporary-read' && path === paths.temporary || this.fault === 'archive-read' && path.endsWith('.source.txt') || this.fault === 'receipt-read' && path.endsWith('.source.txt.json')) throw Error('interrupted read')
    if (!this.files.has(path)) throw Error('missing ' + path)
    return this.files.get(path)!
  }
  async writeText(path: string, text: string) {
    if (this.fault === 'temporary-write' && path === paths.temporary || this.fault === 'archive-write' && path.endsWith('.source.txt') || this.fault === 'receipt-write' && path.endsWith('.source.txt.json')) throw Error('interrupted write')
    this.files.set(path, text)
  }
  async copy(from: string, to: string) {
    if (this.fault === 'backup-copy') throw Error('interrupted backup')
    this.files.set(to, await this.readText(from))
  }
  async replaceAtomically(from: string, to: string) {
    if (this.fault === 'replace') throw Error('interrupted replace')
    const text = await this.readText(from)
    this.publications.push(text)
    this.files.set(to, text)
    this.files.delete(from)
  }
  async discoverLegacyCandidates() { return this.candidates }
}
function repository(storage: Memory, allowCanonicalPlayerWrites = false) { return new PortableSaveRepository(storage, paths, decodeIdb1SaveRoot, { allowCanonicalPlayerWrites }) }
function transport(state: Record<string, unknown>, format = 'IDSWEB1', schema = 20, prefix = format): string {
  return `${prefix}:${Buffer.from(gzipSync(strToU8(JSON.stringify({ format, schema, state }, (_key, value) => typeof value === 'bigint' ? { $bigint: String(value) } : value)))).toString('base64')}`
}
function source(id = 'late-quantum', quit?: string, paidAugment = false): string {
  const original = readFileSync(new URL(`../../test/fixtures/progression/${id}.idsweb1.txt`, import.meta.url), 'utf8')
  const state = deserializeWebSave(original)
  expect(state.saveVersion).toBe(20)
  state.offlineTime = 4000.625
  if (paidAugment) {
    const dyson = state.dysonVerseSaveData as any
    dyson.dysonVerseSkillTreeData.skillPointsTree = 10n
    dyson.dysonVerseInfinityData.skillStateById.startHereTree = { owned: true, level: 1, timerSeconds: 0, secondaryTimerSeconds: 0 }
    dyson.dysonVerseInfinityData.skillOwnedById.startHereTree = true
    state.infinityChallengeData = { ...state.infinityChallengeData as object, unlocked: true, blankSlateCompleted: true, hasEarnedGalvanizer: true, galvanizedSkillIds: ['startHereTree'] }
    dyson.dysonVerseInfinityData.skillStateById['subskill.cashScience.lifetime'] = { owned: true, level: 1, timerSeconds: 0, secondaryTimerSeconds: 0 }
    dyson.dysonVerseInfinityData.skillOwnedById['subskill.cashScience.lifetime'] = true
  }
  state.dateQuitString = quit ?? ''
  delete state.idsLastActiveAtUtc
  delete state.idsConsumedDepartureAtUtc
  return transport(state)
}
function ready(app: CanonicalGameApplicationFacade) {
  const s = app.snapshot()
  if (s.phase !== 'ready') throw Error('not ready: ' + JSON.stringify(s))
  return s
}
function command(app: CanonicalGameApplicationFacade, value: CanonicalPlayerCommand) {
  const s = ready(app)
  return { sessionRevision: s.revision.session, expectedStateRevision: s.revision.state, command: value }
}
function archivePath(text: string) { return `/legacy.one-way/${createHash('sha256').update(text).digest('hex')}.source.txt` }
function accepted(result: Awaited<ReturnType<CanonicalGameApplicationFacade['dispatchPlayer']>>) { return result.kind === 'transition' && result.transition.accepted }

test.each(['keep', 'fresh'] as const)('%s converts a released save and choice with one publication; pending blocks all ordinary owners', async choice => {
  const storage = new Memory(), text = source()
  storage.files.set(paths.current, text)
  const app = factory(repository(storage))
  await app.start()
  const before = ready(app)
  expect(before.operation).toBe('rework-choice-pending')
  expect(before.revision.durable).toBeNull()
  expect(storage.publications).toHaveLength(0)
  expect(storage.files.get(paths.current)).toBe(text)
  expect(app.advanceActive(1000).accepted).toBe(false)
  expect((await app.checkpoint()).committed).toBe(false)
  expect(accepted(await app.dispatchPlayer(command(app, { kind: 'dyson.set-buy-mode', buyMode: 'buy-10' })))).toBe(false)
  expect((await app.commitStoredTime(command(app, { kind: 'rework.choose-migration', choice }), 1)).committed).toBe(false)
  expect(app.captureSaveTransferSnapshot()).toBeNull()
  expect((await app.importSave({ text, importedAtUtc: '2026-10-11T00:00:00Z', overwriteApproved: true })).imported).toBe(false)
  expect(ready(app).state).toEqual(before.state)
  const envelope = command(app, { kind: 'rework.choose-migration', choice })
  const twice = await Promise.all([app.dispatchPlayer(envelope), app.dispatchPlayer(envelope)])
  expect(twice.map(accepted)).toEqual([true, false])
  expect(storage.publications.map(text => deserializeWebSave(text).saveVersion)).toEqual([21])
  expect(storage.files.get(archivePath(text))).toBe(text)
  expect(ready(app).state.gameState.timeline.storedTimeAvailableSeconds).toBe(4000.625)
  expect(ready(app).state.entitlements.permanentDoubleIp).toBe(true)
  expect(ready(app).state.gameState.dyson.facilities).toEqual(before.state.gameState.dyson.facilities)
  const durable = storage.files.get(paths.current)
  const reopened = factory(repository(storage))
  await reopened.start()
  expect(ready(reopened).operation).toBe('none')
  expect(ready(reopened).state.gameState.meta.reworkMigrationChoice).toBe(choice)
  expect(accepted(await reopened.dispatchPlayer(command(reopened, { kind: 'rework.choose-migration', choice })))).toBe(false)
  expect(storage.publications).toHaveLength(1)
  expect(storage.files.get(paths.current)).toBe(durable)
  app.disposeStoredTimeJobRunner(); reopened.disposeStoredTimeJobRunner()
})

test.each(['archive-write', 'archive-read', 'receipt-write', 'receipt-read', 'temporary-write', 'temporary-read', 'backup-copy', 'replace'] as const)('choice interrupted at %s preserves original and retries exactly once', async fault => {
  const storage = new Memory(), text = source()
  storage.files.set(paths.current, text)
  const app = factory(repository(storage)); await app.start()
  const before = ready(app).state
  storage.fault = fault
  expect(accepted(await app.dispatchPlayer(command(app, { kind: 'rework.choose-migration', choice: 'fresh' })))).toBe(false)
  expect(storage.files.get(paths.current)).toBe(text)
  expect(storage.publications).toHaveLength(0)
  expect(ready(app).operation).toBe('rework-choice-pending')
  expect(ready(app).state).toEqual(before)
  storage.fault = undefined
  const reopened = factory(repository(storage)); await reopened.start()
  expect(ready(reopened).operation).toBe('rework-choice-pending')
  expect(storage.publications).toHaveLength(0)
  expect(accepted(await reopened.dispatchPlayer(command(reopened, { kind: 'rework.choose-migration', choice: 'fresh' })))).toBe(true)
  expect(storage.publications).toHaveLength(1)
  expect(storage.files.get(archivePath(text))).toBe(text)
  expect(ready(reopened).state.gameState.timeline.storedTimeAvailableSeconds).toBe(4000.625)
  app.disposeStoredTimeJobRunner(); reopened.disposeStoredTimeJobRunner()
})

test('pending lifecycle leaves receipts untouched and includes capped startup credit in the same final publication', async () => {
  const storage = new Memory(), text = source('late-quantum', '2026-10-05T00:00:00.000Z')
  storage.files.set(paths.current, text)
  const app = factory(repository(storage))
  let now = Date.parse('2026-10-05T01:00:00.000Z'), cleaned = 0
  const coordinator = new CanonicalLifecycleCoordinator({ application: app, lifecycle: { currentPhase: () => 'active', subscribe: () => () => {} }, clock: { sample: () => ({ utcMilliseconds: now, serializedUtcText: new Date(now).toISOString() }) }, policy: WEB_LIFECYCLE_POLICY, clearPendingDepartureTimestamp: () => cleaned++, subscribeToLifecycle: false })
  await coordinator.start(undefined, { status: 'valid', utcMilliseconds: Date.parse('2026-10-05T00:00:00.000Z') })
  const before = ready(app).state
  expect((await coordinator.handlePlatformPhase('background')).committed).toBe(false)
  now += 1800000
  expect((await coordinator.handlePlatformPhase('active')).committed).toBe(false)
  expect(storage.publications).toHaveLength(0)
  expect(cleaned).toBe(0)
  expect(ready(app).state).toEqual(before)
  storage.fault = 'replace'
  expect(accepted(await coordinator.dispatchPlayer(command(app, { kind: 'rework.choose-migration', choice: 'keep' })))).toBe(false)
  expect(cleaned).toBe(0)
  storage.fault = undefined
  expect(accepted(await coordinator.dispatchPlayer(command(app, { kind: 'rework.choose-migration', choice: 'keep' })))).toBe(true)
  expect(storage.publications).toHaveLength(1)
  expect(ready(app).state.gameState.timeline.storedTimeAvailableSeconds).toBe(7600.625)
  expect(cleaned).toBe(1)
  expect(ready(app).state.consumedDepartureAtUtc).toBe('2026-10-05T00:00:00.000Z')
  await coordinator.handlePlatformPhase('active')
  expect(storage.publications).toHaveLength(1)
  expect(ready(app).state.gameState.timeline.storedTimeAvailableSeconds).toBe(7600.625)
  await coordinator.shutdown(); app.disposeStoredTimeJobRunner()
})

test('manual import protects dirty receiving progress before staging a single incoming publication', async () => {
  const storage = new Memory(), text = source()
  storage.files.set(paths.current, serializeWebSave(firstRun().copyState()))
  const app = factory(repository(storage)); await app.start()
  expect(app.advanceActive(1000).accepted).toBe(true)
  const receiver = ready(app).state.gameState
  await app.importSave({ text, importedAtUtc: '2026-10-11T00:00:00Z', overwriteApproved: true })
  expect(ready(app).operation).toBe('rework-choice-pending')
  expect(storage.publications).toHaveLength(1)
  const protectedReceiver = storage.files.get(paths.current)!
  expect(PreparedSave.fromDecoded(deserializeWebSave(protectedReceiver)).copyState().offlineTime).toBe(receiver.timeline.storedTimeAvailableSeconds)
  expect((await app.checkpoint()).committed).toBe(false)
  storage.fault = 'replace'
  expect(accepted(await app.dispatchPlayer(command(app, { kind: 'rework.choose-migration', choice: 'fresh' })))).toBe(false)
  expect(storage.files.get(paths.current)).toBe(protectedReceiver)
  storage.fault = undefined
  expect(accepted(await app.dispatchPlayer(command(app, { kind: 'rework.choose-migration', choice: 'fresh' })))).toBe(true)
  expect(storage.publications).toHaveLength(2)
  expect(storage.files.get(paths.backups[0])).toBe(protectedReceiver)
  expect(storage.files.get(archivePath(text))).toBe(text)
  expect(ready(app).state.gameState.timeline.storedTimeAvailableSeconds).toBe(4000.625)
  app.disposeStoredTimeJobRunner()
})

test.each(['backup', 'legacy'] as const)('%s recovery also defers converted publication until choice', async kind => {
  const storage = new Memory(), text = source()
  if (kind === 'backup') { storage.files.set(paths.current, 'damaged'); storage.files.set(paths.backups[0], text) }
  else { storage.files.set('/old', text); storage.candidates = [{ id: 'legacy', sourcePath: '/old', text }] }
  const app = factory(repository(storage)); await app.start()
  expect(ready(app).operation).toBe('rework-choice-pending')
  expect(storage.publications).toHaveLength(0)
  expect(accepted(await app.dispatchPlayer(command(app, { kind: 'rework.choose-migration', choice: 'keep' })))).toBe(true)
  expect(storage.publications).toHaveLength(1)
  expect(storage.files.get(archivePath(text))).toBe(text)
  if (kind === 'backup') expect(storage.files.get(paths.backups[0])).toBe(text)
  app.disposeStoredTimeJobRunner()
})

test.each(['opening', 'damaged-paid-repair'] as const)('development 21/v1 and 22/v2 %s preserve paid work, clock and exact archives', async name => {
  const original = readFileSync(new URL(`../../test/fixtures/farming-v1-${name}.idleds.txt`, import.meta.url), 'utf8')
  const old = deserializeWebSave(original)
  const modern = PreparedSave.fromDecoded(old).copyValidatedState()
  modern.saveVersion = 22
  const development22 = serializeWebSave(modern)
  for (const text of [original, development22]) {
    const storage = new Memory(); storage.files.set(paths.current, text)
    const app = factory(repository(storage)); await app.start()
    expect(ready(app).operation).toBe('none')
    expect(storage.publications.map(t => deserializeWebSave(t).saveVersion)).toEqual([21])
    const after = deserializeWebSave(storage.files.get(paths.current)!)
    expect(after.civilization).toEqual({ ...old.civilization as object, farming: { ...(old.civilization as any).farming, version: 2 } })
    expect(after.offlineTime).toBe(old.offlineTime)
    expect(storage.files.get(archivePath(text))).toBe(text)
    const receipt = storage.files.get(archivePath(text) + '.json')!
    const reopened = factory(repository(storage)); await reopened.start()
    expect(storage.publications).toHaveLength(1)
    expect(storage.files.get(archivePath(text) + '.json')).toBe(receipt)
    app.disposeStoredTimeJobRunner(); reopened.disposeStoredTimeJobRunner()
  }
})

test('runtime routing keeps pending choices off active/autosave clocks and preserves departure receipts through close', async () => {
  const storage = Object.assign(new Memory(), { async retainLegacyCandidate(text: string) { const sourcePath = '/supplied'; storage.files.set(sourcePath, text); return { id: 'supplied', sourcePath, text } } })
  const text = source('late-quantum', '2026-10-05T00:00:00.000Z')
  storage.files.set(paths.current, text)
  let listener: (phase: 'active' | 'background') => void = () => {}
  let phase: 'active' | 'background' = 'active'
  let now = Date.parse('2026-10-05T01:00:00.000Z'), frames = 0, markerWrites = 0
  const timers = new Set<() => void>()
  const open = () => createBrowserRuntimeFoundation({ createApplication: factory,
    writerAuthority: new SingleHostSessionWriterAuthority({ sessionId: 'migration-runtime' }),
    saveStorage: storage, saveRepositoryPaths: paths, allowedExternalOrigins: [], allowCanonicalPlayerWrites: true,
    lifecycle: { currentPhase: () => phase, subscribe: cb => { listener = cb; return () => {} } },
    lifecycleClock: { sample: () => ({ utcMilliseconds: now, serializedUtcText: new Date(now).toISOString() }) },
    lifecyclePolicy: WEB_LIFECYCLE_POLICY,
    departureMarker: { read: () => null, record: () => { markerWrites++ }, clear: () => {}, clearIfMatches: () => {} },
    activeTimeClock: { nowMilliseconds: () => 0 }, activeTimeScheduler: { requestFrame: () => { frames++; return 0 }, cancelFrame: () => {} },
    frontendSnapshotScheduler: { requestFrame: cb => { queueMicrotask(cb); return 0 }, cancelFrame: () => {} },
    checkpointScheduler: { setInterval: cb => { timers.add(cb); return cb }, clearInterval: cb => { timers.delete(cb) } },
    storageManager: { persisted: async () => true, persist: async () => true }, developmentControlsAvailable: false,
  })
  const first = open(); await first.start()
  expect(frames).toBe(0); expect(timers.size).toBe(0)
  expect(await first.requestCheckpoint()).toBe(false)
  phase = 'background'; listener(phase)
  await first.requestCheckpoint()
  expect(markerWrites).toBe(0); expect(storage.publications).toHaveLength(0)
  await first.shutdown()
  expect(storage.files.get(paths.current)).toBe(text)
  expect(markerWrites).toBe(0)
  phase = 'active'; now += 1800000
  const second = open(); await second.start()
  expect((await second.dispatchPlayer({ kind: 'rework.choose-migration', choice: 'keep' })).status).toBe('accepted')
  expect(storage.publications).toHaveLength(1)
  expect(deserializeWebSave(storage.files.get(paths.current)!).offlineTime).toBe(9400.625)
  expect(frames).toBeGreaterThan(0); expect(timers.size).toBe(1)
  // The runtime must describe accepted input as pending until its choice commits.
  const publications = storage.publications.length
  const imported = await second.importSave({ text: source(), importedAtUtc: '2026-10-05T01:30:00.000Z', overwriteApproved: true })
  expect(imported).toMatchObject({ imported: true, migrationPending: true })
  expect(storage.publications).toHaveLength(publications)
  expect(timers.size).toBe(0)
  expect(await second.requestCheckpoint()).toBe(false)
  expect((await second.dispatchPlayer({ kind: 'rework.choose-migration', choice: 'fresh' })).status).toBe('accepted')
  expect(storage.publications).toHaveLength(publications + 1)
  expect(deserializeWebSave(storage.files.get(paths.current)!).offlineTime).toBe(4000.625)
  await second.shutdown()
})

test('a paid one-point augment refund joins the final Fresh commit once, including failed publication and reload', async () => {
  const storage = new Memory(), text = source('late-quantum', undefined, true)
  storage.files.set(paths.current, text)
  const app = factory(repository(storage)); await app.start()
  expect(ready(app).state.gameState.skills.points).toBe(10n)
  expect(ready(app).state.gameState.skills.byId['subskill.cashScience.lifetime'].owned).toBe(true)
  storage.fault = 'replace'
  expect(accepted(await app.dispatchPlayer(command(app, { kind: 'rework.choose-migration', choice: 'fresh' })))).toBe(false)
  expect(ready(app).state.gameState.skills.points).toBe(10n)
  storage.fault = undefined
  expect(accepted(await app.dispatchPlayer(command(app, { kind: 'rework.choose-migration', choice: 'fresh' })))).toBe(true)
  expect(ready(app).state.gameState.skills.points).toBe(11n)
  const reopened = factory(repository(storage)); await reopened.start()
  expect(ready(reopened).state.gameState.skills.points).toBe(11n)
  expect(accepted(await reopened.dispatchPlayer(command(reopened, { kind: 'rework.choose-migration', choice: 'fresh' })))).toBe(false)
  expect(storage.publications).toHaveLength(1)
  expect(ready(reopened).state.gameState.skills.points).toBe(11n)
  app.disposeStoredTimeJobRunner(); reopened.disposeStoredTimeJobRunner()
})

test.each(['Civilization', 'Farming'] as const)('a newer %s carrier blocks recovery instead of selecting an older backup', async subsystem => {
  const storage = new Memory()
  const original = readFileSync(new URL('../../test/fixtures/farming-v1-opening.idleds.txt', import.meta.url), 'utf8')
  const graph = PreparedSave.fromDecoded(deserializeWebSave(original)).copyValidatedState()
  const civilization = graph.civilization as any
  if (subsystem === 'Civilization') civilization.version = 6
  else civilization.farming.version = 3
  const text = serializeWebSave(graph)
  storage.files.set(paths.current, text)
  storage.files.set(paths.backups[0], serializeWebSave(firstRun().copyState()))
  const app = factory(repository(storage)); await app.start()
  expect(app.snapshot()).toMatchObject({ phase: 'blocked', outcome: 'unsupported-future-version' })
  expect(storage.publications).toHaveLength(0)
  expect(storage.files.get(paths.current)).toBe(text)
  app.disposeStoredTimeJobRunner()
})

test.each(['public-envelope', 'prefix-mismatch', 'schema-mismatch', 'unknown-envelope', 'invalid-codec'] as const)('a development 22 %s failure authoritatively protects current and newest-backup paid progress', async failure => {
  const original = readFileSync(new URL('../../test/fixtures/farming-v1-damaged-paid-repair.idleds.txt', import.meta.url), 'utf8')
  const graph = PreparedSave.fromDecoded(deserializeWebSave(original)).copyValidatedState()
  graph.saveVersion = 22
  const text = failure === 'public-envelope' ? transport(graph, 'IDSWEB1', 22)
    : failure === 'prefix-mismatch' ? transport(graph, 'IDLEDS', 22, 'IDSWEB1')
    : failure === 'schema-mismatch' ? transport(graph, 'IDLEDS', 21)
    : failure === 'unknown-envelope' ? transport(graph, 'UNKNOWN', 22, 'IDLEDS')
    : transport({ ...graph, offlineTime: { $bigint: 'invalid' } }, 'IDLEDS', 22)
  for (const slot of [paths.current, paths.backups[0]]) {
    const storage = new Memory()
    storage.files.set(paths.current, slot === paths.current ? text : 'damaged')
    storage.files.set(paths.backups[0], slot === paths.current ? serializeWebSave(firstRun().copyState()) : text)
    storage.files.set(paths.backups[1], serializeWebSave(firstRun().copyState()))
    const before = new Map(storage.files)
    const app = factory(repository(storage)); await app.start()
    expect(app.snapshot()).toMatchObject({ phase: 'blocked', outcome: 'unsupported-future-version' })
    expect(storage.publications).toHaveLength(0)
    for (const path of [paths.current, ...paths.backups]) expect(storage.files.get(path)).toBe(before.get(path))
    app.disposeStoredTimeJobRunner()
  }
})

test.each([false, true])('a pending import preserves canonical-player permission (allowed=%s) through its final choice', async allowed => {
  const storage = new Memory(), receiver = serializeWebSave(firstRun().copyState()), text = source()
  storage.files.set(paths.current, receiver)
  const app = factory(repository(storage, allowed)); await app.start()
  expect((await app.importSave({ text, importedAtUtc: '2026-10-11T00:00:00Z', overwriteApproved: true, target: 'canonical-player' })).imported).toBe(true)
  expect(ready(app).operation).toBe('rework-choice-pending')
  expect(storage.publications).toHaveLength(0)
  const choice = await app.dispatchPlayer(command(app, { kind: 'rework.choose-migration', choice: 'keep' }))
  expect(accepted(choice)).toBe(allowed)
  expect(storage.publications).toHaveLength(allowed ? 1 : 0)
  if (allowed) {
    expect(storage.files.get(archivePath(text))).toBe(text)
    expect(ready(app).state.gameState.timeline.storedTimeAvailableSeconds).toBe(4000.625)
  } else {
    expect(choice).toMatchObject({ kind: 'transition', transition: { reason: 'Canonical player-save writes are disabled until mapping coverage is complete.' } })
    expect(storage.files.get(paths.current)).toBe(receiver)
    expect(ready(app).operation).toBe('rework-choice-pending')
    expect(accepted(await app.dispatchPlayer(command(app, { kind: 'rework.choose-migration', choice: 'keep' })))).toBe(false)
    expect(storage.publications).toHaveLength(0)
  }
  app.disposeStoredTimeJobRunner()
})

function automaticRecovery(storage: Memory) {
  const graph = deserializeWebSave(source())
  Object.assign(graph, { doubleIp: true, numberFormatting: 1, hidePurchased: true })
  delete graph.hasPackedSettingsFlags; delete graph.packedSettingsFlags
  const text = transport(graph), id = 'automatic-paid'
  const candidate: LegacySaveCandidate = { id, sourcePath: `unity-readonly:${id}`, text, provenance: { kind: 'automatic-same-device-unity', platform: 'windows', sourceClass: 'unity-persistent-data-save', opaqueSourceIdentifier: id, pathClass: 'unity-local-low' } }
  storage.files.set(candidate.sourcePath, text); storage.candidates = [candidate]
  let promotions = 0, notation = 0, visibility = 0, failPromotion = false
  const repository = new PortableSaveRepository(storage, paths, decodeIdb1SaveRoot, { allowCanonicalPlayerWrites: false },
    { promoteAutomaticUnityPurchaseEvidence: async () => { promotions++; if (failPromotion) throw Error('interrupted promotion') } },
    { adoptLegacyUnityNumberFormatting: () => { notation++; throw Error('optional presentation failure') } },
    { adoptLegacyUnityHidePurchased: () => { visibility++; return true } })
  return { repository, text, counts: () => ({ promotions, notation, visibility }), setFailPromotion: (failed: boolean) => { failPromotion = failed } }
}

test('failed recovery session opening cancels its purchase/preferences transaction before unrelated modern import', async () => {
  const storage = new Memory(), recovery = automaticRecovery(storage)
  let reads = 0
  const create = createProductionCanonicalApplicationFactory({ createFirstRunSave: firstRun, readHostEntitlements: () => {
    if (++reads === 2) throw Error('controlled host failure while opening recovery session')
    return { permanentDoubleIp: false }
  } })
  const app = create(recovery.repository); await app.start()
  expect(app.snapshot()).toMatchObject({ phase: 'blocked', outcome: 'storage-failed' })
  expect(storage.publications).toHaveLength(0)
  const fresh = serializeWebSave(firstRun().copyState())
  expect((await app.importSave({ text: fresh, importedAtUtc: '2026-10-11T00:00:00Z', overwriteApproved: true })).imported).toBe(true)
  expect(storage.publications).toHaveLength(1)
  expect(recovery.counts()).toEqual({ promotions: 0, notation: 0, visibility: 0 })
  expect(ready(app).state.entitlements.permanentDoubleIp).toBe(false)
  expect(storage.files.get(archivePath(recovery.text))).toBe(recovery.text)
  await app.checkpoint()
  expect(recovery.counts()).toEqual({ promotions: 0, notation: 0, visibility: 0 })
  app.disposeStoredTimeJobRunner()
})

test('owned recovery callbacks remain retryable through promotion/replace failure and finalize only once', async () => {
  const storage = new Memory(), recovery = automaticRecovery(storage)
  const app = factory(recovery.repository); await app.start()
  expect(ready(app).operation).toBe('rework-choice-pending')
  recovery.setFailPromotion(true)
  expect(accepted(await app.dispatchPlayer(command(app, { kind: 'rework.choose-migration', choice: 'keep' })))).toBe(false)
  expect(recovery.counts()).toEqual({ promotions: 1, notation: 0, visibility: 0 })
  expect(storage.publications).toHaveLength(0)
  recovery.setFailPromotion(false); storage.fault = 'replace'
  expect(accepted(await app.dispatchPlayer(command(app, { kind: 'rework.choose-migration', choice: 'keep' })))).toBe(false)
  expect(recovery.counts()).toEqual({ promotions: 2, notation: 0, visibility: 0 })
  expect(storage.publications).toHaveLength(0)
  storage.fault = undefined
  expect(accepted(await app.dispatchPlayer(command(app, { kind: 'rework.choose-migration', choice: 'keep' })))).toBe(true)
  expect(recovery.counts()).toEqual({ promotions: 3, notation: 1, visibility: 1 })
  expect(storage.publications).toHaveLength(1)
  expect(ready(app).state.gameState.timeline.storedTimeAvailableSeconds).toBe(4000.625)
  await app.checkpoint()
  expect(recovery.counts()).toEqual({ promotions: 3, notation: 1, visibility: 1 })
  app.disposeStoredTimeJobRunner()
})
