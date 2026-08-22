import {
  mkdir,
  open,
  readFile,
  rename,
  rm,
} from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { dirname } from 'node:path'

export const STEAM_STORE_PRODUCT_IDS = Object.freeze([
  'ids.tiptier1',
  'ids.tiptier2',
  'ids.tiptier3',
  'ids.devoptions',
  'ids.doubleip',
])

const durableProductIds = Object.freeze([
  'ids.devoptions',
  'ids.doubleip',
])
const tipProductIds = new Set([
  'ids.tiptier1',
  'ids.tiptier2',
  'ids.tiptier3',
])
const maximumSteamItemDefId = 999_999
const supportedLinuxSafeStorageBackends = new Set([
  'gnome_libsecret',
  'kwallet',
  'kwallet5',
  'kwallet6',
])
const protectionUnavailableCode = 'STEAM_CACHE_PROTECTION_UNAVAILABLE'

export function validateSteamInventoryConfig(value, expectedAppId) {
  if (
    value === null ||
    typeof value !== 'object' ||
    value.schemaVersion !== 1 ||
    typeof value.enabled !== 'boolean' ||
    value.steamAppId !== expectedAppId ||
    value.products === null ||
    typeof value.products !== 'object' ||
    Array.isArray(value.products)
  ) {
    throw new Error('Steam Inventory configuration is invalid.')
  }

  const configuredKeys = Object.keys(value.products).sort()
  const requiredKeys = [...STEAM_STORE_PRODUCT_IDS].sort()
  if (
    configuredKeys.length !== requiredKeys.length ||
    configuredKeys.some((key, index) => key !== requiredKeys[index])
  ) {
    throw new Error('Steam Inventory product mapping is incomplete.')
  }

  const rawItemDefIds = STEAM_STORE_PRODUCT_IDS.map(
    (productId) => value.products[productId],
  )
  const allUnset = rawItemDefIds.every((itemDefId) => itemDefId === null)
  const allValid = rawItemDefIds.every(isValidSteamItemDefId)
  if (!allUnset && !allValid) {
    throw new Error(
      'Steam Inventory ItemDef IDs must be all configured or all unset.',
    )
  }
  if (allValid && new Set(rawItemDefIds).size !== rawItemDefIds.length) {
    throw new Error('Steam Inventory ItemDef IDs must be unique.')
  }
  if (value.enabled && !allValid) {
    throw new Error(
      'Steam Inventory cannot be enabled without every ItemDef ID.',
    )
  }

  return Object.freeze({
    schemaVersion: 1,
    enabled: value.enabled,
    steamAppId: expectedAppId,
    products: Object.freeze(Object.fromEntries(
      STEAM_STORE_PRODUCT_IDS.map((productId, index) => [
        productId,
        allValid ? rawItemDefIds[index] : null,
      ]),
    )),
  })
}

export async function readSteamInventoryConfig(path, expectedAppId) {
  return validateSteamInventoryConfig(
    JSON.parse(await readFile(path, 'utf8')),
    expectedAppId,
  )
}

export function disabledSteamInventoryConfig(steamAppId) {
  return validateSteamInventoryConfig({
    schemaVersion: 1,
    enabled: false,
    steamAppId,
    products: Object.fromEntries(
      STEAM_STORE_PRODUCT_IDS.map((productId) => [productId, null]),
    ),
  }, steamAppId)
}

export function createSafeStorageProtector(
  safeStorage,
  platform = process.platform,
) {
  if (
    safeStorage === null ||
    typeof safeStorage !== 'object' ||
    typeof safeStorage.isEncryptionAvailable !== 'function' ||
    typeof safeStorage.encryptString !== 'function' ||
    typeof safeStorage.decryptString !== 'function'
  ) return null
  try {
    if (safeStorage.isEncryptionAvailable() !== true) return null
    if (
      platform === 'linux' &&
      (
        typeof safeStorage.getSelectedStorageBackend !== 'function' ||
        !supportedLinuxSafeStorageBackends.has(
          safeStorage.getSelectedStorageBackend(),
        )
      )
    ) return null
  } catch {
    return null
  }
  return Object.freeze({
    protect(plaintext) {
      if (typeof plaintext !== 'string') {
        throw new Error('Steam cache plaintext is invalid.')
      }
      const protectedValue = safeStorage.encryptString(plaintext)
      if (!Buffer.isBuffer(protectedValue) || protectedValue.length === 0) {
        throw new Error('Steam cache encryption failed.')
      }
      return protectedValue
    },
    unprotect(protectedValue) {
      if (!Buffer.isBuffer(protectedValue) || protectedValue.length === 0) {
        throw new Error('Steam cache ciphertext is invalid.')
      }
      const plaintext = safeStorage.decryptString(protectedValue)
      if (typeof plaintext !== 'string' || plaintext === '') {
        throw new Error('Steam cache decryption failed.')
      }
      return plaintext
    },
  })
}

