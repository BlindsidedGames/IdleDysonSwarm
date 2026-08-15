import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createMatureSchema12WebFixtureFromSource } from '../../src/save/matureSchema12Fixture'
import { prepareIdb1Save } from '../../src/save/prepare'
import { openChromiumPage, startProductionPreview } from './chromiumHarness'
import { integerArgument } from './reportArtifacts'

const webRoot = resolve(import.meta.dirname, '..', '..')
const port = integerArgument(process.argv.slice(2), 'port', 4_174)
const captureCpuProfile = process.argv.includes('--cpu-profile')
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

    if (captureCpuProfile) {
      await page.cdp.send('Profiler.enable')
      await page.cdp.send('Profiler.setSamplingInterval', { interval: 100 })
      await page.cdp.send('Profiler.start')
    }
    const navigationStarted = performance.now()
    await page.cdp.send('Page.navigate', { url: preview.url })
    await page.waitForSelector('.dyson-shell', 30_000)
    const readyWallMilliseconds = performance.now() - navigationStarted
    const startupCpuProfile = captureCpuProfile
      ? summarizeCpuProfile(await page.cdp.send<CpuProfileResult>('Profiler.stop'))
      : null
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
    const simulations = await activateRoute(page, 'simulations', '.simulations-surface')
    const quantum = await activateRoute(page, 'quantum', '.quantum-surface')
    const botsReturn = await activateRoute(page, 'bots', '.basic-facility-region')
    const quantumWarm = await activateRoute(page, 'quantum', '.quantum-surface')
    const report = Object.freeze({
      kind: 'mature-schema12-production-browser-profile',
      createdAtUtc: new Date().toISOString(),
      environment: page.environment,
      fixture: { schema: 12, cash: '1e300', bots: '1e250', secrets: 27, unlockAllTabs: true },
      startup: {
        readyWallMilliseconds,
        ...startup,
        ...(startupCpuProfile === null ? {} : { cpuProfile: startupCpuProfile }),
      },
      lazyRoutes: { simulations, quantum, botsReturn, quantumWarm },
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

interface CpuProfileResult {
  readonly profile: Readonly<{
    readonly nodes: readonly Readonly<{
      readonly id: number
      readonly callFrame: Readonly<{
        readonly functionName: string
        readonly url: string
        readonly lineNumber: number
      }>
    }>[]
    readonly samples?: readonly number[]
    readonly timeDeltas?: readonly number[]
  }>
}

function summarizeCpuProfile(result: Readonly<CpuProfileResult>) {
  const byId = new Map(result.profile.nodes.map((node) => [node.id, node]))
  const selfMicroseconds = new Map<number, number>()
  const samples = result.profile.samples ?? []
  const deltas = result.profile.timeDeltas ?? []
  for (let index = 0; index < samples.length; index += 1) {
    const id = samples[index]!
    selfMicroseconds.set(id, (selfMicroseconds.get(id) ?? 0) + (deltas[index] ?? 0))
  }
  const frames = [...selfMicroseconds.entries()]
    .map(([id, microseconds]) => {
      const frame = byId.get(id)?.callFrame
      return {
        functionName: frame?.functionName || '(anonymous)',
        url: frame?.url ?? '',
        lineNumber: (frame?.lineNumber ?? -1) + 1,
        selfMilliseconds: microseconds / 1_000,
      }
    })
    .sort((left, right) => right.selfMilliseconds - left.selfMilliseconds)
  return Object.freeze({
    sampledMilliseconds: deltas.reduce((total, value) => total + value, 0) / 1_000,
    topSelfTimeFrames: Object.freeze(frames.slice(0, 20)),
  })
}

async function activateRoute(
  page: Awaited<ReturnType<typeof openChromiumPage>>,
  route: string,
  readySelector: string,
): Promise<Readonly<{
  readonly browserReadyMilliseconds: number
  readonly projectionMilliseconds: number | null
  readonly resources: readonly Readonly<{
    readonly name: string
    readonly initiatorType: string
    readonly startMilliseconds: number
    readonly durationMilliseconds: number
    readonly transferBytes: number
    readonly decodedBodyBytes: number
  }>[]
}>> {
  return page.evaluate(`new Promise((resolvePromise, rejectPromise) => {
    const button = document.querySelector('.dyson-navigation__item[data-navigation-id=${JSON.stringify(route)}] button')
    if (!(button instanceof HTMLButtonElement) || button.disabled) {
      rejectPromise(new Error(${JSON.stringify(`Mature profile could not activate ${route}.`)}))
      return
    }
    const started = performance.now()
    let timeout = 0
    const finish = () => {
      if (document.querySelector(${JSON.stringify(readySelector)}) === null) return false
      observer.disconnect()
      window.clearTimeout(timeout)
      const completed = performance.now()
      resolvePromise({
        browserReadyMilliseconds: completed - started,
        projectionMilliseconds: Number.isFinite(Number(document.documentElement.dataset.v2LastProjectionMs))
          ? Number(document.documentElement.dataset.v2LastProjectionMs)
          : null,
        resources: performance.getEntriesByType('resource')
          .filter((entry) => entry.startTime >= started && entry.startTime <= completed)
          .map((entry) => ({
            name: entry.name,
            initiatorType: entry.initiatorType,
            startMilliseconds: entry.startTime - started,
            durationMilliseconds: entry.duration,
            transferBytes: entry.transferSize,
            decodedBodyBytes: entry.decodedBodySize,
          })),
      })
      return true
    }
    const observer = new MutationObserver(() => { finish() })
    observer.observe(document.documentElement, { childList: true, subtree: true })
    timeout = window.setTimeout(() => {
      observer.disconnect()
      rejectPromise(new Error(${JSON.stringify(`Timed out waiting for the ${route} route.`)}))
    }, 30_000)
    button.click()
    finish()
  })`)
}
