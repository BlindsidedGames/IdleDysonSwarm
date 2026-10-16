import type { SaveStorageAdapter } from '../save/repository'
import { sha256Utf8 } from '../save/automaticPurchaseEvidence'

export type GameMode = 'classic' | 'modern'
export interface ModeSaveCodec {
  /** Must use this mode's own schema and gameplay authority, never the other decoder. */
  validate(text: string): void | Promise<void>
  createFresh(): string | Promise<string>
  /** Each game's reset policy retains receiving-device purchases/preferences. */
  createReset?(receiving: string): string | Promise<string>
  prepareImport?(text: string, receiving: string | null): string | Promise<string>
  previewImport?(text: string): ModeImportProgress
}
/** Host attestation after all historical public/Unity/beta roots and Cloud
 * availability have been inspected. Unavailable, corrupt or ambiguous discovery
 * is not absence and must not produce this value. */
export interface VerifiedModeInventory {
  readonly discovery: 'complete'
  readonly saves: Readonly<Partial<Record<GameMode, string>>>
  readonly originals?: readonly { readonly id: string; readonly text: string }[]
  readonly beforePublication?: () => Promise<void>
}
export type ModeCodecs = Readonly<Record<GameMode, ModeSaveCodec>>
interface SavePointer { readonly slot: number; readonly sha256: string }
export interface ModeManifest {
  readonly format: 'IDS-MODES-1'
  readonly generation: number
  readonly active: GameMode
  readonly saves: Readonly<Partial<Record<GameMode, SavePointer>>>
  /** Pinned pre-conversion source, preserved even after Classic resumes playing. */
  readonly upgradeSources?: readonly { readonly id: string; readonly sha256: string }[]
  readonly cloudReceipts?: Readonly<Partial<Record<GameMode, { readonly downloaded: string; readonly selected: string }>>>
  readonly migrationSource?: SavePointer
}
export interface ModeBundle {
  readonly format: 'IDS-MODE-EXPORT-1'
  readonly active: GameMode
  readonly saves: Readonly<Partial<Record<GameMode, { readonly text: string; readonly sha256: string }>>>
}
export interface ModeImportProgress {
  readonly infinityPoints: bigint
  readonly quantumPoints: bigint
  readonly skillPoints: bigint
}
export interface ModeImportPreview {
  readonly progress?: ModeImportProgress
  readonly generation: number | null
  readonly active: GameMode
  readonly modes: readonly GameMode[]
  readonly conflicts: readonly GameMode[]
  readonly sha256: string
}
export interface ModeRecoveryPreview {
  readonly identity: string
  readonly generation: number
  readonly active: GameMode
  readonly modes: readonly GameMode[]
}

export class ModeSaveConflictError extends Error {
  readonly mode: GameMode
  constructor(mode: GameMode) {
    super(`A ${mode} save already exists. Continue that save or export it before making a separate choice.`)
    this.name = 'ModeSaveConflictError'
    this.mode = mode
  }
}

/**
 * One host writer lease must cover this store AND both runtime graphs.
 * Mode-scoped payload slots are immutable while referenced by a current, backup
 * or migration-source pointer, and published by a single atomic manifest.
 * An interrupted copy/migration/import leaves either the old manifest or the new
 * complete pair. Four reusable slots per mode bound storage without deleting a
 * current/backup/pinned source. Orphans are never inferred as player progress.
 * No decoding/upgrading is done by this transport layer.
 */
export class ModeSaveStore {
  private tail: Promise<unknown> = Promise.resolve()
  private readonly storage: SaveStorageAdapter
  private readonly codecs: ModeCodecs
  private readonly assertWriter: () => void | Promise<void>
  private readonly root: string
  private readonly published?: (manifest: ModeManifest, saves: Readonly<Partial<Record<GameMode, string>>>) => Promise<void>
  constructor(storage: SaveStorageAdapter, codecs: ModeCodecs,
    assertWriter: () => void | Promise<void>, root = 'modes-v1',
    published?: (manifest: ModeManifest, saves: Readonly<Partial<Record<GameMode, string>>>) => Promise<void>) {
    this.storage = storage
    this.codecs = codecs
    this.assertWriter = assertWriter
    this.root = root
    this.published = published
    if (!/^[a-zA-Z0-9_-]+$/.test(root)) throw new Error('Invalid mode save root.')
  }

