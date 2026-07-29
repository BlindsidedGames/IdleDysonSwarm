export type UiRuntimeWarningCode =
  | 'persistent-storage-denied'
  | 'quota-pressure'
  | 'storage-status-failed'
  | 'checkpoint-failed'
  | 'persistence-failed'

export interface UiRuntimeWarning {
  readonly code: UiRuntimeWarningCode
  readonly reason: string
}

export type UiRuntimeFoundationStatus =
  | { readonly phase: 'idle' }
  | { readonly phase: 'starting' }
  | {
      readonly phase: 'blocked'
      readonly code: 'writer-owned' | 'application-blocked' | 'startup-failed'
      readonly reason: string
      readonly generation?: number
      readonly expiresAtUtcMilliseconds?: number
    }
  | {
      readonly phase: 'ready'
      readonly warnings: readonly UiRuntimeWarning[]
    }
  | {
      readonly phase: 'ownership-lost'
      readonly reason: string
    }
  | { readonly phase: 'stopping' }
  | { readonly phase: 'stopped' }

export interface UiRuntimeSuppliedFile {
  readonly name: string
  readonly size: number
  text(): Promise<string>
}

export interface UiRuntimeDropData {
  readonly files: ArrayLike<UiRuntimeSuppliedFile>
  getData(format: string): string
}

interface UiRuntimeImportRequestBase {
  readonly importedAtUtc: string
  readonly overwriteApproved: boolean
}

export type UiRuntimeImportRequest =
  | (UiRuntimeImportRequestBase & {
      readonly source?: 'paste'
      readonly text: string
    })
  | (UiRuntimeImportRequestBase & {
      readonly source: 'file'
      readonly file: UiRuntimeSuppliedFile
    })
  | (UiRuntimeImportRequestBase & {
      readonly source: 'drop'
      readonly transfer: UiRuntimeDropData
    })
export type UiRuntimeImportResult =
  | {
      readonly imported: true
      readonly sessionRevision: number
      readonly recoveryAvailable: true
      readonly lifecycleReset: boolean
      readonly code?: 'not-ready'
      readonly reason?: string
    }
  | {
      readonly imported: false
      readonly committed: boolean
      readonly code: string
      readonly reason: string
      readonly recoveryAvailable: boolean
    }

export type UiRuntimeStartResult = UiRuntimeFoundationStatus

export interface UiRuntimeStorageStatus {
  readonly persistenceSupported: boolean
  readonly persistenceRequested: boolean
  readonly persisted: boolean
  readonly usageBytes: number | null
  readonly quotaBytes: number | null
  readonly remainingBytes: number | null
  readonly quotaPressure: boolean
  readonly error?: string
}

export type UiRuntimeStatusListener = (
  status: UiRuntimeFoundationStatus,
) => void

/**
 * Host-neutral Wave 1 shell boundary.
 *
 * It intentionally exposes no repository, platform adapter, canonical
 * application facade, lifecycle coordinator, save graph, or gameplay state.
 * Snapshot publication, active time, and player dispatch are Wave 2 additions.
 */
export interface UiRuntimeFoundation {
  status(): UiRuntimeFoundationStatus
  subscribeStatus(listener: UiRuntimeStatusListener): () => void
  start(): Promise<UiRuntimeStartResult>
  importSave(request: UiRuntimeImportRequest): Promise<UiRuntimeImportResult>
  inspectStorage(
    requestPersistence?: boolean,
  ): Promise<UiRuntimeStorageStatus>
  requestCheckpoint(): Promise<boolean>
  checkpointBeforeSafeReload(): Promise<boolean>
  exportLastRecovery(): Promise<boolean>
  readClipboardText(): Promise<string>
  writeClipboardText(value: string): Promise<void>
  openExternalUrl(url: string): Promise<void>
  shutdown(): Promise<void>
}
