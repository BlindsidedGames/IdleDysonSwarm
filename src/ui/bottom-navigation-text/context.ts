import { createContext } from 'react'

export interface BottomNavigationTextContextValue {
  readonly includeText: boolean
  readonly setIncludeText: (includeText: boolean) => void
}

export const BottomNavigationTextContext =
  createContext<BottomNavigationTextContextValue>(Object.freeze({
    includeText: false,
    setIncludeText: () => undefined,
  }))
