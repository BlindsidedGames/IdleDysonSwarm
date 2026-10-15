import { bindBrowserModeStorage, bindNativeModeStorage, DUAL_MODE_NATIVE_ROOT } from '../hostStorageBindings'
import { PRODUCTION_BROWSER_DATABASE_NAME, PRODUCTION_BROWSER_SAVE_PATHS } from '../../browser/productionBrowserStorage'
import { NATIVE_WEB_SAVE_PATHS } from '../../platform/platformSaveStorage'
import { DisposableBrowserDatabase, disposableNativeFiles, DisposableCloudProvider } from './disposableHostPorts'
import { bindBrowserModeSaveTransfers, bindNativeModeSaveTransfers } from '../hostSaveTransferBindings'

/** The same concrete host adapters used by host composition, with capabilities
 * supplied by this disposable installation rather than ambient host discovery. */
export function createDisposableModeInstallation(target: 'browser' | 'electron' | 'ios' | 'android', classic?: string) {
  const cloudProvider = new DisposableCloudProvider()
  if (target === 'browser') {
    const databases = new Map<string, DisposableBrowserDatabase>()
    const open = (name: string) => { if (!databases.has(name)) databases.set(name, new DisposableBrowserDatabase()); return databases.get(name)! }
    if (classic) open(PRODUCTION_BROWSER_DATABASE_NAME).files.set(PRODUCTION_BROWSER_SAVE_PATHS.current, classic)
    return { binding: bindBrowserModeStorage(open), cloudProvider, transfers: bindBrowserModeSaveTransfers() }
  }
  const original = new Map<string, string>()
  if (classic) original.set(NATIVE_WEB_SAVE_PATHS.current, classic)
  const exports = new Map<string, string>()
  return { binding: bindNativeModeStorage(target, {
    destination: { namespace: DUAL_MODE_NATIVE_ROOT, files: disposableNativeFiles() },
    publicClassic: { namespace: 'web-runtime-v1', files: disposableNativeFiles(original) },
    modernBeta: { namespace: 'idleds-rework-beta-v1', files: disposableNativeFiles() },
    unity: { discoverCandidates: async () => [] },
  }), cloudProvider, transfers: bindNativeModeSaveTransfers({
    writeClipboardText: async text => { exports.set('clipboard', text) },
    exportSaveFile: async request => { exports.set(request.fileName, request.text); return 'saved' },
  }) }
}
