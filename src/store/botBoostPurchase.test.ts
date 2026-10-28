import { describe, expect, test } from 'vitest'
import { DevelopmentStoreCommerce } from './developmentStore'
import { CachedVerifiedEntitlementAuthority, type VerifiedEntitlementRecord } from './contracts'
import { RuntimeEntitlementBridge } from './runtimeEntitlements'
import { DoubleInfinityPointsEffectPreferenceService } from './doubleInfinityPointsEffect'
import { StorefrontController } from './storefront'

describe('permanent Bot boost ownership', () => {
  test('purchase and restore project verified ownership into the running game', async () => {
    const commerce = new DevelopmentStoreCommerce()
    const effect = new DoubleInfinityPointsEffectPreferenceService()
    const bridge = new RuntimeEntitlementBridge(commerce, effect)
    await bridge.initialize()
    const store = new StorefrontController({ store: commerce, entitlements: commerce, doubleInfinityPointsEffect: effect,
      onVerifiedOwnershipChanged: async () => { await bridge.synchronize(); return true } })
    await store.initialize()
    await store.purchase('ids.botboost')
    expect(store.getSnapshot().hostOwnership.botBoost).toBe(true)
    expect(bridge.currentDysonEntitlements().permanentBotBoost).toBe(true)
    await store.restorePurchases()
    expect(store.getSnapshot().feedback).toMatchObject({ kind: 'restore-completed', restoredCount: 1 })
  })

  test('retains verified ownership offline but honours a later provider revocation', async () => {
    let record: Readonly<VerifiedEntitlementRecord> | null = null
    let offline = false
    let owned = true
    const source = { readVerifiedOwnership: async () => {
      if (offline) throw new Error('offline')
      return { doubleInfinityPoints: false, developerOptions: false, supporterCatGallery: false, botBoost: owned }
    } }
    const cache = { read: async () => record, write: async (value: Readonly<VerifiedEntitlementRecord>) => { record = value } }
    const authority = new CachedVerifiedEntitlementAuthority(source, cache, () => new Date().toISOString())
    expect((await authority.refreshOwnership()).botBoost).toBe(true)
    offline = true
    const reloaded = new CachedVerifiedEntitlementAuthority(source, cache, () => new Date().toISOString())
    expect((await reloaded.readOwnership()).botBoost).toBe(true)
    offline = false
    owned = false
    expect((await reloaded.refreshOwnership()).botBoost).toBe(false)
  })

  test('projects a revoked boost even when restore finds no purchases', async () => {
    let owned = true
    const ownership = () => ({ doubleInfinityPoints: false, developerOptions: false, supporterCatGallery: false, botBoost: owned })
    const entitlements = { readOwnership: async () => ownership(), refreshOwnership: async () => ownership() }
    const effect = new DoubleInfinityPointsEffectPreferenceService()
    const bridge = new RuntimeEntitlementBridge(entitlements, effect)
    await bridge.initialize()
    const commerce = new DevelopmentStoreCommerce()
    const store = new StorefrontController({ store: commerce, entitlements, doubleInfinityPointsEffect: effect,
      onVerifiedOwnershipChanged: async () => { await bridge.synchronize(); return true } })
    await store.initialize()
    expect(bridge.currentDysonEntitlements().permanentBotBoost).toBe(true)
    owned = false
    await store.restorePurchases()
    expect(bridge.currentDysonEntitlements().permanentBotBoost).toBe(false)
    expect(store.getSnapshot().feedback).toMatchObject({ kind: 'restore-completed', restoredCount: 0 })
  })
})
