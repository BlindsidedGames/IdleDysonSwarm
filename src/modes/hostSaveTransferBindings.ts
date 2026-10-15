import { BrowserTextDownloadAdapter, type TextDownloadPort } from '../platform/browserSaveTransfer'
import type { NativeHostBridgeApi } from '../platform/nativeHostBridge'

export interface ModeSaveTransferPort {
  copy(text: string): Promise<void>
  download(text: string, recovery: boolean): Promise<'saved' | 'cancelled'>
}
/** All writes require an explicit Settings action. Constructing this port does
 * not inspect the clipboard, choose a file or open a native store/account. */
export function bindBrowserModeSaveTransfers(downloads: TextDownloadPort = new BrowserTextDownloadAdapter()): ModeSaveTransferPort {
  return { copy: text => navigator.clipboard.writeText(text), async download(text, recovery) {
    downloads.downloadText(recovery ? 'idle-dyson-swarm-mode-recovery.json' : 'idle-dyson-swarm-mode-saves.idsw', text, 'text/plain;charset=utf-8')
    return 'saved'
  } }
}
export function bindNativeModeSaveTransfers(bridge: Pick<NativeHostBridgeApi, 'writeClipboardText' | 'exportSaveFile'>): ModeSaveTransferPort {
  return { async copy(text) {
    if (!bridge.writeClipboardText) throw Error('Native clipboard export is unavailable.')
    await bridge.writeClipboardText(text)
  }, async download(text) {
    if (!bridge.exportSaveFile) throw Error('Native file export is unavailable.')
    // Reuse the current native filename allowlist without broadening host file
    // access. The labelled payload, rather than the extension, identifies pair
    // saves versus forensic archives; the import boundary rejects the latter.
    return bridge.exportSaveFile({ fileName: 'idle-dyson-swarm-save.idsw', text })
  } }
}
