import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import parityCases from '../../test/parity/save-migration-cases.json'
import { prepareIdb1Save } from '../save/prepare'
import { mappingCoverageManifest } from './mappingCoverage'

const fixtureDirectory = new URL('../../test/fixtures/', import.meta.url)

describe('canonical mapping coverage gate', () => {
  test('has unique, executable owned-path declarations', () => {
    const paths = mappingCoverageManifest.entries.map(
      (entry) => entry.sourcePath,
    )
    expect(new Set(paths).size).toBe(paths.length)
    expect(mappingCoverageManifest.entries.length).toBeGreaterThan(60)
    for (const entry of mappingCoverageManifest.entries) {
      expect(entry.classification).toBe('canonically-owned')
      expect(entry.canonicalPath).toMatch(/^\$\./)
      expect(entry.writePolicy).toBe('write-canonical')
      expect(entry.testId).toBe('game-state-round-trip')
    }
  })

  test('forbids canonical player-save writes while coverage is partial', () => {
    expect(mappingCoverageManifest.coverageComplete).toBe(false)
    expect(mappingCoverageManifest.releaseCanonicalWriteAllowed).toBe(false)
    expect(mappingCoverageManifest.unmatchedWritePolicy).toBe(
      'preserve-source',
    )
  })

  test('measures fixture leaf coverage without overlapping declarations', () => {
    const leaves = new Set<string>()
    for (const { fixture } of parityCases) {
      const text = readFileSync(new URL(fixture, fixtureDirectory), 'utf8')
      collectLeafPaths(
        prepareIdb1Save(text).prepared.copyValidatedState(),
        '$',
        leaves,
      )
    }
    let matchedLeaves = 0
    for (const leaf of leaves) {
      const matches = mappingCoverageManifest.entries.filter((entry) =>
        pathMatches(entry.sourcePath, leaf),
      )
      expect(matches.length, `overlapping coverage for ${leaf}`).toBeLessThanOrEqual(1)
      if (matches.length === 1) matchedLeaves += 1
    }
    expect(matchedLeaves).toBeGreaterThan(0)
    expect(matchedLeaves).toBeLessThan(leaves.size)
  })
})

function pathMatches(pattern: string, path: string): boolean {
  const expected = pattern.split('.')
  const actual = path.split('.')
  return (
    expected.length === actual.length &&
    expected.every(
      (segment, index) => segment === '*' || segment === actual[index],
    )
  )
}

function collectLeafPaths(
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
  if (entries.length === 0) {
    output.add(path)
    return
  }
  for (const [key, entry] of entries) {
    collectLeafPaths(entry, `${path}.${key}`, output)
  }
}
