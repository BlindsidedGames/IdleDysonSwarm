import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import fixtureManifest from '../../test/fixtures/fixture-manifest.json'
import supportManifest from '../../test/fixtures/support-fixture-manifest.json'
import { PreparedSave } from './prepare'
import { prepareImportedSaveText } from './import'

const repositoryRoot = new URL('../../', import.meta.url)

describe('legacy Unity handoff fixtures', () => {
  test('preserves every fixture byte-for-byte against its manifest', () => {
    for (const fixture of [...fixtureManifest.fixtures, ...supportManifest.fixtures]) {
      const bytes = readFileSync(new URL(fixture.fixturePath, repositoryRoot))
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(fixture.sha256)
    }
  })

  test('preserves schema-7 raw sentinels as inspectable historical evidence', () => {
    const raw = readFileSync(
      new URL('test/fixtures/schema-07-raw-json-20260202-045325.json', repositoryRoot),
      'utf8',
    ).replace(/^\uFEFF/, '')
    const decoded = JSON.parse(raw) as Record<string, unknown>
    expect(decoded).toMatchObject({
      saveVersion: 7,
      dateStarted: '02/01/2026 04:12:01',
      firstInfinityDone: true,
    })
  })

  test('rejects malformed support case 04 without mutating receiving state', () => {
    const malformed = readFileSync(
      new URL('test/fixtures/support-case-04-cross-platform-import-idb1.txt', repositoryRoot),
      'utf8',
    )
    const receiving = PreparedSave.fromDecoded({
      saveVersion: 12,
      bots: 42,
      offlineTime: 17,
    }).copyValidatedState()
    const before = structuredClone(receiving)

    expect(() =>
      prepareImportedSaveText(
        malformed,
        '2026-08-21T00:00:00Z',
        undefined,
        {
          kind: 'manual-shared-import',
          importedAtUtc: '2026-08-21T00:00:00Z',
        },
        receiving,
      ),
    ).toThrow()
    expect(receiving).toEqual(before)
  })
})
