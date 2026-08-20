import type { AudioBackend, AudioSettings } from './contracts'

export class WebAudioBackend implements AudioBackend {
  readonly target
  private music: HTMLAudioElement | undefined
  private context: AudioContext | undefined
  private buttonBuffer: AudioBuffer | undefined
  private prepareRequest: Promise<void> | undefined
  private lastButtonAt = -Infinity
  private settings: Readonly<AudioSettings> = {
    musicVolume: 0.7,
    effectsVolume: 0.5,
    muted: false,
  }
  private readonly buttonUrl: string

  constructor(
    target: 'browser' | 'electron',
    musicUrl: string,
    buttonUrl: string,
  ) {
    this.target = target
    this.buttonUrl = buttonUrl
    this.musicUrl = musicUrl
  }

  prepare(): Promise<void> {
    this.prepareRequest ??= this.prepareOnce()
    return this.prepareRequest
  }

  async playMusic(): Promise<void> {
    if (this.music === undefined || !this.music.paused) return
    await this.music.play()
  }

  async pauseMusic(): Promise<void> {
    this.music?.pause()
  }

  async setVolumes(settings: Readonly<AudioSettings>): Promise<void> {
    this.settings = settings
    if (this.music !== undefined) {
      this.music.volume = settings.muted ? 0 : settings.musicVolume
      if (settings.muted) this.music.pause()
    }
  }

  async playButton(): Promise<void> {
    if (this.settings.muted || this.settings.effectsVolume <= 0) return
    const now = performance.now()
    if (now - this.lastButtonAt < 35) return
    this.lastButtonAt = now
    await this.prepare()
    if (this.context === undefined || this.buttonBuffer === undefined) return
    if (this.context.state === 'suspended') await this.context.resume()
    const source = this.context.createBufferSource()
    const gain = this.context.createGain()
    source.buffer = this.buttonBuffer
    gain.gain.value = this.settings.effectsVolume
    source.connect(gain).connect(this.context.destination)
    const disconnect = () => {
      source.disconnect()
      gain.disconnect()
    }
    source.addEventListener('ended', disconnect, { once: true })
    try {
      source.start()
    } catch (error) {
      source.removeEventListener('ended', disconnect)
      disconnect()
      throw error
    }
  }

  async destroy(): Promise<void> {
    this.music?.pause()
    this.music?.removeAttribute('src')
    this.music?.load()
    await this.context?.close()
  }

  private async prepareOnce(): Promise<void> {
    this.music = new Audio(this.musicUrl)
    this.music.loop = true
    this.music.preload = 'auto'
    this.music.volume = this.settings.muted ? 0 : this.settings.musicVolume
    const AudioContextConstructor = window.AudioContext
    if (AudioContextConstructor === undefined) return
    this.context = new AudioContextConstructor()
    const response = await fetch(this.buttonUrl)
    if (!response.ok) throw new Error('Button audio could not be loaded.')
    this.buttonBuffer = await this.context.decodeAudioData(await response.arrayBuffer())
  }

  private readonly musicUrl: string
}
