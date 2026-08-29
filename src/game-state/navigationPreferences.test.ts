import { describe, expect, test } from 'vitest'
import {
  DEFAULT_BOTTOM_NAVIGATION_VISIBILITY,
  normalizeBottomNavigationVisibility,
} from './navigationPreferences'

describe('bottom navigation preferences', () => {
  test('uses the approved first-run defaults', () => {
    expect(DEFAULT_BOTTOM_NAVIGATION_VISIBILITY).toEqual({
      bots: true,
      research: true,
      skills: true,
      infinity: true,
      reality: true,
      simulations: true,
      quantum: true,
      store: true,
      story: false,
      wiki: true,
      'offline-time': false,
      statistics: false,
      settings: true,
    })
  })

  test('preserves every explicit stored choice over defaults', () => {
    const normalized = normalizeBottomNavigationVisibility(
      {
        store: false,
        wiki: false,
        statistics: true,
        'future-destination': true,
      },
      { story: true, wiki: true, statistics: false },
    )

    expect(normalized).toMatchObject({
      store: false,
      story: true,
      wiki: false,
      statistics: true,
      'future-destination': true,
    })
  })
})
