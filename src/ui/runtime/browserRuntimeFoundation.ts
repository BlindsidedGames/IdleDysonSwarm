import type {
  ApplicationSnapshot,
  CheckpointResult,
  CommitFirstResult,
} from '../../application/contracts'
import type { DeepReadonly } from '../../core/contracts'
import { isFiniteNonNegativeNumber } from '../../core/finiteNonNegativeNumber'
import { formatUnknownError as errorMessage } from '../../core/unknownError'
import type {
  FrontendApplicationSnapshot,
  FrontendGameplayPreviewDemand,
} from '../../application/frontendSnapshot'
import type {
  CanonicalLifecycleApplicationPort,
  CanonicalLifecycleClock,
  CanonicalLifecycleSaveResult,
  CanonicalCoordinatedActiveResult,
  CanonicalCoordinatedImportResult,
  CanonicalAwayReplayResult,
} from '../../application/canonicalLifecycleCoordinator'
import {
  CanonicalLifecycleCoordinator,
} from '../../application/canonicalLifecycleCoordinator'
import type { CanonicalPlayerCommand } from '../../application/canonicalPlayerCommands'
import type { CanonicalDevelopmentAction } from '../../application/canonicalGameApplication'
import type { CanonicalSaveTransferSnapshot } from '../../application/canonicalGameApplication'
import type { StoredTimeJobListener } from '../../application/canonicalGameApplication'
import type { CanonicalRuntimeState } from '../../application/canonicalRuntimeSession'
import type {
  CanonicalSkillPresetSlot,
  CanonicalGameStateV1,
  SkillPresetState,
} from '../../game-state/types'
import { hydrateGameState } from '../../game-state/mapping'
import {
  type BrowserSaveDatabase,
  IndexedDbBrowserSaveDatabase,
  type WriterLeaseFence,
} from '../../platform/browserSaveDatabase'
import {
  BrowserLifecycleAdapter,
  BrowserLifecycleUtcClock,
} from '../../platform/browserLifecycle'
import {
  BrowserDepartureMarker,
  type DepartureMarker,
} from '../../platform/browserDepartureMarker'
import {
  BrowserRecoveryBlobExporter,
  BrowserRecoveryBlobRetainer,
  type BrowserLegacyRecoveryStore,
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
  BrowserExpiringWriterAuthority,
  type IntervalScheduler,
  type OwnershipNoticeChannel,
} from '../../platform/browserWriterLease'
import type {
  WriterAuthorityPort,
  WriterAuthorityState,
  WriterAuthorityTakeoverPort,
} from '../../platform/writerAuthority'
import {
  WriterAuthorityLostError,
} from '../../platform/writerAuthority'
import type {
  ClipboardAdapter,
  ExternalNavigationAdapter,
  LifecycleAdapter,
  LifecyclePhase,
} from '../../platform/contracts'
import { IndexedDbSaveStorageAdapter } from '../../platform/indexedDbSaveStorage'
import {
  PeriodicCheckpointScheduler,
} from '../../platform/periodicCheckpoint'
import { decodeIdb1SaveRoot } from '../../save/decodeIdb1'
import { prepareImportedSaveText } from '../../save/import'
import {
  serializeSharedWebSave,
} from '../../save/serialization'
import type {
  AutomaticUnityPurchaseEvidencePromoter,
} from '../../save/automaticPurchaseEvidence'
import {
  PortableSaveRepository,
  type SaveRepositoryPaths,
  type SaveRepository,
  type SaveStorageAdapter,
} from '../../save/repository'
import type {
  LifecycleClockSample,
} from '../../simulation/lifecycleAwayTime'
import { parseUnityInvariantUtcTimestamp } from '../../simulation/unityUtcTimestamp'
import {
  parseCanonicalSkillPreset,
  previewAddSkillToPreset,
  previewRemoveSkillFromPreset,
  serializeCanonicalSkillPreset,
  type CanonicalSkillPresetImportResult,
  type CanonicalSkillPresetQueuePreview,
} from '../../simulation/canonicalSkillPresetTransactions'
import { QUANTUM_CONSTANTS } from '../../simulation/quantumUpgrades'
import type { RuntimeEntitlementBridge } from '../../store/runtimeEntitlements'
import {
  AuthoritativeLifecycleRouter,
} from './authoritativeLifecycleRouter'
import {
  CoordinatorActiveTimeDriver,
  MAXIMUM_FIXED_CADENCE_BURST_DELIVERIES,
  type ActiveTimeFrameScheduler,
  type ActiveTimeMonotonicClock,
  type ActiveTimeResidue,
  type SuspendedActiveTime,
} from './activeTimeDriver'
import type {
  UiRuntimeFoundation,
  UiRuntimeFoundationStatus,
  UiRuntimeImportRequest,
  UiRuntimeImportPreviewResult,
  UiRuntimeImportResult,
  UiRuntimeStartResult,
  UiRuntimeStorageStatus,
  UiRuntimeSnapshotListener,
  UiRuntimeStatusListener,
  UiRuntimePlayerCommandResult,
  UiRuntimeDevelopmentRealityResult,
  UiRuntimeDevelopmentResult,
  UiRuntimeDevelopmentAction,
  UiRuntimeDevelopmentActionResult,
  UiRuntimeDevelopmentStatus,
  UiRuntimeWarning,
} from './contracts'
import {
  BrowserFrontendSnapshotFrameScheduler,
  FrontendSnapshotStore,
  type FrontendSnapshotFrameScheduler,
} from './frontendSnapshotStore'
import {
  RevisionedPlayerCommandDispatcher,
} from './playerCommandDispatcher'

export const DEVELOPMENT_ONLY_BROWSER_DATABASE_NAME =
  'idle-dyson-swarm-web-development-v1'
export const DEVELOPMENT_ONLY_BROWSER_PROFILE_ID =
  'development-only-default-profile'

interface BrowserRuntimeApplicationPort
  extends CanonicalLifecycleApplicationPort {
  checkpoint(): Promise<CheckpointResult>
  frontendSnapshot(
    previewDemand?: FrontendGameplayPreviewDemand,
  ): DeepReadonly<FrontendApplicationSnapshot>
  storedTimeJobStatus?(): import('../../workers/storedTime/storedTimeProtocol').StoredTimeJobStatus
  subscribeStoredTimeJob?(listener: StoredTimeJobListener): () => void
  cancelStoredTimeJob?(): void
  speedUpStoredTimeJob?(): void
  captureSaveTransferSnapshot?(): CanonicalSaveTransferSnapshot | null
  disposeStoredTimeJobRunner?(): void
}

interface BrowserLifecycleReceipt {
  readonly intentEpoch: number
  readonly clockSample: LifecycleClockSample
  readonly pendingDepartureTimestamp: import('../../simulation/timeResources').ParsedUtcTimestamp
}

class LifecycleReceiptClockError extends Error {
  constructor() {
    super('Lifecycle receipt clock capture failed.')
    this.name = 'LifecycleReceiptClockError'
  }
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
  /**
   * Native hosts inject their rooted filesystem adapter here. When supplied,
   * IndexedDB remains available only as an explicitly injected writer-fence
   * implementation and never stores player save contents.
   */
  readonly saveStorage?: SaveStorageAdapter & BrowserLegacyRecoveryStore
  readonly saveRepositoryPaths?: SaveRepositoryPaths
  readonly allowCanonicalPlayerWrites?: boolean
  readonly indexedDbFactory?: IDBFactory
  /** Deterministic lifecycle orchestration test seam. */
  readonly lifecycle?: LifecycleAdapter
  readonly lifecycleClock?: CanonicalLifecycleClock
  /** Deterministic synchronous page-teardown recovery seam. */
  readonly departureMarker?: DepartureMarker
  readonly activeTimeClock?: ActiveTimeMonotonicClock
  readonly activeTimeScheduler?: ActiveTimeFrameScheduler
  readonly activeTimeDeliveryIntervalMilliseconds?: number
  /** Test seam; production uses exact configured gameplay updates. */
  readonly fixedActiveTimeDeliveryCadence?: boolean
  /** Deterministic presentation-publication test seam. */
  readonly frontendSnapshotScheduler?: FrontendSnapshotFrameScheduler
  readonly storageManager?: BrowserStorageManagerPort
  readonly clipboard?: ClipboardPort
  readonly navigationOpener?: ExternalWindowOpener
  readonly downloads?: TextDownloadPort
  readonly nowUtcMilliseconds?: () => number
  readonly ownerToken?: string
  readonly ownerTokenFactory?: () => string
  readonly allowUnexpiredSameOwnerTakeover?: boolean
  readonly leaseDurationMilliseconds?: number
  readonly heartbeatMilliseconds?: number
  readonly leaseScheduler?: IntervalScheduler
  readonly checkpointScheduler?: IntervalScheduler
  readonly noticeChannel?: OwnershipNoticeChannel
  readonly autoHeartbeat?: boolean
  /** Native hosts inject a non-expiring single-renderer authority here. */
  readonly writerAuthority?: WriterAuthorityPort
  readonly legacyIdFactory?: () => string
  /** Native Store authority projected before the canonical graph is opened. */
  readonly hostEntitlements?: RuntimeEntitlementBridge
  /** Same-device automatic migration capability; never used by manual import. */
  readonly automaticPurchaseEvidencePromoter?:
    AutomaticUnityPurchaseEvidencePromoter
  /** One-time receiving-device adoption during successful automatic Unity migration. */
  readonly automaticNumberFormattingAdopter?:
    import('../../save/repository').AutomaticUnityNumberFormattingAdopter
  /** One-time receiving-device adoption during successful automatic Unity migration. */
  readonly automaticResearchVisibilityAdopter?:
    import('../../save/repository').AutomaticUnityResearchVisibilityAdopter
  /** Native release hosts expose the locally unlockable debug surface in production. */
  readonly developmentControlsAvailable?: boolean
  /** Native release controls remain gated until Store or gameplay unlock succeeds. */
  readonly developmentControlsRequireEntitlement?: boolean
}

