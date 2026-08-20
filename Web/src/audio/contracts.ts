import type { LifecycleAdapter, RuntimeTarget } from '../platform/contracts'

export const DEFAULT_AUDIO_SETTINGS = Object.freeze({
  musicVolume: 0.7,
  effectsVolume: 0.5,
  muted: false,
})

export interface AudioSettings {
  readonly musicVolume: number
  readonly effectsVolume: number
  readonly muted: boolean
}

export interface AudioBackend {
  readonly target: RuntimeTarget
  prepare(): Promise<void>
  playMusic(): Promise<void>
  pauseMusic(): Promise<void>
  setVolumes(settings: Readonly<AudioSettings>): Promise<void>
  playButton(): Promise<void>
  recoverOutput?(): Promise<void>
  destroy(): Promise<void>
}

export interface GameAudioService {
  readonly target: RuntimeTarget
  initialize(): Promise<void>
  settings(): Readonly<AudioSettings>
  subscribe(listener: () => void): () => void
  update(settings: Partial<AudioSettings>): Promise<void>
  semanticAction(): Promise<void>
  setMusicIntended(playing: boolean): Promise<void>
  destroy(): Promise<void>
}

export interface AudioServiceOptions {
  readonly backend: AudioBackend
  readonly lifecycle: LifecycleAdapter
  readonly storage?: Pick<Storage, 'getItem' | 'setItem'>
}
