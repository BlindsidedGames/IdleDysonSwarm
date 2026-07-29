export type UiRuntimeWarningCode =
  | 'persistent-storage-denied'
  | 'quota-pressure'
  | 'storage-status-failed'
  | 'checkpoint-failed'
  | 'active-time-failed'
  | 'persistence-failed'

export interface UiRuntimeWarning {
  readonly code: UiRuntimeWarningCode
  readonly reason: string
}

export type UiRuntimeApplicationOutcome =
  | 'unsupported-future-version'
  | 'all-candidates-invalid'
  | 'recovery-write-failed'
  | 'storage-failed'
  | 'post-commit-reload-failed'

export type UiRuntimeFoundationStatus =
  | { readonly phase: 'idle' }
  | { readonly phase: 'starting' }
  | {
      readonly phase: 'blocked'
      readonly code: 'writer-owned' | 'application-blocked' | 'startup-failed'
      readonly reason: string
      readonly applicationOutcome?: UiRuntimeApplicationOutcome
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

export type UiRuntimeSnapshotListener<TSnapshot> = (
  snapshot: TSnapshot,
) => void

export interface UiRuntimeCommandActivationRevision {
  readonly session: number
  readonly state: number
}

export type UiRuntimePlayerCommandResult =
  | {
      readonly status: 'accepted'
      readonly kind: 'transition'
      readonly changed: boolean
      readonly stateRevision: number
      readonly activationRevision: UiRuntimeCommandActivationRevision
    }
  | {
      readonly status: 'accepted' | 'partial'
      readonly kind: 'stored-time'
      readonly admittedSeconds: number
      readonly consumedSeconds: number
      readonly remainingSeconds: number
      readonly durableRevision: number | null
      readonly stateRevision: number
      readonly activationRevision: UiRuntimeCommandActivationRevision
    }
  | {
      readonly status: 'rejected'
      readonly kind: 'transition' | 'stored-time'
      readonly code: string
      readonly reason: string
      readonly stale: boolean
      readonly stateRevision: number
      readonly activationRevision: UiRuntimeCommandActivationRevision
    }
  | {
      readonly status: 'failed'
      readonly kind: 'runtime'
      readonly code: string
      readonly reason: string
      readonly retryable: false
    }

/**
 * Host-neutral browser product boundary.
 *
 * It intentionally exposes no repository, platform adapter, canonical
 * application facade, lifecycle coordinator, save graph, or mutable gameplay
 * state. Concrete composition binds the generic parameters to the detached
 * frontend snapshot and canonical player-command union.
 */
export interface UiRuntimeFoundation<
  TSnapshot = unknown,
  TPlayerCommand = unknown,
> {
  status(): UiRuntimeFoundationStatus
  subscribeStatus(listener: UiRuntimeStatusListener): () => void
  snapshot(): TSnapshot
  subscribeSnapshot(
    listener: UiRuntimeSnapshotListener<TSnapshot>,
  ): () => void
  start(): Promise<UiRuntimeStartResult>
  dispatchPlayer(
    command: TPlayerCommand,
  ): Promise<UiRuntimePlayerCommandResult>
  importSave(request: UiRuntimeImportRequest): Promise<UiRuntimeImportResult>
  inspectStorage(
    requestPersistence?: boolean,
  ): Promise<UiRuntimeStorageStatus>
  requestCheckpoint(): Promise<boolean>
  checkpointBeforeSafeReload(): Promise<boolean>
  recoveryExportAvailable(): boolean
  exportLastRecovery(): Promise<boolean>
  readClipboardText(): Promise<string>
  writeClipboardText(value: string): Promise<void>
  openExternalUrl(url: string): Promise<void>
  shutdown(): Promise<void>
}
