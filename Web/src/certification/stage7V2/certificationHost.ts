import {
  CanonicalLifecycleCoordinatorV2,
  type CanonicalReturnV2Request,
  type CanonicalRuntimePersistenceCandidateV2,
} from '../../application/canonicalLifecycleCoordinatorV2'
import { registerCanonicalRuntimeApplicationAuthorityV2 } from '../../application/canonicalRuntimeSessionV2'
import type { CanonicalRuntimePublicationV2 } from '../../application/canonicalRuntimeSessionV2'
import {
  DeveloperOptionsTransactionOwnerV2,
  registerDeveloperOptionsReceiverAuthorityV2,
  type DeveloperOptionsCommitV2,
  type DeveloperOptionsPersistenceCandidateV2,
} from '../../application/developerOptionsTransactionV2'
import type { InfinityRewardAuthorityV2 } from '../../simulation/infinityEconomyV2'
import { CANONICAL_V2_NO_DORMANT_DUE_EVENTS } from '../../simulation/canonicalEventTimeModelV2'
import type { StoredTimePolicyIdV2 } from '../../simulation/storedTimePolicyV2'
import {
  decodeSchema13WebSave,
  encodeSchema13WebSave,
  type Schema13PlatformState,
} from '../../save/schema13'
import {
  StoredTimeJobAuthorityV2,
  type StoredTimeAuthorityPublicationV2,
  type StoredTimeCheckpointRecordV2,
} from '../../workers/storedTimeV2/storedTimeJobAuthorityV2'
import {
  decodeStoredTimeWorkerFrameMessageV2,
  postStoredTimeWorkerMainFrameV2,
  type StoredTimeWorkerProgressDtoV2,
  type StoredTimeWorkerQueuedInputDtoV2,
} from '../../workers/storedTimeV2/workerProtocolV2'
import {
  createStage7V2WorkerLauncherOnDemand,
  type Stage7V2WorkerLauncherAccessResult,
} from './access'
import { Stage7V2CertificationRepository } from './repository'
import type { Stage7V2CertificationCheckpoint } from './contracts'
import {
  Stage7V2WriterLeaseUnavailableError,
  type Stage7V2WriterLease,
  type Stage7V2WriterLeaseManager,
} from './writerLease'

export type Stage7V2CertificationHostStatus =
  | 'ready'
  | 'started'
  | 'paused'
  | 'cancelled'
  | 'completed'
  | 'busy'
  | 'returned-time-required'
  | 'writer-unavailable'
  | 'reload-required'
  | 'resumable-failure'
  | 'indeterminate'

export interface Stage7V2CertificationHostResult {
  readonly status: Stage7V2CertificationHostStatus
  readonly publication: Readonly<CanonicalRuntimePublicationV2>
  readonly storedTimeUntouched: boolean
  readonly error?: string
}

export interface Stage7V2CertificationHostOptions {
  readonly initialPublication: Readonly<CanonicalRuntimePublicationV2>
  readonly platform: Readonly<Schema13PlatformState>
  readonly repository: Readonly<Stage7V2HostRepositoryPort>
  readonly writerLeases: Readonly<Stage7V2WriterLeaseManager>
  readonly infinityRewardAuthority: Readonly<InfinityRewardAuthorityV2>
  readonly nowUtc: () => string
  readonly loadLauncher?: (() => Promise<Stage7V2WorkerLauncherAccessResult>) | undefined
  readonly terminalTimeoutMilliseconds?: number | undefined
}

export interface Stage7V2HostRepositoryPort {
  checkpoint(
    source: Parameters<Stage7V2CertificationRepository['checkpoint']>[0],
    platform: Parameters<Stage7V2CertificationRepository['checkpoint']>[1],
    revision: number,
  ): Promise<Readonly<Stage7V2CertificationCheckpoint>>
  loadCurrent(): ReturnType<Stage7V2CertificationRepository['loadCurrent']>
  importPortable(
    portableSave: string,
    receivingPlatform: Readonly<Schema13PlatformState>,
  ): Promise<Readonly<Stage7V2CertificationCheckpoint>>
  readStoredTimePolicy(): ReturnType<Stage7V2CertificationRepository['readStoredTimePolicy']>
  writeStoredTimePolicy(policyId: StoredTimePolicyIdV2): Promise<void>
  readStoredTimeJobRecord(): Promise<unknown | null>
  persistStoredTimeJobRecord(record: unknown): Promise<void>
  clearStoredTimeJobRecord(): Promise<void>
  cleanup(): Promise<void>
}

export interface Stage7V2StoredTimeStartRequest {
  readonly expectedRevision: number
  readonly requestedDurationSeconds: number
  readonly queuedInputs?: readonly Readonly<StoredTimeWorkerQueuedInputDtoV2>[]
}

export interface Stage7V2CertificationDiagnostics {
  readonly status: Stage7V2CertificationHostStatus
  readonly requestedSeconds: number
  readonly processedSeconds: number
  readonly computedRawTicks: string
  readonly representativeGroups: number
  readonly durableSeconds: number
  readonly remainingSeconds: number
  readonly unconsumedFromDurableCheckpointSeconds: number
  readonly progress: number
  readonly elapsedMilliseconds: number
  readonly etaMilliseconds: number | null
  readonly predictedTotalMilliseconds: number | null
  readonly checkpoints: number
  readonly maximumChunkMilliseconds: number
  readonly maximumAtomicEventMilliseconds: number
  readonly cancelRemainingAvailable: boolean
  readonly retryAvailable: boolean
  readonly reloadRequired: boolean
  readonly message: string | null
}

