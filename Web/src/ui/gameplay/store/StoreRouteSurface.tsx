import type { ReleasePlatformServices } from '../../../platform/releaseFoundation'
import { StorefrontController } from '../../../store/storefront'
import { StoreSurface } from './StoreSurface'

export interface StoreRouteSurfaceProps {
  readonly releasePlatformServices: ReleasePlatformServices
  readonly synchronizeHostEntitlements?: () => Promise<boolean>
  readonly localDeveloperOptionsPurchased: boolean
  readonly deviceOnlyPurchases?: boolean
}

interface CachedStorefront {
  readonly synchronizeHostEntitlements: (() => Promise<boolean>) | undefined
  readonly controller: StorefrontController
}

const storefronts = new WeakMap<ReleasePlatformServices, CachedStorefront>()

function controllerFor(
  releasePlatformServices: ReleasePlatformServices,
  synchronizeHostEntitlements: (() => Promise<boolean>) | undefined,
): StorefrontController {
  const existing = storefronts.get(releasePlatformServices)
  if (
    existing !== undefined &&
    existing.synchronizeHostEntitlements === synchronizeHostEntitlements
  ) {
    return existing.controller
  }
  const controller = new StorefrontController({
    store: releasePlatformServices.store,
    entitlements: releasePlatformServices.entitlements,
    ...(synchronizeHostEntitlements === undefined
      ? {}
      : { onVerifiedOwnershipChanged: synchronizeHostEntitlements }),
  })
  storefronts.set(releasePlatformServices, {
    synchronizeHostEntitlements,
    controller,
  })
  return controller
}

/** Loads Store-only orchestration while preserving its state across route switches. */
export function StoreRouteSurface({
  releasePlatformServices,
  synchronizeHostEntitlements,
  localDeveloperOptionsPurchased,
  deviceOnlyPurchases = false,
}: StoreRouteSurfaceProps) {
  const controller = controllerFor(
    releasePlatformServices,
    synchronizeHostEntitlements,
  )

  return (
    <StoreSurface
      controller={controller}
      localDeveloperOptionsPurchased={localDeveloperOptionsPurchased}
      deviceOnlyPurchases={deviceOnlyPurchases}
    />
  )
}
