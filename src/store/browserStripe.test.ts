import { describe, expect, test, vi } from 'vitest'
import { BrowserStripeCommerce, type BrowserStripePorts } from './browserStripe'
import { STORE_PRODUCT_IDS } from './contracts'

function ports(
  fetchImplementation: typeof fetch,
  url = 'https://ids.blindsidedgames.com/play/',
) {
  const values = new Map<string, string>()
  const redirect = vi.fn()
  const replaceUrl = vi.fn()
  const result: BrowserStripePorts = {
    fetch: fetchImplementation,
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    currentUrl: () => url,
    redirect,
    replaceUrl,
    randomBytes: () => Uint8Array.from({ length: 32 }, (_, index) => index),
  }
  return { ports: result, values, redirect, replaceUrl }
}

describe('BrowserStripeCommerce', () => {
  test('loads only server-presented pricing', async () => {
    const environment = ports(vi.fn(async () => new Response(JSON.stringify({
      products: [{
        productId: STORE_PRODUCT_IDS.doubleInfinityPoints,
        localizedPrice: 'A$4.99',
        available: true,
      }],
    }), { status: 200 })))

    await expect(new BrowserStripeCommerce(environment.ports).products())
      .resolves.toEqual([{
        productId: STORE_PRODUCT_IDS.doubleInfinityPoints,
        localizedPrice: 'A$4.99',
        available: true,
      }])
  })

  test('binds Checkout creation to a generated browser key', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      expect(body.productId).toBe(STORE_PRODUCT_IDS.tipTier1)
      expect(typeof body.deviceKey).toBe('string')
      expect(String(body.deviceKey)).toHaveLength(43)
      return new Response(JSON.stringify({ checkoutUrl: 'https://checkout.stripe.test/session' }))
    }) as typeof fetch
    const environment = ports(fetchMock)
    const commerce = new BrowserStripeCommerce({
      ...environment.ports,
      redirect: (url) => {
        environment.redirect(url)
        throw new Error('navigation')
      },
    })

    await expect(
      commerce.purchase(STORE_PRODUCT_IDS.tipTier1),
    ).rejects.toThrow('navigation')
    expect(environment.redirect).toHaveBeenCalledWith(
      'https://checkout.stripe.test/session',
    )
  })

  test('stores a verified durable receipt and removes the Checkout query', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        sessionId?: string
        tokens: string[]
      }
      expect(body.sessionId).toBe('cs_test_verified')
      expect(body.tokens).toEqual([])
      return new Response(JSON.stringify({
        ownership: {
          doubleInfinityPoints: true,
          developerOptions: false,
          supporterCatGallery: false,
        },
        tokens: ['signed-device-receipt'],
        completedProductId: STORE_PRODUCT_IDS.doubleInfinityPoints,
      }))
    }) as typeof fetch
    const environment = ports(
      fetchMock,
      'https://ids.blindsidedgames.com/play/?stripe_session_id=cs_test_verified',
    )

    await expect(
      new BrowserStripeCommerce(environment.ports).readOwnership(),
    ).resolves.toEqual({
      doubleInfinityPoints: true,
      developerOptions: false,
      supporterCatGallery: false,
    })
    expect(environment.replaceUrl).toHaveBeenCalledWith(
      'https://ids.blindsidedgames.com/play/',
    )
    expect([...environment.values.values()][0]).toContain(
      'signed-device-receipt',
    )
  })

  test('fails closed when this browser cannot reach verification', async () => {
    const environment = ports(vi.fn(async () => {
      throw new Error('offline')
    }) as typeof fetch)

    await expect(
      new BrowserStripeCommerce(environment.ports).readOwnership(),
    ).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: false,
    })
  })

  test('grants and retains supporter access only from verified server ownership', async () => {
    let offline = false
    const fetchMock = vi.fn(async () => {
      if (offline) throw new Error('offline')
      return new Response(JSON.stringify({
        ownership: {
          doubleInfinityPoints: false,
          developerOptions: false,
          supporterCatGallery: true,
        },
        tokens: ['signed-supporter-receipt'],
        completedProductId: STORE_PRODUCT_IDS.tipTier2,
      }))
    }) as typeof fetch
    const environment = ports(fetchMock)
    const commerce = new BrowserStripeCommerce(environment.ports)

    await expect(commerce.refreshOwnership()).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: true,
    })
    offline = true
    await expect(commerce.refreshOwnership()).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: true,
    })
  })

  test('normalizes missing and malformed supporter ownership fail closed', async () => {
    const environment = ports(vi.fn(async () => new Response(JSON.stringify({
      ownership: { doubleInfinityPoints: false, developerOptions: false },
      tokens: ['legacy-token'],
      completedProductId: null,
    }))) as typeof fetch)

    await expect(
      new BrowserStripeCommerce(environment.ports).refreshOwnership(),
    ).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: false,
    })
  })

  test('does not trust a browser-authored supporter flag', async () => {
    const environment = ports(vi.fn(async () => {
      throw new Error('offline')
    }) as typeof fetch)
    environment.values.set('idle-dyson-swarm:stripe-device:v1', JSON.stringify({
      deviceKey: 'x'.repeat(43),
      tokens: [],
      supporterCatGallery: true,
    }))

    await expect(
      new BrowserStripeCommerce(environment.ports).readOwnership(),
    ).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: false,
    })
  })
})
