import type { DysonEntitlements } from '../simulation/canonicalDysonDerivation'

export const PERMANENT_DOUBLE_IP_META_NAME =
  'idle-dyson-swarm-permanent-double-ip'

export interface BrowserEntitlementMetaElement {
  getAttribute(name: string): string | null
}

export interface BrowserEntitlementDocument {
  querySelectorAll(selectors: string): ArrayLike<BrowserEntitlementMetaElement>
}

/**
 * Reads the explicit development-host entitlement declaration.
 *
 * This metadata is a least-privilege configuration seam for the isolated
 * browser profile, not a purchase-authentication mechanism. A future
 * purchase-bearing host must replace it with an authenticated authority.
 */
export function readBrowserHostEntitlements(
  documentPort: BrowserEntitlementDocument = document,
): Readonly<DysonEntitlements> {
  const selector = `meta[name="${PERMANENT_DOUBLE_IP_META_NAME}"]`
  const declarations = documentPort.querySelectorAll(selector)
  if (declarations.length !== 1) {
    throw new Error(
      `Browser host must provide exactly one ${PERMANENT_DOUBLE_IP_META_NAME} declaration.`,
    )
  }
  const configured = declarations[0]?.getAttribute('content')
  if (configured !== 'true' && configured !== 'false') {
    throw new Error(
      `${PERMANENT_DOUBLE_IP_META_NAME} must be exactly "true" or "false".`,
    )
  }
  return Object.freeze({
    permanentDoubleIp: configured === 'true',
  })
}
