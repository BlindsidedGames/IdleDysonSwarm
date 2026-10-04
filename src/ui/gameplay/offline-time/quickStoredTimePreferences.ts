import { formatNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { useMemo, useSyncExternalStore } from 'react'
import { readPresentationPreference, writePresentationPreference } from '../../presentationPreferences'

const KEY = 'idle-dyson-swarm:quick-stored-time-minutes'
const CHANGED = `${KEY}:changed`
const DEFAULT_MINUTES = [1, 10, 60] as const
export const MAXIMUM_QUICK_MINUTES = 92_160

function subscribe(listener: () => void) {
  window.addEventListener(CHANGED, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(CHANGED, listener)
    window.removeEventListener('storage', listener)
  }
}
const read = () => readPresentationPreference(KEY)
const serverSnapshot = () => null

export function useQuickStoredTimeAmounts() {
  const stored = useSyncExternalStore(subscribe, read, serverSnapshot)
  const minutes = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(stored ?? '')
      if (Array.isArray(parsed) && parsed.length === 3 && parsed.every(validMinutes)) return parsed as number[]
    } catch { /* A missing or damaged device preference uses the ordinary defaults. */ }
    return DEFAULT_MINUTES
  }, [stored])
  const setMinutes = (slot: number, value: number) => {
    if (!validMinutes(value) || !Number.isInteger(slot) || slot < 0 || slot >= 3) return
    writePresentationPreference(KEY, JSON.stringify(minutes.map((current, index) => index === slot ? value : current)))
    window.dispatchEvent(new Event(CHANGED))
  }
  return { minutes, seconds: minutes.map(value => value * 60), setMinutes }
}
function validMinutes(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAXIMUM_QUICK_MINUTES
}

/** Quick actions are configured as whole minutes; retain compact units for every amount. */
export function formatQuickStoredTime(locale: EnabledLocale, seconds: number): string {
  const minutes = seconds / 60
  return minutes % 60 === 0
    ? `${formatNumber(locale, minutes / 60)}HR`
    : `${formatNumber(locale, minutes)}M`
}
