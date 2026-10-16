import { createProductionAudioService } from '../audio'
import { createIntl, createIntlCache } from 'react-intl'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { IntlProvider } from 'react-intl'
import { createProductionPwaUpdateController, PwaUpdatePrompt } from '../pwa'
import { LocalePreferenceService, loadStartupCatalog, LOCALE_REGISTRY } from '../ui/i18n'
import { startupShellMessages } from '../ui/shell/messages'
import { modeSaveMessages } from '../ui/gameplay/settings/modeSaveMessages'
import { openProductionModeStorage } from './productionModeStorage'
import { CanonicalModeFiles } from './canonicalModeFiles'
import { ModeSaveStore } from './modeSaveStore'
import { createClassicModeCodec } from './classicModeCodec'
import { createModernModeCodec } from './modernModeCodec'
import { createModeHost } from './modeHost'
import { convertClassicForModern } from './classicToModernMigration'
import { ModeCloudCoordinator, type ModeCloudPort } from './modeCloud'
import type { NativeHostBridgeApi } from '../platform/nativeHostBridge'
import { createNativeHostEnvironment } from '../platform/nativeHostBridge'
import { BrowserLifecycleAdapter, BrowserLifecycleUtcClock, BrowserMonotonicClock } from '../platform/browserLifecycle'
import { WEB_LIFECYCLE_POLICY, MOBILE_LIFECYCLE_POLICY } from '../simulation/lifecycleAwayTime'
import { RuntimeEntitlementBridge } from '../store/runtimeEntitlements'
import { createBrowserDevelopmentReleasePlatformServices, createBrowserStripeReleasePlatformServices } from '../platform/releaseFoundation'
import { PACKAGED_RELEASE_IDENTITY } from '../packagedReleaseIdentity'
import { resolveReleaseFooter, desktopDistributionFromBuildValue } from '../platform/releaseFooter'
import { COMMUNITY_EXTERNAL_ORIGINS } from '../platform/communityLinks'
import { bindBrowserModeSaveTransfers, bindNativeModeSaveTransfers } from './hostSaveTransferBindings'
import { mountModeSaveManager } from './development/mountModeSaveManager'
import type { ModeRuntimeHostOptions } from './modeRuntimeHostOptions'
import type { GameModeController, ModeSessionContext, ModeSession } from './modeController'
import type { PresentationStorage } from '../ui/presentationStorage'
import { readModeSavePresentation } from '../ui/gameplay/settings/modeSaveActions'
import type { ProductionFrameBridge } from './productionFrameBridge'
import { BrowserDepartureMarker } from '../platform/browserDepartureMarker'
import './productionModeHost.css'

