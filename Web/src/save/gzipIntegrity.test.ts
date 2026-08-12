import { gzipSync, gunzipSync, strToU8 } from 'fflate'
import { describe, expect, test } from 'vitest'

import { assertGzipTrailerIntegrity } from './gzipIntegrity'

describe('gzip trailer integrity', () => {
  test('accepts the matching CRC32 and ISIZE trailer', () => {
    const compressed = gzipSync(strToU8('{"schemaVersion":13}'), {
      mtime: 0,
    })

    expect(() =>
      assertGzipTrailerIntegrity(
        compressed,
        gunzipSync(compressed),
        'Test envelope',
      ),
    ).not.toThrow()
  })

  test('rejects a corrupt CRC32 even when inflation still succeeds', () => {
    const compressed = gzipSync(strToU8('{"schemaVersion":13}'), {
      mtime: 0,
    }).slice()
    compressed[compressed.length - 8] ^= 0xff
    const inflated = gunzipSync(compressed)

    expect(() =>
      assertGzipTrailerIntegrity(compressed, inflated, 'Test envelope'),
    ).toThrow(/checksum/i)
  })

  test('rejects an advertised size that does not match the output', () => {
    const compressed = gzipSync(strToU8('{"schemaVersion":13}'), {
      mtime: 0,
    }).slice()
    compressed[compressed.length - 4] ^= 0x01

    expect(() =>
      assertGzipTrailerIntegrity(
        compressed,
        strToU8('{"schemaVersion":13}'),
        'Test envelope',
      ),
    ).toThrow(/size/i)
  })
})
