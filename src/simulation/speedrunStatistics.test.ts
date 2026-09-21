import { applyCanonicalQuantumReset } from './quantumTransitions'
import { applyCanonicalDreamReset } from './canonicalDreamReset'
import { prepareImportedSaveText } from '../save/import'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { CanonicalRuntimeSession } from '../application/canonicalRuntimeSession'
import { hydrateGameState } from '../game-state/mapping'
import { recordActiveSpeedrunTime, createSpeedrunStatistics, elapsedSpeedrunSeconds, markSpeedrunUsage, observeSpeedruns, qualifiesForDebug, speedrunEligible, validateSpeedrunStatistics } from './speedrunStatistics'
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
    let state = recordActiveSpeedrunTime(markSpeedrunUsage(markSpeedrunUsage(session.initialState.gameState, 'debug'), 'storedTime'), 123)
    state = { ...state, dyson: { ...state.dyson, bots: OVERFLOW_BOT_CAP }, infinity: { ...state.infinity, overflowEligible: true } }
    const prepared = session.prepare({ ...session.initialState, gameState: state })
    const loaded = new CanonicalRuntimeSession(PreparedSave.fromDecoded(deserializeWebSave(serializeWebSave(prepared.copyValidatedState()))), { entitlements: { permanentDoubleIp: false } }).initialState.gameState
    expect(state.statistics.speedruns?.createdWithVersion).toEqual(expect.any(String))
    expect(loaded.statistics.speedruns).toEqual(state.statistics.speedruns)
    const imported = prepareImportedSaveText(serializeWebSave(prepared.copyValidatedState()), '2026-09-14T00:00:00.000Z', undefined, undefined,
      createUnityFirstRunPreparedSave({ startedAtUtc: '2026-09-14T00:00:00.000Z' }).copyValidatedState())
    expect(hydrateGameState(imported).state.statistics.speedruns).toEqual({ ...state.statistics.speedruns, imported: true, personalBests: {} })
    const reset = applyCanonicalOverflowReset(state)
    expect(reset.ok).toBe(true)
    if (reset.ok) expect(reset.state.statistics.speedruns).toEqual(state.statistics.speedruns)
    expect(fresh().statistics.speedruns!.debug).toBe('no')
  })
})

test('active time survives resets without counting wall time', () => {
  const state = recordActiveSpeedrunTime(fresh(), 12.5)
  expect(state.statistics.speedruns?.activeSeconds).toBe(12.5)
  expect(observeSpeedruns(state, origin + 86400000).statistics.speedruns?.activeSeconds).toBe(12.5)
  const reset = applyCanonicalQuantumReset(state, 0n)
  expect(reset.ok).toBe(true)
  if (reset.ok) expect(reset.state.statistics.speedruns?.activeSeconds).toBe(12.5)
})
test('legacy active time is explicitly incomplete and malformed counters are rejected', () => {
  const original = fresh()
  const { activeSeconds: _seconds, activeTimeComplete: _complete, ...legacy } = original.statistics.speedruns!
  const state = recordActiveSpeedrunTime({ ...original, statistics: { ...original.statistics, speedruns: legacy } }, 5)
  expect(state.statistics.speedruns).toMatchObject({ activeSeconds: 5, activeTimeComplete: false })
  expect(validateSpeedrunStatistics({ ...legacy, activeSeconds: -1 })).toBeTruthy()
  expect(validateSpeedrunStatistics(legacy)).toBeNull()
})

test('old saves retain unknown creation versions and malformed versions are rejected', () => {
  const legacy = createSpeedrunStatistics(start, false, origin)
  expect(legacy.createdWithVersion).toBeUndefined()
  expect(validateSpeedrunStatistics(legacy)).toBeNull()
  expect(validateSpeedrunStatistics({ ...legacy, createdWithVersion: 419 })).toBeTruthy()
  expect(validateSpeedrunStatistics({ ...legacy, createdWithVersion: '' })).toBeTruthy()
  expect(validateSpeedrunStatistics({ ...legacy, createdWithVersion: '4.1.7' })).toBeNull()
})

