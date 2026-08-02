/**
 * Stable product identifiers exported by Unity's IAP catalog.  Provider SKU
 * aliases belong in a future store host, never in gameplay or save data.
 */
export const STORE_PRODUCT_IDS = Object.freeze({
  tipTier1: 'ids.tiptier1',
  tipTier2: 'ids.tiptier2',
  tipTier3: 'ids.tiptier3',
  developerOptions: 'ids.devoptions',
  doubleInfinityPoints: 'ids.doubleip',
} as const)

export type StoreProductId =
  (typeof STORE_PRODUCT_IDS)[keyof typeof STORE_PRODUCT_IDS]

export type StoreProductKind =
  | 'support-tip'
  | 'developer-options'
  | 'double-infinity-points'

export type StoreProductDurability = 'consumable' | 'durable'

export interface StoreProduct {
  readonly id: StoreProductId
  readonly kind: StoreProductKind
  readonly durability: StoreProductDurability
  readonly title: string
  readonly description: string
}

/** The catalog is product metadata only; it grants no gameplay effect itself. */
export const CANONICAL_STORE_PRODUCTS: readonly StoreProduct[] = Object.freeze([
  Object.freeze({
    id: STORE_PRODUCT_IDS.tipTier1,
    kind: 'support-tip',
    durability: 'consumable',
    title: 'Tip Tier 1',
    description: 'Treat the Cats!',
  }),
  Object.freeze({
    id: STORE_PRODUCT_IDS.tipTier2,
    kind: 'support-tip',
    durability: 'consumable',
    title: 'Tip Tier 2',
    description: 'Buy us a coffee',
  }),
  Object.freeze({
    id: STORE_PRODUCT_IDS.tipTier3,
    kind: 'support-tip',
    durability: 'consumable',
    title: 'Tip Tier 3',
    description: 'Support my kids',
  }),
  Object.freeze({
    id: STORE_PRODUCT_IDS.developerOptions,
    kind: 'developer-options',
    durability: 'durable',
    title: 'Access Developer Options',
    description: 'Allows the user to access the debug menu.',
  }),
  Object.freeze({
    id: STORE_PRODUCT_IDS.doubleInfinityPoints,
    kind: 'double-infinity-points',
    durability: 'durable',
    title: 'Double Infinity Points',
    description: 'Grants a togglable option to earn double infinity points.',
  }),
])

export interface StorePurchaseSuccess {
  readonly accepted: true
  readonly productId: StoreProductId
}

export interface StorePurchaseUnavailable {
  readonly accepted: false
  readonly productId: StoreProductId
  readonly code: 'store-unavailable'
}

export type StorePurchaseResult =
  | StorePurchaseSuccess
  | StorePurchaseUnavailable

export interface StoreRestoreResult {
  readonly restoredProductIds: readonly StoreProductId[]
}

/**
 * A provider-facing port. Implementations authenticate purchases and own the
 * receipt/restore protocol; callers must ask EntitlementAuthority for access.
 */
export interface StoreAdapter {
  products(): Promise<readonly StoreProduct[]>
  purchase(productId: StoreProductId): Promise<StorePurchaseResult>
  restorePurchases(): Promise<StoreRestoreResult>
}

/**
 * Browser/local development intentionally exposes the catalog but cannot sell
 * or restore anything. This is not a fake purchase implementation.
 */
export class NoopStoreAdapter implements StoreAdapter {
  async products(): Promise<readonly StoreProduct[]> {
    return CANONICAL_STORE_PRODUCTS
  }

  async purchase(productId: StoreProductId): Promise<StorePurchaseResult> {
    return Object.freeze({
      accepted: false as const,
      productId,
      code: 'store-unavailable' as const,
    })
  }

  async restorePurchases(): Promise<StoreRestoreResult> {
    return Object.freeze({ restoredProductIds: Object.freeze([]) })
  }
}

export interface HostEntitlementOwnership {
  readonly doubleInfinityPoints: boolean
  readonly developerOptions: boolean
}

/**
 * An authenticated host/store owns durable benefits. It is deliberately
 * separate from a shared save, which is untrusted for purchase ownership.
 */
export interface EntitlementAuthority {
  readOwnership(): Promise<Readonly<HostEntitlementOwnership>>
}

export class NoopEntitlementAuthority implements EntitlementAuthority {
  async readOwnership(): Promise<Readonly<HostEntitlementOwnership>> {
    return Object.freeze({
      doubleInfinityPoints: false,
      developerOptions: false,
    })
  }
}

/** Claims carried by an imported/shared save are retained only for reporting. */
export interface SharedSaveEntitlementClaims {
  readonly doubleInfinityPoints?: boolean
  readonly developerOptions?: boolean
}

/**
 * The pre-existing in-game Developer Options purchase remains modelled as a
 * local progression path. A host may choose how it is persisted, but shared
 * save data must never turn it into a portable entitlement.
 */
export interface LocalDeveloperOptionsPath {
  readonly purchasedInGame: boolean
}

export interface EffectiveEntitlementAccess {
  readonly doubleInfinityPoints: boolean
  readonly developerOptions: boolean
  readonly developerOptionsSource:
    | 'none'
    | 'host-store'
    | 'local-in-game-progression'
  readonly ignoredSharedSaveClaims: Readonly<SharedSaveEntitlementClaims>
}

/**
 * Resolves gameplay access without trusting a shared-save ownership claim.
 * Double IP is host-owned only. Developer Options may additionally be granted
 * by the already-supported local in-game progression route.
 */
export function resolveEffectiveEntitlementAccess(input: {
  readonly hostOwnership: Readonly<HostEntitlementOwnership>
  readonly localDeveloperOptions: LocalDeveloperOptionsPath
  readonly sharedSaveClaims?: SharedSaveEntitlementClaims
}): Readonly<EffectiveEntitlementAccess> {
  const developerOptionsSource = input.hostOwnership.developerOptions
    ? 'host-store'
    : input.localDeveloperOptions.purchasedInGame
      ? 'local-in-game-progression'
      : 'none'

  return Object.freeze({
    doubleInfinityPoints: input.hostOwnership.doubleInfinityPoints,
    developerOptions: developerOptionsSource !== 'none',
    developerOptionsSource,
    ignoredSharedSaveClaims: Object.freeze({
      doubleInfinityPoints: input.sharedSaveClaims?.doubleInfinityPoints,
      developerOptions: input.sharedSaveClaims?.developerOptions,
    }),
  })
}
