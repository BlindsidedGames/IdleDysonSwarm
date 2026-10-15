import type { BrowserSaveDatabase, BrowserSaveMutation, WriterLeaseFence } from '../../platform/browserSaveDatabase'
import { WriterLeaseLostError } from '../../platform/browserSaveDatabase'
import type { RootedNativeFileBridge } from '../../platform/platformSaveStorage'
import type { ModeCloudProvider } from '../hostCloudBindings'

/** Actual adapter protocol backed exclusively by private Maps. No fallback to
 * IDB, localStorage, filesystem, account SDK or network exists in these ports. */
export class DisposableBrowserDatabase implements BrowserSaveDatabase {
  readonly files = new Map<string, string>()
  private fence: WriterLeaseFence | null = null
  private generation = 0
  async acquireWriterLease(ownerToken: string, now: number, duration: number) {
    if (this.fence && this.fence.expiresAtUtcMilliseconds > now) return { acquired: false as const, generation: this.fence.generation, expiresAtUtcMilliseconds: this.fence.expiresAtUtcMilliseconds }
    this.fence = { ownerToken, generation: ++this.generation, expiresAtUtcMilliseconds: now + duration }
    return { acquired: true as const, fence: this.fence }
  }
  private check(fence: WriterLeaseFence, now: number) {
    if (!this.fence || this.fence.ownerToken !== fence.ownerToken || this.fence.generation !== fence.generation || this.fence.expiresAtUtcMilliseconds <= now) throw new WriterLeaseLostError()
  }
  async renewWriterLease(fence: WriterLeaseFence, now: number, duration: number) {
    this.check(fence, now); this.fence = { ...fence, expiresAtUtcMilliseconds: now + duration }; return this.fence
  }
  async releaseWriterLease(fence: WriterLeaseFence) {
    if (this.fence?.generation !== fence.generation || this.fence.ownerToken !== fence.ownerToken) return false
    this.fence = null; return true
  }
  async inspectWriterLease() { return this.fence }
  async fileExists(path: string) { return this.files.has(path) }
  async readFile(path: string) { const text = this.files.get(path); if (text === undefined) throw Error('Missing disposable file.'); return text }
  async listLegacyCandidates() { return [] }
  async mutateFiles(mutation: BrowserSaveMutation, fence: WriterLeaseFence, now: number) {
    this.check(fence, now)
    if (mutation.kind === 'write') this.files.set(mutation.path, mutation.contents)
    else if (mutation.kind === 'copy') this.files.set(mutation.destinationPath, await this.readFile(mutation.sourcePath))
    else if (mutation.kind === 'replace') {
      const text = await this.readFile(mutation.temporaryPath)
      this.check(fence, now); this.files.set(mutation.destinationPath, text); this.files.delete(mutation.temporaryPath)
    } else throw Error('Disposable history is read-only.')
  }
}
export function disposableNativeFiles(files = new Map<string, string>()): RootedNativeFileBridge {
  const readText = async (path: string) => { const text = files.get(path); if (text === undefined) throw Error('Missing disposable native file.'); return text }
  return { exists: async path => files.has(path), readText,
    writeText: async (path, text) => { files.set(path, text) },
    copy: async (a, b) => { files.set(b, await readText(a)) },
    replaceAtomically: async (a, b) => { const text = await readText(a); files.set(b, text); files.delete(a) },
  }
}
export class DisposableCloudProvider implements ModeCloudProvider {
  private readonly values = new Map<string, string>()
  private readonly backups = new Map<string, string[]>()
  async read(key: string) { return this.values.get(key) ?? null }
  async readBackups(key: string) { return [...(this.backups.get(key) ?? [])] }
  async compareAndPublish(key: string, expected: string | null, text: string) {
    if ((this.values.get(key) ?? null) !== expected) throw Error('Disposable Cloud changed.')
    if (expected !== null) this.backups.set(key, [expected, ...(this.backups.get(key) ?? [])].slice(0, 3))
    this.values.set(key, text)
  }
}
