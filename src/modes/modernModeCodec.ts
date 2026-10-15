import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { PreparedSave } from '../save/prepare'
import { deserializeWebSave, serializeWebSave } from '../save/serialization'
import { initializeGameplayRework } from '../simulation/gameplayRework'
import type { ModeSaveCodec } from './modeSaveStore'

/** Modern alone owns the modern parser. Classic must supply its released parser.
 * Transport validation never processes away time or converts a legacy save. */
export function createModernModeCodec(nowUtc: () => string): ModeSaveCodec {
  return {
    validate(text) {
      const save = PreparedSave.fromDecoded(deserializeWebSave(text))
      const state = hydrateGameState(save).state
      if (state.meta.reworkMigrationChoice === undefined) {
        throw new Error('A Classic save requires explicit one-way migration before entering modern.')
      }
    },
    createFresh() {
      const save = createUnityFirstRunPreparedSave({ startedAtUtc: nowUtc() })
      const hydrated = hydrateGameState(save)
      return serializeWebSave(dehydrateGameState(hydrated, initializeGameplayRework(hydrated.state)).copyValidatedState())
    },
  }
}