export async function startProductionModeHost(container: HTMLElement, native: NativeHostBridgeApi | null) {
  const storage = await openProductionModeStorage(native)
  const codecs = { classic: createClassicModeCodec(() => new Date().toISOString()), modern: createModernModeCodec(() => new Date().toISOString()) }
  const canonical = new CanonicalModeFiles(storage.storage, storage.files, codecs)
  const store = new ModeSaveStore(storage.storage, codecs, storage.assertWriter, 'modes-v1', canonical.publish)
  const environment = native ? createNativeHostEnvironment(native) : null
  const target = native?.target ?? 'browser'
  const services = environment?.releasePlatformServices ?? (import.meta.env.DEV ? createBrowserDevelopmentReleasePlatformServices() : createBrowserStripeReleasePlatformServices())
  const entitlements = new RuntimeEntitlementBridge(services.entitlements, services.doubleInfinityPointsEffect)
  const clock = new BrowserLifecycleUtcClock()
  const lifecycle = environment?.lifecycle ?? new BrowserLifecycleAdapter()
  const preferences: PresentationStorage = {
    getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value), removeItem: key => localStorage.removeItem(key),
  }
  const panel = document.createElement('section'), status = document.createElement('section'), slot = document.createElement('div'), dialogs = document.createElement('div')
  panel.className = 'production-mode-host'; slot.className = 'production-mode-slot'; status.className = 'production-mode-recovery'; status.hidden = true
  status.setAttribute('role', 'alert'); panel.append(status, slot); container.replaceChildren(panel, dialogs)
  const locale = await loadStartupCatalog(new LocalePreferenceService().getSnapshot().locale)
  const intl = createIntl({ locale: LOCALE_REGISTRY[locale.locale].languageTag, defaultLocale: 'en', messages: locale.messages as import('react-intl').IntlShape['messages'] }, createIntlCache())
  const footer = await resolveReleaseFooter({ target, developmentBuild: import.meta.env.DEV, source: PACKAGED_RELEASE_IDENTITY, metadata: services.metadata,
    desktopDistribution: target === 'electron' ? desktopDistributionFromBuildValue(import.meta.env.VITE_IDS_DESKTOP_DISTRIBUTION) : undefined })
  let controller: GameModeController, manager: ReturnType<typeof mountModeSaveManager>
  const abort = new AbortController()
  const runtimeOptions = (): ModeRuntimeHostOptions => ({
    lifecycle, lifecycleClock: clock, lifecyclePolicy: target === 'ios' || target === 'android' ? MOBILE_LIFECYCLE_POLICY : WEB_LIFECYCLE_POLICY,
    activeTimeClock: new BrowserMonotonicClock(), activeTimeScheduler: { requestFrame: cb => requestAnimationFrame(cb), cancelFrame: id => cancelAnimationFrame(Number(id)) },
    nowUtcMilliseconds: () => Date.now(), departureMarker: new BrowserDepartureMarker('mode-host'),
    hostEntitlements: entitlements, allowedExternalOrigins: COMMUNITY_EXTERNAL_ORIGINS,
    developmentControlsAvailable: true, developmentControlsRequireEntitlement: true,
    audio: createProductionAudioService(target, lifecycle), native: native ?? undefined,
    services, hostKind: environment ? target === 'electron' ? 'desktop-native' : 'mobile-native' : 'browser', releaseFooter: footer,
    reloadSafely: async () => { await controller.close(); location.reload() },
    saveActions: { open: (action, locale, presentation) => manager.open(action, locale, presentation) },
  })
  const launch = (context: ModeSessionContext) => launchFrame(context, controller, slot, preferences, runtimeOptions(), target, abort.signal, native)
  const cloudPorts = native?.modeClouds
  const clouds = cloudPorts ? Object.fromEntries((['classic', 'modern'] as const).map(mode => [mode, {
    ...cloudPorts[mode], choose: (local: string, remote: string) => manager.choose(mode, local, remote),
  }])) as Record<'classic' | 'modern', ModeCloudPort> : undefined
  const cloud = clouds ? new ModeCloudCoordinator(store, clouds, codecs) : undefined
  const host = createModeHost({ store, cloud, factories: { classic: launch, modern: launch }, convertClassic: convertClassicForModern,
    discovery: { ...storage.discovery, codecs, choose: (mode, candidates) => manager.chooseSources(mode, candidates) } })
  controller = host.controller
  manager = mountModeSaveManager(dialogs, panel, controller, store, native ? bindNativeModeSaveTransfers(native) : bindBrowserModeSaveTransfers(), preferences)
  const pwa = native === null ? createProductionPwaUpdateController() : undefined
  const pwaContainer = document.createElement('div'); container.append(pwaContainer)
  const pwaRoot = createRoot(pwaContainer)
  if (pwa) {
    pwaRoot.render(createElement(IntlProvider, { locale: intl.locale, messages: intl.messages },
      createElement(PwaUpdatePrompt, { controller: pwa, prepareForActivation: () => controller.close() })))
    void pwa.start()
  }
  let closing: Promise<void> | undefined
  const close = () => closing ??= (async () => { manager.beginClose(); abort.abort(); pwa?.dispose(); pwaRoot.unmount(); try { await controller.close() } finally { manager.dispose(); await storage.close() } })()
  const retry = document.createElement('button'), recover = document.createElement('button')
  retry.type = recover.type = 'button'; retry.textContent = intl.formatMessage(startupShellMessages.retryAction); recover.textContent = intl.formatMessage(modeSaveMessages.recovery)
  const update = () => {
    const snapshot = controller.getSnapshot()
    status.hidden = snapshot.phase !== 'blocked'
    status.replaceChildren(document.createTextNode(snapshot.error ?? intl.formatMessage(modeSaveMessages.failed)), retry, recover)
  }
  controller.subscribe(update)
  const start = async () => {
    retry.disabled = true
    try {
      await canonical.reconcile(store)
      await host.start()
      status.hidden = true
      document.documentElement.dataset.idleDysonSwarmRuntime = 'ready'
      window.dispatchEvent(new Event('idle-dyson-swarm-runtime-ready'))
    } catch (error) {
      status.hidden = false; status.replaceChildren(document.createTextNode(error instanceof Error ? error.message : intl.formatMessage(modeSaveMessages.failed)), retry, recover)
      throw error
    } finally { retry.disabled = false }
  }
  retry.onclick = () => { void start().catch(() => undefined) }
  recover.onclick = () => manager.open('recovery', locale.locale)
  environment?.installTerminationCheckpoint?.(async () => { try { await close(); return true } catch { return false } })
  window.addEventListener('pagehide', () => { void close().catch(() => undefined) }, { once: true })
  return { ready: start(), close }
}

