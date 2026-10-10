import { expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import { prepareImportedSaveText } from '../save/import'
import { serializeSharedWebSave } from '../save/serialization'
import { applyCanonicalOverflowReset } from '../simulation/canonicalOverflowReset'
import { OVERFLOW_BOT_CAP } from '../simulation/overflowBoundary'
import { markSpeedrunUsage } from '../simulation/speedrunStatistics'
import { CanonicalRuntimeSession } from './canonicalRuntimeSession'
import { createUnityFirstRunResetRequest } from './firstRun/productionFirstRun'
import { createUnityFirstRunPreparedSave } from './firstRun/unityFirstRunSave'

const startedAtUtc = '2026-09-13T00:00:00.000Z'

test('legacy purchase preferences and Debug evidence survive Transcendence and portable reload together', () => {
  const initial = new CanonicalRuntimeSession(
    createUnityFirstRunPreparedSave({ startedAtUtc }), { entitlements: {} },
  )
  // The retired purchase controls no longer accept commands. Their compatibility
  // payload must still round-trip alongside retained Debug and TP progression.
  const legacy = initial.prepare({ ...initial.initialState, gameState: {
    ...initial.initialState.gameState,
    dream: { ...initial.initialState.gameState.dream, buyMode: 'buy-50' },
    quantum: { ...initial.initialState.gameState.quantum, buyMode: 'buy-100' },
  } })
  const session = new CanonicalRuntimeSession(legacy, { entitlements: {} })
  const runtime = structuredClone(session.initialState)
  const state = markSpeedrunUsage(runtime.gameState, 'debug')
  const reset = applyCanonicalOverflowReset({
    ...state, dyson: { ...state.dyson, bots: OVERFLOW_BOT_CAP },
  })
  expect(reset.ok).toBe(true)
  if (!reset.ok) return
  const checkpoint = session.prepare({ ...runtime, gameState: reset.state })
  const imported = prepareImportedSaveText(
    serializeSharedWebSave(checkpoint.copyValidatedState()),
    '2026-09-13T01:00:00.000Z',
  )
  const restored = hydrateGameState(imported).state
  expect(restored.quantum.buyMode).toBe('buy-100')
  expect(restored.dream.buyMode).toBe('buy-50')
  expect(restored.statistics.speedruns).toEqual({ ...state.statistics.speedruns, imported: true, personalBests: {} })
  expect(restored.statistics.speedruns?.debug).toBe('yes')
  expect(restored.avocado.overflowPoints).toBe(1n)
})

test('explicit Save Reset clears the tab override and starts a new clean speedrun', () => {
  const session = new CanonicalRuntimeSession(
    createUnityFirstRunPreparedSave({ startedAtUtc }), { entitlements: {} },
  )
  const runtime = session.initialState
  const receiver = session.prepare({
    ...runtime,
    debugOptionsEnabled: true,
    debugEntitlementPurchased: true,
    unlockAllTabs: true,
    gameState: markSpeedrunUsage(runtime.gameState, 'debug'),
  })
  const resetAtUtc = '2026-09-13T01:00:00.000Z'
  const request = createUnityFirstRunResetRequest({
    sample: () => ({ serializedUtcText: resetAtUtc, utcMilliseconds: Date.parse(resetAtUtc) }),
  }, () => createUnityFirstRunPreparedSave({ startedAtUtc: resetAtUtc }))
  const prepared = prepareImportedSaveText(
    request.text, request.importedAtUtc, undefined, request.context,
    receiver.copyValidatedState(),
  )
  const restored = new CanonicalRuntimeSession(prepared, { entitlements: {} }).initialState
  expect(restored.unlockAllTabs).toBe(false)
  expect(restored.debugEntitlementPurchased).toBe(true)
  expect(restored.gameState.statistics.speedruns?.debug).toBe('no')
  expect(restored.gameState.statistics.speedruns?.startedAtMilliseconds)
    .toBe(Date.parse(resetAtUtc))
})
