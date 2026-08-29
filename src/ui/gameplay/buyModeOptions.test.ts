import { describe, expect, test } from 'vitest'
import { BUY_MODE_OPTIONS } from './buyModeOptions'

describe('gameplay buy mode options', () => {
  test('preserves the canonical route order and message keys', () => {
    expect(BUY_MODE_OPTIONS).toEqual([
      ['buy-1', 'buyOne'],
      ['buy-10', 'buyTen'],
      ['buy-50', 'buyFifty'],
      ['buy-100', 'buyOneHundred'],
      ['buy-max', 'buyMax'],
    ])
    expect(Object.isFrozen(BUY_MODE_OPTIONS)).toBe(true)
  })
})
