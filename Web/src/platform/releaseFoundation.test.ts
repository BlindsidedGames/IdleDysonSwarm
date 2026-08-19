import { describe, expect, test } from 'vitest'
import {
  CANONICAL_STORE_PRODUCTS,
  NoopEntitlementAuthority,
  NoopStoreAdapter,
  STORE_PRODUCT_IDS,
  resolveEffectiveEntitlementAccess,
} from '../store/contracts'
import {
  createBrowserDevelopmentReleasePlatformServices,
  createBrowserReleasePlatformServices,
  NoopDiagnosticsExporter,
  NoopNativeFilesystemMigrationSource,
} from './releaseFoundation'

describe('release platform/store foundation', () => {
  test('exposes exactly Unity’s five canonical product identifiers', () => {
    expect(CANONICAL_STORE_PRODUCTS.map((product) => product.id)).toEqual([
      'ids.tiptier1',
      'ids.tiptier2',
      'ids.tiptier3',
      'ids.devoptions',
      'ids.doubleip',
    ])
    expect(STORE_PRODUCT_IDS).toEqual({
      tipTier1: 'ids.tiptier1',
      tipTier2: 'ids.tiptier2',
      tipTier3: 'ids.tiptier3',
      developerOptions: 'ids.devoptions',
      doubleInfinityPoints: 'ids.doubleip',
    })
  })

  test('keeps the browser release foundation provider-free and inert', async () => {
    const services = createBrowserReleasePlatformServices()

    expect(services.hostKind).toBe('browser')
    await expect(services.metadata.metadata()).resolves.toEqual({
      hostKind: 'browser',
      applicationId: 'com.blindsidedgames.idledysonswarm',
      applicationVersion: 'development',
      supportsNativeFilesystemMigration: false,
    })
    await expect(
      services.nativeFilesystemMigration.discoverCandidates(),
    ).resolves.toEqual([])
    await expect(services.entitlements.readOwnership()).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
    })
    await expect(services.store.products()).resolves.toEqual(
      CANONICAL_STORE_PRODUCTS.map((product) => ({
        productId: product.id,
        localizedPrice: null,
        available: false,
      })),
    )
    await expect(
      services.store.purchase(STORE_PRODUCT_IDS.doubleInfinityPoints),
    ).resolves.toEqual({
      accepted: false,
      productId: 'ids.doubleip',
      code: 'store-unavailable',
    })
    await expect(services.store.restorePurchases()).resolves.toEqual({
      restoredProductIds: [],
    })
    await expect(
      services.diagnostics.export({
        fileName: 'diagnostics.json',
        payload: { phase: 'idle', code: 'none' },
      }),
    ).resolves.toEqual({ exported: false, code: 'export-unavailable' })
  })

  test('pairs the development Store adapter with its in-memory entitlement authority', async () => {
    const services = createBrowserDevelopmentReleasePlatformServices()

    expect(services.storeAvailable).toBe(true)
    expect(services.storeRestoreAvailable).toBe(true)
    expect(services.entitlements).toBe(services.store)
    await expect(services.store.products()).resolves.toHaveLength(5)
  })

  test('does not let shared-save claims grant Double IP or Developer Options', () => {
    const access = resolveEffectiveEntitlementAccess({
      hostOwnership: {
        doubleInfinityPoints: false,
        developerOptions: false,
      },
      localDeveloperOptions: { purchasedInGame: false },
      sharedSaveClaims: {
        doubleInfinityPoints: true,
        developerOptions: true,
      },
    })

    expect(access).toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      developerOptionsSource: 'none',
      ignoredSharedSaveClaims: {
        doubleInfinityPoints: true,
        developerOptions: true,
      },
    })
  })

  test('keeps the in-game Developer Options path explicit but local', () => {
    const access = resolveEffectiveEntitlementAccess({
      hostOwnership: {
        doubleInfinityPoints: false,
        developerOptions: false,
      },
      localDeveloperOptions: { purchasedInGame: true },
      sharedSaveClaims: { developerOptions: false },
    })

    expect(access).toMatchObject({
      doubleInfinityPoints: false,
      developerOptions: true,
      developerOptionsSource: 'local-in-game-progression',
    })
  })

  test('allows only host ownership to grant durable store entitlements', () => {
    const access = resolveEffectiveEntitlementAccess({
      hostOwnership: {
        doubleInfinityPoints: true,
        developerOptions: true,
      },
      localDeveloperOptions: { purchasedInGame: false },
    })

    expect(access).toMatchObject({
      doubleInfinityPoints: true,
      developerOptions: true,
      developerOptionsSource: 'host-store',
    })
  })

  test('keeps individual no-op adapters testable without a host SDK', async () => {
    await expect(
      new NoopNativeFilesystemMigrationSource().discoverCandidates(),
    ).resolves.toEqual([])
    await expect(new NoopEntitlementAuthority().readOwnership()).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
    })
    await expect(new NoopStoreAdapter().restorePurchases()).resolves.toEqual({
      restoredProductIds: [],
    })
    await expect(
      new NoopDiagnosticsExporter().export({
        fileName: 'diagnostics.json',
        payload: { phase: 'idle', code: 'none' },
      }),
    ).resolves.toEqual({ exported: false, code: 'export-unavailable' })
  })
})
