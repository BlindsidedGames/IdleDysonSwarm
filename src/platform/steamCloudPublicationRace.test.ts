import { beforeEach, expect, test, vi } from 'vitest'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

// Real provider, with filesystem primitives controlled to admit another device's
// bytes at genuine asynchronous rotation/fsync boundaries. No account I/O.
const memory = vi.hoisted(() => ({ files: new Map<string, string>(),
  onRename: undefined as ((to: string) => void) | undefined,
  onSync: undefined as ((path: string) => void) | undefined }))
vi.mock('node:fs', async original => ({ ...await original<typeof import('node:fs')>(), realpathSync: (path: string) => path, mkdirSync: () => {} }))
vi.mock('node:fs/promises', () => ({
  mkdir: async () => {}, lstat: async () => ({ isSymbolicLink: () => false }),
  stat: async (path: string) => {
    if (!memory.files.has(path)) throw Object.assign(Error('missing'), { code: 'ENOENT' })
    return { size: Buffer.byteLength(memory.files.get(path)!) }
  },
  readFile: async (path: string) => {
    if (!memory.files.has(path)) throw Object.assign(Error('missing'), { code: 'ENOENT' })
    return memory.files.get(path)!
  },
  open: async (path: string) => ({ writeFile: async (text: string) => { memory.files.set(path, text) },
    sync: async () => { memory.onSync?.(path) }, close: async () => {} }),
  rename: async (from: string, to: string) => {
    memory.files.set(to, memory.files.get(from)!); memory.files.delete(from); memory.onRename?.(to)
  },
  unlink: async (path: string) => { memory.files.delete(path) },
}))
import { SteamCloud } from '../../hosts/electron/steam/cloud.mjs'
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
beforeEach(() => { memory.files.clear(); memory.onRename = undefined; memory.onSync = undefined })

test.each(['backup-rotation', 'current-temporary-fsync', 'marker-temporary-fsync'] as const)('new remote bytes arriving during %s survive without a new acknowledgement', async boundary => {
  const account = '76561198000000000'
  const cloud = new SteamCloud({ userData: '/synthetic-cloud-publication', account, identity: () => account, choose: async () => 'cloud' })
  const current = join(cloud.directory, 'current.idsw'), initial = 'IDSWEB1:previous', desired = 'IDSWEB1:local-next', newer = 'IDSWEB1:remote-newer'
  memory.files.set(current, initial); memory.files.set(cloud.marker, hash(initial))
  expect(await cloud.read()).toBeNull()
  memory.onRename = to => { if (boundary === 'backup-rotation' && to === join(cloud.directory, 'backup-1.idsw')) memory.files.set(current, newer) }
  memory.onSync = path => {
    const target = boundary === 'current-temporary-fsync' ? current : boundary === 'marker-temporary-fsync' ? cloud.marker : undefined
    if (target !== undefined && path.startsWith(target + '.') && path.endsWith('.tmp')) memory.files.set(current, newer)
  }
  await expect(cloud.publish(desired)).rejects.toThrow('Cloud changed')
  expect(memory.files.get(current)).toBe(newer)
  expect(memory.files.get(cloud.marker)).toBe(hash(initial))
  expect([...memory.files.keys()].filter(path => path.endsWith('.tmp'))).toEqual([])
  expect(await cloud.read()).toBe(newer)
})
