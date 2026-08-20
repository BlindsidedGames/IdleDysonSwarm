import { registerPlugin } from '@capacitor/core'
import type { AudioBackend, AudioSettings } from './contracts'

interface IdleDysonAudioPlugin {
  prepare(request: { musicAsset: string; buttonAsset: string }): Promise<void>
  playMusic(): Promise<void>
  pauseMusic(): Promise<void>
  setVolumes(request: AudioSettings): Promise<void>
  playButton(): Promise<void>
  recoverOutput(): Promise<void>
  release(): Promise<void>
}

const plugin = registerPlugin<IdleDysonAudioPlugin>('IdleDysonAudio')

export class CapacitorAudioBackend implements AudioBackend {
  readonly target: 'ios' | 'android'

  constructor(target: 'ios' | 'android') {
    this.target = target
  }

  prepare(): Promise<void> {
    return plugin.prepare({
      musicAsset: 'public/audio/ids-soundtrack.m4a',
      buttonAsset: this.target === 'ios'
        ? 'public/audio/button.wav'
        : 'public/audio/button.ogg',
    })
  }

  playMusic(): Promise<void> { return plugin.playMusic() }
  pauseMusic(): Promise<void> { return plugin.pauseMusic() }
  setVolumes(settings: Readonly<AudioSettings>): Promise<void> {
    return plugin.setVolumes({ ...settings })
  }
  playButton(): Promise<void> { return plugin.playButton() }
  recoverOutput(): Promise<void> { return plugin.recoverOutput() }
  destroy(): Promise<void> { return plugin.release() }
}
