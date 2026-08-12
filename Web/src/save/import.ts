import { prepareIdb1Save, prepareImportedSave, PreparedSave } from './prepare'
import {
  stripNonShareableEntitlementClaims,
} from './serialization'
import { deserializeCurrentWebSaveBounded } from './webSaveSchemaProbe'
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

/**
 * Decodes shipped Unity (`IDB1`) or canonical Web (`IDSWEB1`) text,
 * then applies the transfer policy selected by its trusted import context. Manual
 * sharing consumes remote lifecycle time; same-device migration and in-place
 * upgrades preserve local lifecycle evidence for startup processing.
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
): PreparedSave {
  assertSuppliedSaveTextLimit(text, limits)
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    throw new Error('Imported save text must not be empty.')
  }
  const decoded = trimmed.toUpperCase().startsWith('IDB1:')
    ? prepareIdb1Save(trimmed, limits).prepared
    : PreparedSave.fromDecoded(
        deserializeCurrentWebSaveBounded(trimmed, limits),
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
      const portableState = stripNonShareableEntitlementClaims(
        decoded.copyValidatedState(),
      )
      const withPreferences = retainReceivingDevicePreferences(
        portableState,
        receivingState,
      )
      const transferred = retainReceivingLocalPlatformState(
        withPreferences,
        receivingState,
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
