import { resolve } from 'node:path'
import {
  interactFor,
  openChromiumPage,
  startProductionPreview,
  warmFirstSlice,
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
  writePerformanceReport,
} from './reportArtifacts'

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

const preview = await startProductionPreview(webRoot, port)
let page: ChromiumPage | undefined
try {
  page = await openChromiumPage(profile, preview.url)
  await page.navigate(preview.url)
  await warmFirstSlice(page, warmupMilliseconds)
  const baseline = await collectSnapshot(page)
  const activations = await interactFor(page, durationMilliseconds)
  if (activations === 0) {
    throw new Error('The soak produced no Tinker activations.')
  }
  await new Promise((resolvePromise) => {
    setTimeout(resolvePromise, 1_000)
  })
  const final = await collectSnapshot(page)
  const report = createSoakReport({
    mode: smoke ? 'smoke' : 'acceptance',
    createdAtUtc: new Date().toISOString(),
    environment: page.environment,
    durationMilliseconds,
    warmupMilliseconds,
    explicitGarbageCollections: 4,
    baseline,
    final,
  })
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

async function collectSnapshot(
  activePage: ChromiumPage,
): Promise<SoakSnapshot> {
  await activePage.collectGarbage()
  await activePage.collectGarbage()
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
