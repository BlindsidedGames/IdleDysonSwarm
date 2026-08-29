import { prepareIdb1Save, type PreparedSave } from '../../save/prepare'
import { CURRENT_SAVE_SCHEMA } from '../../save/migrate'
import { DEFAULT_BOTTOM_NAVIGATION_VISIBILITY } from '../../game-state/navigationPreferences'
import firstRunSaveText from './generated/first-run-schema-12.idb1.txt?raw'
import provenance from './generated/first-run-schema-12.provenance.json'

export interface UnityFirstRunCatalogHash {
  readonly path: string
  readonly sha256: string
}

export interface UnityFirstRunProvenance {
  readonly formatVersion: number
  readonly artifactPath: string
  readonly artifactSha256: string
  readonly decodedBinarySha256: string
  readonly unityVersion: string
  readonly unityRevision: string
  readonly saveSchema: number
  readonly fixedFirstRunUtc: string
  readonly exportMethod: string
  readonly exportCommand: string
  readonly sourceContract: string
  readonly catalogHashes: readonly UnityFirstRunCatalogHash[]
  readonly lifecycleMetadataNormalizationPaths: readonly string[]
}

export interface UnityFirstRunSaveOptions {
  readonly startedAtUtc: string
}

export const unityFirstRunProvenance: UnityFirstRunProvenance = provenance

/**
 * Intentional Web product defaults applied only when no player save exists.
 * These are kept separate from Unity artifact provenance so every gameplay
 * override authored by the Web host remains explicit and testable.
 */
export const webFirstRunGameplayOverridePaths = Object.freeze([
  '$.infinityAutomaticReset',
  '$.bottomNavigationPreferences',
] as const)

/**
 * Creates a production first-run save from Unity defaults with a host-supplied
 * UTC lifecycle origin and the classified Web first-run gameplay overrides.
 */
export function createUnityFirstRunPreparedSave(
  options: Readonly<UnityFirstRunSaveOptions>,
): PreparedSave {
  const startedAtUtc = normalizeUtc(options.startedAtUtc)
  const deterministic = createDeterministicUnityFirstRunPreparedSave()
  const candidate = deterministic.copyValidatedState()
  candidate.dateStarted = startedAtUtc
  candidate.infinityAutomaticReset = false
  candidate.bottomNavigationPreferences = {
    version: 1,
    visibility: { ...DEFAULT_BOTTOM_NAVIGATION_VISIBILITY },
  }
  return deterministic.withValidatedState(candidate)
}

/**
 * Decodes a defensive copy of the deterministic Unity-generated artifact.
 * Production startup should use createUnityFirstRunPreparedSave with host UTC.
 */
export function createDeterministicUnityFirstRunPreparedSave(): PreparedSave {
  const imported = prepareIdb1Save(firstRunSaveText)
  if (imported.prepared.targetSchema !== CURRENT_SAVE_SCHEMA) {
    throw new Error(
      `Unity first-run artifact migrated to schema ${imported.prepared.targetSchema}, not supported schema ${CURRENT_SAVE_SCHEMA}.`,
    )
  }
  if (imported.prepared.sourceSchema !== provenance.saveSchema) {
    throw new Error(
      `Unity first-run artifact unexpectedly requires migration from schema ${imported.prepared.sourceSchema}.`,
    )
  }
  return imported.prepared
}

function normalizeUtc(value: string): string {
  if (value.trim().length === 0) {
    throw new Error('First-run start timestamp must not be empty.')
  }
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error(`First-run start timestamp is invalid: ${value}`)
  }
  return timestamp.toISOString()
}