describe('personal best records', () => {
  test('retains faster results and their flags, including on ties', () => {
    const first = observeSpeedruns({ ...fresh(), meta: { ...fresh().meta, firstInfinityComplete: true } }, origin + 5000)
    const best = first.statistics.speedruns!.personalBests!.firstInfinity!
    const resetRun = { ...fresh().statistics.speedruns!, personalBests: first.statistics.speedruns!.personalBests }
    const attempt = (seconds: number) => observeSpeedruns({ ...fresh(),
      meta: { ...fresh().meta, firstInfinityComplete: true },
      statistics: { ...fresh().statistics, speedruns: { ...resetRun, storedTime: 'yes' } },
    }, origin + seconds * 1000).statistics.speedruns!
    expect(attempt(6).personalBests!.firstInfinity).toEqual(best)
    expect(attempt(5).personalBests!.firstInfinity).toEqual(best)
    expect(attempt(4).personalBests!.firstInfinity).toMatchObject({ elapsedSeconds: 4, storedTime: 'yes' })
    const later = observeSpeedruns(markSpeedrunUsage(first, 'doubleIpUsed'), origin + 6000)
    expect(later.statistics.speedruns!.personalBests!.firstInfinity).toEqual(best)
    expect(later.statistics.speedruns!.doubleIpUsed).toBe(true)
  })

  test.each(['debug', 'imported', 'clock'] as const)('%s runs cannot set bests', reason => {
    const state = fresh()
    const run = { ...state.statistics.speedruns!, ...(reason === 'debug' ? { debug: 'yes' as const } : reason === 'imported' ? { imported: true } : { clockUncertain: true }) }
    const observed = observeSpeedruns({ ...state, meta: { ...state.meta, firstInfinityComplete: true }, statistics: { ...state.statistics, speedruns: run } }, origin + 5000)
    expect(observed.statistics.speedruns!.personalBests).toEqual({})
  })

  test('full checkpoints retain bests, exports omit them, imports retain recipient records, Reset Save requalifies', async () => {
    const { serializeSharedWebSave } = await import('../save/serialization')
    const receiver = fresh()
    const recorded = observeSpeedruns({ ...receiver, meta: { ...receiver.meta, firstInfinityComplete: true } }, origin + 5000)
    const session = new CanonicalRuntimeSession(createUnityFirstRunPreparedSave({ startedAtUtc: start }), { entitlements: { permanentDoubleIp: false } })
    const checkpoint = session.prepare({ ...session.initialState, gameState: recorded }).copyValidatedState()
    const full = serializeWebSave(checkpoint)
    expect((deserializeWebSave(full).idsSpeedruns as typeof recorded.statistics.speedruns)!.personalBests!.firstInfinity!.elapsedSeconds).toBe(5)
    const shared = serializeSharedWebSave(checkpoint)
    expect((deserializeWebSave(shared).idsSpeedruns as typeof recorded.statistics.speedruns)!.personalBests).toBeUndefined()
    // Full checkpoint bytes cannot bypass manual-import policy either.
    const forged = { ...checkpoint, idsSpeedruns: { ...recorded.statistics.speedruns, imported: false, personalBests: { firstInfinity: { elapsedSeconds: 0, debug: 'no', storedTime: 'no' } } } }
    const imported = hydrateGameState(prepareImportedSaveText(serializeWebSave(forged), start, undefined, undefined, checkpoint)).state.statistics.speedruns!
    expect(imported.personalBests).toEqual(recorded.statistics.speedruns!.personalBests)
    expect(imported.imported).toBe(true)
    expect(speedrunEligible(imported)).toBe(false)
    const reset = hydrateGameState(prepareImportedSaveText(serializeWebSave(createUnityFirstRunPreparedSave({ startedAtUtc: start }).copyValidatedState()), start, undefined, { kind: 'manual-shared-import', importedAtUtc: start, intent: 'save-reset' }, checkpoint)).state.statistics.speedruns!
    expect(reset.personalBests).toEqual(recorded.statistics.speedruns!.personalBests)
    expect(reset.milestones).toEqual({})
    expect(reset.doubleIpUsed).toBe(false)
    expect(speedrunEligible(reset)).toBe(true)
  })

  test('migrates eligible legacy milestones once, preserving unknown usage', () => {
    const state = fresh()
    const { personalBests: _bests, doubleIpUsed: _ip, ...legacy } = state.statistics.speedruns!
    const checkpoint = createUnityFirstRunPreparedSave({ startedAtUtc: start }).copyValidatedState()
    const run = new CanonicalRuntimeSession(PreparedSave.fromDecoded({ ...checkpoint, idsSpeedruns: { ...legacy, milestones: { firstInfinity: { elapsedSeconds: 12, storedTime: 'no', debug: 'no' } } } }), { entitlements: { permanentDoubleIp: false } }).initialState.gameState.statistics.speedruns!
    expect(run.personalBests!.firstInfinity).toEqual({ elapsedSeconds: 12, storedTime: 'no', debug: 'no' })
    expect(run.doubleIpUsed).toBeUndefined()
    expect(validateSpeedrunStatistics({ ...run, personalBests: { firstInfinity: { elapsedSeconds: -1, storedTime: 'no', debug: 'no' } } })).not.toBeNull()
  })
})
