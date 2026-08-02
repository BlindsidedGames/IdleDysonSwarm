import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { DISCRETE_MAXIMUM } from './numeric'
import {
  availableQuantumPoints,
  findQuantumUpgradeCanonicalGaps,
  purchaseQuantumUpgrade,
  purchaseQuantumUpgradeBulk,
  QUANTUM_CONSTANTS,
  QUANTUM_UPGRADE_DEFINITIONS,
  quantumUpgradeCost,
} from './quantumUpgrades'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function state(points = 1_000_000n): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixture).prepared,
  ).state
  return {
    ...source,
    quantum: {
      ...source.quantum,
      pointsEarned: points,
      pointsSpent: 0n,
      divisionsPurchased: 0n,
      permanentSecrets: 0n,
      influenceSpeedBonus: 0n,
      cashBonusLevels: 0n,
      scienceBonusLevels: 0n,
      unlocks: Object.fromEntries(
        Object.keys(source.quantum.unlocks).map((key) => [key, false]),
      ) as unknown as CanonicalGameStateV1['quantum']['unlocks'],
    },
    avocado: { ...source.avocado, unlocked: false },
    infinity: {
      ...source.infinity,
      secretsOfTheUniverse: 0n,
      automationUnlocked: { research: false, bots: false },
    },
  }
}

