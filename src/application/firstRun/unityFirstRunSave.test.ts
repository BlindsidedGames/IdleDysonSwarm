import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { describe, expect, test } from 'vitest'
import { dehydrateGameState, hydrateGameState } from '../../game-state/mapping'
import {
  compareGraphs,
  type ParityDifference,
} from '../../parity/compare'
import { deepCloneSave, type SaveRecord } from '../../save/graph'
import {
  PortableSaveRepository,
  type LegacySaveCandidate,
  type SaveStorageAdapter,
} from '../../save/repository'
import { RepositoryStartupSaveResolver } from '../../save/startupResolver'
import {
  createDeterministicUnityFirstRunPreparedSave,
  createUnityFirstRunPreparedSave,
  unityFirstRunProvenance,
  webFirstRunGameplayOverridePaths,
} from './unityFirstRunSave'
import parityDeltaManifest from './generated/first-run-schema-12.parity-deltas.json'

const repositoryRoot = new URL('../../../', import.meta.url)
const repositoryPaths = {
  current: '/development/current',
  temporary: '/development/current.tmp',
  legacyRecovery: '/development/recovery/original-idb1.txt',
} as const
const hostFirstRunUtc = '2026-07-29T09:35:00.000Z'
const expectedArtifactPath =
  'src/application/firstRun/generated/first-run-schema-12.idb1.txt'
const expectedCatalogPaths = [
  'src/game-data/generated/catalog.json',
  'src/game-data/generated/legacy-id-maps.json',
  'src/game-data/generated/skill-migration-data.json',
] as const

class EmptyDevelopmentStorage implements SaveStorageAdapter {
  readonly files = new Map<string, string>()

  async exists(path: string): Promise<boolean> {
    return this.files.has(path)
  }

  async readText(path: string): Promise<string> {
    const value = this.files.get(path)
    if (value === undefined) throw new Error(`Missing ${path}`)
    return value
  }

  async writeText(path: string, contents: string): Promise<void> {
    this.files.set(path, contents)
  }

  async replaceAtomically(
    temporaryPath: string,
    destinationPath: string,
  ): Promise<void> {
    this.files.set(destinationPath, await this.readText(temporaryPath))
    this.files.delete(temporaryPath)
  }

  async copy(sourcePath: string, destinationPath: string): Promise<void> {
    this.files.set(destinationPath, await this.readText(sourcePath))
  }

  async discoverLegacyCandidates(): Promise<
    readonly LegacySaveCandidate[]
  > {
    return []
  }
}

