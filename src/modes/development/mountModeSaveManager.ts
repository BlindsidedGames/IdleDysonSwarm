import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { LOCALE_REGISTRY, type EnabledLocale } from '../../ui/i18n/localeRegistry'
import type { ModeSaveAction, ModeSavePresentation } from '../../ui/gameplay/settings/modeSaveActions'
import type { GameModeController } from '../modeController'
import type { GameMode, ModeSaveStore } from '../modeSaveStore'
import type { Request } from './modeSaveManagerModel'
import { ModeSaveManager } from './ModeSaveManager'
import { bindBrowserModeSaveTransfers, type ModeSaveTransferPort } from '../hostSaveTransferBindings'
import type { PresentationStorage } from '../../ui/presentationStorage'

/** Owned by the parent, so transfer results survive child teardown/recreation. */
export function mountModeSaveManager(container: HTMLElement, background: HTMLElement,
  controller: GameModeController, store: ModeSaveStore, transfers: ModeSaveTransferPort = bindBrowserModeSaveTransfers(),
  preferences: PresentationStorage = localStorage) {
  let request: Request | null = null, id = 0, closing = false
  const html = document.documentElement
  const originalFont = html.style.fontSize, originalTextScale = html.style.getPropertyValue('--game-text-scale')
  let returnFocus: HTMLElement | null = null
  let focusObserver: MutationObserver | undefined
  const listeners = new Set<() => void>()
  const notify = () => { for (const listener of listeners) listener() }
  const close = () => {
    const action = request?.kind === 'transfer' ? request.action : null
    request = null; background.inert = false
    html.style.fontSize = originalFont; html.style.setProperty('--game-text-scale', originalTextScale)
    for (const role of ['page', 'panel', 'selected', 'divider', 'accent']) container.style.removeProperty(`--mode-save-theme-${role}`)
    notify()
    focusObserver?.disconnect()
    if (!closing) queueMicrotask(() => {
      if (request || closing) return
      const frameDocument = background.querySelector('iframe')?.contentDocument
      const restore = () => {
        // An imported Classic save may immediately open Modern's migration
        // dialog. Its own initial-focus policy owns that next interaction.
        if (frameDocument?.querySelector('[aria-modal="true"]')) {
          returnFocus = null; focusObserver?.disconnect(); return true
        }
        // Nodes in a removed iframe can still report isConnected within their
        // old Document. Only the current game document may receive focus.
        const previous = returnFocus?.isConnected && (returnFocus.ownerDocument === document || returnFocus.ownerDocument === frameDocument) ? returnFocus : null
        const target = (action ? frameDocument?.querySelector<HTMLElement>(`[data-mode-save-action="${action}"]`) : null) ?? previous
        if (!target) return false
        target.focus(); returnFocus = null; focusObserver?.disconnect(); return true
      }
      if (!restore() && frameDocument) {
        focusObserver = new MutationObserver(restore)
        focusObserver.observe(frameDocument, { childList: true, subtree: true })
      }
    })
  }
  const model = { subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }, get: () => request, close }
  const root = createRoot(container); root.render(createElement(ModeSaveManager, { model, controller, store, transfers, preferences }))
  const chooseSources = (mode: GameMode, candidates: readonly { id: string; text: string }[]) => new Promise<string>((resolve, reject) => {
    if (closing) { reject(Error('Mode host is closing.')); return }
    const previous = request
    const finish = (id?: string) => { request = previous; background.inert = previous !== null; notify(); if (id === undefined) reject(Error('Save choice cancelled.')); else resolve(id) }
    request = { previous, kind: 'choice', locale: previous?.locale ?? 'en', id: ++id, mode, candidates, resolve: id => finish(id), cancel: () => finish() }
    background.inert = true; notify()
  })
  const beginClose = () => {
    closing = true
    focusObserver?.disconnect()
    while (request?.kind === 'choice') request.cancel()
    close()
  }
  return { open(action: ModeSaveAction, locale: string, presentation?: ModeSavePresentation) {
    if (request || closing) return
    const enabled = locale in LOCALE_REGISTRY ? locale as EnabledLocale : 'en'
    const focused = document.activeElement
    returnFocus = (focused instanceof HTMLIFrameElement ? focused.contentDocument?.activeElement : focused) as HTMLElement | null
    if (presentation) {
      html.style.fontSize = presentation.fontSize; html.style.setProperty('--game-text-scale', presentation.textScale)
      for (const [role, color] of Object.entries(presentation.theme)) container.style.setProperty(`--mode-save-theme-${role}`, color)
    }
    request = { kind: 'transfer', action, locale: enabled, id: ++id }; background.inert = true; notify()
  }, chooseSources,
  choose: async (mode: GameMode, local: string, remote: string) => await chooseSources(mode, [{ id: 'local', text: local }, { id: 'cloud', text: remote }]) as 'local' | 'cloud',
  beginClose, dispose() { beginClose(); root.unmount() } }
}

