import { describe, expect, it } from 'vitest'
import {
  UNITY_INT_MAXIMUM,
  UNITY_INT_MAXIMUM_BIGINT,
} from './unityNumericLimits'

describe('Unity numeric limits', () => {
  it('keeps number and bigint Int32 ceilings equivalent', () => {
    expect(UNITY_INT_MAXIMUM).toBe(2_147_483_647)
    expect(UNITY_INT_MAXIMUM_BIGINT).toBe(2_147_483_647n)
    expect(UNITY_INT_MAXIMUM_BIGINT).toBe(BigInt(UNITY_INT_MAXIMUM))
  })
})
