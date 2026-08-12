import {
  registerInfinityRewardAuthorityV2ForApplication,
  type InfinityRewardAuthorityV2,
} from '../simulation/infinityEconomyV2'

export interface LocalInfinityEntitlementsV2 {
  readonly doubleInfinityPoints: boolean
}

/**
 * Application-owned bridge from receiver-local entitlement state into the
 * dormant Infinity runtime. This value is never portable or schema-13 data.
 */
export function issueInfinityRewardAuthorityV2ForApplication(
  entitlements: Readonly<LocalInfinityEntitlementsV2>,
): Readonly<InfinityRewardAuthorityV2> {
  if (
    typeof entitlements !== 'object' ||
    entitlements === null ||
    Object.getPrototypeOf(entitlements) !== Object.prototype
  ) {
    throw new TypeError('Local Infinity entitlements must be a plain object.')
  }
  const descriptors = Object.getOwnPropertyDescriptors(entitlements)
  const keys = Reflect.ownKeys(descriptors)
  const descriptor = descriptors.doubleInfinityPoints
  if (
    keys.length !== 1 ||
    keys[0] !== 'doubleInfinityPoints' ||
    descriptor === undefined ||
    !('value' in descriptor) ||
    typeof descriptor.value !== 'boolean'
  ) {
    throw new TypeError('Local Infinity entitlements must contain one boolean data field.')
  }
  return registerInfinityRewardAuthorityV2ForApplication(descriptor.value)
}
