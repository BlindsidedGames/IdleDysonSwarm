import { getGameAsset } from '../game-data/catalog'
import {
  addContinuous,
  bitDecrement,
  CONTINUOUS_MAXIMUM,
  DISCRETE_MAXIMUM,
  divideContinuous,
  floorToDiscrete,
  multiplyContinuous,
  powerContinuous,
} from './numeric'
import type {
  BasicDysonState,
} from './dysonModel'
import type { BasicDysonFacilityId } from './dysonFacilities'
import type { SimulationAutomationPolicy } from './types'

export type BuyMode = 'buy-1' | 'buy-10' | 'buy-50' | 'buy-100' | 'buy-max'

export type TransactionStatus =
  | 'success'
  | 'insufficient-funds'
  | 'invalid-balance'
  | 'invalid-cost'
  | 'invalid-quantity'
  | 'output-maxed'
  | 'maxed'

export interface DebitResult {
  readonly balance: number
  readonly charged: number
  readonly status: TransactionStatus
}

export interface FacilityPurchaseResult {
  readonly purchased: boolean
  readonly quantity: bigint
  readonly cost: number
  readonly status: TransactionStatus
}

export function tryDebitContinuous(
  balance: number,
  cost: number,
  quantity = 1n,
): DebitResult {
  if (!Number.isFinite(balance) || balance < 0) {
    return { balance, charged: 0, status: 'invalid-balance' }
  }
  if (quantity <= 0n) {
    return { balance, charged: 0, status: 'invalid-quantity' }
  }
  if (!Number.isFinite(cost) || cost < 0) {
    return { balance, charged: 0, status: 'invalid-cost' }
  }
  if (cost === CONTINUOUS_MAXIMUM) {
    return { balance, charged: 0, status: 'maxed' }
  }
  if (cost === 0) {
    return { balance, charged: 0, status: 'invalid-cost' }
  }
  if (cost > balance) {
    return { balance, charged: 0, status: 'insufficient-funds' }
  }

  let next = balance - cost
  let charged = cost
  if (next === balance) {
    next = bitDecrement(balance)
    if (next < 0 || !Number.isFinite(next)) next = 0
    charged = balance - next
  }
  if (!Number.isFinite(next) || next < 0 || charged <= 0) {
    return { balance, charged: 0, status: 'invalid-cost' }
  }
  return { balance: next, charged, status: 'success' }
}

export function buyXCost(
  quantity: bigint,
  baseCost: number,
  exponent: number,
  currentLevel: number,
): number {
  if (
    quantity <= 0n ||
    quantity > BigInt(Number.MAX_SAFE_INTEGER) ||
    !Number.isFinite(baseCost) ||
    baseCost <= 0 ||
    !Number.isFinite(exponent) ||
    exponent < 1 ||
    !Number.isFinite(currentLevel) ||
    currentLevel < 0
  ) {
    return quantity > BigInt(Number.MAX_SAFE_INTEGER)
      ? CONTINUOUS_MAXIMUM
      : 0
  }
  const count = Number(quantity)
  const firstCost = multiplyContinuous(
    baseCost,
    powerContinuous(exponent, currentLevel),
  )
  if (firstCost === CONTINUOUS_MAXIMUM) return CONTINUOUS_MAXIMUM
  if (Math.abs(exponent - 1) <= 1e-12) {
    return multiplyContinuous(firstCost, count)
  }
  const powered = powerContinuous(exponent, count)
  if (powered === CONTINUOUS_MAXIMUM) return CONTINUOUS_MAXIMUM
  const series = divideContinuous(powered - 1, exponent - 1)
  return multiplyContinuous(firstCost, series)
}

