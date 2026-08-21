import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { describe, expect, test } from 'vitest'
import legacyIdMapsJson from './generated/legacy-id-maps.json'
import runtimeCatalogJson from './generated/runtime-catalog.json'
import skillTreePresentationJson from './generated/skill-tree-presentation.json'
import handoffProvenance from './authored/unity-handoff/provenance.json'

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
const generatedIconDirectory = fileURLToPath(
  new URL('../ui/assets/skill-icons/', import.meta.url),
)

describe('Web-owned skill-tree presentation handoff', () => {
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

  test('retains frozen source provenance and complete Web-optimized icons', async () => {
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

    expect(presentation.sources.graphPrefab.sourceHash).toBe(
      handoffProvenance.historicalSkillSources.graphPrefabSha256,
    )
    expect(presentation.sources.nodePrefab).toMatchObject({
      guid: handoffProvenance.historicalSkillSources.nodePrefabGuid,
      sourceHash: handoffProvenance.historicalSkillSources.nodePrefabSha256,
    })

    const expectedFileNames = presentation.nodes
      .map((node) => node.icon.fileName)
      .sort(compareText)
    const actualFileNames = readdirSync(generatedIconDirectory)
      .filter((name) => /\.(?:png|webp)$/i.test(name))
      .sort(compareText)
    expect(actualFileNames).toEqual(expectedFileNames)
    const iconManifest = actualFileNames
      .map((fileName) => {
        const hash = createHash('sha256')
          .update(readFileSync(new URL(`../ui/assets/skill-icons/${fileName}`, import.meta.url)))
          .digest('hex')
        return `${hash}  Web/src/ui/assets/skill-icons/${fileName}\n`
      })
      .join('')
    expect(createHash('sha256').update(iconManifest).digest('hex')).toBe(
      handoffProvenance.skillIcons.sortedSha256ManifestHash,
    )

    for (const node of presentation.nodes) {
      expect(node.icon.fileName).toBe(`${node.skillId}.webp`)
      expect(node.icon.sourcePath).toMatch(
        /^Assets\/Sprites\/SkillIcons\/.+\.png$/,
      )
      expect(node.icon.sourceGuid).toMatch(/^[a-f0-9]+$/)
      expect(node.icon.sourceHash).toMatch(/^[a-f0-9]{64}$/)

      const metadata = await sharp(
        fileURLToPath(
          new URL(`../ui/assets/skill-icons/${node.icon.fileName}`, import.meta.url),
        ),
      ).metadata()
      expect(metadata).toMatchObject({
        format: 'webp',
        width: 256,
        height: 256,
        hasAlpha: true,
      })
    }
  }, 30_000)
})

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
