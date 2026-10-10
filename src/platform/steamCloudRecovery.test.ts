import { readFileSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, expect, test, vi } from 'vitest'
import { SteamCloud } from '../../hosts/electron/steam/cloud.mjs'
import { CloudStartupResolver } from './portableCloud'
import { PortableSaveRepository, type SaveStorageAdapter } from '../save/repository'
import { prepareIdb1Save } from '../save/prepare'
import { serializeSharedWebSave as serializeRework } from '../save/serialization'
import { publicCloudFixture } from './publicCloudFixture.test-helper'

const original = prepareIdb1Save(readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')).prepared
const portable = publicCloudFixture(original.copyValidatedState())
const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
async function fixture(choice: 'local' | 'cloud' = 'cloud') {
  const root = await mkdtemp(join(tmpdir(), 'ids-cloud-recovery-')); roots.push(root)
  let account = '76561198000000000'
  const prompt = vi.fn(async () => choice)
  const cloud = new SteamCloud({ userData: root, account, identity: () => account, choose: prompt })
  const paths = { current: join(root, 'canonical/current.idsw'), temporary: join(root, 'canonical/pending.idsw'), legacyRecovery: join(root, 'canonical/recovery.idsw') }
  const storage: SaveStorageAdapter = {
    exists: async path => { try { await stat(path); return true } catch { return false } },
    readText: path => readFile(path, 'utf8'),
    writeText: async (path, text) => { await mkdir(dirname(path), { recursive: true }); await writeFile(path, text) },
    replaceAtomically: rename,
    copy: copyFile,
    discoverLegacyCandidates: async () => [],
  }
  const repository = new PortableSaveRepository(storage, paths, JSON.parse, { allowCanonicalPlayerWrites: true })
  const local = { resolve: vi.fn(async () => ({ kind: 'first-run' as const, save: original })) }
  await mkdir(cloud.directory, { recursive: true })
  return { cloud, prompt, paths, storage, repository, local, resolver: new CloudStartupResolver(local, repository, cloud), switchAccount: () => { account = '76561198000000001' } }
}

test('rejects IDLEDS publication before any shared Cloud or marker write', async () => {
  const f = await fixture()
  await writeFile(join(f.cloud.directory, 'current.idsw'), portable)
  await f.cloud.read()
  const before = await readdir(f.cloud.directory)
  await expect(f.cloud.publish(serializeRework(original.copyValidatedState())))
    .rejects.toThrow('approved isolated account namespace')
  for (const [local, remote] of [[serializeRework(original.copyValidatedState()), portable], [portable, serializeRework(original.copyValidatedState())]]) {
    await expect(f.cloud.choose(local, remote)).rejects.toThrow('approved isolated account namespace')
  }
  await expect(readdir(join(f.cloud.localDirectory, 'conflicts'))).rejects.toMatchObject({ code: 'ENOENT' })
  expect(f.prompt).not.toHaveBeenCalled()
  expect(await readdir(f.cloud.directory)).toEqual(before)
  expect(await readFile(join(f.cloud.directory, 'current.idsw'), 'utf8')).toBe(portable)
  await expect(readFile(f.cloud.marker, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
})

test('corrupt public download recovers its real backup once without changing either Cloud source', async () => {
  const f = await fixture()
  const data = original.copyValidatedState(); data.dateQuitString = '2026-09-05T01:00:00Z'
  const backup = publicCloudFixture(data)
  await writeFile(join(f.cloud.directory, 'current.idsw'), 'damaged header and payload')
  await writeFile(join(f.cloud.directory, 'backup-1.idsw'), backup)
  expect(await f.resolver.resolve()).toMatchObject({ kind: 'ready', source: 'recovered-canonical' })
  expect(f.prompt).not.toHaveBeenCalled()
  expect(await readFile(join(f.cloud.directory, 'backup-1.idsw'), 'utf8')).toBe(backup)
  expect(await readFile(join(f.cloud.directory, 'current.idsw'), 'utf8')).toBe('damaged header and payload')
  const downloads = await readdir(join(f.cloud.localDirectory, 'downloads'))
  expect(await readFile(join(f.cloud.localDirectory, 'downloads', downloads[0]), 'utf8')).toBe('damaged header and payload')
  expect(await f.cloud.read()).toBeNull()
  expect((await f.repository.loadCurrent())?.copyValidatedState().dateQuitString).toBe(data.dateQuitString)
})

test('interrupted first conversion retains the download and retries without a partial current', async () => {
  const f = await fixture()
  const data = original.copyValidatedState(); data.dateQuitString = '2026-09-05T02:00:00Z'
  const remote = publicCloudFixture(data)
  await writeFile(join(f.cloud.directory, 'current.idsw'), remote)
  f.storage.replaceAtomically = async () => { throw new Error('simulated interrupted replacement') }
  expect(await f.resolver.resolve()).toMatchObject({ kind: 'blocked', reason: 'recovery-write-failed' })
  expect(await f.repository.loadCurrent()).toBeNull()
  expect(await f.cloud.read()).toBe(remote)
  f.storage.replaceAtomically = rename
  expect(await f.resolver.resolve()).toMatchObject({ kind: 'ready' })
  expect((await f.repository.loadCurrent())?.copyValidatedState().dateQuitString).toBe(data.dateQuitString)
})

test('account change prevents file publication and acknowledgement', async () => {
  const f = await fixture()
  await f.cloud.read(); await f.cloud.publish(portable)
  f.switchAccount()
  await expect(f.cloud.publish(portable)).rejects.toThrow('account changed')
  await expect(f.cloud.acknowledge(portable)).rejects.toThrow('account changed')
  expect(await readFile(join(f.cloud.directory, 'current.idsw'), 'utf8')).toBe(portable)
})

test('unreadable downloaded primary permits local play but disables Cloud publication', async () => {
  const f = await fixture()
  await mkdir(join(f.cloud.directory, 'current.idsw'))
  expect(await f.resolver.resolve()).toMatchObject({ kind: 'first-run' })
  await expect(f.cloud.publish(portable)).rejects.toThrow('publication disabled')
  expect((await stat(join(f.cloud.directory, 'current.idsw'))).isDirectory()).toBe(true)
})

 test('future-version backup stops downgrade recovery and leaves all files untouched', async () => {
  const f = await fixture()
  const data = original.copyValidatedState(); data.saveVersion = 999
  const future = publicCloudFixture(data)
  await writeFile(join(f.cloud.directory, 'current.idsw'), 'IDSWEB1:broken')
  await writeFile(join(f.cloud.directory, 'backup-1.idsw'), future)
  await writeFile(join(f.cloud.directory, 'backup-2.idsw'), portable)
  expect(await f.resolver.resolve()).toMatchObject({ kind: 'blocked', reason: 'unsupported-future-version' })
  expect(await f.repository.loadCurrent()).toBeNull()
  expect(await readFile(join(f.cloud.directory, 'backup-1.idsw'), 'utf8')).toBe(future)
  expect(await f.cloud.read()).toBe('IDSWEB1:broken')
})

test('public download converts once and cannot be republished into shared public Cloud', async () => {
  const f = await fixture()
  await writeFile(join(f.cloud.directory, 'current.idsw'), portable)
  expect(await f.resolver.resolve()).toMatchObject({ kind: 'ready', source: 'cloud' })
  const current = (await f.repository.loadCurrent())!
  const converted = serializeRework(current.copyValidatedState())
  expect(converted).toMatch(/^IDLEDS:/)
  expect(current.copyValidatedState().saveVersion).toBe(21)
  const archives = await readdir(`${f.paths.legacyRecovery}.one-way`)
  const source = archives.find(name => name.endsWith('.source.txt'))!
  expect(await readFile(join(`${f.paths.legacyRecovery}.one-way`, source), 'utf8')).toBe(portable)
  await expect(f.cloud.publish(converted)).rejects.toThrow('approved isolated account namespace')
  expect(await readFile(join(f.cloud.directory, 'current.idsw'), 'utf8')).toBe(portable)
  expect(await f.cloud.read()).toBeNull()
})

test('independent local progress after a successful sync still requires a preserved conflict choice', async () => {
  const f = await fixture('local')
  await f.repository.commit(original)
  await f.cloud.read(); await f.cloud.publish(portable)
  const local = original.copyValidatedState(); local.dateQuitString = '2026-09-05T06:00:00Z'
  const remote = original.copyValidatedState(); remote.dateQuitString = '2026-09-05T07:00:00Z'
  const localText = publicCloudFixture(local)
  await writeFile(join(f.cloud.directory, 'current.idsw'), publicCloudFixture(remote))
  await f.cloud.read()
  expect(await f.cloud.choose(localText, publicCloudFixture(remote))).toBe('local')
  expect(f.prompt).toHaveBeenCalledOnce()
  const [conflict] = await readdir(join(f.cloud.localDirectory, 'conflicts'))
  expect(await readFile(join(f.cloud.localDirectory, 'conflicts', conflict, 'local.idsw'), 'utf8')).toBe(localText)
})
