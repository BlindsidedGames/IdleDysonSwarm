import { applyCanonicalQuantumReset } from './quantumTransitions'
import { applyCanonicalDreamReset } from './canonicalDreamReset'
import { prepareImportedSaveText } from '../save/import'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { CanonicalRuntimeSession } from '../application/canonicalRuntimeSession'
import { hydrateGameState } from '../game-state/mapping'
import { createSpeedrunStatistics, elapsedSpeedrunSeconds, markSpeedrunUsage, observeSpeedruns, qualifiesForDebug, speedrunEligible, validateSpeedrunStatistics } from './speedrunStatistics'
import { serializeWebSave, deserializeWebSave } from '../save/serialization'
import { PreparedSave } from '../save/prepare'
import { applyCanonicalOverflowReset } from './canonicalOverflowReset'
import { OVERFLOW_BOT_CAP } from './overflowBoundary'
const start = '2026-09-13T00:00:00.000Z'
const origin = Date.parse(start)
function fresh() { return hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: start })).state }
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('whole-save speedruns', () => {
  test('Quantum and Dream resets retain the same run and its Debug/Stored Time evidence', () => {
    const state = markSpeedrunUsage(markSpeedrunUsage(fresh(), 'debug'), 'storedTime')
    const quantum = applyCanonicalQuantumReset(state, 0n)
    expect(quantum.ok).toBe(true)
    if (quantum.ok) expect(quantum.state.statistics.speedruns).toEqual(state.statistics.speedruns)
    const dream = applyCanonicalDreamReset(state, { kind: 'explicit', cause: 'Meteor', requestedReward: 1 })
    expect(dream.ok).toBe(true)
    if (dream.ok) expect(dream.state.statistics.speedruns).toEqual(state.statistics.speedruns)
  })

  test('wall time includes away time and ignores gameplay speed and simulated time', () => {
    vi.spyOn(Date, 'now').mockReturnValue(origin + 60000)
    const state = fresh()
    const changed = observeSpeedruns({ ...state, timeline: { ...state.timeline, doubleTime: { ...state.timeline.doubleTime, unlocked: true } } })
    expect(elapsedSpeedrunSeconds(changed.statistics.speedruns!)).toBe(60)
    expect(changed.statistics.speedruns!.milestones.doubleSpeed?.elapsedSeconds).toBe(60)
    expect(changed.statistics.lifetime).toEqual(state.statistics.lifetime)
    expect(changed.timeline.doubleTime.unlocked).toBe(true)
    vi.restoreAllMocks()
  })
  test('clock rollback invalidates timing instead of recording a faster time', () => {
    const state = observeSpeedruns(fresh(), origin + 60000)
    const rolledBack = observeSpeedruns(state, origin + 30000)
    expect(elapsedSpeedrunSeconds(rolledBack.statistics.speedruns!, origin + 30000)).toBeNull()
    expect(speedrunEligible(rolledBack.statistics.speedruns!)).toBe(false)
  })
  test('snapshots usage at the milestone, preserves it later, and disqualifies the whole run after Debug', () => {
    let state = fresh()
    state = observeSpeedruns({ ...state, meta: { ...state.meta, firstInfinityComplete: true } }, origin + 1000)
    state = markSpeedrunUsage(state, 'storedTime')
    state = observeSpeedruns({ ...state, avocado: { ...state.avocado, overflowPoints: 10n } }, origin + 2000)
    expect(state.statistics.speedruns!.milestones.firstInfinity?.storedTime).toBe('no')
    expect(state.statistics.speedruns!.milestones.debugQualification?.storedTime).toBe('yes')
    expect(speedrunEligible(state.statistics.speedruns!)).toBe(true)
    state = markSpeedrunUsage(state, 'debug')
    expect(speedrunEligible(state.statistics.speedruns!)).toBe(false)
    expect(state.statistics.speedruns!.milestones.firstInfinity?.debug).toBe('no')
  })
  test('Debug qualification is a first observation of 10 spendable Overflow Points, without a debit', () => {
    const state = fresh()
    expect(qualifiesForDebug({ ...state, avocado: { ...state.avocado, overflowPoints: 9n } })).toBe(false)
    const qualified = observeSpeedruns({ ...state, avocado: { ...state.avocado, overflowPoints: 10n } }, origin + 1000)
    expect(qualified.avocado.overflowPoints).toBe(10n)
    expect(observeSpeedruns(qualified, origin + 9000).statistics.speedruns!.milestones.debugQualification).toEqual(qualified.statistics.speedruns!.milestones.debugQualification)
  })
  test('legacy history stays unknown and invalid legacy dates are never guessed', () => {
    const state = fresh()
    const legacy = observeSpeedruns({ ...state, avocado: { ...state.avocado, overflowPoints: 10n }, statistics: { ...state.statistics, speedruns: createSpeedrunStatistics('13/09/2026', false, origin) } }, origin, true)
    expect(legacy.statistics.speedruns!.milestones.debugQualification).toEqual({ elapsedSeconds: null, debug: 'unknown', storedTime: 'unknown' })
    expect(speedrunEligible(legacy.statistics.speedruns!)).toBe(false)
    expect(validateSpeedrunStatistics({ ...legacy.statistics.speedruns, debug: false })).toBeTruthy()
  })
  test('records survive serialization/reload and Overflow resets; new saves start clean', () => {
    const session = new CanonicalRuntimeSession(createUnityFirstRunPreparedSave({ startedAtUtc: start }), { entitlements: { permanentDoubleIp: false } })
    let state = markSpeedrunUsage(markSpeedrunUsage(session.initialState.gameState, 'debug'), 'storedTime')
    state = { ...state, dyson: { ...state.dyson, bots: OVERFLOW_BOT_CAP }, infinity: { ...state.infinity, overflowEligible: true } }
    const prepared = session.prepare({ ...session.initialState, gameState: state })
    const loaded = new CanonicalRuntimeSession(PreparedSave.fromDecoded(deserializeWebSave(serializeWebSave(prepared.copyValidatedState()))), { entitlements: { permanentDoubleIp: false } }).initialState.gameState
    expect(loaded.statistics.speedruns).toEqual(state.statistics.speedruns)
    const imported = prepareImportedSaveText(serializeWebSave(prepared.copyValidatedState()), '2026-09-14T00:00:00.000Z', undefined, undefined,
      createUnityFirstRunPreparedSave({ startedAtUtc: '2026-09-14T00:00:00.000Z' }).copyValidatedState())
    expect(hydrateGameState(imported).state.statistics.speedruns).toEqual(state.statistics.speedruns)
    const reset = applyCanonicalOverflowReset(state)
    expect(reset.ok).toBe(true)
    if (reset.ok) expect(reset.state.statistics.speedruns).toEqual(state.statistics.speedruns)
    expect(fresh().statistics.speedruns!.debug).toBe('no')
  })
})
