import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { LOCALE_REGISTRY, type EnabledLocale } from '../../ui/i18n/localeRegistry'
import type { ModeSaveAction } from '../../ui/gameplay/settings/modeSaveActions'
import type { GameModeController } from '../modeController'
import type { GameMode, ModeSaveStore } from '../modeSaveStore'
import type { Request } from './modeSaveManagerModel'
import { ModeSaveManager } from './ModeSaveManager'
import { bindBrowserModeSaveTransfers, type ModeSaveTransferPort } from '../hostSaveTransferBindings'

/** Owned by the parent, so transfer results survive child teardown/recreation. */
export function mountModeSaveManager(container: HTMLElement, background: HTMLElement,
  controller: GameModeController, store: ModeSaveStore, transfers: ModeSaveTransferPort = bindBrowserModeSaveTransfers()) {
  let request: Request | null = null, id = 0, closing = false
  const html = document.documentElement
  const originalFont = html.style.fontSize, originalTextScale = html.style.getPropertyValue('--game-text-scale')
  const listeners = new Set<() => void>()
  const notify = () => { for (const listener of listeners) listener() }
  const close = () => { request = null; background.inert = false; html.style.fontSize = originalFont; html.style.setProperty('--game-text-scale', originalTextScale); notify() }
  const model = { subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }, get: () => request, close }
  const root = createRoot(container); root.render(createElement(ModeSaveManager, { model, controller, store, transfers }))
  const chooseSources = (mode: GameMode, candidates: readonly { id: string; text: string }[]) => new Promise<string>((resolve, reject) => {
    if (closing) { reject(Error('Mode host is closing.')); return }
    const previous = request
    const finish = (id?: string) => { request = previous; background.inert = previous !== null; notify(); if (id === undefined) reject(Error('Save choice cancelled.')); else resolve(id) }
    request = { previous, kind: 'choice', locale: previous?.locale ?? 'en', id: ++id, mode, candidates, resolve: id => finish(id), cancel: () => finish() }
    background.inert = true; notify()
  })
  const beginClose = () => {
    closing = true
    while (request?.kind === 'choice') request.cancel()
    close()
  }
  return { open(action: ModeSaveAction, locale: string, presentation?: { fontSize: string; textScale: string }) {
    if (request || closing) return
    const enabled = locale in LOCALE_REGISTRY ? locale as EnabledLocale : 'en'
    if (presentation) { html.style.fontSize = presentation.fontSize; html.style.setProperty('--game-text-scale', presentation.textScale) }
    request = { kind: 'transfer', action, locale: enabled, id: ++id }; background.inert = true; notify()
  }, chooseSources,
  choose: async (mode: GameMode, local: string, remote: string) => await chooseSources(mode, [{ id: 'local', text: local }, { id: 'cloud', text: remote }]) as 'local' | 'cloud',
  beginClose, dispose() { beginClose(); root.unmount() } }
}

