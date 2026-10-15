import { CATALOG_URL, PROMOTION_ORIGIN, catalogGames, parseCatalog, type PromotionCatalog, type PromotionPlatform } from './catalog'
import { promotionStorage, type PromotionCache, type PromotionStorage } from './cache'

export const REFRESH_INTERVAL = 6 * 60 * 60 * 1000
export const IMAGE_CACHE_LIMIT = 20 * 1024 * 1024
const IMAGE_LIMIT = 250 * 1024
const RETRY_INTERVAL = 60 * 1000

export interface PromotionClientOptions {
  readonly bundled: PromotionCatalog
  readonly appId: string
  readonly platform: PromotionPlatform
  readonly storage?: PromotionStorage
  readonly fetch?: typeof fetch
  readonly now?: () => number
}

/** One refresh at a time; no timers or work on simulation ticks. */
export function createPromotionClient(options: PromotionClientOptions) {
  const storage = options.storage ?? promotionStorage()
  const request = options.fetch ?? globalThis.fetch.bind(globalThis)
  const now = options.now ?? Date.now
  let state: PromotionCache = { catalog: options.bundled, checkedAt: 0, images: {} }
  let loading: Promise<void> | undefined
  let refreshing: Promise<void> | undefined
  let attemptedAt = -Infinity
  const bundledPaths = new Set(options.bundled.games.map(game => game.banner))
  const listeners = new Set<() => void>()
  const publish = (next: PromotionCache) => { state = next; listeners.forEach(listener => listener()) }
  const save = () => storage.save(state).catch(() => undefined)
  const imagePaths = (catalog: PromotionCatalog) => new Set(catalogGames(catalog, options.platform, options.appId).map(game => game.banner))
  function retainImages(images: Readonly<Record<string, Blob>>, paths: Set<string>) {
    const retained: Record<string, Blob> = {}
    let bytes = 0
    for (const path of paths) {
      const blob = images[path]
      if (!(blob instanceof Blob) || blob.type !== 'image/webp' || blob.size > IMAGE_LIMIT || bytes + blob.size > IMAGE_CACHE_LIMIT) continue
      retained[path] = blob
      bytes += blob.size
    }
    return retained
  }
  async function load() {
    try {
      const cached = await storage.load()
      if (cached) {
        const catalog = parseCatalog(cached.catalog)
        publish({ catalog, checkedAt: Number.isFinite(cached.checkedAt) ? Math.min(cached.checkedAt, now()) : 0,
          images: retainImages(cached.images ?? {}, imagePaths(catalog)) })
      }
    } catch { /* Private mode, eviction, or corrupt data: bundled content is ready. */ }
  }
  async function limitedFetch(url: string, limit: number, type: string): Promise<Blob> {
    const response = await request(url, { credentials: 'omit', redirect: 'error', cache: 'no-cache', signal: AbortSignal.timeout(10000) })
    if (!response.ok || response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== type ||
        Number(response.headers.get('content-length')) > limit) throw new Error('Invalid promotion response')
    // Bound streamed responses too: Content-Length is optional and untrusted.
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Empty promotion response')
    const chunks: Uint8Array<ArrayBuffer>[] = []
    let bytes = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > limit) throw new Error('Promotion response too large')
        chunks.push(new Uint8Array(value))
      }
    } finally { await reader.cancel() }
    return new Blob(chunks, { type })
  }
  async function refresh(force: boolean) {
    await (loading ??= load())
    if ((!force && now() - state.checkedAt < REFRESH_INTERVAL) || now() - attemptedAt < RETRY_INTERVAL) return
    attemptedAt = now()
    try {
      const json = await limitedFetch(CATALOG_URL, 512 * 1024, 'application/json')
      const catalog = parseCatalog(JSON.parse(await json.text()))
      const paths = imagePaths(catalog)
      const images = retainImages(state.images, paths)
      publish({ catalog, checkedAt: now(), images: { ...images } })
      await save() // Removals take effect even if every image request fails.
      const pending = [...paths].filter(path => !images[path] && !bundledPaths.has(path))
      let bytes = Object.values(images).reduce((sum, image) => sum + image.size, 0)
      async function worker() {
        for (let path = pending.shift(); path; path = pending.shift()) {
          try {
            const blob = await limitedFetch(`${PROMOTION_ORIGIN}${path}`, IMAGE_LIMIT, 'image/webp')
            if (bytes + blob.size <= IMAGE_CACHE_LIMIT) { images[path] = blob; bytes += blob.size }
          } catch { /* Missing artwork never invalidates a catalog or blocks claiming. */ }
        }
      }
      await Promise.all([worker(), worker()])
      publish({ ...state, images: { ...images } })
      await save()
    } catch { /* Keep the last valid catalog; retry on a later lifecycle event. */ }
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    refresh: (force = false) => refreshing ??= refresh(force).finally(() => { refreshing = undefined }),
  }
}
