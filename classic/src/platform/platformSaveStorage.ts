import type {
  LegacySaveCandidate,
  SaveRepositoryPaths,
  SaveStorageAdapter,
} from '../save/repository'

export type PlatformSaveStorage = SaveStorageAdapter

export const NATIVE_WEB_SAVE_ROOT = 'web-runtime-v1'

/**
 * Native Web saves live below an application-owned root which is distinct
 * from every Unity persistent-data location. All host bridges are rooted at
 * that directory before they are exposed to the Web runtime.
 */
export const NATIVE_WEB_SAVE_PATHS = Object.freeze({
  current: 'save/idle_dyson_swarm_web_save.idsw',
  temporary: 'save/idle_dyson_swarm_web_save.idsw.tmp',
  legacyRecovery: 'recovery/unity-original-idb1.txt',
  backups: Object.freeze([
    'backups/idle_dyson_swarm_web_save.1.idsw',
    'backups/idle_dyson_swarm_web_save.2.idsw',
    'backups/idle_dyson_swarm_web_save.3.idsw',
  ]),
  retainedRecoverySources: Object.freeze([
    'save/recovery/import-original.idsw',
    'save/recovery/pre-schema13-original.idsw',
  ]),
  transitionalStoredTimePolicy: 'save/local/stored-time-policy.json',
  transitionalStoredTimeJob: 'save/stored-time/job.json',
} satisfies SaveRepositoryPaths)

/**
 * A bridge exposed by a native host after it has already rooted operations at
 * the Web-owned data directory. It must never expose arbitrary absolute-path
 * writes to the renderer/WebView.
 */
export interface RootedNativeFileBridge {
  exists(relativePath: string): Promise<boolean>
  readText(relativePath: string): Promise<string>
  writeText(relativePath: string, contents: string): Promise<void>
  replaceAtomically(
    temporaryRelativePath: string,
    destinationRelativePath: string,
  ): Promise<void>
  copy(
    sourceRelativePath: string,
    destinationRelativePath: string,
  ): Promise<void>
}

export interface NativeMigrationSource {
  discoverCandidates(): Promise<readonly LegacySaveCandidate[]>
}

/**
 * Adapts a root-scoped native file bridge to the portable save repository.
 * Legacy candidates are opaque, read-only values supplied by a separate
 * discovery source. Their text may be copied into Web recovery storage, but
 * their original filesystem locations are never passed to a write bridge.
 */
abstract class RootedPlatformSaveStorageAdapter
  implements PlatformSaveStorage
{
  private readonly files: RootedNativeFileBridge
  private readonly migration: NativeMigrationSource
  private readonly discoveredLegacy = new Map<string, string>()

  protected constructor(
    files: RootedNativeFileBridge,
    migration: NativeMigrationSource,
  ) {
    this.files = files
    this.migration = migration
  }

  exists(path: string): Promise<boolean> {
    return this.files.exists(requireSafeRelativePath(path))
  }

  readText(path: string): Promise<string> {
    return this.files.readText(requireSafeRelativePath(path))
  }

  writeText(path: string, contents: string): Promise<void> {
    return this.files.writeText(requireSafeRelativePath(path), contents)
  }

  replaceAtomically(
    temporaryPath: string,
    destinationPath: string,
  ): Promise<void> {
    return this.files.replaceAtomically(
      requireSafeRelativePath(temporaryPath),
      requireSafeRelativePath(destinationPath),
    )
  }

  async copy(
    sourcePath: string,
    destinationPath: string,
  ): Promise<void> {
    const destination = requireSafeRelativePath(destinationPath)
    const retainedLegacyText = this.discoveredLegacy.get(sourcePath)
    if (retainedLegacyText !== undefined) {
      await this.files.writeText(destination, retainedLegacyText)
      return
    }
    await this.files.copy(
      requireSafeRelativePath(sourcePath),
      destination,
    )
  }

  async discoverLegacyCandidates(): Promise<
    readonly LegacySaveCandidate[]
  > {
    const candidates = await this.migration.discoverCandidates()
    this.discoveredLegacy.clear()
    const retainedCandidates: LegacySaveCandidate[] = []
    for (const candidate of candidates) {
      if (
        candidate.provenance?.kind !==
          'automatic-same-device-unity' ||
        candidate.id !==
          candidate.provenance.opaqueSourceIdentifier ||
        candidate.sourcePath !==
          `unity-readonly:${candidate.provenance.opaqueSourceIdentifier}`
      ) {
        throw new Error(
          'Native migration candidates require verified automatic Unity provenance and an opaque read-only source path.',
        )
      }
      if (this.discoveredLegacy.has(candidate.sourcePath)) {
        throw new Error('Native migration returned a duplicate source path.')
      }
      this.discoveredLegacy.set(candidate.sourcePath, candidate.text)
      retainedCandidates.push(Object.freeze({ ...candidate }))
    }
    return Object.freeze(retainedCandidates)
  }

  async retainLegacyCandidate(
    text: string,
    id = nativeImportIdentifier(),
  ): Promise<LegacySaveCandidate> {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,90}$/.test(id)) {
      throw new Error('Native retained import identifier is invalid.')
    }
    const sourcePath = `recovery/imports/${id}.txt`
    await this.files.writeText(sourcePath, text)
    return Object.freeze({
      id,
      sourcePath,
      text,
      provenance: Object.freeze({
        kind: 'browser-retained-import' as const,
      }),
    })
  }
}

/** Capacitor host adapter backed by Filesystem.Directory.Data. */
export class CapacitorPlatformSaveStorageAdapter
  extends RootedPlatformSaveStorageAdapter
{
  constructor(
    files: RootedNativeFileBridge,
    migration: NativeMigrationSource,
  ) {
    super(files, migration)
  }
}

/** Electron renderer adapter backed by a userData-rooted preload bridge. */
export class ElectronPlatformSaveStorageAdapter
  extends RootedPlatformSaveStorageAdapter
{
  constructor(
    files: RootedNativeFileBridge,
    migration: NativeMigrationSource,
  ) {
    super(files, migration)
  }
}

/** Existing IndexedDB adapter is the browser PlatformSaveStorage adapter. */
export {
  IndexedDbSaveStorageAdapter as BrowserPlatformSaveStorageAdapter,
} from './indexedDbSaveStorage'

function requireSafeRelativePath(path: string): string {
  const normalized = path.replaceAll('\\', '/')
  const segments = normalized.split('/')
  if (
    normalized === '' ||
    normalized.startsWith('/') ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.includes('\0') ||
    segments.some(
      (segment) =>
        segment === '' || segment === '.' || segment === '..',
    )
  ) {
    throw new Error(
      'Native Web save paths must remain relative to the application-owned root.',
    )
  }
  return segments.join('/')
}

function nativeImportIdentifier(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `native-import-${globalThis.crypto.randomUUID()}`
  }
  return `native-import-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`
}