  inspect(): Promise<ModeManifest | null> {
    return this.serial(() => this.readManifest())
  }

  /** Prepare only the receiving mode. Classic saves enter Modern's migration
   * without creating or replacing the independent Classic save. */
  async prepareImportBundle(text: string, target: GameMode,
    convertClassic: (text: string) => string | Promise<string>): Promise<string> {
    if (text.length > 32 * 1024 * 1024) throw new Error('Save exceeds the import limit.')
    text = text.trim()
    if (text.startsWith('{')) {
      const value: unknown = JSON.parse(text)
      if (record(value) && value.format === 'IDS-MODE-EXPORT-1') throw new Error('Import a single-mode save, not a paired export.')
    }
    let modern = false
    try { await this.codecs.modern.validate(text); modern = true } catch { /* Try the Classic import authority next. */ }
    if (modern && target === 'classic') throw new Error('Modern progress cannot be imported into Classic.')
    if (!modern) {
      text = await this.codecs.classic.prepareImport?.(text, null) ?? text
      await this.codecs.classic.validate(text)
      if (target === 'modern') text = await convertClassic(text)
    }
    text = await this.codecs[target].prepareImport?.(text, await this.read(target)) ?? text
    await this.codecs[target].validate(text)
    return JSON.stringify({ format: 'IDS-MODE-EXPORT-1', active: target,
      saves: { [target]: { text, sha256: await sha256Utf8(text) } } } satisfies ModeBundle)
  }

  /** Discovery must examine current, backups, legacy Unity and cloud availability
   * before calling this. Any unreadable/unknown existing input must block first
   * run at the host boundary; absence must never be inferred from decode failure. */
  initialize(inventory?: VerifiedModeInventory): Promise<ModeManifest> {
    return this.serial(async () => {
      const current = await this.readManifest()
      if (current) return this.completePublication(current)
      if (inventory?.discovery !== 'complete') throw new Error('Complete save discovery is required before first startup.')
      const upgradeSources = []
      if ((inventory.originals?.length ?? 0) > 64) throw new Error('Too many upgrade recovery sources.')
      for (const original of inventory.originals ?? []) {
        if (original.id.length > 512) throw new Error('Upgrade source identity exceeds its limit.')
        const sha256 = await sha256Utf8(original.text)
        const path = `${this.root}/upgrade-originals/${sha256}.txt`
        await this.assertWriter()
        if (!await this.storage.exists(path)) await this.storage.writeText(path, original.text)
        if (await this.storage.readText(path) !== original.text) throw new Error('Upgrade original recovery readback failed.')
        upgradeSources.push({ id: original.id, sha256 })
      }
      if (upgradeSources.length) await this.indexRecoveryFiles(upgradeSources.map(source => `${this.root}/upgrade-originals/${source.sha256}.txt`))
      const existing = inventory.saves
      const saves: Partial<Record<GameMode, SavePointer>> = {}
      for (const mode of MODES) {
        if (existing[mode] !== undefined) saves[mode] = await this.retain(mode, existing[mode])
      }
      // Existing public players keep Classic. An existing beta alone stays modern.
      const active = saves.classic ? 'classic' : 'modern'
      if (!saves[active]) saves[active] = await this.retain(active, await this.codecs[active].createFresh())
      return this.publish({ format: 'IDS-MODES-1', generation: 1, active, saves, ...(upgradeSources.length ? { upgradeSources } : {}) }, inventory.beforePublication)
    })
  }

  read(mode: GameMode): Promise<string | null> {
    return this.serial(async () => {
      const manifest = await this.requireManifest()
      const pointer = manifest.saves[mode]
      return pointer ? this.readPayload(mode, pointer) : null
    })
  }

