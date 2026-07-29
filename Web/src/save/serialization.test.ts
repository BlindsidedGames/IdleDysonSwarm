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
    const decoded = deserializeWebSave(encoded)

    expect(decoded.infinityPoints).toBe(9_223_372_036_854_775_807n)
    expect(decoded.bits).toEqual(Uint8Array.from([0, 127, 255]))
    expect(serializeWebSave(decoded)).toBe(encoded)
  })

  test('rejects cyclic graphs instead of producing ambiguous persistence', () => {
    const save: Record<string, unknown> = { saveVersion: 12 }
    save.self = save
    expect(() => serializeWebSave(save)).toThrow('reference cycles')
  })

  test('rejects mismatched envelope and state schemas', () => {
    const encoded = serializeWebSave({ saveVersion: 12 })
    const mismatched = encoded.replace('"schema": 12', '"schema": 11')
    expect(() => deserializeWebSave(mismatched)).toThrow(
      'does not match state schema',
    )
  })

  test('rejects a 1.1 MiB byte field before base64 byte allocation', () => {
    const encoded = serializeWebSave({
      saveVersion: 12,
      bytes: new Uint8Array(1_100_000),
    })

    expect(Buffer.byteLength(encoded, 'utf8')).toBeLessThan(
      2 * 1024 * 1024,
    )
    expect(() => deserializeWebSave(encoded)).toThrow(
      'decoded-payload',
    )
  })

  test('enforces the decoded-byte budget cumulatively across fields', () => {
    const encoded = serializeWebSave({
      saveVersion: 12,
      first: new Uint8Array(600_000),
      second: new Uint8Array(600_000),
    })

    expect(Buffer.byteLength(encoded, 'utf8')).toBeLessThan(
      2 * 1024 * 1024,
    )
    expect(() => deserializeWebSave(encoded)).toThrow(
      'decoded-payload',
    )
  })

  test('bounds nested container reconstruction', () => {
    let nested: unknown = 'leaf'
    for (let depth = 0; depth < 130; depth += 1) {
      nested = [nested]
    }
    const encoded = serializeWebSave({
      saveVersion: 12,
      nested,
    })

    expect(() => deserializeWebSave(encoded)).toThrow(
      'maximum decode depth',
    )
  })
})
