import { describe, expect, test } from 'vitest'

import { getGameAsset, getGameAssetsByKind } from '../game-data/catalog'
import type { RuntimeGameAsset } from '../game-data/types'
import {
  REALITY_UPGRADE_IDS_V2,
  canonicalRealityCatalogV2,
  captureRealityCatalogV2,
} from './realityCatalogV2'

const UPGRADE_KIND = 'IdleDysonSwarm.Data.Balance.SimulationUpgradeDefinition'

function sourceWith(
  replacement: RuntimeGameAsset,
  extra: readonly RuntimeGameAsset[] = [],
) {
  return {
    get: (kind: string, id: string) =>
      kind === replacement.kind && id === replacement.id
        ? replacement
        : getGameAsset(kind, id),
    list: (kind: string) => kind === UPGRADE_KIND
      ? [
          ...getGameAssetsByKind(kind).map((asset) =>
            asset.id === replacement.id ? replacement : asset),
          ...extra,
        ]
      : getGameAssetsByKind(kind),
  }
}

describe('closed Reality V2 catalog', () => {
  test('captures the exact authored tuning and 18-upgrade closure', () => {
    expect(canonicalRealityCatalogV2).toMatchObject({
      workerBatchSize: 128n,
      baseWorkerGenerationPerSecond: 4,
      avocadoLogThreshold: 10,
    })
    expect(canonicalRealityCatalogV2.upgradeIds).toEqual(REALITY_UPGRADE_IDS_V2)
    expect(Object.keys(canonicalRealityCatalogV2.upgrades)).toHaveLength(18)
    expect(canonicalRealityCatalogV2.upgrades.translation1).toEqual({
      id: 'translation1',
      cost: 8n,
      prerequisites: [],
      effects: [
        { kind: 'set-owned', key: 'translation1', value: true },
        { kind: 'grant-skill-points', amount: 1n },
      ],
    })
    expect(canonicalRealityCatalogV2.upgrades.doubleTimeOwned.effects).toEqual([
      { kind: 'set-owned', key: 'doubleTimeOwned', value: true },
      { kind: 'set-double-time-bank', seconds: 600 },
    ])
    expect(Object.isFrozen(canonicalRealityCatalogV2.upgrades.translation1.effects)).toBe(true)
  })

  test('rejects missing and duplicate Reality definitions', () => {
    const translation1 = getGameAsset(UPGRADE_KIND, 'translation1')!
    const missingSource = sourceWith(translation1)
    const originalList = missingSource.list
    expect(() => captureRealityCatalogV2({
      ...missingSource,
      list: (kind) => originalList(kind).filter((asset) => asset.id !== 'translation1'),
    })).toThrow('exactly the 18')

    const duplicate = {
      ...translation1,
      id: 'translation1-copy',
    } as RuntimeGameAsset
    expect(() => captureRealityCatalogV2(
      sourceWith(translation1, [duplicate]),
    )).toThrow('duplicate or mismatched identity')
  })

  test('rejects unsupported effects and altered array prototypes', () => {
    const translation1 = getGameAsset(UPGRADE_KIND, 'translation1')!
    const badEffect = {
      ...translation1,
      data: {
        ...translation1.data,
        purchaseEffects: [
          ...(translation1.data.purchaseEffects as readonly unknown[]).slice(0, 1),
          {
            boolValue: 1,
            effectType: 99,
            numericValue: 1,
            targetKey: null,
          },
        ],
      },
    } as RuntimeGameAsset
    expect(() => captureRealityCatalogV2(sourceWith(badEffect))).toThrow(
      'unsupported effect',
    )

    const altered = [...getGameAssetsByKind(UPGRADE_KIND)]
    Object.setPrototypeOf(altered, Object.freeze({}))
    expect(() => captureRealityCatalogV2({
      get: getGameAsset,
      list: (kind) => kind === UPGRADE_KIND
        ? altered as readonly RuntimeGameAsset[]
        : getGameAssetsByKind(kind),
    })).toThrow('ordinary array')

    const extraKey = [...getGameAssetsByKind(UPGRADE_KIND)]
    Object.defineProperty(extraKey, 'extra', { value: true })
    expect(() => captureRealityCatalogV2({
      get: getGameAsset,
      list: (kind) => kind === UPGRADE_KIND
        ? extraKey
        : getGameAssetsByKind(kind),
    })).toThrow('data-only length')

    const symbolKey = [...getGameAssetsByKind(UPGRADE_KIND)]
    Object.defineProperty(symbolKey, Symbol('extra'), { value: true })
    expect(() => captureRealityCatalogV2({
      get: getGameAsset,
      list: (kind) => kind === UPGRADE_KIND
        ? symbolKey
        : getGameAssetsByKind(kind),
    })).toThrow('data-only length')
  })

  test('rejects cyclic authored prerequisite graphs', () => {
    const translation1 = getGameAsset(UPGRADE_KIND, 'translation1')!
    const cyclic = {
      ...translation1,
      data: {
        ...translation1.data,
        prerequisites: [{ key: 'translation2', mustBeOwned: 1 }],
      },
    } as RuntimeGameAsset
    expect(() => captureRealityCatalogV2(sourceWith(cyclic))).toThrow(
      'prerequisite cycle',
    )
  })

  test('rejects structurally valid authored semantic drift', () => {
    const translation1 = getGameAsset(UPGRADE_KIND, 'translation1')!
    const wrongCost = {
      ...translation1,
      data: { ...translation1.data, cost: 9 },
    } as RuntimeGameAsset
    expect(() => captureRealityCatalogV2(sourceWith(wrongCost))).toThrow(
      'exact authored semantics',
    )

    const tuning = getGameAsset(
      'IdleDysonSwarm.Data.Balance.RealitySystemTuning',
      'RealitySystemTuning',
    )!
    const wrongRate = {
      ...tuning,
      data: { ...tuning.data, baseWorkerGenerationSpeed: 5 },
    } as RuntimeGameAsset
    expect(() => captureRealityCatalogV2(sourceWith(wrongRate))).toThrow(
      '4/10 rate contract',
    )
  })

  test('rejects accessor-backed catalog data without invoking the getter', () => {
    const source = getGameAsset(UPGRADE_KIND, 'translation1')!
    let getterCalls = 0
    const data = { ...source.data }
    Object.defineProperty(data, 'cost', {
      enumerable: true,
      get() {
        getterCalls += 1
        return 1
      },
    })
    expect(() => captureRealityCatalogV2(sourceWith({
      ...source,
      data,
    } as RuntimeGameAsset))).toThrow('declared data fields')
    expect(getterCalls).toBe(0)
  })

  test('rejects accessor-backed tuning and upgrade envelopes without invocation', () => {
    const tuning = getGameAsset(
      'IdleDysonSwarm.Data.Balance.RealitySystemTuning',
      'RealitySystemTuning',
    )!
    const translation1 = getGameAsset(UPGRADE_KIND, 'translation1')!
    let getterCalls = 0
    const hostileTuning = Object.create(null)
    Object.defineProperties(hostileTuning, {
      id: { enumerable: true, value: tuning.id },
      kind: {
        enumerable: true,
        get() {
          getterCalls += 1
          return tuning.kind
        },
      },
      data: { enumerable: true, value: tuning.data },
    })
    expect(() => captureRealityCatalogV2({
      get: (kind, id) => kind === tuning.kind && id === tuning.id
        ? hostileTuning
        : getGameAsset(kind, id),
      list: getGameAssetsByKind,
    })).toThrow('declared data fields')

    const hostileUpgrade = Object.create(null)
    Object.defineProperties(hostileUpgrade, {
      id: { enumerable: true, value: translation1.id },
      kind: { enumerable: true, value: translation1.kind },
      data: {
        enumerable: true,
        get() {
          getterCalls += 1
          return translation1.data
        },
      },
    })
    expect(() => captureRealityCatalogV2({
      get: getGameAsset,
      list: (kind) => kind === UPGRADE_KIND
        ? getGameAssetsByKind(kind).map((asset) =>
            asset.id === translation1.id ? hostileUpgrade : asset)
        : getGameAssetsByKind(kind),
    })).toThrow('declared data fields')
    expect(getterCalls).toBe(0)
  })
})
