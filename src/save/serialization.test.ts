import { describe, expect, test } from 'vitest'
import { deserializeWebSave, serializeWebSave } from './serialization'

describe('canonical web save serialization', () => {
  test('round-trips bigint and byte arrays without precision loss', () => {
    const save = {
      saveVersion: 12,
      infinityPoints: 9_223_372_036_854_775_807n,
      bits: Uint8Array.from([0, 127, 255]),
    }
    const encoded = serializeWebSave(save)
    expect(encoded).toMatch(/^IDSWEB1:/)
    const decoded = deserializeWebSave(encoded)

    expect(decoded.infinityPoints).toBe(9_223_372_036_854_775_807n)
    expect(decoded.bits).toEqual(Uint8Array.from([0, 127, 255]))
    expect(serializeWebSave(decoded)).toBe(encoded)
  })
})
