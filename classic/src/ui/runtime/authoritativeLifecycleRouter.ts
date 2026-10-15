import type {
  CanonicalAwayReplayResult,
  CanonicalLifecycleSaveResult,
} from '../../application/canonicalLifecycleCoordinator'
import type {
  LifecycleAdapter,
  LifecyclePhase,
} from '../../platform/contracts'
import type {
  WriterOperationAuthority,
} from '../../platform/writerAuthority'
import { WriterAuthorityLostError } from '../../platform/writerAuthority'

export interface AuthoritativeLifecycleCoordinatorPort {
  handlePlatformPhase(
    phase: LifecyclePhase,
  ): Promise<CanonicalLifecycleSaveResult | CanonicalAwayReplayResult>
}

export interface AuthoritativeWriterLeasePort {
  runAuthoritativeOperation<T>(
    operation: (
      authority: WriterOperationAuthority,
    ) => T | Promise<T>,
  ): Promise<T>
  assertWritable(): Promise<unknown>
  isAuthoritative(): boolean
}

export type AuthoritativeLifecyclePhaseResult =
  | CanonicalLifecycleSaveResult
  | CanonicalAwayReplayResult

export type AuthoritativeLifecyclePreOperation =
  () => unknown | Promise<unknown>

export interface AuthoritativeLifecycleRouterOptions {
  readonly lifecycle: LifecycleAdapter
  readonly lease: AuthoritativeWriterLeasePort
  readonly coordinator: AuthoritativeLifecycleCoordinatorPort
  /**
   * Captures raw lifecycle metadata synchronously at phase receipt. The
   * captured value is paired with that phase through queued execution and
   * supplied to afterPhase.
   */
  readonly observePhase?: (phase: LifecyclePhase) => unknown
  /**
   * Routes one successfully observed phase. Browser composition uses this to
   * pair the raw phase with its receipt-time clock sample.
   */
  readonly handlePhase?: (
    phase: LifecyclePhase,
    phaseObservation: unknown,
  ) => Promise<AuthoritativeLifecyclePhaseResult>
  /**
   * Runs synchronously when the raw phase is observed. It may stop foreground
   * sampling and return work that must run inside the same authority fence
   * immediately before the coordinator handles the lifecycle phase.
   */
  readonly beforePhase?: (
    phase: LifecyclePhase,
    observationError: unknown | undefined,
  ) => AuthoritativeLifecyclePreOperation | undefined
  /**
   * Runs only after the lifecycle result passes the final database-backed
   * writer fence.
   */
  readonly afterPhase?: (
    phase: LifecyclePhase,
    result: AuthoritativeLifecyclePhaseResult,
    beforeResult: unknown,
    phaseObservation: unknown,
  ) => void
  readonly onFailure?: (phase: LifecyclePhase, error: unknown) => void
}

export interface AuthoritativeLifecycleStartOptions<T> {
  /** Phase already sampled and paired with the seeded startup replay. */
  readonly initialPhase: LifecyclePhase
  readonly startApplication: (
    authority: WriterOperationAuthority,
  ) => T | Promise<T>
}

interface AdmittedLifecyclePhase {
  readonly phase: LifecyclePhase
  readonly phaseObservation: unknown
  readonly observationError: unknown
  readonly observationFailed: boolean
  readonly before: AuthoritativeLifecyclePreOperation | undefined
  readonly setupError: unknown
  readonly setupFailed: boolean
}

export class AuthoritativeLifecycleRouterClosedError extends Error {
  constructor() {
    super('The authoritative lifecycle router no longer accepts operations.')
    this.name = 'AuthoritativeLifecycleRouterClosedError'
  }
}

/**
 * Serializes startup, lifecycle phases, checkpoints, and import operations
 * behind the selected host authority. Results leave this router only after a
 * final host-specific authority check.
 */
export class AuthoritativeLifecycleRouter {
  private readonly lifecycle: LifecycleAdapter
  private readonly lease: AuthoritativeWriterLeasePort
  private readonly handlePhase: NonNullable<
    AuthoritativeLifecycleRouterOptions['handlePhase']
  >
  private readonly observePhase:
    | NonNullable<AuthoritativeLifecycleRouterOptions['observePhase']>
    | undefined
  private readonly beforePhase:
    | NonNullable<AuthoritativeLifecycleRouterOptions['beforePhase']>
    | undefined
  private readonly afterPhase:
    | NonNullable<AuthoritativeLifecycleRouterOptions['afterPhase']>
    | undefined
  private readonly onFailure: (phase: LifecyclePhase, error: unknown) => void
  private operationTail: Promise<void> = Promise.resolve()
  private unsubscribe: (() => void) | undefined
  private accepting = true
  private shutdownPromise: Promise<void> | undefined

  constructor(
    options: Readonly<AuthoritativeLifecycleRouterOptions>,
  ) {
    this.lifecycle = options.lifecycle
    this.lease = options.lease
    this.handlePhase =
      options.handlePhase ??
      ((phase) =>
        options.coordinator.handlePlatformPhase(phase))
    this.observePhase = options.observePhase
    this.beforePhase = options.beforePhase
    this.afterPhase = options.afterPhase
    this.onFailure = options.onFailure ?? (() => undefined)
  }

