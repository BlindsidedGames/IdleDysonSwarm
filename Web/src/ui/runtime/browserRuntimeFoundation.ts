import type {
  ApplicationSnapshot,
  CheckpointResult,
} from '../../application/contracts'
import type {
  CanonicalLifecycleApplicationPort,
  CanonicalLifecycleClock,
  CanonicalCoordinatedImportResult,
} from '../../application/canonicalLifecycleCoordinator'
import {
  CanonicalLifecycleCoordinator,
} from '../../application/canonicalLifecycleCoordinator'
import type { CanonicalRuntimeState } from '../../application/canonicalRuntimeSession'
import {
  type BrowserSaveDatabase,
  IndexedDbBrowserSaveDatabase,
  WriterLeaseLostError,
} from '../../platform/browserSaveDatabase'
import {
  BrowserLifecycleAdapter,
  BrowserLifecycleUtcClock,
} from '../../platform/browserLifecycle'
import {
  BrowserRecoveryBlobExporter,
  BrowserRecoveryBlobRetainer,
  BrowserSaveImportReader,
  BrowserTextDownloadAdapter,
  type TextDownloadPort,
} from '../../platform/browserSaveTransfer'
import {
  BrowserStorageStatusAdapter,
  type BrowserStorageManagerPort,
  type BrowserStorageStatus,
} from '../../platform/browserStorageStatus'
import {
  BrowserClipboardAdapter,
  BrowserExternalNavigationAdapter,
  type ClipboardPort,
  type ExternalWindowOpener,
} from '../../platform/browserSystemPorts'
import {
  BrowserWriterLease,
  type BrowserWriterOwnershipState,
  type IntervalScheduler,
  type OwnershipNoticeChannel,
} from '../../platform/browserWriterLease'
import type {
  ClipboardAdapter,
  ExternalNavigationAdapter,
  LifecycleAdapter,
} from '../../platform/contracts'
import { IndexedDbSaveStorageAdapter } from '../../platform/indexedDbSaveStorage'
import {
  PeriodicCheckpointScheduler,
} from '../../platform/periodicCheckpoint'
import { decodeIdb1Save } from '../../save/decodeIdb1'
import {
  PortableSaveRepository,
  type SaveRepository,
} from '../../save/repository'
import {
  AuthoritativeLifecycleRouter,
} from './authoritativeLifecycleRouter'
import type {
  UiRuntimeFoundation,
  UiRuntimeFoundationStatus,
  UiRuntimeImportRequest,
  UiRuntimeImportResult,
  UiRuntimeStartResult,
  UiRuntimeStorageStatus,
  UiRuntimeStatusListener,
  UiRuntimeWarning,
} from './contracts'

export const DEVELOPMENT_ONLY_BROWSER_DATABASE_NAME =
  'idle-dyson-swarm-web-development-v1'
export const DEVELOPMENT_ONLY_BROWSER_PROFILE_ID =
  'development-only-default-profile'

interface BrowserRuntimeApplicationPort
  extends CanonicalLifecycleApplicationPort {
  checkpoint(): Promise<CheckpointResult>
}

export type BrowserRuntimeApplicationFactory = (
  repository: SaveRepository,
) => BrowserRuntimeApplicationPort

export interface BrowserRuntimeLifecyclePolicy {
  readonly saveOnPause: boolean
  readonly saveOnFocusLoss: boolean
  readonly replayOnFocusGain: boolean
}

