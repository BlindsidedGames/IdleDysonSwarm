import { readFileSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, expect, test, vi } from 'vitest'
import { SteamCloud } from '../../hosts/electron/steam/cloud.mjs'
import { CloudStartupResolver } from './portableCloud'
import { PortableSaveRepository, type SaveStorageAdapter } from '../save/repository'
import { PreparedSave, prepareIdb1Save } from '../save/prepare'
import { serializeSharedWebSave } from '../save/serialization'

const original = prepareIdb1Save(readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')).prepared
const portable = serializeSharedWebSave(original.copyValidatedState())
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

test.each(['local', 'cloud'] as const)('corrupt-header download recovers a real backup with %s conflict choice and preserves both sources', async choice => {
  const f = await fixture(choice)
  await f.repository.commit(original)
  const data = original.copyValidatedState(); data.dateQuitString = '2026-09-05T01:00:00Z'
  const backup = serializeSharedWebSave(data)
  await writeFile(join(f.cloud.directory, 'current.idsw'), 'damaged header and payload')
  await writeFile(join(f.cloud.directory, 'backup-1.idsw'), backup)
  const result = await f.resolver.resolve()
  expect(result.kind).toBe(choice === 'cloud' ? 'ready' : 'first-run')
  expect(f.prompt).toHaveBeenCalledOnce()
  const [conflict] = await readdir(join(f.cloud.localDirectory, 'conflicts'))
  expect(await readFile(join(f.cloud.localDirectory, 'conflicts', conflict, 'cloud.idsw'), 'utf8')).toBe(backup)
  const downloads = await readdir(join(f.cloud.localDirectory, 'downloads'))
  expect(await readFile(join(f.cloud.localDirectory, 'downloads', downloads[0]), 'utf8')).toBe('damaged header and payload')
  expect(await f.cloud.read()).toBeNull()
  expect((await f.repository.loadCurrent())?.copyValidatedState().dateQuitString).toBe(choice === 'cloud' ? data.dateQuitString : original.copyValidatedState().dateQuitString)
})

test('interrupted canonical replacement retains old current and retries the downloaded save after restart', async () => {
  const f = await fixture()
  await f.repository.commit(original)
  const before = await readFile(f.paths.current, 'utf8')
  const data = original.copyValidatedState(); data.dateQuitString = '2026-09-05T02:00:00Z'
  const remote = serializeSharedWebSave(data)
  await writeFile(join(f.cloud.directory, 'current.idsw'), remote)
  f.storage.replaceAtomically = async () => { throw new Error('simulated interrupted replacement') }
  expect(await f.resolver.resolve()).toMatchObject({ kind: 'blocked', reason: 'recovery-write-failed' })
  expect(await readFile(f.paths.current, 'utf8')).toBe(before)
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
  const future = serializeSharedWebSave(data)
  await writeFile(join(f.cloud.directory, 'current.idsw'), 'IDSWEB1:broken')
  await writeFile(join(f.cloud.directory, 'backup-1.idsw'), future)
  await writeFile(join(f.cloud.directory, 'backup-2.idsw'), portable)
  expect(await f.resolver.resolve()).toMatchObject({ kind: 'blocked', reason: 'unsupported-future-version' })
  expect(await f.repository.loadCurrent()).toBeNull()
  expect(await readFile(join(f.cloud.directory, 'backup-1.idsw'), 'utf8')).toBe(future)
  expect(await f.cloud.read()).toBe('IDSWEB1:broken')
})

test('healthy checkpoints transferred in both directions load as Cloud saves, not backup recovery', async () => {
  const a = await fixture()
  const b = await fixture()
  await a.repository.commit(original)
  await a.cloud.read()
  await a.cloud.publish(serializeSharedWebSave(PreparedSave.fromDecoded(original.copyValidatedState()).copyValidatedState()))
  await copyFile(join(a.cloud.directory, 'current.idsw'), join(b.cloud.directory, 'current.idsw'))
  expect(await b.resolver.resolve()).toMatchObject({ kind: 'ready', source: 'cloud' })
  const state = (await b.repository.loadCurrent())!.copyValidatedState()
  state.dateQuitString = '2026-09-05T04:00:00Z'
  const committed = await b.repository.commit(PreparedSave.fromDecoded(state))
  const changed = serializeSharedWebSave(committed.copyValidatedState())
  await b.cloud.publish(changed)
  await copyFile(join(b.cloud.directory, 'current.idsw'), join(a.cloud.directory, 'current.idsw'))
  expect(await a.resolver.resolve()).toMatchObject({ kind: 'ready', source: 'cloud' })
  expect((await a.repository.loadCurrent())?.copyValidatedState().dateQuitString).toBe(state.dateQuitString)
  expect(a.prompt).not.toHaveBeenCalled()
  expect(b.prompt).not.toHaveBeenCalled()
  const next = (await a.repository.loadCurrent())!.copyValidatedState()
  next.dateQuitString = '2026-09-05T05:00:00Z'
  await a.cloud.publish(serializeSharedWebSave(next))
  await copyFile(join(a.cloud.directory, 'current.idsw'), join(b.cloud.directory, 'current.idsw'))
  expect(await b.resolver.resolve()).toMatchObject({ kind: 'ready', source: 'cloud' })
  expect(b.prompt).not.toHaveBeenCalled()
})

test('independent local progress after a successful sync still requires a preserved conflict choice', async () => {
  const f = await fixture('local')
  await f.repository.commit(original)
  await f.cloud.read(); await f.cloud.publish(portable)
  const local = original.copyValidatedState(); local.dateQuitString = '2026-09-05T06:00:00Z'
  const remote = original.copyValidatedState(); remote.dateQuitString = '2026-09-05T07:00:00Z'
  const localText = serializeSharedWebSave(local)
  await writeFile(join(f.cloud.directory, 'current.idsw'), serializeSharedWebSave(remote))
  await f.cloud.read()
  expect(await f.cloud.choose(localText, serializeSharedWebSave(remote))).toBe('local')
  expect(f.prompt).toHaveBeenCalledOnce()
  const [conflict] = await readdir(join(f.cloud.localDirectory, 'conflicts'))
  expect(await readFile(join(f.cloud.localDirectory, 'conflicts', conflict, 'local.idsw'), 'utf8')).toBe(localText)
})
