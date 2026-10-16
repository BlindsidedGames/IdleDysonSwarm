import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { ModeCloudCoordinator, createModeCloudAdapters, MODE_CLOUD_NAMESPACES } from './modeCloud'
import { ModeSaveStore } from './modeSaveStore'
import { ModeMemoryStorage, MockModeCloud, modeStringCodecs } from '../../test/support/modeFoundation'

async function fixture() {
  const storage = new ModeMemoryStorage(), store = new ModeSaveStore(storage, modeStringCodecs, () => undefined)
  await store.initialize({ discovery: 'complete', saves: { classic: 'classic:local', modern: 'modern:local' } })
  const clouds = { classic: new MockModeCloud(), modern: new MockModeCloud() }
  const cloud = new ModeCloudCoordinator(store, clouds, modeStringCodecs, (_mode, text) => text, (_mode, _local, remote) => remote)
  return { store, storage, clouds, cloud }
}
test('separate namespace adapters publish each durable mode only; stale callbacks and new downloads suppress publication', async () => {
  const namespaces: string[] = []
  const adapters = createModeCloudAdapters(namespace => { namespaces.push(namespace); return new MockModeCloud() })
  expect(namespaces).toEqual([MODE_CLOUD_NAMESPACES.classic, MODE_CLOUD_NAMESPACES.modern])
  expect(adapters.classic).not.toBe(adapters.modern)
  const f = await fixture(); await f.cloud.resolve('classic'); await f.cloud.resolve('modern')
  await f.cloud.publish('classic', 'classic:local', () => true)
  await f.cloud.publish('modern', 'modern:local', () => true)
  expect(f.clouds.classic.uploads).toEqual(['classic:local']); expect(f.clouds.modern.uploads).toEqual(['modern:local'])
  // Use a new durable payload so neither deduplication nor a payload mismatch
  // can hide a broken stale-session guard.
  await f.store.checkpoint('classic', 'classic:stale-session')
  await f.cloud.publish('classic', 'classic:stale-session', () => false)
  expect(f.clouds.classic.uploads).toEqual(['classic:local'])
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
test('a remote race, wrong-mode payload, future schema and changed backup cannot acknowledge or replace local saves', async () => {
  const f = await fixture(); f.clouds.classic.pending = 'classic:remote'
  f.clouds.classic.onChoose = () => { f.clouds.classic.pending = 'classic:newer' }
  await expect(f.cloud.resolve('classic')).rejects.toThrow('changed')
  expect(await f.store.read('classic')).toBe('classic:local'); expect(f.clouds.classic.acknowledged).toEqual([])
  f.clouds.classic.onChoose = undefined
  for (const text of ['modern:wrong-slot', 'future']) {
    f.clouds.classic.pending = text
    await expect(f.cloud.resolve('classic')).rejects.toThrow()
    expect(await f.store.read('classic')).toBe('classic:local')
    expect(f.clouds.classic.acknowledged).toEqual([])
  }
  f.clouds.classic.pending = 'corrupt'; f.clouds.classic.backups = ['classic:backup']; f.clouds.classic.acknowledgementFails = true
  await f.cloud.resolve('classic')
  f.clouds.classic.backups = ['classic:new-backup']; f.clouds.classic.acknowledgementFails = false
  await f.cloud.resolve('classic')
  await f.cloud.publish('classic', 'classic:backup', () => true)
  expect(f.clouds.classic.uploads).toEqual([])
  expect(await f.store.read('classic')).toBe('classic:backup')
})


test('Steam resumes released Classic Cloud files and keeps Modern publication and account receipts separate', async () => {
  const { bindSteamModeCloud } = await import(new URL('../../hosts/electron/steam/modeCloud.mjs', import.meta.url).href)
  const userData = await mkdtemp(join(tmpdir(), 'ids-mode-cloud-'))
  let identity = '76561198000000001'
  const directory = join(userData, 'steam-cloud', identity)
  try {
    await mkdir(directory, { recursive: true })
    const released = 'IDSWEB1:released-classic', modern = 'IDLEDS:modern-progress'
    await writeFile(join(directory, 'current.idsw'), released)
    const { clouds } = bindSteamModeCloud({ userData, account: identity, identity: () => identity, choose: async () => 'local' })
    expect(await clouds.classic.readForUpgrade()).toBe(released)
    expect(await clouds.classic.read()).toBe(released)
    await clouds.classic.acknowledge(released)
    expect(await clouds.modern.read()).toBeNull()
    await clouds.modern.publish(modern)
    expect(await readFile(join(directory, 'modern-current.idsw'), 'utf8')).toBe(modern)
    expect(await readFile(join(directory, 'current.idsw'), 'utf8')).toBe(released)
    await expect(clouds.classic.publish(modern)).rejects.toThrow()
    await clouds.classic.publish('IDSWEB1:classic-earned')
    expect(await readFile(join(directory, 'backup-1.idsw'), 'utf8')).toBe(released)
    const reopened = bindSteamModeCloud({ userData, account: identity, identity: () => identity, choose: async () => 'local' }).clouds
    expect(await reopened.classic.read()).toBeNull()
    expect(await reopened.modern.read()).toBeNull()
    identity = '76561198000000002'
    await expect(reopened.modern.publish('IDLEDS:wrong-account')).rejects.toThrow('account changed')
    expect(await readFile(join(directory, 'modern-current.idsw'), 'utf8')).toBe(modern)
  } finally { await rm(userData, { recursive: true, force: true }) }
})
