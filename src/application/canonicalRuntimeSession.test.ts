import { serializeSharedWebSave, deserializeWebSave } from '../save/serialization'
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { requireRecord } from '../save/graph'
import { prepareIdb1Save, PreparedSave } from '../save/prepare'
import {
  startCanonicalTinker,
} from '../simulation/canonicalTinker'
import {
  CanonicalRuntimeSession,
  createCanonicalRuntimeSessionFactory,
} from './canonicalRuntimeSession'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

const entitlements = Object.freeze({
  extraAnalysisPower: false,
  permanentDoubleIp: false,
})

describe('CanonicalRuntimeSession', () => {
  test('mobile evidence survives save/reopen and does not leak into a different imported save', () => {
    const prepared = prepareIdb1Save(fixture).prepared
    const options = {entitlements, captureAchievements:true, persistAchievements:true}
    const session = new CanonicalRuntimeSession(prepared, options)
    const state = structuredClone(session.initialState)
    state.achievementEvidence = {unlocked:['achievement.first_bot', 'achievement.first_influence'], statistics:{}, presence:''}
    const saved = session.prepare(state)
    const reopened = new CanonicalRuntimeSession(PreparedSave.fromDecoded(deserializeWebSave(serializeSharedWebSave(saved.copyValidatedState()))), options)
    expect(reopened.initialState.achievementEvidence?.unlocked).toEqual(expect.arrayContaining(['achievement.first_bot','achievement.first_influence']))
    const imported = new CanonicalRuntimeSession(prepared, options)
    expect(imported.initialState.achievementEvidence?.unlocked).toEqual([])
    expect(prepared.copyValidatedState().idsAchievementEvidence).toBeUndefined()
  })

  test('malformed optional achievement evidence cannot block a save or submit unknown IDs', () => {
    const prepared = prepareIdb1Save(fixture).prepared
    const source = prepared.copyValidatedState()
    source.idsAchievementEvidence = ['achievement.first_bot', 'achievement.first_bot', 'bad', 123]
    const session = new CanonicalRuntimeSession(prepared.withValidatedState(source), {
      entitlements, captureAchievements:true, persistAchievements:true,
    })
    expect(session.initialState.achievementEvidence?.unlocked).toEqual(['achievement.first_bot'])
  })

  test('persists state, evaluation and out-of-model fields atomically but not Tinker', () => {
    const prepared = prepareIdb1Save(fixture).prepared
    const session = new CanonicalRuntimeSession(prepared, {
      entitlements,
    })
    const state = structuredClone(session.initialState)
    const tinker = startCanonicalTinker(
      {
        ...state.gameState,
        dyson: {
          ...state.gameState.dyson,
          manualCreation: 2,
        },
      },
      state.tinker,
      {
        intervalSeconds: 2,
        assemblyLineYield: 1,
      },
      true,
    )
    Object.assign(state, {
      gameState: {
        ...tinker.state,
        dyson: { ...tinker.state.dyson, money: 123_456 },
      },
      tinker: tinker.runtime,
      evaluationSnapshot: {
        ...state.evaluationSnapshot,
        panelsPerSecond: 987,
      },
      storedTimeCheater: !state.storedTimeCheater,
      selectedSkillPresetSlot: 5 as const,
      lastSkillPresetApplication: {
        applicationSequence: 7,
        slot: 5 as const,
        trigger: 'manual' as const,
        retainedSkillIds: ['banking'],
        assignedSkillIds: [],
        pendingSkillIds: [],
        blockedByRetainedSkillIds: [],
      },
    })

    const committed = session.prepare(state)
    const reopened = new CanonicalRuntimeSession(committed, {
      entitlements,
    })

    expect(reopened.initialState.gameState.dyson.money).toBe(123_456)
    expect(reopened.initialState.evaluationSnapshot.panelsPerSecond).toBe(987)
    expect(reopened.initialState.storedTimeCheater).toBe(
      state.storedTimeCheater,
    )
    expect(reopened.initialState.selectedSkillPresetSlot).toBe(5)
    expect(reopened.initialState.lastSkillPresetApplication).toBeNull()
    expect(reopened.initialState.tinker.running).toBe(false)
    expect(reopened.initialState.tinker.repeat).toBe(false)
  })

  test('extracts compatibility and evaluation carriers from every imported save', () => {
    const base = prepareIdb1Save(fixture).prepared
    const factory = createCanonicalRuntimeSessionFactory({
      entitlements,
    })
    const firstSource = base.copyValidatedState()
    const firstDyson = requireRecord(
      firstSource.dysonVerseSaveData,
      'Dyson save',
    )
    const firstInfinity = requireRecord(
      firstDyson.dysonVerseInfinityData,
      'Infinity save',
    )
    firstInfinity.panelsPerSec = 11
    firstInfinity.panelsPerSecMulti = 13

    const secondSource = base.copyValidatedState()
    const secondDyson = requireRecord(
      secondSource.dysonVerseSaveData,
      'Dyson save',
    )
    const secondInfinity = requireRecord(
      secondDyson.dysonVerseInfinityData,
      'Infinity save',
    )
    secondInfinity.panelsPerSec = 29
    secondInfinity.panelsPerSecMulti = 31

    const first = factory.open(base.withValidatedState(firstSource))
    const second = factory.open(base.withValidatedState(secondSource))

    expect(first.initialState.evaluationSnapshot.panelsPerSecond).toBe(11)
    expect(second.initialState.evaluationSnapshot.panelsPerSecond).toBe(29)
    expect(first.initialState.compatibilityTuning.panelsPerSecMulti)
      .toBe(13)
    expect(second.initialState.compatibilityTuning.panelsPerSecMulti)
      .toBe(31)
  })

  test('refuses to prepare an invalid numeric graph for durable storage', () => {
    const prepared = prepareIdb1Save(fixture).prepared
    const session = new CanonicalRuntimeSession(prepared, {
      entitlements,
    })
    const state = structuredClone(session.initialState)
    state.gameState.dyson.money = Number.NaN

    expect(() => session.prepare(state)).toThrow(
      /Canonical game state is invalid/,
    )
  })
})