  /** Used only by the active session; stale callbacks must also be fenced by the controller. */
  checkpoint(mode: GameMode, text: string): Promise<ModeManifest> {
    return this.serial(async () => {
      const current = await this.requireManifest()
      if (current.active !== mode) throw new Error('Inactive mode cannot checkpoint.')
      const pointer = await this.retain(mode, text)
      if (pointer.sha256 === current.saves[mode]?.sha256) return this.completePublication(current)
      return this.publish({ ...current, generation: current.generation + 1,
        saves: { ...current.saves, [mode]: pointer } })
    })
  }

  select(mode: GameMode): Promise<ModeManifest> {
    return this.serial(async () => {
      const current = await this.requireManifest()
      if (current.active === mode) return this.completePublication(current)
      const pointer = current.saves[mode] ?? await this.retain(mode, await this.codecs[mode].createFresh())
      // Validate before selection; corrupt destination never becomes a fresh save.
      await this.readPayload(mode, pointer)
      return this.publish({ ...current, active: mode, generation: current.generation + 1,
        saves: { ...current.saves, [mode]: pointer } })
    })
  }

  reset(mode: GameMode): Promise<ModeManifest> {
    return this.serial(async () => {
      const current = await this.requireManifest()
      if (current.active !== mode) throw Error('Only the active mode can be reset.')
      const pointer = current.saves[mode], createReset = this.codecs[mode].createReset
      if (!pointer || !createReset) throw Error('Reset is unavailable for this mode.')
      const reset = await this.retain(mode, await createReset(await this.readPayload(mode, pointer)))
      // Preserve the other pointer, its Cloud receipt and all recovery sources.
      return this.publish({ ...current, generation: current.generation + 1,
        saves: { ...current.saves, [mode]: reset } })
    })
  }

  /** The only conversion direction. No overwrite option exists for migration. */
  migrateClassic(convert: (classic: string) => string | Promise<string>): Promise<ModeManifest> {
    return this.serial(async () => {
      const current = await this.requireManifest()
      if (current.active !== 'classic') throw new Error('Open Classic before migrating its current progress.')
      if (current.saves.modern) throw new ModeSaveConflictError('modern')
      if (!current.saves.classic) throw new Error('No Classic save to migrate.')
      const source = await this.readPayload('classic', current.saves.classic)
      const destination = await this.retain('modern', await convert(source))
      return this.publish({ ...current, active: 'modern', generation: current.generation + 1,
        saves: { ...current.saves, modern: destination }, migrationSource: current.saves.classic })
    })
  }

  resolveCloud(mode: GameMode, downloadedHash: string, selectedHash: string, selected: string | null,
    expectedGeneration: number, unchanged: () => Promise<void>): Promise<ModeManifest> {
    return this.serial(async () => {
      const current = await this.requireManifest()
      if (current.generation !== expectedGeneration) throw new Error('Local saves changed during Cloud selection.')
      if (!/^[a-f0-9]{64}$/.test(downloadedHash) || !/^[a-f0-9]{64}$/.test(selectedHash)) throw new Error('Invalid downloaded Cloud identity.')
      const pointer = selected === null ? current.saves[mode] : await this.retain(mode, selected)
      if (!pointer) throw new Error('Cloud selection has no save.')
      return this.publish({ ...current, generation: current.generation + 1,
        saves: { ...current.saves, [mode]: pointer }, cloudReceipts: { ...current.cloudReceipts, [mode]: { downloaded: downloadedHash, selected: selectedHash } } }, unchanged)
    })
  }

  exportBundle(): Promise<string> {
    return this.serial(async () => {
      const current = await this.requireManifest()
      const saves: Partial<Record<GameMode, { text: string; sha256: string }>> = {}
      for (const mode of MODES) {
        const pointer = current.saves[mode]
        if (pointer) saves[mode] = { text: await this.readPayload(mode, pointer), sha256: pointer.sha256 }
      }
      return JSON.stringify({ format: 'IDS-MODE-EXPORT-1', active: current.active, saves } satisfies ModeBundle)
    })
  }

