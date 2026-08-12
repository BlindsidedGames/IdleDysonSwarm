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
    this.#current = await this.#repository.checkpoint(
      source,
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
