import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { PreparedSave, prepareIdb1Save } from '../save/prepare'
import { hydrateGameState } from '../game-state/mapping'
import { serializeSharedWebSave } from '../save/serialization'
import { prepareImportedSaveText } from '../save/import'
import { BUY_MODES } from '../simulation/transactions'
import { CanonicalRuntimeSession } from './canonicalRuntimeSession'
import { routeCanonicalGameCommand } from './canonicalGameCommands'

const original = prepareIdb1Save(readFileSync(new URL(
  '../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url,
), 'utf8')).prepared

test.each(BUY_MODES)('Quantum %s survives canonical checkpoint and portable import', mode => {
  const session = new CanonicalRuntimeSession(original, { entitlements: {} })
  const runtime = session.initialState
  const result = routeCanonicalGameCommand(runtime.gameState,
    { kind: 'quantum.set-buy-mode', buyMode: mode })
  expect(result.accepted).toBe(true)
  expect((result.state.quantum.buyMode ?? 'buy-1')).toBe(mode)
  const checkpoint = session.prepare({ ...runtime, gameState: result.state })
  const restored = new CanonicalRuntimeSession(checkpoint, { entitlements: {} })
  expect((restored.initialState.gameState.quantum.buyMode ?? 'buy-1')).toBe(mode)
  const imported = prepareImportedSaveText(serializeSharedWebSave(checkpoint.copyState()), '2026-09-13T00:00:00Z')
  expect((hydrateGameState(imported).state.quantum.buyMode ?? 'buy-1')).toBe(mode)
  expect(result.state.dyson).toBe(runtime.gameState.dyson)
  expect(result.state.research).toBe(runtime.gameState.research)
})

test.each([undefined, -1, 99, 'buy-50', null])('missing or malformed stored Quantum quantity %s defaults to Buy 1', value => {
  const raw = original.copyState()
  raw.quantumBuyMode = value
  expect((hydrateGameState(PreparedSave.fromDecoded(raw)).state.quantum.buyMode ?? 'buy-1')).toBe('buy-1')
})
