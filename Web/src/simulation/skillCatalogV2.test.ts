import { describe, expect, test } from 'vitest'

import {
  getGameAsset,
  getGameAssetsByKind,
} from '../game-data/catalog'
import type { RuntimeGameAsset } from '../game-data/types'
import {
  CANONICAL_ACTIVE_SKILL_TIMER_IDS_V2,
  CANONICAL_SKILL_TIMER_OWNERS_V2,
  canonicalSkillCatalogV2,
  captureCanonicalSkillCatalogV2,
  type CanonicalSkillCatalogSourceV2,
} from './skillCatalogV2'

function sourceWith(
  replacement: RuntimeGameAsset,
): CanonicalSkillCatalogSourceV2 {
  return Object.freeze({
    get: (kind: string, id: string) =>
      kind === replacement.kind && id === replacement.id
        ? replacement
        : getGameAsset(kind, id),
    list: (kind: string) =>
      kind === replacement.kind
        ? getGameAssetsByKind(kind).map((asset) =>
            asset.id === replacement.id ? replacement : asset,
          )
        : getGameAssetsByKind(kind),
  })
}

describe('closed Canonical Skill V2 catalog', () => {
  test('captures the authored 104-Skill and 134-effect closure', () => {
    expect(canonicalSkillCatalogV2.skillIds).toHaveLength(104)
    expect(canonicalSkillCatalogV2.effectIds).toHaveLength(134)
    expect(new Set(canonicalSkillCatalogV2.effectIds).size).toBe(134)
    expect(canonicalSkillCatalogV2.fragmentSkillIds).toEqual([
      'fragmentAssembly',
      'monetaryPolicy',
      'panelWarranty',
      'productionScaling',
      'progressiveAssembly',
      'regulatedAcademia',
      'terraformingProtocols',
    ])
    expect(canonicalSkillCatalogV2.byId.fragmentAssembly).toMatchObject({
      cost: 1n,
      refundable: true,
      fragment: true,
      unlock: 'fragments',
    })
    expect(Object.isFrozen(canonicalSkillCatalogV2)).toBe(true)
    expect(Object.isFrozen(canonicalSkillCatalogV2.byId)).toBe(true)
    expect(Object.isFrozen(canonicalSkillCatalogV2.byId.fragmentAssembly)).toBe(true)
  })

  test('freezes the exact active and legacy-preserved timer owners', () => {
    expect(CANONICAL_ACTIVE_SKILL_TIMER_IDS_V2).toEqual([
      'androids',
      'pocketAndroids',
      'superRadiantScattering',
    ])
    expect(CANONICAL_SKILL_TIMER_OWNERS_V2).toEqual({
      androids: 'active-production',
      pocketAndroids: 'active-production',
      superRadiantScattering: 'active-production',
      idleElectricSheep: 'legacy-preserved',
    })
  })

  test('rejects duplicate database references', () => {
    const database = getGameAsset('GameData.SkillDatabase', 'SkillDatabase')!
    const skills = database.data.skills as readonly unknown[]
    const replacement = {
      ...database,
      data: {
        skills: [...skills.slice(0, -1), skills[0]],
      },
    } as RuntimeGameAsset
    expect(() => captureCanonicalSkillCatalogV2(sourceWith(replacement))).toThrow(
      'SkillDatabase.skills contains duplicate references.',
    )
  })

  test('rejects an altered Array prototype', () => {
    const database = getGameAsset('GameData.SkillDatabase', 'SkillDatabase')!
    const skills = [...database.data.skills as readonly unknown[]]
    Object.setPrototypeOf(skills, null)
    const replacement = {
      ...database,
      data: { skills },
    } as RuntimeGameAsset
    expect(() => captureCanonicalSkillCatalogV2(sourceWith(replacement))).toThrow(
      'ordinary array',
    )
  })

  test('rejects accessor-backed definitions without invoking the getter', () => {
    const skill = getGameAsset('GameData.SkillDefinition', 'startHereTree')!
    let calls = 0
    const data = { ...skill.data }
    Object.defineProperty(data, 'cost', {
      enumerable: true,
      get() {
        calls += 1
        return 1
      },
    })
    const replacement = { ...skill, data } as RuntimeGameAsset
    expect(() => captureCanonicalSkillCatalogV2(sourceWith(replacement))).toThrow(
      'declared data fields',
    )
    expect(calls).toBe(0)
  })

  test('rejects missing effect closure entries', () => {
    const skill = getGameAsset('GameData.SkillDefinition', 'startHereTree')!
    const replacement = {
      ...skill,
      data: { ...skill.data, effects: [] },
    } as RuntimeGameAsset
    expect(() => captureCanonicalSkillCatalogV2(sourceWith(replacement))).toThrow(
      '134 unique Skill effect references',
    )
  })
})
