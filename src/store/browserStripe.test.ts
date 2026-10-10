import { expect, test, vi } from 'vitest'
import { BETA_STRIPE_RECORD_KEY, BrowserStripeCommerce, type BrowserStripePorts } from './browserStripe'
const publicKey = 'idle-dyson-swarm:stripe-device:v1'
const deviceKey = 'existing-public-device-key-00000000000000000000'
function fixture(seed = true) {
  const records = new Map<string, string>()
  const original = JSON.stringify({ deviceKey, tokens: ['public-verified-receipt'] })
  if (seed) records.set(publicKey, original)
  let owned = true
  const requests: { endpoint: string; body: Record<string, unknown> }[] = []
  const redirect = vi.fn()
  const ports: BrowserStripePorts = {
    storage: { getItem: key => records.get(key) ?? null, setItem: (key, value) => { records.set(key, value) } },
    currentUrl: () => 'https://sandbox.invalid/rework-beta/', redirect, replaceUrl: () => undefined,
    randomBytes: () => new Uint8Array(32).fill(17),
    fetch: (async (url: string, init?: RequestInit) => {
      const body = init?.body === undefined ? {} : JSON.parse(String(init.body))
      requests.push({ endpoint: url, body })
      if (url.endsWith('/catalog')) return Response.json({ products: [{ productId: 'ids.botboost', available: true, localizedPrice: '$1.00' }] })
      if (url.endsWith('/checkout')) return Response.json({ checkoutUrl: 'https://checkout.example.invalid/synthetic-session' })
      return Response.json({ ownership: { botBoost: owned, doubleInfinityPoints: false, developerOptions: false, supporterCatGallery: false },
        tokens: owned ? ['provider-refreshed-receipt'] : [], completedProductId: null })
    }) as typeof fetch,
  }
  const commerce = () => new BrowserStripeCommerce(ports, '/api/ids/stripe', { storageKey: BETA_STRIPE_RECORD_KEY, publicReceiptKey: publicKey })
  return { commerce, records, original, requests, redirect, setOwned: (value: boolean) => { owned = value } }
}

test('beta Restore uses the public device identity and preserves public receipts across refresh/revocation', async () => {
  const f = fixture(), commerce = f.commerce()
  expect(await commerce.restorePurchases()).toMatchObject({ restoredProductIds: ['ids.botboost'] })
  expect(f.requests[0].body).toMatchObject({ deviceKey, tokens: ['public-verified-receipt'] })
  expect(f.records.get(publicKey)).toBe(f.original)
  expect(JSON.parse(f.records.get(BETA_STRIPE_RECORD_KEY)!)).toEqual({ deviceKey, tokens: ['provider-refreshed-receipt'] })
  f.setOwned(false)
  expect((await commerce.refreshOwnership()).botBoost).toBe(false)
  expect((await f.commerce().readOwnership()).botBoost).toBe(false)
  expect(f.records.get(publicKey)).toBe(f.original)
})

test('beta keeps catalog and checkout available using the existing purchase identity', async () => {
  const f = fixture(), commerce = f.commerce()
  expect(await commerce.products()).toEqual([{ productId: 'ids.botboost', available: true, localizedPrice: '$1.00' }])
  void commerce.purchase('ids.botboost')
  await vi.waitFor(() => expect(f.redirect).toHaveBeenCalledWith('https://checkout.example.invalid/synthetic-session'))
  expect(f.requests.find(request => request.endpoint.endsWith('/checkout'))?.body).toEqual({ productId: 'ids.botboost', deviceKey })
  expect(f.records.get(publicKey)).toBe(f.original)
})

test('a first-ever beta device initializes only the shared identity while provider receipts stay in beta', async () => {
  const f = fixture(false); f.setOwned(false)
  await f.commerce().readOwnership()
  const shared = JSON.parse(f.records.get(publicKey)!), beta = JSON.parse(f.records.get(BETA_STRIPE_RECORD_KEY)!)
  expect(shared.tokens).toEqual([])
  expect(shared.deviceKey.length).toBeGreaterThanOrEqual(32)
  expect(beta.deviceKey).toBe(shared.deviceKey)
  expect(f.requests[0].body.deviceKey).toBe(shared.deviceKey)
})

test('a different beta cache cannot replace the established public purchase identity', async () => {
  const f = fixture()
  f.records.set(BETA_STRIPE_RECORD_KEY, JSON.stringify({ deviceKey: 'different-device-key-00000000000000000000000000', tokens: ['foreign-receipt'] }))
  await f.commerce().readOwnership()
  expect(f.requests[0].body).toMatchObject({ deviceKey, tokens: ['public-verified-receipt'] })
  expect(f.records.get(publicKey)).toBe(f.original)
})
