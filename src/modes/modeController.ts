import { ModeSaveStore, type GameMode, type ModeManifest, type VerifiedModeInventory, type ModeImportPreview } from './modeSaveStore'

/** A complete mode graph owns its simulation, worker, lifecycle and presentation
 * state. quiesce suspends commands/time and returns a final checkpoint without
 * calling the periodic checkpoint callback. close drains and disposes all work. */
export interface ModeSession {
  quiesce(): Promise<string>
  close(): Promise<void>
}
export interface ModeSessionContext {
  readonly mode: GameMode
  readonly initialSave: string
  readonly sessionId: number
  /** Late checkpoints from an abandoned graph are rejected without writing. */
  checkpoint(text: string): Promise<boolean>
  isCurrent(): boolean
}
export type ModeSessionFactory = (context: ModeSessionContext) => Promise<ModeSession>
export interface ModeControllerHooks {
  beforeOpen?(mode: GameMode): Promise<void>
  checkpointSaved?(mode: GameMode, text: string, isCurrent: () => boolean): Promise<void>
  finalCheckpointSaved?(mode: GameMode, text: string): Promise<void>
  afterClose?(mode: GameMode): Promise<void>
}
export interface ModeControllerSnapshot {
  readonly phase: 'idle' | 'changing' | 'ready' | 'blocked' | 'closed'
  readonly manifest: ModeManifest | null
  readonly error?: string
}

/** Runs exactly one independently supplied graph. It never creates a Classic
 * graph using modern commands, data, decoders, workers or projection code. */
export class GameModeController {
  private snapshot: ModeControllerSnapshot = { phase: 'idle', manifest: null }
  private readonly listeners = new Set<() => void>()
  private tail: Promise<unknown> = Promise.resolve()
  private session: ModeSession | undefined
  private sessionId = 0
  private acceptingCheckpoints = false
  private terminal = false
  private disposalFailed = false
  private readonly store: ModeSaveStore
  private readonly factories: Readonly<Record<GameMode, ModeSessionFactory>>
  private readonly hooks: ModeControllerHooks
  private readonly convertClassic: (classic: string) => string | Promise<string>
  constructor(store: ModeSaveStore, factories: Readonly<Record<GameMode, ModeSessionFactory>>,
    convertClassic: (classic: string) => string | Promise<string>, hooks: ModeControllerHooks = {}) {
    this.hooks = hooks
    this.store = store
    this.factories = factories
    this.convertClassic = convertClassic
  }

  getSnapshot = (): ModeControllerSnapshot => this.snapshot
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  start(inventory?: VerifiedModeInventory): Promise<void> {
    return this.run(async () => {
      if (this.session) return
      this.set({ phase: 'changing', manifest: this.snapshot.manifest })
      const manifest = await this.store.initialize(inventory)
      await this.open(manifest)
    })
  }

  switchTo(mode: GameMode): Promise<void> {
    return this.run(async () => {
      if (this.snapshot.phase === 'ready' && this.snapshot.manifest?.active === mode) return
      this.set({ phase: 'changing', manifest: this.snapshot.manifest })
      await this.stopCurrent()
      await this.open(await this.store.select(mode))
    })
  }

  migrateClassic(): Promise<void> {
    return this.run(async () => {
      // Check the conflict before interrupting play; never offer overwrite here.
      const current = await this.store.inspect()
      if (current?.active !== 'classic') throw new Error('Open Classic before migrating.')
      if (current.saves.modern) throw new Error('A modern save already exists. Continue it; migration cannot replace it.')
      this.set({ phase: 'changing', manifest: current })
      await this.stopCurrent()
      await this.open(await this.store.migrateClassic(this.convertClassic))
    })
  }

  exportSaves(): Promise<string> {
    return this.run(async () => {
      this.set({ phase: 'changing', manifest: this.snapshot.manifest })
      await this.stopCurrent()
      const text = await this.store.exportBundle()
      const manifest = await this.store.inspect()
      if (manifest) await this.open(manifest)
      return text
    })
  }

  importSaves(text: string, replaceGeneration?: number): Promise<void> {
    return this.run(async () => {
      // A final checkpoint can change the generation. Reconfirmation is required
      // in that case, rather than applying a stale import approval.
      this.set({ phase: 'changing', manifest: this.snapshot.manifest })
      await this.stopCurrent()
      await this.open(await this.store.importBundle(text, replaceGeneration))
    })
  }