export class AtomicSteamEntitlementCache {
  constructor(path, steamAppId, protector) {
    this.path = path
    this.steamAppId = steamAppId
    this.protector = isValidProtector(protector) ? protector : null
  }

  async read(steamId) {
    if (!isValidSteamId(steamId) || this.protector === null) return null
    try {
      const protectedValue = await readFile(this.path)
      let plaintext
      try {
        plaintext = this.protector.unprotect(protectedValue)
      } catch {
        return null
      }
      const parsed = JSON.parse(plaintext)
      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        parsed.schemaVersion !== 2 ||
        parsed.provider !== 'steam-inventory' ||
        parsed.steamAppId !== this.steamAppId ||
        parsed.steamId !== steamId ||
        typeof parsed.verifiedAtUtc !== 'string' ||
        !Number.isFinite(Date.parse(parsed.verifiedAtUtc)) ||
        !isValidOwnership(parsed.ownership) ||
        !isValidPendingConsumptions(parsed.pendingConsumptions)
      ) return null
      return freezeCacheState(parsed)
    } catch (error) {
      if (error?.code === 'ENOENT' || error instanceof SyntaxError) return null
      throw error
    }
  }

  async write(steamId, state, verifiedAtUtc) {
    if (this.protector === null) throw protectionUnavailableError()
    if (
      !isValidSteamId(steamId) ||
      !isValidOwnership(state?.ownership) ||
      !isValidPendingConsumptions(state?.pendingConsumptions)
    ) throw new Error('Steam entitlement cache record is invalid.')
    const record = this.protector.protect(JSON.stringify({
      schemaVersion: 2,
      provider: 'steam-inventory',
      steamAppId: this.steamAppId,
      steamId,
      verifiedAtUtc,
      ownership: freezeOwnership(state.ownership),
      pendingConsumptions: freezePendingConsumptions(
        state.pendingConsumptions,
      ),
    }))
    const directory = dirname(this.path)
    const temporaryPath = `${this.path}.${process.pid}.${randomUUID()}.tmp`
    await mkdir(directory, { recursive: true })
    let handle
    try {
      handle = await open(temporaryPath, 'wx')
      await handle.writeFile(record)
      await handle.sync()
      await handle.close()
      handle = undefined
      await rename(temporaryPath, this.path)
      await syncDirectory(directory)
    } catch (error) {
      await handle?.close().catch(() => undefined)
      await rm(temporaryPath, { force: true }).catch(() => undefined)
      throw error
    }
  }
}

export class SteamInventoryStore {
  constructor({
    config,
    binding,
    cache,
    sampleUtc = () => new Date().toISOString(),
    scheduleRetry = defaultScheduleRetry,
  }) {
    this.config = config
    this.binding = isInventoryBinding(binding) ? binding : null
    this.cache = cache
    this.sampleUtc = sampleUtc
    this.purchaseInFlight = false
    this.providerQueue = Promise.resolve()
    this.steamId = null
    this.liveState = null
    this.pendingPersistence = null
    this.persistenceError = null
    this.cacheDisabled = false
    this.retryScheduled = false
    this.scheduleRetry = scheduleRetry
  }

  get available() {
    return this.config.enabled && this.binding !== null
  }

  async initialize() {
    if (!this.available) return
    try {
      this.steamId = await this.runProviderOperation(
        () => this.readAuthenticatedSteamId(),
      )
    } catch {
      this.steamId = null
      return
    }
    void this.runProviderOperation(() => this.refreshAuthoritativeState())
      .catch(() => undefined)
  }

