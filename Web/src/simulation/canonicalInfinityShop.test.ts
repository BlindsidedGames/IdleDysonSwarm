import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  availableCanonicalInfinityShopPoints,
  CANONICAL_INFINITY_SHOP_ITEM_IDS,
  CANONICAL_INFINITY_SHOP_CONSTANTS,
  purchaseCanonicalInfinityShopItem,
} from './canonicalInfinityShop'
import { DISCRETE_MAXIMUM } from './numeric'

const fixtureText = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function shopState(): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixtureText).prepared,
  ).state
  return {
    ...source,
    infinity: {
      ...source.infinity,
      points: 100n,
      spentPoints: 0n,
      secretsOfTheUniverse: 0n,
      permanentSkillPoints: 0n,
      retainedFacilities: {
        assembly_lines: false,
        ai_managers: false,
        servers: false,
        data_centers: false,
        planets: false,
      },
      automationUnlocked: {
        research: false,
        bots: false,
      },
    },
  }
}

describe('canonical Infinity shop', () => {
  test('publishes the Unity card order', () => {
    expect(CANONICAL_INFINITY_SHOP_ITEM_IDS).toEqual([
      'secret',
      'permanent-skill-point',
      'unlock-research-automation',
      'unlock-bot-automation',
      'retain-assembly-lines',
      'retain-ai-managers',
      'retain-servers',
      'retain-data-centers',
      'retain-planets',
    ])
  })

  test('reports only valid unspent Infinity Points', () => {
    const state = shopState()
    expect(availableCanonicalInfinityShopPoints(state)).toBe(100n)
    expect(
      availableCanonicalInfinityShopPoints({
        ...state,
        infinity: {
          ...state.infinity,
          points: 4n,
          spentPoints: 5n,
        },
      }),
    ).toBe(0n)
  })

  test('purchases secrets one point at a time up to Unity maximum 27', () => {
    const original = deepFreeze(shopState())
    const purchased = purchaseCanonicalInfinityShopItem(
      original,
      'secret',
    )

    expect(purchased).toMatchObject({
      accepted: true,
      changed: true,
      code: 'purchased',
      cost: 1n,
      state: {
        infinity: {
          spentPoints: 1n,
          secretsOfTheUniverse: 1n,
        },
      },
    })
    expect(original.infinity.spentPoints).toBe(0n)
    expect(original.infinity.secretsOfTheUniverse).toBe(0n)

    const maximum = {
      ...original,
      infinity: {
        ...original.infinity,
        secretsOfTheUniverse:
          CANONICAL_INFINITY_SHOP_CONSTANTS.maximumSecrets,
      },
    }
    const rejected = purchaseCanonicalInfinityShopItem(
      maximum,
      'secret',
    )
    expect(rejected).toMatchObject({
      accepted: false,
      changed: false,
      code: 'maximum-reached',
    })
    expect(rejected.state).toBe(maximum)
  })

  test('adds a permanent and live skill point before immediate auto-assignment', () => {
    const source = shopState()
    const original: CanonicalGameStateV1 = deepFreeze({
      ...source,
      skills: {
        ...source.skills,
        points: 0n,
        activeAutoAssignment: ['startHereTree'],
        byId: {
          ...source.skills.byId,
          startHereTree: {
            owned: false,
            level: 0,
            timerSeconds: 0,
            secondaryTimerSeconds: 0,
          },
        },
      },
    })

    const result = purchaseCanonicalInfinityShopItem(
      original,
      'permanent-skill-point',
    )

    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      state: {
        infinity: {
          spentPoints: 1n,
          permanentSkillPoints: 1n,
        },
        skills: {
          points: 0n,
          byId: {
            startHereTree: { owned: true },
          },
        },
      },
      autoAssignedSkillIds: ['startHereTree'],
    })
    expect(original.skills.byId.startHereTree?.owned).toBe(false)
  })

  test('rejects saturated skill output before debiting Infinity Points', () => {
    const original = deepFreeze({
      ...shopState(),
      skills: {
        ...shopState().skills,
        points: DISCRETE_MAXIMUM,
      },
    })
    const result = purchaseCanonicalInfinityShopItem(
      original,
      'permanent-skill-point',
    )

    expect(result).toMatchObject({
      accepted: false,
      changed: false,
      code: 'output-maxed',
    })
    expect(result.state).toBe(original)
    expect(result.state.infinity.spentPoints).toBe(0n)
  })

  test('enforces the retained-facility chain and grants ten manual facilities', () => {
    const original = deepFreeze(shopState())
    const blocked = purchaseCanonicalInfinityShopItem(
      original,
      'retain-ai-managers',
    )
    expect(blocked).toMatchObject({
      accepted: false,
      changed: false,
      code: 'prerequisite-not-met',
    })
    expect(blocked.state).toBe(original)

    const itemIds = [
      'retain-assembly-lines',
      'retain-ai-managers',
      'retain-servers',
      'retain-data-centers',
      'retain-planets',
    ] as const
    const facilityIds = [
      'assembly_lines',
      'ai_managers',
      'servers',
      'data_centers',
      'planets',
    ] as const
    let current = original
    for (let index = 0; index < itemIds.length; index += 1) {
      const before = current.dyson.facilities[facilityIds[index]!][1]
      const result = purchaseCanonicalInfinityShopItem(
        current,
        itemIds[index]!,
      )
      expect(result.accepted).toBe(true)
      expect(
        result.state.dyson.facilities[facilityIds[index]!][1],
      ).toBe(
        before +
          CANONICAL_INFINITY_SHOP_CONSTANTS.retainedFacilityQuantity,
      )
      current = result.state
    }

    expect(current.infinity.spentPoints).toBe(5n)
    expect(current.infinity.retainedFacilities).toEqual({
      assembly_lines: true,
      ai_managers: true,
      servers: true,
      data_centers: true,
      planets: true,
    })
    expect(current.meta.tutorialComplete).toBe(true)
  })

  test('rejects an unrepresentable retained grant without setting its flag or spending', () => {
    const source = shopState()
    const original = deepFreeze({
      ...source,
      dyson: {
        ...source.dyson,
        facilities: {
          ...source.dyson.facilities,
          assembly_lines: [0, Number.MAX_VALUE] as const,
        },
      },
    })

    const result = purchaseCanonicalInfinityShopItem(
      original,
      'retain-assembly-lines',
    )
    expect(result).toMatchObject({
      accepted: false,
      changed: false,
      code: 'output-maxed',
    })
    expect(result.state).toBe(original)
    expect(result.state.infinity.spentPoints).toBe(0n)
    expect(
      result.state.infinity.retainedFacilities.assembly_lines,
    ).toBe(false)
  })

  test('purchases both independent automation unlocks for three points each', () => {
    const research = purchaseCanonicalInfinityShopItem(
      shopState(),
      'unlock-research-automation',
    )
    expect(research).toMatchObject({
      accepted: true,
      cost: 3n,
      state: {
        infinity: {
          spentPoints: 3n,
          automationUnlocked: {
            research: true,
            bots: false,
          },
        },
      },
    })

    const bots = purchaseCanonicalInfinityShopItem(
      research.state,
      'unlock-bot-automation',
    )
    expect(bots).toMatchObject({
      accepted: true,
      cost: 3n,
      state: {
        infinity: {
          spentPoints: 6n,
          automationUnlocked: {
            research: true,
            bots: true,
          },
        },
      },
    })
  })

  test('fails closed for insufficient, overspent, repeated, and unknown purchases', () => {
    const noPoints = {
      ...shopState(),
      infinity: {
        ...shopState().infinity,
        points: 2n,
        spentPoints: 0n,
      },
    }
    const insufficient = purchaseCanonicalInfinityShopItem(
      noPoints,
      'unlock-bot-automation',
    )
    expect(insufficient.code).toBe(
      'insufficient-infinity-points',
    )
    expect(insufficient.state).toBe(noPoints)

    const overspent = {
      ...shopState(),
      infinity: {
        ...shopState().infinity,
        points: 2n,
        spentPoints: 3n,
      },
    }
    const invalid = purchaseCanonicalInfinityShopItem(
      overspent,
      'secret',
    )
    expect(invalid.code).toBe('invalid-state')
    expect(invalid.state).toBe(overspent)

    const unlocked = {
      ...shopState(),
      infinity: {
        ...shopState().infinity,
        automationUnlocked: {
          research: true,
          bots: false,
        },
      },
    }
    const repeated = purchaseCanonicalInfinityShopItem(
      unlocked,
      'unlock-research-automation',
    )
    expect(repeated.code).toBe('already-purchased')
    expect(repeated.state).toBe(unlocked)

    const unknown = purchaseCanonicalInfinityShopItem(
      shopState(),
      'not-an-item',
    )
    expect(unknown.code).toBe('unknown-item')
  })
})

function deepFreeze<T>(value: T): T {
  if (
    value !== null &&
    typeof value === 'object' &&
    !Object.isFrozen(value)
  ) {
    Object.freeze(value)
    for (const child of Object.values(value)) {
      deepFreeze(child)
    }
  }
  return value
}
