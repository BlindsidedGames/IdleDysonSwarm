import { getGameAsset } from '../game-data/catalog'
import type {
  CanonicalFacilityId,
  CanonicalOwnedPair,
} from '../game-state/types'
import {
  addContinuous,
  CONTINUOUS_MAXIMUM,
  floorToDiscrete,
} from './numeric'
import {
  buyModeAmount,
  buyXCost,
  maxAffordable,
  tryDebitContinuous,
  type BuyMode,
  type TransactionStatus,
} from './transactions'

export const MEGA_STRUCTURE_IDS = [
  'matrioshka_brains',
  'birch_planets',
  'galactic_brains',
] as const

export type MegaStructureId = (typeof MEGA_STRUCTURE_IDS)[number]

export interface MegaStructurePurchaseState {
  readonly money: number
  readonly facilities: Readonly<
    Record<CanonicalFacilityId, CanonicalOwnedPair>
  >
  readonly quantumUnlocks: {
    readonly matrioshkaBrains: boolean
    readonly birchPlanets: boolean
    readonly galacticBrains: boolean
  }
  readonly buyMode: BuyMode
  readonly roundedBulkBuy: boolean
}

export type MegaStructureVisibilityState = Pick<
  MegaStructurePurchaseState,
  'facilities' | 'quantumUnlocks'
>

export type MegaStructurePurchaseStatus =
  | TransactionStatus
  | 'invalid-state'
  | 'invalid-definition'
  | 'locked'
  | 'prerequisite-not-met'

export interface MegaStructurePurchaseResult {
  readonly purchased: boolean
  readonly quantity: bigint
  readonly cost: number
  readonly status: MegaStructurePurchaseStatus
  readonly state: MegaStructurePurchaseState
}

interface MegaStructureRule {
  readonly quantumGate: keyof MegaStructurePurchaseState['quantumUnlocks']
  readonly prerequisiteFacilityId: CanonicalFacilityId
  readonly prerequisiteOwned: number
}

/**
 * Calculates the authored cash-only geometric purchase cost. Dormant
 * facility-cost metadata is intentionally not part of this contract.
 */
export function megaStructureCashCost(
  facilityId: MegaStructureId,
  quantity: bigint,
  manualOwned: number,
): number {
  const definition = getGameAsset(
    'GameData.FacilityDefinition',
    facilityId,
  )
  const baseCost = definition?.data.baseCost
  const costExponent = definition?.data.costExponent
  if (
    typeof baseCost !== 'number' ||
    !Number.isFinite(baseCost) ||
    baseCost <= 0 ||
    typeof costExponent !== 'number' ||
    !Number.isFinite(costExponent) ||
    costExponent < 1
  ) {
    return 0
  }
  return buyXCost(quantity, baseCost, costExponent, manualOwned)
}

/**
 * Matches Unity's mega-structure panel reveal rule: existing ownership remains
 * visible, otherwise the authored Quantum gate and prerequisite must be met.
 */
export function isMegaStructureVisible(
  state: Readonly<MegaStructureVisibilityState>,
  facilityId: MegaStructureId,
): boolean {
  const target = state.facilities[facilityId]
  if (target[0] + target[1] > 0) return true

  const rule = readMegaStructureRule(facilityId)
  if (
    rule === undefined ||
    !state.quantumUnlocks[rule.quantumGate]
  ) {
    return false
  }
  const prerequisite =
    state.facilities[rule.prerequisiteFacilityId]
  return (
    prerequisite[0] + prerequisite[1] >=
    rule.prerequisiteOwned
  )
}

/**
 * Applies one mega-structure purchase command without mutating the caller.
 * Unlock and prerequisite checks occur at the command boundary before debit.
 */