describe('canonical Quantum upgrades', () => {
  test('covers all 20 service upgrades with 17 assets and 3 Unity fallbacks', () => {
    expect(findQuantumUpgradeCanonicalGaps()).toEqual([])
    expect(QUANTUM_UPGRADE_DEFINITIONS.size).toBe(20)
    expect(
      [...QUANTUM_UPGRADE_DEFINITIONS.values()].filter(
        (definition) => definition.source === 'unity-asset',
      ),
    ).toHaveLength(17)
    expect(
      [...QUANTUM_UPGRADE_DEFINITIONS.values()]
        .filter(
          (definition) => definition.source === 'unity-fallback',
        )
        .map((definition) => definition.id),
    ).toEqual([
      'MatrioshkaBrains',
      'BirchPlanets',
      'GalacticBrains',
    ])
  })

  test('uses exact authored flat costs and Division exponential costs', () => {
    const source = state()
    expect(quantumUpgradeCost(source, 'BotMultitasking')).toBe(1n)
    expect(quantumUpgradeCost(source, 'QuantumEntanglement')).toBe(12n)
    expect(quantumUpgradeCost(source, 'Avocado')).toBe(42n)
    expect(quantumUpgradeCost(source, 'GalacticBrains')).toBe(20n)

    const division18 = {
      ...source,
      quantum: {
        ...source.quantum,
        divisionsPurchased: 18n,
      },
    }
    expect(quantumUpgradeCost(source, 'Division')).toBe(2n)
    expect(quantumUpgradeCost(division18, 'Division')).toBe(524_288n)
  })

  test('buys one-time unlocks atomically and Automation enables both Infinity toggles', () => {
    const source = state()
    const before = structuredClone(source)
    const automation = purchaseQuantumUpgrade(source, 'Automation')

    expect(automation).toMatchObject({
      accepted: true,
      changed: true,
      code: 'purchased',
      cost: 1n,
    })
    expect(automation.state.quantum.pointsSpent).toBe(1n)
    expect(automation.state.quantum.unlocks.automation).toBe(true)
    expect(automation.state.infinity.automationUnlocked).toEqual({
      research: true,
      bots: true,
    })
    expect(source).toEqual(before)
    expect(
      purchaseQuantumUpgrade(automation.state, 'Automation'),
    ).toMatchObject({
      accepted: false,
      changed: false,
      code: 'already-maxed',
      state: automation.state,
    })

    const mega = purchaseQuantumUpgrade(source, 'MatrioshkaBrains')
    expect(mega.cost).toBe(5n)
    expect(mega.state.quantum.unlocks.matrioshkaBrains).toBe(true)
  })

  test('adds Secrets to permanent and current-session storage with the 27 cap', () => {
    const base = state()
    const source: CanonicalGameStateV1 = {
      ...base,
      quantum: {
        ...base.quantum,
        unlocks: {
          ...base.quantum.unlocks,
          botMultitasking: true,
        },
      },
    }
    const purchased = purchaseQuantumUpgrade(source, 'Secrets')
    expect(purchased.state.quantum.permanentSecrets).toBe(3n)
    expect(purchased.state.infinity.secretsOfTheUniverse).toBe(3n)

    const nearlyMaxed: CanonicalGameStateV1 = {
      ...source,
      quantum: {
        ...source.quantum,
        permanentSecrets: 26n,
      },
      infinity: {
        ...source.infinity,
        secretsOfTheUniverse: 26n,
      },
    }
    const final = purchaseQuantumUpgrade(nearlyMaxed, 'Secrets')
    expect(final.state.quantum.permanentSecrets).toBe(
      QUANTUM_CONSTANTS.maximumSecrets,
    )
    expect(final.state.infinity.secretsOfTheUniverse).toBe(
      QUANTUM_CONSTANTS.maximumSecrets,
    )
    expect(purchaseQuantumUpgrade(final.state, 'Secrets').code)
      .toBe('already-maxed')
  })

  test('applies repeatable levels and stops Division at 19 purchases', () => {
    const base = state()
    let current: CanonicalGameStateV1 = {
      ...base,
      quantum: {
        ...base.quantum,
        unlocks: {
          ...base.quantum.unlocks,
          botMultitasking: true,
          doubleInfinityPoints: true,
        },
      },
    }
    for (const id of [
      'InfluenceSpeed',
      'CashBonus',
      'ScienceBonus',
    ] as const) {
      current = purchaseQuantumUpgrade(current, id).state
    }
    expect(current.quantum.influenceSpeedBonus).toBe(4n)
    expect(current.quantum.cashBonusLevels).toBe(1n)
    expect(current.quantum.scienceBonusLevels).toBe(1n)

    const division18: CanonicalGameStateV1 = {
      ...current,
      quantum: {
        ...current.quantum,
        divisionsPurchased: 18n,
      },
    }
    const final = purchaseQuantumUpgrade(division18, 'Division')
    expect(final.accepted).toBe(true)
    expect(final.state.quantum.divisionsPurchased).toBe(19n)
    expect(purchaseQuantumUpgrade(final.state, 'Division').code)
      .toBe('already-maxed')
  })

  test('unlocks Avocado in its canonical domain and all remaining flags in Quantum', () => {
    let current = purchaseQuantumUpgrade(state(), 'Avocado').state
    expect(current.avocado.unlocked).toBe(true)
    for (const [id, key] of [
      ['BotMultitasking', 'botMultitasking'],
      ['DoubleIP', 'doubleInfinityPoints'],
      ['BreakTheLoop', 'breakTheLoop'],
      ['QuantumEntanglement', 'quantumEntanglement'],
      ['Fragments', 'fragments'],
      ['Purity', 'purity'],
      ['Terra', 'terra'],
      ['Power', 'power'],
      ['Paragade', 'paragade'],
      ['Stellar', 'stellar'],
      ['MatrioshkaBrains', 'matrioshkaBrains'],
      ['BirchPlanets', 'birchPlanets'],
      ['GalacticBrains', 'galacticBrains'],
    ] as const) {
      current = purchaseQuantumUpgrade(current, id).state
      expect(current.quantum.unlocks[key]).toBe(true)
    }
  })

  test('enforces Secrets, Division, and sequential mega-structure UI gates', () => {
    const source = state()
    expect(purchaseQuantumUpgrade(source, 'Secrets').code)
      .toBe('prerequisites-not-met')
    expect(purchaseQuantumUpgrade(source, 'Division').code)
      .toBe('prerequisites-not-met')
    expect(purchaseQuantumUpgrade(source, 'BirchPlanets').code)
      .toBe('prerequisites-not-met')
    expect(purchaseQuantumUpgrade(source, 'GalacticBrains').code)
      .toBe('prerequisites-not-met')
  })

  test('rejects corrupt, unaffordable, and saturated transactions without mutation', () => {
    const poor = state(0n)
    expect(availableQuantumPoints(poor)).toBe(0n)
    expect(purchaseQuantumUpgrade(poor, 'Avocado')).toMatchObject({
      accepted: false,
      code: 'insufficient-points',
      state: poor,
    })
    expect(purchaseQuantumUpgrade(poor, 'Unknown')).toMatchObject({
      accepted: false,
      code: 'unknown-upgrade',
      state: poor,
    })

    const overspent = {
      ...poor,
      quantum: {
        ...poor.quantum,
        pointsEarned: 1n,
        pointsSpent: 2n,
      },
    }
    expect(availableQuantumPoints(overspent)).toBe(0n)

    const saturated = {
      ...state(DISCRETE_MAXIMUM),
      quantum: {
        ...state(DISCRETE_MAXIMUM).quantum,
        pointsSpent: DISCRETE_MAXIMUM,
        cashBonusLevels: DISCRETE_MAXIMUM,
      },
    }
    expect(purchaseQuantumUpgrade(saturated, 'CashBonus'))
      .toMatchObject({
        accepted: false,
        state: saturated,
      })
  })

  test('purchases repeatable Quantum boosters atomically in fixed and maximum quantities', () => {
    const source = state(25n)
    const cash = purchaseQuantumUpgradeBulk(source, 'CashBonus', 10n)
    expect(cash).toMatchObject({ accepted: true, cost: 10n })
    expect(cash.state.quantum.cashBonusLevels).toBe(10n)
    expect(cash.state.quantum.pointsSpent).toBe(10n)

    const influence = purchaseQuantumUpgradeBulk(
      cash.state,
      'InfluenceSpeed',
      3n,
    )
    expect(influence.state.quantum.influenceSpeedBonus).toBe(12n)
    expect(influence.state.quantum.pointsSpent).toBe(13n)

    const science = purchaseQuantumUpgradeBulk(
      influence.state,
      'ScienceBonus',
      'max',
    )
    expect(science).toMatchObject({ accepted: true, cost: 12n })
    expect(science.state.quantum.scienceBonusLevels).toBe(12n)
    expect(science.state.quantum.pointsSpent).toBe(25n)
  })

  test('keeps fixed bulk purchases all-or-nothing and rejects bulk on one-time upgrades', () => {
    const source = state(5n)
    expect(purchaseQuantumUpgradeBulk(source, 'CashBonus', 10n))
      .toMatchObject({ accepted: false, code: 'insufficient-points', state: source })
    expect(purchaseQuantumUpgradeBulk(source, 'BotMultitasking', 2n))
      .toMatchObject({ accepted: false, code: 'unknown-upgrade', state: source })
  })
})
