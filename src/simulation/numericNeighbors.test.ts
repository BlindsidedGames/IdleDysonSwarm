import { expect, test } from 'vitest'
import { bitDecrement, bitIncrement } from './numeric'
import {
  referenceBitDecrement,
  referenceBitIncrement,
} from '../../scripts/support/allocationOptimizationReference'

test('shared numeric scratch space preserves neighboring floats across edges and interleaved calls', () => {
  const values = [
    NaN, Infinity, -Infinity, 0, -0, Number.MIN_VALUE, -Number.MIN_VALUE,
    Number.MAX_VALUE, -Number.MAX_VALUE, Number.MIN_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER, 1, -1, 0.1, -0.1,
  ]
  const sample = new DataView(new ArrayBuffer(8))
  let bits = 0x123456789abcdefn
  for (let index = 0; index < 1_000; index += 1) {
    bits = BigInt.asUintN(64, bits * 6364136223846793005n + 1442695040888963407n)
    sample.setBigUint64(0, bits)
    values.push(sample.getFloat64(0))
  }
  for (const value of values) {
    expect(Object.is(bitDecrement(value), referenceBitDecrement(value))).toBe(true)
    expect(Object.is(bitIncrement(value), referenceBitIncrement(value))).toBe(true)
    expect(Object.is(bitDecrement(value), referenceBitDecrement(value))).toBe(true)
  }
})
