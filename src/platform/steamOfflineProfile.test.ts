import { readFileSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readFile, realpath, rename, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, expect, test, vi } from 'vitest'
import { selectSteamSaveRoot } from '../../hosts/electron/steam/offlineProfile.mjs'
import { SteamCloud } from '../../hosts/electron/steam/cloud.mjs'
import { PortableSaveRepository, type SaveStorageAdapter } from '../save/repository'
import { PreparedSave, prepareIdb1Save } from '../save/prepare'
import { serializeSharedWebSave } from '../save/serialization'
import { CloudStartupResolver } from './portableCloud'
import { NATIVE_WEB_SAVE_PATHS } from './platformSaveStorage'

const original = prepareIdb1Save(readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')).prepared
const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
async function put(path: string, text: string) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, text) }
function repository(root: string) {
  const paths = { current: join(root, NATIVE_WEB_SAVE_PATHS.current), temporary: join(root, NATIVE_WEB_SAVE_PATHS.temporary), legacyRecovery: join(root, NATIVE_WEB_SAVE_PATHS.legacyRecovery) }
  const storage: SaveStorageAdapter = {
    exists: async path => { try { await stat(path); return true } catch { return false } },
    readText: path => readFile(path, 'utf8'), writeText: put, replaceAtomically: rename, copy: copyFile,
    discoverLegacyCandidates: async () => [],
  }
  return new PortableSaveRepository(storage, paths, JSON.parse, { allowCanonicalPlayerWrites: true })
}
async function fixture(choice: 'offline' | 'account' | 'later' = 'offline') {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'ids-offline-profile-'))); roots.push(root)
  const offlineRoot = join(root, 'steam-offline/web-runtime-v1')
  const accountDirectory = join(root, 'steam-local/76561198000000000')
  const choose = vi.fn(async () => choice)
  const ensureIdentity = vi.fn()
  const options = { offlineRoot, accountDirectory, choose, ensureIdentity }
  return { root, ...options, options, select: () => selectSteamSaveRoot(options) }
}

test('ordinary account launches have no offline prompt and keep their existing root', async () => {
  const f = await fixture()
  const root = join(f.accountDirectory, 'web-runtime-v1')
  await repository(root).commit(original)
  expect(await f.select()).toBe(root)
  expect(f.choose).not.toHaveBeenCalled()
})

test('offline progress is copied into the account, survives restart and preserves both original profiles', async () => {
  const f = await fixture()
  const accountRoot = join(f.accountDirectory, 'web-runtime-v1')
  await repository(accountRoot).commit(original)
  const data = original.copyValidatedState(); data.dateQuitString = '2026-09-06T01:00:00Z'
  await repository(f.offlineRoot).commit(PreparedSave.fromDecoded(data))
  await put(join(f.offlineRoot, NATIVE_WEB_SAVE_PATHS.transitionalStoredTimeJob), 'pending journal')
  await put(join(f.offlineRoot, NATIVE_WEB_SAVE_PATHS.backups[0]), 'preserved backup')
  const root = await f.select()
  expect(root).not.toBe(accountRoot)
  expect((await repository(root).loadCurrent())?.copyValidatedState().dateQuitString).toBe(data.dateQuitString)
  expect(await readFile(join(root, NATIVE_WEB_SAVE_PATHS.transitionalStoredTimeJob), 'utf8')).toBe('pending journal')
  expect(await readFile(join(root, NATIVE_WEB_SAVE_PATHS.backups[0]), 'utf8')).toBe('preserved backup')
  expect((await repository(accountRoot).loadCurrent())?.copyValidatedState().dateQuitString).toBe(original.copyValidatedState().dateQuitString)
  expect((await repository(f.offlineRoot).loadCurrent())?.copyValidatedState().dateQuitString).toBe(data.dateQuitString)
  data.dateQuitString = '2026-09-06T02:00:00Z'
  await repository(root).commit(PreparedSave.fromDecoded(data))
  expect(await f.select()).toBe(root)
  expect((await repository(root).loadCurrent())?.copyValidatedState().dateQuitString).toBe(data.dateQuitString)
  expect(f.choose).toHaveBeenCalledOnce()
})

test('keeping the account dismisses only this offline snapshot; deferring asks again', async () => {
  const f = await fixture('later')
  await repository(f.offlineRoot).commit(original)
  const root = join(f.accountDirectory, 'web-runtime-v1')
  expect(await f.select()).toBe(root)
  expect(await f.select()).toBe(root)
  expect(f.choose).toHaveBeenCalledTimes(2)
  f.choose.mockResolvedValue('account')
  expect(await f.select()).toBe(root)
  expect(await f.select()).toBe(root)
  expect(f.choose).toHaveBeenCalledTimes(3)
  const data = original.copyValidatedState(); data.dateQuitString = '2026-09-06T03:00:00Z'
  await repository(f.offlineRoot).commit(PreparedSave.fromDecoded(data))
  await f.select()
  expect(f.choose).toHaveBeenCalledTimes(4)
})

