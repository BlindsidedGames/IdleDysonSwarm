import { describe, expect, test } from 'vitest'
import { CanonicalModeFiles } from './canonicalModeFiles'
import { NATIVE_WEB_SAVE_PATHS } from '../platform/platformSaveStorage'
import { readFileSync } from 'node:fs'
import { createClassicModeCodec } from './classicModeCodec'
import { createModernModeCodec } from './modernModeCodec'
import { convertClassicForModern } from './classicToModernMigration'
import { deserializeWebSave } from '../save/serialization'
import { serializeWebSave as serializeClassic } from '../../classic/src/save/serialization'
import type { SaveStorageAdapter } from '../save/repository'
import { ModeSaveStore, ModeSaveConflictError, type ModeCodecs } from './modeSaveStore'

class MemoryStorage implements SaveStorageAdapter {
  readonly files = new Map<string, string>()
  mutations = 0
  failAt = Infinity
  async exists(path: string) { return this.files.has(path) }
  async readText(path: string) {
    const text = this.files.get(path)
    if (text === undefined) throw new Error('missing')
    return text
  }
  async writeText(path: string, text: string) {
    if (++this.mutations === this.failAt) throw new Error('interrupted write')
    this.files.set(path, text)
  }
  async replaceAtomically(from: string, to: string) {
    if (++this.mutations === this.failAt) throw new Error('interrupted replace')
    this.files.set(to, await this.readText(from)); this.files.delete(from)
  }
  async copy(from: string, to: string) { await this.writeText(to, await this.readText(from)) }
  async discoverLegacyCandidates() { return [] }
}
const codecs: ModeCodecs = Object.fromEntries(['classic', 'modern'].map(mode => [mode, {
  validate: (text: string) => { if (!text.startsWith(mode + ':')) throw new Error('wrong mode') },
  createFresh: () => `${mode}:fresh`,
}])) as unknown as ModeCodecs
const create = (storage = new MemoryStorage()) => new ModeSaveStore(storage, codecs, () => undefined)

