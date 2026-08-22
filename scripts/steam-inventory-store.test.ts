import { createCipheriv, createDecipheriv, createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AtomicSteamEntitlementCache,
  createSafeStorageProtector,
  disabledSteamInventoryConfig,
  readSteamInventoryConfig,
  STEAM_STORE_PRODUCT_IDS,
  SteamInventoryStore,
  validateSteamInventoryConfig,
} from '../hosts/electron/steamInventoryStore.mjs'

const testDirectories: string[] = []
const steamAppId = 4_348_570
const steamId = '76561198000000001'
const fixtureItemDefs = Object.freeze({
  'ids.tiptier1': 101,
  'ids.tiptier2': 102,
  'ids.tiptier3': 103,
  'ids.devoptions': 104,
  'ids.doubleip': 105,
})

afterEach(async () => {
  await Promise.all(testDirectories.splice(0).map((path) =>
    rm(path, { recursive: true, force: true })))
})

describe('Electron Steam Inventory foundation', () => {
  it('requires an exact, complete and unique five-ItemDef mapping', () => {
    const enabled = validateSteamInventoryConfig({
      schemaVersion: 1,
      enabled: true,
      steamAppId,
      products: fixtureItemDefs,
    }, steamAppId)
    expect(enabled.products).toEqual(fixtureItemDefs)

    expect(() => validateSteamInventoryConfig({
      schemaVersion: 1,
      enabled: true,
      steamAppId,
      products: {
        ...fixtureItemDefs,
        'ids.doubleip': null,
      },
    }, steamAppId)).toThrow('all configured or all unset')
    expect(() => validateSteamInventoryConfig({
      schemaVersion: 1,
      enabled: true,
      steamAppId,
      products: {
        ...fixtureItemDefs,
        'ids.doubleip': fixtureItemDefs['ids.devoptions'],
      },
    }, steamAppId)).toThrow('must be unique')
    expect(() => validateSteamInventoryConfig({
      schemaVersion: 1,
      enabled: true,
      steamAppId,
      products: {
        ...fixtureItemDefs,
        unexpected: 106,
      },
    }, steamAppId)).toThrow('mapping is incomplete')
  })

  it('ships a disabled checked config with no guessed ItemDef IDs', async () => {
    const path = new URL(
      '../hosts/electron/steam-inventory.json',
      import.meta.url,
    )
    const config = await readSteamInventoryConfig(path, steamAppId)
    expect(config.enabled).toBe(false)
    expect(Object.keys(config.products).sort()).toEqual(
      [...STEAM_STORE_PRODUCT_IDS].sort(),
    )
    expect(Object.values(config.products)).toEqual([
      null,
      null,
      null,
      null,
      null,
    ])
  })

  it('fails closed when configuration or the native binding is unavailable', async () => {
    const cache = memoryCache()
    const store = new SteamInventoryStore({
      config: disabledSteamInventoryConfig(steamAppId),
      binding: null,
      cache,
    })

    expect(await store.products()).toEqual(STEAM_STORE_PRODUCT_IDS.map(
      (productId) => ({
        productId,
        localizedPrice: null,
        available: false,
      }),
    ))
    await expect(store.purchase('ids.doubleip')).resolves.toEqual({
      accepted: false,
      productId: 'ids.doubleip',
      code: 'store-unavailable',
    })
    await expect(store.restorePurchases()).resolves.toEqual({
      restoredProductIds: [],
    })
    await expect(store.readEntitlements(true)).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: false,
    })
  })

  it('uses localized provider listings and verifies durable ownership', async () => {
    const cache = memoryCache()
    const binding = bindingStub({
      requestLocalizedPrices: vi.fn(async () => [
        { itemDefId: 101, localizedPrice: 'A$1.49' },
        { itemDefId: 104, localizedPrice: 'A$7.49' },
        { itemDefId: 105, localizedPrice: 'A$2.99' },
      ]),
      getAllItems: vi.fn(async () => [
        { itemDefId: 104, instanceId: '8001', quantity: 1 },
        { itemDefId: 105, instanceId: '8002', quantity: 1 },
      ]),
    })
    const store = enabledStore({ binding, cache })

    const listings = await store.products()
    expect(listings.find((listing) =>
      listing.productId === 'ids.tiptier1')).toEqual({
      productId: 'ids.tiptier1',
      localizedPrice: 'A$1.49',
      available: true,
    })
    expect(listings.find((listing) =>
      listing.productId === 'ids.tiptier2')?.available).toBe(false)

    await expect(store.purchase('ids.doubleip')).resolves.toEqual({
      accepted: true,
      productId: 'ids.doubleip',
    })
    expect(cache.write).toHaveBeenCalledWith(
      steamId,
      {
        ownership: {
          doubleInfinityPoints: true,
          developerOptions: true,
          supporterCatGallery: false,
        },
        pendingConsumptions: [],
      },
      '2026-08-03T00:00:00.000Z',
    )
    await expect(store.restorePurchases()).resolves.toEqual({
      restoredProductIds: ['ids.devoptions', 'ids.doubleip'],
    })
  })

  it('accepts a tip only after observing delivery and consumes that instance', async () => {
    const cache = memoryCache()
    const binding = bindingStub({
      getAllItems: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { itemDefId: 101, instanceId: '7001', quantity: 1 },
        ]),
    })
    const store = enabledStore({ binding, cache })

    await expect(store.purchase('ids.tiptier1')).resolves.toEqual({
      accepted: true,
      productId: 'ids.tiptier1',
    })
    expect(binding.consumeItem).toHaveBeenCalledWith('7001', 1)
    expect(cache.write.mock.invocationCallOrder[0])
      .toBeLessThan(binding.consumeItem.mock.invocationCallOrder[0])
    await expect(store.readEntitlements()).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: true,
    })
  })

  it('accepts verified tip delivery but does not consume before persistence', async () => {
    const retryCallbacks: Array<() => void> = []
    const cache = memoryCache()
    cache.write.mockRejectedValueOnce(new Error('disk unavailable'))
    const delivered = { itemDefId: 101, instanceId: '7001', quantity: 1 }
    const binding = bindingStub({
      getAllItems: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValue([delivered]),
    })
    const store = enabledStore({
      binding,
      cache,
      scheduleRetry: (callback) => retryCallbacks.push(callback),
    })

    await expect(store.purchase('ids.tiptier1')).resolves.toEqual({
      accepted: true,
      productId: 'ids.tiptier1',
    })
    expect(binding.consumeItem).not.toHaveBeenCalled()
    expect(store.maintenanceState()).toEqual({
      persistence: 'retry-pending',
      pendingTipConsumptions: 1,
    })

    retryCallbacks.shift()?.()
    await vi.waitFor(() => expect(binding.consumeItem).toHaveBeenCalledWith(
      '7001',
      1,
    ))
    expect(binding.consumeItem).toHaveBeenCalledTimes(1)
    expect(store.maintenanceState()).toEqual({
      persistence: 'ready',
      pendingTipConsumptions: 0,
    })
  })

  it('does not accept completed checkout without verified delivery', async () => {
    const binding = bindingStub({
      getAllItems: vi.fn(async () => []),
    })
    const store = enabledStore({ binding, cache: memoryCache() })

    await expect(store.purchase('ids.devoptions')).resolves.toEqual({
      accepted: false,
      productId: 'ids.devoptions',
      code: 'purchase-failed',
    })
  })

  it('does not report a verified charged purchase as failed on cache error', async () => {
    const cache = memoryCache()
    cache.write.mockRejectedValueOnce(new Error('disk unavailable'))
    const binding = bindingStub({
      getAllItems: vi.fn(async () => [
        { itemDefId: 105, instanceId: '8002', quantity: 1 },
      ]),
    })
    const store = enabledStore({ binding, cache })

    await expect(store.purchase('ids.doubleip')).resolves.toEqual({
      accepted: true,
      productId: 'ids.doubleip',
    })
    expect(store.maintenanceState()).toEqual({
      persistence: 'retry-pending',
      pendingTipConsumptions: 0,
    })
  })

  it('retains the latest provider-verified cache while Steam is offline', async () => {
    const cache = memoryCache(verifiedState({
      doubleInfinityPoints: true,
      developerOptions: false,
    }))
    const binding = bindingStub({
      getAllItems: vi.fn(async () => {
        throw new Error('Steam unavailable')
      }),
    })
    const store = enabledStore({ binding, cache })

    await expect(store.readEntitlements(true)).resolves.toEqual({
      doubleInfinityPoints: true,
      developerOptions: false,
      supporterCatGallery: false,
    })
    expect(cache.write).not.toHaveBeenCalled()
  })

  it('fails closed when neither Steam nor its cache can be read', async () => {
    const cache = memoryCache()
    cache.read.mockRejectedValue(new Error('cache unavailable'))
    const store = new SteamInventoryStore({
      config: disabledSteamInventoryConfig(steamAppId),
      binding: null,
      cache,
    })

    await expect(store.readEntitlements(false)).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: false,
    })
  })

  it('atomically persists only the checked Steam durable record', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ids-steam-cache-'))
    testDirectories.push(directory)
    const path = join(directory, 'nested', 'ownership.json')
    const protector = authenticatedTestProtector()
    const cache = new AtomicSteamEntitlementCache(
      path,
      steamAppId,
      protector,
    )

    await cache.write(steamId, verifiedState({
      doubleInfinityPoints: true,
      developerOptions: false,
    }), '2026-08-03T00:00:00.000Z')

    await expect(cache.read(steamId)).resolves.toEqual({
      ownership: {
        doubleInfinityPoints: true,
        developerOptions: false,
        supporterCatGallery: false,
      },
      pendingConsumptions: [],
    })
    await expect(cache.read('76561198000000002')).resolves.toBeNull()
    const protectedValue = await readFile(path)
    expect(protectedValue.toString('utf8')).not.toContain(steamId)
    const persisted = JSON.parse(protector.unprotect(protectedValue))
    expect(persisted).toEqual({
      schemaVersion: 2,
      provider: 'steam-inventory',
      steamAppId,
      steamId,
      verifiedAtUtc: '2026-08-03T00:00:00.000Z',
      ownership: {
        doubleInfinityPoints: true,
        developerOptions: false,
        supporterCatGallery: false,
      },
      pendingConsumptions: [],
    })

    const legacy = structuredClone(persisted)
    delete legacy.ownership.supporterCatGallery
    await writeFile(path, protector.protect(JSON.stringify(legacy)))
    await expect(cache.read(steamId)).resolves.toEqual({
      ownership: {
        doubleInfinityPoints: true,
        developerOptions: false,
        supporterCatGallery: false,
      },
      pendingConsumptions: [],
    })

    legacy.ownership.supporterCatGallery = 'tampered'
    await writeFile(path, protector.protect(JSON.stringify(legacy)))
    await expect(cache.read(steamId)).resolves.toBeNull()

    const duplicatePending = structuredClone(persisted)
    duplicatePending.pendingConsumptions = [
      { itemDefId: 101, instanceId: '9300', quantity: 1 },
      { itemDefId: 101, instanceId: '9300', quantity: 2 },
    ]
    await writeFile(
      path,
      protector.protect(JSON.stringify(duplicatePending)),
    )
    await expect(cache.read(steamId)).resolves.toBeNull()

    const tampered = Buffer.from(protectedValue)
    tampered[tampered.length - 1] ^= 1
    await writeFile(path, tampered)
    await expect(cache.read(steamId)).resolves.toBeNull()
  })

  it('fails closed when OS encryption is unavailable or Linux uses basic_text', async () => {
    const safeStorage = {
      isEncryptionAvailable: vi.fn(() => true),
      getSelectedStorageBackend: vi.fn(() => 'basic_text'),
      encryptString: vi.fn((value) => Buffer.from(value)),
      decryptString: vi.fn((value) => value.toString('utf8')),
    }
    expect(createSafeStorageProtector(safeStorage, 'linux')).toBeNull()
    safeStorage.getSelectedStorageBackend.mockReturnValue('unknown_backend')
    expect(createSafeStorageProtector(safeStorage, 'linux')).toBeNull()
    safeStorage.getSelectedStorageBackend.mockReturnValue('kwallet')
    expect(createSafeStorageProtector(safeStorage, 'linux')).not.toBeNull()
    for (const backend of ['gnome_libsecret', 'kwallet5', 'kwallet6']) {
      safeStorage.getSelectedStorageBackend.mockReturnValue(backend)
      expect(createSafeStorageProtector(safeStorage, 'linux')).not.toBeNull()
    }
    safeStorage.isEncryptionAvailable.mockReturnValue(false)
    expect(createSafeStorageProtector(safeStorage, 'win32')).toBeNull()
  })

  it('disables offline persistence without retry when OS protection is unavailable', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ids-steam-cache-'))
    testDirectories.push(directory)
    const cache = new AtomicSteamEntitlementCache(
      join(directory, 'ownership.bin'),
      steamAppId,
      null,
    )
    const scheduleRetry = vi.fn()
    const binding = bindingStub({
      getAllItems: vi.fn(async () => [
        { itemDefId: 105, instanceId: '9200', quantity: 1 },
      ]),
    })
    const store = new SteamInventoryStore({
      config: validateSteamInventoryConfig({
        schemaVersion: 1,
        enabled: true,
        steamAppId,
        products: fixtureItemDefs,
      }, steamAppId),
      binding,
      cache,
      scheduleRetry,
    })

    await expect(store.purchase('ids.doubleip')).resolves.toEqual({
      accepted: true,
      productId: 'ids.doubleip',
    })
    expect(store.maintenanceState()).toEqual({
      persistence: 'disabled',
      pendingTipConsumptions: 0,
    })
    expect(scheduleRetry).not.toHaveBeenCalled()
  })

  it('rejects cached ownership without the authenticated matching SteamID', async () => {
    const cache = memoryCache(verifiedState({
      doubleInfinityPoints: true,
      developerOptions: true,
    }), '76561198000000002')
    const store = enabledStore({ binding: bindingStub(), cache })

    await expect(store.readEntitlements()).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: false,
    })
    const unavailableIdentity = enabledStore({
      binding: bindingStub({
        getAuthenticatedSteamId: vi.fn(async () => null),
      }),
      cache,
    })
    await expect(unavailableIdentity.readEntitlements()).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: false,
    })
  })

  it('drops pending state when the authenticated Steam account changes', async () => {
    const nextSteamId = '76561198000000002'
    const oldTip = { itemDefId: 101, instanceId: '9400', quantity: 1 }
    const cache = memoryCache({
      ownership: {
        doubleInfinityPoints: false,
        developerOptions: false,
        supporterCatGallery: true,
      },
      pendingConsumptions: [oldTip],
    })
    const binding = bindingStub({
      getAuthenticatedSteamId: vi.fn()
        .mockResolvedValueOnce(steamId)
        .mockResolvedValueOnce(nextSteamId),
      getAllItems: vi.fn()
        .mockResolvedValueOnce([oldTip])
        .mockResolvedValueOnce([]),
      consumeItem: vi.fn(async () => false),
    })
    const store = enabledStore({ binding, cache })

    await expect(store.readEntitlements(true)).resolves.toMatchObject({
      supporterCatGallery: true,
    })
    await expect(store.readEntitlements(true)).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: false,
    })

    expect(cache.read).toHaveBeenNthCalledWith(1, steamId)
    expect(cache.read).toHaveBeenNthCalledWith(2, nextSteamId)
    expect(cache.write).toHaveBeenLastCalledWith(
      nextSteamId,
      verifiedState({
        doubleInfinityPoints: false,
        developerOptions: false,
      }),
      '2026-08-03T00:00:00.000Z',
    )
    expect(binding.consumeItem).toHaveBeenCalledOnce()
    expect(binding.consumeItem).toHaveBeenCalledWith('9400', 1)
  })

  it('returns matching cache immediately and refreshes revocation in background', async () => {
    const cache = memoryCache(verifiedState({
      doubleInfinityPoints: true,
      developerOptions: false,
    }))
    let releaseInventory!: () => void
    const inventoryReady = new Promise<void>((resolve) => {
      releaseInventory = resolve
    })
    const store = enabledStore({
      binding: bindingStub({
        getAllItems: vi.fn(async () => {
          await inventoryReady
          return []
        }),
      }),
      cache,
    })

    await store.initialize()
    await expect(store.readEntitlements()).resolves.toEqual({
      doubleInfinityPoints: true,
      developerOptions: false,
      supporterCatGallery: false,
    })
    releaseInventory()
    await vi.waitFor(() => expect(cache.write).toHaveBeenCalledWith(
      steamId,
      verifiedState({
        doubleInfinityPoints: false,
        developerOptions: false,
      }),
      '2026-08-03T00:00:00.000Z',
    ))
    await expect(store.readEntitlements()).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: false,
    })
  })

  it('retries a failed revocation write and exposes retry state', async () => {
    const retryCallbacks: Array<() => void> = []
    const cache = memoryCache(verifiedState({
      doubleInfinityPoints: true,
      developerOptions: false,
    }))
    cache.write.mockRejectedValueOnce(new Error('disk unavailable'))
    const store = enabledStore({
      binding: bindingStub({ getAllItems: vi.fn(async () => []) }),
      cache,
      scheduleRetry: (callback) => retryCallbacks.push(callback),
    })

    await store.readEntitlements(true)
    expect(store.maintenanceState().persistence).toBe('retry-pending')
    retryCallbacks.shift()?.()
    await vi.waitFor(() => expect(cache.write).toHaveBeenCalledTimes(2))
    expect(store.maintenanceState().persistence).toBe('ready')
    await expect(cache.read(steamId)).resolves.toEqual(verifiedState({
      doubleInfinityPoints: false,
      developerOptions: false,
    }))
  })

  it('persists failed tip cleanup and retries it on refresh', async () => {
    const delivered = { itemDefId: 101, instanceId: '9001', quantity: 1 }
    const binding = bindingStub({
      getAllItems: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([delivered])
        .mockResolvedValueOnce([delivered]),
      consumeItem: vi.fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true),
    })
    const cache = memoryCache()
    const store = enabledStore({ binding, cache })

    await expect(store.purchase('ids.tiptier1')).resolves.toMatchObject({
      accepted: true,
    })
    expect(store.maintenanceState().pendingTipConsumptions).toBe(1)
    await store.readEntitlements(true)
    expect(binding.consumeItem).toHaveBeenCalledTimes(2)
    expect(store.maintenanceState().pendingTipConsumptions).toBe(0)
  })

  it('coalesces a stacked repeat purchase into one durable cleanup', async () => {
    const firstDelivery = { itemDefId: 101, instanceId: '9003', quantity: 1 }
    const stackedDelivery = { ...firstDelivery, quantity: 2 }
    const binding = bindingStub({
      getAllItems: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([firstDelivery])
        .mockResolvedValueOnce([firstDelivery])
        .mockResolvedValueOnce([stackedDelivery]),
      consumeItem: vi.fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true),
    })
    const cache = memoryCache()
    const store = enabledStore({ binding, cache })

    await expect(store.purchase('ids.tiptier1')).resolves.toMatchObject({
      accepted: true,
    })
    await expect(store.purchase('ids.tiptier1')).resolves.toMatchObject({
      accepted: true,
    })

    expect(cache.write).toHaveBeenNthCalledWith(2, steamId, {
      ownership: {
        doubleInfinityPoints: false,
        developerOptions: false,
        supporterCatGallery: true,
      },
      pendingConsumptions: [{
        itemDefId: 101,
        instanceId: '9003',
        quantity: 2,
      }],
    }, '2026-08-03T00:00:00.000Z')
    expect(binding.consumeItem).toHaveBeenNthCalledWith(1, '9003', 1)
    expect(binding.consumeItem).toHaveBeenNthCalledWith(2, '9003', 2)
    expect(cache.write.mock.invocationCallOrder[1])
      .toBeLessThan(binding.consumeItem.mock.invocationCallOrder[1])
    expect(store.maintenanceState().pendingTipConsumptions).toBe(0)
  })

  it('adds verified delivery to a higher durable quantity than a stale snapshot', async () => {
    const cached = {
      ownership: {
        doubleInfinityPoints: false,
        developerOptions: false,
        supporterCatGallery: true,
      },
      pendingConsumptions: [{
        itemDefId: 101,
        instanceId: '9007',
        quantity: 2,
      }],
    }
    const staleBefore = { itemDefId: 101, instanceId: '9007', quantity: 1 }
    const staleAfter = { ...staleBefore, quantity: 2 }
    const current = { ...staleBefore, quantity: 3 }
    const binding = bindingStub({
      getAllItems: vi.fn()
        .mockResolvedValueOnce([staleBefore])
        .mockResolvedValueOnce([staleAfter])
        .mockResolvedValueOnce([current]),
    })
    const cache = memoryCache(cached)
    const store = enabledStore({ binding, cache })

    await expect(store.purchase('ids.tiptier1')).resolves.toMatchObject({
      accepted: true,
    })
    expect(cache.write).toHaveBeenNthCalledWith(1, steamId, {
      ownership: cached.ownership,
      pendingConsumptions: [{
        itemDefId: 101,
        instanceId: '9007',
        quantity: 3,
      }],
    }, '2026-08-03T00:00:00.000Z')
    expect(binding.consumeItem).not.toHaveBeenCalled()
    expect(store.maintenanceState().pendingTipConsumptions).toBe(1)

    await store.readEntitlements(true)
    expect(binding.consumeItem).toHaveBeenCalledOnce()
    expect(binding.consumeItem).toHaveBeenCalledWith('9007', 3)
    expect(store.maintenanceState().pendingTipConsumptions).toBe(0)
  })

  it('recovers an unpersisted delivered tip after restart', async () => {
    const delivered = { itemDefId: 102, instanceId: '9004', quantity: 1 }
    const failingCache = memoryCache()
    failingCache.write.mockRejectedValue(new Error('disk unavailable'))
    const firstBinding = bindingStub({
      getAllItems: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([delivered]),
    })
    const firstStore = enabledStore({
      binding: firstBinding,
      cache: failingCache,
      scheduleRetry: vi.fn(),
    })

    await expect(firstStore.purchase('ids.tiptier2')).resolves.toMatchObject({
      accepted: true,
    })
    expect(firstBinding.consumeItem).not.toHaveBeenCalled()

    const restartedCache = memoryCache()
    const restartedBinding = bindingStub({
      getAllItems: vi.fn(async () => [delivered]),
    })
    const restartedStore = enabledStore({
      binding: restartedBinding,
      cache: restartedCache,
    })
    await restartedStore.readEntitlements(true)

    expect(restartedCache.write.mock.invocationCallOrder[0])
      .toBeLessThan(restartedBinding.consumeItem.mock.invocationCallOrder[0])
    expect(restartedBinding.consumeItem).toHaveBeenCalledOnce()
    expect(restartedBinding.consumeItem).toHaveBeenCalledWith('9004', 1)
    expect(restartedStore.maintenanceState().pendingTipConsumptions).toBe(0)
  })

  it('does not consume twice when clearing the durable queue must retry', async () => {
    const retryCallbacks: Array<() => void> = []
    const delivered = { itemDefId: 102, instanceId: '9006', quantity: 1 }
    const cache = memoryCache()
    cache.write
      .mockImplementationOnce(async () => undefined)
      .mockRejectedValueOnce(new Error('disk unavailable'))
    const binding = bindingStub({
      getAllItems: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([delivered]),
    })
    const store = enabledStore({
      binding,
      cache,
      scheduleRetry: (callback) => retryCallbacks.push(callback),
    })

    await expect(store.purchase('ids.tiptier2')).resolves.toMatchObject({
      accepted: true,
    })
    expect(binding.consumeItem).toHaveBeenCalledOnce()
    expect(store.maintenanceState()).toEqual({
      persistence: 'retry-pending',
      pendingTipConsumptions: 0,
    })

    retryCallbacks.shift()?.()
    await vi.waitFor(() => expect(cache.write).toHaveBeenCalledTimes(3))
    expect(binding.consumeItem).toHaveBeenCalledOnce()
    expect(store.maintenanceState()).toEqual({
      persistence: 'ready',
      pendingTipConsumptions: 0,
    })
  })

  it('refreshes an existing pending instance to its stacked quantity', async () => {
    const cache = memoryCache({
      ownership: {
        doubleInfinityPoints: false,
        developerOptions: false,
        supporterCatGallery: true,
      },
      pendingConsumptions: [{
        itemDefId: 103,
        instanceId: '9005',
        quantity: 1,
      }],
    })
    const binding = bindingStub({
      getAllItems: vi.fn(async () => [
        { itemDefId: 103, instanceId: '9005', quantity: 2 },
      ]),
    })
    const store = enabledStore({ binding, cache })

    await store.readEntitlements(true)

    expect(cache.write).toHaveBeenNthCalledWith(1, steamId, {
      ownership: {
        doubleInfinityPoints: false,
        developerOptions: false,
        supporterCatGallery: true,
      },
      pendingConsumptions: [{
        itemDefId: 103,
        instanceId: '9005',
        quantity: 2,
      }],
    }, '2026-08-03T00:00:00.000Z')
    expect(binding.consumeItem).toHaveBeenCalledOnce()
    expect(binding.consumeItem).toHaveBeenCalledWith('9005', 2)
  })

  it('does not downgrade or partially consume a stale lower inventory quantity', async () => {
    const cached = {
      ownership: {
        doubleInfinityPoints: false,
        developerOptions: false,
        supporterCatGallery: true,
      },
      pendingConsumptions: [{
        itemDefId: 103,
        instanceId: '9008',
        quantity: 2,
      }],
    }
    const binding = bindingStub({
      getAllItems: vi.fn(async () => [
        { itemDefId: 103, instanceId: '9008', quantity: 1 },
      ]),
    })
    const cache = memoryCache(cached)
    const store = enabledStore({ binding, cache })

    await store.readEntitlements(true)

    expect(cache.write).toHaveBeenCalledWith(
      steamId,
      cached,
      '2026-08-03T00:00:00.000Z',
    )
    expect(binding.consumeItem).not.toHaveBeenCalled()
    expect(store.maintenanceState().pendingTipConsumptions).toBe(1)
  })

  it('adopts and consumes an orphaned delivered tip during refresh', async () => {
    const binding = bindingStub({
      getAllItems: vi.fn(async () => [
        { itemDefId: 102, instanceId: '9002', quantity: 2 },
      ]),
    })
    const store = enabledStore({ binding, cache: memoryCache() })

    await store.readEntitlements(true)
    expect(binding.consumeItem).toHaveBeenCalledWith('9002', 2)
    expect(store.maintenanceState()).toEqual({
      persistence: 'ready',
      pendingTipConsumptions: 0,
    })
    await expect(store.readEntitlements()).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: true,
    })
  })

  it('does not erase consumed supporter ownership on provider refresh', async () => {
    const cache = memoryCache(verifiedState({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: true,
    }))
    const store = enabledStore({ binding: bindingStub(), cache })

    await expect(store.readEntitlements(true)).resolves.toEqual({
      doubleInfinityPoints: false,
      developerOptions: false,
      supporterCatGallery: true,
    })
  })

  it('never consumes a durable ItemDef from a forged pending cleanup record', async () => {
    const durable = { itemDefId: 105, instanceId: '9100', quantity: 1 }
    const cache = memoryCache({
      ownership: {
        doubleInfinityPoints: true,
        developerOptions: false,
        supporterCatGallery: false,
      },
      pendingConsumptions: [{
        itemDefId: 105,
        instanceId: '9100',
        quantity: 1,
      }],
    })
    const binding = bindingStub({
      getAllItems: vi.fn(async () => [durable]),
    })
    const store = enabledStore({ binding, cache })

    await store.readEntitlements(true)
    expect(binding.consumeItem).not.toHaveBeenCalled()
    expect(store.maintenanceState().pendingTipConsumptions).toBe(0)
  })

  it('fails closed on malformed binding payloads', async () => {
    const badInventory = enabledStore({
      binding: bindingStub({
        getAllItems: vi.fn(async () => [
          { itemDefId: 105, instanceId: 'duplicate', quantity: -1 },
        ]),
      }),
      cache: memoryCache(),
    })
    await expect(badInventory.restorePurchases()).resolves.toEqual({
      restoredProductIds: [],
    })

    const badPrices = enabledStore({
      binding: bindingStub({
        requestLocalizedPrices: vi.fn(async () => [
          { itemDefId: 999, localizedPrice: 'A$1.00' },
        ]),
      }),
      cache: memoryCache(),
    })
    await expect(badPrices.products()).resolves.toEqual(
      STEAM_STORE_PRODUCT_IDS.map((productId) => ({
        productId,
        localizedPrice: null,
        available: false,
      })),
    )
  })

  it('serializes catalog and inventory provider operations', async () => {
    const events: string[] = []
    let releaseCatalog!: () => void
    const catalogReady = new Promise<void>((resolve) => {
      releaseCatalog = resolve
    })
    const binding = bindingStub({
      requestLocalizedPrices: vi.fn(async () => {
        events.push('catalog-start')
        await catalogReady
        events.push('catalog-end')
        return []
      }),
      getAllItems: vi.fn(async () => {
        events.push('inventory')
        return []
      }),
    })
    const store = enabledStore({ binding, cache: memoryCache() })
    const catalog = store.products()
    const restore = store.restorePurchases()
    await vi.waitFor(() => expect(events).toEqual(['catalog-start']))
    releaseCatalog()
    await Promise.all([catalog, restore])
    expect(events).toEqual(['catalog-start', 'catalog-end', 'inventory'])
  })
})

