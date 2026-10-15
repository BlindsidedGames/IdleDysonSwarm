/** Stable presentation-only storage boundary. Ordinary hosts retain their
 * existing keys. A mode document installs its fenced namespace before imports
 * construct any preferences, and releases it after unmount. */
export interface PresentationStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
const revoked: PresentationStorage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
let installed: PresentationStorage | undefined
let claimed = false
export function getPresentationStorage(): PresentationStorage | null {
  if (installed) return installed
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}
export function installPresentationStorage(storage: PresentationStorage): () => void {
  if (claimed) throw new Error('A presentation document already owns its storage scope.')
  claimed = true
  installed = storage
  return () => { if (installed === storage) { installed = revoked; claimed = false } }
}
