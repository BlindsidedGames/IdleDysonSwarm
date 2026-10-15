import { useMemo, useSyncExternalStore, type ReactNode } from 'react'
import {
  BottomNavigationTextContext,
  type BottomNavigationTextContextValue,
} from './context'
import { BottomNavigationTextPreferenceService } from './preference'

export function BottomNavigationTextProvider({
  preference,
  children,
}: {
  readonly preference: BottomNavigationTextPreferenceService
  readonly children: ReactNode
}) {
  const includeText = useSyncExternalStore(
    preference.subscribe,
    preference.getSnapshot,
    preference.getSnapshot,
  )
  const value = useMemo<BottomNavigationTextContextValue>(() => ({
    includeText,
    setIncludeText: (next) => preference.setIncludeText(next),
  }), [includeText, preference])
  return (
    <BottomNavigationTextContext.Provider value={value}>
      {children}
    </BottomNavigationTextContext.Provider>
  )
}
