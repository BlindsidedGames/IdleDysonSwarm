import type { PreparedSave } from './prepare'
import type {
  Schema13PlatformState,
  Schema13WebSaveSource,
} from './schema13'
import {
  ProductionV2SaveRepository,
  type ProductionV2Checkpoint,
} from './productionV2Repository'
import type { V2GameRuntimeRepository } from '../inspection/v2GameRuntime'
import type { StoredTimePolicyIdV2 } from '../simulation/storedTimePolicyV2'
import { encodeSchema13WebSave } from './schema13'

export interface ProductionV2RuntimeRepositoryOptions {
  readonly repository: Readonly<ProductionV2SaveRepository>
  readonly nowUtc: () => string
  readonly createFirstRunSave: () => PreparedSave
}

/** Adapts the production migration repository to the V2 gameplay runtime. */
export class ProductionV2RuntimeRepository
implements V2GameRuntimeRepository {
  readonly #repository: Readonly<ProductionV2SaveRepository>
  readonly #nowUtc: () => string
  readonly #createFirstRunSave: () => PreparedSave
  #current: Readonly<ProductionV2Checkpoint> | null = null
  #encoder: Schema13WorkerEncoder | null = null

  constructor(options: Readonly<ProductionV2RuntimeRepositoryOptions>) {
    this.#repository = options.repository
    this.#nowUtc = options.nowUtc
    this.#createFirstRunSave = options.createFirstRunSave
  }

  async recoverNewestValid() {
    const opened = await this.#repository.openOrMigrate({
      observedAtUtc: this.#nowUtc(),
      createFirstRunSave: this.#createFirstRunSave,
    })
    this.#current = opened.checkpoint
    return Object.freeze({
      save: opened.save,
      platform: opened.checkpoint.platform,
      revision: opened.checkpoint.revision,
    })
  }

  async checkpointPrepared(
    source: Readonly<Schema13WebSaveSource>,
    platform: Readonly<Schema13PlatformState>,
    revision: number,
  ): Promise<void> {
    const current = this.#requireCurrent()
    this.#encoder ??= new Schema13WorkerEncoder()
    const portableSave = await this.#encoder.encode(source)
    this.#current = await this.#repository.checkpointPreparedPortable(
      portableSave,
      current.preferences,
      platform,
      revision,
    )
  }

  async checkpoint(
    source: Readonly<Schema13WebSaveSource>,
    platform: Readonly<Schema13PlatformState>,
    revision: number,
  ) {
    await this.checkpointPrepared(source, platform, revision)
    return this.#requireCurrent()
  }

  async loadCurrent() {
    const opened = await this.#repository.loadCurrent()
    if (opened === null) return null
    this.#current = opened.checkpoint
    return Object.freeze({
      save: opened.save,
      platform: opened.checkpoint.platform,
      revision: opened.checkpoint.revision,
    })
  }

  async importPortable(
    portableSave: string,
    _receivingPlatform: Readonly<Schema13PlatformState>,
  ) {
    this.#current = await this.#repository.importPortable(
      portableSave,
      this.#nowUtc(),
      this.#requireCurrent(),
    )
    return this.#current
  }

  exportPortable(): Promise<string | null> {
    return this.#repository.exportPortable()
  }

  exportRetainedImport(): Promise<string | null> {
    return this.#repository.exportImportedRecovery().then(
      (imported) => imported ?? this.#repository.exportPreMigrationRecovery(),
    )
  }

  readStoredTimePolicy(): Promise<StoredTimePolicyIdV2> {
    return this.#repository.readStoredTimePolicy()
  }

  writeStoredTimePolicy(policyId: StoredTimePolicyIdV2): Promise<void> {
    return this.#repository.writeStoredTimePolicy(policyId)
  }

  readStoredTimeJobRecord(): Promise<unknown | null> {
    return this.#repository.readStoredTimeJobRecord()
  }

  persistStoredTimeJobRecord(record: unknown): Promise<void> {
    return this.#repository.persistStoredTimeJobRecord(record)
  }

  clearStoredTimeJobRecord(): Promise<void> {
    return this.#repository.clearStoredTimeJobRecord()
  }

  async cleanup(): Promise<void> {
    throw new Error('Production V2 saves cannot be deleted by the inspection cleanup action.')
  }

  #requireCurrent(): Readonly<ProductionV2Checkpoint> {
    if (this.#current === null) {
      throw new Error('The production V2 repository has not been opened.')
    }
    return this.#current
  }
}

interface WorkerEncodeResponse {
  readonly id: number
  readonly portableSaveBlob?: Blob
  readonly error?: string
}

class Schema13WorkerEncoder {
  readonly #worker: Worker | null
  readonly #pending = new Map<number, Readonly<{
    resolve(value: string): void
    reject(reason: Error): void
  }>>()
  #nextId = 1

  constructor() {
    this.#worker = typeof Worker === 'function'
      ? new Worker(new URL('./schema13EncodeWorker.ts', import.meta.url), {
          type: 'module',
          name: 'schema-13-checkpoint-encoder',
        })
      : null
    if (this.#worker !== null) {
      this.#worker.onmessage = (event: MessageEvent<WorkerEncodeResponse>) => {
        const response = event.data
        const pending = this.#pending.get(response.id)
        if (pending === undefined) return
        this.#pending.delete(response.id)
        if (response.portableSaveBlob instanceof Blob) {
          void response.portableSaveBlob.text().then(
            pending.resolve,
            (error) => pending.reject(
              error instanceof Error ? error : new Error(String(error)),
            ),
          )
        } else {
          pending.reject(new Error(response.error ?? 'Schema-13 encode worker failed.'))
        }
      }
      this.#worker.onerror = () => {
        const error = new Error('Schema-13 encode worker failed.')
        for (const pending of this.#pending.values()) pending.reject(error)
        this.#pending.clear()
      }
    }
  }

  encode(source: Readonly<Schema13WebSaveSource>): Promise<string> {
    if (this.#worker === null) return Promise.resolve(encodeSchema13WebSave(source))
    const id = this.#nextId
    this.#nextId += 1
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject })
      this.#worker?.postMessage({ id, source })
    })
  }
}
