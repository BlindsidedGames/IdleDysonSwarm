import { expect, test } from 'vitest'
import { GameModeController, type ModeSessionContext, type ModeSessionFactory } from './modeController'
import { ModeSaveStore, type GameMode } from './modeSaveStore'
import type { SaveStorageAdapter } from '../save/repository'
import { ModeMemoryStorage, modeStringCodecs } from '../../test/support/modeFoundation'

function fixture() {
  const files = new Map<string, string>()
  const storage: SaveStorageAdapter = {
    exists: async p => files.has(p), readText: async p => { if (!files.has(p)) throw Error('missing'); return files.get(p)! },
    writeText: async (p, text) => { files.set(p, text) },
    copy: async (a, b) => { files.set(b, files.get(a)!) },
    replaceAtomically: async (a, b) => { files.set(b, files.get(a)!); files.delete(a) }, discoverLegacyCandidates: async () => [],
  }
  const codec = { validate: () => undefined, createFresh: () => 'fresh' }
  const store = new ModeSaveStore(storage, { classic: codec, modern: codec }, () => undefined)
  const contexts: ModeSessionContext[] = [], events: string[] = []
  let live = 0, failCheckpoint = false
  const factory: ModeSessionFactory = async context => {
    expect(live).toBe(0); live++; contexts.push(context); events.push('open ' + context.mode)
    let closed = false
    return {
      quiesce: async () => { events.push('quiesce ' + context.mode); if (failCheckpoint) throw Error('checkpoint failed'); return context.initialSave + '-played' },
      close: async () => { if (!closed) { closed = true; live--; events.push('close ' + context.mode) } },
    }
  }
  const controller = new GameModeController(store, { classic: factory, modern: factory }, text => text + '-migrated')
  return { controller, contexts, events, store, setFailure: (value: boolean) => { failCheckpoint = value } }
}

test('switches serialize, dispose the complete old graph, reject late callbacks and restore each source after restart', async () => {
  const f = fixture()
  await f.controller.start({ discovery: 'complete', saves: { classic: 'legacy' } })
  for (const target of ['modern', 'classic', 'modern', 'classic'] as GameMode[]) {
    const old = f.contexts.at(-1)!
    await f.controller.switchTo(target)
    expect(old.isCurrent()).toBe(false)
    expect(await old.checkpoint('late-worker-result')).toBe(false)
  }
  expect(f.events.slice(0, 4)).toEqual(['open classic', 'quiesce classic', 'close classic', 'open modern'])
  await f.controller.close()
  expect(await f.store.read('classic')).toBe('legacy-played-played-played')
  expect(await f.store.read('modern')).toBe('fresh-played-played')
  await expect(f.controller.start()).rejects.toThrow('closed')
})

test('failed final checkpoint blocks selection and closes workers; retry opens the last durable source', async () => {
  const f = fixture(); await f.controller.start({ discovery: 'complete', saves: { classic: 'legacy' } })
  f.setFailure(true)
  await expect(f.controller.switchTo('modern')).rejects.toThrow('checkpoint failed')
  expect(f.controller.getSnapshot().phase).toBe('blocked')
  expect(f.events).toEqual(['open classic', 'quiesce classic', 'close classic'])
  expect((await f.store.inspect())?.active).toBe('classic')
  f.setFailure(false); await f.controller.start()
  expect(f.contexts.at(-1)?.initialSave).toBe('legacy')
  await f.controller.close()
})

test('a failed teardown after a post-open storage error fences every later transition before another graph or write', async () => {
  const storage = new ModeMemoryStorage(), store = new ModeSaveStore(storage, modeStringCodecs, () => undefined)
  let opened = 0, failInspection = false
  const read = storage.readText.bind(storage)
  storage.readText = async path => {
    if (failInspection && path === 'modes-v1/manifest.json') { failInspection = false; throw Error('Post-open inspection failed') }
    return read(path)
  }
  const factory: ModeSessionFactory = async () => {
    opened++; failInspection = true
    return { quiesce: async () => 'modern:final', close: async () => { throw Error('Teardown failed') } }
  }
  const controller = new GameModeController(store, { classic: factory, modern: factory }, text => text)
  await expect(controller.start({ discovery: 'complete', saves: {} })).rejects.toThrow('Teardown failed')
  const before = [...storage.files]
  const bundle = await store.exportBundle()
  for (const action of [() => controller.start(), () => controller.switchTo('classic'), () => controller.importSaves(bundle, 1), () => controller.prepareRecovery(), () => controller.restoreRecovery('unreviewed')]) await expect(action()).rejects.toThrow('previous mode')
  expect(opened).toBe(1)
  expect([...storage.files]).toEqual(before)
})

test('migration checkpoints Classic first, conflict leaves play uninterrupted, and returning opens the preserved Classic save', async () => {
  const f = fixture(); await f.controller.start({ discovery: 'complete', saves: { classic: 'legacy' } })
  await f.controller.migrateClassic()
  expect(f.contexts.at(-1)?.initialSave).toBe('legacy-played-migrated')
  await f.controller.switchTo('classic')
  expect(f.contexts.at(-1)?.initialSave).toBe('legacy-played')
  const events = [...f.events]
  await expect(f.controller.migrateClassic()).rejects.toThrow('already exists')
  expect(f.events).toEqual(events)
  expect(f.controller.getSnapshot().phase).toBe('ready')
  await f.controller.close()
})
