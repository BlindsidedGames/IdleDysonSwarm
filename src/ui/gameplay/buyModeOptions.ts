import type { BuyMode } from '../../simulation/transactions'

export type BuyModeMessageKey =
  | 'buyOne'
  | 'buyTen'
  | 'buyFifty'
  | 'buyOneHundred'
  | 'buyMax'

export const BUY_MODE_OPTIONS = Object.freeze([
  ['buy-1', 'buyOne'],
  ['buy-10', 'buyTen'],
  ['buy-50', 'buyFifty'],
  ['buy-100', 'buyOneHundred'],
  ['buy-max', 'buyMax'],
] as const satisfies readonly (readonly [BuyMode, BuyModeMessageKey])[])
