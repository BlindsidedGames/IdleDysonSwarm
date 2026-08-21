import { createHash } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, extname, isAbsolute, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export type ReleaseSecurityProfile =
  | 'unsigned'
  | 'debug-only'
  | 'release-signed'

export interface ReleaseArtifactEntry {
  readonly file: string
  readonly bytes: number
  readonly sha256: string
}

export interface NativeReleaseArtifactManifest {
  readonly schemaVersion: 1
  readonly releaseCandidateId: string
  readonly sourceCommit: string
  readonly sourceDateEpoch: number
  readonly platform: string
  readonly securityProfile: ReleaseSecurityProfile
  readonly artifacts: readonly ReleaseArtifactEntry[]
}

interface ManifestRequest {
  readonly releaseCandidateId: string
  readonly sourceCommit: string
  readonly sourceDateEpoch: number
  readonly platform: string
  readonly securityProfile: ReleaseSecurityProfile
  readonly outputDirectory: string
  readonly artifactPaths: readonly string[]
}

interface ManifestVerificationRequest {
  readonly releaseCandidateId: string
  readonly sourceCommit: string
  readonly platform: string
  readonly securityProfile: ReleaseSecurityProfile
  readonly outputDirectory: string
  readonly artifactExtension?: string
  readonly exactArtifactCount?: number
}

const reservedArtifactNames = new Set(['manifest.json', 'SHA256SUMS'])

