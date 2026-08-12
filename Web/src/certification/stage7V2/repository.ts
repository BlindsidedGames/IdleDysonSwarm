import {
  decodeSchema13WebSave,
  encodeSchema13WebSave,
  validateSchema13PlatformState,
  type DecodedSchema13WebSave,
  type Schema13PlatformState,
  type Schema13WebSaveSource,
} from '../../save/schema13'
import type { StoredTimePolicyIdV2 } from '../../simulation/storedTimePolicyV2'
import { captureCheckpointRecordV2 } from '../../workers/storedTimeV2/storedTimeJobAuthorityV2'
import {
  createStage7V2CertificationPaths,
  isStage7V2StoredTimePolicy,
  stage7V2CertificationCleanupPaths,
  STAGE7_V2_CERTIFICATION_DEFAULT_POLICY,
  STAGE7_V2_CERTIFICATION_MAXIMUM_TEXT_BYTES,
  type Stage7V2CertificationCheckpoint,
  type Stage7V2CertificationPaths,
  type Stage7V2CertificationStorage,
} from './contracts'

const CHECKPOINT_FORMAT = 'stage7-v2-certification-checkpoint-v1'
const POLICY_FORMAT = 'stage7-v2-certification-policy-v1'

export interface Stage7V2CertificationRepositoryOptions {
  readonly buildScope: string
  readonly storage: Readonly<Stage7V2CertificationStorage>
}

/**
 * Explicit dormant-only schema-13 repository. Construction performs no I/O and
 * every path remains below one build-scoped certification namespace.
 */
export class Stage7V2CertificationRepository {
  readonly #storage: Readonly<Stage7V2CertificationStorage>
  readonly #paths: Readonly<Stage7V2CertificationPaths>
  #mutationTail: Promise<void> = Promise.resolve()

  constructor(options: Readonly<Stage7V2CertificationRepositoryOptions>) {
    const captured = closedRecord(options, ['buildScope', 'storage'])
    if (typeof captured?.buildScope !== 'string') {
      throw new TypeError('Stage 7 certification repository options are invalid.')
    }
    this.#paths = createStage7V2CertificationPaths(captured.buildScope)
    this.#storage = captureStorage(captured.storage)
  }

  paths(): Readonly<Stage7V2CertificationPaths> {
    return this.#paths
  }

  async checkpoint(
    source: Readonly<Schema13WebSaveSource>,
    platform: Readonly<Schema13PlatformState>,
    revision = 0,
  ): Promise<Readonly<Stage7V2CertificationCheckpoint>> {
    return this.#mutate(() => this.#checkpoint(source, platform, revision))
  }

