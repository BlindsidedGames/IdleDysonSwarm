import { describe, expect, test, vi } from 'vitest'
import type { LifecycleAdapter, LifecyclePhase } from '../platform/contracts'
import type { AudioBackend, AudioSettings } from './contracts'
import { ProductionGameAudioService } from './gameAudioService'
import { AUDIO_SETTINGS_STORAGE_KEY } from './settings'

class TestLifecycle implements LifecycleAdapter {
  phase: LifecyclePhase = 'active'
  listener: ((phase: LifecyclePhase) => void) | undefined
  currentPhase() { return this.phase }
  subscribe(listener: (phase: LifecyclePhase) => void) {
    this.listener = listener
    return () => { this.listener = undefined }
  }
  emit(phase: LifecyclePhase) {
    this.phase = phase
    this.listener?.(phase)
  }
}

function backend(): AudioBackend & Record<string, ReturnType<typeof vi.fn>> {
  return {
    target: 'browser',
    prepare: vi.fn(() => Promise.resolve()),
    playMusic: vi.fn(() => Promise.resolve()),
    pauseMusic: vi.fn(() => Promise.resolve()),
    setVolumes: vi.fn((_settings: Readonly<AudioSettings>) => Promise.resolve()),
    playButton: vi.fn(() => Promise.resolve()),
    recoverOutput: vi.fn(() => Promise.resolve()),
    destroy: vi.fn(() => Promise.resolve()),
  }
}

describe('ProductionGameAudioService', () => {
  test('loads Unity-equivalent defaults and initializes/preloads only once', async () => {
    const audioBackend = backend()
    const service = new ProductionGameAudioService({
      backend: audioBackend,
      lifecycle: new TestLifecycle(),
    })
    expect(service.settings()).toEqual({ musicVolume: 0.7, effectsVolume: 0.5, muted: false })
    await Promise.all([service.initialize(), service.initialize()])
    expect(audioBackend.prepare).toHaveBeenCalledTimes(1)
    expect(audioBackend.setVolumes).toHaveBeenCalledWith(service.settings())
    expect(audioBackend.playMusic).not.toHaveBeenCalled()
  })

  test('persists clamped device-only settings independently of gameplay saves', async () => {
    const values = new Map<string, string>()
    const service = new ProductionGameAudioService({
      backend: backend(),
      lifecycle: new TestLifecycle(),
      storage: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => { values.set(key, value) },
      },
    })
    await service.update({ musicVolume: 4, effectsVolume: -1, muted: true })
    expect(JSON.parse(values.get(AUDIO_SETTINGS_STORAGE_KEY) ?? '')).toEqual({
      musicVolume: 1,
      effectsVolume: 0,
      muted: true,
    })
  })

  test('starts once from a semantic gesture and prevents duplicate music requests', async () => {
    const audioBackend = backend()
    let finishPlay: (() => void) | undefined
    audioBackend.playMusic.mockImplementation(() => new Promise<void>((resolve) => { finishPlay = resolve }))
    const service = new ProductionGameAudioService({ backend: audioBackend, lifecycle: new TestLifecycle() })
    const first = service.semanticAction()
    const second = service.semanticAction()
    await vi.waitFor(() => expect(audioBackend.playMusic).toHaveBeenCalledTimes(1))
    finishPlay?.()
    await Promise.all([first, second])
    expect(audioBackend.playButton).toHaveBeenCalledTimes(2)
  })

  test('pauses in background and resumes only prior playback intent', async () => {
    const lifecycle = new TestLifecycle()
    const audioBackend = backend()
    const service = new ProductionGameAudioService({ backend: audioBackend, lifecycle })
    await service.initialize()
    lifecycle.emit('background')
    await vi.waitFor(() => expect(audioBackend.pauseMusic).toHaveBeenCalledTimes(1))
    lifecycle.emit('active')
    await Promise.resolve()
    expect(audioBackend.playMusic).not.toHaveBeenCalled()
    await service.semanticAction()
    lifecycle.emit('background')
    lifecycle.emit('active')
    await vi.waitFor(() => expect(audioBackend.playMusic).toHaveBeenCalledTimes(2))
  })

  test('does not pause or replay music on browser focus-lost', async () => {
    const lifecycle = new TestLifecycle()
    const audioBackend = backend()
    const service = new ProductionGameAudioService({ backend: audioBackend, lifecycle })

    await service.semanticAction()
    expect(audioBackend.playMusic).toHaveBeenCalledTimes(1)

    lifecycle.emit('focus-lost')
    await Promise.resolve()
    expect(audioBackend.pauseMusic).toHaveBeenCalledTimes(0)
    expect(audioBackend.playMusic).toHaveBeenCalledTimes(1)

    lifecycle.emit('active')
    await Promise.resolve()
    expect(audioBackend.playMusic).toHaveBeenCalledTimes(1)
  })

  test('reconciles a rapid background/active cycle after an in-flight start', async () => {
    const lifecycle = new TestLifecycle()
    const audioBackend = backend()
    let finishPlay: (() => void) | undefined
    audioBackend.playMusic.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishPlay = resolve
    }))
    const service = new ProductionGameAudioService({ backend: audioBackend, lifecycle })
    const starting = service.semanticAction()
    await vi.waitFor(() => expect(audioBackend.playMusic).toHaveBeenCalledTimes(1))
    lifecycle.emit('background')
    lifecycle.emit('active')
    finishPlay?.()
    await starting
    await vi.waitFor(() => expect(audioBackend.playMusic).toHaveBeenCalledTimes(2))
    expect(audioBackend.pauseMusic).toHaveBeenCalled()
  })

  test('only explicit music settings re-arm a native output-removal latch', async () => {
    const audioBackend = backend()
    const service = new ProductionGameAudioService({ backend: audioBackend, lifecycle: new TestLifecycle() })
    await service.semanticAction()
    expect(audioBackend.recoverOutput).not.toHaveBeenCalled()
    await service.update({ effectsVolume: 0.4 })
    expect(audioBackend.recoverOutput).not.toHaveBeenCalled()
    await service.update({ musicVolume: 0.6 })
    expect(audioBackend.recoverOutput).toHaveBeenCalledTimes(1)
  })

  test('falls back safely when preload and playback fail', async () => {
    const audioBackend = backend()
    audioBackend.prepare.mockRejectedValue(new Error('missing asset'))
    audioBackend.playMusic.mockRejectedValue(new Error('autoplay blocked'))
    audioBackend.playButton.mockRejectedValue(new Error('decode failed'))
    const service = new ProductionGameAudioService({ backend: audioBackend, lifecycle: new TestLifecycle() })
    await expect(service.initialize()).resolves.toBeUndefined()
    await expect(service.semanticAction()).resolves.toBeUndefined()
  })
})
