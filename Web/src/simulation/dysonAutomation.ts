import { getGameAsset } from '../game-data/catalog'
import type { CanonicalFacilityId } from '../game-state/types'
import {
  buyModeAmount,
  buyXCost,
  maxAffordable,
  tryDebitContinuous,
  type BuyMode,
  type TransactionStatus,
} from './transactions'
import {
  addContinuous,
  floorToDiscrete,
} from './numeric'
import type { SimulationAutomationPolicy } from './types'

export const DYSON_AUTOMATION_TARGETS = [
  'assembly_lines',
  'ai_managers',
  'servers',
  'data_centers',
  'planets',
  'matrioshka_brains',
  'birch_planets',
  'galactic_brains',
] as const satisfies readonly CanonicalFacilityId[]

const AUTOMATION_TARGET_COUNT = DYSON_AUTOMATION_TARGETS.length
const MAX_MEGA_PURCHASE_QUANTITY = 2_147_483_647n
const MAX_SAFE_PURCHASE_QUANTITY = BigInt(Number.MAX_SAFE_INTEGER)

export type MutableOwnedPair = [automatic: number, manual: number]

export interface DysonAutomationState {
  money: number
  facilities: Record<CanonicalFacilityId, MutableOwnedPair>
  targetIndex: number
  globalEnabled: boolean
  enabledFacilities: Record<CanonicalFacilityId, boolean>
  unlockedFacilities: Record<CanonicalFacilityId, boolean>
  buyMode: BuyMode
  roundedBulkBuy: boolean
}

export type DysonAutomationSkipStatus =
  | 'global-disabled'
  | 'facility-disabled'
  | 'locked'

export interface DysonAutomationAttempt {
  readonly facilityId: CanonicalFacilityId
  readonly purchased: boolean
  readonly quantity: bigint
  readonly cost: number
  readonly status: TransactionStatus | DysonAutomationSkipStatus
}

export interface DysonAutomationResult {
  readonly state: DysonAutomationState
  readonly startIndex: number
  readonly nextTargetIndex: number
  readonly attempts: readonly DysonAutomationAttempt[]
}

export type DysonFacilityUnlockResolver = (
  facilityId: CanonicalFacilityId,
  currentState: Readonly<DysonAutomationState>,
) => boolean

export function planDysonAutomationTargets(
  targetIndex: number,
): readonly CanonicalFacilityId[] {
  const start = normalizeTargetIndex(targetIndex)
  return Array.from(
    { length: AUTOMATION_TARGET_COUNT },
    (_, offset) =>
      DYSON_AUTOMATION_TARGETS[
        (start + offset) % AUTOMATION_TARGET_COUNT
      ]!,
  )
}

export function runDysonAutomationTick(
  input: Readonly<DysonAutomationState>,
  policy: SimulationAutomationPolicy = 'preserve-configured-mode',
  resolveUnlock: DysonFacilityUnlockResolver = configuredUnlock,
): DysonAutomationResult {
  const state = cloneState(input)
  const startIndex = normalizeTargetIndex(input.targetIndex)
  const attempts = planDysonAutomationTargets(startIndex).map(
    (facilityId) =>
      attemptFacilityPurchase(state, facilityId, policy, resolveUnlock),
  )
  const nextTargetIndex =
    (startIndex + 1) % AUTOMATION_TARGET_COUNT
  state.targetIndex = nextTargetIndex

  return {
    state,
    startIndex,
    nextTargetIndex,
    attempts,
  }
}