test('real Classic migration and import retain the source and protect existing Modern progress', async () => {
  const date = () => '2026-10-16T00:00:00Z'
  const realCodecs = { classic: createClassicModeCodec(date), modern: createModernModeCodec(date) }
  const raw = readFileSync(new URL('../../qa/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')
  const source = deserializeWebSave(await realCodecs.classic.prepareImport!(raw, null))
  const dyson = source.dysonVerseSaveData as { dysonVersePrestigeData: { infinityPoints: bigint } }
  dyson.dysonVersePrestigeData.infinityPoints = 9_223_372_036_854_775_807n
  const classic = serializeClassic(source)
  const storage = new MemoryStorage()
  const open = () => new ModeSaveStore(storage, realCodecs, () => undefined)
  const store = open()
  await store.initialize({ discovery: 'complete', saves: { classic } })
  await store.migrateClassic(convertClassicForModern)
  const modern = (await open().read('modern'))!
  expect(await open().read('classic')).toBe(classic)
  // Format conversion precedes the runtime's gameplay migration transaction.
  expect(deserializeWebSave(modern).saveVersion).toBe(21)
  expect(deserializeWebSave(modern)).toMatchObject({
    dysonVerseSaveData: { dysonVersePrestigeData: { infinityPoints: 9_223_372_036_854_775_807n } },
  })
  // Legacy Double Time is consolidated into Stored Time by this fixture's
  // format migration; source protection must compare retained Classic bytes.
  await store.select('classic')
  await expect(open().migrateClassic(convertClassicForModern)).rejects.toBeInstanceOf(ModeSaveConflictError)
  expect(await open().read('modern')).toBe(modern)

  // Actual standalone IDB1 import routes through Classic's decoder and the
  // production converter before publishing only the reviewed receiving slot.
  const bundle = await store.prepareImportBundle(raw, 'modern', convertClassicForModern)
  const preview = await store.previewBundle(bundle)
  await store.importBundle(bundle, preview.generation!)
  expect(await open().read('classic')).toBe(classic)
  expect(deserializeWebSave((await open().read('modern'))!).saveVersion).toBe(21)
  await expect(store.prepareImportBundle(modern, 'classic', convertClassicForModern)).rejects.toThrow('Modern progress')

  const exported = await open().exportBundle()
  const restored = new ModeSaveStore(new MemoryStorage(), realCodecs, () => undefined)
  await restored.importBundle(exported)
  expect(await restored.read('classic')).toBe(classic)
  expect(await restored.read('modern')).toBe(await open().read('modern'))
})

describe('durable dual-mode save ownership', () => {

  test('repeated switches, checkpoints, restart, export and restore preserve both exact byte streams', async () => {
    const storage = new MemoryStorage(), store = create(storage)
    await store.initialize({ discovery: 'complete', saves: { classic: 'classic:legacy\r\n' } })
    for (let i = 0; i < 4; i++) {
      await store.select('modern'); await store.checkpoint('modern', `modern:progress-${i}`)
      await expect(store.checkpoint('classic', 'classic:late')).rejects.toThrow('Inactive')
      await store.select('classic'); await store.checkpoint('classic', `classic:progress-${i}`)
    }
    const restored = create()
    await restored.importBundle(await create(storage).exportBundle())
    expect(await restored.read('classic')).toBe('classic:progress-3')
    expect(await restored.read('modern')).toBe('modern:progress-3')
    expect((await restored.inspect())?.active).toBe('classic')
  })

  test.each([1, 2, 3, 4])('interruption at migration mutation %i preserves a restartable source and retries without duplicate conversion', async offset => {
    const storage = new MemoryStorage(), store = create(storage)
    await store.initialize({ discovery: 'complete', saves: { classic: 'classic:source' } })
    storage.failAt = storage.mutations + offset
    await expect(store.migrateClassic(() => 'modern:converted')).rejects.toThrow('interrupted')
    storage.failAt = Infinity
    const reopened = create(storage)
    expect(await reopened.read('classic')).toBe('classic:source')
    const manifest = await reopened.inspect()
    expect(manifest?.active).toBe('classic')
    expect(manifest?.saves.modern).toBeUndefined()
    await reopened.migrateClassic(() => 'modern:converted')
    expect(await reopened.read('modern')).toBe('modern:converted')
  })

  test('imports validate the complete pair, bind replacement approval to a generation and retain previous bytes', async () => {
    const storage = new MemoryStorage(), store = create(storage), source = create()
    await store.initialize({ discovery: 'complete', saves: { classic: 'classic:old', modern: 'modern:old' } })
    await source.initialize({ discovery: 'complete', saves: { classic: 'classic:incoming', modern: 'modern:incoming' } })
    const exported = await source.exportBundle(), generation = (await store.inspect())!.generation
    await expect(store.importBundle(exported)).rejects.toBeInstanceOf(ModeSaveConflictError)
    const damaged = JSON.parse(exported); damaged.saves.modern.text = 'modern:tampered'
    await expect(store.importBundle(JSON.stringify(damaged), generation)).rejects.toThrow('integrity')
    expect(await store.read('classic')).toBe('classic:old')
    expect(await store.read('modern')).toBe('modern:old')
    await store.checkpoint('classic', 'classic:later')
    await expect(store.importBundle(exported, generation)).rejects.toThrow('changed')
    expect(await store.read('classic')).toBe('classic:later')
    expect(await store.read('modern')).toBe('modern:old')
    await store.importBundle(exported, (await store.inspect())!.generation)
    expect(await store.read('classic')).toBe('classic:incoming')
    expect(await store.read('modern')).toBe('modern:incoming')
    expect([...storage.files.values()]).toContain('classic:old')
    expect([...storage.files.values()]).toContain('modern:old')
    await expect(store.importBundle(exported.replace('"classic":', '"unknown":'))).rejects.toThrow('Unknown')
  })

  test('a lost publication acknowledgement reopens the complete pair and cannot apply migration twice', async () => {
    const storage = new MemoryStorage(), store = create(storage)
    await store.initialize({ discovery: 'complete', saves: { classic: 'classic:source' } })
    const replace = storage.replaceAtomically.bind(storage)
    storage.replaceAtomically = async (a, b) => { await replace(a, b); throw Error('lost acknowledgement') }
    await expect(store.migrateClassic(() => 'modern:converted')).rejects.toThrow('lost acknowledgement')
    storage.replaceAtomically = replace
    expect((await create(storage).inspect())?.active).toBe('modern')
    expect(await store.read('classic')).toBe('classic:source')
    await expect(store.migrateClassic(() => 'modern:twice')).rejects.toThrow('Open Classic')
  })
})

test('a missing primary selection record with a preserved backup cannot reset an existing player', async () => {
  const storage = new MemoryStorage(), store = create(storage)
  await store.initialize({ discovery: 'complete', saves: { classic: 'classic:original' } })
  await store.select('modern')
  storage.files.delete('modes-v1/manifest.json')
  await expect(create(storage).initialize({ discovery: 'complete', saves: {} })).rejects.toThrow('selection record is missing')
  expect([...storage.files.values()]).toContain('classic:original')
})


test('released Classic files and separate Modern files survive interrupted publication and old-release writes', async () => {
  const metadata = new MemoryStorage(), classic = new MemoryStorage(), modern = new MemoryStorage()
  const files = { classic: { storage: classic, paths: NATIVE_WEB_SAVE_PATHS }, modern: { storage: modern, paths: NATIVE_WEB_SAVE_PATHS } }
  const open = () => {
    const canonical = new CanonicalModeFiles(metadata, files, codecs)
    return { canonical, store: new ModeSaveStore(metadata, codecs, () => undefined, 'modes-v1', canonical.publish) }
  }
  let { store, canonical } = open()
  await store.initialize({ discovery: 'complete', saves: { classic: 'classic:released' } })
  expect(await classic.readText(NATIVE_WEB_SAVE_PATHS.current)).toBe('classic:released')
  await store.migrateClassic(() => 'modern:migrated')
  expect(await modern.readText(NATIVE_WEB_SAVE_PATHS.current)).toBe('modern:migrated')
  const replace = modern.replaceAtomically.bind(modern)
  modern.replaceAtomically = async (a, b) => { if (b === NATIVE_WEB_SAVE_PATHS.current) throw Error('interrupted canonical publication'); await replace(a, b) }
  await expect(store.checkpoint('modern', 'modern:earned')).rejects.toThrow('interrupted canonical')
  expect(await classic.readText(NATIVE_WEB_SAVE_PATHS.current)).toBe('classic:released')
  modern.replaceAtomically = replace
  ;({ store, canonical } = open())
  await canonical.reconcile(store)
  expect(await store.read('modern')).toBe('modern:earned')
  expect(await modern.readText(NATIVE_WEB_SAVE_PATHS.current)).toBe('modern:earned')
  // Running the released Classic build after this build must remain visible on
  // the next launch without converting it into, or overwriting, Modern progress.
  await classic.writeText(NATIVE_WEB_SAVE_PATHS.current, 'classic:old-release-earned')
  ;({ store, canonical } = open())
  metadata.failAt = metadata.mutations + 1
  await expect(canonical.reconcile(store)).rejects.toThrow('interrupted')
  metadata.failAt = Infinity
  ;({ store, canonical } = open())
  await canonical.reconcile(store)
  expect(await store.read('classic')).toBe('classic:old-release-earned')
  expect(await store.read('modern')).toBe('modern:earned')
  expect([...metadata.files.values()]).toContain('classic:released')
})
