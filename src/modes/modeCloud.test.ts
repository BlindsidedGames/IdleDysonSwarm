import { expect, test } from 'vitest'
import { ModeCloudCoordinator, createModeCloudAdapters, MODE_CLOUD_NAMESPACES, modeCloudText } from './modeCloud'
import { ModeSaveStore } from './modeSaveStore'
import { ModeMemoryStorage, MockModeCloud, modeStringCodecs } from '../../test/support/modeFoundation'
import { createClassicModeCodec } from './classicModeCodec'
import { serializeWebSave as serializeClassic } from '../../classic/src/save/serialization'
import { deserializeWebSave, serializeWebSave } from '../save/serialization'
import { createModernModeCodec } from './modernModeCodec'
import { createModeHost } from './modeHost'

async function fixture() {
  const storage = new ModeMemoryStorage(), store = new ModeSaveStore(storage, modeStringCodecs, () => undefined)
  await store.initialize({ discovery: 'complete', saves: { classic: 'classic:local', modern: 'modern:local' } })
  const clouds = { classic: new MockModeCloud(), modern: new MockModeCloud() }
  const cloud = new ModeCloudCoordinator(store, clouds, modeStringCodecs, (_mode, text) => text, (_mode, _local, remote) => remote)
  return { store, storage, clouds, cloud }
}
test('backup-only Cloud progress on first discovery opens Classic and preserves the original backup', async () => {
  const storage = new ModeMemoryStorage(), store = new ModeSaveStore(storage, modeStringCodecs, () => undefined)
  const clouds = { classic: new MockModeCloud(), modern: new MockModeCloud() }
  clouds.classic.backups = ['classic:remote-backup']
  const cloud = new ModeCloudCoordinator(store, clouds, modeStringCodecs, (_mode, text) => text, (_mode, _local, remote) => remote)
  const factory = async (context: import('./modeController').ModeSessionContext) => ({ quiesce: async () => context.initialSave, close: async () => undefined })
  const host = createModeHost({ store, cloud, factories: { classic: factory, modern: factory }, convertClassic: text => text,
    discovery: { codecs: modeStringCodecs, publicClassic: { id: 'public', mode: 'classic', read: async () => [] }, legacyUnity: { id: 'unity', mode: 'classic', read: async () => [] }, modernBeta: { id: 'beta', mode: 'modern', read: async () => [] } },
  })
  await host.start()
  expect(host.controller.getSnapshot().manifest?.active).toBe('classic')
  expect(await store.read('classic')).toBe('classic:remote-backup')
  expect(await store.read('modern')).toBeNull()
  expect([...storage.files].some(([path, text]) => path.includes('/upgrade-originals/') && text === 'classic:remote-backup')).toBe(true)
  await host.controller.close()
})
test('separate namespace adapters publish each durable mode only; stale callbacks and new downloads suppress publication', async () => {
  const namespaces: string[] = []
  const adapters = createModeCloudAdapters(namespace => { namespaces.push(namespace); return new MockModeCloud() })
  expect(namespaces).toEqual([MODE_CLOUD_NAMESPACES.classic, MODE_CLOUD_NAMESPACES.modern])
  expect(adapters.classic).not.toBe(adapters.modern)
  const f = await fixture(); await f.cloud.resolve('classic'); await f.cloud.resolve('modern')
  await f.cloud.publish('classic', 'classic:local', () => true)
  await f.cloud.publish('modern', 'modern:local', () => true)
  expect(f.clouds.classic.uploads).toEqual(['classic:local']); expect(f.clouds.modern.uploads).toEqual(['modern:local'])
  await f.cloud.publish('classic', 'classic:stale', () => false)
  f.clouds.classic.pending = 'classic:other-device'
  await f.store.checkpoint('classic', 'classic:changed')
  await f.cloud.publish('classic', 'classic:changed', () => true)
  expect(f.clouds.classic.uploads).toEqual(['classic:local'])
})
test.each(['local', 'cloud'] as const)('failed %s acknowledgement preserves the durable choice and never reimports over later progress', async choice => {
  const f = await fixture(); f.clouds.classic.pending = 'classic:remote'; f.clouds.classic.choice = choice; f.clouds.classic.acknowledgementFails = true
  await f.cloud.resolve('classic')
  expect(await f.store.read('classic')).toBe(choice === 'local' ? 'classic:local' : 'classic:remote')
  await f.store.checkpoint('classic', 'classic:later')
  const reopened = new ModeCloudCoordinator(f.store, f.clouds, modeStringCodecs, (_mode, text) => text, (_mode, _local, remote) => remote)
  f.clouds.classic.acknowledgementFails = false
  await reopened.resolve('classic')
  expect(await f.store.read('classic')).toBe('classic:later')
  expect(f.clouds.classic.choices).toBe(1)
  expect(f.clouds.classic.acknowledged).toEqual(['classic:remote'])
  expect(await f.store.read('modern')).toBe('modern:local')
})
test('a Cloud read failure after durable selection keeps local play and retries completion without replacing later progress', async () => {
  const f = await fixture(); f.clouds.classic.pending = 'classic:remote'
  f.storage.beforeReplace = () => { f.clouds.classic.readFails = true }
  await f.cloud.resolve('classic')
  expect(await f.store.read('classic')).toBe('classic:remote')
  expect(f.clouds.classic.acknowledged).toEqual([])
  await f.cloud.publish('classic', 'classic:remote', () => true)
  expect(f.clouds.classic.uploads).toEqual([])
  f.storage.beforeReplace = undefined
  await f.store.checkpoint('classic', 'classic:later')
  f.clouds.classic.readFails = false
  await f.cloud.resolve('classic')
  expect(await f.store.read('classic')).toBe('classic:later')
  expect(f.clouds.classic.choices).toBe(1)
  expect(f.clouds.classic.acknowledged).toEqual(['classic:remote'])
})
test('a remote race, wrong-mode payload, future schema and changed backup cannot acknowledge or replace local saves', async () => {
  const f = await fixture(); f.clouds.classic.pending = 'classic:remote'
  f.clouds.classic.onChoose = () => { f.clouds.classic.pending = 'classic:newer' }
  await expect(f.cloud.resolve('classic')).rejects.toThrow('changed')
  expect(await f.store.read('classic')).toBe('classic:local'); expect(f.clouds.classic.acknowledged).toEqual([])
  f.clouds.classic.onChoose = undefined
  for (const text of ['modern:wrong-slot', 'future']) {
    f.clouds.classic.pending = text
    await expect(f.cloud.resolve('classic')).rejects.toThrow()
  }
  f.clouds.classic.pending = 'corrupt'; f.clouds.classic.backups = ['classic:backup']; f.clouds.classic.acknowledgementFails = true
  await f.cloud.resolve('classic')
  f.clouds.classic.backups = ['classic:new-backup']; f.clouds.classic.acknowledgementFails = false
  await f.cloud.resolve('classic')
  await f.cloud.publish('classic', 'classic:backup', () => true)
  expect(f.clouds.classic.uploads).toEqual([])
  expect(await f.store.read('classic')).toBe('classic:backup')
})
test('actual mode Cloud serialization strips ownership claims and preserves each mode schema', async () => {
  const date = () => '2026-10-15T00:00:00Z'
  const codecs = { classic: createClassicModeCodec(date), modern: createModernModeCodec(date) }
  for (const mode of ['classic', 'modern'] as const) {
    const state = deserializeWebSave(await codecs[mode].createFresh())
    state.doubleIp = true; state.numberFormatting = 2; state.idsResolvedCloudDownloadSha256 = 'a'.repeat(64)
    const cloud = modeCloudText(mode, mode === 'classic' ? serializeClassic(state) : serializeWebSave(state))
    const decoded = deserializeWebSave(cloud)
    expect(decoded.doubleIp).toBe(false)
    expect(decoded.numberFormatting).toBeUndefined()
    expect(decoded.idsResolvedCloudDownloadSha256).toBeUndefined()
    await codecs[mode].validate(cloud)
    if (mode === 'modern') expect(() => codecs.classic.validate(cloud)).toThrow()
  }
})


