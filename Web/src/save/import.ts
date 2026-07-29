import { prepareIdb1Save, prepareImportedSave, PreparedSave } from './prepare'
import { deserializeWebSaveBounded } from './serialization'
import {
  assertSuppliedSaveTextLimit,
  DEFAULT_SAVE_IMPORT_LIMITS,
  type SaveImportLimits,
} from './decodeIdb1'

/**
 * Decodes either shipped Unity (`IDB1`) or canonical web (`IDSWEB1`) text,
 * runs the shared preparation pipeline, and consumes its remote lifecycle
 * timestamp before the caller performs a verified commit.
 */
export function prepareImportedSaveText(
  text: string,
  importedAtUtc: string,
  limits: Readonly<SaveImportLimits> = DEFAULT_SAVE_IMPORT_LIMITS,
): PreparedSave {
  assertSuppliedSaveTextLimit(text, limits)
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    throw new Error('Imported save text must not be empty.')
  }
  const prepared = trimmed.toUpperCase().startsWith('IDB1:')
    ? prepareIdb1Save(trimmed, limits).prepared
    : PreparedSave.fromDecoded(
        deserializeWebSaveBounded(trimmed, limits),
      )
  return prepareImportedSave(prepared, importedAtUtc)
}
