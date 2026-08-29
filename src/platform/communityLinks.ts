export const IDLE_DYSON_SWARM_DISCORD_URL =
  'https://discord.gg/dKaEy6MFCP'

export const BLINDSIDED_GAMES_APP_STORE_URL =
  'https://apps.apple.com/au/developer/blindsided-games/id1538856129'

export const BLINDSIDED_GAMES_GOOGLE_PLAY_URL =
  'https://play.google.com/store/apps/dev?id=8315705273233616064'

export const BLINDSIDED_GAMES_WEBSITE_URL =
  'https://www.blindsidedgames.com/'

export const COMMUNITY_EXTERNAL_ORIGINS = Object.freeze([
  'https://discord.gg',
  'https://apps.apple.com',
  'https://play.google.com',
  'https://www.blindsidedgames.com',
] as const)

export type CommunityStorePlatform = 'android' | 'ios' | 'web'

export type BlindsidedGamesDestination = Readonly<{
  kind: 'app-store' | 'google-play' | 'website'
  url: string
}>

export function blindsidedGamesDestination(
  platform: CommunityStorePlatform,
): BlindsidedGamesDestination {
  if (platform === 'android') {
    return Object.freeze({
      kind: 'google-play',
      url: BLINDSIDED_GAMES_GOOGLE_PLAY_URL,
    })
  }
  if (platform === 'ios') {
    return Object.freeze({
      kind: 'app-store',
      url: BLINDSIDED_GAMES_APP_STORE_URL,
    })
  }
  return Object.freeze({
    kind: 'website',
    url: BLINDSIDED_GAMES_WEBSITE_URL,
  })
}
