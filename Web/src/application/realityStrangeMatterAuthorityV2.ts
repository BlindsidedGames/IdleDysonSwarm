import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import { validateCanonicalGameStateV2 } from '../game-state/validateV2'
import {
  registerRealityStrangeMatterAccountV2ForOwner,
  type RealityStrangeMatterAccountV2,
} from '../simulation/realityV2'

export interface RealityStrangeMatterAccountIdentityV2 {
  readonly accountId: string
  readonly revision: number
}

/**
 * Dormant Stage 6 ownership boundary. Balance is descriptor-validated from the
 * canonical Dream account and can never be supplied independently by Reality.
 */
export function issueRealityStrangeMatterAccountV2ForApplication(
  state: Readonly<CanonicalGameStateV2>,
  identity: Readonly<RealityStrangeMatterAccountIdentityV2>,
): Readonly<RealityStrangeMatterAccountV2> {
  const validation = validateCanonicalGameStateV2(state)
  if (!validation.valid) {
    throw new TypeError(`Cannot issue a Strange Matter account from invalid V2 state: ${validation.errors[0] ?? 'unknown error'}`)
  }
  if (
    identity === null ||
    typeof identity !== 'object' ||
    Array.isArray(identity) ||
    Object.getPrototypeOf(identity) !== Object.prototype
  ) {
    throw new TypeError('Reality Strange Matter account identity must be a closed object.')
  }
  const descriptors = Object.getOwnPropertyDescriptors(identity)
  const keys = Reflect.ownKeys(descriptors)
  const accountId = descriptors.accountId
  const revision = descriptors.revision
  if (
    keys.length !== 2 ||
    keys.some((key) => key !== 'accountId' && key !== 'revision') ||
    accountId === undefined ||
    !('value' in accountId) ||
    typeof accountId.value !== 'string' ||
    revision === undefined ||
    !('value' in revision) ||
    typeof revision.value !== 'number'
  ) {
    throw new TypeError('Reality Strange Matter account identity must contain exact data fields.')
  }
  return registerRealityStrangeMatterAccountV2ForOwner(
    accountId.value,
    revision.value,
    state.dream.strangeMatter,
  )
}
