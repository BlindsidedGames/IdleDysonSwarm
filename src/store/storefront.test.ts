import { describe, expect, test, vi } from 'vitest'
import {
  CachedVerifiedEntitlementAuthority,
  STORE_PRODUCT_IDS,
  type EntitlementAuthority,
  type EntitlementOwnershipCache,
  type HostEntitlementOwnership,
  type StoreAdapter,
  type StoreProductId,
  type VerifiedEntitlementRecord,
  type VerifiedEntitlementSource,
} from './contracts'
import { StorefrontController } from './storefront'
import { RuntimeEntitlementBridge } from './runtimeEntitlements'

describe('StorefrontController', () => {
  test('verifies repeatable supporter tiers without granting gameplay access', async () => {
    const store = fakeStore()
    const entitlements = fakeAuthority({
      refresh: {
        doubleInfinityPoints: false,
        developerOptions: false,
        supporterCatGallery: true,
      },
    })
    const controller = new StorefrontController({ store, entitlements })

    await controller.initialize()
    await controller.purchase(STORE_PRODUCT_IDS.tipTier1)
    await controller.purchase(STORE_PRODUCT_IDS.tipTier1)

    expect(store.purchase).toHaveBeenCalledTimes(2)
    expect(entitlements.refreshOwnership).toHaveBeenCalledTimes(2)
    expect(controller.getSnapshot().feedback).toEqual({
      kind: 'entitlement-verified',
      productId: STORE_PRODUCT_IDS.tipTier1,
    })
    expect(controller.getSnapshot().hostOwnership).toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: true,
    })
  })

  test('grants durable access only after host verification', async () => {
    const store = fakeStore()
    const entitlements = fakeAuthority({
      refresh: {
        doubleInfinityPoints: true,
        developerOptions: false,
      },
    })
    const controller = new StorefrontController({ store, entitlements })

    await controller.initialize()
    await controller.purchase(STORE_PRODUCT_IDS.doubleInfinityPoints)

    expect(controller.effectiveAccess(false)).toMatchObject({
      doubleInfinityPoints: true,
      developerOptions: false,
      supporterCatGalleryAccess: false,
    })
    expect(controller.getSnapshot().feedback).toEqual({
      kind: 'entitlement-verified',
      productId: STORE_PRODUCT_IDS.doubleInfinityPoints,
    })
  })

  test('reprojects verified durable ownership through a backend callback', async () => {
    const synchronized = vi.fn(async () => true)
    const controller = new StorefrontController({
      store: fakeStore(),
      entitlements: fakeAuthority({
        refresh: {
          doubleInfinityPoints: true,
          developerOptions: false,
        },
      }),
      onVerifiedOwnershipChanged: synchronized,
    })
    await controller.initialize()

    await controller.purchase(STORE_PRODUCT_IDS.doubleInfinityPoints)

    expect(synchronized).toHaveBeenCalledOnce()
    expect(controller.getSnapshot().feedback).toMatchObject({
      kind: 'entitlement-verified',
    })
  })

  test('fails closed when purchase acceptance is not verified', async () => {
    const controller = new StorefrontController({
      store: fakeStore(),
      entitlements: fakeAuthority(),
    })
    await controller.initialize()

    await controller.purchase(STORE_PRODUCT_IDS.doubleInfinityPoints)

    expect(controller.effectiveAccess(false).doubleInfinityPoints).toBe(false)
    expect(controller.getSnapshot().feedback).toEqual({
      kind: 'operation-failed',
      code: 'verification-failed',
    })
  })

  test('does not unlock a supporter tier from accepted checkout alone', async () => {
    const controller = new StorefrontController({
      store: fakeStore(),
      entitlements: fakeAuthority(),
    })
    await controller.initialize()

    await controller.purchase(STORE_PRODUCT_IDS.tipTier2)

    expect(controller.effectiveAccess(false).supporterCatGalleryAccess)
      .toBe(false)
    expect(controller.getSnapshot().feedback).toEqual({
      kind: 'operation-failed',
      code: 'verification-failed',
    })
  })

  test('does not require a gameplay reprojection for verified supporter access', async () => {
    const synchronized = vi.fn(async () => false)
    const controller = new StorefrontController({
      store: fakeStore(),
      entitlements: fakeAuthority({
        refresh: {
          doubleInfinityPoints: false,
          developerOptions: false,
          supporterCatGallery: true,
        },
      }),
      onVerifiedOwnershipChanged: synchronized,
    })
    await controller.initialize()

    await controller.purchase(STORE_PRODUCT_IDS.tipTier1)

    expect(synchronized).not.toHaveBeenCalled()
    expect(controller.getSnapshot().feedback).toEqual({
      kind: 'entitlement-verified',
      productId: STORE_PRODUCT_IDS.tipTier1,
    })
  })

  test('restores only verified permanent entitlements and ignores tips', async () => {
    const store = fakeStore({
      restored: [
        STORE_PRODUCT_IDS.tipTier3,
        STORE_PRODUCT_IDS.developerOptions,
      ],
    })
    const controller = new StorefrontController({
      store,
      entitlements: fakeAuthority({
        refresh: {
          doubleInfinityPoints: false,
          developerOptions: true,
        },
      }),
    })
    await controller.initialize()

    await controller.restorePurchases()

    expect(controller.getSnapshot().feedback).toEqual({
      kind: 'restore-completed',
      restoredCount: 1,
    })
    expect(controller.effectiveAccess(false)).toMatchObject({
      developerOptions: true,
      developerOptionsSource: 'host-store',
    })
  })

  test('keeps the existing local Developer Options path without granting Double IP', async () => {
    const controller = new StorefrontController({
      store: fakeStore(),
      entitlements: fakeAuthority(),
    })
    await controller.initialize()

    expect(controller.effectiveAccess(true)).toMatchObject({
      doubleInfinityPoints: false,
      developerOptions: true,
      developerOptionsSource: 'local-in-game-progression',
    })
  })
})

