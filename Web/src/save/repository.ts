import {
  UnsupportedFutureSaveSchemaError,
  type SaveMigrationResult,
} from './migrate'
import { deserializeWebSave, serializeWebSave } from './serialization'
import { PreparedSave } from './prepare'

export interface LegacySaveCandidate {
  readonly id: string
  readonly sourcePath: string
  readonly text: string
}

export type SaveRecoverySource =
  | LegacySaveCandidate
  | { readonly id: 'web-backup'; readonly sourcePath: string }

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
  /** Latest-to-oldest publication history rotated before each replacement. */
  readonly backups?: readonly [latest: string, previous: string, oldest: string]
}

export interface SaveRepository {
  hasCurrent(): Promise<boolean>
  loadCurrent(): Promise<PreparedSave | null>
  migrateLegacyOnFirstLaunch(): Promise<FirstLaunchMigrationResult>
  commit(
    save: PreparedSave,
    target?: SaveCommitTarget,
  ): Promise<PreparedSave>
}

export type SaveCommitTarget = 'development' | 'canonical-player'

export interface SaveRepositoryPolicy {
  readonly allowCanonicalPlayerWrites: boolean
}

export type FirstLaunchMigrationResult =
  | { readonly status: 'already-migrated'; readonly save: PreparedSave }
  | {
      readonly status: 'recovered-backup'
      readonly sourcePath: string
      readonly save: PreparedSave
    }
  | { readonly status: 'no-legacy-save' }
  | { readonly status: 'current-invalid'; readonly error: string }
  | {
      readonly status: 'unsupported-future-version'
      readonly source: 'current' | 'backup' | 'legacy'
      readonly candidate?: LegacySaveCandidate
      readonly error: string
    }
  | {
      readonly status: 'migrated'
      readonly source: LegacySaveCandidate
      readonly migration: SaveMigrationResult
      readonly save: PreparedSave
    }
  | {
      readonly status: 'legacy-invalid'
      readonly source: LegacySaveCandidate
      readonly error: string
    }
  | {
      readonly status: 'recovery-write-failed'
      readonly source: SaveRecoverySource
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

  async hasCurrent(): Promise<boolean> {
    return this.storage.exists(this.paths.current)
  }

  async loadCurrent(): Promise<PreparedSave | null> {
    if (!(await this.hasCurrent())) return null
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
      if (error instanceof UnsupportedFutureSaveSchemaError) {
        return {
          status: 'unsupported-future-version',
          source: 'current',
          error: error.message,
        }
      }
      currentError = error instanceof Error ? error.message : String(error)
    }
    if (current) return { status: 'already-migrated', save: current }

    const backupRecovery = await this.recoverNewestValidBackup()
    if (
      backupRecovery !== null &&
      backupRecovery.status !== 'backup-invalid'
    ) {
      return backupRecovery
    }
    currentError ??= backupRecovery?.error

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
      let migration: SaveMigrationResult
      let prepared: PreparedSave
      try {
        const preparation = PreparedSave.prepareDecoded(
          this.decodeLegacy(source.text),
        )
        migration = preparation.migration
        prepared = preparation.prepared
        if (!migration.validation.valid) {
          lastFailure = {
            status: 'legacy-invalid',
            source,
            error: migration.validation.error ?? 'Unknown validation failure.',
          }
          continue
        }
      } catch (error) {
        if (error instanceof UnsupportedFutureSaveSchemaError) {
          return {
            status: 'unsupported-future-version',
            source: 'legacy',
            candidate: source,
            error: error.message,
          }
        }
        lastFailure = {
          status: 'legacy-invalid',
          source,
          error: error instanceof Error ? error.message : String(error),
        }
        continue
      }

      try {
        await this.storage.copy(source.sourcePath, this.paths.legacyRecovery)
        const committed = await this.commit(prepared)
        return { status: 'migrated', source, migration, save: committed }
      } catch (error) {
        return {
          status: 'recovery-write-failed',
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
  ): Promise<PreparedSave> {
    return this.publish(save, target, true)
  }

  private async publish(
    save: PreparedSave,
    target: SaveCommitTarget,
    rotateBackups: boolean,
  ): Promise<PreparedSave> {
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
    const committed = PreparedSave.fromDecoded(verified)
    if (rotateBackups) await this.rotateBackups()
    await this.storage.replaceAtomically(
      this.paths.temporary,
      this.paths.current,
    )
    return committed
  }

  private async recoverNewestValidBackup(): Promise<
    | FirstLaunchMigrationResult
    | { readonly status: 'backup-invalid'; readonly error: string }
    | null
  > {
    let lastInvalidError: string | undefined
    for (const sourcePath of this.backupPaths()) {
      if (!(await this.storage.exists(sourcePath))) continue
      let prepared: PreparedSave
      try {
        prepared = PreparedSave.fromDecoded(
          deserializeWebSave(await this.storage.readText(sourcePath)),
        )
      } catch (error) {
        if (error instanceof UnsupportedFutureSaveSchemaError) {
          return {
            status: 'unsupported-future-version',
            source: 'backup',
            error: error.message,
          }
        }
        lastInvalidError =
          error instanceof Error ? error.message : String(error)
        continue
      }
      let committed: PreparedSave
      try {
        committed = await this.publish(
          prepared,
          'development',
          false,
        )
      } catch (error) {
        return {
          status: 'recovery-write-failed',
          source: { id: 'web-backup', sourcePath },
          error: error instanceof Error ? error.message : String(error),
        }
      }
      return {
        status: 'recovered-backup',
        sourcePath,
        save: committed,
      }
    }
    return lastInvalidError === undefined
      ? null
      : { status: 'backup-invalid', error: lastInvalidError }
  }

  private async rotateBackups(): Promise<void> {
    if (!(await this.storage.exists(this.paths.current))) return
    const backups = this.backupPaths()
    if (await this.storage.exists(backups[1])) {
      await this.storage.copy(backups[1], backups[2])
    }
    if (await this.storage.exists(backups[0])) {
      await this.storage.copy(backups[0], backups[1])
    }
    await this.storage.copy(this.paths.current, backups[0])
  }

  private backupPaths(): readonly [string, string, string] {
    return (
      this.paths.backups ?? [
        `${this.paths.current}.backup.1`,
        `${this.paths.current}.backup.2`,
        `${this.paths.current}.backup.3`,
      ]
    )
  }
}
