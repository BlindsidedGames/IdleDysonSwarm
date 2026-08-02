import {
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  createCapturedInfinityAssetLookup,
} from '../simulation/canonicalEventTimeModel'
import {
  materializeDysonResearchEffects,
} from '../simulation/dysonResearchEffects'
import {
  deriveMegaStructureRates,
  type MegaStructureAssetLookup,
} from '../simulation/megaStructureRates'
import completeCatalogJson from './generated/catalog.json'
import runtimeCatalogJson from './generated/runtime-catalog.json'
import {
  RUNTIME_CATALOG_FIELDS_BY_KIND,
  type RuntimeCatalogAssetKind,
} from './runtimeCatalogContract'
import type {
  ExportedGameDataCatalog,
  RuntimeAssetValue,
  RuntimeGameAsset,
  RuntimeGameDataCatalog,
} from './types'

const completeCatalog =
  completeCatalogJson as unknown as ExportedGameDataCatalog
const runtimeCatalog =
  runtimeCatalogJson as unknown as RuntimeGameDataCatalog
const completeByKey = new Map(
  completeCatalog.assets.map((asset) => [
    assetKey(asset.kind, asset.id),
    asset,
  ]),
)
const runtimeByKey = new Map(
  runtimeCatalog.assets.map((asset) => [
    assetKey(asset.kind, asset.id),
    asset,
  ]),
)

describe('generated browser runtime catalog', () => {
  test('contains exactly the retained kinds and authored field values', () => {
    expect(runtimeCatalog.formatVersion).toBe(1)
    expect(Object.keys(runtimeCatalog.countsByKind).sort()).toEqual(
      Object.keys(RUNTIME_CATALOG_FIELDS_BY_KIND).sort(),
    )
    expect(runtimeCatalog.assets).toHaveLength(371)

    for (const asset of runtimeCatalog.assets) {
      expect(isRuntimeKind(asset.kind)).toBe(true)
      if (!isRuntimeKind(asset.kind)) continue
      const complete = completeByKey.get(
        assetKey(asset.kind, asset.id),
      )
      expect(complete).toBeDefined()
      if (complete === undefined) continue
      const retainedFields =
        RUNTIME_CATALOG_FIELDS_BY_KIND[asset.kind]
      const expectedData = Object.fromEntries(
        retainedFields.flatMap((field) =>
          Object.hasOwn(complete.data, field)
            ? [[field, compactReferences(complete.data[field])]]
            : [],
        ),
      )

      expect(asset.data).toEqual(expectedData)
      expect(Object.keys(asset.data).sort()).toEqual(
        Object.keys(expectedData).sort(),
      )
      expect(asset).not.toHaveProperty('path')
      expect(asset).not.toHaveProperty('guid')
      expect(asset).not.toHaveProperty('sourceHash')
      assertIdOnlyReferences(asset.data)
    }
  })

  test('keeps every canonically dereferenced asset reference closed', () => {
    const skillDatabase = requireRuntimeAsset(
      'GameData.SkillDatabase',
      'SkillDatabase',
    )
    const skillIds = referenceIds(skillDatabase.data.skills)
    expect(skillIds).toHaveLength(104)
    for (const skillId of skillIds) {
      const skill = requireRuntimeAsset(
        'GameData.SkillDefinition',
        skillId,
      )
      for (const effectId of referenceIds(skill.data.effects)) {
        requireRuntimeAsset('GameData.EffectDefinition', effectId)
      }
    }

    for (const research of assetsByKind(
      'GameData.ResearchDefinition',
    )) {
      for (const effectId of referenceIds(research.data.effects)) {
        requireRuntimeAsset('GameData.EffectDefinition', effectId)
      }
    }

    for (const effect of assetsByKind(
      'GameData.EffectDefinition',
    )) {
      for (const conditionId of referenceIds([
        effect.data._condition,
      ])) {
        const condition = runtimeCatalog.assets.find(
          (candidate) => candidate.id === conditionId,
        )
        expect(condition).toBeDefined()
        expect(condition?.kind.startsWith(
          'IdleDysonSwarm.Data.Conditions.',
        )).toBe(true)
      }
    }
  })

  test('matches complete-catalog outcomes for representative canonical readers', () => {
    const runtimeLookup = catalogLookup(runtimeCatalog.assets)
    const completeLookup = catalogLookup(completeCatalog.assets)
    const tuning = Object.freeze({
      panelsPerSecMulti: 1.25,
      scienceBoostPercent: 0.07,
      moneyMultiUpgradePercent: 0.06,
      assemblyLineUpgradePercent: 0.08,
      aiManagerUpgradePercent: 0.09,
      serverUpgradePercent: 0.1,
      dataCenterUpgradePercent: 0.11,
      planetUpgradePercent: 0.12,
      matrioshkaUpgradePercent: 0.13,
      birchUpgradePercent: 0.14,
      galacticUpgradePercent: 0.15,
    })
    const levels = Object.freeze({
      'research.money_multiplier': 4,
      'research.panel_lifetime_4': 1,
      'research.galactic_brains_upgrade': 2,
    })

    expect(
      materializeDysonResearchEffects(
        levels,
        tuning,
        {},
        runtimeLookup,
      ),
    ).toEqual(
      materializeDysonResearchEffects(
        levels,
        tuning,
        {},
        completeLookup,
      ),
    )

    const megaState = Object.freeze({
      dyson: {
        facilities: {
          matrioshka_brains: [2, 3] as const,
          birch_planets: [4, 1] as const,
          galactic_brains: [1, 1] as const,
        },
      },
      quantum: {
        unlocks: {
          matrioshkaBrains: true,
          birchPlanets: true,
          galacticBrains: true,
        },
      },
    })
    const modifiers = Object.freeze({
      matrioshka_brains: 2,
      birch_planets: 3,
      galactic_brains: 4,
    })
    expect(
      deriveMegaStructureRates(
        megaState,
        modifiers,
        runtimeLookup as MegaStructureAssetLookup,
      ),
    ).toEqual(
      deriveMegaStructureRates(
        megaState,
        modifiers,
        completeLookup as MegaStructureAssetLookup,
      ),
    )

    const runtimeInfinity =
      createCapturedInfinityAssetLookup(runtimeCatalog.assets)
    const completeInfinity =
      createCapturedInfinityAssetLookup(completeCatalog.assets)
    for (const asset of assetsByKind(
      'GameData.SkillDefinition',
    )) {
      expect(
        runtimeInfinity(asset.kind, asset.id),
      ).toEqual(
        projectCompleteAsset(
          asset.kind,
          completeInfinity(asset.kind, asset.id),
        ),
      )
    }
  })

  test('prevents production modules from importing the complete catalog', () => {
    const sourceRoot = resolve(
      new URL('.', import.meta.url).pathname.slice(1),
      '..',
    )
    const offenders = walkSource(sourceRoot)
      .filter(
        (path) =>
          /\.(?:ts|tsx)$/.test(path) &&
          !path.endsWith('.test.ts') &&
          !path.endsWith('.test.tsx'),
      )
      .filter((path) =>
        /game-data\/generated\/catalog\.json|generated\/catalog\.json/.test(
          readFileSync(path, 'utf8').replaceAll('\\', '/'),
        ),
      )
      .map((path) => path.replaceAll('\\', '/'))

    expect(offenders).toEqual([])
  })
})

