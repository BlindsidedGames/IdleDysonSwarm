import type {
  DeepReadonly,
  SimulationEngineDefinition,
  SimulationTransitionResult,
  Unsubscribe,
} from '../core/contracts'
import type { PreparedSave } from '../save/prepare'
import type { SaveRepository } from '../save/repository'
import type {
  StartupSaveResolution,
  StartupSaveResolver,
} from '../save/startupResolver'

export const APPLICATION_SNAPSHOT_VERSION = 1 as const

export type ReadySource =
  | 'first-run'
  | 'primary'
  | 'cloud'
  | 'recovered-canonical'
  | 'recovered-legacy'
  | 'import'

export type BlockingStartupOutcome =
  | 'unsupported-future-version'
  | 'all-candidates-invalid'
  | 'recovery-write-failed'
  | 'storage-failed'
  | 'post-commit-reload-failed'

export interface ApplicationRevision {
  readonly session: number
  readonly state: number
  readonly durable: number | null
}

export type CheckpointState =
  | { readonly kind: 'clean'; readonly durableRevision: number }
  | {
      readonly kind: 'dirty'
      readonly durableRevision: number | null
      readonly reason:
        | 'state-changed'
        | 'initial-save-failed'
        | 'checkpoint-failed'
      readonly error?: string
    }
  | {
      readonly kind: 'checkpointing'
      readonly durableRevision: number | null
      readonly targetStateRevision: number
    }

export type CommitFirstPurpose =
  | 'stored-time'
  | 'away-time'
  | 'bot-cap'
  | 'development'

export type ExclusiveOperation =
  | 'none'
  | 'import'
  | CommitFirstPurpose
  | 'reload-after-commit'

export type ApplicationSnapshot<TState> =
  | {
      readonly version: typeof APPLICATION_SNAPSHOT_VERSION
      readonly phase: 'idle' | 'starting'
    }
  | {
      readonly version: typeof APPLICATION_SNAPSHOT_VERSION
      readonly phase: 'blocked'
      readonly outcome: BlockingStartupOutcome
      readonly error: string
    }
  | {
      readonly version: typeof APPLICATION_SNAPSHOT_VERSION
      readonly phase: 'ready'
      readonly source: ReadySource
      readonly revision: ApplicationRevision
      readonly checkpoint: CheckpointState
      readonly operation: ExclusiveOperation
      readonly state: DeepReadonly<TState>
    }

export type StartupResolution = StartupSaveResolution
export type { StartupSaveResolver }

export interface GameStateSession<TState> {
  readonly initialState: TState
  prepare(state: TState | DeepReadonly<TState>): PreparedSave
}

export interface GameStateSessionFactory<TState> {
  open(prepared: PreparedSave): GameStateSession<TState>
}

export interface ApplicationCommandEnvelope<TCommand> {
  readonly sessionRevision: number
  readonly expectedStateRevision: number
  readonly command: TCommand
}

export interface GameApplicationOptions<TState, TCommand> {
  readonly startupResolver: StartupSaveResolver
  readonly sessionFactory: GameStateSessionFactory<TState>
  readonly engineDefinition: SimulationEngineDefinition<TState, TCommand>
  readonly repository: SaveRepository
  /** Deterministic graph beneath historical schema-13 portable progress. */
  readonly createTransitionalRecoveryBase?: () => PreparedSave
}

export type CheckpointResult =
  | {
      readonly committed: true
      readonly targetStateRevision: number
      readonly durableRevision: number
    }
  | {
      readonly committed: false
      readonly code: string
      readonly reason: string
    }

export type CommitFirstResult =
  | {
      readonly committed: true
      readonly transition: Extract<
        SimulationTransitionResult,
        { accepted: true }
      >
      readonly durableRevision: number
    }
  | {
      readonly committed: false
      readonly transition: SimulationTransitionResult
      readonly code?: string
      readonly reason?: string
    }

export interface ImportSaveRequest {
  readonly text: string
  readonly importedAtUtc: string
  readonly overwriteApproved: boolean
  readonly target?: import('../save/repository').SaveCommitTarget
  readonly context?: import('../save/importContext').ImportContext
}

export type ImportSaveResult =
  | {
      readonly imported: true
      readonly sessionRevision: number
    }
  | {
      readonly imported: false
      readonly committed: boolean
      readonly code: string
      readonly reason: string
    }

export type ApplicationListener<TState> = (
  snapshot: ApplicationSnapshot<TState>,
) => void

export interface GameApplication<TState, TCommand> {
  snapshot(): ApplicationSnapshot<TState>
  start(): Promise<ApplicationSnapshot<TState>>
  dispatch(
    envelope: ApplicationCommandEnvelope<TCommand>,
  ): SimulationTransitionResult
  advanceActive(milliseconds: number): SimulationTransitionResult
  checkpoint(): Promise<CheckpointResult>
  dispatchCommitFirst(
    envelope: ApplicationCommandEnvelope<TCommand>,
    purpose: CommitFirstPurpose,
  ): Promise<CommitFirstResult>
  importSave(request: ImportSaveRequest): Promise<ImportSaveResult>
  subscribe(listener: ApplicationListener<TState>): Unsubscribe
}
