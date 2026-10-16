import { createContext } from 'react'

export type ModeSaveAction = 'import' | 'export' | 'recovery' | 'reset'
export interface ModeSaveActions {
  open(action: ModeSaveAction, locale: string, presentation?: { fontSize: string; textScale: string }): void
}
export const ModeSaveActionsContext = createContext<ModeSaveActions | null>(null)
