import { type SaveMigrationResult } from './migrate'
import { deserializeWebSave, serializeWebSave } from './serialization'
import { PreparedSave } from './prepare'

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
  loadCurrent(): Promise<PreparedSave | null>
  migrateLegacyOnFirstLaunch(): Promise<FirstLaunchMigrationResult>
  commit(
    save: PreparedSave,
    target?: SaveCommitTarget,
  ): Promise<void>
}

export type SaveCommitTarget = 'development' | 'canonical-player'

export interface SaveRepositoryPolicy {
  readonly allowCanonicalPlayerWrites: boolean
}

export type FirstLaunchMigrationResult =
  | { readonly status: 'already-migrated'; readonly save: PreparedSave }
  | { readonly status: 'no-legacy-save' }
  | { readonly status: 'current-invalid'; readonly error: string }
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
  private readonly policy: SaveRepositoryPolicy

  constructor(
    storage: SaveStorageAdapter,
    paths: SaveRepositoryPaths,
    decodeLegacy: LegacySaveDecoder,
    policy: SaveRepositoryPolicy = {
      allowCanonicalPlayerWrites: false,
    },
  ) {
    this.storage = storage
    this.paths = paths
    this.decodeLegacy = decodeLegacy
    this.policy = policy
  }

  async loadCurrent(): Promise<PreparedSave | null> {
    if (!(await this.storage.exists(this.paths.current))) return null
    const decoded = deserializeWebSave(
      await this.storage.readText(this.paths.current),
    )
    return PreparedSave.fromDecoded(decoded)
  }

  async migrateLegacyOnFirstLaunch(): Promise<FirstLaunchMigrationResult> {
    let current: PreparedSave | null = null
    let currentError: string | undefined
    try {
      current = await this.loadCurrent()
    } catch (error) {
      currentError = error instanceof Error ? error.message : String(error)
    }
    if (current) return { status: 'already-migrated', save: current }
    const candidates = await this.storage.discoverLegacyCandidates()
    if (candidates.length === 0) {
      return currentError
        ? { status: 'current-invalid', error: currentError }
        : { status: 'no-legacy-save' }
    }

    let lastFailure:
      | {
          readonly status: 'legacy-invalid'
          readonly source: LegacySaveCandidate
          readonly error: string
        }
      | undefined
    for (const source of candidates) {
      try {
        const { migration, prepared } = PreparedSave.prepareDecoded(
          this.decodeLegacy(source.text),
        )
        if (!migration.validation.valid) {
          lastFailure = {
            status: 'legacy-invalid',
            source,
            error: migration.validation.error ?? 'Unknown validation failure.',
          }
          continue
        }
        await this.storage.copy(source.sourcePath, this.paths.legacyRecovery)
        await this.commit(prepared)
        return { status: 'migrated', source, migration }
      } catch (error) {
        lastFailure = {
          status: 'legacy-invalid',
          source,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }
    return (
      lastFailure ??
      (currentError
        ? { status: 'current-invalid', error: currentError }
        : { status: 'no-legacy-save' })
    )
  }

  async commit(
    save: PreparedSave,
    target: SaveCommitTarget = 'development',
  ): Promise<void> {
    if (
      target === 'canonical-player' &&
      !this.policy.allowCanonicalPlayerWrites
    ) {
      throw new Error(
        'Canonical player-save writes are disabled until mapping coverage is complete.',
      )
    }
    const normalized = PreparedSave.fromDecoded(
      save.copyValidatedState(),
    )
    const encoded = serializeWebSave(normalized.copyValidatedState())
    await this.storage.writeText(this.paths.temporary, encoded)
    const verified = deserializeWebSave(
      await this.storage.readText(this.paths.temporary),
    )
    if (serializeWebSave(verified) !== encoded) {
      throw new Error('Temporary save verification failed before atomic replace.')
    }
    PreparedSave.fromDecoded(verified)
    await this.storage.replaceAtomically(
      this.paths.temporary,
      this.paths.current,
    )
  }
}
