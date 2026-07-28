/**
 * Purpose:
 * - Export deterministic, framework-independent runtime catalogs from authored
 *   Unity data assets.
 *
 * Runs:
 * - Node.js tooling through `npm run data:export` and `npm run data:check`.
 *
 * Primary entry points and ownership:
 * - Executes from the module entrypoint, discovers the embedded Unity project
 *   or `IDLE_DYSON_UNITY_ROOT`, parses selected assets, and owns stable output
 *   ordering plus source hashes.
 * - Delegates YAML parsing to `yaml` and file/cryptographic primitives to Node.
 *
 * Interacts with:
 * - Reads Unity assets, metadata, `SkillIdMap.cs`, and `ResearchIdMap.cs`.
 * - Writes or verifies `src/game-data/generated/*.json`.
 * - Called by package scripts and release/checkpoint validation.
 *
 * Change notes:
 * - Asset roots, stable-ID rules, reference resolution, source-hash
 *   normalization, output names, or sorting changes affect generated catalogs,
 *   parity fixtures, migrations, and every runtime consumer of exported data.
 * - Coordinate those changes with generated outputs, catalog tests, migration
 *   data, and `docs/parity-fixtures.md`.
 */
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

type UnknownRecord = Record<string, unknown>

interface AssetSource {
  path: string
  absolutePath: string
  guid: string
  raw: string
  body: UnknownRecord
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(scriptDirectory, '..')
const repositoryRoot = resolve(webRoot, '..')
const embeddedUnityRoot = existsSync(resolve(repositoryRoot, 'Assets'))
  ? repositoryRoot
  : resolve(repositoryRoot, 'Idle Dyson Swarm')
const unityRoot = resolve(
  process.env.IDLE_DYSON_UNITY_ROOT ?? embeddedUnityRoot,
)
const outputDirectory = resolve(webRoot, 'src/game-data/generated')
const checkOnly = process.argv.includes('--check')
mkdirSync(outputDirectory, { recursive: true })

const assetRoots = [
  resolve(unityRoot, 'Assets/Data'),
  resolve(unityRoot, 'Assets/Resources/Balance'),
  resolve(unityRoot, 'Assets/Resources/QuantumUpgradeDatabase.asset'),
]

for (const input of assetRoots) {
  if (!existsSync(input)) {
    throw new Error(`Unity data source does not exist: ${input}`)
  }
}

const allAssetPaths = assetRoots
  .flatMap((entry) =>
    statSync(entry).isDirectory() ? walk(entry, '.asset') : [entry],
  )
  .sort(compareText)
const guidToAssetPath = new Map<string, string>()

for (const absolutePath of allAssetPaths) {
  const guid = readGuid(`${absolutePath}.meta`)
  if (guid) guidToAssetPath.set(guid, absolutePath)
}

const parsedByPath = new Map<string, AssetSource>()

function parseAsset(absolutePath: string): AssetSource {
  const existing = parsedByPath.get(absolutePath)
  if (existing) return existing
  const raw = readFileSync(absolutePath, 'utf8')
  const parsed = parseUnityYaml(raw)
  const body = asRecord(parsed.MonoBehaviour)
  const source: AssetSource = {
    absolutePath,
    path: unityRelative(absolutePath),
    guid: readGuid(`${absolutePath}.meta`) ?? '',
    raw,
    body,
  }
  parsedByPath.set(absolutePath, source)
  return source
}

for (const absolutePath of allAssetPaths) parseAsset(absolutePath)

const stableIdCache = new Map<string, string | null>()

function stableIdFor(absolutePath: string, resolving = new Set<string>()): string {
  const cached = stableIdCache.get(absolutePath)
  if (cached !== undefined) return cached ?? fallbackId(absolutePath)
  if (resolving.has(absolutePath)) return fallbackId(absolutePath)
  resolving.add(absolutePath)
  const body = parseAsset(absolutePath).body
  let id =
    stringValue(body.id) ??
    (typeof body._id === 'string' ? body._id : null)

  if (!id && isUnityReference(body._id)) {
    const referenced = guidToAssetPath.get(body._id.guid)
    if (referenced) id = stableIdFor(referenced, resolving)
  }
  id ??= stringValue(body.m_Name)
  id ??= fallbackId(absolutePath)
  stableIdCache.set(absolutePath, id)
  resolving.delete(absolutePath)
  return id
}

function transformValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(transformValue)
  if (!isRecord(value)) return value
  if (isUnityReference(value)) {
    const referencedPath = guidToAssetPath.get(value.guid)
    return sortObject({
      fileId: value.fileID,
      guid: value.guid,
      id: referencedPath ? stableIdFor(referencedPath) : null,
      path: referencedPath ? unityRelative(referencedPath) : null,
    })
  }
  return sortObject(
    Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !isUnityMetadataKey(key))
        .map(([key, entry]) => [key, transformValue(entry)]),
    ),
  )
}

