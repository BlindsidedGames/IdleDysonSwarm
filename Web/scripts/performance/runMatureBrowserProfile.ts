import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createMatureSchema12WebFixtureFromSource } from '../../src/save/matureSchema12Fixture'
import { prepareIdb1Save } from '../../src/save/prepare'
import { openChromiumPage, startProductionPreview } from './chromiumHarness'
import { integerArgument } from './reportArtifacts'

const webRoot = resolve(import.meta.dirname, '..', '..')
const port = integerArgument(process.argv.slice(2), 'port', 4_174)
const seedPath = resolve(webRoot, 'dist', 'performance-seed.html')
const databaseName = 'idle-dyson-swarm-web-development-v1'
const currentPath = '/development-only/development-only-default-profile/current.idsw'
const firstRunFixture = readFileSync(
  resolve(webRoot, 'src', 'application', 'firstRun', 'generated', 'first-run-schema-12.idb1.txt'),
  'utf8',
)
const matureSave = createMatureSchema12WebFixtureFromSource(
  prepareIdb1Save(firstRunFixture).prepared.copyValidatedState(),
  { unlockAllTabs: true },
)

writeFileSync(seedPath, '<!doctype html><html><body>performance seed</body></html>\n')
const preview = await startProductionPreview(webRoot, port)
try {
  const page = await openChromiumPage({
    id: 'mature-desktop-1440x900', width: 1_440, height: 900,
    deviceScaleFactor: 1, cpuThrottleRate: 1,
  }, preview.url)
  try {
    await page.cdp.send('Page.navigate', { url: `${preview.url}performance-seed.html` })
    await page.waitForSelector('body')
    await page.evaluate(`(async () => {
      const database = await new Promise((resolvePromise, rejectPromise) => {
        const request = indexedDB.open(${JSON.stringify(databaseName)}, 1)
        request.onupgradeneeded = () => {
          const value = request.result
          if (!value.objectStoreNames.contains('files')) value.createObjectStore('files', { keyPath: 'path' })
          if (!value.objectStoreNames.contains('legacy-candidates')) value.createObjectStore('legacy-candidates', { keyPath: 'id' })
          if (!value.objectStoreNames.contains('metadata')) value.createObjectStore('metadata', { keyPath: 'key' })
        }
        request.onerror = () => rejectPromise(request.error)
        request.onsuccess = () => resolvePromise(request.result)
      })
      await new Promise((resolvePromise, rejectPromise) => {
        const transaction = database.transaction('files', 'readwrite')
        transaction.objectStore('files').put({ path: ${JSON.stringify(currentPath)}, contents: ${JSON.stringify(matureSave)} })
        transaction.oncomplete = () => resolvePromise(undefined)
        transaction.onerror = () => rejectPromise(transaction.error)
        transaction.onabort = () => rejectPromise(transaction.error)
      })
      database.close()
      return true
    })()`)

    const navigationStarted = performance.now()
    await page.cdp.send('Page.navigate', { url: preview.url })
    await page.waitForSelector('.dyson-shell', 30_000)
    const readyWallMilliseconds = performance.now() - navigationStarted
    const startup = await page.evaluate<{
      readonly domContentLoadedMilliseconds: number
      readonly loadEventMilliseconds: number
      readonly transferBytes: number
      readonly decodedBodyBytes: number
      readonly longTaskCount: number
      readonly longestTaskMilliseconds: number
      readonly displayedCash: string | null
    }>(`(() => {
      const navigation = performance.getEntriesByType('navigation')[0]
      const resources = performance.getEntriesByType('resource')
      const entries = window.__idleDysonPerformance.readPerformance()
      return {
        domContentLoadedMilliseconds: navigation.domContentLoadedEventEnd,
        loadEventMilliseconds: navigation.loadEventEnd,
        transferBytes: resources.reduce((total, entry) => total + entry.transferSize, 0),
        decodedBodyBytes: resources.reduce((total, entry) => total + entry.decodedBodySize, 0),
        longTaskCount: entries.longTasks.length,
        longestTaskMilliseconds: Math.max(0, ...entries.longTasks.map((entry) => entry.duration)),
        displayedCash: document.querySelector('.dyson-resource-header__item--cash .ui-resource-value__value bdi')?.textContent ?? null,
      }
    })()`)
    const simulationsMilliseconds = await activateRoute(page, 'simulations', '.simulations-surface')
    const quantumMilliseconds = await activateRoute(page, 'quantum', '.quantum-surface')
    const report = Object.freeze({
      kind: 'mature-schema12-production-browser-profile',
      createdAtUtc: new Date().toISOString(),
      environment: page.environment,
      fixture: { schema: 12, cash: '1e300', bots: '1e250', secrets: 27, unlockAllTabs: true },
      startup: { readyWallMilliseconds, ...startup },
      lazyRoutes: { simulationsMilliseconds, quantumMilliseconds },
    })
    const outputRoot = resolve(webRoot, 'output', 'performance')
    mkdirSync(outputRoot, { recursive: true })
    const outputPath = resolve(outputRoot, 'mature-browser-profile.json')
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
    console.log(JSON.stringify(report, null, 2))
    console.log(`JSON: ${outputPath}`)
  } finally {
    await page.close()
  }
} finally {
  await preview.stop()
  unlinkSync(seedPath)
}

async function activateRoute(
  page: Awaited<ReturnType<typeof openChromiumPage>>,
  route: string,
  readySelector: string,
): Promise<number> {
  const started = performance.now()
  const activated = await page.evaluate<boolean>(`(() => {
    const button = document.querySelector('.dyson-navigation__item[data-navigation-id=${JSON.stringify(route)}] button')
    if (!(button instanceof HTMLButtonElement) || button.disabled) return false
    button.click()
    return true
  })()`)
  if (!activated) throw new Error(`Mature profile could not activate ${route}.`)
  await page.waitForSelector(readySelector, 30_000)
  return performance.now() - started
}
