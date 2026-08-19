import { useEffect, useSyncExternalStore } from 'react'
import { useIntl, type MessageDescriptor } from 'react-intl'
import {
  CANONICAL_STORE_PRODUCTS,
  STORE_PRODUCT_IDS,
  type StoreProduct,
  type StoreProductId,
} from '../../../store/contracts'
import {
  StorefrontController,
  type StorefrontFeedback,
  type StorefrontSnapshot,
} from '../../../store/storefront'
import { storeMessages as messages } from './messages'
import './store.css'

export interface StoreSurfaceProps {
  readonly controller: StorefrontController
  readonly localDeveloperOptionsPurchased: boolean
  readonly deviceOnlyPurchases?: boolean
  readonly restoreAvailable?: boolean
}

const TIP_IDS = new Set<StoreProductId>([
  STORE_PRODUCT_IDS.tipTier1,
  STORE_PRODUCT_IDS.tipTier2,
  STORE_PRODUCT_IDS.tipTier3,
])

export function StoreSurface({
  controller,
  localDeveloperOptionsPurchased,
  deviceOnlyPurchases = false,
  restoreAvailable = !deviceOnlyPurchases,
}: StoreSurfaceProps) {
  const intl = useIntl()
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  )
  useEffect(() => {
    void controller.initialize()
  }, [controller])

  const access = controller.effectiveAccess(
    localDeveloperOptionsPurchased,
  )
  const tips = CANONICAL_STORE_PRODUCTS.filter((product) =>
    TIP_IDS.has(product.id),
  )
  const permanent = CANONICAL_STORE_PRODUCTS.filter(
    (product) => product.durability === 'durable',
  )

  return (
    <div className="store-surface">
      <div className="store-surface__content">
        <header className="store-surface__summary">
          <h2>{intl.formatMessage(messages.region)}</h2>
          <p>
            {intl.formatMessage(
              deviceOnlyPurchases
                ? messages.browserIntroduction
                : messages.introduction,
            )}
          </p>
        </header>

        {!snapshot.initialized ? (
          <p className="store-surface__loading" role="status">
            {intl.formatMessage(messages.loading)}
          </p>
        ) : (
          <>
            <StoreSection
              heading={intl.formatMessage(messages.tipsHeading)}
              description={intl.formatMessage(messages.tipsDescription)}
              products={tips}
              snapshot={snapshot}
              access={access}
              controller={controller}
            />
            <StoreSection
              heading={intl.formatMessage(messages.permanentHeading)}
              description={intl.formatMessage(
                deviceOnlyPurchases
                  ? messages.browserPermanentDescription
                  : messages.permanentDescription,
              )}
              products={permanent}
              snapshot={snapshot}
              access={access}
              controller={controller}
            />
            {deviceOnlyPurchases ? (
              <section className="store-restore" aria-labelledby="store-device-heading">
                <div>
                  <h2 id="store-device-heading">
                    {intl.formatMessage(messages.deviceOnlyHeading)}
                  </h2>
                  <p>{intl.formatMessage(messages.deviceOnlyDescription)}</p>
                </div>
              </section>
            ) : null}
            {restoreAvailable ? (
              <section className="store-restore" aria-labelledby="store-restore-heading">
              <div>
                <h2 id="store-restore-heading">
                  {intl.formatMessage(messages.restoreAction)}
                </h2>
                <p>{intl.formatMessage(messages.restoreDescription)}</p>
              </div>
              <button
                type="button"
                className="store-surface__secondary-action"
                disabled={snapshot.operation.kind !== 'idle'}
                onClick={() => void controller.restorePurchases()}
              >
                {intl.formatMessage(
                  snapshot.operation.kind === 'restoring'
                    ? messages.restoring
                    : messages.restoreAction,
                )}
              </button>
              </section>
            ) : null}
          </>
        )}

        <StoreFeedback feedback={snapshot.feedback} />
      </div>
    </div>
  )
}

