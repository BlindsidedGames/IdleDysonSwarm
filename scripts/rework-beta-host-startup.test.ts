import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test, vi } from 'vitest'

const state = vi.hoisted(() => ({
  root: '', repo: '', account: '76561198000000000', windows: 0,
  handlers: new Map<string, (...args: unknown[]) => Promise<unknown>>(),
  items: [] as { itemDefId: number; instanceId: string; quantity: number }[],
  charges: [] as number[],
  cloud: vi.fn(), publication: vi.fn(),
}))
vi.mock('electron', () => ({
  app: { isPackaged: false, getAppPath: () => state.repo,
    getPath: (name: string) => name === 'userData' ? state.root : join(state.root, name),
    requestSingleInstanceLock: () => true, whenReady: async () => undefined,
    on: () => undefined, quit: vi.fn(), exit: vi.fn(), getVersion: () => '4.1.11',
    commandLine: { appendSwitch: () => undefined } },
  BrowserWindow: class {
    webContents = { once: () => undefined, on: () => undefined, setWindowOpenHandler: () => undefined }
    constructor() { state.windows++ }
    on() {} once() {} removeMenu() {} loadFile = async () => undefined
    static getAllWindows() { return [] }
  },
  ipcMain: { handle: (name: string, handler: (...args: unknown[]) => Promise<unknown>) => state.handlers.set(name, handler) },
  powerMonitor: { on: () => undefined },
  session: { defaultSession: { setPermissionCheckHandler: () => undefined, setPermissionRequestHandler: () => undefined } },
  safeStorage: { isEncryptionAvailable: () => true,
    encryptString: (s: string) => Buffer.from('sandbox-vault:' + s),
    decryptString: (b: Buffer) => { const s = b.toString(); if (!s.startsWith('sandbox-vault:')) throw new Error('Invalid vault'); return s.slice(14) } },
  dialog: { showMessageBox: vi.fn(), showErrorBox: vi.fn() }, clipboard: {}, shell: {},
}))
vi.mock('../hosts/electron/steam/client.mjs', () => ({
  loadSteamClient: () => ({ native: { identity: () => state.account }, close: () => undefined }),
  createSteamPublication: state.publication,
}))
vi.mock('../hosts/electron/steam/cloud.mjs', () => ({ SteamCloud: state.cloud }))
vi.mock('../hosts/electron/steam/presentation.mjs', () => ({ attachSteamPresentation: () => undefined }))
vi.mock('../hosts/electron/steamInventoryBinding.mjs', () => ({
  loadSteamInventoryBinding: async () => ({
    getAuthenticatedSteamId: async () => state.account,
    getAllItems: async () => structuredClone(state.items),
    requestLocalizedPrices: async (ids: number[]) => ids.map(itemDefId => ({ itemDefId, localizedPrice: '$1.00' })),
    startPurchase: async (itemDefId: number) => {
      state.charges.push(itemDefId)
      state.items.push({ itemDefId, instanceId: String(itemDefId), quantity: 1 })
      return { status: 'completed' }
    },
  }),
}))

test.each(['76561198000000000', '76561198000000001'])('beta host isolates %s before save discovery and keeps simulated purchases/Restore active', async account => {
  const root = await mkdtemp(join(tmpdir(), 'ids-beta-host-'))
  state.root = root; state.repo = resolve(import.meta.dirname, '..'); state.account = account
  state.windows = 0; state.handlers.clear(); state.items = []; state.charges = []
  state.cloud.mockClear(); state.publication.mockClear()
  const publicFile = join(root, 'steam-offline', 'web-runtime-v1', 'save', 'idle_dyson_swarm_web_save.idsw')
  await mkdir(join(root, 'steam-offline', 'web-runtime-v1', 'save'), { recursive: true })
  await writeFile(publicFile, 'EXACT PUBLIC ORIGINAL')
  vi.stubEnv('VITE_IDS_DESKTOP_DISTRIBUTION', 'steam')
  try {
    vi.resetModules()
    await import('../hosts/electron/main.mjs')
    await vi.waitFor(() => expect(state.windows).toBe(1))
    const invoke = (name: string, ...args: unknown[]) => state.handlers.get(name)!(undefined, ...args)
    expect(await invoke('ids:native:unity:discover')).toEqual([])
    expect(state.cloud).not.toHaveBeenCalled(); expect(state.publication).not.toHaveBeenCalled()
    expect(await invoke('ids:native:metadata')).toMatchObject({
      saveStorageNamespace: 'idleds-rework-beta-v1', entitlementCacheNamespace: 'rework-beta-v1', cloudSavesEnabled: false,
    })
    await invoke('ids:native:files:write-text', 'save/probe.idsw', 'BETA ONLY')
    expect(await readFile(join(root, 'rework-beta-v1', 'steam-local', account, 'idleds-rework-beta-v1', 'save/probe.idsw'), 'utf8')).toBe('BETA ONLY')
    expect(await readFile(publicFile, 'utf8')).toBe('EXACT PUBLIC ORIGINAL')
    expect(await invoke('ids:native:store:products')).toEqual(expect.arrayContaining([expect.objectContaining({ productId: 'ids.botboost', available: true })]))
    expect(await invoke('ids:native:store:purchase', 'ids.botboost')).toMatchObject({ accepted: true })
    expect(state.charges).toEqual([1006])
    expect(await invoke('ids:native:store:restore')).toMatchObject({ restoredProductIds: expect.arrayContaining(['ids.botboost']) })
    state.account = account === '76561198000000000' ? '76561198000000001' : '76561198000000000'
    await expect(invoke('ids:native:files:write-text', 'save/probe.idsw', 'WRONG ACCOUNT')).rejects.toThrow('Steam account changed')
    expect(await readFile(publicFile, 'utf8')).toBe('EXACT PUBLIC ORIGINAL')
  } finally { vi.unstubAllEnvs(); await rm(root, { recursive: true, force: true }) }
})