describe('Unity-generated first-run save', () => {
  test('matches the checked-in Unity and generated-catalog provenance', () => {
    expect(unityFirstRunProvenance.unityVersion).toBe('6000.5.5f1')
    expect(unityFirstRunProvenance.unityRevision).toBe(
      '6000.5.5f1 (d16e074b49fd)',
    )
    expect(unityFirstRunProvenance.saveSchema).toBe(12)
    expect(unityFirstRunProvenance.exportMethod).toBe(
      'Web.FirstRunSaveArtifactExporter.ExportBatch',
    )
    expect(unityFirstRunProvenance.artifactPath).toBe(
      expectedArtifactPath,
    )
    expect(
      unityFirstRunProvenance.catalogHashes.map(({ path }) => path),
    ).toEqual(expectedCatalogPaths)
    expect(
      new Set(
        unityFirstRunProvenance.catalogHashes.map(({ path }) => path),
      ).size,
    ).toBe(expectedCatalogPaths.length)

    expect(
      hashCanonicalTextFile(unityFirstRunProvenance.artifactPath),
    ).toBe(unityFirstRunProvenance.artifactSha256)
    expect(
      hashDecodedIdb1Binary(unityFirstRunProvenance.artifactPath),
    ).toBe(unityFirstRunProvenance.decodedBinarySha256)
    for (const catalog of unityFirstRunProvenance.catalogHashes) {
      expect(hashCanonicalTextFile(catalog.path)).toBe(catalog.sha256)
      const checkoutText = readRepositoryText(catalog.path)
      const lfText = checkoutText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
      expect(hashCanonicalText(lfText.replace(/\n/g, '\r\n'))).toBe(
        hashCanonicalText(lfText),
      )
    }
  })

  test('round-trips Unity defaults through the normalized Web mapping', () => {
    const original = createDeterministicUnityFirstRunPreparedSave()
    const normalized = original.withValidatedState(
      normalizeLifecycleMetadata(original.copyValidatedState()),
    )
    const webSession = hydrateGameState(normalized)
    const mappedBack = dehydrateGameState(webSession)
    const rehydrated = hydrateGameState(mappedBack)
    const storageDifferences = compareGraphs(
      mappedBack.copyValidatedState(),
      normalized.copyValidatedState(),
    )
    expect(
      compareGraphs(rehydrated.state, webSession.state),
    ).toEqual([])
    expectClassifiedStorageDeltas(storageDifferences)
  })

  test('applies Web lifecycle, Infinity, and navigation defaults only to first-run saves', () => {
    const deterministic =
      createDeterministicUnityFirstRunPreparedSave().copyValidatedState()
    const production = createUnityFirstRunPreparedSave({
      startedAtUtc: hostFirstRunUtc,
    }).copyValidatedState()
    const differences = compareGraphs(production, deterministic)

    const state = hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: hostFirstRunUtc })).state
    expect(state.dyson.botDistribution).toBe(0)
    expect(state.skills.presets.map((preset) => preset.botDistribution)).toEqual([0, 0, 0, 0, 0])
    expect(production.dateStarted).toBe(hostFirstRunUtc)
    expect(production.infinityAutomaticReset).toBe(false)
    expect(production.bottomNavigationPreferences).toMatchObject({
      version: 1,
      routeDiscovery: {
        knownRoutes: [],
        unvisitedRoutes: [],
      },
      visibility: {
        bots: true,
        research: true,
        skills: true,
        infinity: true,
        reality: true,
        simulations: true,
        quantum: true,
        store: true,
        story: false,
        wiki: true,
        'offline-time': false,
        statistics: false,
        settings: true,
      },
    })
    expect(differences.filter(({ path }) => !path.startsWith('$.dysonVerseSaveData'))).toEqual([
      {
        path: '$.dateStarted',
        expected: deterministic.dateStarted,
        actual: hostFirstRunUtc,
        reason: 'value',
      },
      {
        path: '$.infinityAutomaticReset',
        expected: true,
        actual: false,
        reason: 'value',
      },
      {
        path: '$.bottomNavigationPreferences',
        expected: undefined,
        actual: production.bottomNavigationPreferences,
        reason: 'missing',
      },
    ])
    expect(
      unityFirstRunProvenance.lifecycleMetadataNormalizationPaths,
    ).toContain('$.dateStarted')
    expect(webFirstRunGameplayOverridePaths).toContain(
      '$.infinityAutomaticReset',
    )
    expect(webFirstRunGameplayOverridePaths).toContain(
      '$.bottomNavigationPreferences',
    )
    expect([
      ...unityFirstRunProvenance.lifecycleMetadataNormalizationPaths,
      ...webFirstRunGameplayOverridePaths,
    ]).toEqual(expect.arrayContaining(differences.map(({ path }) => path)))
    expect(() =>
      createUnityFirstRunPreparedSave({ startedAtUtc: 'not-a-date' }),
    ).toThrow('First-run start timestamp is invalid')
  })

  test('reconstructs and reloads an empty development repository', async () => {
    const storage = new EmptyDevelopmentStorage()
    const repository = createRepository(storage)
    const resolver = new RepositoryStartupSaveResolver(
      repository,
      () =>
        createUnityFirstRunPreparedSave({
          startedAtUtc: hostFirstRunUtc,
        }),
      'development',
    )

    const resolution = await resolver.resolve()
    expect(resolution.kind).toBe('first-run')
    if (resolution.kind !== 'first-run') return

    const committed = await repository.commit(
      resolution.save,
      'development',
    )
    const reopened = await createRepository(storage).loadCurrent()

    expect(storage.files.has(repositoryPaths.current)).toBe(true)
    expect(reopened).not.toBeNull()
    expect(
      compareGraphs(
        reopened?.copyValidatedState(),
        committed.copyValidatedState(),
      ),
    ).toEqual([])
    expect(
      compareGraphs(
        hydrateGameState(reopened!).state,
        hydrateGameState(resolution.save).state,
      ),
    ).toEqual([])
  })
})

