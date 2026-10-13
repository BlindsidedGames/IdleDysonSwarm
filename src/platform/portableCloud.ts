import type { SaveRepository } from '../save/repository'
import type { StartupSaveResolver, StartupSaveResolution } from '../save/startupResolver'
import { prepareImportedSaveText } from '../save/import'
import { serializeCloudWebSave } from '../save/serialization'
import { UnsupportedFutureSaveSchemaError } from '../save/migrate'
import { packSettingsFlags } from '../save/settingsFlags'
import { sha256Utf8 } from '../save/automaticPurchaseEvidence'
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
  private readonly deferPublication?: (save: PreparedSave) => boolean
  private publicationAllowed = false

  constructor(
    local: StartupSaveResolver,
    repository: SaveRepository,
    cloud: PortableCloud,
    deferPublication?: (save: PreparedSave) => boolean,
  ) {
    this.local = local
    this.repository = repository
    this.cloud = cloud
    this.deferPublication = deferPublication
  }

  async resolve(): Promise<StartupSaveResolution> {
    this.publicationAllowed = false
    let text: string | null
    try {
      text = await this.cloud.read()
    } catch {
      return this.local.resolve()
    }
    if (text === null) {
      this.publicationAllowed = true
      return this.local.resolve()
    }

    try {
      const current = await this.loadLocalSaveForComparison()
      const downloadedHash = await sha256Utf8(text)
      const currentState = current?.copyValidatedState()
      const selectedSourceHash = currentState?.idsResolvedCloudSourceSha256
      if (current !== null && !this.deferPublication?.(current) &&
          currentState?.idsResolvedCloudDownloadSha256 === downloadedHash &&
          typeof selectedSourceHash === 'string') {
        // The choice survived a crash/failed acknowledgement. Keep subsequent
        // local progress and finish only the original transport completion.
        const resolution = await this.local.resolve()
        if (resolution.kind !== 'blocked') {
          // Local completion is authoritative even if its optional remote
          // acknowledgement is still unavailable. Changed/missing backups
          // must neither replay the choice nor enable publication.
          try {
            if (selectedSourceHash === downloadedHash) {
              await this.completeDownload(text)
            } else {
              const selected = await this.prepareRemoteSave(text)
              if (selected.kind === 'prepared' && await sha256Utf8(selected.text) === selectedSourceHash) {
                await this.completeDownload(text, selected.text)
              }
            }
          } catch { /* Continue the verified local game with Cloud disabled. */ }
        }
        return resolution
      }
      const remote = await this.prepareRemoteSave(text)
      if (remote.kind === 'blocked') return remote
      const sourceHash = await sha256Utf8(remote.text)
      if (current !== null) {
        const localText = serializeCloudWebSave(current.copyValidatedState())
        if (
          localText !== remote.text &&
          await this.cloud.choose(localText, remote.text) === 'local'
        ) {
          const resolution = await this.local.resolve()
          if (resolution.kind === 'blocked') return resolution
          if (resolution.publicationPending) {
            return { ...resolution, pendingPublication: {
              ...resolution.pendingPublication,
              prepareForCommit: save => withDownloadCompletion(
                resolution.pendingPublication?.prepareForCommit?.(save) ?? save,
                downloadedHash, sourceHash,
              ),
              beforeCommit: async () => {
                await this.requireUnchangedDownload(text, remote.text)
                await resolution.pendingPublication?.beforeCommit?.()
              },
              afterCommit: async () => {
                await resolution.pendingPublication?.afterCommit?.()
                await this.completeDownload(text, remote.text)
              },
            } }
          }
          try { await this.completeDownload(text, remote.text) } catch { /* Keep the verified local game playable. */ }
          return resolution
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
      selected = withDownloadCompletion(selected, downloadedHash, sourceHash)
      if (this.deferPublication?.(selected)) {
        return { kind: 'ready', source: remote.source, save: selected, publicationPending: true,
          pendingPublication: {
            sourceText: text === remote.text ? text : [text, remote.text],
            beforeCommit: () => this.requireUnchangedDownload(text, remote.text),
            afterCommit: () => this.completeDownload(text, remote.text),
          } }
      }
      await this.requireUnchangedDownload(text, remote.text)
      const committed = await this.repository.commit(selected, 'development', text === remote.text ? text : [text, remote.text])
      // Acknowledge the downloaded primary even when a backup supplied the
      // recovered save: this is the remote version the player resolved.
      try { await this.completeDownload(text, remote.text) } catch { /* The local publication already completed. */ }
      return { kind: 'ready', source: remote.source, save: committed }
    } catch (error) {
      return {
        kind: 'blocked',
        reason: error instanceof UnsupportedFutureSaveSchemaError ? 'unsupported-future-version' : 'recovery-write-failed',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /** Refuse reporting over an unresolved or newer download. */
  async publishCheckpoint(text: string): Promise<void> {
    if (!this.publicationAllowed) throw new Error('Cloud startup transaction is unresolved.')
    if (await this.cloud.read() !== null) {
      this.publicationAllowed = false
      throw new Error('Cloud changed; restart to resolve the new download.')
    }
    await this.cloud.publish(text)
  }

  private async requireUnchangedRemote(text: string): Promise<void> {
    if (await this.cloud.read() !== text) {
      throw new Error('Cloud changed while the migration choice was pending; restart to resolve it.')
    }
  }

  private async requireUnchangedDownload(text: string, selected: string): Promise<void> {
    await this.requireUnchangedRemote(text)
    if (text !== selected) {
      const currentSelection = await this.prepareRemoteSave(text)
      if (currentSelection.kind !== 'prepared' || currentSelection.text !== selected) {
        throw new Error('Cloud backup changed while the migration choice was pending; restart to resolve it.')
      }
      // Recovery preparation may await backup I/O. Recheck its primary before
      // allowing the final local write or acknowledgement.
      await this.requireUnchangedRemote(text)
    }
  }

  private async completeDownload(text: string, selected = text): Promise<void> {
    await this.requireUnchangedDownload(text, selected)
    await this.cloud.acknowledge(text)
    this.publicationAllowed = true
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

function withDownloadCompletion(save: PreparedSave, hash: string, sourceHash: string): PreparedSave {
  const state = save.copyValidatedState()
  state.idsResolvedCloudDownloadSha256 = hash
  state.idsResolvedCloudSourceSha256 = sourceHash
  return save.withValidatedState(state)
}
