import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { dehydrateGameState, hydrateGameState } from '../game-state/mapping'
import { validateCanonicalGameState } from '../game-state/validate'
import { prepareIdb1Save, PreparedSave } from '../save/prepare'
import { deserializeWebSave, serializeSharedWebSave, serializeWebSave } from '../save/serialization'
import { DISCRETE_MAXIMUM } from './numeric'
import { applyCanonicalQuantumReset, applyQuantumEntanglementConversion } from './quantumTransitions'
import { availableQuantumPoints, purchaseQuantumUpgrade, purchaseQuantumUpgradeBulk } from './quantumUpgrades'

const fixture = readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')
function session() { return hydrateGameState(prepareIdb1Save(fixture).prepared) }

describe('Quantum Shard wallet cap and cumulative ledger', () => {
  test.each([serializeWebSave, serializeSharedWebSave])('spends, replenishes and serializes cumulative counters beyond the wallet cap (%#)', (serialize) => {
    const base = session()
    const capped = {
      ...base.state,
      quantum: { ...base.state.quantum, pointsEarned: DISCRETE_MAXIMUM * 2n, pointsSpent: DISCRETE_MAXIMUM, cashBonusLevels: 0n, influenceSpeedBonus: 0n },
      infinity: { ...base.state.infinity, points: 1_000n, spentPoints: 17n },
    }
    const single = purchaseQuantumUpgrade(capped, 'CashBonus')
    expect(single.accepted).toBe(true)
    const bulk = purchaseQuantumUpgradeBulk(single.state, 'InfluenceSpeed', 2n)
    expect(bulk.accepted).toBe(true)
    const spent = single.cost + bulk.cost
    expect(availableQuantumPoints(bulk.state)).toBe(DISCRETE_MAXIMUM - spent)
    const restored = hydrateGameState(PreparedSave.fromDecoded(deserializeWebSave(serialize(
      dehydrateGameState(base, bulk.state).copyValidatedState(),
    )))).state
    expect(restored.quantum).toEqual(bulk.state.quantum)
    const converted = applyQuantumEntanglementConversion(restored)
    const expectedGrant = spent < 23n ? spent : 23n
    expect(converted.quantumPointsGranted).toBe(expectedGrant)
    expect(converted.infinityPointsConsumed).toBe(expectedGrant * 42n)
    expect(converted.state.quantum.pointsEarned).toBe(capped.quantum.pointsEarned + expectedGrant)
    expect(converted.state.quantum.pointsSpent).toBe(bulk.state.quantum.pointsSpent)
    expect(converted.state.infinity.spentPoints).toBe(17n)
    const reloaded = hydrateGameState(PreparedSave.fromDecoded(deserializeWebSave(serialize(
      dehydrateGameState(base, converted.state).copyValidatedState(),
    )))).state
    expect(reloaded.quantum).toEqual(converted.state.quantum)
    expect(reloaded.infinity.points).toBe(1_000n - expectedGrant * 42n)
    expect(validateCanonicalGameState(reloaded).valid).toBe(true)
  })

  test('an existing empty wallet at the old lifetime cap can earn and buy again', () => {
    const base = session().state
    const input = {
      ...base,
      quantum: { ...base.quantum, pointsEarned: DISCRETE_MAXIMUM, pointsSpent: DISCRETE_MAXIMUM, cashBonusLevels: 0n },
      infinity: { ...base.infinity, points: 84n, spentPoints: 0n },
    }
    const converted = applyQuantumEntanglementConversion(input)
    expect(converted.quantumPointsGranted).toBe(2n)
    expect(availableQuantumPoints(converted.state)).toBe(2n)
    const purchased = purchaseQuantumUpgrade(converted.state, 'CashBonus')
    expect(purchased.accepted).toBe(true)
    expect(purchased.state.quantum.pointsSpent).toBe(DISCRETE_MAXIMUM + purchased.cost)
    expect(availableQuantumPoints(purchased.state)).toBe(2n - purchased.cost)
  })

  test('credits only wallet headroom and retains unused IP including its remainder', () => {
    const base = session().state
    const input = { ...base, quantum: { ...base.quantum, pointsEarned: DISCRETE_MAXIMUM, pointsSpent: 1n }, infinity: { ...base.infinity, points: 117n, spentPoints: 16n } }
    const result = applyQuantumEntanglementConversion(input)
    expect(result.quantumPointsGranted).toBe(1n)
    expect(result.infinityPointsConsumed).toBe(42n)
    expect(result.state.infinity.points).toBe(75n)
    expect(availableQuantumPoints(result.state)).toBe(DISCRETE_MAXIMUM)
    const full = applyQuantumEntanglementConversion(result.state)
    expect(full.quantumPointsGranted).toBe(0n)
    expect(full.infinityPointsConsumed).toBe(0n)
    expect(full.state.infinity).toEqual(result.state.infinity)
    expect(full.state.quantum).toEqual(result.state.quantum)
  })

  test('Quantum reset replenishes a spent shard even after lifetime earned reaches the cap', () => {
    const base = session().state
    const input = { ...base, quantum: { ...base.quantum, pointsEarned: DISCRETE_MAXIMUM, pointsSpent: 1n } }
    const result = applyCanonicalQuantumReset(input, 0n)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(result.quantumPointGranted).toBe(1n)
    expect(result.state.quantum.pointsEarned).toBe(DISCRETE_MAXIMUM + 1n)
    expect(result.state.quantum.pointsSpent).toBe(1n)
    expect(availableQuantumPoints(result.state)).toBe(DISCRETE_MAXIMUM)
  })
})
