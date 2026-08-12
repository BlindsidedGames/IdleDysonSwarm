import { createStage7V2CertificationPaths } from './contracts'

export interface Stage7V2WriterLease {
  readonly ownerId: string
  readonly generation: number
}

export interface Stage7V2WriterLeaseManager {
  runExclusive<T>(
    operation: (lease: Readonly<Stage7V2WriterLease>) => Promise<T>,
  ): Promise<T>
}

export class Stage7V2WriterLeaseUnavailableError extends Error {
  constructor() {
    super('The Stage 7 certification writer is active in another host.')
    this.name = 'Stage7V2WriterLeaseUnavailableError'
  }
}

interface BrowserLockManager {
  request<T>(
    name: string,
    options: Readonly<{ mode: 'exclusive'; ifAvailable: true }>,
    callback: (lock: unknown | null) => Promise<T>,
  ): Promise<T>
}

/** Cross-tab lease. No browser lock is requested until an explicit host action. */
export class Stage7V2BrowserWriterLeaseManager
implements Stage7V2WriterLeaseManager {
  readonly #name: string
  readonly #ownerId: string
  readonly #locks: Readonly<BrowserLockManager>

  constructor(buildScope: string, ownerId: string, locks: unknown = navigator.locks) {
    this.#name = `${createStage7V2CertificationPaths(buildScope).root}/host-writer`
    this.#ownerId = requireOwnerId(ownerId)
    this.#locks = captureBrowserLocks(locks)
  }

  runExclusive<T>(
    operation: (lease: Readonly<Stage7V2WriterLease>) => Promise<T>,
  ): Promise<T> {
    requireOperation(operation)
    return this.#locks.request(
      this.#name,
      Object.freeze({ mode: 'exclusive', ifAvailable: true }),
      async (lock) => {
        if (lock === null) throw new Stage7V2WriterLeaseUnavailableError()
        return operation(Object.freeze({
          ownerId: this.#ownerId,
          generation: 1,
        }))
      },
    )
  }
}

/** Native single-host lease; concurrent or reentrant writers fail closed. */
export class Stage7V2NativeWriterLeaseManager
implements Stage7V2WriterLeaseManager {
  readonly #ownerId: string
  #busy = false

  constructor(ownerId: string) {
    this.#ownerId = requireOwnerId(ownerId)
  }

  async runExclusive<T>(
    operation: (lease: Readonly<Stage7V2WriterLease>) => Promise<T>,
  ): Promise<T> {
    requireOperation(operation)
    if (this.#busy || nativeWriterBusy) throw new Stage7V2WriterLeaseUnavailableError()
    this.#busy = true
    nativeWriterBusy = true
    try {
      return await operation(Object.freeze({
        ownerId: this.#ownerId,
        generation: 1,
      }))
    } finally {
      this.#busy = false
      nativeWriterBusy = false
    }
  }
}

let nativeWriterBusy = false

function captureBrowserLocks(value: unknown): Readonly<BrowserLockManager> {
  if (value === null || typeof value !== 'object') {
    throw new TypeError('Stage 7 browser writer lock manager is invalid.')
  }
  try {
    let owner: object | null = value
    let request: unknown
    for (let depth = 0; owner !== null && depth < 4; depth += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(owner, 'request')
      if (descriptor !== undefined) {
        if (!('value' in descriptor) || typeof descriptor.value !== 'function') {
          throw new TypeError()
        }
        request = descriptor.value
        break
      }
      owner = Object.getPrototypeOf(owner)
    }
    if (typeof request !== 'function') throw new TypeError()
    return Object.freeze({ request: request.bind(value) as BrowserLockManager['request'] })
  } catch {
    throw new TypeError('Stage 7 browser writer lock manager is invalid.')
  }
}

function requireOwnerId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u.test(value)) {
    throw new TypeError('Stage 7 writer owner ID is invalid.')
  }
  return value
}

function requireOperation<T>(
  value: unknown,
): asserts value is (lease: Readonly<Stage7V2WriterLease>) => Promise<T> {
  if (typeof value !== 'function') {
    throw new TypeError('Stage 7 writer lease operation must be callable.')
  }
}
