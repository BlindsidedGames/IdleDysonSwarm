import { afterEach, expect, test } from 'vitest'
import { mkdtemp, realpath, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { bindBrowserModeStorage, bindNativeModeStorage, DUAL_MODE_NATIVE_ROOT } from './hostStorageBindings'
import { DisposableBrowserDatabase, disposableNativeFiles, DisposableCloudProvider } from './development/disposableHostPorts'
import { PRODUCTION_BROWSER_DATABASE_NAME, PRODUCTION_BROWSER_SAVE_PATHS } from '../browser/productionBrowserStorage'
import { NATIVE_WEB_SAVE_PATHS } from '../platform/platformSaveStorage'
import { ModeSaveStore } from './modeSaveStore'
import { createModeHost } from './modeHost'
import { modeStringCodecs, ModeMemoryStorage } from '../../test/support/modeFoundation'
import { bindModeCloudTransport } from './hostCloudBindings'
import { ModeCloudCoordinator } from './modeCloud'
import { bindElectronModeFiles } from '../../hosts/electron/modeStorage.mjs'
import { bindSteamModeCloud } from '../../hosts/electron/steam/modeCloud.mjs'
import { createClassicModeCodec } from './classicModeCodec'
import { createModernModeCodec } from './modernModeCodec'
import { modeCloudText } from './modeCloud'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true }))) })
async function scratch() { const path = await realpath(await mkdtemp(join(tmpdir(), 'ids-modes-binding-'))); roots.push(path); return path }

test.each(['browser', 'electron', 'ios', 'android'] as const)('%s adapter adopts read-only history and reopens both durable saves under one fenced destination', async target => {
  const databases = new Map<string, DisposableBrowserDatabase>()
  const open = (name: string) => { if (!databases.has(name)) databases.set(name, new DisposableBrowserDatabase()); return databases.get(name)! }
  open(PRODUCTION_BROWSER_DATABASE_NAME).files.set(PRODUCTION_BROWSER_SAVE_PATHS.current, 'classic:original')
  const original = new Map([[NATIVE_WEB_SAVE_PATHS.current, 'classic:original']]), destination = disposableNativeFiles()
  const nativeRoots = { destination: { namespace: DUAL_MODE_NATIVE_ROOT, files: destination }, publicClassic: { namespace: 'web-runtime-v1' as const, files: disposableNativeFiles(original) }, modernBeta: { namespace: 'idleds-rework-beta-v1' as const, files: disposableNativeFiles() }, unity: { discoverCandidates: async () => [] } }
  const bind = () => target === 'browser' ? bindBrowserModeStorage(open, { autoHeartbeat: false }) : bindNativeModeStorage(target, nativeRoots)
  const binding = bind(); await binding.acquire()
  const store = new ModeSaveStore(binding.storage, modeStringCodecs, () => binding.authority.assertWritable().then(() => undefined))
  const factory = (mode: string) => async () => ({ quiesce: async () => mode + ':checkpoint', close: async () => undefined })
  const host = createModeHost({ store, factories: { classic: factory('classic'), modern: factory('modern') }, discovery: { ...binding.discovery, codecs: modeStringCodecs }, convertClassic: text => text })
  await host.start(); expect(host.controller.getSnapshot().manifest?.active).toBe('classic')
  await host.controller.switchTo('modern'); await host.controller.switchTo('classic'); await host.controller.close(); await binding.close()
  expect(original.get(NATIVE_WEB_SAVE_PATHS.current)).toBe('classic:original')
  expect(await open(PRODUCTION_BROWSER_DATABASE_NAME).readFile(PRODUCTION_BROWSER_SAVE_PATHS.current)).toBe('classic:original')
  await expect(store.checkpoint('classic', 'classic:late')).rejects.toThrow()
  const reopened = bind(); await reopened.acquire()
  try {
    const saved = new ModeSaveStore(reopened.storage, modeStringCodecs, () => reopened.authority.assertWritable().then(() => undefined))
    expect(await saved.read('classic')).toBe('classic:checkpoint')
    expect(await saved.read('modern')).toBe('modern:checkpoint')
    if (target === 'browser') { const competitor = bind(); await expect(competitor.acquire()).rejects.toThrow('Another session'); await competitor.close() }
    else await expect(reopened.storage.writeText('../escape', 'bad')).rejects.toThrow('relative')
  } finally { await reopened.close() }
})

