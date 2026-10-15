import { DEFAULT_AUDIO_SETTINGS, type AudioSettings } from './contracts'

export const AUDIO_SETTINGS_STORAGE_KEY = 'idle-dyson-swarm.audio.v1'

export function loadAudioSettings(
  storage?: Pick<Storage, 'getItem'>,
): Readonly<AudioSettings> {
  if (storage === undefined) return DEFAULT_AUDIO_SETTINGS
  try {
    const parsed = JSON.parse(storage.getItem(AUDIO_SETTINGS_STORAGE_KEY) ?? '') as Partial<AudioSettings>
    return normalizeAudioSettings(parsed)
  } catch {
    return DEFAULT_AUDIO_SETTINGS
  }
}

export function saveAudioSettings(
  storage: Pick<Storage, 'setItem'> | undefined,
  settings: Readonly<AudioSettings>,
): void {
  try {
    storage?.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Audio preferences are optional when device storage is unavailable.
  }
}

export function normalizeAudioSettings(
  value: Partial<AudioSettings>,
): Readonly<AudioSettings> {
  return Object.freeze({
    musicVolume: volume(value.musicVolume, DEFAULT_AUDIO_SETTINGS.musicVolume),
    effectsVolume: volume(value.effectsVolume, DEFAULT_AUDIO_SETTINGS.effectsVolume),
    muted: typeof value.muted === 'boolean' ? value.muted : DEFAULT_AUDIO_SETTINGS.muted,
  })
}

function volume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback
}
