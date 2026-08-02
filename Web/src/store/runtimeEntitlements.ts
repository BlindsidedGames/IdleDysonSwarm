import type { DysonEntitlements } from '../simulation/canonicalDysonDerivation'
import type {
  EntitlementAuthority,
  HostEntitlementOwnership,
} from './contracts'

const EMPTY_OWNERSHIP: Readonly<HostEntitlementOwnership> = Object.freeze({
  doubleInfinityPoints: false,
  developerOptions: false,
})

/**
 * Backend-owned projection between an asynchronous native Store authority and
 * the synchronous canonical application factory. Presentation never writes an
 * ownership value into this bridge.
 */
export class RuntimeEntitlementBridge {
  private ownership: Readonly<HostEntitlementOwnership> = EMPTY_OWNERSHIP
  private readonly authority: EntitlementAuthority

  constructor(authority: EntitlementAuthority) {
    this.authority = authority
  }

  async initialize(): Promise<Readonly<HostEntitlementOwnership>> {
    return this.capture(await this.authority.readOwnership())
  }

  async synchronize(): Promise<Readonly<HostEntitlementOwnership>> {
    return this.capture(await this.authority.refreshOwnership())
  }

  currentOwnership(): Readonly<HostEntitlementOwnership> {
    return this.ownership
  }

  currentDysonEntitlements(): Readonly<DysonEntitlements> {
    return Object.freeze({
      permanentDoubleIp: this.ownership.doubleInfinityPoints,
    })
  }

  private capture(
    ownership: Readonly<HostEntitlementOwnership>,
  ): Readonly<HostEntitlementOwnership> {
    this.ownership = Object.freeze({
      doubleInfinityPoints:
        ownership.doubleInfinityPoints === true,
      developerOptions: ownership.developerOptions === true,
    })
    return this.ownership
  }
}
