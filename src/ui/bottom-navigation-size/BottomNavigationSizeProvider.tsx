import { useMemo, useSyncExternalStore, type ReactNode } from 'react'
import {
  BottomNavigationSizeContext,
  type BottomNavigationSizeContextValue,
} from './context'
import { BottomNavigationSizePreferenceService } from './preference'

export function BottomNavigationSizeProvider({
  preference,
  children,
}: {
  readonly preference: BottomNavigationSizePreferenceService
  readonly children: ReactNode
}) {
  const size = useSyncExternalStore(
    preference.subscribe,
    preference.getSnapshot,
    preference.getSnapshot,
  )
  const value = useMemo<BottomNavigationSizeContextValue>(() => ({
    size,
    setSize: (next) => preference.setSize(next),
  }), [preference, size])
  return (
    <BottomNavigationSizeContext.Provider value={value}>
      {children}
    </BottomNavigationSizeContext.Provider>
  )
}
