import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  loadCheckedInProgressionMatrixFixtures,
  type ProgressionMatrixFixture,
} from '../../test/support/progressionMatrixFixtures'
import {
  openChromiumPage,
  startProductionPreview,
  type ChromiumPage,
  type ViewportProfile,
} from './chromiumHarness'

const webRoot = resolve(import.meta.dirname, '..', '..')
const outputDirectory = resolve(webRoot, 'output', 'performance')
const smoke = process.argv.includes('--smoke')
const durationMilliseconds = smoke ? 500 : 2_000
const steadyTrials = smoke ? 1 : 3
const fixtures = loadCheckedInProgressionMatrixFixtures()
const progressionRoutes = [
  'skills', 'infinity', 'reality', 'simulations', 'quantum', 'avocato',
] as const
const profiles: readonly ViewportProfile[] = [
  { id: 'desktop-1440x900', width: 1_440, height: 900, deviceScaleFactor: 1, cpuThrottleRate: 4 },
  { id: 'mobile-390x844', width: 390, height: 844, deviceScaleFactor: 2, cpuThrottleRate: 4 },
]
const routeReadySelectors: Readonly<Record<string, string>> = {
  bots: '.tinker-surface', research: '.research-surface', skills: '.skills-surface',
  infinity: '.infinity-surface', reality: '.reality-surface', simulations: '.simulations-surface',
  quantum: '.quantum-surface', avocato: '.avocato-surface', story: '.story-surface',
  wiki: '.wiki-surface', 'offline-time': '.offline-time-surface', statistics: '.statistics-surface',
  settings: '.settings-surface',
}