  previewBundle(text: string): Promise<ModeImportPreview> {
    return this.serial(async () => {
      const bundle = parseBundle(text), current = await this.readManifest()
      for (const mode of MODES) {
        const incoming = bundle.saves[mode]
        if (!incoming) continue
        if (await sha256Utf8(incoming.text) !== incoming.sha256) throw Error('Mode export integrity check failed.')
        await this.codecs[mode].validate(incoming.text)
      }
      const modes = MODES.filter(mode => Boolean(bundle.saves[mode]))
      return { generation: current?.generation ?? null, active: bundle.active, modes,
        progress: this.codecs[bundle.active].previewImport?.(bundle.saves[bundle.active]!.text),
        conflicts: modes.filter(mode => Boolean(current?.saves[mode])), sha256: await sha256Utf8(text) }
    })
  }

  /** Explicit recovery only. The backup is never adopted just because current
   * selection is damaged. Exact raw current/backup identities fence approval. */
  previewRecovery(): Promise<ModeRecoveryPreview> {
    return this.serial(async () => {
      const backup = await this.storage.readText(`${this.root}/manifest.json.backup`)
      const manifest = parseManifest(backup)
      await this.validateManifestPayloads(manifest)
      return { identity: await this.recoveryIdentity(backup), generation: manifest.generation,
        active: manifest.active, modes: MODES.filter(mode => Boolean(manifest.saves[mode])) }
    })
  }
  restoreRecovery(identity: string): Promise<ModeManifest> {
    return this.serial(async () => {
      const backup = await this.storage.readText(`${this.root}/manifest.json.backup`)
      if (await this.recoveryIdentity(backup) !== identity) throw Error('Recovery sources changed. Review them again.')
      const manifest = parseManifest(backup)
      await this.validateManifestPayloads(manifest)
      const archives: string[] = []
      // Preserve the exact damaged/newer selection and the good backup before
      // replacing current. The good backup itself is not rotated or deleted.
      for (const path of [`${this.root}/manifest.json`, `${this.root}/manifest.json.backup`]) {
        if (!await this.storage.exists(path)) continue
        const text = await this.storage.readText(path)
        await this.assertWriter()
        const archive = `${this.root}/recovery/manifest-${await sha256Utf8(text)}.json`
        await this.storage.writeText(archive, text)
        if (await this.storage.readText(archive) !== text) throw Error('Recovery archive readback failed.')
        archives.push(archive)
      }
      for (const mode of MODES) for (const slot of [0, 1, 2, 3]) {
        const source = this.path(mode, { slot, sha256: '' })
        if (!await this.storage.exists(source)) continue
        const retained = await this.storage.readText(source)
        const archive = `${this.root}/recovery/save-${mode}-${await sha256Utf8(retained)}.idsw`
        await this.assertWriter(); await this.storage.writeText(archive, retained)
        if (await this.storage.readText(archive) !== retained) throw Error('Recovery save archive readback failed.')
        archives.push(archive)
      }
      await this.indexRecoveryFiles(archives)
      let generation = manifest.generation + 2
      try { generation = Math.max(generation, parseManifest(await this.storage.readText(`${this.root}/manifest.json`)).generation + 1) } catch { /* Damaged/missing current stays archived. */ }
      const next = { ...manifest, generation }
      const text = JSON.stringify(next), path = `${this.root}/manifest.json`, temporary = `${path}.tmp`
      await this.assertWriter(); await this.storage.writeText(temporary, text)
      if (await this.storage.readText(temporary) !== text) throw Error('Recovery temporary readback failed.')
      if (await this.recoveryIdentity(backup) !== identity) throw Error('Recovery sources changed. Review them again.')
      await this.assertWriter(); await this.storage.replaceAtomically(temporary, path)
      if (await this.storage.readText(path) !== text) throw Error('Recovery publication could not be verified.')
      return this.completePublication(next)
    })
  }

