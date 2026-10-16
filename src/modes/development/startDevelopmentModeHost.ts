import { createModeHost } from '../modeHost'
import { ModeSaveStore } from '../modeSaveStore'
import { createClassicModeCodec } from '../classicModeCodec'
import { createModernModeCodec } from '../modernModeCodec'
import { convertClassicForModern } from '../classicToModernMigration'
import type { ModeSession, ModeSessionContext, GameModeController } from '../modeController'
import type { PresentationStorage } from '../../ui/presentationStorage'
import type { DevelopmentFrameBridge } from './frameBridge'
import { developmentModesAllowed } from './gate'
import { mountDevelopmentModeStatus } from './mountDevelopmentModeStatus'
import { createDisposableModeInstallation } from './createDisposableModeInstallation'
import { ModeCloudCoordinator, MODE_CLOUD_NAMESPACES } from '../modeCloud'
import { bindModeCloudTransport } from '../hostCloudBindings'
import { mountModeSaveManager } from './mountModeSaveManager'
import type { ModeSaveActions } from '../../ui/gameplay/settings/modeSaveActions'
import { readModeSavePresentation } from '../../ui/gameplay/settings/modeSaveActions'
import './host.css'

/** Development-only scratch composition. All saves and UI preferences live in
 * private Maps. It never opens historical roots, IDB, native APIs or a Cloud
 * account. Closing/reloading the parent discards the scratch installation. */
export async function startDevelopmentModeHost(container: HTMLElement): Promise<{ readonly ready: Promise<void>; close(): Promise<void> }> {
  if (!developmentModesAllowed(import.meta.env.DEV, import.meta.env.VITE_IDS_DUAL_MODE_FOUNDATION,
    location.hostname, Boolean(window.idleDysonSwarmNativeHost))) throw new Error('Development modes are disabled.')
  const preferences = new Map<string, string>()
  const prefs: PresentationStorage = { getItem: key => preferences.get(key) ?? null, setItem: (key, text) => { preferences.set(key, text) }, removeItem: key => { preferences.delete(key) } }
  const codecs = { classic: createClassicModeCodec(() => new Date().toISOString()), modern: createModernModeCodec(() => new Date().toISOString()) }
  const params = new URLSearchParams(location.search)
  const selected = params.get('host') ?? 'browser'
  if (!['browser', 'electron', 'ios', 'android'].includes(selected)) throw Error('Unsupported disposable host.')
  const target = selected as 'browser' | 'electron' | 'ios' | 'android'
  const classic = params.get('classic') === '1' ? await codecs.classic.createFresh() : undefined
  const installation = createDisposableModeInstallation(target, classic)
  const cloudSeed = params.get('cloud')
  if (cloudSeed === 'classic' || cloudSeed === 'modern') {
    const date = () => new Date(Date.now() - 1000).toISOString()
    const remote = cloudSeed === 'classic' ? createClassicModeCodec(date) : createModernModeCodec(date)
    await installation.cloudProvider.compareAndPublish(`synthetic-account/${MODE_CLOUD_NAMESPACES[cloudSeed]}`, null, await remote.createFresh())
  }
  const binding = installation.binding
  await binding.acquire()
  const store = new ModeSaveStore(binding.storage, codecs, () => binding.authority.assertWritable().then(() => undefined), 'development-modes-v1')
  const panel = document.createElement('section'), status = document.createElement('p'), slot = document.createElement('div')
  panel.className = 'development-mode-host'; status.className = 'development-mode-status'
  const dialogs = document.createElement('div')
  panel.append(status, slot); container.replaceChildren(panel, dialogs)
  let controller: GameModeController
  let manager: ReturnType<typeof mountModeSaveManager>
  const abort = new AbortController()
  const launch = (context: ModeSessionContext) => launchDevelopmentFrame(context, controller, prefs, slot, {
    open: (action, locale, presentation) => { if (context.isCurrent()) manager.open(action, locale, presentation) },
  }, abort.signal, target)
  const clouds = bindModeCloudTransport({ provider: installation.cloudProvider, account: 'synthetic-account', identity: () => 'synthetic-account',
    local: binding.storage, assertWriter: () => binding.authority.assertWritable().then(() => undefined), choose: (mode, local, remote) => manager.choose(mode, local, remote) })
  const cloud = new ModeCloudCoordinator(store, clouds, codecs)
  const host = createModeHost({ store, cloud, factories: { classic: launch, modern: launch }, convertClassic: convertClassicForModern,
    discovery: { ...binding.discovery, codecs, choose: (mode, candidates) => manager.chooseSources(mode, candidates) },
  })
  controller = host.controller
  manager = mountModeSaveManager(dialogs, panel, controller, store, installation.transfers, prefs)
  const controls = mountDevelopmentModeStatus(status, host)
  const ready = controls.start()
  let closePromise: Promise<void> | undefined
  return { ready, close() {
    closePromise ??= (async () => {
      manager.beginClose(); abort.abort()
      try { await controller.close() }
      finally { controls.dispose(); manager.dispose(); await binding.close() }
    })()
    return closePromise
  } }
}

function launchDevelopmentFrame(context: ModeSessionContext, controller: GameModeController,
  preferences: PresentationStorage, slot: HTMLElement, saveActions: ModeSaveActions, signal: AbortSignal,
  runtimeTarget: 'browser' | 'electron' | 'ios' | 'android'): Promise<ModeSession> {
  if (signal.aborted) return Promise.reject(Error('Mode host is closing.'))
  if (window.__IDS_MODE_DEVELOPMENT_BRIDGE__) throw new Error('Another mode document is still connected.')
  const frame = document.createElement('iframe')
  frame.className = 'development-mode-frame'; frame.title = `${context.mode} development game`
  const token = crypto.randomUUID()
  return new Promise((resolve, reject) => {
    let connected = false, settled = false
    const dispose = () => { clearTimeout(timeout); signal.removeEventListener('abort', abort); frame.remove(); if (window.__IDS_MODE_DEVELOPMENT_BRIDGE__ === bridge) delete window.__IDS_MODE_DEVELOPMENT_BRIDGE__ }
    const fail = (error: unknown) => { if (!settled) { settled = true; dispose(); reject(error instanceof Error ? error : new Error('Mode document failed.')) } }
    const bridge: DevelopmentFrameBridge = {
      connect(requested, caller) {
        if (requested !== token || caller !== frame.contentWindow || connected || !context.isCurrent()) throw new Error('Stale or foreign development mode document.')
        connected = true
        return { context, controller, preferences, runtimeTarget, saveActions: {
          open(action, locale) {
            if (!context.isCurrent()) return
            saveActions.open(action, locale, readModeSavePresentation(frame.contentDocument!))
          },
        },
          ready(session) {
            if (settled || !context.isCurrent()) { void session.close().catch(() => undefined); return }
            settled = true; clearTimeout(timeout); signal.removeEventListener('abort', abort)
            resolve({ exportSave: () => session.exportSave(), quiesce: () => session.quiesce(), close: async () => { try { await session.close() } finally { dispose() } } })
          }, fail,
        }
      },
    }
    const timeout = setTimeout(() => fail(new Error('Development mode document did not become ready.')), 20000)
    const abort = () => fail(Error('Mode host is closing.'))
    signal.addEventListener('abort', abort, { once: true })
    window.__IDS_MODE_DEVELOPMENT_BRIDGE__ = bridge
    frame.addEventListener('error', () => fail(new Error('Development mode document could not load.')), { once: true })
    frame.src = `${import.meta.env.BASE_URL}src/modes/development/frame.html?session=${encodeURIComponent(token)}`
    slot.replaceChildren(frame)
  })
}
