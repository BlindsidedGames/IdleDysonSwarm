import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { routeCanonicalGameCommand } from '../application/canonicalGameCommands'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { PreparedSave, prepareIdb1Save } from '../save/prepare'
import { deserializeWebSave, serializeWebSave } from '../save/serialization'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import { quantumCashMultiplier, quantumScienceMultiplier } from './dysonPrestigeEffects'
import { DISCRETE_MAXIMUM } from './numeric'
import { availableQuantumPoints } from './quantumUpgrades'

const session = hydrateGameState(prepareIdb1Save(readFileSync(
  new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url),
  'utf8',
)).prepared)

function derive(state: CanonicalGameStateV1) {
  return deriveBasicDysonState(state, session.compatibilityTuning,
    { permanentDoubleIp: false }, session.skillEffectEvaluationSnapshot)
}

function buyMax(state: CanonicalGameStateV1, upgradeId: 'CashBonus' | 'ScienceBonus') {
  return routeCanonicalGameCommand(state, {
    kind: 'quantum.purchase-upgrade', upgradeId, quantity: 'max',
  }, {
    runtimeCarriers: {
      compatibilityTuning: session.compatibilityTuning,
      skillEffectEvaluationSnapshot: session.skillEffectEvaluationSnapshot,
      storedTimeCheater: false,
      selectedSkillPresetSlot: 1,
    },
    runtimeEvaluation: {
      evaluate(candidate) {
        const result = derive(candidate)
        return result.ok
          ? { accepted: true, snapshot: result.value.nextEvaluationSnapshot }
          : { accepted: false, code: 'derivation-failed', issues: result.issues }
      },
    },
  })
}

function roundTrip(state: CanonicalGameStateV1) {
  const text = serializeWebSave(session.prepare(state).copyValidatedState())
  return hydrateGameState(PreparedSave.fromDecoded(deserializeWebSave(text))).state
}

describe('Quantum bonus signed64 numeric range', () => {
  test.each([0n, 1n, BigInt(Number.MAX_SAFE_INTEGER),
    BigInt(Number.MAX_SAFE_INTEGER) + 1n,
    BigInt(Number.MAX_SAFE_INTEGER) + 2n, DISCRETE_MAXIMUM])(
    'derives finite production from %s exact levels', (levels) => {
      const quantum = { ...session.state.quantum, cashBonusLevels: levels, scienceBonusLevels: levels }
      expect(quantumCashMultiplier(quantum)).toBe(1 + Number(levels) * 0.05)
      expect(quantumScienceMultiplier(quantum)).toBe(1 + Number(levels) * 0.05)
      const result = derive({ ...session.state, quantum })
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      expect(Number.isFinite(result.value.globals.moneyMultiplier)).toBe(true)
      expect(Number.isFinite(result.value.globals.scienceMultiplier)).toBe(true)
    },
  )

  test.each([-1n, DISCRETE_MAXIMUM + 1n, 10n ** 400n])(
    'still rejects invalid ownership %s', (levels) => {
      expect(() => quantumCashMultiplier({ cashBonusLevels: levels })).toThrow()
      expect(() => quantumScienceMultiplier({ scienceBonusLevels: levels })).toThrow()
      expect(derive({ ...session.state, quantum: {
        ...session.state.quantum, cashBonusLevels: levels,
      } }).ok).toBe(false)
    },
  )

  test.each((['CashBonus', 'ScienceBonus'] as const).flatMap((id) =>
    [BigInt(Number.MAX_SAFE_INTEGER) + 2n, DISCRETE_MAXIMUM]
      .map((balance) => ({ id, balance })),
  ))(
    '$id Buy Max commits $balance exact levels and reloads', ({ id, balance }) => {
      const key = id === 'CashBonus' ? 'cashBonusLevels' : 'scienceBonusLevels'
      // Neither tested balance is exactly representable as a JavaScript number.
      const initial = { ...session.state, quantum: {
        ...session.state.quantum, pointsEarned: balance, pointsSpent: 0n, [key]: 0n,
      } }
      const purchase = buyMax(initial, id)
      expect(purchase.accepted).toBe(true)
      expect(purchase.state.quantum[key]).toBe(balance)
      expect(purchase.state.quantum.pointsSpent).toBe(balance)
      expect(availableQuantumPoints(purchase.state)).toBe(0n)
      expect(initial.quantum[key]).toBe(0n)
      const loaded = roundTrip(purchase.state)
      expect(loaded.quantum).toEqual(purchase.state.quantum)
      expect(derive(loaded).ok).toBe(true)
    },
  )

  test.each(['CashBonus', 'ScienceBonus'] as const)(
    '%s buys only remaining signed64 capacity and preserves excess Shards', (id) => {
      const key = id === 'CashBonus' ? 'cashBonusLevels' : 'scienceBonusLevels'
      const initial = { ...session.state, quantum: {
        ...session.state.quantum, pointsEarned: DISCRETE_MAXIMUM, pointsSpent: 0n,
        [key]: DISCRETE_MAXIMUM - 3n,
      } }
      const purchase = buyMax(initial, id)
      expect(purchase.accepted).toBe(true)
      expect(purchase.state.quantum[key]).toBe(DISCRETE_MAXIMUM)
      expect(purchase.state.quantum.pointsSpent).toBe(3n)
      expect(availableQuantumPoints(purchase.state)).toBe(DISCRETE_MAXIMUM - 3n)
      const loaded = roundTrip(purchase.state)
      expect(loaded.quantum).toEqual(purchase.state.quantum)
      const repeated = buyMax(loaded, id)
      expect(repeated.accepted).toBe(false)
      expect(repeated.state).toEqual(loaded)
    },
  )
})