  /**
   * Trusted in-process publication path used by the dormant full-game
   * candidate. The schema encoder still validates the complete state and both
   * staged and committed bytes are read back exactly; decoding is deferred to
   * the next actual load instead of repeated during the same checkpoint.
   */
  async checkpointPrepared(
    source: Readonly<Schema13WebSaveSource>,
    platform: Readonly<Schema13PlatformState>,
    revision = 0,
  ): Promise<void> {
    return this.#mutate(async () => {
      const portableSave = encodeSchema13WebSave(source)
      const admittedPlatform = validateSchema13PlatformState(platform)
      const envelope = encodeCheckpoint(portableSave, admittedPlatform, revision)
      await this.#write(this.#paths.temporary, envelope)
      if (await this.#read(this.#paths.temporary) !== envelope) {
        throw new Error('Stage 7 prepared temporary readback did not match.')
      }
      await this.#rotateBackups()
      await this.#storage.replaceAtomically(
        this.#paths.temporary,
        this.#paths.current,
      )
      if (await this.#read(this.#paths.current) !== envelope) {
        throw new Error('Stage 7 prepared committed readback did not match.')
      }
    })
  }

  async #checkpoint(
    source: Readonly<Schema13WebSaveSource>,
    platform: Readonly<Schema13PlatformState>,
    revision: number,
  ): Promise<Readonly<Stage7V2CertificationCheckpoint>> {
    const portableSave = encodeSchema13WebSave(source)
    const admittedPlatform = validateSchema13PlatformState(platform)
    const envelope = encodeCheckpoint(portableSave, admittedPlatform, revision)
    await this.#write(this.#paths.temporary, envelope)
    const staged = decodeCheckpoint(
      await this.#read(this.#paths.temporary),
    )
    if (encodeCheckpoint(staged.portableSave, staged.platform, staged.revision) !== envelope) {
      throw new Error('Stage 7 certification temporary readback did not match.')
    }
    await this.#rotateBackups()
    await this.#storage.replaceAtomically(
      this.#paths.temporary,
      this.#paths.current,
    )
    const committed = decodeCheckpoint(
      await this.#read(this.#paths.current),
    )
    if (encodeCheckpoint(committed.portableSave, committed.platform, committed.revision) !== envelope) {
      throw new Error('Stage 7 certification committed readback did not match.')
    }
    return committed
  }

  async loadCurrent(): Promise<Readonly<{
    readonly save: Readonly<DecodedSchema13WebSave>
    readonly platform: Readonly<Schema13PlatformState>
    readonly revision: number
  }> | null> {
    if (!(await this.#storage.exists(this.#paths.current))) return null
    const checkpoint = decodeCheckpoint(await this.#read(this.#paths.current))
    return Object.freeze({
      save: decodeSchema13WebSave(checkpoint.portableSave),
      platform: checkpoint.platform,
      revision: checkpoint.revision,
    })
  }

  async recoverNewestValid(): Promise<Readonly<{
    readonly save: Readonly<DecodedSchema13WebSave>
    readonly platform: Readonly<Schema13PlatformState>
    readonly revision: number
    readonly sourcePath: string
  }> | null> {
    return this.#mutate(() => this.#recoverNewestValid())
  }

  async #recoverNewestValid(): Promise<Readonly<{
    readonly save: Readonly<DecodedSchema13WebSave>
    readonly platform: Readonly<Schema13PlatformState>
    readonly revision: number
    readonly sourcePath: string
  }> | null> {
    for (const sourcePath of [this.#paths.current, ...this.#paths.backups]) {
      if (!(await this.#storage.exists(sourcePath))) continue
      const raw = await this.#read(sourcePath)
      let checkpoint: Readonly<Stage7V2CertificationCheckpoint>
      let save: Readonly<DecodedSchema13WebSave>
      try {
        checkpoint = decodeCheckpoint(raw)
        save = decodeSchema13WebSave(checkpoint.portableSave)
      } catch {
        // A corrupt or forward-schema candidate cannot suppress an older valid
        // build-scoped backup. Nothing is overwritten until one fully decodes.
        continue
      }
      if (sourcePath !== this.#paths.current) {
        await this.#write(this.#paths.temporary, raw)
        await this.#storage.replaceAtomically(
          this.#paths.temporary,
          this.#paths.current,
        )
        const readBack = await this.#read(this.#paths.current)
        if (readBack !== raw) {
          throw new Error('Stage 7 certification recovery readback did not match.')
        }
      }
      return Object.freeze({ save, platform: checkpoint.platform, revision: checkpoint.revision, sourcePath })
    }
    return null
  }

  async importPortable(
    portableSave: string,
    receivingPlatform: Readonly<Schema13PlatformState>,
  ): Promise<Readonly<Stage7V2CertificationCheckpoint>> {
    return this.#mutate(async () => {
      assertBoundedText(portableSave)
      const decoded = decodeSchema13WebSave(portableSave)
      const platform = validateSchema13PlatformState(receivingPlatform)
      let retainImport = true
      if (await this.#storage.exists(this.#paths.recoveryImport)) {
        try {
          const retained = await this.#read(this.#paths.recoveryImport)
          const admitted = encodeSchema13WebSave(decodeSchema13WebSave(retained))
          if (admitted !== retained) throw new TypeError('Noncanonical retained import.')
          retainImport = false
        } catch {
          // Repair only through a verified temporary and atomic replacement.
        }
      }
      if (retainImport) {
        await this.#write(this.#paths.recoveryImportTemporary, portableSave)
        if (await this.#read(this.#paths.recoveryImportTemporary) !== portableSave) {
          throw new Error('Stage 7 certification retained import readback did not match.')
        }
        await this.#storage.replaceAtomically(
          this.#paths.recoveryImportTemporary,
          this.#paths.recoveryImport,
        )
        if (await this.#read(this.#paths.recoveryImport) !== portableSave) {
          throw new Error('Stage 7 certification retained import commit did not match.')
        }
      }
      return this.#checkpoint(decoded, platform, 0)
    })
  }

  async exportPortable(): Promise<string | null> {
    if (!(await this.#storage.exists(this.#paths.current))) return null
    const checkpoint = decodeCheckpoint(await this.#read(this.#paths.current))
    decodeSchema13WebSave(checkpoint.portableSave)
    return checkpoint.portableSave
  }

  async exportRetainedImport(): Promise<string | null> {
    return await this.#storage.exists(this.#paths.recoveryImport)
      ? this.#read(this.#paths.recoveryImport)
      : null
  }

  async readStoredTimePolicy(): Promise<StoredTimePolicyIdV2> {
    if (!(await this.#storage.exists(this.#paths.storedTimePolicy))) {
      return STAGE7_V2_CERTIFICATION_DEFAULT_POLICY
    }
    try {
      const parsed = JSON.parse(await this.#read(this.#paths.storedTimePolicy)) as unknown
      const record = closedRecord(parsed, ['format', 'policyId'])
      return record?.format === POLICY_FORMAT &&
        isStage7V2StoredTimePolicy(record.policyId)
        ? record.policyId
        : STAGE7_V2_CERTIFICATION_DEFAULT_POLICY
    } catch {
      return STAGE7_V2_CERTIFICATION_DEFAULT_POLICY
    }
  }

  async writeStoredTimePolicy(
    policyId: StoredTimePolicyIdV2,
  ): Promise<void> {
    if (!isStage7V2StoredTimePolicy(policyId)) {
      throw new TypeError('Stage 7 certification Stored Time policy is invalid.')
    }
    await this.#mutate(() => this.#write(
      this.#paths.storedTimePolicy,
      JSON.stringify({ format: POLICY_FORMAT, policyId }),
    ))
  }

  async readStoredTimeJobRecord(): Promise<unknown | null> {
    if (!(await this.#storage.exists(this.#paths.storedTimeJob))) return null
    return captureCheckpointRecordV2(
      JSON.parse(await this.#read(this.#paths.storedTimeJob)) as unknown,
    )
  }

  async persistStoredTimeJobRecord(record: unknown): Promise<void> {
    const text = JSON.stringify(captureCheckpointRecordV2(record))
    if (typeof text !== 'string') {
      throw new TypeError('Stage 7 Stored Time job record is not serializable.')
    }
    await this.#mutate(async () => {
      await this.#write(this.#paths.storedTimeJobTemporary, text)
      if (await this.#read(this.#paths.storedTimeJobTemporary) !== text) {
        throw new Error('Stage 7 Stored Time temporary readback did not match.')
      }
      await this.#storage.replaceAtomically(
        this.#paths.storedTimeJobTemporary,
        this.#paths.storedTimeJob,
      )
      if (await this.#read(this.#paths.storedTimeJob) !== text) {
        throw new Error('Stage 7 Stored Time committed readback did not match.')
      }
    })
  }

  async clearStoredTimeJobRecord(): Promise<void> {
    return this.#mutate(() => this.#storage.removeExactly(Object.freeze([
      this.#paths.storedTimeJob,
      this.#paths.storedTimeJobTemporary,
    ])))
  }

  async readEvidenceDraft(): Promise<string | null> {
    return await this.#storage.exists(this.#paths.evidenceDraft)
      ? this.#read(this.#paths.evidenceDraft)
      : null
  }

  async persistEvidenceDraft(text: string): Promise<void> {
    await this.#mutate(async () => {
      await this.#write(this.#paths.evidenceDraftTemporary, text)
      if (await this.#read(this.#paths.evidenceDraftTemporary) !== text) {
        throw new Error('Stage 7 evidence draft temporary readback did not match.')
      }
      await this.#storage.replaceAtomically(
        this.#paths.evidenceDraftTemporary,
        this.#paths.evidenceDraft,
      )
      if (await this.#read(this.#paths.evidenceDraft) !== text) {
        throw new Error('Stage 7 evidence draft committed readback did not match.')
      }
    })
  }

  cleanup(): Promise<void> {
    return this.#mutate(() => this.#storage.removeExactly(
      stage7V2CertificationCleanupPaths(this.#paths),
    ))
  }

  async #rotateBackups(): Promise<void> {
    const [latest, previous, oldest] = this.#paths.backups
    if (await this.#storage.exists(previous)) {
      await this.#storage.copy(previous, oldest)
    }
    if (await this.#storage.exists(latest)) {
      await this.#storage.copy(latest, previous)
    }
    if (await this.#storage.exists(this.#paths.current)) {
      await this.#storage.copy(this.#paths.current, latest)
    }
  }

  async #read(path: string): Promise<string> {
    const text = await this.#storage.readText(path)
    assertBoundedText(text)
    return text
  }

  async #write(path: string, text: string): Promise<void> {
    assertBoundedText(text)
    await this.#storage.writeText(path, text)
  }

  #mutate<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.#mutationTail.then(() =>
      this.#storage.withExclusiveMutation(operation))
    this.#mutationTail = run.then(() => undefined, () => undefined)
    return run
  }
}

