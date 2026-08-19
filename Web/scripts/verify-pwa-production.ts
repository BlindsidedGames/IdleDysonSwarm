import { createHash } from 'node:crypto'
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  delay,
  openChromiumPage,
  startProductionPreview,
  type ChromiumPage,
  type ProductionPreview,
} from './performance/chromiumHarness'
import {
  PRODUCTION_BROWSER_DATABASE_NAME,
  PRODUCTION_BROWSER_SAVE_PATHS,
} from '../src/browser/productionBrowserStorage'

const webRoot = resolve(import.meta.dirname, '..')
const evidencePath = resolve(
  webRoot,
  'docs/pwa-production-verification-2026-08-19.json',
)
const temporaryRoot = mkdtempSync(
  join(tmpdir(), 'idle-dyson-pwa-verification-'),
)
const oldDirectory = join(temporaryRoot, 'old')
const newDirectory = join(temporaryRoot, 'new')
const port = 4187
const injectedObsoleteCache =
  'idle-dyson-swarm-app-obsolete-verification'

interface SaveFingerprint {
  readonly sha256: string
  readonly bots: number
  readonly botDistribution: number
  readonly schema: number
}

let preview: ProductionPreview | undefined
let page: ChromiumPage | undefined

try {
  buildPackage(oldDirectory, 'pwa-verification-old')
  buildPackage(newDirectory, 'pwa-verification-new')
  const oldPackageSha256 = hashDirectory(oldDirectory)
  const newPackageSha256 = hashDirectory(newDirectory)

  preview = await startProductionPreview(webRoot, port, oldDirectory)
  page = await openChromiumPage(
    {
      id: 'pwa-production-verification',
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      cpuThrottleRate: 1,
    },
    preview.url,
  )
  await page.navigate(preview.url)
  await waitForServiceWorker(page)

  const initial = await readSaveFingerprint(page)
  await setDistinctiveDistribution(page, 73)
  for (let index = 0; index < 7; index += 1) {
    if (!(await page.clickTinker())) {
      throw new Error('Tinker was unavailable while seeding the save.')
    }
    await delay(600)
  }
  const seeded = await waitForSaveChange(page, initial, 40_000)
  if (
    seeded.bots <= initial.bots ||
    seeded.botDistribution !== 0.73
  ) {
    throw new Error('The distinctive canonical state was not saved.')
  }

  await reload(page)
  const repeated = await readSaveFingerprint(page)
  assertFingerprintContinuity('repeat load', seeded, repeated)

  await setOffline(page, true)
  await reload(page)
  const offline = await readSaveFingerprint(page)
  assertFingerprintContinuity('offline reload', seeded, offline)
  await setOffline(page, false)

  const oldCaches = await readCaches(page)
  await page.evaluate(
    `caches.open(${JSON.stringify(injectedObsoleteCache)})`,
  )
  await preview.stop()
  preview = await startProductionPreview(webRoot, port, newDirectory)
  await page.evaluate(
    `navigator.serviceWorker.getRegistration('/play/').then((registration) => registration?.update())`,
  )
  await waitForWaitingWorker(page)
  await clickButton(page, 'Save and update')
  await waitForActiveBuild(page)
  const updated = await readSaveFingerprint(page)
  assertFingerprintContinuity('update activation', seeded, updated)
  const newCaches = await readCaches(page)
  if (
    newCaches.includes(injectedObsoleteCache) ||
    oldCaches.some((name) => newCaches.includes(name))
  ) {
    throw new Error('The activated worker retained an obsolete app cache.')
  }
  const databaseNames = await page.evaluate<string[]>(
    `indexedDB.databases().then((entries) => entries.map((entry) => entry.name).filter(Boolean))`,
  )
  if (!databaseNames.includes(PRODUCTION_BROWSER_DATABASE_NAME)) {
    throw new Error('The stable production save database was not retained.')
  }

  const result = {
    verifiedAtUtc: new Date().toISOString(),
    browser: page.environment.browser,
    browserVersion: page.environment.browserVersion,
    platform: page.environment.platform,
    url: preview.url,
    storageCompatibility: {
      databaseName: PRODUCTION_BROWSER_DATABASE_NAME,
      currentPath: PRODUCTION_BROWSER_SAVE_PATHS.current,
      databaseNames,
    },
    packages: {
      old: { buildId: 'pwa-verification-old', sha256: oldPackageSha256 },
      new: { buildId: 'pwa-verification-new', sha256: newPackageSha256 },
    },
    saves: { initial, seeded, repeated, offline, updated },
    caches: {
      old: oldCaches,
      injectedObsolete: injectedObsoleteCache,
      new: newCaches,
    },
    assertions: {
      firstInstallControlled: true,
      repeatLoadPreservedCanonicalFingerprint: true,
      offlineReloadPreservedCanonicalFingerprint: true,
      updateRequiredExplicitAcceptance: true,
      updatePreservedCanonicalFingerprint: true,
      obsoleteCachesRemoved: true,
      stableProductionStorageRetained: true,
    },
  }
  writeFileSync(evidencePath, `${JSON.stringify(result, null, 2)}\n`)
  console.log(JSON.stringify(result, null, 2))
} finally {
  await page?.close().catch(() => undefined)
  await preview?.stop().catch(() => undefined)
  rmSync(temporaryRoot, { recursive: true, force: true })
}

