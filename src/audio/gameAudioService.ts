import type { LifecyclePhase } from '../platform/contracts'
import {
  type AudioServiceOptions,
  type AudioSettings,
  type GameAudioService,
} from './contracts'
import {
  loadAudioSettings,
  normalizeAudioSettings,
  saveAudioSettings,
} from './settings'

export class ProductionGameAudioService implements GameAudioService {
  readonly target
  private currentSettings: Readonly<AudioSettings>
  private intended = false
  private active = true
  private initialized: Promise<void> | undefined
  private playRequest: Promise<void> | undefined
  private playRequestRevision = -1
  private stateRevision = 0
  private unsubscribeLifecycle: (() => void) | undefined
  private readonly listeners = new Set<() => void>()
  private readonly options: Readonly<AudioServiceOptions>

  constructor(options: Readonly<AudioServiceOptions>) {
    this.options = options
    this.target = options.backend.target
    this.currentSettings = loadAudioSettings(options.storage)
    this.active = options.lifecycle.currentPhase() === 'active'
  }

  settings(): Readonly<AudioSettings> {
    return this.currentSettings
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  initialize(): Promise<void> {
    this.initialized ??= this.initializeOnce()
    return this.initialized
  }

  async update(patch: Partial<AudioSettings>): Promise<void> {
    this.currentSettings = normalizeAudioSettings({
      ...this.currentSettings,
      ...patch,
    })
    saveAudioSettings(this.options.storage, this.currentSettings)
    await this.initialize()
    if (patch.musicVolume !== undefined || patch.muted === false) {
      await this.options.backend.recoverOutput?.().catch(() => undefined)
    }
    await this.options.backend.setVolumes(this.currentSettings).catch(() => undefined)
    if (!this.currentSettings.muted) await this.resumeIfIntended()
    for (const listener of this.listeners) listener()
  }

  async semanticAction(): Promise<void> {
    await this.initialize()
    if (!this.intended) {
      this.intended = true
    }
    // A previous Browser attempt may have been blocked by autoplay policy;
    // every real semantic gesture is a valid, deduplicated recovery point.
    await this.resumeIfIntended()
    await this.options.backend.playButton().catch(() => undefined)
  }

  async setMusicIntended(playing: boolean): Promise<void> {
    this.stateRevision += 1
    this.intended = playing
    await this.initialize()
    if (playing) {
      await this.options.backend.recoverOutput?.().catch(() => undefined)
      await this.resumeIfIntended()
    }
    else await this.options.backend.pauseMusic().catch(() => undefined)
  }

  async destroy(): Promise<void> {
    this.intended = false
    this.unsubscribeLifecycle?.()
    this.unsubscribeLifecycle = undefined
    await this.options.backend.destroy().catch(() => undefined)
  }

  private async initializeOnce(): Promise<void> {
    this.unsubscribeLifecycle = this.options.lifecycle.subscribe((phase) => {
      void this.lifecycleChanged(phase)
    })
    await this.options.backend.prepare().catch(() => undefined)
    await this.options.backend.setVolumes(this.currentSettings).catch(() => undefined)
  }

  private async lifecycleChanged(phase: LifecyclePhase): Promise<void> {
    const revision = ++this.stateRevision
    this.active = phase === 'active'
    if (!this.active) {
      await this.options.backend.pauseMusic().catch(() => undefined)
      await this.playRequest?.catch(() => undefined)
      if (revision === this.stateRevision && !this.active) {
        await this.options.backend.pauseMusic().catch(() => undefined)
      }
      return
    }
    await this.resumeIfIntended()
  }

  private async resumeIfIntended(): Promise<void> {
    if (!this.active || !this.intended || this.currentSettings.muted) return
    const revision = this.stateRevision
    if (this.playRequest !== undefined) {
      const pendingRevision = this.playRequestRevision
      await this.playRequest
      if (
        revision !== this.stateRevision ||
        !this.active ||
        !this.intended ||
        this.currentSettings.muted
      ) return
      if (pendingRevision === revision) return
    }
    this.playRequestRevision = revision
    this.playRequest = this.options.backend.playMusic()
      .catch(() => undefined)
      .finally(() => { this.playRequest = undefined })
    return this.playRequest
  }
}