function enabledStore({ binding, cache, scheduleRetry }: {
  binding: ReturnType<typeof bindingStub>
  cache: ReturnType<typeof memoryCache>
  scheduleRetry?: (callback: () => void) => void
}) {
  return new SteamInventoryStore({
    config: validateSteamInventoryConfig({
      schemaVersion: 1,
      enabled: true,
      steamAppId,
      products: fixtureItemDefs,
    }, steamAppId),
    binding,
    cache,
    sampleUtc: () => '2026-08-03T00:00:00.000Z',
    scheduleRetry,
  })
}

function bindingStub(overrides: Record<string, unknown> = {}) {
  return {
    getAuthenticatedSteamId: vi.fn(async () => steamId),
    requestLocalizedPrices: vi.fn(async () => []),
    getAllItems: vi.fn(async () => []),
    startPurchase: vi.fn(async () => ({ status: 'completed' })),
    consumeItem: vi.fn(async () => true),
    ...overrides,
  }
}

function memoryCache(
  initial: ReturnType<typeof verifiedState> | null = null,
  cachedSteamId = steamId,
) {
  let value = initial
  return {
    read: vi.fn(async (requestedSteamId) =>
      requestedSteamId === cachedSteamId ? value : null),
    write: vi.fn(async (requestedSteamId, state) => {
      cachedSteamId = requestedSteamId
      value = state
    }),
  }
}

function verifiedState(ownership: {
  doubleInfinityPoints: boolean
  developerOptions: boolean
  supporterCatGallery?: boolean
}) {
  return {
    ownership: {
      ...ownership,
      supporterCatGallery: ownership.supporterCatGallery === true,
    },
    pendingConsumptions: [],
  }
}

function authenticatedTestProtector() {
  const key = createHash('sha256')
    .update('idle-dyson-swarm-steam-cache-test-key')
    .digest()
  const iv = Buffer.alloc(12, 7)
  return {
    protect(plaintext: string) {
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const ciphertext = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ])
      return Buffer.concat([cipher.getAuthTag(), ciphertext])
    },
    unprotect(protectedValue: Buffer) {
      const decipher = createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(protectedValue.subarray(0, 16))
      return Buffer.concat([
        decipher.update(protectedValue.subarray(16)),
        decipher.final(),
      ]).toString('utf8')
    },
  }
}
