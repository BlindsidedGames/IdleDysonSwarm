import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import {
  decodeSchema13WebSave,
  encodeSchema13WebSave,
  validateSchema13PlatformState,
  validateSchema13PresentationPreferences,
  type DecodedSchema13WebSave,
  type Schema13PlatformState,
  type Schema13PresentationPreferences,
  type Schema13WebSaveSource,
} from './schema13'
import { prepareImportedSaveText } from './import'
import type { PreparedSave } from './prepare'
import type { SaveStorageAdapter } from './repository'
import type { SaveRepositoryPaths } from './repository'
import type { LegacySaveCandidate } from './repository'
import type { StoredTimePolicyIdV2 } from '../simulation/storedTimePolicyV2'
import { captureCheckpointRecordV2 } from '../workers/storedTimeV2/storedTimeJobAuthorityV2'
import {
  sha256Utf8,
  type AutomaticUnityPathClass,
  type AutomaticUnityPlatform,
  type AutomaticUnityPurchaseEvidencePromoter,
} from './automaticPurchaseEvidence'

const CHECKPOINT_FORMAT = 'ids-web-production-v2-checkpoint-v1'
const STORED_TIME_POLICY_FORMAT = 'ids-web-production-v2-stored-time-policy-v1'
const STORED_TIME_JOB_FORMAT = 'ids-web-production-v2-stored-time-job-v1'
const STORED_TIME_JOB_CLEARED_FORMAT = 'ids-web-production-v2-stored-time-job-cleared-v1'
const DEFAULT_STORED_TIME_POLICY: StoredTimePolicyIdV2 = 'stored-time-fast-v1'
const MAXIMUM_TEXT_BYTES = 32 * 1024 * 1024

export interface ProductionV2RepositoryPaths {
  readonly current: string
  readonly temporary: string
  readonly backups: readonly [string, string, string]
  readonly preMigrationRecovery: string
  readonly preMigrationRecoveryTemporary: string
  readonly importedRecovery: string
  readonly importedRecoveryTemporary: string
  readonly storedTimePolicy: string
  readonly storedTimeJob: string
  readonly storedTimeJobTemporary: string
}

export function createProductionV2RepositoryPaths(
  legacy: Readonly<SaveRepositoryPaths>,
): Readonly<ProductionV2RepositoryPaths> {
  const current = requirePath(legacy.current, 'current')
  const temporary = requirePath(legacy.temporary, 'temporary')
  const slash = current.lastIndexOf('/')
  const directory = slash >= 0 ? current.slice(0, slash) : ''
  const at = (suffix: string) => directory.length === 0 ? suffix : `${directory}/${suffix}`
  const backups = legacy.backups ?? Object.freeze([
    at('backups/current.1.idsw'),
    at('backups/current.2.idsw'),
    at('backups/current.3.idsw'),
  ])
  return capturePaths(Object.freeze({
    current,
    temporary,
    backups,
    preMigrationRecovery: at('recovery/pre-schema13-original.idsw'),
    preMigrationRecoveryTemporary: at('recovery/pre-schema13-original.idsw.tmp'),
    importedRecovery: at('recovery/import-original.idsw'),
    importedRecoveryTemporary: at('recovery/import-original.idsw.tmp'),
    storedTimePolicy: at('local/stored-time-policy.json'),
    storedTimeJob: at('stored-time/job.json'),
    storedTimeJobTemporary: at('stored-time/job.json.tmp'),
  }))
}

export interface ProductionV2Checkpoint {
  readonly revision: number
  readonly portableSave: string
  readonly preferences: Readonly<Schema13PresentationPreferences>
  readonly platform: Readonly<Schema13PlatformState>
}

export interface OpenProductionV2Result {
  readonly checkpoint: Readonly<ProductionV2Checkpoint>
  readonly save: Readonly<DecodedSchema13WebSave>
  readonly source:
    | 'schema13'
    | 'recovered-schema13-backup'
    | 'migrated-current'
    | 'migrated-backup'
    | 'migrated-legacy'
    | 'first-run'
}

export interface OpenProductionV2Options {
  readonly observedAtUtc: string
  readonly createFirstRunSave: () => PreparedSave
}

/**
 * Schema-13 production repository. It deliberately accepts the existing raw
 * schema-12/IDB1 slot on first open, retains the exact source bytes, and only
 * then publishes one read-back-verified schema-13 checkpoint.
 *
 * Writer ownership and cross-tab/native serialization are supplied by the
 * host storage adapter. This class serializes its own calls as a second line of
 * defence but never attempts to create an independent writer identity.
 */