  async products() {
    if (!this.available) return unavailableProducts()
    return this.runProviderOperation(async () => {
      try {
        await this.ensureIdentity()
        const prices = validateLocalizedPrices(
          await this.binding.requestLocalizedPrices(
            this.configuredItemDefIds(),
          ),
          this.configuredItemDefIds(),
        )
        const byItemDef = new Map(prices.map((listing) => [
          listing.itemDefId,
          listing.localizedPrice,
        ]))
        return Object.freeze(STEAM_STORE_PRODUCT_IDS.map((productId) => {
          const localizedPrice = byItemDef.get(
            this.config.products[productId],
          )
          return Object.freeze({
            productId,
            localizedPrice: localizedPrice ?? null,
            available: localizedPrice !== undefined,
          })
        }))
      } catch {
        return unavailableProducts()
      }
    })
  }

  async purchase(productId) {
    requireProductId(productId)
    if (!this.available) return failedPurchase(productId, 'store-unavailable')
    if (this.purchaseInFlight) {
      return failedPurchase(productId, 'purchase-pending')
    }
    this.purchaseInFlight = true
    return this.runProviderOperation(async () => {
      try {
        await this.ensureIdentity()
        const itemDefId = this.config.products[productId]
        const before = tipProductIds.has(productId)
          ? validateInventoryItems(await this.binding.getAllItems())
          : null
        const result = validatePurchaseResult(
          await this.binding.startPurchase(itemDefId, 1),
        )
        const failureCode = purchaseFailureCode(result?.status)
        if (failureCode !== null) {
          return failedPurchase(productId, failureCode)
        }

        const after = validateInventoryItems(await this.binding.getAllItems())
        const ownership = ownershipFromItems(after, this.config.products)
        if (tipProductIds.has(productId)) {
          const delivered = findDeliveredItem(before, after, itemDefId)
          if (delivered === null) {
            return failedPurchase(productId, 'purchase-failed')
          }
          const supporterOwnership = freezeOwnership({
            ...ownership,
            supporterCatGallery: true,
          })
          const pending = this.pendingTipConsumptionsFromInventory(after)
          const persisted = await this.publishVerifiedState({
            ownership: supporterOwnership,
            pendingConsumptions: pending,
          })
          const consumed = persisted && await this.consumePendingItem(
            pending.find((item) =>
              item.instanceId === delivered.instanceId &&
              item.itemDefId === delivered.itemDefId),
            after,
          )
          if (consumed) {
            await this.publishVerifiedState({
              ownership: supporterOwnership,
              pendingConsumptions: pending.filter(
                (item) => item.instanceId !== delivered.instanceId,
              ),
            })
          }
        } else {
          if (!ownershipForProduct(ownership, productId)) {
            return failedPurchase(productId, 'purchase-failed')
          }
          const state = await this.currentCacheState(ownership)
          await this.publishVerifiedState({ ...state, ownership })
        }
        return Object.freeze({ accepted: true, productId })
      } catch {
        return failedPurchase(productId, 'purchase-failed')
      } finally {
        this.purchaseInFlight = false
      }
    })
  }

  async restorePurchases() {
    if (!this.available) {
      return Object.freeze({ restoredProductIds: Object.freeze([]) })
    }
    return this.runProviderOperation(async () => {
      try {
        const ownership = (await this.refreshAuthoritativeState()).ownership
        return Object.freeze({
          restoredProductIds: Object.freeze(durableProductIds.filter(
            (productId) => ownershipForProduct(ownership, productId),
          )),
        })
      } catch {
        return Object.freeze({ restoredProductIds: Object.freeze([]) })
      }
    })
  }

  async readEntitlements(refresh = false) {
    if (refresh && this.available) {
      try {
        return await this.runProviderOperation(
          async () => (await this.refreshAuthoritativeState()).ownership,
        )
      } catch {
        // An unavailable provider must not erase the latest verified cache.
      }
    }
    if (!isValidSteamId(this.steamId)) return emptyOwnership()
    if (this.liveState !== null) return this.liveState.ownership
    try {
      return (await this.cache.read(this.steamId))?.ownership ?? emptyOwnership()
    } catch {
      return emptyOwnership()
    }
  }

