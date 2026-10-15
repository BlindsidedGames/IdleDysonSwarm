import { PreparedSave } from '../save/prepare'
import { deserializeWebSave, serializeWebSave } from '../save/serialization'
import { dehydrateGameState, hydrateGameState } from '../game-state/mapping'
import { chooseGameplayReworkMigration } from '../simulation/gameplayRework'
import { createClassicModeCodec } from './classicModeCodec'
import { createModernModeCodec } from './modernModeCodec'

/** Explicit opt-in to the already-existing rework "keep" policy. This adds no
 * compensation, currency or augment balance rules. Host activation still needs
 * a reviewed product decision on that policy; the controller never selects a
 * conversion policy implicitly. Original bytes stay owned by the Classic slot.
 * Conversion does not process offline time; only the selected runtime may do so. */
export async function convertClassicUsingExistingKeepPolicy(text: string): Promise<string> {
  const unusedClock = () => { throw new Error('Migration must not create a fresh save.') }
  await createClassicModeCodec(unusedClock).validate(text)
  const hydrated = hydrateGameState(PreparedSave.fromDecoded(deserializeWebSave(text)))
  const result = serializeWebSave(dehydrateGameState(hydrated,
    chooseGameplayReworkMigration(hydrated.state, 'keep')).copyValidatedState())
  await createModernModeCodec(unusedClock).validate(result)
  return result
}