describe('CachedVerifiedEntitlementAuthority', () => {
  test('does not erase cached consumable-derived supporter ownership', async () => {
    const records: VerifiedEntitlementRecord[] = [{
      ownership: {
        doubleInfinityPoints: false,
        developerOptions: false,
        supporterCatGallery: true,
      },
      verifiedAtUtc: '2026-08-01T00:00:00.000Z',
    }]
    const authority = new CachedVerifiedEntitlementAuthority(
      {
        readVerifiedOwnership: async () => ({
          doubleInfinityPoints: false,
          developerOptions: false,
          supporterCatGallery: false,
        }),
      },
      {
        read: async () => records.at(-1) ?? null,
        write: async (record) => {
          records.push(record as VerifiedEntitlementRecord)
        },
      },
      () => '2026-08-02T00:00:00.000Z',
    )

    await expect(authority.refreshOwnership()).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: true,
    })
  })

  test('retains the last verified ownership while the provider is offline', async () => {
    let providerOffline = false
    const source: VerifiedEntitlementSource = {
      readVerifiedOwnership: vi.fn(async () => {
        if (providerOffline) throw new Error('offline')
        return {
          doubleInfinityPoints: true,
          developerOptions: false,
        }
      }),
    }
    const records: Readonly<VerifiedEntitlementRecord>[] = []
    const cache: EntitlementOwnershipCache = {
      read: vi.fn(async () => records.at(-1) ?? null),
      write: vi.fn(async (value) => {
        records.push(value)
      }),
    }
    const authority = new CachedVerifiedEntitlementAuthority(
      source,
      cache,
      () => '2026-08-02T00:00:00.000Z',
    )

    await expect(authority.refreshOwnership()).resolves.toEqual({
      doubleInfinityPoints: true,
      developerOptions: false,
      supporterCatGallery: false,
    })
    providerOffline = true
    await expect(authority.refreshOwnership()).resolves.toEqual({
      doubleInfinityPoints: true,
      developerOptions: false,
      supporterCatGallery: false,
    })
    expect(records[0]?.verifiedAtUtc).toBe('2026-08-02T00:00:00.000Z')
  })

  test('fails closed offline when ownership has never been verified', async () => {
    const authority = new CachedVerifiedEntitlementAuthority(
      {
        readVerifiedOwnership: async () => {
          throw new Error('offline')
        },
      },
      {
        read: async () => null,
        write: async () => undefined,
      },
      () => '2026-08-02T00:00:00.000Z',
    )
    await expect(authority.readOwnership()).rejects.toThrow('offline')
  })

  test('uses live verified ownership even when refreshing its cache fails', async () => {
    const authority = new CachedVerifiedEntitlementAuthority(
      {
        readVerifiedOwnership: async () => ({
          doubleInfinityPoints: false,
          developerOptions: true,
        }),
      },
      {
        read: async () => null,
        write: async () => {
          throw new Error('disk full')
        },
      },
      () => '2026-08-02T00:00:00.000Z',
    )
    await expect(authority.refreshOwnership()).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: true,
      supporterCatGallery: false,
    })
  })

  test('retains same-device Unity Double IP evidence across provider refreshes', async () => {
    const records: VerifiedEntitlementRecord[] = []
    const authority = new CachedVerifiedEntitlementAuthority(
      {
        readVerifiedOwnership: async () => ({
          doubleInfinityPoints: false,
          developerOptions: true,
        }),
      },
      {
        read: async () => records.at(-1) ?? null,
        write: async (record) => {
          records.push(record as VerifiedEntitlementRecord)
        },
      },
      () => '2026-08-02T00:00:00.000Z',
    )

    await authority.promoteAutomaticUnityPurchaseEvidence({
      permanentDoubleInfinityPoints: true,
      kind: 'automatic-same-device-unity',
      platform: 'macos',
      sourceClass: 'unity-persistent-data-save',
      opaqueSourceIdentifier: 'darwin-2',
      pathClass: 'unity-application-support-player',
      contentSha256: 'a'.repeat(64),
      saveSchemaVersion: 12,
    })
    await expect(authority.refreshOwnership()).resolves.toEqual({
      doubleInfinityPoints: true,
      developerOptions: true,
      supporterCatGallery: false,
    })
    expect(records.at(-1)?.automaticUnityDoubleIpEvidence).toEqual({
      platform: 'macos',
      sourceClass: 'unity-persistent-data-save',
      opaqueSourceIdentifier: 'darwin-2',
      pathClass: 'unity-application-support-player',
      contentSha256: 'a'.repeat(64),
      saveSchemaVersion: 12,
      promotedAtUtc: '2026-08-02T00:00:00.000Z',
    })
  })

  test('preserves the first automatic Unity Double IP evidence unchanged on repeat promotion', async () => {
    const records: VerifiedEntitlementRecord[] = []
    const sampledTimes = [
      '2026-08-02T00:00:00.000Z',
      '2026-08-03T00:00:00.000Z',
    ]
    const authority = new CachedVerifiedEntitlementAuthority(
      {
        readVerifiedOwnership: async () => ({
          doubleInfinityPoints: false,
          developerOptions: false,
        }),
      },
      {
        read: async () => records.at(-1) ?? null,
        write: async (record) => {
          records.push(record as VerifiedEntitlementRecord)
        },
      },
      () => sampledTimes.shift() ?? 'unexpected-time',
    )

    await authority.promoteAutomaticUnityPurchaseEvidence({
      permanentDoubleInfinityPoints: true,
      kind: 'automatic-same-device-unity',
      platform: 'android',
      sourceClass: 'unity-persistent-data-save',
      opaqueSourceIdentifier: 'android-external',
      pathClass: 'capacitor-external-files',
      contentSha256: 'a'.repeat(64),
      saveSchemaVersion: 12,
    })
    const firstEvidence =
      records.at(-1)?.automaticUnityDoubleIpEvidence

    await authority.promoteAutomaticUnityPurchaseEvidence({
      permanentDoubleInfinityPoints: true,
      kind: 'automatic-same-device-unity',
      platform: 'macos',
      sourceClass: 'unity-persistent-data-save',
      opaqueSourceIdentifier: 'different-source',
      pathClass: 'unity-application-support-player',
      contentSha256: 'b'.repeat(64),
      saveSchemaVersion: 99,
    })

    expect(records.at(-1)?.automaticUnityDoubleIpEvidence)
      .toBe(firstEvidence)
    expect(records.at(-1)?.automaticUnityDoubleIpEvidence)
      .toEqual({
        platform: 'android',
        sourceClass: 'unity-persistent-data-save',
        opaqueSourceIdentifier: 'android-external',
        pathClass: 'capacitor-external-files',
        contentSha256: 'a'.repeat(64),
        saveSchemaVersion: 12,
        promotedAtUtc: '2026-08-02T00:00:00.000Z',
      })
    expect(sampledTimes).toEqual([
      '2026-08-03T00:00:00.000Z',
    ])
  })
})

