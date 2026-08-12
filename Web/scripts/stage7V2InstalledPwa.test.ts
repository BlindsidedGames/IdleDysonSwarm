import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import { build } from 'vite'
import {
  openChromiumPage,
  startProductionPreview,
} from './performance/chromiumHarness'

const webRoot = resolve(import.meta.dirname, '..')
const output = mkdtempSync(join(tmpdir(), 'ids-stage7-installed-pwa-'))
const port = 41_96

afterAll(() => rmSync(output, { recursive: true, force: true }))

describe('Stage 7 installed PWA worker certification', () => {
  test('recovers offline and crosses an A-to-B package activation without touching Stored Time', async () => {
    const buildA = 'stage7-installed-pwa-a'
    const buildB = 'stage7-installed-pwa-b'
    await buildPackage(buildA)
    const packageA = readPackage()
    const preview = await startProductionPreview(webRoot, port, output)
    const page = await openChromiumPage({
      id: 'stage7-installed-pwa',
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      cpuThrottleRate: 1,
    }, `${preview.url}play/`, { disableGpu: true })
    try {
      await page.cdp.send('Network.setCacheDisabled', { cacheDisabled: false })
      await page.navigate(`${preview.url}play/`)
      await page.evaluate(`Promise.race([
        navigator.serviceWorker.register('/play/service-worker.js', {
          scope: '/play/', updateViaCache: 'none',
        }),
        new Promise((_, reject) => setTimeout(
          () => reject(new Error('initial registration timeout')), 15000
        )),
      ])`)
      await waitFor(page, `navigator.serviceWorker.getRegistration('/play/').then(
        registration => registration?.active !== null || registration?.waiting !== null
      )`)
      await page.evaluate(`navigator.serviceWorker.getRegistration('/play/').then(registration => {
        registration?.waiting?.postMessage({ type: 'ACTIVATE_UPDATE' })
      })`)
      await waitFor(page, `navigator.serviceWorker.ready.then(() => true)`)
      if (!await page.evaluate<boolean>('navigator.serviceWorker.controller !== null')) {
        await page.navigate(`${preview.url}play/`)
      }
      expect(await page.evaluate<boolean>(
        `navigator.serviceWorker.controller !== null`,
      )).toBe(true)
      expect(await page.evaluate<number>(workerResourceCount())).toBe(0)
      expect(await page.evaluate<string[]>(`caches.keys()`)).toContain(packageA.cacheName)

      await page.cdp.send('Network.emulateNetworkConditions', offline(true))
      await page.cdp.send('Page.reload', { ignoreCache: false })
      await page.waitForSelector('.tinker-surface__control', 30_000)
      expect(await page.evaluate<string>('document.title')).toBe('Idle Dyson Swarm')
      expect(await page.evaluate<number>(workerResourceCount())).toBe(0)

      await page.evaluate(installWorkerCounters())
      const constructed = await page.evaluate<number>(`(async () => {
        globalThis.__stage7AccessA = await import(${JSON.stringify(`/play/${packageA.access}`)})
        return globalThis.__stage7WorkerConstructions
      })()`)
      expect(constructed).toBe(0)

      await page.cdp.send('Network.emulateNetworkConditions', offline(false))
      await buildPackage(buildB)
      const packageB = readPackage()
      expect(packageB.cacheName).not.toBe(packageA.cacheName)
      expect(packageB.access).not.toBe(packageA.access)
      await page.evaluate(`Promise.race([
        navigator.serviceWorker.getRegistration('/play/').then(async registration => {
        if (registration === undefined) throw new Error('missing registration')
        await registration.update()
        }),
        new Promise((_, reject) => setTimeout(
          () => reject(new Error('registration update timeout')), 15000
        )),
      ])`)
      await waitFor(page, `navigator.serviceWorker.getRegistration('/play/').then(
        registration => registration?.waiting !== null && registration?.waiting !== undefined
      )`)
      await page.evaluate(`new Promise(async (resolve, reject) => {
        const registration = await navigator.serviceWorker.getRegistration('/play/')
        if (registration?.waiting === null || registration?.waiting === undefined) {
          reject(new Error('missing waiting update')); return
        }
        const timer = setTimeout(() => reject(new Error('activation timeout')), 15000)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          clearTimeout(timer); resolve(true)
        }, { once: true })
        registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' })
      })`)
      await waitFor(page, `caches.keys().then(keys =>
        keys.includes(${JSON.stringify(packageB.cacheName)}) &&
        !keys.includes(${JSON.stringify(packageA.cacheName)})
      )`)
      const cacheNames = await page.evaluate<string[]>('caches.keys()')
      expect(cacheNames).toContain(packageB.cacheName)
      expect(cacheNames).not.toContain(packageA.cacheName)

      const stale = await page.evaluate<{
        readonly stale: string
        readonly reloadRequired: boolean
        readonly constructions: number
        readonly posts: number
      }>(`(async () => {
        const stale = await globalThis.__stage7AccessA.createStage7V2WorkerLauncherOnDemand()
        return {
          stale: stale.status === 'resumable-failure' ? stale.reason : stale.status,
          reloadRequired: stale.reloadRequired === true,
          constructions: globalThis.__stage7WorkerConstructions,
          posts: globalThis.__stage7WorkerPosts,
        }
      })()`)
      expect(['identity-load-failed', 'launcher-load-failed']).toContain(stale.stale)
      expect(stale).toMatchObject({
        reloadRequired: true,
        constructions: 0,
        posts: 0,
      })

      await page.cdp.send('Network.clearBrowserCache')
      // Package activation is a same-tab reload. That preserves the tab's
      // authenticated writer identity so the new document can take over the
      // unexpired lease; a synthetic cross-URL navigation correctly behaves
      // like a different document owner and must not bypass that fence.
      await page.cdp.send('Page.reload', { ignoreCache: false })
      try {
        await page.waitForSelector('.tinker-surface__control', 30_000)
      } catch (error) {
        const diagnostic = await page.evaluate<{
          readonly body: string
          readonly title: string
          readonly url: string
        }>(`({
          body: document.body?.innerText?.slice(0, 2000) ?? '',
          title: document.title,
          url: location.href,
        })`)
        throw new Error(
          `${error instanceof Error ? error.message : String(error)} ` +
          `Fresh-B diagnostic: ${JSON.stringify(diagnostic)}`,
        )
      }
      await page.evaluate(installWorkerCounters())
      const fresh = await page.evaluate<{
        readonly status: string
        readonly samePromise: boolean
        readonly constructions: number
        readonly posts: number
      }>(`(async () => {
        const access = await import(${JSON.stringify(`/play/${packageB.access}`)})
        const loaded = await access.createStage7V2WorkerLauncherOnDemand()
        if (loaded.status !== 'launcher-ready') throw new Error(loaded.reason)
        const first = loaded.launcher.start()
        const second = loaded.launcher.start()
        const result = await first
        loaded.launcher.terminate()
        return {
          status: result.status,
          samePromise: first === second,
          constructions: globalThis.__stage7WorkerConstructions,
          posts: globalThis.__stage7WorkerPosts,
        }
      })()`)
      expect(fresh).toEqual({
        status: 'ready',
        samePromise: true,
        constructions: 1,
        posts: 0,
      })
      expect(await page.evaluate<number>(workerResourceCount())).toBe(1)
    } finally {
      await page.cdp.send('Network.emulateNetworkConditions', offline(false))
        .catch(() => undefined)
      await page.close()
      await preview.stop()
    }
  }, 120_000)
})

