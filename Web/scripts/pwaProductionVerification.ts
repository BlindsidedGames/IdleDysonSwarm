export const PWA_PRODUCTION_VERIFICATION_SCHEMA_VERSION = 2

export interface PwaProductionVerificationRunIdentity {
  readonly revision: string
  readonly workingTreeDirty: boolean
}

export function assertCleanPwaVerificationCandidate(
  identity: PwaProductionVerificationRunIdentity,
): void {
  if (!identity.workingTreeDirty) return
  throw new Error(
    'PWA production verification requires a clean working tree so its recorded revision exactly identifies the tested candidate.',
  )
}

export function assertPwaVerificationCandidateUnchanged(
  expected: PwaProductionVerificationRunIdentity,
  observed: PwaProductionVerificationRunIdentity,
): void {
  assertCleanPwaVerificationCandidate(observed)
  if (observed.revision === expected.revision) return
  throw new Error(
    'PWA production verification candidate changed revision while verification was running.',
  )
}
