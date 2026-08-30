import {
  UnsupportedFutureSaveSchemaError,
  type SaveMigrationResult,
} from './migrate'
import { deserializeWebSave, serializeWebSave } from './serialization'
import { PreparedSave } from './prepare'
import type { SaveImportLimits } from './decodeIdb1'
import type { SaveRecord } from './graph'
import type {
  AutomaticUnityPurchaseEvidencePromoter,
  LegacyCandidateProvenance,
} from './automaticPurchaseEvidence'
import {
  isVerifiedAutomaticSameDeviceUnityCandidate,
  sha256Utf8,
} from './automaticPurchaseEvidence'
import {
  requireClearedTransitionalV2StoredTimeJob,
  validateSupersededTransitionalV2StoredTimeJob,
} from './transitionalV2StoredTimeJob'
import {
  TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD,
  TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD,
} from './transitionalV2Retirement'

export interface LegacySaveCandidate {
  readonly id: string
  readonly sourcePath: string
  readonly text: string
  readonly provenance?: Readonly<LegacyCandidateProvenance>
}

export type SaveRecoverySource =
  | LegacySaveCandidate
  | { readonly id: 'web-current'; readonly sourcePath: string }
  | { readonly id: 'web-backup'; readonly sourcePath: string }

export interface SaveStorageAdapter {
  exists(path: string): Promise<boolean>
  readText(path: string): Promise<string>
  writeText(path: string, contents: string): Promise<void>
  replaceAtomically(temporaryPath: string, destinationPath: string): Promise<void>
  copy(sourcePath: string, destinationPath: string): Promise<void>
  discoverLegacyCandidates(): Promise<readonly LegacySaveCandidate[]>
}

export interface SaveRepositoryPaths {
  readonly current: string
  readonly temporary: string
  readonly legacyRecovery: string
  /** Latest-to-oldest publication history rotated before each replacement. */
  readonly backups?: readonly [latest: string, previous: string, oldest: string]
  /**
   * Exact canonical sources retained by an earlier persistence migration.
   * These are considered only after the current slot and ordinary backups
   * fail, and are never overwritten by this repository.
   */
  readonly retainedRecoverySources?: readonly string[]
  /**
   * Historical checkpoint slots that used a different backup namespace.
   * These are read-only recovery inputs and never participate in the current
   * save repository's backup rotation.
   */
  readonly transitionalRecoverySources?: readonly string[]
  /** Optional local V2 processing-policy sidecar retained beside the save. */
  readonly transitionalStoredTimePolicy?: string
  /** Durable V2 Stored-Time job sidecar; read-only compatibility evidence. */
  readonly transitionalStoredTimeJob?: string
}

export interface SaveRepository {
  hasCurrent(): Promise<boolean>
  loadCurrent(): Promise<PreparedSave | null>
  migrateLegacyOnFirstLaunch(): Promise<FirstLaunchMigrationResult>
  commit(
    save: PreparedSave,
    target?: SaveCommitTarget,
  ): Promise<PreparedSave>
}

export type SaveCommitTarget = 'development' | 'canonical-player'

export interface SaveRepositoryPolicy {
  readonly allowCanonicalPlayerWrites: boolean
}

export type FirstLaunchMigrationResult =
  | { readonly status: 'already-migrated'; readonly save: PreparedSave }
  | {
      readonly status: 'recovered-backup'
      readonly sourcePath: string
      readonly save: PreparedSave
    }
  | { readonly status: 'no-legacy-save' }
  | { readonly status: 'current-invalid'; readonly error: string }
  | {
      readonly status: 'unsupported-future-version'
      readonly source: 'current' | 'backup' | 'legacy'
      readonly candidate?: LegacySaveCandidate
      readonly error: string
    }
  | {
      readonly status: 'migrated'
      readonly source: LegacySaveCandidate
      readonly migration: SaveMigrationResult
      readonly save: PreparedSave
    }
  | {
      readonly status: 'legacy-invalid'
      readonly source: LegacySaveCandidate
      readonly error: string
    }
  | {
      readonly status: 'recovery-write-failed'
      readonly source: SaveRecoverySource
      readonly error: string
    }

export type LegacySaveDecoder = (text: string) => unknown
export interface TransitionalCheckpointDevicePreferences {
  readonly numberFormatting?: number
  readonly hidePurchased?: boolean
}

export interface TransitionalCheckpointRecoveryResult {
  readonly save: PreparedSave
  readonly devicePreferences?: Readonly<TransitionalCheckpointDevicePreferences>
}

export type TransitionalCheckpointRecovery = (
  text: string,
  base: PreparedSave,
  context?: Readonly<TransitionalCheckpointRecoveryContext>,
) => PreparedSave | TransitionalCheckpointRecoveryResult | null

