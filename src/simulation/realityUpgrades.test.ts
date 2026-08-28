import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { bitDecrement, DISCRETE_MAXIMUM } from './numeric'
import {
  findRealityUpgradeCanonicalGaps,
  purchaseRealityUpgrade,
  REALITY_UPGRADE_DEFINITIONS,
  REALITY_UPGRADE_IDS,
  type RealityUpgradeDefinition,
  type RealityUpgradeId,
} from './realityUpgrades'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

const EXPECTED_COSTS = {
  translation1: 8,
  translation2: 16,
  translation3: 32,
  translation4: 64,
  translation5: 128,
  translation6: 256,
  translation7: 512,
  translation8: 1_024,
  speed1: 2_048,
  speed2: 4_096,
  speed3: 8_192,
  speed4: 16_384,
  speed5: 32_768,
  speed6: 65_536,
  speed7: 131_072,
  speed8: 262_144,
  doubleTimeOwned: 5,
  workerAutoConvert: 10,
} as const satisfies Readonly<Record<RealityUpgradeId, number>>

function state(): CanonicalGameStateV1 {
  const initial =
    hydrateGameState(prepareIdb1Save(fixture).prepared).state
  return {
    ...initial,
    skills: {
      ...initial.skills,
      points: 5n,
    },
    reality: {
      ...initial.reality,
      autoGather: false,
    },
    timeline: {
      ...initial.timeline,
      doubleTime: {
        ...initial.timeline.doubleTime,
        unlocked: false,
        enabled: true,
        bankSeconds: 321,
      },
    },
    dream: {
      ...initial.dream,
      strangeMatter: 1_000_000,
      upgrades: Object.fromEntries(
        Object.keys(initial.dream.upgrades).map((key) => [
          key,
          false,
        ]),
      ) as CanonicalGameStateV1['dream']['upgrades'],
    },
  }
}

function withOwned(
  source: CanonicalGameStateV1,
  ...keys: RealityUpgradeId[]
): CanonicalGameStateV1 {
  let candidate = source
  for (const key of keys) {
    if (key === 'doubleTimeOwned') {
      candidate = {
        ...candidate,
        timeline: {
          ...candidate.timeline,
          doubleTime: {
            ...candidate.timeline.doubleTime,
            unlocked: true,
          },
        },
      }
    } else if (key === 'workerAutoConvert') {
      candidate = {
        ...candidate,
        reality: {
          ...candidate.reality,
          autoGather: true,
        },
      }
    } else {
      candidate = {
        ...candidate,
        dream: {
          ...candidate.dream,
          upgrades: {
            ...candidate.dream.upgrades,
            [key]: true,
          },
        },
      }
    }
  }
  return candidate
}

function definitionsWith(
  key: RealityUpgradeId,
  definition: RealityUpgradeDefinition,
): ReadonlyMap<RealityUpgradeId, RealityUpgradeDefinition> {
  const definitions = new Map(REALITY_UPGRADE_DEFINITIONS)
  definitions.set(key, definition)
  return definitions
}

describe('exported Reality upgrade definitions', () => {
  test('loads all 18 authored definitions with exact costs and no gaps', () => {
    expect(REALITY_UPGRADE_DEFINITIONS.size).toBe(18)
    expect([...REALITY_UPGRADE_DEFINITIONS.keys()]).toEqual(
      expect.arrayContaining([...REALITY_UPGRADE_IDS]),
    )
    for (const key of REALITY_UPGRADE_IDS) {
      expect(REALITY_UPGRADE_DEFINITIONS.get(key)?.cost).toBe(
        EXPECTED_COSTS[key],
      )
    }
    expect(findRealityUpgradeCanonicalGaps()).toEqual([])
  })

  test('preserves both prerequisite chains and nullable skill-point targets', () => {
    for (const prefix of ['translation', 'speed'] as const) {
      for (let tier = 1; tier <= 8; tier++) {
        const key = `${prefix}${tier}` as RealityUpgradeId
        const definition = REALITY_UPGRADE_DEFINITIONS.get(key)!
        expect(definition.prerequisites).toEqual(
          tier === 1
            ? []
            : [
                {
                  key: `${prefix}${tier - 1}`,
                  mustBeOwned: true,
                },
              ],
        )
        expect(definition.purchaseEffects).toEqual([
          {
            effectType: 0,
            targetKey: key,
            boolValue: true,
            numericValue: 0,
          },
          {
            effectType: 2,
            targetKey: null,
            boolValue: true,
            numericValue: 1,
          },
        ])
      }
    }
  })

  test('preserves exact authored quality-of-life effects', () => {
    expect(
      REALITY_UPGRADE_DEFINITIONS.get('doubleTimeOwned'),
    ).toMatchObject({
      prerequisites: [],
      purchaseEffects: [
        {
          effectType: 0,
          targetKey: 'doubleTimeOwned',
          boolValue: true,
          numericValue: 0,
        },
        {
          effectType: 8,
          targetKey: 'doubleTime',
          boolValue: true,
          numericValue: 600,
        },
      ],
    })
    expect(
      REALITY_UPGRADE_DEFINITIONS.get('workerAutoConvert'),
    ).toMatchObject({
      prerequisites: [],
      purchaseEffects: [
        {
          effectType: 1,
          targetKey: 'workerAutoConvert',
          boolValue: true,
          numericValue: 0,
        },
      ],
    })
  })
})

