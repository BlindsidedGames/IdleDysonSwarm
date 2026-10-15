import { developmentModesAllowed } from './gate'
import { startModeDocument } from './startModeDocument'
import { BrowserLifecycleAdapter, BrowserLifecycleUtcClock, BrowserMonotonicClock } from '../../platform/browserLifecycle'
import { BrowserDepartureMarker } from '../../platform/browserDepartureMarker'
import { WEB_LIFECYCLE_POLICY } from '../../simulation/lifecycleAwayTime'
import './frameBridge'

if (!developmentModesAllowed(import.meta.env.DEV, import.meta.env.VITE_IDS_DUAL_MODE_FOUNDATION,
  location.hostname, Boolean(window.idleDysonSwarmNativeHost)) || window.parent === window || window.parent.location.origin !== location.origin) throw new Error('Development mode document is not authorized.')
const bridge = window.parent.__IDS_MODE_DEVELOPMENT_BRIDGE__
const token = new URLSearchParams(location.search).get('session')
if (!bridge || !token) throw new Error('Development mode document has no owning session.')
const connection = bridge.connect(token, window)
try {
  const clock = new BrowserLifecycleUtcClock()
  const marker = connection.preferences
  connection.ready(await startModeDocument(connection.context, connection.controller, document.getElementById('root')!, marker, {
    lifecycle: new BrowserLifecycleAdapter(), lifecycleClock: clock, lifecyclePolicy: WEB_LIFECYCLE_POLICY,
    activeTimeClock: new BrowserMonotonicClock(),
    activeTimeScheduler: { requestFrame: cb => requestAnimationFrame(cb), cancelFrame: id => cancelAnimationFrame(Number(id)) },
    nowUtcMilliseconds: () => Date.now(),
    departureMarker: new BrowserDepartureMarker(`development-${connection.context.mode}`, {
      getItem: key => marker.getItem(`${connection.context.mode}:${key}`), setItem: (key, value) => marker.setItem(`${connection.context.mode}:${key}`, value), removeItem: key => marker.removeItem(`${connection.context.mode}:${key}`),
    }),
  }))
} catch (error) { connection.fail(error) }
