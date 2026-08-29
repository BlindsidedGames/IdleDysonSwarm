import {
  CANONICAL_STORE_PRODUCTS,
  getCanonicalStoreProduct,
  STORE_PRODUCT_IDS,
  isSupporterProductId,
  resolveEffectiveEntitlementAccess,
  type EffectiveEntitlementAccess,
  type EntitlementAuthority,
  type HostEntitlementOwnership,
  type StoreAdapter,
  type StoreProductId,
  type StoreProductListing,
} from './contracts'
import type {
  DoubleInfinityPointsEffectPreference,
} from './doubleInfinityPointsEffect'

export type StorefrontOperation =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'purchasing'; readonly productId: StoreProductId }
  | { readonly kind: 'restoring' }
  | { readonly kind: 'updating-double-infinity-points' }

export type StorefrontFeedback =
  | { readonly kind: 'entitlement-verified'; readonly productId: StoreProductId }
  | { readonly kind: 'restore-completed'; readonly restoredCount: number }
  | { readonly kind: 'double-infinity-points-effect-updated'; readonly enabled: boolean }
  | {
      readonly kind: 'operation-failed'
      readonly code:
        | 'catalog-unavailable'
        | 'store-unavailable'
        | 'purchase-cancelled'
        | 'purchase-pending'
        | 'purchase-failed'
        | 'verification-failed'
        | 'restore-failed'
        | 'effect-update-failed'
    }

export interface StorefrontSnapshot {
  readonly initialized: boolean
  readonly operation: StorefrontOperation
  readonly listings: readonly StoreProductListing[]
  readonly hostOwnership: Readonly<HostEntitlementOwnership>
  readonly doubleInfinityPointsEnabled: boolean
  readonly feedback: StorefrontFeedback | null
}

export interface StorefrontControllerOptions {
  readonly store: StoreAdapter
  readonly entitlements: EntitlementAuthority
  readonly doubleInfinityPointsEffect: DoubleInfinityPointsEffectPreference
  /** Reprojects verified host ownership into canonical runtime state. */
  readonly onVerifiedOwnershipChanged?: () => Promise<boolean>
}

const EMPTY_OWNERSHIP = Object.freeze({
  doubleInfinityPoints: false,
  developerOptions: false,
  supporterCatGallery: false,
})

const INITIAL_SNAPSHOT: StorefrontSnapshot = Object.freeze({
  initialized: false,
  operation: Object.freeze({ kind: 'idle' as const }),
  listings: Object.freeze([]),
  hostOwnership: EMPTY_OWNERSHIP,
  doubleInfinityPointsEnabled: true,
  feedback: null,
})

/**
 * Serial platform-neutral Store orchestration. Purchase success is not enough
 * to grant a durable benefit: ownership must also be verified by the host
 * authority. Supporter tiers remain repeatable and grant no gameplay state.
 */
export class StorefrontController {
  private snapshotValue: StorefrontSnapshot = INITIAL_SNAPSHOT
  private readonly listeners = new Set<() => void>()
  private initializePromise: Promise<void> | null = null
  private readonly options: StorefrontControllerOptions
  private readonly doubleInfinityPointsEffect:
    DoubleInfinityPointsEffectPreference

  constructor(options: StorefrontControllerOptions) {
    this.options = options
    this.doubleInfinityPointsEffect = options.doubleInfinityPointsEffect
    this.snapshotValue = Object.freeze({
      ...INITIAL_SNAPSHOT,
      doubleInfinityPointsEnabled:
        this.doubleInfinityPointsEffect.getSnapshot(),
    })
  }

  getSnapshot = (): StorefrontSnapshot => this.snapshotValue

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  initialize(): Promise<void> {
    if (this.snapshotValue.initialized) return Promise.resolve()
    if (this.initializePromise !== null) return this.initializePromise
    this.publish({ operation: { kind: 'loading' } })
    this.initializePromise = this.loadInitialState().finally(() => {
      this.initializePromise = null
    })
    return this.initializePromise
  }