async function buildPackage(buildId: string): Promise<void> {
  await build({
    root: webRoot,
    configFile: resolve(webRoot, 'vite.config.ts'),
    mode: 'production',
    logLevel: 'silent',
    define: { 'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId) },
    build: { outDir: output, emptyOutDir: true },
  })
}

function readPackage(): Readonly<{ access: string; cacheName: string }> {
  const manifest = JSON.parse(readFileSync(
    resolve(output, '.vite/manifest.json'), 'utf8',
  )) as Record<string, { readonly file: string }>
  const access = manifest['src/certification/stage7V2/access.ts']?.file
  if (access === undefined) throw new Error('Stage 7 access entry was not emitted.')
  const serviceWorker = readFileSync(resolve(output, 'service-worker.js'), 'utf8')
  const cacheName = /const CACHE_NAME = "([^"]+)";/u.exec(serviceWorker)?.[1]
  if (cacheName === undefined) throw new Error('PWA cache name was not emitted.')
  return Object.freeze({ access, cacheName })
}

function workerResourceCount(): string {
  return `performance.getEntriesByType('resource')
    .filter(entry => entry.name.includes('storedTimeWorkerV2-')).length`
}

function installWorkerCounters(): string {
  return `(() => {
    const NativeWorker = globalThis.Worker
    globalThis.__stage7WorkerConstructions = 0
    globalThis.__stage7WorkerPosts = 0
    globalThis.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args)
        globalThis.__stage7WorkerConstructions += 1
      }
      postMessage(...args) {
        globalThis.__stage7WorkerPosts += 1
        return super.postMessage(...args)
      }
    }
  })()`
}

function offline(value: boolean): Readonly<Record<string, unknown>> {
  return Object.freeze({
    offline: value,
    latency: 0,
    downloadThroughput: value ? 0 : -1,
    uploadThroughput: value ? 0 : -1,
  })
}

async function waitFor(
  page: Awaited<ReturnType<typeof openChromiumPage>>,
  expression: string,
): Promise<void> {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    if (await page.evaluate<boolean>(`Promise.race([
      Promise.resolve(${expression}),
      new Promise(resolve => setTimeout(() => resolve(false), 250)),
    ])`)) return
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50))
  }
  throw new Error(`Timed out waiting for browser condition: ${expression}`)
}