export function maxAffordable(
  currency: number,
  baseCost: number,
  exponent: number,
  currentLevel: number,
): bigint {
  if (
    !Number.isFinite(currency) ||
    currency <= 0 ||
    !Number.isFinite(baseCost) ||
    baseCost <= 0 ||
    !Number.isFinite(exponent) ||
    exponent < 1 ||
    !Number.isFinite(currentLevel) ||
    currentLevel < 0
  ) {
    return 0n
  }
  if (Math.abs(exponent - 1) <= 1e-12) {
    return floorToDiscrete(currency / baseCost)
  }

  const logExponent = Math.log(exponent)
  const logRatio =
    Math.log(currency) +
    Math.log(exponent - 1) -
    Math.log(baseCost) -
    currentLevel * logExponent
  if (Number.isNaN(logRatio)) return 0n
  const logOnePlusRatio =
    logRatio > 700 ? logRatio : Math.log(1 + Math.exp(logRatio))
  let quantity = floorToDiscrete(
    Math.floor(logOnePlusRatio / logExponent),
  )

  for (
    let correction = 0;
    correction < 16 &&
    quantity > 0n &&
    buyXCost(quantity, baseCost, exponent, currentLevel) > currency;
    correction += 1
  ) {
    quantity -= 1n
  }
  for (
    let correction = 0;
    correction < 16 && quantity < DISCRETE_MAXIMUM;
    correction += 1
  ) {
    const next = quantity + 1n
    const nextCost = buyXCost(next, baseCost, exponent, currentLevel)
    if (
      nextCost <= 0 ||
      nextCost > currency ||
      nextCost === CONTINUOUS_MAXIMUM
    ) {
      break
    }
    quantity = next
  }
  return quantity
}

export function buyModeAmount(
  mode: BuyMode,
  rounded: boolean,
  currentOwned: bigint,
  affordable: bigint,
): bigint {
  const target =
    mode === 'buy-10'
      ? 10n
      : mode === 'buy-50'
        ? 50n
        : mode === 'buy-100'
          ? 100n
          : 1n
  if (mode === 'buy-max') return affordable > 0n ? affordable : 1n
  if (mode === 'buy-1' || !rounded) return target
  return target - (currentOwned % target)
}

export function tryPurchaseBasicFacility(
  state: BasicDysonState,
  facilityId: BasicDysonFacilityId,
  policy: SimulationAutomationPolicy,
): FacilityPurchaseResult {
  const definition = getGameAsset('GameData.FacilityDefinition', facilityId)
  const baseCost = definition?.data.baseCost
  const exponent = definition?.data.costExponent
  if (
    typeof baseCost !== 'number' ||
    typeof exponent !== 'number' ||
    baseCost <= 0 ||
    exponent <= 0
  ) {
    return {
      purchased: false,
      quantity: 0n,
      cost: 0,
      status: 'invalid-cost',
    }
  }

  const owned = state.facilities[facilityId][1]
  const nextCost = buyXCost(1n, baseCost, exponent, owned)
  if (nextCost <= 0 || nextCost > state.money) {
    return {
      purchased: false,
      quantity: 0n,
      cost: nextCost,
      status:
        nextCost <= 0 ? 'invalid-cost' : 'insufficient-funds',
    }
  }
  const affordable = maxAffordable(state.money, baseCost, exponent, owned)
  const mode =
    policy === 'force-buy-max' ? 'buy-max' : state.automation.buyMode
  const selected = buyModeAmount(
    mode,
    state.automation.roundedBulkBuy,
    floorToDiscrete(owned),
    affordable,
  )
  if (selected <= 0n) {
    return {
      purchased: false,
      quantity: 0n,
      cost: 0,
      status: 'invalid-quantity',
    }
  }

  const cost = buyXCost(selected, baseCost, exponent, owned)
  const nextOwned = addContinuous(owned, Number(selected))
  if (nextOwned <= owned) {
    return {
      purchased: false,
      quantity: 0n,
      cost,
      status: 'output-maxed',
    }
  }
  const debit = tryDebitContinuous(state.money, cost, selected)
  if (debit.status !== 'success') {
    return {
      purchased: false,
      quantity: 0n,
      cost,
      status: debit.status,
    }
  }

  state.money = debit.balance
  state.facilities[facilityId][1] = nextOwned
  return {
    purchased: true,
    quantity: selected,
    cost: debit.charged,
    status: 'success',
  }
}
