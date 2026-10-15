import type { PortableCloud } from '../platform/portableCloud'
import { sha256Utf8 } from '../save/automaticPurchaseEvidence'
import { serializeCloudWebSave, deserializeWebSave } from '../save/serialization'
import { packSettingsFlags } from '../save/settingsFlags'
import { packSettingsFlags as packClassicFlags } from '../../classic/src/save/settingsFlags'
import { PreparedSave } from '../save/prepare'
import { serializeCloudWebSave as classicCloud, deserializeWebSave as decodeClassic } from '../../classic/src/save/serialization'
import { PreparedSave as ClassicSave } from '../../classic/src/save/prepare'
import type { ReadOnlyUpgradeSource } from './upgradeDiscovery'
import { ModeSaveStore, type GameMode, type ModeCodecs } from './modeSaveStore'

export const MODE_CLOUD_NAMESPACES = Object.freeze({ classic: 'idleds-classic-v1', modern: 'idleds-modern-v1' })
export interface ModeCloudPort extends PortableCloud {
  /** Discovery must inspect raw remote state even if an old local sync marker
   * says it was acknowledged. A missing local manifest is not a new account. */
  readForUpgrade?(): Promise<string | null>
  readBackupsForUpgrade?(): Promise<readonly string[]>
}
/** Host adapters must honor the supplied namespace. The existing unnamespaced
 * public Cloud input is a separate read-only Classic upgrade source. */
export function createModeCloudAdapters(open: (namespace: string) => PortableCloud): Readonly<Record<GameMode, PortableCloud>> {
  const classic = open(MODE_CLOUD_NAMESPACES.classic), modern = open(MODE_CLOUD_NAMESPACES.modern)
  if (classic === modern) throw new Error('Classic and modern require separate Cloud adapters.')
  return { classic, modern }
}
export function modeCloudText(mode: GameMode, text: string): string {
  if (mode === 'classic') {
    const state = ClassicSave.fromDecoded(decodeClassic(text)).copyValidatedState()
    // These later device-only fields are unknown to the frozen Classic codec.
    delete state.idsResolvedCloudDownloadSha256; delete state.idsResolvedCloudSourceSha256
    return classicCloud(state)
  }
  return serializeCloudWebSave(PreparedSave.fromDecoded(deserializeWebSave(text)).copyValidatedState())
}

/** Preserve only the locally proven in-game purchase, matching the existing
 * CloudStartupResolver contract. Store ownership remains host-owned. */
export function retainModeCloudLocalPurchase(mode: GameMode, local: string, remote: string): string {
  if (mode === 'classic') {
    const old = ClassicSave.fromDecoded(decodeClassic(local)), incoming = ClassicSave.fromDecoded(decodeClassic(remote))
    if (old.copyValidatedState().debugEverEnabled !== true) return remote
    const state = incoming.copyValidatedState(); state.debugEverEnabled = true; packClassicFlags(state)
    return classicCloud(incoming.withValidatedState(state).copyValidatedState())
  }
  const old = PreparedSave.fromDecoded(deserializeWebSave(local)), incoming = PreparedSave.fromDecoded(deserializeWebSave(remote))
  if (old.copyValidatedState().debugEverEnabled !== true) return remote
  const state = incoming.copyValidatedState(); state.debugEverEnabled = true; packSettingsFlags(state)
  return serializeCloudWebSave(incoming.withValidatedState(state).copyValidatedState())
}

/** Same PortableCloud protocol as the existing hosts, with an independent
 * download receipt/publication gate per mode. No real provider is composed by
 * the development host. Failures preserve local progress and remote bytes. */
