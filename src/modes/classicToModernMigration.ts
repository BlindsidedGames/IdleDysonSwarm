import { PreparedSave } from '../save/prepare'
import { deserializeWebSave, serializeWebSave } from '../save/serialization'
import { dehydrateGameState, hydrateGameState } from '../game-state/mapping'
import { initializeGameplayRework } from '../simulation/gameplayRework'
import { createClassicModeCodec } from './classicModeCodec'
import { createModernModeCodec } from './modernModeCodec'

/** Upgrade the format, leaving affected players the Classic/Modern choice.
 * Original bytes stay owned by the Classic slot.
 * Conversion does not process offline time; only the selected runtime may do so. */
export async function convertClassicForModern(text: string): Promise<string> {
  const unusedClock = () => { throw new Error('Migration must not create a fresh save.') }
  await createClassicModeCodec(unusedClock).validate(text)
  const hydrated = hydrateGameState(PreparedSave.fromDecoded(deserializeWebSave(text)))
  const result = serializeWebSave(dehydrateGameState(hydrated,
    initializeGameplayRework(hydrated.state)).copyValidatedState())
  await createModernModeCodec(unusedClock).validate(result)
  return result
}
