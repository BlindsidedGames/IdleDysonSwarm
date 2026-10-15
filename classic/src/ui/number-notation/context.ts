import { createContext } from 'react'
import {
  DEFAULT_NUMBER_NOTATION,
  type NumberNotationMode,
} from './contracts'

export interface NumberNotationContextValue {
  readonly mode: NumberNotationMode
  readonly setMode: (mode: NumberNotationMode) => void
}

export const NumberNotationContext = createContext<NumberNotationContextValue>(
  Object.freeze({
    mode: DEFAULT_NUMBER_NOTATION,
    setMode: () => undefined,
  }),
)
