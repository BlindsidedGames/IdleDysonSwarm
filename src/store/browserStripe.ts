import {
  createEmptyHostEntitlementOwnership,
  STORE_PRODUCT_IDS,
  type EntitlementAuthority,
  type HostEntitlementOwnership,
  type StoreAdapter,
  type StoreProductId,
  type StoreProductListing,
  type StorePurchaseResult,
  type StoreRestoreResult,
} from './contracts'

const STORAGE_KEY = 'idle-dyson-swarm:stripe-device:v1'
const API_ROOT = '/api/ids/stripe'
const EMPTY_OWNERSHIP = createEmptyHostEntitlementOwnership()

interface BrowserStripeRecord {
  readonly deviceKey: string
  readonly tokens: readonly string[]
}

interface BrowserStripeCatalogResponse {
  readonly products: readonly StoreProductListing[]
}

interface BrowserStripeVerifyResponse {
  readonly ownership: HostEntitlementOwnership
  readonly tokens: readonly string[]
  readonly completedProductId: StoreProductId | null
}

export interface BrowserStripePorts {
  readonly fetch: typeof fetch
  readonly storage: Pick<Storage, 'getItem' | 'setItem'>
  readonly currentUrl: () => string
  readonly redirect: (url: string) => void
  readonly replaceUrl: (url: string) => void
  readonly randomBytes: () => Uint8Array
}

/**
 * Stripe Checkout adapter for the hosted Web build. Durable receipts are
 * bound to one randomly generated browser key and cannot be restored on a
 * different device or after this site's storage is cleared.
 */
