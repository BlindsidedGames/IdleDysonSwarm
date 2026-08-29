import { describe, expect, test } from 'vitest'
import {
  CANONICAL_STORE_PRODUCTS,
  createEmptyHostEntitlementOwnership,
  getCanonicalStoreProduct,
  isSupporterProductId,
  STORE_PRODUCT_IDS,
  type StoreProductId,
} from './contracts'

describe('canonical Store product catalog', () => {
  test('keeps stable IDs and catalog classifications authoritative', () => {
    expect(CANONICAL_STORE_PRODUCTS.map((product) => product.id)).toEqual([
      STORE_PRODUCT_IDS.tipTier1,
      STORE_PRODUCT_IDS.tipTier2,
      STORE_PRODUCT_IDS.tipTier3,
      STORE_PRODUCT_IDS.developerOptions,
      STORE_PRODUCT_IDS.doubleInfinityPoints,
    ])
    expect(
      CANONICAL_STORE_PRODUCTS.filter((product) =>
        isSupporterProductId(product.id),
      ).map((product) => product.id),
    ).toEqual([
      STORE_PRODUCT_IDS.tipTier1,
      STORE_PRODUCT_IDS.tipTier2,
      STORE_PRODUCT_IDS.tipTier3,
    ])
    expect(
      getCanonicalStoreProduct(STORE_PRODUCT_IDS.developerOptions)
        .durability,
    ).toBe('durable')
    expect(
      getCanonicalStoreProduct(STORE_PRODUCT_IDS.doubleInfinityPoints)
        .durability,
    ).toBe('durable')
    expect(() =>
      getCanonicalStoreProduct('ids.unknown' as StoreProductId),
    ).toThrow('Unknown Store product: ids.unknown')
    expect(
      isSupporterProductId('ids.unknown' as StoreProductId),
    ).toBe(false)
  })

  test('defines one immutable empty host ownership value', () => {
    const ownership = createEmptyHostEntitlementOwnership()
    expect(ownership).toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: false,
    })
    expect(Object.isFrozen(ownership)).toBe(true)
    expect(createEmptyHostEntitlementOwnership()).not.toBe(ownership)
  })
})