export interface TransitionalCheckpointRecoveryContext {
  readonly storedTimePolicyText?: string
  readonly storedTimeJobText?: string
  readonly storedTimeJobReadError?: string
  /** Manual portable imports retain this device-local preset without a sidecar. */
  readonly storedTimePresetFallback?: 'fast' | 'balanced' | 'accurate'
  /** Manual imports apply the same caller-supplied byte limits to schema 13. */
  readonly importLimits?: Readonly<SaveImportLimits>
}

/**
 * Identifies a recognized historical checkpoint whose bytes or structure are
 * damaged. Optional backup scans may skip this error and try an older source;
 * compatibility failures intentionally use ordinary errors and fail closed.
 */
export class UnreadableTransitionalCheckpointError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnreadableTransitionalCheckpointError'
  }
}

/** A valid historical checkpoint whose progress cannot be represented safely. */
export class IncompatibleTransitionalCheckpointError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IncompatibleTransitionalCheckpointError'
  }
}

export interface AutomaticUnityNumberFormattingAdopter {
  adoptLegacyUnityNumberFormatting(value: unknown): boolean
  restoreTransitionalV2NumberFormatting?(value: unknown): boolean
}

export interface AutomaticUnityResearchVisibilityAdopter {
  adoptLegacyUnityHidePurchased(value: unknown): boolean
  restoreTransitionalV2HidePurchased?(value: unknown): boolean
}

interface ExplicitLegacyDevicePreferences {
  readonly numberFormatting?: number
  readonly hidePurchased?: boolean
}

/**
 * Platform shells supply only filesystem discovery and atomic primitives.
 * Decode, migration and validation remain shared TypeScript behavior.
 */
export class PortableSaveRepository implements SaveRepository {
  private readonly storage: SaveStorageAdapter
  private readonly paths: SaveRepositoryPaths
  private readonly decodeLegacy: LegacySaveDecoder
  private readonly policy: SaveRepositoryPolicy
  private readonly automaticPurchaseEvidencePromoter?:
    AutomaticUnityPurchaseEvidencePromoter
  private readonly automaticNumberFormattingAdopter?:
    AutomaticUnityNumberFormattingAdopter
  private readonly automaticResearchVisibilityAdopter?:
    AutomaticUnityResearchVisibilityAdopter
  private readonly recoverTransitionalCheckpoint?:
    TransitionalCheckpointRecovery
  private readonly createTransitionalRecoveryBase?: () => PreparedSave

  constructor(
    storage: SaveStorageAdapter,
    paths: SaveRepositoryPaths,
    decodeLegacy: LegacySaveDecoder,
    policy: SaveRepositoryPolicy = {
      allowCanonicalPlayerWrites: false,
    },
    automaticPurchaseEvidencePromoter?:
      AutomaticUnityPurchaseEvidencePromoter,
    automaticNumberFormattingAdopter?:
      AutomaticUnityNumberFormattingAdopter,
    automaticResearchVisibilityAdopter?:
      AutomaticUnityResearchVisibilityAdopter,
    recoverTransitionalCheckpoint?: TransitionalCheckpointRecovery,
    createTransitionalRecoveryBase?: () => PreparedSave,
  ) {
    this.storage = storage
    this.paths = paths
    this.decodeLegacy = decodeLegacy
    this.policy = policy
    this.automaticPurchaseEvidencePromoter =
      automaticPurchaseEvidencePromoter
    this.automaticNumberFormattingAdopter =
      automaticNumberFormattingAdopter
    this.automaticResearchVisibilityAdopter =
      automaticResearchVisibilityAdopter
    this.recoverTransitionalCheckpoint = recoverTransitionalCheckpoint
    this.createTransitionalRecoveryBase = createTransitionalRecoveryBase
  }

  async hasCurrent(): Promise<boolean> {
    return this.storage.exists(this.paths.current)
  }

  async loadCurrent(): Promise<PreparedSave | null> {
    if (!(await this.hasCurrent())) return null
    const decoded = deserializeWebSave(
      await this.storage.readText(this.paths.current),
    )
    return PreparedSave.fromDecoded(decoded)
  }