function compactReferences(value: unknown): RuntimeAssetValue {
  if (Array.isArray(value)) return value.map(compactReferences)
  if (value === null || typeof value !== 'object') {
    return value as RuntimeAssetValue
  }
  const record = value as Readonly<Record<string, unknown>>
  if (
    Object.hasOwn(record, 'id') &&
    (typeof record.id === 'string' || record.id === null) &&
    typeof record.guid === 'string' &&
    typeof record.fileId === 'number' &&
    (typeof record.path === 'string' || record.path === null)
  ) {
    return { id: record.id }
  }
  return Object.fromEntries(
    Object.entries(record).map(([key, child]) => [
      key,
      compactReferences(child),
    ]),
  )
}

function assertIdOnlyReferences(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertIdOnlyReferences)
    return
  }
  if (value === null || typeof value !== 'object') return
  const record = value as Readonly<Record<string, unknown>>
  if (Object.hasOwn(record, 'id')) {
    expect(record).not.toHaveProperty('guid')
    expect(record).not.toHaveProperty('path')
    expect(record).not.toHaveProperty('fileId')
  }
  Object.values(record).forEach(assertIdOnlyReferences)
}

function projectCompleteAsset(
  kind: string,
  asset: RuntimeGameAsset | undefined,
): RuntimeGameAsset | undefined {
  if (asset === undefined || !isRuntimeKind(kind)) return undefined
  const fields = RUNTIME_CATALOG_FIELDS_BY_KIND[kind]
  return {
    id: asset.id,
    kind: asset.kind,
    data: Object.fromEntries(
      fields.flatMap((field) =>
        Object.hasOwn(asset.data, field)
          ? [[field, compactReferences(asset.data[field])]]
          : [],
      ),
    ),
  }
}

function catalogLookup(
  assets: readonly RuntimeGameAsset[],
): (kind: string, id: string) => RuntimeGameAsset | undefined {
  const byKey = new Map(
    assets.map((asset) => [assetKey(asset.kind, asset.id), asset]),
  )
  return (kind, id) => byKey.get(assetKey(kind, id))
}

function requireRuntimeAsset(
  kind: string,
  id: string,
): RuntimeGameAsset {
  const asset = runtimeByKey.get(assetKey(kind, id))
  expect(asset).toBeDefined()
  if (asset === undefined) {
    throw new Error(`Missing runtime asset '${kind}:${id}'.`)
  }
  return asset
}

function assetsByKind(kind: string): readonly RuntimeGameAsset[] {
  return runtimeCatalog.assets.filter((asset) => asset.kind === kind)
}

function referenceIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (
      entry !== null &&
      typeof entry === 'object' &&
      'id' in entry &&
      typeof entry.id === 'string'
    ) {
      return [entry.id]
    }
    return []
  })
}

function isRuntimeKind(value: string): value is RuntimeCatalogAssetKind {
  return Object.hasOwn(RUNTIME_CATALOG_FIELDS_BY_KIND, value)
}

function assetKey(kind: string, id: string): string {
  return `${kind}\0${id}`
}

function walkSource(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = resolve(root, name)
    return statSync(path).isDirectory() ? walkSource(path) : [path]
  })
}