function launchFrame(context: ModeSessionContext, controller: GameModeController, slot: HTMLElement,
  preferences: PresentationStorage, options: ModeRuntimeHostOptions, target: 'browser' | 'electron' | 'ios' | 'android', signal: AbortSignal, native: NativeHostBridgeApi | null): Promise<ModeSession> {
  if (signal.aborted || window.__IDS_MODE_HOST__) return Promise.reject(Error('The previous game session is still closing.'))
  const frame = document.createElement('iframe'); frame.className = 'production-mode-frame'; frame.title = context.mode === 'classic' ? 'Classic' : 'Modern'
  const token = crypto.randomUUID()
  return new Promise((resolve, reject) => {
    let connected = false, settled = false
    const dispose = () => { clearTimeout(timeout); signal.removeEventListener('abort', stop); frame.remove(); if (window.__IDS_MODE_HOST__ === bridge) delete window.__IDS_MODE_HOST__ }
    const fail = (error: unknown) => { if (!settled) { settled = true; dispose(); reject(error instanceof Error ? error : Error('The game document could not open.')) } }
    const bridge: ProductionFrameBridge = { connect(requested, caller) {
      if (requested !== token || caller !== frame.contentWindow || connected || !context.isCurrent()) throw Error('Stale or foreign game document.')
      connected = true
      return { context, controller, preferences, target, native: native ?? undefined, options: { ...options, saveActions: { open: (action, locale) => {
        if (!context.isCurrent()) return
        options.saveActions?.open(action, locale, readModeSavePresentation(frame.contentDocument!))
      } } }, ready(session) {
        if (settled || !context.isCurrent()) { void session.close().catch(() => undefined); return }
        settled = true; clearTimeout(timeout); signal.removeEventListener('abort', stop)
        resolve({ exportSave: () => session.exportSave(), quiesce: () => session.quiesce(), close: async () => { try { await session.close() } finally { dispose() } } })
      }, fail }
    } }
    const timeout = setTimeout(() => fail(Error('The game document did not become ready. Retry the saved game.')), 20000)
    const stop = () => fail(Error('The game is closing.')); signal.addEventListener('abort', stop, { once: true })
    window.__IDS_MODE_HOST__ = bridge
    frame.addEventListener('error', () => fail(Error('The game document could not load.')), { once: true })
    frame.src = `${import.meta.env.BASE_URL}mode.html?session=${encodeURIComponent(token)}`
    slot.replaceChildren(frame)
  })
}