  prepareImport(text: string): Promise<ModeImportPreview> {
    return this.run(async () => {
      this.set({ phase: 'changing', manifest: this.snapshot.manifest })
      await this.stopCurrent()
      const preview = await this.store.previewBundle(text)
      this.set({ phase: 'idle', manifest: await this.store.inspect() })
      return preview
    })
  }
  prepareRecovery(): Promise<void> {
    return this.run(async () => {
      this.set({ phase: 'changing', manifest: this.snapshot.manifest })
      try { await this.stopCurrent() }
      catch (error) { if (this.disposalFailed) throw error }
      this.set({ phase: 'idle', manifest: this.snapshot.manifest })
    })
  }
  restoreRecovery(identity: string): Promise<void> {
    return this.run(async () => {
      await this.stopCurrent()
      this.set({ phase: 'changing', manifest: this.snapshot.manifest })
      await this.open(await this.store.restoreRecovery(identity))
    })
  }

  close(): Promise<void> {
    return this.run(async () => {
      await this.stopCurrent()
      this.terminal = true
      this.set({ phase: 'closed', manifest: await this.store.inspect() })
    })
  }

  private async stopCurrent(): Promise<void> {
    const session = this.session
    if (!session) return
    const mode = this.snapshot.manifest?.active
    this.session = undefined
    try {
      const text = await session.quiesce()
      this.acceptingCheckpoints = false
      this.sessionId += 1
      if (mode === undefined) throw new Error('Active session has no mode.')
      await this.store.checkpoint(mode, text)
      // The old graph is quiescent and the controller still owns transition
      // admission. Await its final durable Cloud publication before opening any
      // new graph; ordinary stale-session callbacks remain revoked.
      await this.hooks.finalCheckpointSaved?.(mode, text).catch(() => undefined)
    } finally {
      // A failed final checkpoint blocks selection but still tears down workers.
      this.acceptingCheckpoints = false
      this.sessionId += 1
      await this.disposeSession(session)
      if (mode) await this.hooks.afterClose?.(mode)
    }
  }

  private async open(manifest: ModeManifest): Promise<void> {
    if (this.disposalFailed) throw Error('The previous mode could not shut down. Reopen the host before continuing.')
    await this.hooks.beforeOpen?.(manifest.active)
    manifest = (await this.store.inspect()) ?? manifest
    const initialSave = await this.store.read(manifest.active)
    if (initialSave === null) throw new Error('Selected mode save is missing.')
    const id = ++this.sessionId
    this.acceptingCheckpoints = true
    const context: ModeSessionContext = {
      mode: manifest.active, initialSave, sessionId: id,
      isCurrent: () => this.acceptingCheckpoints && this.sessionId === id && !this.terminal,
      checkpoint: async text => {
        if (!context.isCurrent()) return false
        const saved = await this.store.checkpoint(manifest.active, text)
        if (!context.isCurrent()) return false
        this.set({ ...this.snapshot, manifest: saved })
        void this.hooks.checkpointSaved?.(manifest.active, text, context.isCurrent).catch(() => undefined)
        return true
      },
    }
    try {
      this.session = await this.factories[manifest.active](context)
      this.set({ phase: 'ready', manifest: await this.store.inspect() })
    } catch (error) {
      this.acceptingCheckpoints = false
      this.sessionId += 1
      const session = this.session
      this.session = undefined
      if (session) await this.disposeSession(session)
      throw error
    }
  }

  private async disposeSession(session: ModeSession): Promise<void> {
    try { await session.close() }
    catch (error) { this.disposalFailed = true; throw error }
  }

  private run<T>(action: () => Promise<T>): Promise<T> {
    const task = this.tail.then(async () => {
      if (this.terminal) throw new Error('Mode controller is closed.')
      if (this.disposalFailed) throw new Error('The previous mode could not shut down. Reopen the host before continuing.')
      try { return await action() }
      catch (error) {
        // A conflict or validation failure can leave the existing session ready.
        // Publication/open failures leave no writable graph until an explicit retry.
        this.set({ phase: this.session ? 'ready' : 'blocked', manifest: await this.store.inspect().catch(() => this.snapshot.manifest),
          error: error instanceof Error ? error.message : 'Mode operation failed.' })
        throw error
      }
    })
    this.tail = task.catch(() => undefined)
    return task
  }
  private set(snapshot: ModeControllerSnapshot): void {
    this.snapshot = snapshot
    for (const listener of this.listeners) {
      try { listener() } catch { /* Presentation cannot own a save transaction. */ }
    }
  }
}