test('file-backed Electron adapter durably reopens synthetic saves and cannot write historical roots or traverse paths', async () => {
  const root = await scratch(), publicRoot = join(root, 'public'), betaRoot = join(root, 'beta')
  await mkdir(join(publicRoot, 'save'), { recursive: true }); await mkdir(betaRoot)
  await writeFile(join(publicRoot, NATIVE_WEB_SAVE_PATHS.current), 'classic:filesystem-original')
  const options = { destination: join(root, 'dual'), publicClassic: publicRoot, modernBeta: betaRoot, discoverUnity: async () => [] }
  const binding = bindNativeModeStorage('electron', await bindElectronModeFiles(options))
  await binding.acquire()
  const store = new ModeSaveStore(binding.storage, modeStringCodecs, () => binding.authority.assertWritable().then(() => undefined))
  const { discoverModeUpgrade } = await import('./upgradeDiscovery')
  await store.initialize(await discoverModeUpgrade({ ...binding.discovery, codecs: modeStringCodecs }))
  await store.select('modern'); await store.checkpoint('modern', 'modern:filesystem-progress'); await binding.close()
  const next = bindNativeModeStorage('electron', await bindElectronModeFiles(options)); await next.acquire()
  try {
    const saved = new ModeSaveStore(next.storage, modeStringCodecs, () => next.authority.assertWritable().then(() => undefined))
    expect(await saved.read('modern')).toBe('modern:filesystem-progress')
    expect(await readFile(join(publicRoot, NATIVE_WEB_SAVE_PATHS.current), 'utf8')).toBe('classic:filesystem-original')
    await expect(next.storage.writeText('../../public/save/escape', 'bad')).rejects.toThrow()
    await expect(bindElectronModeFiles({ ...options, destination: join(publicRoot, 'overlap') })).rejects.toThrow('overlap')
  } finally { await next.close() }
})

test('account-scoped provider binding persists separate receipts and refuses an account change', async () => {
  const provider = new DisposableCloudProvider(), storage = new ModeMemoryStorage()
  const store = new ModeSaveStore(storage, modeStringCodecs, () => undefined)
  await store.initialize({ discovery: 'complete', saves: { classic: 'classic:local', modern: 'modern:local' } })
  let identity = 'synthetic-account'
  const bind = () => bindModeCloudTransport({ provider, account: 'synthetic-account', identity: () => identity, local: storage, assertWriter() {}, choose: async () => 'cloud' })
  const clouds = bind(), coordinator = new ModeCloudCoordinator(store, clouds, modeStringCodecs, (_mode, text) => text, (_mode, _local, remote) => remote)
  for (const mode of ['classic', 'modern'] as const) { await coordinator.resolve(mode); await coordinator.publish(mode, mode + ':local', () => true) }
  expect(await provider.read('synthetic-account/idleds-classic-v1')).toBe('classic:local')
  expect(await provider.read('synthetic-account/idleds-modern-v1')).toBe('modern:local')
  const reopened = bind(); expect(await reopened.classic.read()).toBeNull(); expect(await reopened.modern.read()).toBeNull()
  // Normal sync hides an acknowledged download; first-upgrade discovery must
  // still see those bytes if this installation's manifest is absent.
  const discovery = coordinator.discoverySources()
  expect((await discovery.find(source => source.mode === 'classic')!.read())[0].text).toBe('classic:local')
  identity = 'different-account'
  await expect(clouds.classic.publish('classic:forbidden')).rejects.toThrow('account changed')
  expect(await provider.read('synthetic-account/idleds-classic-v1')).toBe('classic:local')
})

test('the disposable provider permits exactly one concurrent compare-and-publish for a remote version', async () => {
  const provider = new DisposableCloudProvider()
  const results = await Promise.allSettled([provider.compareAndPublish('same-account/same-mode', null, 'first'), provider.compareAndPublish('same-account/same-mode', null, 'second')])
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
  expect(results.filter(result => result.status === 'rejected')).toHaveLength(1)
  expect(await provider.read('same-account/same-mode')).toBe('first')
})

test('real Steam file transport isolates both mode namespaces and reads old public evidence without marker writes', async () => {
  const root = await scratch(), account = '76561198000000000'
  const old = join(root, 'steam-cloud', account); await mkdir(old, { recursive: true }); await writeFile(join(old, 'current.idsw'), 'IDSWEB1:old-public')
  const bound = bindSteamModeCloud({ userData: root, account, identity: () => account, choose: async () => 'cloud' })
  const before = await readdir(old)
  expect((await bound.historicalClassic.read())[0].text).toBe('IDSWEB1:old-public')
  expect(await readdir(old)).toEqual(before)
  await expect(readdir(join(root, 'steam-local', account))).rejects.toMatchObject({ code: 'ENOENT' })
  const codecs = { classic: createClassicModeCodec(() => '2026-10-15T00:00:00Z'), modern: createModernModeCodec(() => '2026-10-15T00:00:00Z') }
  for (const mode of ['classic', 'modern'] as const) {
    const text = modeCloudText(mode, await codecs[mode].createFresh())
    expect(await bound.clouds[mode].read()).toBeNull(); await bound.clouds[mode].publish(text)
    expect(await readFile(join(old, `idleds-${mode}-v1`, 'current.idsw'), 'utf8')).toBe(text)
  }
  expect(await readFile(join(old, 'current.idsw'), 'utf8')).toBe('IDSWEB1:old-public')
  await expect(bound.clouds.classic.publish(modeCloudText('modern', await codecs.modern.createFresh()))).rejects.toThrow('isolated account namespace')
})
