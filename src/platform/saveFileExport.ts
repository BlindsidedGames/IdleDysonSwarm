import { Capacitor } from '@capacitor/core'

export interface SaveFileExportRequest {
  readonly fileName: string
  readonly text: string
}
export type SaveFileExportResult = 'saved' | 'cancelled'

/** Mobile Apple devices retain the copy-string export workflow. */
export function canExportSaveFile(
  platform = Capacitor.getPlatform(),
  userAgent = globalThis.navigator?.userAgent ?? '',
  touchPoints = globalThis.navigator?.maxTouchPoints ?? 0,
): boolean {
  if (platform === 'ios') return false
  if (platform === 'android') return true
  return !/iPhone|iPad|iPod/i.test(userAgent) &&
    !(/Macintosh/i.test(userAgent) && touchPoints > 1)
}

export const SAVE_EXPORT_TIMESTAMP_KEY = 'idle-dyson-swarm:timestamp-save-exports'

export function saveExportFileName(timestampEnabled: boolean, now = new Date()): string {
  return timestampEnabled
    ? `idle-dyson-swarm-save-${now.toISOString().replace(/[:.]/g, '-')}.idsw`
    : 'idle-dyson-swarm-save.idsw'
}
