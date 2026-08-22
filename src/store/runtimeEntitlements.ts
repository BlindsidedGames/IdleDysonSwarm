import type { DysonEntitlements } from '../simulation/canonicalDysonDerivation'
import type {
  EntitlementAuthority,
  HostEntitlementOwnership,
} from './contracts'
import {
  DoubleInfinityPointsEffectPreferenceService,
  type DoubleInfinityPointsEffectPreference,
} from './doubleInfinityPointsEffect'

const EMPTY_OWNERSHIP: Readonly<HostEntitlementOwnership> = Object.freeze({
  doubleInfinityPoints: false,
  developerOptions: false,
  supporterCatGallery: false,
})

/**
 * Backend-owned projection between an asynchronous native Store authority and
 * the synchronous canonical application factory. Presentation never writes an
 * ownership value into this bridge.
 */
export class RuntimeEntitlementBridge {
  private ownership: Readonly<HostEntitlementOwnership> = EMPTY_OWNERSHIP
  private readonly authority: EntitlementAuthority
  private readonly doubleInfinityPointsEffect:
    DoubleInfinityPointsEffectPreference

  constructor(
    authority: EntitlementAuthority,
    doubleInfinityPointsEffect: DoubleInfinityPointsEffectPreference =
      new DoubleInfinityPointsEffectPreferenceService({ storage: null }),
  ) {
    this.authority = authority
    this.doubleInfinityPointsEffect = doubleInfinityPointsEffect
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
      permanentDoubleIp:
        this.ownership.doubleInfinityPoints &&
        this.doubleInfinityPointsEffect.getSnapshot(),
    })
  }

  private capture(
    ownership: Readonly<HostEntitlementOwnership>,
  ): Readonly<HostEntitlementOwnership> {
    this.ownership = Object.freeze({
      doubleInfinityPoints:
        ownership.doubleInfinityPoints === true,
      developerOptions: ownership.developerOptions === true,
      supporterCatGallery: ownership.supporterCatGallery === true,
    })
    return this.ownership
  }
}
