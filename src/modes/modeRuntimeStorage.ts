import type { LegacySaveCandidate, SaveStorageAdapter } from '../save/repository'
import type { LifecycleAdapter, LifecyclePhase } from '../platform/contracts'
import type { ModeSessionContext, ModeSession } from './modeController'

/** A runtime's repository sees only its own working files. The owning mode store
 * retains the primary and referenced recovery/source snapshots. No IndexedDB, native file, legacy
 * discovery, account, Cloud or caller-controlled filesystem path is reachable. */
export class ModeRuntimeStorage implements SaveStorageAdapter {
  private readonly files: Map<string, string>
  private readonly context: ModeSessionContext
  private readonly current: string
  constructor(context: ModeSessionContext, current: string) {
    this.context = context
    this.current = current
    this.files = new Map([[current, context.initialSave]])
  }
  async exists(path: string): Promise<boolean> { return this.files.has(path) }
  async readText(path: string): Promise<string> {
    const text = this.files.get(path)
    if (text === undefined) throw new Error('Mode working file does not exist.')
    return text
  }
  async writeText(path: string, text: string): Promise<void> {
    this.requireCurrent()
    // Primary writes must pass the durable publication callback too.
    if (path === this.current && !await this.context.checkpoint(text)) throw new Error('Mode session has closed.')
    this.requireCurrent()
    this.files.set(path, text)
  }
  async copy(from: string, to: string): Promise<void> {
    await this.writeText(to, await this.readText(from))
  }
  async replaceAtomically(from: string, to: string): Promise<void> {
    await this.writeText(to, await this.readText(from))
    this.files.delete(from)
  }
  async discoverLegacyCandidates() { return [] }
  async retainLegacyCandidate(): Promise<LegacySaveCandidate> {
    throw new Error('Use the labelled mode import flow so both saves remain separate.')
  }
  private requireCurrent(): void {
    if (!this.context.isCurrent()) throw new Error('Mode session has closed.')
  }
}

interface ModeRuntimeLifecycle {
  checkpointBeforeSafeReload(): Promise<boolean>
  shutdown(): Promise<void>
}
/** Both independent runtime adapters use the same teardown protocol, without
 * sharing gameplay types or implementations. Every departure goes through the
 * selected runtime's own lifecycle settlement and worker cancellation. */
export function runtimeModeSession(runtime: ModeRuntimeLifecycle, storage: ModeRuntimeStorage,
  current: string, lifecycle: ModeLifecycleAdapter, exportSave: ModeSession['exportSave'], detach: () => void = () => undefined): ModeSession {
  let detached = false
  const close = async () => {
    if (!detached) { detached = true; detach() }
    await runtime.shutdown()
  }
  return {
    exportSave,
    async quiesce() {
      lifecycle.depart()
      if (!await runtime.checkpointBeforeSafeReload()) throw new Error('Mode switch requires a verified final checkpoint.')
      await close()
      return storage.readText(current)
    },
    close,
  }
}

/** A switch is a real departure for the old mode. Freeze host events after that
 * receipt so a late focus/visibility callback cannot restart its foreground. */
export class ModeLifecycleAdapter implements LifecycleAdapter {
  private readonly host: LifecycleAdapter
  private readonly listeners = new Set<(phase: LifecyclePhase) => void>()
  private departed = false
  constructor(host: LifecycleAdapter) { this.host = host }
  currentPhase(): LifecyclePhase {
    return this.departed ? 'terminating' : this.host.currentPhase()
  }
  subscribe(listener: (phase: LifecyclePhase) => void): () => void {
    this.listeners.add(listener)
    const stop = this.host.subscribe(phase => { if (!this.departed) listener(phase) })
    return () => { stop(); this.listeners.delete(listener) }
  }
  depart(): void {
    if (this.departed) return
    this.departed = true
    for (const listener of this.listeners) listener('terminating')
  }
}