export class ProductionV2SaveRepository {
  readonly #storage: Readonly<SaveStorageAdapter>
  readonly #paths: Readonly<ProductionV2RepositoryPaths>
  readonly #automaticPurchaseEvidencePromoter:
    | Readonly<AutomaticUnityPurchaseEvidencePromoter>
    | undefined
  #mutationTail: Promise<void> = Promise.resolve()

  constructor(
    storage: Readonly<SaveStorageAdapter>,
    paths: Readonly<ProductionV2RepositoryPaths>,
    automaticPurchaseEvidencePromoter?:
      Readonly<AutomaticUnityPurchaseEvidencePromoter>,
  ) {
    this.#storage = captureStorage(storage)
    this.#paths = capturePaths(paths)
    this.#automaticPurchaseEvidencePromoter =
      captureAutomaticPurchaseEvidencePromoter(
        automaticPurchaseEvidencePromoter,
      )
  }

  async openOrMigrate(
    options: Readonly<OpenProductionV2Options>,
  ): Promise<Readonly<OpenProductionV2Result>> {
    const observedAtUtc = requireTimestamp(options.observedAtUtc)
    if (typeof options.createFirstRunSave !== 'function') {
      throw new TypeError('The V2 first-run save factory must be callable.')
    }
    return this.#mutate(async () => {
      const candidates = [this.#paths.current, ...this.#paths.backups]
      let sawCandidate = false
      for (let index = 0; index < candidates.length; index += 1) {
        const path = candidates[index]!
        if (!(await this.#storage.exists(path))) continue
        sawCandidate = true
        const text = await this.#read(path)
        let schema13Checkpoint: Readonly<ProductionV2Checkpoint> | null = null
        try {
          schema13Checkpoint = decodeCheckpoint(text)
        } catch {
          // The production slot before activation is a raw IDSWEB1/IDB1 save.
        }
        if (schema13Checkpoint !== null) {
          if (index === 0) return result(schema13Checkpoint, 'schema13')
          const decoded = decodeSchema13WebSave(schema13Checkpoint.portableSave)
          const restored = await this.#checkpoint(
            Object.freeze({
              savedAtUtc: decoded.savedAtUtc,
              state: decoded.state,
              runtime: decoded.runtime,
            }),
            schema13Checkpoint.preferences,
            schema13Checkpoint.platform,
            schema13Checkpoint.revision,
          )
          return result(restored, 'recovered-schema13-backup')
        }
        let prepared: PreparedSave
        try {
          prepared = prepareImportedSaveText(
            text,
            observedAtUtc,
            undefined,
            text.trim().toUpperCase().startsWith('IDB1:')
              ? { kind: 'automatic-unity-migration', observedAtUtc }
              : { kind: 'transitional-web-upgrade', upgradedAtUtc: observedAtUtc },
          )
        } catch {
          // A corrupt/forward candidate cannot suppress an older valid backup.
          continue
        }
        const migrated = migratePreparedSaveToV2(
          prepared,
          Object.freeze({ kind: 'trusted-same-device' }),
        )
        await this.#retainExactOnce(
          text,
          this.#paths.preMigrationRecoveryTemporary,
          this.#paths.preMigrationRecovery,
          (candidate) => {
            prepareImportedSaveText(
              candidate,
              observedAtUtc,
              undefined,
              candidate.trim().toUpperCase().startsWith('IDB1:')
                ? { kind: 'automatic-unity-migration', observedAtUtc }
                : { kind: 'transitional-web-upgrade', upgradedAtUtc: observedAtUtc },
            )
          },
        )
        const checkpoint = await this.#checkpoint(
          Object.freeze({
            savedAtUtc: observedAtUtc,
            state: migrated.state,
            runtime: migrated.runtime,
          }),
          migrated.localPreferences,
          migrated.localPlatformState,
          0,
        )
        return result(
          checkpoint,
          index === 0 ? 'migrated-current' : 'migrated-backup',
        )
      }

      if (sawCandidate) {
        throw new Error('No valid current or backup save could be migrated to schema 13.')
      }

      const legacyCandidates = await this.#storage.discoverLegacyCandidates()
      let sawLegacyCandidate = false
      for (const rawCandidate of legacyCandidates) {
        sawLegacyCandidate = true
        const candidate = captureLegacyCandidate(rawCandidate)
        let prepared: PreparedSave
        try {
          prepared = prepareImportedSaveText(
            candidate.text,
            observedAtUtc,
            undefined,
            candidate.provenance?.kind === 'automatic-same-device-unity'
              ? { kind: 'automatic-unity-migration', observedAtUtc }
              : { kind: 'manual-shared-import', importedAtUtc: observedAtUtc },
          )
        } catch {
          continue
        }
        const firstRunLocal = migratePreparedSaveToV2(
          options.createFirstRunSave(),
          Object.freeze({ kind: 'trusted-same-device' }),
        )
        const migrated = candidate.provenance?.kind === 'automatic-same-device-unity'
          ? migratePreparedSaveToV2(
              prepared,
              Object.freeze({ kind: 'trusted-same-device' }),
            )
          : migratePreparedSaveToV2(
              prepared,
              Object.freeze({
                kind: 'manual-shared-import',
                receivingPreferences: firstRunLocal.localPreferences,
                receivingPlatformState: firstRunLocal.localPlatformState,
              }),
            )
        await this.#retainExactOnce(
          candidate.text,
          this.#paths.preMigrationRecoveryTemporary,
          this.#paths.preMigrationRecovery,
          (text) => {
            prepareImportedSaveText(
              text,
              observedAtUtc,
              undefined,
              candidate.provenance?.kind === 'automatic-same-device-unity'
                ? { kind: 'automatic-unity-migration', observedAtUtc }
                : { kind: 'manual-shared-import', importedAtUtc: observedAtUtc },
            )
          },
        )
        await this.#promoteAutomaticPurchaseEvidence(candidate, prepared)
        const checkpoint = await this.#checkpoint(
          Object.freeze({
            savedAtUtc: observedAtUtc,
            state: migrated.state,
            runtime: migrated.runtime,
          }),
          migrated.localPreferences,
          migrated.localPlatformState,
          0,
        )
        return result(checkpoint, 'migrated-legacy')
      }
      if (sawLegacyCandidate) {
        throw new Error('No discovered legacy save could be migrated to schema 13.')
      }

      const migrated = migratePreparedSaveToV2(
        options.createFirstRunSave(),
        Object.freeze({ kind: 'trusted-same-device' }),
      )
      const checkpoint = await this.#checkpoint(
        Object.freeze({
          savedAtUtc: observedAtUtc,
          state: migrated.state,
          runtime: migrated.runtime,
        }),
        migrated.localPreferences,
        migrated.localPlatformState,
        0,
      )
      return result(checkpoint, 'first-run')
    })
  }

  async loadCurrent(): Promise<Readonly<OpenProductionV2Result> | null> {
    if (!(await this.#storage.exists(this.#paths.current))) return null
    return result(decodeCheckpoint(await this.#read(this.#paths.current)), 'schema13')
  }

  checkpoint(
    source: Readonly<Schema13WebSaveSource>,
    preferences: Readonly<Schema13PresentationPreferences>,
    platform: Readonly<Schema13PlatformState>,
    revision: number,
  ): Promise<Readonly<ProductionV2Checkpoint>> {
    return this.#mutate(() => this.#checkpoint(source, preferences, platform, revision))
  }

  async importPortable(
    text: string,
    importedAtUtc: string,
    receiving: Readonly<ProductionV2Checkpoint>,
  ): Promise<Readonly<ProductionV2Checkpoint>> {
    assertBoundedText(text)
    const timestamp = requireTimestamp(importedAtUtc)
    const receivingCheckpoint = decodeCheckpoint(encodeCheckpoint(receiving))
    return this.#mutate(async () => {
      let source: Readonly<Schema13WebSaveSource>
      try {
        const decoded = decodeSchema13WebSave(text)
        source = Object.freeze({
          savedAtUtc: timestamp,
          state: decoded.state,
          runtime: decoded.runtime,
        })
      } catch {
        const prepared = prepareImportedSaveText(
          text,
          timestamp,
          undefined,
          { kind: 'manual-shared-import', importedAtUtc: timestamp },
        )
        const migrated = migratePreparedSaveToV2(
          prepared,
          Object.freeze({
            kind: 'manual-shared-import',
            receivingPreferences: receivingCheckpoint.preferences,
            receivingPlatformState: receivingCheckpoint.platform,
          }),
        )
        source = Object.freeze({
          savedAtUtc: timestamp,
          state: migrated.state,
          runtime: migrated.runtime,
        })
      }
      await this.#retainExactOnce(
        text,
        this.#paths.importedRecoveryTemporary,
        this.#paths.importedRecovery,
        (candidate) => {
          try {
            decodeSchema13WebSave(candidate)
          } catch {
            prepareImportedSaveText(
              candidate,
              timestamp,
              undefined,
              { kind: 'manual-shared-import', importedAtUtc: timestamp },
            )
          }
        },
      )
      return this.#checkpoint(
        source,
        receivingCheckpoint.preferences,
        receivingCheckpoint.platform,
        receivingCheckpoint.revision + 1,
      )
    })
  }

  async exportPortable(): Promise<string | null> {
    const current = await this.loadCurrent()
    return current?.checkpoint.portableSave ?? null
  }

  async exportPreMigrationRecovery(): Promise<string | null> {
    return await this.#storage.exists(this.#paths.preMigrationRecovery)
      ? this.#read(this.#paths.preMigrationRecovery)
      : null
  }

  async exportImportedRecovery(): Promise<string | null> {
    return await this.#storage.exists(this.#paths.importedRecovery)
      ? this.#read(this.#paths.importedRecovery)
      : null
  }

  async readStoredTimePolicy(): Promise<StoredTimePolicyIdV2> {
    if (!(await this.#storage.exists(this.#paths.storedTimePolicy))) {
      return DEFAULT_STORED_TIME_POLICY
    }
    try {
      const value = JSON.parse(await this.#read(this.#paths.storedTimePolicy)) as unknown
      const record = closedRecord(value, ['format', 'policyId'])
      return record?.format === STORED_TIME_POLICY_FORMAT &&
        isStoredTimePolicy(record.policyId)
        ? record.policyId
        : DEFAULT_STORED_TIME_POLICY
    } catch {
      return DEFAULT_STORED_TIME_POLICY
    }
  }

  async writeStoredTimePolicy(policyId: StoredTimePolicyIdV2): Promise<void> {
    if (!isStoredTimePolicy(policyId)) throw new TypeError('Stored Time policy is invalid.')
    return this.#mutate(() => this.#write(
      this.#paths.storedTimePolicy,
      JSON.stringify({ format: STORED_TIME_POLICY_FORMAT, policyId }),
    ))
  }

  async readStoredTimeJobRecord(): Promise<unknown | null> {
    if (!(await this.#storage.exists(this.#paths.storedTimeJob))) return null
    const value = JSON.parse(await this.#read(this.#paths.storedTimeJob)) as unknown
    const cleared = closedRecord(value, ['format'])
    if (cleared?.format === STORED_TIME_JOB_CLEARED_FORMAT) return null
    const record = closedRecord(value, ['format', 'record'])
    if (record?.format !== STORED_TIME_JOB_FORMAT) {
      throw new TypeError('Stored Time job envelope is invalid.')
    }
    return captureCheckpointRecordV2(record.record)
  }

  persistStoredTimeJobRecord(record: unknown): Promise<void> {
    return this.#persistStoredTimeJobText(JSON.stringify({
      format: STORED_TIME_JOB_FORMAT,
      record: captureCheckpointRecordV2(record),
    }))
  }

  clearStoredTimeJobRecord(): Promise<void> {
    return this.#persistStoredTimeJobText(JSON.stringify({
      format: STORED_TIME_JOB_CLEARED_FORMAT,
    }))
  }

  async #checkpoint(
    source: Readonly<Schema13WebSaveSource>,
    preferences: Readonly<Schema13PresentationPreferences>,
    platform: Readonly<Schema13PlatformState>,
    revision: number,
  ): Promise<Readonly<ProductionV2Checkpoint>> {
    const checkpoint = Object.freeze({
      revision: requireRevision(revision),
      portableSave: encodeSchema13WebSave(source),
      preferences: validateSchema13PresentationPreferences(preferences),
      platform: validateSchema13PlatformState(platform),
    })
    const encoded = encodeCheckpoint(checkpoint)
    await this.#write(this.#paths.temporary, encoded)
    if (encodeCheckpoint(decodeCheckpoint(await this.#read(this.#paths.temporary))) !== encoded) {
      throw new Error('V2 temporary save readback did not match.')
    }
    await this.#rotateBackups()
    await this.#storage.replaceAtomically(this.#paths.temporary, this.#paths.current)
    if (encodeCheckpoint(decodeCheckpoint(await this.#read(this.#paths.current))) !== encoded) {
      throw new Error('V2 committed save readback did not match.')
    }
    return checkpoint
  }

  async #promoteAutomaticPurchaseEvidence(
    candidate: Readonly<LegacySaveCandidate>,
    prepared: PreparedSave,
  ): Promise<void> {
    const promoter = this.#automaticPurchaseEvidencePromoter
    if (promoter === undefined) return
    await promoteAutomaticUnityPurchaseEvidenceV2(
      promoter,
      candidate,
      prepared,
    )
  }

  #persistStoredTimeJobText(text: string): Promise<void> {
    return this.#mutate(async () => {
      await this.#write(this.#paths.storedTimeJobTemporary, text)
      if (await this.#read(this.#paths.storedTimeJobTemporary) !== text) {
        throw new Error('Stored Time temporary readback did not match.')
      }
      await this.#storage.replaceAtomically(
        this.#paths.storedTimeJobTemporary,
        this.#paths.storedTimeJob,
      )
      if (await this.#read(this.#paths.storedTimeJob) !== text) {
        throw new Error('Stored Time committed readback did not match.')
      }
    })
  }

  async #retainExactOnce(
    text: string,
    temporary: string,
    destination: string,
    validateExisting: (candidate: string) => void,
  ): Promise<void> {
    assertBoundedText(text)
    if (await this.#storage.exists(destination)) {
      try {
        validateExisting(await this.#read(destination))
        return
      } catch {
        // Repair an interrupted/corrupt recovery artifact only through the
        // same temporary/readback/atomic-replace sequence used initially.
      }
    }
    await this.#write(temporary, text)
    if (await this.#read(temporary) !== text) {
      throw new Error('V2 recovery temporary readback did not match.')
    }
    await this.#storage.replaceAtomically(temporary, destination)
    if (await this.#read(destination) !== text) {
      throw new Error('V2 recovery committed readback did not match.')
    }
  }

  async #rotateBackups(): Promise<void> {
    const [latest, previous, oldest] = this.#paths.backups
    if (await this.#storage.exists(previous)) await this.#storage.copy(previous, oldest)
    if (await this.#storage.exists(latest)) await this.#storage.copy(latest, previous)
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
    const run = this.#mutationTail.then(operation)
    this.#mutationTail = run.then(() => undefined, () => undefined)
    return run
  }
}

export async function promoteAutomaticUnityPurchaseEvidenceV2(
  promoter: Readonly<AutomaticUnityPurchaseEvidencePromoter>,
  candidate: Readonly<LegacySaveCandidate>,
  prepared: PreparedSave,
): Promise<void> {
  const provenance = candidate.provenance
  if (
    provenance?.kind !== 'automatic-same-device-unity' ||
    candidate.sourcePath !==
      `unity-readonly:${provenance.opaqueSourceIdentifier}` ||
    candidate.id !== provenance.opaqueSourceIdentifier
  ) return
  const source = prepared.copyValidatedState()
  if (
    source.doubleIp !== true ||
    typeof source.saveVersion !== 'number' ||
    !Number.isSafeInteger(source.saveVersion)
  ) return
  await promoter.promoteAutomaticUnityPurchaseEvidence(Object.freeze({
    ...provenance,
    permanentDoubleInfinityPoints: true,
    contentSha256: await sha256Utf8(candidate.text),
    saveSchemaVersion: source.saveVersion,
  }))
}

function captureAutomaticPurchaseEvidencePromoter(
  value: Readonly<AutomaticUnityPurchaseEvidencePromoter> | undefined,
): Readonly<AutomaticUnityPurchaseEvidencePromoter> | undefined {
  if (value === undefined) return undefined
  if (value === null || typeof value !== 'object') {
    throw new TypeError('Automatic purchase evidence promoter must be an object.')
  }
  const descriptor = Object.getOwnPropertyDescriptor(
    value,
    'promoteAutomaticUnityPurchaseEvidence',
  )
  if (
    descriptor === undefined ||
    !('value' in descriptor) ||
    typeof descriptor.value !== 'function'
  ) {
    throw new TypeError('Automatic purchase evidence promoter requires a data method.')
  }
  return Object.freeze({
    promoteAutomaticUnityPurchaseEvidence: descriptor.value.bind(value),
  })
}

function captureLegacyCandidate(value: Readonly<LegacySaveCandidate>): Readonly<LegacySaveCandidate> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('A discovered legacy save candidate must be an object.')
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  for (const key of ['id', 'sourcePath', 'text'] as const) {
    const descriptor = descriptors[key]
    if (descriptor === undefined || !('value' in descriptor) || typeof descriptor.value !== 'string') {
      throw new TypeError(`A discovered legacy save candidate requires a data ${key}.`)
    }
  }
  assertBoundedText(descriptors.text!.value)
  const provenance = descriptors.provenance?.value
  if (
    provenance !== undefined &&
    (provenance === null || typeof provenance !== 'object' || Array.isArray(provenance))
  ) {
    throw new TypeError('Legacy candidate provenance must be an object when present.')
  }
  let capturedProvenance: LegacySaveCandidate['provenance']
  if (provenance !== undefined) {
    const fields = Object.getOwnPropertyDescriptors(provenance)
    const kind = fields.kind
    if (kind === undefined || !('value' in kind)) {
      throw new TypeError('Legacy candidate provenance requires a data kind.')
    }
    if (kind.value === 'browser-retained-import') {
      capturedProvenance = Object.freeze({ kind: 'browser-retained-import' })
    } else if (kind.value === 'automatic-same-device-unity') {
      const readString = (key: 'platform' | 'sourceClass' | 'opaqueSourceIdentifier' | 'pathClass') => {
        const descriptor = fields[key]
        if (descriptor === undefined || !('value' in descriptor) || typeof descriptor.value !== 'string') {
          throw new TypeError(`Automatic Unity provenance requires a data ${key}.`)
        }
        return descriptor.value
      }
      capturedProvenance = Object.freeze({
        kind: 'automatic-same-device-unity',
        platform: requireOneOf(
          readString('platform'),
          ['android', 'ios', 'windows', 'macos', 'linux'] as const,
          'automatic Unity platform',
        ) as AutomaticUnityPlatform,
        sourceClass: requireOneOf(
          readString('sourceClass'),
          ['unity-persistent-data-save'] as const,
          'automatic Unity source class',
        ),
        opaqueSourceIdentifier: readString('opaqueSourceIdentifier'),
        pathClass: requireOneOf(
          readString('pathClass'),
          [
            'capacitor-external-files',
            'capacitor-documents',
            'unity-local-low',
            'unity-application-support-editor',
            'unity-application-support-player',
            'unity-xdg-config',
          ] as const,
          'automatic Unity path class',
        ) as AutomaticUnityPathClass,
      })
    } else {
      throw new TypeError('Legacy candidate provenance kind is not supported.')
    }
  }
  return Object.freeze({
    id: descriptors.id!.value as string,
    sourcePath: descriptors.sourcePath!.value as string,
    text: descriptors.text!.value,
    ...(capturedProvenance === undefined ? {} : { provenance: capturedProvenance }),
  })
}

