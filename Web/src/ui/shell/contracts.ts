import type { LocalDiagnosticReport } from './diagnostics'

export type StartupShellPhase =
  | 'idle'
  | 'starting'
  | 'writer-blocked'
  | 'application-blocked'
  | 'recovery'
  | 'ready-placeholder'
  | 'ownership-lost'
  | 'stopping'
  | 'error'

export type StartupShellOperationStatus =
  | 'import-pending'
  | 'import-succeeded'
  | 'import-failed'
  | 'export-pending'
  | 'export-succeeded'
  | 'export-failed'
  | 'reload-pending'
  | 'reload-completed'
  | 'reload-failed'

/**
 * Presentation-only startup state supplied by the runtime integration layer.
 * It intentionally carries no save payload, repository, coordinator, or
 * gameplay object.
 */
export interface StartupShellViewModel {
  readonly phase: StartupShellPhase
  readonly diagnostics?: LocalDiagnosticReport
  readonly operationStatus?: StartupShellOperationStatus
}

/**
 * Optional user intents supported by the startup shell. The shell never
 * interprets an intent or mutates canonical state itself.
 */
export interface StartupShellActions {
  readonly disabled?: boolean
  readonly start?: () => void
  readonly takeOverWriter?: () => void
  readonly checkAgain?: () => void
  readonly retry?: () => void
  readonly importSaveText?: (text: string) => void
  readonly exportRecovery?: () => void
}
