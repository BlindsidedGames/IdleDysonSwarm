import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { PreparedSave } from '../save/prepare'
import { deserializeWebSave, serializeWebSave } from '../save/serialization'
import { initializeGameplayRework } from '../simulation/gameplayRework'
import type { ModeSaveCodec } from './modeSaveStore'
import { prepareImportedSaveText } from '../save/import'

/** Modern alone owns the modern parser. Classic must supply its released parser.
 * Transport validation never processes away time or converts a legacy save. */
export function createModernModeCodec(nowUtc: () => string): ModeSaveCodec {
  const createFresh = () => {
    const save = createUnityFirstRunPreparedSave({ startedAtUtc: nowUtc() })
    const hydrated = hydrateGameState(save)
    return serializeWebSave(dehydrateGameState(hydrated, initializeGameplayRework(hydrated.state)).copyValidatedState())
  }
  return {
    previewImport(text) {
      const { state } = hydrateGameState(PreparedSave.fromDecoded(deserializeWebSave(text)))
      return { infinityPoints: state.infinity.points, quantumPoints: state.quantum.pointsEarned, skillPoints: state.skills.points }
    },
    prepareImport(text, receiving) {
      return serializeWebSave(prepareImportedSaveText(text, nowUtc(), undefined, undefined,
        receiving ? deserializeWebSave(receiving) : undefined).copyValidatedState())
    },
    validate(text) {
      const decoded = deserializeWebSave(text)
      if (Number(decoded.saveVersion) < 21 && decoded.idsReworkMigrationChoice !== 'keep' && decoded.idsReworkMigrationChoice !== 'fresh') {
        throw new Error('A Classic save requires migration before entering Modern.')
      }
      // A schema-21 save can be awaiting the gameplay migration decision.
      PreparedSave.fromDecoded(decoded)
    },
    createFresh,
    createReset(receiving) {
      const importedAtUtc = nowUtc()
      return serializeWebSave(prepareImportedSaveText(createFresh(), importedAtUtc, undefined,
        { kind: 'manual-shared-import', importedAtUtc, intent: 'save-reset' },
        deserializeWebSave(receiving)).copyValidatedState())
    },
  }
}