function requireOneOf<const T extends readonly string[]>(
  value: string,
  allowed: T,
  label: string,
): T[number] {
  if (!allowed.includes(value)) throw new TypeError(`Invalid ${label}.`)
  return value as T[number]
}

function result(
  checkpoint: Readonly<ProductionV2Checkpoint>,
  source: OpenProductionV2Result['source'],
): Readonly<OpenProductionV2Result> {
  return Object.freeze({
    checkpoint,
    save: decodeSchema13WebSave(checkpoint.portableSave),
    source,
  })
}

function encodeCheckpoint(checkpoint: Readonly<ProductionV2Checkpoint>): string {
  const encoded = JSON.stringify({
    format: CHECKPOINT_FORMAT,
    revision: requireRevision(checkpoint.revision),
    portableSave: checkpoint.portableSave,
    preferences: validateSchema13PresentationPreferences(checkpoint.preferences),
    platform: validateSchema13PlatformState(checkpoint.platform),
  })
  assertBoundedText(encoded)
  return encoded
}

function decodeCheckpoint(text: string): Readonly<ProductionV2Checkpoint> {
  assertBoundedText(text)
  const value = JSON.parse(text) as unknown
  const record = closedRecord(value, ['format', 'revision', 'portableSave', 'preferences', 'platform'])
  if (record?.format !== CHECKPOINT_FORMAT || typeof record.portableSave !== 'string') {
    throw new TypeError('The production V2 checkpoint is invalid.')
  }
  decodeSchema13WebSave(record.portableSave)
  return Object.freeze({
    revision: requireRevision(record.revision),
    portableSave: record.portableSave,
    preferences: validateSchema13PresentationPreferences(record.preferences),
    platform: validateSchema13PlatformState(record.platform),
  })
}

