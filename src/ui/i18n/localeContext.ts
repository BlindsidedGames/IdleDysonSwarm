import { createContext, useContext } from 'react'
import type { EnabledLocale } from './localeRegistry'
import type { LocalePreference } from './localePreference'

export interface LocalePreferenceContextValue {
  readonly locale: EnabledLocale
  readonly preference: LocalePreference
  readonly setPreference: (preference: LocalePreference) => void
}

export const LocalePreferenceContext =
  createContext<LocalePreferenceContextValue | null>(null)

export function useLocalePreference(): LocalePreferenceContextValue {
  const context = useContext(LocalePreferenceContext)
  if (context === null) {
    throw new Error(
      'useLocalePreference must be used inside LocalePreferenceProvider',
    )
  }
  return context
}
