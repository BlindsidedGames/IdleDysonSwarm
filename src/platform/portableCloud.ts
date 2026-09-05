import type { SaveRepository } from '../save/repository'
import type { StartupSaveResolver, StartupSaveResolution } from '../save/startupResolver'
import { prepareImportedSaveText } from '../save/import'
import { serializeSharedWebSave } from '../save/serialization'
import { UnsupportedFutureSaveSchemaError } from '../save/migrate'
import type { PreparedSave } from '../save/prepare'
export interface PortableCloud {
  read(): Promise<string | null>
  readBackups?(): Promise<readonly string[]>
  choose(local: string, remote: string): Promise<'local' | 'cloud'>
  publish(text: string): Promise<void>
  acknowledge(text: string): Promise<void>
}
/** Only composed for a host with Cloud capability. Remote bytes never bypass preparation. */
export class CloudStartupResolver implements StartupSaveResolver {
  private readonly local: StartupSaveResolver
  private readonly repository: SaveRepository
  private readonly cloud: PortableCloud
  constructor(local: StartupSaveResolver, repository: SaveRepository, cloud: PortableCloud) {
    this.local=local;this.repository=repository;this.cloud=cloud
  }
  async resolve(): Promise<StartupSaveResolution> {
    let text: string | null
    try { text = await this.cloud.read() } catch { return this.local.resolve() }
    if (text === null) return this.local.resolve()
    let remote: PreparedSave | undefined
    let remoteText = text
    let recoveredBackup = false
    const prepare = (candidate: string) => {
      const now = new Date().toISOString()
      // Re-serialize through the portable boundary before preparing, keeping
      // Cloud lifecycle timestamps while stripping device/ownership claims.
      const decoded = prepareImportedSaveText(candidate, now, undefined, {kind:'transitional-web-upgrade',upgradedAtUtc:now})
      return prepareImportedSaveText(serializeSharedWebSave(decoded.copyValidatedState()),now,undefined,{kind:'transitional-web-upgrade',upgradedAtUtc:now})
    }
    try { remote = prepare(text) } catch(error) {
      if (error instanceof UnsupportedFutureSaveSchemaError) return {kind:'blocked',reason:'unsupported-future-version',error:'This Steam Cloud save needs a newer game version. Its original file has been preserved.'}
      for (const candidate of await this.cloud.readBackups?.().catch(() => []) ?? []) {
        try { remote=prepare(candidate);remoteText=candidate;recoveredBackup=true;break } catch (error) {
          if (error instanceof UnsupportedFutureSaveSchemaError) return {kind:'blocked',reason:'unsupported-future-version',error:'This Steam Cloud backup needs a newer game version. Its original file has been preserved.'}
          // Try the next preserved backup only when this one is damaged.
        }
      }
    }
    if (remote === undefined) {
      // Preserve future/corrupt remote data; never overwrite it from a fallback session.
      return {kind:'blocked',reason:'all-candidates-invalid',error:'Steam Cloud save could not be validated. The Cloud file has been preserved.'}
    }
    try {
      let current: PreparedSave | null
      try { current = await this.repository.loadCurrent() } catch(error) {
        if (error instanceof UnsupportedFutureSaveSchemaError) throw error
        // The repository retains the old primary in its normal recovery rotation.
        current = null
      }
      if (current !== null) {
        const localText = serializeSharedWebSave(current.copyValidatedState())
        if (localText !== remoteText && await this.cloud.choose(localText,remoteText) === 'local') {
          await this.cloud.acknowledge(text)
          return this.local.resolve()
        }
      }
      const committed = await this.repository.commit(remote)
      await this.cloud.acknowledge(text)
      return {kind:'ready',source:recoveredBackup?'recovered-canonical':'cloud',save:committed}
    } catch (error) {
      return {kind:'blocked',reason:'recovery-write-failed',error:error instanceof Error?error.message:String(error)}
    }
  }
}
