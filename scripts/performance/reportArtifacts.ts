import {
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import {
  assertPerformanceReport,
  performanceReportText,
  type FirstSlicePerformanceReport,
} from './performanceReport'

export interface ServedBuildFile {
  readonly path: string
  readonly bytes: number
  readonly sha256: string
}

export interface ServedBuildSnapshot {
  readonly distRoot: string
  readonly manifestSha256: string
  readonly indexHtmlSha256: string
  readonly treeSha256: string
  readonly files: readonly ServedBuildFile[]
}

export interface PerformanceRunProvenance {
  readonly startedAtUtc: string
  /** Describes the measurement checkout, not the source of the served build. */
  readonly checkoutAtStart: ReturnType<typeof repositoryRunIdentity>
  readonly servedBuild: ServedBuildSnapshot
}

export interface ServedBuildIntegrity {
  readonly checkedAtUtc: string
  readonly unchanged: boolean
  readonly finalTreeSha256?: string
  readonly failureReason?: string
}

export function resolvePerformanceDistRoot(
  webRoot: string,
  configured = process.env.IDS_PERFORMANCE_DIST,
): string {
  return realpathSync(resolve(webRoot, configured || 'dist'))
}

/** Fingerprints all served files, including dynamic chunks and public assets. */
export function snapshotServedBuild(distRoot: string): ServedBuildSnapshot {
  const files: ServedBuildFile[] = []
  const visit = (directory: string, prefix: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = prefix + entry.name
      const absolutePath = resolve(directory, entry.name)
      if (entry.isDirectory()) {
        visit(absolutePath, `${path}/`)
      } else if (entry.isFile()) {
        const contents = readFileSync(absolutePath)
        files.push({ path, bytes: contents.byteLength, sha256: sha256(contents) })
      } else {
        throw new Error(`Build snapshot requires regular files and directories: ${absolutePath}`)
      }
    }
  }
  visit(distRoot, '')
  files.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0)
  const manifest = files.find((file) => file.path === '.vite/manifest.json')
  const index = files.find((file) => file.path === 'index.html')
  if (manifest === undefined || index === undefined) {
    throw new Error(`Build snapshot requires .vite/manifest.json and index.html: ${distRoot}`)
  }
  return {
    distRoot,
    manifestSha256: manifest.sha256,
    indexHtmlSha256: index.sha256,
    treeSha256: sha256(JSON.stringify(files)),
    files,
  }
}

export function capturePerformanceRunProvenance(
  webRoot: string,
  distRoot = resolvePerformanceDistRoot(webRoot),
): PerformanceRunProvenance {
  return {
    startedAtUtc: new Date().toISOString(),
    checkoutAtStart: repositoryRunIdentity(webRoot),
    servedBuild: snapshotServedBuild(distRoot),
  }
}

export function verifyServedBuildUnchanged(
  before: ServedBuildSnapshot,
): ServedBuildIntegrity {
  const checkedAtUtc = new Date().toISOString()
  try {
    const after = snapshotServedBuild(before.distRoot)
    const unchanged = before.treeSha256 === after.treeSha256
    return {
      checkedAtUtc,
      unchanged,
      finalTreeSha256: after.treeSha256,
      ...(unchanged ? {} : {
        failureReason: 'Served build files changed during measurement; the run cannot certify one build.',
      }),
    }
  } catch (error) {
    return {
      checkedAtUtc,
      unchanged: false,
      failureReason: `Served build could not be reverified: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export function finalizePerformanceRunReport<T extends FirstSlicePerformanceReport>(
  report: T,
  provenance: PerformanceRunProvenance,
): T & { readonly provenance: PerformanceRunProvenance; readonly buildIntegrity: ServedBuildIntegrity } {
  const buildIntegrity = verifyServedBuildUnchanged(provenance.servedBuild)
  return {
    ...report,
    provenance,
    buildIntegrity,
    passed: report.passed && buildIntegrity.unchanged,
    acceptanceEligible: report.acceptanceEligible && buildIntegrity.unchanged,
  }
}

function sha256(contents: string | Uint8Array): string {
  return createHash('sha256').update(contents).digest('hex')
}

export function writePerformanceReport(
  webRoot: string,
  stem: string,
  report: FirstSlicePerformanceReport,
): {
  readonly jsonPath: string
  readonly textPath: string
} {
  assertPerformanceReport(report)
  const outputRoot = resolve(webRoot, 'output', 'performance')
  mkdirSync(outputRoot, { recursive: true })
  const jsonPath = resolve(outputRoot, `${stem}.json`)
  const textPath = resolve(outputRoot, `${stem}.txt`)
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`)
  writeFileSync(textPath, performanceReportText(report))
  return { jsonPath, textPath }
}

export function integerArgument(
  argumentsList: readonly string[],
  name: string,
  fallback: number,
): number {
  const prefix = `--${name}=`
  const supplied = argumentsList.find((argument) =>
    argument.startsWith(prefix),
  )
  if (supplied === undefined) return fallback
  const value = Number(supplied.slice(prefix.length))
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`--${name} must be a positive integer.`)
  }
  return value
}

export function hasFlag(
  argumentsList: readonly string[],
  name: string,
): boolean {
  return argumentsList.includes(`--${name}`)
}

export function repositoryRunIdentity(webRoot: string): {
  readonly revision: string
  readonly workingTreeDirty: boolean
} {
  return {
    revision: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: webRoot,
      encoding: 'utf8',
    }).trim(),
    workingTreeDirty: execFileSync('git', ['status', '--porcelain'], {
      cwd: webRoot,
      encoding: 'utf8',
    }).trim().length > 0,
  }
}
