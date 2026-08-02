import { describe, expect, test } from 'vitest'
import catalog from './generated/catalog.json'
import skillMigrationData from './generated/skill-migration-data.json'

describe('deterministic Unity game-data catalog', () => {
  test('contains the complete stable-ID gameplay catalogs', () => {
    expect(catalog.formatVersion).toBe(1)
    expect(catalog.countsByKind['GameData.SkillDefinition']).toBe(104)
    expect(catalog.countsByKind['GameData.EffectDefinition']).toBe(149)
    expect(catalog.countsByKind['GameData.FacilityDefinition']).toBe(8)
    expect(catalog.countsByKind['GameData.ResearchDefinition']).toBe(14)
    expect(
      catalog.countsByKind[
        'IdleDysonSwarm.Data.Balance.SimulationUpgradeDefinition'
      ],
    ).toBe(61)
  })

  test('has deterministic source hashes and no duplicate kind/id pairs', () => {
    const keys = catalog.assets.map((asset) => `${asset.kind}::${asset.id}`)
    expect(new Set(keys).size).toBe(keys.length)
    expect(
      catalog.assets.every((asset) => /^[a-f0-9]{64}$/.test(asset.sourceHash)),
    ).toBe(true)
  })

  test('resolves internal Unity GUID references to catalog paths', () => {
    const paths = new Set(catalog.assets.map((asset) => asset.path))
    const unresolvedInternal: string[] = []
    const inspect = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(inspect)
        return
      }
      if (value === null || typeof value !== 'object') return
      const record = value as Record<string, unknown>
      if (
        typeof record.guid === 'string' &&
        Object.hasOwn(record, 'fileId') &&
        typeof record.path === 'string' &&
        !paths.has(record.path)
      ) {
        unresolvedInternal.push(record.path)
      }
      Object.values(record).forEach(inspect)
    }
    catalog.assets.forEach((asset) => inspect(asset.data))
    expect(unresolvedInternal).toEqual([])
  })

  test('exports the compact skill dependency contract used by migration', () => {
    expect(Object.keys(skillMigrationData)).toHaveLength(104)
    expect(skillMigrationData.assemblyLineTree.requiredSkillIds).toContain(
      'startHereTree',
    )
  })
})