function createRepository(
  storage: SaveStorageAdapter,
): PortableSaveRepository {
  return new PortableSaveRepository(
    storage,
    repositoryPaths,
    () => {
      throw new Error('An empty development repository has no legacy save.')
    },
  )
}

function hashCanonicalTextFile(relativePath: string): string {
  return hashCanonicalText(readRepositoryText(relativePath))
}

function readRepositoryText(relativePath: string): string {
  return readFileSync(
    new URL(relativePath, repositoryRoot),
    'utf8',
  )
}

function hashCanonicalText(text: string): string {
  const canonicalText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
  return createHash('sha256')
    .update(canonicalText, 'utf8')
    .digest('hex')
    .toUpperCase()
}

function hashDecodedIdb1Binary(relativePath: string): string {
  const text = readFileSync(
    new URL(relativePath, repositoryRoot),
    'utf8',
  ).trim()
  if (!text.startsWith('IDB1:')) {
    throw new Error(`First-run artifact is not uppercase IDB1: ${relativePath}`)
  }
  const compressed = Buffer.from(text.slice('IDB1:'.length), 'base64')
  return createHash('sha256')
    .update(gunzipSync(compressed))
    .digest('hex')
    .toUpperCase()
}

function normalizeLifecycleMetadata(source: SaveRecord): SaveRecord {
  const normalized = deepCloneSave(source)
  for (
    const path of
    unityFirstRunProvenance.lifecycleMetadataNormalizationPaths
  ) {
    if (!/^\$\.[A-Za-z][A-Za-z0-9]*$/.test(path)) {
      throw new Error(
        `Lifecycle normalization path must remain a classified top-level field: ${path}`,
      )
    }
    normalized[path.slice(2)] = '<normalized-lifecycle-metadata>'
  }
  return normalized
}

function expectClassifiedStorageDeltas(
  differences: readonly ParityDifference[],
): void {
  const counts = new Map<string, number>()
  expect(differences).toHaveLength(
    parityDeltaManifest.expectedDifferenceCount,
  )
  for (const difference of differences) {
    const normalizedPath = difference.path
      .replace(/\[\d+\]/g, '[*]')
      .replace(/\.([0-9]+)$/, '.*')
    const classification = parityDeltaManifest.allowedDeltas.find(
      (candidate) => candidate.normalizedPaths.includes(normalizedPath),
    )
    expect(
      classification,
      `Unclassified Unity-to-Web storage delta at ${difference.path}`,
    ).toBeDefined()
    if (!classification) continue
    expect(describeShape(difference.expected)).toBe(
      classification.expectedShape,
    )
    expect(describeShape(difference.actual)).toBe(
      classification.actualShape,
    )
    counts.set(classification.id, (counts.get(classification.id) ?? 0) + 1)
  }

  for (const classification of parityDeltaManifest.allowedDeltas) {
    expect(counts.get(classification.id) ?? 0).toBe(
      classification.expectedDifferenceCount,
    )
  }
}

function describeShape(value: unknown): string {
  if (value === undefined) return 'missing'
  if (value === null) return 'null'
  if (value === false) return 'false'
  if (value === '') return 'empty-string'
  if (
    (typeof value === 'number' && value === 0) ||
    (typeof value === 'bigint' && value === 0n)
  ) {
    return 'zero-number-or-bigint'
  }
  if (
    (typeof value === 'number' && value === 1) ||
    (typeof value === 'bigint' && value === 1n)
  ) {
    return 'one-number-or-bigint'
  }
  return typeof value
}
