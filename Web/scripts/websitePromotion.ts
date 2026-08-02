import { createHash } from 'node:crypto'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { execFileSync } from 'node:child_process'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'

export interface WebsitePromotionConfig {
  readonly schemaVersion: 1
  readonly sourceRepository: string
  readonly websiteRepository: string
  readonly websiteBaseBranch: string
  readonly websiteDestinationDirectory: string
  readonly websiteHeadersFile: string
  readonly websiteRecordDirectory: string
  readonly canonicalUrl: string
  readonly managedHeadersStart: string
  readonly managedHeadersEnd: string
}

export interface WebsitePromotionFile {
  readonly path: string
  readonly bytes: number
  readonly sha256: string
}

export interface WebsitePromotionManifest {
  readonly schemaVersion: 1
  readonly releaseId: string
  readonly canonicalUrl: string
  readonly source: {
    readonly repository: string
    readonly commitSha: string
  }
  readonly website: {
    readonly repository: string
    readonly pinnedCommitSha: string
    readonly baseBranch: string
    readonly destinationDirectory: string
  }
  readonly websiteHeaders: WebsitePromotionFile
  readonly files: readonly WebsitePromotionFile[]
}

export function readWebsitePromotionConfig(
  path: string,
): WebsitePromotionConfig {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as WebsitePromotionConfig
  if (
    parsed.schemaVersion !== 1 ||
    parsed.websiteDestinationDirectory !== 'public/play' ||
    parsed.websiteHeadersFile !== 'public/_headers'
  ) {
    throw new Error('Unsupported or unsafe website promotion configuration.')
  }
  return Object.freeze(parsed)
}

