import { readFileSync, readdirSync } from 'node:fs'
import { gzipSync, strToU8 } from 'fflate'
import { describe, expect, test } from 'vitest'

import {
  DEFAULT_SAVE_IMPORT_LIMITS,
  SaveImportLimitError,
} from './decodeIdb1'
import { UnsupportedFutureSaveSchemaError } from './migrate'
import { serializeWebSave } from './serialization'
import {
  deserializeCurrentWebSaveBounded,
  probeIdsWeb1SchemaBounded,
} from './webSaveSchemaProbe'

function wrapSyntheticJson(json: string): string {
  const compressed = gzipSync(strToU8(json), { level: 9, mtime: 0 })
  let binary = ''
  for (const byte of compressed) binary += String.fromCharCode(byte)
  return `IDSWEB1:${btoa(binary)}`
}

function syntheticV13Json(): string {
  // Rejection-only transport fixture. It is intentionally not a gameplay DTO
  // fixture and makes no claim of public or player-save provenance.
  return JSON.stringify({
    schemaVersion: 13,
    modelVersion: 2,
    savedAtUtc: '2026-08-08T00:00:00.000Z',
    state: {},
  })
}

function sourceFiles(directory: URL): URL[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const url = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory)
    if (entry.isDirectory()) return sourceFiles(url)
    return /\.(?:ts|tsx)$/u.test(entry.name) && !/\.test\.tsx?$/u.test(entry.name)
      ? [url]
      : []
  })
}

describe('bounded IDSWEB1 schema probe', () => {
  test('identifies existing schema-12 envelopes without changing their decode', () => {
    const text = serializeWebSave({
      saveVersion: 12,
      slot: 'current',
      futureValue: { constructor: 'retained legacy field' },
    })
    expect(probeIdsWeb1SchemaBounded(text)).toMatchObject({
      kind: 'legacy',
      schema: 12,
      modelVersion: null,
    })
    expect(deserializeCurrentWebSaveBounded(text)).toEqual({
      saveVersion: 12,
      slot: 'current',
      futureValue: { constructor: 'retained legacy field' },
    })
  })

  test('classifies synthetic Web-native schema 13 as unsupported future', () => {
    const text = wrapSyntheticJson(syntheticV13Json())
    expect(probeIdsWeb1SchemaBounded(text)).toMatchObject({
      kind: 'web-native',
      schema: 13,
      modelVersion: 2,
    })
    expect(() => deserializeCurrentWebSaveBounded(text)).toThrow(
      UnsupportedFutureSaveSchemaError,
    )
    try {
      deserializeCurrentWebSaveBounded(text)
    } catch (error) {
      expect(error).toMatchObject({ sourceSchema: 13, supportedSchema: 12 })
    }
  })

  test('preserves raw transitional schema-12 behavior', () => {
    const text = JSON.stringify({
      format: 'IDSWEB1',
      schema: 12,
      state: { saveVersion: 12, slot: 'transitional' },
    })
    expect(probeIdsWeb1SchemaBounded(text)).toBeNull()
    expect(deserializeCurrentWebSaveBounded(text)).toEqual({
      saveVersion: 12,
      slot: 'transitional',
    })
  })

  test('rejects duplicate, forbidden, and over-depth hostile envelopes', () => {
    expect(() =>
      probeIdsWeb1SchemaBounded(
        wrapSyntheticJson(
          '{"schemaVersion":13,"\\u0073chemaVersion":13,"modelVersion":2}',
        ),
      ),
    ).toThrow(/duplicate/i)
    expect(() =>
      probeIdsWeb1SchemaBounded(
        wrapSyntheticJson(
          '{"schemaVersion":13,"modelVersion":2,"__proto__":{}}',
        ),
      ),
    ).toThrow(/forbidden/i)

    const nested = `${'['.repeat(129)}0${']'.repeat(129)}`
    expect(() =>
      probeIdsWeb1SchemaBounded(
        wrapSyntheticJson(
          `{"schemaVersion":13,"modelVersion":2,"state":${nested}}`,
        ),
      ),
    ).toThrow(/depth/i)
  })

  test('enforces supplied, decoded, and inflated transport budgets', () => {
    const json = syntheticV13Json()
    const text = wrapSyntheticJson(json)
    const suppliedLimit = {
      ...DEFAULT_SAVE_IMPORT_LIMITS,
      suppliedTextBytes: new TextEncoder().encode(text).byteLength - 1,
    }
    expect(() => probeIdsWeb1SchemaBounded(text, suppliedLimit)).toThrow(
      SaveImportLimitError,
    )

    const decodedLimit = {
      ...DEFAULT_SAVE_IMPORT_LIMITS,
      decodedPayloadBytes: 1,
    }
    expect(() => probeIdsWeb1SchemaBounded(text, decodedLimit)).toThrow(
      SaveImportLimitError,
    )

    const inflatedLimit = {
      ...DEFAULT_SAVE_IMPORT_LIMITS,
      inflatedBinaryBytes: new TextEncoder().encode(json).byteLength - 1,
    }
    expect(() => probeIdsWeb1SchemaBounded(text, inflatedLimit)).toThrow(
      SaveImportLimitError,
    )
  })

  test('enforces container and entry budgets while scanning hostile state', () => {
    const containers = Array.from({ length: 99_999 }, () => '[]').join(',')
    expect(() =>
      probeIdsWeb1SchemaBounded(
        wrapSyntheticJson(
          `{"schemaVersion":13,"modelVersion":2,"state":[${containers}]}`,
        ),
      ),
    ).toThrow(/container count/i)

    const entries = Array.from({ length: 250_000 }, () => '0').join(',')
    expect(() =>
      probeIdsWeb1SchemaBounded(
        wrapSyntheticJson(
          `{"schemaVersion":13,"modelVersion":2,"state":[${entries}]}`,
        ),
      ),
    ).toThrow(/entry count/i)
  })

  test('keeps the dormant V13 codec out of live production roots', () => {
    const productionFiles = [
      ...sourceFiles(new URL('../application/', import.meta.url)),
      ...sourceFiles(new URL('../platform/', import.meta.url)),
      ...sourceFiles(new URL('../ui/', import.meta.url)),
      new URL('./import.ts', import.meta.url),
      new URL('./repository.ts', import.meta.url),
      new URL('./startupResolver.ts', import.meta.url),
      new URL('./webSaveSchemaProbe.ts', import.meta.url),
    ]
    const violations = productionFiles.filter((file) =>
      /(?:from\s*|import\s*\(\s*)['"][^'"]*schema13['"]/u.test(
        readFileSync(file, 'utf8'),
      ),
    )
    expect(violations.map((file) => file.pathname)).toEqual([])
  })
})
