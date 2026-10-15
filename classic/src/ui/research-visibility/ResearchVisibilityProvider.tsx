import { useMemo, useSyncExternalStore, type ReactNode } from 'react'
import {
  ResearchVisibilityContext,
  type ResearchVisibilityContextValue,
} from './context'
import { ResearchVisibilityPreferenceService } from './preference'

export function ResearchVisibilityProvider({
  preference,
  children,
}: {
  readonly preference: ResearchVisibilityPreferenceService
  readonly children: ReactNode
}) {
  const hideCompleted = useSyncExternalStore(
    preference.subscribe,
    preference.getSnapshot,
    preference.getSnapshot,
  )
  const value = useMemo<ResearchVisibilityContextValue>(() => ({
    hideCompleted,
    setHideCompleted: (next) => preference.setHideCompleted(next),
  }), [hideCompleted, preference])
  return (
    <ResearchVisibilityContext.Provider value={value}>
      {children}
    </ResearchVisibilityContext.Provider>
  )
}