export type Stage7V2CertificationDiagnosticsListener = (
  diagnostics: Readonly<Stage7V2CertificationDiagnostics>,
) => void

const EMPTY_DIAGNOSTICS: Readonly<Stage7V2CertificationDiagnostics> = Object.freeze({
  status: 'ready',
  requestedSeconds: 0,
  processedSeconds: 0,
  computedRawTicks: '0',
  representativeGroups: 0,
  durableSeconds: 0,
  remainingSeconds: 0,
  unconsumedFromDurableCheckpointSeconds: 0,
  progress: 0,
  elapsedMilliseconds: 0,
  etaMilliseconds: null,
  predictedTotalMilliseconds: null,
  checkpoints: 0,
  maximumChunkMilliseconds: 0,
  maximumAtomicEventMilliseconds: 0,
  cancelRemainingAvailable: false,
  retryAvailable: false,
  reloadRequired: false,
  message: null,
})

export class Stage7V2HostReloadRequiredError extends Error {
  constructor() {
    super('The durable Stage 7 publication changed in another host; reload is required.')
    this.name = 'Stage7V2HostReloadRequiredError'
  }
}

interface ActiveJob {
  readonly authority: StoredTimeJobAuthorityV2
  readonly worker: Worker
  readonly terminate: () => void
  readonly terminal: Promise<Stage7V2CertificationHostResult>
  readonly finish: (result: Stage7V2CertificationHostResult) => void
  readonly originRevision: number
  readonly identity: Readonly<{
    readonly jobId: string
    readonly protocolVersion: 1
    readonly workerInstanceNonce: string
    readonly originRevision: number
    readonly policyId: StoredTimePolicyIdV2
    readonly policyVersion: 1
  }>
  messageTail: Promise<void>
  acknowledgedBaseRevision: number
  checkpointSequence: number
  lastProgress: Readonly<StoredTimeWorkerProgressDtoV2> | null
  settled: boolean
  suspendOnPause: boolean
}

/**
 * Explicit dormant certification owner. Construction performs no I/O, opens no
 * worker and acquires no writer lease; every action is caller initiated.
 */
export class Stage7V2CertificationHost {
  readonly #repository: Readonly<Stage7V2HostRepositoryPort>
  readonly #writerLeases: Readonly<Stage7V2WriterLeaseManager>
  readonly #infinityRewardAuthority: Readonly<InfinityRewardAuthorityV2>
  #platform: Readonly<Schema13PlatformState>
  readonly #nowUtc: () => string
  readonly #loadLauncher: () => Promise<Stage7V2WorkerLauncherAccessResult>
  readonly #terminalTimeoutMilliseconds: number
  #lifecycle: CanonicalLifecycleCoordinatorV2
  #job: ActiveJob | null = null
  #jobTask: Promise<void> | null = null
  #returnedTimeReady = false
  #currentFence: Readonly<Stage7V2WriterLease> | null = null
  #lastStartRequest: Readonly<Stage7V2StoredTimeStartRequest> | null = null
  #diagnostics = EMPTY_DIAGNOSTICS
  readonly #diagnosticsListeners = new Set<Stage7V2CertificationDiagnosticsListener>()

  constructor(options: Readonly<Stage7V2CertificationHostOptions>) {
    const captured = captureHostOptions(options)
    this.#lifecycle = new CanonicalLifecycleCoordinatorV2(captured.initialPublication)
    this.#repository = captured.repository
    this.#writerLeases = captured.writerLeases
    this.#infinityRewardAuthority = captured.infinityRewardAuthority
    this.#platform = captured.platform
    this.#nowUtc = captured.nowUtc
    this.#loadLauncher = captured.loadLauncher ?? createStage7V2WorkerLauncherOnDemand
    this.#terminalTimeoutMilliseconds = captured.terminalTimeoutMilliseconds ?? 15_000
    if (!Number.isSafeInteger(this.#terminalTimeoutMilliseconds) ||
      this.#terminalTimeoutMilliseconds < 1 || this.#terminalTimeoutMilliseconds > 60_000) {
      throw new TypeError('Stage 7 terminal timeout is invalid.')
    }
  }

  snapshot(): Readonly<CanonicalRuntimePublicationV2> {
    return this.#lifecycle.snapshot()
  }

  /**
   * Production activation seam: the foreground command owner may advance the
   * same admitted publication while no Stored Time job is active. The host
   * then becomes the lifecycle/Stored Time owner from that exact identity.
   */
  adoptExternalPublication(
    publication: Readonly<CanonicalRuntimePublicationV2>,
    platform: Readonly<Schema13PlatformState> = this.#platform,
  ): void {
    if (this.#job !== null || this.#jobTask !== null) {
      throw new Error('Cannot adopt a foreground publication during Stored Time work.')
    }
    const current = this.snapshot()
    if (publication.revision < current.revision) {
      throw new Error('Cannot adopt an older foreground publication.')
    }
    this.#lifecycle = new CanonicalLifecycleCoordinatorV2(
      publication,
      FOREGROUND_PUBLICATION_AUTHORITY,
    )
    this.#platform = platform
  }

  hasActiveJob(): boolean {
    return this.#job !== null
  }