function buildPackage(outDir: string, buildId: string): void {
  const vite = resolve(webRoot, 'node_modules/vite/bin/vite.js')
  const result = spawnSync(
    process.execPath,
    [vite, 'build', '--outDir', outDir, '--emptyOutDir'],
    {
      cwd: webRoot,
      env: { ...process.env, VITE_BUILD_ID: buildId },
      encoding: 'utf8',
    },
  )
  if (result.status !== 0) {
    throw new Error(`PWA package build failed.\n${result.stdout}\n${result.stderr}`)
  }
}

async function waitForServiceWorker(page: ChromiumPage): Promise<void> {
  await page.evaluate(`navigator.serviceWorker.ready`)
  await waitFor(page, `navigator.serviceWorker.controller !== null`, 15_000)
}

async function reload(page: ChromiumPage): Promise<void> {
  await page.cdp.send('Page.reload', { ignoreCache: false })
  await delay(1_000)
  await page.waitForSelector('.tinker-surface__control', 30_000)
  await waitForServiceWorker(page)
}

async function setOffline(page: ChromiumPage, offline: boolean): Promise<void> {
  await page.cdp.send('Network.emulateNetworkConditions', {
    offline,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  })
}

async function readSaveFingerprint(page: ChromiumPage): Promise<SaveFingerprint> {
  return page.evaluate<SaveFingerprint>(`(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open(${JSON.stringify(PRODUCTION_BROWSER_DATABASE_NAME)})
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const record = await new Promise((resolve, reject) => {
      const transaction = database.transaction('files', 'readonly')
      const request = transaction.objectStore('files').get(${JSON.stringify(PRODUCTION_BROWSER_SAVE_PATHS.current)})
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    database.close()
    if (!record?.contents?.startsWith('IDSWEB1:')) throw new Error('Canonical save is missing.')
    const bytes = Uint8Array.from(atob(record.contents.slice(8)), (character) => character.charCodeAt(0))
    const json = await new Response(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),
    ).text()
    const envelope = JSON.parse(json)
    const findBots = (value) => {
      if (value === null || typeof value !== 'object') return undefined
      if (typeof value.bots === 'number') return value.bots
      for (const entry of Object.values(value)) {
        const found = findBots(entry)
        if (found !== undefined) return found
      }
      return undefined
    }
    const findNumber = (value, key) => {
      if (value === null || typeof value !== 'object') return undefined
      if (typeof value[key] === 'number') return value[key]
      for (const entry of Object.values(value)) {
        const found = findNumber(entry, key)
        if (found !== undefined) return found
      }
      return undefined
    }
    const bots = Number(findBots(envelope.state))
    const botDistribution = Number(findNumber(envelope.state, 'botDistribution'))
    if (!Number.isFinite(bots)) throw new Error('Canonical bot count is missing.')
    if (!Number.isFinite(botDistribution)) throw new Error('Canonical distribution is missing.')
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(record.contents))
    return {
      sha256: [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join(''),
      bots,
      botDistribution,
      schema: envelope.schema,
    }
  })()`)
}

