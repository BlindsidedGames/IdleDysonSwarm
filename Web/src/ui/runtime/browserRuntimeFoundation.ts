import type {
  ApplicationSnapshot,
  CheckpointResult,
  CommitFirstResult,
} from '../../application/contracts'
import type { DeepReadonly } from '../../core/contracts'
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
  WriterLeaseLostError,
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
  BrowserWriterLease,
  type BrowserWriterOwnershipState,
  type IntervalScheduler,
  type OwnershipNoticeChannel,
} from '../../platform/browserWriterLease'
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
import { decodeIdb1Save } from '../../save/decodeIdb1'
import { prepareImportedSaveText } from '../../save/import'
import { serializeWebSave } from '../../save/serialization'
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
  type ActiveTimeFrameScheduler,
  type ActiveTimeMonotonicClock,
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
  FrontendSnapshotStore,
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
  readonly legacyIdFactory?: () => string
  /** Native Store authority projected before the canonical graph is opened. */
  readonly hostEntitlements?: RuntimeEntitlementBridge
  /** Same-device automatic migration capability; never used by manual import. */
  readonly automaticPurchaseEvidencePromoter?:
    AutomaticUnityPurchaseEvidencePromoter
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
  private readonly database: BrowserSaveDatabase
  private readonly saveStorage:
    | (SaveStorageAdapter & BrowserLegacyRecoveryStore)
    | undefined
  private readonly saveRepositoryPaths: SaveRepositoryPaths
  private readonly lease: BrowserWriterLease
  private readonly lifecycle: LifecycleAdapter
  private readonly clock: CanonicalLifecycleClock
  private readonly departureMarker: DepartureMarker
  private clipboard: ClipboardAdapter | undefined
  private readonly navigation: ExternalNavigationAdapter
  private readonly storageStatus: BrowserStorageStatusAdapter
  private readonly importReader: BrowserSaveImportReader
  private readonly exporter: BrowserRecoveryBlobExporter
  private readonly downloads: TextDownloadPort
  private readonly frontendSnapshots = new FrontendSnapshotStore()
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
    this.developmentControlsAvailable =
      options.developmentControlsAvailable ?? import.meta.env.DEV
    this.developmentControlsRequireEntitlement =
      options.developmentControlsRequireEntitlement === true
    const databaseName =
      options.databaseName ?? DEVELOPMENT_ONLY_BROWSER_DATABASE_NAME
    this.database =
      options.database ??
      new IndexedDbBrowserSaveDatabase(
        databaseName,
        options.indexedDbFactory,
      )
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
    this.lease = new BrowserWriterLease({
      database: this.database,
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
          this.database.readFile(path),
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
    const acquisition = await this.lease.takeOver()
    if (!acquisition.acquired) return this.currentStatus
    this.startPromise = undefined
    return this.start()
  }

  dispatchPlayer(
    command: CanonicalPlayerCommand,
  ): Promise<UiRuntimePlayerCommandResult> {
    const graph = this.graph
    if (graph === undefined || this.shutdownRequested) {
      return Promise.resolve(
        runtimePlayerFailure(
          'RUNTIME-PLAYER-NOT-READY',
          'The browser runtime does not own a writable ready application.',
        ),
      )
    }
    if (
      command.kind === 'tinker.start' ||
      command.kind === 'tinker.set-repeat'
    ) {
      return graph.playerCommands.dispatchLatest(command)
    }
    if (
      command.kind === 'dyson.set-bot-distribution' ||
      command.kind === 'dyson.set-buy-mode' ||
      command.kind === 'dyson.set-rounded-bulk-buy' ||
      command.kind === 'dyson.set-facility-automation'
    ) {
      return graph.playerCommands.dispatchLatest(command)
    }
    if (
      command.kind === 'research.set-buy-mode' ||
      command.kind === 'research.set-rounded-bulk-buy' ||
      command.kind === 'research.set-automation'
    ) {
      return graph.playerCommands.dispatchLatest(command)
    }
    return graph.playerCommands.dispatch(command)
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
    return parseCanonicalSkillPreset(serialized)
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
        quantumShards: 0n,
        strangeMatter: 0n,
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
    if (!Number.isFinite(seconds) || seconds < 0) {
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
    const admittedLifecycleIntentEpoch =
      this.lifecycleIntentEpoch
    this.pendingImportCount += 1
    const pendingActiveMilliseconds =
      this.suspendActiveTime(graph)
    let retainedPath: string | undefined
    let activeResult: CanonicalCoordinatedActiveResult | undefined
    try {
      const routed = await graph.router.run(async () => {
        activeResult =
          pendingActiveMilliseconds > 0
            ? await graph.coordinator.advanceActive(
                pendingActiveMilliseconds,
              )
            : undefined
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
        return {
          imported,
          recoveryPath: recovery.sourcePath,
        }
      })
      this.assertCurrentGraph(graph)
      if (activeResult !== undefined) {
        this.recordActiveResult(activeResult)
        this.publishFrontendSnapshot(graph)
      }
      this.lastRecoveryPath = routed.recoveryPath
      if (routed.imported.imported) {
        if (routed.imported.lifecycleReset) {
          this.reconcileActiveLifecycleIntent(
            admittedLifecycleIntentEpoch,
          )
        }
        graph.checkpoint.start()
        const snapshot = graph.application.snapshot()
        if (snapshot.phase === 'ready') {
          this.publishFrontendSnapshot(graph)
          this.publish(this.readyStatus())
        }
      }
      return mapImportResult(routed.imported, true)
    } catch (error) {
      await this.lease.assertWritable()
      this.assertCurrentGraph(graph)
      if (activeResult !== undefined) {
        this.recordActiveResult(activeResult)
        this.publishFrontendSnapshot(graph)
      }
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
    const text = await this.readCurrentSaveText()
    if (text === null) return false
    this.downloads.downloadText(
      'idle-dyson-swarm-save.idsw',
      text,
      'text/plain;charset=utf-8',
    )
    return true
  }

  async readCurrentSaveText(): Promise<string | null> {
    const graph = this.requireGraph()
    if (!(await this.requestFencedCheckpoint(graph, false))) {
      return null
    }
    const save = await graph.repository.loadCurrent()
    return save === null
      ? null
      : serializeWebSave(save.copyValidatedState())
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
    if (graph !== undefined) {
      const pendingActiveMilliseconds =
        this.suspendActiveTime(graph)
      if (pendingActiveMilliseconds > 0) {
        void graph.router.run(() =>
          graph.coordinator.advanceActive(
            pendingActiveMilliseconds,
          ),
        ).catch(() => undefined)
      }
      graph.activeTime.shutdown()
    }
    graph?.router.stop()
    graph?.checkpoint.stop()
    this.frontendSnapshots.clear()
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
        const blocked = Object.freeze({
          phase: 'blocked',
          code: 'writer-owned',
          reason:
            'Another browser context owns the writable game session.',
          generation: acquisition.generation,
          expiresAtUtcMilliseconds:
            acquisition.expiresAtUtcMilliseconds,
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
      const startupReplay = await graph.router.start(async () => {
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
            this.suspendActiveTime(graph)
          }
        }
        return replay
      })
      this.assertCurrentGraph(graph)

      const applicationSnapshot = graph.application.snapshot()
      if (applicationSnapshot.phase === 'blocked') {
        const recoveryPath = this.saveRepositoryPaths.legacyRecovery
        const recoveryExists = this.saveStorage === undefined
          ? await this.database.fileExists(recoveryPath)
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
        this.suspendActiveTime(graph)
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
      if (error instanceof WriterLeaseLostError) {
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
        database: this.database,
        lease: this.lease,
        nowUtcMilliseconds: this.options.nowUtcMilliseconds,
        legacyIdFactory: this.options.legacyIdFactory,
      })
    const repository = new PortableSaveRepository(
      storage,
      this.saveRepositoryPaths,
      decodeIdb1Save,
      {
        allowCanonicalPlayerWrites:
          this.options.allowCanonicalPlayerWrites === true,
      },
      this.options.automaticPurchaseEvidencePromoter,
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
        const milliseconds = this.suspendActiveTime(graph)
        return milliseconds > 0
          ? () => coordinator.advanceActive(milliseconds)
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
            this.suspendActiveTime(graph)
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
          this.suspendActiveTime(graph)
        }
      },
      onFailure: (_phase, error) => {
        if (
          !(error instanceof WriterLeaseLostError) &&
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
    activeTime = new CoordinatorActiveTimeDriver({
      clock: this.options.activeTimeClock,
      scheduler: this.options.activeTimeScheduler,
      minimumDeliveryMilliseconds:
        this.options.activeTimeDeliveryIntervalMilliseconds,
      deliver: (milliseconds) =>
        router.run(() => coordinator.advanceActive(milliseconds)),
      onDelivered: (result) => {
        if (!this.isCurrentGraph(graph)) return
        this.recordActiveResult(result)
        this.publishFrontendSnapshot(graph)
      },
      onFailure: (error) => {
        if (
          !(error instanceof WriterLeaseLostError) &&
          this.isCurrentGraph(graph)
        ) {
          this.addWarning({
            code: 'active-time-failed',
            reason: errorMessage(error),
          })
        }
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
    state: BrowserWriterOwnershipState,
  ): void {
    if (this.shutdownRequested) return
    if (state.kind === 'blocked') {
      if (
        this.currentStatus.phase === 'blocked' &&
        this.currentStatus.code === 'writer-owned'
      ) {
        this.publish({
          ...this.currentStatus,
          generation: state.generation,
          expiresAtUtcMilliseconds:
            state.expiresAtUtcMilliseconds,
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
  ): Promise<void> {
    if (graph !== undefined) {
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
      if (!(error instanceof WriterLeaseLostError)) {
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
      throw new WriterLeaseLostError(
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
  ): void {
    this.assertCurrentGraph(graph)
    if (!this.lease.isAuthoritative()) {
      throw new WriterLeaseLostError()
    }
    this.frontendSnapshots.publish(
      graph.application.frontendSnapshot(this.gameplayPreviewDemand),
      force,
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
  ): number {
    try {
      return graph.activeTime.suspendForLifecycle()
    } catch (error) {
      this.addWarning({
        code: 'active-time-failed',
        reason: errorMessage(error),
      })
      return 0
    }
  }

  private startActiveTimeIfForegroundIntended(
    graph: BrowserRuntimeGraph,
    expectedIntentEpoch?: unknown,
  ): void {
    if (
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
    const text = await this.database.readFile(recoveryPath)
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