test('another account must make its own explicit choice and never receives the first account profile', async () => {
  const f = await fixture()
  await repository(f.offlineRoot).commit(original)
  const firstRoot = await f.select()
  const choose = vi.fn(async () => 'account')
  const accountDirectory = join(f.root, 'steam-local/76561198000000001')
  expect(await selectSteamSaveRoot({ ...f.options, accountDirectory, choose })).toBe(join(accountDirectory, 'web-runtime-v1'))
  expect(choose).toHaveBeenCalledOnce()
  expect(await f.select()).toBe(firstRoot)
})

test('an interrupted selection leaves originals intact and can retry without trusting a partial copy', async () => {
  const f = await fixture()
  const accountRoot = join(f.accountDirectory, 'web-runtime-v1')
  await repository(accountRoot).commit(original)
  await repository(f.offlineRoot).commit(original)
  const statePath = join(f.accountDirectory, 'offline-profile.json')
  f.choose.mockImplementationOnce(async () => { await mkdir(statePath); return 'offline' })
  await expect(f.select()).rejects.toThrow()
  expect(await repository(accountRoot).loadCurrent()).not.toBeNull()
  expect(await repository(f.offlineRoot).loadCurrent()).not.toBeNull()
  await rm(statePath, { recursive: true })
  const selected = await f.select()
  expect(await repository(selected).loadCurrent()).not.toBeNull()
  expect(await f.select()).toBe(selected)
})

test('identity changes during the choice abort recovery before selection is saved', async () => {
  const f = await fixture()
  await repository(f.offlineRoot).commit(original)
  f.choose.mockImplementationOnce(async () => { f.ensureIdentity.mockImplementation(() => { throw new Error('account changed') }); return 'offline' })
  await expect(f.select()).rejects.toThrow('account changed')
  await expect(readFile(join(f.accountDirectory, 'offline-profile.json'))).rejects.toThrow()
})

test('linked offline files and missing selected roots fail closed', async () => {
  const f = await fixture()
  await repository(f.offlineRoot).commit(original)
  const root = await f.select()
  await rm(root, { recursive: true })
  await expect(f.select()).rejects.toThrow()
  const g = await fixture()
  await mkdir(join(g.offlineRoot, 'save'), { recursive: true })
  await symlink(join(f.offlineRoot, NATIVE_WEB_SAVE_PATHS.current), join(g.offlineRoot, 'save/linked.idsw'))
  await expect(g.select()).rejects.toThrow('Unsafe offline save path')
  expect(g.choose).not.toHaveBeenCalled()
})

test.each(['local', 'cloud'] as const)('recovered offline progress uses normal Cloud conflict resolution: %s', async choice => {
  const f = await fixture()
  const offline = original.copyValidatedState(); offline.dateQuitString = '2026-09-06T04:00:00Z'
  await repository(f.offlineRoot).commit(PreparedSave.fromDecoded(offline))
  const root = await f.select()
  const localRepository = repository(root)
  const prompt = vi.fn(async () => choice)
  const cloud = new SteamCloud({ userData: f.root, account: '76561198000000000', identity: () => '76561198000000000', choose: prompt })
  await put(join(cloud.directory, 'current.idsw'), serializeSharedWebSave(original.copyValidatedState()))
  const local = { resolve: async () => ({ kind: 'ready' as const, source: 'canonical' as const, save: (await localRepository.loadCurrent())! }) }
  await new CloudStartupResolver(local, localRepository, cloud).resolve()
  expect(prompt).toHaveBeenCalledOnce()
  expect((await localRepository.loadCurrent())?.copyValidatedState().dateQuitString).toBe(choice === 'local' ? offline.dateQuitString : original.copyValidatedState().dateQuitString)
  expect((await repository(f.offlineRoot).loadCurrent())?.copyValidatedState().dateQuitString).toBe(offline.dateQuitString)
})


test('offline preferences alone do not offer an empty profile over an account save', async () => {
  const f = await fixture()
  await put(join(f.offlineRoot, NATIVE_WEB_SAVE_PATHS.transitionalStoredTimePolicy), '{}')
  expect(await f.select()).toBe(join(f.accountDirectory, 'web-runtime-v1'))
  expect(f.choose).not.toHaveBeenCalled()
})


test('an uncommitted partial copy is ignored when retrying from the durable old selection', async () => {
  const f = await fixture()
  await repository(f.offlineRoot).commit(original)
  await put(join(f.accountDirectory, 'offline-profile.json'), JSON.stringify({ version: 1, recovery: null, handledFingerprint: null }))
  await put(join(f.accountDirectory, 'offline-recovery/interrupted/web-runtime-v1/save/partial.idsw'), 'partial')
  const root = await f.select()
  expect(root).not.toContain('interrupted')
  expect(await repository(root).loadCurrent()).not.toBeNull()
})

test('losing a committed selection cannot silently reopen the older account profile', async () => {
  const f = await fixture()
  await repository(f.offlineRoot).commit(original)
  const root = await f.select()
  await rm(join(f.accountDirectory, 'offline-profile.json'))
  await expect(f.select()).rejects.toThrow('Offline profile selection is missing')
  expect(await repository(root).loadCurrent()).not.toBeNull()
})
