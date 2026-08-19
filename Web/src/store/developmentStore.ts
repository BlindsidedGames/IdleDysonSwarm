import {
  CANONICAL_STORE_PRODUCTS,
  STORE_PRODUCT_IDS,
  type EntitlementAuthority,
  type HostEntitlementOwnership,
  type StoreAdapter,
  type StoreProductId,
  type StoreProductListing,
  type StorePurchaseResult,
  type StoreRestoreResult,
} from './contracts'

export type DevelopmentPurchaseOutcome =
  | 'success'
  | 'cancelled'
  | 'failed'

export interface DevelopmentStoreOptions {
  readonly outcomes?: Partial<
    Readonly<Record<StoreProductId, DevelopmentPurchaseOutcome>>
  >
  readonly initialOwnership?: Partial<HostEntitlementOwnership>
}

const DEFAULT_OUTCOMES: Readonly<
  Record<StoreProductId, DevelopmentPurchaseOutcome>
> = {
  [STORE_PRODUCT_IDS.tipTier1]: 'success',
  [STORE_PRODUCT_IDS.tipTier2]: 'cancelled',
  [STORE_PRODUCT_IDS.tipTier3]: 'failed',
  [STORE_PRODUCT_IDS.developerOptions]: 'success',
  [STORE_PRODUCT_IDS.doubleInfinityPoints]: 'success',
}

const OUTCOME_LABELS: Readonly<
  Record<DevelopmentPurchaseOutcome, string>
> = {
  success: 'Test: succeeds',
  cancelled: 'Test: cancels',
  failed: 'Test: fails',
}

/**
 * In-memory commerce used only by the Vite development composition. It owns no
 * network ports, receipts, storage or provider SDK and therefore cannot create
 * a charge. Listings explain the deterministic result of each test button.
 */
export class DevelopmentStoreCommerce
implements StoreAdapter, EntitlementAuthority {
  private readonly outcomes: Readonly<
    Record<StoreProductId, DevelopmentPurchaseOutcome>
  >
  private ownership: Readonly<HostEntitlementOwnership>

  constructor(options: Readonly<DevelopmentStoreOptions> = {}) {
    this.outcomes = Object.freeze({
      ...DEFAULT_OUTCOMES,
      ...options.outcomes,
    })
    this.ownership = freezeOwnership({
      doubleInfinityPoints:
        options.initialOwnership?.doubleInfinityPoints === true,
      developerOptions:
        options.initialOwnership?.developerOptions === true,
    })
  }

  async products(): Promise<readonly StoreProductListing[]> {
    return Object.freeze(
      CANONICAL_STORE_PRODUCTS.map((product) => Object.freeze({
        productId: product.id,
        localizedPrice: OUTCOME_LABELS[this.outcomes[product.id]],
        available: true,
      })),
    )
  }

  async purchase(productId: StoreProductId): Promise<StorePurchaseResult> {
    const outcome = this.outcomes[productId]
    if (outcome === 'cancelled' || outcome === 'failed') {
      return Object.freeze({
        accepted: false as const,
        productId,
        code: outcome === 'cancelled'
          ? 'purchase-cancelled' as const
          : 'purchase-failed' as const,
      })
    }
    if (productId === STORE_PRODUCT_IDS.developerOptions) {
      this.ownership = freezeOwnership({
        ...this.ownership,
        developerOptions: true,
      })
    } else if (productId === STORE_PRODUCT_IDS.doubleInfinityPoints) {
      this.ownership = freezeOwnership({
        ...this.ownership,
        doubleInfinityPoints: true,
      })
    }
    return Object.freeze({
      accepted: true as const,
      productId,
    })
  }

  async restorePurchases(): Promise<StoreRestoreResult> {
    return Object.freeze({
      restoredProductIds: Object.freeze([
        ...(this.ownership.developerOptions
          ? [STORE_PRODUCT_IDS.developerOptions]
          : []),
        ...(this.ownership.doubleInfinityPoints
          ? [STORE_PRODUCT_IDS.doubleInfinityPoints]
          : []),
      ]),
    })
  }

  async readOwnership(): Promise<Readonly<HostEntitlementOwnership>> {
    return this.ownership
  }

  async refreshOwnership(): Promise<Readonly<HostEntitlementOwnership>> {
    return this.ownership
  }
}

function freezeOwnership(
  ownership: Readonly<HostEntitlementOwnership>,
): Readonly<HostEntitlementOwnership> {
  return Object.freeze({
    doubleInfinityPoints: ownership.doubleInfinityPoints === true,
    developerOptions: ownership.developerOptions === true,
  })
}