  configuredItemDefIds() {
    return Object.freeze(STEAM_STORE_PRODUCT_IDS.map(
      (productId) => this.config.products[productId],
    ))
  }

  maintenanceState() {
    return Object.freeze({
      persistence: this.cacheDisabled
        ? 'disabled'
        : this.persistenceError === null ? 'ready' : 'retry-pending',
      pendingTipConsumptions:
        this.liveState?.pendingConsumptions.length ?? 0,
    })
  }

  async refreshAuthoritativeState() {
    await this.ensureIdentity()
    const items = validateInventoryItems(await this.binding.getAllItems())
    const providerOwnership = ownershipFromItems(items, this.config.products)
    const cached = await this.currentCacheState(providerOwnership)
    const pendingConsumptions = this.pendingTipConsumptionsFromInventory(items)
    const ownership = freezeOwnership({
      ...providerOwnership,
      supporterCatGallery:
        cached.ownership.supporterCatGallery ||
        pendingConsumptions.length > 0,
    })
    if (pendingConsumptions.length === 0) {
      const state = freezeCacheState({ ownership, pendingConsumptions })
      await this.publishVerifiedState(state)
      return state
    }
    const persisted = await this.publishVerifiedState(
      { ownership, pendingConsumptions },
    )
    if (!persisted) {
      return freezeCacheState({ ownership, pendingConsumptions })
    }
    const remaining = []
    for (const pending of pendingConsumptions) {
      const instance = items.find((item) =>
        item.instanceId === pending.instanceId &&
        item.itemDefId === pending.itemDefId &&
        item.quantity >= pending.quantity)
      if (
        instance !== undefined &&
        !(await this.consumePendingItem(pending, items))
      ) {
        remaining.push(pending)
      }
    }
    const state = freezeCacheState({
      ownership,
      pendingConsumptions: remaining,
    })
    await this.publishVerifiedState(state)
    return state
  }

  async currentCacheState(fallbackOwnership) {
    if (this.liveState !== null) return this.liveState
    try {
      return (await this.cache.read(this.steamId)) ?? freezeCacheState({
        ownership: fallbackOwnership,
        pendingConsumptions: [],
      })
    } catch {
      return freezeCacheState({
        ownership: fallbackOwnership,
        pendingConsumptions: [],
      })
    }
  }

  async publishVerifiedState(state) {
    const frozen = freezeCacheState(state)
    this.liveState = frozen
    try {
      await this.cache.write(this.steamId, frozen, this.sampleUtc())
      this.pendingPersistence = null
      this.persistenceError = null
      this.cacheDisabled = false
      return true
    } catch (error) {
      this.persistenceError = error
      if (isProtectionUnavailableError(error)) {
        this.cacheDisabled = true
        this.pendingPersistence = null
      } else {
        this.pendingPersistence = frozen
        this.schedulePersistenceRetry()
      }
      return false
    }
  }

  schedulePersistenceRetry() {
    if (this.retryScheduled || this.pendingPersistence === null) return
    this.retryScheduled = true
    this.scheduleRetry(() => {
      this.retryScheduled = false
      void this.runProviderOperation(() => this.retryPersistence())
    })
  }

  async retryPersistence() {
    if (this.pendingPersistence === null || !isValidSteamId(this.steamId)) return
    const pending = this.pendingPersistence
    try {
      await this.cache.write(this.steamId, pending, this.sampleUtc())
      if (this.pendingPersistence === pending) this.pendingPersistence = null
      this.persistenceError = null
      this.cacheDisabled = false
      if (pending.pendingConsumptions.length > 0) {
        try {
          await this.refreshAuthoritativeState()
        } catch {
          // The durable pending record remains recovery authority until the
          // next provider refresh or process restart can finish cleanup.
        }
      }
    } catch (error) {
      this.persistenceError = error
      this.schedulePersistenceRetry()
    }
  }

  async consumePendingItem(item, inventoryItems) {
    if (
      item === undefined ||
      !this.isConfiguredTipItemDef(item.itemDefId) ||
      !inventoryItems.some((inventoryItem) =>
        inventoryItem.instanceId === item.instanceId &&
        inventoryItem.itemDefId === item.itemDefId &&
        inventoryItem.quantity >= item.quantity)
    ) return false
    try {
      return await this.binding.consumeItem(item.instanceId, item.quantity) === true
    } catch {
      return false
    }
  }

