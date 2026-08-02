import type {
  LifecycleAdapter,
  LifecyclePhase,
} from './contracts'
import {
  UNITY_APPLICATION_ID,
} from './nativeMigration'
import type {
  DiagnosticExportCode,
  DiagnosticExportErrorKind,
  DiagnosticExportPayload,
  DiagnosticExportPhase,
  DiagnosticsExporter,
  DiagnosticsExportRequest,
  DiagnosticsExportResult,
  HostKind,
  PlatformMetadata,
  PlatformMetadataSource,
} from './releaseFoundation'

export interface NativeLifecycleBridge {
  currentPhase(): LifecyclePhase
  subscribe(listener: (phase: LifecyclePhase) => void): () => void
}

export class NativeLifecycleAdapter implements LifecycleAdapter {
  private readonly bridge: NativeLifecycleBridge

  constructor(bridge: NativeLifecycleBridge) {
    this.bridge = bridge
  }

  currentPhase(): LifecyclePhase {
    return this.bridge.currentPhase()
  }

  subscribe(listener: (phase: LifecyclePhase) => void): () => void {
    return this.bridge.subscribe(listener)
  }
}

export interface NativeShareRequest {
  readonly title: string
  readonly text: string
  readonly fileName: string
  readonly mimeType: NativeShareMimeType
}

export type NativeShareMimeType =
  | 'text/plain'
  | 'application/x-idle-dyson-swarm-save'

export type NativeShareResult =
  | { readonly shared: true }
  | { readonly shared: false; readonly code: 'share-unavailable' | 'cancelled' }

export interface NativeShareBridge {
  share(request: Readonly<NativeShareRequest>): Promise<NativeShareResult>
}

export class NativeShareAdapter {
  private readonly bridge: NativeShareBridge

  constructor(bridge: NativeShareBridge) {
    this.bridge = bridge
  }

  share(request: Readonly<NativeShareRequest>): Promise<NativeShareResult> {
    if (request.title.trim() === '' || request.text === '') {
      throw new Error('Native sharing requires a title and non-empty text.')
    }
    if (
      request.fileName === undefined ||
      request.mimeType === undefined ||
      request.fileName.trim() === ''
    ) {
      throw new Error(
        'Native save sharing requires both a file name and an approved MIME type.',
      )
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,90}\.idsw$/.test(request.fileName)) {
      throw new Error(
        'Native save sharing requires a safe .idsw base file name.',
      )
    }
    if (
      !NATIVE_SHARE_MIME_TYPES.has(request.mimeType)
    ) {
      throw new Error('Native save sharing requires an approved MIME type.')
    }
    return this.bridge.share(Object.freeze({ ...request }))
  }
}

export interface NativeDiagnosticsFileRequest {
  readonly fileName: string
  readonly mimeType: 'application/json'
  readonly text: string
}

export interface NativeDiagnosticsBridge {
  exportText(
    request: Readonly<NativeDiagnosticsFileRequest>,
  ): Promise<DiagnosticsExportResult>
}

/**
 * Serializes a closed diagnostic vocabulary inside the platform boundary. The
 * adapter cannot accept arbitrary text or enumerate files, logs, save payloads,
 * paths, raw errors, URLs, credentials, or device data.
 */
export class NativeDiagnosticsExporter implements DiagnosticsExporter {
  private readonly bridge: NativeDiagnosticsBridge

  constructor(bridge: NativeDiagnosticsBridge) {
    this.bridge = bridge
  }

  export(
    request: DiagnosticsExportRequest,
  ): Promise<DiagnosticsExportResult> {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,90}\.json$/.test(request.fileName)) {
      throw new Error('Native diagnostics require a safe JSON file name.')
    }
    return this.bridge.exportText(Object.freeze({
      fileName: request.fileName,
      mimeType: 'application/json',
      text: serializeDiagnosticPayload(request.payload),
    }))
  }
}

export interface NativeApplicationMetadata {
  readonly applicationVersion: string
  readonly buildNumber: string
}

export interface NativeApplicationMetadataBridge {
  metadata(): Promise<Readonly<NativeApplicationMetadata>>
}

