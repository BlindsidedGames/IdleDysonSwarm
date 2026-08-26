import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, test } from 'vitest'
import { decodeIdb1Save } from '../save/decodeIdb1'
import {
  classifyPublicUnitySchema11Leaf,
  mappingCoverageManifest,
  mappingPathMatches,
} from './mappingCoverage'
import {
  publicUnitySaveCertification,
  publicUnitySchema11LeafPatterns,
} from './mappingCoverageSchema11'

const schema11Fixture = new URL(
  '../../test/fixtures/support-case-01-attached-idb1.txt',
  import.meta.url,
)

describe('public Unity mapping coverage certification', () => {
  test('pins the shipped Unity 3.0.328 schema-11 source identity', () => {
    expect(publicUnitySaveCertification).toEqual({
      applicationVersion: '3.0.328',
      saveSchema: 11,
      sourceRevision: '9b840fb2547ad507d4e529a610a031cc13782847',
      unityEditorVersion: '6000.3.9f1',
      saveRootType: 'Expansion.Oracle.SaveDataSettings',
      schemaFieldCatalogSha256:
        '0b0559fc79cda740529fafd6cb075edd3725255147cd8fbd06a568b4e46970b4',
    })
    expect(mappingCoverageManifest.unityImportSchema).toBe(11)
    expect(mappingCoverageManifest.certification).toBe(
      publicUnitySaveCertification,
    )
  })

  test('classifies every catalogued schema leaf exactly once', () => {
    const catalog = new Set(publicUnitySchema11LeafPatterns)
    const classified = new Set(
      mappingCoverageManifest.entries.map((entry) => entry.sourcePath),
    )

    expect(catalog.size).toBe(publicUnitySchema11LeafPatterns.length)
    expect(catalog.size).toBeGreaterThan(450)
    expect(
      createHash('sha256')
        .update([...catalog].sort().join('\n'))
        .digest('hex'),
    ).toBe(publicUnitySaveCertification.schemaFieldCatalogSha256)
    expect(classified).toEqual(catalog)
    expect(mappingCoverageManifest.entries).toHaveLength(catalog.size)

    const classifications = new Set(
      mappingCoverageManifest.entries.map((entry) => entry.classification),
    )
    expect(classifications).toEqual(
      new Set([
        'canonically-owned',
        'derived-recomputed',
        'legacy-duplicate-omitted',
        'presentation-preference',
        'platform-entitlement',
        'still-unowned',
      ]),
    )

    for (const entry of mappingCoverageManifest.entries) {
      expect(entry.rationale.trim()).not.toBe('')
      if (entry.classification === 'canonically-owned') {
        expect(entry.owner).not.toBeNull()
        expect(entry.canonicalPath).toMatch(/^\$\./)
        expect(entry.writePolicy).toBe('write-canonical')
        expect(entry.testId).toBe('game-state-round-trip')
      } else {
        expect(entry.canonicalPath).toBeUndefined()
        expect(entry.testId).toBe(
          'public-unity-schema-11-leaf-classification',
        )
      }
    }
  })

  test('covers every concrete leaf in the authentic schema-11 support save', () => {
    const text = readFileSync(schema11Fixture, 'utf8')
    const decoded = decodeIdb1Save(text).root
    expect(decoded.saveVersion).toBe(11)

    const leaves = new Set<string>()
    collectConcreteLeafPaths(decoded, '$', leaves)
    expect(leaves.size).toBeGreaterThan(450)
    for (const leaf of leaves) {
      expect(
        classifyPublicUnitySchema11Leaf(leaf),
        `unclassified public schema-11 leaf: ${leaf}`,
      ).not.toBeNull()
    }
  })

  test('does not silently classify a new field under an existing object', () => {
    expect(classifyPublicUnitySchema11Leaf('$.futureRootField')).toBeNull()
    expect(
      classifyPublicUnitySchema11Leaf('$.sdSimulation.futureField'),
    ).toBeNull()
    expect(
      classifyPublicUnitySchema11Leaf(
        '$.dysonVerseSaveData.dysonVerseInfinityData.futureField',
      ),
    ).toBeNull()
  })

  test('records the Web-owned automatic Infinity extension separately from the pinned Unity schema', () => {
    expect(mappingCoverageManifest.developmentExtensions).toContainEqual(
      expect.objectContaining({
        sourcePath: '$.infinityAutomaticReset',
        classification: 'canonically-owned',
        canonicalPath: '$.infinity.automaticResetEnabled',
        writePolicy: 'write-canonical',
      }),
    )
    expect(
      classifyPublicUnitySchema11Leaf('$.infinityAutomaticReset'),
    ).toBeNull()
    expect(mappingCoverageManifest.developmentExtensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: '$.processingRewriteMigrated',
          canonicalPath: '$.timeline.processing.rewriteMigrated',
        }),
        expect.objectContaining({
          sourcePath: '$.processingActiveIntervalMilliseconds',
          canonicalPath: '$.timeline.processing.activeIntervalMilliseconds',
        }),
        expect.objectContaining({
          sourcePath: '$.processingStoredTimePreset',
          canonicalPath: '$.timeline.processing.storedTimePreset',
        }),
      ]),
    )
  })

  test('matches escaped dots inside certified dictionary keys without widening fields', () => {
    expect(
      mappingPathMatches(
        '$.dysonVerseSaveData.dysonVerseInfinityData.researchLevelsById.*',
        '$.dysonVerseSaveData.dysonVerseInfinityData.researchLevelsById.research\\.money_multiplier',
      ),
    ).toBe(true)
    expect(
      mappingPathMatches(
        '$.dysonVerseSaveData.dysonVerseInfinityData.researchLevelsById.*',
        '$.dysonVerseSaveData.dysonVerseInfinityData.money',
      ),
    ).toBe(false)
    expect(
      mappingPathMatches(
        '$.dysonVerseSaveData.dysonVerseInfinityData.skillStateById.*.owned',
        '$.dysonVerseSaveData.dysonVerseInfinityData.skillStateById.owned',
      ),
    ).toBe(false)
    expect(
      mappingPathMatches(
        '$.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines.*',
        '$.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines.future.nested',
      ),
    ).toBe(false)
    expect(
      mappingPathMatches(
        '$.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines.*',
        '$.dysonVerseSaveData.dysonVerseInfinityData.assemblyLines.',
      ),
    ).toBe(false)
    expect(
      mappingPathMatches(
        '$.dysonVerseSaveData.dysonVerseInfinityData.skillStateById.*.owned',
        '$.dysonVerseSaveData.dysonVerseInfinityData.skillStateById..owned',
      ),
    ).toBe(false)
    expect(
      classifyPublicUnitySchema11Leaf(
        '$.dysonVerseSaveData.dysonVerseInfinityData.SkillTreeSaveData',
      ),
    ).not.toBeNull()
  })

  test('keeps release writes blocked while explicit leaves remain unowned', () => {
    expect(mappingCoverageManifest.unresolvedLeafCount).toBeGreaterThan(0)
    expect(mappingCoverageManifest.coverageComplete).toBe(false)
    expect(mappingCoverageManifest.releaseCanonicalWriteAllowed).toBe(false)
    expect(mappingCoverageManifest.unmatchedWritePolicy).toBe('preserve-source')
    expect(mappingCoverageManifest.unclassifiedLeafPolicy).toBe(
      'fail-certification',
    )
  })
})

function collectConcreteLeafPaths(
  value: unknown,
  path: string,
  output: Set<string>,
): void {
  if (
    value === null ||
    typeof value !== 'object' ||
    value instanceof Uint8Array
  ) {
    output.add(path)
    return
  }
  const entries = Array.isArray(value)
    ? value.map((entry, index) => [String(index), entry] as const)
    : Object.entries(value)
  // An empty collection supplies no concrete leaf. Its element schema is
  // certified by the static wildcard pattern, not invented from this fixture.
  for (const [key, entry] of entries) {
    const escapedKey = key.replaceAll('\\', '\\\\').replaceAll('.', '\\.')
    collectConcreteLeafPaths(entry, `${path}.${escapedKey}`, output)
  }
}
