import {
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  NumberNotationContext,
  type NumberNotationContextValue,
} from './context'
import { NumberNotationPreferenceService } from './preference'

export function NumberNotationProvider({
  preference,
  children,
}: {
  readonly preference: NumberNotationPreferenceService
  readonly children: ReactNode
}) {
  const mode = useSyncExternalStore(
    preference.subscribe,
    preference.getSnapshot,
    preference.getSnapshot,
  )
  const value = useMemo<NumberNotationContextValue>(() => ({
    mode,
    setMode: (next) => preference.setMode(next),
  }), [mode, preference])
  return (
    <NumberNotationContext.Provider value={value}>
      {children}
    </NumberNotationContext.Provider>
  )
}