export interface BrowserRuntimeFoundationOptions {
  /**
   * Required backend-owned factory. Production gameplay configuration and the
   * authoritative first-run save factory are Wave 2/backend prerequisites.
   */
  readonly createApplication: BrowserRuntimeApplicationFactory
  readonly lifecyclePolicy: Readonly<BrowserRuntimeLifecyclePolicy>
  readonly allowedExternalOrigins: readonly string[]
  readonly databaseName?: string
  readonly profileId?: string
  /** Deterministic test seam; production composition constructs IndexedDB. */
  readonly database?: BrowserSaveDatabase
  readonly indexedDbFactory?: IDBFactory
  /** Deterministic lifecycle orchestration test seam. */
  readonly lifecycle?: LifecycleAdapter
  readonly lifecycleClock?: CanonicalLifecycleClock
  readonly storageManager?: BrowserStorageManagerPort
  readonly clipboard?: ClipboardPort
  readonly navigationOpener?: ExternalWindowOpener
  readonly downloads?: TextDownloadPort
  readonly nowUtcMilliseconds?: () => number
  readonly ownerToken?: string
  readonly ownerTokenFactory?: () => string
  readonly leaseDurationMilliseconds?: number
  readonly heartbeatMilliseconds?: number
  readonly leaseScheduler?: IntervalScheduler
  readonly checkpointScheduler?: IntervalScheduler
  readonly noticeChannel?: OwnershipNoticeChannel
  readonly autoHeartbeat?: boolean
  readonly legacyIdFactory?: () => string
}

interface BrowserRuntimeGraph {
  readonly application: BrowserRuntimeApplicationPort
  readonly coordinator: CanonicalLifecycleCoordinator
  readonly router: AuthoritativeLifecycleRouter
  readonly checkpoint: PeriodicCheckpointScheduler
  readonly retainer: BrowserRecoveryBlobRetainer
}

/**
 * Browser Wave 1 composition root.
 *
 * The returned host-neutral facade never exposes the objects assembled here.
 * Canonical-player release writes remain disabled. The default database and
 * profile are explicitly development-only until backend-owned production
 * application and first-run factories are supplied and approved in Wave 2.
 */
export function createBrowserRuntimeFoundation(
  options: Readonly<BrowserRuntimeFoundationOptions>,
): UiRuntimeFoundation {
  const implementation = new BrowserRuntimeFoundation(options)
  const facade: UiRuntimeFoundation = {
    status: () => implementation.status(),
    subscribeStatus: (listener: UiRuntimeStatusListener) =>
      implementation.subscribeStatus(listener),
    start: () => implementation.start(),
    importSave: (request: UiRuntimeImportRequest) =>
      implementation.importSave(request),
    inspectStorage: (requestPersistence = false) =>
      implementation.inspectStorage(requestPersistence),
    requestCheckpoint: () =>
      implementation.requestCheckpoint(),
    checkpointBeforeSafeReload: () =>
      implementation.checkpointBeforeSafeReload(),
    exportLastRecovery: () =>
      implementation.exportLastRecovery(),
    readClipboardText: () =>
      implementation.readClipboardText(),
    writeClipboardText: (value: string) =>
      implementation.writeClipboardText(value),
    openExternalUrl: (url: string) =>
      implementation.openExternalUrl(url),
    shutdown: () => implementation.shutdown(),
  }
  return Object.freeze(facade)
}

class BrowserRuntimeFoundation implements UiRuntimeFoundation {
  private readonly options: Readonly<BrowserRuntimeFoundationOptions>
  private readonly database: BrowserSaveDatabase
  private readonly lease: BrowserWriterLease
  private readonly lifecycle: LifecycleAdapter
  private readonly clock: CanonicalLifecycleClock
  private clipboard: ClipboardAdapter | undefined
  private readonly navigation: ExternalNavigationAdapter
  private readonly storageStatus: BrowserStorageStatusAdapter
  private readonly importReader: BrowserSaveImportReader
  private readonly exporter: BrowserRecoveryBlobExporter
  private readonly listeners = new Set<UiRuntimeStatusListener>()
  private currentStatus: UiRuntimeFoundationStatus = Object.freeze({
    phase: 'idle',
  })
  private warnings: UiRuntimeWarning[] = []
  private graph: BrowserRuntimeGraph | undefined
  private lastRecoveryPath: string | undefined
  private startPromise: Promise<UiRuntimeStartResult> | undefined
  private teardownPromise: Promise<void> | undefined
  private shutdownRequested = false
  private unsubscribeOwnership: (() => void) | undefined

