import { describe, expect, test } from 'vitest'
import { createDeterministicUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import { validateCanonicalGameStateV2 } from '../game-state/validateV2'
import { gameDecimalFromCanonicalString, gameDecimalFromNumber, gameDecimalToCanonicalString } from '../math/gameDecimal'
import { createCanonicalTinkerRuntimeState } from './canonicalTinker'
import { MINIMUM_TINKER_COOLDOWN_SECONDS, advanceCanonicalTinkerV2, deriveCanonicalTinkerStatsV2, startCanonicalTinkerV2 } from './canonicalTinkerV2'

describe('canonical V2 Tinker authority', () => {
  test('grants an exact assembly-line yield above native-number range', () => {
    const migrated = migratePreparedSaveToV2(createDeterministicUnityFirstRunPreparedSave(), { kind: 'trusted-same-device' })
    const state = cloneCanonicalGameStateV2({
      ...migrated.state,
      dyson: {
        ...migrated.state.dyson,
        facilities: {
          ...migrated.state.dyson.facilities,
          ai_managers: [gameDecimalFromNumber(0), gameDecimalFromNumber(1)],
        },
      },
      skills: {
        ...migrated.state.skills,
        byId: {
          ...migrated.state.skills.byId,
          manualLabour: { ...migrated.state.skills.byId.manualLabour!, owned: true },
        },
      },
    })
    const yieldValue = gameDecimalFromCanonicalString('1e1000')
    const stats = deriveCanonicalTinkerStatsV2(state, yieldValue)
    const started = startCanonicalTinkerV2(state, createCanonicalTinkerRuntimeState(), stats, false)
    const completed = advanceCanonicalTinkerV2(
      started.state,
      started.runtime,
      deriveCanonicalTinkerStatsV2(started.state, yieldValue),
      0.1,
    )

    expect(completed.completions).toBe(1)
    expect(gameDecimalToCanonicalString(completed.state.dyson.facilities.assembly_lines[0])).toBe('1e1000')
    expect(gameDecimalToCanonicalString(completed.state.dyson.bots)).toBe('0')
  })

  test('keeps the exactly-one-second completion inside the positive V2 interval invariant', () => {
    const migrated = migratePreparedSaveToV2(createDeterministicUnityFirstRunPreparedSave(), { kind: 'trusted-same-device' })
    const state = cloneCanonicalGameStateV2({
      ...migrated.state,
      dyson: { ...migrated.state.dyson, manualCreationIntervalSeconds: 1 },
    })
    const stats = deriveCanonicalTinkerStatsV2(state, gameDecimalFromNumber(0))
    const started = startCanonicalTinkerV2(state, createCanonicalTinkerRuntimeState(), stats, false)
    const completed = advanceCanonicalTinkerV2(started.state, started.runtime, stats, 1)

    expect(completed.completions).toBe(1)
    expect(completed.state.dyson.manualCreationIntervalSeconds)
      .toBe(MINIMUM_TINKER_COOLDOWN_SECONDS)
    expect(validateCanonicalGameStateV2(completed.state)).toEqual({ valid: true, errors: [] })
  })

  test('keeps repeating Tinker valid across the minimum-interval cycle', () => {
    const migrated = migratePreparedSaveToV2(createDeterministicUnityFirstRunPreparedSave(), { kind: 'trusted-same-device' })
    const state = cloneCanonicalGameStateV2({
      ...migrated.state,
      dyson: { ...migrated.state.dyson, manualCreationIntervalSeconds: 1 },
    })
    const stats = deriveCanonicalTinkerStatsV2(state, gameDecimalFromNumber(0))
    const started = startCanonicalTinkerV2(state, createCanonicalTinkerRuntimeState(), stats, true)
    const first = advanceCanonicalTinkerV2(started.state, started.runtime, stats, 0.9)
    const secondStats = deriveCanonicalTinkerStatsV2(first.state, gameDecimalFromNumber(0))
    const second = advanceCanonicalTinkerV2(first.state, first.runtime, secondStats, 0.01)

    expect(first.state.dyson.manualCreationIntervalSeconds).toBe(0.01)
    expect(second.state.dyson.manualCreationIntervalSeconds).toBe(0.5)
    expect(second.completions).toBe(1)
    expect(validateCanonicalGameStateV2(second.state)).toEqual({ valid: true, errors: [] })
  })
})