export function prepareWebsitePromotion(options: {
  readonly webRoot: string
  readonly releaseId: string
  readonly sourceCommitSha: string
  readonly websiteCommitSha: string
}): { readonly packageDirectory: string; readonly manifest: WebsitePromotionManifest } {
  validateReleaseId(options.releaseId)
  validateCommitSha(options.sourceCommitSha, 'source')
  validateCommitSha(options.websiteCommitSha, 'website')
  const webRoot = resolve(options.webRoot)
  const config = readWebsitePromotionConfig(
    resolve(webRoot, 'release/website-promotion.json'),
  )
  const buildDirectory = resolve(webRoot, 'dist')
  verifyPwaBuild(buildDirectory)
  const outputRoot = resolve(webRoot, 'output/website-promotion')
  const packageDirectory = resolve(
    outputRoot,
    `${options.releaseId}-${options.sourceCommitSha.slice(0, 12)}`,
  )
  assertChildPath(outputRoot, packageDirectory)
  rmSync(packageDirectory, { recursive: true, force: true })
  const playDirectory = resolve(packageDirectory, 'play')
  mkdirSync(playDirectory, { recursive: true })
  copyBuildForWebsite(buildDirectory, playDirectory)
  copyFileSync(
    resolve(buildDirectory, '_headers'),
    resolve(packageDirectory, 'website-headers.fragment'),
  )
  const websiteHeaders = hashFile(
    packageDirectory,
    'website-headers.fragment',
  )
  const manifest: WebsitePromotionManifest = Object.freeze({
    schemaVersion: 1,
    releaseId: options.releaseId,
    canonicalUrl: config.canonicalUrl,
    source: Object.freeze({
      repository: config.sourceRepository,
      commitSha: options.sourceCommitSha.toLowerCase(),
    }),
    website: Object.freeze({
      repository: config.websiteRepository,
      pinnedCommitSha: options.websiteCommitSha.toLowerCase(),
      baseBranch: config.websiteBaseBranch,
      destinationDirectory: config.websiteDestinationDirectory,
    }),
    websiteHeaders,
    files: Object.freeze(hashFiles(playDirectory)),
  })
  writeFileSync(
    resolve(packageDirectory, 'promotion-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  return Object.freeze({ packageDirectory, manifest })
}

export function applyWebsitePromotion(options: {
  readonly webRoot: string
  readonly packageDirectory: string
  readonly websiteCheckout: string
}): void {
  const webRoot = resolve(options.webRoot)
  const config = readWebsitePromotionConfig(
    resolve(webRoot, 'release/website-promotion.json'),
  )
  const packageDirectory = resolve(options.packageDirectory)
  const websiteCheckout = resolve(options.websiteCheckout)
  const manifest = JSON.parse(readFileSync(
    resolve(packageDirectory, 'promotion-manifest.json'),
    'utf8',
  )) as WebsitePromotionManifest
  validateWebsitePromotionManifest(manifest, config)
  const checkoutSha = execFileSync(
    'git',
    ['rev-parse', 'HEAD'],
    { cwd: websiteCheckout, encoding: 'utf8' },
  ).trim().toLowerCase()
  if (checkoutSha !== manifest.website.pinnedCommitSha) {
    throw new Error(
      `Website checkout ${checkoutSha} does not match pinned commit ${manifest.website.pinnedCommitSha}.`,
    )
  }
  verifyWebsitePromotionPackage(packageDirectory, manifest)

  const destination = resolve(
    websiteCheckout,
    config.websiteDestinationDirectory,
  )
  assertChildPath(websiteCheckout, destination)
  rmSync(destination, { recursive: true, force: true })
  mkdirSync(dirname(destination), { recursive: true })
  cpSync(resolve(packageDirectory, 'play'), destination, {
    recursive: true,
  })

  const headersPath = resolve(
    websiteCheckout,
    config.websiteHeadersFile,
  )
  assertChildPath(websiteCheckout, headersPath)
  const existingHeaders = existsSync(headersPath)
    ? readFileSync(headersPath, 'utf8')
    : ''
  const fragment = readFileSync(
    resolve(packageDirectory, 'website-headers.fragment'),
    'utf8',
  ).trim()
  mkdirSync(dirname(headersPath), { recursive: true })
  writeFileSync(
    headersPath,
    mergeManagedHeaders(existingHeaders, fragment, config),
  )

  const recordPath = resolve(
    websiteCheckout,
    config.websiteRecordDirectory,
    `${manifest.releaseId}.json`,
  )
  assertChildPath(websiteCheckout, recordPath)
  mkdirSync(dirname(recordPath), { recursive: true })
  copyFileSync(
    resolve(packageDirectory, 'promotion-manifest.json'),
    recordPath,
  )
}

export function mergeManagedHeaders(
  existing: string,
  fragment: string,
  config: Pick<WebsitePromotionConfig, 'managedHeadersStart' | 'managedHeadersEnd'>,
): string {
  const block = [
    config.managedHeadersStart,
    fragment.trim(),
    config.managedHeadersEnd,
  ].join('\n')
  const start = existing.indexOf(config.managedHeadersStart)
  const end = existing.indexOf(config.managedHeadersEnd)
  if (start === -1 && end === -1) {
    return `${existing.trimEnd()}${existing.trim() === '' ? '' : '\n\n'}${block}\n`
  }
  if (start === -1 || end < start) {
    throw new Error('Website headers contain a malformed managed PWA block.')
  }
  const after = end + config.managedHeadersEnd.length
  return `${existing.slice(0, start)}${block}${existing.slice(after)}`
    .trimEnd() + '\n'
}

export function validateWebsitePromotionManifest(
  manifest: WebsitePromotionManifest,
  config: WebsitePromotionConfig,
): void {
  if (
    manifest.schemaVersion !== 1 ||
    manifest.canonicalUrl !== config.canonicalUrl ||
    manifest.source.repository !== config.sourceRepository ||
    manifest.website.repository !== config.websiteRepository ||
    manifest.website.baseBranch !== config.websiteBaseBranch ||
    manifest.website.destinationDirectory !==
      config.websiteDestinationDirectory ||
    manifest.websiteHeaders.path !== 'website-headers.fragment'
  ) {
    throw new Error('Website promotion manifest does not match release configuration.')
  }
  validateReleaseId(manifest.releaseId)
  validateCommitSha(manifest.source.commitSha, 'source')
  validateCommitSha(manifest.website.pinnedCommitSha, 'website')
}

export function verifyWebsitePromotionPackage(
  packageDirectory: string,
  manifest: WebsitePromotionManifest,
): void {
  verifyPackageChecksums(
    resolve(packageDirectory, 'play'),
    manifest.files,
  )
  verifyPackageFile(packageDirectory, manifest.websiteHeaders)
}

function verifyPwaBuild(buildDirectory: string): void {
  for (const required of [
    'index.html',
    'manifest.webmanifest',
    'service-worker.js',
    '_headers',
  ]) {
    if (!existsSync(resolve(buildDirectory, required))) {
      throw new Error(`PWA build is missing ${required}; run npm run build first.`)
    }
  }
  const manifest = JSON.parse(readFileSync(
    resolve(buildDirectory, 'manifest.webmanifest'),
    'utf8',
  )) as { start_url?: string; scope?: string }
  if (manifest.start_url !== '/play/' || manifest.scope !== '/play/') {
    throw new Error('PWA manifest is not scoped to /play/.')
  }
}

function copyBuildForWebsite(
  sourceDirectory: string,
  destinationDirectory: string,
): void {
  for (const source of listFiles(sourceDirectory)) {
    const path = relative(sourceDirectory, source).replaceAll('\\', '/')
    if (path === '_headers' || path.startsWith('.vite/')) continue
    const destination = resolve(destinationDirectory, path)
    mkdirSync(dirname(destination), { recursive: true })
    copyFileSync(source, destination)
  }
}

function hashFiles(directory: string): WebsitePromotionFile[] {
  return listFiles(directory)
    .map((path) => hashFile(
      directory,
      relative(directory, path).replaceAll('\\', '/'),
    ))
    .sort((left, right) => left.path.localeCompare(right.path))
}

function hashFile(
  directory: string,
  relativePath: string,
): WebsitePromotionFile {
  const path = resolve(directory, relativePath)
  assertChildPath(directory, path)
  return Object.freeze({
    path: relativePath.replaceAll('\\', '/'),
    bytes: statSync(path).size,
    sha256: createHash('sha256')
      .update(readFileSync(path))
      .digest('hex'),
  })
}

function verifyPackageFile(
  directory: string,
  expected: WebsitePromotionFile,
): void {
  const actual = hashFile(directory, expected.path)
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Website promotion package checksum does not match for ${expected.path}.`,
    )
  }
}

function verifyPackageChecksums(
  directory: string,
  expectedFiles: readonly WebsitePromotionFile[],
): void {
  const actual = hashFiles(directory)
  if (JSON.stringify(actual) !== JSON.stringify(expectedFiles)) {
    throw new Error('Website promotion package checksums do not match its manifest.')
  }
}

function listFiles(directory: string): string[] {
  return readdirSync(directory)
    .flatMap((entry) => {
      const path = join(directory, entry)
      return statSync(path).isDirectory() ? listFiles(path) : [path]
    })
}

function validateReleaseId(releaseId: string): void {
  if (!/^\d{10}$/.test(releaseId)) {
    throw new Error('Release ID must use UTC YYYYMMDDNN format.')
  }
}

function validateCommitSha(value: string, label: string): void {
  if (!/^[0-9a-f]{40}$/i.test(value)) {
    throw new Error(`${label} commit must be a complete 40-character SHA.`)
  }
}

function assertChildPath(parent: string, candidate: string): void {
  const normalizedParent = resolve(parent)
  const normalizedCandidate = resolve(candidate)
  if (!normalizedCandidate.startsWith(`${normalizedParent}${sep}`)) {
    throw new Error(
      `${basename(normalizedCandidate)} is outside the permitted promotion directory.`,
    )
  }
}
