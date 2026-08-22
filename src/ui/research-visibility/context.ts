import { createContext } from 'react'

export interface ResearchVisibilityContextValue {
  readonly hideCompleted: boolean
  readonly setHideCompleted: (hideCompleted: boolean) => void
}

export const ResearchVisibilityContext =
  createContext<ResearchVisibilityContextValue>(Object.freeze({
    hideCompleted: false,
    setHideCompleted: () => undefined,
  }))
