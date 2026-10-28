import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  capturePerformanceRunProvenance,
  finalizePerformanceRunReport,
  repositoryRunIdentity,
  resolvePerformanceDistRoot,
  snapshotServedBuild,
  verifyServedBuildUnchanged,
} from './reportArtifacts'
import { createSoakReport, performanceReportExitCode, performanceReportText } from './performanceReport'

const roots: string[] = []
afterEach(() => {
  vi.unstubAllEnvs()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function repository() {
  const root = mkdtempSync(resolve(tmpdir(), 'ids-report-provenance-'))
  roots.push(root)
  git(root, 'init', '--quiet')
  writeFileSync(resolve(root, '.gitignore'), 'dist/\nfrozen/\n')
  writeFileSync(resolve(root, 'tracked.txt'), 'first')
  git(root, 'add', '.')
  git(root, 'commit', '--quiet', '-m', 'initial')
  for (const directory of ['dist', 'frozen']) {
    const output = resolve(root, directory)
    mkdirSync(resolve(output, '.vite'), { recursive: true })
    mkdirSync(resolve(output, 'assets'))
    writeFileSync(resolve(output, '.vite/manifest.json'), JSON.stringify({
      'index.html': { file: 'assets/main.js', imports: ['dependency'] },
      dependency: { file: 'assets/dependency.js' },
    }))
    writeFileSync(resolve(output, 'index.html'), '<script src="assets/main.js"></script>')
    writeFileSync(resolve(output, 'assets/main.js'), 'import "./dependency.js"')
    writeFileSync(resolve(output, 'assets/dependency.js'), `console.log('${directory}')`)
    writeFileSync(resolve(output, 'public.txt'), 'a public asset outside the manifest')
  }
  return root
}

function git(root: string, ...args: string[]) {
  return execFileSync('git', [
    '-c', 'user.name=Provenance Test',
    '-c', 'user.email=provenance@example.invalid',
    '-c', 'commit.gpgsign=false',
    '-c', `core.hooksPath=${resolve(root, 'unused-test-hooks')}`,
    ...args,
  ], { cwd: root, encoding: 'utf8' }).trim()
}

function passingReport() {
  const snapshot = {
    heapUsedBytes: 1000,
    resources: {
      documents: 1, nodes: 10, jsEventListeners: 1, documentNodes: 10,
      activeEventListeners: 1, activeTimeouts: 0, activeIntervals: 0,
      activeAnimationFrames: 0, activePointers: 0,
      callbackSubscriptionSets: 1, callbackSubscriptionMembers: 1,
    },
  }
  return createSoakReport({
    mode: 'acceptance', createdAtUtc: new Date().toISOString(),
    environment: { browser: 'test', browserVersion: '1', platform: 'test', productionUrl: 'http://localhost' },
    durationMilliseconds: 30 * 60 * 1000, warmupMilliseconds: 30_000,
    explicitGarbageCollections: 4, baseline: snapshot, final: snapshot,
    consoleErrors: [], pageErrors: [],
  })
}

describe('performance report provenance', () => {
  test('keeps the starting checkout after HEAD changes and selects the explicit build snapshot', () => {
    const root = repository()
    vi.stubEnv('IDS_PERFORMANCE_DIST', 'frozen')
    const directory = resolvePerformanceDistRoot(root)
    const provenance = capturePerformanceRunProvenance(root, directory)
    const initialRevision = git(root, 'rev-parse', 'HEAD')
    expect(directory).toBe(realpathSync(resolve(root, 'frozen')))
    expect(provenance.servedBuild.treeSha256).not.toBe(snapshotServedBuild(resolve(root, 'dist')).treeSha256)
    expect(provenance.servedBuild.files.map(file => file.path)).toContain('public.txt')

    writeFileSync(resolve(root, 'tracked.txt'), 'second')
    git(root, 'commit', '--quiet', '-am', 'second')
    expect(repositoryRunIdentity(root).revision).not.toBe(initialRevision)
    expect(provenance.checkoutAtStart).toEqual({ revision: initialRevision, workingTreeDirty: false })
    expect(verifyServedBuildUnchanged(provenance.servedBuild).unchanged).toBe(true)
    const report = finalizePerformanceRunReport(passingReport(), provenance)
    expect(performanceReportExitCode(report)).toBe(0)
    expect(performanceReportText(report)).toContain('Checkout at run start (not build source)')
    expect(performanceReportText(report)).toContain(initialRevision)
  })

  test('invalidates a passing measurement when a dependency changes without a manifest or HTML change', () => {
    const root = repository()
    const provenance = capturePerformanceRunProvenance(root, resolve(root, 'frozen'))
    const beforeManifest = readFileSync(resolve(root, 'frozen/.vite/manifest.json'), 'utf8')
    writeFileSync(resolve(root, 'frozen/assets/dependency.js'), 'changed dependency')
    const report = finalizePerformanceRunReport(passingReport(), provenance)
    expect(readFileSync(resolve(root, 'frozen/.vite/manifest.json'), 'utf8')).toBe(beforeManifest)
    expect(report.buildIntegrity.unchanged).toBe(false)
    expect(report.provenance.servedBuild.indexHtmlSha256).toBe(snapshotServedBuild(resolve(root, 'frozen')).indexHtmlSha256)
    expect(report.passed).toBe(false)
    expect(report.acceptanceEligible).toBe(false)
    expect(performanceReportExitCode(report)).toBe(1)
    expect(performanceReportText(report)).toContain('FAIL Served build integrity')
  })

  test('invalidates removed public assets and unavailable builds', () => {
    const root = repository()
    const provenance = capturePerformanceRunProvenance(root, resolve(root, 'frozen'))
    rmSync(resolve(root, 'frozen/public.txt'))
    expect(verifyServedBuildUnchanged(provenance.servedBuild).unchanged).toBe(false)
    rmSync(resolve(root, 'frozen'), { recursive: true })
    expect(verifyServedBuildUnchanged(provenance.servedBuild)).toMatchObject({ unchanged: false })
  })
})
