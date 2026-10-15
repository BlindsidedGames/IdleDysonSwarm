import { developmentModesAllowed } from './gate'
import { startModeDocument } from './startModeDocument'
import { BrowserLifecycleAdapter, BrowserLifecycleUtcClock, BrowserMonotonicClock } from '../../platform/browserLifecycle'
import { BrowserDepartureMarker } from '../../platform/browserDepartureMarker'
import './frameBridge'

/** Executed by the frame entry module in its own document. The parent supplies
 * all persistence/account capabilities through the authenticated bridge. */
export async function startDevelopmentFrame(frame: Window): Promise<void> {
  if (!developmentModesAllowed(import.meta.env.DEV, import.meta.env.VITE_IDS_DUAL_MODE_FOUNDATION,
    frame.location.hostname, Boolean(frame.idleDysonSwarmNativeHost)) || frame.parent === frame || frame.parent.location.origin !== frame.location.origin) throw new Error('Development mode document is not authorized.')
  const bridge = frame.parent.__IDS_MODE_DEVELOPMENT_BRIDGE__
  const token = new URLSearchParams(frame.location.search).get('session')
  if (!bridge || !token) throw new Error('Development mode document has no owning session.')
  const connection = bridge.connect(token, frame)
  try {
    const policies = connection.context.mode === 'classic' ? await import('../../../classic/src/simulation/lifecycleAwayTime') : await import('../../simulation/lifecycleAwayTime')
    const policy = connection.runtimeTarget === 'ios' || connection.runtimeTarget === 'android' ? policies.MOBILE_LIFECYCLE_POLICY : policies.WEB_LIFECYCLE_POLICY
    const clock = new BrowserLifecycleUtcClock()
    const marker = connection.preferences
    connection.ready(await startModeDocument(connection.context, connection.controller, frame.document.getElementById('root')!, marker, {
      saveActions: connection.saveActions,
      lifecycle: new BrowserLifecycleAdapter(frame.document, frame), lifecycleClock: clock, lifecyclePolicy: policy,
      activeTimeClock: new BrowserMonotonicClock(frame.performance),
      activeTimeScheduler: { requestFrame: cb => frame.requestAnimationFrame(cb), cancelFrame: id => frame.cancelAnimationFrame(Number(id)) },
      frontendSnapshotScheduler: { requestFrame: callback => frame.requestAnimationFrame(callback), cancelFrame: id => frame.cancelAnimationFrame(Number(id)) },
      checkpointScheduler: { setInterval: (callback, milliseconds) => frame.setInterval(callback, milliseconds), clearInterval: id => frame.clearInterval(Number(id)) },
      nowUtcMilliseconds: () => Date.now(),
      departureMarker: new BrowserDepartureMarker(`development-${connection.context.mode}`, {
        getItem: key => marker.getItem(`${connection.context.mode}:${key}`), setItem: (key, value) => marker.setItem(`${connection.context.mode}:${key}`, value), removeItem: key => marker.removeItem(`${connection.context.mode}:${key}`),
      }),
    }))
  } catch (error) { connection.fail(error) }

}
