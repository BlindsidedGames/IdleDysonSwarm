export type PromotionPlatform = 'ios' | 'android' | 'web' | 'desktop'
export interface GamePromotion {
  readonly id: 'pulse' | 'eternum' | 'nanite' | 'echoes' | 'whitecell'
  readonly title: string
  readonly links: Partial<Record<PromotionPlatform, string>>
}

export const GAME_PROMOTIONS: readonly GamePromotion[] = [
  { id: 'pulse', title: 'Pulse Citadel', links: {
    ios: 'https://apps.apple.com/app/id6779441554',
    android: 'https://play.google.com/store/apps/details?id=com.blindsidedgames.pulsecitadel',
  } },
  { id: 'eternum', title: 'Eternum Inc', links: {
    ios: 'https://apps.apple.com/app/id6741140312',
    android: 'https://play.google.com/store/apps/details?id=com.blindsidedgames.idleeternum',
  } },
  { id: 'nanite', title: 'Idle Dyson Swarm: Nanite', links: {
    ios: 'https://apps.apple.com/app/id6526468962',
    android: 'https://play.google.com/store/apps/details?id=com.blindsidedgames.idledysonswarmnanite',
  } },
  { id: 'echoes', title: 'Echoes of Vasteria', links: {
    desktop: 'https://store.steampowered.com/app/2940000/Echoes_of_Vasteria/',
    web: 'https://store.steampowered.com/app/2940000/Echoes_of_Vasteria/',
  } },
  { id: 'whitecell', title: 'Whitecell', links: {
    web: 'https://www.blindsidedgames.com/games/beta/whitecell/',
    desktop: 'https://www.blindsidedgames.com/games/beta/whitecell/',
  } },
]

export function eligiblePromotions(platform: PromotionPlatform): readonly GamePromotion[] {
  return GAME_PROMOTIONS.filter(game => game.links[platform])
}

export function leastRecentlyShown(platform: PromotionPlatform, history: readonly string[]): GamePromotion | undefined {
  return [...eligiblePromotions(platform)].sort((a, b) => history.indexOf(a.id) - history.indexOf(b.id))[0]
}

const HISTORY_KEY = 'idle-dyson-swarm:promotions:v1'
let fallbackHistory: string[] = []

/** Local rotation only. No impressions or interactions leave this device. */
export function nextPromotion(platform: PromotionPlatform): GamePromotion | undefined {
  let history = fallbackHistory
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
    if (Array.isArray(stored) && stored.every(id => typeof id === 'string')) history = stored
  } catch { /* Storage is optional for game discovery. */ }
  const game = leastRecentlyShown(platform, history)
  if (game) {
    fallbackHistory = [...history.filter(id => id !== game.id), game.id].slice(-GAME_PROMOTIONS.length)
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(fallbackHistory)) } catch { /* Keep session rotation. */ }
  }
  return game
}
