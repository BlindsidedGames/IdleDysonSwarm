import { createHash } from 'node:crypto'
import {
  readFileSync,
  readdirSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { describe, expect, test } from 'vitest'
import legacyIdMapsJson from './generated/legacy-id-maps.json'
import runtimeCatalogJson from './generated/runtime-catalog.json'
import skillTreePresentationJson from './generated/skill-tree-presentation.json'

interface SkillTreePresentationNode {
  readonly skillId: string
  readonly legacySkillKey: number
  readonly x: number
  readonly y: number
  readonly displayName: string
  readonly description: string
  readonly technicalDescription: string
  readonly cost: number
  readonly messageIds: {
    readonly displayName: string
    readonly description: string
    readonly technicalDescription: string
  }
  readonly icon: {
    readonly fileName: string
    readonly sourcePath: string
    readonly sourceGuid: string
    readonly sourceHash: string
  }
}

interface SkillTreePresentationCatalog {
  readonly formatVersion: number
  readonly nodeCount: number
  readonly sources: {
    readonly graphPrefab: {
      readonly path: string
      readonly sourceHash: string
    }
    readonly iconDirectory: string
    readonly nodePrefab: {
      readonly guid: string
      readonly path: string
      readonly sourceHash: string
    }
    readonly skillDefinitions: string
  }
  readonly nodes: readonly SkillTreePresentationNode[]
}

const presentation =
  skillTreePresentationJson as SkillTreePresentationCatalog
const repositoryRoot = resolve(
  fileURLToPath(new URL('../../../', import.meta.url)),
)
const generatedIconDirectory = fileURLToPath(
  new URL('../ui/assets/skill-icons/', import.meta.url),
)

describe('Unity skill-tree presentation export', () => {
  test('covers every canonical skill exactly once', () => {
    expect(presentation.formatVersion).toBe(1)
    expect(presentation.nodeCount).toBe(104)
    expect(presentation.nodes).toHaveLength(104)

    const skillIds = presentation.nodes.map((node) => node.skillId)
    const legacyKeys = presentation.nodes.map(
      (node) => node.legacySkillKey,
    )
    expect(new Set(skillIds).size).toBe(104)
    expect(new Set(legacyKeys).size).toBe(104)
    expect(skillIds).toEqual([...skillIds].sort(compareText))

    const runtimeSkillIds = runtimeCatalogJson.assets
      .filter((asset) => asset.kind === 'GameData.SkillDefinition')
      .map((asset) => asset.id)
      .sort(compareText)
    expect(skillIds).toEqual(runtimeSkillIds)

    for (const node of presentation.nodes) {
      expect(
        legacyIdMapsJson.skillLegacyKeyToId[
          String(node.legacySkillKey) as keyof typeof legacyIdMapsJson.skillLegacyKeyToId
        ],
      ).toBe(node.skillId)
      expect(Number.isFinite(node.x)).toBe(true)
      expect(Number.isFinite(node.y)).toBe(true)
    }
  })

  test('retains authored copy while removing TMP rich-text markup', () => {
    const richTextTag = /<\/?[a-z][^>]*>/i
    for (const node of presentation.nodes) {
      expect(node.displayName.trim()).not.toBe('')
      expect(node.description.trim()).not.toBe('')
      expect(node.technicalDescription.trim()).not.toBe('')
      expect(node.displayName).not.toMatch(richTextTag)
      expect(node.description).not.toMatch(richTextTag)
      expect(node.technicalDescription).not.toMatch(richTextTag)
      expect(node.messageIds).toEqual({
        displayName: `skills.node.${node.skillId}.name`,
        description: `skills.node.${node.skillId}.description`,
        technicalDescription: `skills.node.${node.skillId}.technical`,
      })
    }
  })

  test('keeps presentation costs equal to the canonical runtime catalog', () => {
    const runtimeCostBySkillId = new Map(
      runtimeCatalogJson.assets
        .filter((asset) => asset.kind === 'GameData.SkillDefinition')
        .map((asset) => [asset.id, asset.data.cost]),
    )
    for (const node of presentation.nodes) {
      expect(node.cost).toBe(runtimeCostBySkillId.get(node.skillId))
    }
  })

  test('tracks graph sources and deterministic Web-optimized Unity icons', async () => {
    expect(presentation.sources.graphPrefab.path).toBe(
      'Assets/Prefabs/Panel.prefab',
    )
    expect(presentation.sources.nodePrefab.path).toBe(
      'Assets/Prefabs/SkillButtonPrefab.prefab',
    )
    expect(presentation.sources.iconDirectory).toBe(
      'Assets/Sprites/SkillIcons',
    )
    expect(presentation.sources.skillDefinitions).toBe(
      'Assets/Data/Skills/*.asset',
    )

    expect(
      hashNormalizedText(
        readUnitySource(presentation.sources.graphPrefab.path),
      ),
    ).toBe(presentation.sources.graphPrefab.sourceHash)
    expect(
      hashNormalizedText(
        readUnitySource(presentation.sources.nodePrefab.path),
      ),
    ).toBe(presentation.sources.nodePrefab.sourceHash)

    const expectedFileNames = presentation.nodes
      .map((node) => node.icon.fileName)
      .sort(compareText)
    const actualFileNames = readdirSync(generatedIconDirectory)
      .filter((name) => /\.(?:png|webp)$/i.test(name))
      .sort(compareText)
    expect(actualFileNames).toEqual(expectedFileNames)

    const deterministicSamples = new Set([
      presentation.nodes.at(0)?.skillId,
      presentation.nodes.at(Math.floor(presentation.nodes.length / 2))?.skillId,
      presentation.nodes.at(-1)?.skillId,
    ])
    for (const node of presentation.nodes) {
      expect(node.icon.fileName).toBe(`${node.skillId}.webp`)
      expect(node.icon.sourcePath).toMatch(
        /^Assets\/Sprites\/SkillIcons\/.+\.png$/,
      )
      expect(node.icon.sourceGuid).toMatch(/^[a-f0-9]+$/)
      expect(node.icon.sourceHash).toMatch(/^[a-f0-9]{64}$/)

      const sourceBytes = readFileSync(
        resolve(
          repositoryRoot,
          ...node.icon.sourcePath.split('/'),
        ),
      )
      const generatedBytes = readFileSync(
        resolve(generatedIconDirectory, node.icon.fileName),
      )
      const metadata = await sharp(generatedBytes).metadata()
      expect(metadata).toMatchObject({
        format: 'webp',
        width: 256,
        height: 256,
        hasAlpha: true,
      })
      if (deterministicSamples.has(node.skillId)) {
        const expectedBytes = await sharp(sourceBytes)
          .resize(256, 256, {
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
        expect(generatedBytes.equals(expectedBytes)).toBe(true)
      }
      expect(hashBytes(sourceBytes)).toBe(node.icon.sourceHash)
    }
  }, 30_000)
})

function readUnitySource(path: string): string {
  return readFileSync(
    resolve(repositoryRoot, ...path.split('/')),
    'utf8',
  )
}

function hashNormalizedText(value: string): string {
  return createHash('sha256')
    .update(value.replace(/\r\n?/g, '\n'))
    .digest('hex')
}

function hashBytes(value: NodeJS.ArrayBufferView): string {
  return createHash('sha256').update(value).digest('hex')
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
