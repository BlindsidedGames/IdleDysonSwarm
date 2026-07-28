import { prepareIdb1Save, prepareImportedSave, PreparedSave } from './prepare'
import { deserializeWebSave } from './serialization'

/**
 * Decodes either shipped Unity (`IDB1`) or canonical web (`IDSWEB1`) text,
 * runs the shared preparation pipeline, and consumes its remote lifecycle
 * timestamp before the caller performs a verified commit.
 */
export function prepareImportedSaveText(
  text: string,
  importedAtUtc: string,
): PreparedSave {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    throw new Error('Imported save text must not be empty.')
  }
  const prepared = trimmed.toUpperCase().startsWith('IDB1:')
    ? prepareIdb1Save(trimmed).prepared
    : PreparedSave.fromDecoded(deserializeWebSave(trimmed))
  return prepareImportedSave(prepared, importedAtUtc)
}
