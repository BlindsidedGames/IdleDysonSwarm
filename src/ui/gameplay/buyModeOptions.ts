import {
  BUY_MODES,
  type BuyMode,
} from '../../simulation/transactions'

export type BuyModeMessageKey =
  | 'buyOne'
  | 'buyTen'
  | 'buyFifty'
  | 'buyOneHundred'
  | 'buyMax'

const BUY_MODE_MESSAGE_KEYS: Readonly<
  Record<BuyMode, BuyModeMessageKey>
> = Object.freeze({
  'buy-1': 'buyOne',
  'buy-10': 'buyTen',
  'buy-50': 'buyFifty',
  'buy-100': 'buyOneHundred',
  'buy-max': 'buyMax',
})

export const BUY_MODE_OPTIONS = Object.freeze(
  BUY_MODES.map(
    (mode) => [mode, BUY_MODE_MESSAGE_KEYS[mode]] as const,
  ),
)
