import { Capacitor } from '@capacitor/core'
import { useEffect, useSyncExternalStore } from 'react'
import { readPresentationPreference, writePresentationPreference } from './presentationPreferences'

const KEY = 'idle-dyson-swarm:desktop-interface-scale'
const CHANGED = `${KEY}:changed`
export const MINIMUM_INTERFACE_SCALE = 0.8
export const MAXIMUM_INTERFACE_SCALE = 1.5

export function isDesktopPresentation() {
  const userAgent = globalThis.navigator?.userAgent ?? ''
  return Capacitor.getPlatform() === 'web' && !/Android|iPhone|iPad|iPod/i.test(userAgent) &&
    !(/Macintosh/i.test(userAgent) && (globalThis.navigator?.maxTouchPoints ?? 0) > 1)
}
function subscribe(listener: () => void) {
  window.addEventListener(CHANGED, listener)
  window.addEventListener('storage', listener)
  return () => { window.removeEventListener(CHANGED, listener); window.removeEventListener('storage', listener) }
}
function readScale() {
  const value = Number(readPresentationPreference(KEY))
  return Number.isFinite(value) && value >= MINIMUM_INTERFACE_SCALE && value <= MAXIMUM_INTERFACE_SCALE ? value : 1
}
const serverSnapshot = () => 1
export function useDesktopInterfaceScale() {
  const scale = useSyncExternalStore(subscribe, readScale, serverSnapshot)
  const enabled = isDesktopPresentation()
  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    root.style.fontSize = `${scale * 100}%`
  }, [enabled, scale])
  const setScale = (value: number) => {
    if (!Number.isFinite(value) || value < MINIMUM_INTERFACE_SCALE || value > MAXIMUM_INTERFACE_SCALE) return
    writePresentationPreference(KEY, String(value))
    window.dispatchEvent(new Event(CHANGED))
  }
  return { enabled, scale, setScale }
}