  async migrateLegacyOnFirstLaunch(): Promise<FirstLaunchMigrationResult> {
    const transitionalContext =
      await this.readTransitionalRecoveryContext()
    let current: PreparedSave | null = null
    let currentError: string | undefined
    let rejectedCurrentText: string | undefined
    let rejectedCurrentPreserved = false
    try {
      current = await this.loadCurrent()
    } catch (error) {
      if (error instanceof UnsupportedFutureSaveSchemaError) {
        return {
          status: 'unsupported-future-version',
          source: 'current',
          error: error.message,
        }
      }
      currentError = error instanceof Error ? error.message : String(error)
      try {
        rejectedCurrentText = await this.storage.readText(this.paths.current)
      } catch {
        // The original load error remains the authoritative startup failure.
      }
    }
    if (current) {
      // A valid current-format save has no revision clock that can be compared
      // safely with a retired V2 backup. It therefore remains authoritative;
      // transitional recovery is only attempted when current is absent or bad.
      return { status: 'already-migrated', save: current }
    }
    if (currentError !== undefined) {
      try {
        await this.storage.copy(this.paths.current, this.paths.legacyRecovery)
        rejectedCurrentPreserved = true
      } catch (error) {
        return {
          status: 'recovery-write-failed',
          source: {
            id: 'web-current',
            sourcePath: this.paths.current,
          },
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }

    const backupRecovery = await this.recoverNewestValidBackup(
      rejectedCurrentText,
      transitionalContext,
    )
    if (
      backupRecovery !== null &&
      backupRecovery.status !== 'backup-invalid'
    ) {
      return backupRecovery
    }
    currentError ??= backupRecovery?.error

    const retainedRecovery = await this.recoverRetainedCanonicalSource(
      rejectedCurrentText,
      transitionalContext,
    )
    if (retainedRecovery !== null) return retainedRecovery

    const candidates = await this.storage.discoverLegacyCandidates()

    let lastFailure:
      | {
          readonly status: 'legacy-invalid'
          readonly source: LegacySaveCandidate
          readonly error: string
        }
      | undefined
    for (const source of candidates) {
      let migration: SaveMigrationResult
      let prepared: PreparedSave
      let devicePreferences: Readonly<ExplicitLegacyDevicePreferences>
      let transitionalOverlayApplied = false
      let transitionalDevicePreferences:
        | Readonly<TransitionalCheckpointDevicePreferences>
        | undefined
      try {
        const { decoded, preparation } = this.prepareRecoveryText(source.text)
        devicePreferences = extractExplicitLegacyDevicePreferences(decoded)
        migration = preparation.migration
        const transitional = await this.applyNewestTransitionalRecovery(
          rejectedCurrentText,
          preparation.prepared,
          transitionalContext,
        )
        prepared = transitional.save
        transitionalOverlayApplied = transitional.applied
        transitionalDevicePreferences = transitional.devicePreferences
        if (!migration.validation.valid) {
          lastFailure = {
            status: 'legacy-invalid',
            source,
            error: migration.validation.error ?? 'Unknown validation failure.',
          }
          continue
        }
        if (!transitionalOverlayApplied) {
          await this.requireRetiredTransitionalStoredTimeJob(
            transitionalContext,
          )
        }
      } catch (error) {
        if (error instanceof IncompatibleTransitionalCheckpointError) {
          throw error
        }
        if (error instanceof UnsupportedFutureSaveSchemaError) {
          return {
            status: 'unsupported-future-version',
            source: 'legacy',
            candidate: source,
            error: error.message,
          }
        }
        lastFailure = {
          status: 'legacy-invalid',
          source,
          error: error instanceof Error ? error.message : String(error),
        }
        continue
      }

      try {
        if (!rejectedCurrentPreserved) {
          await this.storage.copy(source.sourcePath, this.paths.legacyRecovery)
        }
        await this.promoteAutomaticPurchaseEvidence(source, prepared)
        if (transitionalOverlayApplied) {
          prepared = await this.withTransitionalStoredTimeJobRetirementProof(
            prepared,
            transitionalContext,
          )
        }
        const committed = await this.commit(prepared)
        if (transitionalOverlayApplied) {
          this.restoreTransitionalDevicePreferences(
            transitionalDevicePreferences,
          )
        } else {
          this.adoptAutomaticDevicePreferences(source, devicePreferences)
        }
        return { status: 'migrated', source, migration, save: committed }
      } catch (error) {
        return {
          status: 'recovery-write-failed',
          source,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }
    const freshBaseRecovery = await this.recoverTransitionalWithFreshBase(
      rejectedCurrentText,
      transitionalContext,
    )
    if (freshBaseRecovery !== null) return freshBaseRecovery
    await this.requireRetiredTransitionalStoredTimeJob(transitionalContext)
    if (lastFailure !== undefined) {
      if (currentError !== undefined) {
        return { status: 'current-invalid', error: currentError }
      }
      try {
        await this.storage.copy(
          lastFailure.source.sourcePath,
          this.paths.legacyRecovery,
        )
      } catch (error) {
        return {
          status: 'recovery-write-failed',
          source: lastFailure.source,
          error: error instanceof Error ? error.message : String(error),
        }
      }
      return lastFailure
    }
    return currentError
      ? { status: 'current-invalid', error: currentError }
      : { status: 'no-legacy-save' }
  }

  private adoptAutomaticDevicePreferences(
    candidate: Readonly<LegacySaveCandidate>,
    preferences: Readonly<ExplicitLegacyDevicePreferences>,
  ): void {
    if (!isVerifiedAutomaticSameDeviceUnityCandidate(candidate)) return
    if (preferences.numberFormatting !== undefined) {
      try {
        this.automaticNumberFormattingAdopter
          ?.adoptLegacyUnityNumberFormatting(preferences.numberFormatting)
      } catch {
        // Optional presentation storage cannot invalidate save migration or
        // prevent an independent device preference from being considered.
      }
    }
    if (preferences.hidePurchased !== undefined) {
      try {
        this.automaticResearchVisibilityAdopter
          ?.adoptLegacyUnityHidePurchased(preferences.hidePurchased)
      } catch {
        // Optional presentation storage cannot invalidate save migration or
        // prevent an independent device preference from being considered.
      }
    }
  }

  private restoreTransitionalDevicePreferences(
    preferences:
      | Readonly<TransitionalCheckpointDevicePreferences>
      | undefined,
  ): void {
    if (preferences === undefined) return
    if (preferences.numberFormatting !== undefined) {
      try {
        this.automaticNumberFormattingAdopter
          ?.restoreTransitionalV2NumberFormatting?.(
            preferences.numberFormatting,
          )
      } catch {
        // Optional presentation persistence cannot invalidate recovered
        // gameplay or prevent the independent visibility preference restore.
      }
    }
    if (preferences.hidePurchased !== undefined) {
      try {
        this.automaticResearchVisibilityAdopter
          ?.restoreTransitionalV2HidePurchased?.(
            preferences.hidePurchased,
          )
      } catch {
        // Optional presentation persistence cannot invalidate recovered
        // gameplay or prevent the independent notation preference restore.
      }
    }
  }

  private async promoteAutomaticPurchaseEvidence(
    candidate: Readonly<LegacySaveCandidate>,
    prepared: PreparedSave,
  ): Promise<void> {
    const promoter = this.automaticPurchaseEvidencePromoter
    if (promoter === undefined) return
    if (!isVerifiedAutomaticSameDeviceUnityCandidate(candidate)) return
    const provenance = candidate.provenance
    const source = prepared.copyValidatedState()
    if (source.doubleIp !== true) return
    if (
      typeof source.saveVersion !== 'number' ||
      !Number.isSafeInteger(source.saveVersion)
    ) return
    await promoter.promoteAutomaticUnityPurchaseEvidence({
      ...provenance,
      permanentDoubleInfinityPoints: true,
      contentSha256: await sha256Utf8(candidate.text),
      saveSchemaVersion: source.saveVersion,
    })
  }

  async commit(
    save: PreparedSave,
    target: SaveCommitTarget = 'development',
  ): Promise<PreparedSave> {
    return this.publish(
      await this.carryForwardLocalStoredTimeJobRetirementProof(save),
      target,
      true,
    )
  }

  private async carryForwardLocalStoredTimeJobRetirementProof(
    save: PreparedSave,
  ): Promise<PreparedSave> {
    const candidate = save.copyValidatedState()
    // A complete proof on the candidate was anchored by an earlier validated
    // local recovery/import. Preserve it without re-reading a retained sidecar
    // on every periodic mobile checkpoint; recovery re-verifies before bypass.
    if (transitionalStoredTimeJobRetirementProof(candidate) !== null) {
      return save
    }
    const jobPath = this.paths.transitionalStoredTimeJob
    if (jobPath === undefined) return save
    let jobText: string | undefined
    try {
      if (!(await this.storage.exists(jobPath))) return save
      jobText = await this.storage.readText(jobPath)
      requireClearedTransitionalV2StoredTimeJob(jobText)
      return save
    } catch (error) {
      if (jobText === undefined) {
        throw new Error(
          `Transitional V2 Stored Time job could not be verified before commit: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
      // An active local job needs a proof from a host-owned canonical slot.
    }
    if (jobText === undefined) return save
    const jobHash = await sha256Utf8(jobText)
    for (const sourcePath of [
      this.paths.current,
      ...this.backupPaths(),
      this.paths.temporary,
    ]) {
      try {
        if (!(await this.storage.exists(sourcePath))) continue
        const source = PreparedSave.fromDecoded(
          deserializeWebSave(await this.storage.readText(sourcePath)),
        ).copyValidatedState()
        const proof = transitionalStoredTimeJobRetirementProof(source)
        if (
          proof === null && (
            sourcePath === this.paths.temporary ||
            source[TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD] !== undefined
          )
        ) continue
        const revision = proof?.revision ??
          transitionalV2CheckpointRevision(source)
        if (revision === null) continue
        if (proof !== null && proof.hash !== jobHash) continue
        validateSupersededTransitionalV2StoredTimeJob(
          jobText,
          revision,
        )
        candidate[TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD] = revision
        candidate[TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD] = jobHash
        return save.withValidatedState(candidate)
      } catch {
        // Damaged or non-canonical host slots cannot supply local proof.
      }
    }
    throw new Error(
      'An active transitional V2 Stored Time job has no exact host-owned canonical retirement proof.',
    )
  }

  private async publish(
    save: PreparedSave,
    target: SaveCommitTarget,
    rotateBackups: boolean,
  ): Promise<PreparedSave> {
    if (
      target === 'canonical-player' &&
      !this.policy.allowCanonicalPlayerWrites
    ) {
      throw new Error(
        'Canonical player-save writes are disabled until mapping coverage is complete.',
      )
    }
    const normalized = PreparedSave.fromDecoded(
      save.copyValidatedState(),
    )
    const encoded = serializeWebSave(normalized.copyValidatedState())
    await this.storage.writeText(this.paths.temporary, encoded)
    const temporaryText = await this.storage.readText(this.paths.temporary)
    // Exact read-back verifies the durable adapter preserved the already
    // validated, locally encoded payload. Decoding and recompressing the same
    // bytes here duplicated the codec's work on every periodic checkpoint.
    if (temporaryText !== encoded) {
      throw new Error('Temporary save verification failed before atomic replace.')
    }
    const committed = normalized
    if (rotateBackups) await this.rotateBackups()
    await this.storage.replaceAtomically(
      this.paths.temporary,
      this.paths.current,
    )
    return committed
  }

  private async recoverNewestValidBackup(
    rejectedCurrentText: string | undefined,
    context: Readonly<TransitionalCheckpointRecoveryContext>,
  ): Promise<
    | FirstLaunchMigrationResult
    | { readonly status: 'backup-invalid'; readonly error: string }
    | null
  > {
    let lastInvalidError: string | undefined
    const precedingRejectedBackups: Array<Readonly<{
      text: string
      sourcePath: string
    }>> = []
    for (const sourcePath of this.backupPaths()) {
      let prepared: PreparedSave
      let sourceText: string | undefined
      try {
        if (!(await this.storage.exists(sourcePath))) continue
        sourceText = await this.storage.readText(sourcePath)
        prepared = PreparedSave.fromDecoded(
          deserializeWebSave(sourceText),
        )
      } catch (error) {
        if (error instanceof UnsupportedFutureSaveSchemaError) {
          return {
            status: 'unsupported-future-version',
            source: 'backup',
            error: error.message,
          }
        }
        if (sourceText !== undefined) {
          precedingRejectedBackups.push(Object.freeze({
            text: sourceText,
            sourcePath,
          }))
        }
        lastInvalidError =
          error instanceof Error ? error.message : String(error)
        continue
      }
      // A recognized checkpoint in the rejected active slot, or in a
      // preceding slot of this same newest-first rotation, is known to be
      // newer than this canonical backup. Separate historical namespaces have
      // no comparable clock and are intentionally not considered here.
      const transitional = this.applyKnownNewerTransitionalRecovery(
        rejectedCurrentText,
        precedingRejectedBackups,
        prepared,
        context,
      )
      prepared = transitional.save
      if (!transitional.applied) {
        prepared = (await this.requireRetiredTransitionalStoredTimeJob(
          context,
          prepared,
          true,
        )) ?? prepared
      }
      let committed: PreparedSave
      try {
        if (transitional.applied) {
          prepared = await this.withTransitionalStoredTimeJobRetirementProof(
            prepared,
            context,
          )
        }
        committed = await this.publish(
          prepared,
          'development',
          false,
        )
      } catch (error) {
        return {
          status: 'recovery-write-failed',
          source: { id: 'web-backup', sourcePath },
          error: error instanceof Error ? error.message : String(error),
        }
      }
      if (transitional.applied) {
        this.restoreTransitionalDevicePreferences(
          transitional.devicePreferences,
        )
      }
      return {
        status: 'recovered-backup',
        sourcePath: transitional.sourcePath ?? sourcePath,
        save: committed,
      }
    }
    return lastInvalidError === undefined
      ? null
      : { status: 'backup-invalid', error: lastInvalidError }
  }

  private applyKnownNewerTransitionalRecovery(
    rejectedCurrentText: string | undefined,
    precedingRejectedBackups: readonly Readonly<{
      text: string
      sourcePath: string
    }>[],
    base: PreparedSave,
    context: Readonly<TransitionalCheckpointRecoveryContext>,
  ): Readonly<{
    save: PreparedSave
    applied: boolean
    sourcePath?: string
    devicePreferences?: Readonly<TransitionalCheckpointDevicePreferences>
  }> {
    const recover = this.recoverTransitionalCheckpoint
    if (recover === undefined) {
      return Object.freeze({ save: base, applied: false })
    }
    const sources: Array<Readonly<{ text: string; sourcePath: string }>> = []
    if (rejectedCurrentText !== undefined) {
      sources.push(Object.freeze({
        text: rejectedCurrentText,
        sourcePath: this.paths.current,
      }))
    }
    sources.push(...precedingRejectedBackups)
    for (const source of sources) {
      try {
        const recovered = normalizeTransitionalRecoveryResult(
          recover(source.text, base, context),
        )
        if (recovered === null) continue
        return Object.freeze({
          save: recovered.save,
          applied: true,
          sourcePath: source.sourcePath,
          devicePreferences: recovered.devicePreferences,
        })
      } catch (error) {
        if (error instanceof UnreadableTransitionalCheckpointError) continue
        throw error
      }
    }
    return Object.freeze({ save: base, applied: false })
  }

  private async recoverRetainedCanonicalSource(
    rejectedCurrentText: string | undefined,
    context: Readonly<TransitionalCheckpointRecoveryContext>,
  ): Promise<
    FirstLaunchMigrationResult | null
  > {
    for (const sourcePath of this.paths.retainedRecoverySources ?? []) {
      let prepared: PreparedSave
      let recoveredSourcePath: string | undefined
      let transitionalOverlayApplied = false
      let canonicalRetirementProofEligible = false
      let transitionalDevicePreferences:
        | Readonly<TransitionalCheckpointDevicePreferences>
        | undefined
      try {
        if (!(await this.storage.exists(sourcePath))) continue
        const text = await this.storage.readText(sourcePath)
        try {
          const { preparation, canonicalWeb } = this.prepareRecoveryText(text)
          if (!preparation.migration.validation.valid) continue
          prepared = preparation.prepared
          canonicalRetirementProofEligible = canonicalWeb
        } catch (baseError) {
          const transitionalBase = this.recoverDirectTransitionalSource(
            text,
            context,
          )
          if (transitionalBase === null) throw baseError
          prepared = transitionalBase.save
          transitionalOverlayApplied = true
          transitionalDevicePreferences =
            transitionalBase.devicePreferences
        }
        const transitional = await this.applyNewestTransitionalRecovery(
          rejectedCurrentText,
          prepared,
          context,
        )
        prepared = transitional.save
        recoveredSourcePath = transitional.sourcePath
        transitionalOverlayApplied ||= transitional.applied
        transitionalDevicePreferences =
          transitional.devicePreferences ?? transitionalDevicePreferences
      } catch (error) {
        if (error instanceof IncompatibleTransitionalCheckpointError) {
          throw error
        }
        if (error instanceof UnsupportedFutureSaveSchemaError) {
          return {
            status: 'unsupported-future-version',
            source: 'backup',
            error: error.message,
          }
        }
        continue
      }
      if (!transitionalOverlayApplied) {
        prepared = (await this.requireRetiredTransitionalStoredTimeJob(
          context,
          canonicalRetirementProofEligible ? prepared : undefined,
        )) ?? prepared
      }
      try {
        if (transitionalOverlayApplied) {
          prepared = await this.withTransitionalStoredTimeJobRetirementProof(
            prepared,
            context,
          )
        }
        const committed = await this.publish(
          prepared,
          'development',
          false,
        )
        if (transitionalOverlayApplied) {
          this.restoreTransitionalDevicePreferences(
            transitionalDevicePreferences,
          )
        }
        return {
          status: 'recovered-backup',
          sourcePath: recoveredSourcePath ?? sourcePath,
          save: committed,
        }
      } catch (error) {
        return {
          status: 'recovery-write-failed',
          source: { id: 'web-backup', sourcePath },
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }
    return null
  }

  private recoverDirectTransitionalSource(
    text: string,
    context: Readonly<TransitionalCheckpointRecoveryContext>,
  ): TransitionalCheckpointRecoveryResult | null {
    if (
      this.recoverTransitionalCheckpoint === undefined ||
      this.createTransitionalRecoveryBase === undefined
    ) return null
    try {
      return normalizeTransitionalRecoveryResult(
        this.recoverTransitionalCheckpoint(
          text,
          this.createTransitionalRecoveryBase(),
          context,
        ),
      )
    } catch (error) {
      if (error instanceof UnreadableTransitionalCheckpointError) return null
      throw error
    }
  }

  private async recoverTransitionalWithFreshBase(
    rejectedCurrentText: string | undefined,
    context: Readonly<TransitionalCheckpointRecoveryContext>,
  ): Promise<FirstLaunchMigrationResult | null> {
    if (
      this.recoverTransitionalCheckpoint === undefined ||
      this.createTransitionalRecoveryBase === undefined
    ) return null
    const transitional = await this.applyNewestTransitionalRecovery(
      rejectedCurrentText,
      this.createTransitionalRecoveryBase(),
      context,
    )
    if (!transitional.applied) return null
    try {
      const prepared = await this.withTransitionalStoredTimeJobRetirementProof(
        transitional.save,
        context,
      )
      const committed = await this.publish(
        prepared,
        'development',
        false,
      )
      this.restoreTransitionalDevicePreferences(
        transitional.devicePreferences,
      )
      return {
        status: 'recovered-backup',
        sourcePath: transitional.sourcePath ?? this.paths.current,
        save: committed,
      }
    } catch (error) {
      return {
        status: 'recovery-write-failed',
        source: {
          id: 'web-current',
          sourcePath: transitional.sourcePath ?? this.paths.current,
        },
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private async applyNewestTransitionalRecovery(
    rejectedCurrentText: string | undefined,
    base: PreparedSave,
    context: Readonly<TransitionalCheckpointRecoveryContext>,
  ): Promise<Readonly<{
    save: PreparedSave
    applied: boolean
    sourcePath?: string
    devicePreferences?: Readonly<TransitionalCheckpointDevicePreferences>
  }>> {
    const recover = this.recoverTransitionalCheckpoint
    if (recover === undefined) {
      return Object.freeze({ save: base, applied: false })
    }
    const sources: Array<Readonly<{ text: string; sourcePath: string }>> = []
    if (rejectedCurrentText !== undefined) {
      sources.push(Object.freeze({
        text: rejectedCurrentText,
        sourcePath: this.paths.current,
      }))
    }
    for (const sourcePath of this.transitionalRecoveryPaths()) {
      try {
        if (!(await this.storage.exists(sourcePath))) continue
        sources.push(Object.freeze({
          text: await this.storage.readText(sourcePath),
          sourcePath,
        }))
      } catch {
        // Optional recovery artifacts can disappear or become unreadable while
        // they are scanned. Keep searching older retained checkpoints.
        continue
      }
    }
    for (const source of sources) {
      try {
        const recovered = normalizeTransitionalRecoveryResult(
          recover(source.text, base, context),
        )
        if (recovered !== null) {
          return Object.freeze({
            save: recovered.save,
            applied: true,
            sourcePath: source.sourcePath,
            devicePreferences: recovered.devicePreferences,
          })
        }
      } catch (error) {
        if (error instanceof UnreadableTransitionalCheckpointError) {
          // A damaged candidate cannot suppress an older valid V2 checkpoint.
          continue
        }
        throw error
      }
    }
    return Object.freeze({ save: base, applied: false })
  }

  private prepareRecoveryText(text: string): Readonly<{
    decoded: unknown
    canonicalWeb: boolean
    preparation: ReturnType<typeof PreparedSave.prepareDecoded>
  }> {
    let decoded: unknown
    let canonicalWeb = true
    try {
      decoded = deserializeWebSave(text)
    } catch (webError) {
      if (webError instanceof UnsupportedFutureSaveSchemaError) {
        throw webError
      }
      canonicalWeb = false
      decoded = this.decodeLegacy(text)
    }
    return Object.freeze({
      decoded,
      canonicalWeb,
      preparation: PreparedSave.prepareDecoded(decoded),
    })
  }

  private async rotateBackups(): Promise<void> {
    if (!(await this.storage.exists(this.paths.current))) return
    const backups = this.backupPaths()
    if (await this.storage.exists(backups[1])) {
      await this.storage.copy(backups[1], backups[2])
    }
    if (await this.storage.exists(backups[0])) {
      await this.storage.copy(backups[0], backups[1])
    }
    await this.storage.copy(this.paths.current, backups[0])
  }

  private backupPaths(): readonly [string, string, string] {
    return (
      this.paths.backups ?? [
        `${this.paths.current}.backup.1`,
        `${this.paths.current}.backup.2`,
        `${this.paths.current}.backup.3`,
      ]
    )
  }

  private transitionalRecoveryPaths(): readonly string[] {
    return Object.freeze([
      ...new Set([
        ...this.backupPaths(),
        ...(this.paths.transitionalRecoverySources ?? []),
      ]),
    ])
  }

  private async requireRetiredTransitionalStoredTimeJob(
    context: Readonly<TransitionalCheckpointRecoveryContext>,
    canonical?: PreparedSave,
    allowRevisionOnlyBootstrap = false,
  ): Promise<PreparedSave | undefined> {
    if (context.storedTimeJobReadError !== undefined) {
      throw new IncompatibleTransitionalCheckpointError(
        `Transitional V2 Stored Time job could not be read: ${context.storedTimeJobReadError}`,
      )
    }
    if (context.storedTimeJobText === undefined) return canonical
    try {
      requireClearedTransitionalV2StoredTimeJob(
        context.storedTimeJobText,
      )
      return canonical
    } catch (error) {
      if (canonical !== undefined) {
        const source = canonical.copyValidatedState()
        const proof = transitionalStoredTimeJobRetirementProof(source)
        const revision = proof?.revision ??
          transitionalV2CheckpointRevision(source)
        const rawHash =
          source[TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD]
        if (
          revision !== null &&
          (proof !== null ||
            (allowRevisionOnlyBootstrap && rawHash === undefined))
        ) {
          try {
            const actualHash = await sha256Utf8(context.storedTimeJobText)
            if (proof !== null && proof.hash !== actualHash) throw new Error(
              'Transitional V2 Stored Time retirement proof hash changed.',
            )
            validateSupersededTransitionalV2StoredTimeJob(
              context.storedTimeJobText,
              revision,
            )
            if (proof !== null) return canonical
            source[TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD] = actualHash
            return canonical.withValidatedState(source)
          } catch {
            // Fall through to the fail-closed compatibility error below.
          }
        }
      }
      throw new IncompatibleTransitionalCheckpointError(
        `Transitional V2 Stored Time job has no matching outer checkpoint: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async withTransitionalStoredTimeJobRetirementProof(
    save: PreparedSave,
    context: Readonly<TransitionalCheckpointRecoveryContext>,
  ): Promise<PreparedSave> {
    const jobText = context.storedTimeJobText
    if (jobText === undefined) return save
    try {
      requireClearedTransitionalV2StoredTimeJob(jobText)
      return save
    } catch {
      // A successfully recovered V2 outer checkpoint already authenticated the
      // active job. Anchor its exact immutable bytes before canonical publish.
    }
    const source = save.copyValidatedState()
    const revision = source[TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD]
    if (
      typeof revision !== 'number' ||
      !Number.isSafeInteger(revision) ||
      revision < 0 ||
      Object.is(revision, -0)
    ) {
      throw new Error(
        'Transitional V2 Stored Time retirement proof requires its outer revision.',
      )
    }
    source[TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD] =
      await sha256Utf8(jobText)
    return save.withValidatedState(source)
  }

  private async readTransitionalRecoveryContext(): Promise<
    Readonly<TransitionalCheckpointRecoveryContext>
  > {
    let storedTimePolicyText: string | undefined
    const policyPath = this.paths.transitionalStoredTimePolicy
    if (policyPath !== undefined) {
      try {
        if (await this.storage.exists(policyPath)) {
          storedTimePolicyText = await this.storage.readText(policyPath)
        }
      } catch {
        // Historical V2 treated an unreadable local policy as its default.
      }
    }
    let storedTimeJobText: string | undefined
    let storedTimeJobReadError: string | undefined
    const jobPath = this.paths.transitionalStoredTimeJob
    if (jobPath !== undefined) {
      try {
        if (await this.storage.exists(jobPath)) {
          storedTimeJobText = await this.storage.readText(jobPath)
        }
      } catch (error) {
        // Unlike the preference-only policy, an unreadable durable job may be
        // the sole copy of progress committed before the outer checkpoint.
        storedTimeJobReadError =
          error instanceof Error ? error.message : String(error)
      }
    }
    return Object.freeze({
      ...(storedTimePolicyText === undefined ? {} : { storedTimePolicyText }),
      ...(storedTimeJobText === undefined ? {} : { storedTimeJobText }),
      ...(storedTimeJobReadError === undefined
        ? {}
        : { storedTimeJobReadError }),
    })
  }
}

function transitionalStoredTimeJobRetirementProof(
  source: SaveRecord,
): Readonly<{ revision: number; hash: string }> | null {
  const revision = transitionalV2CheckpointRevision(source)
  const hash = source[TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD]
  if (
    revision === null ||
    typeof hash !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(hash)
  ) return null
  return Object.freeze({ revision, hash })
}

function transitionalV2CheckpointRevision(source: SaveRecord): number | null {
  const revision = source[TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD]
  return (
    typeof revision === 'number' &&
    Number.isSafeInteger(revision) &&
    revision >= 0 &&
    !Object.is(revision, -0)
  ) ? revision : null
}

function normalizeTransitionalRecoveryResult(
  recovered: ReturnType<TransitionalCheckpointRecovery>,
): TransitionalCheckpointRecoveryResult | null {
  if (recovered === null) return null
  return recovered instanceof PreparedSave
    ? Object.freeze({ save: recovered })
    : recovered
}

function extractExplicitLegacyDevicePreferences(
  decoded: unknown,
): Readonly<ExplicitLegacyDevicePreferences> {
  if (decoded === null || typeof decoded !== 'object' || Array.isArray(decoded)) {
    return Object.freeze({})
  }
  const source = decoded as Record<string, unknown>
  const preferences: {
    numberFormatting?: number
    hidePurchased?: boolean
  } = {}
  if (
    Object.prototype.hasOwnProperty.call(source, 'numberFormatting') &&
    typeof source.numberFormatting === 'number'
  ) {
    preferences.numberFormatting = source.numberFormatting
  }
  if (
    Object.prototype.hasOwnProperty.call(source, 'hidePurchased') &&
    typeof source.hidePurchased === 'boolean'
  ) {
    preferences.hidePurchased = source.hidePurchased
  }
  return Object.freeze(preferences)
}