function captureStorage(storage: Readonly<SaveStorageAdapter>): Readonly<SaveStorageAdapter> {
  const captured = {} as Record<string, unknown>
  for (const key of ['exists', 'readText', 'writeText', 'replaceAtomically', 'copy', 'discoverLegacyCandidates'] as const) {
    captured[key] = captureMethod(storage, key)
  }
  return Object.freeze(captured) as unknown as Readonly<SaveStorageAdapter>
}

function captureMethod(source: object, key: string): Function {
  let owner: object | null = source
  try {
    while (owner !== null) {
      const descriptor = Object.getOwnPropertyDescriptor(owner, key)
      if (descriptor !== undefined) {
        if ('value' in descriptor && typeof descriptor.value === 'function') {
          return descriptor.value.bind(source)
        }
        break
      }
      owner = Object.getPrototypeOf(owner) as object | null
    }
  } catch { /* hostile proxy */ }
  throw new TypeError(`The V2 storage method '${key}' is invalid.`)
}

function capturePaths(paths: Readonly<ProductionV2RepositoryPaths>): Readonly<ProductionV2RepositoryPaths> {
  const record = closedRecord(paths, [
    'current', 'temporary', 'backups', 'preMigrationRecovery',
    'preMigrationRecoveryTemporary', 'importedRecovery', 'importedRecoveryTemporary',
    'storedTimePolicy', 'storedTimeJob', 'storedTimeJobTemporary',
  ])
  if (record === null || !Array.isArray(record.backups) || record.backups.length !== 3) {
    throw new TypeError('The production V2 save paths are invalid.')
  }
  const values = [
    record.current, record.temporary, ...record.backups,
    record.preMigrationRecovery, record.preMigrationRecoveryTemporary,
    record.importedRecovery, record.importedRecoveryTemporary,
    record.storedTimePolicy, record.storedTimeJob, record.storedTimeJobTemporary,
  ]
  if (values.some((value) => typeof value !== 'string' || value.length === 0) ||
    new Set(values).size !== values.length) {
    throw new TypeError('The production V2 save paths must be unique non-empty strings.')
  }
  return Object.freeze({
    current: record.current as string,
    temporary: record.temporary as string,
    backups: Object.freeze([...(record.backups as string[])]) as readonly [string, string, string],
    preMigrationRecovery: record.preMigrationRecovery as string,
    preMigrationRecoveryTemporary: record.preMigrationRecoveryTemporary as string,
    importedRecovery: record.importedRecovery as string,
    importedRecoveryTemporary: record.importedRecoveryTemporary as string,
    storedTimePolicy: record.storedTimePolicy as string,
    storedTimeJob: record.storedTimeJob as string,
    storedTimeJobTemporary: record.storedTimeJobTemporary as string,
  })
}

function closedRecord(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return null
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Reflect.ownKeys(descriptors).length !== keys.length) return null
  const result: Record<string, unknown> = {}
  for (const key of keys) {
    const descriptor = descriptors[key]
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) return null
    result[key] = descriptor.value
  }
  return result
}

function requireRevision(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || Object.is(value, -0)) {
    throw new TypeError('The production V2 revision is invalid.')
  }
  return value as number
}

function requireTimestamp(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0 || !Number.isFinite(Date.parse(value))) {
    throw new TypeError('The production V2 timestamp is invalid.')
  }
  return value
}

function requirePath(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`The production V2 ${field} path is invalid.`)
  }
  return value
}

function assertBoundedText(value: unknown): asserts value is string {
  if (typeof value !== 'string') throw new TypeError('V2 save text must be a string.')
  if (new TextEncoder().encode(value).byteLength > MAXIMUM_TEXT_BYTES) {
    throw new RangeError('V2 save text exceeds the 32 MiB limit.')
  }
}

function isStoredTimePolicy(value: unknown): value is StoredTimePolicyIdV2 {
  return value === 'stored-time-fast-v1' ||
    value === 'stored-time-balanced-v1' ||
    value === 'stored-time-exact-v1'
}