export class ModeCloudCoordinator {
  private readonly tails: Record<GameMode, Promise<unknown>> = { classic: Promise.resolve(), modern: Promise.resolve() }
  private readonly allowed = { classic: false, modern: false }
  private readonly published: Partial<Record<GameMode, string>> = {}
  private readonly store: ModeSaveStore
  private readonly clouds: Readonly<Record<GameMode, ModeCloudPort>>
  private readonly codecs: ModeCodecs
  private readonly retainPurchase: (mode: GameMode, local: string, remote: string) => string
  private readonly portable: (mode: GameMode, text: string) => string
  constructor(store: ModeSaveStore, clouds: Readonly<Record<GameMode, ModeCloudPort>>, codecs: ModeCodecs,
    portable: (mode: GameMode, text: string) => string = modeCloudText,
    retainPurchase: (mode: GameMode, local: string, remote: string) => string = retainModeCloudLocalPurchase) {
    if (clouds.classic === clouds.modern) throw new Error('Cloud adapters must be mode-separated.')
    this.retainPurchase = retainPurchase
    this.store = store; this.clouds = clouds; this.codecs = codecs; this.portable = portable
  }
  discoverySources(): readonly ReadOnlyUpgradeSource[] {
    return (['classic', 'modern'] as const).map(mode => ({ id: `mode-cloud-${mode}`, mode,
      read: async () => {
        const cloud = this.clouds[mode], text = await (cloud.readForUpgrade?.() ?? cloud.read())
        const backups = await (cloud.readBackupsForUpgrade?.() ?? cloud.readBackups?.() ?? [])
        return [...(text === null ? [] : [{ id: `mode-cloud-${mode}:primary`, role: 'primary' as const, text }]),
          ...backups.map((text, index) => ({ id: `mode-cloud-${mode}:backup-${index + 1}`, role: 'backup' as const, text }))]
      },
      prepare: text => this.prepare(mode, text),
    }))
  }
  resolve(mode: GameMode): Promise<void> {
    return this.serial(mode, async () => {
      this.allowed[mode] = false
      const cloud = this.clouds[mode]
      let downloaded: string | null
      try { downloaded = await cloud.read() }
      catch (error) {
        if (await this.store.read(mode) !== null) return
        throw error
      }
      if (downloaded === null) { this.allowed[mode] = true; return }
      delete this.published[mode]
      const downloadedHash = await sha256Utf8(downloaded)
      const current = await this.store.inspect()
      if (!current) throw new Error('Cloud resolution requires completed local upgrade discovery.')
      const receipt = current.cloudReceipts?.[mode]
      if (receipt?.downloaded === downloadedHash) {
        // Optional completion must never replace or block later verified local
        // progress. Changed/missing backup or transient read/ack failures keep
        // publication disabled and retry only on the next resolution attempt.
        try {
          const remote = await this.prepare(mode, downloaded)
          if (receipt.selected !== await sha256Utf8(remote)) return
          if (await cloud.read() !== downloaded || await this.prepare(mode, downloaded) !== remote || await cloud.read() !== downloaded) return
          await cloud.acknowledge(downloaded); this.allowed[mode] = true
        } catch { /* Keep the durable choice playable. */ }
        return
      }
      const remote = await this.prepare(mode, downloaded), selectedHash = await sha256Utf8(remote)
      const unchanged = async () => {
        if (await cloud.read() !== downloaded || await this.prepare(mode, downloaded) !== remote || await cloud.read() !== downloaded) throw new Error('Cloud changed during mode selection.')
      }
      const local = await this.store.read(mode)
      const choice = local !== null && this.portable(mode, local) !== remote ? await cloud.choose(this.portable(mode, local), remote) : 'cloud'
      if (choice !== 'local' && choice !== 'cloud') throw new Error('Cloud choice was not confirmed.')
      await this.store.resolveCloud(mode, downloadedHash, selectedHash, choice === 'cloud' ? (local === null ? remote : this.retainPurchase(mode, local, remote)) : null, current.generation, unchanged)
      try {
        await unchanged()
        await cloud.acknowledge(downloaded); this.allowed[mode] = true
      } catch { /* Durable choice survives; continue local play without publishing. */ }
    })
  }
  publish(mode: GameMode, captured: string, isCurrent: () => boolean): Promise<void> {
    return this.serial(mode, async () => {
      if (!this.allowed[mode] || !isCurrent()) return
      const text = this.portable(mode, captured), hash = await sha256Utf8(text)
      if (this.published[mode] === hash) return
      if (await this.clouds[mode].read() !== null) { this.allowed[mode] = false; return }
      if (!isCurrent() || await this.store.read(mode) !== captured) return
      await this.clouds[mode].publish(text)
      this.published[mode] = hash
    })
  }
  async drain(mode: GameMode): Promise<void> { await this.tails[mode] }
  private async prepare(mode: GameMode, downloaded: string): Promise<string> {
    const candidates = [downloaded]
    let firstError: unknown
    try { await this.codecs[mode].validate(downloaded); return this.portable(mode, downloaded) }
    catch (error) { firstError = error; if (error instanceof Error && error.name === 'UnsupportedFutureSaveSchemaError') throw error }
    candidates.push(...(await this.clouds[mode].readBackups?.() ?? []))
    for (const text of candidates.slice(1)) {
      try { await this.codecs[mode].validate(text); return this.portable(mode, text) }
      catch (error) { if (error instanceof Error && error.name === 'UnsupportedFutureSaveSchemaError') throw error }
    }
    throw firstError
  }
  private serial<T>(mode: GameMode, action: () => Promise<T>): Promise<T> {
    const task = this.tails[mode].then(action)
    this.tails[mode] = task.catch(() => undefined)
    return task
  }
}