  async purchase(productId: StoreProductId): Promise<void> {
    if (this.snapshotValue.operation.kind !== 'idle') return
    const listing = this.snapshotValue.listings.find(
      (candidate) => candidate.productId === productId,
    )
    if (
      listing === undefined ||
      !listing.available ||
      listing.localizedPrice === null
    ) {
      this.publish({
        feedback: { kind: 'operation-failed', code: 'store-unavailable' },
      })
      return
    }

    this.publish({
      operation: { kind: 'purchasing', productId },
      feedback: null,
    })
    try {
      const result = await this.options.store.purchase(productId)
      if (!result.accepted) {
        this.publish({
          operation: { kind: 'idle' },
          feedback: { kind: 'operation-failed', code: result.code },
        })
        return
      }
      if (result.productId !== productId) {
        this.publish({
          operation: { kind: 'idle' },
          feedback: { kind: 'operation-failed', code: 'verification-failed' },
        })
        return
      }

      const ownership = await this.options.entitlements.refreshOwnership()
      if (!ownsProduct(ownership, productId)) {
        this.publish({
          operation: { kind: 'idle' },
          hostOwnership: ownership,
          feedback: {
            kind: 'operation-failed',
            code: 'verification-failed',
          },
        })
        return
      }
      if (
        !isSupporterProductId(productId) &&
        this.options.onVerifiedOwnershipChanged !== undefined &&
        !(await this.options.onVerifiedOwnershipChanged())
      ) {
        this.publish({
          operation: { kind: 'idle' },
          hostOwnership: ownership,
          feedback: {
            kind: 'operation-failed',
            code: 'verification-failed',
          },
        })
        return
      }
      this.publish({
        operation: { kind: 'idle' },
        hostOwnership: ownership,
        feedback: { kind: 'entitlement-verified', productId },
      })
    } catch {
      this.publish({
        operation: { kind: 'idle' },
        feedback: { kind: 'operation-failed', code: 'purchase-failed' },
      })
    }
  }

  async restorePurchases(): Promise<void> {
    if (this.snapshotValue.operation.kind !== 'idle') return
    this.publish({ operation: { kind: 'restoring' }, feedback: null })
    try {
      const result = await this.options.store.restorePurchases()
      const requestedDurableIds = new Set(
        result.restoredProductIds.filter(isDurableProductId),
      )
      const ownership = await this.options.entitlements.refreshOwnership()
      const restoredCount = [
        STORE_PRODUCT_IDS.developerOptions,
        STORE_PRODUCT_IDS.doubleInfinityPoints,
      ].filter(
        (productId) =>
          requestedDurableIds.has(productId) &&
          ownsProduct(ownership, productId),
      ).length
      if (
        restoredCount > 0 &&
        this.options.onVerifiedOwnershipChanged !== undefined &&
        !(await this.options.onVerifiedOwnershipChanged())
      ) {
        this.publish({
          operation: { kind: 'idle' },
          hostOwnership: ownership,
          feedback: { kind: 'operation-failed', code: 'restore-failed' },
        })
        return
      }
      this.publish({
        operation: { kind: 'idle' },
        hostOwnership: ownership,
        feedback: { kind: 'restore-completed', restoredCount },
      })
    } catch {
      this.publish({
        operation: { kind: 'idle' },
        feedback: { kind: 'operation-failed', code: 'restore-failed' },
      })
    }
  }

