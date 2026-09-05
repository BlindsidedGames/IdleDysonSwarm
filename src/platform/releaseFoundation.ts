import {
  NoopEntitlementAuthority,
  NoopStoreAdapter,
  type EntitlementAuthority,
  type StoreAdapter,
} from '../store/contracts'
import type { NativeMigrationSource } from './platformSaveStorage'
import { BrowserStripeCommerce } from '../store/browserStripe'
import { DevelopmentStoreCommerce } from '../store/developmentStore'
import {
  DoubleInfinityPointsEffectPreferenceService,
  type DoubleInfinityPointsEffectPreference,
} from '../store/doubleInfinityPointsEffect'

export type HostKind = 'browser' | 'desktop-native' | 'mobile-native'

export interface PlatformMetadata {
  readonly hostKind: HostKind
  readonly applicationId: 'com.blindsidedgames.idledysonswarm'
  readonly applicationVersion: string
  readonly applicationBuild?: string
  readonly supportsNativeFilesystemMigration: boolean
}

export interface PlatformMetadataSource {
  metadata(): Promise<Readonly<PlatformMetadata>>
}

/** Compatibility name retained while native hosts adopt the shorter port. */
export type NativeFilesystemMigrationSource = NativeMigrationSource

export type DiagnosticExportPhase =
  | 'idle'
  | 'starting'
  | 'writer-blocked'
  | 'application-blocked'
  | 'recovery'
  | 'ready-placeholder'
  | 'ownership-lost'
  | 'stopping'
  | 'error'
  | 'render-failure'

export type DiagnosticExportCode =
  | 'none'
  | 'writer-unavailable'
  | 'capability-unavailable'
  | 'recovery-required'
  | 'writer-ownership-lost'
  | 'startup-failed'
  | 'render-failed'

export type DiagnosticExportErrorKind =
  | 'AggregateError'
  | 'Error'
  | 'EvalError'
  | 'RangeError'
  | 'ReferenceError'
  | 'SyntaxError'
  | 'TypeError'
  | 'URIError'
  | 'UnknownError'

/**
 * The complete diagnostic vocabulary accepted by a platform exporter. There
 * is deliberately no arbitrary text, path, URL, stack, save, or error field.
 */
export interface DiagnosticExportPayload {
  readonly phase: DiagnosticExportPhase
  readonly code: DiagnosticExportCode
  readonly buildId?: string
  readonly hostKind?: HostKind
  readonly locale?: string
  readonly saveSchemaVersion?: number
  readonly frontendRevision?: string
  readonly canonicalRevision?: string
  readonly errorKind?: DiagnosticExportErrorKind
}

export interface DiagnosticsExportRequest {
  readonly fileName: string
  readonly payload: Readonly<DiagnosticExportPayload>
}

export type DiagnosticsExportResult =
  | { readonly exported: true }
  | { readonly exported: false; readonly code: 'export-unavailable' }

export interface DiagnosticsExporter {
  export(request: DiagnosticsExportRequest): Promise<DiagnosticsExportResult>
}

export interface ReleasePlatformServices {
  readonly showAchievements?: () => Promise<void>
  readonly hostKind: HostKind
  readonly storeAvailable?: boolean
  readonly storeRestoreAvailable?: boolean
  readonly metadata: PlatformMetadataSource
  readonly nativeFilesystemMigration: NativeMigrationSource
  readonly entitlements: EntitlementAuthority
  readonly store: StoreAdapter
  /** Device-local use state; ownership remains solely with entitlements. */
  readonly doubleInfinityPointsEffect: DoubleInfinityPointsEffectPreference
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
  implements NativeMigrationSource
{
  async discoverCandidates(): Promise<readonly []> {
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
    doubleInfinityPointsEffect:
      new DoubleInfinityPointsEffectPreferenceService(),
    diagnostics: new NoopDiagnosticsExporter(),
  })
}

export function createBrowserStripeReleasePlatformServices(): Readonly<ReleasePlatformServices> {
  const commerce = new BrowserStripeCommerce()
  return Object.freeze({
    hostKind: 'browser' as const,
    storeAvailable: true,
    metadata: new BrowserPlatformMetadataSource(),
    nativeFilesystemMigration: new NoopNativeFilesystemMigrationSource(),
    entitlements: commerce,
    store: commerce,
    doubleInfinityPointsEffect:
      new DoubleInfinityPointsEffectPreferenceService(),
    diagnostics: new NoopDiagnosticsExporter(),
  })
}

export function createBrowserDevelopmentReleasePlatformServices(): Readonly<ReleasePlatformServices> {
  const commerce = new DevelopmentStoreCommerce()
  return Object.freeze({
    hostKind: 'browser' as const,
    storeAvailable: true,
    storeRestoreAvailable: true,
    metadata: new BrowserPlatformMetadataSource(),
    nativeFilesystemMigration: new NoopNativeFilesystemMigrationSource(),
    entitlements: commerce,
    store: commerce,
    doubleInfinityPointsEffect:
      new DoubleInfinityPointsEffectPreferenceService(),
    diagnostics: new NoopDiagnosticsExporter(),
  })
}
