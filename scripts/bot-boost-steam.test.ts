import { describe, expect, test } from 'vitest'
import { SteamInventoryStore, validateSteamInventoryConfig } from '../hosts/electron/steamInventoryStore.mjs'

const products = { 'ids.tiptier1': 1001, 'ids.tiptier2': 1002, 'ids.tiptier3': 1003, 'ids.devoptions': 1004, 'ids.doubleip': 1005 }
describe('Steam Bot boost', () => {
  test('leaves existing sales working while the new ItemDef is unconfigured', async () => {
    const config = validateSteamInventoryConfig({ schemaVersion: 1, enabled: true, steamAppId: 4348570, products }, 4348570)
    const store = new SteamInventoryStore({ config, binding: {
      getAuthenticatedSteamId: async () => '76561198000000000', getAllItems: async () => [],
      requestLocalizedPrices: async (ids: number[]) => ids.map(itemDefId => ({ itemDefId, localizedPrice: '$1' })),
      startPurchase: async () => { throw new Error('Unconfigured product must not reach purchasing') },
    }, cache: { read: async () => null, write: async () => {} } })
    const listings = await store.products()
    expect(listings.find(item => item.productId === 'ids.doubleip')?.available).toBe(true)
    expect(listings.find(item => item.productId === 'ids.botboost')?.available).toBe(false)
    expect((await store.purchase('ids.botboost')).code).toBe('store-unavailable')
  })
  test('restores configured permanent boost inventory and honours revocation', async () => {
    // Fixture ItemDef only; release configuration requires the actual published ID.
    const config = validateSteamInventoryConfig({ schemaVersion: 1, enabled: true, steamAppId: 4348570,
      products: { ...products, 'ids.botboost': 1006 } }, 4348570)
    let owned = true
    const store = new SteamInventoryStore({ config, binding: {
      getAuthenticatedSteamId: async () => '76561198000000000',
      getAllItems: async () => owned ? [{ itemDefId: 1006, instanceId: '123', quantity: 1 }] : [],
      requestLocalizedPrices: async () => [], startPurchase: async () => ({ status: 'completed' }),
    }, cache: { read: async () => null, write: async () => {} } })
    expect(await store.restorePurchases()).toEqual({ restoredProductIds: ['ids.botboost'] })
    expect((await store.readEntitlements()).botBoost).toBe(true)
    owned = false
    expect((await store.readEntitlements(true)).botBoost).toBe(false)
  })
})