  constructor(options: Readonly<BrowserRuntimeFoundationOptions>) {
    this.options = options
    const databaseName =
      options.databaseName ?? DEVELOPMENT_ONLY_BROWSER_DATABASE_NAME
    this.database =
      options.database ??
      new IndexedDbBrowserSaveDatabase(
        databaseName,
        options.indexedDbFactory,
      )
    this.lease = new BrowserWriterLease({
      database: this.database,
      nowUtcMilliseconds: options.nowUtcMilliseconds,
      ownerToken: options.ownerToken,
      ownerTokenFactory: options.ownerTokenFactory,
      leaseDurationMilliseconds:
        options.leaseDurationMilliseconds,
      heartbeatMilliseconds: options.heartbeatMilliseconds,
      scheduler: options.leaseScheduler,
      noticeChannel: options.noticeChannel,
      autoHeartbeat: options.autoHeartbeat,
    })
    this.lifecycle =
      options.lifecycle ?? new BrowserLifecycleAdapter()
    this.clock =
      options.lifecycleClock ?? new BrowserLifecycleUtcClock()
    this.navigation = new BrowserExternalNavigationAdapter(
      options.allowedExternalOrigins,
      options.navigationOpener,
    )
    this.storageStatus = new BrowserStorageStatusAdapter(
      options.storageManager,
    )
    this.importReader = new BrowserSaveImportReader()
    this.exporter = new BrowserRecoveryBlobExporter(
      { readText: (path) => this.database.readFile(path) },
      options.downloads ?? new BrowserTextDownloadAdapter(),
    )
    this.unsubscribeOwnership = this.lease.subscribe((state) => {
      this.handleOwnershipState(state)
    })
  }

  status(): UiRuntimeFoundationStatus {
    return this.currentStatus
  }