function StoreSection({
  heading,
  description,
  products,
  snapshot,
  access,
  controller,
}: {
  readonly heading: string
  readonly description: string
  readonly products: readonly StoreProduct[]
  readonly snapshot: StorefrontSnapshot
  readonly access: ReturnType<StorefrontController['effectiveAccess']>
  readonly controller: StorefrontController
}) {
  return (
    <section className="store-product-section">
      <header className="store-product-section__header">
        <h2>{heading}</h2>
        <p>{description}</p>
      </header>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <StoreProductCard
              product={product}
              snapshot={snapshot}
              access={access}
              controller={controller}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

function StoreProductCard({
  product,
  snapshot,
  access,
  controller,
}: {
  readonly product: StoreProduct
  readonly snapshot: StorefrontSnapshot
  readonly access: ReturnType<StorefrontController['effectiveAccess']>
  readonly controller: StorefrontController
}) {
  const intl = useIntl()
  const listing = snapshot.listings.find(
    (candidate) => candidate.productId === product.id,
  )
  const isTip = product.durability === 'consumable'
  const owned = product.id === STORE_PRODUCT_IDS.doubleInfinityPoints
    ? access.doubleInfinityPoints
    : product.id === STORE_PRODUCT_IDS.developerOptions
      ? access.developerOptions
      : false
  const unlockedInGame =
    product.id === STORE_PRODUCT_IDS.developerOptions &&
    access.developerOptionsSource === 'local-in-game-progression'
  const purchasing =
    snapshot.operation.kind === 'purchasing' &&
    snapshot.operation.productId === product.id
  const canPurchase =
    !owned &&
    listing?.available === true &&
    listing.localizedPrice !== null &&
    snapshot.operation.kind === 'idle'

  return (
    <article className="store-product-card">
      <div>
        <h3>{intl.formatMessage(productTitle(product.id))}</h3>
        <p>{intl.formatMessage(productDescription(product.id))}</p>
      </div>
      <button
        type="button"
        className="store-surface__purchase-action"
        disabled={!canPurchase}
        onClick={() => void controller.purchase(product.id)}
      >
        {owned
          ? intl.formatMessage(
              unlockedInGame ? messages.unlockedInGame : messages.owned,
            )
          : purchasing
            ? intl.formatMessage(messages.purchasing)
            : listing?.localizedPrice === null || !listing?.available
              ? intl.formatMessage(messages.unavailable)
              : intl.formatMessage(
                  isTip ? messages.tipAction : messages.purchaseAction,
                  { price: listing.localizedPrice },
                )}
      </button>
    </article>
  )
}

function StoreFeedback({
  feedback,
}: {
  readonly feedback: StorefrontFeedback | null
}) {
  const intl = useIntl()
  if (feedback === null) return null
  let message: string
  if (feedback.kind === 'tip-completed') {
    message = intl.formatMessage(messages.tipCompleted)
  } else if (feedback.kind === 'entitlement-verified') {
    message = intl.formatMessage(messages.entitlementVerified)
  } else if (feedback.kind === 'restore-completed') {
    message = intl.formatMessage(messages.restoreCompleted, {
      count: feedback.restoredCount,
    })
  } else if (feedback.code === 'purchase-cancelled') {
    message = intl.formatMessage(messages.purchaseCancelled)
  } else if (feedback.code === 'purchase-pending') {
    message = intl.formatMessage(messages.purchasePending)
  } else {
    message = intl.formatMessage(messages.operationFailed)
  }
  return (
    <p
      className="store-surface__feedback"
      role={feedback.kind === 'operation-failed' ? 'alert' : 'status'}
    >
      {message}
    </p>
  )
}

function productTitle(productId: StoreProductId): MessageDescriptor {
  switch (productId) {
    case STORE_PRODUCT_IDS.tipTier1: return messages.tipTier1Title
    case STORE_PRODUCT_IDS.tipTier2: return messages.tipTier2Title
    case STORE_PRODUCT_IDS.tipTier3: return messages.tipTier3Title
    case STORE_PRODUCT_IDS.doubleInfinityPoints: return messages.doubleIpTitle
    case STORE_PRODUCT_IDS.developerOptions: return messages.developerOptionsTitle
  }
}

function productDescription(productId: StoreProductId): MessageDescriptor {
  switch (productId) {
    case STORE_PRODUCT_IDS.tipTier1: return messages.tipTier1Description
    case STORE_PRODUCT_IDS.tipTier2: return messages.tipTier2Description
    case STORE_PRODUCT_IDS.tipTier3: return messages.tipTier3Description
    case STORE_PRODUCT_IDS.doubleInfinityPoints: return messages.doubleIpDescription
    case STORE_PRODUCT_IDS.developerOptions: return messages.developerOptionsDescription
  }
}
