import { migrateDecodedSave, type SaveMigrationResult } from './migrate'
import { deserializeWebSave, serializeWebSave } from './serialization'
import { type SaveRecord } from './graph'

export interface LegacySaveCandidate {
  readonly id: string
  readonly sourcePath: string
  readonly text: string
}

export interface SaveStorageAdapter {
  exists(path: string): Promise<boolean>
  readText(path: string): Promise<string>
  writeText(path: string, contents: string): Promise<void>
  replaceAtomically(temporaryPath: string, destinationPath: string): Promise<void>
  copy(sourcePath: string, destinationPath: string): Promise<void>
  discoverLegacyCandidates(): Promise<readonly LegacySaveCandidate[]>
}

export interface SaveRepositoryPaths {
  readonly current: string
  readonly temporary: string
  readonly legacyRecovery: string
}

export interface SaveRepository {
  loadCurrent(): Promise<SaveRecord | null>
  migrateLegacyOnFirstLaunch(): Promise<FirstLaunchMigrationResult>
  commit(save: SaveRecord): Promise<void>
}

export type FirstLaunchMigrationResult =
  | { readonly status: 'already-migrated'; readonly save: SaveRecord }
  | { readonly status: 'no-legacy-save' }
  | {
      readonly status: 'migrated'
      readonly source: LegacySaveCandidate
      readonly migration: SaveMigrationResult
    }
  | {
      readonly status: 'legacy-invalid'
      readonly source: LegacySaveCandidate
      readonly error: string
    }

export type LegacySaveDecoder = (text: string) => unknown

/**
 * Platform shells supply only filesystem discovery and atomic primitives.
 * Decode, migration and validation remain shared TypeScript behavior.
 */
export class PortableSaveRepository implements SaveRepository {
  private readonly storage: SaveStorageAdapter
  private readonly paths: SaveRepositoryPaths
  private readonly decodeLegacy: LegacySaveDecoder

  constructor(
    storage: SaveStorageAdapter,
    paths: SaveRepositoryPaths,
    decodeLegacy: LegacySaveDecoder,
  ) {
    this.storage = storage
    this.paths = paths
    this.decodeLegacy = decodeLegacy
  }

  async loadCurrent(): Promise<SaveRecord | null> {
    if (!(await this.storage.exists(this.paths.current))) return null
    return deserializeWebSave(await this.storage.readText(this.paths.current))
  }

  async migrateLegacyOnFirstLaunch(): Promise<FirstLaunchMigrationResult> {
    const current = await this.loadCurrent()
    if (current) return { status: 'already-migrated', save: current }
    const candidates = await this.storage.discoverLegacyCandidates()
    if (candidates.length === 0) return { status: 'no-legacy-save' }

    let lastFailure:
      | {
          readonly status: 'legacy-invalid'
          readonly source: LegacySaveCandidate
          readonly error: string
        }
      | undefined
    for (const source of candidates) {
      try {
        const migration = migrateDecodedSave(this.decodeLegacy(source.text))
        if (!migration.validation.valid) {
          lastFailure = {
            status: 'legacy-invalid',
            source,
            error: migration.validation.error ?? 'Unknown validation failure.',
          }
          continue
        }
        await this.storage.copy(source.sourcePath, this.paths.legacyRecovery)
        await this.commit(migration.save)
        return { status: 'migrated', source, migration }
      } catch (error) {
        lastFailure = {
          status: 'legacy-invalid',
          source,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }
    return lastFailure ?? { status: 'no-legacy-save' }
  }

  async commit(save: SaveRecord): Promise<void> {
    const encoded = serializeWebSave(save)
    await this.storage.writeText(this.paths.temporary, encoded)
    const verified = deserializeWebSave(
      await this.storage.readText(this.paths.temporary),
    )
    if (serializeWebSave(verified) !== encoded) {
      throw new Error('Temporary save verification failed before atomic replace.')
    }
    await this.storage.replaceAtomically(
      this.paths.temporary,
      this.paths.current,
    )
  }
}
