import type { SaveRepository } from '../save/repository'
import type { StartupSaveResolver, StartupSaveResolution } from '../save/startupResolver'
import { prepareImportedSaveText } from '../save/import'
import { serializeCloudWebSave } from '../save/serialization'
import { UnsupportedFutureSaveSchemaError } from '../save/migrate'
import { packSettingsFlags } from '../save/settingsFlags'
import type { PreparedSave } from '../save/prepare'

export interface PortableCloud {
  read(): Promise<string | null>
  readBackups?(): Promise<readonly string[]>
  choose(local: string, remote: string): Promise<'local' | 'cloud'>
  publish(text: string): Promise<void>
  acknowledge(text: string): Promise<void>
}

type BlockedCloudSave = Extract<StartupSaveResolution, { kind: 'blocked' }>

type CloudSavePreparation =
  | {
      readonly kind: 'prepared'
      readonly save: PreparedSave
      readonly text: string
      readonly source: 'cloud' | 'recovered-canonical'
    }
  | BlockedCloudSave

/** Only composed for a host with Cloud capability. Remote bytes never bypass preparation. */
export class CloudStartupResolver implements StartupSaveResolver {
  private readonly local: StartupSaveResolver
  private readonly repository: SaveRepository
  private readonly cloud: PortableCloud

  constructor(
    local: StartupSaveResolver,
    repository: SaveRepository,
    cloud: PortableCloud,
  ) {
    this.local = local
    this.repository = repository
    this.cloud = cloud
  }

  async resolve(): Promise<StartupSaveResolution> {
    let text: string | null
    try {
      text = await this.cloud.read()
    } catch {
      return this.local.resolve()
    }
    if (text === null) return this.local.resolve()

    const remote = await this.prepareRemoteSave(text)
    if (remote.kind === 'blocked') return remote

    try {
      const current = await this.loadLocalSaveForComparison()
      if (current !== null) {
        const localText = serializeCloudWebSave(current.copyValidatedState())
        if (
          localText !== remote.text &&
          await this.cloud.choose(localText, remote.text) === 'local'
        ) {
          await this.cloud.acknowledge(text)
          return this.local.resolve()
        }
      }
      let selected = remote.save
      if (current?.copyValidatedState().debugEverEnabled === true) {
        // Older Cloud uploads stripped the earned unlock. Do not revoke a
        // locally proven purchase when selecting one of those checkpoints.
        const source = selected.copyValidatedState()
        source.debugEverEnabled = true
        packSettingsFlags(source)
        selected = selected.withValidatedState(source)
      }
      const committed = await this.repository.commit(selected)
      // Acknowledge the downloaded primary even when a backup supplied the
      // recovered save: this is the remote version the player resolved.
      await this.cloud.acknowledge(text)
      return { kind: 'ready', source: remote.source, save: committed }
    } catch (error) {
      return {
        kind: 'blocked',
        reason: 'recovery-write-failed',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private async prepareRemoteSave(text: string): Promise<CloudSavePreparation> {
    try {
      return { kind: 'prepared', save: prepareCloudSave(text), text, source: 'cloud' }
    } catch (error) {
      if (error instanceof UnsupportedFutureSaveSchemaError) {
        return unsupportedCloudSave('save')
      }
    }

    const backups = await this.cloud.readBackups?.().catch(() => []) ?? []
    for (const candidate of backups) {
      try {
        return {
          kind: 'prepared',
          save: prepareCloudSave(candidate),
          text: candidate,
          source: 'recovered-canonical',
        }
      } catch (error) {
        if (error instanceof UnsupportedFutureSaveSchemaError) {
          return unsupportedCloudSave('backup')
        }
        // Try the next preserved backup only when this one is damaged.
      }
    }

    // Preserve future/corrupt remote data; never overwrite it from a fallback session.
    return {
      kind: 'blocked',
      reason: 'all-candidates-invalid',
      error: 'Steam Cloud save could not be validated. The Cloud file has been preserved.',
    }
  }

  private async loadLocalSaveForComparison(): Promise<PreparedSave | null> {
    try {
      return await this.repository.loadCurrent()
    } catch (error) {
      if (error instanceof UnsupportedFutureSaveSchemaError) throw error
      // The repository retains the old primary in its normal recovery rotation.
      return null
    }
  }
}

function prepareCloudSave(candidate: string): PreparedSave {
  const now = new Date().toISOString()
  const context = { kind: 'transitional-web-upgrade', upgradedAtUtc: now } as const
  // Re-serialize through the portable boundary before preparing, keeping
  // Cloud lifecycle timestamps while stripping device/ownership claims.
  const decoded = prepareImportedSaveText(candidate, now, undefined, context)
  return prepareImportedSaveText(
    serializeCloudWebSave(decoded.copyValidatedState()),
    now,
    undefined,
    context,
  )
}

function unsupportedCloudSave(source: 'save' | 'backup'): BlockedCloudSave {
  return {
    kind: 'blocked',
    reason: 'unsupported-future-version',
    error: `This Steam Cloud ${source} needs a newer game version. Its original file has been preserved.`,
  }
}
