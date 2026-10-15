export interface WriterOperationAuthority {
  readonly sessionId: string
  readonly generation: number
  /** Browser sessions expose their renewable deadline; native sessions do not expire. */
  readonly deadlineUtcMilliseconds: number | null
  isAuthoritative(): boolean
  cancellationRequested(): boolean
}

export type WriterAuthorityAcquisition =
  | { readonly acquired: true }
  | { readonly acquired: false }

export type WriterAuthorityState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'blocked' }
  | {
      readonly kind: 'writable'
      readonly sessionId: string
      readonly generation: number
    }
  | {
      readonly kind: 'lost'
      readonly sessionId: string
      readonly generation: number
      readonly reason: string
    }
  | { readonly kind: 'released' }
  | { readonly kind: 'disposed' }

export type WriterAuthorityListener = (
  state: WriterAuthorityState,
) => void

export class WriterAuthorityLostError extends Error {
  constructor(message = 'The writable host session lost authority.') {
    super(message)
    this.name = 'WriterAuthorityLostError'
  }
}

/**
 * Host-neutral authority for one terminal gameplay writer session.
 *
 * Implementations synchronously cancel authority when release/shutdown begins,
 * validate operations before and after awaited work, reject late results, and
 * drain already-admitted work before terminal shutdown resolves.
 */
export interface WriterAuthorityPort {
  state(): WriterAuthorityState
  subscribe(listener: WriterAuthorityListener): () => void
  acquire(): Promise<WriterAuthorityAcquisition>
  assertWritable(): Promise<unknown>
  runAuthoritativeOperation<T>(
    operation: (
      authority: WriterOperationAuthority,
    ) => T | Promise<T>,
  ): Promise<T>
  isAuthoritative(): boolean
  cancellationRequested(): boolean
  release(): Promise<boolean>
  shutdown(): Promise<boolean>
}

/** Browser-only deliberate fencing of another tab's expiring lease. */
export interface WriterAuthorityTakeoverPort {
  takeOver(): Promise<WriterAuthorityAcquisition>
}
