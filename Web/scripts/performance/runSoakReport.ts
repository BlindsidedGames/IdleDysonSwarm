import { resolve } from 'node:path'
import {
  openChromiumPage,
  startProductionPreview,
  delay,
  type ChromiumPage,
  type ViewportProfile,
} from './chromiumHarness'
import {
  createSoakReport,
  performanceReportExitCode,
  performanceReportText,
  type ResourceCounts,
  type SoakSnapshot,
} from './performanceReport'
import {
  hasFlag,
  integerArgument,
  repositoryRunIdentity,
  writePerformanceReport,
} from './reportArtifacts'
import {
  loadCheckedInProgressionMatrixFixtures,
} from '../../test/support/progressionMatrixFixtures'
import { importSaveThroughSettings } from './browserFixtureImport'

const webRoot = resolve(import.meta.dirname, '..', '..')
const argumentsList = process.argv.slice(2)
const smoke = hasFlag(argumentsList, 'smoke')
const durationMilliseconds = integerArgument(
  argumentsList,
  'duration-ms',
  smoke ? 10_000 : 30 * 60 * 1_000,
)
const warmupMilliseconds = integerArgument(
  argumentsList,
  'warmup-ms',
  smoke ? 7_000 : 15_000,
)
const port = integerArgument(argumentsList, 'port', 4_174)
const profile: ViewportProfile = {
  id: 'soak-390x844',
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  cpuThrottleRate: 1,
}
const soakFixture = loadCheckedInProgressionMatrixFixtures().find(
  (fixture) => fixture.id === 'mid-swarm',
)
if (soakFixture === undefined) {
  throw new Error('The checked-in mid-swarm performance fixture is missing.')
}

const preview = await startProductionPreview(webRoot, port)
let page: ChromiumPage | undefined
try {
  page = await openChromiumPage(profile, preview.url)
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  await captureBrowserErrors(page, consoleErrors, pageErrors)
  await page.navigate(preview.url)
  await importSaveThroughSettings(page, soakFixture)
  await page.resetInteractionMeasurements()
  const warmupActivations = await exerciseStableRoutesFor(
    page,
    warmupMilliseconds,
  )
  if (warmupActivations === 0) {
    throw new Error('The soak warmup produced no Tinker activations.')
  }
  await activateRoute(page, 'settings')
  const baselineRouteBoundary = await readRouteBoundary(page)
  const baseline = await collectSnapshot(page)
  const activations = await exerciseStableRoutesFor(page, durationMilliseconds)
  if (activations === 0) {
    throw new Error('The soak produced no Tinker activations.')
  }
  await activateRoute(page, 'settings')
  const finalRouteBoundary = await readRouteBoundary(page)
  if (finalRouteBoundary !== baselineRouteBoundary) {
    throw new Error(
      `The soak crossed a navigation boundary: ${baselineRouteBoundary} -> ${finalRouteBoundary}`,
    )
  }
  await delay(1_000)
  const final = await collectSnapshot(page)
  const report = {
    ...createSoakReport({
    mode: smoke ? 'smoke' : 'acceptance',
    createdAtUtc: new Date().toISOString(),
    environment: page.environment,
    durationMilliseconds,
    warmupMilliseconds,
    explicitGarbageCollections: 4,
    baseline,
    final,
    consoleErrors,
    pageErrors,
    }),
    fixture: {
      id: soakFixture.id,
      fingerprint: soakFixture.fingerprint,
      saveSha256: soakFixture.saveSha256,
    },
    runIdentity: repositoryRunIdentity(webRoot),
  }
  const paths = writePerformanceReport(
    webRoot,
    'first-slice-retained-heap',
    report,
  )
  console.log(performanceReportText(report))
  console.log(`JSON: ${paths.jsonPath}`)
  console.log(`Text: ${paths.textPath}`)
  process.exitCode = performanceReportExitCode(report)
} finally {
  await page?.close()
  await preview.stop()
}

async function captureBrowserErrors(
  page: ChromiumPage,
  consoleErrors: string[],
  pageErrors: string[],
): Promise<void> {
  await page.cdp.send('Runtime.enable')
  page.cdp.on<{ type?: string; args?: readonly { value?: unknown; description?: string }[] }>(
    'Runtime.consoleAPICalled',
    (event) => {
      if (event.type === 'error') {
        consoleErrors.push(event.args?.map((entry) => String(entry.value ?? entry.description ?? '')).join(' ') ?? '')
      }
    },
  )
  page.cdp.on<{ exceptionDetails?: { text?: string; exception?: { description?: string } } }>(
    'Runtime.exceptionThrown',
    (event) => pageErrors.push(event.exceptionDetails?.exception?.description ?? event.exceptionDetails?.text ?? 'Unknown page exception'),
  )
}

async function exerciseStableRoutesFor(
  page: ChromiumPage,
  durationMilliseconds: number,
): Promise<number> {
  const deadline = Date.now() + durationMilliseconds
  const routes = ['research', 'skills', 'settings', 'bots'] as const
  let activations = 0
  while (Date.now() < deadline) {
    for (const route of routes) {
      if (Date.now() >= deadline) break
      await activateRoute(page, route)
      activations += 1
      await delay(250)
    }
  }
  return activations
}

async function activateRoute(
  page: ChromiumPage,
  route: 'bots' | 'research' | 'skills' | 'settings',
): Promise<void> {
  const activated = await page.evaluate<boolean>(`(() => {
    const control = document.querySelector(
      '[data-navigation-id=${JSON.stringify(route)}] .dyson-navigation__link',
    )
    if (!(control instanceof HTMLElement) || control.hasAttribute('disabled')) {
      return false
    }
    control.click()
    return true
  })()`)
  if (!activated) throw new Error(`Soak route ${route} is unavailable.`)
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    const current = await page.evaluate<boolean>(
      `document.querySelector('[data-navigation-id=${JSON.stringify(route)}] .dyson-navigation__link')?.getAttribute('aria-current') === 'page'`,
    )
    if (current) return
    await delay(25)
  }
  throw new Error(`Timed out activating soak route ${route}.`)
}

async function readRouteBoundary(page: ChromiumPage): Promise<string> {
  return page.evaluate<string>(`JSON.stringify(
    [...document.querySelectorAll('.dyson-navigation--drawer [data-navigation-id]')]
      .map((item) => ({
        id: item.getAttribute('data-navigation-id'),
        disabled: item.querySelector('.dyson-navigation__link')?.hasAttribute('disabled') ?? true,
      })),
  )`)
}

async function collectSnapshot(
  activePage: ChromiumPage,
): Promise<SoakSnapshot> {
  await activePage.collectGarbage()
  // Chromium can report the pre-GC DOM/listener counters for the next task
  // even after HeapProfiler.collectGarbage resolves. Yield before the second
  // explicit collection so both baseline and final observe the settled heap.
  await delay(100)
  await activePage.collectGarbage()
  await delay(100)
  const [
    heapUsedBytes,
    dom,
    instrumented,
    subscriptions,
  ] = await Promise.all([
    activePage.readHeapUsedBytes(),
    activePage.readDomCounters(),
    activePage.readInstrumentedResourceCounts(),
    activePage.readCallbackSubscriptionCounts(),
  ])
  const resources: ResourceCounts = {
    ...dom,
    ...instrumented,
    ...subscriptions,
  }
  return {
    heapUsedBytes,
    resources,
  }
}
