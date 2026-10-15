import { createContext } from 'react'
import type { GameModeController } from '../../../modes/modeController'

/** Composed only after verifying both runtime packages and upgrade discovery. */
export const GameModeControllerContext = createContext<GameModeController | null>(null)