function attemptFacilityPurchase(
  state: DysonAutomationState,
  facilityId: CanonicalFacilityId,
  policy: SimulationAutomationPolicy,
  resolveUnlock: DysonFacilityUnlockResolver,
): DysonAutomationAttempt {
  if (!state.globalEnabled) {
    return skippedAttempt(facilityId, 'global-disabled')
  }
  if (!state.enabledFacilities[facilityId]) {
    return skippedAttempt(facilityId, 'facility-disabled')
  }
  if (!resolveUnlock(facilityId, state)) {
    return skippedAttempt(facilityId, 'locked')
  }

  const definition = getGameAsset(
    'GameData.FacilityDefinition',
    facilityId,
  )
  const baseCost = definition?.data.baseCost
  const exponent = definition?.data.costExponent
  if (
    typeof baseCost !== 'number' ||
    typeof exponent !== 'number' ||
    baseCost <= 0 ||
    exponent <= 0
  ) {
    return failedAttempt(facilityId, 'invalid-cost')
  }

  const owned = state.facilities[facilityId][1]
  const nextCost = buyXCost(1n, baseCost, exponent, owned)
  if (nextCost <= 0 || nextCost > state.money) {
    return {
      ...failedAttempt(
        facilityId,
        nextCost <= 0 ? 'invalid-cost' : 'insufficient-funds',
      ),
      cost: nextCost,
    }
  }

  const maximumQuantity = isMegaFacility(facilityId)
    ? MAX_MEGA_PURCHASE_QUANTITY
    : MAX_SAFE_PURCHASE_QUANTITY
  const affordable = minBigInt(
    maxAffordable(state.money, baseCost, exponent, owned),
    maximumQuantity,
  )
  const mode =
    policy === 'force-buy-max' ? 'buy-max' : state.buyMode
  const selected = minBigInt(
    buyModeAmount(
      mode,
      state.roundedBulkBuy,
      floorToDiscrete(owned),
      affordable,
    ),
    maximumQuantity,
  )
  if (selected <= 0n) {
    return failedAttempt(facilityId, 'invalid-quantity')
  }

  const cost = buyXCost(selected, baseCost, exponent, owned)
  const nextOwned = addContinuous(owned, Number(selected))
  if (nextOwned <= owned) {
    return {
      ...failedAttempt(facilityId, 'output-maxed'),
      cost,
    }
  }

  const debit = tryDebitContinuous(state.money, cost, selected)
  if (debit.status !== 'success') {
    return {
      ...failedAttempt(facilityId, debit.status),
      cost,
    }
  }

  state.money = debit.balance
  state.facilities[facilityId][1] = nextOwned
  return {
    facilityId,
    purchased: true,
    quantity: selected,
    cost: debit.charged,
    status: 'success',
  }
}

function configuredUnlock(
  facilityId: CanonicalFacilityId,
  state: Readonly<DysonAutomationState>,
): boolean {
  return state.unlockedFacilities[facilityId]
}

function normalizeTargetIndex(targetIndex: number): number {
  if (!Number.isFinite(targetIndex)) return 0
  const integer = Math.trunc(targetIndex)
  return (
    (integer % AUTOMATION_TARGET_COUNT) +
    AUTOMATION_TARGET_COUNT
  ) % AUTOMATION_TARGET_COUNT
}

function isMegaFacility(facilityId: CanonicalFacilityId): boolean {
  return (
    facilityId === 'matrioshka_brains' ||
    facilityId === 'birch_planets' ||
    facilityId === 'galactic_brains'
  )
}

function minBigInt(left: bigint, right: bigint): bigint {
  return left < right ? left : right
}

function skippedAttempt(
  facilityId: CanonicalFacilityId,
  status: DysonAutomationSkipStatus,
): DysonAutomationAttempt {
  return {
    facilityId,
    purchased: false,
    quantity: 0n,
    cost: 0,
    status,
  }
}

function failedAttempt(
  facilityId: CanonicalFacilityId,
  status: TransactionStatus,
): DysonAutomationAttempt {
  return {
    facilityId,
    purchased: false,
    quantity: 0n,
    cost: 0,
    status,
  }
}

function cloneState(
  state: Readonly<DysonAutomationState>,
): DysonAutomationState {
  return {
    money: state.money,
    facilities: Object.fromEntries(
      DYSON_AUTOMATION_TARGETS.map((facilityId) => [
        facilityId,
        [...state.facilities[facilityId]],
      ]),
    ) as Record<CanonicalFacilityId, MutableOwnedPair>,
    targetIndex: state.targetIndex,
    globalEnabled: state.globalEnabled,
    enabledFacilities: { ...state.enabledFacilities },
    unlockedFacilities: { ...state.unlockedFacilities },
    buyMode: state.buyMode,
    roundedBulkBuy: state.roundedBulkBuy,
  }
}
