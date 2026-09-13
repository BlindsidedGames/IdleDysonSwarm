import type { BuyMode } from '../../../simulation/transactions'

export type QuantumPurchaseQuantity = 1 | 10 | 50 | 100 | 'max'

export const QUANTUM_PURCHASE_QUANTITIES: readonly QuantumPurchaseQuantity[] =
  [1, 10, 50, 100, 'max']

export function quantumQuantityFromBuyMode(mode: BuyMode = 'buy-1'): QuantumPurchaseQuantity {
  switch (mode) {
    case 'buy-10': return 10
    case 'buy-50': return 50
    case 'buy-100': return 100
    case 'buy-max': return 'max'
    default: return 1
  }
}

export function quantumQuantityBuyMode(quantity: QuantumPurchaseQuantity): BuyMode {
  return `buy-${quantity}`
}
