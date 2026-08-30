import { readFile } from 'node:fs/promises'

export async function readPackagedReleaseMetadata(path) {
  const parsed = JSON.parse(await readFile(path, 'utf8'))
  return validateReleaseMetadata(parsed)
}

export function validateReleaseMetadata(value) {
  if (
    value === null ||
    typeof value !== 'object' ||
    typeof value.buildVersion !== 'string' ||
    !isReleaseCandidateId(value.buildVersion) ||
    value.extraMetadata === null ||
    typeof value.extraMetadata !== 'object' ||
    typeof value.extraMetadata.version !== 'string' ||
    !/^\d+\.\d+\.\d+$/.test(value.extraMetadata.version) ||
    value.extraMetadata.buildVersion !== value.buildVersion
  ) {
    throw new Error('Electron release metadata is invalid.')
  }
  return Object.freeze({
    marketingVersion: value.extraMetadata.version,
    releaseCandidateId: value.buildVersion,
  })
}

function isReleaseCandidateId(value) {
  if (!/^\d{10}$/.test(value)) return false
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6))
  const day = Number(value.slice(6, 8))
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
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
