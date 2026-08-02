import { gzipSync } from 'fflate'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  deserializeWebSave,
  serializeSharedWebSave,
  serializeWebSave,
} from './serialization'

describe('canonical web save serialization', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

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

  test('rejects cyclic graphs instead of producing ambiguous persistence', () => {
    const save: Record<string, unknown> = { saveVersion: 12 }
    save.self = save
    expect(() => serializeWebSave(save)).toThrow('reference cycles')
  })

  test('rejects mismatched envelope and state schemas', () => {
    const mismatched = JSON.stringify({
      format: 'IDSWEB1',
      schema: 11,
      state: { saveVersion: 12 },
    })
    expect(() => deserializeWebSave(mismatched)).toThrow(
      'does not match state schema',
    )
  })

  test('produces stable text regardless of the current wall clock', () => {
    const save = { saveVersion: 12, cash: 42 }
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const first = serializeWebSave(save)
    vi.setSystemTime(new Date('2026-08-02T00:00:00Z'))

    expect(serializeWebSave(save)).toBe(first)
  })

  test('rejects compressed payloads that are not valid UTF-8 JSON', () => {
    const payload = Buffer.from(gzipSync(Uint8Array.from([0xff, 0xfe])))
      .toString('base64')

    expect(() => deserializeWebSave(`IDSWEB1:${payload}`)).toThrow(
      'invalid UTF-8',
    )
  })

  test('continues to read transitional uncompressed web envelopes', () => {
    const transitional = JSON.stringify({
      format: 'IDSWEB1',
      schema: 12,
      state: {
        saveVersion: 12,
        infinityPoints: { $bigint: '12345678901234567890' },
      },
    })

    expect(deserializeWebSave(transitional)).toEqual({
      saveVersion: 12,
      infinityPoints: 12_345_678_901_234_567_890n,
    })
  })

  test('keeps repetitive canonical exports compact', () => {
    const encoded = serializeWebSave({
      saveVersion: 12,
      repeated: Array.from({ length: 2_000 }, () => ({
        enabled: false,
        level: 0,
        progress: 0,
      })),
    })

    expect(encoded.length).toBeLessThan(1_000)
  })

  test('shared exports exclude device-owned Double IP and Developer Options', () => {
    const decoded = deserializeWebSave(
      serializeSharedWebSave({
        saveVersion: 12,
        doubleIp: true,
        debugOptions: true,
        debugEverEnabled: true,
        dysonVerseSaveData: {
          dysonVersePrestigeData: { doubleIP: true },
        },
      }),
    )

    expect(decoded).toMatchObject({
      doubleIp: false,
      debugOptions: false,
      debugEverEnabled: false,
      hasPackedSettingsFlags: true,
      dysonVerseSaveData: {
        dysonVersePrestigeData: { doubleIP: true },
      },
    })
    expect((decoded.packedSettingsFlags as bigint) & 0b1100n).toBe(0n)
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