const fixtureCatalog = fixtures.map(({ id, description, fingerprint, saveSha256, reachableRoutes, certification }) => ({
  id, description, fingerprint, saveSha256, reachableRoutes, certification,
}))
const measurements: unknown[] = []
const preview = await startProductionPreview(webRoot, 4_188, 'output/performance/lane-dist')
try {
  for (const profile of smoke ? profiles.slice(0, 1) : profiles) {
    for (const fixture of smoke ? fixtures.slice(0, 1) : fixtures) {
      try {
        measurements.push(await measureFixture(profile, fixture, preview.url))
      } catch (error) {
        measurements.push({
          profile: profile.id,
          fixture: fixture.id,
          fingerprint: fixture.fingerprint,
          status: 'blocked',
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }
} finally {
  await preview.stop()
}

const report = {
  schemaVersion: 1,
  scope: 'web-only',
  runIdentity: repositoryRunIdentity(),
  durationMilliseconds,
  steadyTrials,
  cpuThrottleRate: 4,
  fixtureCatalog,
  storedTimeMatrix: {
    status: 'separate-worker-core-report',
    requestedWindowsSeconds: [3_600, 86_400, 604_800, 'maximum-valid-bank'],
    command: 'npm run report:performance:stored-time-matrix',
    output: 'output/performance/stored-time-matrix.json',
    note: 'Stored Time uses its canonical worker-core benchmark so browser route timings cannot be mistaken for simulation timings.',
  },
  measurements,
}

function repositoryRunIdentity() {
  return {
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: webRoot, encoding: 'utf8' }).trim(),
    workingTreeDirty: execFileSync('git', ['status', '--porcelain'], { cwd: webRoot, encoding: 'utf8' }).trim().length > 0,
  }
}
mkdirSync(outputDirectory, { recursive: true })
const output = resolve(outputDirectory, smoke ? 'progression-matrix-smoke.json' : 'progression-matrix.json')
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
console.log(`Report: ${output}`)

async function measureFixture(
  profile: ViewportProfile,
  fixture: ProgressionMatrixFixture,
  productionUrl: string,
) {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const routes = []
  for (const route of fixture.reachableRoutes) {
    const page = await openProbedPage(profile, productionUrl, consoleErrors, pageErrors)
    try {
      await importSave(page, fixture)
      routes.push(await measureRoute(page, route))
    } finally {
      await page.close()
    }
  }
  return {
    profile: profile.id,
    viewport: { width: profile.width, height: profile.height, deviceScaleFactor: profile.deviceScaleFactor },
    fixture: fixture.id,
    fingerprint: fixture.fingerprint,
    saveSha256: fixture.saveSha256,
    status: 'measured',
    routes,
    consoleErrors,
    pageErrors,
  }

  async function measureRoute(page: ChromiumPage, route: string) {
    const resourceNamesBefore = await page.evaluate<string[]>(
      `performance.getEntriesByType('resource').map((entry) => entry.name)`,
    )
    await page.resetInteractionMeasurements()
    await page.evaluate(`globalThis.__idleDysonLaneProbeV1.reset()`)
    const coldMetricsBefore = await readMetrics(page)
    const consoleErrorCountBefore = consoleErrors.length
    const pageErrorCountBefore = pageErrors.length
    const routeStartedAt = await page.evaluate<number>('performance.now()')
    await activateRoute(page, route)
    const routeReadyAt = await page.evaluate<number>('performance.now()')
    const settleStartedAt = routeReadyAt
    await waitForResourceQuiet(page, 150)
    const settledAt = await page.evaluate<number>('performance.now()')
    const resourceNamesAfter = await page.evaluate<string[]>(
      `performance.getEntriesByType('resource').map((entry) => entry.name)`,
    )
    const coldMetricsAfter = await readMetrics(page)
    const coldEntries = await page.readPerformanceEntries()
    const coldLanes = await page.evaluate<Record<string, number[]>>(`globalThis.__idleDysonLaneProbeV1.read()`)
    const coldConsoleErrors = consoleErrors.slice(consoleErrorCountBefore)
    const coldPageErrors = pageErrors.slice(pageErrorCountBefore)
    const trials = []
    for (let trial = 0; trial < steadyTrials; trial += 1) {
      await page.resetInteractionMeasurements()
      await page.evaluate(`globalThis.__idleDysonLaneProbeV1.reset()`)
      const metricsBefore = await readMetrics(page)
      await delay(durationMilliseconds)
      const metricsAfter = await readMetrics(page)
      const entries = await page.readPerformanceEntries()
      const lanes = await page.evaluate<Record<string, number[]>>(`globalThis.__idleDysonLaneProbeV1.read()`)
      trials.push({
        lanes: Object.fromEntries(Object.entries(lanes).map(([name, values]) => [name, summarize(values)])),
        mainThread: metricDelta(metricsBefore, metricsAfter, durationMilliseconds),
        longTasks: summarize(entries.longTasks.map((entry) => entry.duration)),
        reactSelectionThroughCommit: summarize(entries.snapshotSelectionThroughReactCommit.map((entry) => entry.durationMilliseconds)),
      })
    }
    const dom = await page.readDomCounters()
    const subscriptions = await page.readCallbackSubscriptionCounts()
    const overflow = await page.evaluate<{
      documentScrollWidth: number
      documentClientWidth: number
      overflowingElements: readonly string[]
    }>(`(() => ({
      documentScrollWidth: document.documentElement.scrollWidth,
      documentClientWidth: document.documentElement.clientWidth,
      overflowingElements: [...document.querySelectorAll('body *')]
        .filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
        .slice(0, 20)
        .map((element) => element.tagName.toLowerCase() + (element.id ? '#' + element.id : '') + (element.classList.length ? '.' + [...element.classList].join('.') : '')),
    }))()`)
    return {
      route,
      loadKind: route === 'settings' ? 'warm-import-route' : route === 'bots' ? 'warm-startup-route' : 'independent-first-activation',
      routeReadyMilliseconds: routeReadyAt - routeStartedAt,
      resourceSettleMilliseconds: settledAt - settleStartedAt,
      firstActivationResources: resourceNamesAfter.filter((name) => !resourceNamesBefore.includes(name)),
      coldActivation: {
        lanes: Object.fromEntries(Object.entries(coldLanes).map(([name, values]) => [name, summarize(values)])),
        mainThread: metricDelta(coldMetricsBefore, coldMetricsAfter, settledAt - routeStartedAt),
        longTasks: summarize(coldEntries.longTasks.map((entry) => entry.duration)),
        reactSelectionThroughCommit: summarize(coldEntries.snapshotSelectionThroughReactCommit.map((entry) => entry.durationMilliseconds)),
        consoleErrors: coldConsoleErrors,
        pageErrors: coldPageErrors,
      },
      steadyTrials: trials,
      dom,
      subscriptions,
      overflow: { ...overflow, horizontalOverflowPixels: Math.max(0, overflow.documentScrollWidth - overflow.documentClientWidth) },
    }
  }
}

async function openProbedPage(
  profile: ViewportProfile,
  productionUrl: string,
  consoleErrors: string[],
  pageErrors: string[],
): Promise<ChromiumPage> {
  const url = new URL('play/', productionUrl).href
  const page = await openChromiumPage(profile, url)
  await page.cdp.send('Runtime.enable')
  page.cdp.on<{ type?: string; args?: readonly { value?: unknown; description?: string }[] }>(
    'Runtime.consoleAPICalled',
    (event) => {
      if (event.type === 'error') consoleErrors.push(event.args?.map((entry) => String(entry.value ?? entry.description ?? '')).join(' ') ?? '')
    },
  )
  page.cdp.on<{ exceptionDetails?: { text?: string; exception?: { description?: string } } }>(
    'Runtime.exceptionThrown',
    (event) => pageErrors.push(event.exceptionDetails?.exception?.description ?? event.exceptionDetails?.text ?? 'Unknown page exception'),
  )
  await page.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      const samples = new Map()
      globalThis.__idleDysonLaneProbeV1 = {
        record(name, duration) { const lane = samples.get(name) ?? []; lane.push(duration); samples.set(name, lane) },
        reset() { samples.clear() },
        read() { return Object.fromEntries(samples) },
      }
    })()`,
  })
  await page.navigate(url)
  await page.waitForSelector('.dyson-shell', 30_000)
  return page
}

async function importSave(page: ChromiumPage, fixture: ProgressionMatrixFixture): Promise<void> {
  await page.evaluate(`globalThis.__idleDysonLastImportedSaveSha256 = undefined`)
  await activateRoute(page, 'settings')
  await page.evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === 'Import')
    if (!(button instanceof HTMLButtonElement)) throw new Error('Import button missing')
    button.click()
  })()`)
  await page.waitForSelector('#settings-import-save-text')
  await page.evaluate(`(() => {
    const textarea = document.querySelector('#settings-import-save-text')
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error('Import textarea missing')
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    setter?.call(textarea, ${JSON.stringify(fixture.saveText)})
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await delay(100)
  await clickDialogButton(page, 'Review Save')
  await page.waitForSelector('.settings-surface__import-preview', 30_000)
  await clickDialogButton(page, 'Import')
  await waitForCondition(page, `document.querySelector('.settings-surface__dialog') === null`, 30_000)
  await waitForCondition(
    page,
    `globalThis.__idleDysonLastImportedSaveSha256 === ${JSON.stringify(fixture.saveSha256)}`,
    30_000,
  )
  for (const route of fixture.reachableRoutes) {
    await waitForCondition(page, `document.querySelector('[data-navigation-id=${JSON.stringify(route)}] .dyson-navigation__link') !== null`, 30_000)
  }
  for (const route of progressionRoutes) {
    const expected = fixture.reachableRoutes.includes(route)
    await waitForCondition(
      page,
      expected
        ? `document.querySelector('[data-navigation-id=${JSON.stringify(route)}] .dyson-navigation__link')?.getAttribute('aria-disabled') !== 'true'`
        : `(() => { const link = document.querySelector('[data-navigation-id=${JSON.stringify(route)}] .dyson-navigation__link'); return link === null || link.getAttribute('aria-disabled') === 'true' })()`,
      30_000,
    )
  }
  await activateRoute(page, 'bots')
}

async function clickDialogButton(page: ChromiumPage, label: string): Promise<void> {
  await page.evaluate(`(() => {
    const dialog = document.querySelector('.settings-surface__dialog')
    const button = dialog && [...dialog.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === ${JSON.stringify(label)})
    if (!(button instanceof HTMLButtonElement) || button.disabled) throw new Error(${JSON.stringify(`${label} button unavailable`)})
    button.click()
  })()`)
}

async function activateRoute(page: ChromiumPage, route: string): Promise<void> {
  await page.evaluate(`(() => {
    const target = document.querySelector('[data-navigation-id=${JSON.stringify(route)}] .dyson-navigation__link')
    if (!(target instanceof HTMLElement) || target.getAttribute('aria-disabled') === 'true') throw new Error(${JSON.stringify(`Route ${route} unavailable`)})
    target.click()
  })()`)
  await waitForCondition(
    page,
    `document.querySelector('[data-navigation-id=${JSON.stringify(route)}] .dyson-navigation__link')?.getAttribute('aria-current') === 'page'`,
    30_000,
  )
  await waitForCondition(
    page,
    `document.querySelector('.dyson-shell')?.getAttribute('data-route-theme') === ${JSON.stringify(route === 'avocato' ? 'quantum' : route)}`,
    30_000,
  )
  const selector = routeReadySelectors[route]
  if (selector === undefined) throw new Error(`No ready selector configured for ${route}`)
  await page.waitForSelector(selector, 30_000)
  await waitForCondition(page, `document.querySelector('.lazy-surface-pending') === null`, 30_000)
}

async function waitForResourceQuiet(page: ChromiumPage, quietMilliseconds: number): Promise<void> {
  let previous = await page.evaluate<number>(`performance.getEntriesByType('resource').length`)
  let quietSince = Date.now()
  while (Date.now() - quietSince < quietMilliseconds) {
    await delay(25)
    const current = await page.evaluate<number>(`performance.getEntriesByType('resource').length`)
    if (current !== previous) { previous = current; quietSince = Date.now() }
  }
}

async function waitForCondition(page: ChromiumPage, expression: string, timeoutMilliseconds: number): Promise<void> {
  const deadline = Date.now() + timeoutMilliseconds
  while (Date.now() < deadline) {
    if (await page.evaluate<boolean>(expression)) return
    await delay(25)
  }
  throw new Error(`Timed out waiting for browser condition: ${expression}`)
}

async function readMetrics(page: ChromiumPage): Promise<Record<string, number>> {
  const response = await page.cdp.send<{ metrics: readonly { name: string; value: number }[] }>('Performance.getMetrics')
  return Object.fromEntries(response.metrics.map((metric) => [metric.name, metric.value]))
}

function metricDelta(before: Record<string, number>, after: Record<string, number>, duration: number) {
  const seconds = duration / 1_000
  return Object.fromEntries(['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'].map((name) => {
    const value = (after[name] ?? 0) - (before[name] ?? 0)
    return [name, { seconds: value, share: value / seconds }]
  }))
}

function summarize(values: readonly number[]) {
  const sorted = [...values].sort((left, right) => left - right)
  const total = sorted.reduce((sum, value) => sum + value, 0)
  return { count: sorted.length, totalMilliseconds: total, meanMilliseconds: sorted.length ? total / sorted.length : 0, p95Milliseconds: percentile(sorted, 0.95), maximumMilliseconds: sorted.at(-1) ?? 0 }
}

function percentile(sorted: readonly number[], quantile: number): number {
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)] ?? 0
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))
}
