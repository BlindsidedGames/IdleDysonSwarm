import { describe, expect, test } from 'vitest'
import {
  COMPRESSED_WEB_SAVE_PREFIX,
  deserializeCompressedWebSave,
  serializeCompressedWebSave,
} from './compressedWebSave'
import { serializeWebSave } from './serialization'

describe('compressed Web save transfer', () => {
  test('round-trips the canonical Web envelope without precision loss', () => {
    const save = {
      saveVersion: 12,
      infinityPoints: 9_223_372_036_854_775_807n,
      bits: Uint8Array.from([0, 127, 255]),
      repeated: 'Dyson '.repeat(2_000),
    }

    const encoded = serializeCompressedWebSave(save)

    expect(encoded).toMatch(/^IDSWEB1:/)
    expect(encoded.length).toBeLessThan(serializeWebSave(save).length)
    expect(deserializeCompressedWebSave(encoded)).toEqual(save)
  })

  test('accepts a lowercase transfer prefix', () => {
    const encoded = serializeCompressedWebSave({ saveVersion: 12 })
    const lowercasePrefix =
      COMPRESSED_WEB_SAVE_PREFIX.toLowerCase() +
      encoded.slice(COMPRESSED_WEB_SAVE_PREFIX.length)

    expect(deserializeCompressedWebSave(lowercasePrefix)).toMatchObject({
      saveVersion: 12,
    })
  })

  test('rejects malformed and over-limit compressed payloads', () => {
    expect(() =>
      deserializeCompressedWebSave('IDSWEB1:not-base64'),
    ).toThrow('base64')

    const encoded = serializeCompressedWebSave({
      saveVersion: 12,
      repeated: 'x'.repeat(2_000),
    })
    expect(() =>
      deserializeCompressedWebSave(encoded, {
        suppliedTextBytes: 128,
        decodedPayloadBytes: 1_024,
        inflatedBinaryBytes: 1_024,
      }),
    ).toThrow()
  })
})