  subscribeStatus(listener: UiRuntimeStatusListener): () => void {
    if (this.shutdownRequested) return () => undefined
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  start(): Promise<UiRuntimeStartResult> {
    if (this.shutdownRequested) {
      return Promise.resolve(this.currentStatus)
    }
    this.startPromise ??= this.startOnce()
    return this.startPromise
  }

  async importSave(
    request: UiRuntimeImportRequest,
  ): Promise<UiRuntimeImportResult> {
    const graph = this.requireGraph()
    let retainedPath: string | undefined
    try {
      const routed = await graph.router.run(async () => {
        const supplied = await this.readSuppliedSave(request)

        // The supplied-text ceiling is proven before the first write. The exact
        // bounded source is then retained before the coordinator invokes the
        // canonical decode/migrate/repair/validation and replacement pipeline.
        const recovery =
          await graph.retainer.retainOriginal(supplied)
        retainedPath = recovery.sourcePath
        const imported = await graph.coordinator.importSave({
          text: supplied.text,
          importedAtUtc: request.importedAtUtc,
          overwriteApproved: request.overwriteApproved,
          target: 'development',
        })
        return { imported, recoveryPath: recovery.sourcePath }
      })
      this.assertCurrentGraph(graph)
      this.lastRecoveryPath = routed.recoveryPath
      if (routed.imported.imported) {
        graph.checkpoint.start()
        const snapshot = graph.application.snapshot()
        if (snapshot.phase === 'ready') {
          this.publish(this.readyStatus())
        }
      }
      return mapImportResult(routed.imported, true)
    } catch (error) {
      await this.lease.assertWritable()
      this.assertCurrentGraph(graph)
      if (retainedPath !== undefined) {
        this.lastRecoveryPath = retainedPath
      }
      return {
        imported: false,
        committed: false,
        code: importFailureCode(error),
        reason: errorMessage(error),
        recoveryAvailable: retainedPath !== undefined,
      }
    }
  }

  async exportLastRecovery(): Promise<boolean> {
    const recoveryPath = this.lastRecoveryPath
    if (recoveryPath === undefined) return false
    await this.exporter.export(recoveryPath)
    return true
  }

  async inspectStorage(
    requestPersistence = false,
  ): Promise<UiRuntimeStorageStatus> {
    return Object.freeze(
      await this.storageStatus.inspect(requestPersistence),
    )
  }

  async requestCheckpoint(): Promise<boolean> {
    if (this.shutdownRequested || this.graph === undefined) {
      return false
    }
    return this.requestFencedCheckpoint(this.graph, false)
  }

  async checkpointBeforeSafeReload(): Promise<boolean> {
    if (this.shutdownRequested || this.graph === undefined) {
      return false
    }
    return this.requestFencedCheckpoint(this.graph, true)
  }

  readClipboardText(): Promise<string> {
    return this.clipboardAdapter().readText()
  }

  writeClipboardText(value: string): Promise<void> {
    return this.clipboardAdapter().writeText(value)
  }

  openExternalUrl(url: string): Promise<void> {
    return this.navigation.openUrl(url)
  }

  shutdown(): Promise<void> {
    if (this.shutdownRequested) {
      return this.teardownPromise ?? Promise.resolve()
    }
    this.shutdownRequested = true
    const graph = this.graph
    graph?.router.stop()
    graph?.checkpoint.stop()
    this.publish({ phase: 'stopping' })
    const existingLossTeardown = this.teardownPromise
    this.teardownPromise = (
      existingLossTeardown ??
      this.teardown(graph, true)
    ).then(() => {
      if (this.graph === graph) this.graph = undefined
      this.unsubscribeOwnership?.()
      this.unsubscribeOwnership = undefined
      this.publish({ phase: 'stopped' }, true)
    })
    return this.teardownPromise
  }

  private async startOnce(): Promise<UiRuntimeStartResult> {
    this.publish({ phase: 'starting' })
    try {
      const acquisition = await this.lease.acquire()
      if (this.shutdownRequested) {
        await this.teardownPromise
        return this.currentStatus
      }
      if (!acquisition.acquired) {
        const blocked = Object.freeze({
          phase: 'blocked',
          code: 'writer-owned',
          reason:
            'Another browser context owns the writable game session.',
          generation: acquisition.generation,
          expiresAtUtcMilliseconds:
            acquisition.expiresAtUtcMilliseconds,
        } satisfies UiRuntimeFoundationStatus)
        this.publish(blocked)
        return blocked
      }

      this.collectStorageWarnings(
        await this.storageStatus.inspect(true),
      )
      // Storage inspection can await a browser permission prompt while a
      // heartbeat discovers takeover. Revalidate before constructing or
      // attaching any application graph, and re-check orderly shutdown after
      // the await boundary.
      await this.lease.assertWritable()
      if (this.shutdownRequested) {
        await this.teardownPromise
        return this.currentStatus
      }
      const graph = this.createGraph()
      this.graph = graph
      await graph.router.start(() => graph.coordinator.start())
      this.assertCurrentGraph(graph)

      const applicationSnapshot = graph.application.snapshot()
      if (applicationSnapshot.phase === 'blocked') {
        const blocked = applicationBlockedStatus(
          applicationSnapshot,
        )
        this.publish(blocked)
        return blocked
      }
      if (applicationSnapshot.phase !== 'ready') {
        throw new Error(
          `Application startup ended in ${applicationSnapshot.phase}.`,
        )
      }
      graph.checkpoint.start()
      const ready = this.readyStatus()
      this.publish(ready)
      return ready
    } catch (error) {
      if (this.shutdownRequested) {
        await this.teardownPromise
        return this.currentStatus
      }
      if (error instanceof WriterLeaseLostError) {
        return this.currentStatus
      }
      const blocked = Object.freeze({
        phase: 'blocked',
        code: 'startup-failed',
        reason: errorMessage(error),
      } satisfies UiRuntimeFoundationStatus)
      this.publish(blocked)
      const graph = this.detachGraph()
      this.teardownPromise ??= this.teardown(graph, true)
      return blocked
    }
  }

  private createGraph(): BrowserRuntimeGraph {
    const profileId =
      this.options.profileId ??
      DEVELOPMENT_ONLY_BROWSER_PROFILE_ID
    const storage = new IndexedDbSaveStorageAdapter({
      database: this.database,
      lease: this.lease,
      nowUtcMilliseconds: this.options.nowUtcMilliseconds,
      legacyIdFactory: this.options.legacyIdFactory,
    })
    const repository = new PortableSaveRepository(
      storage,
      developmentOnlyRepositoryPaths(profileId),
      decodeIdb1Save,
      { allowCanonicalPlayerWrites: false },
    )
    const application = this.options.createApplication(repository)
    const coordinator = new CanonicalLifecycleCoordinator({
      application,
      lifecycle: this.lifecycle,
      clock: this.clock,
      policy: this.options.lifecyclePolicy,
      subscribeToLifecycle: false,
    })
    const router = new AuthoritativeLifecycleRouter({
      lifecycle: this.lifecycle,
      lease: this.lease,
      coordinator,
      onFailure: (_phase, error) => {
        if (
          !(error instanceof WriterLeaseLostError) &&
          this.graph?.router === router
        ) {
          this.addWarning({
            code: 'persistence-failed',
            reason: errorMessage(error),
          })
        }
      },
    })
    const checkpoint = new PeriodicCheckpointScheduler({
      scheduler: this.options.checkpointScheduler,
      port: {
        isDirty: () => isDirtySnapshot(application.snapshot()),
        checkpoint: () =>
          router.run(() => application.checkpoint()),
      },
      onFailure: (failure) => {
        if (this.graph?.checkpoint === checkpoint) {
          this.addWarning({
            code: 'checkpoint-failed',
            reason: failure.reason,
          })
        }
      },
    })
    return {
      application,
      coordinator,
      router,
      checkpoint,
      retainer: new BrowserRecoveryBlobRetainer(storage),
    }
  }

  private handleOwnershipState(
    state: BrowserWriterOwnershipState,
  ): void {
    if (
      this.shutdownRequested ||
      state.kind !== 'lost'
    ) {
      return
    }
    const graph = this.detachGraph()
    this.publish({
      phase: 'ownership-lost',
      reason: state.reason,
    })
    this.teardownPromise ??= this.teardown(graph, false)
  }

  private detachGraph(): BrowserRuntimeGraph | undefined {
    const graph = this.graph
    this.graph = undefined
    graph?.router.stop()
    graph?.checkpoint.stop()
    return graph
  }

  private async teardown(
    graph: BrowserRuntimeGraph | undefined,
    orderly: boolean,
  ): Promise<void> {
    if (graph !== undefined) {
      await graph.router.shutdown()
      await graph.checkpoint.shutdown()
      await graph.coordinator.shutdown()
    }
    if (orderly) await this.lease.release()
    await this.lease.shutdown()
  }

  private requireGraph(): BrowserRuntimeGraph {
    const graph = this.graph
    if (graph === undefined || this.shutdownRequested) {
      throw new Error(
        'The browser runtime does not own an active application graph.',
      )
    }
    return graph
  }

  private assertCurrentGraph(graph: BrowserRuntimeGraph): void {
    if (this.graph !== graph || this.shutdownRequested) {
      throw new WriterLeaseLostError(
        'The browser runtime discarded the application graph.',
      )
    }
  }

  private collectStorageWarnings(
    status: BrowserStorageStatus,
  ): void {
    if (
      status.persistenceSupported &&
      status.persistenceRequested &&
      !status.persisted
    ) {
      this.addWarning({
        code: 'persistent-storage-denied',
        reason:
          'Persistent browser storage was not granted. Export and recovery remain available.',
      }, false)
    }
    if (status.quotaPressure) {
      this.addWarning({
        code: 'quota-pressure',
        reason:
          'Browser storage usage is near its reported quota.',
      }, false)
    }
    if (status.error !== undefined) {
      this.addWarning({
        code: 'storage-status-failed',
        reason: status.error,
      }, false)
    }
  }

  private addWarning(
    warning: UiRuntimeWarning,
    publish = true,
  ): void {
    if (
      this.warnings.some(
        (existing) =>
          existing.code === warning.code &&
          existing.reason === warning.reason,
      )
    ) {
      return
    }
    this.warnings = [...this.warnings, Object.freeze(warning)]
    if (publish && this.currentStatus.phase === 'ready') {
      this.publish(this.readyStatus())
    }
  }

  private readyStatus(): Extract<
    UiRuntimeFoundationStatus,
    { readonly phase: 'ready' }
  > {
    return Object.freeze({
      phase: 'ready',
      warnings: Object.freeze([...this.warnings]),
    })
  }

  private publish(
    status: UiRuntimeFoundationStatus,
    terminal = false,
  ): void {
    if (
      this.shutdownRequested &&
      !terminal &&
      status.phase !== 'stopping'
    ) {
      return
    }
    this.currentStatus = Object.freeze(status)
    for (const listener of [...this.listeners]) {
      try {
        listener(this.currentStatus)
      } catch {
        // UI observers cannot alter runtime ownership or persistence.
      }
    }
    if (terminal) this.listeners.clear()
  }

  private clipboardAdapter(): ClipboardAdapter {
    this.clipboard ??= new BrowserClipboardAdapter(
      this.options.clipboard,
    )
    return this.clipboard
  }

  private async requestFencedCheckpoint(
    graph: BrowserRuntimeGraph,
    beforeSafeReload: boolean,
  ): Promise<boolean> {
    const scheduled = await (
      beforeSafeReload
        ? graph.checkpoint.checkpointBeforeReload()
        : graph.checkpoint.requestCheckpoint()
    )
    if (!scheduled) return false
    this.assertCurrentGraph(graph)

    // A clean scheduler fast-path still receives a final authority fence.
    // Re-check dirtiness inside that serialized lane in case another accepted
    // lifecycle operation changed the application while this call was waiting.
    return graph.router.run(async () => {
      if (!isDirtySnapshot(graph.application.snapshot())) {
        return true
      }
      const result = await graph.application.checkpoint()
      if (result.committed) return true
      this.addWarning({
        code: 'checkpoint-failed',
        reason: result.reason,
      })
      return false
    })
  }

  private readSuppliedSave(request: UiRuntimeImportRequest) {
    switch (request.source) {
      case 'file':
        return this.importReader.readFile(request.file)
      case 'drop':
        return this.importReader.readDrop(request.transfer)
      case 'paste':
      case undefined:
        return Promise.resolve(
          this.importReader.readPaste(request.text),
        )
    }
  }
}

function developmentOnlyRepositoryPaths(profileId: string) {
  const prefix = `/development-only/${profileId}`
  return {
    current: `${prefix}/current.idsw`,
    temporary: `${prefix}/current.idsw.tmp`,
    legacyRecovery: `${prefix}/recovery/original-idb1.txt`,
  } as const
}

function isDirtySnapshot(
  snapshot: ApplicationSnapshot<CanonicalRuntimeState>,
): boolean {
  return (
    snapshot.phase === 'ready' &&
    snapshot.checkpoint.kind !== 'clean'
  )
}

function applicationBlockedStatus(
  snapshot: Extract<
    ApplicationSnapshot<CanonicalRuntimeState>,
    { readonly phase: 'blocked' }
  >,
): Extract<
  UiRuntimeFoundationStatus,
  { readonly phase: 'blocked' }
> {
  return Object.freeze({
    phase: 'blocked',
    code: 'application-blocked',
    reason: `${snapshot.outcome}: ${snapshot.error}`,
  })
}

function mapImportResult(
  result: CanonicalCoordinatedImportResult,
  recoveryAvailable: boolean,
): UiRuntimeImportResult {
  if (!result.imported) {
    return Object.freeze({
      ...result,
      recoveryAvailable,
    })
  }
  return Object.freeze({
    imported: true,
    sessionRevision: result.sessionRevision,
    recoveryAvailable: true,
    lifecycleReset: result.lifecycleReset,
    ...(result.code === undefined
      ? {}
      : {
          code: result.code,
          reason: result.reason,
        }),
  })
}

function importFailureCode(error: unknown): string {
  if (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    error.name === 'SaveImportLimitError'
  ) {
    return 'RUNTIME-IMPORT-LIMIT'
  }
  return 'RUNTIME-IMPORT-INVALID'
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