export function tryPurchaseMegaStructure(
  state: Readonly<MegaStructurePurchaseState>,
  facilityId: MegaStructureId,
): MegaStructurePurchaseResult {
  if (!isValidState(state)) {
    return failure(state, 'invalid-state')
  }
  const definition = getGameAsset(
    'GameData.FacilityDefinition',
    facilityId,
  )
  const baseCost = definition?.data.baseCost
  const costExponent = definition?.data.costExponent
  const rule = readMegaStructureRule(facilityId)
  if (
    typeof baseCost !== 'number' ||
    !Number.isFinite(baseCost) ||
    baseCost <= 0 ||
    typeof costExponent !== 'number' ||
    !Number.isFinite(costExponent) ||
    costExponent < 1 ||
    rule === undefined
  ) {
    return failure(state, 'invalid-definition')
  }
  if (!state.quantumUnlocks[rule.quantumGate]) {
    return failure(state, 'locked')
  }
  const prerequisite = state.facilities[rule.prerequisiteFacilityId]
  if (
    prerequisite[0] + prerequisite[1] <
    rule.prerequisiteOwned
  ) {
    return failure(state, 'prerequisite-not-met')
  }

  const target = state.facilities[facilityId]
  const manualOwned = target[1]
  const nextCost = buyXCost(
    1n,
    baseCost,
    costExponent,
    manualOwned,
  )
  if (nextCost <= 0) return failure(state, 'invalid-cost', nextCost)
  if (nextCost === CONTINUOUS_MAXIMUM) {
    return failure(state, 'maxed', nextCost)
  }
  if (nextCost > state.money) {
    return failure(state, 'insufficient-funds', nextCost)
  }

  const affordable = maxAffordable(
    state.money,
    baseCost,
    costExponent,
    manualOwned,
  )
  const quantity = buyModeAmount(
    state.buyMode,
    state.roundedBulkBuy,
    floorToDiscrete(manualOwned),
    affordable,
  )
  if (quantity <= 0n) {
    return failure(state, 'invalid-quantity')
  }

  const cost = buyXCost(
    quantity,
    baseCost,
    costExponent,
    manualOwned,
  )
  const nextManual = addContinuous(manualOwned, Number(quantity))
  if (nextManual <= manualOwned) {
    return failure(state, 'output-maxed', cost)
  }
  const debit = tryDebitContinuous(state.money, cost, quantity)
  if (debit.status !== 'success') {
    return failure(state, debit.status, cost)
  }

  const facilities = {
    ...state.facilities,
    [facilityId]: [target[0], nextManual] as const,
  }
  return {
    purchased: true,
    quantity,
    cost,
    status: 'success',
    state: {
      ...state,
      money: debit.balance,
      facilities,
    },
  }
}

function readMegaStructureRule(
  facilityId: MegaStructureId,
): MegaStructureRule | undefined {
  const profile = getGameAsset(
    'IdleDysonSwarm.Data.Balance.FacilityBalanceProfile',
    'FacilityBalanceProfile',
  )
  const entries = profile?.data.entries
  if (!Array.isArray(entries)) return undefined
  const entry = entries.find(
    (candidate) =>
      isRecord(candidate) && candidate.facilityId === facilityId,
  )
  if (!isRecord(entry)) return undefined

  const expected = EXPECTED_RULES[facilityId]
  const prerequisite = entry.prerequisiteFacilityId
  const prerequisiteId =
    isRecord(prerequisite) && typeof prerequisite.id === 'string'
      ? prerequisite.id
      : prerequisite
  if (
    entry.group !== 2 ||
    entry.quantumGate !== expected.quantumGateValue ||
    prerequisiteId !== expected.prerequisiteFacilityId ||
    entry.prerequisiteOwned !== 1
  ) {
    return undefined
  }
  return {
    quantumGate: expected.quantumGate,
    prerequisiteFacilityId: expected.prerequisiteFacilityId,
    prerequisiteOwned: 1,
  }
}

const EXPECTED_RULES = {
  matrioshka_brains: {
    quantumGate: 'matrioshkaBrains',
    quantumGateValue: 1,
    prerequisiteFacilityId: 'planets',
  },
  birch_planets: {
    quantumGate: 'birchPlanets',
    quantumGateValue: 2,
    prerequisiteFacilityId: 'matrioshka_brains',
  },
  galactic_brains: {
    quantumGate: 'galacticBrains',
    quantumGateValue: 3,
    prerequisiteFacilityId: 'birch_planets',
  },
} as const satisfies Record<
  MegaStructureId,
  {
    readonly quantumGate: keyof MegaStructurePurchaseState['quantumUnlocks']
    readonly quantumGateValue: number
    readonly prerequisiteFacilityId: CanonicalFacilityId
  }
>

function isValidState(
  state: Readonly<MegaStructurePurchaseState>,
): boolean {
  if (!Number.isFinite(state.money) || state.money < 0) return false
  if (
    !['buy-1', 'buy-10', 'buy-50', 'buy-100', 'buy-max'].includes(
      state.buyMode,
    ) ||
    typeof state.roundedBulkBuy !== 'boolean'
  ) {
    return false
  }
  if (
    typeof state.quantumUnlocks.matrioshkaBrains !== 'boolean' ||
    typeof state.quantumUnlocks.birchPlanets !== 'boolean' ||
    typeof state.quantumUnlocks.galacticBrains !== 'boolean'
  ) {
    return false
  }
  return Object.values(state.facilities).every(
    (pair) =>
      Array.isArray(pair) &&
      pair.length === 2 &&
      pair.every(
        (value) => Number.isFinite(value) && value >= 0,
      ),
  )
}

function failure(
  state: Readonly<MegaStructurePurchaseState>,
  status: MegaStructurePurchaseStatus,
  cost = 0,
): MegaStructurePurchaseResult {
  return {
    purchased: false,
    quantity: 0n,
    cost,
    status,
    state,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
