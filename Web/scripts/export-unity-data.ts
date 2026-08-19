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
 * - Projects the authored Unity skill-tree node positions and presentation
 *   copy, and creates deterministic Web-optimized icons under stable skill-ID
 *   names while retaining hashes of the authoritative Unity PNG sources.
 * - Delegates YAML parsing to `yaml` and file/cryptographic primitives to Node.
 *
 * Interacts with:
 * - Reads Unity assets, metadata, `SkillIdMap.cs`, and `ResearchIdMap.cs`.
 * - Reads `src/game-data/runtimeCatalogContract.ts` for the transport-only
 *   runtime field allowlist.
 * - Writes or verifies the complete provenance catalog, the projected runtime
 *   catalog, migration catalogs and skill-tree presentation catalog under
 *   `src/game-data/generated`.
 * - Writes or byte-verifies generated skill icons under
 *   `src/ui/assets/skill-icons`.
 * - Called by package scripts and release/checkpoint validation.
 *
 * Change notes:
 * - Asset roots, stable-ID rules, reference resolution, source-hash
 *   normalization, output names, or sorting changes affect generated catalogs,
 *   parity fixtures, migrations, and every runtime consumer of exported data.
 * - The runtime projection must select authored values only. It must never
 *   derive costs, unlocks, effects, rates, previews or other gameplay rules.
 * - Coordinate those changes with generated outputs, catalog tests, migration
 *   data, and `docs/parity-fixtures.md`.
 * - The skill-tree graph parser intentionally targets the serialized component
 *   IDs in `SkillButtonPrefab.prefab`; changing that prefab hierarchy requires
 *   updating the constants and parity checks together.
 */
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { parse } from 'yaml'
import {
  RUNTIME_CATALOG_FIELDS_BY_KIND,
  type RuntimeCatalogAssetKind,
} from '../src/game-data/runtimeCatalogContract'

type UnknownRecord = Record<string, unknown>

interface AssetSource {
  path: string
  absolutePath: string
  guid: string
  raw: string
  body: UnknownRecord
}

interface SkillTreeNodePresentation {
  skillId: string
  legacySkillKey: number
  x: number
  y: number
  displayName: string
  description: string
  technicalDescription: string
  cost: number
  messageIds: {
    displayName: string
    description: string
    technicalDescription: string
  }
  icon: {
    fileName: string
    sourcePath: string
    sourceGuid: string
    sourceHash: string
  }
}

const expectedSkillNodeCount = 104
const skillIconSizePixels = 256
const skillNodeRootTransformFileId = '8686025716392041846'
const skillNodeManagerFileId = '8686025716392041845'
const skillNodeIconFileId = '5184747946528573067'

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
const skillIconOutputDirectory = resolve(
  webRoot,
  'src/ui/assets/skill-icons',
)
const skillTreeGraphPath = resolve(
  unityRoot,
  'Assets/Prefabs/Panel.prefab',
)
const skillNodePrefabPath = resolve(
  unityRoot,
  'Assets/Prefabs/SkillButtonPrefab.prefab',
)
const skillIconSourceDirectory = resolve(
  unityRoot,
  'Assets/Sprites/SkillIcons',
)
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