  start<T>(
    options: Readonly<AuthoritativeLifecycleStartOptions<T>>,
  ): Promise<T> {
    if (!this.accepting) {
      return Promise.reject(
        new AuthoritativeLifecycleRouterClosedError(),
      )
    }
    const admissionBuffer: AdmittedLifecyclePhase[] = []
    let reconcilingAdmission = true
    let lifecycleEventEpoch = 0
    const receivePhase = (phase: LifecyclePhase): void => {
      const admitted = this.admitPhase(phase)
      lifecycleEventEpoch += 1
      if (reconcilingAdmission) {
        admissionBuffer.push(admitted)
      } else {
        this.routePhase(admitted)
      }
    }
    try {
      this.unsubscribe ??= this.lifecycle.subscribe(receivePhase)
      const queryEpoch = lifecycleEventEpoch
      const reconciledPhase = this.lifecycle.currentPhase()
      if (
        queryEpoch === lifecycleEventEpoch &&
        reconciledPhase !== options.initialPhase
      ) {
        admissionBuffer.push(this.admitPhase(reconciledPhase))
      }
    } catch (error) {
      this.unsubscribe?.()
      this.unsubscribe = undefined
      return Promise.reject(error)
    }
    const starting = this.run(options.startApplication)
    reconcilingAdmission = false
    for (const admitted of admissionBuffer) {
      this.routePhase(admitted)
    }
    return starting
  }

  private admitPhase(
    phase: LifecyclePhase,
  ): AdmittedLifecyclePhase {
    let phaseObservation: unknown
    let observationError: unknown
    let observationFailed = false
    let before: AuthoritativeLifecyclePreOperation | undefined
    let setupError: unknown
    let setupFailed = false
    try {
      phaseObservation = this.observePhase?.(phase)
    } catch (error) {
      observationFailed = true
      observationError = error
    }
    try {
      before = this.beforePhase?.(
        phase,
        observationFailed ? observationError : undefined,
      )
    } catch (error) {
      setupFailed = true
      setupError = error
    }
    return {
      phase,
      phaseObservation,
      observationError,
      observationFailed,
      before,
      setupError,
      setupFailed,
    }
  }

  private routePhase(admitted: AdmittedLifecyclePhase): void {
    const {
      phase,
      phaseObservation,
      observationError,
      observationFailed,
      before,
      setupError,
      setupFailed,
    } = admitted
    void this.run(async () => {
      let beforeResult: unknown
      let beforeError: unknown
      let beforeFailed = false
      try {
        beforeResult = await before?.()
      } catch (error) {
        beforeFailed = true
        beforeError = error
      }
      if (observationFailed) {
        return {
          kind: 'observation-failed' as const,
          beforeError,
          beforeFailed,
        }
      }
      const result =
        await this.handlePhase(phase, phaseObservation)
      return {
        kind: 'handled' as const,
        beforeError,
        beforeFailed,
        beforeResult,
        result,
      }
    }).then((outcome) => {
      if (setupFailed) {
        this.reportFailure(phase, setupError)
      }
      if (outcome.beforeFailed) {
        this.reportFailure(phase, outcome.beforeError)
      }
      if (outcome.kind === 'observation-failed') {
        this.reportFailure(phase, observationError)
        return
      }
      this.afterPhase?.(
        phase,
        outcome.result,
        outcome.beforeResult,
        phaseObservation,
      )
    }).catch((error: unknown) => {
      this.reportFailure(phase, error)
    })
  }

  private reportFailure(
    phase: LifecyclePhase,
    error: unknown,
  ): void {
    try {
      this.onFailure(phase, error)
    } catch {
      // A diagnostic sink cannot reopen a rejected lifecycle operation.
    }
  }

  run<T>(
    operation: (
      authority: WriterOperationAuthority,
    ) => T | Promise<T>,
  ): Promise<T> {
    if (!this.accepting) {
      return Promise.reject(
        new AuthoritativeLifecycleRouterClosedError(),
      )
    }
    const routed = this.operationTail.then(
      () => this.runFenced(operation),
      () => this.runFenced(operation),
    )
    this.operationTail = routed.then(
      () => undefined,
      () => undefined,
    )
    return routed
  }

  /**
   * Serializes an active gameplay update behind the same operation tail using
   * the lease's synchronous epoch/deadline signal for admission. Ordinary
   * steps avoid IndexedDB lease reads; an admitted bot-cap boundary may
   * dynamically perform its own commit-first, database-fenced persistence.
   *
   * There is intentionally no post-operation rejection: gameplay state may
   * already be mutated. A later ownership-loss signal discards that graph;
   * rejecting here would make the driver replay already-consumed elapsed time.
   */
  runLocallyFenced<T>(operation: () => T | Promise<T>): Promise<T> {
    if (!this.accepting) {
      return Promise.reject(
        new AuthoritativeLifecycleRouterClosedError(),
      )
    }
    const routed = this.operationTail.then(
      () => this.runLocalFence(operation),
      () => this.runLocalFence(operation),
    )
    this.operationTail = routed.then(
      () => undefined,
      () => undefined,
    )
    return routed
  }

  stop(): void {
    if (!this.accepting) return
    this.accepting = false
    this.unsubscribe?.()
    this.unsubscribe = undefined
  }

  shutdown(): Promise<void> {
    if (this.shutdownPromise !== undefined) {
      return this.shutdownPromise
    }
    this.stop()
    const acceptedTail = this.operationTail
    this.shutdownPromise = acceptedTail.then(
      () => undefined,
      () => undefined,
    )
    return this.shutdownPromise
  }

  private async runFenced<T>(
    operation: (
      authority: WriterOperationAuthority,
    ) => T | Promise<T>,
  ): Promise<T> {
    // The selected authority owns entry validation and the synchronous
    // post-operation cancellation check. Let it classify terminal fencing
    // instead of replacing that signal with a generic router error.
    const result =
      await this.lease.runAuthoritativeOperation(operation)
    await this.lease.assertWritable()
    return result
  }

  private async runLocalFence<T>(
    operation: () => T | Promise<T>,
  ): Promise<T> {
    if (!this.lease.isAuthoritative()) {
      throw new WriterAuthorityLostError()
    }
    return operation()
  }
}
