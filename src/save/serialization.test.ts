import { gzipSync } from 'fflate'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  decodeWebSaveTextBounded,
  deserializeWebSave,
  serializeSharedWebSave,
  serializeWebSave,
} from './serialization'
import type { SaveRecord } from './graph'
import {
  TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD,
  TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD,
} from './transitionalV2Retirement'

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

  test('rejects a canonical IDSWEB1 payload with a corrupted gzip checksum', () => {
    const encoded = serializeWebSave({ saveVersion: 12, cash: 42 })
    const compressed = Buffer.from(
      encoded.slice('IDSWEB1:'.length),
      'base64',
    )
    compressed[compressed.length - 8] = compressed[compressed.length - 8]! ^ 1

    expect(() => deserializeWebSave(
      `IDSWEB1:${compressed.toString('base64')}`,
    )).toThrow(/gzip checksum does not match/u)
  })

  test('excludes device-local presentation preferences from portable saves', () => {
    const exported = serializeSharedWebSave({
      saveVersion: 12,
      numberFormatting: 2,
      hidePurchased: true,
      bottomNavigationPreferences: {
        version: 1,
        size: 'large',
        visibility: { settings: false },
      },
      bots: 42,
      [TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD]: 7,
      [TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD]: 'a'.repeat(64),
    })
    const decoded = deserializeWebSave(exported)
    expect(decoded).not.toHaveProperty('numberFormatting')
    expect(decoded).not.toHaveProperty('hidePurchased')
    expect(decoded).not.toHaveProperty('bottomNavigationPreferences.size')
    expect(decoded).not.toHaveProperty(
      TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD,
    )
    expect(decoded).not.toHaveProperty(
      TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD,
    )
    expect(decoded).toHaveProperty(
      'bottomNavigationPreferences.visibility.settings',
      false,
    )
    expect(decoded).toMatchObject({
      saveVersion: 12,
      bots: 42,
      doubleIp: false,
      debugOptions: false,
      debugEverEnabled: false,
    })
  })

  test('rejects cyclic graphs instead of producing ambiguous persistence', () => {
    const save: Record<string, unknown> = { saveVersion: 12 }
    save.self = save
    expect(() => serializeWebSave(save)).toThrow('reference cycles')
  })

  test.each([
    ['undefined', undefined],
    ['function', () => undefined],
    ['symbol', Symbol('unsupported')],
    ['date', new Date('2026-08-19T00:00:00Z')],
    ['non-finite number', Number.POSITIVE_INFINITY],
    ['negative zero', -0],
  ])('rejects lossy %s values instead of changing durable state', (_label, value) => {
    expect(() => serializeWebSave({ saveVersion: 12, value })).toThrow(
      'Canonical web saves',
    )
  })

  test('rejects sparse arrays and symbol-keyed properties', () => {
    const sparse = Array(1)
    expect(() => serializeWebSave({ saveVersion: 12, sparse })).toThrow(
      'undefined',
    )

    const symbolKeyed = { saveVersion: 12 } as Record<PropertyKey, unknown>
    symbolKeyed[Symbol('hidden')] = 'not serialized by JSON'
    expect(() => serializeWebSave(symbolKeyed as SaveRecord)).toThrow(
      'symbol-keyed',
    )
  })

  test.each([
    ['$bigint', { $bigint: '123' }],
    ['$bytes', { $bytes: 'AA==' }],
  ])('rejects source objects that collide with the reserved %s codec tag', (_tag, value) => {
    expect(() => serializeWebSave({ saveVersion: 12, value })).toThrow(
      'reserved codec tags',
    )
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

  test('rejects direct duplicate JSON object keys before they collapse', () => {
    const duplicate =
      '{"format":"IDSWEB1","schema":12,"schema":12,"state":{"saveVersion":12}}'

    expect(() => deserializeWebSave(duplicate)).toThrow(
      'duplicate-equivalent object key',
    )
  })

  test('rejects escaped-equivalent duplicate JSON object keys', () => {
    const duplicate = String.raw`{"format":"IDSWEB1","\u0066ormat":"IDSWEB1","schema":12,"state":{"saveVersion":12}}`

    expect(() => deserializeWebSave(duplicate)).toThrow(
      'duplicate-equivalent object key',
    )
  })

  test('enforces the raw JSON entry budget before envelope classification', () => {
    const entries = Array.from(
      { length: 250_001 },
      (_, index) => `"entry${index}":0`,
    ).join(',')
    const unsupported = `{"schemaVersion":13,${entries}}`

    expect(() => decodeWebSaveTextBounded(unsupported, {
      suppliedTextBytes: 8 * 1024 * 1024,
      decodedPayloadBytes: 8 * 1024 * 1024,
      inflatedBinaryBytes: 8 * 1024 * 1024,
    })).toThrow('maximum entry count')
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
