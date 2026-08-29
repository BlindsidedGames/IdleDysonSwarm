import { describe, expect, test } from 'vitest'
import {
  BLINDSIDED_GAMES_APP_STORE_URL,
  BLINDSIDED_GAMES_GOOGLE_PLAY_URL,
  BLINDSIDED_GAMES_WEBSITE_URL,
  blindsidedGamesDestination,
} from './communityLinks'

describe('community links', () => {
  test('uses the Apple developer page on iOS', () => {
    expect(blindsidedGamesDestination('ios')).toEqual({
      kind: 'app-store',
      url: BLINDSIDED_GAMES_APP_STORE_URL,
    })
  })

  test('uses the Google Play developer page on Android', () => {
    expect(blindsidedGamesDestination('android')).toEqual({
      kind: 'google-play',
      url: BLINDSIDED_GAMES_GOOGLE_PLAY_URL,
    })
  })

  test('uses the studio website on Web and desktop hosts', () => {
    expect(blindsidedGamesDestination('web')).toEqual({
      kind: 'website',
      url: BLINDSIDED_GAMES_WEBSITE_URL,
    })
  })
})