  diagnosticsSnapshot(): Readonly<Stage7V2CertificationDiagnostics> {
    return this.#diagnostics
  }

  subscribeDiagnostics(listener: Stage7V2CertificationDiagnosticsListener): () => void {
    if (typeof listener !== 'function') throw new TypeError('Stage 7 diagnostics listener is invalid.')
    this.#diagnosticsListeners.add(listener)
    return () => {
      this.#diagnosticsListeners.delete(listener)
    }
  }

  readStoredTimePolicy(): Promise<StoredTimePolicyIdV2> {
    return this.#repository.readStoredTimePolicy()
  }

  awaitStoredTimeTerminal(): Promise<Readonly<Stage7V2CertificationHostResult>> {
    return this.#job?.terminal ?? Promise.resolve(this.#result('ready'))
  }

  async confirmDurableReadmission(): Promise<Readonly<Stage7V2CertificationHostResult>> {
    if (this.#job !== null) return this.#result('busy')
    try {
      await this.#writerLeases.runExclusive(async () => this.#requireFreshDurable())
    } catch (error) {
      return this.#mutationFailure(error)
    }
    if (this.snapshot().state.timeline.lastSuspendedAtLegacyText !== null) {
      this.#returnedTimeReady = false
      return this.#result('returned-time-required')
    }
    this.#returnedTimeReady = true
    return this.#result('ready')
  }

  async returnFromSuspension(
    request: Omit<Readonly<CanonicalReturnV2Request>, 'persist'>,
  ): Promise<Readonly<Stage7V2CertificationHostResult>> {
    if (this.#job !== null) return this.#result('busy')
    try {
      return await this.#writerLeases.runExclusive(async () => {
        await this.#requireFreshDurable()
        const result = await this.#lifecycle.returnFromSuspension(Object.freeze({
          ...request,
          persist: async (candidate: Readonly<CanonicalRuntimePersistenceCandidateV2>) => {
            await this.#checkpointPublication(candidate)
            return Object.freeze({ committed: true as const })
          },
        }))
        if (result.status !== 'completed' || !result.persisted) {
          return this.#result(
            result.status === 'persistence-failed' ? 'indeterminate' : 'resumable-failure',
            result.error,
          )
        }
        this.#returnedTimeReady = true
        return this.#result('ready')
      })
    } catch (error) {
      return this.#mutationFailure(error)
    }
  }

  async startStoredTime(
    request: Readonly<Stage7V2StoredTimeStartRequest>,
  ): Promise<Readonly<Stage7V2CertificationHostResult>> {
    if (!this.#returnedTimeReady) return this.#result('returned-time-required')
    if (this.#job !== null || this.#jobTask !== null) return this.#result('busy')
    this.#lastStartRequest = null
    let resolveStarted!: (value: Readonly<Stage7V2CertificationHostResult>) => void
    const started = new Promise<Readonly<Stage7V2CertificationHostResult>>((resolve) => {
      resolveStarted = resolve
    })
    this.#publishDiagnostics(Object.freeze({
      ...EMPTY_DIAGNOSTICS,
      status: 'busy',
      requestedSeconds: request.requestedDurationSeconds,
      remainingSeconds: request.requestedDurationSeconds,
      unconsumedFromDurableCheckpointSeconds: request.requestedDurationSeconds,
    }))
    this.#jobTask = this.#writerLeases.runExclusive(async (lease) => {
      this.#currentFence = lease
      let startResult: Readonly<Stage7V2CertificationHostResult> | null = null
      try {
        await this.#requireFreshDurable()
        startResult = await this.#openJob(request)
        resolveStarted(startResult)
        if (startResult.status !== 'started' || this.#job === null) {
          this.#publishDiagnostics(Object.freeze({
            ...this.#diagnostics,
            status: startResult.status,
            retryAvailable: this.#lastStartRequest !== null &&
              (startResult.status === 'resumable-failure' || startResult.status === 'indeterminate'),
            reloadRequired: startResult.status === 'reload-required',
            message: startResult.error === undefined ? null : boundedDiagnosticMessage(startResult.error),
          }))
          return
        }
        await this.#job.terminal
      } catch (error) {
        const failure = this.#mutationFailure(error)
        this.#publishDiagnostics(Object.freeze({
          ...this.#diagnostics,
          status: failure.status,
          retryAvailable: this.#lastStartRequest !== null &&
            (failure.status === 'resumable-failure' || failure.status === 'indeterminate'),
          reloadRequired: failure.status === 'reload-required',
          message: failure.error === undefined ? null : boundedDiagnosticMessage(failure.error),
        }))
        resolveStarted(failure)
      } finally {
        this.#job?.terminate()
        this.#job = null
        this.#currentFence = null
      }
    }).catch((error) => {
      const failure = this.#leaseFailure(error)
      this.#publishDiagnostics(Object.freeze({
        ...this.#diagnostics,
        status: failure.status,
        retryAvailable: this.#lastStartRequest !== null &&
          (failure.status === 'resumable-failure' || failure.status === 'indeterminate'),
        reloadRequired: failure.status === 'reload-required',
        message: failure.error === undefined ? null : boundedDiagnosticMessage(failure.error),
      }))
      resolveStarted(failure)
    }).finally(() => {
      this.#jobTask = null
    })
    return started
  }

  async retryStoredTime(): Promise<Readonly<Stage7V2CertificationHostResult>> {
    const retryRequest = this.#lastStartRequest
    if (retryRequest === null) {
      return this.#result('resumable-failure', 'No Stored Time retry is available.')
    }
    const result = await this.startStoredTime(Object.freeze({
      ...retryRequest,
      expectedRevision: this.snapshot().revision,
    }))
    if ((result.status === 'resumable-failure' || result.status === 'indeterminate') &&
      this.#lastStartRequest === null) {
      this.#lastStartRequest = retryRequest
      this.#publishDiagnostics(Object.freeze({
        ...this.#diagnostics,
        retryAvailable: true,
      }))
    }
    return result
  }

  async pauseForLifecycle(
    reason: 'browser-hidden' | 'native-background' | 'host-suspending',
    foregroundResidueSeconds = 0,
  ): Promise<Readonly<Stage7V2CertificationHostResult>> {
    const job = this.#job
    if (job === null) {
      try {
        return await this.#writerLeases.runExclusive(async () => {
          await this.#requireFreshDurable()
          if (this.snapshot().state.timeline.lastSuspendedAtLegacyText === null) {
            await this.#suspendAtDurableBoundary(foregroundResidueSeconds)
          } else {
            this.#returnedTimeReady = false
          }
          return this.#result('paused', undefined, false)
        })
      } catch (error) {
        return this.#mutationFailure(error)
      }
    }
    return this.#pauseActiveJob(job, reason, true)
  }

  async writeStoredTimePolicy(policyId: StoredTimePolicyIdV2): Promise<void> {
    await this.runDeveloperTransaction(async () => {
      await this.#repository.writeStoredTimePolicy(policyId)
    })
  }

  async importPortable(portableSave: string): Promise<Readonly<Stage7V2CertificationHostResult>> {
    if (this.#job !== null) return this.#result('busy')
    try {
      return await this.#writerLeases.runExclusive(async () => {
        await this.#requireFreshDurable()
        const imported = await this.#repository.importPortable(portableSave, this.#platform)
        const decoded = decodeSchema13WebSave(imported.portableSave)
        this.#adopt(Object.freeze({ revision: imported.revision, state: decoded.state, runtime: decoded.runtime }))
        this.#platform = imported.platform
        await this.#repository.clearStoredTimeJobRecord()
        this.#returnedTimeReady = decoded.state.timeline.lastSuspendedAtLegacyText === null
        return this.#result(this.#returnedTimeReady ? 'ready' : 'returned-time-required')
      })
    } catch (error) {
      return this.#mutationFailure(error)
    }
  }

  async cleanupCertificationStorage(): Promise<Readonly<Stage7V2CertificationHostResult>> {
    if (this.#job !== null) return this.#result('busy')
    try {
      return await this.#writerLeases.runExclusive(async () => {
        await this.#requireFreshDurable()
        await this.#repository.cleanup()
        this.#returnedTimeReady = false
        return this.#result('ready')
      })
    } catch (error) {
      return this.#mutationFailure(error)
    }
  }

  async cancelStoredTime(): Promise<Readonly<Stage7V2CertificationHostResult>> {
    const job = this.#job
    if (job === null) return this.#result('ready')
    const control = await job.authority.cancel(Object.freeze({
      expectedRevision: job.authority.snapshot().revision,
    }))
    if (control.message !== null) postStoredTimeWorkerMainFrameV2(job.worker, control.message)
    return this.#awaitTerminal(job)
  }

  pauseStoredTime(): Promise<Readonly<Stage7V2CertificationHostResult>> {
    const job = this.#job
    return job === null
      ? Promise.resolve(this.#result('ready'))
      : this.#pauseActiveJob(job, 'host-suspending', false)
  }

  requestTerminationBestEffort(
    reason: 'browser-hidden' | 'native-background' | 'host-suspending',
  ): void {
    void this.pauseForLifecycle(reason).catch(() => undefined)
  }

  async runDeveloperTransaction<T>(operation: () => Promise<T>): Promise<T> {
    const activeJobTask = this.#jobTask
    if (this.#job !== null) {
      const paused = await this.#pauseActiveJob(this.#job, 'host-suspending', false)
      if (paused.status !== 'paused' && paused.status !== 'ready') {
        throw new Error('Stored Time did not reach a durable pause boundary.')
      }
    }
    if (activeJobTask !== null) await activeJobTask
    return this.#writerLeases.runExclusive(async () => {
      await this.#requireFreshDurable()
      return operation()
    })
  }

  async purchaseOrEnableDeveloperOptions(): Promise<Readonly<DeveloperOptionsCommitV2>> {
    return this.runDeveloperTransaction(async () => {
      const source = this.snapshot()
      const platform = Object.freeze({
        developerOptionsPurchased: this.#platform.debugEverEnabled,
        developerOptionsEnabled: this.#platform.debugOptions,
      })
      const port = Object.freeze({
        invalidateAndBlockStoredTimeJob: (expectedRevision: number): boolean =>
          this.#job === null && expectedRevision === this.snapshot().revision,
        persist: async (candidate: Readonly<DeveloperOptionsPersistenceCandidateV2>) => {
          await this.#checkpointDeveloperCandidate(candidate)
        },
        readBack: async (): Promise<Readonly<DeveloperOptionsPersistenceCandidateV2> | null> => {
          const durable = await this.#repository.loadCurrent()
          if (durable === null) return null
          return Object.freeze({
            kind: 'developer-options-persistence-candidate-v2' as const,
            revision: durable.revision,
            state: durable.save.state,
            runtime: durable.save.runtime,
            platform: Object.freeze({
              developerOptionsPurchased: durable.platform.debugEverEnabled,
              developerOptionsEnabled: durable.platform.debugOptions,
            }),
          })
        },
        releaseStoredTimeBlock: (): void => undefined,
      })
      const owner = new DeveloperOptionsTransactionOwnerV2(
        Object.freeze({ revision: source.revision, state: source.state, runtime: source.runtime, platform }),
        registerDeveloperOptionsReceiverAuthorityV2(platform, port),
      )
      const committed = await owner.commit(owner.quote(Object.freeze({
        kind: 'purchase-developer-options' as const,
      })))
      if (committed.changed) {
        this.#platform = Object.freeze({
          ...this.#platform,
          debugOptions: committed.publication.platform.developerOptionsEnabled,
          debugEverEnabled: committed.publication.platform.developerOptionsPurchased,
        })
        this.#adopt(Object.freeze({
          revision: committed.publication.revision,
          state: committed.publication.state,
          runtime: committed.publication.runtime,
        }))
      }
      return committed
    })
  }

  async #openJob(
    request: Readonly<Stage7V2StoredTimeStartRequest>,
  ): Promise<Readonly<Stage7V2CertificationHostResult>> {
    const loaded = await this.#loadLauncher()
    if (loaded.status !== 'launcher-ready') {
      return this.#result('resumable-failure', loaded.reason)
    }
    const launched = await loaded.launcher.start()
    if (launched.status !== 'ready') {
      loaded.launcher.terminate()
      return this.#result('resumable-failure', launched.reason)
    }
    const ready = Object.freeze({
      type: 'ready' as const,
      ...launched.ready,
      supportedPolicies: Object.freeze([
        Object.freeze({ id: 'stored-time-fast-v1' as const, version: 1 as const }),
        Object.freeze({ id: 'stored-time-balanced-v1' as const, version: 1 as const }),
        Object.freeze({ id: 'stored-time-exact-v1' as const, version: 1 as const }),
      ] as const),
      capabilities: Object.freeze({
        moduleWorker: true as const,
        transferableArrayBuffer: true as const,
        sharedArrayBuffer: false as const,
      }),
    })
    const authority = new StoredTimeJobAuthorityV2(Object.freeze({
      initialPublication: this.snapshot(),
      ready,
      expectedIdentity: Object.freeze({
        buildId: ready.buildId,
        catalogHash: ready.catalogHash,
        tuningHash: ready.tuningHash,
      }),
      infinityRewardAuthority: this.#infinityRewardAuthority,
      repository: Object.freeze({
        read: () => this.#repository.readStoredTimeJobRecord(),
        persist: async (record: Readonly<StoredTimeCheckpointRecordV2>) => {
          try {
            await this.#repository.persistStoredTimeJobRecord(record)
            return Object.freeze({ status: 'committed' as const })
          } catch {
            return Object.freeze({ status: 'definite-failure' as const })
          }
        },
      }),
      captureWriterFence: () => this.#currentFence,
    }))
    const recovered = await authority.recoverDurableCheckpoint()
    const policyId = await this.#repository.readStoredTimePolicy()
    const admission = recovered.status === 'recovered' && recovered.start !== null
      ? recovered
      : await authority.admit(Object.freeze({
          expectedRevision: request.expectedRevision,
          policyId,
          policyVersion: 1 as const,
          requestedDurationSeconds: request.requestedDurationSeconds,
          ...(request.queuedInputs === undefined ? {} : { queuedInputs: request.queuedInputs }),
        }))
    if (admission.start === null || admission.start.type !== 'start') {
      loaded.launcher.terminate()
      return this.#result(
        admission.status === 'indeterminate' ? 'indeterminate' : 'resumable-failure',
        admission.error ?? `Stored Time admission ended as ${admission.status}.`,
      )
    }
    this.#lastStartRequest = Object.freeze({
      expectedRevision: this.snapshot().revision,
      requestedDurationSeconds: admission.start.requestedDurationSeconds,
      queuedInputs: admission.start.queuedInputs,
    })
    let finish!: (result: Stage7V2CertificationHostResult) => void
    const terminal = new Promise<Stage7V2CertificationHostResult>((resolve) => {
      finish = resolve
    })
    const job: ActiveJob = {
      authority,
      worker: launched.worker,
      terminate: loaded.launcher.terminate.bind(loaded.launcher),
      terminal,
      finish,
      originRevision: this.snapshot().revision,
      identity: Object.freeze({
        jobId: admission.start.jobId,
        protocolVersion: admission.start.protocolVersion,
        workerInstanceNonce: admission.start.workerInstanceNonce,
        originRevision: admission.start.originRevision,
        policyId: admission.start.policyId,
        policyVersion: admission.start.policyVersion,
      }),
      messageTail: Promise.resolve(),
      acknowledgedBaseRevision: admission.start.acknowledgedBaseRevision,
      checkpointSequence: admission.start.checkpointSequence,
      lastProgress: null,
      settled: false,
      suspendOnPause: false,
    }
    this.#job = job
    this.#publishDiagnostics(Object.freeze({
      ...this.#diagnostics,
      status: 'started',
    }))
    launched.worker.addEventListener('message', (event) => {
      job.messageTail = job.messageTail.then(() => this.#handleWorkerMessage(job, event.data))
        .catch(async (error) => {
          this.#finishJob(job, 'resumable-failure', message(error))
        })
    })
    launched.worker.addEventListener('error', () => {
      job.messageTail = job.messageTail.then(() => {
        this.#finishJob(job, 'resumable-failure', 'Stored Time worker crashed.')
      })
    })
    postStoredTimeWorkerMainFrameV2(launched.worker, admission.start)
    return this.#result('started')
  }

  async #handleWorkerMessage(job: ActiveJob, frame: unknown): Promise<void> {
    if (job.settled) return
    const value = decodeStoredTimeWorkerFrameMessageV2(frame)
    if (value.type === 'progress') {
      this.#acceptProgress(job, value, 'live')
      return
    }
    if (value.type === 'ready') return
    if (value.type === 'cancelled' || value.type === 'paused' || value.type === 'failed') {
      if (!job.authority.acknowledgeWorkerTerminal(value)) {
        this.#finishJob(job, 'indeterminate', 'Worker terminal did not match its durable boundary.')
        return
      }
      this.#acceptProgress(job, value, 'terminal')
      this.#adopt(job.authority.snapshot())
      if (value.type === 'paused' && job.suspendOnPause) {
        await this.#suspendAtDurableBoundary()
      } else {
        await this.#checkpointPublication(job.authority.snapshot())
      }
      if (value.type !== 'failed') await this.#repository.clearStoredTimeJobRecord()
      this.#finishJob(
        job,
        value.type === 'cancelled' ? 'cancelled' : value.type === 'paused' ? 'paused' : 'resumable-failure',
      )
      return
    }
    const committed = await job.authority.commitCandidate(value)
    if (committed.status === 'indeterminate' || committed.status === 'rejected') {
      this.#finishJob(job, 'indeterminate', committed.error)
      return
    }
    if (committed.status === 'retryable-failure' || committed.status === 'busy') {
      this.#finishJob(
        job,
        'resumable-failure',
        committed.error ?? `Stored Time candidate commit ended as ${committed.status}.`,
      )
      return
    }
    if (committed.status.startsWith('committed')) {
      this.#acceptProgress(
        job,
        value,
        value.type === 'checkpoint-candidate' || value.type === 'completed'
          ? 'durable'
          : 'live',
      )
      await this.#checkpointPublication(committed.publication)
      this.#adopt(committed.publication)
      if (value.type === 'checkpoint-candidate' || value.type === 'completed') {
        this.#publishDiagnostics(Object.freeze({
          ...this.#diagnostics,
          durableSeconds: this.#diagnostics.processedSeconds,
          unconsumedFromDurableCheckpointSeconds: Math.max(
            0,
            this.#diagnostics.requestedSeconds - this.#diagnostics.processedSeconds,
          ),
        }))
      }
      if (value.type === 'checkpoint-candidate') {
        this.#publishDiagnostics(Object.freeze({
          ...this.#diagnostics,
          checkpoints: Math.min(Number.MAX_SAFE_INTEGER, this.#diagnostics.checkpoints + 1),
        }))
      }
    }
    if (committed.acknowledgement !== null) {
      if (committed.acknowledgement.type === 'checkpoint-committed') {
        job.checkpointSequence = committed.acknowledgement.checkpointSequence
        job.acknowledgedBaseRevision = committed.acknowledgement.acknowledgedBaseRevision
      }
      postStoredTimeWorkerMainFrameV2(job.worker, committed.acknowledgement)
    }
    if (committed.terminalControl !== null) {
      postStoredTimeWorkerMainFrameV2(job.worker, committed.terminalControl)
    }
    if (value.type === 'completed' && committed.status === 'committed') {
      await this.#repository.clearStoredTimeJobRecord()
      this.#finishJob(job, 'completed')
    }
  }

  async #checkpointPublication(
    publication: Readonly<StoredTimeAuthorityPublicationV2>,
  ): Promise<void> {
    const savedAtUtc = this.#nowUtc()
    const source = Object.freeze({
      savedAtUtc,
      state: publication.state,
      runtime: publication.runtime,
    })
    try {
      await this.#repository.checkpoint(source, this.#platform, publication.revision)
    } catch {
      // A replace can commit before its caller observes an exception. Exact
      // readback below reconciles that ambiguous outcome before any worker ack.
    }
    const readBack = await this.#repository.loadCurrent()
    if (readBack === null || readBack.revision !== publication.revision ||
      encodeSchema13WebSave(readBack.save) !== encodeSchema13WebSave(source) ||
      !samePlatform(readBack.platform, this.#platform)) {
      throw new Error('Stage 7 publication readback did not match before acknowledgement.')
    }
  }

  async #suspendAtDurableBoundary(foregroundResidueSeconds = 0): Promise<void> {
    const publication = this.snapshot()
    const savedAtUtc = this.#nowUtc()
    const result = await this.#lifecycle.suspend(Object.freeze({
      expectedRevision: publication.revision,
      foregroundResidueSeconds,
      legacyUtcText: savedAtUtc,
      savedAtUtc,
      context: Object.freeze({
        automationIntervalSeconds: 0.1,
        timerAggregationAuthority: null,
        quantumEpochAuthority: null,
        dormantDueEvents: CANONICAL_V2_NO_DORMANT_DUE_EVENTS,
        catalogLookup: null,
        infinityRewardAuthority: this.#infinityRewardAuthority,
      }),
      persist: async (candidate: Readonly<CanonicalRuntimePersistenceCandidateV2>) => {
        await this.#checkpointPublication(candidate)
        return Object.freeze({ committed: true as const })
      },
    }))
    if (result.status !== 'completed' || !result.persisted) {
      throw new Error(result.error ?? `Stage 7 suspension ended as ${result.status}.`)
    }
    this.#returnedTimeReady = false
  }

  async #checkpointDeveloperCandidate(
    candidate: Readonly<DeveloperOptionsPersistenceCandidateV2>,
  ): Promise<void> {
    const savedAtUtc = this.#nowUtc()
    const platform = Object.freeze({
      ...this.#platform,
      debugOptions: candidate.platform.developerOptionsEnabled,
      debugEverEnabled: candidate.platform.developerOptionsPurchased,
    })
    await this.#repository.checkpoint(Object.freeze({
      savedAtUtc,
      state: candidate.state,
      runtime: candidate.runtime,
    }), platform, candidate.revision)
  }

  #adopt(publication: Readonly<StoredTimeAuthorityPublicationV2>): void {
    this.#lifecycle = new CanonicalLifecycleCoordinatorV2(publication)
  }

  #finishJob(
    job: ActiveJob,
    status: Stage7V2CertificationHostStatus,
    error?: string,
  ): void {
    if (job.settled) return
    job.settled = true
    job.terminate()
    const retryAvailable = this.#lastStartRequest !== null &&
      (status === 'resumable-failure' || status === 'indeterminate')
    if (!retryAvailable) this.#lastStartRequest = null
    this.#publishDiagnostics(Object.freeze({
      ...this.#diagnostics,
      status,
      retryAvailable,
      reloadRequired: status === 'reload-required',
      message: error === undefined ? null : boundedDiagnosticMessage(error),
      cancelRemainingAvailable: false,
    }))
    job.finish(this.#result(
      status,
      error,
      job.authority.snapshot().revision === job.originRevision,
    ))
  }

  #acceptProgress(
    job: ActiveJob,
    message: Readonly<{
      readonly jobId: string
      readonly protocolVersion: 1
      readonly workerInstanceNonce: string
      readonly originRevision: number
      readonly acknowledgedBaseRevision: number
      readonly policyId: StoredTimePolicyIdV2
      readonly policyVersion: 1
      readonly checkpointSequence: number
      readonly progress: Readonly<StoredTimeWorkerProgressDtoV2>
      readonly type: string
    }>,
    mode: 'live' | 'durable' | 'terminal',
  ): boolean {
    const progress = message.progress
    const expectedSequence = message.type === 'checkpoint-candidate' || message.type === 'completed'
      ? job.checkpointSequence + 1
      : job.checkpointSequence
    const prior = job.lastProgress
    if (message.protocolVersion !== job.identity.protocolVersion ||
      message.jobId !== job.identity.jobId ||
      message.workerInstanceNonce !== job.identity.workerInstanceNonce ||
      message.originRevision !== job.identity.originRevision ||
      message.acknowledgedBaseRevision !== job.acknowledgedBaseRevision ||
      message.policyId !== job.identity.policyId ||
      message.policyVersion !== job.identity.policyVersion ||
      message.checkpointSequence !== expectedSequence ||
      progress.computedSeconds > this.#diagnostics.requestedSeconds ||
      progress.durableSeconds > progress.computedSeconds ||
      (prior !== null && (
        progress.computedSeconds < (mode === 'terminal'
          ? prior.durableSeconds
          : prior.computedSeconds) ||
        progress.durableSeconds < prior.durableSeconds ||
        BigInt(progress.computedRawTicks) < BigInt(
          mode === 'terminal' ? prior.durableRawTicks : prior.computedRawTicks,
        ) ||
        BigInt(progress.durableRawTicks) < BigInt(prior.durableRawTicks) ||
        progress.representativeGroups < prior.representativeGroups ||
        progress.elapsedWallMilliseconds < prior.elapsedWallMilliseconds
      ))) return false
    job.lastProgress = progress
    const requested = this.#diagnostics.requestedSeconds
    const processed = Math.min(requested, progress.computedSeconds)
    const durable = mode === 'durable'
      ? processed
      : mode === 'terminal'
        ? Math.min(requested, progress.durableSeconds)
        : this.#diagnostics.durableSeconds
    const elapsed = progress.elapsedWallMilliseconds
    const predicted = progress.etaMilliseconds === null
      ? null
      : Math.min(Number.MAX_VALUE, elapsed + progress.etaMilliseconds)
    this.#publishDiagnostics(Object.freeze({
      ...this.#diagnostics,
      status: 'started',
      processedSeconds: processed,
      computedRawTicks: progress.computedRawTicks,
      representativeGroups: progress.representativeGroups,
      durableSeconds: durable,
      remainingSeconds: Math.max(0, requested - processed),
      unconsumedFromDurableCheckpointSeconds: Math.max(0, requested - durable),
      progress: requested > 0 ? processed / requested : 0,
      elapsedMilliseconds: elapsed,
      etaMilliseconds: progress.etaMilliseconds,
      predictedTotalMilliseconds: predicted,
      maximumChunkMilliseconds: Math.max(
        this.#diagnostics.maximumChunkMilliseconds,
        progress.maximumChunkMilliseconds,
      ),
      maximumAtomicEventMilliseconds: Math.max(
        this.#diagnostics.maximumAtomicEventMilliseconds,
        progress.maximumAtomicEventMilliseconds,
      ),
      cancelRemainingAvailable: mode === 'terminal' ? false : elapsed >= 5_000,
      retryAvailable: false,
      reloadRequired: false,
      message: progress.warmingUp ? 'Estimating remaining time.' : null,
    }))
    return true
  }

  #publishDiagnostics(diagnostics: Readonly<Stage7V2CertificationDiagnostics>): void {
    this.#diagnostics = diagnostics
    for (const listener of this.#diagnosticsListeners) {
      try {
        listener(diagnostics)
      } catch {
        // Diagnostics are observational and cannot influence authority work.
      }
    }
  }

  async #awaitTerminal(job: ActiveJob): Promise<Readonly<Stage7V2CertificationHostResult>> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.#finishJob(
          job,
          'resumable-failure',
          'Stored Time worker did not reach a durable terminal boundary.',
        )
        void job.terminal.then(resolve)
      }, this.#terminalTimeoutMilliseconds)
      void job.terminal.then((result) => {
        clearTimeout(timeout)
        resolve(result)
      })
    })
  }

  #pauseActiveJob(
    job: ActiveJob,
    reason: 'browser-hidden' | 'native-background' | 'host-suspending',
    suspendOnPause: boolean,
  ): Promise<Readonly<Stage7V2CertificationHostResult>> {
    job.suspendOnPause ||= suspendOnPause
    const control = job.authority.requestLifecyclePause(
      Object.freeze({ expectedRevision: job.authority.snapshot().revision }),
      reason,
    )
    if (control.message !== null) postStoredTimeWorkerMainFrameV2(job.worker, control.message)
    return this.#awaitTerminal(job)
  }

  #leaseFailure(error: unknown): Readonly<Stage7V2CertificationHostResult> {
    return error instanceof Stage7V2WriterLeaseUnavailableError
      ? this.#result('writer-unavailable')
      : this.#result('indeterminate', message(error))
  }

  #mutationFailure(error: unknown): Readonly<Stage7V2CertificationHostResult> {
    return error instanceof Stage7V2HostReloadRequiredError
      ? this.#result('reload-required', error.message)
      : this.#leaseFailure(error)
  }

  async #requireFreshDurable(): Promise<void> {
    const durable = await this.#repository.loadCurrent()
    const publication = this.snapshot()
    if (durable === null || durable.revision !== publication.revision ||
      encodeSchema13WebSave(durable.save) !== encodeSchema13WebSave({
        savedAtUtc: durable.save.savedAtUtc,
        state: publication.state,
        runtime: publication.runtime,
      }) || !samePlatform(durable.platform, this.#platform)) {
      throw new Stage7V2HostReloadRequiredError()
    }
  }

  #result(
    status: Stage7V2CertificationHostStatus,
    error?: string,
    storedTimeUntouched?: boolean,
  ): Readonly<Stage7V2CertificationHostResult> {
    return Object.freeze({
      status,
      publication: this.snapshot(),
      storedTimeUntouched: storedTimeUntouched ?? (status === 'returned-time-required' ||
        status === 'writer-unavailable' || status === 'reload-required' ||
        status === 'resumable-failure'),
      ...(error === undefined ? {} : { error }),
    })
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function boundedDiagnosticMessage(value: string): string {
  const normalized = Array.from(value, (character) => {
    const code = character.charCodeAt(0)
    return code <= 31 || code === 127 ? ' ' : character
  }).join('').trim()
  return normalized.length <= 160 ? normalized : `${normalized.slice(0, 157)}...`
}

function samePlatform(
  left: Readonly<Schema13PlatformState>,
  right: Readonly<Schema13PlatformState>,
): boolean {
  return left.debugOptions === right.debugOptions &&
    left.debugEverEnabled === right.debugEverEnabled &&
    left.cheater === right.cheater &&
    left.unlockAllTabs === right.unlockAllTabs
}

function captureHostOptions(
  value: unknown,
): Readonly<Stage7V2CertificationHostOptions> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError('Stage 7 certification host options are invalid.')
  }
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value)
    const allowed = [
      'initialPublication', 'platform', 'repository', 'writerLeases',
      'infinityRewardAuthority', 'nowUtc', 'loadLauncher', 'terminalTimeoutMilliseconds',
    ] as const
    const required = allowed.slice(0, 6)
    const keys = Reflect.ownKeys(descriptors)
    if (keys.some((key) => typeof key !== 'string' || !allowed.includes(key as never)) ||
      required.some((key) => descriptors[key] === undefined)) throw new TypeError()
    const captured: Record<string, unknown> = {}
    for (const key of keys as string[]) {
      const descriptor = descriptors[key]
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
        throw new TypeError()
      }
      captured[key] = descriptor.value
    }
    if (typeof captured.nowUtc !== 'function' ||
      (captured.loadLauncher !== undefined && typeof captured.loadLauncher !== 'function')) {
      throw new TypeError()
    }
    return Object.freeze(captured) as unknown as Readonly<Stage7V2CertificationHostOptions>
  } catch {
    throw new TypeError('Stage 7 certification host options are invalid.')
  }
}
const FOREGROUND_PUBLICATION_AUTHORITY =
  registerCanonicalRuntimeApplicationAuthorityV2()
