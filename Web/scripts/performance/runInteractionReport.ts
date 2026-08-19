import { resolve } from 'node:path'
import {
  interactFor,
  openChromiumPage,
  startProductionPreview,
  type ViewportProfile,
} from './chromiumHarness'
import {
  createInteractionReport,
  cumulativeLayoutShift,
  interactionToNextPaint,
  performanceReportText,
  performanceReportExitCode,
  type InteractionTrialMeasurement,
  type PerformanceEnvironment,
  type PerformanceRunMode,
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
const smoke = hasFlag(process.argv.slice(2), 'smoke')
const mode: PerformanceRunMode = smoke ? 'smoke' : 'acceptance'
const durationMilliseconds = integerArgument(
  process.argv.slice(2),
  'duration-ms',
  smoke ? 3_000 : 30_000,
)
const trialCount = integerArgument(
  process.argv.slice(2),
  'trials',
  smoke ? 1 : 5,
)
const port = integerArgument(
  process.argv.slice(2),
  'port',
  4_173,
)
const allProfiles: readonly ViewportProfile[] = [
  {
    id: 'desktop-1440x900',
    width: 1_440,
    height: 900,
    deviceScaleFactor: 1,
    cpuThrottleRate: 1,
  },
  {
    id: 'mobile-390x844-throttled',
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    cpuThrottleRate: 4,
  },
]
const profiles = smoke ? allProfiles.slice(0, 1) : allProfiles
const freshFixture = loadCheckedInProgressionMatrixFixtures().find(
  (fixture) => fixture.id === 'fresh',
)
if (freshFixture === undefined) {
  throw new Error('The checked-in fresh performance fixture is missing.')
}

const preview = await startProductionPreview(webRoot, port)
let environment: PerformanceEnvironment | undefined
try {
  const measurements = []
  for (const profile of profiles) {
    const trials: InteractionTrialMeasurement[] = []
    for (let trial = 1; trial <= trialCount; trial += 1) {
      const page = await openChromiumPage(profile, preview.url)
      const consoleErrors: string[] = []
      const pageErrors: string[] = []
      try {
        await captureBrowserErrors(page, consoleErrors, pageErrors)
        environment ??= page.environment
        await page.navigate(preview.url)
        await importSaveThroughSettings(page, freshFixture)
        await page.resetInteractionMeasurements()
        const warmupActivations =
          await page.warmFirstSliceCommitProbe()
        if (warmupActivations === 0) {
          throw new Error(
            `Profile ${profile.id} trial ${trial} could not warm the commit probe.`,
          )
        }
        await page.resetInteractionMeasurements()
        const activations = await interactFor(
          page,
          durationMilliseconds,
        )
        if (activations === 0) {
          throw new Error(
            `Profile ${profile.id} trial ${trial} produced no Tinker activations.`,
          )
        }
        const entries = await page.readPerformanceEntries()
        trials.push({
          trial,
          consoleErrors,
          pageErrors,
          longTaskDurationsMilliseconds: entries.longTasks.map(
            (entry) => entry.duration,
          ),
          commandFeedbackLatenciesMilliseconds:
            entries.commandFeedbackLatenciesMilliseconds,
          snapshotSelectionThroughReactCommit:
            entries.snapshotSelectionThroughReactCommit,
          interactionToNextPaintMilliseconds:
            interactionToNextPaint(entries.events),
          cumulativeLayoutShift: cumulativeLayoutShift(
            entries.layoutShifts,
          ),
          largestContentfulPaintMilliseconds:
            entries.largestContentfulPaintMilliseconds,
        })
      } finally {
        await page.close()
      }
    }
    measurements.push({
      id: profile.id,
      viewport: {
        width: profile.width,
        height: profile.height,
        deviceScaleFactor: profile.deviceScaleFactor,
      },
      cpuThrottleRate: profile.cpuThrottleRate,
      trials,
    })
  }
  if (environment === undefined) {
    throw new Error('No browser environment was measured.')
  }
  const report = {
    ...createInteractionReport({
    mode,
    createdAtUtc: new Date().toISOString(),
    environment,
    traceDurationMilliseconds: durationMilliseconds,
    profiles: measurements,
    }),
    fixture: {
      id: freshFixture.id,
      fingerprint: freshFixture.fingerprint,
      saveSha256: freshFixture.saveSha256,
    },
    runIdentity: repositoryRunIdentity(webRoot),
  }
  const paths = writePerformanceReport(
    webRoot,
    'first-slice-interaction',
    report,
  )
  console.log(performanceReportText(report))
  console.log(`JSON: ${paths.jsonPath}`)
  console.log(`Text: ${paths.textPath}`)
  process.exitCode = performanceReportExitCode(report)
} finally {
  await preview.stop()
}

async function captureBrowserErrors(
  page: Awaited<ReturnType<typeof openChromiumPage>>,
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