interface BrowserRuntimeGraph {
  readonly application: BrowserRuntimeApplicationPort
  readonly repository: SaveRepository
  readonly coordinator: CanonicalLifecycleCoordinator
  readonly initialLifecycle: {
    readonly phase: LifecyclePhase
    readonly intentEpoch: number
    readonly clockSample: LifecycleClockSample
    readonly pendingDepartureTimestamp: import('../../simulation/timeResources').ParsedUtcTimestamp
  }
  readonly router: AuthoritativeLifecycleRouter
  readonly activeTime: CoordinatorActiveTimeDriver<CanonicalCoordinatedActiveResult>
  readonly playerCommands: RevisionedPlayerCommandDispatcher
  readonly checkpoint: PeriodicCheckpointScheduler
  readonly retainer: BrowserRecoveryBlobRetainer
}

export interface BrowserSkillPresetQueryPort {
  previewSkillPresetQueueChange(request: {
    readonly slot: CanonicalSkillPresetSlot
    readonly skillId: string
    readonly included: boolean
  }): CanonicalSkillPresetQueuePreview
  exportSkillPreset(slot: CanonicalSkillPresetSlot): string
  previewSkillPresetImport(
    serialized: string,
  ): CanonicalSkillPresetImportResult
}

export interface BrowserFrontendDemandPort {
  setGameplayPreviewDemand(
    demand: FrontendGameplayPreviewDemand,
  ): void
}

export type BrowserUiRuntimeFoundation = UiRuntimeFoundation<
  DeepReadonly<FrontendApplicationSnapshot>,
  CanonicalPlayerCommand
