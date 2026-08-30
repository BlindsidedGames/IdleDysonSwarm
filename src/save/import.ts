import { prepareIdb1Save, prepareImportedSave, PreparedSave } from './prepare'
import {
  decodeWebSaveTextBounded,
  stripNonShareableEntitlementClaims,
} from './serialization'
import {
  assertSuppliedSaveTextLimit,
  DEFAULT_SAVE_IMPORT_LIMITS,
  type SaveImportLimits,
} from './decodeIdb1'
import type { SaveRecord } from './graph'
import {
  retainReceivingDevicePreferences,
  retainReceivingLocalPlatformState,
  type ImportContext,
} from './importContext'
import { packSettingsFlags } from './settingsFlags'
import {
  IncompatibleTransitionalCheckpointError,
  UnreadableTransitionalCheckpointError,
} from './repository'
import {
  recoverDecodedTransitionalV2PortableSave,
} from './transitionalV2Checkpoint'
import {
  TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD,
  TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD,
} from './transitionalV2Retirement'

/**
 * Decodes shipped Unity (`IDB1`) or canonical Web (`IDSWEB1`) text,
 * then applies the transfer policy selected by its trusted import context. Manual
 * sharing consumes remote lifecycle time; same-device migration and in-place
 * upgrades preserve local lifecycle evidence for startup processing.
 * Historical schema-13 portable text is accepted only for a manual import and
 * is rebuilt over the supplied deterministic compatibility base.
 */
export function prepareImportedSaveText(
  text: string,
  importedAtUtc: string,
  limits: Readonly<SaveImportLimits> = DEFAULT_SAVE_IMPORT_LIMITS,
  context: ImportContext = {
    kind: 'manual-shared-import',
    importedAtUtc,
  },
  receivingState?: SaveRecord,
  createTransitionalRecoveryBase?: () => PreparedSave,
): PreparedSave {
  assertSuppliedSaveTextLimit(text, limits)
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    throw new Error('Imported save text must not be empty.')
  }
  let transitionalRecoveryBase: PreparedSave | undefined
  const createRecoveryBase =
    createTransitionalRecoveryBase === undefined
      ? undefined
      : () => transitionalRecoveryBase ??=
          createTransitionalRecoveryBase()
  const decoded = decodeImportedSaveText(
    trimmed,
    limits,
    context,
    receivingState,
    createRecoveryBase,
  )
  assertContextTimestamp(context)
  switch (context.kind) {
    case 'automatic-unity-migration':
      // Same-device migration is trusted once. Preserve Unity's local evidence
      // and quit timestamp for the capped startup offline-credit coordinator.
      return decoded
    case 'transitional-web-upgrade':
      // This is an in-place codec/schema upgrade of the same local save. Its
      // lifecycle timestamp and local claims remain eligible for normal startup.
      return decoded
    case 'manual-shared-import': {
      const effectiveReceivingState =
        receivingState ??
        createRecoveryBase?.().copyValidatedState()
      const portableState = stripNonShareableEntitlementClaims(
        decoded.copyValidatedState(),
      )
      const withPreferences = retainReceivingDevicePreferences(
        portableState,
        effectiveReceivingState,
      )
      const transferred = retainReceivingLocalPlatformState(
        withPreferences,
        effectiveReceivingState,
      )
      retainReceivingTransitionalV2RetirementProof(
        transferred,
        effectiveReceivingState,
      )
      // Repack after receiver-owned flags are restored. Sender ownership was
      // already stripped and cannot be recovered from packed flags.
      packSettingsFlags(transferred)
      return prepareImportedSave(
        PreparedSave.fromDecoded(transferred),
        context.importedAtUtc,
      )
    }
  }
}

function retainReceivingTransitionalV2RetirementProof(
  imported: SaveRecord,
  receiving: SaveRecord | undefined,
): void {
  delete imported[TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD]
  delete imported[TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD]
  const revision = receiving?.[TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD]
  const hash = receiving?.[TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD]
  if (
    typeof revision !== 'number' ||
    !Number.isSafeInteger(revision) ||
    revision < 0 ||
    Object.is(revision, -0) ||
    typeof hash !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(hash)
  ) return
  imported[TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD] = revision
  imported[TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD] = hash
}

function decodeImportedSaveText(
  text: string,
  limits: Readonly<SaveImportLimits>,
  context: ImportContext,
  receivingState: SaveRecord | undefined,
  createTransitionalRecoveryBase: (() => PreparedSave) | undefined,
): PreparedSave {
  if (text.toUpperCase().startsWith('IDB1:')) {
    return prepareIdb1Save(text, limits).prepared
  }

  const decoded = decodeWebSaveTextBounded(text, limits)
  if (decoded.kind === 'canonical') {
    // Future canonical versions remain authoritative and must never be
    // reclassified as a historical V2 payload.
    return PreparedSave.fromDecoded(decoded.state)
  }
  const canonicalError = decoded.canonicalError
  if (
    context.kind !== 'manual-shared-import' ||
    !text.startsWith('IDSWEB1:') ||
    createTransitionalRecoveryBase === undefined
  ) {
    throw canonicalError
  }

  try {
    return recoverDecodedTransitionalV2PortableSave(
      decoded.envelope,
      createTransitionalRecoveryBase,
      {
        importLimits: limits,
        storedTimePresetFallback:
          receivingStoredTimePreset(receivingState),
      },
    )
  } catch (transitionalError) {
    if (
      transitionalError instanceof
        IncompatibleTransitionalCheckpointError
    ) {
      throw transitionalError
    }
    if (
      transitionalError instanceof
        UnreadableTransitionalCheckpointError
    ) {
      throw canonicalError
    }
    throw transitionalError
  }
}

function receivingStoredTimePreset(
  receivingState: SaveRecord | undefined,
): 'fast' | 'balanced' | 'accurate' | undefined {
  const value = receivingState?.processingStoredTimePreset
  return value === 'fast' || value === 'balanced' || value === 'accurate'
    ? value
    : undefined
}

function assertContextTimestamp(context: ImportContext): void {
  const timestamp =
    context.kind === 'automatic-unity-migration'
      ? context.observedAtUtc
      : context.kind === 'transitional-web-upgrade'
        ? context.upgradedAtUtc
        : context.importedAtUtc
  if (timestamp.trim().length === 0) {
    throw new Error('Import context timestamp must not be empty.')
  }
}
