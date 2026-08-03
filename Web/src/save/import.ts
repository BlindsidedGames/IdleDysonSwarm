import { prepareIdb1Save, prepareImportedSave, PreparedSave } from './prepare'
import { deserializeWebSaveBounded } from './serialization'
import {
  COMPRESSED_WEB_SAVE_PREFIX,
  deserializeCompressedWebSave,
} from './compressedWebSave'
import {
  assertSuppliedSaveTextLimit,
  DEFAULT_SAVE_IMPORT_LIMITS,
  type SaveImportLimits,
} from './decodeIdb1'

/**
 * Decodes shipped Unity (`IDB1`), compressed Web (`IDSWEB1:`), or canonical
 * raw Web (`IDSWEB1` JSON) text,
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
  const upper = trimmed.toUpperCase()
  const prepared = upper.startsWith('IDB1:')
    ? prepareIdb1Save(trimmed, limits).prepared
    : upper.startsWith(COMPRESSED_WEB_SAVE_PREFIX)
      ? PreparedSave.fromDecoded(
          deserializeCompressedWebSave(trimmed, limits),
        )
      : PreparedSave.fromDecoded(
          deserializeWebSaveBounded(trimmed, limits),
        )
  return prepareImportedSave(prepared, importedAtUtc)
}
