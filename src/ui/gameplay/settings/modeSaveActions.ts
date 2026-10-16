import { createContext } from 'react'

export type ModeSaveAction = 'import' | 'export' | 'recovery' | 'reset'
export interface ModeSavePresentation {
  fontSize: string
  textScale: string
  theme: Record<string, string>
}
export function readModeSavePresentation(document: Document): ModeSavePresentation {
  const view = document.defaultView!
  const root = view.getComputedStyle(document.documentElement)
  const settings = view.getComputedStyle(document.querySelector('.settings-surface') ?? document.documentElement)
  return { fontSize: root.fontSize, textScale: root.getPropertyValue('--game-text-scale'),
    theme: Object.fromEntries(['page', 'panel', 'selected', 'divider', 'accent'].map(role => [role, settings.getPropertyValue(`--theme-${role}`)])) }
}
export interface ModeSaveActions {
  open(action: ModeSaveAction, locale: string, presentation?: ModeSavePresentation): void
}
export const ModeSaveActionsContext = createContext<ModeSaveActions | null>(null)
