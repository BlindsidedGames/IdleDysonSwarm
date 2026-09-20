import { describe, expect, test, vi } from 'vitest'
import { catalogGames, localizedCopy, parseCatalog, type PromotionCatalog } from './catalog'
import { createPromotionClient, REFRESH_INTERVAL } from './client'
import type { PromotionCache, PromotionStorage } from './cache'
import bundled from './bundled.json'
const base = parseCatalog(bundled)
const remote = (): PromotionCatalog => ({ ...base, revision: 'next', games: [{
  ...base.games[0], id: 'new-game', banner: '/promotions/images/new-game.123456789abc.webp',
}] })
function harness() {
  let stored: PromotionCache | undefined
  const storage: PromotionStorage = { load: vi.fn(async () => stored), save: vi.fn(async state => { stored = structuredClone(state) }) }
  let time = REFRESH_INTERVAL * 2
  const request = vi.fn<typeof fetch>(async url => String(url).endsWith('.json')
    ? Response.json(remote()) : new Response(new Blob(['art'], { type: 'image/webp' })))
  const client = () => createPromotionClient({ bundled: base, appId: 'idle-dyson-swarm', platform: 'ios', storage, fetch: request, now: () => time })
  return { storage, request, client, advance: () => { time += REFRESH_INTERVAL + 1 } }
}
describe('promotion catalog', () => {
  test('filters availability, self, disabled entries, and falls back through locales', () => {
    expect(catalogGames(base, 'android', 'idle-dyson-swarm').map(g => g.id)).toEqual(['pulse', 'echoes', 'eternum', 'nanite'])
    expect(catalogGames(base, 'desktop', 'idle-dyson-swarm').map(g => g.id)).toEqual(['echoes', 'rocket-mania', 'space-shooter'])
    const game = { ...base.games[0], copy: { en: { title: 'English', description: 'English copy' }, fr: { title: 'French', description: 'French copy' } } }
    expect(localizedCopy(game, 'fr-CA').title).toBe('French')
    expect(localizedCopy(game, 'xx').title).toBe('English')
    expect(catalogGames({ ...base, games: [{ ...game, enabled: false }] }, 'ios', '')).toEqual([])
  })
  test('rejects unsupported schemas, duplicate IDs, foreign images and unsafe links', () => {
    expect(() => parseCatalog({ ...base, schemaVersion: 2 })).toThrow()
    expect(() => parseCatalog({ ...base, games: [base.games[0], base.games[0]] })).toThrow()
    for (const change of [{ banner: 'https://evil.test/image.webp' }, { links: { ios: 'https://evil.test' } }, { links: { web: 'javascript:alert(1)' } }]) {
      expect(() => parseCatalog({ ...base, games: [{ ...base.games[0], ...change }] })).toThrow()
    }
    expect(parseCatalog({ ...base, futureField: true }).revision).toBe(base.revision)
  })
})
describe('promotion updates', () => {
  test('explicit discovery checks remove delisted games even while the cache is fresh', async () => {
    const h = harness()
    await h.storage.save({ catalog: { ...base, games: [{ ...base.games[0], id: 'labs' }] },
      checkedAt: REFRESH_INTERVAL * 2, images: {} })
    h.request.mockImplementation(async () => Response.json({ ...base, games: [] }))
    const client = h.client()
    await client.refresh()
    expect(client.getSnapshot().catalog.games[0].id).toBe('labs')
    expect(h.request).not.toHaveBeenCalled()
    await client.refresh(true)
    expect(client.getSnapshot().catalog.games).toEqual([])
    await client.refresh(true)
    expect(h.request).toHaveBeenCalledTimes(1)
  })

  test('downloads a new game and its image, then restores both offline without fetching', async () => {
    const h = harness(); const first = h.client()
    await Promise.all([first.refresh(), first.refresh()])
    expect(h.request).toHaveBeenCalledTimes(2)
    expect(first.getSnapshot().catalog.revision).toBe('next')
    expect(await first.getSnapshot().images[remote().games[0].banner].text()).toBe('art')
    h.request.mockRejectedValue(new Error('offline'))
    const restarted = h.client(); await restarted.refresh()
    expect(restarted.getSnapshot().catalog.revision).toBe('next')
    expect(await restarted.getSnapshot().images[remote().games[0].banner].text()).toBe('art')
    expect(h.request).toHaveBeenCalledTimes(2)
  })
  test('keeps valid cache after a bad response; valid empty updates remove entries and obsolete images', async () => {
    const h = harness(); const client = h.client(); await client.refresh(); h.advance()
    h.request.mockResolvedValue(Response.json({ schemaVersion: 99 }))
    await client.refresh(); expect(client.getSnapshot().catalog.revision).toBe('next')
    h.advance(); h.request.mockImplementation(async () => Response.json({ ...base, revision: 'removed', games: [] }))
    await client.refresh()
    expect(client.getSnapshot().catalog.games).toEqual([])
    expect(client.getSnapshot().images).toEqual({})
  })
  test('image and persistent storage failures leave the session catalog usable', async () => {
    const h = harness()
    vi.mocked(h.storage.load).mockRejectedValue(new Error('private mode'))
    vi.mocked(h.storage.save).mockRejectedValue(new Error('quota'))
    h.request.mockImplementation(async url => {
      if (String(url).endsWith('.json')) return Response.json(remote())
      throw new Error('missing image')
    })
    const client = h.client(); await client.refresh()
    expect(client.getSnapshot().catalog.revision).toBe('next')
    expect(client.getSnapshot().images).toEqual({})
  })
  test('reuses bundled artwork and rejects oversized images without discarding the catalog', async () => {
    const h = harness(); h.request.mockImplementation(async () => Response.json(base))
    await h.client().refresh(); expect(h.request).toHaveBeenCalledTimes(1)
    const other = harness()
    other.request.mockImplementation(async url => String(url).endsWith('.json') ? Response.json(remote())
      : new Response(new Blob([new Uint8Array(256001)], { type: 'image/webp' })))
    const client = other.client(); await client.refresh()
    expect(client.getSnapshot().catalog.revision).toBe('next')
    expect(client.getSnapshot().images).toEqual({})
  })
})
