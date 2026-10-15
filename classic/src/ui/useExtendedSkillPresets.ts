import { useSyncExternalStore } from 'react'
import {
  SKILL_PRESET_COUNT,
  SKILL_PRESET_ROW_SIZE,
} from '../game-state/skillPresetSlots'
import {
  readBooleanPresentationPreference,
  writeBooleanPresentationPreference,
} from './presentationPreferences'

const KEY = 'idle-dyson-swarm.skills.extended-presets.v1'
const EVENT = 'ids-extended-presets-changed'
// Preserve the toggle for this session even when device storage is unavailable.
let sessionValue: boolean | undefined

function read() {
  return sessionValue ?? readBooleanPresentationPreference(KEY)
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) {
      sessionValue = undefined
      listener()
    }
  }
  window.addEventListener(EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}

function setEnabled(enabled: boolean) {
  sessionValue = enabled
  writeBooleanPresentationPreference(KEY, enabled)
  window.dispatchEvent(new Event(EVENT))
}

export function useExtendedSkillPresets() {
  const enabled = useSyncExternalStore(subscribe, read, () => false)
  return {
    enabled,
    setEnabled,
    visibleCount: enabled ? SKILL_PRESET_COUNT : SKILL_PRESET_ROW_SIZE,
  }
}
