import { Capacitor } from '@capacitor/core'
import { setNativeScreenOrientation } from './nativeHostBridge'
import { readPresentationPreference, writePresentationPreference } from '../ui/presentationPreferences'

export type OrientationPreference = 'auto' | 'portrait' | 'landscape'
const KEY = 'ids.screen-orientation'
interface OrientationPlugin { setOrientation(options: { orientation: OrientationPreference }): Promise<void> }
const plugin: OrientationPlugin = { setOrientation: setNativeScreenOrientation }
export const orientationAvailable = () => Capacitor.isNativePlatform() && ['ios', 'android'].includes(Capacitor.getPlatform())
export function readOrientationPreference(): OrientationPreference {
  const value = readPresentationPreference(KEY)
  return value === 'portrait' || value === 'landscape' ? value : 'auto'
}
export async function applyOrientationPreference(value: OrientationPreference, native: OrientationPlugin = plugin): Promise<void> {
  await native.setOrientation({ orientation: value })
  writePresentationPreference(KEY, value)
}
export async function restoreScreenOrientation(): Promise<void> {
  if (!orientationAvailable()) return
  try { await applyOrientationPreference(readOrientationPreference()) }
  catch { console.warn('Could not restore the screen orientation preference.') }
}
