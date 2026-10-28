import type { BuyMode } from '../../../simulation/transactions'

export type SimulationPurchaseQuantity = 1 | 10 | 50 | 100 | 'max'

const QUANTITY_BY_MODE = {
  'buy-1': 1,
  'buy-10': 10,
  'buy-50': 50,
  'buy-100': 100,
  'buy-max': 'max',
} as const satisfies Record<BuyMode, SimulationPurchaseQuantity>

export function simulationPurchaseQuantity(mode: BuyMode): SimulationPurchaseQuantity {
  return QUANTITY_BY_MODE[mode]
}

export function simulationBuyMode(quantity: SimulationPurchaseQuantity): BuyMode {
  return `buy-${quantity}`
}
