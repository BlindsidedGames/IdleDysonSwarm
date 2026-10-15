import { PreparedSave } from './prepare'
import type {
  FirstLaunchMigrationResult,
  LegacySaveCandidate,
  SaveCommitTarget,
  SaveRepository,
} from './repository'

export type StartupReadySource =
  | 'primary'
  | 'cloud'
  | 'recovered-canonical'
  | 'recovered-legacy'

export type StartupBlockedReason =
  | 'unsupported-future-version'
  | 'all-candidates-invalid'
  | 'recovery-write-failed'
  | 'storage-failed'

export type StartupSaveResolution =
  | {
      readonly kind: 'ready'
      readonly source: StartupReadySource
      readonly save: PreparedSave
    }
  | {
      readonly kind: 'first-run'
      readonly save: PreparedSave
    }
  | {
      readonly kind: 'blocked'
      readonly reason: StartupBlockedReason
      readonly error: string
      readonly candidate?: LegacySaveCandidate
    }

export interface StartupSaveResolver {
  resolve(): Promise<StartupSaveResolution>
}

export type FirstRunSaveFactory = () => PreparedSave

/**
 * Adapts the current portable repository to the startup publication contract.
 *
 * The repository owns candidate preparation and verified replacement. This
 * adapter classifies its result and ensures a migrated or numerically repaired
 * primary is durably committed before returning it as publishable.
 */
export class RepositoryStartupSaveResolver implements StartupSaveResolver {
  private readonly repository: SaveRepository
  private readonly createFirstRunSave: FirstRunSaveFactory
  private readonly commitTarget: SaveCommitTarget

  constructor(
    repository: SaveRepository,
    createFirstRunSave: FirstRunSaveFactory,
    commitTarget: SaveCommitTarget = 'development',
  ) {
    this.repository = repository
    this.createFirstRunSave = createFirstRunSave
    this.commitTarget = commitTarget
  }

  async resolve(): Promise<StartupSaveResolution> {
    let result: FirstLaunchMigrationResult
    try {
      result = await this.repository.migrateLegacyOnFirstLaunch()
    } catch (error) {
      return blocked('storage-failed', error)
    }

    switch (result.status) {
      case 'already-migrated':
        return this.resolvePrimary(result.save)
      case 'migrated':
        return {
          kind: 'ready',
          source: 'recovered-legacy',
          save: result.save,
        }
      case 'recovered-backup':
        return {
          kind: 'ready',
          source: 'recovered-canonical',
          save: result.save,
        }
      case 'no-legacy-save':
        try {
          return { kind: 'first-run', save: this.createFirstRunSave() }
        } catch (error) {
          return blocked('storage-failed', error)
        }
      case 'unsupported-future-version':
        return {
          ...blocked('unsupported-future-version', result.error),
          candidate: result.candidate,
        }
      case 'recovery-write-failed':
        return {
          ...blocked('recovery-write-failed', result.error),
          candidate:
            'text' in result.source ? result.source : undefined,
        }
      case 'current-invalid':
      case 'legacy-invalid':
        return {
          ...blocked('all-candidates-invalid', result.error),
          candidate:
            result.status === 'legacy-invalid' ? result.source : undefined,
        }
    }
  }

  private async resolvePrimary(
    save: PreparedSave,
  ): Promise<StartupSaveResolution> {
    if (!requiresVerifiedCommit(save)) {
      return { kind: 'ready', source: 'primary', save }
    }

    try {
      const committed = await this.repository.commit(
        save,
        this.commitTarget,
      )
      return { kind: 'ready', source: 'primary', save: committed }
    } catch (error) {
      return blocked('recovery-write-failed', error)
    }
  }
}

function requiresVerifiedCommit(save: PreparedSave): boolean {
  return (
    save.sourceSchema !== save.targetSchema ||
    save.numericRepair.repairCount > 0
  )
}

function blocked(
  reason: StartupBlockedReason,
  error: unknown,
): Extract<StartupSaveResolution, { readonly kind: 'blocked' }> {
  return {
    kind: 'blocked',
    reason,
    error: error instanceof Error ? error.message : String(error),
  }
}
