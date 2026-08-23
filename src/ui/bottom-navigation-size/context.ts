import { createContext } from 'react'
import {
  DEFAULT_BOTTOM_NAVIGATION_SIZE,
  type BottomNavigationSize,
} from '../../game-state/navigationPreferences'

export interface BottomNavigationSizeContextValue {
  readonly size: BottomNavigationSize
  readonly setSize: (size: BottomNavigationSize) => void
}

export const BottomNavigationSizeContext =
  createContext<BottomNavigationSizeContextValue>(Object.freeze({
    size: DEFAULT_BOTTOM_NAVIGATION_SIZE,
    setSize: () => undefined,
  }))
