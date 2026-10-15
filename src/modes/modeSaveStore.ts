import type { SaveStorageAdapter } from '../save/repository'
import { sha256Utf8 } from '../save/automaticPurchaseEvidence'

export type GameMode = 'classic' | 'modern'
export interface ModeSaveCodec {
  /** Must use this mode's own schema and gameplay authority, never the other decoder. */
  validate(text: string): void | Promise<void>
  createFresh(): string | Promise<string>
}
/** Host attestation after all historical public/Unity/beta roots and Cloud
 * availability have been inspected. Unavailable, corrupt or ambiguous discovery
 * is not absence and must not produce this value. */
export interface VerifiedModeInventory {
  readonly discovery: 'complete'
  readonly saves: Readonly<Partial<Record<GameMode, string>>>
}
export type ModeCodecs = Readonly<Record<GameMode, ModeSaveCodec>>
interface SavePointer { readonly slot: number; readonly sha256: string }
export interface ModeManifest {
  readonly format: 'IDS-MODES-1'
  readonly generation: number
  readonly active: GameMode
  readonly saves: Readonly<Partial<Record<GameMode, SavePointer>>>
  /** Pinned pre-conversion source, preserved even after Classic resumes playing. */
  readonly migrationSource?: SavePointer
}
export interface ModeBundle {
  readonly format: 'IDS-MODE-EXPORT-1'
  readonly active: GameMode
  readonly saves: Readonly<Partial<Record<GameMode, { readonly text: string; readonly sha256: string }>>>
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
  constructor(storage: SaveStorageAdapter, codecs: ModeCodecs,
    assertWriter: () => void | Promise<void>, root = 'modes-v1') {
    this.storage = storage
    this.codecs = codecs
    this.assertWriter = assertWriter
    this.root = root
    if (!/^[a-zA-Z0-9_-]+$/.test(root)) throw new Error('Invalid mode save root.')
  }

  inspect(): Promise<ModeManifest | null> {
    return this.serial(() => this.readManifest())
  }

  /** Discovery must examine current, backups, legacy Unity and cloud availability
   * before calling this. Any unreadable/unknown existing input must block first
   * run at the host boundary; absence must never be inferred from decode failure. */
  initialize(inventory?: VerifiedModeInventory): Promise<ModeManifest> {
    return this.serial(async () => {
      const current = await this.readManifest()
      if (current) return current
      if (inventory?.discovery !== 'complete') throw new Error('Complete save discovery is required before first startup.')
      const existing = inventory.saves
      const saves: Partial<Record<GameMode, SavePointer>> = {}
      for (const mode of MODES) {
        if (existing[mode] !== undefined) saves[mode] = await this.retain(mode, existing[mode])
      }
      // Existing public players keep Classic. An existing beta alone stays modern.
      const active = saves.classic ? 'classic' : 'modern'
      if (!saves[active]) saves[active] = await this.retain(active, await this.codecs[active].createFresh())
      return this.publish({ format: 'IDS-MODES-1', generation: 1, active, saves })
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
      if (pointer.sha256 === current.saves[mode]?.sha256) return current
      return this.publish({ ...current, generation: current.generation + 1,
        saves: { ...current.saves, [mode]: pointer } })
    })
  }

  select(mode: GameMode): Promise<ModeManifest> {
    return this.serial(async () => {
      const current = await this.requireManifest()
      if (current.active === mode) return current
      const pointer = current.saves[mode] ?? await this.retain(mode, await this.codecs[mode].createFresh())
      // Validate before selection; corrupt destination never becomes a fresh save.
      await this.readPayload(mode, pointer)
      return this.publish({ ...current, active: mode, generation: current.generation + 1,
        saves: { ...current.saves, [mode]: pointer } })
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
      return this.publish({ format: 'IDS-MODES-1', generation: (current?.generation ?? 0) + 1,
        active: bundle.active, saves, ...(current?.migrationSource ? { migrationSource: current.migrationSource } : {}) })
    })
  }

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.tail.then(operation)
    this.tail = task.catch(() => undefined)
    return task
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
    for (const mode of MODES) {
      const pointer = manifest.saves[mode]
      if (pointer) await this.readPayload(mode, pointer)
    }
    if (manifest.migrationSource) await this.readPayload('classic', manifest.migrationSource)
    return manifest
  }
  private async requireManifest(): Promise<ModeManifest> {
    const manifest = await this.readManifest()
    if (!manifest) throw new Error('Mode saves have not been initialized.')
    return manifest
  }
  private async publish(manifest: ModeManifest): Promise<ModeManifest> {
    await this.assertWriter()
    const path = `${this.root}/manifest.json`
    const temporary = `${path}.tmp`
    const text = JSON.stringify(manifest)
    await this.storage.writeText(temporary, text)
    if (await this.storage.readText(temporary) !== text) throw new Error('Mode manifest readback failed.')
    if (await this.storage.exists(path)) await this.storage.copy(path, `${path}.backup`)
    await this.assertWriter()
    await this.storage.replaceAtomically(temporary, path)
    if (await this.storage.readText(path) !== text) throw new Error('Mode manifest publication could not be verified.')
    return manifest
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
