import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { attachSteamPresentation } from '../hosts/electron/steam/presentation.mjs'
type Frame = { isEmpty: () => boolean; getSize: () => { width: number; height: number }; toBitmap: () => Buffer }
function fixture(capture: () => Promise<Frame> = () => Promise.resolve({ isEmpty: () => false, getSize: () => ({ width: 2, height: 2 }), toBitmap: () => Buffer.alloc(16) })) {
  const window = Object.assign(new EventEmitter(), {
    getNativeWindowHandle: () => Buffer.alloc(8), isDestroyed: () => false,
    isVisible: () => true, isMinimized: () => false,
    webContents: { capturePage: vi.fn(capture) },
  })
  const native = { metalAttach: vi.fn(), metalFrame: vi.fn(), metalPaused: vi.fn(), metalDetach: vi.fn() }
  return { window, native }
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
describe('Steam native presentation lifecycle', () => {
  it('does not attach on other platforms', () => {
    const { window, native } = fixture()
    attachSteamPresentation(window, native, { platform: 'win32' })()
    expect(native.metalAttach).not.toHaveBeenCalled()
  })
  it('keeps at most one capture in flight and discards a frame completed after close', async () => {
    vi.useFakeTimers()
    let complete!: (value: Frame) => void
    const { window, native } = fixture(() => new Promise(resolve => { complete = resolve }))
    attachSteamPresentation(window, native, { platform: 'darwin' })
    await vi.advanceTimersByTimeAsync(200)
    expect(window.webContents.capturePage).toHaveBeenCalledTimes(1)
    window.emit('closed')
    complete({ isEmpty: () => false, getSize: () => ({ width: 2, height: 2 }), toBitmap: () => Buffer.alloc(16) })
    await vi.advanceTimersByTimeAsync(100)
    expect(native.metalFrame).not.toHaveBeenCalled()
    expect(native.metalDetach).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('pauses rendering and capture while minimized, then resumes', async () => {
    vi.useFakeTimers()
    const { window, native } = fixture()
    let minimized = true
    window.isMinimized = () => minimized
    const stop = attachSteamPresentation(window, native, { platform: 'darwin' })
    await vi.advanceTimersByTimeAsync(100)
    expect(window.webContents.capturePage).not.toHaveBeenCalled()
    expect(native.metalPaused).toHaveBeenLastCalledWith(true)
    minimized = false
    await vi.advanceTimersByTimeAsync(40)
    expect(native.metalFrame).toHaveBeenCalled()
    expect(native.metalPaused).toHaveBeenLastCalledWith(false)
    stop()
  })
  it('removes native presentation after a capture failure so Chromium remains usable', async () => {
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { window, native } = fixture(() => Promise.reject(new Error('GPU unavailable')))
    attachSteamPresentation(window, native, { platform: 'darwin' })
    await vi.advanceTimersByTimeAsync(100)
    expect(native.metalDetach).toHaveBeenCalledTimes(1)
    expect(window.webContents.capturePage).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
