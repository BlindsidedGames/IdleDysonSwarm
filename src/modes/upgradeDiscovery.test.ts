import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { discoverModeUpgrade, rootedUpgradeSource, unityUpgradeSource, type ReadOnlyUpgradeSource } from './upgradeDiscovery'
import { ModeSaveStore } from './modeSaveStore'
import { ModeMemoryStorage, modeStringCodecs } from '../../test/support/modeFoundation'
import { createClassicModeCodec } from './classicModeCodec'
import { createModernModeCodec } from './modernModeCodec'

const paths = { current: 'current', temporary: 'temp', legacyRecovery: 'legacy', backups: ['backup1', 'backup2', 'backup3'] as const }
const absent = (id: string, mode: 'classic' | 'modern'): ReadOnlyUpgradeSource => ({ id, mode, read: async () => [] })
function discovery(storage = new ModeMemoryStorage()) {
  return { publicClassic: rootedUpgradeSource('public', 'classic', storage, paths), legacyUnity: absent('unity', 'classic'), modernBeta: absent('beta', 'modern'), codecs: modeStringCodecs }
}

test('upgrade uses public Classic, separately retains beta and originals, and publishes no discovery writes', async () => {
  const publicFiles = new ModeMemoryStorage(), beta = new ModeMemoryStorage(), destination = new ModeMemoryStorage()
  publicFiles.files.set('current', 'classic:public'); beta.files.set('current', 'modern:internal')
  const options = { ...discovery(publicFiles), modernBeta: rootedUpgradeSource('beta', 'modern', beta, paths), legacyUnity: { id: 'unity', mode: 'classic' as const, read: async () => [{ id: 'older-unity', role: 'legacy' as const, text: 'classic:older' }] } }
  const beforePublic = [...publicFiles.files], beforeBeta = [...beta.files]
  const inventory = await discoverModeUpgrade(options)
  expect(inventory.saves).toEqual({ classic: 'classic:public', modern: 'modern:internal' })
  expect([...publicFiles.files]).toEqual(beforePublic); expect([...beta.files]).toEqual(beforeBeta)
  const store = new ModeSaveStore(destination, modeStringCodecs, () => undefined)
  expect((await store.initialize(inventory)).active).toBe('classic')
  expect(await store.read('modern')).toBe('modern:internal')
  expect([...destination.files.values()]).toContain('classic:older')
  expect((await store.inspect())?.upgradeSources).toHaveLength(3)
})

test('only proved absence defaults to modern; corrupt, future, unreadable and changing roots block adoption', async () => {
  const destination = new ModeMemoryStorage(), store = new ModeSaveStore(destination, modeStringCodecs, () => undefined)
  expect((await store.initialize(await discoverModeUpgrade(discovery()))).active).toBe('modern')
  const publicFiles = new ModeMemoryStorage()
  for (const source of ['corrupt', 'future']) {
    publicFiles.files.set('current', source)
    await expect(discoverModeUpgrade(discovery(publicFiles))).rejects.toThrow()
  }
  publicFiles.files.set('backup1', 'classic:backup')
  await expect(discoverModeUpgrade(discovery(publicFiles))).rejects.toThrow('newer schema')
  publicFiles.files.set('current', 'corrupt')
  const recovered = await discoverModeUpgrade(discovery(publicFiles))
  expect(recovered.saves.classic).toBe('classic:backup')
  const unavailable = { ...discovery(), legacyUnity: { ...absent('unity', 'classic'), read: async () => { throw Error('access denied') } } }
  await expect(discoverModeUpgrade(unavailable)).rejects.toThrow('access denied')
  const inventory = await discoverModeUpgrade(discovery(publicFiles))
  publicFiles.files.set('backup1', 'classic:newer')
  const empty = new ModeSaveStore(new ModeMemoryStorage(), modeStringCodecs, () => undefined)
  await expect(empty.initialize(inventory)).rejects.toThrow('changed')
  expect(await empty.inspect()).toBeNull()
})

test('multiple independent Classic sources require an explicit choice and retain both byte streams', async () => {
  const files = new ModeMemoryStorage(); files.files.set('current', 'classic:local')
  const options = { ...discovery(files), additionalSources: [{ id: 'old-cloud', mode: 'classic' as const, read: async () => [{ id: 'cloud-primary', text: 'classic:cloud', role: 'primary' as const }] }] }
  await expect(discoverModeUpgrade(options)).rejects.toThrow('explicit upgrade choice')
  const selected = await discoverModeUpgrade({ ...options, choose: async (mode, choices) => { expect(mode).toBe('classic'); return choices.find(candidate => candidate.text === 'classic:cloud')!.id } })
  expect(selected.saves.classic).toBe('classic:cloud')
  expect(selected.originals.map(source => source.text)).toEqual(['classic:local', 'classic:cloud'])
})

test('Unity-only upgrade uses the actual Classic decoder and retains its exact original for recovery', async () => {
  const text = readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')
  const codecs = { classic: createClassicModeCodec(() => '2026-10-15T00:00:00Z'), modern: createModernModeCodec(() => '2026-10-15T00:00:00Z') }
  const inventory = await discoverModeUpgrade({ ...discovery(), codecs, legacyUnity: unityUpgradeSource(async () => [{ id: 'synthetic-unity', sourcePath: 'readonly', text }]) })
  expect(inventory.saves.classic).toBeTruthy()
  expect(inventory.originals[0].text).toBe(text)
  const storage = new ModeMemoryStorage(), store = new ModeSaveStore(storage, codecs, () => undefined)
  expect((await store.initialize(inventory)).active).toBe('classic')
  expect([...storage.files.values()]).toContain(text)
})


test('a retained Unity recovery file alone is existing Classic progress, not a new modern installation', async () => {
  const original = readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')
  const storage = new ModeMemoryStorage(); storage.files.set(paths.legacyRecovery, original)
  const date = () => '2026-10-15T00:00:00Z'
  const codecs = { classic: createClassicModeCodec(date), modern: createModernModeCodec(date) }
  const inventory = await discoverModeUpgrade({ ...discovery(storage), codecs })
  const target = new ModeSaveStore(new ModeMemoryStorage(), codecs, () => undefined)
  expect((await target.initialize(inventory)).active).toBe('classic')
  expect(inventory.originals[0].text).toBe(original)
})
