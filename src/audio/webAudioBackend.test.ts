// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest'
import { WebAudioBackend } from './webAudioBackend'

describe('WebAudioBackend', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('disconnects completed button cue graph nodes', async () => {
    const harness = installWebAudioHarness()
    const backend = new WebAudioBackend(
      'browser',
      '/audio/music.m4a',
      '/audio/button.ogg',
    )

    await backend.playButton()

    expect(harness.source.start).toHaveBeenCalledOnce()
    expect(harness.source.disconnect).not.toHaveBeenCalled()
    expect(harness.gain.disconnect).not.toHaveBeenCalled()

    harness.finish()

    expect(harness.source.disconnect).toHaveBeenCalledOnce()
    expect(harness.gain.disconnect).toHaveBeenCalledOnce()
  })

  test('disconnects button cue graph nodes when playback cannot start', async () => {
    const harness = installWebAudioHarness()
    harness.source.start.mockImplementation(() => {
      throw new Error('start failed')
    })
    const backend = new WebAudioBackend(
      'browser',
      '/audio/music.m4a',
      '/audio/button.ogg',
    )

    await expect(backend.playButton()).rejects.toThrow('start failed')
    expect(harness.source.disconnect).toHaveBeenCalledOnce()
    expect(harness.gain.disconnect).toHaveBeenCalledOnce()
  })
})

function installWebAudioHarness() {
  let ended: (() => void) | undefined
  const source = {
    buffer: null as AudioBuffer | null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      if (type === 'ended') ended = listener as () => void
    }),
    removeEventListener: vi.fn(),
  }
  const gain = {
    gain: { value: 0 },
    connect: vi.fn(() => gain),
    disconnect: vi.fn(),
  }
  source.connect.mockReturnValue(gain)
  class FakeAudio {
    paused = true
    loop = false
    preload = ''
    volume = 1
    play = vi.fn(() => Promise.resolve())
    pause = vi.fn()
    removeAttribute = vi.fn()
    load = vi.fn()
  }
  class FakeAudioContext {
    state = 'running'
    destination = {}
    createBufferSource = vi.fn(() => source)
    createGain = vi.fn(() => gain)
    decodeAudioData = vi.fn(() => Promise.resolve({} as AudioBuffer))
    resume = vi.fn(() => Promise.resolve())
    close = vi.fn(() => Promise.resolve())
  }
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  })))
  return {
    source,
    gain,
    finish() {
      if (ended === undefined) throw new Error('ended listener missing')
      ended()
    },
  }
}
