import { useSyncExternalStore } from 'react'
import type { GameAudioService } from './contracts'

export function useAudioSettings(audio: GameAudioService) {
  return useSyncExternalStore(
    (listener) => audio.subscribe(listener),
    () => audio.settings(),
    () => audio.settings(),
  )
}
