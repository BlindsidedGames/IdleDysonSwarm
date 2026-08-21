import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  openChromiumPage,
  startProductionPreview,
  type ChromiumPage,
  type ViewportProfile,
} from './chromiumHarness'

const webRoot = resolve(import.meta.dirname, '..', '..')
const save = readFileSync(
  resolve(
    webRoot,
    'test',
    'fixtures',
    'schema-08-canonical-idb1-main-save.txt',
  ),
  'utf8',
).trim()
const durationMilliseconds = 5_000
const focused = process.argv.includes('--focused')

const profiles: readonly ViewportProfile[] = [
  {
    id: 'desktop-1440x900-throttled',
    width: 1_440,
    height: 900,
    deviceScaleFactor: 1,
    cpuThrottleRate: 4,
  },
  {
    id: 'mobile-390x844-throttled',
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    cpuThrottleRate: 4,
  },
]

type MetricMap = Record<string, number>

const preview = await startProductionPreview(
  webRoot,
  4_187,
  'output/performance/lane-dist',
)
const measurements = []
try {
  for (const profile of profiles) {
    const fresh = []
    for (const route of (focused ? ['bots'] : ['bots', 'settings']) as readonly string[]) {
      const page = await openProbedPage(profile, preview.url)
      try {
        fresh.push(await measureRoute(page, route, durationMilliseconds))
      } finally {
        await page.close()
      }
    }
    const mature = []
    for (const route of (focused ? ['bots', 'skills', 'settings'] : [
      'bots',
      'research',
      'skills',
      'settings',
      'store',
      'wiki',
    ]) as readonly string[]) {
      const page = await openProbedPage(profile, preview.url)
      try {
        await importSave(page, save)
        await delay(3_000)
        mature.push(await measureRoute(page, route, durationMilliseconds))
      } finally {
        await page.close()
      }
    }
    measurements.push({ profile: profile.id, fresh, mature })
  }
} finally {
  await preview.stop()
}

const report = {
  createdAt: new Date().toISOString(),
  durationMilliseconds,
  cpuThrottleRate: 4,
  saveSource: 'Web/test/fixtures/schema-08-canonical-idb1-main-save.txt',
  measurements,
}
const output = resolve(
  webRoot,
  'output',
  'performance',
  focused ? 'lane-attribution-sublanes.json' : 'lane-attribution.json',
)
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
console.log(`Report: ${output}`)

async function openProbedPage(
  profile: ViewportProfile,
  productionUrl: string,
): Promise<ChromiumPage> {
  const url = productionUrl
  const page = await openChromiumPage(profile, url)
  await page.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      const samples = new Map()
      globalThis.__idleDysonLaneProbeV1 = {
        record(name, duration) {
          const lane = samples.get(name) ?? []
          lane.push(duration)
          samples.set(name, lane)
        },
        reset() { samples.clear() },
        read() { return Object.fromEntries(samples) },
      }
    })()`,
  })
  await page.navigate(url)
  await delay(2_000)
  return page
}

async function importSave(page: ChromiumPage, contents: string): Promise<void> {
  await activateRoute(page, 'settings')
  await page.evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((candidate) =>
      candidate.textContent?.trim() === 'Import'
    )
    if (!(button instanceof HTMLButtonElement)) throw new Error('Import button missing')
    button.click()
  })()`)
  await page.waitForSelector('#settings-import-save-text')
  await page.evaluate(`(() => {
    const textarea = document.querySelector('#settings-import-save-text')
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error('Import textarea missing')
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    setter?.call(textarea, ${JSON.stringify(contents)})
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await delay(200)
  await page.evaluate(`(() => {
    const dialog = document.querySelector('.settings-surface__dialog')
    const button = dialog && [...dialog.querySelectorAll('button')].find((candidate) =>
      candidate.textContent?.trim() === 'Review Save'
    )
    if (!(button instanceof HTMLButtonElement) || button.disabled) throw new Error('Review button unavailable')
    button.click()
  })()`)
  await page.waitForSelector('.settings-surface__import-preview', 30_000)
  await page.evaluate(`(() => {
    const dialog = document.querySelector('.settings-surface__dialog')
    const button = dialog && [...dialog.querySelectorAll('button')].find((candidate) =>
      candidate.textContent?.trim() === 'Import'
    )
    if (!(button instanceof HTMLButtonElement) || button.disabled) throw new Error('Confirm import unavailable')
    button.click()
  })()`)
  await page.waitForSelector('.dyson-shell', 30_000)
}

async function measureRoute(
  page: ChromiumPage,
  route: string,
  duration: number,
) {
  await activateRoute(page, route)
  await delay(2_000)
  await page.resetInteractionMeasurements()
  await page.evaluate(`globalThis.__idleDysonLaneProbeV1.reset()`)
  const before = await readMetrics(page)
  await delay(duration)
  const after = await readMetrics(page)
  const lanes = await page.evaluate<Record<string, number[]>>(
    `globalThis.__idleDysonLaneProbeV1.read()`,
  )
  const entries = await page.readPerformanceEntries()
  const dom = await page.readDomCounters()
  return {
    route,
    laneSamples: Object.fromEntries(
      Object.entries(lanes).map(([name, values]) => [name, summary(values)]),
    ),
    reactSelectionThroughCommit: summary(
      entries.snapshotSelectionThroughReactCommit.map(
        (sample) => sample.durationMilliseconds,
      ),
    ),
    browserMetrics: metricDelta(before, after, duration),
    longTasks: summary(entries.longTasks.map((entry) => entry.duration)),
    dom,
  }
}

async function activateRoute(page: ChromiumPage, route: string): Promise<void> {
  await page.evaluate(`(() => {
    const candidates = [...document.querySelectorAll('[data-navigation-id=${JSON.stringify(route)}] .dyson-navigation__link')]
    const target = candidates.find((candidate) => candidate.getClientRects().length > 0) ?? candidates[0]
    if (!(target instanceof HTMLElement)) throw new Error(${JSON.stringify(`Route ${route} missing`)})
    target.click()
  })()`)
  await delay(500)
}

async function readMetrics(page: ChromiumPage): Promise<MetricMap> {
  const response = await page.cdp.send<{
    metrics: readonly { name: string; value: number }[]
  }>('Performance.getMetrics')
  return Object.fromEntries(response.metrics.map((metric) => [metric.name, metric.value]))
}

function metricDelta(before: MetricMap, after: MetricMap, duration: number) {
  const seconds = duration / 1_000
  return Object.fromEntries([
    'TaskDuration',
    'ScriptDuration',
    'LayoutDuration',
    'RecalcStyleDuration',
  ].map((name) => {
    const value = (after[name] ?? 0) - (before[name] ?? 0)
    return [name, { seconds: value, share: value / seconds }]
  }))
}

function summary(values: readonly number[]) {
  const sorted = [...values].sort((left, right) => left - right)
  const total = sorted.reduce((sum, value) => sum + value, 0)
  return {
    count: sorted.length,
    totalMilliseconds: total,
    meanMilliseconds: sorted.length > 0 ? total / sorted.length : 0,
    medianMilliseconds: percentile(sorted, 0.5),
    p95Milliseconds: percentile(sorted, 0.95),
    maximumMilliseconds: sorted.at(-1) ?? 0,
  }
}

function percentile(sorted: readonly number[], quantile: number): number {
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)] ?? 0
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))
}
