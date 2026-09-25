import bundled from '../promotions/bundled.json'
import { catalogGames, localizedCopy, parseCatalog, type PromotionPlatform } from '../promotions/catalog'
import { createPromotionClient } from '../promotions/client'
export type { PromotionPlatform } from '../promotions/catalog'

export interface GamePromotion {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly links: Partial<Record<PromotionPlatform, string>>
  readonly image?: Blob
  readonly fallbackImage?: string
}
const bundledCatalog = parseCatalog(bundled)
const bundledAssets = import.meta.glob<string>('../promotions/assets/*.webp', { eager: true, query: '?url', import: 'default' })
const bundledImages = new Map(bundledCatalog.games.map(game => [game.id,
  bundledAssets[`../promotions/assets/${game.banner.split('/').pop()}`]]))
let client: ReturnType<typeof createPromotionClient> | undefined
let stop: (() => void) | undefined
const listeners = new Set<() => void>()

export function promotionPlatform(nativeTarget?: string): PromotionPlatform {
  if (nativeTarget === 'ios' || nativeTarget === 'android') return nativeTarget
  if (nativeTarget === 'electron') return 'desktop'
  if (/android/i.test(navigator.userAgent)) return 'android'
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  return 'web'
}

export function startPromotions(platform: PromotionPlatform) {
  if (client) return
  client = createPromotionClient({ bundled: bundledCatalog, platform, appId: 'idle-dyson-swarm' })
  client.subscribe(() => listeners.forEach(listener => listener()))
  listeners.forEach(listener => listener())
  const refresh = () => { if (document.visibilityState !== 'hidden') void client?.refresh() }
  document.addEventListener('visibilitychange', refresh)
  window.addEventListener('online', refresh)
  window.addEventListener('pageshow', refresh)
  stop = () => {
    document.removeEventListener('visibilitychange', refresh)
    window.removeEventListener('online', refresh)
    window.removeEventListener('pageshow', refresh)
  }
  void client.refresh(true)
}
if (import.meta.hot) import.meta.hot.dispose(() => stop?.())
export const subscribePromotions = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export const refreshPromotions = () => { void client?.refresh(true) }
export const promotionSnapshot = () => client?.getSnapshot()

export function eligiblePromotions(platform: PromotionPlatform, locale = 'en'): readonly GamePromotion[] {
  const state = client?.getSnapshot()
  return catalogGames(state?.catalog ?? bundledCatalog, platform, 'idle-dyson-swarm').map(game => ({
    id: game.id, ...localizedCopy(game, locale), links: game.links,
    image: state?.images[game.banner], fallbackImage: bundledImages.get(game.id),
  }))
}

export function leastRecentlyShown(platform: PromotionPlatform, history: readonly string[], locale = 'en'): GamePromotion | undefined {
  return [...eligiblePromotions(platform, locale)].sort((a, b) => history.indexOf(a.id) - history.indexOf(b.id))[0]
}
const HISTORY_KEY = 'idle-dyson-swarm:promotions:v1'
let fallbackHistory: string[] = []
let historyStorageFailed = false

/** Local rotation only. No impressions or interactions leave this device. */
export function nextPromotion(platform: PromotionPlatform, locale = 'en'): GamePromotion | undefined {
  let history = fallbackHistory
  try {
    const stored: unknown = historyStorageFailed ? fallbackHistory : JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
    if (Array.isArray(stored) && stored.every(id => typeof id === 'string')) history = stored
  } catch { historyStorageFailed = true }
  const game = leastRecentlyShown(platform, history, locale)
  if (game) {
    const ids = new Set(eligiblePromotions(platform).map(candidate => candidate.id))
    fallbackHistory = [...history.filter(id => id !== game.id && ids.has(id)), game.id]
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(fallbackHistory)) } catch { historyStorageFailed = true }
  }
  return game
}
