import { restoreScreenOrientation } from './platform/screenOrientation'
import { renderStaticBootstrapFailure } from './bootstrapFailure'
import { detectNativeHostBridge, installNativeSafeAreaInsets } from './platform/nativeHostBridge'
import { createNativeLaunchDismissalController } from './platform/nativeLaunchScreen'
import { installTextSelectionPolicy } from './ui/accessibility/textSelectionPolicy'
import './index.css'

installTextSelectionPolicy()
void bootstrap()
async function bootstrap() {
  const container = document.getElementById('root')
  if (!container) return
  const launch = createNativeLaunchDismissalController()
  try {
    const native = detectNativeHostBridge()
    if (import.meta.env.DEV && import.meta.env.VITE_IDS_DUAL_MODE_FOUNDATION === '1' && native === null &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname)) {
      const { startDevelopmentModeHost } = await import('./modes/development/startDevelopmentModeHost')
      const host = await startDevelopmentModeHost(container)
      window.addEventListener('pagehide', () => { void host.close().catch(() => undefined) }, { once: true })
      await host.ready; return
    }
    if (native) launch.armFailsafe()
    await Promise.all([bounded(installNativeSafeAreaInsets()), bounded(restoreScreenOrientation()), bounded(native?.ready?.() ?? Promise.resolve())])
    const { startProductionModeHost } = await import('./modes/startProductionModeHost')
    const host = await startProductionModeHost(container, native)
    // A failed host retains its own saved-game recovery controls.
    await host.ready.catch(() => undefined)
    await launch.dismissNow()
  } catch {
    renderStaticBootstrapFailure(container)
    await launch.dismissNow()
  }
}
function bounded<T>(work: Promise<T>): Promise<T | undefined> {
  return new Promise(resolve => { const timeout = setTimeout(() => resolve(undefined), 1500); void work.then(value => { clearTimeout(timeout); resolve(value) }, () => { clearTimeout(timeout); resolve(undefined) }) })
}
