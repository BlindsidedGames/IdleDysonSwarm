import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  CANONICAL_STORE_PRODUCTS,
  STORE_PRODUCT_IDS,
} from './contracts'
import { DevelopmentStoreCommerce } from './developmentStore'
import { StorefrontController } from './storefront'

afterEach(() => vi.unstubAllGlobals())

describe('development Store commerce', () => {
  test('exposes all five real products with a compact zero-cost test label', async () => {
    const commerce = new DevelopmentStoreCommerce()

    await expect(commerce.products()).resolves.toEqual(
      CANONICAL_STORE_PRODUCTS.map((product) => ({
        productId: product.id,
        localizedPrice: 'Test $0',
        available: true,
      })),
    )
  })

  test('simulates verified supporter success, cancellation and failure', async () => {
    const commerce = new DevelopmentStoreCommerce()

    await expect(
      commerce.purchase(STORE_PRODUCT_IDS.tipTier1),
    ).resolves.toEqual({
      accepted: true,
      productId: STORE_PRODUCT_IDS.tipTier1,
    })
    await expect(
      commerce.purchase(STORE_PRODUCT_IDS.tipTier2),
    ).resolves.toEqual({
      accepted: false,
      productId: STORE_PRODUCT_IDS.tipTier2,
      code: 'purchase-cancelled',
    })
    await expect(
      commerce.purchase(STORE_PRODUCT_IDS.tipTier3),
    ).resolves.toEqual({
      accepted: false,
      productId: STORE_PRODUCT_IDS.tipTier3,
      code: 'purchase-failed',
    })
    await expect(commerce.readOwnership()).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: true,
    })
    await expect(commerce.restorePurchases()).resolves.toEqual({
      restoredProductIds: [],
    })
  })

  test('verifies successful durable purchases and restores only owned durable products', async () => {
    const commerce = new DevelopmentStoreCommerce()

    await commerce.purchase(STORE_PRODUCT_IDS.developerOptions)
    await commerce.purchase(STORE_PRODUCT_IDS.doubleInfinityPoints)

    await expect(commerce.refreshOwnership()).resolves.toEqual({
      developerOptions: true,
      doubleInfinityPoints: true,
      supporterCatGallery: false,
    })
    await expect(commerce.restorePurchases()).resolves.toEqual({
      restoredProductIds: [
        STORE_PRODUCT_IDS.developerOptions,
        STORE_PRODUCT_IDS.doubleInfinityPoints,
      ],
    })
  })

  test('supports deterministic restore fixtures without provider storage', async () => {
    const commerce = new DevelopmentStoreCommerce({
      initialOwnership: { doubleInfinityPoints: true },
    })

    await expect(commerce.restorePurchases()).resolves.toEqual({
      restoredProductIds: [STORE_PRODUCT_IDS.doubleInfinityPoints],
    })
    await expect(commerce.readOwnership()).resolves.toEqual({
      developerOptions: false,
      doubleInfinityPoints: true,
      supporterCatGallery: false,
    })
  })

  test('lets every supporter SKU independently grant gallery access only', async () => {
    for (const productId of [
      STORE_PRODUCT_IDS.tipTier1,
      STORE_PRODUCT_IDS.tipTier2,
      STORE_PRODUCT_IDS.tipTier3,
    ]) {
      const commerce = new DevelopmentStoreCommerce({
        outcomes: { [productId]: 'success' },
      })

      await commerce.purchase(productId)

      await expect(commerce.readOwnership()).resolves.toEqual({
        doubleInfinityPoints: false,
        developerOptions: false,
        supporterCatGallery: true,
      })
    }
  })

  test('drives verified storefront entitlements without any network request', async () => {
    const fetch = vi.fn(() => {
      throw new Error('Development Store must not contact a provider.')
    })
    vi.stubGlobal('fetch', fetch)
    const commerce = new DevelopmentStoreCommerce()
    const controller = new StorefrontController({
      store: commerce,
      entitlements: commerce,
    })

    await controller.initialize()
    await controller.purchase(STORE_PRODUCT_IDS.developerOptions)

    expect(controller.getSnapshot()).toMatchObject({
      hostOwnership: {
        developerOptions: true,
        doubleInfinityPoints: false,
        supporterCatGallery: false,
      },
      feedback: {
        kind: 'entitlement-verified',
        productId: STORE_PRODUCT_IDS.developerOptions,
      },
    })
    expect(fetch).not.toHaveBeenCalled()
  })
})