  /** Salvage bytes even when no manifest can be decoded. This is evidence for
   * recovery, deliberately a different format from a playable pair export. */
  exportRecoveryArchive(): Promise<string> {
    return this.serial(async () => {
      const files: Record<string, string> = {}
      const errors: { path: string; message: string }[] = []
      let indexed: { path: string; sha256: string }[] = []
      try { indexed = await this.readRecoveryIndex() }
      catch (error) { errors.push({ path: `${this.root}/recovery/index.json`, message: error instanceof Error ? error.message : String(error) }) }
      const paths = [`${this.root}/manifest.json`, `${this.root}/manifest.json.backup`, `${this.root}/recovery/index.json`,
        ...indexed.map(file => file.path),
        ...MODES.flatMap(mode => [0, 1, 2, 3].map(slot => this.path(mode, { slot, sha256: '' })))]
      for (const path of new Set(paths)) {
        try { if (await this.storage.exists(path)) files[path] = await this.storage.readText(path) }
        catch (error) { errors.push({ path, message: error instanceof Error ? error.message : String(error) }) }
      }
      for (const file of indexed) if (files[file.path] === undefined || await sha256Utf8(files[file.path]) !== file.sha256) errors.push({ path: file.path, message: 'Recovery archive source is missing or damaged.' })
      return JSON.stringify({ format: 'IDS-MODE-RECOVERY-1', files, errors })
    })
  }

