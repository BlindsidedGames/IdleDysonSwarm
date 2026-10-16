import { BrowserTextDownloadAdapter, type TextDownloadPort } from '../platform/browserSaveTransfer'
import type { NativeHostBridgeApi } from '../platform/nativeHostBridge'
import { canExportSaveFile, saveExportFileName } from '../platform/saveFileExport'

export interface ModeSaveTransferPort {
  readonly downloadAvailable?: boolean
  copy(text: string): Promise<void>
  download(text: string, recovery: boolean, timestampEnabled?: boolean): Promise<'saved' | 'cancelled'>
}
/** All writes require an explicit Settings action. Constructing this port does
 * not inspect the clipboard, choose a file or open a native store/account. */
export function bindBrowserModeSaveTransfers(downloads: TextDownloadPort = new BrowserTextDownloadAdapter()): ModeSaveTransferPort {
  return { downloadAvailable: canExportSaveFile(), copy: text => navigator.clipboard.writeText(text), async download(text, recovery, timestampEnabled = false) {
    downloads.downloadText(recovery ? 'idle-dyson-swarm-mode-recovery.json' : saveExportFileName(timestampEnabled), text, 'text/plain;charset=utf-8')
    return 'saved'
  } }
}
export function bindNativeModeSaveTransfers(bridge: Pick<NativeHostBridgeApi, 'writeClipboardText' | 'exportSaveFile'>): ModeSaveTransferPort {
  return { downloadAvailable: Boolean(bridge.exportSaveFile), async copy(text) {
    if (!bridge.writeClipboardText) throw Error('Native clipboard export is unavailable.')
    await bridge.writeClipboardText(text)
  }, async download(text, recovery, timestampEnabled = false) {
    if (!bridge.exportSaveFile) throw Error('Native file export is unavailable.')
    // Reuse the current native filename allowlist without broadening host file
    // access. Normal exports contain the current mode's standalone save; recovery
    // archives remain a separate format that the import boundary rejects.
    return bridge.exportSaveFile({ fileName: saveExportFileName(!recovery && timestampEnabled), text })
  } }
}
