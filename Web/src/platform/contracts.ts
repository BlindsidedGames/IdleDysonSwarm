import {
  type LegacySaveCandidate,
  type SaveStorageAdapter,
} from '../save/repository'

export type RuntimeTarget = 'browser' | 'electron' | 'ios' | 'android'

export interface PlatformIdentity {
  readonly target: RuntimeTarget
  readonly applicationId: 'com.blindsidedgames.idledysonswarm'
  readonly canDiscoverUnitySaveWithoutPrompt: boolean
}

export type LifecyclePhase =
  | 'active'
  | 'background'
  | 'focus-lost'
  | 'terminating'

export interface LifecycleAdapter {
  currentPhase(): LifecyclePhase
  subscribe(listener: (phase: LifecyclePhase) => void): () => void
}

export interface AchievementAdapter {
  readonly available: boolean
  isUnlocked(id: string): Promise<boolean>
  unlock(id: string): Promise<void>
  setIntegerStat(id: string, value: number): Promise<void>
  setFloatStat(id: string, value: number): Promise<void>
  indicateProgress(id: string, current: number, maximum: number): Promise<void>
  flush(): Promise<void>
}

export interface PresenceAdapter {
  readonly available: boolean
  setStatus(status: string): Promise<void>
  clear(): Promise<void>
}

export interface ClipboardAdapter {
  readText(): Promise<string>
  writeText(value: string): Promise<void>
}

export interface ExternalNavigationAdapter {
  openUrl(url: string): Promise<void>
}

export interface DisplayAdapter {
  readonly safeAreaInsets: {
    readonly top: number
    readonly right: number
    readonly bottom: number
    readonly left: number
  }
  setFullscreen(enabled: boolean): Promise<void>
}

export interface PlatformServices {
  readonly identity: PlatformIdentity
  readonly saves: SaveStorageAdapter
  readonly lifecycle: LifecycleAdapter
  readonly achievements: AchievementAdapter
  readonly presence: PresenceAdapter
  readonly clipboard: ClipboardAdapter
  readonly navigation: ExternalNavigationAdapter
  readonly display: DisplayAdapter
  discoverLegacySaves(): Promise<readonly LegacySaveCandidate[]>
}
