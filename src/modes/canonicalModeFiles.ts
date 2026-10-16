import type { SaveStorageAdapter, SaveRepositoryPaths } from '../save/repository'
import { sha256Utf8 } from '../save/automaticPurchaseEvidence'
import type { GameMode, ModeCodecs, ModeManifest, ModeSaveStore, ModeBundle } from './modeSaveStore'

const modes = ['classic', 'modern'] as const
export interface CanonicalModeFile {
  readonly storage: SaveStorageAdapter
  readonly paths: SaveRepositoryPaths
}

/** Keep the released Classic filename playable by the old release, and Modern
 * in a separate file. Immutable mode checkpoints remain the atomic pair/recovery
 * authority. A durable receipt distinguishes an interrupted publication from a
 * later write by an older Classic installation; neither becomes a fresh save. */
export class CanonicalModeFiles {
  private adopting: Partial<Record<GameMode, string>> = {}
  private readonly receiptPath = 'modes-v1/canonical-files.json'
  private readonly metadata: SaveStorageAdapter
  private readonly files: Readonly<Record<GameMode, CanonicalModeFile>>
  private readonly codecs: ModeCodecs
  constructor(metadata: SaveStorageAdapter, files: Readonly<Record<GameMode, CanonicalModeFile>>, codecs: ModeCodecs) {
    this.metadata = metadata; this.files = files; this.codecs = codecs
  }

  readonly publish = async (_manifest: ModeManifest, saves: Readonly<Partial<Record<GameMode, string>>>) => {
    let receipt = await this.receipt()
    if (!receipt) {
      receipt = {}
      for (const mode of modes) {
        const { storage, paths } = this.files[mode]
        if (await storage.exists(paths.current)) receipt[mode] = await sha256Utf8(await storage.readText(paths.current))
      }
      // Persist the old identities before replacing either visible file.
      await this.saveReceipt(receipt)
    }
    for (const mode of modes) {
      const text = saves[mode]
      if (text === undefined) continue
      await this.codecs[mode].validate(text)
      const { storage, paths } = this.files[mode]
      const previous = await storage.exists(paths.current) ? await storage.readText(paths.current) : null
      if (previous !== text) {
        if (previous !== null && await sha256Utf8(previous) !== receipt[mode] && await sha256Utf8(previous) !== this.adopting[mode]) {
          throw Error(`${mode} save changed outside this session. Reopen the game to continue that save.`)
        }
        const backups = paths.backups ?? []
        for (let i = backups.length - 1; i >= 0; i--) {
          const source = i === 0 ? paths.current : backups[i - 1]
          if (await storage.exists(source)) await storage.copy(source, backups[i])
        }
        await storage.writeText(paths.temporary, text)
        if (await storage.readText(paths.temporary) !== text) throw Error('Canonical save staging failed.')
        if ((await storage.exists(paths.current) ? await storage.readText(paths.current) : null) !== previous) throw Error('Canonical save changed during publication.')
        await storage.replaceAtomically(paths.temporary, paths.current)
        if (await storage.readText(paths.current) !== text) throw Error('Canonical save publication failed.')
      }
      receipt[mode] = await sha256Utf8(text)
      await this.saveReceipt(receipt)
    }
  }

  /** Runs before a runtime is opened. Adopt genuine old-release progress at its
   * original path; otherwise finish the last interrupted manifest publication. */
  async reconcile(store: ModeSaveStore): Promise<void> {
    const manifest = await store.inspect()
    if (!manifest) return
    const bundle = JSON.parse(await store.exportBundle()) as ModeBundle
    const saves = { ...bundle.saves }, receipt = await this.receipt()
    let changed = false
    for (const mode of modes) {
      const { storage, paths } = this.files[mode]
      if (!await storage.exists(paths.current)) continue
      const text = await storage.readText(paths.current), hash = await sha256Utf8(text)
      if (hash === saves[mode]?.sha256 || hash === receipt?.[mode]) continue
      await this.codecs[mode].validate(text)
      saves[mode] = { text, sha256: hash }; changed = true
    }
    if (changed) {
      // Authorize only the bytes observed here; persist no receipt before the
      // pair commits, so a failed adoption is detected again on restart.
      this.adopting = Object.fromEntries(modes.flatMap(mode => saves[mode] ? [[mode, saves[mode]!.sha256]] : []))
      try { await store.importBundle(JSON.stringify({ ...bundle, saves }), manifest.generation) }
      finally { this.adopting = {} }
    } else {
      await this.publish(manifest, Object.fromEntries(modes.flatMap(mode => saves[mode] ? [[mode, saves[mode]!.text]] : [])))
    }
  }

  private async receipt(): Promise<Partial<Record<GameMode, string>> | null> {
    if (!await this.metadata.exists(this.receiptPath)) return null
    const value: unknown = JSON.parse(await this.metadata.readText(this.receiptPath))
    if (!value || typeof value !== 'object' || Object.entries(value).some(([mode, hash]) => !modes.includes(mode as GameMode) || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash))) throw Error('Canonical save receipt is damaged. Preserve the mode recovery files.')
    return value as Partial<Record<GameMode, string>>
  }
  private async saveReceipt(receipt: Partial<Record<GameMode, string>>) {
    const text = JSON.stringify(receipt), temporary = this.receiptPath + '.tmp'
    await this.metadata.writeText(temporary, text)
    if (await this.metadata.readText(temporary) !== text) throw Error('Canonical receipt staging failed.')
    await this.metadata.replaceAtomically(temporary, this.receiptPath)
    if (await this.metadata.readText(this.receiptPath) !== text) throw Error('Canonical receipt publication failed.')
  }
}
