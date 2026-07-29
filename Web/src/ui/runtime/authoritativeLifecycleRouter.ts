import type {
  CanonicalAwayReplayResult,
  CanonicalLifecycleSaveResult,
} from '../../application/canonicalLifecycleCoordinator'
import type {
  LifecycleAdapter,
  LifecyclePhase,
} from '../../platform/contracts'
import type {
  BrowserWriterAuthority,
} from '../../platform/browserWriterLease'

export interface AuthoritativeLifecycleCoordinatorPort {
  handlePlatformPhase(
    phase: LifecyclePhase,
  ): Promise<CanonicalLifecycleSaveResult | CanonicalAwayReplayResult>
}

export interface AuthoritativeWriterLeasePort {
  runAuthoritativeOperation<T>(
    operation: (
      authority: BrowserWriterAuthority,
    ) => T | Promise<T>,
  ): Promise<T>
  assertWritable(): Promise<unknown>
}

export class AuthoritativeLifecycleRouterClosedError extends Error {
  constructor() {
    super('The authoritative lifecycle router no longer accepts operations.')
    this.name = 'AuthoritativeLifecycleRouterClosedError'
  }
}

/**
 * Serializes startup, browser phases, checkpoints, and import operations behind
 * the same IndexedDB authority fence. Results leave this router only after a
 * final database-backed authority check.
 */
export class AuthoritativeLifecycleRouter {
  private readonly lifecycle: LifecycleAdapter
  private readonly lease: AuthoritativeWriterLeasePort
  private readonly coordinator: AuthoritativeLifecycleCoordinatorPort
  private readonly onFailure: (phase: LifecyclePhase, error: unknown) => void
  private operationTail: Promise<void> = Promise.resolve()
  private unsubscribe: (() => void) | undefined
  private accepting = true
  private shutdownPromise: Promise<void> | undefined

  constructor(options: {
    readonly lifecycle: LifecycleAdapter
    readonly lease: AuthoritativeWriterLeasePort
    readonly coordinator: AuthoritativeLifecycleCoordinatorPort
    readonly onFailure?: (phase: LifecyclePhase, error: unknown) => void
  }) {
    this.lifecycle = options.lifecycle
    this.lease = options.lease
    this.coordinator = options.coordinator
    this.onFailure = options.onFailure ?? (() => undefined)
  }

  start<T>(
    startApplication: (
      authority: BrowserWriterAuthority,
    ) => T | Promise<T>,
  ): Promise<T> {
    const starting = this.run(startApplication)
    this.unsubscribe ??= this.lifecycle.subscribe((phase) => {
      void this.run(() =>
        this.coordinator.handlePlatformPhase(phase),
      ).catch((error: unknown) => {
        try {
          this.onFailure(phase, error)
        } catch {
          // A diagnostic sink cannot reopen a rejected lifecycle operation.
        }
      })
    })
    return starting
  }

  run<T>(
    operation: (
      authority: BrowserWriterAuthority,
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
      authority: BrowserWriterAuthority,
    ) => T | Promise<T>,
  ): Promise<T> {
    // BrowserWriterLease owns both entry validation and the synchronous
    // post-operation cancellation check. Let it classify and publish a lost
    // fence instead of replacing that signal with a generic router error.
    const result =
      await this.lease.runAuthoritativeOperation(operation)
    await this.lease.assertWritable()
    return result
  }
}
