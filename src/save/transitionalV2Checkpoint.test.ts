import { gzipSync, strToU8 } from 'fflate'
import { describe, expect, test } from 'vitest'
import {
  createDeterministicUnityFirstRunPreparedSave,
} from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState } from '../game-state/mapping'
import type { SaveRecord } from './graph'
import { recoverTransitionalV2Checkpoint } from './transitionalV2Checkpoint'

describe('transitional production V2 checkpoint recovery', () => {
  test('restores gameplay progress into the retained Unity graph exactly once', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    const dyson = state.dyson as SaveRecord
    dyson.money = '12345'
    dyson.bots = '42'
    const infinity = state.infinity as SaveRecord
    infinity.availablePoints = '7'
    infinity.allocatedPoints = '3'
    delete infinity.points
    delete infinity.spentPoints
    const quantum = state.quantum as SaveRecord
    quantum.availableShards = '4'
    quantum.lifetimeEarnedShards = '9'
    delete quantum.pointsEarned
    delete quantum.pointsSpent
    ;(state.skills as SaveRecord).selectedPreset = 3

    const recovered = recoverTransitionalV2Checkpoint(
      checkpointText(state, 17),
      base,
    )

    expect(recovered).not.toBeNull()
    const hydrated = hydrateGameState(recovered!)
    expect(hydrated.state.dyson).toMatchObject({ money: 12_345, bots: 42 })
    expect(hydrated.state.infinity).toMatchObject({
      points: 10n,
      spentPoints: 3n,
    })
    expect(hydrated.state.quantum).toMatchObject({
      pointsEarned: 9n,
      pointsSpent: 5n,
    })
    expect(
      (recovered!.copyValidatedState().dysonVerseSaveData as SaveRecord)
        .selectedPreset,
    ).toBe(3)
    expect(
      recovered!.copyValidatedState()
        .transitionalProductionV2CheckpointRevision,
    ).toBe(17)
    expect(
      recoverTransitionalV2Checkpoint(checkpointText(state, 17), recovered!),
    ).toBeNull()
  })

  test('fails closed instead of truncating an unrepresentable decimal', () => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    ;(state.dyson as SaveRecord).money = '1e400'
    const infinity = state.infinity as SaveRecord
    infinity.availablePoints = '0'
    infinity.allocatedPoints = '0'
    const quantum = state.quantum as SaveRecord
    quantum.availableShards = '0'
    quantum.lifetimeEarnedShards = '0'

    expect(() =>
      recoverTransitionalV2Checkpoint(checkpointText(state, 1), base),
    ).toThrow(/cannot be represented/u)
  })

  test.each([
    {
      label: 'owned gameplay section',
      remove: (state: SaveRecord) => delete state.dyson,
      expectedPath: '$.dyson',
    },
    {
      label: 'V2-only railgun field',
      remove: (state: SaveRecord) => {
        delete ((state.dream as SaveRecord).railgun as SaveRecord)
          .pendingBaseSeconds
      },
      expectedPath: '$.dream.railgun.pendingBaseSeconds',
    },
  ])('rejects a checkpoint missing a required $label', ({
    remove,
    expectedPath,
  }) => {
    const base = createDeterministicUnityFirstRunPreparedSave()
    const state = encodeState(hydrateGameState(base).state)
    remove(state)

    expect(() =>
      recoverTransitionalV2Checkpoint(checkpointText(state, 1), base),
    ).toThrow(expectedPath)
  })
})

function checkpointText(state: SaveRecord, revision: number): string {
  const portable = {
    schemaVersion: 13,
    modelVersion: 2,
    savedAtUtc: '2026-08-30T00:00:00.000Z',
    state,
    runtime: {},
  }
  const compressed = gzipSync(strToU8(JSON.stringify(portable)), {
    level: 9,
    mtime: 0,
  })
  return JSON.stringify({
    format: 'ids-web-production-v2-checkpoint-v1',
    revision,
    portableSave: `IDSWEB1:${Buffer.from(compressed).toString('base64')}`,
    preferences: {},
    platform: {},
  })
}

function encodeState(value: unknown): SaveRecord {
  const state = encodeValue(value) as SaveRecord
  const meta = state.meta as SaveRecord
  meta.navigationVisibility ??= {
    story: false,
    wiki: false,
    statistics: false,
  }
  const infinity = state.infinity as SaveRecord
  infinity.availablePoints ??= '0'
  infinity.allocatedPoints ??= '0'
  delete infinity.points
  delete infinity.spentPoints
  const quantum = state.quantum as SaveRecord
  quantum.availableShards ??= '0'
  quantum.lifetimeEarnedShards ??= '0'
  delete quantum.pointsEarned
  delete quantum.pointsSpent
  ;(state.skills as SaveRecord).selectedPreset ??= 1
  const railgun = (state.dream as SaveRecord).railgun as SaveRecord
  railgun.pendingBaseSeconds ??= 0
  railgun.pendingDreamSeconds ??= 0
  railgun.activeRailguns ??= 0
  railgun.reservedPanels ??= '0'
  railgun.highestStoredPanels ??= '0'
  railgun.lastRoundsFired ??= 0
  railgun.lastPanelsLaunched ??= '0'
  return state
}

function encodeValue(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) return value.map(encodeValue)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, encodeValue(entry)]),
    )
  }
  return value
}
