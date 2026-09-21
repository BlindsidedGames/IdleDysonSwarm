import { expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import { prepareImportedSaveText } from '../save/import'
import { serializeSharedWebSave } from '../save/serialization'
import { applyCanonicalOverflowReset } from '../simulation/canonicalOverflowReset'
import { OVERFLOW_BOT_CAP } from '../simulation/overflowBoundary'
import { createProductionEventContext } from '../simulation/productionEventContext'
import { markSpeedrunUsage } from '../simulation/speedrunStatistics'
import { createCanonicalGameEngineDefinition } from './canonicalGameApplication'
import { CanonicalRuntimeSession } from './canonicalRuntimeSession'
import { createUnityFirstRunResetRequest } from './firstRun/productionFirstRun'
import { createUnityFirstRunPreparedSave } from './firstRun/unityFirstRunSave'

const startedAtUtc = '2026-09-13T00:00:00.000Z'

test('both purchase preferences and Debug evidence survive Overflow and portable reload together', () => {
  const session = new CanonicalRuntimeSession(
    createUnityFirstRunPreparedSave({ startedAtUtc }), { entitlements: {} },
  )
  const runtime = structuredClone(session.initialState)
  const engine = createCanonicalGameEngineDefinition({ eventContext: createProductionEventContext() })
  const simulation = engine.applyCommand(runtime,
    { kind: 'dream.set-buy-mode', buyMode: 'buy-50' })
  expect(simulation.accepted).toBe(true)
  const quantum = engine.applyCommand(runtime,
    { kind: 'quantum.set-buy-mode', buyMode: 'buy-100' })
  expect(quantum.accepted).toBe(true)
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