  isConfiguredTipItemDef(itemDefId) {
    return tipProductIds.has(productIdForItemDef(
      itemDefId,
      this.config.products,
    ))
  }

  pendingTipConsumptionsFromInventory(inventoryItems) {
    return freezePendingConsumptions(inventoryItems
      .filter((item) => this.isConfiguredTipItemDef(item.itemDefId))
      .map((item) => ({
        itemDefId: item.itemDefId,
        instanceId: item.instanceId,
        quantity: item.quantity,
      })))
  }

  async ensureIdentity() {
    const current = await this.readAuthenticatedSteamId()
    if (this.steamId !== null && current !== this.steamId) {
      this.liveState = null
      this.pendingPersistence = null
      this.persistenceError = null
      this.cacheDisabled = false
    }
    this.steamId = current
    return current
  }

  async readAuthenticatedSteamId() {
    const steamId = await this.binding.getAuthenticatedSteamId()
    if (!isValidSteamId(steamId)) {
      throw new Error('Steam authenticated identity is unavailable.')
    }
    return steamId
  }

  runProviderOperation(operation) {
    const result = this.providerQueue.then(operation, operation)
    this.providerQueue = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }
}

function isValidSteamItemDefId(value) {
  return Number.isSafeInteger(value) &&
    value > 0 &&
    value <= maximumSteamItemDefId
}

function isInventoryBinding(value) {
  return value !== null &&
    typeof value === 'object' &&
    typeof value.requestLocalizedPrices === 'function' &&
    typeof value.getAuthenticatedSteamId === 'function' &&
    typeof value.getAllItems === 'function' &&
    typeof value.startPurchase === 'function' &&
    typeof value.consumeItem === 'function'
}

function unavailableProducts() {
  return Object.freeze(STEAM_STORE_PRODUCT_IDS.map((productId) =>
    Object.freeze({ productId, localizedPrice: null, available: false })))
}

function requireProductId(productId) {
  if (!STEAM_STORE_PRODUCT_IDS.includes(productId)) {
    throw new Error('Unknown native Store product.')
  }
}

function purchaseFailureCode(status) {
  if (status === 'completed') return null
  if (status === 'cancelled') return 'purchase-cancelled'
  if (status === 'pending') return 'purchase-pending'
  return 'purchase-failed'
}

function failedPurchase(productId, code) {
  return Object.freeze({ accepted: false, productId, code })
}

function ownershipFromItems(items, products) {
  const ownedItemDefs = new Set(items.map((item) => item.itemDefId))
  return freezeOwnership({
    developerOptions: ownedItemDefs.has(products['ids.devoptions']),
    doubleInfinityPoints: ownedItemDefs.has(products['ids.doubleip']),
    supporterCatGallery: false,
  })
}

function validateInventoryItems(items) {
  if (!Array.isArray(items)) throw new Error('Steam inventory payload is invalid.')
  const instanceIds = new Set()
  return Object.freeze(items.map((item) => {
    if (
      item === null ||
      typeof item !== 'object' ||
      !isValidSteamItemDefId(item.itemDefId) ||
      !isValidSteamInstanceId(item.instanceId) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0 ||
      instanceIds.has(item.instanceId)
    ) throw new Error('Steam inventory item is invalid.')
    instanceIds.add(item.instanceId)
    return Object.freeze({
      itemDefId: item.itemDefId,
      instanceId: item.instanceId,
      quantity: item.quantity,
    })
  }))
}

function validateLocalizedPrices(prices, requestedItemDefIds) {
  if (!Array.isArray(prices)) throw new Error('Steam price payload is invalid.')
  const requested = new Set(requestedItemDefIds)
  const seen = new Set()
  return Object.freeze(prices.map((listing) => {
    if (
      listing === null ||
      typeof listing !== 'object' ||
      !requested.has(listing.itemDefId) ||
      seen.has(listing.itemDefId) ||
      typeof listing.localizedPrice !== 'string' ||
      listing.localizedPrice.trim() === ''
    ) throw new Error('Steam localized price is invalid.')
    seen.add(listing.itemDefId)
    return Object.freeze({
      itemDefId: listing.itemDefId,
      localizedPrice: listing.localizedPrice,
    })
  }))
}