test('an offline existing installation keeps local play and a local conflict choice is republished despite an old dedup hash', async () => {
  const f = await fixture()
  f.clouds.classic.readFails = true
  await f.cloud.resolve('classic')
  await f.cloud.publish('classic', 'classic:local', () => true)
  expect(f.clouds.classic.uploads).toEqual([])
  f.clouds.classic.readFails = false; await f.cloud.resolve('classic')
  await f.cloud.publish('classic', 'classic:local', () => true)
  f.clouds.classic.pending = 'classic:remote'; f.clouds.classic.choice = 'local'
  await f.cloud.resolve('classic')
  await f.cloud.publish('classic', 'classic:local', () => true)
  expect(f.clouds.classic.uploads).toEqual(['classic:local', 'classic:local'])
})

test.each(['classic', 'modern'] as const)('Cloud replacement preserves the locally earned debug purchase in %s only', async mode => {
  const date = () => '2026-10-15T00:00:00Z'
  const codecs = { classic: createClassicModeCodec(date), modern: createModernModeCodec(date) }
  const fresh = await codecs[mode].createFresh(), state = deserializeWebSave(fresh)
  state.debugEverEnabled = true
  const serialize = mode === 'classic' ? serializeClassic : serializeWebSave
  const store = new ModeSaveStore(new ModeMemoryStorage(), codecs, () => undefined)
  await store.initialize({ discovery: 'complete', saves: { [mode]: serialize(state) } })
  const clouds = { classic: new MockModeCloud(), modern: new MockModeCloud() }; clouds[mode].pending = fresh
  const coordinator = new ModeCloudCoordinator(store, clouds, codecs)
  await coordinator.resolve(mode)
  expect(deserializeWebSave((await store.read(mode))!).debugEverEnabled).toBe(true)
})
