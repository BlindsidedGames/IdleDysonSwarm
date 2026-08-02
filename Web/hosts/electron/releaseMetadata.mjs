import { readFile } from 'node:fs/promises'

export async function readPackagedReleaseMetadata(path) {
  const parsed = JSON.parse(await readFile(path, 'utf8'))
  return validateReleaseMetadata(parsed)
}

export function validateReleaseMetadata(value) {
  if (
    value === null ||
    typeof value !== 'object' ||
    value.schemaVersion !== 1 ||
    typeof value.marketingVersion !== 'string' ||
    !/^\d+\.\d+\.\d+$/.test(value.marketingVersion) ||
    typeof value.defaultReleaseCandidateId !== 'string' ||
    !/^\d{10}$/.test(value.defaultReleaseCandidateId)
  ) {
    throw new Error('Native release metadata is invalid.')
  }
  return Object.freeze({
    marketingVersion: value.marketingVersion,
    releaseCandidateId: value.defaultReleaseCandidateId,
  })
}

export function runtimeMetadata(appVersion, release) {
  if (appVersion !== release.marketingVersion) {
    throw new Error(
      'Packaged application version does not match native release metadata.',
    )
  }
  return Object.freeze({
    applicationVersion: appVersion,
    buildNumber: release.releaseCandidateId,
  })
}
