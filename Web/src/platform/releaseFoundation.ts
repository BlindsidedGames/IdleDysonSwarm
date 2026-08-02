import {
  NoopEntitlementAuthority,
  NoopStoreAdapter,
  type EntitlementAuthority,
  type StoreAdapter,
} from '../store/contracts'

export type HostKind = 'browser' | 'desktop-native' | 'mobile-native'

export interface PlatformMetadata {
  readonly hostKind: HostKind
  readonly applicationId: 'com.blindsidedgames.idledysonswarm'
  readonly applicationVersion: string
  readonly supportsNativeFilesystemMigration: boolean
}

export interface PlatformMetadataSource {
  metadata(): Promise<Readonly<PlatformMetadata>>
}

export interface NativeSaveMigrationCandidate {
  readonly source: 'native-filesystem'
  readonly displayName: string
  readonly locationHint: string
}

/**
 * Native hosts can later expose discovered legacy saves here. The source does
 * not read, decode, migrate, or commit a save; those remain in the save lane.
 */
export interface NativeFilesystemMigrationSource {
  discoverCandidates(): Promise<readonly NativeSaveMigrationCandidate[]>
}

export interface DiagnosticsExportRequest {
  readonly fileName: string
  readonly mimeType: 'application/json'
  readonly text: string
}

export type DiagnosticsExportResult =
  | { readonly exported: true }
  | { readonly exported: false; readonly code: 'export-unavailable' }

export interface DiagnosticsExporter {
  export(request: DiagnosticsExportRequest): Promise<DiagnosticsExportResult>
}

export interface ReleasePlatformServices {
  readonly hostKind: HostKind
  readonly metadata: PlatformMetadataSource
  readonly nativeFilesystemMigration: NativeFilesystemMigrationSource
  readonly entitlements: EntitlementAuthority
  readonly store: StoreAdapter
  readonly diagnostics: DiagnosticsExporter
}

export class BrowserPlatformMetadataSource
  implements PlatformMetadataSource
{
  async metadata(): Promise<Readonly<PlatformMetadata>> {
    return Object.freeze({
      hostKind: 'browser',
      applicationId: 'com.blindsidedgames.idledysonswarm',
      applicationVersion: 'development',
      supportsNativeFilesystemMigration: false,
    })
  }
}

/** Browser hosts must not probe the user's filesystem for a Unity save. */
export class NoopNativeFilesystemMigrationSource
  implements NativeFilesystemMigrationSource
{
  async discoverCandidates(): Promise<readonly NativeSaveMigrationCandidate[]> {
    return Object.freeze([])
  }
}

/**
 * Browser/local development keeps diagnostics export explicit and inert until a
 * user-approved download/share adapter is selected by a product host.
 */
export class NoopDiagnosticsExporter implements DiagnosticsExporter {
  async export(
    _request: DiagnosticsExportRequest,
  ): Promise<DiagnosticsExportResult> {
    return Object.freeze({
      exported: false as const,
      code: 'export-unavailable' as const,
    })
  }
}

export function createBrowserReleasePlatformServices(): Readonly<ReleasePlatformServices> {
  return Object.freeze({
    hostKind: 'browser' as const,
    metadata: new BrowserPlatformMetadataSource(),
    nativeFilesystemMigration: new NoopNativeFilesystemMigrationSource(),
    entitlements: new NoopEntitlementAuthority(),
    store: new NoopStoreAdapter(),
    diagnostics: new NoopDiagnosticsExporter(),
  })
}
