import { expect, test } from 'vitest'
import { GameModeController, type ModeSessionContext, type ModeSessionFactory } from './modeController'
import { ModeSaveStore, type GameMode } from './modeSaveStore'
import type { SaveStorageAdapter } from '../save/repository'

function fixture() {
  const files = new Map<string, string>()
  const storage: SaveStorageAdapter = {
    exists: async p => files.has(p), readText: async p => { if (!files.has(p)) throw Error('missing'); return files.get(p)! },
    writeText: async (p, text) => { files.set(p, text) },
    copy: async (a, b) => { files.set(b, files.get(a)!) },
    replaceAtomically: async (a, b) => { files.set(b, files.get(a)!); files.delete(a) }, discoverLegacyCandidates: async () => [],
  }
  const codec = { validate: () => undefined, createFresh: () => 'fresh', createReset: () => 'fresh' }
  const store = new ModeSaveStore(storage, { classic: codec, modern: codec }, () => undefined)
  const contexts: ModeSessionContext[] = [], events: string[] = []
  let live = 0
  const factory: ModeSessionFactory = async context => {
    expect(live).toBe(0); live++; contexts.push(context); events.push('open ' + context.mode)
    let closed = false
    return {
      exportSave: async () => ({ text: context.initialSave + '-shareable', basis: 'current' as const }),
      quiesce: async () => { events.push('quiesce ' + context.mode); return context.initialSave + '-played' },
      close: async () => { if (!closed) { closed = true; live--; events.push('close ' + context.mode) } },
    }
  }
  const controller = new GameModeController(store, { classic: factory, modern: factory }, text => text + '-migrated')
  return { controller, contexts, events, store }
}

test.each(['classic', 'modern'] as const)('%s reset changes only the confirmed active mode and fences the old runtime', async mode => {
  const f = fixture(), other = mode === 'classic' ? 'modern' : 'classic'
  await f.controller.start({ discovery: 'complete', saves: { classic: 'classic-earned', modern: 'modern-earned' } })
  await f.controller.switchTo(mode)
  const previous = f.contexts.at(-1)!, inactive = await f.store.read(other)
  await expect(f.controller.resetSave(other)).rejects.toThrow('changed')
  expect(previous.isCurrent()).toBe(true)
  await f.controller.resetSave(mode)
  expect(previous.isCurrent()).toBe(false)
  expect(await previous.checkpoint('late pre-reset worker')).toBe(false)
  expect(await f.store.read(mode)).toBe('fresh')
  expect(await f.store.read(other)).toBe(inactive)
  expect(f.contexts.at(-1)?.initialSave).toBe('fresh')
  await f.controller.close()
})

test('switching closes the previous session and rejects its late checkpoint writes', async () => {
  const f = fixture()
  await f.controller.start({ discovery: 'complete', saves: { classic: 'legacy' } })
  for (const target of ['modern', 'classic', 'modern', 'classic'] as GameMode[]) {
    const old = f.contexts.at(-1)!
    await f.controller.switchTo(target)
    expect(old.isCurrent()).toBe(false)
    expect(await old.checkpoint('late-worker-result')).toBe(false)
  }
  expect(f.events.slice(0, 4)).toEqual(['open classic', 'quiesce classic', 'close classic', 'open modern'])
  const inactive = await f.store.read('modern'), exporting = f.contexts.at(-1)!
  expect(await f.controller.exportSave()).toEqual({ text: exporting.initialSave + '-shareable', basis: 'current' })
  expect(await f.store.read('modern')).toBe(inactive)
  expect(exporting.isCurrent()).toBe(true)
  expect(f.contexts.at(-1)).toBe(exporting)
  await expect(f.controller.prepareImport('{"format":"IDS-MODE-EXPORT-1"}')).rejects.toThrow('single-mode')
  expect(f.controller.getSnapshot().phase).toBe('ready')
  expect(exporting.isCurrent()).toBe(true)
  await f.controller.close()
  expect(await f.store.read('classic')).toBe('legacy-played-played-played')
  expect(await f.store.read('modern')).toBe('fresh-played-played')
  await expect(f.controller.start()).rejects.toThrow('closed')
})
