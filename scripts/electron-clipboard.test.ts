import { EventEmitter } from 'node:events'
import * as filesystem from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { vi, expect, test } from 'vitest'

// Execute the shipped main and preload at their Electron transport boundary.
// File operations reach a disposable real directory; only Electron is simulated.
async function openElectronHost({ ownsLock = true } = {}) {
  const directory = await filesystem.mkdtemp(join(tmpdir(), 'ids-host-contract-'))
  const handlers = new Map<string, (...args: any[]) => any>()
  const ipcMain = Object.assign(new EventEmitter(), {
    handle: (channel: string, handler: (...args: any[]) => any) => handlers.set(channel, handler),
  })
  const clipboard = { writeText: vi.fn(async (_text: string) => undefined) }
  const windows: HostWindow[] = []
  const app = Object.assign(new EventEmitter(), {
    isPackaged: false,
    commandLine: { appendSwitch: vi.fn() },
    getPath: () => directory,
    requestSingleInstanceLock: vi.fn(() => ownsLock),
    whenReady: () => Promise.resolve(),
    quit: vi.fn(),
    exit: vi.fn(),
  })
  const permissions = {
    setPermissionCheckHandler: vi.fn(),
    setPermissionRequestHandler: vi.fn(),
  }
  class HostWindow extends EventEmitter {
    static getAllWindows = () => windows.filter((window) => !window.destroyed)
    destroyed = false
    minimized = false
    focused = true
    readonly ipcRenderer = Object.assign(new EventEmitter(), {
      invoke: (channel: string, ...args: any[]) => handlers.get(channel)!({ sender: this.webContents, senderFrame: this.mainFrame }, ...args),
      send: (channel: string, ...args: any[]) => ipcMain.emit(channel, { sender: this.webContents, senderFrame: this.mainFrame }, ...args),
    })
    host: any
    copyClickListener?: (event: any) => void
    readonly mainFrame = { url: new URL('../dist-native/index.html', import.meta.url).href }
    withCopyClick = <T>(operation: () => T, trusted = true) => {
      this.copyClickListener?.({ isTrusted: trusted, target: { closest: () => ({}) } })
      return operation()
    }
    readonly webContents = Object.assign(new EventEmitter(), {
      id: windows.length + 1,
      isDestroyed: () => this.destroyed,
      send: vi.fn((channel: string, ...args: any[]) => this.ipcRenderer.emit(channel, {}, ...args)),
      setWindowOpenHandler: vi.fn(),
      getURL: () => this.mainFrame.url,
      mainFrame: this.mainFrame,
    })
    constructor(readonly options: any) {
      super()
      windows.push(this)
      runInNewContext(readFileSync(new URL('../hosts/electron/preload.cjs', import.meta.url), 'utf8'), {
        require: () => ({
          ipcRenderer: this.ipcRenderer,
          contextBridge: { exposeInMainWorld: (_key: string, host: any) => { this.host = host } },
        }),
        document: {
          addEventListener: (_type: string, listener: (event: any) => void) => { this.copyClickListener = listener },
          hasFocus: () => this.focused,
        },
        setTimeout,
        process: { argv: [] },
      })
    }
    loadFile = async () => undefined
    removeMenu = vi.fn()
    show = vi.fn()
    focus = vi.fn(() => { this.focused = true; this.emit('focus') })
    restore = vi.fn(() => { this.minimized = false; this.emit('restore') })
    isMinimized = () => this.minimized
    isFocused = () => this.focused
    isDestroyed = () => this.destroyed
    close = () => {
      let prevented = false
      this.emit('close', { preventDefault: () => { prevented = true } })
      if (!prevented) { this.destroyed = true; this.emit('closed') }
    }
  }
  vi.resetModules()
  vi.doMock('electron', () => ({
    app, clipboard, BrowserWindow: HostWindow, ipcMain,
    powerMonitor: new EventEmitter(), safeStorage: null,
    session: { defaultSession: permissions }, shell: { openExternal: vi.fn() }, dialog: {},
  }))
  await import('../hosts/electron/main.mjs')
  if (ownsLock) await vi.waitFor(() => {
    if (windows.length === 0) throw new Error('Host has not created a window')
  })
  return {
    app, clipboard, windows, permissions, ipcMain, directory,
    invokeFrom: (event: any, channel: string, ...args: any[]) => handlers.get(channel)!(event, ...args),
    invoke: (channel: string, ...args: any[]) => handlers.get(channel)!({}, ...args),
    async dispose() {
      vi.doUnmock('electron')
      vi.resetModules()
      await filesystem.rm(directory, { recursive: true, force: true })
    },
  }
}

test('permits one bounded plain-text write from a trusted Copy click in the owned foreground main frame', async () => {
    const owner = await openElectronHost()
    try {
      const window = owner.windows[0]
      const text = 'IDS preset: café\n<literal text>'
      await expect(window.host.writeClipboardText(text)).rejects.toThrow('Copy click')
      await expect(window.withCopyClick(() => window.host.writeClipboardText(text), false)).rejects.toThrow('Copy click')
      await window.withCopyClick(async () => { await Promise.resolve(); await window.host.writeClipboardText(text) })
      expect(owner.clipboard.writeText).toHaveBeenCalledExactlyOnceWith(text)
      await expect(window.host.writeClipboardText(text)).rejects.toThrow('Copy click')
      expect(window.host.readClipboardText).toBeUndefined()
      expect(window.host.invoke).toBeUndefined()
      window.withCopyClick(() => undefined)
      await new Promise((resolve) => setTimeout(resolve, 5))
      await expect(window.host.writeClipboardText(text)).rejects.toThrow('Copy click')
      const channel = 'ids:native:clipboard:write-text'
      const event = { sender: window.webContents, senderFrame: window.mainFrame }
      for (const invalid of [null, { text }, 'é'.repeat(16 * 1024 * 1024 + 1)]) {
        await expect(owner.invokeFrom(event, channel, invalid)).rejects.toThrow('plain text')
      }
      for (const source of [
        { sender: window.webContents },
        { sender: {}, senderFrame: window.mainFrame },
        { sender: window.webContents, senderFrame: { url: window.mainFrame.url } },
      ]) await expect(owner.invokeFrom(source, channel, text)).rejects.toThrow('active game window')
      window.mainFrame.url = 'https://example.com'
      await expect(owner.invokeFrom(event, channel, text)).rejects.toThrow('active game window')
      window.mainFrame.url = new URL('../dist-native/index.html', import.meta.url).href
      window.focused = false
      await expect(owner.invokeFrom(event, channel, text)).rejects.toThrow('active game window')
      expect(owner.clipboard.writeText).toHaveBeenCalledTimes(1)
      window.focused = true
      owner.clipboard.writeText.mockRejectedValueOnce(new Error('clipboard unavailable'))
      await expect(window.withCopyClick(() => window.host.writeClipboardText(text))).rejects.toThrow('clipboard unavailable')
    } finally { await owner.dispose() }
  })
