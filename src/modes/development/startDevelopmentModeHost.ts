import { createModeHost } from '../modeHost'
import { ModeSaveStore } from '../modeSaveStore'
import { createClassicModeCodec } from '../classicModeCodec'
import { createModernModeCodec } from '../modernModeCodec'
import { convertClassicUsingExistingKeepPolicy } from '../classicToModernMigration'
import type { ModeSession, ModeSessionContext, GameModeController } from '../modeController'
import type { PresentationStorage } from '../../ui/presentationStorage'
import type { DevelopmentFrameBridge } from './frameBridge'
import { developmentModesAllowed } from './gate'
import { mountDevelopmentModeStatus } from './mountDevelopmentModeStatus'
import './host.css'

/** Development-only scratch composition. All saves and UI preferences live in
 * private Maps. It never opens historical roots, IDB, native APIs or a Cloud
 * account. Closing/reloading the parent discards the scratch installation. */
export async function startDevelopmentModeHost(container: HTMLElement): Promise<void> {
  if (!developmentModesAllowed(import.meta.env.DEV, import.meta.env.VITE_IDS_DUAL_MODE_FOUNDATION,
    location.hostname, Boolean(window.idleDysonSwarmNativeHost))) throw new Error('Development modes are disabled.')
  const files = new Map<string, string>(), preferences = new Map<string, string>()
  const prefs: PresentationStorage = { getItem: key => preferences.get(key) ?? null, setItem: (key, text) => { preferences.set(key, text) }, removeItem: key => { preferences.delete(key) } }
  const codecs = { classic: createClassicModeCodec(() => new Date().toISOString()), modern: createModernModeCodec(() => new Date().toISOString()) }
  const store = new ModeSaveStore({
    exists: async key => files.has(key), readText: async key => { const value = files.get(key); if (value === undefined) throw Error('Missing scratch file.'); return value },
    writeText: async (key, text) => { files.set(key, text) }, copy: async (a, b) => { if (!files.has(a)) throw Error('Missing scratch source.'); files.set(b, files.get(a)!) },
    replaceAtomically: async (a, b) => { if (!files.has(a)) throw Error('Missing scratch source.'); files.set(b, files.get(a)!); files.delete(a) }, discoverLegacyCandidates: async () => [],
  }, codecs, () => undefined, 'development-modes-v1')
  const panel = document.createElement('section'), status = document.createElement('p'), slot = document.createElement('div')
  panel.className = 'development-mode-host'; status.className = 'development-mode-status'
  panel.append(status, slot); container.replaceChildren(panel)
  const classic = new URLSearchParams(location.search).get('classic') === '1' ? await codecs.classic.createFresh() : undefined
  let controller: GameModeController
  const launch = (context: ModeSessionContext) => launchDevelopmentFrame(context, controller, prefs, slot)
  const host = createModeHost({ store, factories: { classic: launch, modern: launch }, convertClassic: convertClassicUsingExistingKeepPolicy,
    discovery: { codecs,
      publicClassic: { id: 'public-classic-synthetic', mode: 'classic', read: async () => classic === undefined ? [] : [{ id: 'synthetic-classic', role: 'primary', text: classic }] },
      legacyUnity: { id: 'unity-synthetic-absent', mode: 'classic', read: async () => [] },
      modernBeta: { id: 'beta-synthetic-absent', mode: 'modern', read: async () => [] },
    },
  })
  controller = host.controller
  const controls = mountDevelopmentModeStatus(status, host)
  await controls.start()
}

function launchDevelopmentFrame(context: ModeSessionContext, controller: GameModeController,
  preferences: PresentationStorage, slot: HTMLElement): Promise<ModeSession> {
  if (window.__IDS_MODE_DEVELOPMENT_BRIDGE__) throw new Error('Another mode document is still connected.')
  const frame = document.createElement('iframe')
  frame.className = 'development-mode-frame'; frame.title = `${context.mode} development game`
  const token = crypto.randomUUID()
  return new Promise((resolve, reject) => {
    let connected = false, settled = false
    const dispose = () => { clearTimeout(timeout); frame.remove(); if (window.__IDS_MODE_DEVELOPMENT_BRIDGE__ === bridge) delete window.__IDS_MODE_DEVELOPMENT_BRIDGE__ }
    const fail = (error: unknown) => { if (!settled) { settled = true; dispose(); reject(error instanceof Error ? error : new Error('Mode document failed.')) } }
    const bridge: DevelopmentFrameBridge = {
      connect(requested, caller) {
        if (requested !== token || caller !== frame.contentWindow || connected || !context.isCurrent()) throw new Error('Stale or foreign development mode document.')
        connected = true
        return { context, controller, preferences,
          ready(session) {
            if (settled || !context.isCurrent()) { void session.close().catch(() => undefined); return }
            settled = true; clearTimeout(timeout)
            resolve({ quiesce: () => session.quiesce(), close: async () => { try { await session.close() } finally { dispose() } } })
          }, fail,
        }
      },
    }
    const timeout = setTimeout(() => fail(new Error('Development mode document did not become ready.')), 20000)
    window.__IDS_MODE_DEVELOPMENT_BRIDGE__ = bridge
    frame.addEventListener('error', () => fail(new Error('Development mode document could not load.')), { once: true })
    frame.src = `${import.meta.env.BASE_URL}src/modes/development/frame.html?session=${encodeURIComponent(token)}`
    slot.replaceChildren(frame)
  })
}
