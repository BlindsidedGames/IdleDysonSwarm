import type { GameDecimal } from '../../math/gameDecimal'

export type UiRuntimeWarningCode =
  | 'backup-recovered'
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
  readonly context?: import('../../save/importContext').ImportContext
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

export interface UiRuntimeImportPreview {
  readonly infinityPoints: bigint
  readonly quantumPoints: bigint
  readonly skillPoints: bigint
}

export type UiRuntimeImportPreviewResult =
  | {
      readonly accepted: true
      readonly preview: UiRuntimeImportPreview
    }
  | {
      readonly accepted: false
      readonly code: string
      readonly reason: string
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

export type UiRuntimeDevelopmentResult =
  | {
      readonly applied: true
      readonly bots: number
      readonly stateRevision: number
      readonly durableRevision: number
    }
  | {
      readonly applied: false
      readonly code: string
      readonly reason: string
    }

export type UiRuntimeDevelopmentRealityResult =
  | {
      readonly applied: true
      readonly secretsOfTheUniverse: bigint
      readonly stateRevision: number
      readonly durableRevision: number
    }
  | {
      readonly applied: false
      readonly code: string
      readonly reason: string
    }

export type UiRuntimeDevelopmentAction =
  | { readonly kind: 'add-cash'; readonly amount: GameDecimal }
  | { readonly kind: 'add-bots'; readonly amount: GameDecimal }
  | { readonly kind: 'add-skill-points'; readonly amount: bigint }
  | { readonly kind: 'add-infinity-points'; readonly amount: GameDecimal }
  | { readonly kind: 'add-quantum-shards'; readonly amount: GameDecimal }
  | { readonly kind: 'add-influence'; readonly amount: GameDecimal }
  | { readonly kind: 'add-strange-matter'; readonly amount: GameDecimal }
  | { readonly kind: 'set-tinker-interval'; readonly seconds: 0.01 | 1 }
  | { readonly kind: 'recalculate-skill-points' }
  | { readonly kind: 'reset-secret-progress' }
  | { readonly kind: 'unlock-debug-options' }
  | { readonly kind: 'purchase-debug-options' }
  | { readonly kind: 'disable-debug-options' }

export interface UiRuntimeDevelopmentStatus {
  readonly enabled: boolean
  readonly entitled: boolean
  readonly quantumShards: bigint
  readonly strangeMatter: bigint
}

export type UiRuntimeDevelopmentActionResult =
  | {
      readonly applied: true
      readonly stateRevision: number
      readonly durableRevision: number
    }
  | {
      readonly applied: false
      readonly code: string
      readonly reason: string
    }

export interface UiRuntimeDevelopmentControls {
  status(): UiRuntimeDevelopmentStatus
  setDysonBots(bots: number): Promise<UiRuntimeDevelopmentResult>
  unlockReality(): Promise<UiRuntimeDevelopmentRealityResult>
  apply(
    action: UiRuntimeDevelopmentAction,
  ): Promise<UiRuntimeDevelopmentActionResult>
  simulateOfflineTime(
    seconds: number,
  ): Promise<UiRuntimeDevelopmentActionResult>
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
  takeOverWriterOwnership(): Promise<UiRuntimeStartResult>
  dispatchPlayer(
    command: TPlayerCommand,
  ): Promise<UiRuntimePlayerCommandResult>
  readonly development?: UiRuntimeDevelopmentControls
  previewImport(
    request: UiRuntimeImportRequest,
  ): Promise<UiRuntimeImportPreviewResult>
  /** Re-reads backend-owned durable purchases; no ownership value is accepted. */
  synchronizeHostEntitlements?(): Promise<boolean>
  importSave(request: UiRuntimeImportRequest): Promise<UiRuntimeImportResult>
  inspectStorage(
    requestPersistence?: boolean,
  ): Promise<UiRuntimeStorageStatus>
  requestCheckpoint(): Promise<boolean>
  checkpointBeforeSafeReload(): Promise<boolean>
  recoveryExportAvailable(): boolean
  readCurrentSaveText(): Promise<string | null>
  exportCurrentSave(): Promise<boolean>
  exportLastRecovery(): Promise<boolean>
  copyLastRecovery(): Promise<boolean>
  readClipboardText(): Promise<string>
  writeClipboardText(value: string): Promise<void>
  openExternalUrl(url: string): Promise<void>
  shutdown(): Promise<void>
}
