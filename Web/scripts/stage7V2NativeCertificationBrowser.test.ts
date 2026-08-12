import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import { build } from 'vite'
import { openChromiumPage, startProductionPreview } from './performance/chromiumHarness'

const webRoot = resolve(import.meta.dirname, '..')
const output = mkdtempSync(join(tmpdir(), 'ids-stage7-native-cert-'))
afterAll(() => rmSync(output, { recursive: true, force: true }))

describe('Stage 7 native certification entry in a real browser', () => {
  test('stays idle until invoked, then opens the real repository, worker and lifecycle paths', async () => {
    const buildA = `stage7-test-a:${'a'.repeat(64)}`
    const buildB = `stage7-test-b:${'b'.repeat(64)}`
    await build({
      root: webRoot,
      configFile: resolve(webRoot, 'vite.stage7-native-certification.config.ts'),
      logLevel: 'silent',
      define: { 'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildA) },
      build: { outDir: output, emptyOutDir: true },
    })
    let preview = await startProductionPreview(webRoot, 4_198, output)
    const page = await openChromiumPage({
      id: 'stage7-native-certification', width: 390, height: 844,
      deviceScaleFactor: 1, cpuThrottleRate: 1,
    }, preview.url, { disableGpu: true })
    try {
      await page.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `
        (() => {
          const NativeWorker = globalThis.Worker;
          globalThis.__stage7WorkerCount = Number(sessionStorage.getItem('stage7-workers') ?? '0');
          globalThis.Worker = class extends NativeWorker {
            constructor(url, options) { super(url, options); globalThis.__stage7WorkerCount += 1; sessionStorage.setItem('stage7-workers', String(globalThis.__stage7WorkerCount)); }
          };
          const key = path => 'stage7-file:' + path;
          window.idleDysonSwarmNativeHost = {
            target: 'android',
            exists: async path => localStorage.getItem(key(path)) !== null,
            readText: async path => { const value = localStorage.getItem(key(path)); if (value === null) throw new Error('missing'); return value; },
            writeText: async (path, text) => { localStorage.setItem(key(path), text); },
            replaceAtomically: async (from, to) => { localStorage.setItem(key(to), localStorage.getItem(key(from))); localStorage.removeItem(key(from)); },
            copy: async (from, to) => { localStorage.setItem(key(to), localStorage.getItem(key(from))); },
            removeCertificationFiles: async paths => { for (const path of paths) localStorage.removeItem(key(path)); },
            metadata: async () => ({ applicationVersion: 'cert-test', buildNumber: '1' }),
            certificationDeviceContext: async () => ({ matrixId: 'android-api26-emulator', physicalDevice: false, osApiLevel: 26, deviceModel: 'Chrome emulator', osVersion: '8.0', applicationVersion: 'cert-test', buildNumber: '1' }),
            exportDiagnostics: async request => { localStorage.setItem('stage7-evidence', request.text); return { exported: true }; },
          };
        })();
      ` })
      await page.cdp.send('Page.navigate', { url: `${preview.url}index.html` })
      await waitForText(page, 'No repository or worker has been opened')
      expect(await text(page, 'h1')).toBe('Device certification')
      expect(await evaluate<number>(page, 'globalThis.__stage7WorkerCount')).toBe(0)
      expect(await text(page, 'body')).toContain('No repository or worker has been opened')

      await click(page, 'Run device certification')
      await waitForText(page, 'Checkpoint/readback passed')
      expect(await evaluate<number>(page, 'globalThis.__stage7WorkerCount')).toBe(0)
      await click(page, 'Purchase or enable Developer Options')
      await waitForText(page, 'Developer Options committed; purchased=true; enabled=true')
      expect(await text(page, 'body')).toContain('shards 1e5->0')
      expect(await text(page, 'body')).toContain('matter 5e5->0')
      await click(page, 'Prepare owned-disabled reload')
      await waitForText(page, 'No repository or worker has been opened')
      await click(page, 'Run device certification')
      await waitForText(page, 'Checkpoint/readback passed at durable revision 1')
      await click(page, 'Purchase or enable Developer Options')
      await waitForText(page, 'Developer Options committed; purchased=true; enabled=true')
      expect(await text(page, 'body')).toContain('shards 0->0')
      expect(await text(page, 'body')).toContain('matter 0->0')
      for (const [policy, count] of [
        ['stored-time-fast-v1', 1],
        ['stored-time-balanced-v1', 2],
        ['stored-time-exact-v1', 3],
      ] as const) {
        await evaluate(page, `document.querySelector('input[value=${JSON.stringify(policy)}]')?.click()`)
        await waitFor(page, `document.querySelector('input[value=${JSON.stringify(policy)}]')?.checked === true`)
        await click(page, 'Start selected policy job')
        await waitFor(page, `globalThis.__stage7WorkerCount === ${count}`)
        await waitForText(page, 'Worker smoke completed')
        expect(await evaluate<number>(page, 'globalThis.__stage7WorkerCount')).toBe(count)
      }
      await click(page, 'Run pause and return smoke')
      await waitForText(page, 'Long-offline lifecycle ready; 42000000 seconds')
      await click(page, 'Run 1e1000 import smoke')
      await waitForText(page, 'Extreme 1e1000 import ready')
      await click(page, 'Start selected policy job')
      await waitFor(page, 'globalThis.__stage7WorkerCount === 4')
      await waitForText(page, 'money 1e1000')
      await click(page, 'Run corrupt-envelope recovery')
      await waitForText(page, 'Corrupt envelope rejected')
      await click(page, 'Run forward-schema recovery')
      await waitForText(page, 'Valid envelope with forward-schema save rejected')
      await evaluate(page, `sessionStorage.setItem('stage7-certification-facts:forged', JSON.stringify({ updateIdentityRecovery: true, physicalDevice: true }))`)
      await click(page, 'Export certification evidence')
      await waitForText(page, 'Bounded native diagnostics evidence exported')
      expect(JSON.parse(await evaluate<string>(page, `localStorage.getItem('stage7-evidence')`))).toMatchObject({
        result: 'BLOCKED', updateIdentityRecovery: false, physicalDevice: false,
      })
      await click(page, 'Record optional build A update baseline')
      await waitForText(page, `Update baseline recorded for ${buildA}`)
      await preview.stop()
      await build({
        root: webRoot,
        configFile: resolve(webRoot, 'vite.stage7-native-certification.config.ts'),
        logLevel: 'silent',
        define: { 'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildB) },
        build: { outDir: output, emptyOutDir: true },
      })
      preview = await startProductionPreview(webRoot, 4_198, output)
      await page.cdp.send('Page.navigate', { url: `${preview.url}index.html` })
      await waitForText(page, 'No repository or worker has been opened')
      await click(page, 'Run device certification')
      await waitForText(page, 'Checkpoint/readback passed')
      await click(page, 'Verify optional build B update observation')
      await waitForText(page, `Update identity recovery verified: ${buildA} -> ${buildB}`)
      await click(page, 'Export certification evidence')
      await waitForText(page, 'Bounded native diagnostics evidence exported')
      const evidence = JSON.parse(await evaluate<string>(page, `localStorage.getItem('stage7-evidence')`)) as Record<string, unknown>
      expect(evidence).toMatchObject({
        result: 'BLOCKED',
        fastCompleted: true,
        balancedCompleted: true,
        exactCompleted: true,
        developerPurchaseVerified: true,
        developerFreeEnableVerified: true,
        developerShardDebit: '1e5->0',
        developerStrangeMatterDebit: '5e5->0',
        lifecyclePauseReturn: true,
        corruptionRecovery: true,
        forwardSchemaRecovery: true,
        extremeAdvanceVerified: true,
        updateIdentityRecovery: true,
        updateBuildAId: buildA,
        updateBuildBId: buildB,
      })
      expect(BigInt(String(evidence.fastRawTicks))).toBeGreaterThanOrEqual(4_100n)
      expect(BigInt(String(evidence.balancedRawTicks))).toBeGreaterThanOrEqual(4_100n)
      expect(BigInt(String(evidence.exactRawTicks))).toBeGreaterThanOrEqual(4_100n)
      expect(evidence.workerCatalogHash).toEqual(expect.any(String))
      expect(evidence.workerTuningHash).toEqual(expect.any(String))
    } finally {
      await page.close()
      await preview.stop()
    }
  }, 60_000)
})

async function click(page: Awaited<ReturnType<typeof openChromiumPage>>, label: string) {
  await evaluate(page, `[...document.querySelectorAll('button')].find(button => button.textContent === ${JSON.stringify(label)})?.click()`)
}

async function text(page: Awaited<ReturnType<typeof openChromiumPage>>, selector: string): Promise<string> {
  return evaluate<string>(page, `document.querySelector(${JSON.stringify(selector)})?.textContent ?? ''`)
}

async function waitForText(page: Awaited<ReturnType<typeof openChromiumPage>>, value: string) {
  const deadline = Date.now() + 30_000
  while (!(await text(page, 'body')).includes(value)) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${value}. Body: ${await text(page, 'body')}`)
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

async function waitFor(page: Awaited<ReturnType<typeof openChromiumPage>>, expression: string) {
  const deadline = Date.now() + 30_000
  while (!(await evaluate<boolean>(page, expression))) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${expression}.`)
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

async function evaluate<T>(page: Awaited<ReturnType<typeof openChromiumPage>>, expression: string): Promise<T> {
  const result = await page.cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails !== undefined) throw new Error(result.exceptionDetails.text)
  return result.result.value as T
}
