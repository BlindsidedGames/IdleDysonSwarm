import { describe, expect, test } from 'vitest'
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

describe('durable dual-mode save ownership', () => {
  test.each([
    [{}, 'modern'], [{ classic: 'classic:legacy' }, 'classic'],
    [{ modern: 'modern:beta' }, 'modern'], [{ classic: 'classic:legacy', modern: 'modern:beta' }, 'classic'],
  ] as const)('startup preserves discovered progress and defaults only new players: %j', async (existing, active) => {
    const storage = new MemoryStorage(), store = create(storage)
    expect((await store.initialize({ discovery: 'complete', saves: existing })).active).toBe(active)
    await store.select(active === 'classic' ? 'modern' : 'classic')
    expect((await create(storage).initialize({ discovery: 'complete', saves: {} })).active).not.toBe(active)
    for (const mode of ['classic', 'modern'] as const) {
      if (existing[mode as keyof typeof existing]) expect(await store.read(mode)).toBe(existing[mode as keyof typeof existing])
    }
  })

  test('first launch requires complete discovery; a restart uses its existing manifest', async () => {
    const store = create()
    await expect(store.initialize()).rejects.toThrow('Complete save discovery')
    await store.initialize({ discovery: 'complete', saves: {} })
    expect((await store.initialize())?.active).toBe('modern')
  })

  test('unknown or damaged progress blocks startup and selection, never silently starts over', async () => {
    const storage = new MemoryStorage(), store = create(storage)
    await expect(store.initialize({ discovery: 'complete', saves: { classic: 'modern:wrong-slot' } })).rejects.toThrow('wrong mode')
    expect(await store.inspect()).toBeNull()
    await store.initialize({ discovery: 'complete', saves: { classic: 'classic:original' } })
    const manifest = await store.inspect()
    storage.files.set(`modes-v1/saves/classic/checkpoint-${manifest!.saves.classic!.slot}.idsw`, 'classic:damaged')
    await expect(create(storage).initialize({ discovery: 'complete', saves: {} })).rejects.toThrow('integrity')
    await expect(store.select('modern')).rejects.toThrow('integrity')
  })

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

  test('one-way migration preserves source and refuses every existing destination, including after restart', async () => {
    const storage = new MemoryStorage(), store = create(storage)
    await store.initialize({ discovery: 'complete', saves: { classic: 'classic:source' } })
    await store.migrateClassic(text => 'modern:converted-' + text)
    expect(await store.read('classic')).toBe('classic:source')
    await expect(store.migrateClassic(() => 'modern:again')).rejects.toThrow('Open Classic')
    await store.select('classic')
    await expect(create(storage).migrateClassic(() => 'modern:again')).rejects.toBeInstanceOf(ModeSaveConflictError)
    expect(await store.read('modern')).toBe('modern:converted-classic:source')
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
    await store.checkpoint('classic', 'classic:later')
    await expect(store.importBundle(exported, generation)).rejects.toThrow('changed')
    await store.importBundle(exported, (await store.inspect())!.generation)
    expect(await store.read('classic')).toBe('classic:incoming')
    expect(await store.read('modern')).toBe('modern:incoming')
    expect([...storage.files.values()]).toContain('classic:old')
    expect([...storage.files.values()]).toContain('modern:old')
    await expect(store.importBundle(exported.replace('"classic":', '"unknown":'))).rejects.toThrow('Unknown')
  })

  test('bounded checkpoint rotation preserves the pinned migration source and the previous manifest', async () => {
    const storage = new MemoryStorage(), store = create(storage)
    await store.initialize({ discovery: 'complete', saves: { classic: 'classic:source' } })
    await store.migrateClassic(() => 'modern:migrated')
    for (let i = 0; i < 30; i++) {
      await store.select('classic'); await store.checkpoint('classic', 'classic:' + i)
      await store.select('modern'); await store.checkpoint('modern', 'modern:' + i)
    }
    expect([...storage.files.keys()].filter(path => path.includes('/saves/')).length).toBeLessThanOrEqual(8)
    expect([...storage.files.values()]).toContain('classic:source')
    expect(await create(storage).read('classic')).toBe('classic:29')
    expect(await create(storage).read('modern')).toBe('modern:29')
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

  test('lost host authority rejects publication and leaves both saves intact', async () => {
    const storage = new MemoryStorage(); let writer = true
    const store = new ModeSaveStore(storage, codecs, () => { if (!writer) throw new Error('lease lost') })
    await store.initialize({ discovery: 'complete', saves: { classic: 'classic:original' } }); writer = false
    await expect(store.migrateClassic(() => 'modern:converted')).rejects.toThrow('lease lost')
    expect((await store.inspect())?.active).toBe('classic')
    expect(await store.read('classic')).toBe('classic:original')
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
