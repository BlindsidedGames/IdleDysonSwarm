import { decodeIdb1Save } from './decodeIdb1'
import { deepCloneSave, type SaveRecord } from './graph'
import {
  CURRENT_SAVE_SCHEMA,
  migrateDecodedSave,
  type SaveMigrationResult,
} from './migrate'
import { validatePreparedSave } from './validate'

/**
 * Opaque proof that a decoded save has passed the shared migration, numeric
 * repair, and schema validation pipeline. Runtime code and persistence accept
 * this type instead of an arbitrary object graph.
 */
export class PreparedSave {
  readonly sourceSchema: number
  readonly targetSchema: number
  readonly appliedSteps: readonly string[]
  readonly numericRepair: SaveMigrationResult['numericRepair']
  private readonly preparedState: SaveRecord

  private constructor(migration: SaveMigrationResult) {
    this.sourceSchema = migration.sourceSchema
    this.targetSchema = migration.targetSchema
    this.appliedSteps = [...migration.appliedSteps]
    this.numericRepair = migration.numericRepair
    this.preparedState = deepCloneSave(migration.save)
  }

  static fromDecoded(candidate: unknown): PreparedSave {
    return PreparedSave.prepareDecoded(candidate).prepared
  }

  static prepareDecoded(candidate: unknown): {
    readonly prepared: PreparedSave
    readonly migration: SaveMigrationResult
  } {
    const migration = migrateDecodedSave(candidate)
    if (!migration.validation.valid) {
      throw new Error(
        migration.validation.error ?? 'Prepared save failed validation.',
      )
    }
    return { prepared: new PreparedSave(migration), migration }
  }

  copyState(): SaveRecord {
    return deepCloneSave(this.preparedState)
  }

  copyValidatedState(): SaveRecord {
    const state = this.copyState()
    const validation = validatePreparedSave(state, this.targetSchema)
    if (!validation.valid) {
      throw new Error(
        validation.error ?? 'Prepared save failed validation before use.',
      )
    }
    return state
  }

  withValidatedState(candidate: unknown): PreparedSave {
    const state = deepCloneSave(candidate) as SaveRecord
    const validation = validatePreparedSave(state, CURRENT_SAVE_SCHEMA)
    if (!validation.valid) {
      throw new Error(
        validation.error ?? 'Replacement save failed validation.',
      )
    }
    return new PreparedSave({
      save: state,
      sourceSchema: CURRENT_SAVE_SCHEMA,
      targetSchema: CURRENT_SAVE_SCHEMA,
      appliedSteps: [],
      numericRepair: { entries: [], repairCount: 0 },
      validation,
    })
  }
}

export interface PreparedLegacySave {
  readonly envelope: 'IDB1'
  readonly decodedBytes: number
  readonly migration: SaveMigrationResult
  readonly prepared: PreparedSave
}

/**
 * Establishes a fresh local lifecycle baseline before an imported save is
 * committed. The historical quit timestamp is consumed by the source runtime
 * and must not award away time again on the importing runtime.
 *
 * The stored offline-time bank and all unrecognized fields are intentionally
 * preserved. Time acquisition remains the caller's responsibility so this
 * transformation is deterministic and platform independent.
 */
export function prepareImportedSave(
  source: PreparedSave,
  importedAtUtc: string,
): PreparedSave {
  if (importedAtUtc.trim().length === 0) {
    throw new Error('Import timestamp must not be empty.')
  }

  const candidate = source.copyValidatedState()
  candidate.dateQuitString = ''
  candidate.lastSuccessfulLoadUtc = importedAtUtc
  return source.withValidatedState(candidate)
}

export function prepareIdb1Save(text: string): PreparedLegacySave {
  const decoded = decodeIdb1Save(text)
  const { prepared, migration } = PreparedSave.prepareDecoded(decoded.root)
  return {
    envelope: decoded.envelope,
    decodedBytes: decoded.binaryBytes,
    migration,
    prepared,
  }
}
