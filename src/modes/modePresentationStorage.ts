import type { PresentationStorage } from '../ui/presentationStorage'
import type { GameMode } from './modeSaveStore'

/** Every source key (including disclosures, locale, skills and reload state)
 * is namespaced. Stale components retain a revoked scope, never the next mode. */
export function createModePresentationStorage(mode: GameMode, storage: PresentationStorage,
  isCurrent: () => boolean): PresentationStorage {
  const key = (value: string) => `ids-modes-ui-v1:${mode}:${encodeURIComponent(value)}`
  return {
    getItem: name => isCurrent() ? storage.getItem(key(name)) : null,
    setItem: (name, value) => { if (isCurrent()) storage.setItem(key(name), value) },
    removeItem: name => { if (isCurrent()) storage.removeItem(key(name)) },
  }
}