const assets = allAssetPaths
  .map((absolutePath) => {
    const source = parseAsset(absolutePath)
    const classIdentifier = stringValue(source.body.m_EditorClassIdentifier)
    const kind = classIdentifier?.split('::').at(-1) ?? 'UnityAsset'
    return {
      id: stableIdFor(absolutePath),
      kind,
      path: source.path,
      guid: source.guid,
      sourceHash: createHash('sha256')
        .update(source.raw.replace(/\r\n?/g, '\n'))
        .digest('hex'),
      data: transformValue(source.body),
    }
  })
  .sort((left, right) =>
    compareText(`${left.kind}\0${left.id}\0${left.path}`, `${right.kind}\0${right.id}\0${right.path}`),
  )

const countsByKind: Record<string, number> = {}
for (const asset of assets) countsByKind[asset.kind] = (countsByKind[asset.kind] ?? 0) + 1

const catalog = sortObject({
  formatVersion: 1,
  countsByKind: sortObject(countsByKind),
  assets,
})

const legacyIdMaps = sortObject({
  skillLegacyKeyToId: extractSkillMap(
    readFileSync(resolve(unityRoot, 'Assets/Scripts/Data/SkillIdMap.cs'), 'utf8'),
  ),
  researchIds: extractResearchIds(
    readFileSync(resolve(unityRoot, 'Assets/Scripts/Data/ResearchIdMap.cs'), 'utf8'),
  ),
})

emit('catalog.json', catalog)
emit('legacy-id-maps.json', legacyIdMaps)
emit(
  'skill-migration-data.json',
  sortObject(
    Object.fromEntries(
      assets
        .filter((asset) => asset.kind === 'GameData.SkillDefinition')
        .map((asset) => [
          asset.id,
          {
            requiredSkillIds: stringArray(asset.data.requiredSkillIds),
            shadowRequirementIds: stringArray(
              asset.data.shadowRequirementIds,
            ),
            exclusiveWithIds: stringArray(asset.data.exclusiveWithIds),
          },
        ]),
    ),
  ),
)

console.log(
  `${checkOnly ? 'Verified' : 'Exported'} ${assets.length} Unity data assets across ${Object.keys(countsByKind).length} types.`,
)

function emit(name: string, value: unknown): void {
  const destination = resolve(outputDirectory, name)
  const content = `${JSON.stringify(value, null, 2)}\n`
  if (checkOnly) {
    const existingContent = existsSync(destination)
      ? readFileSync(destination, 'utf8').replace(/\r\n?/g, '\n')
      : null
    if (existingContent !== content) {
      throw new Error(
        `${name} is stale. Run npm run data:export after Unity data changes.`,
      )
    }
    return
  }
  writeFileSync(destination, content)
}

function parseUnityYaml(raw: string): UnknownRecord {
  const normalized = raw
    .replace(/^%YAML.*\r?\n/gm, '')
    .replace(/^%TAG.*\r?\n/gm, '')
    .replace(/^--- !u!\d+ &\d+\r?$/gm, '---')
  return asRecord(parse(normalized))
}

function walk(root: string, extension: string): string[] {
  const result: string[] = []
  for (const name of readdirSync(root)) {
    const absolutePath = resolve(root, name)
    if (statSync(absolutePath).isDirectory()) result.push(...walk(absolutePath, extension))
    else if (name.endsWith(extension)) result.push(absolutePath)
  }
  return result
}

function readGuid(metaPath: string): string | null {
  if (!existsSync(metaPath)) return null
  return /^guid:\s*([a-f0-9]+)\s*$/m.exec(readFileSync(metaPath, 'utf8'))?.[1] ?? null
}

function extractSkillMap(source: string): Record<string, string> {
  return sortObject(
    Object.fromEntries(
      [...source.matchAll(/\{\s*(\d+),\s*"([^"]+)"\s*\}/g)].map(
        ([, key, id]) => [key, id],
      ),
    ),
  )
}

function extractResearchIds(source: string): string[] {
  return [...source.matchAll(/public const string \w+ = "([^"]+)";/g)]
    .map((match) => match[1])
    .sort(compareText)
}

function unityRelative(absolutePath: string): string {
  return relative(unityRoot, absolutePath).split(sep).join('/')
}

function fallbackId(absolutePath: string): string {
  return unityRelative(absolutePath).replace(/^Assets\//, '').replace(/\.asset$/, '')
}

function isUnityMetadataKey(key: string): boolean {
  return key.startsWith('m_')
}

function isUnityReference(value: unknown): value is {
  fileID: number
  guid: string
  type?: number
} {
  return (
    isRecord(value) &&
    typeof value.fileID === 'number' &&
    typeof value.guid === 'string'
  )
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {}
}

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []
}

function sortObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => compareText(left, right)),
  ) as T
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