describe('RuntimeEntitlementBridge', () => {
  test('projects only authority-owned values into canonical gameplay', async () => {
    const authority = fakeAuthority({
      initial: {
        doubleInfinityPoints: true,
        developerOptions: false,
      },
      refresh: {
        doubleInfinityPoints: false,
        developerOptions: true,
      },
    })
    const bridge = new RuntimeEntitlementBridge(authority)

    await bridge.initialize()
    expect(bridge.currentDysonEntitlements()).toEqual({
      permanentDoubleIp: true,
    })
    await bridge.synchronize()
    expect(bridge.currentOwnership()).toEqual({
      doubleInfinityPoints: false,
      developerOptions: true,
      supporterCatGallery: false,
    })
  })
})

function fakeStore(options: {
  readonly restored?: readonly StoreProductId[]
} = {}): StoreAdapter & { readonly purchase: ReturnType<typeof vi.fn> } {
  return {
    products: vi.fn(async () => [
      listing(STORE_PRODUCT_IDS.tipTier1, '$1.49'),
      listing(STORE_PRODUCT_IDS.tipTier2, '$4.49'),
      listing(STORE_PRODUCT_IDS.tipTier3, '$7.49'),
      listing(STORE_PRODUCT_IDS.developerOptions, '$9.99'),
      listing(STORE_PRODUCT_IDS.doubleInfinityPoints, '$2.99'),
    ]),
    purchase: vi.fn(async (productId: StoreProductId) => ({
      accepted: true as const,
      productId,
    })),
    restorePurchases: vi.fn(async () => ({
      restoredProductIds: options.restored ?? [],
    })),
  }
}

function listing(productId: StoreProductId, localizedPrice: string) {
  return { productId, localizedPrice, available: true }
}

function fakeAuthority(options: {
  readonly initial?: HostEntitlementOwnership
  readonly refresh?: HostEntitlementOwnership
} = {}): EntitlementAuthority & {
  readonly refreshOwnership: ReturnType<typeof vi.fn>
} {
  const initial = options.initial ?? {
    doubleInfinityPoints: false,
    developerOptions: false,
  }
  return {
    readOwnership: vi.fn(async () => initial),
    refreshOwnership: vi.fn(async () => options.refresh ?? initial),
  }
}