function validatePurchaseResult(result) {
  if (
    result === null ||
    typeof result !== 'object' ||
    !['completed', 'cancelled', 'pending', 'failed'].includes(result.status)
  ) throw new Error('Steam purchase result is invalid.')
  return result
}

function ownershipForProduct(ownership, productId) {
  if (productId === 'ids.devoptions') return ownership.developerOptions
  if (productId === 'ids.doubleip') return ownership.doubleInfinityPoints
  if (tipProductIds.has(productId)) return ownership.supporterCatGallery
  return false
}

function productIdForItemDef(itemDefId, products) {
  return STEAM_STORE_PRODUCT_IDS.find(
    (productId) => products[productId] === itemDefId,
  ) ?? null
}

function findDeliveredItem(before, after, itemDefId) {
  const beforeItems = new Map(before.map((item) => [item.instanceId, item]))
  return after.find((item) => {
    if (item.itemDefId !== itemDefId) return false
    const prior = beforeItems.get(item.instanceId)
    return prior === undefined || (
      prior.itemDefId === itemDefId && item.quantity > prior.quantity
    )
  }) ?? null
}

function emptyOwnership() {
  return freezeOwnership({
    doubleInfinityPoints: false,
    developerOptions: false,
    supporterCatGallery: false,
  })
}

function freezeOwnership(ownership) {
  return Object.freeze({
    doubleInfinityPoints: ownership.doubleInfinityPoints === true,
    developerOptions: ownership.developerOptions === true,
    supporterCatGallery: ownership.supporterCatGallery === true,
  })
}

function isValidOwnership(ownership) {
  return ownership !== null &&
    typeof ownership === 'object' &&
    typeof ownership.doubleInfinityPoints === 'boolean' &&
    typeof ownership.developerOptions === 'boolean' &&
    (
      ownership.supporterCatGallery === undefined ||
      typeof ownership.supporterCatGallery === 'boolean'
    )
}

function isValidSteamId(value) {
  return typeof value === 'string' && /^[1-9]\d{16,19}$/.test(value)
}

function isValidSteamInstanceId(value) {
  return typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value)
}

function isValidPendingConsumptions(value) {
  if (!Array.isArray(value)) return false
  const instanceIds = new Set()
  return value.every((item) => {
    if (
      item === null ||
      typeof item !== 'object' ||
      !isValidSteamItemDefId(item.itemDefId) ||
      !isValidSteamInstanceId(item.instanceId) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0 ||
      instanceIds.has(item.instanceId)
    ) return false
    instanceIds.add(item.instanceId)
    return true
  })
}

function freezePendingConsumptions(items) {
  return Object.freeze(items.map((item) => Object.freeze({
    itemDefId: item.itemDefId,
    instanceId: item.instanceId,
    quantity: item.quantity,
  })))
}

function isValidProtector(value) {
  return value !== null &&
    typeof value === 'object' &&
    typeof value.protect === 'function' &&
    typeof value.unprotect === 'function'
}

function freezeCacheState(state) {
  return Object.freeze({
    ownership: freezeOwnership(state.ownership),
    pendingConsumptions: freezePendingConsumptions(
      state.pendingConsumptions,
    ),
  })
}

function defaultScheduleRetry(callback) {
  const timer = setTimeout(callback, 1_000)
  timer.unref?.()
}

function protectionUnavailableError() {
  return Object.assign(
    new Error('Steam cache OS protection is unavailable.'),
    { code: protectionUnavailableCode },
  )
}

function isProtectionUnavailableError(error) {
  return error !== null &&
    typeof error === 'object' &&
    error.code === protectionUnavailableCode
}

async function syncDirectory(path) {
  let handle
  try {
    handle = await open(path, 'r')
    await handle.sync()
  } catch (error) {
    if (!['EINVAL', 'ENOTSUP', 'EPERM', 'EISDIR'].includes(error?.code)) {
      throw error
    }
  } finally {
    await handle?.close()
  }
}
