import { gzipSync } from 'fflate'
import { describe, expect, test } from 'vitest'
import {
  decodeIdb1Save,
  DEFAULT_SAVE_IMPORT_LIMITS,
  SaveImportLimitError,
  type SaveImportLimits,
} from '../save/decodeIdb1'
import {
  BrowserRecoveryBlobExporter,
  BrowserRecoveryBlobRetainer,
  BrowserSaveImportReader,
} from './browserSaveTransfer'

describe('bounded browser save transfer', () => {
  test('keeps the approved supplied, decoded, and inflated ceilings', () => {
    expect(DEFAULT_SAVE_IMPORT_LIMITS).toEqual({
      suppliedTextBytes: 2 * 1024 * 1024,
      decodedPayloadBytes: 1 * 1024 * 1024,
      inflatedBinaryBytes: 8 * 1024 * 1024,
    })
  })

  test('checks file bytes before allocating file text', async () => {
    let textRead = false
    const reader = new BrowserSaveImportReader(limits(3, 3, 3))

    await expect(
      reader.readFile({
        name: 'oversized.txt',
        size: 4,
        text: async () => {
          textRead = true
          return 'save'
        },
      }),
    ).rejects.toMatchObject({
      stage: 'supplied-text',
    })
    expect(textRead).toBe(false)
  })

  test('measures supplied UTF-8 bytes rather than UTF-16 code units', () => {
    const reader = new BrowserSaveImportReader(limits(3, 3, 3))

    expect(() => reader.readPaste('😀')).toThrowError(
      SaveImportLimitError,
    )
    expect(() => reader.readPaste('😀')).toThrow(
      'supplied-text',
    )
  })

  test('rejects decoded payload size before base64 decoding', () => {
    expect(() =>
      decodeIdb1Save(
        'IDB1:QUFBQQ==',
        limits(100, 3, 100),
      ),
    ).toThrow('decoded-payload')
  })

  test('aborts bounded inflation at the binary ceiling', () => {
    const compressed = gzipSync(new Uint8Array(129))
    const text = `IDB1:${Buffer.from(compressed).toString('base64')}`

    expect(() =>
      decodeIdb1Save(text, limits(10_000, 10_000, 128)),
    ).toThrow('inflated-binary')
  })

  test('rejects a genuine high-ratio gzip bomb from its advertised size before inflation', () => {
    const binary = new Uint8Array(16_768_711)
    const compressed = gzipSync(binary)
    const text = `IDB1:${Buffer.from(compressed).toString('base64')}`

    expect(compressed.byteLength).toBeLessThan(
      DEFAULT_SAVE_IMPORT_LIMITS.decodedPayloadBytes,
    )
    expect(Buffer.byteLength(text, 'utf8')).toBeLessThan(
      DEFAULT_SAVE_IMPORT_LIMITS.suppliedTextBytes,
    )
    expect(() => decodeIdb1Save(text)).toThrow(
      'inflated-binary',
    )
  })

  test('aborts a forged-small 64 MiB gzip near its advertised size without feeding the full stream', () => {
    const binary = new Uint8Array(64 * 1024 * 1024)
    const compressed = gzipSync(binary)
    const understatedBytes = 1_024
    new DataView(
      compressed.buffer,
      compressed.byteOffset + compressed.byteLength - 4,
      4,
    ).setUint32(0, understatedBytes, true)
    const allocations: number[] = []
    const progress: Array<{
      readonly compressedBytesFed: number
      readonly callbackBytes: number
      readonly emittedBytes: number
    }> = []
    const text = `IDB1:${Buffer.from(compressed).toString('base64')}`

    expect(() =>
      decodeIdb1Save(
        text,
        DEFAULT_SAVE_IMPORT_LIMITS,
        (bytes) => {
          allocations.push(bytes)
          return new Uint8Array(bytes)
        },
        (sample) => progress.push(sample),
      ),
    ).toThrow('advertised binary size')
    expect(allocations).toEqual([understatedBytes])
    expect(progress.at(-1)!.emittedBytes).toBeGreaterThan(
      understatedBytes,
    )
    expect(progress.at(-1)!.emittedBytes).toBeLessThanOrEqual(
      understatedBytes + 128 * 1024,
    )
    expect(
      Math.max(...progress.map((sample) => sample.callbackBytes)),
    ).toBeLessThanOrEqual(128 * 1024)
    expect(progress.at(-1)!.compressedBytesFed).toBeLessThan(
      compressed.byteLength / 4,
    )
  })

  test('supports dropped text and retained original recovery export', async () => {
    const reader = new BrowserSaveImportReader()
    const supplied = await reader.readDrop({
      files: [],
      getData: () => 'IDB1:original',
    })
    let retained = ''
    const retainer = new BrowserRecoveryBlobRetainer({
      retainLegacyCandidate: async (text) => {
        retained = text
        return {
          id: 'candidate',
          sourcePath: 'browser-import/candidate',
          text,
        }
      },
    })
    const candidate = await retainer.retainOriginal(supplied)
    const downloads: Array<{
      fileName: string
      text: string
      mediaType: string
    }> = []
    const exporter = new BrowserRecoveryBlobExporter(
      {
        readText: async (path) => {
          expect(path).toBe(candidate.sourcePath)
          return retained
        },
      },
      {
        downloadText: (fileName, text, mediaType) => {
          downloads.push({ fileName, text, mediaType })
        },
      },
    )

    await exporter.export(
      candidate.sourcePath,
      'original-idb1.txt',
    )

    expect(supplied).toMatchObject({
      source: 'drop',
      text: 'IDB1:original',
    })
    expect(downloads).toEqual([
      {
        fileName: 'original-idb1.txt',
        text: 'IDB1:original',
        mediaType: 'text/plain;charset=utf-8',
      },
    ])
  })
})

function limits(
  suppliedTextBytes: number,
  decodedPayloadBytes: number,
  inflatedBinaryBytes: number,
): SaveImportLimits {
  return {
    suppliedTextBytes,
    decodedPayloadBytes,
    inflatedBinaryBytes,
  }
}
