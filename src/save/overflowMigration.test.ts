import { describe, expect, test } from 'vitest'
import { validatePreparedSave } from './validate'
import { migrateDecodedSave } from './migrate'
import { requireRecord } from './graph'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { PreparedSave } from './prepare'
import { serializeWebSave, deserializeWebSave } from './serialization'
import { OVERFLOW_BOT_CAP } from '../simulation/overflowBoundary'

function legacy(bots: number, rewarded = false) {
  return {
    saveVersion: 14,
    botCapRewardsGranted: rewarded,
    botCapTransitionPending: !rewarded,
    infinityInProgress: rewarded,
    avocadoData: { unlocked: true, infinityPoints: 123, influence: 456, strangeMatter: 789, overflowMultiplier: 9 },
    dysonVerseSaveData: {
      dysonVerseInfinityData: { bots, money: 1e300 },
      dysonVersePrestigeData: { infinityPoints: 1234n, spentInfinityPoints: 3n },
    },
    prestigePlus: { points: 42n },
  }
}

describe('schema 15 Overflow migration', () => {
  test.each([false, true])('bounds old finite progress and preserves existing rewards without triggering a reset (rewarded=%s)', (rewarded) => {
    const source = legacy(Number.MAX_VALUE, rewarded)
    const original = structuredClone(source)
    const migrated = migrateDecodedSave(source)
    expect(source).toEqual(original)
    expect(migrated.validation.valid).toBe(true)
    expect(migrated.targetSchema).toBe(16)
    const prepared = PreparedSave.fromDecoded(migrated.save)
    const state = hydrateGameState(prepared).state
    expect(state.dyson.bots).toBe(OVERFLOW_BOT_CAP)
    expect(state.dyson.money).toBe(1e300)
    expect(state.infinity.points).toBe(1234n)
    expect(state.infinity.spentPoints).toBe(3n)
    expect(state.infinity.botCapTransitionPending).toBe(true)
    expect(state.infinity.botCapRewardsGranted).toBe(false)
    expect(state.infinity.inProgress).toBe(false)
    expect(state.avocado).toEqual({ ...source.avocadoData, overflowPoints: 0n })
    expect(migrated.numericRepair.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ original: '1.7976931348623157e+308', rule: 'overflow_gameplay_boundary_preserve_reset_choice' }),
    ]))
  })

  test('does not turn a historical reward latch below the new boundary into fresh reset eligibility', () => {
    const migrated = migrateDecodedSave(legacy(1e100, true))
    expect(migrated.save.botCapTransitionPending).toBe(false)
    expect(migrated.save.botCapRewardsGranted).toBe(false)
    expect(requireRecord(migrated.save.avocadoData).overflowPoints).toBe(0n)
  })

  test.each([NaN, Infinity, -Infinity, -1])('repairs invalid bots %s without eligibility or points', (bots) => {
    const state = hydrateGameState(PreparedSave.fromDecoded(legacy(bots))).state
    expect(state.dyson.bots).toBe(0)
    expect(state.infinity.botCapTransitionPending).toBe(false)
    expect(state.avocado.overflowPoints).toBe(0n)
  })

  test('round-trips a current pending choice and whole point balance through portable serialization', () => {
    const hydrated = hydrateGameState(PreparedSave.fromDecoded(legacy(1e100)))
    const updated = { ...hydrated.state,
      infinity: { ...hydrated.state.infinity, botCapTransitionPending: true },
      avocado: { ...hydrated.state.avocado, overflowPoints: 17n },
    }
    const encoded = serializeWebSave(dehydrateGameState(hydrated, updated).copyValidatedState())
    const reopened = hydrateGameState(PreparedSave.fromDecoded(deserializeWebSave(encoded))).state
    expect(reopened.infinity.botCapTransitionPending).toBe(true)
    expect(reopened.avocado.overflowPoints).toBe(17n)
    expect(reopened.dyson.bots).toBe(1e100)
  })

  test.each([-1n, 0.5, 9_223_372_036_854_775_808n])('rejects an invalid new point balance %s', (points) => {
    const source = migrateDecodedSave(legacy(1)).save
    requireRecord(source.avocadoData).overflowPoints = points
    expect(validatePreparedSave(source, 15).valid).toBe(false)
  })
})