> &
  BrowserSkillPresetQueryPort &
  BrowserFrontendDemandPort

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
): BrowserUiRuntimeFoundation {
  const implementation = new BrowserRuntimeFoundation(options)
  const developmentControlsAvailable =
    options.developmentControlsAvailable ?? import.meta.env.DEV
  const facade: BrowserUiRuntimeFoundation = {
    status: () => implementation.status(),
    subscribeStatus: (listener: UiRuntimeStatusListener) =>
      implementation.subscribeStatus(listener),
    snapshot: () => implementation.snapshot(),
    subscribeSnapshot: (
      listener: UiRuntimeSnapshotListener<
        DeepReadonly<FrontendApplicationSnapshot>
      >,
    ) => implementation.subscribeSnapshot(listener),
    setGameplayPreviewDemand: (demand) =>
      implementation.setGameplayPreviewDemand(demand),
    start: () => implementation.start(),
    takeOverWriterOwnership: () =>
      implementation.takeOverWriterOwnership(),
    dispatchPlayer: (command: CanonicalPlayerCommand) =>
      implementation.dispatchPlayer(command),
    storedTime: Object.freeze({
      status: () => implementation.storedTimeJobStatus(),
      subscribe: (listener: () => void) =>
        implementation.subscribeStoredTimeJob(listener),
      cancel: () => implementation.cancelStoredTimeJob(),
      speedUp: () => implementation.speedUpStoredTimeJob(),
    }),
    previewSkillPresetQueueChange: (request) =>
      implementation.previewSkillPresetQueueChange(request),
    exportSkillPreset: (slot) =>
      implementation.exportSkillPreset(slot),
    previewSkillPresetImport: (serialized) =>
      implementation.previewSkillPresetImport(serialized),
    ...(developmentControlsAvailable
      ? {
          development: Object.freeze({
            status: () => implementation.developmentStatus(),
            setDysonBots: (bots: number) =>
              implementation.setDevelopmentDysonBots(bots),
            unlockReality: () =>
              implementation.unlockDevelopmentReality(),
            apply: (action: UiRuntimeDevelopmentAction) =>
              implementation.applyDevelopmentAction(action),
            simulateOfflineTime: (seconds: number) =>
              implementation.simulateDevelopmentOfflineTime(seconds),
          }),
        }
      : {}),
    synchronizeHostEntitlements: () =>
      implementation.synchronizeHostEntitlements(),
    importSave: (request: UiRuntimeImportRequest) =>
      implementation.importSave(request),
    previewImport: (request: UiRuntimeImportRequest) =>
      implementation.previewImport(request),
    inspectStorage: (requestPersistence = false) =>
      implementation.inspectStorage(requestPersistence),
    requestCheckpoint: () =>
      implementation.requestCheckpoint(),
    checkpointBeforeSafeReload: () =>
      implementation.checkpointBeforeSafeReload(),
    recoveryExportAvailable: () =>
      implementation.recoveryExportAvailable(),
    readCurrentSaveText: () =>
      implementation.readCurrentSaveText(),
    readCurrentSaveExport: () =>
      implementation.readCurrentSaveExport(),
    downloadSaveText: (text: string) =>
      implementation.downloadSaveText(text),
    exportCurrentSave: () =>
      implementation.exportCurrentSave(),
    exportLastRecovery: () =>
      implementation.exportLastRecovery(),
    copyLastRecovery: () =>
      implementation.copyLastRecovery(),
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

class BrowserRuntimeFoundation implements BrowserUiRuntimeFoundation {
  private readonly options: Readonly<BrowserRuntimeFoundationOptions>
  private readonly developmentControlsAvailable: boolean
  private readonly developmentControlsRequireEntitlement: boolean
  private readonly database: BrowserSaveDatabase | undefined
  private readonly saveStorage:
    | (SaveStorageAdapter & BrowserLegacyRecoveryStore)
    | undefined
  private readonly saveRepositoryPaths: SaveRepositoryPaths
  private readonly lease: WriterAuthorityPort
  private readonly lifecycle: LifecycleAdapter
  private readonly clock: CanonicalLifecycleClock
  private readonly departureMarker: DepartureMarker
  private clipboard: ClipboardAdapter | undefined
  private readonly navigation: ExternalNavigationAdapter
  private readonly storageStatus: BrowserStorageStatusAdapter
  private readonly importReader: BrowserSaveImportReader
  private readonly exporter: BrowserRecoveryBlobExporter
  private readonly downloads: TextDownloadPort
  private readonly frontendSnapshots: FrontendSnapshotStore
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
  private foregroundIntended = false
  private lifecycleIntentEpoch = 0
  // Foreground sampling may resume only when the latest visible intent has
  // completed any required canonical replay inside the authority fence.
  private lifecycleReconciledIntentEpoch = 0
  private departureRecordedForCurrentEpisode = false
  // Every admitted import participates, including queued calls and failures.
  // Only the final completion may reopen foreground sampling.
  private pendingImportCount = 0
  private gameplayPreviewDemand: FrontendGameplayPreviewDemand = 'all'
  private unsubscribeOwnership: (() => void) | undefined

  constructor(options: Readonly<BrowserRuntimeFoundationOptions>) {
    this.options = options
    this.frontendSnapshots = new FrontendSnapshotStore(
      options.frontendSnapshotScheduler ??
        new BrowserFrontendSnapshotFrameScheduler(),
    )
    this.developmentControlsAvailable =
      options.developmentControlsAvailable ?? import.meta.env.DEV
    this.developmentControlsRequireEntitlement =
      options.developmentControlsRequireEntitlement === true
    const databaseName =
      options.databaseName ?? DEVELOPMENT_ONLY_BROWSER_DATABASE_NAME
    this.database = options.database ??
      (options.saveStorage === undefined
        ? new IndexedDbBrowserSaveDatabase(
            databaseName,
            options.indexedDbFactory,
          )
        : undefined)
    this.saveStorage = options.saveStorage
    this.saveRepositoryPaths =
      options.saveRepositoryPaths ??
      developmentOnlyRepositoryPaths(
        options.profileId ??
          DEVELOPMENT_ONLY_BROWSER_PROFILE_ID,
      )
    this.departureMarker =
      options.departureMarker ??
      new BrowserDepartureMarker(
        `${databaseName}/${this.saveRepositoryPaths.current}`,
      )
    this.lease = options.writerAuthority ??
      new BrowserExpiringWriterAuthority({
        database: requireBrowserDatabase(this.database),
        nowUtcMilliseconds: options.nowUtcMilliseconds,
        ownerToken: options.ownerToken,
        ownerTokenFactory: options.ownerTokenFactory,
        allowUnexpiredSameOwnerTakeover:
          options.allowUnexpiredSameOwnerTakeover,
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
    this.downloads =
      options.downloads ?? new BrowserTextDownloadAdapter()
    this.exporter = new BrowserRecoveryBlobExporter(
      {
        readText: (path) =>
          this.saveStorage?.readText(path) ??
          requireBrowserDatabase(this.database).readFile(path),
      },
      this.downloads,
    )
    this.unsubscribeOwnership = this.lease.subscribe((state) => {
      this.handleOwnershipState(state)
    })
  }

  status(): UiRuntimeFoundationStatus {
    return this.currentStatus
  }

  snapshot(): DeepReadonly<FrontendApplicationSnapshot> {
    return this.frontendSnapshots.snapshot()
  }

  subscribeStatus(listener: UiRuntimeStatusListener): () => void {
    if (this.shutdownRequested) return () => undefined
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  subscribeSnapshot(
    listener: UiRuntimeSnapshotListener<
      DeepReadonly<FrontendApplicationSnapshot>
    >,
  ): () => void {
    if (this.shutdownRequested) return () => undefined
    return this.frontendSnapshots.subscribe(listener)
  }

  setGameplayPreviewDemand(
    demand: FrontendGameplayPreviewDemand,
  ): void {
    if (this.gameplayPreviewDemand === demand) return
    this.gameplayPreviewDemand = demand
    const graph = this.graph
    if (graph === undefined || !this.isCurrentGraph(graph)) return
    this.publishFrontendSnapshot(graph, true)
  }

  start(): Promise<UiRuntimeStartResult> {
    if (this.shutdownRequested) {
      return Promise.resolve(this.currentStatus)
    }
    if (this.startPromise !== undefined) {
      return this.startPromise
    }
    const starting = this.startOnce()
    this.startPromise = starting
    void starting.then((status) => {
      if (
        this.startPromise === starting &&
        status.phase === 'blocked' &&
        status.code === 'writer-owned'
      ) {
        this.startPromise = undefined
      }
    })
    return starting
  }

  async takeOverWriterOwnership():
    Promise<UiRuntimeStartResult> {
    if (
      this.shutdownRequested ||
      this.currentStatus.phase !== 'blocked' ||
      this.currentStatus.code !== 'writer-owned'
    ) {
      return this.currentStatus
    }
    const acquisition = await requireBrowserTakeover(this.lease).takeOver()
    if (!acquisition.acquired) return this.currentStatus
    this.startPromise = undefined
    return this.start()
  }

  async dispatchPlayer(
    command: CanonicalPlayerCommand,
  ): Promise<UiRuntimePlayerCommandResult> {
    const graph = this.graph
    if (graph === undefined || this.shutdownRequested) {
      return runtimePlayerFailure(
          'RUNTIME-PLAYER-NOT-READY',
          'The browser runtime does not own a writable ready application.',
      )
    }
    const suspended = graph.activeTime.suspendForLifecycle()
    const prepareForDispatch = async () => {
      const residue = await resolveSuspendedActiveTime(suspended)
      try {
        await this.creditSuspendedHibernation(
          graph.coordinator,
          residue.hibernationMilliseconds,
        )
      } catch (error) {
        graph.activeTime.restoreSuspendedTime(residue)
        return runtimePlayerFailure(
          'RUNTIME-HIBERNATION-FLUSH-FAILED',
          errorMessage(error),
        )
      }
      if (residue.activeMilliseconds > 0) {
        // Player input is admitted against the last completed gameplay tick.
        // Retain sub-tick monotonic residue for the next configured update so
        // a click cannot manufacture an irregular partial gameplay step.
        graph.activeTime.restoreSuspendedTime({
          activeMilliseconds: residue.activeMilliseconds,
          hibernationMilliseconds: 0,
        })
      }
      this.publishFrontendSnapshot(graph)
      return undefined
    }
    try {
      let dispatched: Promise<UiRuntimePlayerCommandResult>
      if (
        command.kind === 'tinker.start' ||
        command.kind === 'tinker.set-repeat'
      ) {
        dispatched = graph.playerCommands.dispatchLatest(
          command,
          prepareForDispatch,
        )
      } else if (
        command.kind === 'dyson.set-bot-distribution' ||
        command.kind === 'dyson.set-buy-mode' ||
        command.kind === 'dyson.set-rounded-bulk-buy' ||
        command.kind === 'dyson.set-facility-automation'
      ) {
        dispatched = graph.playerCommands.dispatchLatest(
          command,
          prepareForDispatch,
        )
      } else if (
        command.kind === 'research.set-buy-mode' ||
        command.kind === 'research.set-rounded-bulk-buy' ||
        command.kind === 'research.set-automation'
      ) {
        dispatched = graph.playerCommands.dispatchLatest(
          command,
          prepareForDispatch,
        )
      } else {
        dispatched = graph.playerCommands.dispatch(command, prepareForDispatch)
      }
      return command.kind === 'settings.set-processing-interval'
        ? await dispatched
        : dispatched
    } finally {
      try {
        if (!this.shutdownRequested) {
          if (command.kind === 'settings.set-processing-interval') {
            this.reconcileActiveTimeDeliveryInterval(graph)
          }
          this.startActiveTimeIfForegroundIntended(graph)
        }
      } catch {
        // Lifecycle reconciliation owns restart when the host phase is not readable.
      }
    }
  }

  private reconcileActiveTimeDeliveryInterval(
    graph: BrowserRuntimeGraph,
  ): void {
    if (this.options.activeTimeDeliveryIntervalMilliseconds !== undefined) {
      return
    }
    const snapshot = graph.application.snapshot()
    if (snapshot.phase !== 'ready') return
    graph.activeTime.setDeliveryIntervalMilliseconds(
      snapshot.state.gameState.timeline.processing
        .activeIntervalMilliseconds,
    )
  }

  storedTimeJobStatus() {
    return this.graph?.application.storedTimeJobStatus?.() ??
      Object.freeze({ kind: 'idle' as const })
  }

  subscribeStoredTimeJob(listener: () => void): () => void {
    const application = this.graph?.application
    return application === undefined
      ? () => undefined
      : application.subscribeStoredTimeJob?.(() => listener()) ??
        (() => undefined)
  }

  cancelStoredTimeJob(): void {
    this.graph?.application.cancelStoredTimeJob?.()
  }

  speedUpStoredTimeJob(): void {
    this.graph?.application.speedUpStoredTimeJob?.()
  }

  previewSkillPresetQueueChange(request: {
    readonly slot: CanonicalSkillPresetSlot
    readonly skillId: string
    readonly included: boolean
  }): CanonicalSkillPresetQueuePreview {
    const state = this.readyCanonicalState()
    return request.included
      ? previewAddSkillToPreset(state, request.slot, request.skillId)
      : previewRemoveSkillFromPreset(state, request.slot, request.skillId)
  }

  exportSkillPreset(slot: CanonicalSkillPresetSlot): string {
    const preset: DeepReadonly<SkillPresetState> =
      this.readyCanonicalState().skills.presets[slot - 1]
    return serializeCanonicalSkillPreset(preset)
  }

  previewSkillPresetImport(
    serialized: string,
  ): CanonicalSkillPresetImportResult {
    return parseCanonicalSkillPreset(serialized, this.readyCanonicalState())
  }

  private readyCanonicalState(): DeepReadonly<CanonicalGameStateV1> {
    const snapshot = this.graph?.application.snapshot()
    if (snapshot === undefined || snapshot.phase !== 'ready') {
      throw new Error(
        'The browser runtime does not have a canonical ready state.',
      )
    }
    return snapshot.state.gameState
  }

  developmentStatus(): UiRuntimeDevelopmentStatus {
    const snapshot = this.graph?.application.snapshot()
    if (snapshot === undefined || snapshot.phase !== 'ready') {
      return {
        enabled: false,
        entitled: false,
        purchasedInGame: false,
        quantumShards: 0n,
        strangeMatter: 0,
      }
    }
    const entitled =
      !this.developmentControlsRequireEntitlement ||
      snapshot.state.debugEntitlementPurchased === true ||
      this.options.hostEntitlements?.currentOwnership().developerOptions ===
        true
    return {
      enabled:
        snapshot.state.debugOptionsEnabled === true && entitled,
      entitled,
      purchasedInGame:
        snapshot.state.debugEntitlementPurchased === true,
      quantumShards:
        snapshot.state.gameState.quantum.pointsEarned >
        snapshot.state.gameState.quantum.pointsSpent
          ? snapshot.state.gameState.quantum.pointsEarned -
            snapshot.state.gameState.quantum.pointsSpent
          : 0n,
      strangeMatter: snapshot.state.gameState.dream.strangeMatter,
    }
  }

  async synchronizeHostEntitlements(): Promise<boolean> {
    const bridge = this.options.hostEntitlements
    const graph = this.graph
    if (
      bridge === undefined ||
      graph === undefined ||
      this.shutdownRequested
    ) {
      return false
    }
    try {
      await bridge.synchronize()
      const result = await graph.router.run(() =>
        graph.coordinator.replaceHostEntitlements(
          bridge.currentDysonEntitlements(),
        ),
      )
      this.assertCurrentGraph(graph)
      this.publishFrontendSnapshot(graph)
      return result.committed
    } catch {
      return false
    }
  }

  async applyDevelopmentAction(
    action: UiRuntimeDevelopmentAction,
  ): Promise<UiRuntimeDevelopmentActionResult> {
    if (!this.developmentControlsAvailable) return developmentUnavailable()
    const graph = this.graph
    if (graph === undefined || this.shutdownRequested) {
      return developmentNotReady()
    }
    const status = this.developmentStatus()
    if (
      this.developmentControlsRequireEntitlement &&
      action.kind !== 'purchase-debug-options' &&
      !status.enabled
    ) {
      return developmentNotEnabled()
    }
    const canonicalAction: CanonicalDevelopmentAction =
      action.kind === 'purchase-debug-options' &&
      (!this.developmentControlsRequireEntitlement ||
        this.options.hostEntitlements?.currentOwnership().developerOptions ===
          true)
        ? { kind: 'enable-host-debug-options' }
        : action as CanonicalDevelopmentAction
    try {
      const result = await graph.router.run(() =>
        graph.coordinator.applyDevelopmentAction(
          canonicalAction,
        ),
      )
      this.assertCurrentGraph(graph)
      this.publishFrontendSnapshot(graph)
      return developmentCommitResult(result)
    } catch (error) {
      return {
        applied: false,
        code: 'RUNTIME-DEVELOPMENT-FAILED',
        reason: errorMessage(error),
      }
    }
  }

  async simulateDevelopmentOfflineTime(
    seconds: number,
  ): Promise<UiRuntimeDevelopmentActionResult> {
    if (!this.developmentControlsAvailable) return developmentUnavailable()
    if (
      this.developmentControlsRequireEntitlement &&
      !this.developmentStatus().enabled
    ) return developmentNotEnabled()
    if (!isFiniteNonNegativeNumber(seconds)) {
      return {
        applied: false,
        code: 'RUNTIME-DEVELOPMENT-TIME-INVALID',
        reason: 'Offline-time seconds must be finite and non-negative.',
      }
    }
    const graph = this.graph
    if (graph === undefined || this.shutdownRequested) {
      return developmentNotReady()
    }
    try {
      const result = await graph.router.run(() =>
        graph.coordinator.applyDevelopmentAction({
          kind: 'add-offline-time',
          seconds,
        }),
      )
      this.assertCurrentGraph(graph)
      this.publishFrontendSnapshot(graph)
      return developmentCommitResult(result)
    } catch (error) {
      return {
        applied: false,
        code: 'RUNTIME-DEVELOPMENT-FAILED',
        reason: errorMessage(error),
      }
    }
  }

  async setDevelopmentDysonBots(
    bots: number,
  ): Promise<UiRuntimeDevelopmentResult> {
    if (!this.developmentControlsAvailable) {
      return {
        applied: false,
        code: 'RUNTIME-DEVELOPMENT-CONTROL-UNAVAILABLE',
        reason:
          'Development progression controls are unavailable in this build.',
      }
    }
    if (
      this.developmentControlsRequireEntitlement &&
      !this.developmentStatus().enabled
    ) {
      return {
        applied: false,
        code: 'RUNTIME-DEVELOPMENT-NOT-ENABLED',
        reason: 'Developer Options are not enabled.',
      }
    }
    const graph = this.graph
    if (graph === undefined || this.shutdownRequested) {
      return {
        applied: false,
        code: 'RUNTIME-DEVELOPMENT-NOT-READY',
        reason:
          'The browser runtime does not own a writable ready application.',
      }
    }
    try {
      const result = await graph.router.run(() =>
        graph.coordinator.setDevelopmentDysonBots(bots),
      )
      this.assertCurrentGraph(graph)
      this.publishFrontendSnapshot(graph)
      if (!result.committed) {
        const transitionCode =
          result.transition.accepted
            ? undefined
            : result.transition.code
        const transitionReason =
          result.transition.accepted
            ? undefined
            : result.transition.reason
        return {
          applied: false,
          code:
            result.code ??
            transitionCode ??
            'RUNTIME-DEVELOPMENT-COMMIT-FAILED',
          reason:
            result.reason ??
            transitionReason ??
            'The development bot count was not committed.',
        }
      }
      return {
        applied: true,
        bots,
        stateRevision: result.transition.revision,
        durableRevision: result.durableRevision,
      }
    } catch (error) {
      return {
        applied: false,
        code: 'RUNTIME-DEVELOPMENT-FAILED',
        reason: errorMessage(error),
      }
    }
  }

  async unlockDevelopmentReality(): Promise<
    UiRuntimeDevelopmentRealityResult
  > {
    if (!this.developmentControlsAvailable) {
      return {
        applied: false,
        code: 'RUNTIME-DEVELOPMENT-CONTROL-UNAVAILABLE',
        reason:
          'Development progression controls are unavailable in this build.',
      }
    }
    if (
      this.developmentControlsRequireEntitlement &&
      !this.developmentStatus().enabled
    ) {
      return {
        applied: false,
        code: 'RUNTIME-DEVELOPMENT-NOT-ENABLED',
        reason: 'Developer Options are not enabled.',
      }
    }
    const graph = this.graph
    if (graph === undefined || this.shutdownRequested) {
      return {
        applied: false,
        code: 'RUNTIME-DEVELOPMENT-NOT-READY',
        reason:
          'The browser runtime does not own a writable ready application.',
      }
    }
    try {
      const result = await graph.router.run(() =>
        graph.coordinator.unlockDevelopmentReality(),
      )
      this.assertCurrentGraph(graph)
      this.publishFrontendSnapshot(graph)
      if (!result.committed) {
        const transitionCode =
          result.transition.accepted
            ? undefined
            : result.transition.code
        const transitionReason =
          result.transition.accepted
            ? undefined
            : result.transition.reason
        return {
          applied: false,
          code:
            result.code ??
            transitionCode ??
            'RUNTIME-DEVELOPMENT-COMMIT-FAILED',
          reason:
            result.reason ??
            transitionReason ??
            'The Reality development state was not committed.',
        }
      }
      return {
        applied: true,
        secretsOfTheUniverse: QUANTUM_CONSTANTS.maximumSecrets,
        stateRevision: result.transition.revision,
        durableRevision: result.durableRevision,
      }
    } catch (error) {
      return {
        applied: false,
        code: 'RUNTIME-DEVELOPMENT-FAILED',
        reason: errorMessage(error),
      }
    }
  }

  async previewImport(
    request: UiRuntimeImportRequest,
  ): Promise<UiRuntimeImportPreviewResult> {
    try {
      const supplied = await this.readSuppliedSave(request)
      const prepared = prepareImportedSaveText(
        supplied.text,
        request.importedAtUtc,
      )
      const state = hydrateGameState(prepared).state
      return {
        accepted: true,
        preview: {
          infinityPoints: state.infinity.points,
          quantumPoints: state.quantum.pointsEarned,
          skillPoints: state.skills.points,
        },
      }
    } catch (error) {
      return {
        accepted: false,
        code: importFailureCode(error),
        reason: errorMessage(error),
      }
    }
  }

  async importSave(
    request: UiRuntimeImportRequest,
  ): Promise<UiRuntimeImportResult> {
    const graph = this.requireGraph()
    // Import is invoked only after the UI's existing preview and overwrite
    // confirmation. Cancellation is deliberately out-of-band because the
    // active worker owns the router lane that the replacement must await.
    if (request.overwriteApproved) {
      graph.application.cancelStoredTimeJob?.()
    }
    const admittedLifecycleIntentEpoch =
      this.lifecycleIntentEpoch
    this.pendingImportCount += 1
    const suspendedActiveTime =
      this.suspendActiveTime(graph)
    let retainedPath: string | undefined
    let activeResult: CanonicalCoordinatedActiveResult | undefined
    let importOwnsActiveResidue = false
    try {
      const routed = await graph.router.run(async () => {
        const importActiveTime = await this.collectImportActiveTime(
          graph,
          suspendedActiveTime,
        )
        activeResult = await this.flushSuspendedActiveTime(
          graph,
          importActiveTime,
          false,
        )
        importOwnsActiveResidue =
          (activeResult?.remainingMilliseconds ?? 0) > 0
        const supplied = await this.readSuppliedSave(request)
        const context =
          request.context ?? {
            kind: 'manual-shared-import' as const,
            importedAtUtc: request.importedAtUtc,
          }

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
          context,
        })
        if (imported.imported) {
          // The confirmed replacement intentionally discards any unconsumed
          // elapsed time that belonged to the overwritten session.
          importOwnsActiveResidue = false
        } else {
          this.restoreActiveResultResidue(graph, activeResult)
          importOwnsActiveResidue = false
        }
        return {
          imported,
          recoveryPath: recovery.sourcePath,
          importedSaveSha256:
            import.meta.env.MODE === 'performance'
              ? await sha256Hex(supplied.text)
              : undefined,
        }
      })
      this.assertCurrentGraph(graph)
      if (activeResult !== undefined) {
        this.recordActiveResult(activeResult)
        this.publishFrontendSnapshot(graph)
      }
      this.lastRecoveryPath = routed.recoveryPath
      if (routed.imported.imported) {
        if (routed.importedSaveSha256 !== undefined) {
          ;(globalThis as typeof globalThis & {
            __idleDysonLastImportedSaveSha256?: string
          }).__idleDysonLastImportedSaveSha256 =
            routed.importedSaveSha256
        }
        if (routed.imported.lifecycleReset) {
          this.reconcileActiveLifecycleIntent(
            admittedLifecycleIntentEpoch,
          )
        }
        graph.checkpoint.start()
      }
      this.publishApplicationOutcomeAfterImport(graph)
      const result = mapImportResult(routed.imported, true)
      recordPerformanceImportResult(result)
      return result
    } catch (error) {
      if (importOwnsActiveResidue) {
        this.restoreActiveResultResidue(graph, activeResult)
        importOwnsActiveResidue = false
      }
      await this.lease.assertWritable()
      this.assertCurrentGraph(graph)
      if (activeResult !== undefined) {
        this.recordActiveResult(activeResult)
        this.publishFrontendSnapshot(graph)
      }
      if (retainedPath !== undefined) {
        this.lastRecoveryPath = retainedPath
      }
      this.publishApplicationOutcomeAfterImport(graph)
      const result = {
        imported: false,
        committed: false,
        code: importFailureCode(error),
        reason: errorMessage(error),
        recoveryAvailable: retainedPath !== undefined,
      } as const
      recordPerformanceImportResult(result)
      return result
    } finally {
      this.pendingImportCount -= 1
      if (this.pendingImportCount === 0) {
        this.startActiveTimeIfForegroundIntended(graph)
      }
    }
  }

  async exportLastRecovery(): Promise<boolean> {
    const recoveryPath = this.lastRecoveryPath
    if (recoveryPath === undefined) return false
    await this.exporter.export(recoveryPath)
    return true
  }

  async exportCurrentSave(): Promise<boolean> {
    const exported = await this.readCurrentSaveExport()
    if (exported === null) return false
    return this.downloadSaveText(exported.text)
  }

  async downloadSaveText(text: string): Promise<boolean> {
    this.downloads.downloadText(
      'idle-dyson-swarm-save.idsw',
      text,
      'text/plain;charset=utf-8',
    )
    return true
  }

  async readCurrentSaveText(): Promise<string | null> {
    return (await this.readCurrentSaveExport())?.text ?? null
  }

  async readCurrentSaveExport() {
    const graph = this.requireGraph()
    const captured = graph.application.captureSaveTransferSnapshot?.()
    if (
      captured !== undefined &&
      captured !== null &&
      (
        captured.basis === 'pre-stored-time' ||
        !isDirtySnapshot(graph.application.snapshot())
      )
    ) {
      return {
        text: serializeSharedWebSave(
          captured.prepared.copyValidatedState(),
        ),
        basis: captured.basis,
      } as const
    }
    if (!(await this.requestFencedCheckpoint(graph, false))) {
      return null
    }
    const save = await graph.repository.loadCurrent()
    return save === null
      ? null
      : {
          text: serializeSharedWebSave(save.copyValidatedState()),
          basis: 'current' as const,
        }
  }

  recoveryExportAvailable(): boolean {
    return this.lastRecoveryPath !== undefined
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
    this.foregroundIntended = false
    const graph = this.graph
    let activeTimeSettlement: Promise<void> | undefined
    if (graph !== undefined) {
      const suspendedActiveTime =
        this.suspendActiveTime(graph)
      activeTimeSettlement = hasSuspendedActiveTime(suspendedActiveTime)
        ? graph.router.run(() =>
            this.flushSuspendedActiveTime(
              graph,
              suspendedActiveTime,
            ),
          ).then((result) => {
            if (result !== undefined) this.recordActiveResult(result)
          }).catch((error: unknown) => {
            this.addWarning({
              code: 'active-time-failed',
              reason: errorMessage(error),
            }, false)
          }).then(() => this.preserveShutdownActiveTime(graph))
        : Promise.resolve()
    }
    graph?.router.stop()
    graph?.checkpoint.stop()
    this.frontendSnapshots.clear()
    this.publish({ phase: 'stopping' })
    const existingLossTeardown = this.teardownPromise
    this.teardownPromise = (
      existingLossTeardown ??
      this.teardown(graph, true, activeTimeSettlement)
    ).then(() => {
      if (this.graph === graph) this.graph = undefined
      this.unsubscribeOwnership?.()
      this.unsubscribeOwnership = undefined
      this.publish({ phase: 'stopped' }, true)
      this.frontendSnapshots.dispose()
    })
    return this.teardownPromise
  }

  private async startOnce(): Promise<UiRuntimeStartResult> {
    this.frontendSnapshots.publishStarting()
    this.publish({ phase: 'starting' })
    try {
      const acquisition = await this.lease.acquire()
      if (this.shutdownRequested) {
        await this.teardownPromise
        return this.currentStatus
      }
      if (!acquisition.acquired) {
        const browserBlocked = requireBrowserBlockedAcquisition(acquisition)
        const blocked = Object.freeze({
          phase: 'blocked',
          code: 'writer-owned',
          reason:
            'Another browser context owns the writable game session.',
          generation: browserBlocked.generation,
          expiresAtUtcMilliseconds:
            browserBlocked.expiresAtUtcMilliseconds,
        } satisfies UiRuntimeFoundationStatus)
        this.frontendSnapshots.clear()
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
      if (this.options.hostEntitlements !== undefined) {
        await this.options.hostEntitlements.initialize()
        await this.lease.assertWritable()
        if (this.shutdownRequested) {
          await this.teardownPromise
          return this.currentStatus
        }
      }
      const graph = this.createGraph()
      this.graph = graph
      const startupReplay = await graph.router.start({
        initialPhase: graph.initialLifecycle.phase,
        startApplication: async () => {
          const replay = await graph.coordinator.start(
            graph.initialLifecycle.clockSample,
            graph.initialLifecycle.pendingDepartureTimestamp,
          )
          if (
            graph.initialLifecycle.phase !== 'active' &&
            graph.application.snapshot().phase === 'ready'
          ) {
            await graph.coordinator.handlePlatformPhase(
              graph.initialLifecycle.phase,
              graph.initialLifecycle.clockSample,
            )
            if (
              this.isLatestLifecycleIntent(
                graph.initialLifecycle.intentEpoch,
                false,
              )
            ) {
              graph.activeTime.pauseForeground()
            }
          }
          return replay
        },
      })
      this.assertCurrentGraph(graph)

      const applicationSnapshot = graph.application.snapshot()
      if (applicationSnapshot.phase === 'blocked') {
        const recoveryPath = this.saveRepositoryPaths.legacyRecovery
        const recoveryExists = this.saveStorage === undefined
          ? await requireBrowserDatabase(this.database).fileExists(recoveryPath)
          : await this.saveStorage.exists(recoveryPath)
        if (recoveryExists) {
          this.lastRecoveryPath = recoveryPath
        }
        const blocked = applicationBlockedStatus(
          applicationSnapshot,
        )
        this.publishFrontendSnapshot(graph)
        this.publish(blocked)
        return blocked
      }
      if (applicationSnapshot.phase !== 'ready') {
        throw new Error(
          `Application startup ended in ${applicationSnapshot.phase}.`,
        )
      }
      if (applicationSnapshot.source === 'recovered-canonical') {
        this.addWarning({
          code: 'backup-recovered',
          reason:
            'The current save could not be opened, so the newest verified backup was restored.',
        }, false)
      }
      graph.checkpoint.start()
      this.publishFrontendSnapshot(graph)
      const unsafeStartupReplay =
        unsafeForegroundReplayReason(startupReplay)
      if (unsafeStartupReplay === undefined) {
        if (graph.initialLifecycle.phase === 'active') {
          this.reconcileActiveLifecycleIntent(
            graph.initialLifecycle.intentEpoch,
          )
        }
        this.startActiveTimeIfForegroundIntended(graph)
      } else {
        graph.activeTime.pauseForeground()
        this.addWarning({
          code: 'persistence-failed',
          reason:
            'Startup away-time replay did not establish a safe foreground baseline: ' +
            unsafeStartupReplay,
        }, false)
      }
      const ready = this.readyStatus()
      this.publish(ready)
      return ready
    } catch (error) {
      if (this.shutdownRequested) {
        await this.teardownPromise
        return this.currentStatus
      }
      if (error instanceof WriterAuthorityLostError) {
        return this.currentStatus
      }
      const blocked = Object.freeze({
        phase: 'blocked',
        code: 'startup-failed',
        reason: errorMessage(error),
      } satisfies UiRuntimeFoundationStatus)
      this.frontendSnapshots.clear()
      this.publish(blocked)
      const graph = this.detachGraph()
      this.teardownPromise ??= this.teardown(graph, true)
      return blocked
    }
  }

  private createGraph(): BrowserRuntimeGraph {
    const storage =
      this.saveStorage ??
      new IndexedDbSaveStorageAdapter({
        database: requireBrowserDatabase(this.database),
        lease: requireBrowserPersistenceFence(this.lease),
        nowUtcMilliseconds: this.options.nowUtcMilliseconds,
        legacyIdFactory: this.options.legacyIdFactory,
      })
    const repository = new PortableSaveRepository(
      storage,
      this.saveRepositoryPaths,
      decodeIdb1SaveRoot,
      {
        allowCanonicalPlayerWrites:
          this.options.allowCanonicalPlayerWrites === true,
      },
      this.options.automaticPurchaseEvidencePromoter,
      this.options.automaticNumberFormattingAdopter,
      this.options.automaticResearchVisibilityAdopter,
    )
    const initialLifecyclePhase = this.lifecycle.currentPhase()
    const initialLifecycleReceipt =
      this.observeLifecyclePhase(initialLifecyclePhase)
    const application = this.options.createApplication(repository)
    const coordinator = new CanonicalLifecycleCoordinator({
      application,
      lifecycle: this.lifecycle,
      clock: this.clock,
      policy: this.options.lifecyclePolicy,
      subscribeToLifecycle: false,
      readPendingDepartureTimestamp: () =>
        parseUnityInvariantUtcTimestamp(
          this.departureMarker.read(),
        ),
      clearPendingDepartureTimestamp: (expectedUtcMilliseconds) => {
        if (expectedUtcMilliseconds === undefined) {
          this.departureMarker.clear()
        } else {
          this.departureMarker.clearIfMatches(expectedUtcMilliseconds)
        }
      },
    })
    let graph!: BrowserRuntimeGraph
    let activeTime!: CoordinatorActiveTimeDriver<CanonicalCoordinatedActiveResult>
    const router = new AuthoritativeLifecycleRouter({
      lifecycle: this.lifecycle,
      lease: this.lease,
      coordinator,
      observePhase: (phase) =>
        this.observeLifecyclePhase(phase),
      handlePhase: (phase, observation) => {
        const receipt = requireLifecycleReceipt(observation)
        return coordinator.handlePlatformPhase(
          phase,
          receipt.clockSample,
          receipt.pendingDepartureTimestamp,
        )
      },
      beforePhase: (phase, observationError) => {
        if (
          this.phaseRunsActiveTime(phase) &&
          observationError === undefined
        ) {
          return undefined
        }
        const suspended = this.suspendActiveTime(graph)
        return hasSuspendedActiveTime(suspended)
          ? () => this.flushSuspendedActiveTime(
              graph,
              suspended,
            )
          : undefined
      },
      afterPhase: (
        phase,
        result,
        beforeResult,
        phaseObservation,
      ) => {
        if (!this.isCurrentGraph(graph)) return
        const receipt = requireLifecycleReceipt(
          phaseObservation,
        )
        if (isCanonicalActiveResult(beforeResult)) {
          this.recordActiveResult(beforeResult)
        }
        this.publishFrontendSnapshot(graph)
        if (phase === 'active') {
          const unsafeReplayReason =
            unsafeForegroundReplayReason(result)
          if (unsafeReplayReason !== undefined) {
            graph.activeTime.pauseForeground()
            this.addWarning({
              code: 'persistence-failed',
              reason:
                'Away-time replay did not establish a safe foreground baseline: ' +
                unsafeReplayReason,
            })
            return
          }
          this.reconcileActiveLifecycleIntent(
            receipt.intentEpoch,
          )
          this.startActiveTimeIfForegroundIntended(
            graph,
            receipt.intentEpoch,
          )
        } else if (this.phaseRunsActiveTime(phase)) {
          this.reconcileActiveLifecycleIntent(
            receipt.intentEpoch,
          )
          this.startActiveTimeIfForegroundIntended(
            graph,
            receipt.intentEpoch,
          )
        } else if (
          this.isLatestLifecycleIntent(
            receipt.intentEpoch,
            false,
          )
        ) {
          // A delayed startup or import may have completed after the raw
          // non-active phase was observed. Reassert the stopped state after
          // its queued lifecycle operation so background time cannot enter
          // the foreground delivery lane.
          graph.activeTime.pauseForeground()
        }
      },
      onFailure: (_phase, error) => {
        if (
          !(error instanceof WriterAuthorityLostError) &&
          this.graph?.router === router
        ) {
          this.addWarning({
            code: 'persistence-failed',
            reason:
              error instanceof LifecycleReceiptClockError
                ? 'Lifecycle clock capture failed; the phase was not applied and foreground sampling remains paused.'
                : errorMessage(error),
          })
        }
      },
    })
    const activeTimeSnapshot = application.snapshot()
    activeTime = new CoordinatorActiveTimeDriver({
      clock: this.options.activeTimeClock,
      scheduler: this.options.activeTimeScheduler,
      minimumDeliveryMilliseconds:
        this.options.activeTimeDeliveryIntervalMilliseconds ??
        (activeTimeSnapshot.phase === 'ready'
          ? activeTimeSnapshot.state.gameState.timeline.processing
              .activeIntervalMilliseconds
          : 33),
      fixedDeliveryCadence:
        this.options.fixedActiveTimeDeliveryCadence ?? true,
      deliver: (milliseconds) =>
        router.runLocallyFenced(() =>
          coordinator.advanceActive(milliseconds),
        ),
      onDelivered: (result) => {
        if (!this.isCurrentGraph(graph)) return
        const snapshot = application.snapshot()
        if (
          snapshot.phase === 'ready' &&
          this.options.activeTimeDeliveryIntervalMilliseconds === undefined
        ) {
          activeTime.setDeliveryIntervalMilliseconds(
            snapshot.state.gameState.timeline.processing
              .activeIntervalMilliseconds,
          )
        }
        this.recordActiveResult(result)
        this.publishFrontendSnapshot(
          graph,
          false,
          result.transition.accepted &&
            result.remainingMilliseconds <= 0
            ? 'animation-frame'
            : 'immediate',
        )
      },
      undeliveredMilliseconds: (result) =>
        result.remainingMilliseconds,
      onFailure: (error) => {
        if (
          !(error instanceof WriterAuthorityLostError) &&
          this.isCurrentGraph(graph)
        ) {
          this.addWarning({
            code: 'active-time-failed',
            reason: errorMessage(error),
          })
        }
      },
      onHibernation: (milliseconds) => {
        return router.run(() =>
          coordinator.creditVisibleHibernation(milliseconds),
        ).then((result) => {
          if (!result.committed) {
            throw new Error(
              result.reason ?? 'Visible hibernation credit was not committed.',
            )
          }
          if (this.isCurrentGraph(graph)) {
            this.publishFrontendSnapshot(graph, true)
          }
        })
      },
    })
    const playerCommands = new RevisionedPlayerCommandDispatcher({
      latestSnapshot: () => this.frontendSnapshots.snapshot(),
      dispatch: (envelope, cancelRequested) =>
        coordinator.dispatchPlayer(envelope, cancelRequested),
      serialize: (operation) => router.run(operation),
      publishSnapshot: () => {
        this.publishFrontendSnapshot(graph)
      },
      isCurrent: () => this.isCurrentGraph(graph),
      cancelRequested: () => this.lease.cancellationRequested(),
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
    graph = {
      application,
      repository,
      coordinator,
      initialLifecycle: Object.freeze({
        phase: initialLifecyclePhase,
        ...initialLifecycleReceipt,
      }),
      router,
      activeTime,
      playerCommands,
      checkpoint,
      retainer: new BrowserRecoveryBlobRetainer(storage),
    }
    return graph
  }

  private handleOwnershipState(
    state: WriterAuthorityState,
  ): void {
    if (this.shutdownRequested) return
    if (state.kind === 'blocked') {
      const browserBlocked = requireBrowserBlockedState(state)
      if (
        this.currentStatus.phase === 'blocked' &&
        this.currentStatus.code === 'writer-owned'
      ) {
        this.publish({
          ...this.currentStatus,
          generation: browserBlocked.generation,
          expiresAtUtcMilliseconds:
            browserBlocked.expiresAtUtcMilliseconds,
        })
      }
      return
    }
    if (state.kind !== 'lost') return
    this.foregroundIntended = false
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
    graph?.activeTime.shutdown()
    graph?.router.stop()
    graph?.checkpoint.stop()
    this.frontendSnapshots.clear()
    return graph
  }

  private async teardown(
    graph: BrowserRuntimeGraph | undefined,
    orderly: boolean,
    beforeDriverShutdown?: Promise<void>,
  ): Promise<void> {
    if (graph !== undefined) {
      await beforeDriverShutdown
      graph.activeTime.shutdown()
      await graph.router.shutdown()
      await graph.checkpoint.shutdown()
      if (orderly) await this.checkpointOrderlyShutdown(graph)
      await graph.coordinator.shutdown()
      graph.application.disposeStoredTimeJobRunner?.()
    }
    if (orderly) await this.lease.release()
    await this.lease.shutdown()
  }

  private async preserveShutdownActiveTime(
    graph: BrowserRuntimeGraph,
  ): Promise<void> {
    const residue = await resolveSuspendedActiveTime(
      this.suspendActiveTime(graph),
    )
    const unresolvedMilliseconds =
      residue.activeMilliseconds + residue.hibernationMilliseconds
    if (unresolvedMilliseconds <= 0) return
    try {
      const sampled = this.clock.sample()
      const existing = parseUnityInvariantUtcTimestamp(
        this.departureMarker.read(),
      )
      const departureUtcMilliseconds = Math.max(
        0,
        (existing.status === 'valid'
          ? Math.min(
              existing.utcMilliseconds,
              sampled.utcMilliseconds,
            )
          : sampled.utcMilliseconds) - unresolvedMilliseconds,
      )
      this.departureMarker.record(
        new Date(departureUtcMilliseconds).toISOString(),
      )
      this.departureRecordedForCurrentEpisode = true
    } catch (error) {
      this.addWarning({
        code: 'active-time-failed',
        reason:
          'Unprocessed foreground time could not be preserved for the next startup: ' +
          errorMessage(error),
      }, false)
    }
  }

  private async checkpointOrderlyShutdown(
    graph: BrowserRuntimeGraph,
  ): Promise<void> {
    if (!isDirtySnapshot(graph.application.snapshot())) return
    try {
      const result = await this.lease.runAuthoritativeOperation(
        () => graph.application.checkpoint(),
      )
      await this.lease.assertWritable()
      if (!result.committed) {
        this.addWarning({
          code: 'checkpoint-failed',
          reason: result.reason,
        }, false)
      }
    } catch (error) {
      if (!(error instanceof WriterAuthorityLostError)) {
        this.addWarning({
          code: 'checkpoint-failed',
          reason: errorMessage(error),
        }, false)
      }
    }
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
      throw new WriterAuthorityLostError(
        'The browser runtime discarded the application graph.',
      )
    }
  }

  private isCurrentGraph(graph: BrowserRuntimeGraph): boolean {
    return (
      this.graph === graph &&
      !this.shutdownRequested &&
      this.lease.isAuthoritative()
    )
  }

  private publishFrontendSnapshot(
    graph: BrowserRuntimeGraph,
    force = false,
    delivery: 'immediate' | 'animation-frame' = 'immediate',
  ): void {
    this.assertCurrentGraph(graph)
    if (!this.lease.isAuthoritative()) {
      throw new WriterAuthorityLostError()
    }
    this.frontendSnapshots.publish(
      graph.application.frontendSnapshot(this.gameplayPreviewDemand),
      force,
      delivery,
    )
  }

  /** Every terminal import outcome must replace any transient import UI. */
  private publishApplicationOutcomeAfterImport(
    graph: BrowserRuntimeGraph,
  ): void {
    const snapshot = graph.application.snapshot()
    this.publishFrontendSnapshot(graph, true)
    if (snapshot.phase === 'ready') {
      this.publish(this.readyStatus())
      return
    }
    if (snapshot.phase === 'blocked') {
      this.publish(applicationBlockedStatus(snapshot))
      return
    }
    throw new Error(
      `Import ended with the application in ${snapshot.phase}.`,
    )
  }

  private recordActiveResult(
    result: Readonly<CanonicalCoordinatedActiveResult>,
  ): void {
    if (
      result.transition.accepted &&
      result.remainingMilliseconds <= 0
    ) {
      return
    }
    this.addWarning({
      code: 'active-time-failed',
      reason: result.transition.accepted
        ? `${result.remainingMilliseconds} ms of foreground time was not consumed.`
        : `${result.transition.code}: ${result.transition.reason}`,
    })
  }

  private suspendActiveTime(
    graph: BrowserRuntimeGraph,
  ): SuspendedActiveTime {
    try {
      return graph.activeTime.suspendForLifecycle()
    } catch (error) {
      this.addWarning({
        code: 'active-time-failed',
        reason: errorMessage(error),
      })
      return {
        activeMilliseconds: 0,
        hibernationMilliseconds: 0,
        hasInFlightDelivery: false,
        inFlightResidue: Promise.resolve({
          activeMilliseconds: 0,
          hibernationMilliseconds: 0,
        }),
      }
    }
  }

  private async flushSuspendedActiveTime(
    graph: BrowserRuntimeGraph,
    suspended: SuspendedActiveTime,
    restoreUnconsumed = true,
  ): Promise<CanonicalCoordinatedActiveResult | undefined> {
    const residue = await resolveSuspendedActiveTime(suspended)
    try {
      await this.creditSuspendedHibernation(
        graph.coordinator,
        residue.hibernationMilliseconds,
      )
    } catch (error) {
      graph.activeTime.restoreSuspendedTime(residue)
      throw error
    }
    if (residue.activeMilliseconds <= 0) return undefined
    const requestedMilliseconds = residue.activeMilliseconds
    const intervalMilliseconds = graph.activeTime.usesFixedDeliveryCadence()
      ? graph.activeTime.deliveryIntervalMilliseconds()
      : requestedMilliseconds
    let remainingMilliseconds = requestedMilliseconds
    let consumedMilliseconds = 0
    let transition: CanonicalCoordinatedActiveResult['transition'] = {
      accepted: true,
      changed: false,
      revision: 0,
    }
    let fullTickIncomplete = false
    let completedFullTicks = 0
    const checkpoints: CanonicalCoordinatedActiveResult['checkpoints'][number][] = []
    try {
      while (
        remainingMilliseconds >= intervalMilliseconds
      ) {
        const result = await graph.coordinator.advanceActive(
          intervalMilliseconds,
        )
        transition = result.transition
        checkpoints.push(...result.checkpoints)
        consumedMilliseconds += result.consumedMilliseconds
        remainingMilliseconds = Math.max(
          0,
          remainingMilliseconds - result.consumedMilliseconds,
        )
        if (
          !result.transition.accepted ||
          result.remainingMilliseconds > 0
        ) {
          fullTickIncomplete = true
          break
        }
        completedFullTicks += 1
        if (
          graph.activeTime.usesFixedDeliveryCadence() &&
          completedFullTicks % MAXIMUM_FIXED_CADENCE_BURST_DELIVERIES === 0 &&
          remainingMilliseconds >= intervalMilliseconds
        ) {
          await yieldBrowserTask()
        }
      }
      if (
        !fullTickIncomplete &&
        transition.accepted &&
        remainingMilliseconds > Number.EPSILON &&
        remainingMilliseconds < intervalMilliseconds
      ) {
        const continuous = await graph.coordinator.advanceActiveContinuous(
          remainingMilliseconds,
        )
        transition = continuous.transition
        checkpoints.push(...continuous.checkpoints)
        consumedMilliseconds += continuous.consumedMilliseconds
        remainingMilliseconds = continuous.remainingMilliseconds
      }
      const result: CanonicalCoordinatedActiveResult = {
        transition,
        requestedMilliseconds,
        consumedMilliseconds,
        remainingMilliseconds,
        checkpoints: Object.freeze(checkpoints),
      }
      if (restoreUnconsumed && remainingMilliseconds > 0) {
        graph.activeTime.restoreSuspendedTime({
          activeMilliseconds: remainingMilliseconds,
          hibernationMilliseconds: 0,
        })
      }
      return result
    } catch (error) {
      if (restoreUnconsumed && remainingMilliseconds > 0) {
        graph.activeTime.restoreSuspendedTime({
          activeMilliseconds: remainingMilliseconds,
          hibernationMilliseconds: 0,
        })
      }
      throw error
    }
  }

  private async collectImportActiveTime(
    graph: BrowserRuntimeGraph,
    admitted: SuspendedActiveTime,
  ): Promise<SuspendedActiveTime> {
    const admittedResidue = await resolveSuspendedActiveTime(admitted)
    // Earlier queued commands/lifecycle work may have restored residue after
    // import admission. Drain it only once that older router work has settled.
    await Promise.resolve()
    const lateResidue = await resolveSuspendedActiveTime(
      this.suspendActiveTime(graph),
    )
    return resolvedSuspendedActiveTime({
      activeMilliseconds:
        admittedResidue.activeMilliseconds +
        lateResidue.activeMilliseconds,
      hibernationMilliseconds:
        admittedResidue.hibernationMilliseconds +
        lateResidue.hibernationMilliseconds,
    })
  }

  private restoreActiveResultResidue(
    graph: BrowserRuntimeGraph,
    result: CanonicalCoordinatedActiveResult | undefined,
  ): void {
    if (
      result === undefined ||
      result.remainingMilliseconds <= 0
    ) return
    graph.activeTime.restoreSuspendedTime({
      activeMilliseconds: result.remainingMilliseconds,
      hibernationMilliseconds: 0,
    })
  }

  private async creditSuspendedHibernation(
    coordinator: CanonicalLifecycleCoordinator,
    milliseconds: number,
  ): Promise<void> {
    if (milliseconds <= 0) return
    const result = await coordinator.creditVisibleHibernation(milliseconds)
    if (!result.committed) {
      throw new Error(
        result.reason ?? 'Visible hibernation credit was not committed.',
      )
    }
  }

  private startActiveTimeIfForegroundIntended(
    graph: BrowserRuntimeGraph,
    expectedIntentEpoch?: unknown,
  ): void {
    if (
      this.pendingImportCount > 0 ||
      !this.foregroundIntended ||
      this.lifecycleReconciledIntentEpoch !==
        this.lifecycleIntentEpoch ||
      (
        expectedIntentEpoch !== undefined &&
        expectedIntentEpoch !== this.lifecycleIntentEpoch
      ) ||
      !this.isCurrentGraph(graph) ||
      graph.application.snapshot().phase !== 'ready'
    ) {
      return
    }
    graph.activeTime.startForeground()
  }

  private reconcileActiveLifecycleIntent(
    expectedIntentEpoch: unknown,
  ): void {
    if (
      this.isLatestLifecycleIntent(
        expectedIntentEpoch,
        true,
      )
    ) {
      this.lifecycleReconciledIntentEpoch =
        this.lifecycleIntentEpoch
    }
  }

  private captureLifecycleIntent(
    phase: LifecyclePhase,
  ): number {
    this.foregroundIntended = this.phaseRunsActiveTime(phase)
    this.lifecycleIntentEpoch += 1
    return this.lifecycleIntentEpoch
  }

  async copyLastRecovery(): Promise<boolean> {
    const recoveryPath = this.lastRecoveryPath
    if (recoveryPath === undefined) return false
    const text = await (
      this.saveStorage?.readText(recoveryPath) ??
      requireBrowserDatabase(this.database).readFile(recoveryPath)
    )
    await this.writeClipboardText(text)
    return true
  }

  private phaseRunsActiveTime(phase: LifecyclePhase): boolean {
    return phase === 'active' || (
      phase === 'focus-lost' &&
      !this.options.lifecyclePolicy.saveOnFocusLoss
    )
  }

  private observeLifecyclePhase(
    phase: LifecyclePhase,
    recordDeparture = true,
  ): BrowserLifecycleReceipt {
    if (!this.phaseRunsActiveTime(phase)) {
      // Lifecycle work is queued behind the active authority operation. Send
      // cancellation out-of-band so a detached Stored Time candidate reaches
      // a safe terminal state before the platform suspends this page.
      this.graph?.application.cancelStoredTimeJob?.()
    }
    const intentEpoch = this.captureLifecycleIntent(phase)
    try {
      const pendingDepartureTimestamp =
        parseUnityInvariantUtcTimestamp(
          this.departureMarker.read(),
        )
      const sampled = this.clock.sample()
      const serializedUtcText = sampled.serializedUtcText
      const parsedUtcMilliseconds =
        Date.parse(serializedUtcText)
      if (
        !Number.isFinite(sampled.utcMilliseconds) ||
        serializedUtcText.trim().length === 0 ||
        !Number.isFinite(parsedUtcMilliseconds) ||
        parsedUtcMilliseconds !== sampled.utcMilliseconds
      ) {
        throw new LifecycleReceiptClockError()
      }
      if (this.phaseRunsActiveTime(phase)) {
        this.departureRecordedForCurrentEpisode = false
      } else if (
        recordDeparture &&
        !this.departureRecordedForCurrentEpisode
      ) {
        this.departureMarker.record(serializedUtcText)
        this.departureRecordedForCurrentEpisode = true
      } else if (!recordDeparture) {
        this.departureRecordedForCurrentEpisode = true
      }
      return Object.freeze({
        intentEpoch,
        pendingDepartureTimestamp,
        clockSample: Object.freeze({
          utcMilliseconds: sampled.utcMilliseconds,
          serializedUtcText,
        }),
      })
    } catch {
      this.foregroundIntended = false
      throw new LifecycleReceiptClockError()
    }
  }

  private isLatestLifecycleIntent(
    expectedIntentEpoch: unknown,
    foregroundIntended: boolean,
  ): boolean {
    return (
      expectedIntentEpoch === this.lifecycleIntentEpoch &&
      this.foregroundIntended === foregroundIntended
    )
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
    const committed = await graph.router.run(async () => {
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
    this.publishFrontendSnapshot(graph)
    return committed
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

function yieldBrowserTask(): Promise<void> {
  if (typeof globalThis.setTimeout !== 'function') return Promise.resolve()
  return new Promise((resolve) => globalThis.setTimeout(resolve, 0))
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
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
    applicationOutcome: snapshot.outcome,
    reason: `${snapshot.outcome}: ${snapshot.error}`,
  })
}

function isCanonicalActiveResult(
  value: unknown,
): value is CanonicalCoordinatedActiveResult {
  return (
    value !== null &&
    typeof value === 'object' &&
    'requestedMilliseconds' in value &&
    'consumedMilliseconds' in value &&
    'remainingMilliseconds' in value &&
    'transition' in value
  )
}

function hasSuspendedActiveTime(
  value: SuspendedActiveTime,
): boolean {
  return value.activeMilliseconds > 0 ||
    value.hibernationMilliseconds > 0 ||
    value.hasInFlightDelivery
}

async function resolveSuspendedActiveTime(
  value: SuspendedActiveTime,
): Promise<ActiveTimeResidue> {
  const inFlight = await value.inFlightResidue
  return {
    activeMilliseconds:
      value.activeMilliseconds + inFlight.activeMilliseconds,
    hibernationMilliseconds:
      value.hibernationMilliseconds + inFlight.hibernationMilliseconds,
  }
}

function resolvedSuspendedActiveTime(
  residue: ActiveTimeResidue,
): SuspendedActiveTime {
  return {
    ...residue,
    hasInFlightDelivery: false,
    inFlightResidue: Promise.resolve({
      activeMilliseconds: 0,
      hibernationMilliseconds: 0,
    }),
  }
}

function requireLifecycleReceipt(
  value: unknown,
): BrowserLifecycleReceipt {
  if (
    value === null ||
    typeof value !== 'object' ||
    !('intentEpoch' in value) ||
    typeof value.intentEpoch !== 'number' ||
    !('clockSample' in value) ||
    value.clockSample === null ||
    typeof value.clockSample !== 'object' ||
    !('utcMilliseconds' in value.clockSample) ||
    typeof value.clockSample.utcMilliseconds !== 'number' ||
    !('serializedUtcText' in value.clockSample) ||
    typeof value.clockSample.serializedUtcText !== 'string'
  ) {
    throw new Error(
      'The lifecycle router lost its receipt-time phase observation.',
    )
  }
  return value as unknown as BrowserLifecycleReceipt
}

function unsafeForegroundReplayReason(
  result:
    | CanonicalAwayReplayResult
    | CanonicalLifecycleSaveResult,
): string | undefined {
  if (!('replayed' in result)) {
    return 'the active phase returned a non-replay result.'
  }
  if (
    result.replayed ||
    result.code === 'no-quit-timestamp' ||
    result.code === 'import-baseline-suppressed'
  ) {
    return undefined
  }
  return `${result.code}; foreground sampling remains paused until canonical replay succeeds.`
}

function runtimePlayerFailure(
  code: string,
  reason: string,
): UiRuntimePlayerCommandResult {
  return Object.freeze({
    status: 'failed',
    kind: 'runtime',
    code,
    reason,
    retryable: false,
  })
}

function developmentUnavailable(): UiRuntimeDevelopmentActionResult {
  return {
    applied: false,
    code: 'RUNTIME-DEVELOPMENT-CONTROL-UNAVAILABLE',
    reason: 'Development progression controls are unavailable in this build.',
  }
}

function developmentNotReady(): UiRuntimeDevelopmentActionResult {
  return {
    applied: false,
    code: 'RUNTIME-DEVELOPMENT-NOT-READY',
    reason: 'The browser runtime does not own a writable ready application.',
  }
}

function developmentNotEnabled(): UiRuntimeDevelopmentActionResult {
  return {
    applied: false,
    code: 'RUNTIME-DEVELOPMENT-NOT-ENABLED',
    reason: 'Developer Options are not enabled.',
  }
}

function developmentCommitResult(
  result: CommitFirstResult,
): UiRuntimeDevelopmentActionResult {
  if (!result.committed) {
    return {
      applied: false,
      code:
        result.code ??
        (result.transition.accepted
          ? 'RUNTIME-DEVELOPMENT-COMMIT-FAILED'
          : result.transition.code),
      reason:
        result.reason ??
        (result.transition.accepted
          ? 'The development action was not committed.'
          : result.transition.reason),
    }
  }
  return {
    applied: true,
    stateRevision: result.transition.revision,
    durableRevision: result.durableRevision,
  }
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

function recordPerformanceImportResult(
  result: UiRuntimeImportResult,
): void {
  if (import.meta.env.MODE !== 'performance') return
  ;(globalThis as typeof globalThis & {
    __idleDysonLastImportResult?: UiRuntimeImportResult
  }).__idleDysonLastImportResult = structuredClone(result)
}

function requireBrowserDatabase(
  database: BrowserSaveDatabase | undefined,
): BrowserSaveDatabase {
  if (database === undefined) {
    throw new Error(
      'Browser persistence requires an IndexedDB writer-fence database.',
    )
  }
  return database
}

function requireBrowserPersistenceFence(
  authority: WriterAuthorityPort,
): { currentFence(): WriterLeaseFence } {
  if (
    !('currentFence' in authority) ||
    typeof authority.currentFence !== 'function'
  ) {
    throw new Error(
      'IndexedDB persistence requires browser expiring writer authority.',
    )
  }
  return authority as WriterAuthorityPort & {
    currentFence(): WriterLeaseFence
  }
}

function requireBrowserTakeover(
  authority: WriterAuthorityPort,
): WriterAuthorityTakeoverPort {
  if (
    !('takeOver' in authority) ||
    typeof authority.takeOver !== 'function'
  ) {
    throw new Error(
      'Writer takeover is available only to browser expiring authority.',
    )
  }
  return authority as WriterAuthorityPort & WriterAuthorityTakeoverPort
}

function requireBrowserBlockedAcquisition(
  acquisition: { readonly acquired: false },
): Readonly<{
  acquired: false
  generation: number
  expiresAtUtcMilliseconds: number
}> {
  if (
    !('generation' in acquisition) ||
    typeof acquisition.generation !== 'number' ||
    !('expiresAtUtcMilliseconds' in acquisition) ||
    typeof acquisition.expiresAtUtcMilliseconds !== 'number'
  ) {
    throw new Error(
      'Only browser expiring authority may block writer acquisition.',
    )
  }
  return acquisition as Readonly<{
    acquired: false
    generation: number
    expiresAtUtcMilliseconds: number
  }>
}

function requireBrowserBlockedState(
  state: Extract<WriterAuthorityState, { kind: 'blocked' }>,
): Readonly<{
  kind: 'blocked'
  generation: number
  expiresAtUtcMilliseconds: number
}> {
  if (
    !('generation' in state) ||
    typeof state.generation !== 'number' ||
    !('expiresAtUtcMilliseconds' in state) ||
    typeof state.expiresAtUtcMilliseconds !== 'number'
  ) {
    throw new Error(
      'Only browser expiring authority may publish blocked ownership.',
    )
  }
  return state as Readonly<{
    kind: 'blocked'
    generation: number
    expiresAtUtcMilliseconds: number
  }>
}