export class BrowserStripeCommerce
implements StoreAdapter, EntitlementAuthority {
  private readonly ports: BrowserStripePorts
  private readonly apiRoot: string
  private verifiedSupporterCatGallery = false

  constructor(
    ports: BrowserStripePorts = browserStripePorts(),
    apiRoot = API_ROOT,
  ) {
    this.ports = ports
    this.apiRoot = apiRoot
  }

  async products(): Promise<readonly StoreProductListing[]> {
    const response = await this.ports.fetch(`${this.apiRoot}/catalog`, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error('Stripe catalog is unavailable.')
    const body = await response.json() as BrowserStripeCatalogResponse
    return Object.freeze(body.products.map((product) => Object.freeze({
      productId: product.productId,
      localizedPrice: product.localizedPrice,
      available: product.available === true,
    })))
  }

  async purchase(productId: StoreProductId): Promise<StorePurchaseResult> {
    const record = this.readRecord()
    const response = await this.ports.fetch(`${this.apiRoot}/checkout`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId, deviceKey: record.deviceKey }),
    })
    if (!response.ok) {
      return Object.freeze({
        accepted: false as const,
        productId,
        code: 'purchase-failed' as const,
      })
    }
    const body = await response.json() as { checkoutUrl?: unknown }
    if (typeof body.checkoutUrl !== 'string') {
      return Object.freeze({
        accepted: false as const,
        productId,
        code: 'purchase-failed' as const,
      })
    }
    this.ports.redirect(body.checkoutUrl)
    return new Promise<StorePurchaseResult>(() => {})
  }

  async restorePurchases(): Promise<StoreRestoreResult> {
    const ownership = await this.refreshOwnership()
    return Object.freeze({
      restoredProductIds: Object.freeze([
        ...(ownership.doubleInfinityPoints
          ? [STORE_PRODUCT_IDS.doubleInfinityPoints]
          : []),
        ...(ownership.developerOptions
          ? [STORE_PRODUCT_IDS.developerOptions]
          : []),
      ]),
    })
  }

  async readOwnership(): Promise<Readonly<HostEntitlementOwnership>> {
    return this.verifyCurrentDevice()
  }

  async refreshOwnership(): Promise<Readonly<HostEntitlementOwnership>> {
    return this.verifyCurrentDevice()
  }

  private async verifyCurrentDevice(): Promise<Readonly<HostEntitlementOwnership>> {
    const record = this.readRecord()
    const currentUrl = new URL(this.ports.currentUrl())
    const sessionId = currentUrl.searchParams.get('stripe_session_id')
    const cancelled = currentUrl.searchParams.get('stripe_checkout') === 'cancelled'
    try {
      const response = await this.ports.fetch(`${this.apiRoot}/verify`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceKey: record.deviceKey,
          tokens: record.tokens,
          ...(sessionId === null ? {} : { sessionId }),
        }),
      })
      if (!response.ok) return this.currentFallbackOwnership()
      const body = await response.json() as BrowserStripeVerifyResponse
      const tokens = normalizeTokens(body.tokens)
      if (sessionId !== null || cancelled) this.clearCheckoutQuery(currentUrl)
      if (tokens === null || !isOwnershipObject(body.ownership)) {
        return this.currentFallbackOwnership()
      }
      const supporterCatGallery =
        this.verifiedSupporterCatGallery ||
        body.ownership.supporterCatGallery === true
      this.verifiedSupporterCatGallery = supporterCatGallery
      this.writeRecord({
        deviceKey: record.deviceKey,
        tokens,
      })
      return Object.freeze({
        doubleInfinityPoints: body.ownership.doubleInfinityPoints === true,
        developerOptions: body.ownership.developerOptions === true,
        supporterCatGallery,
      })
    } catch {
      if (cancelled) this.clearCheckoutQuery(currentUrl)
      return this.currentFallbackOwnership()
    }
  }

  private readRecord(): BrowserStripeRecord {
    try {
      const parsed = JSON.parse(
        this.ports.storage.getItem(STORAGE_KEY) ?? 'null',
      ) as Partial<BrowserStripeRecord> | null
      if (
        parsed !== null &&
        typeof parsed.deviceKey === 'string' &&
        parsed.deviceKey.length >= 32 &&
        Array.isArray(parsed.tokens) &&
        parsed.tokens.every((token) => typeof token === 'string')
      ) {
        return Object.freeze({
          deviceKey: parsed.deviceKey,
          tokens: Object.freeze(parsed.tokens.slice(0, 4)),
        })
      }
    } catch {
      // Replace malformed browser-local state with a fresh device identity.
    }
    const record = Object.freeze({
      deviceKey: randomDeviceKey(this.ports.randomBytes),
      tokens: Object.freeze([]),
    })
    this.writeRecord(record)
    return record
  }

  private writeRecord(record: BrowserStripeRecord): void {
    this.ports.storage.setItem(STORAGE_KEY, JSON.stringify(record))
  }

  private currentFallbackOwnership(): Readonly<HostEntitlementOwnership> {
    if (!this.verifiedSupporterCatGallery) return EMPTY_OWNERSHIP
    return Object.freeze({
      ...EMPTY_OWNERSHIP,
      supporterCatGallery: true,
    })
  }

  private clearCheckoutQuery(url: URL): void {
    url.searchParams.delete('stripe_session_id')
    url.searchParams.delete('stripe_checkout')
    this.ports.replaceUrl(url.toString())
  }
}

function normalizeTokens(value: unknown): readonly string[] | null {
  if (
    !Array.isArray(value) ||
    !value.every((token) => typeof token === 'string')
  ) return null
  return Object.freeze(value.slice(0, 4))
}

function isOwnershipObject(
  value: unknown,
): value is Partial<HostEntitlementOwnership> {
  return value !== null && typeof value === 'object'
}

function browserStripePorts(): BrowserStripePorts {
  return Object.freeze({
    fetch: window.fetch.bind(window),
    storage: window.localStorage,
    currentUrl: () => window.location.href,
    redirect: (url: string) => window.location.assign(url),
    replaceUrl: (url: string) => window.history.replaceState(null, '', url),
    randomBytes: () => crypto.getRandomValues(new Uint8Array(32)),
  })
}

function randomDeviceKey(
  randomBytes: BrowserStripePorts['randomBytes'],
): string {
  const bytes = randomBytes()
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '')
}
