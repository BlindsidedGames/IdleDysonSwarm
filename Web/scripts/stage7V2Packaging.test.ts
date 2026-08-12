import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { afterAll, describe, expect, test } from 'vitest'
import { build } from 'vite'

const webRoot = resolve(import.meta.dirname, '..')
const output = mkdtempSync(join(tmpdir(), 'ids-stage7-v2-package-'))

afterAll(() => rmSync(output, { recursive: true, force: true }))

describe('Stage 7 V2 dormant production packaging', () => {
  test.each([
    ['web', 'production'],
    ['native', 'native'],
  ] as const)('emits the lazy hashed worker for %s without app startup activation', async (name, mode) => {
    const outDir = resolve(output, name)
    await build({
      root: webRoot,
      configFile: resolve(webRoot, 'vite.config.ts'),
      mode,
      logLevel: 'silent',
      build: { outDir, emptyOutDir: true },
    })
    const files = listFiles(outDir)
    const worker = exactlyOne(files,
      /assets\/storedTimeWorkerV2-[A-Za-z0-9_-]+\.js$/u)
    const launcher = exactlyOne(files,
      /assets\/stage7-v2-certification-launcher-[A-Za-z0-9_-]+\.js$/u)
    const access = exactlyOne(files,
      /assets\/stage7-v2-certification-access-[A-Za-z0-9_-]+\.js$/u)
    const accessImplementation = exactlyOne(files,
      /assets\/access-[A-Za-z0-9_-]+\.js$/u)
    const identity = exactlyOne(files,
      /assets\/workerIdentityV2-[A-Za-z0-9_-]+\.js$/u)
    const workerSource = readFileSync(worker, 'utf8')
    const launcherSource = readFileSync(launcher, 'utf8')
    const accessSource = readFileSync(access, 'utf8')
    const accessImplementationSource = readFileSync(accessImplementation, 'utf8')
    const identitySource = readFileSync(identity, 'utf8')
    expect(statSync(worker).size).toBeLessThanOrEqual(750 * 1024)
    expect(gzipSync(launcherSource).byteLength).toBeLessThanOrEqual(4 * 1024)
    expect(gzipSync(accessSource).byteLength).toBeLessThanOrEqual(4 * 1024)
    expect(gzipSync(workerSource).byteLength + gzipSync(launcherSource).byteLength +
      gzipSync(accessSource).byteLength + gzipSync(accessImplementationSource).byteLength +
      gzipSync(identitySource).byteLength)
      .toBeLessThanOrEqual(1024 * 1024)
    expect(accessSource).not.toContain('new Worker(')
    expect(accessImplementationSource).toContain('import(')
    expect(launcherSource).toContain('new Worker(new URL(')
    expect(launcherSource).toContain('type:`module`')
    expect(launcherSource).not.toMatch(/Blob|data:|SharedArrayBuffer|Atomics/u)
    expect(workerSource).not.toMatch(/SharedArrayBuffer|Atomics/u)

    const index = readFileSync(resolve(outDir, 'index.html'), 'utf8')
    expect(index).not.toMatch(/stage7-v2-certification|storedTimeWorkerV2/u)
    if (mode === 'native') {
      expect(launcherSource).toContain('storedTimeWorkerV2-')
      expect(launcherSource).not.toContain('/play/assets/storedTimeWorkerV2-')
      expect(accessSource).not.toContain('/play/assets/')
      return
    }
    expect(launcherSource).toContain('/play/assets/storedTimeWorkerV2-')
    const serviceWorker = readFileSync(resolve(outDir, 'service-worker.js'), 'utf8')
    expect(serviceWorker).toContain(`/play/${relative(outDir, launcher)}`)
    expect(serviceWorker).toContain(`/play/${relative(outDir, access)}`)
    expect(serviceWorker).toContain(`/play/${relative(outDir, accessImplementation)}`)
    expect(serviceWorker).toContain(`/play/${relative(outDir, identity)}`)
    expect(serviceWorker).toContain(`/play/${relative(outDir, worker)}`)
    expect(serviceWorker).toContain('caches.match(url.pathname, { ignoreSearch: true })')
  })
})

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })
}

function exactlyOne(files: readonly string[], pattern: RegExp): string {
  const matches = files.filter((file) => pattern.test(normalize(file)))
  expect(matches).toHaveLength(1)
  return matches[0]!
}

function normalize(path: string): string {
  return path.replaceAll('\\', '/')
}

function relative(root: string, file: string): string {
  return normalize(file).slice(normalize(root).length + 1)
}