function encodeCheckpoint(
  portableSave: string,
  platform: Readonly<Schema13PlatformState>,
  revision: number,
): string {
  assertBoundedText(portableSave)
  requireRevision(revision)
  return JSON.stringify({
    format: CHECKPOINT_FORMAT,
    revision,
    portableSave,
    platform: validateSchema13PlatformState(platform),
  })
}

function decodeCheckpoint(text: string): Readonly<Stage7V2CertificationCheckpoint> {
  assertBoundedText(text)
  const parsed = JSON.parse(text) as unknown
  const record = closedRecord(parsed, ['format', 'revision', 'portableSave', 'platform'])
  if (record?.format !== CHECKPOINT_FORMAT || typeof record.portableSave !== 'string') {
    throw new TypeError('Stage 7 certification checkpoint is invalid.')
  }
  const save = decodeSchema13WebSave(record.portableSave)
  const portableSave = encodeSchema13WebSave(save)
  if (portableSave !== record.portableSave) {
    throw new TypeError('Stage 7 certification checkpoint is not canonical.')
  }
  return Object.freeze({
    revision: requireRevision(record.revision),
    portableSave,
    platform: validateSchema13PlatformState(record.platform),
  })
}

function requireRevision(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 ||
    value === Number.MAX_SAFE_INTEGER || Object.is(value, -0)) {
    throw new TypeError('Stage 7 certification revision is invalid.')
  }
  return value
}