async function waitForSaveChange(
  page: ChromiumPage,
  initial: SaveFingerprint,
  timeoutMilliseconds: number,
): Promise<SaveFingerprint> {
  const started = Date.now()
  while (Date.now() - started < timeoutMilliseconds) {
    const current = await readSaveFingerprint(page)
    if (
      current.sha256 !== initial.sha256 &&
      current.bots > initial.bots &&
      current.botDistribution === 0.73
    ) return current
    await delay(500)
  }
  throw new Error('Timed out waiting for the distinctive canonical save checkpoint.')
}

function assertFingerprintContinuity(
  phase: string,
  seeded: SaveFingerprint,
  observed: SaveFingerprint,
): void {
  if (
    observed.schema !== seeded.schema ||
    observed.bots !== seeded.bots ||
    observed.botDistribution !== seeded.botDistribution
  ) {
    throw new Error(`${phase} did not preserve the exact canonical fingerprint.`)
  }
}

async function setDistinctiveDistribution(
  page: ChromiumPage,
  percent: number,
): Promise<void> {
  const changed = await page.evaluate<boolean>(`(() => {
    const slider = document.querySelector('.bot-distribution__slider')
    if (!(slider instanceof HTMLInputElement) || slider.disabled) return false
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(slider, ${JSON.stringify(String(percent))})
    slider.dispatchEvent(new Event('input', { bubbles: true }))
    slider.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  })()`)
  if (!changed) throw new Error('Bot distribution was unavailable.')
  await delay(100)
  await page.evaluate(`document.querySelector('.bot-distribution__slider')?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 91 }))`)
}

async function waitForWaitingWorker(page: ChromiumPage): Promise<void> {
  await waitFor(
    page,
    `navigator.serviceWorker.getRegistration('/play/').then((registration) => registration?.waiting !== null)`,
    30_000,
  )
}

async function clickButton(page: ChromiumPage, text: string): Promise<void> {
  const clicked = await page.evaluate<boolean>(`(() => {
    const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === ${JSON.stringify(text)})
    if (!(button instanceof HTMLButtonElement) || button.disabled) return false
    button.click()
    return true
  })()`)
  if (!clicked) throw new Error(`Button ${text} was unavailable.`)
}

async function waitForActiveBuild(page: ChromiumPage): Promise<void> {
  await waitFor(
    page,
    `navigator.serviceWorker.getRegistration('/play/').then((registration) => registration?.active?.scriptURL.includes('service-worker.js') && registration.waiting === null)`,
    30_000,
  )
  await delay(1_000)
}

function readCaches(page: ChromiumPage): Promise<string[]> {
  return page.evaluate(`caches.keys()`)
}

async function waitFor(
  page: ChromiumPage,
  expression: string,
  timeoutMilliseconds: number,
): Promise<void> {
  const started = Date.now()
  while (Date.now() - started < timeoutMilliseconds) {
    if (await page.evaluate<boolean>(expression)) return
    await delay(200)
  }
  throw new Error(`Timed out waiting for ${expression}.`)
}

function hashDirectory(root: string): string {
  const hash = createHash('sha256')
  for (const path of listFiles(root).sort()) {
    hash.update(relative(root, path).replaceAll('\\', '/'))
    hash.update('\0')
    hash.update(readFileSync(path))
    hash.update('\0')
  }
  return hash.digest('hex')
}

function listFiles(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })
}
