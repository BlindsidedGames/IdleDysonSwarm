import { describe, expect, test } from 'vitest'
import { createDeterministicUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import { gameDecimalFromCanonicalString, gameDecimalFromNumber, gameDecimalToCanonicalString } from '../math/gameDecimal'
import { createCanonicalTinkerRuntimeState } from './canonicalTinker'
import { advanceCanonicalTinkerV2, deriveCanonicalTinkerStatsV2, startCanonicalTinkerV2 } from './canonicalTinkerV2'

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
})
