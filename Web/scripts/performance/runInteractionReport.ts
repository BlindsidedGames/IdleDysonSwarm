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
  type InteractionTrialMeasurement,
  type PerformanceEnvironment,
  type PerformanceRunMode,
} from './performanceReport'
import {
  hasFlag,
  integerArgument,
  writePerformanceReport,
} from './reportArtifacts'

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

const preview = await startProductionPreview(webRoot, port)
let environment: PerformanceEnvironment | undefined
try {
  const measurements = []
  for (const profile of profiles) {
    const trials: InteractionTrialMeasurement[] = []
    for (let trial = 1; trial <= trialCount; trial += 1) {
      const page = await openChromiumPage(profile, preview.url)
      try {
        environment ??= page.environment
        await page.navigate(preview.url)
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
          longTaskDurationsMilliseconds: entries.longTasks.map(
            (entry) => entry.duration,
          ),
          commandFeedbackLatenciesMilliseconds:
            entries.commandFeedbackLatenciesMilliseconds,
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
  const report = createInteractionReport({
    mode,
    createdAtUtc: new Date().toISOString(),
    environment,
    traceDurationMilliseconds: durationMilliseconds,
    profiles: measurements,
  })
  const paths = writePerformanceReport(
    webRoot,
    'first-slice-interaction',
    report,
  )
  console.log(performanceReportText(report))
  console.log(`JSON: ${paths.jsonPath}`)
  console.log(`Text: ${paths.textPath}`)
  if (!report.passed) process.exitCode = 1
} finally {
  await preview.stop()
}