function assertBoundedText(text: unknown): asserts text is string {
  if (typeof text !== 'string') {
    throw new TypeError('Stage 7 certification text must be a string.')
  }
  if (boundedUtf8ByteLength(
    text,
    STAGE7_V2_CERTIFICATION_MAXIMUM_TEXT_BYTES,
  ) > STAGE7_V2_CERTIFICATION_MAXIMUM_TEXT_BYTES) {
    throw new RangeError('Stage 7 certification text exceeds 32 MiB.')
  }
}

function boundedUtf8ByteLength(text: string, limit: number): number {
  let bytes = 0
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff &&
      index + 1 < text.length &&
      text.charCodeAt(index + 1) >= 0xdc00 &&
      text.charCodeAt(index + 1) <= 0xdfff) {
      bytes += 4
      index += 1
    } else bytes += 3
    if (bytes > limit) return bytes
  }
  return bytes
}

function captureStorage(
  storage: unknown,
): Readonly<Stage7V2CertificationStorage> {
  if (storage === null || typeof storage !== 'object') {
    throw new TypeError('Stage 7 certification storage is invalid.')
  }
  const methods = [
    'exists', 'readText', 'writeText', 'replaceAtomically', 'copy', 'removeExactly',
    'withExclusiveMutation',
  ] as const
  const captured = Object.fromEntries(methods.map((method) =>
    [method, captureMethod(storage, method)])) as unknown as Stage7V2CertificationStorage
  return Object.freeze({
    exists: captured.exists,
    readText: captured.readText,
    writeText: captured.writeText,
    replaceAtomically: captured.replaceAtomically,
    copy: captured.copy,
    removeExactly: captured.removeExactly,
    withExclusiveMutation: captured.withExclusiveMutation,
  })
}

function captureMethod(object: object, key: PropertyKey): (...args: never[]) => unknown {
  try {
    let owner: object | null = object
    while (owner !== null) {
      const descriptor = Object.getOwnPropertyDescriptor(owner, key)
      if (descriptor !== undefined) {
        if (!('value' in descriptor) || typeof descriptor.value !== 'function') break
        return descriptor.value.bind(object) as (...args: never[]) => unknown
      }
      owner = Object.getPrototypeOf(owner) as object | null
    }
  } catch { /* hostile proxy */ }
  throw new TypeError('Stage 7 certification storage is invalid.')
}

function closedRecord(
  value: unknown,
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  try {
    if (value === null || typeof value !== 'object' || Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype) return null
    const descriptors = Object.getOwnPropertyDescriptors(value)
    const actual = Reflect.ownKeys(descriptors)
    if (actual.length !== keys.length ||
      actual.some((key) => typeof key !== 'string' || !keys.includes(key)) ||
      keys.some((key) => descriptors[key] === undefined ||
        !descriptors[key]!.enumerable || !('value' in descriptors[key]!))) return null
    return Object.freeze(Object.fromEntries(
      keys.map((key) => [key, descriptors[key]!.value]),
    ))
  } catch {
    return null
  }
}