export class NativePlatformMetadataSource
  implements PlatformMetadataSource
{
  private readonly hostKind: Extract<
    HostKind,
    'desktop-native' | 'mobile-native'
  >
  private readonly bridge: NativeApplicationMetadataBridge

  constructor(
    hostKind: Extract<HostKind, 'desktop-native' | 'mobile-native'>,
    bridge: NativeApplicationMetadataBridge,
  ) {
    this.hostKind = hostKind
    this.bridge = bridge
  }

  async metadata(): Promise<Readonly<PlatformMetadata>> {
    const metadata = await this.bridge.metadata()
    if (
      !isSafeMetadataValue(metadata.applicationVersion) ||
      !isSafeMetadataValue(metadata.buildNumber)
    ) {
      throw new Error('Native host returned invalid application metadata.')
    }
    return Object.freeze({
      hostKind: this.hostKind,
      applicationId: UNITY_APPLICATION_ID,
      applicationVersion: metadata.applicationVersion,
      applicationBuild: metadata.buildNumber,
      supportsNativeFilesystemMigration: true,
    })
  }
}

function isSafeMetadataValue(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,63}$/.test(value)
}

const NATIVE_SHARE_MIME_TYPES = new Set<NativeShareMimeType>([
  'text/plain',
  'application/x-idle-dyson-swarm-save',
])

const DIAGNOSTIC_PHASES = new Set<DiagnosticExportPhase>([
  'idle',
  'starting',
  'writer-blocked',
  'application-blocked',
  'recovery',
  'ready-placeholder',
  'ownership-lost',
  'stopping',
  'error',
  'render-failure',
])

const DIAGNOSTIC_CODES = new Set<DiagnosticExportCode>([
  'none',
  'writer-unavailable',
  'capability-unavailable',
  'recovery-required',
  'writer-ownership-lost',
  'startup-failed',
  'render-failed',
])

const DIAGNOSTIC_ERROR_KINDS = new Set<DiagnosticExportErrorKind>([
  'AggregateError',
  'Error',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
  'UnknownError',
])

const DIAGNOSTIC_HOST_KINDS = new Set<HostKind>([
  'browser',
  'desktop-native',
  'mobile-native',
])

const DIAGNOSTIC_TOKEN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,63}$/

function serializeDiagnosticPayload(
  payload: Readonly<DiagnosticExportPayload>,
): string {
  const sanitizedErrorKind = DIAGNOSTIC_ERROR_KINDS.has(
    payload.errorKind as DiagnosticExportErrorKind,
  )
    ? payload.errorKind
    : payload.errorKind === undefined
      ? undefined
      : 'Error'
  const sanitized = {
    phase: DIAGNOSTIC_PHASES.has(payload.phase)
      ? payload.phase
      : 'error',
    code: DIAGNOSTIC_CODES.has(payload.code)
      ? payload.code
      : 'startup-failed',
    ...diagnosticToken('buildId', payload.buildId),
    ...diagnosticHostKind(payload.hostKind),
    ...diagnosticToken('locale', payload.locale),
    ...diagnosticInteger('saveSchemaVersion', payload.saveSchemaVersion),
    ...diagnosticToken('frontendRevision', payload.frontendRevision),
    ...diagnosticToken('canonicalRevision', payload.canonicalRevision),
    ...(sanitizedErrorKind === undefined
      ? {}
      : { errorKind: sanitizedErrorKind }),
  }
  return JSON.stringify(sanitized, null, 2)
}

function diagnosticToken<Key extends string>(
  key: Key,
  value: string | undefined,
): Partial<Record<Key, string>> {
  if (value === undefined) return {}
  return {
    [key]: DIAGNOSTIC_TOKEN.test(value) ? value : '[redacted]',
  } as Partial<Record<Key, string>>
}

function diagnosticInteger<Key extends string>(
  key: Key,
  value: number | undefined,
): Partial<Record<Key, number>> {
  if (
    value === undefined ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    return {}
  }
  return { [key]: value } as Partial<Record<Key, number>>
}

function diagnosticHostKind(
  value: HostKind | undefined,
): Partial<Record<'hostKind', string>> {
  if (value === undefined) return {}
  return {
    hostKind: DIAGNOSTIC_HOST_KINDS.has(value)
      ? value
      : '[redacted]',
  }
}