  /** Whole-pair restore into empty slots, or explicitly replace an exact reviewed
   * generation. A conflict never partially imports one of the two saves. */
  importBundle(text: string, replaceGeneration?: number): Promise<ModeManifest> {
    return this.serial(async () => {
      const bundle = parseBundle(text)
      const current = await this.readManifest()
      if (replaceGeneration !== undefined && current?.generation !== replaceGeneration) {
        throw new Error('Saves changed after import confirmation. Preview the import again.')
      }
      if (current && replaceGeneration === undefined) {
        for (const mode of MODES) if (bundle.saves[mode] && current.saves[mode]) throw new ModeSaveConflictError(mode)
      }
      const saves = { ...current?.saves }
      // Retain original bytes; each decoder validates only its own labelled slot.
      for (const mode of MODES) {
        const incoming = bundle.saves[mode]
        if (incoming) {
          if ((await sha256Utf8(incoming.text)) !== incoming.sha256) throw new Error('Mode export integrity check failed.')
          saves[mode] = await this.retain(mode, incoming.text)
        }
      }
      if (!saves[bundle.active]) throw new Error('Mode export is missing its active save.')
      const cloudReceipts = { ...current?.cloudReceipts }
      for (const mode of MODES) if (bundle.saves[mode]) delete cloudReceipts[mode]
      return this.publish({ format: 'IDS-MODES-1', generation: (current?.generation ?? 0) + 1,
        active: bundle.active, saves, ...(Object.keys(cloudReceipts).length ? { cloudReceipts } : {}),
        ...(current?.upgradeSources ? { upgradeSources: current.upgradeSources } : {}), ...(current?.migrationSource ? { migrationSource: current.migrationSource } : {}) })
    })
  }

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.tail.then(operation)
    this.tail = task.catch(() => undefined)
    return task
  }
  private async readRecoveryIndex(): Promise<{ path: string; sha256: string }[]> {
    const path = `${this.root}/recovery/index.json`
    if (!await this.storage.exists(path)) return []
    const value: unknown = JSON.parse(await this.storage.readText(path))
    if (!Array.isArray(value) || value.length > 100000 || value.some(file => !record(file) || typeof file.path !== 'string' || !file.path.startsWith(`${this.root}/`) ||
      !/^(recovery\/(manifest-[a-f0-9]{64}\.json|save-(classic|modern)-[a-f0-9]{64}\.idsw)|upgrade-originals\/[a-f0-9]{64}\.txt)$/.test(file.path.slice(this.root.length + 1)) || typeof file.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(file.sha256))) throw Error('Invalid recovery archive index.')
    return value as { path: string; sha256: string }[]
  }
  private async indexRecoveryFiles(paths: readonly string[]): Promise<void> {
    const entries = new Map((await this.readRecoveryIndex()).map(file => [file.path, file]))
    for (const path of paths) entries.set(path, { path, sha256: await sha256Utf8(await this.storage.readText(path)) })
    if (entries.size > 100000) throw Error('Recovery archive index is full.')
    const path = `${this.root}/recovery/index.json`, temporary = `${path}.tmp`, text = JSON.stringify([...entries.values()])
    await this.assertWriter(); await this.storage.writeText(temporary, text)
    if (await this.storage.readText(temporary) !== text) throw Error('Recovery index readback failed.')
    await this.assertWriter(); await this.storage.replaceAtomically(temporary, path)
    if (await this.storage.readText(path) !== text) throw Error('Recovery index publication could not be verified.')
  }
  private path(mode: GameMode, pointer: SavePointer): string {
    return `${this.root}/saves/${mode}/checkpoint-${pointer.slot}.idsw`
  }
  private async retain(mode: GameMode, text: string): Promise<SavePointer> {
    await this.assertWriter()
    await this.codecs[mode].validate(text)
    const sha256 = await sha256Utf8(text)
    const retained: SavePointer[] = []
    for (const path of [`${this.root}/manifest.json`, `${this.root}/manifest.json.backup`]) {
      if (!await this.storage.exists(path)) continue
      const manifest = parseManifest(await this.storage.readText(path))
      if (manifest.saves[mode]) retained.push(manifest.saves[mode]!)
      if (mode === 'classic' && manifest.migrationSource) retained.push(manifest.migrationSource)
    }
    const existing = retained.find(pointer => pointer.sha256 === sha256)
    if (existing) { await this.readPayload(mode, existing); return existing }
    const slot = [0, 1, 2, 3].find(slot => retained.every(pointer => pointer.slot !== slot))
    if (slot === undefined) throw new Error('Mode checkpoint slots are all retained for recovery.')
    const pointer = { slot, sha256 }
    const path = this.path(mode, pointer)
    await this.assertWriter()
    await this.storage.writeText(path, text)
    if (await this.storage.readText(path) !== text) throw new Error('Mode save readback failed.')
    return pointer
  }
  private async readPayload(mode: GameMode, pointer: SavePointer): Promise<string> {
    const text = await this.storage.readText(this.path(mode, pointer))
    if ((await sha256Utf8(text)) !== pointer.sha256) throw new Error('Retained mode save integrity check failed.')
    await this.codecs[mode].validate(text)
    return text
  }
  private async readManifest(): Promise<ModeManifest | null> {
    const path = `${this.root}/manifest.json`
    if (!await this.storage.exists(path)) {
      if (await this.storage.exists(`${path}.backup`)) throw new Error('The mode selection record is missing. Recover the preserved backup before continuing.')
      return null
    }
    // Never recover automatically from an older mode pointer: that can appear to
    // lose an entire migrated save. Keep the backup for explicit recovery/export.
    const manifest = parseManifest(await this.storage.readText(path))
    await this.validateManifestPayloads(manifest)
    return manifest
  }
  private async validateManifestPayloads(manifest: ModeManifest): Promise<void> {
    for (const mode of MODES) {
      const pointer = manifest.saves[mode]
      if (pointer) await this.readPayload(mode, pointer)
    }
    if (manifest.migrationSource) await this.readPayload('classic', manifest.migrationSource)
  }
  private async recoveryIdentity(backup: string): Promise<string> {
    const path = `${this.root}/manifest.json`
    const current = await this.storage.exists(path) ? await this.storage.readText(path) : null
    if (await this.storage.readText(`${path}.backup`) !== backup) throw Error('Recovery sources changed. Review them again.')
    return sha256Utf8(JSON.stringify([current, backup]))
  }
  private async requireManifest(): Promise<ModeManifest> {
    const manifest = await this.readManifest()
    if (!manifest) throw new Error('Mode saves have not been initialized.')
    return manifest
  }
  private async completePublication(manifest: ModeManifest): Promise<ModeManifest> {
    if (this.published) {
      const saves: Partial<Record<GameMode, string>> = {}
      for (const mode of MODES) if (manifest.saves[mode]) saves[mode] = await this.readPayload(mode, manifest.saves[mode]!)
      await this.published(manifest, saves)
    }
    return manifest
  }
  private async publish(manifest: ModeManifest, beforeReplacement?: () => Promise<void>): Promise<ModeManifest> {
    await this.assertWriter()
    const path = `${this.root}/manifest.json`
    const temporary = `${path}.tmp`
    const text = JSON.stringify(manifest)
    await this.storage.writeText(temporary, text)
    if (await this.storage.readText(temporary) !== text) throw new Error('Mode manifest readback failed.')
    if (await this.storage.exists(path)) await this.storage.copy(path, `${path}.backup`)
    await beforeReplacement?.()
    await this.assertWriter()
    await this.storage.replaceAtomically(temporary, path)
    if (await this.storage.readText(path) !== text) throw new Error('Mode manifest publication could not be verified.')
    return this.completePublication(manifest)
  }
}