export async function createNativeReleaseArtifactManifest(
  request: ManifestRequest,
): Promise<NativeReleaseArtifactManifest> {
  validateRequest(request)
  const outputDirectory = resolve(request.outputDirectory)
  const entries = await Promise.all(
    [...request.artifactPaths].sort().map(async (artifactPath) => {
      const resolvedPath = resolve(artifactPath)
      const file = validateArtifactPath(outputDirectory, resolvedPath)
      const details = await lstat(resolvedPath)
      if (details.isSymbolicLink() || !details.isFile()) {
        throw new Error(`Release artifact must be a regular non-symlink file: ${artifactPath}`)
      }
      const contents = await readFile(resolvedPath)
      return Object.freeze({
        file,
        bytes: contents.byteLength,
        sha256: createHash('sha256').update(contents).digest('hex'),
      })
    }),
  )
  if (new Set(entries.map(({ file }) => file)).size !== entries.length) {
    throw new Error('Release artifacts must have unique file names')
  }

  const manifest = Object.freeze({
    schemaVersion: 1 as const,
    releaseCandidateId: request.releaseCandidateId,
    sourceCommit: request.sourceCommit.toLowerCase(),
    sourceDateEpoch: request.sourceDateEpoch,
    platform: request.platform,
    securityProfile: request.securityProfile,
    artifacts: Object.freeze(entries),
  })
  await mkdir(outputDirectory, { recursive: true })
  await Promise.all([
    writeFile(
      resolve(outputDirectory, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    ),
    writeFile(
      resolve(outputDirectory, 'SHA256SUMS'),
      `${entries.map(({ sha256, file }) => `${sha256}  ${file}`).join('\n')}\n`,
      'utf8',
    ),
  ])
  return manifest
}

export async function verifyNativeReleaseArtifactManifest(
  request: ManifestVerificationRequest,
): Promise<NativeReleaseArtifactManifest> {
  validateVerificationRequest(request)
  const outputDirectory = resolve(request.outputDirectory)
  const parsed = JSON.parse(
    await readFile(resolve(outputDirectory, 'manifest.json'), 'utf8'),
  ) as NativeReleaseArtifactManifest
  validateManifestShape(parsed)
  if (parsed.releaseCandidateId !== request.releaseCandidateId) {
    throw new Error('Release manifest releaseCandidateId does not match the requested release')
  }
  if (parsed.sourceCommit !== request.sourceCommit.toLowerCase()) {
    throw new Error('Release manifest sourceCommit does not match the requested source')
  }
  if (parsed.platform !== request.platform) {
    throw new Error('Release manifest platform does not match the requested platform')
  }
  if (parsed.securityProfile !== request.securityProfile) {
    throw new Error('Release manifest securityProfile does not match the requested profile')
  }
  if (
    request.exactArtifactCount !== undefined &&
    parsed.artifacts.length !== request.exactArtifactCount
  ) {
    throw new Error(`Release manifest must contain exactly ${request.exactArtifactCount} artifact(s)`)
  }

  if (request.artifactExtension !== undefined) {
    const extension = `.${request.artifactExtension.toLowerCase()}`
    const extensionEntries = (await readdir(outputDirectory, {
      withFileTypes: true,
    })).filter(({ name }) => extname(name).toLowerCase() === extension)
    for (const entry of extensionEntries) {
      if (entry.isSymbolicLink() || !entry.isFile()) {
        throw new Error(
          `Release ${extension} artifact must be a regular non-symlink file: ${entry.name}`,
        )
      }
    }
    const actualFiles = extensionEntries.map(({ name }) => name).sort()
    const manifestedFiles = parsed.artifacts.map(({ file }) => file).sort()
    if (
      actualFiles.length !== manifestedFiles.length ||
      actualFiles.some((file, index) => file !== manifestedFiles[index])
    ) {
      throw new Error(
        `Actual ${extension} artifacts do not exactly match manifest.json`,
      )
    }
  }

  for (const entry of parsed.artifacts) {
    if (
      request.artifactExtension !== undefined &&
      extname(entry.file).toLowerCase() !== `.${request.artifactExtension.toLowerCase()}`
    ) {
      throw new Error(`Release artifact must use .${request.artifactExtension}: ${entry.file}`)
    }
    const artifactPath = resolve(outputDirectory, entry.file)
    validateArtifactPath(outputDirectory, artifactPath)
    const details = await lstat(artifactPath)
    if (details.isSymbolicLink() || !details.isFile()) {
      throw new Error(`Release artifact must be a regular non-symlink file: ${entry.file}`)
    }
    const contents = await readFile(artifactPath)
    const sha256 = createHash('sha256').update(contents).digest('hex')
    if (contents.byteLength !== entry.bytes || sha256 !== entry.sha256) {
      throw new Error(`Release artifact does not match its manifest: ${entry.file}`)
    }
  }

  const expectedChecksums = `${parsed.artifacts
    .map(({ sha256, file }) => `${sha256}  ${file}`)
    .join('\n')}\n`
  if (await readFile(resolve(outputDirectory, 'SHA256SUMS'), 'utf8') !== expectedChecksums) {
    throw new Error('SHA256SUMS does not match manifest.json')
  }
  return Object.freeze(parsed)
}

function validateRequest(request: ManifestRequest): void {
  if (!/^\d{10}$/.test(request.releaseCandidateId)) {
    throw new Error('releaseCandidateId must use UTC YYYYMMDDNN')
  }
  if (!/^[0-9a-f]{40}$/i.test(request.sourceCommit)) {
    throw new Error('sourceCommit must be a full 40-character Git SHA')
  }
  if (!Number.isSafeInteger(request.sourceDateEpoch) || request.sourceDateEpoch < 0) {
    throw new Error('sourceDateEpoch must be a non-negative integer')
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(request.platform)) {
    throw new Error('platform must be a lower-case artifact identifier')
  }
  if (!['unsigned', 'debug-only', 'release-signed'].includes(
    request.securityProfile,
  )) {
    throw new Error('securityProfile is unsupported')
  }
  if (request.artifactPaths.length === 0) {
    throw new Error('At least one release artifact is required')
  }
}

function validateVerificationRequest(request: ManifestVerificationRequest): void {
  validateRequest({
    ...request,
    sourceDateEpoch: 0,
    artifactPaths: ['placeholder'],
  })
  if (
    request.exactArtifactCount !== undefined &&
    (!Number.isSafeInteger(request.exactArtifactCount) || request.exactArtifactCount < 1)
  ) {
    throw new Error('exactArtifactCount must be a positive integer')
  }
  if (
    request.artifactExtension !== undefined &&
    !/^[a-z0-9]+$/i.test(request.artifactExtension)
  ) {
    throw new Error('artifactExtension must contain only letters and digits')
  }
}

function validateManifestShape(value: NativeReleaseArtifactManifest): void {
  if (
    value === null ||
    typeof value !== 'object' ||
    value.schemaVersion !== 1 ||
    !/^\d{10}$/.test(value.releaseCandidateId) ||
    !/^[0-9a-f]{40}$/.test(value.sourceCommit) ||
    !Number.isSafeInteger(value.sourceDateEpoch) ||
    !/^[a-z0-9][a-z0-9-]*$/.test(value.platform) ||
    !['unsigned', 'debug-only', 'release-signed'].includes(value.securityProfile) ||
    !Array.isArray(value.artifacts) ||
    value.artifacts.length === 0 ||
    value.artifacts.some((entry) =>
      entry === null ||
      typeof entry !== 'object' ||
      typeof entry.file !== 'string' ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes < 0 ||
      !/^[0-9a-f]{64}$/.test(entry.sha256)
    )
  ) {
    throw new Error('Release manifest is malformed')
  }
  if (new Set(value.artifacts.map(({ file }) => file)).size !== value.artifacts.length) {
    throw new Error('Release manifest artifact names must be unique')
  }
}

function validateArtifactPath(outputDirectory: string, artifactPath: string): string {
  const containedPath = relative(outputDirectory, artifactPath)
  if (
    containedPath.length === 0 ||
    isAbsolute(containedPath) ||
    containedPath === '..' ||
    containedPath.startsWith(`..\\`) ||
    containedPath.startsWith('../') ||
    basename(containedPath) !== containedPath
  ) {
    throw new Error(`Release artifact must be directly contained by the output directory: ${artifactPath}`)
  }
  const file = basename(containedPath)
  if (reservedArtifactNames.has(file)) {
    throw new Error(`Release artifact uses a reserved file name: ${file}`)
  }
  return file
}

function parseArguments(arguments_: readonly string[]): ManifestRequest {
  const values = parseArgumentValues(arguments_)
  const required = (key: string): string => {
    const value = values.get(key)?.at(-1)
    if (value === undefined || value.length === 0) {
      throw new Error(`Missing required argument ${key}`)
    }
    return value
  }
  return {
    releaseCandidateId: required('--release-id'),
    sourceCommit: required('--source-sha'),
    sourceDateEpoch: Number(required('--source-date-epoch')),
    platform: required('--platform'),
    securityProfile: required('--security-profile') as ReleaseSecurityProfile,
    outputDirectory: resolve(required('--output')),
    artifactPaths: values.get('--artifact') ?? [],
  }
}

function parseVerificationArguments(
  arguments_: readonly string[],
): ManifestVerificationRequest {
  const parsed = parseArgumentValues(arguments_)
  const required = (key: string): string => {
    const value = parsed.get(key)?.at(-1)
    if (value === undefined || value.length === 0) {
      throw new Error(`Missing required argument ${key}`)
    }
    return value
  }
  const exactArtifactCount = parsed.get('--exact-artifact-count')?.at(-1)
  return {
    releaseCandidateId: required('--release-id'),
    sourceCommit: required('--source-sha'),
    platform: required('--platform'),
    securityProfile: required('--security-profile') as ReleaseSecurityProfile,
    outputDirectory: resolve(required('--output')),
    artifactExtension: parsed.get('--artifact-extension')?.at(-1),
    exactArtifactCount: exactArtifactCount === undefined
      ? undefined
      : Number(exactArtifactCount),
  }
}

function parseArgumentValues(arguments_: readonly string[]): Map<string, string[]> {
  const values = new Map<string, string[]>()
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index]
    const value = arguments_[index + 1]
    if (key === undefined || value === undefined || !key.startsWith('--')) {
      throw new Error('Manifest arguments must be --name value pairs')
    }
    values.set(key, [...(values.get(key) ?? []), value])
  }
  return values
}

const invokedPath = process.argv[1]
if (
  invokedPath !== undefined &&
  pathToFileURL(resolve(invokedPath)).href === import.meta.url
) {
  const arguments_ = process.argv.slice(2)
  const verifyIndex = arguments_.indexOf('--verify')
  if (verifyIndex >= 0) {
    const verificationArguments = arguments_.toSpliced(verifyIndex, 2)
    if (arguments_[verifyIndex + 1] !== 'true') {
      throw new Error('--verify must be followed by true')
    }
    const manifest = await verifyNativeReleaseArtifactManifest(
      parseVerificationArguments(verificationArguments),
    )
    process.stdout.write(
      `Verified ${manifest.artifacts.length} ${manifest.platform} artifact(s).\n`,
    )
  } else {
    const manifest = await createNativeReleaseArtifactManifest(
      parseArguments(arguments_),
    )
    process.stdout.write(
      `Recorded ${manifest.artifacts.length} ${manifest.platform} artifact(s).\n`,
    )
  }
}
