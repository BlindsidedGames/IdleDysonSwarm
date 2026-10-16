import '../index.css'
import './productionFrameBridge'
import { startModeDocument } from './development/startModeDocument'
import { BrowserMonotonicClock } from '../platform/browserLifecycle'
import { createProductionAudioService, installSemanticAudioCues } from '../audio'
import { installTextSelectionPolicy } from '../ui/accessibility/textSelectionPolicy'
import { BrowserDepartureMarker } from '../platform/browserDepartureMarker'

if (window.parent === window || window.parent.location.origin !== location.origin) throw Error('Open the owning game window.')
const token = new URLSearchParams(location.search).get('session')
const bridge = window.parent.__IDS_MODE_HOST__
if (!bridge || !token) throw Error('No owning game session.')
const connection = bridge.connect(token, window)
try {
  if (connection.native) window.idleDysonSwarmNativeHost = connection.native
  installTextSelectionPolicy()
  const promotions = connection.context.mode === 'classic' ? import('../../classic/src/store/promotions') : import('../store/promotions')
  void promotions.then(({ startPromotions, promotionPlatform }) => startPromotions(promotionPlatform(connection.target))).catch(() => undefined)
  for (const side of ['top', 'right', 'bottom', 'left']) {
    const sync = () => document.documentElement.style.setProperty(`--android-safe-area-${side}`, window.parent.getComputedStyle(window.parent.document.documentElement).getPropertyValue(`--android-safe-area-${side}`))
    sync()
    const observer = new MutationObserver(sync); observer.observe(window.parent.document.documentElement, { attributes: true, attributeFilter: ['style'] })
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true })
  }
  const audio = connection.options.audio ?? createProductionAudioService(connection.target, connection.options.lifecycle)
  void audio.initialize().catch(() => undefined)
  const stopCues = installSemanticAudioCues(document, audio)
  const session = await startModeDocument(connection.context, connection.controller, document.getElementById('root')!, connection.preferences, {
    ...connection.options, audio,
    activeTimeClock: new BrowserMonotonicClock(performance),
    activeTimeScheduler: { requestFrame: cb => requestAnimationFrame(cb), cancelFrame: id => cancelAnimationFrame(Number(id)) },
    frontendSnapshotScheduler: { requestFrame: cb => requestAnimationFrame(cb), cancelFrame: id => cancelAnimationFrame(Number(id)) },
    checkpointScheduler: { setInterval: (cb, ms) => setInterval(cb, ms), clearInterval: id => clearInterval(Number(id)) },
    departureMarker: new BrowserDepartureMarker(`mode-${connection.context.mode}`, {
      getItem: key => connection.preferences.getItem(`${connection.context.mode}:${key}`),
      setItem: (key, value) => connection.preferences.setItem(`${connection.context.mode}:${key}`, value),
      removeItem: key => connection.preferences.removeItem(`${connection.context.mode}:${key}`),
    }),
  })
  connection.ready({ exportSave: () => session.exportSave(), quiesce: () => session.quiesce(), close: async () => { try { await session.close() } finally { stopCues(); await audio.destroy() } } })
} catch (error) { connection.fail(error) }
