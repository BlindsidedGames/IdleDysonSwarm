import { createUnityFirstRunPreparedSave } from '../../classic/src/application/firstRun/unityFirstRunSave'
import { PreparedSave } from '../../classic/src/save/prepare'
import { deserializeWebSave, serializeWebSave } from '../../classic/src/save/serialization'
import type { ModeSaveCodec } from './modeSaveStore'
import { prepareImportedSaveText } from '../../classic/src/save/import'
import { hydrateGameState } from '../../classic/src/game-state/mapping'

/** Candidate Classic codec uses the released 4.1.10 schema authority. It does
 * not down-convert modern data. Public baseline identities are recorded in
 * classic/baseline.json. */
export function createClassicModeCodec(nowUtc: () => string): ModeSaveCodec {
  const createFresh = () => serializeWebSave(createUnityFirstRunPreparedSave({ startedAtUtc: nowUtc() }).copyValidatedState())
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
      if (decoded.idsReworkMigrationChoice !== undefined) throw new Error('Modern progress cannot be imported into Classic.')
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
