import { decodeIdb1Save } from './decodeIdb1'
import { migrateDecodedSave, type SaveMigrationResult } from './migrate'

export interface PreparedLegacySave {
  readonly envelope: 'IDB1'
  readonly decodedBytes: number
  readonly migration: SaveMigrationResult
}

export function prepareIdb1Save(text: string): PreparedLegacySave {
  const decoded = decodeIdb1Save(text)
  const migration = migrateDecodedSave(decoded.root)
  if (!migration.validation.valid) {
    throw new Error(
      migration.validation.error ?? 'Prepared legacy save failed validation.',
    )
  }
  return {
    envelope: decoded.envelope,
    decodedBytes: decoded.binaryBytes,
    migration,
  }
}
