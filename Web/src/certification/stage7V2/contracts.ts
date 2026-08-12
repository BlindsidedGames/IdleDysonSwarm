import type { Schema13PlatformState } from '../../save/schema13'
import type { StoredTimePolicyIdV2 } from '../../simulation/storedTimePolicyV2'

export const STAGE7_V2_CERTIFICATION_NAMESPACE =
  'stage7-v2-certification' as const
export const STAGE7_V2_CERTIFICATION_MAXIMUM_TEXT_BYTES =
  32 * 1024 * 1024

export const STAGE7_V2_CERTIFICATION_DEFAULT_POLICY =
  'stored-time-fast-v1' as const

export const STAGE7_V2_CERTIFICATION_POLICIES = Object.freeze([
  'stored-time-fast-v1',
  'stored-time-balanced-v1',
  'stored-time-exact-v1',
] as const satisfies readonly StoredTimePolicyIdV2[])

export interface Stage7V2CertificationStorage {
  exists(path: string): Promise<boolean>
  readText(path: string): Promise<string>
  writeText(path: string, text: string): Promise<void>
  replaceAtomically(temporaryPath: string, destinationPath: string): Promise<void>
  copy(sourcePath: string, destinationPath: string): Promise<void>
  removeExactly(paths: readonly string[]): Promise<void>
  withExclusiveMutation<T>(operation: () => Promise<T>): Promise<T>
}

export interface Stage7V2CertificationCheckpoint {
  readonly revision: number
  readonly portableSave: string
  readonly platform: Readonly<Schema13PlatformState>
}

export interface Stage7V2CertificationPaths {
  readonly root: string
  readonly current: string
  readonly temporary: string
  readonly backups: readonly [string, string, string]
  readonly recoveryImport: string
  readonly recoveryImportTemporary: string
  readonly storedTimePolicy: string
  readonly storedTimeJob: string
  readonly storedTimeJobTemporary: string
  readonly evidenceDraft: string
  readonly evidenceDraftTemporary: string
}

export function createStage7V2CertificationPaths(
  buildScope: string,
): Readonly<Stage7V2CertificationPaths> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u.test(buildScope)) {
    throw new TypeError('Stage 7 certification build scope is invalid.')
  }
  const root = `${STAGE7_V2_CERTIFICATION_NAMESPACE}/${buildScope}`
  return Object.freeze({
    root,
    current: `${root}/checkpoint/current.json`,
    temporary: `${root}/checkpoint/current.json.tmp`,
    backups: Object.freeze([
      `${root}/checkpoint/backups/current.1.json`,
      `${root}/checkpoint/backups/current.2.json`,
      `${root}/checkpoint/backups/current.3.json`,
    ] as const),
    recoveryImport: `${root}/recovery/import-original.idsw`,
    recoveryImportTemporary: `${root}/recovery/import-original.idsw.tmp`,
    storedTimePolicy: `${root}/local/stored-time-policy.json`,
    storedTimeJob: `${root}/stored-time/job.json`,
    storedTimeJobTemporary: `${root}/stored-time/job.json.tmp`,
    evidenceDraft: `${root}/evidence/draft.json`,
    evidenceDraftTemporary: `${root}/evidence/draft.json.tmp`,
  })
}

export function stage7V2CertificationCleanupPaths(
  paths: Readonly<Stage7V2CertificationPaths>,
): readonly string[] {
  return Object.freeze([
    paths.current,
    paths.temporary,
    ...paths.backups,
    paths.recoveryImport,
    paths.recoveryImportTemporary,
    paths.storedTimePolicy,
    paths.storedTimeJob,
    paths.storedTimeJobTemporary,
    paths.evidenceDraft,
    paths.evidenceDraftTemporary,
  ])
}

export function isStage7V2StoredTimePolicy(
  value: unknown,
): value is StoredTimePolicyIdV2 {
  return typeof value === 'string' &&
    STAGE7_V2_CERTIFICATION_POLICIES.includes(
      value as StoredTimePolicyIdV2,
    )
}