for (const input of [
  skillTreeGraphPath,
  skillNodePrefabPath,
  skillIconSourceDirectory,
]) {
  if (!existsSync(input)) {
    throw new Error(`Unity skill-tree source does not exist: ${input}`)
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
const runtimeAssets = assets.flatMap((asset) => {
  if (!isRuntimeCatalogKind(asset.kind)) return []
  const fields = RUNTIME_CATALOG_FIELDS_BY_KIND[asset.kind]
  const data = sortObject(
    Object.fromEntries(
      fields.flatMap((field) =>
        Object.hasOwn(asset.data, field)
          ? [[field, projectRuntimeValue(asset.data[field])]]
          : [],
      ),
    ),
  )
  return [{ id: asset.id, kind: asset.kind, data }]
})
const runtimeCountsByKind: Record<string, number> = {}
for (const asset of runtimeAssets) {
  runtimeCountsByKind[asset.kind] =
    (runtimeCountsByKind[asset.kind] ?? 0) + 1
}
const runtimeCatalog = sortObject({
  formatVersion: 1,
  countsByKind: sortObject(runtimeCountsByKind),
  assets: runtimeAssets,
})

const legacyIdMaps = sortObject({
  skillLegacyKeyToId: extractSkillMap(
    readFileSync(resolve(unityRoot, 'Assets/Scripts/Data/SkillIdMap.cs'), 'utf8'),
  ),
  researchIds: extractResearchIds(
    readFileSync(resolve(unityRoot, 'Assets/Scripts/Data/ResearchIdMap.cs'), 'utf8'),
  ),
})

const skillTreePresentation = exportSkillTreePresentation(
  legacyIdMaps.skillLegacyKeyToId,
)

emit('catalog.json', catalog)
emit('runtime-catalog.json', runtimeCatalog)
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
emit('skill-tree-presentation.json', skillTreePresentation)
await emitSkillIcons(skillTreePresentation.nodes)

console.log(
  `${checkOnly ? 'Verified' : 'Exported'} ${assets.length} Unity data assets across ${Object.keys(countsByKind).length} types, ${runtimeAssets.length} projected runtime assets and ${skillTreePresentation.nodeCount} skill-tree presentation nodes.`,
)

function exportSkillTreePresentation(
  skillLegacyKeyToId: Record<string, string>,
): {
  formatVersion: 1
  nodeCount: number
  sources: UnknownRecord
  nodes: SkillTreeNodePresentation[]
} {
  const graphRaw = readFileSync(skillTreeGraphPath, 'utf8')
  const nodePrefabGuid = readGuid(`${skillNodePrefabPath}.meta`)
  if (!nodePrefabGuid) {
    throw new Error(
      `Unity skill node prefab is missing a GUID: ${skillNodePrefabPath}.meta`,
    )
  }

  const iconPathByGuid = new Map<string, string>()
  for (const iconPath of walk(skillIconSourceDirectory, '.png').sort(
    compareText,
  )) {
    const guid = readGuid(`${iconPath}.meta`)
    if (!guid) {
      throw new Error(`Unity skill icon is missing a GUID: ${iconPath}.meta`)
    }
    if (iconPathByGuid.has(guid)) {
      throw new Error(`Duplicate Unity skill icon GUID '${guid}'.`)
    }
    iconPathByGuid.set(guid, iconPath)
  }

  const skillAssetsById = new Map(
    assets
      .filter((asset) => asset.kind === 'GameData.SkillDefinition')
      .map((asset) => [asset.id, asset]),
  )
  const nodeDocuments = extractSkillNodeDocuments(graphRaw, nodePrefabGuid)
  if (nodeDocuments.length !== expectedSkillNodeCount) {
    throw new Error(
      `Expected ${expectedSkillNodeCount} Unity skill nodes, found ${nodeDocuments.length}.`,
    )
  }

  const seenKeys = new Set<number>()
  const seenSkillIds = new Set<string>()
  const nodes = nodeDocuments
    .map((document) => {
      const legacySkillKey = requiredIntegerModification(
        document,
        nodePrefabGuid,
        skillNodeManagerFileId,
        'skillKey',
      )
      if (seenKeys.has(legacySkillKey)) {
        throw new Error(
          `Duplicate Unity skill-tree legacy key '${legacySkillKey}'.`,
        )
      }
      seenKeys.add(legacySkillKey)

      const skillId = skillLegacyKeyToId[String(legacySkillKey)]
      if (!skillId) {
        throw new Error(
          `Unity skill-tree key '${legacySkillKey}' has no stable skill ID.`,
        )
      }
      if (seenSkillIds.has(skillId)) {
        throw new Error(`Duplicate Unity skill-tree skill ID '${skillId}'.`)
      }
      seenSkillIds.add(skillId)

      const skillAsset = skillAssetsById.get(skillId)
      if (!skillAsset) {
        throw new Error(
          `Unity skill-tree skill '${skillId}' has no SkillDefinition asset.`,
        )
      }
      const displayName = requiredString(
        skillAsset.data.displayName,
        `${skillId}.displayName`,
      )
      const description = plainText(
        requiredString(
          skillAsset.data.description,
          `${skillId}.description`,
        ),
      )
      const technicalDescription = plainText(
        requiredString(
          skillAsset.data.technicalDescription,
          `${skillId}.technicalDescription`,
        ),
      )
      const cost = requiredFiniteNumber(
        skillAsset.data.cost,
        `${skillId}.cost`,
      )
      const iconGuid = requiredObjectReferenceGuid(
        document,
        nodePrefabGuid,
        skillNodeIconFileId,
        'm_Sprite',
      )
      const iconSourcePath = iconPathByGuid.get(iconGuid)
      if (!iconSourcePath) {
        throw new Error(
          `Unity skill '${skillId}' icon GUID '${iconGuid}' is not in Assets/Sprites/SkillIcons.`,
        )
      }

      return {
        skillId,
        legacySkillKey,
        x: requiredNumberModification(
          document,
          nodePrefabGuid,
          skillNodeRootTransformFileId,
          'm_AnchoredPosition.x',
        ),
        y: requiredNumberModification(
          document,
          nodePrefabGuid,
          skillNodeRootTransformFileId,
          'm_AnchoredPosition.y',
        ),
        displayName: plainText(displayName),
        description,
        technicalDescription,
        cost,
        messageIds: {
          displayName: `skills.node.${skillId}.name`,
          description: `skills.node.${skillId}.description`,
          technicalDescription: `skills.node.${skillId}.technical`,
        },
        icon: {
          fileName: `${skillId}.webp`,
          sourcePath: unityRelative(iconSourcePath),
          sourceGuid: iconGuid,
          sourceHash: hashBytes(readFileSync(iconSourcePath)),
        },
      }
    })
    .sort((left, right) => compareText(left.skillId, right.skillId))

  if (skillAssetsById.size !== nodes.length) {
    const missing = [...skillAssetsById.keys()]
      .filter((skillId) => !seenSkillIds.has(skillId))
      .sort(compareText)
    throw new Error(
      `Unity skill definitions and graph nodes are not one-to-one. Missing graph nodes: ${missing.join(', ')}`,
    )
  }

  return {
    formatVersion: 1,
    nodeCount: nodes.length,
    sources: sortObject({
      graphPrefab: sortObject({
        path: unityRelative(skillTreeGraphPath),
        sourceHash: hashText(graphRaw),
      }),
      iconDirectory: unityRelative(skillIconSourceDirectory),
      nodePrefab: sortObject({
        guid: nodePrefabGuid,
        path: unityRelative(skillNodePrefabPath),
        sourceHash: hashText(readFileSync(skillNodePrefabPath, 'utf8')),
      }),
      skillDefinitions: 'Assets/Data/Skills/*.asset',
    }),
    nodes,
  }
}

function extractSkillNodeDocuments(
  graphRaw: string,
  nodePrefabGuid: string,
): string[] {
  const withSentinel = `${graphRaw.replace(/\r\n?/g, '\n')}\n--- END\n`
  return [
    ...withSentinel.matchAll(
      /^--- !u!1001 &\d+\nPrefabInstance:\n(?<body>[\s\S]*?)(?=^--- )/gm,
    ),
  ]
    .map((match) => match.groups?.body ?? '')
    .filter((document) =>
      document.includes(
        `m_SourcePrefab: {fileID: 100100000, guid: ${nodePrefabGuid}, type: 3}`,
      ),
    )
}

function requiredIntegerModification(
  document: string,
  prefabGuid: string,
  targetFileId: string,
  propertyPath: string,
): number {
  const value = requiredNumberModification(
    document,
    prefabGuid,
    targetFileId,
    propertyPath,
  )
  if (!Number.isInteger(value)) {
    throw new Error(
      `Unity prefab modification '${propertyPath}' must be an integer.`,
    )
  }
  return value
}

function requiredNumberModification(
  document: string,
  prefabGuid: string,
  targetFileId: string,
  propertyPath: string,
): number {
  const modification = requiredPrefabModification(
    document,
    prefabGuid,
    targetFileId,
    propertyPath,
  )
  const value = Number(modification.value)
  if (!Number.isFinite(value)) {
    throw new Error(
      `Unity prefab modification '${propertyPath}' is not a finite number.`,
    )
  }
  return Object.is(value, -0) ? 0 : value
}

function requiredObjectReferenceGuid(
  document: string,
  prefabGuid: string,
  targetFileId: string,
  propertyPath: string,
): string {
  const modification = requiredPrefabModification(
    document,
    prefabGuid,
    targetFileId,
    propertyPath,
  )
  const guid =
    /\bguid:\s*([a-f0-9]+)\b/.exec(modification.objectReference)?.[1]
  if (!guid) {
    throw new Error(
      `Unity prefab modification '${propertyPath}' has no object GUID.`,
    )
  }
  return guid
}

function requiredPrefabModification(
  document: string,
  prefabGuid: string,
  targetFileId: string,
  propertyPath: string,
): { value: string; objectReference: string } {
  const escapedPath = escapeRegExp(propertyPath)
  const match = new RegExp(
    `^    - target: \\{fileID: ${targetFileId}, guid: ${prefabGuid}, type: 3\\}\\n` +
      `      propertyPath: ${escapedPath}\\n` +
      '      value: (?<value>[^\\n]*)\\n' +
      '      objectReference: (?<objectReference>[^\\n]*)$',
    'm',
  ).exec(document)
  if (!match?.groups) {
    throw new Error(
      `Missing Unity prefab modification '${propertyPath}' on '${targetFileId}'.`,
    )
  }
  return {
    value: match.groups.value,
    objectReference: match.groups.objectReference,
  }
}

async function emitSkillIcons(
  nodes: readonly SkillTreeNodePresentation[],
): Promise<void> {
  if (!existsSync(skillIconOutputDirectory)) {
    if (checkOnly) {
      throw new Error(
        'Generated skill icon directory is missing. Run npm run data:export.',
      )
    }
    mkdirSync(skillIconOutputDirectory, { recursive: true })
  }
  const expectedFileNames = new Set(nodes.map((node) => node.icon.fileName))
  const existingFileNames = readdirSync(skillIconOutputDirectory)
    .filter((name) => /\.(?:png|webp)$/i.test(name))
    .sort(compareText)
  const unexpectedFileNames = existingFileNames.filter(
    (name) => !expectedFileNames.has(name),
  )

  if (checkOnly && unexpectedFileNames.length > 0) {
    throw new Error(
      `Generated skill icon directory has stale files: ${unexpectedFileNames.join(', ')}`,
    )
  }
  if (!checkOnly) {
    for (const name of unexpectedFileNames) {
      unlinkSync(resolve(skillIconOutputDirectory, name))
    }
  }

  for (const node of nodes) {
    const source = resolve(unityRoot, ...node.icon.sourcePath.split('/'))
    const destination = resolve(
      skillIconOutputDirectory,
      node.icon.fileName,
    )
    const sourceBytes = readFileSync(source)
    if (hashBytes(sourceBytes) !== node.icon.sourceHash) {
      throw new Error(
        `Unity skill icon changed during export: ${node.icon.sourcePath}`,
      )
    }
    const optimizedBytes = await sharp(sourceBytes)
      .resize(skillIconSizePixels, skillIconSizePixels, {
        fit: 'inside',
        kernel: 'lanczos3',
        withoutEnlargement: true,
      })
      .webp({
        alphaQuality: 100,
        effort: 6,
        quality: 90,
        smartSubsample: true,
      })
      .toBuffer()
    if (checkOnly) {
      const destinationBytes = existsSync(destination)
        ? readFileSync(destination)
        : null
      if (
        destinationBytes === null ||
        !optimizedBytes.equals(destinationBytes)
      ) {
        throw new Error(
          `${node.icon.fileName} is stale. Run npm run data:export after Unity icon changes.`,
        )
      }
    } else {
      writeFileSync(destination, optimizedBytes)
    }
  }
}

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

function isRuntimeCatalogKind(
  value: string,
): value is RuntimeCatalogAssetKind {
  return Object.hasOwn(RUNTIME_CATALOG_FIELDS_BY_KIND, value)
}

function projectRuntimeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(projectRuntimeValue)
  if (!isRecord(value)) return value
  if (isExportedAssetReference(value)) {
    return sortObject({ id: value.id })
  }
  return sortObject(
    Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        projectRuntimeValue(entry),
      ]),
    ),
  )
}

function isExportedAssetReference(
  value: UnknownRecord,
): value is UnknownRecord & { id: string | null } {
  return (
    Object.hasOwn(value, 'id') &&
    (typeof value.id === 'string' || value.id === null) &&
    typeof value.guid === 'string' &&
    typeof value.fileId === 'number' &&
    (typeof value.path === 'string' || value.path === null)
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

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Unity presentation field '${label}' is empty.`)
  }
  return value
}

function requiredFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Unity presentation field '${label}' is not numeric.`)
  }
  return Object.is(value, -0) ? 0 : value
}

function plainText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line, index, lines) =>
      line.length > 0 ||
      (index > 0 &&
        index < lines.length - 1 &&
        lines[index - 1]?.length !== 0),
    )
    .join('\n')
    .trim()
}

function hashText(value: string): string {
  return createHash('sha256')
    .update(value.replace(/\r\n?/g, '\n'))
    .digest('hex')
}

function hashBytes(value: NodeJS.ArrayBufferView): string {
  return createHash('sha256').update(value).digest('hex')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sortObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => compareText(left, right)),
  ) as T
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