describe('Reality upgrade purchases', () => {
  test('purchases Translation I atomically with strange matter and one skill point', () => {
    const initial = state()
    const result = purchaseRealityUpgrade(initial, 'translation1')

    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      code: 'purchased',
      definitionGap: null,
    })
    expect(result.candidate).not.toBe(initial)
    expect(result.candidate.dream.strangeMatter).toBe(999_992)
    expect(result.candidate.dream.upgrades.translation1).toBe(true)
    expect(result.candidate.skills.points).toBe(6n)
    expect(result.candidate.dyson).toBe(initial.dyson)
    expect(result.candidate.reality).toBe(initial.reality)
    expect(result.candidate.timeline).toBe(initial.timeline)
    expect(initial.dream.strangeMatter).toBe(1_000_000)
    expect(initial.dream.upgrades.translation1).toBe(false)
    expect(initial.skills.points).toBe(5n)
  })

  test('spends Strange Matter above the legacy Int64 ceiling', () => {
    const initial = state()
    const aboveLegacyMaximum = Number(DISCRETE_MAXIMUM) + 42
    const result = purchaseRealityUpgrade({
      ...initial,
      dream: {
        ...initial.dream,
        strangeMatter: aboveLegacyMaximum,
      },
    }, 'translation1')

    expect(result.code).toBe('purchased')
    expect(result.candidate.dream.strangeMatter)
      .toBe(bitDecrement(aboveLegacyMaximum))
  })

  test('charges one representable Strange Matter step at the double cap', () => {
    const initial = state()
    const result = purchaseRealityUpgrade({
      ...initial,
      dream: { ...initial.dream, strangeMatter: Number.MAX_VALUE },
    }, 'translation1')

    expect(result.code).toBe('purchased')
    expect(result.candidate.dream.strangeMatter)
      .toBe(bitDecrement(Number.MAX_VALUE))
  })

  test('enforces each chain while keeping Speed I independent', () => {
    const initial = state()
    expect(
      purchaseRealityUpgrade(initial, 'translation2').code,
    ).toBe('prerequisites_not_met')
    expect(
      purchaseRealityUpgrade(initial, 'speed2').code,
    ).toBe('prerequisites_not_met')

    const translation2 = purchaseRealityUpgrade(
      withOwned(initial, 'translation1'),
      'translation2',
    )
    expect(translation2.code).toBe('purchased')
    expect(translation2.candidate.dream.strangeMatter).toBe(
      999_984,
    )
    expect(translation2.candidate.skills.points).toBe(6n)

    const speed1 = purchaseRealityUpgrade(initial, 'speed1')
    expect(speed1.code).toBe('purchased')
    expect(speed1.candidate.dream.strangeMatter).toBe(997_952)
    expect(speed1.candidate.dream.upgrades.speed1).toBe(true)
    expect(speed1.candidate.skills.points).toBe(6n)
  })

  test('uses must-be-unowned prerequisites as authored', () => {
    const source =
      REALITY_UPGRADE_DEFINITIONS.get('translation1')!
    const definition: RealityUpgradeDefinition = {
      ...source,
      prerequisites: [
        { key: 'speed1', mustBeOwned: false },
      ],
    }
    const definitions = definitionsWith(
      'translation1',
      definition,
    )

    expect(
      purchaseRealityUpgrade(
        state(),
        'translation1',
        definitions,
      ).code,
    ).toBe('purchased')
    expect(
      purchaseRealityUpgrade(
        withOwned(state(), 'speed1'),
        'translation1',
        definitions,
      ).code,
    ).toBe('prerequisites_not_met')
  })

  test('rounds skill points to even and saturates at Int64 maximum', () => {
    const source =
      REALITY_UPGRADE_DEFINITIONS.get('translation1')!
    const definition: RealityUpgradeDefinition = {
      ...source,
      purchaseEffects: source.purchaseEffects.map((effect) =>
        effect.effectType === 2
          ? { ...effect, numericValue: 2.5 }
          : effect,
      ),
    }
    const rounded = purchaseRealityUpgrade(
      state(),
      'translation1',
      definitionsWith('translation1', definition),
    )
    expect(rounded.candidate.skills.points).toBe(7n)

    const maximum = state()
    const saturated = purchaseRealityUpgrade(
      {
        ...maximum,
        skills: {
          ...maximum.skills,
          points: DISCRETE_MAXIMUM,
        },
      },
      'translation1',
    )
    expect(saturated.code).toBe('purchased')
    expect(saturated.candidate.skills.points).toBe(
      DISCRETE_MAXIMUM,
    )
  })

  test('unlocks permanent Double Time without recreating its retired mutable bank', () => {
    const initial = state()
    const result = purchaseRealityUpgrade(
      initial,
      'doubleTimeOwned',
    )

    expect(result.code).toBe('purchased')
    expect(result.candidate.dream.strangeMatter).toBe(999_995)
    expect(result.candidate.timeline.doubleTime).toEqual({
      ...initial.timeline.doubleTime,
      unlocked: true,
      enabled: false,
      bankSeconds: 0,
      rate: 0,
    })
    expect(result.candidate.reality).toBe(initial.reality)
    expect(initial.timeline.doubleTime).toMatchObject({
      unlocked: false,
      enabled: true,
      bankSeconds: 321,
    })
  })

  test('enables automatic influence gathering from the save-field effect', () => {
    const initial = state()
    const result = purchaseRealityUpgrade(
      initial,
      'workerAutoConvert',
    )

    expect(result.code).toBe('purchased')
    expect(result.candidate.dream.strangeMatter).toBe(999_990)
    expect(result.candidate.reality.autoGather).toBe(true)
    expect(result.candidate.timeline).toBe(initial.timeline)
    expect(initial.reality.autoGather).toBe(false)
  })

  test('rejects ordinary purchase gates without creating a candidate', () => {
    const initial = state()
    const cases = [
      purchaseRealityUpgrade(initial, 'not-real'),
      purchaseRealityUpgrade(
        withOwned(initial, 'translation1'),
        'translation1',
      ),
      purchaseRealityUpgrade(initial, 'translation2'),
      purchaseRealityUpgrade(
        {
          ...initial,
          dream: {
            ...initial.dream,
            strangeMatter: 7,
          },
        },
        'translation1',
      ),
    ]

    expect(cases.map((result) => result.code)).toEqual([
      'unknown_upgrade',
      'already_owned',
      'prerequisites_not_met',
      'insufficient_strange_matter',
    ])
    for (const result of cases) {
      expect(result.accepted).toBe(false)
      expect(result.changed).toBe(false)
    }
    expect(cases[0].candidate).toBe(initial)
  })

  test('fails closed for missing, zero-cost, or unsupported definitions', () => {
    const missing = new Map(REALITY_UPGRADE_DEFINITIONS)
    missing.delete('translation1')
    const missingState = state()
    expect(
      purchaseRealityUpgrade(missingState, 'translation1', missing)
        .code,
    ).toBe('missing_definition')

    const source =
      REALITY_UPGRADE_DEFINITIONS.get('translation1')!
    const zeroCostState = state()
    const zeroCost = purchaseRealityUpgrade(
      zeroCostState,
      'translation1',
      definitionsWith('translation1', {
        ...source,
        cost: 0,
      }),
    )
    expect(zeroCost.code).toBe('invalid_definition')
    expect(zeroCost.definitionGap).toBe(
      'invalid_cost:translation1',
    )
    expect(zeroCost.candidate).toBe(zeroCostState)

    const unsupportedState = state()
    const unsupported = purchaseRealityUpgrade(
      unsupportedState,
      'translation1',
      definitionsWith('translation1', {
        ...source,
        purchaseEffects: [
          ...source.purchaseEffects,
          {
            effectType: 99,
            targetKey: null,
            boolValue: true,
            numericValue: 0,
          },
        ],
      }),
    )
    expect(unsupported.code).toBe('invalid_definition')
    expect(unsupported.definitionGap).toBe(
      'unsupported_effect:translation1:2',
    )
    expect(unsupported.candidate).toBe(unsupportedState)
  })

  test('fails closed for invalid canonical balances', () => {
    const initial = state()
    const invalid = {
      ...initial,
      dream: {
        ...initial.dream,
        strangeMatter: -1,
      },
    }
    const result = purchaseRealityUpgrade(
      invalid,
      'translation1',
    )
    expect(result.code).toBe('invalid_state')
    expect(result.candidate).toBe(invalid)
  })
})
