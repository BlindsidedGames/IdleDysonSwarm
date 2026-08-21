import { extname, isAbsolute, relative, resolve } from 'node:path'

export const PWA_PRODUCTION_VERIFICATION_SCHEMA_VERSION = 2

export interface PwaProductionVerificationRunIdentity {
  readonly revision: string
  readonly workingTreeDirty: boolean
}

export function resolvePwaVerificationEvidencePath(
  webRoot: string,
  customOutput: string | undefined,
): string {
  if (customOutput === undefined) {
    return resolve(
      webRoot,
      'docs/archive/2026-08/pwa-production-verification-2026-08-19.json',
    )
  }
  const requested = customOutput.trim()
  if (requested.length === 0 || isAbsolute(requested)) {
    throw new Error(
      'Custom PWA verification output must be a non-empty relative JSON path under output/.',
    )
  }
  const outputRoot = resolve(webRoot, 'output')
  const candidate = resolve(webRoot, requested)
  const withinOutput = relative(outputRoot, candidate)
  if (
    withinOutput.length === 0 ||
    withinOutput.startsWith('..') ||
    isAbsolute(withinOutput) ||
    extname(candidate).toLowerCase() !== '.json'
  ) {
    throw new Error(
      'Custom PWA verification output must be a JSON file under output/.',
    )
  }
  return candidate
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