  async toggleDoubleInfinityPoints(): Promise<void> {
    if (
      this.snapshotValue.operation.kind !== 'idle' ||
      !this.snapshotValue.hostOwnership.doubleInfinityPoints
    ) return
    const previous = this.doubleInfinityPointsEffect.getSnapshot()
    const enabled = !previous
    this.publish({
      operation: { kind: 'updating-double-infinity-points' },
      feedback: null,
    })
    this.doubleInfinityPointsEffect.setEnabled(enabled)
    try {
      if (
        this.options.onVerifiedOwnershipChanged !== undefined &&
        !(await this.options.onVerifiedOwnershipChanged())
      ) {
        throw new Error('Runtime entitlement projection failed.')
      }
      this.publish({
        operation: { kind: 'idle' },
        doubleInfinityPointsEnabled: enabled,
        feedback: {
          kind: 'double-infinity-points-effect-updated',
          enabled,
        },
      })
    } catch {
      this.doubleInfinityPointsEffect.setEnabled(previous)
      await this.options.onVerifiedOwnershipChanged?.().catch(() => false)
      this.publish({
        operation: { kind: 'idle' },
        doubleInfinityPointsEnabled: previous,
        feedback: {
          kind: 'operation-failed',
          code: 'effect-update-failed',
        },
      })
    }
  }

  effectiveAccess(
    localDeveloperOptionsPurchased: boolean,
  ): Readonly<EffectiveEntitlementAccess> {
    return resolveEffectiveEntitlementAccess({
      hostOwnership: this.snapshotValue.hostOwnership,
      localDeveloperOptions: {
        purchasedInGame: localDeveloperOptionsPurchased,
      },
    })
  }

  private async loadInitialState(): Promise<void> {
    const [listingsResult, ownershipResult] = await Promise.allSettled([
      this.options.store.products(),
      this.options.entitlements.readOwnership(),
    ])
    this.publish({
      initialized: true,
      operation: { kind: 'idle' },
      listings: listingsResult.status === 'fulfilled'
        ? normalizeListings(listingsResult.value)
        : Object.freeze([]),
      hostOwnership: ownershipResult.status === 'fulfilled'
        ? ownershipResult.value
        : EMPTY_OWNERSHIP,
      feedback:
        listingsResult.status === 'rejected' ||
        ownershipResult.status === 'rejected'
          ? {
              kind: 'operation-failed',
              code: 'catalog-unavailable',
            }
          : null,
    })
  }

  private publish(update: Partial<StorefrontSnapshot>): void {
    this.snapshotValue = Object.freeze({
      ...this.snapshotValue,
      ...update,
      operation: update.operation === undefined
        ? this.snapshotValue.operation
        : Object.freeze(update.operation),
      listings: update.listings ?? this.snapshotValue.listings,
      hostOwnership: update.hostOwnership === undefined
        ? this.snapshotValue.hostOwnership
        : Object.freeze({
            doubleInfinityPoints:
              update.hostOwnership.doubleInfinityPoints === true,
            developerOptions:
              update.hostOwnership.developerOptions === true,
            supporterCatGallery:
              update.hostOwnership.supporterCatGallery === true,
          }),
    })
    for (const listener of this.listeners) listener()
  }
}

function normalizeListings(
  listings: readonly StoreProductListing[],
): readonly StoreProductListing[] {
  const byId = new Map(
    listings.map((listing) => [listing.productId, listing]),
  )
  return Object.freeze(
    CANONICAL_STORE_PRODUCTS.map((product) => {
      const listing = byId.get(product.id)
      return Object.freeze({
        productId: product.id,
        localizedPrice:
          typeof listing?.localizedPrice === 'string' &&
          listing.localizedPrice.trim().length > 0
            ? listing.localizedPrice
            : null,
        available: listing?.available === true,
      })
    }),
  )
}

function isDurableProductId(productId: StoreProductId): boolean {
  return getCanonicalStoreProduct(productId).durability === 'durable'
}

function ownsProduct(
  ownership: Readonly<HostEntitlementOwnership>,
  productId: StoreProductId,
): boolean {
  if (productId === STORE_PRODUCT_IDS.developerOptions) {
    return ownership.developerOptions
  }
  if (productId === STORE_PRODUCT_IDS.doubleInfinityPoints) {
    return ownership.doubleInfinityPoints
  }
  if (isSupporterProductId(productId)) {
    return ownership.supporterCatGallery
  }
  return false
}
