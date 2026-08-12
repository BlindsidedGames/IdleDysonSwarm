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
import {
  createStoredTimeWorkerReleaseBuildIdV2,
  listStoredTimeWorkerReleaseSourceFilesV2,
} from '../../../vite.stored-time-worker.config'

const webRoot = resolve(import.meta.dirname, '../../..')
const output = mkdtempSync(join(tmpdir(), 'ids-stored-time-worker-v2-'))
const webOutput = resolve(output, 'web')
const nativeOutput = resolve(output, 'native')

afterAll(() => {
  rmSync(output, { recursive: true, force: true })
})

describe('Stage 4D dedicated dormant Vite worker harness', () => {
  test('uses only Vite static same-origin module-worker syntax', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, 'storedTimeWorkerHarnessV2.ts'),
      'utf8',
    )
    expect(source).toContain(
      "new Worker(new URL('./storedTimeWorkerV2.ts', import.meta.url), {",
    )
    expect(source).toContain("type: 'module'")
    expect(source).not.toMatch(/Blob|data:|SharedArrayBuffer|Atomics/u)
    const workerShell = readFileSync(
      resolve(import.meta.dirname, 'storedTimeWorkerV2.ts'),
      'utf8',
    )
    const benchmark = readFileSync(
      resolve(import.meta.dirname, 'storedTimeWorkerBenchmarkV2.ts'),
      'utf8',
    )
    expect(workerShell).toContain('decodeStoredTimeWorkerMainFrameV2')
    expect(workerShell).toContain('postStoredTimeWorkerFrameMessageV2')
    expect(workerShell).toContain('createStoredTimeWorkerLiveJobBudgetV2')
    expect(workerShell).toContain('terminalizeTransportBudget()')
    expect(workerShell).toContain('StoredTimeWorkerShellStateV2')
    expect(benchmark).toContain('decodeStoredTimeWorkerFrameMessageV2')
    expect(benchmark).toContain('postStoredTimeWorkerMainFrameV2')
    const executableSources = listFiles(resolve(webRoot, 'src'))
      .filter((file) => /\.(?:ts|tsx)$/u.test(file))
      .filter((file) => !file.endsWith('.test.ts'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n')
    expect(executableSources).not.toContain('postStoredTimeWorkerMainMessageV2')
    expect(workerShell).not.toMatch(/\.postMessage\(message\)/u)
  })

  test('binds the dormant build identity to the full source release inputs', () => {
    const files = listStoredTimeWorkerReleaseSourceFilesV2()
    expect(files).toContain('src/math/gameDecimal.ts')
    expect(files).toContain('src/simulation/canonicalEventTimeModelV2.ts')
    expect(files).toContain('package-lock.json')

    const original = createStoredTimeWorkerReleaseBuildIdV2()
    const changedTransitiveSource = createStoredTimeWorkerReleaseBuildIdV2(
      (absolutePath, relativePath) => {
        const source = readFileSync(absolutePath)
        return relativePath === 'src/math/gameDecimal.ts'
          ? Buffer.concat([source, Buffer.from('\n// test-only source change')])
          : source
      },
    )
    expect(changedTransitiveSource).not.toBe(original)
  })

  test('emits a hashed worker under /play/ within dormant bundle budgets', async () => {
    await build({
      configFile: resolve(webRoot, 'vite.stored-time-worker.config.ts'),
      logLevel: 'silent',
      build: {
        outDir: webOutput,
        emptyOutDir: true,
      },
    })

    const files = listFiles(webOutput)
    const worker = files.find((file) =>
      /assets\/storedTimeWorkerV2-[A-Za-z0-9_-]+\.js$/u.test(normalize(file)),
    )
    expect(worker).toBeDefined()
    if (worker === undefined) return
    const workerBytes = readFileSync(worker)
    expect(gzipSync(workerBytes).byteLength).toBeLessThanOrEqual(750 * 1024)
    expect(workerBytes.toString('utf8'))
      .toMatch(/stage4d-source-sha256:[a-f0-9]{64}/u)

    const launcher = files.find((file) =>
      /assets\/stored-time-v2-[A-Za-z0-9_-]+\.js$/u.test(normalize(file)),
    )
    expect(launcher).toBeDefined()
    if (launcher !== undefined) {
      expect(gzipSync(readFileSync(launcher)).byteLength).toBeLessThanOrEqual(4 * 1024)
    }

    const totalCompressed = files
      .filter((file) => statSync(file).isFile())
      .reduce((sum, file) => sum + gzipSync(readFileSync(file)).byteLength, 0)
    expect(totalCompressed).toBeLessThanOrEqual(1024 * 1024)

    const htmlPath = files.find((file) => file.endsWith('stored-time-v2.html'))
    expect(htmlPath).toBeDefined()
    if (htmlPath !== undefined) {
      expect(readFileSync(htmlPath, 'utf8')).toContain('/play/assets/')
    }
  })

  test('emits relative native worker assets through the same static module pattern', async () => {
    await build({
      configFile: resolve(webRoot, 'vite.stored-time-worker.config.ts'),
      mode: 'native',
      logLevel: 'silent',
      build: {
        outDir: nativeOutput,
        emptyOutDir: true,
      },
    })
    const files = listFiles(nativeOutput)
    expect(files.some((file) =>
      /assets\/storedTimeWorkerV2-[A-Za-z0-9_-]+\.js$/u.test(normalize(file)),
    )).toBe(true)
    const html = files.find((file) => file.endsWith('stored-time-v2.html'))
    expect(html).toBeDefined()
    if (html !== undefined) {
      const source = readFileSync(html, 'utf8')
      expect(source).toContain('./assets/')
      expect(source).not.toContain('/play/assets/')
    }
  })

  test('keeps the dormant harness out of production roots except the exact Stage 7 launcher', () => {
    const workerDirectory = normalize(import.meta.dirname)
    const stage7Launcher = normalize(resolve(
      webRoot,
      'src/certification/stage7V2Harness.ts',
    ))
    const stage7Owners = new Set([
      stage7Launcher,
      normalize(resolve(webRoot, 'src/certification/stage7V2/access.ts')),
      normalize(resolve(webRoot, 'src/certification/stage7V2/certificationHost.ts')),
      normalize(resolve(webRoot, 'src/certification/stage7V2/nativeCertificationEntry.tsx')),
      normalize(resolve(webRoot, 'src/certification/stage7V2/repository.ts')),
      normalize(resolve(webRoot, 'src/save/productionV2Repository.ts')),
    ])
    const offenders = listFiles(resolve(webRoot, 'src'))
      .filter((file) => /\.(?:ts|tsx|js|mjs|cjs)$/u.test(file))
      .filter((file) => !normalize(file).startsWith(`${workerDirectory}/`))
      .filter((file) => !stage7Owners.has(normalize(file)))
      .filter((file) => !/\.test\.[cm]?[jt]sx?$/u.test(file))
      .filter((file) => {
        const source = readFileSync(file, 'utf8')
        return /storedTimeWorker(?:Harness)?V2|workers[\\/]storedTimeV2/u.test(source)
      })
    expect(offenders).toEqual([])
  })
})

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })
}

function normalize(path: string): string {
  return path.replaceAll('\\', '/')
}
