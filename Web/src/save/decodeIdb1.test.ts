import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { decodeIdb1Save, getSavePath } from './decodeIdb1'

const fixtureDirectory = new URL('../../test/fixtures/', import.meta.url)

function loadFixture(name: string): string {
  return readFileSync(new URL(name, fixtureDirectory), 'utf8')
}

describe('IDB1 Odin compatibility decoder', () => {
  test('decodes the canonical schema 8 fixture and preserves its sentinels', () => {
    const decoded = decodeIdb1Save(
      loadFixture('schema-08-canonical-idb1-main-save.txt'),
    )

    expect(decoded.rootType).toContain('Expansion.Oracle+SaveDataSettings')
    expect(getSavePath(decoded.root, 'saveVersion')).toBe(8)
    expect(getSavePath(decoded.root, 'dateStarted')).toBe('02/01/2026 01:56:16')
    expect(getSavePath(decoded.root, 'dateQuitString')).toBe(
      '02/02/2026 23:04:43',
    )
    expect(
      getSavePath(
        decoded.root,
        'dysonVerseSaveData.dysonVerseInfinityData.money',
      ),
    ).toBe(1461885056445.4221)
    expect(
      getSavePath(
        decoded.root,
        'dysonVerseSaveData.dysonVersePrestigeData.infinityPoints',
      ),
    ).toBe(1n)
    expect(decoded.bytesRead).toBe(decoded.byteLength)

    const researchLevels = getSavePath(
      decoded.root,
      'dysonVerseSaveData.dysonVerseInfinityData.researchLevelsById',
    ) as Record<string, unknown>
    expect(researchLevels['research.money_multiplier']).toBe(29)
  })

  test.each([
    ['support-case-01-attached-idb1.txt', 11],
    ['support-case-02-inline-idb1.txt', 0],
    ['support-case-03-inline-idb1.txt', 10],
  ])('decodes historical fixture %s at schema %i', (fileName, schema) => {
    const decoded = decodeIdb1Save(loadFixture(fileName))
    expect(decoded.rootType).toContain('Expansion.Oracle+SaveDataSettings')
    expect(getSavePath(decoded.root, 'saveVersion')).toBe(schema)
    expect(decoded.bytesRead).toBe(decoded.byteLength)
  })

  test('rejects malformed base64 without returning partial state', () => {
    expect(() => decodeIdb1Save('IDB1:not-valid-base64')).toThrow(
      'not valid base64',
    )
  })
})
