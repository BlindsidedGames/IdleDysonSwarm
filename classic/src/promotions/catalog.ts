/** Public, gameplay-independent v1 catalog contract. Copy is plain text, never HTML. */
export type PromotionPlatform = 'ios' | 'android' | 'web' | 'desktop'
export interface PromotionCopy { readonly title: string; readonly description: string }
export interface CatalogGame {
  readonly id: string
  readonly enabled: boolean
  readonly copy: Readonly<Record<string, PromotionCopy>>
  readonly links: Partial<Record<PromotionPlatform, string>>
  readonly banner: string
}
export interface PromotionCatalog {
  readonly schemaVersion: 1
  readonly revision: string
  readonly games: readonly CatalogGame[]
}
export const PROMOTION_ORIGIN = 'https://www.blindsidedgames.com'
export const CATALOG_URL = `${PROMOTION_ORIGIN}/promotions/v1/catalog.json`
const platforms: readonly PromotionPlatform[] = ['ios', 'android', 'web', 'desktop']
const destinationOrigins = new Set(['https://apps.apple.com', 'https://play.google.com',
  'https://store.steampowered.com', PROMOTION_ORIGIN, 'https://ids.blindsidedgames.com'])
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max

export function parseCatalog(value: unknown): PromotionCatalog {
  if (!record(value) || value.schemaVersion !== 1 || !text(value.revision, 100) ||
      !Array.isArray(value.games) || value.games.length > 100) throw new Error('Unsupported promotion catalog')
  const ids = new Set<string>()
  for (const game of value.games) {
    if (!record(game) || !text(game.id, 80) || !/^[a-z0-9-]+$/.test(game.id) || ids.has(game.id) ||
        typeof game.enabled !== 'boolean' || !record(game.copy) || !game.copy.en ||
        !record(game.links) || !text(game.banner, 200) ||
        !/^\/promotions\/images\/[a-z0-9-]+\.[a-f0-9]{12}\.webp$/.test(game.banner)) throw new Error('Invalid promotion entry')
    ids.add(game.id)
    for (const copy of Object.values(game.copy)) {
      if (!record(copy) || !text(copy.title, 150) || !text(copy.description, 1000)) throw new Error('Invalid promotion copy')
    }
    for (const [platform, link] of Object.entries(game.links)) {
      if (!platforms.includes(platform as PromotionPlatform)) continue // Additive platform support is forward-compatible.
      if (!text(link, 1000)) throw new Error('Invalid promotion destination')
      const url = new URL(link)
      if (!destinationOrigins.has(url.origin) || url.username || url.password ||
          (platform === 'ios' && url.origin !== 'https://apps.apple.com') ||
          (platform === 'android' && url.origin !== 'https://play.google.com')) throw new Error('Untrusted promotion destination')
    }
  }
  return value as unknown as PromotionCatalog
}

export function localizedCopy(game: CatalogGame, locale: string): PromotionCopy {
  const key = locale.toLowerCase()
  const entries = Object.entries(game.copy)
  return entries.find(([tag]) => tag.toLowerCase() === key)?.[1]
    ?? entries.find(([tag]) => tag.toLowerCase() === key.split('-')[0])?.[1]
    ?? game.copy.en
}

export function catalogGames(catalog: PromotionCatalog, platform: PromotionPlatform, appId: string) {
  return catalog.games.filter(game => game.enabled && game.id !== appId && Boolean(game.links[platform]))
}
