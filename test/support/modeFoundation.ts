import type { SaveStorageAdapter } from '../../src/save/repository'
import type { ModeCodecs, GameMode } from '../../src/modes/modeSaveStore'
import type { PortableCloud } from '../../src/platform/portableCloud'

export class ModeMemoryStorage implements SaveStorageAdapter {
  readonly files = new Map<string, string>()
  beforeReplace: (() => void | Promise<void>) | undefined
  async exists(path: string) { return this.files.has(path) }
  async readText(path: string) { const value = this.files.get(path); if (value === undefined) throw Error('missing'); return value }
  async writeText(path: string, text: string) { this.files.set(path, text) }
  async copy(a: string, b: string) { this.files.set(b, await this.readText(a)) }
  async replaceAtomically(a: string, b: string) { await this.beforeReplace?.(); this.files.set(b, await this.readText(a)); this.files.delete(a) }
  async discoverLegacyCandidates() { return [] }
}
export const modeStringCodecs: ModeCodecs = Object.fromEntries((['classic', 'modern'] as GameMode[]).map(mode => [mode, {
  validate(text: string) {
    if (text === 'future') { const error = new Error('newer schema'); error.name = 'UnsupportedFutureSaveSchemaError'; throw error }
    if (!text.startsWith(mode + ':')) throw Error('wrong mode')
  }, createFresh: () => mode + ':fresh',
}])) as unknown as ModeCodecs
export class MockModeCloud implements PortableCloud {
  readFails = false
  pending: string | null = null
  backups: string[] = []
  readonly uploads: string[] = []
  readonly acknowledged: string[] = []
  choices = 0
  choice: 'local' | 'cloud' = 'cloud'
  acknowledgementFails = false
  onChoose: (() => void | Promise<void>) | undefined
  async read() { if (this.readFails) throw Error('Cloud offline'); return this.pending }
  async readBackups() { return this.backups }
  async choose() { this.choices++; await this.onChoose?.(); return this.choice }
  async publish(text: string) { this.uploads.push(text) }
  async acknowledge(text: string) {
    if (this.acknowledgementFails) throw Error('acknowledgement unavailable')
    if (this.pending !== text) throw Error('remote changed')
    this.acknowledged.push(text); this.pending = null
  }
}