const MODES = ['classic', 'modern'] as const
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function requireMode(value: unknown): asserts value is GameMode {
  if (value !== 'classic' && value !== 'modern') throw new Error('Unknown game mode.')
}
function validPointer(pointer: unknown): pointer is SavePointer {
  return record(pointer) && Number.isInteger(pointer.slot) && Number(pointer.slot) >= 0 && Number(pointer.slot) < 4 &&
    typeof pointer.sha256 === 'string' && /^[a-f0-9]{64}$/.test(pointer.sha256)
}
function parseManifest(text: string): ModeManifest {
  const value: unknown = JSON.parse(text)
  if (!record(value) || value.format !== 'IDS-MODES-1' || !Number.isSafeInteger(value.generation) || Number(value.generation) < 1 || !record(value.saves)) throw new Error('Invalid mode manifest.')
  requireMode(value.active)
  for (const [mode, pointer] of Object.entries(value.saves)) {
    requireMode(mode)
    if (!validPointer(pointer)) throw new Error('Invalid mode save pointer.')
  }
  if (value.upgradeSources !== undefined && (!Array.isArray(value.upgradeSources) || value.upgradeSources.length > 64 || value.upgradeSources.some(source => !record(source) || typeof source.id !== 'string' || source.id.length > 512 || typeof source.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(source.sha256)))) throw new Error('Invalid upgrade recovery sources.')
  if (value.cloudReceipts !== undefined) {
    if (!record(value.cloudReceipts)) throw new Error('Invalid Cloud receipts.')
    for (const [mode, hash] of Object.entries(value.cloudReceipts)) { requireMode(mode); if (!record(hash) || typeof hash.downloaded !== 'string' || typeof hash.selected !== 'string' || !/^[a-f0-9]{64}$/.test(hash.downloaded) || !/^[a-f0-9]{64}$/.test(hash.selected)) throw new Error('Invalid Cloud receipt.') }
  }
  if (value.migrationSource !== undefined && !validPointer(value.migrationSource)) throw new Error('Invalid pinned migration source.')
  if (!value.saves[value.active]) throw new Error('Active mode save is missing.')
  return value as unknown as ModeManifest
}
function parseBundle(text: string): ModeBundle {
  if (text.length > 32 * 1024 * 1024) throw new Error('Mode export exceeds the import limit.')
  const value: unknown = JSON.parse(text)
  if (!record(value) || value.format !== 'IDS-MODE-EXPORT-1' || !record(value.saves)) throw new Error('Use a labelled Classic/modern save export.')
  requireMode(value.active)
  for (const [mode, save] of Object.entries(value.saves)) {
    requireMode(mode)
    if (!record(save) || typeof save.text !== 'string' || typeof save.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(save.sha256)) throw new Error('Invalid mode export slot.')
  }
  if (!value.saves[value.active]) throw new Error('Mode export is missing its active save.')
  return value as unknown as ModeBundle
}
