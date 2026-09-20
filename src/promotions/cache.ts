import type { PromotionCatalog } from './catalog'

export interface PromotionCache {
  readonly catalog: PromotionCatalog
  readonly checkedAt: number
  readonly images: Readonly<Record<string, Blob>>
}
export interface PromotionStorage {
  load(): Promise<PromotionCache | undefined>
  save(value: PromotionCache): Promise<void>
}

/** Marketing data never enters the game-save database or exported saves. */
export function promotionStorage(): PromotionStorage {
  function access(value?: PromotionCache): Promise<PromotionCache | undefined> {
    return new Promise((resolve, reject) => {
      let db: IDBDatabase | undefined
      let settled = false
      const timer = setTimeout(() => finish(new Error('Promotion storage timeout')), 3000)
      const finish = (error?: unknown, result?: PromotionCache) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        db?.close()
        if (error) reject(error); else resolve(result)
      }
      try {
        const request = indexedDB.open('blindsided-promotions-v1', 1)
        request.onupgradeneeded = () => request.result.createObjectStore('cache')
        request.onerror = () => finish(request.error)
        request.onblocked = () => finish(new Error('Promotion storage blocked'))
        request.onsuccess = () => {
          db = request.result
          if (settled) { db.close(); return }
          try {
            const tx = db.transaction('cache', value ? 'readwrite' : 'readonly')
            const store = tx.objectStore('cache')
            const operation = value ? store.put(value, 'current') : store.get('current')
            tx.oncomplete = () => finish(undefined, value ?? operation.result)
            tx.onabort = () => finish(tx.error ?? new Error('Promotion storage aborted'))
            tx.onerror = () => finish(tx.error)
          } catch (error) { finish(error) }
        }
      } catch (error) { finish(error) }
    })
  }
  return { load: () => access(), save: async value => { await access(value) } }
}
