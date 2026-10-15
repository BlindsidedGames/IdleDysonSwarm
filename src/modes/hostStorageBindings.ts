import { IndexedDbSaveStorageAdapter } from '../platform/indexedDbSaveStorage'
import { BrowserExpiringWriterAuthority } from '../platform/browserWriterLease'
import type { BrowserSaveDatabase } from '../platform/browserSaveDatabase'
import { SingleHostSessionWriterAuthority } from '../platform/singleHostSessionWriterAuthority'
import type { WriterAuthorityPort } from '../platform/writerAuthority'
import { CapacitorPlatformSaveStorageAdapter, ElectronPlatformSaveStorageAdapter, NATIVE_WEB_SAVE_PATHS } from '../platform/platformSaveStorage'
import type { RootedNativeFileBridge, NativeMigrationSource } from '../platform/platformSaveStorage'
import { PRODUCTION_BROWSER_DATABASE_NAME, PRODUCTION_BROWSER_SAVE_PATHS } from '../browser/productionBrowserStorage'
import { REWORK_BETA_DATABASE_NAME, REWORK_BETA_SAVE_PATHS } from '../browser/reworkBetaStorage'
import type { SaveStorageAdapter } from '../save/repository'
import { rootedUpgradeSource, unityUpgradeSource } from './upgradeDiscovery'

export const DUAL_MODE_DATABASE_NAME = 'idle-dyson-swarm-dual-modes-v1'
export const DUAL_MODE_NATIVE_ROOT = 'idleds-dual-modes-v1'
export interface ModeStorageBinding {
  readonly storage: SaveStorageAdapter
  readonly authority: WriterAuthorityPort
  readonly discovery: {
    publicClassic: ReturnType<typeof rootedUpgradeSource>
    modernBeta: ReturnType<typeof rootedUpgradeSource>
    legacyUnity: ReturnType<typeof unityUpgradeSource>
  }
  acquire(): Promise<void>
  close(): Promise<boolean>
}

function fenced(storage: SaveStorageAdapter, authority: WriterAuthorityPort): SaveStorageAdapter {
  const mutate = <T>(work: () => Promise<T>) => authority.runAuthoritativeOperation(async () => {
    await authority.assertWritable(); return work()
  })
  return {
    exists: path => storage.exists(path), readText: path => storage.readText(path),
    writeText: (path, text) => mutate(() => storage.writeText(path, text)),
    copy: (from, to) => mutate(() => storage.copy(from, to)),
    replaceAtomically: (from, to) => mutate(() => storage.replaceAtomically(from, to)),
    discoverLegacyCandidates: () => storage.discoverLegacyCandidates(),
  }
}
function binding(storage: SaveStorageAdapter, authority: WriterAuthorityPort,
  discovery: ModeStorageBinding['discovery']): ModeStorageBinding {
  return { storage: fenced(storage, authority), authority, discovery,
    async acquire() { if (!(await authority.acquire()).acquired) throw Error('Another session owns these mode saves.') },
    close: () => authority.shutdown(),
  }
}

/** The caller selects the database factory before any opening. Historical
 * databases are only read; only the dedicated destination gets a writer lease.
 * Development supplies disposable databases, never the user's IDB factory. */
export function bindBrowserModeStorage(open: (name: string) => BrowserSaveDatabase,
  options: { nowUtcMilliseconds?: () => number; autoHeartbeat?: boolean } = {}): ModeStorageBinding {
  const destination = open(DUAL_MODE_DATABASE_NAME)
  const historical = open(PRODUCTION_BROWSER_DATABASE_NAME), beta = open(REWORK_BETA_DATABASE_NAME)
  if (destination === historical || destination === beta || historical === beta) throw Error('Mode database roots must be distinct.')
  const authority = new BrowserExpiringWriterAuthority({ database: destination, ...options })
  const storage = new IndexedDbSaveStorageAdapter({ database: destination, lease: authority, nowUtcMilliseconds: options.nowUtcMilliseconds })
  const readOnly = (database: BrowserSaveDatabase) => ({ exists: (path: string) => database.fileExists(path), readText: (path: string) => database.readFile(path) })
  return binding(storage, authority, {
    publicClassic: rootedUpgradeSource('public-classic-browser', 'classic', readOnly(historical), PRODUCTION_BROWSER_SAVE_PATHS),
    modernBeta: rootedUpgradeSource('modern-beta-browser', 'modern', readOnly(beta), REWORK_BETA_SAVE_PATHS),
    legacyUnity: unityUpgradeSource(() => historical.listLegacyCandidates()),
  })
}

export interface NativeModeStorageRoots {
  /** A host process must attest these identities before exposing capabilities.
   * Neither historical bridge has a write method. The existing beta-only bridge
   * is not a public source and cannot satisfy this contract by itself. */
  readonly destination: { readonly namespace: typeof DUAL_MODE_NATIVE_ROOT; readonly files: RootedNativeFileBridge }
  readonly publicClassic: { readonly namespace: 'web-runtime-v1'; readonly files: Pick<RootedNativeFileBridge, 'exists' | 'readText'> }
  readonly modernBeta: { readonly namespace: 'idleds-rework-beta-v1'; readonly files: Pick<RootedNativeFileBridge, 'exists' | 'readText'> }
  readonly unity: NativeMigrationSource
}
/** Concrete adapters for the existing native file protocol; no bridge detection,
 * filesystem opening, entitlement service or Cloud account is implicit here. */
export function bindNativeModeStorage(target: 'electron' | 'ios' | 'android', roots: NativeModeStorageRoots): ModeStorageBinding {
  if (roots.destination.namespace !== DUAL_MODE_NATIVE_ROOT || roots.publicClassic.namespace !== 'web-runtime-v1' || roots.modernBeta.namespace !== 'idleds-rework-beta-v1' ||
      roots.destination.files === roots.publicClassic.files || roots.destination.files === roots.modernBeta.files || roots.publicClassic.files === roots.modernBeta.files) throw Error('Native dual-mode storage roots are not attested separately.')
  const Adapter = target === 'electron' ? ElectronPlatformSaveStorageAdapter : CapacitorPlatformSaveStorageAdapter
  const storage = new Adapter(roots.destination.files, { discoverCandidates: async () => [] })
  const authority = new SingleHostSessionWriterAuthority()
  return binding(storage, authority, {
    publicClassic: rootedUpgradeSource('public-classic-native', 'classic', roots.publicClassic.files, NATIVE_WEB_SAVE_PATHS),
    modernBeta: rootedUpgradeSource('modern-beta-native', 'modern', roots.modernBeta.files, NATIVE_WEB_SAVE_PATHS),
    legacyUnity: unityUpgradeSource(() => roots.unity.discoverCandidates()),
  })
}
