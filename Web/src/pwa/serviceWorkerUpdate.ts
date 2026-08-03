export type PwaUpdateSnapshot =
  | { readonly phase: 'idle' }
  | { readonly phase: 'available' }
  | { readonly phase: 'applying' }
  | { readonly phase: 'failed'; readonly reason: string }

export interface PwaUpdateController {
  getSnapshot(): PwaUpdateSnapshot
  subscribe(listener: () => void): () => void
  start(): Promise<void>
  acceptUpdate(
    prepareForActivation: () => Promise<void>,
  ): Promise<void>
  dispose(): void
}

export interface BrowserPwaUpdateControllerOptions {
  readonly serviceWorkers: ServiceWorkerContainer
  readonly basePath: string
  readonly reloadPage?: () => void
  readonly updateIntervalMilliseconds?: number
  readonly activationTimeoutMilliseconds?: number
}

const IDLE: PwaUpdateSnapshot = Object.freeze({ phase: 'idle' })
const AVAILABLE: PwaUpdateSnapshot = Object.freeze({ phase: 'available' })
const APPLYING: PwaUpdateSnapshot = Object.freeze({ phase: 'applying' })
const DEFAULT_UPDATE_INTERVAL_MS = 60 * 60 * 1_000
const DEFAULT_ACTIVATION_TIMEOUT_MS = 15_000

/**
 * Owns only Web package updates. Save verification and orderly runtime
 * shutdown remain injected through acceptUpdate's prepare callback.
 */
export class BrowserPwaUpdateController implements PwaUpdateController {
  private readonly listeners = new Set<() => void>()
  private readonly options: BrowserPwaUpdateControllerOptions
  private readonly reloadPage: () => void
  private readonly updateIntervalMilliseconds: number
  private readonly activationTimeoutMilliseconds: number
  private snapshot: PwaUpdateSnapshot = IDLE
  private waitingWorker: ServiceWorker | undefined
  private updateTimer: ReturnType<typeof setInterval> | undefined
  private started = false
  private disposed = false

  constructor(options: BrowserPwaUpdateControllerOptions) {
    this.options = options
    this.reloadPage =
      options.reloadPage ?? (() => window.location.reload())
    this.updateIntervalMilliseconds =
      options.updateIntervalMilliseconds ?? DEFAULT_UPDATE_INTERVAL_MS
    this.activationTimeoutMilliseconds =
      options.activationTimeoutMilliseconds ?? DEFAULT_ACTIVATION_TIMEOUT_MS
  }

  getSnapshot = (): PwaUpdateSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async start(): Promise<void> {
    if (this.started || this.disposed) return
    this.started = true
    try {
      const registration = await this.options.serviceWorkers.register(
        `${normalizeBasePath(this.options.basePath)}service-worker.js`,
        {
          scope: normalizeBasePath(this.options.basePath),
          updateViaCache: 'none',
        },
      )
      if (this.disposed) return
      this.observeRegistration(registration)
      void registration.update().catch(() => undefined)
      this.updateTimer = globalThis.setInterval(
        () => void registration.update().catch(() => undefined),
        this.updateIntervalMilliseconds,
      )
    } catch {
      // PWA installation remains an enhancement; registration failure must
      // never block the local game or its persistence runtime.
    }
  }

  async acceptUpdate(
    prepareForActivation: () => Promise<void>,
  ): Promise<void> {
    const worker = this.waitingWorker
    if (
      worker === undefined ||
      (this.snapshot.phase !== 'available' &&
        this.snapshot.phase !== 'failed')
    ) {
      return
    }
    this.publish(APPLYING)
    try {
      await prepareForActivation()
    } catch (error) {
      this.publish(Object.freeze({
        phase: 'failed',
        reason: error instanceof Error
          ? error.message
          : 'Safe update preparation failed.',
      }))
      return
    }

    await this.requestActivation(worker)
    this.reloadPage()
  }

  dispose(): void {
    this.disposed = true
    if (this.updateTimer !== undefined) {
      globalThis.clearInterval(this.updateTimer)
      this.updateTimer = undefined
    }
    this.listeners.clear()
  }

  private observeRegistration(
    registration: ServiceWorkerRegistration,
  ): void {
    this.offerWaitingWorker(registration.waiting)
    this.observeInstallingWorker(registration.installing)
    registration.addEventListener('updatefound', () => {
      this.observeInstallingWorker(registration.installing)
    })
  }

  private observeInstallingWorker(
    worker: ServiceWorker | null,
  ): void {
    if (worker === null) return
    const inspect = () => {
      if (worker.state === 'installed') this.offerWaitingWorker(worker)
    }
    worker.addEventListener('statechange', inspect)
    inspect()
  }

  private offerWaitingWorker(worker: ServiceWorker | null): void {
    if (
      worker === null ||
      this.options.serviceWorkers.controller === null
    ) {
      return
    }
    this.waitingWorker = worker
    this.publish(AVAILABLE)
  }

  private publish(snapshot: PwaUpdateSnapshot): void {
    if (this.disposed) return
    this.snapshot = snapshot
    for (const listener of this.listeners) listener()
  }

  private requestActivation(worker: ServiceWorker): Promise<void> {
    return new Promise((resolve) => {
      let timeout: ReturnType<typeof setTimeout> | undefined
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        if (timeout !== undefined) globalThis.clearTimeout(timeout)
        this.options.serviceWorkers.removeEventListener(
          'controllerchange',
          finish,
        )
        resolve()
      }
      this.options.serviceWorkers.addEventListener(
        'controllerchange',
        finish,
      )
      timeout = globalThis.setTimeout(
        finish,
        this.activationTimeoutMilliseconds,
      )
      try {
        worker.postMessage({ type: 'ACTIVATE_UPDATE' })
      } catch {
        // The verified checkpoint and orderly shutdown already completed.
        // Reload the controlled package instead of leaving a dead runtime.
        finish()
      }
    })
  }
}

export function createProductionPwaUpdateController():
  | PwaUpdateController
  | undefined {
  if (
    !import.meta.env.PROD ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return undefined
  }
  return new BrowserPwaUpdateController({
    serviceWorkers: navigator.serviceWorker,
    basePath: import.meta.env.BASE_URL,
  })
}

function normalizeBasePath(basePath: string): string {
  const withLeadingSlash = basePath.startsWith('/')
    ? basePath
    : `/${basePath}`
  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash
    : `${withLeadingSlash}/`
}
