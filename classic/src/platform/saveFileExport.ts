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
